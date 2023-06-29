#include "quickjs.h"
#include "cutils.h"
#include <dlfcn.h>

JSModuleDef *js_init_module_dl(JSContext *ctx, const char *module_name);
