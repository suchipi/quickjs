/*
 * HTTP client implementation for Cosmopolitan Libc.
 *
 * Uses cosmo_dlopen() to dynamically load backends at runtime:
 * - On Windows: loads winhttp.dll (always available on Windows)
 * - On Linux/macOS/FreeBSD: loads libcurl shared library
 *
 * Uses runtime OS detection (IsWindows()) to choose the backend.
 */

#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <libc/dlopen/dlfcn.h>

/* Need _COSMO_SOURCE for IsWindows() macro in libc/dce.h */
#ifndef _COSMO_SOURCE
#define _COSMO_SOURCE
#endif
#include <libc/dce.h>

/* Cosmopolitan requires cosmo_dlopen/cosmo_dlsym/cosmo_dlclose.
 * Function pointers from cosmo_dlsym need cosmo_dltramp() to bridge
 * calling conventions between the APE binary and shared libraries. */
#define dlopen cosmo_dlopen
#define dlsym(h, s) cosmo_dltramp(cosmo_dlsym((h), (s)))
#define dlclose cosmo_dlclose
#define dlerror cosmo_dlerror

#include "httpclient.h"
#include "httpclient-common.h"
#include "utf-conv.h"

/* =========================================================================
 * libcurl backend (Linux/macOS/FreeBSD)
 * ========================================================================= */

/* libcurl types and constants */
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

typedef CURL *(*curl_easy_init_t)(void);
typedef void (*curl_easy_cleanup_t)(CURL *);
typedef CURLcode (*curl_easy_setopt_t)(CURL *, CURLoption, ...);
typedef CURLcode (*curl_easy_perform_t)(CURL *);
typedef CURLcode (*curl_easy_getinfo_t)(CURL *, CURLINFO, ...);
typedef const char *(*curl_easy_strerror_t)(CURLcode);
typedef curl_slist *(*curl_slist_append_t)(curl_slist *, const char *);
typedef void (*curl_slist_free_all_t)(curl_slist *);

static int curl_loaded = 0;
static int curl_available = 0;
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

    /* Try platform-appropriate library names */
    void *h = dlopen("libcurl.so", RTLD_LAZY);
    if (!h) h = dlopen("libcurl.so.4", RTLD_LAZY);
    /* macOS: .dylib extension, common install paths */
    if (!h) h = dlopen("libcurl.dylib", RTLD_LAZY);
    if (!h) h = dlopen("libcurl.4.dylib", RTLD_LAZY);
    if (!h) h = dlopen("/usr/lib/libcurl.4.dylib", RTLD_LAZY);
    if (!h) h = dlopen("/opt/homebrew/lib/libcurl.dylib", RTLD_LAZY);
    if (!h) h = dlopen("/opt/local/lib/libcurl.dylib", RTLD_LAZY);
    if (!h) { curl_available = 0; return 0; }

    fn_curl_easy_init = (curl_easy_init_t)dlsym(h, "curl_easy_init");
    fn_curl_easy_cleanup = (curl_easy_cleanup_t)dlsym(h, "curl_easy_cleanup");
    fn_curl_easy_setopt = (curl_easy_setopt_t)dlsym(h, "curl_easy_setopt");
    fn_curl_easy_perform = (curl_easy_perform_t)dlsym(h, "curl_easy_perform");
    fn_curl_easy_getinfo = (curl_easy_getinfo_t)dlsym(h, "curl_easy_getinfo");
    fn_curl_easy_strerror = (curl_easy_strerror_t)dlsym(h, "curl_easy_strerror");
    fn_curl_slist_append = (curl_slist_append_t)dlsym(h, "curl_slist_append");
    fn_curl_slist_free_all = (curl_slist_free_all_t)dlsym(h, "curl_slist_free_all");

    if (!fn_curl_easy_init || !fn_curl_easy_cleanup || !fn_curl_easy_setopt ||
        !fn_curl_easy_perform || !fn_curl_easy_getinfo || !fn_curl_easy_strerror ||
        !fn_curl_slist_append || !fn_curl_slist_free_all) {
        dlclose(h); curl_available = 0; return 0;
    }

    curl_available = 1;
    return 1;
}

