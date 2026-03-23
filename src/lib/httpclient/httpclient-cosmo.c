/*
 * HTTP client implementation for Cosmopolitan Libc.
 *
 * Uses cosmo_dlopen() to dynamically load libcurl at runtime.
 * On Windows, falls back to WinHTTP via cosmo_dlopen("winhttp.dll").
 */

#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <dlfcn.h>
#include "httpclient.h"

/* Cosmopolitan runtime OS detection */
extern int IsWindows(void);

/*
 * For the libcurl path, we replicate the same logic as httpclient-curl.c
 * but call through function pointers loaded via dlopen.
 *
 * For simplicity in this initial implementation, we only support the
 * libcurl path (not WinHTTP via dlopen). WinHTTP via dlopen requires
 * resolving many wide-string functions and is significantly more complex.
 * On Windows under Cosmo, if libcurl is not found, we return an error.
 */

/* libcurl types and constants we need */
typedef void CURL;
typedef int CURLcode;
typedef int CURLoption;
typedef int CURLINFO;
typedef struct curl_slist curl_slist;

#define CURLE_OK 0
#define CURLOPT_URL 10002
#define CURLOPT_CUSTOMREQUEST 10036
#define CURLOPT_HTTPHEADER 10023
#define CURLOPT_POSTFIELDS 10015
#define CURLOPT_POSTFIELDSIZE 60
#define CURLOPT_FOLLOWLOCATION 52
#define CURLOPT_MAXREDIRS 68
#define CURLOPT_WRITEFUNCTION 20011
#define CURLOPT_WRITEDATA 10001
#define CURLOPT_HEADERFUNCTION 20079
#define CURLOPT_HEADERDATA 10029
#define CURLOPT_TIMEOUT 13
#define CURLOPT_ACCEPT_ENCODING 10102
#define CURLINFO_RESPONSE_CODE 0x200002
#define CURLINFO_EFFECTIVE_URL 0x100001

/* Function pointer types */
typedef CURL *(*curl_easy_init_t)(void);
typedef void (*curl_easy_cleanup_t)(CURL *);
typedef CURLcode (*curl_easy_setopt_t)(CURL *, CURLoption, ...);
typedef CURLcode (*curl_easy_perform_t)(CURL *);
typedef CURLcode (*curl_easy_getinfo_t)(CURL *, CURLINFO, ...);
typedef const char *(*curl_easy_strerror_t)(CURLcode);
typedef curl_slist *(*curl_slist_append_t)(curl_slist *, const char *);
typedef void (*curl_slist_free_all_t)(curl_slist *);

/* Cached function pointers */
static int curl_loaded = 0;
static int curl_available = 0;
static void *curl_handle = NULL;
static curl_easy_init_t fn_curl_easy_init;
static curl_easy_cleanup_t fn_curl_easy_cleanup;
static curl_easy_setopt_t fn_curl_easy_setopt;
static curl_easy_perform_t fn_curl_easy_perform;
static curl_easy_getinfo_t fn_curl_easy_getinfo;
static curl_easy_strerror_t fn_curl_easy_strerror;
static curl_slist_append_t fn_curl_slist_append;
static curl_slist_free_all_t fn_curl_slist_free_all;

