---
paths:
  - "src/builtin-modules/quickjs-net/**"
  - "tests/net-module.test.ts"
---

# urlRequest's `redirect` option vs WHATWG fetch

Checked on 2026-10-25 with Node 22.23.2's `fetch` and `build/bin/qjs` on macOS, both against the same local `node:http` server (probe scripts were in `.tmp/redirect-probe/`, which is not tracked).

## What the spec and Node do

- A [redirect status](https://fetch.spec.whatwg.org/#redirect-status) is 301, 302, 303, 307, or 308. [HTTP fetch](https://fetch.spec.whatwg.org/#http-fetch) step 6 switches on the redirect mode based on the status alone. The `Location` check only happens later, in [HTTP-redirect fetch](https://fetch.spec.whatwg.org/#http-redirect-fetch) step 4. So `"error"` fails on a 302 with no `Location`. Node agrees (observed: `TypeError: fetch failed`, cause `Error: unexpected redirect`).
- Other 3xx statuses are not redirect statuses. Node's `fetch` returns them as-is in all three modes, even with a `Location` header (observed for 300, 304, 305, 306, 309, and 399).
- The spec's `"manual"` produces an [opaque-redirect filtered response](https://fetch.spec.whatwg.org/#concept-filtered-response-opaque-redirect), which has status 0 and an empty header list. Node instead returns the real 3xx response with its `location` header and body (observed). `urlRequest` follows Node here.
- Node throws a TypeError for `redirect: "FOLLOW"`, `5`, or `null` (observed). The values are case-sensitive.

## libcurl's follow mode differs from fetch's

With `CURLOPT_FOLLOWLOCATION = 1L`, libcurl followed every non-redirect 3xx that had a `Location` header. 300, 304, 305, 306, 309, and 399 were tried (observed through `urlRequest`, with whatever libcurl `dlopen("libcurl.dylib")` picked up; the version wasn't rechecked). Fetch follows none of them, so `urlRequest`'s default `"follow"` mode diverges from fetch for all of them. `"manual"` sets `FOLLOWLOCATION` to 0, so it never follows anything.

The [CURLOPT_FOLLOWLOCATION](https://curl.se/libcurl/c/CURLOPT_FOLLOWLOCATION.html) man page lists no setting that limits which status codes get followed. Matching fetch would mean setting `FOLLOWLOCATION` to 0 and following redirects by hand with [CURLINFO_REDIRECT_URL](https://curl.se/libcurl/c/CURLINFO_REDIRECT_URL.html). That gives up protections libcurl applies only when it follows a redirect itself. One is the redirect protocol allowlist, which defaults to HTTP, HTTPS, FTP, and FTPS since 7.65.2 ([CURLOPT_REDIR_PROTOCOLS_STR](https://curl.se/libcurl/c/CURLOPT_REDIR_PROTOCOLS_STR.html)). The other is dropping custom `Authorization` and `Cookie` headers on a redirect to another host. On 2026-10-25 the user decided not to fix this divergence, because libcurl has no option for it.

`"follow"` also keeps libcurl's redirect limit. See `CURLOPT_MAXREDIRS` in `urlrequest-vs-fetch-gaps-2026-10-25-001824Z.md`.

## `"error"` matches `"follow"`, not fetch

`"error"` also sets `FOLLOWLOCATION` to 0. It throws whenever libcurl reports a `CURLINFO_REDIRECT_URL`, and libcurl sets that for exactly the responses it would have followed. Observed: `"follow"` and `"error"` agreed on every status from 300 to 399, and also when the `Location` header was empty, blank, or missing, and when a 200, 201, or 400 had a `Location`. So unlike fetch's `"error"`, it throws for a 300 with a `Location` and returns a 302 without one as-is. On 2026-10-25 the user chose this so that `"error"` throws in exactly the cases where `"follow"` would follow.
