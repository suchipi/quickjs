#ifndef QUICKJS_MODULESYS_H
#define QUICKJS_MODULESYS_H

#include "quickjs.h"

/* initializes the import.meta object for the provided module function */
int QJMS_SetModuleImportMeta(JSContext *ctx, JSValueConst func_val,
                             JS_BOOL is_main);

/* a module name normalization function, suitable for passing into JS_SetModuleLoaderFunc. */
char *QJMS_NormalizeModuleName(JSContext *ctx,
                               const char *base_name,
                               const char *name, void *opaque);

/* a module loader function, suitable for passing into JS_SetModuleLoaderFunc. */
JSModuleDef *QJMS_ModuleLoader(JSContext *ctx,
                               const char *module_name, void *opaque);
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

/*
  creates a 'require' function (which also has a .resolve property on it) and
  places it on the provided JSContext's global object.

  unlike Node.js's `require` function, this require function is not "bound"
  to any particular caller filename. The caller filename gets determined
  at call time (via the stack). Every module receives the same require
  function (via its global name) rather than receiving one via a closure.
*/
void QJMS_AddRequireGlobal(JSContext *ctx);

/*
  creates a 'Module' object and adds it to the provided JSContext's global
  object.

  The 'Module' object provides APIs that allow JS code to change the behavior of
  the module system: loading, compilers, name normalization (aka module
  resolution), search extensions, etc.
*/
void QJMS_AddModuleGlobal(JSContext *ctx);

/* adds all QJMS-related globals to the global object of the provided context
   (require, Module, etc) */
void QJMS_AddGlobals(JSContext *ctx);

#endif /* ifndef QUICKJS_MODULESYS_H */
