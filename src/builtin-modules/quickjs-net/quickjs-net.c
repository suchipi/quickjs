/*
 * QuickJS Networking Module
 *
 * Copyright (c) 2017-2021 Fabrice Bellard
 * Copyright (c) 2017-2021 Charlie Gordon
 * Copyright (c) 2026 Lily Skye
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

#if defined(_WIN32)
#include <windows.h>
#elif !defined(__wasi__)
#include <dlfcn.h>
#endif

#include "cutils.h"
#include "quickjs-net.h"
#include "quickjs-utils.h"
#include "debugprint.h"

#if !defined(__wasi__) && !defined(__EMSCRIPTEN__) && !defined(__COSMO__)

static void js_net_dbuf_init(JSContext *ctx, DynBuf *s)
{
    dbuf_init2(s, JS_GetRuntime(ctx), (DynBufReallocFunc *)js_realloc_rt);
}

static int get_bool_option(JSContext *ctx, BOOL *pbool,
                           JSValueConst obj,
                           const char *option)
{
    JSValue val;
    val = JS_GetPropertyStr(ctx, obj, option);
    if (JS_IsException(val))
        return -1;
    if (!JS_IsUndefined(val)) {
        *pbool = JS_ToBool(ctx, val);
    }
    JS_FreeValue(ctx, val);
    return 0;
}

#if defined(_WIN32)
#define URLGET_DLOPEN(name) ((void *)LoadLibraryA(name))
#define URLGET_DLSYM(handle, name) ((void *)GetProcAddress((HMODULE)(handle), name))
#define URLGET_DLCLOSE(handle) FreeLibrary((HMODULE)(handle))
#else
#define URLGET_DLOPEN(name) dlopen(name, RTLD_NOW | RTLD_LOCAL)
#define URLGET_DLSYM(handle, name) dlsym(handle, name)
#define URLGET_DLCLOSE(handle) dlclose(handle)
#endif

/* libcurl ABI constants (stable across versions) */
#define QJS_CURLOPT_URL             10002
#define QJS_CURLOPT_WRITEDATA       10001
#define QJS_CURLOPT_WRITEFUNCTION   20011
#define QJS_CURLOPT_HEADERDATA      10029
#define QJS_CURLOPT_HEADERFUNCTION  20079
#define QJS_CURLOPT_HTTPHEADER      10023
#define QJS_CURLOPT_FOLLOWLOCATION  52
#define QJS_CURLOPT_CUSTOMREQUEST   10036
#define QJS_CURLOPT_NOBODY          44
#define QJS_CURLOPT_POSTFIELDS      10015
#define QJS_CURLOPT_POSTFIELDSIZE_LARGE 30120
#define QJS_CURLOPT_POSTREDIR       161
#define QJS_CURLINFO_RESPONSE_CODE  0x200002
#define QJS_CURLE_OK                0

/* libcurl function pointer types */
typedef int (*qjs_curl_global_init_fn)(long flags);
typedef void *(*qjs_curl_easy_init_fn)(void);
typedef int (*qjs_curl_easy_setopt_fn)(void *handle, int option, ...);
typedef int (*qjs_curl_easy_perform_fn)(void *handle);
typedef int (*qjs_curl_easy_getinfo_fn)(void *handle, int info, ...);
typedef void (*qjs_curl_easy_cleanup_fn)(void *handle);
typedef const char *(*qjs_curl_easy_strerror_fn)(int code);
typedef void *(*qjs_curl_slist_append_fn)(void *list, const char *data);
typedef void (*qjs_curl_slist_free_all_fn)(void *list);

#define QJS_CURL_GLOBAL_DEFAULT 3L
#define QJS_CURL_REDIR_POST_301 1L
#define QJS_CURL_REDIR_POST_302 2L

static struct {
    BOOL initialized;
    BOOL loaded;
    void *handle;
    qjs_curl_global_init_fn global_init;
    qjs_curl_easy_init_fn easy_init;
    qjs_curl_easy_setopt_fn easy_setopt;
    qjs_curl_easy_perform_fn easy_perform;
    qjs_curl_easy_getinfo_fn easy_getinfo;
    qjs_curl_easy_cleanup_fn easy_cleanup;
    qjs_curl_easy_strerror_fn easy_strerror;
    qjs_curl_slist_append_fn slist_append;
    qjs_curl_slist_free_all_fn slist_free_all;
} qjs_libcurl;

