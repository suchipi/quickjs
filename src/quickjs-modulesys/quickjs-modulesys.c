#include "quickjs-modulesys.h"

int QJMS_SetModuleImportMeta(JSContext *ctx, JSValueConst func_val,
                             JS_BOOL is_main)
{
    JSModuleDef *m;
    char url_buf[4096];
    JSValue meta_obj, global_obj, require;
    JSAtom module_name_atom;
    const char *module_name;

    assert(JS_VALUE_GET_TAG(func_val) == JS_TAG_MODULE);
    m = JS_VALUE_GET_PTR(func_val);

    module_name_atom = JS_GetModuleName(ctx, m);
    module_name = JS_AtomToCString(ctx, module_name_atom);
    JS_FreeAtom(ctx, module_name_atom);
    if (!module_name)
        return -1;
    if (!strchr(module_name, ':')) {
        strcpy(url_buf, "file://");
        pstrcat(url_buf, sizeof(url_buf), module_name);
    } else {
        pstrcpy(url_buf, sizeof(url_buf), module_name);
    }
    JS_FreeCString(ctx, module_name);

    global_obj = JS_GetGlobalObject(ctx);
    require = JS_GetPropertyStr(ctx, global_obj, "require");
    if (JS_IsException(require)) {
        return -1;
    }
    JS_FreeValue(ctx, global_obj);

    meta_obj = JS_GetImportMeta(ctx, m);
    if (JS_IsException(meta_obj)) {
        return -1;
    }
    JS_DefinePropertyValueStr(ctx, meta_obj, "url",
                              JS_NewString(ctx, url_buf),
                              JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, meta_obj, "main",
                              JS_NewBool(ctx, is_main),
                              JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, meta_obj, "require",
                              require, JS_PROP_C_W_E);
    JS_FreeValue(ctx, meta_obj);
    return 0;
}

char *QJMS_NormalizeModuleName(JSContext *ctx,
                               const char *base_name,
                               const char *name, void *opaque)
{
    // NOTE: this function supports, but does not require,
    // delegating to a JS-global Module.resolve function,
    // as specified by quickjs-libc.
    JSValue global, Module, resolve;
    JSValue base_name_val, name_val;
    JSValue result_val;
    const char *result;
    JSValue argv[2];
    int argc = 2;

    global = JS_GetGlobalObject(ctx);
    if (JS_IsException(global)) {
        return NULL;
    }

    Module = JS_GetPropertyStr(ctx, global, "Module");
    if (JS_IsException(Module)) {
        JS_FreeValue(ctx, global);
        return NULL;
    }

    if (!JS_IsObject(Module)) {
        JS_FreeValue(ctx, global);
        // Return the original string as-is, so that qjsc is able to access
        // builtins
        return js_strdup(ctx, name);
    }

    resolve = JS_GetPropertyStr(ctx, Module, "resolve");
    if (JS_IsException(resolve)) {
        JS_FreeValue(ctx, Module);
        JS_FreeValue(ctx, global);
        return NULL;
    }

    if (!JS_IsFunction(ctx, resolve)) {
        JS_FreeValue(ctx, resolve);
        JS_FreeValue(ctx, Module);
        JS_FreeValue(ctx, global);

        // Return the original string as-is, so that the file which defines
        // Module.resolve is able to access builtins
        return js_strdup(ctx, name);
    }

    base_name_val = JS_NewString(ctx, base_name);
    if (JS_IsException(base_name_val)) {
        JS_FreeValue(ctx, resolve);
        JS_FreeValue(ctx, Module);
        JS_FreeValue(ctx, global);
        return NULL;
    }

    name_val = JS_NewString(ctx, name);
    if (JS_IsException(name_val)) {
        JS_FreeValue(ctx, base_name_val);
        JS_FreeValue(ctx, resolve);
        JS_FreeValue(ctx, Module);
        JS_FreeValue(ctx, global);
        return NULL;
    }

    argv[0] = name_val;
    argv[1] = base_name_val;

    result_val = JS_Call(ctx, resolve, Module, argc, argv);

    JS_FreeValue(ctx, name_val);
    JS_FreeValue(ctx, base_name_val);
    JS_FreeValue(ctx, resolve);
    JS_FreeValue(ctx, Module);
    JS_FreeValue(ctx, global);

    if (JS_IsException(result_val)) {
        return NULL;
    }

    result = JS_ToCString(ctx, result_val);
    if (result == NULL) {
        JS_FreeValue(ctx, result_val);
        return NULL;
    }

    return js_strdup(ctx, result);
}

