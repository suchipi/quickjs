/*
 * QuickJS Fetch Module - implements the core WHATWG Fetch API.
 *
 * Exports: fetch(), Headers, Response
 * Available as "quickjs:fetch" module and as globals.
 *
 * Uses a background thread for async networking (non-blocking event loop).
 */

#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <errno.h>

#ifndef SKIP_WORKER
#include <pthread.h>
#include <unistd.h>
#endif

#ifdef _WIN32
#include <io.h>
#include <fcntl.h>
#endif

#include "quickjs-fetch.h"
#include "quickjs-eventloop.h"
#include "httpclient.h"
#include "cutils.h"
#include "list.h"

#ifndef CONFIG_FETCH
#define CONFIG_FETCH 1
#endif

#if !CONFIG_FETCH

/* Stub when fetch is disabled at compile time */
JSModuleDef *js_init_module_fetch(JSContext *ctx, const char *module_name)
{
    JSModuleDef *m = JS_NewCModule(ctx, module_name, NULL, NULL);
    return m;
}

void js_fetch_add_globals(JSContext *ctx) {}

#else /* CONFIG_FETCH */

/* =========================================================================
 * Headers class
 * ========================================================================= */

typedef struct {
    char **names;
    char **values;
    int count;
    int cap;
} HeadersData;

static JSClassID js_headers_class_id;

static void js_headers_finalizer(JSRuntime *rt, JSValue val) {
    HeadersData *hd = JS_GetOpaque(val, js_headers_class_id);
    if (hd) {
        for (int i = 0; i < hd->count; i++) {
            js_free_rt(rt, hd->names[i]);
            js_free_rt(rt, hd->values[i]);
        }
        js_free_rt(rt, hd->names);
        js_free_rt(rt, hd->values);
        js_free_rt(rt, hd);
    }
}

static JSClassDef js_headers_class = {
    "Headers",
    .finalizer = js_headers_finalizer,
};

static HeadersData *headers_alloc(JSContext *ctx) {
    HeadersData *hd = js_mallocz(ctx, sizeof(HeadersData));
    return hd;
}

/* Lowercase a string in-place */
static void str_tolower(char *s) {
    for (; *s; s++) {
        if (*s >= 'A' && *s <= 'Z') *s += 32;
    }
}

static int headers_append(JSContext *ctx, HeadersData *hd,
                          const char *name, size_t name_len,
                          const char *value, size_t value_len)
{
    if (hd->count >= hd->cap) {
        int new_cap = (hd->cap == 0) ? 8 : hd->cap * 2;
        char **nn = js_realloc(ctx, hd->names, new_cap * sizeof(char *));
        char **nv = js_realloc(ctx, hd->values, new_cap * sizeof(char *));
        if (!nn || !nv) return -1;
        hd->names = nn;
        hd->values = nv;
        hd->cap = new_cap;
    }
    char *n = js_malloc(ctx, name_len + 1);
    char *v = js_malloc(ctx, value_len + 1);
    if (!n || !v) {
        js_free(ctx, n);
        js_free(ctx, v);
        return -1;
    }
    memcpy(n, name, name_len);
    n[name_len] = '\0';
    str_tolower(n);
    memcpy(v, value, value_len);
    v[value_len] = '\0';
    hd->names[hd->count] = n;
    hd->values[hd->count] = v;
    hd->count++;
    return 0;
}

static int headers_find(HeadersData *hd, const char *name) {
    for (int i = 0; i < hd->count; i++) {
        if (strcmp(hd->names[i], name) == 0)
            return i;
    }
    return -1;
}

static JSValue js_headers_ctor(JSContext *ctx, JSValueConst new_target,
                               int argc, JSValueConst *argv)
{
    JSValue obj = JS_NewObjectClass(ctx, js_headers_class_id);
    if (JS_IsException(obj))
        return obj;

    HeadersData *hd = headers_alloc(ctx);
    if (!hd) {
        JS_FreeValue(ctx, obj);
        return JS_EXCEPTION;
    }
    JS_SetOpaque(obj, hd);

    /* Optional init argument */
    if (argc > 0 && !JS_IsUndefined(argv[0]) && !JS_IsNull(argv[0])) {
        if (JS_IsArray(ctx, argv[0])) {
            /* Array of [name, value] pairs */
            JSValue len_val = JS_GetPropertyStr(ctx, argv[0], "length");
            int64_t len;
            JS_ToInt64(ctx, &len, len_val);
            JS_FreeValue(ctx, len_val);
            for (int64_t i = 0; i < len; i++) {
                JSValue pair = JS_GetPropertyUint32(ctx, argv[0], i);
                JSValue n = JS_GetPropertyUint32(ctx, pair, 0);
                JSValue v = JS_GetPropertyUint32(ctx, pair, 1);
                const char *ns = JS_ToCString(ctx, n);
                const char *vs = JS_ToCString(ctx, v);
                if (ns && vs)
                    headers_append(ctx, hd, ns, strlen(ns), vs, strlen(vs));
                JS_FreeCString(ctx, ns);
                JS_FreeCString(ctx, vs);
                JS_FreeValue(ctx, n);
                JS_FreeValue(ctx, v);
                JS_FreeValue(ctx, pair);
            }
        } else if (JS_GetOpaque(argv[0], js_headers_class_id)) {
            /* Another Headers instance — copy entries */
            HeadersData *src = JS_GetOpaque(argv[0], js_headers_class_id);
            for (int i = 0; i < src->count; i++) {
                headers_append(ctx, hd, src->names[i], strlen(src->names[i]),
                              src->values[i], strlen(src->values[i]));
            }
        } else {
            /* Object — enumerate own properties */
            JSPropertyEnum *props;
            uint32_t prop_count;
            if (JS_GetOwnPropertyNames(ctx, &props, &prop_count, argv[0],
                                       JS_GPN_STRING_MASK | JS_GPN_ENUM_ONLY) == 0) {
                for (uint32_t i = 0; i < prop_count; i++) {
                    const char *key = JS_AtomToCString(ctx, props[i].atom);
                    JSValue val = JS_GetProperty(ctx, argv[0], props[i].atom);
                    const char *vs = JS_ToCString(ctx, val);
                    if (key && vs)
                        headers_append(ctx, hd, key, strlen(key), vs, strlen(vs));
                    JS_FreeCString(ctx, key);
                    JS_FreeCString(ctx, vs);
                    JS_FreeValue(ctx, val);
                }
                for (uint32_t j = 0; j < prop_count; j++)
                    JS_FreeAtom(ctx, props[j].atom);
                js_free(ctx, props);
            }
        }
    }

    return obj;
}