/* Try to load libcurl. Returns 0 on success, -1 on failure with message in errbuf. */
static int ensure_libcurl_loaded(char *errbuf, size_t errbuf_size)
{
    void *lib_handle;
    const char *lib_names[] = {
#if defined(__APPLE__)
        "libcurl.dylib",
#elif defined(_WIN32)
        "libcurl.dll",
        "libcurl-4.dll",
#else
        "libcurl.so.4",
        "libcurl.so",
#endif
        NULL
    };
    int i;

    if (qjs_libcurl.initialized) {
        if (qjs_libcurl.loaded)
            return 0;
        snprintf(errbuf, errbuf_size, "libcurl was already tried and failed to load");
        return -1;
    }

    qjs_libcurl.initialized = TRUE;

    lib_handle = NULL;
    for (i = 0; lib_names[i] != NULL; i++) {
        debugprint("urlGet: trying to load %s\n", lib_names[i]);
        lib_handle = URLGET_DLOPEN(lib_names[i]);
        if (lib_handle) {
            debugprint("urlGet: loaded %s\n", lib_names[i]);
            break;
        }
    }

    if (!lib_handle) {
        snprintf(errbuf, errbuf_size,
                 "could not load libcurl (tried:");
        for (i = 0; lib_names[i] != NULL; i++) {
            size_t len = strlen(errbuf);
            snprintf(errbuf + len, errbuf_size - len, " %s", lib_names[i]);
        }
        {
            size_t len = strlen(errbuf);
            snprintf(errbuf + len, errbuf_size - len, ")");
        }
        return -1;
    }

#define LOAD_SYM(field, name) do { \
    qjs_libcurl.field = (typeof(qjs_libcurl.field))URLGET_DLSYM(lib_handle, name); \
    if (!qjs_libcurl.field) { \
        snprintf(errbuf, errbuf_size, "could not find symbol '%s' in libcurl", name); \
        URLGET_DLCLOSE(lib_handle); \
        return -1; \
    } \
} while(0)

    LOAD_SYM(global_init, "curl_global_init");
    LOAD_SYM(easy_init, "curl_easy_init");
    LOAD_SYM(easy_setopt, "curl_easy_setopt");
    LOAD_SYM(easy_perform, "curl_easy_perform");
    LOAD_SYM(easy_getinfo, "curl_easy_getinfo");
    LOAD_SYM(easy_cleanup, "curl_easy_cleanup");
    LOAD_SYM(easy_strerror, "curl_easy_strerror");
    LOAD_SYM(slist_append, "curl_slist_append");
    LOAD_SYM(slist_free_all, "curl_slist_free_all");

#undef LOAD_SYM

    {
        int rc = qjs_libcurl.global_init(QJS_CURL_GLOBAL_DEFAULT);
        debugprint("urlGet: curl_global_init returned %d\n", rc);
        if (rc != QJS_CURLE_OK) {
            snprintf(errbuf, errbuf_size, "curl_global_init failed (code %d)", rc);
            URLGET_DLCLOSE(lib_handle);
            return -1;
        }
    }

    qjs_libcurl.handle = lib_handle;
    qjs_libcurl.loaded = TRUE;
    return 0;
}

/* libcurl write callback: appends data to a DynBuf */
static size_t perform_request_write_callback(char *ptr, size_t size, size_t nmemb, void *userdata)
{
    DynBuf *buf = (DynBuf *)userdata;
    size_t total = size * nmemb;
    dbuf_put(buf, (const uint8_t *)ptr, total);
    if (dbuf_error(buf))
        return 0;
    return total;
}

/* libcurl header callback: collects headers into a DynBuf.
   Resets on "HTTP/" lines so only the final response's headers are kept. */
static size_t perform_request_header_callback(char *ptr, size_t size, size_t nmemb, void *userdata)
{
    DynBuf *buf = (DynBuf *)userdata;
    size_t total = size * nmemb;

    /* When we see a new HTTP status line, reset to discard redirect headers */
    if (total >= 5 && memcmp(ptr, "HTTP/", 5) == 0) {
        buf->size = 0;
        return total;
    }

    /* Skip the blank line that terminates the header block */
    if (total == 2 && ptr[0] == '\r' && ptr[1] == '\n')
        return total;

    dbuf_put(buf, (const uint8_t *)ptr, total);
    if (dbuf_error(buf))
        return 0;
    return total;
}

