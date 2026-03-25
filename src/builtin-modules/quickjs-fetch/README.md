# quickjs:fetch

Builtin module implementing the core [WHATWG Fetch API](https://fetch.spec.whatwg.org/).

Available as `import { fetch } from "quickjs:fetch"` and as the global `fetch()`.

## Implementation

### Architecture

`fetch()` returns a `Promise` and performs the HTTP request in a background pthread. The event loop is notified via a pipe when the request completes, at which point the Promise is resolved with a `Response` object. The response body is fully buffered in memory before the Promise resolves.

When pthreads are unavailable (`SKIP_WORKER`), fetch falls back to synchronous blocking — the Promise is immediately resolved/rejected.

### HTTP transport (`src/lib/httpclient/`)

| Platform | Backend | Notes |
|---|---|---|
| macOS | libcurl (system) | Pre-installed at `/usr/lib/libcurl.dylib` |
| Linux | libcurl | Link-time dependency (`-lcurl`) |
| FreeBSD | libcurl | Link-time dependency (`-lcurl`) |
| Windows | WinHTTP | Statically linked (`-lwinhttp`), built-in to Windows |
| Cosmopolitan | libcurl or WinHTTP via `dlopen` | Detects OS at runtime; tries WinHTTP on Windows, libcurl elsewhere |
| WASM/WASI | Stub | Returns "fetch is not supported on this platform" |

Fetch can be disabled at build time with `CONFIG_FETCH=0`, which excludes all HTTP client code and link flags.

## What's implemented

### `fetch(url, init?)`

- `url`: string (required)
- `init.method`: any HTTP method string (default `"GET"`)
- `init.headers`: plain object `{ name: value }`, `[name, value][]` array, or `Headers` instance
- `init.body`: `string` or `ArrayBuffer`
- `init.redirect`: `"follow"` (default, up to 20 redirects), `"error"`, or `"manual"`
- Returns `Promise<Response>`
- Network errors reject the Promise

### `Headers`

- Constructor accepts: no args, plain object, `[name, value][]` array, or another `Headers`
- `.get(name)` — returns value or `null`; case-insensitive lookup
- `.set(name, value)` — replaces existing or adds new
- `.has(name)` — boolean; case-insensitive
- `.delete(name)` — removes entry
- `.append(name, value)` — appends with `, ` separator per spec
- `.forEach(callback)` — iterates `(value, name, headers)`
- `.entries()` — returns `[name, value][]` array

### `Response`

- `.status` — HTTP status code (number)
- `.statusText` — status text (string); empty for HTTP/2 responses
- `.ok` — `true` if status is 200-299
- `.url` — final URL after redirects
- `.redirected` — `true` if a redirect occurred
- `.type` — always `"basic"`
- `.headers` — `Headers` object (lazily created, cached)
- `.text()` — returns `Promise<string>`
- `.json()` — returns `Promise<any>` (parses body as JSON)
- `.arrayBuffer()` — returns `Promise<ArrayBuffer>`

### Globals

`fetch`, `Headers`, and `Response` are available as globals (like in browsers), following the same pattern as `setTimeout`/`setInterval`. They are also available in Worker contexts.

## Gaps vs. the WHATWG Fetch standard

### Not implemented

| Feature | Spec section | Notes |
|---|---|---|
| `Request` class | [5.4](https://fetch.spec.whatwg.org/#request-class) | `fetch()` only accepts a URL string, not a `Request` object |
| `Response` constructor | [5.3](https://fetch.spec.whatwg.org/#response-class) | `Response` objects are only created internally by `fetch()` |
| `Response.clone()` | [5.3](https://fetch.spec.whatwg.org/#dom-response-clone) | |
| `Response.error()` / `Response.redirect()` | [5.3](https://fetch.spec.whatwg.org/#dom-response-error) | Static factory methods |
| `Response.body` (ReadableStream) | [5.3](https://fetch.spec.whatwg.org/#dom-body-body) | Body is fully buffered; no streaming. `.text()`, `.json()`, `.arrayBuffer()` return immediately-resolved Promises |
| `Response.bodyUsed` | [5.3](https://fetch.spec.whatwg.org/#dom-body-bodyused) | Body can be consumed multiple times (no single-use restriction) |
| `Response.formData()` | [5.3](https://fetch.spec.whatwg.org/#dom-body-formdata) | No `FormData` support |
| `Response.blob()` | [5.3](https://fetch.spec.whatwg.org/#dom-body-blob) | No `Blob` support |
| `AbortController` / `AbortSignal` | [DOM Standard](https://dom.spec.whatwg.org/#interface-abortcontroller) | `init.signal` is not supported; requests cannot be cancelled |
| `Headers` iterator protocol | [5.2](https://fetch.spec.whatwg.org/#headers-class) | `.entries()` returns an array, not an iterator. No `Symbol.iterator`, `.keys()`, or `.values()` |
| `Headers` guard | [5.2](https://fetch.spec.whatwg.org/#concept-headers-guard) | No immutable/request/response guard; all headers are mutable |
| `Headers` sort order | [5.2](https://fetch.spec.whatwg.org/#concept-header-list-sort-and-combine) | Headers are stored in insertion order, not sorted |
| `init.cache` | [5.5](https://fetch.spec.whatwg.org/#dom-request-cache) | No cache mode control |
| `init.credentials` | [5.5](https://fetch.spec.whatwg.org/#dom-request-credentials) | No credentials mode (cookies are not sent) |
| `init.integrity` | [5.5](https://fetch.spec.whatwg.org/#dom-request-integrity) | No subresource integrity checking |
| `init.keepalive` | [5.5](https://fetch.spec.whatwg.org/#dom-request-keepalive) | Connections are not reused |
| `init.mode` | [5.5](https://fetch.spec.whatwg.org/#dom-request-mode) | No CORS; all requests are same-origin equivalent |
| `init.priority` | [5.5](https://fetch.spec.whatwg.org/#dom-request-priority) | No fetch priority hints |
| `init.referrer` / `init.referrerPolicy` | [5.5](https://fetch.spec.whatwg.org/#dom-request-referrer) | No referrer policy |
| `init.window` | [5.5](https://fetch.spec.whatwg.org/#dom-request-window) | No window association |
| CORS | [3.2](https://fetch.spec.whatwg.org/#http-cors-protocol) | Not applicable in a non-browser context |
| Service Workers | [4](https://fetch.spec.whatwg.org/#http-fetch) | Not applicable |
| HTTP cache | [4.7](https://fetch.spec.whatwg.org/#http-cache) | No HTTP caching layer |

### Behavioral differences

- **Body consumption**: The response body is fully buffered in memory before the `fetch()` Promise resolves. `.text()`, `.json()`, and `.arrayBuffer()` return immediately-resolved Promises (not streaming). The body can be consumed multiple times.
- **Redirect tracking**: On the WinHTTP backend (Windows, Cosmopolitan on Windows), `Response.url` always reflects the original request URL, not the final URL after redirects. `Response.redirected` may incorrectly report `false` after redirects on these backends.
- **Timeout**: All requests have a 30-second timeout (not configurable via the fetch API). This is a libcurl/WinHTTP-level setting.
- **HTTP versions**: HTTP/1.1 and HTTP/2 are supported (depending on the platform's libcurl/WinHTTP version). HTTP/3 may be supported if the system libcurl was built with it.
- **TLS**: TLS is handled by the platform (libcurl's configured TLS backend, or Schannel on Windows). Certificate validation uses the system trust store.
- **Compression**: Response decompression (gzip, deflate, brotli) is handled automatically by libcurl. WinHTTP also handles common encodings.
- **Cookie handling**: Cookies are not stored or sent between requests. Each `fetch()` call is independent.
