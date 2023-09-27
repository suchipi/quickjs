#ifndef QUICKJS_LIBPOINTER_H
#define QUICKJS_LIBPOINTER_H

#include "quickjs.h"

JSModuleDef *js_init_module_pointer(JSContext *ctx, const char *module_name);
JSValue js_new_pointer(JSContext *ctx, void *value);

#endif /* ifndef QUICKJS_LIBPOINTER_H */