/* curl_write_cb and curl_header_cb are provided by httpclient-common.h */

static QJS_HTTPResponse *curl_request(
    const char *method, const char *url,
    const char *const *hnames, const char *const *hvalues, int hcount,
    const uint8_t *body, size_t body_len,
    int max_redirects, char **err_msg)
{
    Buffer rb; HeaderCtx rh; curl_slist *slist = NULL;
    buf_init(&rb); header_ctx_init(&rh);

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

    fn_curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, curl_write_cb);
    fn_curl_easy_setopt(curl, CURLOPT_WRITEDATA, &rb);
    fn_curl_easy_setopt(curl, CURLOPT_HEADERFUNCTION, curl_header_cb);
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
    buf_free(&rb); header_ctx_free(&rh);
    return resp;
}

/* =========================================================================
 * WinHTTP backend (Windows) — loaded via dlopen("winhttp.dll")
 * ========================================================================= */

/* WinHTTP types and constants.
 * We define minimal types here to avoid depending on windows.h headers. */
typedef void *HINTERNET;
typedef unsigned long DWORD;
typedef int BOOL;
typedef unsigned short WORD;

/* URL_COMPONENTS for WinHttpCrackUrl */
typedef struct {
    DWORD dwStructSize;
    uint16_t *lpszScheme;
    DWORD dwSchemeLength;
    int nScheme;  /* INTERNET_SCHEME */
    uint16_t *lpszHostName;
    DWORD dwHostNameLength;
    WORD nPort;
    uint16_t *lpszUserName;
    DWORD dwUserNameLength;
    uint16_t *lpszPassword;
    DWORD dwPasswordLength;
    uint16_t *lpszUrlPath;
    DWORD dwUrlPathLength;
    uint16_t *lpszExtraInfo;
    DWORD dwExtraInfoLength;
} COSMO_URL_COMPONENTS;

/* WinHTTP constants */
#define WINHTTP_ACCESS_TYPE_DEFAULT_PROXY 0
#define WINHTTP_FLAG_SECURE 0x00800000
#define INTERNET_SCHEME_HTTPS 2
#define WINHTTP_ADDREQ_FLAG_ADD 0x20000000
#define WINHTTP_ADDREQ_FLAG_REPLACE 0x80000000
#define WINHTTP_QUERY_STATUS_CODE 19
#define WINHTTP_QUERY_STATUS_TEXT 20
#define WINHTTP_QUERY_RAW_HEADERS_CRLF 22
#define WINHTTP_QUERY_FLAG_NUMBER 0x20000000
#define WINHTTP_OPTION_REDIRECT_POLICY 0x00000068
#define WINHTTP_OPTION_REDIRECT_POLICY_NEVER 0

/* Use max DWORD as sentinel for WINHTTP_HEADER_NAME_BY_INDEX / WINHTTP_NO_HEADER_INDEX */
#define COSMO_WINHTTP_HEADER_NAME_BY_INDEX ((uint16_t *)0)
#define COSMO_WINHTTP_NO_HEADER_INDEX ((DWORD *)0)

