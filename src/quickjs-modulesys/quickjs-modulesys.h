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

/* initializes the import.meta object for the provided module function */
int QJMS_SetModuleImportMeta(JSContext *ctx, JSValueConst func_val);

/*
  Synchronously evaluate buf as script/module. For module input, throws
  TypeError if the module (or any of its transitive imports) uses
  top-level await — synchronous load is Zalgo-unsafe for TLA modules.

  returns 0 on success, nonzero on error.
  in case of error, prints error to stderr before returning.
*/
int QJMS_EvalBuf(JSContext *ctx, const void *buf, int buf_len,
                 const char *filename, int eval_flags);

/*
  Async variant: for module input, kicks off evaluation and returns 0
  immediately. The underlying module-evaluation promise is dropped — the
  caller is expected to pump the event loop (e.g. js_eventloop_run) to
  drive it to completion. Supports top-level await.

  returns 0 on success (including when the module has not yet finished
  executing), nonzero on synchronous error.
*/
int QJMS_EvalBufAsync(JSContext *ctx, const void *buf, int buf_len,
                      const char *filename, int eval_flags);

/*
  module can be -1 for autodetect.
  Synchronously evaluates the file; see QJMS_EvalBuf for the TLA
  constraint.
  returns 0 on success, nonzero on error.
  in case of error, prints error to stderr before returning.
*/
int QJMS_EvalFile(JSContext *ctx, const char *filename, int module);

/*
  module can be -1 for autodetect.
  Async variant; see QJMS_EvalBufAsync.
*/
int QJMS_EvalFileAsync(JSContext *ctx, const char *filename, int module);

/*
  Synchronously evaluates bytecode. Throws TypeError if the bytecode is
  a module that uses top-level await.
  returns 0 on success, nonzero on error.
  in case of error, prints error to stderr before returning.
*/
int QJMS_EvalBinary(JSContext *ctx, const uint8_t *buf, size_t buf_len,
                    int load_only);

/*
  Async variant of QJMS_EvalBinary. See QJMS_EvalBufAsync for semantics.
*/
int QJMS_EvalBinaryAsync(JSContext *ctx, const uint8_t *buf, size_t buf_len,
                         int load_only);

/* the internal behavior of the 'require' function, exposed as a C API */
JSValue QJMS_Require(JSContext *ctx, JSValueConst specifier);
JSValue QJMS_Require2(JSContext *ctx, JSValueConst specifier, JSValueConst basename);

/* the internal behavior of the 'require.resolve' function, exposed as a C API */
JSValue QJMS_RequireResolve(JSContext *ctx, JSValueConst specifier_val);
JSValue QJMS_RequireResolve2(JSContext *ctx, JSValueConst specifier_val, JSAtom basename_atom);

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
