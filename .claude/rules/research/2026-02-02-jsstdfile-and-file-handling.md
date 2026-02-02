---
paths:
  - "src/builtin-modules/quickjs-libc/**"
---

# JSSTDFile and FILE Handling

## JSSTDFile struct (quickjs-libc.c ~line 791)

```c
typedef struct {
    FILE *f;
    BOOL close_in_finalizer;
    BOOL is_popen;
} JSSTDFile;
```

- Wraps a C `FILE*` pointer
- `close_in_finalizer`: if true, `fclose`/`pclose` is called when GC'd
- `is_popen`: if true, uses `pclose()` instead of `fclose()` in finalizer

## Creation

`js_new_std_file(ctx, f, close_in_finalizer, is_popen)` creates a new FILE JS object.

After creation, a `target` property is set on the object for debugging (e.g. the filename, fd number, or description like `"stdin"`).

## Key functions

- `js_std_file_get(ctx, obj)` — extracts `FILE*` from a JS FILE object (returns NULL and throws if closed)
- `js_std_open` — `std.open(filename, flags)` via `fopen`
- `js_std_popen` — `std.popen(command, flags)` via `popen`
- `js_std_fdopen` — `std.fdopen(fd, flags)` via `fdopen`
- `js_std_tmpfile` — `std.tmpfile()` via `tmpfile`
- `js_std_isFILE` — `std.isFILE(value)` checks if opaque is JSSTDFile

## FILE methods (registered on prototype)

puts, printf, flush, sync, seek, tell, tello, eof, fileno, read, write, writeTo, getline, readAsString, getByte, putByte, setvbuf, close.

## Class ID

`js_std_file_class_id` — the JSClassID used for FILE objects. Can be used with `JS_GetOpaque(val, js_std_file_class_id)` to check if a value is a FILE object.

## Finalizer

Calls `pclose(f)` if `is_popen`, otherwise `fclose(f)`, only if `close_in_finalizer` is true.

## Win32 HANDLE ↔ CRT fd ↔ FILE* bridge

On Windows (mingw), available in `<io.h>` (already included):
- `_open_osfhandle(HANDLE, flags)` → CRT fd. Takes ownership of the HANDLE.
- `_get_osfhandle(fd)` → HANDLE. Does NOT transfer ownership.
- `fdopen(fd, mode)` → `FILE*`. Takes ownership of the fd.
- `fileno(FILE*)` → fd. Does NOT transfer ownership.

Ownership chain: `_open_osfhandle` → `fdopen` creates a `FILE*` that owns the HANDLE. `fclose` closes the fd which closes the HANDLE. No separate `CloseHandle` call needed.

`_get_osfhandle` is already used in the codebase (~lines 2029, 2053, 2057, 2495) for console operations like `ttyGetWinSize` and `ttySetRaw`.
