#include <string.h>
#include <errno.h>

#include "quickjs-libbytecode.h"
#include "quickjs-utils.h"
#include "quickjs-modulesys.h"
#include "cutils.h"

static JSValue js_encoding_toUtf8(JSContext *ctx, JSValueConst this_val,
                                  int argc, JSValueConst *argv)
{
  size_t len;
  JSValue input;
  uint8_t *buf;

  input = argv[0];
  buf = JS_GetArrayBuffer(ctx, &len, input);
  if (buf == NULL) {
    return JS_ThrowError(ctx, "input must be an ArrayBuffer");
  }

  return JS_NewStringLen(ctx, (char *)buf, len);
}

static const JSCFunctionListEntry js_encoding_funcs[] = {
  JS_CFUNC_DEF("toUtf8", 1, js_encoding_toUtf8 ),
};

static int js_encoding_init(JSContext *ctx, JSModuleDef *m)
{
  return JS_SetModuleExportList(ctx, m, js_encoding_funcs,
                                countof(js_encoding_funcs));
}

JSModuleDef *js_init_module_encoding(JSContext *ctx, const char *module_name)
{
  JSModuleDef *m;
  m = JS_NewCModule(ctx, module_name, js_encoding_init, NULL);
  if (!m) {
    return NULL;
  }
  JS_AddModuleExportList(ctx, m, js_encoding_funcs, countof(js_encoding_funcs));
  return m;
}