static JSValue js_headers_get(JSContext *ctx, JSValueConst this_val,
                              int argc, JSValueConst *argv) {
    HeadersData *hd = JS_GetOpaque2(ctx, this_val, js_headers_class_id);
    if (!hd) return JS_EXCEPTION;
    const char *name = JS_ToCString(ctx, argv[0]);
    if (!name) return JS_EXCEPTION;
    char *lower = js_strdup(ctx, name);
    JS_FreeCString(ctx, name);
    if (!lower) return JS_EXCEPTION;
    str_tolower(lower);
    int idx = headers_find(hd, lower);
    js_free(ctx, lower);
    if (idx < 0)
        return JS_NULL;
    return JS_NewString(ctx, hd->values[idx]);
}

static JSValue js_headers_set(JSContext *ctx, JSValueConst this_val,
                              int argc, JSValueConst *argv) {
    HeadersData *hd = JS_GetOpaque2(ctx, this_val, js_headers_class_id);
    if (!hd) return JS_EXCEPTION;
    const char *name = JS_ToCString(ctx, argv[0]);
    const char *value = JS_ToCString(ctx, argv[1]);
    if (!name || !value) {
        JS_FreeCString(ctx, name);
        JS_FreeCString(ctx, value);
        return JS_EXCEPTION;
    }
    char *lower = js_strdup(ctx, name);
    JS_FreeCString(ctx, name);
    if (!lower) { JS_FreeCString(ctx, value); return JS_EXCEPTION; }
    str_tolower(lower);

    int idx = headers_find(hd, lower);
    if (idx >= 0) {
        char *new_val = js_strdup(ctx, value);
        if (new_val) {
            js_free(ctx, hd->values[idx]);
            hd->values[idx] = new_val;
        }
        js_free(ctx, lower);
    } else {
        headers_append(ctx, hd, lower, strlen(lower), value, strlen(value));
        js_free(ctx, lower);
    }
    JS_FreeCString(ctx, value);
    return JS_UNDEFINED;
}

static JSValue js_headers_has(JSContext *ctx, JSValueConst this_val,
                              int argc, JSValueConst *argv) {
    HeadersData *hd = JS_GetOpaque2(ctx, this_val, js_headers_class_id);
    if (!hd) return JS_EXCEPTION;
    const char *name = JS_ToCString(ctx, argv[0]);
    if (!name) return JS_EXCEPTION;
    char *lower = js_strdup(ctx, name);
    JS_FreeCString(ctx, name);
    if (!lower) return JS_EXCEPTION;
    str_tolower(lower);
    int found = headers_find(hd, lower) >= 0;
    js_free(ctx, lower);
    return JS_NewBool(ctx, found);
}

static JSValue js_headers_delete(JSContext *ctx, JSValueConst this_val,
                                 int argc, JSValueConst *argv) {
    HeadersData *hd = JS_GetOpaque2(ctx, this_val, js_headers_class_id);
    if (!hd) return JS_EXCEPTION;
    const char *name = JS_ToCString(ctx, argv[0]);
    if (!name) return JS_EXCEPTION;
    char *lower = js_strdup(ctx, name);
    JS_FreeCString(ctx, name);
    if (!lower) return JS_EXCEPTION;
    str_tolower(lower);
    int idx = headers_find(hd, lower);
    js_free(ctx, lower);
    if (idx >= 0) {
        js_free(ctx, hd->names[idx]);
        js_free(ctx, hd->values[idx]);
        /* Shift remaining entries */
        for (int i = idx; i < hd->count - 1; i++) {
            hd->names[i] = hd->names[i + 1];
            hd->values[i] = hd->values[i + 1];
        }
        hd->count--;
    }
    return JS_UNDEFINED;
}