static int get_header_list_option(JSContext *ctx, void **plist,
                                  JSValueConst obj,
                                  const char *option)
{
    JSValue val;
    QJUForEachPropertyState *foreach;
    void *list = NULL, *new_list;
    const char *key_str, *val_str;
    DynBuf entry_buf;

    val = JS_GetPropertyStr(ctx, obj, option);
    if (JS_IsException(val))
        return -1;
    if (JS_IsUndefined(val))
        return 0;
    if (!JS_IsObject(val)) {
        JS_ThrowTypeError(ctx, "<internal>/quickjs-net.c", __LINE__, "'%s' option must be an object", option);
        JS_FreeValue(ctx, val);
        return -1;
    }

    foreach = QJU_NewForEachPropertyState(ctx, val, JS_GPN_STRING_MASK | JS_GPN_ENUM_ONLY);
    if (foreach == NULL) {
        JS_FreeValue(ctx, val);
        return -1;
    }
    QJU_ForEachProperty(ctx, foreach) {
        if (JS_IsException(QJU_ForEachProperty_Read(ctx, val, foreach)))
            goto fail;

        key_str = JS_AtomToCString(ctx, foreach->key);
        if (key_str == NULL)
            goto fail;
        if (!JS_IsString(foreach->val) && !JS_IsNumber(foreach->val) &&
            !JS_IsBigInt(ctx, foreach->val)) {
            JS_ThrowTypeError(ctx, "<internal>/quickjs-net.c", __LINE__, "'%s' option value for '%s' must be a string, number, or bigint", option, key_str);
            JS_FreeCString(ctx, key_str);
            goto fail;
        }
        val_str = JS_ToCString(ctx, foreach->val);
        if (val_str == NULL) {
            JS_FreeCString(ctx, key_str);
            goto fail;
        }

        js_net_dbuf_init(ctx, &entry_buf);
        dbuf_putstr(&entry_buf, key_str);
        /* libcurl treats "Name:" as "remove this header"; "Name;" sends it with an empty value */
        if (val_str[0] == '\0') {
            dbuf_putc(&entry_buf, ';');
        } else {
            dbuf_putstr(&entry_buf, ": ");
            dbuf_putstr(&entry_buf, val_str);
        }
        dbuf_putc(&entry_buf, '\0');
        JS_FreeCString(ctx, key_str);
        JS_FreeCString(ctx, val_str);
        if (dbuf_error(&entry_buf)) {
            dbuf_free(&entry_buf);
            JS_ThrowOutOfMemory(ctx);
            goto fail;
        }

        new_list = qjs_libcurl.slist_append(list, (const char *)entry_buf.buf);
        dbuf_free(&entry_buf);
        if (new_list == NULL) {
            JS_ThrowOutOfMemory(ctx);
            goto fail;
        }
        list = new_list;
    }
    QJU_FreeForEachPropertyState(ctx, foreach);
    JS_FreeValue(ctx, val);
    *plist = list;
    return 0;
 fail:
    QJU_FreeForEachPropertyState(ctx, foreach);
    JS_FreeValue(ctx, val);
    qjs_libcurl.slist_free_all(list);
    return -1;
}