/* WinHTTP function pointer types */
typedef HINTERNET (*WinHttpOpen_t)(const uint16_t *, DWORD, const uint16_t *, const uint16_t *, DWORD);
typedef BOOL (*WinHttpCloseHandle_t)(HINTERNET);
typedef BOOL (*WinHttpSetTimeouts_t)(HINTERNET, int, int, int, int);
typedef HINTERNET (*WinHttpConnect_t)(HINTERNET, const uint16_t *, WORD, DWORD);
typedef HINTERNET (*WinHttpOpenRequest_t)(HINTERNET, const uint16_t *, const uint16_t *, const uint16_t *, const uint16_t *, const uint16_t **, DWORD);
typedef BOOL (*WinHttpSendRequest_t)(HINTERNET, const uint16_t *, DWORD, void *, DWORD, DWORD, uintptr_t);
typedef BOOL (*WinHttpReceiveResponse_t)(HINTERNET, void *);
typedef BOOL (*WinHttpQueryHeaders_t)(HINTERNET, DWORD, const uint16_t *, void *, DWORD *, DWORD *);
typedef BOOL (*WinHttpQueryDataAvailable_t)(HINTERNET, DWORD *);
typedef BOOL (*WinHttpReadData_t)(HINTERNET, void *, DWORD, DWORD *);
typedef BOOL (*WinHttpAddRequestHeaders_t)(HINTERNET, const uint16_t *, DWORD, DWORD);
typedef BOOL (*WinHttpSetOption_t)(HINTERNET, DWORD, void *, DWORD);
typedef BOOL (*WinHttpCrackUrl_t)(const uint16_t *, DWORD, DWORD, COSMO_URL_COMPONENTS *);

static int winhttp_loaded = 0;
static int winhttp_available = 0;
static WinHttpOpen_t fn_WinHttpOpen;
static WinHttpCloseHandle_t fn_WinHttpCloseHandle;
static WinHttpSetTimeouts_t fn_WinHttpSetTimeouts;
static WinHttpConnect_t fn_WinHttpConnect;
static WinHttpOpenRequest_t fn_WinHttpOpenRequest;
static WinHttpSendRequest_t fn_WinHttpSendRequest;
static WinHttpReceiveResponse_t fn_WinHttpReceiveResponse;
static WinHttpQueryHeaders_t fn_WinHttpQueryHeaders;
static WinHttpQueryDataAvailable_t fn_WinHttpQueryDataAvailable;
static WinHttpReadData_t fn_WinHttpReadData;
static WinHttpAddRequestHeaders_t fn_WinHttpAddRequestHeaders;
static WinHttpSetOption_t fn_WinHttpSetOption;
static WinHttpCrackUrl_t fn_WinHttpCrackUrl;

static int load_winhttp(void) {
    if (winhttp_loaded) return winhttp_available;
    winhttp_loaded = 1;

    void *h = dlopen("winhttp.dll", RTLD_LAZY);
    if (!h) { winhttp_available = 0; return 0; }

    fn_WinHttpOpen = (WinHttpOpen_t)dlsym(h, "WinHttpOpen");
    fn_WinHttpCloseHandle = (WinHttpCloseHandle_t)dlsym(h, "WinHttpCloseHandle");
    fn_WinHttpSetTimeouts = (WinHttpSetTimeouts_t)dlsym(h, "WinHttpSetTimeouts");
    fn_WinHttpConnect = (WinHttpConnect_t)dlsym(h, "WinHttpConnect");
    fn_WinHttpOpenRequest = (WinHttpOpenRequest_t)dlsym(h, "WinHttpOpenRequest");
    fn_WinHttpSendRequest = (WinHttpSendRequest_t)dlsym(h, "WinHttpSendRequest");
    fn_WinHttpReceiveResponse = (WinHttpReceiveResponse_t)dlsym(h, "WinHttpReceiveResponse");
    fn_WinHttpQueryHeaders = (WinHttpQueryHeaders_t)dlsym(h, "WinHttpQueryHeaders");
    fn_WinHttpQueryDataAvailable = (WinHttpQueryDataAvailable_t)dlsym(h, "WinHttpQueryDataAvailable");
    fn_WinHttpReadData = (WinHttpReadData_t)dlsym(h, "WinHttpReadData");
    fn_WinHttpAddRequestHeaders = (WinHttpAddRequestHeaders_t)dlsym(h, "WinHttpAddRequestHeaders");
    fn_WinHttpSetOption = (WinHttpSetOption_t)dlsym(h, "WinHttpSetOption");
    fn_WinHttpCrackUrl = (WinHttpCrackUrl_t)dlsym(h, "WinHttpCrackUrl");

    if (!fn_WinHttpOpen || !fn_WinHttpCloseHandle || !fn_WinHttpConnect ||
        !fn_WinHttpOpenRequest || !fn_WinHttpSendRequest ||
        !fn_WinHttpReceiveResponse || !fn_WinHttpQueryHeaders ||
        !fn_WinHttpQueryDataAvailable || !fn_WinHttpReadData ||
        !fn_WinHttpAddRequestHeaders || !fn_WinHttpSetOption ||
        !fn_WinHttpCrackUrl) {
        dlclose(h); winhttp_available = 0; return 0;
    }

    winhttp_available = 1;
    return 1;
}

