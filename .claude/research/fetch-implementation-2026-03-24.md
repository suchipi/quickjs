# quickjs:fetch Implementation — Research & Status

**Date**: 2026-03-24
**Status**: Implementation complete, all tests passing

## Architecture

### HTTP Client Library (`src/lib/httpclient/`)

Platform-specific synchronous HTTP client with a common C API (`httpclient.h`):

| File | Platform | Backend | Notes |
|------|----------|---------|-------|
| `httpclient-curl.c` | macOS, Linux, FreeBSD | libcurl (linked at compile time) | Standard path for Unix-like platforms |
| `httpclient-winhttp.c` | Windows (MSYS2/MinGW) | WinHTTP (system DLL) | Uses `utf-conv.h` for UTF-8↔UTF-16 |
| `httpclient-cosmo.c` | Cosmopolitan | libcurl (via `cosmo_dlopen`) or WinHTTP (via `cosmo_dlopen` on Windows) | Runtime OS detection via `IsWindows()` macro from `<libc/dce.h>` |
| `httpclient-stub.c` | WASM/WASI, or `CONFIG_FETCH=0` | None | Returns error immediately |
| `httpclient.c` | All | Dispatcher | `#include`s the right platform file via `#ifdef` |

### Fetch Builtin Module (`src/builtin-modules/quickjs-fetch/`)

- **`quickjs-fetch.c`** — Core implementation (~1100 lines)
  - `Headers` class: `get`, `set`, `has`, `delete`, `append`, `forEach`, `entries`
  - `Response` class: `ok`, `status`, `statusText`, `url`, `redirected`, `type`, `headers`, `text()`, `json()`, `arrayBuffer()`
  - `fetch()` function: async via pthread + pipe notification to event loop
  - Synchronous fallback when `SKIP_WORKER` is defined
- **`quickjs-fetch.h`** — Public C API (`js_init_module_fetch`, `js_fetch_add_globals`)
- **`quickjs-fetch.d.ts`** — TypeScript definitions for `"quickjs:fetch"` module + globals
- **`quickjs-fetch.ninja.js`** — Build rules, conditional on `CONFIG_FETCH !== "0"`

### Build Integration

- Module registered in `src/quickjs-modulesys/module-impl.js` as `"quickjs:fetch"`
- Initialized in `src/archives/quickjs-full-init.c` (conditional on `CONFIG_FETCH`)
- Object files included in `src/archives/full.ninja.js` (not in core archive)
- Linker flags in `meta/ninja/defs.ninja.js`: `-lcurl` on macOS/Linux/FreeBSD, `-lwinhttp` on Windows

## Key Bugs Found & Fixed

### 1. Flaky `json()` method (race condition with `JS_ParseJSON`)

`JS_ParseJSON` called directly on `rd->http_resp->body` intermittently failed with "unexpected character" or "unexpected data at the end" despite the body being valid JSON. Root cause unclear (possible buffer boundary issue in the parser). **Fix**: Use `JSON.parse()` via `JS_Call` on a JS string created from the body, which is reliable.

### 2. Windows event loop didn't handle non-console rw_handlers

The `js_os_poll` Windows path (`quickjs-os.c`) only waited on:
- Console handle (fd 0)
- Worker message pipe handles
- Worker done notification handle

It did NOT add arbitrary `rw_handler` file descriptors to `WaitForMultipleObjects`. The fetch completion pipe was registered as an rw_handler but never polled. **Fix**: Added non-console rw_handler fds to the handles array in `js_os_poll`.

### 3. Windows `pipe()` not compatible with `select()`

On Windows, `_pipe()` creates file descriptors that don't work with `select()` (only sockets do). The Unix event loop uses `select()` for fd polling. **Fix**: On Windows, use a self-connected TCP socket pair (`win32_socketpair`) instead of `_pipe()`, so the file descriptors are sockets that work with both `select()` and `WaitForMultipleObjects`.

### 4. Cosmopolitan `dlopen` vs `cosmo_dlopen`

Cosmopolitan Libc's standard `dlopen()` returns an error: "dlopen() isn't supported; consider using cosmo_dlopen()". **Fix**: Use `cosmo_dlopen`, `cosmo_dlsym` (with `cosmo_dltramp` wrapper), and `cosmo_dlclose`. Also needed `_COSMO_SOURCE` defined for `IsWindows()` macro from `<libc/dce.h>`.

### 5. Cosmo can't load ARM64 libcurl on ARM64 macOS

The Cosmopolitan APE binary is x86_64. On ARM64 macOS it runs under Rosetta 2 as x86_64, but the system's libcurl.dylib is ARM64. Cross-architecture dlopen is impossible. **Workaround**: Cosmo network tests are skipped on ARM64 macOS. On x86_64 Linux (the primary cosmo target), libcurl.so loads fine.

## WHATWG Fetch Spec Gaps

See `src/builtin-modules/quickjs-fetch/README.md` for full details. Key gaps:
- No `Request` class (plain object options only)
- No streaming/`ReadableStream` body
- Body consumption methods (`text()`, `json()`, `arrayBuffer()`) don't enforce single-use
- No `FormData` or `Blob` body types
- No `AbortController`/`AbortSignal` support
- `redirect: "manual"` returns empty response (no opaque-redirect handling)
- No CORS (not applicable to server-side engine)

## Test Coverage

| Test File | Tests | Platform |
|-----------|-------|----------|
| `tests/fetch.test.ts` | 11 tests | Native macOS/Linux |
| `tests/fetch-wine.test.ts` | 6 tests | Windows binary under Wine |
| `tests/fetch-cosmo.test.ts` | 6 tests (5 skipped on ARM64 macOS) | Cosmopolitan APE |

All tests use a local HTTP server (Node.js `http.createServer`) for integration testing.
