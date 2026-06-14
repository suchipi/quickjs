---
paths:
  - "src/quickjs/quickjs.c"
  - "src/run-test262/test262o.conf"
  - "src/run-test262/test262o_errors.txt"
---

# Global-object accessor-to-data conversion forces writable=true (spec bug)

## Symptom

`Object.defineProperty(globalObject, "prop", { value: 1001 })`, when `prop` is an existing **configurable accessor** property of the **global object**, produces a data property with `writable: true`. Per ES spec it should be `writable: false` (a `defineProperty` whose descriptor omits `writable`, converting accessor to data, defaults the absent attribute to `false`).

The same operation on a **regular object** correctly yields `writable: false`.

Minimal repro:

```js
function check(label, obj) {
  obj.verifySetFunc = "data";
  Object.defineProperty(obj, "prop", {
    get: function(){ return obj.verifySetFunc; },
    set: function(v){ obj.verifySetFunc = v; },
    enumerable: true, configurable: true
  });
  Object.defineProperty(obj, "prop", { value: 1001 });
  print(label, Object.getOwnPropertyDescriptor(obj, "prop").writable);
  delete obj.prop; delete obj.verifySetFunc;
}
check("regular:", {});   // writable=false  (correct)
check("global: ", this); // writable=true   (BUG)
```

Surfaced by two legacy test262o tests that exercise this on the global object:
- `test262o/test/suite/ch15/15.2/15.2.3/15.2.3.6/15.2.3.6-4-538-3.js`
- `.../15.2.3.6-4-538-7.js`

Both fail with `Test262 Error: Test case returned non-true value!` (the test's `dataPropertyAttributesAreCorrect(..., writable=false, ...)` check fails).

## Root cause

In `JS_DefineProperty` ([src/quickjs/quickjs.c](src/quickjs/quickjs.c)), the branch that converts an accessor (GETSET) property to a data descriptor special-cases the global object (around line 10666-10693 as of this writing):

- **Global object:** allocates a `JSVarRef` (via `js_global_object_find_uninitialized_var`, which falls back to `js_create_var_ref` when there is no pending uninitialized var) and sets the property flags to `JS_PROP_VARREF | JS_PROP_WRITABLE`, forcing writable **on unconditionally**. Global-object data properties are stored as varrefs so the bytecode interpreter can fast-path global variable reads/writes; varrefs are treated as "always writable" (see the `/* Note: JS_PROP_VARREF is always writable */` comment near line 10695).
- **Regular object:** clears `JS_PROP_WRITABLE` (`prs->flags &= ~(JS_PROP_TMASK | JS_PROP_WRITABLE)`), so the property starts non-writable.

After the conversion, the later flag-application code only adjusts writable when `JS_PROP_HAS_WRITABLE` is set in the incoming flags. A descriptor of `{ value: 1001 }` sets `JS_PROP_HAS_VALUE` but **not** `JS_PROP_HAS_WRITABLE` (confirmed in `js_obj_to_desc`, [src/quickjs/quickjs.c](src/quickjs/quickjs.c) ~line 41237: `HAS_WRITABLE` is only added when the descriptor literally has a `writable` key). So the forced-on writable from the VARREF path is never corrected back to the spec default of `false`.

The VARREF path does have a way to clear writable: the block at ~10720-10737 handles `(flags & (JS_PROP_HAS_WRITABLE | JS_PROP_WRITABLE)) == JS_PROP_HAS_WRITABLE` by setting `var_ref->is_const = TRUE` and clearing `JS_PROP_WRITABLE` on the global object. But that only fires when the caller **explicitly** passes `writable:false`; it does not fire for the accessor-to-data default case.

## Present in upstream too

This is **not** a fork regression and **not** fixed by any pending upstream commit. `bellard/quickjs@master` has byte-identical logic: `git show upstream/master:quickjs.c` contains the same `JS_PROP_VARREF | JS_PROP_WRITABLE` (upstream line ~10476) and the same `js_global_object_find_uninitialized_var` fallback. So upstream QuickJS exhibits the identical `writable=true` behavior on the global object.

## Relevance to upstream-merge work

Discovered while porting upstream `2504823` (multi-threaded run-test262). The mandatory post-PORT `runo.sh -u` surfaced these 2 failures, which were absent from the committed (empty) `test262o_errors.txt`. Verified the failures are pre-existing by building the **pre-port** `run-test262.c` from `HEAD` and re-running: the old binary produces the same 2 failures, and they reproduce in isolation (`run-test262 -f <test>`). The empty `test262o_errors.txt` baseline was simply stale; the threading port did not cause these.

## Fix sketch (not yet applied)

To make accessor-to-data conversion on the global object honor the spec default, the VARREF branch should resolve writable from the descriptor with a default of `false` (matching the regular-object branch): when converting GETSET to data and `JS_PROP_HAS_WRITABLE` is absent, treat writable as false (mark the new varref `is_const = TRUE` and clear `JS_PROP_WRITABLE`). Because this code is identical upstream, any fix here is a deliberate fork divergence from upstream behavior. Confirm with the user before landing, and consider whether it belongs as a fork-local fix or whether to wait and see if upstream ever addresses it.
