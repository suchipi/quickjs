#include <string.h>
#include <errno.h>

#include "quickjs-libdl.h"
#include "quickjs-libc.h"
#include "quickjs-utils.h"

static JSValue js_dl_dlopen(JSContext *ctx, JSValueConst this_val,
                            int argc, JSValueConst *argv)
{
    const char *filename;
    int flags;
    void *handle;
    char *error;

    QJU_AssertArgLength("dlopen", 2);

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
    void *handle;
    const char *symbol_name;
    void *symbol;
    char *error;

    QJU_AssertArgLength("dlsym", 2);

    if (js_std_read_user_ptr(ctx, argv[0], &handle)) {
        return JS_EXCEPTION;
    }

    symbol_name = JS_ToCString(ctx, argv[1]);
    if (symbol_name == NULL) {
        return JS_EXCEPTION;
    }

    /* clear error code */
    dlerror();
    symbol = dlsym(handle, symbol_name);
    error = dlerror();
    if (error != NULL) {
        JS_FreeCString(ctx, symbol_name);
        return JS_ThrowError(ctx, "dlsym failed: %s", error);
    }

    return js_std_new_user_ptr(ctx, symbol);
}

static JSValue js_dl_dlclose(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    void *handle;
    int result;

    QJU_AssertArgLength("dlsym", 1);

    if (js_std_read_user_ptr(ctx, argv[0], &handle)) {
        return JS_EXCEPTION;
    }

    /* clear error code */
    dlerror();

    result = dlclose(handle);
    if (result != 0) {
        const char *error = dlerror();
        if (error != NULL) {
            return JS_ThrowError(ctx, "dlclose failed: %s (result = %d)", error, result);
        } else {
            return JS_ThrowError(ctx, "dlclose failed and dlerror returned NULL (result = %d)", result);
        }
    }

    return JS_UNDEFINED;
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
