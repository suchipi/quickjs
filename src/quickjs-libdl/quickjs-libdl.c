#include <string.h>
#include <errno.h>

#include "quickjs-libdl.h"
#include "quickjs-libc.h"

static JSValue js_dl_dlopen(JSContext *ctx, JSValueConst this_val,
                            int argc, JSValueConst *argv)
{
    const char *filename;
    int flags;
    void *handle;
    char *error;

    if (argc != 2) {
        return JS_ThrowTypeError(ctx, "expected 2 arguments to dlopen, but received %d", argc);
    }

    filename = JS_ToCString(ctx, argv[0]);
    if (filename == NULL) {
        return JS_EXCEPTION;
    }

    if (JS_ToInt32(ctx, &flags, argv[1])) {
        JS_FreeCString(ctx, filename);
        return JS_EXCEPTION;
    }

    handle = dlopen(filename, flags);
    if (!handle) {
        error = dlerror();
        JS_FreeCString(ctx, filename);
        return JS_ThrowError(ctx, "%s", error);
    }

    JS_FreeCString(ctx, filename);

    return js_std_new_user_ptr(ctx, handle);
}

static JSValue js_dl_dlsym(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    // TODO
    return JS_ThrowError(ctx, "Not yet implemented");
}

static JSValue js_dl_dlclose(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    // TODO
    return JS_ThrowError(ctx, "Not yet implemented");
}

static const JSCFunctionListEntry js_dl_funcs[] = {
    JS_PROP_INT32_DEF("RTLD_LAZY", RTLD_LAZY, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("RTLD_NOW", RTLD_NOW, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("RTLD_GLOBAL", RTLD_GLOBAL, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("RTLD_LOCAL", RTLD_LOCAL, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("RTLD_NODELETE", RTLD_NODELETE, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("RTLD_NOLOAD", RTLD_NOLOAD, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("RTLD_DEEPBIND", RTLD_DEEPBIND, JS_PROP_CONFIGURABLE ),

    JS_CFUNC_DEF("dlopen", 2, js_dl_dlopen ),
    JS_CFUNC_DEF("dlsym", 2, js_dl_dlsym ),
    JS_CFUNC_DEF("dlclose", 1, js_dl_dlclose ),
};

static int js_dl_init(JSContext *ctx, JSModuleDef *m)
{
    return JS_SetModuleExportList(ctx, m, js_dl_funcs,
                                  countof(js_dl_funcs));
}

/* NOTE: you have to initialize std first, as it defines UserPtr */
JSModuleDef *js_init_module_dl(JSContext *ctx, const char *module_name)
{
    JSModuleDef *m;
    m = JS_NewCModule(ctx, module_name, js_dl_init, NULL);
    if (!m) {
        return NULL;
    }
    JS_AddModuleExportList(ctx, m, js_dl_funcs, countof(js_dl_funcs));
    return m;
}
