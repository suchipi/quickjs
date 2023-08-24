#include "quickjs.h"
#include "cutils.h"

JSModuleDef *js_init_module_pointer(JSContext *ctx, const char *module_name);
JSValue js_new_pointer(JSContext *ctx, void *value);