static JSValue js_headers_append(JSContext *ctx, JSValueConst this_val,
                                 int argc, JSValueConst *argv) {
    HeadersData *hd = JS_GetOpaque2(ctx, this_val, js_headers_class_id);
    if (!hd) return JS_EXCEPTION;
    const char *name = JS_ToCString(ctx, argv[0]);
    const char *value = JS_ToCString(ctx, argv[1]);
    if (!name || !value) {
        JS_FreeCString(ctx, name);
        JS_FreeCString(ctx, value);
        return JS_EXCEPTION;
    }
    /* Per spec, append combines with comma for existing names */
    char *lower = js_strdup(ctx, name);
    JS_FreeCString(ctx, name);
    if (!lower) { JS_FreeCString(ctx, value); return JS_EXCEPTION; }
    str_tolower(lower);

    int idx = headers_find(hd, lower);
    if (idx >= 0) {
        size_t old_len = strlen(hd->values[idx]);
        size_t val_len = strlen(value);
        char *combined = js_malloc(ctx, old_len + 2 + val_len + 1);
        if (combined) {
            memcpy(combined, hd->values[idx], old_len);
            combined[old_len] = ',';
            combined[old_len + 1] = ' ';
            memcpy(combined + old_len + 2, value, val_len);
            combined[old_len + 2 + val_len] = '\0';
            js_free(ctx, hd->values[idx]);
            hd->values[idx] = combined;
        }
        js_free(ctx, lower);
    } else {
        headers_append(ctx, hd, lower, strlen(lower), value, strlen(value));
        js_free(ctx, lower);
    }
    JS_FreeCString(ctx, value);
    return JS_UNDEFINED;
}

static JSValue js_headers_forEach(JSContext *ctx, JSValueConst this_val,
                                  int argc, JSValueConst *argv) {
    HeadersData *hd = JS_GetOpaque2(ctx, this_val, js_headers_class_id);
    if (!hd) return JS_EXCEPTION;
    if (!JS_IsFunction(ctx, argv[0]))
        return JS_ThrowTypeError(ctx, "<internal>/quickjs-fetch.c", __LINE__,
                                 "callback is not a function");
    for (int i = 0; i < hd->count; i++) {
        JSValue args[3];
        args[0] = JS_NewString(ctx, hd->values[i]);
        args[1] = JS_NewString(ctx, hd->names[i]);
        args[2] = JS_DupValue(ctx, this_val);
        JSValue ret = JS_Call(ctx, argv[0], JS_UNDEFINED, 3, args);
        JS_FreeValue(ctx, args[0]);
        JS_FreeValue(ctx, args[1]);
        JS_FreeValue(ctx, args[2]);
        if (JS_IsException(ret))
            return JS_EXCEPTION;
        JS_FreeValue(ctx, ret);
    }
    return JS_UNDEFINED;
}

static JSValue js_headers_entries(JSContext *ctx, JSValueConst this_val,
                                  int argc, JSValueConst *argv) {
    HeadersData *hd = JS_GetOpaque2(ctx, this_val, js_headers_class_id);
    if (!hd) return JS_EXCEPTION;
    JSValue arr = JS_NewArray(ctx);
    for (int i = 0; i < hd->count; i++) {
        JSValue pair = JS_NewArray(ctx);
        JS_SetPropertyUint32(ctx, pair, 0, JS_NewString(ctx, hd->names[i]));
        JS_SetPropertyUint32(ctx, pair, 1, JS_NewString(ctx, hd->values[i]));
        JS_SetPropertyUint32(ctx, arr, i, pair);
    }
    return arr;
}

static const JSCFunctionListEntry js_headers_proto_funcs[] = {
    JS_CFUNC_DEF("get", 1, js_headers_get),
    JS_CFUNC_DEF("set", 2, js_headers_set),
    JS_CFUNC_DEF("has", 1, js_headers_has),
    JS_CFUNC_DEF("delete", 1, js_headers_delete),
    JS_CFUNC_DEF("append", 2, js_headers_append),
    JS_CFUNC_DEF("forEach", 1, js_headers_forEach),
    JS_CFUNC_DEF("entries", 0, js_headers_entries),
};

/* =========================================================================
 * Response class
 * ========================================================================= */

typedef struct {
    QJS_HTTPResponse *http_resp;  /* owned */
    char *request_url;            /* original request URL, for redirected check */
    JSValue cached_headers;       /* JS Headers object, lazily created */
} ResponseData;

static JSClassID js_response_class_id;

static void js_response_finalizer(JSRuntime *rt, JSValue val) {
    ResponseData *rd = JS_GetOpaque(val, js_response_class_id);
    if (rd) {
        qjs_http_response_free(rd->http_resp);
        free(rd->request_url);
        /* cached_headers is freed via GC mark, but if it was set we need to free it */
        JS_FreeValueRT(rt, rd->cached_headers);
        js_free_rt(rt, rd);
    }
}

static void js_response_mark(JSRuntime *rt, JSValueConst val,
                              JS_MarkFunc *mark_func) {
    ResponseData *rd = JS_GetOpaque(val, js_response_class_id);
    if (rd) {
        JS_MarkValue(rt, rd->cached_headers, mark_func);
    }
}

static JSClassDef js_response_class = {
    "Response",
    .finalizer = js_response_finalizer,
    .gc_mark = js_response_mark,
};

static JSValue js_response_get_ok(JSContext *ctx, JSValueConst this_val) {
    ResponseData *rd = JS_GetOpaque2(ctx, this_val, js_response_class_id);
    if (!rd) return JS_EXCEPTION;
    return JS_NewBool(ctx, rd->http_resp->status_code >= 200 &&
                           rd->http_resp->status_code < 300);
}

static JSValue js_response_get_status(JSContext *ctx, JSValueConst this_val) {
    ResponseData *rd = JS_GetOpaque2(ctx, this_val, js_response_class_id);
    if (!rd) return JS_EXCEPTION;
    return JS_NewInt32(ctx, rd->http_resp->status_code);
}

