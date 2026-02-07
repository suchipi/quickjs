/*
 * QuickJS Timers Module
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
#include <stdio.h>
#include <string.h>

#if defined(__linux__) || defined(__APPLE__)
#include <time.h>
#else
#include <sys/time.h>
#endif

#include "quickjs-timers.h"
#include "quickjs-eventloop.h"
#include "cutils.h"

static JSClassID js_timer_class_id;

#if defined(__linux__) || defined(__APPLE__)
int64_t js_timers_get_time_ms(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint64_t)ts.tv_sec * 1000 + (ts.tv_nsec / 1000000);
}
#else
/* more portable, but does not work if the date is updated */
int64_t js_timers_get_time_ms(void)
{
    struct timeval tv;
    gettimeofday(&tv, NULL);
    return (int64_t)tv.tv_sec * 1000 + (tv.tv_usec / 1000);
}
#endif

JSClassID js_timers_get_class_id(void)
{
    return js_timer_class_id;
}

static void js_timer_finalizer(JSRuntime *rt, JSValue val)
{
    JSTimer *th = JS_GetOpaque(val, js_timer_class_id);
    if (th) {
        th->has_object = FALSE;
        if (!th->link.prev)
            js_timer_free(rt, th);
    }
}

static void js_timer_mark(JSRuntime *rt, JSValueConst val,
                          JS_MarkFunc *mark_func)
{
    JSTimer *th = JS_GetOpaque(val, js_timer_class_id);
    if (th) {
        JS_MarkValue(rt, th->func, mark_func);
    }
}

static JSValue js_timers_setTimeout(JSContext *ctx, JSValueConst this_val,
                                    int argc, JSValueConst *argv)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    int64_t delay;
    JSValueConst func;
    JSTimer *th;
    JSValue obj;

    func = argv[0];
    if (!JS_IsFunction(ctx, func))
        return JS_ThrowTypeError(ctx, "<internal>/quickjs-timers.c", __LINE__, "first argument to setTimeout was not a function");
    if (JS_ToInt64(ctx, &delay, argv[1]))
        return JS_EXCEPTION;
    obj = JS_NewObjectClass(ctx, js_timer_class_id);
    if (JS_IsException(obj))
        return obj;
    th = js_mallocz(ctx, sizeof(*th));
    if (!th) {
        JS_FreeValue(ctx, obj);
        return JS_EXCEPTION;
    }
    th->has_object = TRUE;
    th->timeout = js_timers_get_time_ms() + delay;
    th->interval = 0;
    th->func = JS_DupValue(ctx, func);
    list_add_tail(&th->link, &ts->timers);
    JS_SetOpaque(obj, th);
    return obj;
}

static JSValue js_timers_setInterval(JSContext *ctx, JSValueConst this_val,
                                     int argc, JSValueConst *argv)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    int64_t delay;
    JSValueConst func;
    JSTimer *th;
    JSValue obj;

    func = argv[0];
    if (!JS_IsFunction(ctx, func))
        return JS_ThrowTypeError(ctx, "<internal>/quickjs-timers.c", __LINE__, "first argument to setInterval was not a function");
    if (JS_ToInt64(ctx, &delay, argv[1]))
        return JS_EXCEPTION;
    obj = JS_NewObjectClass(ctx, js_timer_class_id);
    if (JS_IsException(obj))
        return obj;
    th = js_mallocz(ctx, sizeof(*th));
    if (!th) {
        JS_FreeValue(ctx, obj);
        return JS_EXCEPTION;
    }
    th->has_object = TRUE;
    th->timeout = js_timers_get_time_ms() + delay;
    th->interval = delay;
    th->func = JS_DupValue(ctx, func);
    list_add_tail(&th->link, &ts->timers);
    JS_SetOpaque(obj, th);
    return obj;
}

