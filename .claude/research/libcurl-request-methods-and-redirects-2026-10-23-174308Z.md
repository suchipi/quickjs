---
paths:
  - "src/builtin-modules/quickjs-net/**"
  - "tests/net-module.test.ts"
---

# libcurl request methods, bodies, and redirects (quickjs:net urlRequest)

Gotchas found while adding `urlRequest` to `quickjs:net`. Observations marked "observed" were checked against a Node `http` server; the same results came from system libcurl 8.7.1 (`/usr/lib/libcurl.4.dylib`, what `dlopen("libcurl.dylib")` loads on macOS) and MacPorts libcurl 8.13.0 (loaded by setting `DYLD_LIBRARY_PATH=/opt/local/lib` on the child process; `DYLD_PRINT_LIBRARIES=1` shows which one was picked).

## CURLOPT_CUSTOMREQUEST only renames the method

Per `CURLOPT_CUSTOMREQUEST(3)`, libcurl still behaves according to its internal request type (GET by default, HEAD via `CURLOPT_NOBODY`, POST via `CURLOPT_POSTFIELDS`); the custom string just replaces the word in the request line, verbatim, with no validation of whitespace or control characters.

- HEAD must use `CURLOPT_NOBODY`. Observed with the curl CLI against a server that sends `Content-Length: 17` and no body: `curl -I` returned immediately, `curl -X HEAD` hung about 6 seconds (Node's keep-alive timeout) and then failed with error 18, "transfer closed with 17 bytes remaining to read".
- A bodyless POST done as `CUSTOMREQUEST "POST"` sends no `Content-Length` (observed). libcurl's `CURLOPT_POSTFIELDS(3)` says an empty POST should set `POSTFIELDS` to `""` instead; that sends `Content-Length: 0` (observed).
- `POSTFIELDS` set to NULL makes libcurl read the body from the read callback, which defaults to stdin (`CURLOPT_POSTFIELDS(3)`). JS-created ArrayBuffers never have NULL data (`js_array_buffer_constructor3` allocates `max_int(len, 1)` bytes), so `JS_GetArrayBuffer` on one is safe to pass.

## Redirects with CURLOPT_FOLLOWLOCATION = 1L

Observed, identical on 8.7.1 and 8.13.0:

| Setup | 301 / 302 / 303 | 307 / 308 |
|---|---|---|
| `POSTFIELDS`, no custom method (real POST) | GET, body dropped | POST, body resent |
| `CUSTOMREQUEST X` + `POSTFIELDS` (e.g. PUT with body) | X, body dropped, no Content-Length | X, body resent |
| `CUSTOMREQUEST X`, no body (e.g. DELETE) | X | X |
| `NOBODY` (HEAD) | HEAD | HEAD |

The second row means a PUT that hits an http-to-https 301 would arrive as a PUT with an empty body. Setting `CURLOPT_POSTREDIR` to `CURL_REDIR_POST_301 | CURL_REDIR_POST_302` makes 301/302 resend the custom method with its body (observed on both versions); `urlRequest` sets it whenever a custom method has a body. A 303 still drops the body. Per the man page (not tested here), `CURLOPT_FOLLOWLOCATION = 2` (`CURLFOLLOW_OBEYCODE`, libcurl 8.13.0+) switches a custom method to GET on 303; older libcurl treats any non-zero `FOLLOWLOCATION` value as 1.

## Headers libcurl adds for a body

- `POSTFIELDS` adds `Content-Type: application/x-www-form-urlencoded` unless the request's headers already set `Content-Type` (observed, also documented in `CURLOPT_POSTFIELDS(3)`).
- A 2 MiB body was sent with `Expect: 100-continue` (observed). Node's http server answers that automatically, so nothing special is needed in tests.

## ArrayBuffer bodies must be read after every option getter runs

Option getters (and Proxy traps on the headers object) run arbitrary JS, which can detach (`ArrayBuffer.prototype.transfer`) or resize the body's ArrayBuffer. `urlRequest` only type-checks the body while parsing options and calls `JS_GetArrayBuffer` right before `curl_easy_perform`, when no more JS can run. `tests/net-module.test.ts` covers this with a `headers` getter that detaches the body, which must throw `TypeError: ArrayBuffer is detached`.
