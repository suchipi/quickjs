/*
 * QuickJS Command Line Module
 *
 * Copyright (c) 2017-2021 Fabrice Bellard
 * Copyright (c) 2017-2021 Charlie Gordon
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

#include <stdlib.h>
#include "cutils.h"
#include "quickjs-cmdline.h"
#include "quickjs-eventloop.h"

/* -------------------------------------------------------- */
/* Exit code functions                                       */
/* -------------------------------------------------------- */

static JSValue js_cmdline_exit(JSContext *ctx, JSValueConst this_val,
                               int argc, JSValueConst *argv)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    int exit_code;
    if (argc > 0 && !JS_IsUndefined(argv[0])) {
        if (JS_ToInt32(ctx, &exit_code, argv[0]))
            exit_code = -1;
        js_eventloop_set_exit_code(rt, exit_code);
    } else {
        /* Use the pre-set exit code */
        exit_code = js_eventloop_get_exit_code(rt);
    }
    exit(exit_code);
    return JS_UNDEFINED;
}

static JSValue js_cmdline_getExitCode(JSContext *ctx, JSValueConst this_val,
                                      int argc, JSValueConst *argv)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    return JS_NewInt32(ctx, js_eventloop_get_exit_code(rt));
}

static JSValue js_cmdline_setExitCode(JSContext *ctx, JSValueConst this_val,
                                      int argc, JSValueConst *argv)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    int exit_code;
    if (argc > 0 && JS_ToInt32(ctx, &exit_code, argv[0]) == 0) {
        js_eventloop_set_exit_code(rt, exit_code);
    }
    return JS_UNDEFINED;
}

/* -------------------------------------------------------- */
/* scriptArgs                                                */
/* -------------------------------------------------------- */

void js_cmdline_add_scriptArgs(JSContext *ctx, int argc, char **argv)
{
    JSValue global_obj, args;
    int i;

    global_obj = JS_GetGlobalObject(ctx);

    args = JS_NewArray(ctx);
    for (i = 0; i < argc; i++) {
        JS_SetPropertyUint32(ctx, args, i, JS_NewString(ctx, argv[i]));
    }
    JS_SetPropertyStr(ctx, global_obj, "scriptArgs", args);

    JS_FreeValue(ctx, global_obj);
}

/* scriptArgs getter for module export */
static JSValue js_cmdline_get_scriptArgs(JSContext *ctx, JSValueConst this_val,
                                         int argc, JSValueConst *argv)
{
    JSValue global_obj, args;
    global_obj = JS_GetGlobalObject(ctx);
    args = JS_GetPropertyStr(ctx, global_obj, "scriptArgs");
    JS_FreeValue(ctx, global_obj);
    return args;
}

/* -------------------------------------------------------- */
/* Module initialization                                     */
/* -------------------------------------------------------- */

static const JSCFunctionListEntry js_cmdline_funcs[] = {
    JS_CFUNC_DEF("getScriptArgs", 0, js_cmdline_get_scriptArgs),
    JS_CFUNC_DEF("exit", 1, js_cmdline_exit),
    JS_CFUNC_DEF("getExitCode", 0, js_cmdline_getExitCode),
    JS_CFUNC_DEF("setExitCode", 1, js_cmdline_setExitCode),
};

static int js_cmdline_init(JSContext *ctx, JSModuleDef *m)
{
    return JS_SetModuleExportList(ctx, m, js_cmdline_funcs,
                                  countof(js_cmdline_funcs));
}

JSModuleDef *js_init_module_cmdline(JSContext *ctx, const char *module_name)
{
    JSModuleDef *m;

    m = JS_NewCModule(ctx, module_name, js_cmdline_init, NULL);
    if (!m)
        return NULL;
    JS_AddModuleExportList(ctx, m, js_cmdline_funcs,
                           countof(js_cmdline_funcs));
    return m;
}