static int load_curl(void) {
    if (curl_loaded) return curl_available;
    curl_loaded = 1;

    /* cosmo_dlopen auto-converts .so to .dylib on macOS */
    curl_handle = dlopen("libcurl.so", RTLD_LAZY);
    if (!curl_handle) {
        /* Try alternate names */
        curl_handle = dlopen("libcurl.so.4", RTLD_LAZY);
    }
    if (!curl_handle) {
        curl_available = 0;
        return 0;
    }

    fn_curl_easy_init = (curl_easy_init_t)dlsym(curl_handle, "curl_easy_init");
    fn_curl_easy_cleanup = (curl_easy_cleanup_t)dlsym(curl_handle, "curl_easy_cleanup");
    fn_curl_easy_setopt = (curl_easy_setopt_t)dlsym(curl_handle, "curl_easy_setopt");
    fn_curl_easy_perform = (curl_easy_perform_t)dlsym(curl_handle, "curl_easy_perform");
    fn_curl_easy_getinfo = (curl_easy_getinfo_t)dlsym(curl_handle, "curl_easy_getinfo");
    fn_curl_easy_strerror = (curl_easy_strerror_t)dlsym(curl_handle, "curl_easy_strerror");
    fn_curl_slist_append = (curl_slist_append_t)dlsym(curl_handle, "curl_slist_append");
    fn_curl_slist_free_all = (curl_slist_free_all_t)dlsym(curl_handle, "curl_slist_free_all");

    if (!fn_curl_easy_init || !fn_curl_easy_cleanup || !fn_curl_easy_setopt ||
        !fn_curl_easy_perform || !fn_curl_easy_getinfo || !fn_curl_easy_strerror ||
        !fn_curl_slist_append || !fn_curl_slist_free_all) {
        dlclose(curl_handle);
        curl_handle = NULL;
        curl_available = 0;
        return 0;
    }

    curl_available = 1;
    return 1;
}

/* Growing buffer (same as curl backend) */
typedef struct { uint8_t *data; size_t len, cap; } Buffer;
static void buf_init(Buffer *b) { b->data = NULL; b->len = 0; b->cap = 0; }
static int buf_append(Buffer *b, const void *src, size_t n) {
    if (b->len + n > b->cap) {
        size_t nc = (b->cap == 0) ? 4096 : b->cap;
        while (nc < b->len + n) nc *= 2;
        uint8_t *tmp = realloc(b->data, nc);
        if (!tmp) return -1;
        b->data = tmp; b->cap = nc;
    }
    memcpy(b->data + b->len, src, n); b->len += n;
    return 0;
}
static void buf_free(Buffer *b) { free(b->data); b->data = NULL; b->len = 0; b->cap = 0; }

typedef struct { char **names; char **values; int count, cap; char *status_text; } HeaderCtx;
static void hctx_init(HeaderCtx *h) { memset(h, 0, sizeof(*h)); }
static void hctx_free(HeaderCtx *h) {
    for (int i = 0; i < h->count; i++) { free(h->names[i]); free(h->values[i]); }
    free(h->names); free(h->values); free(h->status_text);
}
static int hctx_add(HeaderCtx *h, const char *name, size_t nlen, const char *val, size_t vlen) {
    if (h->count >= h->cap) {
        int nc = (h->cap == 0) ? 16 : h->cap * 2;
        h->names = realloc(h->names, nc * sizeof(char *));
        h->values = realloc(h->values, nc * sizeof(char *));
        if (!h->names || !h->values) return -1;
        h->cap = nc;
    }
    h->names[h->count] = strndup(name, nlen);
    h->values[h->count] = strndup(val, vlen);
    h->count++;
    return 0;
}

static size_t cosmo_write_cb(char *ptr, size_t size, size_t nmemb, void *ud) {
    Buffer *b = ud; size_t t = size * nmemb;
    return buf_append(b, ptr, t) < 0 ? 0 : t;
}

static size_t cosmo_header_cb(char *buf, size_t size, size_t nitems, void *ud) {
    HeaderCtx *h = ud; size_t t = size * nitems;
    if (t >= 5 && strncmp(buf, "HTTP/", 5) == 0) {
        for (int i = 0; i < h->count; i++) { free(h->names[i]); free(h->values[i]); }
        h->count = 0; free(h->status_text); h->status_text = NULL;
        const char *p = buf, *end = buf + t;
        while (p < end && *p != ' ') p++; if (p < end) p++;
        while (p < end && *p != ' ') p++; if (p < end) p++;
        const char *ts = p, *te = end;
        while (te > ts && (te[-1] == '\r' || te[-1] == '\n')) te--;
        if (te > ts) h->status_text = strndup(ts, te - ts);
        return t;
    }
    if (t <= 2) return t;
    const char *c = memchr(buf, ':', t);
    if (!c) return t;
    size_t nlen = c - buf;
    const char *vs = c + 1; size_t rem = t - (vs - buf);
    while (rem > 0 && (*vs == ' ' || *vs == '\t')) { vs++; rem--; }
    while (rem > 0 && (vs[rem-1] == '\r' || vs[rem-1] == '\n')) rem--;
    hctx_add(h, buf, nlen, vs, rem);
    return t;
}

