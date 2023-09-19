#include <string.h>
#include <errno.h>

#include "quickjs-libcontext.h"
#include "quickjs-libc.h"
#include "quickjs-libbytecode.h"
#include "quickjs-libpointer.h"
#include "quickjs-modulesys.h"
#include "cutils.h"

static JSClassID js_context_class_id;

static void js_context_finalizer(JSRuntime *rt, JSValue val)
{
    JSContext *ctx = JS_GetOpaque(val, js_context_class_id);
    if (ctx) {
        JS_FreeContext(ctx);
    }
}

static JSClassDef js_context_class = {
    "Context",
    .finalizer = js_context_finalizer,
};

/** returns 0 on success, 1 on exception */
static int get_option_bool(JSContext *ctx, JSValueConst options,
                               const char *key, BOOL *pbool, BOOL default_val)
{
    JSValue prop_value;
    BOOL prop_bool;

    if (!JS_IsObject(options)) {
        *pbool = default_val;
        return 0;
    }

    prop_value = JS_GetPropertyStr(ctx, options, key);
    if (JS_IsException(prop_value)) {
        return 1;
    }

    if (JS_IsUndefined(prop_value)) {
        JS_FreeValue(ctx, prop_value);
        *pbool = default_val;
        return 0;
    }

    prop_bool = JS_ToBool(ctx, prop_value);
    JS_FreeValue(ctx, prop_value);

    if (prop_bool == -1) {
        return 1;
    }

    *pbool = prop_bool;
    return 0;
}

static JSValue js_context_ctor(JSContext *ctx, JSValueConst this_val,
                               int argc, JSValueConst *argv)
{
    JSRuntime *rt;
    JSValue ret, options, global;
    JSContext *target_ctx;
    BOOL date, eval, stringNormalize, regExp, json, proxy, mapSet, typedArrays,
        promise, bigint, bigfloat, bigdecimal, operators, useMath, stdHelpers,
        module_std, module_os, module_bytecode, module_context, module_pointer;

    options = argv[0];
    if (get_option_bool(ctx, options, "date", &date, TRUE)) {
        return JS_EXCEPTION;
    }
    if (get_option_bool(ctx, options, "eval", &eval, TRUE)) {
        return JS_EXCEPTION;
    }
    if (get_option_bool(ctx, options, "stringNormalize", &stringNormalize, TRUE)) {
        return JS_EXCEPTION;
    }
    if (get_option_bool(ctx, options, "regExp", &regExp, TRUE)) {
        return JS_EXCEPTION;
    }
    if (get_option_bool(ctx, options, "json", &json, TRUE)) {
        return JS_EXCEPTION;
    }
    if (get_option_bool(ctx, options, "proxy", &proxy, TRUE)) {
        return JS_EXCEPTION;
    }
    if (get_option_bool(ctx, options, "mapSet", &mapSet, TRUE)) {
        return JS_EXCEPTION;
    }
    if (get_option_bool(ctx, options, "typedArrays", &typedArrays, TRUE)) {
        return JS_EXCEPTION;
    }
    if (get_option_bool(ctx, options, "promise", &promise, TRUE)) {
        return JS_EXCEPTION;
    }
    if (get_option_bool(ctx, options, "bigint", &bigint, TRUE)) {
        return JS_EXCEPTION;
    }
    if (get_option_bool(ctx, options, "bigfloat", &bigfloat, TRUE)) {
        return JS_EXCEPTION;
    }
    if (get_option_bool(ctx, options, "bigdecimal", &bigdecimal, TRUE)) {
        return JS_EXCEPTION;
    }
    if (get_option_bool(ctx, options, "operators", &operators, TRUE)) {
        return JS_EXCEPTION;
    }
    if (get_option_bool(ctx, options, "useMath", &useMath, TRUE)) {
        return JS_EXCEPTION;
    }
    if (get_option_bool(ctx, options, "stdHelpers", &stdHelpers, TRUE)) {
        return JS_EXCEPTION;
    }

    {
        BOOL module_std_default = TRUE;
        BOOL module_os_default = TRUE;
        BOOL module_bytecode_default = TRUE;
        BOOL module_context_default = TRUE;
        BOOL module_pointer_default = TRUE;

        if (JS_IsObject(options)) {
            JSValue options_modules = JS_GetPropertyStr(ctx, options, "modules");
            if (JS_IsException(options_modules)) {
                return JS_EXCEPTION;
            }
            if (get_option_bool(ctx, options_modules, "quickjs:std", &module_std, module_std_default)) {
                JS_FreeValue(ctx, options_modules);
                return JS_EXCEPTION;
            }
            if (get_option_bool(ctx, options_modules, "quickjs:os", &module_os, module_os_default)) {
                JS_FreeValue(ctx, options_modules);
                return JS_EXCEPTION;
            }
            if (get_option_bool(ctx, options_modules, "quickjs:bytecode", &module_bytecode, module_bytecode_default)) {
                JS_FreeValue(ctx, options_modules);
                return JS_EXCEPTION;
            }
            if (get_option_bool(ctx, options_modules, "quickjs:context", &module_context, module_context_default)) {
                JS_FreeValue(ctx, options_modules);
                return JS_EXCEPTION;
            }
            if (get_option_bool(ctx, options_modules, "quickjs:pointer", &module_pointer, module_pointer_default)) {
                JS_FreeValue(ctx, options_modules);
                return JS_EXCEPTION;
            }

            JS_FreeValue(ctx, options_modules);
        } else {
            module_std = module_std_default;
            module_os = module_os_default;
            module_bytecode = module_bytecode_default;
            module_context = module_context_default;
            module_pointer = module_pointer_default;
        }
    }

    rt = JS_GetRuntime(ctx);
    target_ctx = JS_NewContextRaw(rt);

    // Nothing works without these, so they're always added
    JS_AddIntrinsicBaseObjects(target_ctx);

    if (date) {
        JS_AddIntrinsicDate(target_ctx);
    }
    if (eval) {
        JS_AddIntrinsicEval(target_ctx);
    }
    if (stringNormalize) {
        JS_AddIntrinsicStringNormalize(target_ctx);
    }
    if (regExp) {
        JS_AddIntrinsicRegExp(target_ctx);
    }
    if (json) {
        JS_AddIntrinsicJSON(target_ctx);
    }
    if (proxy) {
        JS_AddIntrinsicProxy(target_ctx);
    }
    if (mapSet) {
        JS_AddIntrinsicMapSet(target_ctx);
    }
    if (typedArrays) {
        JS_AddIntrinsicTypedArrays(target_ctx);
    }
    if (promise) {
        JS_AddIntrinsicPromise(target_ctx);
    }
#ifdef CONFIG_BIGNUM
    if (bigint) {
        JS_AddIntrinsicBigInt(target_ctx);
    }
    if (bigfloat) {
        JS_AddIntrinsicBigFloat(target_ctx);
    }
    if (bigdecimal) {
        JS_AddIntrinsicBigDecimal(target_ctx);
    }
    if (operators) {
        JS_AddIntrinsicOperators(target_ctx);
    }
    if (useMath) {
        JS_EnableBignumExt(target_ctx, TRUE);
    }
#endif

    if (module_std) {
        js_init_module_std(target_ctx, "quickjs:std");
    }
    if (module_os) {
        js_init_module_os(target_ctx, "quickjs:os");
    }
    if (module_bytecode) {
        js_init_module_bytecode(target_ctx, "quickjs:bytecode");
    }
    if (module_context) {
        js_init_module_context(target_ctx, "quickjs:context");
    }
    if (module_pointer) {
        js_init_module_pointer(target_ctx, "quickjs:pointer");
    }

    if (stdHelpers) {
        js_std_add_inspect(target_ctx);
        js_std_add_console(target_ctx);
        js_std_add_print(target_ctx);
        // we don't add scriptArgs
        QJMS_AddGlobals(target_ctx);
        js_std_add_timeout(target_ctx);
        js_std_add_lib(target_ctx);
    }

    ret = JS_NewObjectClass(ctx, js_context_class_id);
    JS_SetOpaque(ret, target_ctx);

    global = JS_GetGlobalObject(target_ctx);
    JS_SetPropertyStr(ctx, ret, "globalThis", global);

    return ret;
}

