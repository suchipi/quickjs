#include <string.h>
#include <errno.h>

#include "quickjs-bytecode.h"
#include "quickjs-utils.h"
#include "quickjs-modulesys.h"
#include "cutils.h"

static JSValue js_call_bytecode_func(JSContext *ctx, JSValueConst this_val,
                                     int argc, JSValueConst *argv)
{
    JSValue result;
    JSValue obj = this_val;

    if (JS_VALUE_GET_TAG(obj) == JS_TAG_MODULE) {
        if (JS_ResolveModule(ctx, obj) < 0) {
            JS_FreeValue(ctx, obj);
            return JS_EXCEPTION;
        }
        QJMS_SetModuleImportMeta(ctx, obj);
    }
    result = JS_EvalFunction(ctx, obj);
    return result;
}

static JSValue js_obj_to_bytecode_arraybuf(JSContext *ctx, JSValueConst obj,
                                           BOOL byte_swap)
{
    uint8_t *out_buf;
    size_t out_buf_len;
    int flags;

    flags = JS_WRITE_OBJ_BYTECODE;
    if (byte_swap) {
        flags |= JS_WRITE_OBJ_BSWAP;
    }
    out_buf = JS_WriteObject(ctx, &out_buf_len, obj, flags);
    if (!out_buf) {
        return JS_EXCEPTION;
    }

    return JS_NewArrayBufferCopy(ctx, out_buf, out_buf_len);
}

static JSValue js_bytecode_fromValue(JSContext *ctx, JSValueConst this_val,
                                      int argc, JSValueConst *argv)
{
    JSValue obj;
    BOOL byte_swap = FALSE;

    if (argc < 1) {
        return JS_ThrowError(ctx, "<internal>/quickjs-bytecode.c", __LINE__, "fromValue requires at least 1 argument");
    }
    obj = argv[0];

    if (argc == 2 && !JS_IsUndefined(argv[1]) && !JS_IsNull(argv[1])) {
        JSValue opts_obj;
        JSValue byte_swap_val;

        opts_obj = argv[1];
        byte_swap_val = JS_GetPropertyStr(ctx, opts_obj, "byteSwap");
        if (JS_IsException(byte_swap_val)) {
            return byte_swap_val;
        }

        if (JS_IsUndefined(byte_swap_val)) {
            byte_swap = FALSE;
        } else {
            byte_swap = JS_ToBool(ctx, byte_swap_val);
        }
        JS_FreeValue(ctx, byte_swap_val);

        // Could be -1 due to error from JS_ToBool
        if (byte_swap == -1) {
            return JS_EXCEPTION;
        };
    }

    return js_obj_to_bytecode_arraybuf(ctx, obj, byte_swap);
}