static JSValue js_net_perform_request(JSContext *ctx, const char *func_name,
                                      const char *method, const char *url,
                                      JSValueConst body_val, void *header_list,
                                      BOOL binary_flag, int *pstatus)
{
    const char *body_str = NULL;
    DynBuf data_buf_s, *data_buf = &data_buf_s;
    DynBuf header_buf_s, *header_buf = &header_buf_s;
    int status = 0, curl_err;
    long response_code;
    JSValue response = JS_UNDEFINED, ret_obj;
    void *curl = NULL;

    js_net_dbuf_init(ctx, data_buf);
    js_net_dbuf_init(ctx, header_buf);

    curl = qjs_libcurl.easy_init();
    if (!curl) {
        JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__, "curl_easy_init failed");
        goto fail;
    }

    curl_err = qjs_libcurl.easy_setopt(curl, QJS_CURLOPT_URL, url);
    if (curl_err != QJS_CURLE_OK) {
        JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__,
                      "curl_easy_setopt(CURLOPT_URL) failed: %s",
                      qjs_libcurl.easy_strerror(curl_err));
        goto fail;
    }
    curl_err = qjs_libcurl.easy_setopt(curl, QJS_CURLOPT_FOLLOWLOCATION, 1L);
    if (curl_err != QJS_CURLE_OK) {
        JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__,
                      "curl_easy_setopt(CURLOPT_FOLLOWLOCATION) failed: %s",
                      qjs_libcurl.easy_strerror(curl_err));
        goto fail;
    }
    curl_err = qjs_libcurl.easy_setopt(curl, QJS_CURLOPT_WRITEFUNCTION, perform_request_write_callback);
    if (curl_err != QJS_CURLE_OK) {
        JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__,
                      "curl_easy_setopt(CURLOPT_WRITEFUNCTION) failed: %s",
                      qjs_libcurl.easy_strerror(curl_err));
        goto fail;
    }
    curl_err = qjs_libcurl.easy_setopt(curl, QJS_CURLOPT_WRITEDATA, data_buf);
    if (curl_err != QJS_CURLE_OK) {
        JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__,
                      "curl_easy_setopt(CURLOPT_WRITEDATA) failed: %s",
                      qjs_libcurl.easy_strerror(curl_err));
        goto fail;
    }
    curl_err = qjs_libcurl.easy_setopt(curl, QJS_CURLOPT_HEADERFUNCTION, perform_request_header_callback);
    if (curl_err != QJS_CURLE_OK) {
        JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__,
                      "curl_easy_setopt(CURLOPT_HEADERFUNCTION) failed: %s",
                      qjs_libcurl.easy_strerror(curl_err));
        goto fail;
    }
    curl_err = qjs_libcurl.easy_setopt(curl, QJS_CURLOPT_HEADERDATA, header_buf);
    if (curl_err != QJS_CURLE_OK) {
        JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__,
                      "curl_easy_setopt(CURLOPT_HEADERDATA) failed: %s",
                      qjs_libcurl.easy_strerror(curl_err));
        goto fail;
    }
    curl_err = qjs_libcurl.easy_setopt(curl, QJS_CURLOPT_HTTPHEADER, header_list);
    if (curl_err != QJS_CURLE_OK) {
        JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__,
                      "curl_easy_setopt(CURLOPT_HTTPHEADER) failed: %s",
                      qjs_libcurl.easy_strerror(curl_err));
        goto fail;
    }

    if (strcmp(method, "HEAD") == 0) {
        curl_err = qjs_libcurl.easy_setopt(curl, QJS_CURLOPT_NOBODY, 1L);
        if (curl_err != QJS_CURLE_OK) {
            JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__,
                          "curl_easy_setopt(CURLOPT_NOBODY) failed: %s",
                          qjs_libcurl.easy_strerror(curl_err));
            goto fail;
        }
    } else {
        const char *body = NULL;
        size_t body_len = 0;

        /* No JS may run between here and the transfer, since it could detach or resize an ArrayBuffer body */
        if (JS_IsString(body_val)) {
            body_str = JS_ToCStringLen(ctx, &body_len, body_val);
            if (!body_str)
                goto fail;
            body = body_str;
        } else if (!JS_IsUndefined(body_val)) {
            body = (const char *)JS_GetArrayBuffer(ctx, &body_len, body_val);
            if (!body)
                goto fail;
        } else if (strcmp(method, "POST") == 0) {
            body = "";
        }

        if (body) {
            curl_err = qjs_libcurl.easy_setopt(curl, QJS_CURLOPT_POSTFIELDSIZE_LARGE, (int64_t)body_len);
            if (curl_err != QJS_CURLE_OK) {
                JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__,
                              "curl_easy_setopt(CURLOPT_POSTFIELDSIZE_LARGE) failed: %s",
                              qjs_libcurl.easy_strerror(curl_err));
                goto fail;
            }
            curl_err = qjs_libcurl.easy_setopt(curl, QJS_CURLOPT_POSTFIELDS, body);
            if (curl_err != QJS_CURLE_OK) {
                JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__,
                              "curl_easy_setopt(CURLOPT_POSTFIELDS) failed: %s",
                              qjs_libcurl.easy_strerror(curl_err));
                goto fail;
            }
        }

        if (strcmp(method, body ? "POST" : "GET") != 0) {
            curl_err = qjs_libcurl.easy_setopt(curl, QJS_CURLOPT_CUSTOMREQUEST, method);
            if (curl_err != QJS_CURLE_OK) {
                JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__,
                              "curl_easy_setopt(CURLOPT_CUSTOMREQUEST) failed: %s",
                              qjs_libcurl.easy_strerror(curl_err));
                goto fail;
            }

            if (body) {
                curl_err = qjs_libcurl.easy_setopt(curl, QJS_CURLOPT_POSTREDIR,
                                                   QJS_CURL_REDIR_POST_301 | QJS_CURL_REDIR_POST_302);
                if (curl_err != QJS_CURLE_OK) {
                    JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__,
                                  "curl_easy_setopt(CURLOPT_POSTREDIR) failed: %s",
                                  qjs_libcurl.easy_strerror(curl_err));
                    goto fail;
                }
            }
        }
    }

    debugprint("%s: fetching %s\n", func_name, url);

    curl_err = qjs_libcurl.easy_perform(curl);
    if (curl_err != QJS_CURLE_OK) {
        JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__,
                      "%s request failed: %s", func_name,
                      qjs_libcurl.easy_strerror(curl_err));
        goto fail;
    }

    response_code = 0;
    curl_err = qjs_libcurl.easy_getinfo(curl, QJS_CURLINFO_RESPONSE_CODE, &response_code);
    if (curl_err != QJS_CURLE_OK) {
        JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__,
                      "curl_easy_getinfo(CURLINFO_RESPONSE_CODE) failed: %s",
                      qjs_libcurl.easy_strerror(curl_err));
        goto fail;
    }
    status = (int)response_code;

    qjs_libcurl.easy_cleanup(curl);
    curl = NULL;

    if (dbuf_error(data_buf))
        goto fail;

    /* Remove trailing CRLF from headers if present */
    if (header_buf->size >= 2 &&
        header_buf->buf[header_buf->size - 2] == '\r' &&
        header_buf->buf[header_buf->size - 1] == '\n') {
        header_buf->size -= 2;
    }

    if (binary_flag) {
        response = JS_NewArrayBufferCopy(ctx, data_buf->buf, data_buf->size);
    } else {
        response = JS_NewStringLen(ctx, (char *)data_buf->buf, data_buf->size);
    }
    if (JS_IsException(response))
        goto fail;

    dbuf_free(data_buf);
    data_buf = NULL;

    ret_obj = JS_NewObject(ctx);
    if (JS_IsException(ret_obj))
        goto fail;

    JS_DefinePropertyValueStr(ctx, ret_obj, "response",
                              response,
                              JS_PROP_C_W_E);

    JS_DefinePropertyValueStr(ctx, ret_obj, "responseHeaders",
                                  JS_NewStringLen(ctx, (char *)header_buf->buf,
                                                  header_buf->size),
                                  JS_PROP_C_W_E);

    JS_DefinePropertyValueStr(ctx, ret_obj, "status",
                                JS_NewInt32(ctx, status),
                                JS_PROP_C_W_E);

    if (pstatus)
        *pstatus = status;
    JS_FreeCString(ctx, body_str);
    dbuf_free(header_buf);
    return ret_obj;
 fail:
    if (curl)
        qjs_libcurl.easy_cleanup(curl);
    JS_FreeCString(ctx, body_str);
    if (data_buf)
        dbuf_free(data_buf);
    if (header_buf)
        dbuf_free(header_buf);
    JS_FreeValue(ctx, response);
    return JS_EXCEPTION;
}

