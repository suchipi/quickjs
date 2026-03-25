import http from "http";
import { spawn, sanitizers } from "first-base";
import { rootDir } from "./_utils";
import path from "path";

if (process.env.CI) {
  test.only("skipped in CI (win32 wine test)", () => {});
}

const winBinDir = path.join(
  rootDir(),
  "build",
  "x86_64-pc-windows-static",
  "bin"
);
const qjsExe = path.join(winBinDir, "qjs.exe");

function cleanWineNoise(str: string) {
  return str
    .split("\n")
    .filter((line) => {
      if (line.match(/^\[mvk-/)) return false;
      if (line.match(/^\t/)) return false;
      if (line.match(/^[0-9a-f]{4}:/)) return false;
      if (line.match(/^$/)) return false;
      return true;
    })
    .join("\n");
}

let server: http.Server;
let port: number;

beforeAll(async () => {
  sanitizers.push(cleanWineNoise);

  server = http.createServer((req, res) => {
    const url = new URL(req.url!, `http://localhost`);

    if (url.pathname === "/json") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ method: req.method, path: url.pathname }));
    } else if (url.pathname === "/text") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("hello from wine test");
    } else if (url.pathname === "/echo-body") {
      let body = "";
      req.on("data", (chunk: Buffer) => (body += chunk.toString()));
      req.on("end", () => {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(body);
      });
    } else if (url.pathname === "/redirect") {
      res.writeHead(302, { Location: `/json` });
      res.end();
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

  // Warm up wineserver
  const run = spawn("wine", [qjsExe, "-e", "2 + 2"], { cwd: rootDir() });
  await run.completion;
}, 15000);

afterAll(() => {
  sanitizers.pop();
  server.close();
});

test("fetch - basic GET (wine)", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
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
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
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

test("fetch - text() (wine)", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `async function main() {
        const resp = await fetch("http://localhost:${port}/text");
        const text = await resp.text();
        console.log(text);
      }
      main();`,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "hello from wine test
    ",
    }
  `);
}, 15000);

test("fetch - POST with body (wine)", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `async function main() {
        const resp = await fetch("http://localhost:${port}/echo-body", {
          method: "POST",
          body: "wine body content"
        });
        const text = await resp.text();
        console.log(text);
      }
      main();`,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "wine body content
    ",
    }
  `);
}, 15000);

test("fetch - non-ok status (wine)", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
      "-e",
      `async function main() {
        const resp = await fetch("http://localhost:${port}/status/404");
        console.log("status:", resp.status);
        console.log("ok:", resp.ok);
      }
      main();`,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
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

test("fetch - network error rejects (wine)", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
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
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "caught error: yes
    ",
    }
  `);
}, 15000);

test("Headers class (wine)", async () => {
  const run = spawn(
    "wine",
    [
      qjsExe,
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
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
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