static JSValue js_response_get_statusText(JSContext *ctx, JSValueConst this_val) {
    ResponseData *rd = JS_GetOpaque2(ctx, this_val, js_response_class_id);
    if (!rd) return JS_EXCEPTION;
    return JS_NewString(ctx, rd->http_resp->status_text ? rd->http_resp->status_text : "");
}

static JSValue js_response_get_url(JSContext *ctx, JSValueConst this_val) {
    ResponseData *rd = JS_GetOpaque2(ctx, this_val, js_response_class_id);
    if (!rd) return JS_EXCEPTION;
    return JS_NewString(ctx, rd->http_resp->final_url ? rd->http_resp->final_url : "");
}

static JSValue js_response_get_redirected(JSContext *ctx, JSValueConst this_val) {
    ResponseData *rd = JS_GetOpaque2(ctx, this_val, js_response_class_id);
    if (!rd) return JS_EXCEPTION;
    int redirected = 0;
    if (rd->request_url && rd->http_resp->final_url) {
        redirected = strcmp(rd->request_url, rd->http_resp->final_url) != 0;
    }
    return JS_NewBool(ctx, redirected);
}

static JSValue js_response_get_type(JSContext *ctx, JSValueConst this_val) {
    return JS_NewString(ctx, "basic");
}

static JSValue js_response_get_headers(JSContext *ctx, JSValueConst this_val) {
    ResponseData *rd = JS_GetOpaque2(ctx, this_val, js_response_class_id);
    if (!rd) return JS_EXCEPTION;

    if (!JS_IsUndefined(rd->cached_headers))
        return JS_DupValue(ctx, rd->cached_headers);

    /* Create Headers object from response headers */
    JSValue headers_obj = JS_NewObjectClass(ctx, js_headers_class_id);
    if (JS_IsException(headers_obj))
        return headers_obj;

    HeadersData *hd = headers_alloc(ctx);
    if (!hd) {
        JS_FreeValue(ctx, headers_obj);
        return JS_EXCEPTION;
    }
    JS_SetOpaque(headers_obj, hd);

    QJS_HTTPResponse *hr = rd->http_resp;
    for (int i = 0; i < hr->header_count; i++) {
        headers_append(ctx, hd, hr->header_names[i], strlen(hr->header_names[i]),
                      hr->header_values[i], strlen(hr->header_values[i]));
    }

    rd->cached_headers = JS_DupValue(ctx, headers_obj);
    return headers_obj;
}

/* Helper: create a resolved promise with a value */
static JSValue js_resolved_promise(JSContext *ctx, JSValue val) {
    JSValue resolving_funcs[2];
    JSValue promise = JS_NewPromiseCapability(ctx, resolving_funcs);
    if (JS_IsException(promise)) {
        JS_FreeValue(ctx, val);
        return JS_EXCEPTION;
    }
    JSValue ret = JS_Call(ctx, resolving_funcs[0], JS_UNDEFINED, 1, &val);
    JS_FreeValue(ctx, ret);
    JS_FreeValue(ctx, val);
    JS_FreeValue(ctx, resolving_funcs[0]);
    JS_FreeValue(ctx, resolving_funcs[1]);
    return promise;
}

/* Helper: create a rejected promise with an error */
static JSValue js_rejected_promise(JSContext *ctx, JSValue err) {
    JSValue resolving_funcs[2];
    JSValue promise = JS_NewPromiseCapability(ctx, resolving_funcs);
    if (JS_IsException(promise)) {
        JS_FreeValue(ctx, err);
        return JS_EXCEPTION;
    }
    JSValue ret = JS_Call(ctx, resolving_funcs[1], JS_UNDEFINED, 1, &err);
    JS_FreeValue(ctx, ret);
    JS_FreeValue(ctx, err);
    JS_FreeValue(ctx, resolving_funcs[0]);
    JS_FreeValue(ctx, resolving_funcs[1]);
    return promise;
}

static JSValue js_response_text(JSContext *ctx, JSValueConst this_val,
                                int argc, JSValueConst *argv) {
    ResponseData *rd = JS_GetOpaque2(ctx, this_val, js_response_class_id);
    if (!rd) return JS_EXCEPTION;
    JSValue str = JS_NewStringLen(ctx, (const char *)rd->http_resp->body,
                                  rd->http_resp->body_len);
    if (JS_IsException(str))
        return js_rejected_promise(ctx, JS_GetException(ctx));
    return js_resolved_promise(ctx, str);
}

static JSValue js_response_json(JSContext *ctx, JSValueConst this_val,
                                int argc, JSValueConst *argv) {
    ResponseData *rd = JS_GetOpaque2(ctx, this_val, js_response_class_id);
    if (!rd) return JS_EXCEPTION;
    JSValue str = JS_NewStringLen(ctx, (const char *)rd->http_resp->body,
                                  rd->http_resp->body_len);
    if (JS_IsException(str))
        return js_rejected_promise(ctx, JS_GetException(ctx));
    JSValue parsed = JS_ParseJSON(ctx, (const char *)rd->http_resp->body,
                                   rd->http_resp->body_len, "<fetch>");
    JS_FreeValue(ctx, str);
    if (JS_IsException(parsed))
        return js_rejected_promise(ctx, JS_GetException(ctx));
    return js_resolved_promise(ctx, parsed);
}