static JSValue js_bytecode_toValue(JSContext *ctx, JSValueConst this_val,
                                        int argc, JSValueConst *argv)
{
    uint8_t *buf;
    size_t buf_len;
    int flags, tag;
    JSValue obj;

    if (argc < 1) {
        return JS_ThrowError(ctx, "<internal>/quickjs-bytecode.c", __LINE__, "toValue requires at least 1 argument");
    }

    buf = JS_GetArrayBuffer(ctx, &buf_len, argv[0]);
    if (buf == NULL) {
        return JS_EXCEPTION;
    }

    flags = JS_READ_OBJ_BYTECODE | JS_READ_OBJ_REFERENCE | JS_READ_OBJ_SAB;
    obj = JS_ReadObject(ctx, buf, buf_len, flags);
    if (JS_IsException(obj)) {
        return JS_EXCEPTION;
    }

    tag = JS_VALUE_GET_TAG(obj);
    if (tag == JS_TAG_FUNCTION_BYTECODE || tag == JS_TAG_MODULE) {
        JSValue global;
        JSValue Function;
        JSValue Function_proto;
        JSValue Function_proto_bind;
        JSValue callfunc;
        JSValue bind_argv[1];
        JSValue bound_callfunc;

        global = JS_GetGlobalObject(ctx);
        if (JS_IsException(global)) {
            JS_FreeValue(ctx, obj);
            return JS_EXCEPTION;
        }

        Function = JS_GetPropertyStr(ctx, global, "Function");
        if (JS_IsException(Function)) {
            JS_FreeValue(ctx, global);
            JS_FreeValue(ctx, obj);
            return JS_EXCEPTION;
        }

        Function_proto = JS_GetPropertyStr(ctx, Function, "prototype");
        if (JS_IsException(Function_proto)) {
            JS_FreeValue(ctx, Function);
            JS_FreeValue(ctx, global);
            JS_FreeValue(ctx, obj);
            return JS_EXCEPTION;
        }

        Function_proto_bind = JS_GetPropertyStr(ctx, Function_proto, "bind");
        if (JS_IsException(Function_proto_bind)) {
            JS_FreeValue(ctx, Function_proto);
            JS_FreeValue(ctx, Function);
            JS_FreeValue(ctx, global);
            JS_FreeValue(ctx, obj);
            return JS_EXCEPTION;
        }

        callfunc = JS_NewCFunction(ctx, js_call_bytecode_func, "bytecode", 0);

        bind_argv[0] = obj;
        bound_callfunc = JS_Call(ctx, Function_proto_bind, callfunc, 1, bind_argv);
        if (JS_IsException(bound_callfunc)) {
            JS_FreeValue(ctx, callfunc);
            JS_FreeValue(ctx, Function_proto_bind);
            JS_FreeValue(ctx, Function_proto);
            JS_FreeValue(ctx, Function);
            JS_FreeValue(ctx, global);
            JS_FreeValue(ctx, obj);
            return JS_EXCEPTION;
        }

        obj = bound_callfunc;
        JS_FreeValue(ctx, callfunc);
        JS_FreeValue(ctx, Function_proto_bind);
        JS_FreeValue(ctx, Function_proto);
        JS_FreeValue(ctx, Function);
        JS_FreeValue(ctx, global);
    }

    return obj;
}

