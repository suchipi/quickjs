---
paths:
  - "src/builtin-modules/quickjs-curl/**"
  - "tests/curl-module.test.ts"
---

# urlRequest vs WHATWG fetch: verified gaps

Gaps in `quickjs:curl` `urlRequest` compared to [WHATWG Fetch](https://fetch.spec.whatwg.org/), excluding async and streamed response reading. "Observed" means checked on 2026-10-25 against a raw `node:net` server with `build/bin/qjs` and macOS system libcurl 8.7.1 (probe scripts were in `.tmp/fetch-gap-probe/`, which is not tracked).

## Input validation that fetch does and urlRequest doesn't

- Header values with CR/LF are sent verbatim, so they inject headers (observed: `{ "X-Test": "a\r\nInjected: yes" }` arrived as two header lines). Fetch's [header value](https://fetch.spec.whatwg.org/#header-value) forbids NUL, CR, and LF, and the Headers methods throw a TypeError ([#headers-validate](https://fetch.spec.whatwg.org/#headers-validate)). `CURLOPT_HTTPHEADER(3)` says libcurl adds CRLF itself and does not filter.
- The method is sent verbatim (observed: `"post"` went out as `post`). Fetch requires a [token](https://fetch.spec.whatwg.org/#concept-method), [normalizes](https://fetch.spec.whatwg.org/#concept-method-normalize) DELETE/GET/HEAD/OPTIONS/POST/PUT to uppercase, and throws on CONNECT/TRACE/TRACK ([#forbidden-method](https://fetch.spec.whatwg.org/#forbidden-method)). See also the CUSTOMREQUEST notes in `libcurl-request-methods-and-redirects-2026-10-23-174308Z.md`.
- GET with a body is sent with `Content-Length` and the default form Content-Type (observed). The [Request constructor](https://fetch.spec.whatwg.org/#dom-request) throws a TypeError for GET or HEAD with a body; urlRequest only throws for HEAD.

## libcurl defaults that matter here

- `CURLOPT_ACCEPT_ENCODING` defaults to NULL, so libcurl neither sends `Accept-Encoding` nor decompresses. Adding `Accept-Encoding` through `headers` gets you the compressed bytes back ([CURLOPT_ACCEPT_ENCODING](https://curl.se/libcurl/c/CURLOPT_ACCEPT_ENCODING.html)). Fetch decodes content codings in [HTTP-network fetch](https://fetch.spec.whatwg.org/#http-network-fetch).
- `CURLOPT_TIMEOUT` defaults to 0, which never times out ([CURLOPT_TIMEOUT](https://curl.se/libcurl/c/CURLOPT_TIMEOUT.html)). urlRequest sets no timeout, so a stalled server blocks the calling thread indefinitely.
- `CURLOPT_MAXREDIRS` defaults to 30 since libcurl 8.3.0 and was unlimited before ([CURLOPT_MAXREDIRS](https://curl.se/libcurl/c/CURLOPT_MAXREDIRS.html)). Fetch fails at 20 ([#http-redirect-fetch](https://fetch.spec.whatwg.org/#http-redirect-fetch) step 7). On pre-8.3.0 libcurl a redirect loop never ends.
- libcurl drops custom `Authorization` (7.58.0+) and `Cookie` (7.64.0+) headers when a redirect goes to a different host ([CURLOPT_HTTPHEADER](https://curl.se/libcurl/c/CURLOPT_HTTPHEADER.html)). Fetch removes `Authorization` on a cross-origin redirect ([#http-redirect-fetch](https://fetch.spec.whatwg.org/#http-redirect-fetch) step 13). This is close to parity; whether libcurl also strips on a same-host port or scheme change wasn't checked.

## Other

- `data:` URLs fail with "URL using bad/illegal format or missing URL" (observed). Fetch handles them in [scheme fetch](https://fetch.spec.whatwg.org/#scheme-fetch).
- `body` rejects typed arrays and DataView (`TypeError: 'body' option must be a string or ArrayBuffer`, observed with a Uint8Array). Fetch accepts any BufferSource ([#bodyinit-unions](https://fetch.spec.whatwg.org/#bodyinit-unions)).