/* UTF conversion helpers using utf-conv.h */
static uint16_t *cosmo_utf8_to_wide(const char *str) {
    if (!str) return NULL;
    return utf8_to_utf16(str, NULL, NULL, NULL, NULL, NULL);
}

static char *cosmo_wide_to_utf8(const uint16_t *wstr) {
    if (!wstr) return NULL;
    return utf16_to_utf8(wstr, (size_t)-1, NULL, NULL, NULL, NULL, NULL);
}

static QJS_HTTPResponse *winhttp_request(
    const char *method, const char *url,
    const char *const *req_header_names, const char *const *req_header_values,
    int req_header_count,
    const uint8_t *body, size_t body_len,
    int max_redirects, char **err_msg)
{
    HINTERNET hSession = NULL, hConnect = NULL, hRequest = NULL;
    QJS_HTTPResponse *response = NULL;
    uint16_t *wurl = NULL, *wmethod = NULL;
    uint16_t hostName[256], urlPath[4096];

    wurl = cosmo_utf8_to_wide(url);
    wmethod = cosmo_utf8_to_wide(method);
    if (!wurl || !wmethod) {
        *err_msg = strdup("Failed to convert URL to wide string");
        goto cleanup;
    }

    /* Parse URL */
    COSMO_URL_COMPONENTS urlComp;
    memset(&urlComp, 0, sizeof(urlComp));
    urlComp.dwStructSize = sizeof(urlComp);
    urlComp.lpszHostName = hostName;
    urlComp.dwHostNameLength = sizeof(hostName) / sizeof(hostName[0]);
    urlComp.lpszUrlPath = urlPath;
    urlComp.dwUrlPathLength = sizeof(urlPath) / sizeof(urlPath[0]);
    if (!fn_WinHttpCrackUrl(wurl, 0, 0, &urlComp)) {
        *err_msg = strdup("Failed to parse URL");
        goto cleanup;
    }

    /* User agent string: L"quickjs-fetch/1.0" as uint16_t */
    static const uint16_t ua[] = {'q','u','i','c','k','j','s','-','f','e','t','c','h','/','1','.','0', 0};

    hSession = fn_WinHttpOpen(ua, WINHTTP_ACCESS_TYPE_DEFAULT_PROXY, NULL, NULL, 0);
    if (!hSession) {
        *err_msg = strdup("WinHttpOpen failed");
        goto cleanup;
    }

    fn_WinHttpSetTimeouts(hSession, 30000, 30000, 30000, 30000);

    hConnect = fn_WinHttpConnect(hSession, hostName, urlComp.nPort, 0);
    if (!hConnect) {
        *err_msg = strdup("WinHttpConnect failed");
        goto cleanup;
    }

    DWORD flags = (urlComp.nScheme == INTERNET_SCHEME_HTTPS) ? WINHTTP_FLAG_SECURE : 0;
    hRequest = fn_WinHttpOpenRequest(hConnect, wmethod, urlPath, NULL, NULL, NULL, flags);
    if (!hRequest) {
        *err_msg = strdup("WinHttpOpenRequest failed");
        goto cleanup;
    }

    /* Redirect policy */
    if (max_redirects <= 0) {
        DWORD opt = WINHTTP_OPTION_REDIRECT_POLICY_NEVER;
        fn_WinHttpSetOption(hRequest, WINHTTP_OPTION_REDIRECT_POLICY, &opt, sizeof(opt));
    }

    /* Add request headers */
    for (int i = 0; i < req_header_count; i++) {
        char line[4096];
        snprintf(line, sizeof(line), "%s: %s", req_header_names[i], req_header_values[i]);
        uint16_t *wline = cosmo_utf8_to_wide(line);
        if (wline) {
            fn_WinHttpAddRequestHeaders(hRequest, wline, (DWORD)-1,
                                        WINHTTP_ADDREQ_FLAG_ADD | WINHTTP_ADDREQ_FLAG_REPLACE);
            free(wline);
        }
    }

    /* Send request */
    if (!fn_WinHttpSendRequest(hRequest, NULL, 0,
                               (body && body_len > 0) ? (void *)body : NULL,
                               (DWORD)body_len, (DWORD)body_len, 0)) {
        *err_msg = strdup("WinHttpSendRequest failed");
        goto cleanup;
    }

    if (!fn_WinHttpReceiveResponse(hRequest, NULL)) {
        *err_msg = strdup("WinHttpReceiveResponse failed");
        goto cleanup;
    }

    /* Build response */
    response = calloc(1, sizeof(QJS_HTTPResponse));
    if (!response) {
        *err_msg = strdup("Out of memory");
        goto cleanup;
    }

    /* Status code */
    {
        DWORD status_code = 0;
        DWORD sz = sizeof(status_code);
        fn_WinHttpQueryHeaders(hRequest, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
                               COSMO_WINHTTP_HEADER_NAME_BY_INDEX, &status_code, &sz,
                               COSMO_WINHTTP_NO_HEADER_INDEX);
        response->status_code = (int)status_code;
    }

    /* Status text */
    {
        DWORD sz = 0;
        fn_WinHttpQueryHeaders(hRequest, WINHTTP_QUERY_STATUS_TEXT,
                               COSMO_WINHTTP_HEADER_NAME_BY_INDEX, NULL, &sz,
                               COSMO_WINHTTP_NO_HEADER_INDEX);
        if (sz > 0) {
            uint16_t *wstatus = malloc(sz);
            if (wstatus) {
                fn_WinHttpQueryHeaders(hRequest, WINHTTP_QUERY_STATUS_TEXT,
                                       COSMO_WINHTTP_HEADER_NAME_BY_INDEX, wstatus, &sz,
                                       COSMO_WINHTTP_NO_HEADER_INDEX);
                response->status_text = cosmo_wide_to_utf8(wstatus);
                free(wstatus);
            }
        }
        if (!response->status_text)
            response->status_text = strdup("");
    }

    /* Response headers */
    {
        DWORD sz = 0;
        fn_WinHttpQueryHeaders(hRequest, WINHTTP_QUERY_RAW_HEADERS_CRLF,
                               COSMO_WINHTTP_HEADER_NAME_BY_INDEX, NULL, &sz,
                               COSMO_WINHTTP_NO_HEADER_INDEX);
        if (sz > 0) {
            uint16_t *raw = malloc(sz);
            if (raw) {
                fn_WinHttpQueryHeaders(hRequest, WINHTTP_QUERY_RAW_HEADERS_CRLF,
                                       COSMO_WINHTTP_HEADER_NAME_BY_INDEX, raw, &sz,
                                       COSMO_WINHTTP_NO_HEADER_INDEX);
                char *raw_utf8 = cosmo_wide_to_utf8(raw);
                free(raw);
                if (raw_utf8) {
                    int cap = 16;
                    response->header_names = malloc(cap * sizeof(char *));
                    response->header_values = malloc(cap * sizeof(char *));
                    response->header_count = 0;

                    char *line = raw_utf8;
                    /* Skip status line */
                    char *eol = strstr(line, "\r\n");
                    if (eol) line = eol + 2;

                    while (*line && line[0] != '\r') {
                        char *colon = strchr(line, ':');
                        eol = strstr(line, "\r\n");
                        if (!eol) break;
                        if (colon && colon < eol) {
                            if (response->header_count >= cap) {
                                cap *= 2;
                                response->header_names = realloc(response->header_names, cap * sizeof(char *));
                                response->header_values = realloc(response->header_values, cap * sizeof(char *));
                            }
                            response->header_names[response->header_count] = strndup(line, colon - line);
                            const char *vstart = colon + 1;
                            while (vstart < eol && (*vstart == ' ' || *vstart == '\t'))
                                vstart++;
                            response->header_values[response->header_count] = strndup(vstart, eol - vstart);
                            response->header_count++;
                        }
                        line = eol + 2;
                    }
                    free(raw_utf8);
                }
            }
        }
    }

    /* Read body */
    {
        Buffer body_buf;
        buf_init(&body_buf);
        DWORD bytes_available, bytes_read;

        for (;;) {
            bytes_available = 0;
            if (!fn_WinHttpQueryDataAvailable(hRequest, &bytes_available))
                break;
            if (bytes_available == 0)
                break;
            /* Ensure space */
            if (body_buf.len + bytes_available > body_buf.cap) {
                size_t nc = (body_buf.cap == 0) ? 4096 : body_buf.cap;
                while (nc < body_buf.len + bytes_available) nc *= 2;
                uint8_t *tmp = realloc(body_buf.data, nc);
                if (!tmp) break;
                body_buf.data = tmp; body_buf.cap = nc;
            }
            bytes_read = 0;
            fn_WinHttpReadData(hRequest, body_buf.data + body_buf.len,
                               bytes_available, &bytes_read);
            body_buf.len += bytes_read;
        }
        response->body = body_buf.data;
        response->body_len = body_buf.len;
    }

    /* Final URL — WinHTTP doesn't easily expose this after redirects */
    response->final_url = strdup(url);

cleanup:
    if (hRequest) fn_WinHttpCloseHandle(hRequest);
    if (hConnect) fn_WinHttpCloseHandle(hConnect);
    if (hSession) fn_WinHttpCloseHandle(hSession);
    free(wurl);
    free(wmethod);
    return response;
}