static JSValue js_response_arrayBuffer(JSContext *ctx, JSValueConst this_val,
                                       int argc, JSValueConst *argv) {
    ResponseData *rd = JS_GetOpaque2(ctx, this_val, js_response_class_id);
    if (!rd) return JS_EXCEPTION;
    JSValue ab = JS_NewArrayBufferCopy(ctx, rd->http_resp->body,
                                        rd->http_resp->body_len);
    if (JS_IsException(ab))
        return js_rejected_promise(ctx, JS_GetException(ctx));
    return js_resolved_promise(ctx, ab);
}

static const JSCFunctionListEntry js_response_proto_funcs[] = {
    JS_CGETSET_DEF("ok", js_response_get_ok, NULL),
    JS_CGETSET_DEF("status", js_response_get_status, NULL),
    JS_CGETSET_DEF("statusText", js_response_get_statusText, NULL),
    JS_CGETSET_DEF("url", js_response_get_url, NULL),
    JS_CGETSET_DEF("redirected", js_response_get_redirected, NULL),
    JS_CGETSET_DEF("type", js_response_get_type, NULL),
    JS_CGETSET_DEF("headers", js_response_get_headers, NULL),
    JS_CFUNC_DEF("text", 0, js_response_text),
    JS_CFUNC_DEF("json", 0, js_response_json),
    JS_CFUNC_DEF("arrayBuffer", 0, js_response_arrayBuffer),
};

/* =========================================================================
 * fetch() function - async via background thread
 * ========================================================================= */

/* Context for an in-flight fetch request */
typedef struct {
    /* Request parameters (owned, freed after thread completes) */
    char *method;
    char *url;
    char **header_names;
    char **header_values;
    int header_count;
    uint8_t *body;
    size_t body_len;
    int max_redirects;

    /* Result (set by worker thread) */
    QJS_HTTPResponse *response;
    char *err_msg;

    /* JS context for resolving the promise (main thread only) */
    JSContext *ctx;
    JSValue resolving_funcs[2]; /* [resolve, reject] — DupValue'd */

    /* Pipe for signaling completion */
    int pipe_read;
    int pipe_write;

#ifndef SKIP_WORKER
    pthread_t thread;
#endif
} FetchContext;

static void fetch_context_free_request(FetchContext *fc) {
    free(fc->method);
    free(fc->url);
    for (int i = 0; i < fc->header_count; i++) {
        free(fc->header_names[i]);
        free(fc->header_values[i]);
    }
    free(fc->header_names);
    free(fc->header_values);
    free(fc->body);
}

#ifndef SKIP_WORKER

/* Worker thread function */
static void *fetch_thread_func(void *arg) {
    FetchContext *fc = (FetchContext *)arg;

    fc->response = qjs_http_request(
        fc->method, fc->url,
        (const char *const *)fc->header_names,
        (const char *const *)fc->header_values,
        fc->header_count,
        fc->body, fc->body_len,
        fc->max_redirects,
        &fc->err_msg
    );

    /* Signal completion to main thread */
    char byte = 1;
    ssize_t r;
    do {
        r = write(fc->pipe_write, &byte, 1);
    } while (r < 0 && errno == EINTR);

    return NULL;
}

/* Callback invoked by the event loop when the pipe becomes readable.
 * Uses JSCFunctionData signature to receive the FetchContext via func_data. */
static JSValue js_fetch_completion_handler(JSContext *ctx,
                                           JSValueConst this_val,
                                           int argc, JSValueConst *argv,
                                           int magic, JSValue *func_data)
{
    int64_t ptr_val;
    JS_ToInt64(ctx, &ptr_val, func_data[0]);
    FetchContext *fc = (FetchContext *)(uintptr_t)ptr_val;
    if (!fc)
        return JS_UNDEFINED;

    /* Read the completion byte from the pipe */
    char byte;
    read(fc->pipe_read, &byte, 1);

    /* Join the thread */
    pthread_join(fc->thread, NULL);

    /* Unregister the read handler */
    JSRuntime *rt = JS_GetRuntime(ctx);
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    JSRWHandler *rh;
    struct list_head *el, *el1;
    list_for_each_safe(el, el1, &ts->rw_handlers) {
        rh = list_entry(el, JSRWHandler, link);
        if (rh->fd == fc->pipe_read) {
            js_rw_handler_free(rt, rh);
            break;
        }
    }

    /* Close the pipe */
    close(fc->pipe_read);
    close(fc->pipe_write);

    /* Resolve or reject the promise */
    if (fc->response) {
        /* Create Response object */
        JSValue resp_obj = JS_NewObjectClass(ctx, js_response_class_id);
        if (JS_IsException(resp_obj)) {
            JSValue exc = JS_GetException(ctx);
            JS_Call(ctx, fc->resolving_funcs[1], JS_UNDEFINED, 1, &exc);
            JS_FreeValue(ctx, exc);
        } else {
            ResponseData *rd = js_mallocz(ctx, sizeof(ResponseData));
            if (!rd) {
                JS_FreeValue(ctx, resp_obj);
                JSValue exc = JS_NewError(ctx);
                JS_DefinePropertyValueStr(ctx, exc, "message",
                    JS_NewString(ctx, "Out of memory"), JS_PROP_C_W_E);
                JS_Call(ctx, fc->resolving_funcs[1], JS_UNDEFINED, 1, &exc);
                JS_FreeValue(ctx, exc);
                qjs_http_response_free(fc->response);
            } else {
                rd->http_resp = fc->response; /* transfer ownership */
                rd->request_url = strdup(fc->url);
                rd->cached_headers = JS_UNDEFINED;
                JS_SetOpaque(resp_obj, rd);
                JS_Call(ctx, fc->resolving_funcs[0], JS_UNDEFINED, 1, &resp_obj);
                JS_FreeValue(ctx, resp_obj);
            }
        }
    } else {
        /* Create TypeError for network error */
        JSValue exc = JS_NewError(ctx);
        JS_DefinePropertyValueStr(ctx, exc, "message",
            JS_NewString(ctx, fc->err_msg ? fc->err_msg : "Network error"),
            JS_PROP_C_W_E);
        JS_Call(ctx, fc->resolving_funcs[1], JS_UNDEFINED, 1, &exc);
        JS_FreeValue(ctx, exc);
        free(fc->err_msg);
    }

    /* Clean up */
    JS_FreeValue(ctx, fc->resolving_funcs[0]);
    JS_FreeValue(ctx, fc->resolving_funcs[1]);
    fetch_context_free_request(fc);
    free(fc);

    return JS_UNDEFINED;
}

