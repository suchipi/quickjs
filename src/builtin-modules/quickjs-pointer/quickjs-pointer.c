#include <string.h>

#include "quickjs-pointer.h"

JSClassID js_pointer_class_id;

static JSClassDef js_pointer_class = {
    "Pointer",
};

static JSValue js_pointer_ctor(JSContext *ctx, JSValueConst this_val,
                               int argc, JSValueConst *argv)
{
    return JS_ThrowError(ctx, "<internal>/quickjs-pointer.c", __LINE__, "Pointer objects cannot be created by JavaScript code. They must instead be created by native code, by using the function `js_new_pointer`.");
}

static JSValue js_pointer_Pointer_isPointer(JSContext *ctx, JSValueConst this_val,
                                            int argc, JSValueConst *argv)
{
    if (argc != 1) {
        return JS_FALSE;
    }

    if (JS_IsObject(argv[0]) && JS_VALUE_GET_CLASS_ID(argv[0]) == js_pointer_class_id) {
        return JS_TRUE;
    } else {
        return JS_FALSE;
    }
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

    JS_SetPropertyStr(ctx, pointer, "NULL", js_new_pointer(ctx, NULL));
    JS_SetPropertyStr(ctx, pointer, "isPointer", JS_NewCFunction(ctx, js_pointer_Pointer_isPointer, "isPointer", 1));

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

    // Add _info property, if we can
    {
        size_t info_len =
            sizeof(char)
            * sizeof(void *) /* bytes in pointer-to-void */
            * 2 /* printed hex chars per byte */
            + 2 /* for the 0x at the front */
            + 16 /* %p is 'implementation defined' so god I hope they don't do weird stuff, but here's some bonus space in case they do */
            ;

        char *buf = js_malloc(ctx, info_len);
        if (buf != NULL) {
            if (snprintf(buf, info_len, "%p", value) >= 0) {
                JSValue ptr_as_str = JS_NewString(ctx, buf);
                if (JS_IsException(ptr_as_str)) {
                    // clear exception
                    JS_GetException(ctx);
                } else {
                    JS_DefinePropertyValueStr(ctx, ret, "_info", ptr_as_str, JS_PROP_ENUMERABLE);
                }
            }


            js_free(ctx, buf);
        }
    }

    return ret;
}