static JSValue js_timers_clearTimeout(JSContext *ctx, JSValueConst this_val,
                                      int argc, JSValueConst *argv)
{
    JSTimer *th = JS_GetOpaque(argv[0], js_timer_class_id);
    if (th == NULL) {
        return JS_UNDEFINED;
    }

    js_timer_unlink(JS_GetRuntime(ctx), th);
    return JS_UNDEFINED;
}

/* clearInterval is the same as clearTimeout */
static JSValue js_timers_clearInterval(JSContext *ctx, JSValueConst this_val,
                                       int argc, JSValueConst *argv)
{
    return js_timers_clearTimeout(ctx, this_val, argc, argv);
}

static JSClassDef js_timer_class = {
    "Timer",
    .finalizer = js_timer_finalizer,
    .gc_mark = js_timer_mark,
};

static const JSCFunctionListEntry js_timer_proto_funcs[] = {
    JS_PROP_STRING_DEF("[Symbol.toStringTag]", "Timer", JS_PROP_CONFIGURABLE),
};

static const JSCFunctionListEntry js_timers_funcs[] = {
    JS_CFUNC_DEF("setTimeout", 2, js_timers_setTimeout),
    JS_CFUNC_DEF("clearTimeout", 1, js_timers_clearTimeout),
    JS_CFUNC_DEF("setInterval", 2, js_timers_setInterval),
    JS_CFUNC_DEF("clearInterval", 1, js_timers_clearInterval),
};

/* Initialize Timer class. Safe to call multiple times. */
static void js_timers_init_class(JSContext *ctx)
{
    JSValue timer_proto;

    /* Only initialize once */
    if (js_timer_class_id != 0)
        return;

    JS_NewClassID(&js_timer_class_id);
    JS_NewClass(JS_GetRuntime(ctx), js_timer_class_id, &js_timer_class);
    timer_proto = JS_NewObject(ctx);
    JS_SetPropertyFunctionList(ctx, timer_proto, js_timer_proto_funcs,
                               countof(js_timer_proto_funcs));
    JS_SetClassProto(ctx, js_timer_class_id, timer_proto);
}

static int js_timers_init(JSContext *ctx, JSModuleDef *m)
{
    js_timers_init_class(ctx);

    return JS_SetModuleExportList(ctx, m, js_timers_funcs,
                                  countof(js_timers_funcs));
}

JSModuleDef *js_init_module_timers(JSContext *ctx, const char *module_name)
{
    JSModuleDef *m;
    m = JS_NewCModule(ctx, module_name, js_timers_init, NULL);
    if (!m)
        return NULL;
    JS_AddModuleExportList(ctx, m, js_timers_funcs, countof(js_timers_funcs));
    return m;
}

void js_timers_add_globals(JSContext *ctx)
{
    JSValue global_obj, setTimeout_val, clearTimeout_val, setInterval_val, clearInterval_val;
    JSSyntheticStackFrame *ssf;

    ssf = JS_PushSyntheticStackFrame(ctx, "js_timers_add_globals", "quickjs-timers.c", __LINE__);

    /* Ensure Timer class is initialized */
    js_timers_init_class(ctx);

    global_obj = JS_GetGlobalObject(ctx);

    setTimeout_val = JS_NewCFunction(ctx, js_timers_setTimeout, "setTimeout", 2);
    JS_SetPropertyStr(ctx, global_obj, "setTimeout", setTimeout_val);

    clearTimeout_val = JS_NewCFunction(ctx, js_timers_clearTimeout, "clearTimeout", 1);
    JS_SetPropertyStr(ctx, global_obj, "clearTimeout", clearTimeout_val);

    setInterval_val = JS_NewCFunction(ctx, js_timers_setInterval, "setInterval", 2);
    JS_SetPropertyStr(ctx, global_obj, "setInterval", setInterval_val);

    clearInterval_val = JS_NewCFunction(ctx, js_timers_clearInterval, "clearInterval", 1);
    JS_SetPropertyStr(ctx, global_obj, "clearInterval", clearInterval_val);

    JS_FreeValue(ctx, global_obj);
    JS_PopSyntheticStackFrame(ctx, ssf);
}
