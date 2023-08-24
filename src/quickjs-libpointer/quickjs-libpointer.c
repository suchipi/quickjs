#include <string.h>
#include <errno.h>

#include "quickjs-libpointer.h"
#include "quickjs-libc.h"
#include "quickjs-libbytecode.h"
#include "cutils.h"

static JSClassID js_pointer_class_id;

static JSClassDef js_pointer_class = {
    "Pointer",
};

static JSValue js_pointer_ctor(JSContext *ctx, JSValueConst this_val,
                               int argc, JSValueConst *argv)
{
    return JS_ThrowError(ctx, "Pointer objects cannot be created by scripts/modules. They must instead be created by native code.");
}

static int js_pointer_init(JSContext *ctx, JSModuleDef *m) {
    JSValue pointer, pointer_proto;

    JS_NewClassID(&js_pointer_class_id);
    JS_NewClass(JS_GetRuntime(ctx), js_pointer_class_id, &js_pointer_class);

    pointer_proto = JS_NewObject(ctx);
    pointer = JS_NewCFunction2(ctx, js_pointer_ctor, "Pointer", 0,
                            JS_CFUNC_constructor, 0);
    JS_SetConstructor(ctx, pointer, pointer_proto);
    JS_SetClassProto(ctx, js_pointer_class_id, pointer_proto);

    JS_SetModuleExport(ctx, m, "Pointer", pointer);

    return 0;
}

JSModuleDef *js_init_module_pointer(JSContext *ctx, const char *module_name)
{
    JSModuleDef *m;
    m = JS_NewCModule(ctx, module_name, js_pointer_init, NULL);
    if (!m) {
        return NULL;
    }
    JS_AddModuleExport(ctx, m, "Pointer");
    return m;
}

JSValue js_new_pointer(JSContext *ctx, void *value)
{
    JSValue ret;

    ret = JS_NewObjectClass(ctx, js_pointer_class_id);
    JS_SetOpaque(ret, value);

    return ret;
}
