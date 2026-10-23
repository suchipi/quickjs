import { test, describe, beforeAll, afterAll, expect } from "vitest";
import { spawn } from "first-base";
import { binDir } from "./_utils";
import http from "http";

describe("net.urlGet", () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === "/text") {
        res.writeHead(200, {
          "Content-Type": "text/plain",
          "X-Custom": "test-header",
        });
        res.end("hello from server");
      } else if (req.url === "/json") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ key: "value" }));
      } else if (req.url === "/binary") {
        res.writeHead(200, { "Content-Type": "application/octet-stream" });
        res.end(Buffer.from([0xde, 0xad, 0xbe, 0xef]));
      } else if (req.url === "/error") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("not found");
      } else if (req.url === "/echo-headers") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(req.headers));
      } else {
        res.writeHead(200);
        res.end("ok");
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address();
        if (addr && typeof addr === "object") {
          port = addr.port;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  test("urlGet - default returns string", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        const result = net.urlGet("http://127.0.0.1:${port}/text");
        console.log("type:", typeof result);
        console.log("value:", result);
      `,
    ]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "type: string
      value: hello from server
      ",
      }
    `);
  });

  test("urlGet - binary returns ArrayBuffer", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        const result = net.urlGet("http://127.0.0.1:${port}/binary", { binary: true });
        console.log("type:", result.constructor.name);
        console.log("length:", result.byteLength);
        const view = new Uint8Array(result);
        console.log("data:", Array.from(view).map(b => b.toString(16)).join(" "));
      `,
    ]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "type: ArrayBuffer
      length: 4
      data: de ad be ef
      ",
      }
    `);
  });

  test("urlGet - full returns object with status and headers", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        const result = net.urlGet("http://127.0.0.1:${port}/text", { full: true });
        console.log("type:", typeof result);
        console.log("status:", result.status);
        console.log("response type:", typeof result.response);
        console.log("response:", result.response);
        console.log("has headers:", typeof result.responseHeaders === "string");
        console.log("has x-custom:", result.responseHeaders.toLowerCase().includes("x-custom"));
      `,
    ]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "type: object
      status: 200
      response type: string
      response: hello from server
      has headers: true
      has x-custom: true
      ",
      }
    `);
  });

  test("urlGet - full + binary", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        const result = net.urlGet("http://127.0.0.1:${port}/binary", { full: true, binary: true });
        console.log("status:", result.status);
        console.log("response type:", result.response.constructor.name);
        console.log("length:", result.response.byteLength);
      `,
    ]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "status: 200
      response type: ArrayBuffer
      length: 4
      ",
      }
    `);
  });

  test("urlGet - error status throws without full option", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        try {
          net.urlGet("http://127.0.0.1:${port}/error");
          console.log("ERROR: should have thrown");
        } catch(e) {
          console.log("caught error");
        }
      `,
    ]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "caught error
      ",
      }
    `);
  });

  test("urlGet - error status with full option returns status", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        const result = net.urlGet("http://127.0.0.1:${port}/error", { full: true });
        console.log("status:", result.status);
        console.log("response:", result.response);
      `,
    ]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "status: 404
      response: not found
      ",
      }
    `);
  });

  test("urlGet - headers option sends request headers", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        const result = net.urlGet("http://127.0.0.1:${port}/echo-headers", {
          headers: {
            "X-Custom": "hello",
            "X-Empty": "",
            "X-Number": 1.5,
            "X-BigInt": 12345678901234567890n,
            Accept: "text/plain",
          },
        });
        const echoed = JSON.parse(result);
        console.log("x-custom:", echoed["x-custom"]);
        console.log("x-empty present:", "x-empty" in echoed, "length:", echoed["x-empty"].length);
        console.log("x-number:", echoed["x-number"]);
        console.log("x-bigint:", echoed["x-bigint"]);
        console.log("accept:", echoed.accept);
      `,
    ]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "x-custom: hello
      x-empty present: true length: 0
      x-number: 1.5
      x-bigint: 12345678901234567890
      accept: text/plain
      ",
      }
    `);
  });

  test("urlGet - headers option rejects other value types", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        try {
          net.urlGet("http://127.0.0.1:${port}/echo-headers", { headers: { "X-Bool": true } });
          console.log("ERROR: should have thrown");
        } catch (error) {
          console.log(error.name + ": " + error.message);
        }
      `,
    ]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "TypeError: 'headers' option value for 'X-Bool' must be a string, number, or bigint
      ",
      }
    `);
  });

  test("urlGet - non-object headers option throws", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        try {
          net.urlGet("http://127.0.0.1:${port}/echo-headers", { headers: "X-Custom: hello" });
          console.log("ERROR: should have thrown");
        } catch (error) {
          console.log(error.name + ": " + error.message);
        }
      `,
    ]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "TypeError: 'headers' option must be an object
      ",
      }
    `);
  });
});
