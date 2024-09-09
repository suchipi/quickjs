#ifndef QUICKJS_ENGINE_H
#define QUICKJS_ENGINE_H

#include "quickjs.h"

JSModuleDef *js_init_module_engine(JSContext *ctx, const char *module_name);

#endif /* ifndef QUICKJS_ENGINE_H */