/* =========================================================================
 * Public API — dispatches to the appropriate backend at runtime
 * ========================================================================= */

QJS_HTTPResponse *qjs_http_request(
    const char *method, const char *url,
    const char *const *hnames, const char *const *hvalues, int hcount,
    const uint8_t *body, size_t body_len,
    int max_redirects, char **err_msg)
{
    *err_msg = NULL;

    if (IsWindows()) {
        /* On Windows: try WinHTTP first (always available), fall back to libcurl */
        if (load_winhttp()) {
            return winhttp_request(method, url, hnames, hvalues, hcount,
                                   body, body_len, max_redirects, err_msg);
        }
        if (load_curl()) {
            return curl_request(method, url, hnames, hvalues, hcount,
                                body, body_len, max_redirects, err_msg);
        }
        *err_msg = strdup("fetch: could not load winhttp.dll or libcurl");
        return NULL;
    } else {
        /* On Linux/macOS/FreeBSD: use libcurl */
        if (load_curl()) {
            return curl_request(method, url, hnames, hvalues, hcount,
                                body, body_len, max_redirects, err_msg);
        }
        const char *dle = dlerror();
        char buf[512];
        snprintf(buf, sizeof(buf),
                 "fetch: libcurl not found (%s). Install libcurl (e.g. apt install libcurl4, brew install curl) to use fetch.",
                 dle ? dle : "unknown error");
        *err_msg = strdup(buf);
        return NULL;
    }
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
    if (IsWindows())
        return load_winhttp() || load_curl();
    return load_curl();
}