QJS_HTTPResponse *qjs_http_request(
    const char *method, const char *url,
    const char *const *hnames, const char *const *hvalues, int hcount,
    const uint8_t *body, size_t body_len,
    int max_redirects, char **err_msg)
{
    *err_msg = NULL;

    if (!load_curl()) {
        if (IsWindows()) {
            *err_msg = strdup("fetch: libcurl not found. Install libcurl to use fetch on Windows with Cosmopolitan.");
        } else {
            *err_msg = strdup("fetch: libcurl not found. Install libcurl (e.g. apt install libcurl4, brew install curl) to use fetch.");
        }
        return NULL;
    }

    Buffer rb; HeaderCtx rh; curl_slist *slist = NULL;
    buf_init(&rb); hctx_init(&rh);

    CURL *curl = fn_curl_easy_init();
    if (!curl) { *err_msg = strdup("Failed to init libcurl"); return NULL; }

    fn_curl_easy_setopt(curl, CURLOPT_URL, url);
    fn_curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, method);

    for (int i = 0; i < hcount; i++) {
        char line[4096];
        snprintf(line, sizeof(line), "%s: %s", hnames[i], hvalues[i]);
        slist = fn_curl_slist_append(slist, line);
    }
    if (slist) fn_curl_easy_setopt(curl, CURLOPT_HTTPHEADER, slist);

    if (body && body_len > 0) {
        fn_curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body);
        fn_curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, (long)body_len);
    }

    if (max_redirects > 0) {
        fn_curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
        fn_curl_easy_setopt(curl, CURLOPT_MAXREDIRS, (long)max_redirects);
    } else {
        fn_curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 0L);
    }

    fn_curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, cosmo_write_cb);
    fn_curl_easy_setopt(curl, CURLOPT_WRITEDATA, &rb);
    fn_curl_easy_setopt(curl, CURLOPT_HEADERFUNCTION, cosmo_header_cb);
    fn_curl_easy_setopt(curl, CURLOPT_HEADERDATA, &rh);
    fn_curl_easy_setopt(curl, CURLOPT_TIMEOUT, 30L);
    fn_curl_easy_setopt(curl, CURLOPT_ACCEPT_ENCODING, "");

    CURLcode res = fn_curl_easy_perform(curl);
    QJS_HTTPResponse *resp = NULL;
    if (res != CURLE_OK) {
        *err_msg = strdup(fn_curl_easy_strerror(res));
    } else {
        resp = calloc(1, sizeof(*resp));
        if (resp) {
            long sc; fn_curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &sc);
            resp->status_code = (int)sc;
            resp->status_text = rh.status_text ? strdup(rh.status_text) : strdup("");
            char *eu = NULL; fn_curl_easy_getinfo(curl, CURLINFO_EFFECTIVE_URL, &eu);
            resp->final_url = eu ? strdup(eu) : strdup(url);
            resp->header_names = rh.names; resp->header_values = rh.values;
            resp->header_count = rh.count;
            rh.names = NULL; rh.values = NULL; rh.count = 0;
            resp->body = rb.data; resp->body_len = rb.len;
            rb.data = NULL; rb.len = 0;
        } else {
            *err_msg = strdup("Out of memory");
        }
    }

    fn_curl_slist_free_all(slist);
    fn_curl_easy_cleanup(curl);
    buf_free(&rb); hctx_free(&rh);
    return resp;
}

void qjs_http_response_free(QJS_HTTPResponse *resp) {
    if (!resp) return;
    free(resp->status_text); free(resp->final_url);
    for (int i = 0; i < resp->header_count; i++) {
        free(resp->header_names[i]); free(resp->header_values[i]);
    }
    free(resp->header_names); free(resp->header_values);
    free(resp->body); free(resp);
}

int qjs_http_available(void) {
    return load_curl();
}
