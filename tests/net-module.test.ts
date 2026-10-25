import { test, describe, beforeAll, afterAll, expect } from "vitest";
import { spawn } from "first-base";
import { binDir } from "./_utils";
import http from "http";

describe("quickjs:net", () => {
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
      } else if (req.url === "/echo-request") {
        const chunks: Array<Buffer> = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              method: req.method,
              contentType: req.headers["content-type"],
              contentLength: req.headers["content-length"],
              bodyHex: Buffer.concat(chunks).toString("hex"),
            })
          );
        });
      } else if (req.url?.startsWith("/redirect/")) {
        res.writeHead(Number(req.url.slice("/redirect/".length)), {
          Location: "/echo-request",
        });
        res.end();
      } else if (req.url === "/text-with-length") {
        // Without a real HEAD request, libcurl waits for these 17 bytes
        res.writeHead(200, {
          "Content-Type": "text/plain",
          "Content-Length": "17",
        });
        res.end("hello from server");
      } else if (req.url === "/raw-headers") {
        req.socket.end(
          "HTTP/1.1 200 OK\r\n" +
            "Set-Cookie: a=1; Expires=Wed, 21 Oct 2026 07:28:00 GMT\r\n" +
            "X-Padded:   padded value   \r\n" +
            "set-cookie: b=2\r\n" +
            "X-Folded: first\r\n" +
            "   second\r\n" +
            "\tthird\r\n" +
            "X-Bare-LF: yes\n" +
            "X-Fold-After-Empty:\r\n" +
            "   value\r\n" +
            "X-Blank-Continuation: a\r\n" +
            "   \r\n" +
            "   b\r\n" +
            "X-Bare-LF-Fold: d\n" +
            "   folded\n" +
            "X-Bare-CR: a\rb\r\n" +
            "X-Space-Before-Colon : value\r\n" +
            "X-Empty:\r\n" +
            "Constructor: not-a-function\r\n" +
            "Content-Length: 2\r\n" +
            "Connection: close\r\n" +
            "\r\n" +
            "ok"
        );
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

  test("urlGet - error status throws without leaking a binary response", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        try {
          net.urlGet("http://127.0.0.1:${port}/error", { binary: true });
          console.log("ERROR: should have thrown");
        } catch (error) {
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

  test("urlRequest - returns status, headers, and response", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        const result = net.urlRequest("GET", "http://127.0.0.1:${port}/echo-request");
        console.log("keys:", Object.keys(result).join(", "));
        console.log("status:", result.status);
        console.log("content-type:", JSON.stringify(result.responseHeaders["content-type"]));
        console.log("response:", result.response);
      `,
    ]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "keys: response, responseHeaders, status
      status: 200
      content-type: ["application/json"]
      response: {"method":"GET","bodyHex":""}
      ",
      }
    `);
  });

  test("urlRequest - responseHeaders groups values by lowercased name", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        const result = net.urlRequest("GET", "http://127.0.0.1:${port}/raw-headers");
        console.log(JSON.stringify(result.responseHeaders, null, 2));
      `,
    ]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "{
        "set-cookie": [
          "a=1; Expires=Wed, 21 Oct 2026 07:28:00 GMT",
          "b=2"
        ],
        "x-padded": [
          "padded value"
        ],
        "x-folded": [
          "first second third"
        ],
        "x-bare-lf": [
          "yes"
        ],
        "x-fold-after-empty": [
          "value"
        ],
        "x-blank-continuation": [
          "a b"
        ],
        "x-bare-lf-fold": [
          "d folded"
        ],
        "x-bare-cr": [
          "a b"
        ],
        "x-space-before-colon": [
          "value"
        ],
        "x-empty": [
          ""
        ],
        "constructor": [
          "not-a-function"
        ],
        "content-length": [
          "2"
        ],
        "connection": [
          "close"
        ]
      }
      ",
      }
    `);
  });

  test("urlRequest - string body is sent as UTF-8", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        const result = net.urlRequest("POST", "http://127.0.0.1:${port}/echo-request", {
          body: "h\\u00e9llo \\u2713",
        });
        console.log(result.response);
      `,
    ]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "{"method":"POST","contentType":"application/x-www-form-urlencoded","contentLength":"10","bodyHex":"68c3a96c6c6f20e29c93"}
      ",
      }
    `);
  });

  test("urlRequest - ArrayBuffer body with a custom method and Content-Type", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        const result = net.urlRequest("PUT", "http://127.0.0.1:${port}/echo-request", {
          body: new Uint8Array([0x00, 0x01, 0x02, 0xff]).buffer,
          headers: { "Content-Type": "application/octet-stream" },
        });
        console.log(result.response);
      `,
    ]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "{"method":"PUT","contentType":"application/octet-stream","contentLength":"4","bodyHex":"000102ff"}
      ",
      }
    `);
  });

  test("urlRequest - methods with and without a body", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        const requests = [
          ["DELETE", {}],
          ["POST", {}],
          ["GET", { body: "x" }],
          ["POST", { body: "" }],
        ];
        for (const [method, options] of requests) {
          const result = net.urlRequest(method, "http://127.0.0.1:${port}/echo-request", options);
          console.log(method, JSON.stringify(options), "->", result.response);
        }
      `,
    ]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "DELETE {} -> {"method":"DELETE","bodyHex":""}
      POST {} -> {"method":"POST","contentType":"application/x-www-form-urlencoded","contentLength":"0","bodyHex":""}
      GET {"body":"x"} -> {"method":"GET","contentType":"application/x-www-form-urlencoded","contentLength":"1","bodyHex":"78"}
      POST {"body":""} -> {"method":"POST","contentType":"application/x-www-form-urlencoded","contentLength":"0","bodyHex":""}
      ",
      }
    `);
  });

  test("urlRequest - HEAD returns without waiting for a body", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        const result = net.urlRequest("HEAD", "http://127.0.0.1:${port}/text-with-length");
        console.log("status:", result.status);
        console.log("response:", JSON.stringify(result.response));
        console.log("content-length:", JSON.stringify(result.responseHeaders["content-length"]));
      `,
    ]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "status: 200
      response: ""
      content-length: ["17"]
      ",
      }
    `);
  });

  test("urlRequest - non-2xx status doesn't throw", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        const result = net.urlRequest("POST", "http://127.0.0.1:${port}/error", { body: "x" });
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

  test("urlRequest - binary returns ArrayBuffer", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        const result = net.urlRequest("GET", "http://127.0.0.1:${port}/binary", { binary: true });
        console.log("status:", result.status);
        console.log("response type:", result.response.constructor.name);
        const view = new Uint8Array(result.response);
        console.log("data:", Array.from(view).map((byte) => byte.toString(16)).join(" "));
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
      data: de ad be ef
      ",
      }
    `);
  });

  test("urlRequest - redirects", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        const requests = [
          ["POST", 303],
          ["POST", 307],
          ["PUT", 301],
          ["PUT", 302],
          ["PUT", 303],
          ["PUT", 308],
        ];
        for (const [method, statusCode] of requests) {
          const result = net.urlRequest(method, "http://127.0.0.1:${port}/redirect/" + statusCode, { body: "x" });
          const echoed = JSON.parse(result.response);
          console.log(method, statusCode, "->", echoed.method, "bodyHex:", JSON.stringify(echoed.bodyHex), "location:", "location" in result.responseHeaders);
        }
      `,
    ]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "POST 303 -> GET bodyHex: "" location: false
      POST 307 -> POST bodyHex: "78" location: false
      PUT 301 -> PUT bodyHex: "78" location: false
      PUT 302 -> PUT bodyHex: "78" location: false
      PUT 303 -> PUT bodyHex: "" location: false
      PUT 308 -> PUT bodyHex: "78" location: false
      ",
      }
    `);
  });

  test("urlRequest - invalid options throw", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        const attempts = [
          [5, {}],
          ["POST", { body: 5 }],
          ["POST", { body: new Uint8Array(2) }],
          ["HEAD", { body: "x" }],
        ];
        for (const [method, options] of attempts) {
          try {
            net.urlRequest(method, "http://127.0.0.1:${port}/echo-request", options);
            console.log("ERROR: should have thrown");
          } catch (error) {
            console.log(error.name + ": " + error.message);
          }
        }
      `,
    ]);
    await run.completion;
    expect(run.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "TypeError: method must be a string
      TypeError: 'body' option must be a string or ArrayBuffer
      TypeError: 'body' option must be a string or ArrayBuffer
      TypeError: 'body' option cannot be used with the HEAD method
      ",
      }
    `);
  });

  test("urlRequest - ArrayBuffer body detached by an option getter throws", async () => {
    const run = spawn(binDir("qjs"), [
      "-e",
      `
        const net = require("quickjs:net");
        const body = new ArrayBuffer(4);
        try {
          net.urlRequest("PUT", "http://127.0.0.1:${port}/echo-request", {
            body,
            get headers() {
              body.transfer();
              return {};
            },
          });
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
        "stdout": "TypeError: ArrayBuffer is detached
      ",
      }
    `);
  });
});