#endif /* !SKIP_WORKER */

/* Create a Response object from an HTTP response (synchronous path) */
static JSValue create_response_from_http(JSContext *ctx,
                                          QJS_HTTPResponse *http_resp,
                                          const char *request_url)
{
    JSValue resp_obj = JS_NewObjectClass(ctx, js_response_class_id);
    if (JS_IsException(resp_obj))
        return resp_obj;

    ResponseData *rd = js_mallocz(ctx, sizeof(ResponseData));
    if (!rd) {
        JS_FreeValue(ctx, resp_obj);
        return JS_EXCEPTION;
    }
    rd->http_resp = http_resp;
    rd->request_url = strdup(request_url);
    rd->cached_headers = JS_UNDEFINED;
    JS_SetOpaque(resp_obj, rd);
    return resp_obj;
}

static JSValue js_fetch(JSContext *ctx, JSValueConst this_val,
                        int argc, JSValueConst *argv)
{
    const char *url_str = NULL;
    char *method = NULL;
    char **header_names = NULL;
    char **header_values = NULL;
    int header_count = 0;
    uint8_t *body = NULL;
    size_t body_len = 0;
    int max_redirects = 20;

    /* Parse URL */
    url_str = JS_ToCString(ctx, argv[0]);
    if (!url_str)
        return JS_EXCEPTION;

    /* Parse options */
    if (argc > 1 && JS_IsObject(argv[1])) {
        JSValue opts = argv[1];

        /* method */
        JSValue method_val = JS_GetPropertyStr(ctx, opts, "method");
        if (!JS_IsUndefined(method_val)) {
            const char *m = JS_ToCString(ctx, method_val);
            if (m) { method = strdup(m); JS_FreeCString(ctx, m); }
        }
        JS_FreeValue(ctx, method_val);

        /* headers */
        JSValue headers_val = JS_GetPropertyStr(ctx, opts, "headers");
        if (!JS_IsUndefined(headers_val) && !JS_IsNull(headers_val)) {
            /* Could be a Headers instance or a plain object */
            HeadersData *hd = JS_GetOpaque(headers_val, js_headers_class_id);
            if (hd) {
                header_count = hd->count;
                header_names = malloc(header_count * sizeof(char *));
                header_values = malloc(header_count * sizeof(char *));
                for (int i = 0; i < header_count; i++) {
                    header_names[i] = strdup(hd->names[i]);
                    header_values[i] = strdup(hd->values[i]);
                }
            } else if (JS_IsObject(headers_val)) {
                JSPropertyEnum *props;
                uint32_t prop_count;
                if (JS_GetOwnPropertyNames(ctx, &props, &prop_count, headers_val,
                                           JS_GPN_STRING_MASK | JS_GPN_ENUM_ONLY) == 0) {
                    header_count = prop_count;
                    header_names = malloc(prop_count * sizeof(char *));
                    header_values = malloc(prop_count * sizeof(char *));
                    for (uint32_t i = 0; i < prop_count; i++) {
                        const char *key = JS_AtomToCString(ctx, props[i].atom);
                        JSValue val = JS_GetProperty(ctx, headers_val, props[i].atom);
                        const char *vs = JS_ToCString(ctx, val);
                        header_names[i] = key ? strdup(key) : strdup("");
                        header_values[i] = vs ? strdup(vs) : strdup("");
                        JS_FreeCString(ctx, key);
                        JS_FreeCString(ctx, vs);
                        JS_FreeValue(ctx, val);
                    }
                    for (uint32_t j = 0; j < prop_count; j++)
                    JS_FreeAtom(ctx, props[j].atom);
                js_free(ctx, props);
                }
            }
        }
        JS_FreeValue(ctx, headers_val);

        /* body */
        JSValue body_val = JS_GetPropertyStr(ctx, opts, "body");
        if (!JS_IsUndefined(body_val) && !JS_IsNull(body_val)) {
            if (JS_IsString(body_val)) {
                size_t len;
                const char *s = JS_ToCStringLen(ctx, &len, body_val);
                if (s) {
                    body = malloc(len);
                    if (body) { memcpy(body, s, len); body_len = len; }
                    JS_FreeCString(ctx, s);
                }
            } else {
                /* Try ArrayBuffer */
                size_t len;
                uint8_t *buf = JS_GetArrayBuffer(ctx, &len, body_val);
                if (buf) {
                    body = malloc(len);
                    if (body) { memcpy(body, buf, len); body_len = len; }
                } else {
                    /* Clear exception from GetArrayBuffer */
                    JSValue exc = JS_GetException(ctx);
                    JS_FreeValue(ctx, exc);
                }
            }
        }
        JS_FreeValue(ctx, body_val);

        /* redirect */
        JSValue redirect_val = JS_GetPropertyStr(ctx, opts, "redirect");
        if (!JS_IsUndefined(redirect_val)) {
            const char *r = JS_ToCString(ctx, redirect_val);
            if (r) {
                if (strcmp(r, "error") == 0 || strcmp(r, "manual") == 0)
                    max_redirects = 0;
                JS_FreeCString(ctx, r);
            }
        }
        JS_FreeValue(ctx, redirect_val);
    }

    if (!method) method = strdup("GET");
    char *url_copy = strdup(url_str);
    JS_FreeCString(ctx, url_str);

#ifndef SKIP_WORKER
    /* Async path: background thread */
    FetchContext *fc = calloc(1, sizeof(FetchContext));
    if (!fc) {
        free(method); free(url_copy);
        for (int i = 0; i < header_count; i++) { free(header_names[i]); free(header_values[i]); }
        free(header_names); free(header_values); free(body);
        return JS_ThrowOutOfMemory(ctx);
    }

    fc->method = method;
    fc->url = url_copy;
    fc->header_names = header_names;
    fc->header_values = header_values;
    fc->header_count = header_count;
    fc->body = body;
    fc->body_len = body_len;
    fc->max_redirects = max_redirects;
    fc->ctx = ctx;

    /* Create promise */
    JSValue promise = JS_NewPromiseCapability(ctx, fc->resolving_funcs);
    if (JS_IsException(promise)) {
        fetch_context_free_request(fc);
        free(fc);
        return JS_EXCEPTION;
    }
    /* The resolving funcs are kept alive by the Promise object itself
     * (which is returned to JS). We just need to free our references
     * in the completion handler. */

    /* Create pipe */
    int pipefd[2];
    if (pipe(pipefd) != 0) {
        JS_FreeValue(ctx, fc->resolving_funcs[0]);
        JS_FreeValue(ctx, fc->resolving_funcs[1]);
        JS_FreeValue(ctx, promise);
        fetch_context_free_request(fc);
        free(fc);
        return JS_ThrowError(ctx, "<internal>/quickjs-fetch.c", __LINE__,
                             "pipe() failed");
    }
    fc->pipe_read = pipefd[0];
    fc->pipe_write = pipefd[1];

    /* Register pipe read handler with event loop.
     * We create a JS function via JS_NewCFunctionData that carries the
     * FetchContext pointer. But JSRWHandler stores a JSValue for the callback,
     * so we need to create a small closure. However, the rw_func is called
     * with no args by the event loop. We need to pass the FetchContext somehow.
     *
     * Simpler approach: store fc in a JS opaque object and create a closure
     * that accesses it. But the event loop just calls the function with no args.
     *
     * Simplest approach: use a global lookup from pipe_read fd -> FetchContext*.
     */

    /* Register read handler using the same mechanism as os.setReadHandler */
    JSRuntime *rt = JS_GetRuntime(ctx);
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);

    /* Create the completion callback as a C function.
     * We use a small wrapper that looks up the FetchContext by fd. */
    JSRWHandler *rh = js_mallocz(ctx, sizeof(*rh));
    if (!rh) {
        close(pipefd[0]); close(pipefd[1]);
        JS_FreeValue(ctx, fc->resolving_funcs[0]);
        JS_FreeValue(ctx, fc->resolving_funcs[1]);
        JS_FreeValue(ctx, promise);
        fetch_context_free_request(fc);
        free(fc);
        return JS_ThrowOutOfMemory(ctx);
    }
    rh->fd = pipefd[0];
    rh->rw_func[0] = JS_UNDEFINED; /* Will set below */
    rh->rw_func[1] = JS_NULL;
    list_add_tail(&rh->link, &ts->rw_handlers);

    /* We need the completion handler to access fc. Store fc pointer as
     * an int64 and pass it as data to JS_NewCFunctionData. */
    JSValue fc_holder = JS_NewInt64(ctx, (int64_t)(uintptr_t)fc);
    JSValue handler = JS_NewCFunctionData(ctx, js_fetch_completion_handler,
                                          0, 0, 1, &fc_holder);
    JS_FreeValue(ctx, fc_holder);
    rh->rw_func[0] = handler; /* event loop owns the reference */

    /* Spawn thread */
    if (pthread_create(&fc->thread, NULL, fetch_thread_func, fc) != 0) {
        /* Remove the handler we just added */
        js_rw_handler_free(rt, rh);
        close(pipefd[0]); close(pipefd[1]);
        JS_FreeValue(ctx, fc->resolving_funcs[0]);
        JS_FreeValue(ctx, fc->resolving_funcs[1]);
        JS_FreeValue(ctx, promise);
        fetch_context_free_request(fc);
        free(fc);
        return JS_ThrowError(ctx, "<internal>/quickjs-fetch.c", __LINE__,
                             "pthread_create failed");
    }

    return promise;

