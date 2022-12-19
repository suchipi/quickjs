#include <string.h>
#include <errno.h>

#include "quickjs-bytecodelib.h"
#include "quickjs-libc.h" // TODO: would be nice to not depend on libc
#include "cutils.h"

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

static JSValue js_bytecode_toByteCode(JSContext *ctx, JSValueConst this_val,
                                      int argc, JSValueConst *argv)
{
    JSValue obj;
    BOOL byte_swap = FALSE;

    if (argc < 1) {
        return JS_ThrowError(ctx, "toByteCode requires at least 1 argument");
    }
    obj = argv[0];

    if (argc == 2 && !JS_IsUndefined(argv[1]) && !JS_IsNull(argv[1])) {
        JSValue opts_obj;
        JSValue val;

        opts_obj = argv[1];
        val = JS_GetPropertyStr(ctx, opts_obj, "byteSwap");
        if (JS_IsException(val)) {
            return val;
        }

        if (JS_IsUndefined(val)) {
            byte_swap = FALSE;
        } else {
            byte_swap = JS_ToBool(ctx, val);
        }
        JS_FreeValue(ctx, val);

        // Could be -1 due to error from JS_ToBool
        if (byte_swap == -1) {
            return JS_EXCEPTION;
        };
    }

    return js_obj_to_bytecode_arraybuf(ctx, obj, byte_swap);
}

static JSValue js_bytecode_fromByteCode(JSContext *ctx, JSValueConst this_val,
                                        int argc, JSValueConst *argv)
{
    uint8_t *buf;
    size_t buf_len;
    int flags;
    JSValue obj;

    if (argc < 1) {
        return JS_ThrowError(ctx, "fromByteCode requires at least 1 argument");
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
    JSValue obj;
    JSValue ret;

    as_module = -1;
    byte_swap = 0;

    if (argc < 1) {
        return JS_ThrowError(ctx, "fromFile requires at least 1 argument");
    }

    if (argc == 2 && !JS_IsUndefined(argv[1]) && !JS_IsNull(argv[1])) {
        JSValue opts_obj;
        JSValue source_type;
        JSValue byte_swap_val;

        opts_obj = argv[1];
        source_type = JS_GetPropertyStr(ctx, opts_obj, "sourceType");
        if (JS_IsException(source_type)) {
            return JS_EXCEPTION;
        }

        if (JS_IsUndefined(source_type) || JS_IsNull(source_type)) {
            as_module = 0;
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
                JS_ThrowError(ctx, "invalid sourceType value: %s", str);
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
    }

    filename = JS_ToCString(ctx, argv[0]);
    if (!filename) {
        return JS_EXCEPTION;
    }

    buf = js_load_file(ctx, &buf_len, filename);
    if (!buf) {
        JS_ThrowError(ctx, "%s (errno = %d, filename = %s)", strerror(errno), errno, filename);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        JS_AddPropertyToException(ctx, "filename", JS_NewString(ctx, filename));

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

    obj = JS_Eval(ctx, (const char *)buf, buf_len, filename, eval_flags);
    if (JS_IsException(obj)) {
        return JS_EXCEPTION;
    }

    js_free(ctx, buf);

    ret = js_obj_to_bytecode_arraybuf(ctx, obj, byte_swap);
    JS_FreeValue(ctx, obj);
    return ret;
}

static const JSCFunctionListEntry js_bytecode_funcs[] = {
    JS_CFUNC_DEF("toByteCode", 2, js_bytecode_toByteCode ),
    JS_CFUNC_DEF("fromByteCode", 1, js_bytecode_fromByteCode ),
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
    m = JS_NewCModule(ctx, module_name, js_bytecode_init);
    if (!m) {
        return NULL;
    }
    JS_AddModuleExportList(ctx, m, js_bytecode_funcs, countof(js_bytecode_funcs));
    return m;
}
