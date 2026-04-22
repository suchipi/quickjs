# Upstream Merge Status

Rows ordered oldest → newest. Status is one of: PENDING, PORT, SKIP-NA, SKIP-DONE, SKIP-BAD.

Merge base: `2788d71` ("updated to Unicode 14.0.0"). Target tip at seed time: `d7ae12a` ("added JSON.parse source text access"). Total: 428 commits.

| Short SHA | Status | Subject | Notes |
|-----------|--------|---------|-------|
| 6de52d8 | SKIP-DONE | bf_set_ui() fix (github issue #133) | Already applied in fork: shld/shrd at src/lib/libbf/libbf.c:169-182, bf_set_ui uses shld at :256. |
| 03cc5ec | SKIP-DONE | fixed js_proxy_isArray stack overflow (github issue #178) | Already applied in fork at src/quickjs/quickjs.c:45622-45625. |
| 94010ed | SKIP-BAD | the BigInt support is now always included | Fork wants to keep CONFIG_BIGNUM as a meaningful toggle; do not remove the ifdef guards around BigInt code. |
| cdeca4d | SKIP-DONE | updated to unicode 15.0.0 | Fork is already on Unicode 15 (unicode_download.sh URL, Kawi + Nag_Mundari in unicode_gen_def.h, test262.conf matches). libunicode-table.h is generated from the .txt inputs, not vendored. test262_errors.txt is a fork-specific baseline. |
| 3106401 | SKIP-NA | keep LTO | Makefile only; fork uses Ninja/meta build and doesn't vendor Makefile. |
| f87cab0 | SKIP-DONE | added String.prototype.at, Array.prototype.at and TypedArray.prototype.at | Fork already has js_array_at (:39784), js_string_at (:40759), js_typed_array_at (:52465) in src/quickjs/quickjs.c |
| 321dbfa | PORT | added missing bignum error tests (github issue #159) | Added null checks after JS_ToBigFloat/JS_ToBigDecimal/JS_ToBigInt calls in CONFIG_BIGNUM code |
| 55a4878 | PORT | fixed private field setters (github issue #194) | Fixed scope_put_private_field opcode stack counts (2,0 not 1,1); typo fix unconsistent→inconsistent. OP_drop after setter call_method already present in fork. |
| b14d77b | PORT | fixed negative zero date | Reject negative zero in string_get_signed_digits for Date parsing; 2 test262 errors resolved |
| 26fdf65 | SKIP-DONE | Make Date methods argument coercion spec compliant (bnoordhuis) | Fork already has unconditional argument coercion in set_date_field() at src/quickjs/quickjs.c:48502 |
| c4cdd61 | PORT | fixed lexical scope of 'this' with eval (github issue #192) | Pass vd->is_lexical instead of FALSE in get_closure_var calls in add_eval_variables |
| 4949d75 | SKIP-DONE | Retrieve RegExp 'g' flag in spec conformant way (original patch by bnoordhuis) | Fork already reads flags via JS_ATOM_flags in Symbol.match (:43243) and Symbol.replace |
| 20a57f9 | PORT | Implement extended named capture group identifiers (bnoordhuis) | Extended re_parse_group_name to handle surrogate pairs; removed is_utf16 param. 1 test262 error resolved. |
| 58f374e | PORT | reworked set property and fixed corner cases of typed array set property | Merged JS_SetPropertyGeneric into JS_SetPropertyInternal (new receiver param); callers updated to pass obj+this_obj. Two prior fork pre-ports (4832473, 2bc4159) were reverted first so the port applies cleanly. Items 3 (explicit detach check in JS_DefineProperty), 4 (species), 5 (sort-on-detach) from 4832473 are now re-earned as the corresponding upstream commits get processed. 14 test262 errors fixed; sort-tonumber and no-species still pending upstream b180cd2/b8791e9. |
| e182050 | PORT | fixed delete super.x error | 2-line fix in js_parse_delete: for the OP_get_super_value case, reset byte_code.size and last_opcode_pos before emitting the throw_error opcode so the thrown error is a ReferenceError, not TypeError. 1 test262 error resolved. |
| b180cd2 | PORT | Symbol.species is no longer used in TypedArray constructor from a TypedArray | Removed JS_SpeciesConstructor call in js_typed_array_constructor_ta; per sec-typedarray-create the default %ArrayBuffer% constructor is used unconditionally. 1 test262 error resolved (no-species.js). |
| 177af41 | PORT | fixed duplicate static private setter/getter test | Added is_static_private bit to JSVarDef, threaded is_static through add_private_class_field, and extended the already-defined check in js_parse_class to reject same-name getter+setter pairs on different sides (static vs non-static). Fork's 52e7332 pre-port of this same fix (with different bit name) was partially reverted first to take upstream's shape verbatim for future merges. 4 test262 errors resolved (cross-static early-error tests). |
| a057008 | PORT | added Array.prototype.findLast{Index} and TypeArray.prototype.findLast{index} (initial patch by bnoordhuis) | Added special_find/findIndex/findLast/findLastIndex enum, converted js_array_find/js_typed_array_find to iterate in either direction based on mode, registered new findLast/findLastIndex methods on both prototypes. Updated Array.prototype[Symbol.unscopables] list (merged with fork's existing 'at' entry). Un-skipped test262's array-find-from-last feature in src/run-test262/test262.conf (103 additional tests now run). |
| daa35bc | SKIP-NA | new release | Only updates Changelog and VERSION, neither of which is tracked in the fork. |
| 9e52965 | PORT | raise an error if a private method is added twice to an object | Added the find_own_property check in JS_AddBrand that throws TypeError when the private brand is already installed (matches fork's previous independent pre-port as item 1 of 52e7332; that pre-port was reverted first to take upstream's shape verbatim). Adapted the JS_ThrowTypeError call to include fork's required file/line args. |
| a610598 | PORT | added -fwrapv to CFLAGS to ensure that signed overflows have a well defined behavior | Ported the Makefile CFLAGS change to the fork's Ninja build (meta/ninja/defs.ninja.js) — added `-fwrapv` to both CFLAGS_HOST and CFLAGS_TARGET. The flag alone surfaced a pre-existing OOB-argv read in js_error_constructor triggered by Reflect.construct(Error, []) (fork's custom options-iteration code reads argv[1] without checking argc); added argc guards as part of this commit so the fork doesn't regress. |
| a42681a | PORT | Fix AsyncGenerator.prototype.return error handling (bnoordhuis) | In js_async_generator_completed_return, when js_promise_resolve throws (e.g. poisoned .constructor property), catch the exception and re-route it as a rejection rather than propagating -1. 2 test262 errors resolved (return-state-completed-broken-promise.js, return-suspendedStart-broken-promise.js). |
| 57105c7 | PORT | fixed async generator in case of exception in the implicit await in the 'return' statement | Moved the implicit-await emission in emit_return to before the finally-block drain, so a throwing await is catchable. Also added error handling for js_async_generator_await in js_async_generator_resume_next (FUNC_RET_AWAIT path), and removed an erroneous goto done after js_async_generator_completed_return. 1 test262 error resolved (return-suspendedYield-broken-promise-try-catch.js). |
| 4bb8c35 | PORT | fixed 'return' handling with 'yield' in 'for of' or with finally blocks (gihub ticket #166) | Replaced OP_iterator_close_return with the more general OP_nip_catch, restructured emit_return to emit either nip_catch + iterator_close / nip_catch + gosub finally. Added the new f3 generator regression test to tests/oldtests/test_builtin.js (fork-equivalent of upstream's tests/test_builtin.js addition). Adapted JS_ThrowInternalError calls to fork's file/line convention and clarified "nip_catch" error messages. Regenerated the bytecode snapshot in tests/file-to-bytecode.test.ts (the new opcode inserted at position 184 shifted every subsequent opcode by 1). |
| 9e1ec09 | PORT | test 128 bit integer support (github issue #125) | In src/lib/libbf/libbf.h, the LIMB_LOG2_BITS=6 path requires __int128; also gate on __SIZEOF_INT128__ so compilers without it (e.g. MSVC) fall back to LIMB_LOG2_BITS=5. |
| a96f440 | PORT | fixed js_strtod with large integers (github issue #206) | Fall back to system strtod for base-10 integers that overflow the uint64_t accumulator instead of using pow(10, int_exp), which loses precision. Also added the regression test ((19686109595169230000).toString() === "19686109595169230000") to tests/oldtests/test_language.js (fork-equivalent of upstream's tests/test_language.js). |
| 1692f2a | PORT | safer typed array finalizer | GC can call the ArrayBuffer finalizer before finalizers of typed arrays pointing at it. js_array_buffer_finalizer now walks the abuf->array_list and zeroes each typed array's data pointer + count (non-DataView), plus severs the list link so js_typed_array_finalizer knows not to list_del again. Replaced JS_IsLiveObject(rt, ta->buffer) with the cheaper ta->link.next NULL check. |
| c359951 | PORT | added container_of macro | Added generic container_of(ptr, type, member) macro in src/lib/cutils/cutils.h; reused it from src/lib/list/list.h's list_entry and from JS_FreeCString in quickjs.c. |
| 3ba181e | PORT | fixed define own property with writable=false on module namespace | In JS_DefineProperty's VARREF path: (1) only update the VARREF target when the descriptor isn't the "same value" short-circuit, (2) when flipping a varref to writable=false, throw on JS_CLASS_MODULE_NS since module namespace exports must stay writable (spec). 1 test262 error resolved (define-own-property.js). |
| 4342023 | PORT | removed incorrect await in async yield* | Dropped an extra OP_await that was being emitted before OP_async_yield_star in js_parse_assign_expr2's yield* path; OP_async_yield_star internally performs the await, so the double-await was unwrapping the yielded promise prematurely. 2 test262 errors resolved. |
| 7cefa7b | PORT | 'for of' expression cannot start with 'async' | Reject `for (async of …)` at parse time in js_parse_for_in_of — the spec forbids the unparenthesised `async` token as LHS to `for of` to avoid ambiguity with `for await (… of …)`. 1 test262 error resolved (head-lhs-async-invalid.js). |
| 07ff474 | PORT | use Unicode normalization in String.prototype.localeCompare | Factored out js_string_normalize1 from js_string_normalize and added js_UTF32_compare; js_string_localeCompare now NFC-normalizes both operands before comparing, matching the ECMA-402 spec so ö (U+00F6) equals o+U+0308. Preserved the CONFIG_ALL_UNICODE=0 branch that skips normalization. 1 test262 error resolved. |
| e68993b | PORT | removed unused JSContext field | Removed the unused `is_error_property_enabled` BOOL from struct JSContext. |
| e929040 | PORT | reduced JS_MAX_LOCAL_VARS (github issue #123) | Dropped JS_MAX_LOCAL_VARS from 65536 to 65535 so the JSAtom u16 index space (and a few uint16 counters) can't overflow at the upper boundary. |
| 9b587c4 | SKIP-DONE | call js_std_free_handlers() in the code generated by qjsc (github issue #96) | Fork's qjsc main_c_template2 already calls js_eventloop_free(rt) (src/programs/qjsc/qjsc.c:364), which is the fork's equivalent of upstream's js_std_free_handlers — walks ts->rw_handlers, signal_handlers, and timers and frees each. The Makefile example-target change is SKIP-NA (fork uses Ninja). |
| 6e4931c | PORT | top-level-await support - follow the spec in the implementation of the module linking and evaluation to avoid errors with cycling module dependencies | Two-evaluator split (Zalgo-safe): js_evaluate_module_sync refuses TLA up front via a two-phase graph walk; js_evaluate_module_async is upstream's spec-compliant Tarjan-DFS evaluator. JS_RunModule remains the sync primitive; new JS_LoadModule is the async wrapper. JS_EvalFunctionInternal routes based on whether the graph transitively has TLA — non-TLA code stays sync even when async_modules=TRUE. JS_EvalFunctionAsync exposed alongside JS_EvalFunction. QJMS_Eval*Async wrappers added; qjs / quickjs-run main entry uses async; require/engine.importModule stay sync (throw TypeError with module name). Workers use JS_LoadModule (real TLA support). Added 12 vitest tests (tests/tla.test.ts) covering main-entry, dynamic import, require, engine.importModule, cycles, rejection, and ModuleDelegate preservation. top-level-await feature enabled in test262.conf (253 additional tests enabled, all passing). Bytecode-format change for has_tla flag; file-to-bytecode/libbytecode snapshots regenerated. |
| e6da06e | PORT | typos | qjsc help text "in a C file" → "to a C file" (two places); unicode_gen.c `#undef UNICODE_SPROP_LIST` → `UNICODE_PROP_LIST` (corrects a dangling undef that didn't match the corresponding define). |
| b8791e9 | PORT | fixed detached TypedArray in sort() | In js_TA_cmp_generic, replaced validate_typed_array (which threw) with typed_array_is_detached returning exception=2 so the sort completes without throwing when the comparator detaches the buffer mid-sort. Also moved the comparator-arg check_function call earlier per spec. Adapted to fork's detailed TypeError message. 1 test262 error resolved. |
| 4876f72 | PORT | added String.prototype.isWellFormed and String.prototype.toWellFormed | Clean apply; trivial conflict in js_string_proto_funcs (kept fork's `at` entry alongside upstream's two new entries). Enabled in test262.conf; no change to test262_errors.txt (new tests pass). |
| c2c773e | PORT | added Object.groupBy and Map.groupBy (initial patch by bnoordhuis) | Clean apply; one adaptation — upstream's bare JS_ThrowTypeError in js_object_groupBy needed the fork's file/line args. Enabled `array-grouping` in test262.conf. The test262 feature flag also covers the older (withdrawn) Array.prototype.group / .groupToMap proposals that neither upstream nor this fork implements; 34 "feature not implemented" failures added to test262_errors.txt match upstream's state. |
| feefdb1 | PORT | added Array.prototype.{with,toReversed,toSpliced,toSorted} and TypedArray.prototype.{with,toReversed,toSorted} (initial patch by bnoordhuis) | Seven new protomethods. Three JS_Throw* call sites adapted to fork's file/line signature (js_allocate_fast_array, js_array_toSpliced, js_typed_array_with). Took the opportunity to replace fork's js_array_at and js_typed_array_at with upstream's versions — both are strictly more spec-correct (JS_ToInt64Sat instead of JS_ToInt32/JS_ToInt64, giving saturating semantics for infinities/NaN per ToIntegerOrInfinity) and upstream's js_array_at also has a fast path for dense arrays. The upstream positions for `at` (next to `with` at the top of the proto-funcs tables) are adopted. Enabled `change-array-by-copy` in test262.conf; no change to test262_errors.txt. |
| 5fc27dc | PORT | added Promise.withResolvers | Clean apply; repurposed a previously `#if 0`'d stub (`js_promise___newPromiseCapability`) into `js_promise_withResolvers` — now using `this_val` instead of `argv[0]` as the constructor. Enabled in test262.conf; no regression. |
| a47f40c | PORT | added RegExp 'd' flag (bnoordhuis) | Clean apply across libregexp.h (new LRE_FLAG_INDICES, unused by libregexp — just recorded), quickjs-atom.h (new `indices` atom), quickjs.c (flag parse, hasIndices check in js_regexp_get_flags, full js_regexp_exec rewrite — unified goto-fail cleanup and builds per-capture `indices` array + named-group indices object), and proto_funcs switched to LRE_FLAG_* symbolic constants plus new hasIndices getter. test262.conf: unskipped `regexp-match-indices`. Inserting the `indices` atom shifted all later atom IDs by +1, which broke four bytecode-snapshot tests (libbytecode.test.ts ×3, file-to-bytecode.test.ts ×1) and the hard-coded `log-four.js` bytecode buffer in qjsbootstrap-bytecode.test.ts. Regenerated the buffer and `npx vitest -u`'d the snapshots — pure atom-ID shifts, no semantic change. TODO upstream file: not vendored (skipped). No .d.ts changes — RegExp typings come from TS lib.es, which already includes hasIndices/indices. test262_errors.txt unchanged (new regexp-match-indices tests all pass). |
| 399d916 | PORT | removed memory leak | Clean apply to quickjs.c js_parse_postfix_expr: after `name = JS_DupAtom(...)`, the `next_token()` failure path was returning without freeing `name`. Wrapped the failing branch in `{ JS_FreeAtom(ctx, name); return -1; }`. 3 lines. No test262 error diff. |
| 7414e5f | PORT | fixed the garbage collection of async functions with closures (github issue #156) | Large GC refactor: `JSAsyncFunctionData` absorbed into `JSAsyncFunctionState` (which now owns the GC header + resolving_funcs + is_completed); `JSVarRef` gains a second slot via union — detached refs hold `value`, on-stack refs hold `{ var_ref_link, async_func }`, so closed-over var-refs from async frames hold a ref back to the async state for cycle collection. `async_func_free` split into `async_func_free_frame` / `__async_func_free` / `async_func_free`; `close_var_refs` now runs at end of `async_func_resume` (completed path), not from the frame-freeing function. 3way auto-apply produced 3 conflicts: (1) a fork-preserved stale comment about `header.link` usage that the patch obsoleted — kept patch's removal; (2) a redundant `sf = &s->frame` + inline `close_var_refs` in `async_func_free_frame` that the patch correctly moved elsewhere — took patch; (3) `JS_ThrowTypeError` argc mismatch in js_generator_next (fork uses `(ctx, file, line, msg)`, upstream uses `(ctx, msg)`) combined with `func_state.` → `func_state->` — kept fork's throw signature with upstream's pointer deref. Test_std.js: appended `test_async_gc` to `tests/oldtests/test_std.js` (fork's location) with trailing whitespace stripped per `.editorconfig`. test262_errors.txt unchanged. |
| b4d8050 | PORT | fixed crash when resizing property shapes in case of OOM (github issue #129) | Clean apply to resize_properties in quickjs.c. Problem: the previous code used `js_realloc` in the equal-hash-size branch; a GC triggered during the realloc could see the shape in an invalid intermediate state. Fix always allocates a fresh shape via `js_malloc`, copies the old shape contents, and frees the old after linking the new one into `gc_obj_list`. Single code path now instead of two. No test262 error diff. |
| 2785ede | PORT | fixed JS module autodetection with shebang (github issue #91) | Core intent: teach `JS_DetectModule` to skip shebangs before tokenizing (so `#!...\nimport ...` is still detected as a module). Adapted to fork: the fork already had its own richer `shebangs_end_index`/`skip_shebangs` helpers (multi-shebang support for Nix tooling) and already called `skip_shebangs` in `__JS_EvalInternal`. Took upstream's *call-site change* in `JS_DetectModule` (now skips shebangs before tokenizing) but using the fork's existing `shebangs_end_index`; discarded upstream's new `skip_shebang`/`buf_end` helper as redundant with the fork's superset. 3 apply conflicts, all resolved by "keep fork's multi-shebang helpers, drop upstream's single-shebang duplicate." Added the `#! (shebang test)` line to `tests/oldtests/test_std.js` (fork's path for upstream's `tests/test_std.js`). test262_errors.txt unchanged. |
| ffe8141 | PORT | define the same atoms with or without CONFIG_ATOMICS (github issue #76) | Upstream's intent (keep `not_equal` / `timed_out` / `ok` atoms defined unconditionally so bytecode is portable between builds with and without CONFIG_ATOMICS) is the same principle the fork already follows for bytecode cross-build compatibility. Fork had already dropped the `#ifdef CONFIG_ATOMICS` / `#endif` wrapper around these three DEFs. Kept the fork's shape (bare DEFs) and added a comment explicitly stating the fork-identity rationale (bytecode-format compatibility across SKIP_WORKER builds); dropped upstream's cosmetic `/* */` line. No atom-index shift. test262_errors.txt unchanged. |
| 2ee6be7 | PORT | added os.now() | Split across fork's module layout: (a) added `js_os_now` to `src/builtin-modules/quickjs-os/quickjs-os.c` — returns `(double)gettime_ns() / 1e6` using the fork's existing `src/lib/gettime` helpers; registered `now` in `js_os_funcs`. (b) updated `quickjs-os.d.ts` with a typed export + doc. (c) removed `js___date_clock`, the `#if 0`'d `js___date_now` block, and the `__date_clock` / commented-out `__date_*` entries from `js_global_funcs` in `quickjs.c`. (d) updated fork's `meta/microbench.js` (upstream: `tests/microbench.js`) to import `quickjs:os` and use `os.now` as the clock. (e) updated snapshots in `tests/globals.test.ts` + `tests/libcontext.test.ts` (removed `__date_clock` rows) and dropped the `__date_clock` mention from `quickjs-context.d.ts`. Doc file (`doc/quickjs.texi`) skipped — fork doesn't vendor doc. No test262 error diff. |
| 5c120cd | PORT | added Error cause | quickjs-atom.h: upstream added `DEF(cause, "cause")` after `message`; fork already had one further down (after `stack`). Removed upstream's insertion and kept the fork's existing position so no atom-IDs shift (no snapshot churn). quickjs.c: fork already had an "options" parameter handling — a fork-specific extension that copies ALL enumerable own properties from the options object onto the Error instance with `JS_PROP_C_W_E`. Per ES2022 spec, `cause` must be configurable + writable but NOT enumerable, and `HasProperty` errors must surface. Resolution: kept the fork's generic options-copy for non-`cause` keys (skip `cause` in that loop to avoid triggering its getter twice) and added the spec-compliant `cause`-specific handler afterwards. Fixed the 4 test262 error-cause failures that the naive apply introduced. Updated `tests/error-cause.test.ts` snapshot to match new non-enumerable semantics (cause no longer shows up in default enumeration; descriptor `enumerable: false`). Enabled `error-cause` in test262.conf. Net: 5 new error-cause tests, all pass. TODO file skipped (not vendored). |
| 8de4538 | PORT | make JS_NewClassID thread safe | Clean apply. Adds a `pthread_mutex_t js_class_id_mutex` (CONFIG_ATOMICS-gated) and locks around the class-id allocation in `JS_NewClassID`. No test262 error diff. |
| e44b793 | PORT | allow 'await' in the REPL and added os.sleepAsync() | Split across fork's module split: (a) quickjs.h: added `JS_EVAL_FLAG_ASYNC`. (b) quickjs.c: 2 hunks (emit_return-with-async for eval-result wrapping; extend async func_kind to apply on JS_EVAL_FLAG_ASYNC). (c) quickjs-engine: added an `async` option to `evalScript` (fork's analogue of `js_evalScript`; uses fork's camelCase + typed-option pattern rather than upstream's `get_bool_option`). Updated quickjs-engine.d.ts. (d) quickjs-timers: added `js_timers_sleepAsync` (adapted from upstream's `js_os_sleepAsync` — fork keeps timer APIs in its own `quickjs:timers` module rather than `quickjs:os`, so the export lives at `timers.sleepAsync` not `os.sleepAsync`; this matches the fork's pre-existing reorg of timer functions out of `os`). Updated quickjs-timers.d.ts. (e) repl.js: restructured `handle_cmd` to return truthy when async eval kicked off, `eval_and_print_start(expr, is_async)` does the evalScript call with `async: is_async` and chains `.then(print_eval_result, print_eval_error)`, and `handle_cmd_end` factors out the cleanup+readline_restart. The raw 3way apply misapplied most of the repl hunks into the wrong functions (formatting divergence between fork's prettier style and upstream's K&R), so repl.js was ported by hand. Fork-specific features preserved: `g._error = error`, `engine.evalScript` (not `std.evalScript`), destructure-and-print own-props on errors, camelCase option names. Doc file skipped (not vendored). No test262 error diff. |
| 8f897d6 | PORT | fixed crash in JS_DumpMemoryUsage (github issue #65) | Clean apply. Avoid OOB on dynamic classes in the object-classes dump loop — guard with `class_id < rt->class_count` and read class_name from `rt->class_array` (the live per-runtime table) instead of the static `js_std_class_def` builtin table. No test262 error diff. |
| a8064b7 | SKIP-NA | added note about atomic operations | doc/quickjs.texi only; fork doesn't vendor doc. |
| 1605764 | PORT | class static block (initial patch by bnoordhuis) | Clean apply. Adds `JS_PARSE_FUNC_CLASS_STATIC_INIT`, parser handling for `static { ... }` blocks inside class bodies (emitted as a no-arg method call to a closure with `this` bound to the class), `await` keyword restriction inside static init, `return`-disallowed error, and the surrounding `js_parse_function_decl2` special-cases (no args binding, no `(` parsing). Enabled `class-static-block` in test262.conf: 63 new tests, all pass. TODO skipped. |
| 3ab1c2b | PORT | added 'in' operator for private fields | Added `private_in` opcode (`#field in obj` operator) plus the `scope_in_private_field` scope opcode. Three areas of quickjs.c had conflicts: (1) JS_AddBrand restructured to tolerate non-object `obj` (upstream's refactor, kept fork's file/line JS_ThrowTypeError signature); (2) JS_CheckBrand restructured to return 0/1 and move throw to caller at OP_check_brand opcode (kept fork's signature); (3) emit_class_init_start now gates brand emit on `!cf->is_static` — the fork was already partway to this refactor (had `need_brand`/`is_static` struct fields set at call sites, but `emit_class_init_start` still did unconditional emit and a dead `add_brand()` helper remained). Removed the dead helper and completed the restructure. Also added `cf->need_brand` prototype-brand emission block in js_parse_class (was missing in fork). Two new JS_ThrowTypeError call sites (js_operator_private_in, OP_check_brand) adapted to fork's `(ctx, file, line, msg)` signature. Opcode addition shifted opcode IDs; regenerated qjsbootstrap-bytecode fixture and updated 4 bytecode snapshots (libbytecode ×2, file-to-bytecode ×1, qjsbootstrap-bytecode ×1). Enabled `class-fields-private-in` in test262.conf. 19 new tests pass, 1 expected-failure added (private-field-invalid-assignment-target.js — matches upstream's state). |
| bd0b704 | PORT | added a comment for non-initialized warning in Valgrind (github issue #153) | Clean apply. Documentation comment only — explains why the array-count read in `JS_GetPropertyValue`'s fast path is correct even when Valgrind reports it as uninitialized. |
| 24aa7ba | PORT | fixed test262: derived-this-uninitialized-realm.js | Adds `get_loc_checkthis` / `scope_get_var_checkthis` opcodes so that the uninitialized-`this` ReferenceError in derived class constructors is raised in the caller realm rather than the callee realm. opcode.h conflict was a trivial position question (upstream's ordering adopted; fork's trailing whitespace on the following line dropped). Two new opcodes shifted IDs; regenerated qjsbootstrap-bytecode fixture and updated 4 bytecode snapshots. test262 errors went from 42 → 41 (derived-this-uninitialized-realm.js now passes). |
| df3781d | PORT | make for in faster and spec compliant (github issue #137) | Clean apply to quickjs.c — rewrites the `for..in` iterator to be both spec-compliant (handles mid-iteration property removal via Proxy `getOwnPropertyDescriptor` returning undefined) and faster (new fast path). Added `test_for_in_proxy` to fork's `tests/oldtests/test_loop.js` (upstream path `tests/test_loop.js`). No test262 error diff. |
| 3c2cfab | PORT | fixed run_test262_harness_test() with modules | Adds module support + promise rejection handling to `run_test262_harness_test` in src/run-test262/run-test262.c. Two upstream `js_std_dump_error` calls adapted to fork's `QJU_PrintException(ctx, stderr)` helper (fork's equivalent). Conflict was trivial (fork had tabs where upstream had spaces + differing error-printer name). |
| c363586 | PORT | avoid potentially undefined behavior and make valgrind happy (bnoordhuis) (github issue #153) | Clean apply. Reverses bd0b704's approach: moves the bounds check into each class-id case branch in `JS_GetPropertyValue`'s fast path so `p->u.array.count` is only read for classes that actually have it initialized. Removes the explanatory comment bd0b704 added (no longer needed). |
| 5935a26 | PORT | fixed class name init in static initializers | Moves the `class_name` scoped-variable init (the block that writes the class back to a scoped var for inner self-reference) from after static-fields init to before it, so `static x = S.x` in class S works. Removes the duplicate block that 1605764 had injected into the static-init-closure path (it wrote to the wrong scope level anyway). Conflict was the former duplicate — resolved by deleting it. Added the 3-line `static x/y/z` smoke test to fork's tests/oldtests/test_language.js. |
| c06c399 | PORT | fixed next token parsing after a function definition (github issue #77) | Clean apply to quickjs.c — adds `reparse_ident_token` and fixes post-function-decl token reparsing so that `yield` / `await` after a nested `function` / arrow-without-semicolon are correctly re-classified as keywords. Added test_parse_semicolon to fork's tests/oldtests/test_language.js. |
| aac2464 | PORT | fix worker termination in example (github issue #98) | 1-line addition to fork's tests/oldtests/test_worker_module.js (upstream path tests/test_worker_module.js): set `parent.onMessage = null` after sending the "done" message so the worker terminates cleanly. |
| af30861 | PORT | fixed regexp case insensitive flag | Large port across libregexp.c + libunicode.c + libunicode.h + unicode_gen.c. Refactors `lre_case_conv` into an outer table-walker + new `lre_case_conv_entry` helper. Adds `cr_regexp_canonicalize` (new libunicode API) with supporting `point_cmp`/`cr_sort_and_remove_overlap` helpers. libunicode-table.h (generated) is rebuilt automatically by the ninja unicode_gen step — not checked in. 3 conflicts all trivial: (1) fork's stray pre-patch `is_lower = ...;` line that upstream deleted (took upstream); (2) fork's empty slot where upstream inserted cr_sort_and_remove_overlap + cr_regexp_canonicalize (took upstream); (3) a commented-out `dump_table()` line the fork had vs upstream's new `#ifdef DUMP_CASE_FOLDING_SPECIAL_CASES` (took upstream). test262_errors.txt: upstream removes 2 unicode_full_case_folding entries, but the fork had already fixed them locally — no diff. |
| e1e65ac | PORT | fixed Date.toLocaleString() (kuzmas) | 1-line clean apply. Date.toLocaleString format string fix in `js_date_toString`. |
| f25e5d4 | PORT | optional chaining fixes (github issue #103) | Adds OP_get_field_opt_chain + OP_get_array_el_opt_chain opcodes (for correct `delete a?.b.c` semantics and `(a?.b)()` this-binding). Conflict was a pure addition (fork's empty slot). Added test_optional_chaining to fork's tests/oldtests/test_language.js. 1 test262 error resolved (optional-call-preserves-this.js). |
| 10fc744 | PORT | regexp: fixed the zero advance logic in quantifiers (github issue #158) | Replaces `REOP_bne_char_pos` opcode with simpler `REOP_check_advance` in libregexp. Simplifies `re_check_advance` → `re_need_check_advance` (drops the back_reference capture-bitmap tracking — upstream found it unnecessary). 3 conflicts in libregexp.c (fork pre-change had the old 3-state `ret` logic; took upstream's simpler TRUE/FALSE version). Added zero-length-match smoke tests to fork's tests/oldtests/test_builtin.js. test262 lookahead-quantifier-match-groups entries that upstream removed weren't in the fork's list to begin with. |
| 195c42b | PORT | added os.getpid() | Added `js_os_getpid` to fork's `src/builtin-modules/quickjs-os/quickjs-os.c`, using `GetCurrentProcessId()` on Windows and POSIX `getpid()` elsewhere (wraps the #ifdef inline so all three platform branches share one function, matching the fork's convention for platform-agnostic calls). Registered `getpid` in js_os_funcs and added the typed export to quickjs-os.d.ts. Doc file (doc/quickjs.texi) skipped — not vendored. |
| e66ce48 | PORT | more portable and Windows version for getTimezoneOffset() (github issue #122) | Clean apply. `getTimezoneOffset` now uses `gmtime_r/localtime_r` to compute the offset portably, with a `_WIN32`-specific `_mkgmtime`/`mktime` fallback. |
| c950966 | SKIP-NA | update test results | TODO file only; fork doesn't vendor. |
| e80917b | PORT | fixed uninitialized harnessbuf | Clean apply to run-test262.c — `harnessbuf` is now explicitly NULL-initialized so the harness-loading code doesn't read uninitialized memory when a harness isn't requested. |
| 9a4379d | PORT | native cosmopolitan build | Upstream refactored the `js_*_malloc_usable_size` helpers to `const void *` and plugged them into `JSMallocFunctions` by name (instead of inlining the platform dispatch into the struct). Fork was already `const void *` and already had richer platform coverage (__COSMO__, __wasi__), just still had the old inline-dispatch in the struct literal. Took upstream's struct-literal simplification in both quickjs.c and qjs.c; kept the fork's richer helper body (superset of platforms). Makefile changes skipped — fork uses Ninja/meta, not Makefile. |
| efdb722 | PORT | fixed JS_GetScriptOrModuleName() in direct or indirect eval code | Adds `is_direct_or_indirect_eval` flag to JSFunctionBytecode and makes JS_GetScriptOrModuleName walk past eval frames to find the enclosing script/module filename. Conflict was that the fork had fork-added synthetic-stack-frame handling ahead of the name lookup; combined: wrap the synthetic-frame check inside upstream's new `for(;;)` loop. 1 test262 error resolved. |
| 6e651e8 | SKIP-NA | allow override of PREFIX, CROSS_PREFIX, CFLAGS and LDFLAGS in Makefile (humenda) | Makefile-only; fork uses Ninja/meta. |
| 3f81070 | SKIP-NA | new release | Changelog/VERSION/doc updates; fork doesn't vendor any of those. |
| d6c7d16 | SKIP-NA | update Changelog | Changelog only. |
| 8405876 | SKIP-DONE | added js_std_await() and use it to wait for the evaluation of a module (github issue #219) | Fork already has an equivalent idiomatic API: `QJMS_EvalBufAsync`/`QJMS_EvalFileAsync` (async-aware module evaluators) combined with `js_eventloop_run` that drives the event loop until completion. Worker loader uses the same pattern via `JS_LoadModule` + `QJMS_AttachEntryRejectionHandler` + `js_eventloop_run`. Top-level-await in the entry module is already supported end-to-end, which is the behavior upstream's `js_std_await` introduces. |
| 9e561d5 | SKIP-BAD | fixed and simplified setTimeout() by using an integer timer handle (github issue #218) | Fork deliberately uses an opaque JS Timer object handle (JSTimer class with `[Symbol.toStringTag]: "Timer"`, exported as a typed `Timer` from `quickjs:timers`), matching WHATWG/Node.js convention. Accepting upstream's integer-id API would regress visible JS behavior. The underlying "bug" (GC of unreachable timers) isn't an issue in the fork — the JSTimer class owns its lifetime via the finalizer + event-loop linkage. |
| 67723c9 | SKIP-DONE | fixed js_std_await() in case 'obj' is not a promise (github issue #222) | Follow-up to 8405876 which was already SKIP-DONE in the fork; fork doesn't have js_std_await. The fork's `js_eventloop_run` equivalent already exits correctly when the awaited value isn't a promise. |
| 090685a | SKIP-NA | update test results | TODO only. |
| cd666a8 | PORT | simplified and fixed arrow function parsing (github issue #226) | Removes the `PF_ARROW_FUNC` parse_flags bit (arrow functions are now parsed unconditionally in the postfix expression path; the flag had been used to suppress arrow parsing in `??`-coalesce RHS and was the root cause of the test_parse_arrow_function edge cases). Two conflicts in quickjs.c (the flag definition reordering and the call-site where `& ~PF_ARROW_FUNC` was stripped) both resolved by taking upstream's version. Added test_parse_arrow_function to fork's tests/oldtests/test_language.js. |
| c6cc6a9 | PORT | export JS_GetModuleNamespace (github issue #34) | Clean apply of the rename. One additional fork-specific call site (inside the JS_RunModule wrapper that returns the namespace) used the old `js_get_module_ns` internal name and had to be updated to the new public `JS_GetModuleNamespace`. |
| 00967aa | PORT | fixed Promise return in the REPL by using a wrapper object in async std.evalScript() (github issue #231) | Clean apply on quickjs.c (wrap async eval return value in `{ value: ... }` at the bytecode-emission level). repl.js hand-ported (3way apply misrouted into `parse_string`): sync eval passes `{ value: result }` to `print_eval_result`, which unwraps via `result = result.value`. Makefile + doc changes skipped — not vendored. |
| 1ed38ee | SKIP-NA | fixed MingW64 install on Windows (absop) (github issue #230) | Makefile only; fork uses Ninja/meta. |
| 6f480ab | PORT | avoid using INT64_MAX in double comparisons because it cannot be exactly represented as a double (bnoordhuis) | Replaces `d > INT64_MAX` with `d >= 0x1p63` at two sites (JS_ToInt64SatFree and js_atomics_wait). `INT64_MAX` can't be represented exactly as a double (it's 2^63 - 1; the nearest double is 2^63); `0x1p63` is exactly 2^63 and is what's actually wanted as the upper bound. This also sidesteps the `-Wimplicit-int-float-conversion` clang warning, so the fork's surrounding `suppress_warning`/`unsuppress_warning` scaffolding became vestigial and was removed (verified across `meta/build.sh all` — no warning fires on INT64_MIN either, since it's exactly -2^63 and representable). |
| 37bd4ae | SKIP-DONE | Strip trailing spaces | Pure whitespace-normalization commit. Fork's `.editorconfig` sets `trim_trailing_whitespace = true`; all previously ported commits strip trailing whitespace from added lines, so the fork's tree is already in the post-commit state. |
| 2c793e5 | PORT | Fix test262o error | Clean apply to fork's `src/run-test262/test262o.conf`: excludes `test262o/test/suite/ch15/15.5/15.5.4/15.5.4.9/15.5.4.9_CE.js` (locale-comparison test requiring canonical-form equivalence between `ö` and `o+combining-diaeresis`). |
| c9e6c56 | PORT | Improve microbench | Hand-ported to fork's `meta/microbench.js` (kept fork's prettier formatting + `allTests = { ... }` object-based test registry). Ported the substantive changes: 3 new loop tests (`empty_down_loop`, `empty_down_loop2`, `empty_do_loop`), 2 new string-build tests (`string_build1x`, `string_build2c`), removed unused `r` parameter on `string_build3`, and fixed the sort_bench timing log (`log_one("sort_"+f.name, 1, ti/100)` and `total / n / 100`). Kept fork's `quickjs:std`/`quickjs:os` imports (always available in fork's module-based invocation, so upstream's `typeof(os) !== "undefined"` guard and node-compat tweaks are unnecessary in the fork). Skipped `-r ref_file` arg + name-prefix matching — fork's `main(options)` uses an options object, not argv parsing, so those CLI changes don't map. Skipped the sort_bench reordering — fork keeps it in the middle of the list. Makefile and `.gitignore` changes skipped (fork uses Ninja/meta and has its own .gitignore). |
| 48deab1 | PORT | Fix runtime bugs | Two real bug fixes + formatting/comment churn. Ported the fmt_str leak fix in `js_printf_internal` (fork's analogue in `src/builtin-modules/quickjs-std/quickjs-std.c`): initialize `fmt_str = NULL` and add `JS_FreeCString(ctx, fmt_str)` to the fail path. The errno-read-order fix in `js_os_stat` was unnecessary — fork's `src/builtin-modules/quickjs-os/quickjs-os.c` already reads `err = errno;` before any `JS_FreeCString(ctx, path)` or other side effect. Skipped the pure formatting/comment-polish changes in quickjs.c and quickjs-libc.c function signatures. |
| 2e10134 | PORT | Add more tests | Added `regexp_ascii` + `regexp_utf16` microbench tests to fork's `meta/microbench.js` + registered them in `allTests`. Skipped the `bjson_test_regexp` addition because the fork doesn't vendor `test_bjson.js` or `bjson.c` — it uses its own `quickjs:bytecode` module. |
| 626e0d4 | SKIP-NA | Unbroke tests/test_test_bjson.js | Reverts the bjson_test_regexp added in 2e10134. Fork doesn't vendor test_bjson.js at all and skipped the addition in the prior commit, so nothing to revert. |
| 325ca19 | SKIP-NA | Add MemorySanitizer support | Makefile only. |
| fd6e039 | SKIP-NA | Add UndefinedBehaviorSanitizer support | Makefile only. |
| e53d622 | PORT | Fix UB in js_dtoa1 | Clean apply to quickjs.c. Guards against infinite-digit-count UB in the dtoa code path. |
| 6535064 | PORT | Fix undefined behavior (UBSAN) | Moves `sf = &s->func_state->frame` assignment in `js_generator_next` from the top of the function into each switch case that actually uses sf — avoids dereferencing `func_state` (which is NULL in JS_GENERATOR_STATE_COMPLETED / AWAITING_RETURN) before the state check. Kept fork's `(ctx, file, line, msg)` JS_ThrowTypeError signature. .gitignore skipped. |
| 6dbf01b | PORT | Remove unsafe sprintf() and strcat() calls | Clean apply. Replaces deprecated macOS-unsafe sprintf/strcat with snprintf/strncat variants. |
| e140122 | PORT | Fix sloppy mode arguments uninitialized value use | Clean apply. Adds MSan cleanup path for JS_CLASS_MAPPED_ARGUMENTS in the fast-path indexed-property code. |
| 693449e | SKIP-NA | add gitignore for build objects (#84) | .gitignore only; fork has its own. |
| ae6fa8d | SKIP-DONE | Fix shell injection bug in std.urlGet (#61) | Upstream's fix escapes shell metacharacters before `popen("curl ...")`. Fork has already replaced the popen approach entirely with a direct libcurl integration (`qjs_libcurl.easy_init()` etc.) — no shell invocation, so no shell-injection possible. Removed the now-orphaned `URL_GET_PROGRAM`/`URL_GET_BUF_SIZE` macros the 3way apply left behind. Classified SKIP-DONE because fork's approach strictly supersedes upstream's escape-based mitigation. |
| 636c946 | PORT | FreeBSD QuickJS Patch (#203) | qjs.c `#include <malloc_np.h>` on FreeBSD — clean apply. Fork's `quickjs-os.c` already has richer FreeBSD support (`extern char **environ`, custom `sighandler_t` typedef + `signal()` prototype) so no changes there. Makefile changes skipped — fork uses Ninja/meta. |
| 92e339d | SKIP-DONE | Simplify and clarify URL quoting js_std_urlGet | Follow-up to ae6fa8d which was SKIP-DONE because the fork uses direct libcurl (no shell invocation). Fork's urlGet has no quoting code to simplify. |
| ef4e7b2 | PORT | Fix compiler warnings | Guards the unused-for-non-dump `cw_count`/`cw_len_count`/`cw_start` declarations in unicode_gen.c's build_general_category_table / build_script_table / build_script_ext_table with `#ifdef DUMP_TABLE_SIZE`. Conflicts were that the fork used `__maybe_unused` instead; took upstream's ifdef (consistent with how the *uses* of those variables are already gated). Conflict 4 (build_cc_table) combined upstream's new `block_end_pos` outer decl with the removal of fork's outer `__maybe_unused int cc_table_len` (cc_table_len moved entirely inside the DUMP_TABLE_SIZE ifdef where all its uses already live). |
| 1fe0414 | PORT | Fix test262 error | Clean apply. Forces evaluation order in set_date_fields so the Date/UTC/fp-evaluation-order.js test passes. 1 test262 error resolved. |
| 95e0aa0 | PORT | Reverse e140122202cc24728b394f8f90fa2f4a2d7c397e | Clean apply. Reverts e140122 because c363586 removed the need (the per-case bounds check replaced the need for array.count zeroing). |
| 8e21b96 | SKIP-NA | pass node-js command line arguments to microbench | Adds node-compat for the scriptArgs fallback in upstream's `main(argc, argv, g)`. Fork's microbench uses `main(options)` with an options object (not argv parsing), so there's no scriptArgs path to bridge to Node. |
| c06af87 | PORT | Improve string concatenation hack | Adds `JS_ConcatStringInPlace` — appends to a refcount-1 string in its own allocation slack when possible (big win on `r += "x"` microbench loops). Conflict was just context alignment in the preamble (upstream inserted the helper before JS_ConcatString). Makefile/VERSION changes skipped — not vendored. |
| 3bb2ca3 | PORT | Remove unnecessary ssize_t posix-ism | Clean apply. Removes an unnecessary `(ssize_t)` cast in JS_ComputeMemoryUsage. |
| 8df4327 | PORT | Fix UB left shift of negative number | Clean apply — masks negative-number left-shift in bf pow-of-10 path. |
| 85fb2ca | PORT | Fix UB signed integer overflow in js_math_imul | Clean apply to quickjs.c — uses uint32_t arithmetic + standard-conformant conversion. Added 4 new imul test cases to fork's tests/oldtests/test_builtin.js. Makefile changes skipped. |
| 74bdb49 | PORT | Improve tests | Ported the substantive test tweaks: `Math.hypot(...) == N` → `assert(Math.hypot(...), N)` (proper assert form), expanded `test_date` tolerances to accept both QuickJS and Node rounding for `.1235Z` and `.9999Z` cases, and gated `test_argument_scope`'s `eval("var arguments")` SyntaxError check inside a `"use strict"` IIFE (non-strict mode doesn't throw in Node). Skipped the test_bignum.js → test_bigfloat.js split — fork runs bignum tests via vitest (`oldtests.test.ts`) and the split would require also updating the vitest runner, which is reorganization for reorganization's sake. Makefile changes skipped. |
| 0a361b7 | SKIP-NA | handle missing test262 gracefully | Makefile only. |
| 530ba6a | SKIP-NA | handle missing test262 gracefully | .gitignore only. |
| bbf36d5 | PORT | Fix big endian serialization | Removes WORDS_ENDIAN (unconditionally undef'd in cutils.h), and uses `bc_put_u32/u64` / `bc_get_u32/u64` in JS_WriteBigInt / JS_ReadBigInt. Adds host-endian handling in bc_get_u16/u32/u64 and JS_ReadFunctionBytecode. Two conflicts: (a) BCTagEnum — fork had `BC_TAG_ERROR_OBJECT` as the last entry; upstream added `BC_TAG_BIG_FLOAT`/`BC_TAG_BIG_DECIMAL` under CONFIG_BIGNUM. Combined: kept fork's ERROR_OBJECT and appended upstream's two BIGNUM tags. Kept fork's `BC_BASE_VERSION`/`BC_BE_VERSION` bit-flag structure (more flexible than upstream's hardcoded 0x43). (b) bc_tag_name table — same combine. Regenerated qjsbootstrap-bytecode fixture + updated 4 bytecode snapshots (one byte shifted from `14` to `12` at a function-header position — encoding tweak from the refactor, not a tag-value shift). |
| c24a865 | PORT | Improve run-test262 | Adds -t (timings), -C (compact progress), default compact when not a TTY, 2MB agent stack, relative-to-current-path module resolution, -d/-f ignore testdir, and a nonzero return on errors changes. Conflict resolved on the module-loader setup: kept fork's three-call API (`JS_SetModuleNormalizeFunc` + `JS_SetModuleLoaderFunc` + `JS_SetModuleLoaderOpaque`) instead of upstream's single `JS_SetModuleLoaderFunc` with multiple args — the fork's module loader API is deliberately split that way. Pass `(void *)filename` as the module-loader opaque so the relative-path resolution works. **Note:** the new "nonzero return on errors changes" logic means `src/run-test262/run.sh -u` now always exits nonzero (update mode sets `error_file = NULL`, so every expected error counts as "new" for the exit-code check). Non-`-u` invocation still returns 0 when errors match. Error file diff is the source of truth for regression checking. |
| 97ae6f3 | SKIP-NA | Add benchmarks target | Makefile + .gitignore only. |
| 8d932de | PORT | Rename regex flag and field utf16 -> unicode | Clean apply across libregexp.c, libregexp.h, quickjs.c. Renames `LRE_FLAG_UTF16` → `LRE_FLAG_UNICODE` and struct field `is_utf16` → `is_unicode`. |
| 12c91df | PORT | Improve surrogate handling readability | Clean apply across cutils.h, libregexp.c, quickjs.c. Adds inline helpers `is_surrogate`, `is_hi_surrogate`, `is_lo_surrogate`, `get_hi_surrogate`, `get_lo_surrogate`, `from_surrogate`; adds BC header offset/length names in libregexp.c; fixes strict-aliasing violations in `lre_exec_backtrack`. |
| b91a2ae | PORT | Add C API function JS_GetClassID() | Clean apply. Adds `JS_GetClassID(val)` accessor + `JS_INVALID_CLASS_ID` constant. |
| b70e764 | PORT | Rewrite `set_date_fields` to match the ECMA specification | quickjs.c clean apply (double arithmetic, `volatile` to prevent FMA, reject border cases, avoid double→int64 UB). tests/test_builtin.js hand-ported to fork's `tests/oldtests/test_builtin.js` (keep fork's prettier formatting, dedup conflict with prior port's `assert` definition, adopt upstream's new `get_full_type`/NaN/signed-zero-aware `assert` + `throw_error` infrastructure, add new parseFloat tests and Win32/Cygwin skip-guard, add Date.UTC boundary tests). Makefile changes skipped. |
| 27928ce | PORT | Fix Map hash bug | Clean apply to quickjs.c — `map_hash_key` now generates the same hash for JS_INT and JS_FLOAT64 with the same value. Added Map hash-collision tests (int/float equivalence + BigInt) to fork's `tests/oldtests/test_builtin.js`. |
| 6428ce0 | SKIP-DONE | show readable representation of Date objects in repl | Fork's repl uses `inspect(a, ...)` (fork-added rich inspector) instead of upstream's inline type switch. `inspect` already renders Date objects readably — the upstream special-case is subsumed. |
| 78db49c | PORT | Improve Date.parse | Clean apply to quickjs.c (529-line rewrite with separate parsers, spec-compliant NaN on out-of-bounds, up-to-9-decimal millisecond fractions, many new formats). Hand-ported tests/oldtests/test_builtin.js updates (new Date.parse assertions: empty string, various partial formats, "Jan 1 2000" with/without weekday and timezone offsets). Merged with fork's prettier formatting. |
| 8180d3d | PORT | Improve microbench.js | Added the 5 new benchmark functions upstream introduced (`date_parse`, `prop_update`, `prop_clone`, `array_slice`, `global_func_call`) to fork's `meta/microbench.js`, registered them in `allTests`. Renamed local helper `g(a)` → `g_bench(a)` to avoid collision with fork's other uses of `g`. Skipped the timing-infrastructure changes (performance timer via node, reference-file save/load over node, -s option, threshold tweaks), the reformulation of existing benchmarks to use a shared `ref.slice()` baseline, the closure_var → func_closure_call rename, and the Makefile changes — fork runs microbench from its module-based `main(options)` entry and doesn't need those infra changes. |
| a78d2cb | PORT | Improve repl regexp handling | Hand-ported the substantive change (repl completion now treats trailing-after-`/` text as regexp flags and returns `new RegExp('', base)` so the flag set can complete). Skipped the jscalc config reorganization — upstream restructured where `styles` and `ps1` are set (single default + reassigned inside `if (config_numcalc)`), but fork's formatting-diverged version makes the 3way apply produce multi-hundred-line conflicts. The fork's config_numcalc branch is basically dead code (fork doesn't build jscalc), so the reorg has no behavioral impact on the fork. |
| 8d64731 | PORT | Improve Number.prototype.toString for radix other than 10 | Clean apply to quickjs.c — fixes integer/exact-fraction conversions for non-decimal radix, adds approximate fallback for inexact floats, bypasses floating-point for JS_TAG_INT values, avoids divisions for base-10 integer conversions. |
| 35b7b3c | PORT | Improve Date.parse | Clean apply to quickjs.c (case-insensitive month/tz names, AM/PM markers, US timezone names, skip parenthesized text, many v8 format-compatibility fixes). Hand-ported the test additions to fork's tests/oldtests/test_builtin.js: reordered the Date.UTC NaN/non-NaN blocks (matches upstream's ordering) and added two MakeTime/MakeDate precision tests derived from test262/fp-evaluation-order.js, guarded under non-win32/cygwin. |
| 3dd93eb | SKIP-DONE | fix microbench when microbench.txt is missing (#246) | Fork's microbench `load_result` already handles the missing-file case via try/catch around `std.open`. Upstream's bug was calling `f.readAsString()` after `!f` without a return/else; fork's approach isn't affected. |
| 06c100c | PORT | Prevent UB on memcpy and floating point conversions | Clean apply across cutils.h/cutils.c (new `memcpy_no_ub` that tolerates null pointers for 0 count), libbf.c (one use), and quickjs.c/quickjs.h (safer int-range tests in JS_NewFloat64 / JS_ToArrayLengthFree / js_typed_array_indexOf; prevent 0-length alloc in js_worker_postMessage). |
| e17cb9f | SKIP-DONE | Add github CI tests | `.github/workflows/ci.yml` — fork has its own CI via vitest. The test_std.js isatty change is already handled in the fork: fork's tests/oldtests/test_std.js asserts `!os.isatty(0)` (vitest spawns via first-base, so stdin is never a tty). |
| 1a5333b | PORT | prevent 0 length allocation in `js_worker_postMessage` | Applied the `sab_tab_len > 0` guard to fork's `src/builtin-modules/quickjs-os/quickjs-os.c`, which has **two** js_worker_postMessage-adjacent allocation sites (the fork-added error-pipe worker_send_error + the regular js_worker_postMessage). Both updated. 06c100c already patched upstream's single site in quickjs.c, but the fork's OS-module sites are distinct. |
| ebe7496 | PORT | Fix build: use LRE_BOOL in libunicode.h (#244) | Clean apply. Replaces `bool` with `LRE_BOOL` in two function signatures so libunicode.h doesn't require stdbool.h for consumers. |
| 6a89d7c | PORT | Add CI targets, fix test_std.js (#247) | Ported the SIGQUIT → SIGTERM change in `tests/oldtests/test_std.js` (SIGQUIT doesn't work reliably under QEMU), including the added nonzero-status assertion. Skipped the isatty change — fork's test already uses `!os.isatty(0)` which works unconditionally in the fork's vitest-spawned environment. CI yml skipped (fork has its own CI). |
| 65ecb0b | PORT | Improve Date.parse, small fixes | cutils.h + quickjs.h clean apply. quickjs.c: two conflicts. (1) set_date_field: fork had a more elaborate "buffer ToFloat64 results in `values[]` then check `!any_nonfinite` before copying into fields" structure (fork-added defensive code with spec-ordering comments); upstream's simpler version writes to fields unconditionally and relies on set_date_fields's internal NaN handling (from b70e764). Kept fork's explicit structure — functionally equivalent, more readable. (2) Array.prototype[Symbol.unscopables]: combined upstream's `static` keyword with fork's `"at" "\0"` entry (fork-added ES2022 support). Updated `tests/libcontext.test.ts` snapshot to include the new `@@toStringTag: "global"` property on globalThis. |
| 0665131 | PORT | Fix compilation with -DCONFIG_BIGNUM | Clean apply to libbf.c. quickjs.c: disable BigDecimal conversion in JS_ReadBigNum + misc error message fixes. Two minor conflicts in JS_ThrowRangeError sites where fork uses file/line args and upstream lowered case — kept fork's signature + upstream's BigInt capitalization. |
| c0e67c4 | PORT | Simplify redundant initializers for `JS_NewBool()` | Clean-ish apply. Drops unnecessary `BOOL res;` initialization patterns in quickjs.c and the `(isatty(fd) != 0)` redundancy in os.isatty. Two JS_ThrowTypeError conflicts in BigInt code (fork's file/line sig + upstream's capitalization fixes). |
| ce6b6dc | PORT | Use more explicit magic values for array methods | Clean apply. Replaces magic-number constants in js_array_funcs/proto_funcs with named special_indexOf/special_find etc. enums. |
| 203fe2d | PENDING | Improve `JSON.stringify` |  |
| 653b227 | PENDING | Improve error handling |  |
| 3b45d15 | PENDING | Fix endianness handling in `js_dataview_getValue` / `js_dataview_setValue` |  |
| 1402478 | PENDING | Improve unicode table handling (#286) |  |
| 7a2c6f4 | PENDING | Improve libunicode and libregexp headers (#288) |  |
| d9c699f | PENDING | fix class method with name get (#258) |  |
| 0c8feca | PENDING | Improve class parser (#289) |  |
| 01454ca | PENDING | OSS-Fuzz targets improvements (#267) |  |
| 6c43013 | PENDING | Add `JS_NewTypedArray()` (#272) |  |
| db9dbd0 | PENDING | Add `JS_HasException()` (#265) |  |
| d53aafe | PENDING | Add the missing fuzz_common.c (#292) |  |
| 6f9d05f | PENDING | Expose `JS_SetUncatchableError()` (#262) |  |
| f3f2f42 | PENDING | Add `JS_StrictEq()`, `JS_SameValue()`, and `JS_SameValueZero()` (#264) |  |
| 97be5a3 | PENDING | Add `js_resolve_proxy` (#293) |  |
| d378a9f | PENDING | Improve `js_os_exec` (#295) |  |
| adec734 | PENDING | fixed test of test262 directory |  |
| d86aaf0 | PENDING | updated test262.patch |  |
| 36911f0 | PENDING | regexp: fix non greedy quantizers with zero length matches |  |
| b3715f7 | PENDING | Fix GC leak in `js_proxy_get()` (#302) |  |
| 5417ab0 | PENDING | Fix `JS_HasException()` when `null` is thrown (#313) |  |
| 3489493 | PENDING | Use malloc_usable_size() on any OS based on GNU libc |  |
| 8624b5c | PENDING | Use ftello() & fseeko() on any OS based on GNU libc |  |
| 012451d | PENDING | Define a fallback PATH_MAX if not available |  |
| 6e2e68f | PENDING | Fix termination in Worker test |  |
| 030333c | PENDING | fixed date parsing in case there is more than nine initial digits (initial patch by nickva) |  |
| 6474793 | PENDING | JS_SetPropertyInternal(): avoid recursing thru the prototypes if the property is found in a prototype |  |
| c739deb | PENDING | microbench: use toFixed() |  |
| 027f3cb | PENDING | fix crash when add_property()  fails on build arguments (penneryu) |  |
| 25aaa77 | PENDING | allow regexp interruption (e.g. with Ctrl-C in the REPL) |  |
| dfd9c93 | PENDING | added missing stack overflow check in JSON.stringify() |  |
| 9bd10d8 | PENDING | simplified the handling of closures |  |
| 1be68b3 | PENDING | fixed CONFIG_ALL_UNICODE compilation |  |
| 837a697 | PENDING | regexp: allow [\-] in unicode mode (#373) |  |
| 61e8b94 | PENDING | removed bignum support and qjscalc - added optimized BigInt implementation |  |
| 543897a | PENDING | added missing variable |  |
| ee4cd4d | PENDING | compilation fix |  |
| e9c69f7 | PENDING | Fix multiarch CI builds |  |
| 22dbf49 | PENDING | Merge pull request #391 from nickva/try-to-fix-multiplatform-builds |  |
| 96e7965 | PENDING | removed the ability to do simultaneous 64 and 32 bit x86 builds in order to simplify the Makefile |  |
| 6de8885 | PENDING | more bignum cleanup |  |
| 5a16c0c | PENDING | fixed JS_DumpValue() for BigInt |  |
| 6d6893b | PENDING | fixed BigInt hashing - removed -fno-bigint in qjsc and JS_AddIntrinsicBigInt() (BigInt is now considered as a base object) |  |
| 7399069 | PENDING | fixed examples/hello_module compilation (#240) |  |
| 131408f | PENDING | simplified js_bigint_from_float64() |  |
| 9f1864a | PENDING | msan fix (#389) |  |
| 9936606 | PENDING | added new dtoa library to print and parse float64 numbers. It is necessary to fix corner cases (e.g. radix != 10) and to have correct behavior regardless of the libc implementation. |  |
| 978756a | PENDING | protect against printf errors (#319) |  |
| 9f65ef1 | PENDING | simplified and fixed backtrace_barrier (#306) |  |
| 4941398 | PENDING | fixed hash_map_resize() - added Map/WeakMap in microbench |  |
| d1bb520 | PENDING | reduced memory usage of Map hash table |  |
| a44011e | PENDING | enable dtoa tests on win32 |  |
| 372ad84 | PENDING | more dtoa bench (Charlie Gordon) |  |
| 156d981 | PENDING | added string ropes for faster concatenation of long strings (issue #67) |  |
| 6cc02b4 | PENDING | more use of js_new_string8 - inlined JS_NewString() (initial patch by Charlie Gordon) |  |
| 2a4f629 | PENDING | added -Wno-infinite-recursion |  |
| 29630bc | PENDING | added missing header |  |
| b31bb20 | PENDING | updated to unicode 16.0.0 (bnoordhuis) - updated test262 |  |
| dec4aca | PENDING | update test262_errors.txt |  |
| d20ffec | PENDING | exit by default on unhandled promise rejections (issue #305) |  |
| e8cfe8f | PENDING | removed memory leak in string padding (issue #274) |  |
| d045a13 | PENDING | disable rejection tracker in the repl - repl cleanup |  |
| b0c1a12 | PENDING | fixed set_date_field() |  |
| 67de495 | PENDING | fixed typed array set operation when obj != receiver |  |
| 56c47f7 | PENDING | fixed exception handling in AsyncFromSyncIterator and async for of |  |
| 2634856 | PENDING | removed invalid tests |  |
| 0d7aaed | PENDING | ensure that JS_IteratorNext() returns JS_UNDEFINED when done = TRUE (#394) |  |
| 6ac04e1 | PENDING | removed useless printf() (#257) |  |
| bf164d6 | PENDING | fixed eval with empty argument scope (#249) |  |
| 8b5b127 | PENDING | reworked weak references so that cycles are (hopefully) correctly handled - added Symbol as WeakMap key, WeakRef and FinalizationRegistry |  |
| b342502 | PENDING | avoid freeing an object structure in js_weakref_free() if it is about to be freed in free_zero_refcount() |  |
| f121cbd | PENDING | added forgotten js_weakref_is_live() tests |  |
| beeb272 | PENDING | 'undefined' is a valid let/const variable name. It gives a SyntaxError at top level because it is already defined (#370) |  |
| c1bf4e9 | PENDING | workaround for overflow test in JS_GetOwnPropertyNamesInternal() (#111) |  |
| 159fe28 | PENDING | fixed module cyclic imports (#329) |  |
| 00b709d | PENDING | flush stdout in console.log() (#309) |  |
| 1943101 | PENDING | updated Changelog |  |
| c805d4f | PENDING | fixed weakmap gc (#398) |  |
| ec83bd2 | PENDING | qjs: allow SI suffixes in memory sizes - set default stack size to 1 MB |  |
| fa706d5 | PENDING | Fix leak in BigInt unary plus (saghul) |  |
| 083b7ba | PENDING | Fix UB in BigInt left shift (saghul) |  |
| 2b6cf57 | PENDING | removed unused slack in hash_map_resize() (saghul) |  |
| f05760c | PENDING | qjs: added performance.now() |  |
| a151ce1 | PENDING | fixed and improved Map/Set hashing |  |
| 1eb05e4 | PENDING | fixed buffer overflow in BJSON String and BigInt reader (#399) |  |
| 00e6f29 | PENDING | added JS_GetAnyOpaque() (oleavr) |  |
| 9d3776d | PENDING | fixed break statement in the presence of labels (bnoordhuis) (#275) |  |
| 25ffdb4 | PENDING | fixed the handling of unicode identifiers |  |
| c505ac0 | PENDING | fixed JS_IsString() with ropes |  |
| d546fbf | PENDING | changed js_throw_type_error ES5 workaround to be more compatible with test262 |  |
| 949c105 | PENDING | fixed class field named get or set |  |
| 7adeb5c | PENDING | Fix exporting destructured variables (saghul) (#382) |  |
| 9918c12 | PENDING | workaround for #282 |  |
| c50de13 | PENDING | indent fix |  |
| 67b48ae | PENDING | - removed the 'use strip' extension - removed the JS_EVAL_FLAG_STRIP eval flag and replaced it with JS_SetStripInfo() which has simpler semantics. - qjs: added the '-s' and '--strip-source' options - qjsc: added the '-s' and '--keep-source' options |  |
| 5b0c98a | PENDING | fixed HTML comments (chqrlie) |  |
| 9106fa0 | PENDING | fixed DUMP_BYTECODE |  |
| 4cc4c6c | PENDING | optimized js_parse_class_default_ctor() (bnoordhuis) |  |
| 251a8b2 | PENDING | added column number in error messages - simplified parser |  |
| c361210 | PENDING | qjsc: added missing -fno-weakref |  |
| ecfef71 | PENDING | String.prototype.localeCompare is added in JS_AddIntrinsicStringNormalize() as it requires unicode normalization |  |
| f5788c7 | PENDING | Define lre_check_timeout in fuzz_regexp |  |
| bff5525 | PENDING | Merge pull request #400 from renatahodovan/fix-regexp |  |
| 8bb41b2 | PENDING | enabled os.Worker on Windows (bnoordhuis) |  |
| 8f99de5 | PENDING | spec update: ToPropertyKey() is now done after the evaluation of the expression in assignments |  |
| 5449fd4 | PENDING | more ToPropertyKey ordering changes |  |
| 1d5e7cf | PENDING | fixed destructuring parsing: do it only in assignment expressions |  |
| 83530ac | PENDING | fixed destructuring operation order when defining variables - optimized more cases of variable definition in destructuring |  |
| 3b04c58 | PENDING | fixed 'with' access by adding HasPropery() calls - removed unused 'with_get_ref_undef' opcode |  |
| 0c5d59f | PENDING | optimized and fixed JS_AtomIsNumericIndex1(): 'NaN' is also a number |  |
| f2b0723 | PENDING | added 'at' in Array.prototype[Symbol.unscopables] |  |
| 82d86b1 | PENDING | removed atom leak introduced in commit 83530ac9 |  |
| b67c416 | PENDING | fixed Proxy getOwnPropertyDescriptor with getters and setters |  |
| db3d3f0 | PENDING | fixed memory leak in String constructor |  |
| 000db3a | PENDING | the %TypedArray% Intrinsic Object should be a constructor |  |
| e7264d6 | PENDING | fixed Array.from() and TypedArray.from() |  |
| e1f6dfe | PENDING | fixed checks in Proxy defineProperty |  |
| 37cde16 | PENDING | fixed build_arg_list() |  |
| dbbca3d | PENDING | dtoa fix for minus zero |  |
| 334aa18 | PENDING | fixed iterator close in Map/Set constructor |  |
| fbf7d8a | PENDING | fixed detached TypedArray handling in Atomics operations |  |
| e5e7248 | PENDING | added staging test262 tests |  |
| c0958ee | PENDING | More CI tragets: Linux 32bit, LTO, Windows and Cosmopolitan |  |
| 99a855f | PENDING | future reserved keywords are forbidden in function name and arguments when the function body is in strict mode |  |
| 5e71d14 | PENDING | setters cannot have rest arguments |  |
| 5afd0eb | PENDING | fix property ordering in the object returned by RegExp.prototype.exec() |  |
| 1e958ab | PENDING | fixed operation order in Object.prototype.propertyIsEnumerable() |  |
| b32cccb | PENDING | fixed RegExp.prototype[Symbol.split] |  |
| a0a760f | PENDING | fixed GeneratorFunction prototype |  |
| 08a28c0 | PENDING | fixed TypedArray.prototype.with with detached ArrayBuffer |  |
| 3bffe67 | PENDING | fixed TypedArray.prototype.slice() when the buffers overlap |  |
| 87cf1b0 | PENDING | run-test262: added $262.gc() |  |
| 8e9e8e8 | PENDING | update tests |  |
| 3306254 | PENDING | Merge pull request #393 from nickva/more-ci-targets-and-windows-fixes |  |
| 7645ce5 | PENDING | more precise error location reporting |  |
| 1b13fa6 | PENDING | added more C callbacks for exotic objects (#324) |  |
| 19abf18 | PENDING | new release |  |
| 894ce9d | PENDING | fixed js_std_await() so that it behaves the same way as js_std_loop() (#402) |  |
| 2d4e1cc | PENDING | fixed the delete operator with global variables |  |
| 9bb1d72 | PENDING | fixed operation order in js_obj_to_desc() |  |
| 3fbea36 | PENDING | update tests |  |
| 23e2dc9 | PENDING | handle strings as module import and export names |  |
| 53327c2 | PENDING | simplified uncatchable exception handling |  |
| 30fe3de | PENDING | Object.prototype has an immutable prototype |  |
| be06b3e | PENDING | added JS_PrintValue() and use it in console.log(), print() and the REPL (#256) |  |
| 703de06 | PENDING | fixed use of JS_DumpValue() |  |
| 11d076f | PENDING | added get_array_el3 opcode - removed to_propkey2 opcode |  |
| 0a6160d | PENDING | avoid relying on 'FILE *' in JS_PrintValue() API |  |
| c95b024 | PENDING | added RegExp.escape (bnoordhuis) |  |
| a8b2d7c | PENDING | added Float16Array (bnoordhuis) - optimized float16 conversion functions |  |
| d7cdfdc | PENDING | regexp: added v flag support - fixed corner cases of case insensitive matching |  |
| 3c39307 | PENDING | better promise rejection tracker heuristics (#112) |  |
| 9c973a8 | PENDING | added Promise.try (saghul) |  |
| f95b8ba | PENDING | added regexp modifiers |  |
| a33610d | PENDING | update test results |  |
| 1021e3c | PENDING | compilation fix |  |
| aaa9cea | PENDING | Proxy: fixed prototype comparison in setPrototypeOf() and getPrototypeOf() (#410) |  |
| 9bce51e | PENDING | improved JSON parser conformity (chqrlie) (#250) |  |
| 2f167bb | PENDING | export JS_FreePropertyEnum() |  |
| 8381245 | PENDING | added JS_AtomToCStringLen() |  |
| f10ef29 | PENDING | added JSON modules and import attributes |  |
| 071a4cf | PENDING | use Object.is() in tests |  |
| 8b2a124 | PENDING | fixed Regexp.prototype[Symbol.match] |  |
| 1dfaa61 | PENDING | improved compatibility of std.parseExtJSON() with JSON5 |  |
| 7c487f1 | PENDING | support JSON modules in qjsc - added support of JSON5 modules (using type = "json5") |  |
| 1572aa8 | PENDING | avoid win32 crash in getTimezoneOffset() if time is < 1970 (#238) |  |
| 3dc7ef1 | PENDING | more robust out of memory handling (#406) |  |
| 02a2643 | PENDING | fixed parsing of function definition |  |
| 3d92a9d | PENDING | new keyword cannot be used with an optional chain |  |
| dfc254a | PENDING | update tests |  |
| fc524f7 | PENDING | added missing 'Unknown' unicode Script |  |
| bb986e5 | PENDING | update tests |  |
| 638ec8c | PENDING | fixed js_bigint_to_string1() (#412) |  |
| 00b1d8d | PENDING | Read byteOffset for detached buffers |  |
| 0f7eadf | PENDING | Fix Windows MinGW CI Build |  |
| 9b935db | PENDING | Merge pull request #418 from nickva/fix-byteoffset-for-detached-array-buffers |  |
| 098f221 | PENDING | added Error.isError() (bnoordhuis) |  |
| 4d9a27c | PENDING | update Changelog |  |
| f1b1c00 | PENDING | update test262 |  |
| 2fd48bf | PENDING | fixed module async evaluation logic - added DUMP_MODULE_EXEC |  |
| 458c34d | PENDING | fixed GC logic so that a module can live after a JSContext is destroyed (#280) - update the reference count for the realm in jobs and FinalizationRegistry |  |
| 1fdc768 | PENDING | removed module leak in js_std_eval_binary() (#425) |  |
| bb34e27 | PENDING | test262 update |  |
| c942978 | PENDING | TypedArray.prototype.subarray: fixed the step at which '[[ByteOffset]]' is read |  |
| e1c18be | PENDING | fixed buffer overflow in js_bigint_from_string() |  |
| 1168c21 | PENDING | fixed crash in OP_add_loc if the variable is modified in JS_ToPrimitiveFree() |  |
| 9ce5442 | PENDING | fixed buffer overflow in js_bigint_to_string1() |  |
| c927eca | PENDING | fixed buffer overflow in TypedArray.prototype.lastIndexOf() |  |
| 4e0d0b7 | PENDING | avoid side effects in JS_PrintValue() which may lead to crashes in print() and js_std_promise_rejection_check() |  |
| d9ec8f1 | PENDING | limit function and regexp bytecode to 1G to avoid buffer overflows (the bytecode generators assume that bytecode offsets can fit a 32 bit signed integer |  |
| a4ac84d | PENDING | Adjust lastIndex to leading surrogate when inside a surrogate pair in unicode RegExp (initial patch by auvred) |  |
| 5689f30 | PENDING | fixed handling of 8 bit unicode strings in RegExp (regression introduced by commit a4ac84d) |  |
| 0b3c73e | PENDING | removed function cast warnings (initial patch by saghul) |  |
| a4e4b43 | PENDING | run-test262: added --count_skipped_features option |  |
| 20d2b40 | PENDING | qjsc: handle C name conflicts between scripts and modules (#432) |  |
| 8a0a6e9 | PENDING | better pretty printing of strings - removed String.prototype.__quote() |  |
| 9f6c190 | PENDING | more efficient handling of strings in JSON.stringify() |  |
| 391cd3f | PENDING | Fix crash on failure to read bytecode (penneryu) |  |
| fa628f8 | PENDING | new release |  |
| dc7af0a | PENDING | updated release.sh |  |
| de4d392 | PENDING | removed memory leak (#441) |  |
| a1e073e | PENDING | added set methods (bnoordhuis) |  |
| 0cef7f0 | PENDING | set methods: removed memory leaks - fixed ordering of property access - fixed conversion to integer of 'size' in GetSetRecord() - added missing iterator close - factorized code |  |
| 0377dab | PENDING | removed uninitialized values - removed useless init |  |
| 982b7aa | PENDING | added the Iterator object |  |
| e924173 | PENDING | added Iterator.prototype.toArray and Iterator.from (bnoordhuis) |  |
| b2ed2e9 | PENDING | added Iterator.prototype.[drop,filter,flatMap,map,take,every,find,forEach,some,reduce,[Symbol.toStringTag]] (saghul) |  |
| 3dcca0d | PENDING | fix Iterator.prototype.constructor (initial patch by bnoordhuis) |  |
| cf0e179 | PENDING | Iterator is an abstract class (bnoordhuis) |  |
| 2d99c32 | PENDING | Iterator functions: |  |
| 1e19893 | PENDING | - added ArrayBuffer.prototype.transfer (Divy Srivastava) - fixed transfer when the ArrayBuffer was allocated with a custom allocator |  |
| 44d03a8 | PENDING | fixed parsing of computed property name |  |
| f021d77 | PENDING | - added resizable array buffers (bnoordhuis) - fixed Atomics.wait, Atomics.notify, TypedArray.prototype.lastIndexOf - fixed JS_PreventExtensions() with resizable typed arrays |  |
| 8807fed | PENDING | - added Atomics.pause (bnoordhuis) - use the pause instruction for x86 and ARM64 in Atomics.pause() |  |
| 456e016 | PENDING | added Map and WeakMap upsert methods (bnoordhuis) |  |
| bc753c6 | PENDING | added Math.sumPrecise() |  |
| a6db749 | PENDING | fixed Atomics.pause() in the NaN boxing case (32 bit cpu) |  |
| 0060876 | PENDING | fixed Date parsing: "1997-03-08 11:19:10-0700" is a valid date and "1997-03-08T11:19:10-07" should yield an error |  |
| c3e5ae2 | PENDING | simplified math.sumPrecise() |  |
| fb14cc6 | PENDING | Run test262 tests in CI |  |
| 4af5b1e | PENDING | Merge pull request #408 from nickva/run-test262-in-ci |  |
| 31663a9 | PENDING | updated test262 |  |
| f1253f2 | PENDING | Improve error handling in Promise.withResolvers (bnoordhuis) |  |
| f4951ef | PENDING | optimize the create of arrays - optimized the rest and array_from opcodes |  |
| 2c90110 | PENDING | - optimized global variable access |  |
| 57f8ec0 | PENDING | inlined fast path for get_field, get_field2 and put_field |  |
| 64c55c6 | PENDING | removed JS_PROP_NO_ADD |  |
| 8e8eefb | PENDING | optimized array access by inlining get_array_el, get_array_el2, get_array_el3 and put_array_el |  |
| e5de89f | PENDING | optimized post_inc and post_dec |  |
| 79f3ae2 | PENDING | optimized string_buffer_putc() |  |
| c8a8cf5 | PENDING | faster appending of elements in arrays |  |
| 7a488f3 | PENDING | update |  |
| 42eb279 | PENDING | Faster context creation and exception checks in JS_NewContext (#404) |  |
| eb9fa2b | PENDING | compilation fix for clang |  |
| 6345009 | PENDING | fixed regression in error message display introduced in commit 42eb279 |  |
| 2a53de0 | PENDING | test262 update |  |
| 0d4cd2d | PENDING | faster and safer dbuf functions (#443) |  |
| 7fb994c | PENDING | fixed argument evaluation order in Date constructor and Date.UTC() |  |
| 2161640 | PENDING | stricter year parsing in Date |  |
| c720e35 | PENDING | added js_string_eq() |  |
| 3e5f2bb | PENDING | inlined the get_length operation |  |
| 9a421b3 | PENDING | optimized Array.prototype.push |  |
| af16a97 | PENDING | changed module rejection order according to spec change |  |
| c31809e | PENDING | fixed operation order in Regexp constructor |  |
| eab6945 | PENDING | updated test results |  |
| eb2c890 | PENDING | removed uninitialized variable |  |
| a6816be | PENDING | optimized global variable access |  |
| e015918 | PENDING | Much faster destructuring at the expense of a slight incompatibility with the spec when direct evals are present (v8 behaves the same way). |  |
| 961478d | PENDING | removed duplicate test |  |
| baa186f | PENDING | qjs: added --strict option - don't consider included files as modules - allow module and strict code with -e option |  |
| 75b5230 | PENDING | Fix use-after-free in ArrayBuffer.prototype.transfer (bnoordhuis) (#450) - use js_array_buffer_update_typed_arrays() in JS_DetachArrayBuffer() |  |
| 7cfddd0 | PENDING | fixed DataView resizing |  |
| c6fe5a9 | PENDING | Fix length check in ArrayBuffer.prototype.slice (bnoordhuis) (#451) |  |
| 080c01f | PENDING | More informative "not a constructor" error message (initial patch by bnoordhuis) (#368) |  |
| d10613f | PENDING | fixed exception handling in put_var operation (regression introduced by commit a6816be) (#454) |  |
| b07ad11 | PENDING | fixed JS_PROP_AUTOINIT handling in js_closure_define_global_var() (#455) |  |
| 9688007 | PENDING | Restore a mistakenly removed goto on error in js_build_module_ns() (igorburago) |  |
| ae7219b | PENDING | - Closure optimization (go from quadratic to linear time when the number of closure variables is large) - Separated JSVarDef and JSBytecodeVarDef to simplify the code and save memory - fixed debug info stripping with global variables |  |
| 125b012 | PENDING | added error checking in JS_InstantiateFunctionListItem() |  |
| 3d0cc29 | PENDING | optimized add/sub int32 overflow |  |
| 4bd485d | PENDING | - Added Iterator.concat (initial patch by bnoordhuis) - optimized js_iterator_concat_next() - added more guards against recursion in Iterator.concat operations |  |
| fcbf5ea | PENDING | fixed BJSON array serialization (#457) |  |
| 7ab2341 | PENDING | faster and simpler implementation of regexp backtracking |  |
| 9f11034 | PENDING | - optimized Regexp.prototype.exec - optimized String.prototype.replace - optimized 'arguments' object creation - optimized access to non strict 'arguments' elements |  |
| 728ed94 | PENDING | fixed Worker freeing logic (#462) |  |
| a774007 | PENDING | removed buffer overflows introduced in regexp optimizations |  |
| 371c06e | PENDING | regexp: ensure that the bytecode size grows linearly with respect to the input regexp. |  |
| 47aac8b | PENDING | regexp: cosmetic: make it clearer that there is now a set of registers instead of an auxiliary stack |  |
| 5907aa6 | PENDING | added missing lre_poll_timeout() |  |
| b226856 | PENDING | updated to unicode 17.0.0 - updated test262 version |  |
| 24379bf | PENDING | added regexp duplicate named groups - fixed reset of captures with quantizers |  |
| e5fd391 | PENDING | fixed fast array extension optimization when there are multiple realms |  |
| fcd33c1 | PENDING | removed memory leak in case of error in cpool_add() (#468) |  |
| 1dbba8a | PENDING | removed use after free in js_create_module_bytecode_function() (#467) |  |
| c73a435 | PENDING | Don't call well-known Symbol methods for RegExp on primitive values |  |
| 31ef02b | PENDING | slightly faster lexical variable assignment |  |
| 7bd1ae2 | PENDING | \x{N} is a syntax error |  |
| f113949 | PENDING | regexp: removed alloca() is lre_exec() - added specific opcodes for \s and \S to have a smaller bytecode - optimized \b and \B |  |
| 4c722ce | PENDING | modified js_allocate_fast_array() so that the array is fully initialized. It is slightly slower but avoids several nasty bugs (#471) |  |
| 0989d4c | PENDING | fixed TypedArray sort semantics by copying the array before calling the comparison function. Fixed buffer overflow when the array is resized (#477) |  |
| 68caa5f | PENDING | fixed TypedArray constructor semantics which removes a buffer overflow (#478) |  |
| aaf0174 | PENDING | test262 update |  |
| 69090b9 | PENDING | Fix stack underflow with generator in iterable (saghul) (#488) |  |
| 841dd03 | PENDING | fixed buffer overflow in TypedArray.prototype.with (#492) |  |
| f1b63fc | PENDING | Fix memory leak in Iterator.prototype.map (saghul) (#493) |  |
| 16d6947 | PENDING | typo |  |
| 46bd985 | PENDING | fixed buffer overflow in Atomics with resizable typed arrays |  |
| 4d16546 | PENDING | fixed RegExp.escape |  |
| e7b9f21 | PENDING | Fix async generator lifecycle bug (bnoordhuis) (quickjs-ng/quickjs#1355) |  |
| 5022f2b | PENDING | fixed use-after-free via re-entrant GC in FinalizationRegistry weak reference cleanup (#494) |  |
| a31dcef | PENDING | added basic protection against too large function in serialized bytecode |  |
| d7ae12a | PENDING | added JSON.parse source text access |  |
