#ifndef QUICKJS_MODULESYS_H
#define QUICKJS_MODULESYS_H

#include <stdlib.h>
#include <limits.h>
#include <errno.h>
#include <string.h>
#include <assert.h>
#include <dlfcn.h>
#include "cutils.h"
#include "quickjs.h"
#include "quickjs-utils.h"
#include "debugprint.h"

/* initialize the import.meta object for the provided module function */
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

#endif /* ifndef QUICKJS_MODULESYS_H */
