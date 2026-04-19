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
| a47f40c | PENDING | added RegExp 'd' flag (bnoordhuis) |  |
| 399d916 | PENDING | removed memory leak |  |
| 7414e5f | PENDING | fixed the garbage collection of async functions with closures (github issue #156) |  |
| b4d8050 | PENDING | fixed crash when resizing property shapes in case of OOM (github issue #129) |  |
| 2785ede | PENDING | fixed JS module autodetection with shebang (github issue #91) |  |
| ffe8141 | PENDING | define the same atoms with or without CONFIG_ATOMICS (github issue #76) |  |
| 2ee6be7 | PENDING | added os.now() |  |
| 5c120cd | PENDING | added Error cause |  |
| 8de4538 | PENDING | make JS_NewClassID thread safe |  |
| e44b793 | PENDING | allow 'await' in the REPL and added os.sleepAsync() |  |
| 8f897d6 | PENDING | fixed crash in JS_DumpMemoryUsage (github issue #65) |  |
| a8064b7 | PENDING | added note about atomic operations |  |
| 1605764 | PENDING | class static block (initial patch by bnoordhuis) |  |
| 3ab1c2b | PENDING | added 'in' operator for private fields |  |
| bd0b704 | PENDING | added a comment for non-initialized warning in Valgrind (github issue #153) |  |
| 24aa7ba | PENDING | fixed test262: derived-this-uninitialized-realm.js |  |
| df3781d | PENDING | make for in faster and spec compliant (github issue #137) |  |
| 3c2cfab | PENDING | fixed run_test262_harness_test() with modules |  |
| c363586 | PENDING | avoid potentially undefined behavior and make valgrind happy (bnoordhuis) (github issue #153) |  |
| 5935a26 | PENDING | fixed class name init in static initializers |  |
| c06c399 | PENDING | fixed next token parsing after a function definition (github issue #77) |  |
| aac2464 | PENDING | fix worker termination in example (github issue #98) |  |
| af30861 | PENDING | fixed regexp case insensitive flag |  |
| e1e65ac | PENDING | fixed Date.toLocaleString() (kuzmas) |  |
| f25e5d4 | PENDING | optional chaining fixes (github issue #103) |  |
| 10fc744 | PENDING | regexp: fixed the zero advance logic in quantifiers (github issue #158) |  |
| 195c42b | PENDING | added os.getpid() |  |
| e66ce48 | PENDING | more portable and Windows version for getTimezoneOffset() (github issue #122) |  |
| c950966 | PENDING | update test results |  |
| e80917b | PENDING | fixed uninitialized harnessbuf |  |
| 9a4379d | PENDING | native cosmopolitan build |  |
| efdb722 | PENDING | fixed JS_GetScriptOrModuleName() in direct or indirect eval code |  |
| 6e651e8 | PENDING | allow override of PREFIX, CROSS_PREFIX, CFLAGS and LDFLAGS in Makefile (humenda) |  |
| 3f81070 | PENDING | new release |  |
| d6c7d16 | PENDING | update Changelog |  |
| 8405876 | PENDING | added js_std_await() and use it to wait for the evaluation of a module (github issue #219) |  |
| 9e561d5 | PENDING | fixed and simplified setTimeout() by using an integer timer handle (github issue #218) |  |
| 67723c9 | PENDING | fixed js_std_await() in case 'obj' is not a promise (github issue #222) |  |
| 090685a | PENDING | update test results |  |
| cd666a8 | PENDING | simplified and fixed arrow function parsing (github issue #226) |  |
| c6cc6a9 | PENDING | export JS_GetModuleNamespace (github issue #34) |  |
| 00967aa | PENDING | fixed Promise return in the REPL by using a wrapper object in async std.evalScript() (github issue #231) |  |
| 1ed38ee | PENDING | fixed MingW64 install on Windows (absop) (github issue #230) |  |
| 6f480ab | PENDING | avoid using INT64_MAX in double comparisons because it cannot be exactly represented as a double (bnoordhuis) |  |
| 37bd4ae | PENDING | Strip trailing spaces |  |
| 2c793e5 | PENDING | Fix test262o error |  |
| c9e6c56 | PENDING | Improve microbench |  |
| 48deab1 | PENDING | Fix runtime bugs |  |
| 2e10134 | PENDING | Add more tests |  |
| 626e0d4 | PENDING | Unbroke tests/test_test_bjson.js |  |
| 325ca19 | PENDING | Add MemorySanitizer support |  |
| fd6e039 | PENDING | Add UndefinedBehaviorSanitizer support |  |
| e53d622 | PENDING | Fix UB in js_dtoa1 |  |
| 6535064 | PENDING | Fix undefined behavior (UBSAN) |  |
| 6dbf01b | PENDING | Remove unsafe sprintf() and strcat() calls |  |
| e140122 | PENDING | Fix sloppy mode arguments uninitialized value use |  |
| 693449e | PENDING | add gitignore for build objects (#84) |  |
| ae6fa8d | PENDING | Fix shell injection bug in std.urlGet (#61) |  |
| 636c946 | PENDING | FreeBSD QuickJS Patch (#203) |  |
| 92e339d | PENDING | Simplify and clarify URL quoting js_std_urlGet |  |
| ef4e7b2 | PENDING | Fix compiler warnings |  |
| 1fe0414 | PENDING | Fix test262 error |  |
| 95e0aa0 | PENDING | Reverse e140122202cc24728b394f8f90fa2f4a2d7c397e |  |
| 8e21b96 | PENDING | pass node-js command line arguments to microbench |  |
| c06af87 | PENDING | Improve string concatenation hack |  |
| 3bb2ca3 | PENDING | Remove unnecessary ssize_t posix-ism |  |
| 8df4327 | PENDING | Fix UB left shift of negative number |  |
| 85fb2ca | PENDING | Fix UB signed integer overflow in js_math_imul |  |
| 74bdb49 | PENDING | Improve tests |  |
| 0a361b7 | PENDING | handle missing test262 gracefully |  |
| 530ba6a | PENDING | handle missing test262 gracefully |  |
| bbf36d5 | PENDING | Fix big endian serialization |  |
| c24a865 | PENDING | Improve run-test262 |  |
| 97ae6f3 | PENDING | Add benchmarks target |  |
| 8d932de | PENDING | Rename regex flag and field utf16 -> unicode |  |
| 12c91df | PENDING | Improve surrogate handling readability |  |
| b91a2ae | PENDING | Add C API function JS_GetClassID() |  |
| b70e764 | PENDING | Rewrite `set_date_fields` to match the ECMA specification |  |
| 27928ce | PENDING | Fix Map hash bug |  |
| 6428ce0 | PENDING | show readable representation of Date objects in repl |  |
| 78db49c | PENDING | Improve Date.parse |  |
| 8180d3d | PENDING | Improve microbench.js |  |
| a78d2cb | PENDING | Improve repl regexp handling |  |
| 8d64731 | PENDING | Improve Number.prototype.toString for radix other than 10 |  |
| 35b7b3c | PENDING | Improve Date.parse |  |
| 3dd93eb | PENDING | fix microbench when microbench.txt is missing (#246) |  |
| 06c100c | PENDING | Prevent UB on memcpy and floating point conversions |  |
| e17cb9f | PENDING | Add github CI tests |  |
| 1a5333b | PENDING | prevent 0 length allocation in `js_worker_postMessage` |  |
| ebe7496 | PENDING | Fix build: use LRE_BOOL in libunicode.h (#244) |  |
| 6a89d7c | PENDING | Add CI targets, fix test_std.js (#247) |  |
| 65ecb0b | PENDING | Improve Date.parse, small fixes |  |
| 0665131 | PENDING | Fix compilation with -DCONFIG_BIGNUM |  |
| c0e67c4 | PENDING | Simplify redundant initializers for `JS_NewBool()` |  |
| ce6b6dc | PENDING | Use more explicit magic values for array methods |  |
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