typedef JSModuleDef *(JSInitModuleFunc)(JSContext *ctx,
                                        const char *module_name);

static JSModuleDef *qjms_ModuleLoader_so(JSContext *ctx,
                                 const char *module_name)
{
#if defined(_WIN32)
    JS_ThrowReferenceError(ctx, "shared library modules are not supported on windows");
    return NULL;
#elif defined(CONFIG_SHARED_LIBRARY_MODULES)
    JSModuleDef *m;
    void *hd;
    JSInitModuleFunc *init;
    char *filename;

    if (!strchr(module_name, '/')) {
        /* must add a '/' so that the DLL is not searched in the
           system library paths */
        filename = js_malloc(ctx, strlen(module_name) + 2 + 1);
        if (!filename)
            return NULL;
        strcpy(filename, "./");
        strcpy(filename + 2, module_name);
    } else {
        filename = (char *)module_name;
    }

    /* C module */
    hd = dlopen(filename, RTLD_NOW | RTLD_LOCAL);
    if (filename != module_name)
        js_free(ctx, filename);
    if (!hd) {
        JS_ThrowReferenceError(ctx, "could not load module filename '%s' as shared library",
                               module_name);
        goto fail;
    }

    init = dlsym(hd, "js_init_module");
    if (!init) {
        JS_ThrowReferenceError(ctx, "could not load module filename '%s': js_init_module not found",
                               module_name);
        goto fail;
    }

    m = init(ctx, module_name);
    if (!m) {
        JS_ThrowReferenceError(ctx, "could not load module filename '%s': initialization error",
                               module_name);
    fail:
        if (hd)
            dlclose(hd);
        return NULL;
    }
    return m;
#else
    JS_ThrowReferenceError(ctx, "shared library modules are not supported in this build of quickjs");
    return NULL;
#endif /* _WIN32 or CONFIG_SHARED_LIBRARY_MODULES */
}

JSModuleDef *QJMS_ModuleLoader(JSContext *ctx,
                              const char *module_name, void *opaque)
{
    // NOTE: this function supports, but does not require,
    // delegating to a JS-global Module.read function,
    // as specified by quickjs-libc.
    JSModuleDef *m;

    // TODO: delegate the decision about when to use the native module loader
    // to the JavaScript side
    if (has_suffix(module_name, ".so")) {
        m = qjms_ModuleLoader_so(ctx, module_name);
    } else {
        JSValue global, Module, read;
        JSValue func_val;

        global = JS_GetGlobalObject(ctx);
        if (JS_IsException(global)) {
            return NULL;
        }

        Module = JS_GetPropertyStr(ctx, global, "Module");
        if (JS_IsException(Module)) {
            JS_FreeValue(ctx, global);
            return NULL;
        }

        read = JS_GetPropertyStr(ctx, Module, "read");
        if (JS_IsException(read)) {
            JS_FreeValue(ctx, Module);
            JS_FreeValue(ctx, global);
            return NULL;
        }

        if (JS_IsFunction(ctx, read)) {
            const char *buf;
            size_t buf_len;
            JSValue module_name_val;
            JSValue result;
            JSValue argv[1];
            int argc = 1;

            module_name_val = JS_NewString(ctx, module_name);
            if (JS_IsException(module_name_val)) {
                JS_FreeValue(ctx, read);
                JS_FreeValue(ctx, Module);
                JS_FreeValue(ctx, global);
                return NULL;
            }

            argv[0] = module_name_val;
            result = JS_Call(ctx, read, Module, argc, argv);
            JS_FreeValue(ctx, module_name_val);

            JS_FreeValue(ctx, read);
            JS_FreeValue(ctx, Module);
            JS_FreeValue(ctx, global);

            if (JS_IsException(result)) {
                return NULL;
            }

            if (!JS_IsString(result)) {
                JS_ThrowTypeError(ctx, "Module.read returned non-string");
                JS_FreeValue(ctx, result);
                return NULL;
            }

            buf = JS_ToCStringLen(ctx, &buf_len, result);
            if (buf == NULL) {
                JS_FreeValue(ctx, result);
                return NULL;
            }

            /* compile the module */
            func_val = JS_Eval(ctx, buf, buf_len, module_name,
                               JS_EVAL_TYPE_MODULE | JS_EVAL_FLAG_COMPILE_ONLY);

            JS_FreeCString(ctx, buf);
            JS_FreeValue(ctx, result);
        } else {
            char *buf;
            size_t buf_len;

            JS_FreeValue(ctx, read);
            JS_FreeValue(ctx, Module);
            JS_FreeValue(ctx, global);

            buf = (char *)QJU_LoadFile(ctx, &buf_len, module_name);
            if (!buf) {
                JS_ThrowReferenceError(ctx, "could not load module filename '%s'", module_name);
                return NULL;
            }

            /* compile the module */
            func_val = JS_Eval(ctx, buf, buf_len, module_name,
                               JS_EVAL_TYPE_MODULE | JS_EVAL_FLAG_COMPILE_ONLY);

            js_free(ctx, buf);
        }

        if (JS_IsException(func_val))
            return NULL;
        /* XXX: could propagate the exception */
        QJMS_SetModuleImportMeta(ctx, func_val, FALSE);
        /* the module is already referenced, so we must free it */
        m = JS_VALUE_GET_PTR(func_val);
        JS_FreeValue(ctx, func_val);
    }
    return m;
}

