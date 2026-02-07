#include "quickjs-print.h"

static JSValue js_print(JSContext *ctx, JSValueConst this_val,
                        int argc, JSValueConst *argv, int magic)
{
    int i;
    const char *str;
    size_t len;
    FILE *out;

    if (magic == 1) {
        out = stdout;
    } else if (magic == 2) {
        out = stderr;
    } else {
        return JS_ThrowInternalError(ctx, "<internal>/quickjs-print.c", __LINE__, "js_print called with incorrect 'magic' value. This is a bug in quickjs-print.");
    }

    for(i = 0; i < argc; i++) {
        if (i != 0) {
            putc(' ', out);
        }
        str = JS_ToCStringLen(ctx, &len, argv[i]);
        if (!str)
            return JS_EXCEPTION;
        fwrite(str, 1, len, out);
        JS_FreeCString(ctx, str);
    }
    putc('\n', out);
    return JS_UNDEFINED;
}

void js_print_add_print_global(JSContext *ctx)
{
    JSValue global_obj;
    JSSyntheticStackFrame *ssf;

    ssf = JS_PushSyntheticStackFrame(ctx, "js_print_add_print_global", "quickjs-print.c", __LINE__);

    global_obj = JS_GetGlobalObject(ctx);

    JS_SetPropertyStr(ctx, global_obj, "print",
                      JS_NewCFunctionMagic(ctx, js_print, "print", 1,
                                           JS_CFUNC_generic_magic, 1));

    JS_PopSyntheticStackFrame(ctx, ssf);
    JS_FreeValue(ctx, global_obj);
}

void js_print_add_console_global(JSContext *ctx)
{
    JSValue global_obj, console;
    JSSyntheticStackFrame *ssf;

    ssf = JS_PushSyntheticStackFrame(ctx, "js_print_add_console_global", "quickjs-print.c", __LINE__);

    global_obj = JS_GetGlobalObject(ctx);

    console = JS_NewObject(ctx);
    JS_SetPropertyStr(ctx, console, "log",
                      JS_NewCFunctionMagic(ctx, js_print, "log", 1,
                                           JS_CFUNC_generic_magic, 1));
    JS_SetPropertyStr(ctx, console, "info",
                      JS_NewCFunctionMagic(ctx, js_print, "info", 1,
                                           JS_CFUNC_generic_magic, 1));
    JS_SetPropertyStr(ctx, console, "warn",
                      JS_NewCFunctionMagic(ctx, js_print, "warn", 1,
                                           JS_CFUNC_generic_magic, 2));
    JS_SetPropertyStr(ctx, console, "error",
                      JS_NewCFunctionMagic(ctx, js_print, "error", 1,
                                           JS_CFUNC_generic_magic, 2));
    JS_SetPropertyStr(ctx, global_obj, "console", console);

    JS_FreeValue(ctx, global_obj);
    JS_PopSyntheticStackFrame(ctx, ssf);
}
