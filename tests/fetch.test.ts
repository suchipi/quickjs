import http from "http";
import { spawn } from "first-base";
import { binDir } from "./_utils";

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
      res.end("hello world");
    } else if (url.pathname === "/echo-headers") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(req.headers));
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
    } else if (url.pathname === "/bytes") {
      const buf = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);
      res.writeHead(200, { "Content-Type": "application/octet-stream" });
      res.end(buf);
    } else {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
    }
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  port = (server.address() as any).port;
});

afterAll(() => {
  server.close();
});

test("fetch - basic GET with json()", async () => {
  const run = spawn(binDir("qjs"), [
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
});

test("fetch - text()", async () => {
  const run = spawn(binDir("qjs"), [
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
      "stdout": "hello world
    ",
    }
  `);
});

test("fetch - arrayBuffer()", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `async function main() {
      const resp = await fetch("http://localhost:${port}/bytes");
      const ab = await resp.arrayBuffer();
      console.log("byteLength:", ab.byteLength);
      const view = new Uint8Array(ab);
      console.log("bytes:", Array.from(view).join(","));
    }
    main();`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "byteLength: 5
    bytes: 0,1,2,3,4
    ",
    }
  `);
});

test("fetch - POST with string body", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `async function main() {
      const resp = await fetch("http://localhost:${port}/echo-body", {
        method: "POST",
        body: "test body content"
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
      "stdout": "test body content
    ",
    }
  `);
});

test("fetch - custom headers", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `async function main() {
      const resp = await fetch("http://localhost:${port}/echo-headers", {
        headers: { "X-Custom-Header": "hello123" }
      });
      const data = await resp.json();
      console.log("custom header:", data["x-custom-header"]);
    }
    main();`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "custom header: hello123
    ",
    }
  `);
});

test("fetch - redirect following", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `async function main() {
      const resp = await fetch("http://localhost:${port}/redirect");
      console.log("status:", resp.status);
      console.log("redirected:", resp.redirected);
      const data = await resp.json();
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
    redirected: true
    path: /json
    ",
    }
  `);
});

test("fetch - non-ok status", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `async function main() {
      const resp = await fetch("http://localhost:${port}/status/404");
      console.log("status:", resp.status);
      console.log("ok:", resp.ok);
      const text = await resp.text();
      console.log("body:", text);
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
    body: not found
    ",
    }
  `);
});

test("fetch - network error rejects promise", async () => {
  const run = spawn(binDir("qjs"), [
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
});

test("Headers class", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
    const h = new Headers({ "Content-Type": "text/html", "X-Custom": "test" });
    console.log("get:", h.get("content-type"));
    console.log("has:", h.has("x-custom"));
    h.set("x-custom", "updated");
    console.log("set:", h.get("x-custom"));
    h.append("x-custom", "extra");
    console.log("append:", h.get("x-custom"));
    h.delete("content-type");
    console.log("delete:", h.has("content-type"));
    console.log("entries:", JSON.stringify(h.entries()));

    // forEach
    const items = [];
    h.forEach((v, k) => items.push(k + "=" + v));
    console.log("forEach:", items.join("; "));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "get: text/html
    has: true
    set: updated
    append: updated, extra
    delete: false
    entries: [["x-custom","updated, extra"]]
    forEach: x-custom=updated, extra
    ",
    }
  `);
});

test("fetch - module import", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `import { fetch, Headers } from "quickjs:fetch";
    async function main() {
      const h = new Headers();
      h.set("test", "value");
      console.log("Headers from module:", h.get("test"));

      const resp = await fetch("http://localhost:${port}/text");
      const text = await resp.text();
      console.log("fetch from module:", text);
    }
    main();`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "Headers from module: value
    fetch from module: hello world
    ",
    }
  `);
});

test("fetch - Response properties", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `async function main() {
      const resp = await fetch("http://localhost:${port}/text");
      console.log("type:", resp.type);
      console.log("status:", typeof resp.status);
      console.log("ok:", typeof resp.ok);
      console.log("url includes localhost:", resp.url.includes("localhost"));
      console.log("headers is object:", typeof resp.headers === "object");
      console.log("headers.get:", resp.headers.get("content-type"));
    }
    main();`,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "type: basic
    status: number
    ok: boolean
    url includes localhost: true
    headers is object: true
    headers.get: text/plain
    ",
    }
  `);
});
