#ifndef QUICKJS_MODULESYS_H
#define QUICKJS_MODULESYS_H

#include "quickjs.h"

typedef struct QJMS_State QJMS_State;

/*
  initialize and register the module loader system.
  call both this (once per runtime) AND QJMS_InitContext (once per context).
*/
void QJMS_InitState(JSRuntime *rt);

/*
  initialize and register the module loader system.
  call both this (once per context) AND QJMS_InitState (once per runtime).

  returns -1 on exception
*/
int QJMS_InitContext(JSContext *ctx, int set_require_global);

/* free resources allocated by the module loader system */
void QJMS_FreeState(JSRuntime *rt);

/*
  Affects the value of import.meta.main.
*/
void QJMS_SetMainModule(JSContext *ctx, const char *module_name);

/*
  Check if import.meta.main would be true for this module.
*/
JS_BOOL QJMS_IsMainModule(JSContext *ctx, const char *module_name);

/* initializes the import.meta object for the provided module function.
   `attributes` is the import-attributes object (passed via the
   `with { ... }` clause) for this module, or `JS_UNDEFINED` when no
   attributes were used. The value is exposed as `import.meta.attributes`
   (a defensive copy with non-writable, non-configurable own properties
   on a non-extensible object). */
int QJMS_SetModuleImportMeta(JSContext *ctx, JSValueConst func_val,
                             JSValueConst attributes);

/*
  All QJMS_Eval* functions below share an error-reporting contract:

  On synchronous error, the function returns -1, AND the pending exception
  is reported (via QJU_ReportException — which prints to stderr by default,
  or routes via the worker error-send pipe for Worker runtimes) AND consumed
  (via JS_GetException). Callers should NOT call QJU_PrintException afterwards
  — the exception slot is empty by the time we return, and a second print
  produces "thrown non-Error value: [unsupported type]".

  TLA-rejection behavior in the *Async variants is separate: the rejection
  reason is reported by the entry-module rejection handler installed by
  QJMS_AttachEntryRejectionHandler, which fires when the eventloop drives
  the promise to settlement. QJMS_EntryModuleRejected lets the caller
  observe whether that happened.
*/

/*
  Synchronously evaluate buf as script/module. For module input, throws
  TypeError if the module (or any of its transitive imports) uses
  top-level await — synchronous load is Zalgo-unsafe for TLA modules.

  Returns 0 on success, -1 on error. See contract above.
*/
int QJMS_EvalBuf(JSContext *ctx, const void *buf, int buf_len,
                 const char *filename, int eval_flags);

/*
  Async variant: for module input, kicks off evaluation and returns 0
  immediately. The underlying module-evaluation promise is dropped — the
  caller is expected to pump the event loop (e.g. js_eventloop_run) to
  drive it to completion. Supports top-level await.

  Returns 0 on success (including when the module has not yet finished
  executing), -1 on synchronous error. See contract above.
*/
int QJMS_EvalBufAsync(JSContext *ctx, const void *buf, int buf_len,
                      const char *filename, int eval_flags);

/*
  module can be -1 for autodetect.
  strict is only honored when the input ends up as script (module=0
  after autodetect, or module=0 forced by the caller); for modules
  it has no effect (modules are always strict per spec).
  Synchronously evaluates the file; see QJMS_EvalBuf for the TLA
  constraint.

  Returns 0 on success, -1 on error. See contract above.
*/
int QJMS_EvalFile(JSContext *ctx, const char *filename, int module, int strict);

/*
  module can be -1 for autodetect. See QJMS_EvalFile for strict.
  Async variant; see QJMS_EvalBufAsync.
*/
int QJMS_EvalFileAsync(JSContext *ctx, const char *filename, int module, int strict);

/*
  Synchronously evaluates bytecode. Throws TypeError if the bytecode is
  a module that uses top-level await.

  filename_override (may be NULL): when non-NULL and the bytecode is a
  module, the loaded module's name is overridden to filename_override
  before its imports are resolved. Used by qjsbootstrap-bytecode to
  anchor relative imports at the bootstrap binary's location instead
  of whatever filename was baked into the bytecode at compile time.

  Returns 0 on success, -1 on error. See contract above.
*/
int QJMS_EvalBinary(JSContext *ctx, const uint8_t *buf, size_t buf_len,
                    int load_only, const char *filename_override);

/*
  Async variant of QJMS_EvalBinary. See QJMS_EvalBufAsync for semantics
  and QJMS_EvalBinary for the filename_override parameter.
*/
int QJMS_EvalBinaryAsync(JSContext *ctx, const uint8_t *buf, size_t buf_len,
                         int load_only, const char *filename_override);

/* the internal behavior of the 'require' function, exposed as a C API.
   `attributes` is the import-attributes object (may be JS_UNDEFINED). */
JSValue QJMS_Require(JSContext *ctx, JSValueConst specifier,
                     JSValueConst attributes);
JSValue QJMS_Require2(JSContext *ctx, JSValueConst specifier,
                      JSValueConst basename, JSValueConst attributes);

/* the internal behavior of the 'require.resolve' function, exposed as a
   C API. `attributes` is the import-attributes object (may be
   JS_UNDEFINED). */
JSValue QJMS_RequireResolve(JSContext *ctx, JSValueConst specifier_val,
                            JSValueConst attributes);
JSValue QJMS_RequireResolve2(JSContext *ctx, JSValueConst specifier_val,
                             JSAtom basename_atom, JSValueConst attributes);

/* returns an object like { require: Function, ModuleDelegate: Object } */
JSValue QJMS_GetModuleLoaderInternals(JSContext *ctx);

/*
  Returns nonzero if the entry module (i.e. the module evaluated via
  QJMS_Eval*Async) rejected. Drivers (qjs, quickjs-run) call this after
  their event loop returns so a top-level-await rejection can propagate to
  the process exit status — matching the behavior of a sync `throw` from a
  non-TLA module. The rejection reason was already printed to stderr by
  the internal handler when it fired.
*/
int QJMS_EntryModuleRejected(JSRuntime *rt);

/*
  Install a callback that overrides the default "print to stderr" behavior
  of the entry-module rejection handler. When set, the callback is invoked
  with the rejection reason instead of `QJU_PrintError` being called. The
  `entry_module_rejected` flag is still set regardless, so
  `QJMS_EntryModuleRejected`-based exit-code propagation in
  qjs/quickjs-run is unaffected. Pass NULL to restore the default.

  Intended for embedders that route top-level rejections elsewhere — e.g.
  the Worker runner, which forwards them to the parent via the dedicated
  error pipe so the parent's `worker.onerror` can fire.
*/
void QJMS_SetTopLevelRejectionCallback(
  JSRuntime *rt,
  void (*cb)(JSContext *ctx, JSValueConst reason));

/*
  Attach the entry-module rejection handler to `promise` and consume it.
  If the promise rejects, the reason is printed to stderr and the
  entry-module-rejected flag is set (observable via
  QJMS_EntryModuleRejected).

  QJMS_Eval*Async apply this handler automatically. Use this directly for
  embedders that obtain an entry-module promise through another path — e.g.
  the Worker runner, which loads its entry module via JS_LoadModule.

  Ownership: consumes `promise` (frees it on success or failure).
*/
void QJMS_AttachEntryRejectionHandler(JSContext *ctx, JSValue promise);

#endif /* ifndef QUICKJS_MODULESYS_H */