#endif /* !__wasi__ && !__EMSCRIPTEN__ && !__COSMO__ */

static JSValue js_net_urlGet(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
#if defined(__wasi__) || defined(__EMSCRIPTEN__) || defined(__COSMO__)
    return JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__, "urlGet is not supported on this platform");
#else
    const char *url;
    int status;
    JSValue result, ret;
    JSValueConst options_obj;
    void *header_list = NULL;
    BOOL binary_flag, full_flag;
    char errbuf[256];

    if (ensure_libcurl_loaded(errbuf, sizeof(errbuf))) {
        return JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__, "%s", errbuf);
    }

    url = JS_ToCString(ctx, argv[0]);
    if (!url)
        return JS_EXCEPTION;

    binary_flag = FALSE;
    full_flag = FALSE;

    if (argc >= 2) {
        options_obj = argv[1];

        if (get_bool_option(ctx, &binary_flag, options_obj, "binary"))
            goto fail_obj;

        if (get_bool_option(ctx, &full_flag, options_obj, "full"))
            goto fail_obj;

        if (get_header_list_option(ctx, &header_list, options_obj, "headers")) {
        fail_obj:
            JS_FreeCString(ctx, url);
            return JS_EXCEPTION;
        }
    }

    result = js_net_perform_request(ctx, "urlGet", "GET", url, JS_UNDEFINED,
                                    header_list, binary_flag, &status);
    qjs_libcurl.slist_free_all(header_list);

    if (JS_IsException(result) || full_flag) {
        ret = result;
    } else if (status >= 200 && status <= 299) {
        ret = JS_GetPropertyStr(ctx, result, "response");
        JS_FreeValue(ctx, result);
    } else {
        JS_FreeValue(ctx, result);
        ret = JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__, "HTTP response status code was %d. Url was: '%s'. To allow non-2xx status codes, pass the 'full' option to urlGet.", status, url);
    }
    JS_FreeCString(ctx, url);
    return ret;
