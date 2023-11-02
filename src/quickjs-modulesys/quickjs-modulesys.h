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
*/
void QJMS_InitContext(JSContext *ctx);

/* free resources allocated by the module loader system */
void QJMS_FreeState(JSRuntime *rt);

/*
  Affects the value of import.meta.main.
*/
void QJMS_SetMainModule(JSRuntime *rt, const char *module_name);

/*
  Check if import.meta.main would be true for this module.
*/
JS_BOOL QJMS_IsMainModule(JSRuntime *rt, const char *module_name);

/* initializes the import.meta object for the provided module function */
int QJMS_SetModuleImportMeta(JSContext *ctx, JSValueConst func_val);

/*
  returns 0 on success, nonzero on error.
  in case of error, prints error to stderr before returning.
*/
int QJMS_EvalBuf(JSContext *ctx, const void *buf, int buf_len,
                 const char *filename, int eval_flags);

/*
  module can be -1 for autodetect.
  returns 0 on success, nonzero on error.
  in case of error, prints error to stderr before returning.
*/
int QJMS_EvalFile(JSContext *ctx, const char *filename, int module);

/*
  returns 0 on success, nonzero on error.
  in case of error, prints error to stderr before returning.
*/
int QJMS_EvalBinary(JSContext *ctx, const uint8_t *buf, size_t buf_len,
                    int load_only);

/* the internal behavior of the 'require' function, exposed as a C API */
JSValue QJMS_Require(JSContext *ctx, JSValueConst specifier);
JSValue QJMS_Require2(JSContext *ctx, JSValueConst specifier, JSValueConst basename);

/* the internal behavior of the 'require.resolve' function, exposed as a C API */
JSValue QJMS_RequireResolve(JSContext *ctx, JSValueConst specifier_val);
JSValue QJMS_RequireResolve2(JSContext *ctx, JSValueConst specifier_val, JSAtom basename_atom);

/* returns an object like { require: Function, Module: Object } */
JSValue QJMS_GetModuleLoaderInternals(JSContext *ctx);

#endif /* ifndef QUICKJS_MODULESYS_H */