#else /* SKIP_WORKER — synchronous fallback */
    /* No pthreads: do synchronous fetch and immediately resolve */
    char *err_msg = NULL;
    QJS_HTTPResponse *resp = qjs_http_request(
        method, url_copy,
        (const char *const *)header_names,
        (const char *const *)header_values,
        header_count, body, body_len,
        max_redirects, &err_msg
    );

    JSValue promise;
    if (resp) {
        JSValue resp_obj = create_response_from_http(ctx, resp, url_copy);
        if (JS_IsException(resp_obj)) {
            promise = js_rejected_promise(ctx, JS_GetException(ctx));
        } else {
            promise = js_resolved_promise(ctx, resp_obj);
        }
    } else {
        JSValue exc = JS_NewError(ctx);
        JS_DefinePropertyValueStr(ctx, exc, "message",
            JS_NewString(ctx, err_msg ? err_msg : "Network error"),
            JS_PROP_C_W_E);
        promise = js_rejected_promise(ctx, exc);
        free(err_msg);
    }

    free(method); free(url_copy);
    for (int i = 0; i < header_count; i++) { free(header_names[i]); free(header_values[i]); }
    free(header_names); free(header_values); free(body);
    return promise;
#endif /* SKIP_WORKER */
}

/* =========================================================================
 * Module initialization
 * ========================================================================= */

