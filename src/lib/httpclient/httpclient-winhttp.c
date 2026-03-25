/*
 * HTTP client implementation using WinHTTP (Windows).
 *
 * Uses utf-conv.h for UTF-8 <-> UTF-16 conversion instead of
 * MultiByteToWideChar/WideCharToMultiByte.
 */

#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <windows.h>
#include <winhttp.h>
#include "httpclient.h"
#include "utf-conv.h"

/* mingw doesn't provide strndup */
static char *qjs_strndup(const char *s, size_t n) {
    size_t len = strlen(s);
    if (n < len) len = n;
    char *r = malloc(len + 1);
    if (r) { memcpy(r, s, len); r[len] = '\0'; }
    return r;
}
#define strndup qjs_strndup

/* Convert UTF-8 to wide string using utf-conv. Caller must free the result. */
static wchar_t *utf8_to_wide(const char *str) {
    if (!str) return NULL;
    return (wchar_t *)utf8_to_utf16(str, NULL, NULL, NULL, NULL, NULL);
}

/* Convert wide string to UTF-8 using utf-conv. Caller must free the result. */
static char *wide_to_utf8(const wchar_t *wstr) {
    if (!wstr) return NULL;
    return utf16_to_utf8((const uint16_t *)wstr, (size_t)-1, NULL, NULL, NULL, NULL, NULL);
}

