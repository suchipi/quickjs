---
paths:
  - "src/lib/intl/**"
  - "src/lib/temporal/**"
  - "src/quickjs/quickjs.c"
  - "src/quickjs/quickjs.h"
  - "upstream-merge-status.md"
  - "tests/oldtests/**"
---

# Temporal/Intl and upstream-port gotchas (from the 97f64ef..7d1c13c batch)

## Embedded time zone data is regenerated, not patched

Upstream's `gen_tzdata.py` only embedded transitions for the ~59 zones its test262 runs needed; any other zone resolved with a zero offset. With Intl on, `Date.prototype.toLocaleString` goes through Intl, so local times printed as UTC in most zones. The fork's `src/lib/temporal/gen_tzdata.py` embeds every zone and link from the zoneinfo's `tzdata.zi` (fork commit 003f4a7).

- Regenerate from `src/lib` (the script writes `temporal/tzdata_generated.c` relative to the cwd): `cd src/lib && python3 temporal/gen_tzdata.py`.
- When an upstream commit changes `tzdata_generated.c`, apply it and then regenerate; upstream's copy only has its small zone set.
- macOS zoneinfo works: its TZif files are "fat" (transitions through 2037) and it ships `tzdata.zi`. `+VERSION` is excluded from the zone names; IANA's `Factory` zone is excluded because `Intl.DateTimeFormat` rejects it, which fails `intl402/Intl/supportedValuesOf/timeZones-accepted-by-DateTimeFormat.js`.

## Throw sites in the new libraries

Every `JS_Throw*Error` in `src/lib/intl/` and `src/lib/temporal/` passes `"<internal>/<dir>/<file>", __LINE__`, e.g. `"<internal>/temporal/duration.c"`. `__FILE__` leaks the build machine's absolute path into JS stack traces. Upstream patches that touch a throw line conflict on it; take upstream's logic and re-add the arguments.

## The class enum lives in quickjs.h

Upstream keeps `enum { JS_CLASS_OBJECT = 1, ... }` in quickjs.c; the fork moved it to quickjs.h. Any upstream commit that adds a class makes `git apply --3way` re-insert the whole enum into quickjs.c as a conflict. Delete that block and add the new `JS_CLASS_*` entry to quickjs.h at upstream's position.

## Error serialization tables must track JSErrorEnum

The fork's Error serialization has two `static const char * const error_class_names[JS_NATIVE_ERROR_COUNT]` tables (in `detect_native_error_name` and the `BC_TAG_ERROR_OBJECT` reader). When upstream adds a native error type (SuppressedError in 0709d6b), the missing initializer is NULL: the reader then calls `strcmp` on it for any Error whose class name isn't found earlier in the table (plain `Error`, user subclasses), which segfaults worker `onerror` and `bytecode.toValue`. The compiler does not warn about the short initializer.

## Ninja: `rel()` resolves against the loading file

`require()`-ing another `*.ninja.js` runs its `build()` calls with `rel()` relative to the requiring file, so a library's `.ninja.js` can't export its object list for `src/archives/full.ninja.js` to consume. The intl/temporal objects are listed in full.ninja.js by name instead.

## test_intl.js depends on the local zone

`tests/oldtests/test_intl.js` builds dates in local time and checks the formatted wall-clock output, so `oldtests.test.ts` runs it with `TZ=Europe/Paris`.