/* Register classes on the runtime. Safe to call multiple times per runtime —
 * JS_NewClassID is idempotent (won't re-allocate if already set), and
 * JS_NewClass checks if already registered. Must be called for each new
 * JSRuntime (e.g. Workers get their own runtime). */
static void js_fetch_init_classes(JSContext *ctx) {
    JS_NewClassID(&js_headers_class_id);
    JS_NewClass(JS_GetRuntime(ctx), js_headers_class_id, &js_headers_class);

    JS_NewClassID(&js_response_class_id);
    JS_NewClass(JS_GetRuntime(ctx), js_response_class_id, &js_response_class);
}

static const JSCFunctionListEntry js_fetch_funcs[] = {
    JS_CFUNC_DEF("fetch", 1, js_fetch),
};

static int js_fetch_init(JSContext *ctx, JSModuleDef *m)
{
    JSValue headers_proto, headers_ctor, response_proto;

    js_fetch_init_classes(ctx);

    /* Export fetch function */
    JS_SetModuleExportList(ctx, m, js_fetch_funcs, countof(js_fetch_funcs));

    /* Headers class - setup prototype and constructor */
    headers_proto = JS_NewObject(ctx);
    JS_SetPropertyFunctionList(ctx, headers_proto, js_headers_proto_funcs,
                               countof(js_headers_proto_funcs));
    headers_ctor = JS_NewCFunction2(ctx, js_headers_ctor, "Headers", 0,
                                    JS_CFUNC_constructor, 0);
    JS_SetConstructor(ctx, headers_ctor, headers_proto);
    JS_SetClassProto(ctx, js_headers_class_id, headers_proto);
    JS_SetModuleExport(ctx, m, "Headers", headers_ctor);

    /* Response class - setup prototype (no constructor exported) */
    response_proto = JS_NewObject(ctx);
    JS_SetPropertyFunctionList(ctx, response_proto, js_response_proto_funcs,
                               countof(js_response_proto_funcs));
    JS_SetClassProto(ctx, js_response_class_id, response_proto);

    /* Export Response as an object (non-constructible) */
    JS_SetModuleExport(ctx, m, "Response", JS_NewObject(ctx));

    return 0;
}

JSModuleDef *js_init_module_fetch(JSContext *ctx, const char *module_name)
{
    JSModuleDef *m;
    m = JS_NewCModule(ctx, module_name, js_fetch_init, NULL);
    if (!m)
        return NULL;
    JS_AddModuleExportList(ctx, m, js_fetch_funcs, countof(js_fetch_funcs));
    JS_AddModuleExport(ctx, m, "Headers");
    JS_AddModuleExport(ctx, m, "Response");
    return m;
}

/* Defined in quickjs-os.c — allows fetch to register itself for Worker init */
extern void js_os_register_fetch_globals(void (*fn)(JSContext *ctx));

void js_fetch_add_globals(JSContext *ctx)
{
    JSValue global_obj;
    JSSyntheticStackFrame *ssf;

    /* Register so Workers also get fetch globals */
    js_os_register_fetch_globals(js_fetch_add_globals);

    ssf = JS_PushSyntheticStackFrame(ctx, "js_fetch_add_globals",
                                     "quickjs-fetch.c", __LINE__);

    js_fetch_init_classes(ctx);

    global_obj = JS_GetGlobalObject(ctx);

    /* fetch() */
    JSValue fetch_val = JS_NewCFunction(ctx, js_fetch, "fetch", 1);
    JS_SetPropertyStr(ctx, global_obj, "fetch", fetch_val);

    /* Headers constructor */
    JSValue headers_proto = JS_NewObject(ctx);
    JS_SetPropertyFunctionList(ctx, headers_proto, js_headers_proto_funcs,
                               countof(js_headers_proto_funcs));
    JSValue headers_ctor = JS_NewCFunction2(ctx, js_headers_ctor, "Headers", 0,
                                            JS_CFUNC_constructor, 0);
    JS_SetConstructor(ctx, headers_ctor, headers_proto);
    JS_SetClassProto(ctx, js_headers_class_id, headers_proto);
    JS_SetPropertyStr(ctx, global_obj, "Headers", headers_ctor);

    /* Response class - setup prototype */
    JSValue response_proto = JS_NewObject(ctx);
    JS_SetPropertyFunctionList(ctx, response_proto, js_response_proto_funcs,
                               countof(js_response_proto_funcs));
    JS_SetClassProto(ctx, js_response_class_id, response_proto);

    JS_FreeValue(ctx, global_obj);
    JS_PopSyntheticStackFrame(ctx, ssf);
}

#endif /* CONFIG_FETCH */