QJS_HTTPResponse *qjs_http_request(
    const char *method,
    const char *url,
    const char *const *req_header_names,
    const char *const *req_header_values,
    int req_header_count,
    const uint8_t *body,
    size_t body_len,
    int max_redirects,
    char **err_msg)
{
    HINTERNET hSession = NULL, hConnect = NULL, hRequest = NULL;
    QJS_HTTPResponse *response = NULL;
    wchar_t *wurl = NULL, *wmethod = NULL;
    URL_COMPONENTS urlComp;
    wchar_t hostName[256], urlPath[4096];

    *err_msg = NULL;

    wurl = utf8_to_wide(url);
    wmethod = utf8_to_wide(method);
    if (!wurl || !wmethod) {
        *err_msg = strdup("Failed to convert URL to wide string");
        goto cleanup;
    }

    /* Parse URL */
    memset(&urlComp, 0, sizeof(urlComp));
    urlComp.dwStructSize = sizeof(urlComp);
    urlComp.lpszHostName = hostName;
    urlComp.dwHostNameLength = sizeof(hostName) / sizeof(hostName[0]);
    urlComp.lpszUrlPath = urlPath;
    urlComp.dwUrlPathLength = sizeof(urlPath) / sizeof(urlPath[0]);
    if (!WinHttpCrackUrl(wurl, 0, 0, &urlComp)) {
        *err_msg = strdup("Failed to parse URL");
        goto cleanup;
    }

    /* Open session */
    hSession = WinHttpOpen(L"quickjs-fetch/1.0",
                           WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
                           WINHTTP_NO_PROXY_NAME,
                           WINHTTP_NO_PROXY_BYPASS, 0);
    if (!hSession) {
        *err_msg = strdup("WinHttpOpen failed");
        goto cleanup;
    }

    /* Set timeouts (30 seconds) */
    WinHttpSetTimeouts(hSession, 30000, 30000, 30000, 30000);

    /* Connect */
    hConnect = WinHttpConnect(hSession, hostName, urlComp.nPort, 0);
    if (!hConnect) {
        *err_msg = strdup("WinHttpConnect failed");
        goto cleanup;
    }

    /* Open request */
    DWORD flags = (urlComp.nScheme == INTERNET_SCHEME_HTTPS)
                  ? WINHTTP_FLAG_SECURE : 0;
    hRequest = WinHttpOpenRequest(hConnect, wmethod, urlPath,
                                  NULL, WINHTTP_NO_REFERER,
                                  WINHTTP_DEFAULT_ACCEPT_TYPES, flags);
    if (!hRequest) {
        *err_msg = strdup("WinHttpOpenRequest failed");
        goto cleanup;
    }

    /* Redirect policy */
    if (max_redirects <= 0) {
        DWORD opt = WINHTTP_OPTION_REDIRECT_POLICY_NEVER;
        WinHttpSetOption(hRequest, WINHTTP_OPTION_REDIRECT_POLICY,
                         &opt, sizeof(opt));
    }

    /* Add request headers */
    for (int i = 0; i < req_header_count; i++) {
        char line[4096];
        snprintf(line, sizeof(line), "%s: %s",
                 req_header_names[i], req_header_values[i]);
        wchar_t *wline = utf8_to_wide(line);
        if (wline) {
            WinHttpAddRequestHeaders(hRequest, wline, -1,
                                     WINHTTP_ADDREQ_FLAG_ADD |
                                     WINHTTP_ADDREQ_FLAG_REPLACE);
            free(wline);
        }
    }

    /* Send request */
    if (!WinHttpSendRequest(hRequest,
                            WINHTTP_NO_ADDITIONAL_HEADERS, 0,
                            (body && body_len > 0) ? (LPVOID)body : WINHTTP_NO_REQUEST_DATA,
                            (DWORD)body_len, (DWORD)body_len, 0)) {
        *err_msg = strdup("WinHttpSendRequest failed");
        goto cleanup;
    }

    /* Receive response */
    if (!WinHttpReceiveResponse(hRequest, NULL)) {
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
    DWORD status_code = 0;
    DWORD size = sizeof(status_code);
    WinHttpQueryHeaders(hRequest, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
                        WINHTTP_HEADER_NAME_BY_INDEX, &status_code, &size,
                        WINHTTP_NO_HEADER_INDEX);
    response->status_code = (int)status_code;

    /* Status text */
    size = 0;
    WinHttpQueryHeaders(hRequest, WINHTTP_QUERY_STATUS_TEXT,
                        WINHTTP_HEADER_NAME_BY_INDEX, NULL, &size,
                        WINHTTP_NO_HEADER_INDEX);
    if (size > 0) {
        wchar_t *wstatus = malloc(size);
        if (wstatus) {
            WinHttpQueryHeaders(hRequest, WINHTTP_QUERY_STATUS_TEXT,
                                WINHTTP_HEADER_NAME_BY_INDEX, wstatus, &size,
                                WINHTTP_NO_HEADER_INDEX);
            response->status_text = wide_to_utf8(wstatus);
            free(wstatus);
        }
    }
    if (!response->status_text)
        response->status_text = strdup("");

    /* Response headers (raw) */
    size = 0;
    WinHttpQueryHeaders(hRequest, WINHTTP_QUERY_RAW_HEADERS_CRLF,
                        WINHTTP_HEADER_NAME_BY_INDEX, NULL, &size,
                        WINHTTP_NO_HEADER_INDEX);
    if (size > 0) {
        wchar_t *raw = malloc(size);
        if (raw) {
            WinHttpQueryHeaders(hRequest, WINHTTP_QUERY_RAW_HEADERS_CRLF,
                                WINHTTP_HEADER_NAME_BY_INDEX, raw, &size,
                                WINHTTP_NO_HEADER_INDEX);
            char *raw_utf8 = wide_to_utf8(raw);
            free(raw);
            if (raw_utf8) {
                /* Parse "Name: Value\r\n" lines, skip status line */
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
                        /* Skip ": " */
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

    /* Read body */
    {
        uint8_t *body_buf = NULL;
        size_t body_total = 0;
        size_t body_cap = 0;
        DWORD bytes_available, bytes_read;

        for (;;) {
            bytes_available = 0;
            if (!WinHttpQueryDataAvailable(hRequest, &bytes_available))
                break;
            if (bytes_available == 0)
                break;
            if (body_total + bytes_available > body_cap) {
                body_cap = (body_cap == 0) ? 4096 : body_cap;
                while (body_cap < body_total + bytes_available)
                    body_cap *= 2;
                uint8_t *tmp = realloc(body_buf, body_cap);
                if (!tmp) break;
                body_buf = tmp;
            }
            bytes_read = 0;
            WinHttpReadData(hRequest, body_buf + body_total,
                            bytes_available, &bytes_read);
            body_total += bytes_read;
        }
        response->body = body_buf;
        response->body_len = body_total;
    }

    /* Final URL - WinHTTP doesn't easily expose this, use original */
    response->final_url = strdup(url);

cleanup:
    if (hRequest) WinHttpCloseHandle(hRequest);
    if (hConnect) WinHttpCloseHandle(hConnect);
    if (hSession) WinHttpCloseHandle(hSession);
    free(wurl);
    free(wmethod);
    return response;
}

void qjs_http_response_free(QJS_HTTPResponse *resp) {
    if (!resp) return;
    free(resp->status_text);
    free(resp->final_url);
    for (int i = 0; i < resp->header_count; i++) {
        free(resp->header_names[i]);
        free(resp->header_values[i]);
    }
    free(resp->header_names);
    free(resp->header_values);
    free(resp->body);
    free(resp);
}

int qjs_http_available(void) {
    return 1;
}
