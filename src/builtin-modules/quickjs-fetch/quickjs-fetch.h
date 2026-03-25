#ifndef QUICKJS_FETCH_H
#define QUICKJS_FETCH_H

#include "quickjs.h"

#ifdef __cplusplus
extern "C" {
#endif

JSModuleDef *js_init_module_fetch(JSContext *ctx, const char *module_name);

/* Add fetch, Headers, Response as globals */
void js_fetch_add_globals(JSContext *ctx);

#ifdef __cplusplus
}
#endif

#endif /* QUICKJS_FETCH_H */