#endif /* !__wasi__ && !__EMSCRIPTEN__ && !__COSMO__ */
}

static JSValue js_net_urlRequest(JSContext *ctx, JSValueConst this_val,
                                 int argc, JSValueConst *argv)
{
#if defined(__wasi__) || defined(__EMSCRIPTEN__) || defined(__COSMO__)
    return JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__, "urlRequest is not supported on this platform");
#else
    const char *method, *url;
    JSValue body_val = JS_UNDEFINED, ret;
    JSValueConst options_obj;
    void *header_list = NULL;
    BOOL binary_flag;
    char errbuf[256];

    if (ensure_libcurl_loaded(errbuf, sizeof(errbuf))) {
        return JS_ThrowError(ctx, "<internal>/quickjs-net.c", __LINE__, "%s", errbuf);
    }

    if (!JS_IsString(argv[0]))
        return JS_ThrowTypeError(ctx, "<internal>/quickjs-net.c", __LINE__, "method must be a string");
    method = JS_ToCString(ctx, argv[0]);
    if (!method)
        return JS_EXCEPTION;

    url = JS_ToCString(ctx, argv[1]);
    if (!url) {
        JS_FreeCString(ctx, method);
        return JS_EXCEPTION;
    }

    binary_flag = FALSE;

    if (argc >= 3) {
        options_obj = argv[2];

        if (get_bool_option(ctx, &binary_flag, options_obj, "binary"))
            goto fail_obj;

        body_val = JS_GetPropertyStr(ctx, options_obj, "body");
        if (JS_IsException(body_val))
            goto fail_obj;
        if (!JS_IsUndefined(body_val) && !JS_IsString(body_val) &&
            JS_GetClassID(body_val) != JS_CLASS_ARRAY_BUFFER) {
            JS_ThrowTypeError(ctx, "<internal>/quickjs-net.c", __LINE__, "'body' option must be a string or ArrayBuffer");
            goto fail_obj;
        }

        if (strcmp(method, "HEAD") == 0 && !JS_IsUndefined(body_val)) {
            JS_ThrowTypeError(ctx, "<internal>/quickjs-net.c", __LINE__, "'body' option cannot be used with the HEAD method");
            goto fail_obj;
        }

        if (get_header_list_option(ctx, &header_list, options_obj, "headers")) {
        fail_obj:
            JS_FreeCString(ctx, method);
            JS_FreeCString(ctx, url);
            JS_FreeValue(ctx, body_val);
            return JS_EXCEPTION;
        }
    }

    ret = js_net_perform_request(ctx, "urlRequest", method, url, body_val,
                                 header_list, binary_flag, NULL);
    qjs_libcurl.slist_free_all(header_list);
    JS_FreeCString(ctx, method);
    JS_FreeCString(ctx, url);
    JS_FreeValue(ctx, body_val);
    return ret;
#endif /* !__wasi__ && !__EMSCRIPTEN__ && !__COSMO__ */
}

static const JSCFunctionListEntry js_net_funcs[] = {
    JS_CFUNC_DEF("urlGet", 1, js_net_urlGet ),
    JS_CFUNC_DEF("urlRequest", 2, js_net_urlRequest ),
};

static int js_net_init(JSContext *ctx, JSModuleDef *m)
{
    return JS_SetModuleExportList(ctx, m, js_net_funcs,
                                  countof(js_net_funcs));
}

JSModuleDef *js_init_module_net(JSContext *ctx, const char *module_name)
{
    JSModuleDef *m;

    m = JS_NewCModule(ctx, module_name, js_net_init, NULL);
    if (!m)
        return NULL;
    JS_AddModuleExportList(ctx, m, js_net_funcs,
                           countof(js_net_funcs));
    return m;
}
