import http from "http";
import { spawn } from "first-base";
import { rootDir } from "./_utils";
import path from "path";

if (process.env.CI) {
  test.only("skipped in CI (cosmo test)", () => {});
}

/* On ARM64 macOS, the cosmo binary (x86_64 APE) runs under Rosetta 2 and
 * cannot dlopen the system's ARM64 libcurl. Network tests will fail with
 * "libcurl not found". Skip network tests in this case. */
const isArm64Mac = process.platform === "darwin" && process.arch === "arm64";

const cosmoBinDir = path.join(
  rootDir(),
  "build",
  "unknown-unknown-cosmo",
  "bin"
);
const qjsCom = path.join(cosmoBinDir, "qjs.com");

/* APE binaries can't be spawned directly via execvp on macOS without the APE
 * loader installed, but they work fine via sh -c. This helper wraps the spawn. */
function spawnCosmo(args: string[]) {
  const escaped = args.map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(" ");
  return spawn("sh", ["-c", `${qjsCom} ${escaped}`], { cwd: rootDir() });
}

let server: http.Server;
let port: number;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url!, `http://localhost`);

    if (url.pathname === "/json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ method: req.method, path: url.pathname }));
    } else if (url.pathname === "/text") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("hello from cosmo test");
    } else if (url.pathname === "/echo-body") {
      let body = "";
      req.on("data", (chunk: Buffer) => (body += chunk.toString()));
      req.on("end", () => {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(body);
      });
    } else if (url.pathname === "/status/404") {
      res.writeHead(404, "Not Found", { "Content-Type": "text/plain" });
      res.end("not found");
    } else {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
    }
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  port = (server.address() as any).port;
}, 10000);

afterAll(() => {
  server.close();
});

(isArm64Mac ? test.skip : test)("fetch - basic GET (cosmo)", async () => {
  const run = spawnCosmo([
      "-e",
      `async function main() {
        const resp = await fetch("http://localhost:${port}/json");
        console.log("status:", resp.status);
        console.log("ok:", resp.ok);
        const data = await resp.json();
        console.log("method:", data.method);
        console.log("path:", data.path);
      }
      main();`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "status: 200
    ok: true
    method: GET
    path: /json
    ",
    }
  `);
}, 15000);

(isArm64Mac ? test.skip : test)("fetch - text() (cosmo)", async () => {
  const run = spawnCosmo([
      "-e",
      `async function main() {
        const resp = await fetch("http://localhost:${port}/text");
        const text = await resp.text();
        console.log(text);
      }
      main();`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "hello from cosmo test
    ",
    }
  `);
}, 15000);

(isArm64Mac ? test.skip : test)("fetch - POST with body (cosmo)", async () => {
  const run = spawnCosmo([
      "-e",
      `async function main() {
        const resp = await fetch("http://localhost:${port}/echo-body", {
          method: "POST",
          body: "cosmo body content"
        });
        const text = await resp.text();
        console.log(text);
      }
      main();`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "cosmo body content
    ",
    }
  `);
}, 15000);

(isArm64Mac ? test.skip : test)("fetch - non-ok status (cosmo)", async () => {
  const run = spawnCosmo([
      "-e",
      `async function main() {
        const resp = await fetch("http://localhost:${port}/status/404");
        console.log("status:", resp.status);
        console.log("ok:", resp.ok);
      }
      main();`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "status: 404
    ok: false
    ",
    }
  `);
}, 15000);

(isArm64Mac ? test.skip : test)("fetch - network error rejects (cosmo)", async () => {
  const run = spawnCosmo([
      "-e",
      `async function main() {
        try {
          await fetch("http://localhost:1/fail");
          console.log("ERROR: should have thrown");
        } catch (e) {
          console.log("caught error:", typeof e.message === "string" ? "yes" : "no");
        }
      }
      main();`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "caught error: yes
    ",
    }
  `);
}, 15000);

test("Headers class (cosmo)", async () => {
  const run = spawnCosmo([
      "-e",
      `
      const h = new Headers({ "X-Test": "hello" });
      console.log("get:", h.get("x-test"));
      console.log("has:", h.has("x-test"));
      h.set("x-test", "updated");
      console.log("set:", h.get("x-test"));
      h.delete("x-test");
      console.log("delete:", h.has("x-test"));
      `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "get: hello
    has: true
    set: updated
    delete: false
    ",
    }
  `);
}, 15000);
