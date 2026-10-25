---
paths:
  - "src/builtin-modules/quickjs-net/**"
  - "tests/net-module.test.ts"
---

# What libcurl's header callback passes through (quickjs:net)

Observed on 2026-10-25 with macOS system libcurl 8.7.1 by sending hand-written raw responses from a `node:net` server and printing `urlGet(..., { full: true }).responseHeaders`, which is the header block exactly as `perform_request_header_callback` collected it. `js_net_new_headers_object` (the `urlRequest` header parser) depends on these.

| Raw response line | What reaches the header callback |
|---|---|
| Folded continuation (`"   second\r\n"`, `"\tthird\r\n"`) | Passed through as its own line, leading whitespace intact. libcurl does not unfold. |
| Bare LF line ending (`"X-Bare-LF: yes\n"`) | Passed through with the lone `\n`. |
| Padding around the value (`"X-Spaces:    padded value   \r\n"`) | Passed through untrimmed. |
| Space before the colon (`"X-Space-Before : value\r\n"`) | Passed through unchanged. |
| Bare CR inside a value (`"X-Bare-CR: a\rb\r\n"`) | Passed through unchanged. RFC 9112 section 2.2 requires the recipient to reject it or turn it into a space, so the parser turns it into a space. |
| A line with no colon (`"NoColonHere\r\n"`) | The transfer fails with `Weird server reply`, so the parser never sees it. Other libcurl versions weren't checked, so the parser still skips such lines. |

Node's `http` module can't produce most of these. `validateHeaderValue` throws `ERR_INVALID_CHAR` for a value containing CRLF, and `validateHeaderName` throws `ERR_INVALID_HTTP_TOKEN` for a name with a trailing space. That's why the `/raw-headers` route in `tests/net-module.test.ts` writes raw bytes to `req.socket`.