static JSValue js_bytecode_fromFile(JSContext *ctx, JSValueConst this_val,
                                    int argc, JSValueConst *argv)
{
    const char *filename;
    uint8_t *buf;
    size_t buf_len;
    int eval_flags;
    int as_module;
    int byte_swap;
    const char *encoded_filename;
    JSValue obj;
    JSValue ret;
    BOOL should_free_encoded_filename;

    as_module = -1;
    byte_swap = 0;
    encoded_filename = NULL;
    should_free_encoded_filename = FALSE;

    if (argc < 1) {
        return JS_ThrowError(ctx, "<internal>/quickjs-bytecode.c", __LINE__, "fromFile requires at least 1 argument");
    }

    if (argc == 2 && !JS_IsUndefined(argv[1]) && !JS_IsNull(argv[1])) {
        JSValue opts_obj;
        JSValue source_type;
        JSValue byte_swap_val;
        JSValue encoded_filename_val;

        opts_obj = argv[1];
        source_type = JS_GetPropertyStr(ctx, opts_obj, "sourceType");
        if (JS_IsException(source_type)) {
            return JS_EXCEPTION;
        }

        if (JS_IsUndefined(source_type) || JS_IsNull(source_type)) {
            as_module = -1;
        } else {
            const char *str = JS_ToCString(ctx, source_type);
            if (str == NULL) {
                JS_FreeValue(ctx, source_type);
                return JS_EXCEPTION;
            }

            if (strcmp(str, "module") == 0) {
                as_module = 1;
            } else if (strcmp(str, "script") == 0) {
                as_module = 0;
            } else {
                JS_ThrowError(ctx, "<internal>/quickjs-bytecode.c", __LINE__, "invalid sourceType value: %s", str);
                JS_FreeCString(ctx, str);
                return JS_EXCEPTION;
            }
            JS_FreeCString(ctx, str);
        }
        JS_FreeValue(ctx, source_type);

        byte_swap_val = JS_GetPropertyStr(ctx, opts_obj, "byteSwap");
        if (JS_IsException(byte_swap_val)) {
            return JS_EXCEPTION;
        }
        byte_swap = JS_ToBool(ctx, byte_swap_val);
        if (byte_swap == -1) {
            JS_FreeValue(ctx, byte_swap_val);
            return JS_EXCEPTION;
        }

        encoded_filename_val = JS_GetPropertyStr(ctx, opts_obj, "encodedFileName");
        if (JS_IsException(encoded_filename_val)) {
            return JS_EXCEPTION;
        }
        if (JS_IsString(encoded_filename_val)) {
            encoded_filename = JS_ToCString(ctx, encoded_filename_val);
            if (encoded_filename == NULL) {
                return JS_EXCEPTION;
            }
            should_free_encoded_filename = TRUE;
        } else if (!JS_IsUndefined(encoded_filename_val) && !JS_IsNull(encoded_filename_val)) {
            return JS_ThrowError(ctx, "<internal>/quickjs-bytecode.c", __LINE__, "when present, 'encodedFileName' option must be a string");
        }
    }

    filename = JS_ToCString(ctx, argv[0]);
    if (!filename) {
        if (should_free_encoded_filename) {
            JS_FreeCString(ctx, encoded_filename);
        }
        return JS_EXCEPTION;
    }

    if (encoded_filename == NULL) {
        encoded_filename = filename;
    }

    buf = QJU_ReadFile(ctx, &buf_len, filename);
    if (!buf) {
        JS_ThrowError(ctx, "<internal>/quickjs-bytecode.c", __LINE__, "%s (errno = %d, filename = %s)", strerror(errno), errno, filename);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        JS_AddPropertyToException(ctx, "filename", JS_NewString(ctx, filename));

        if (should_free_encoded_filename) {
            JS_FreeCString(ctx, encoded_filename);
        }
        JS_FreeCString(ctx, filename);

        return JS_EXCEPTION;
    }

    eval_flags = JS_EVAL_FLAG_COMPILE_ONLY;
    if (as_module == -1) {
        as_module = (has_suffix(filename, ".mjs") ||
                  JS_DetectModule((const char *)buf, buf_len));
    }
    if (as_module) {
        eval_flags |= JS_EVAL_TYPE_MODULE;
    } else {
        eval_flags |= JS_EVAL_TYPE_GLOBAL;
    }

    obj = JS_Eval(ctx, (const char *)buf, buf_len, encoded_filename, eval_flags);
    if (should_free_encoded_filename) {
        JS_FreeCString(ctx, encoded_filename);
    }
    js_free(ctx, buf);
    if (JS_IsException(obj)) {
        return JS_EXCEPTION;
    }

    ret = js_obj_to_bytecode_arraybuf(ctx, obj, byte_swap);
    JS_FreeValue(ctx, obj);
    return ret;
}

static const JSCFunctionListEntry js_bytecode_funcs[] = {
    JS_CFUNC_DEF("fromValue", 2, js_bytecode_fromValue ),
    JS_CFUNC_DEF("toValue", 1, js_bytecode_toValue ),
    JS_CFUNC_DEF("fromFile", 1, js_bytecode_fromFile ),
};

static int js_bytecode_init(JSContext *ctx, JSModuleDef *m)
{
    return JS_SetModuleExportList(ctx, m, js_bytecode_funcs,
                                  countof(js_bytecode_funcs));
}

JSModuleDef *js_init_module_bytecode(JSContext *ctx, const char *module_name)
{
    JSModuleDef *m;
    m = JS_NewCModule(ctx, module_name, js_bytecode_init, NULL);
    if (!m) {
        return NULL;
    }
    JS_AddModuleExportList(ctx, m, js_bytecode_funcs, countof(js_bytecode_funcs));
    return m;
}