int QJMS_EvalBuf(JSContext *ctx, const void *buf, int buf_len,
                 const char *filename, int eval_flags)
{
    JSValue val;
    int ret;

    if ((eval_flags & JS_EVAL_TYPE_MASK) == JS_EVAL_TYPE_MODULE) {
        /* for the modules, we compile then run to be able to set
           import.meta */
        val = JS_Eval(ctx, buf, buf_len, filename,
                      eval_flags | JS_EVAL_FLAG_COMPILE_ONLY);
        if (!JS_IsException(val)) {
            QJMS_SetModuleImportMeta(ctx, val, TRUE);
            val = JS_EvalFunction(ctx, val);
        }
    } else {
        val = JS_Eval(ctx, buf, buf_len, filename, eval_flags);
    }
    if (JS_IsException(val)) {
        QJU_PrintException(ctx, stderr);
        ret = -1;
    } else {
        ret = 0;
    }
    JS_FreeValue(ctx, val);
    return ret;
}

int QJMS_EvalFile(JSContext *ctx, const char *filename, int module)
{
    uint8_t *buf;
    int ret, eval_flags;
    size_t buf_len;

    buf = QJU_LoadFile(ctx, &buf_len, filename);
    if (!buf) {
        perror(filename);
        exit(1);
    }

    if (module < 0) {
        module = (has_suffix(filename, ".mjs") ||
                  JS_DetectModule((const char *)buf, buf_len));
    }
    if (module)
        eval_flags = JS_EVAL_TYPE_MODULE;
    else
        eval_flags = JS_EVAL_TYPE_GLOBAL;
    ret = QJMS_EvalBuf(ctx, buf, buf_len, filename, eval_flags);
    js_free(ctx, buf);
    return ret;
}


int QJMS_EvalBinary(JSContext *ctx, const uint8_t *buf, size_t buf_len,
                    int load_only)
{
    JSValue obj, val;
    obj = JS_ReadObject(ctx, buf, buf_len, JS_READ_OBJ_BYTECODE);
    if (JS_IsException(obj))
        goto exception;
    if (load_only) {
        if (JS_VALUE_GET_TAG(obj) == JS_TAG_MODULE) {
            QJMS_SetModuleImportMeta(ctx, obj, FALSE);
        }
    } else {
        if (JS_VALUE_GET_TAG(obj) == JS_TAG_MODULE) {
            if (JS_ResolveModule(ctx, obj) < 0) {
                JS_FreeValue(ctx, obj);
                goto exception;
            }
            QJMS_SetModuleImportMeta(ctx, obj, TRUE);
        }
        val = JS_EvalFunction(ctx, obj);
        if (JS_IsException(val)) {
        exception:
            QJU_PrintException(ctx, stderr);
            return -1;
        }
        JS_FreeValue(ctx, val);
    }

    return 0;
}