static JSValue js_context_eval(JSContext *ctx, JSValueConst this_val,
                               int argc, JSValueConst *argv)
{
    JSContext *target_ctx;
    JSValue ret, global;
    const char *code;

    target_ctx = JS_GetOpaque(this_val, js_context_class_id);
    if (!target_ctx) {
        return JS_ThrowTypeError(ctx, "'Context.prototype.eval' must be called on a Context instance");
    }

    code = JS_ToCString(ctx, argv[0]);
    if (!code) {
        return JS_EXCEPTION;
    }

    global = JS_GetGlobalObject(target_ctx);

    ret = JS_EvalThis_Privileged(target_ctx, global, code, strlen(code), "<eval>", JS_EVAL_TYPE_GLOBAL);

    // GetGlobalObject dups it
    JS_FreeValue(target_ctx, global);

    return ret;
}

static const JSCFunctionListEntry js_context_proto_funcs[] = {
    JS_CFUNC_DEF("eval", 1, js_context_eval ),
};

static int js_context_init(JSContext *ctx, JSModuleDef *m) {
    JSValue context, context_proto;

    JS_NewClassID(&js_context_class_id);
    JS_NewClass(JS_GetRuntime(ctx), js_context_class_id, &js_context_class);

    context_proto = JS_NewObject(ctx);
    JS_SetPropertyFunctionList(ctx, context_proto, js_context_proto_funcs, countof(js_context_proto_funcs));

    context = JS_NewCFunction2(ctx, js_context_ctor, "Context", 1,
                            JS_CFUNC_constructor, 0);
    JS_SetConstructor(ctx, context, context_proto);
    JS_SetClassProto(ctx, js_context_class_id, context_proto);

    JS_SetModuleExport(ctx, m, "Context", context);

    return 0;
}

JSModuleDef *js_init_module_context(JSContext *ctx, const char *module_name)
{
    JSModuleDef *m;
    m = JS_NewCModule(ctx, module_name, js_context_init, NULL);
    if (!m) {
        return NULL;
    }
    JS_AddModuleExport(ctx, m, "Context");
    return m;
}
