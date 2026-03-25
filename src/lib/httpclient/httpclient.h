/*
 * Cross-platform synchronous HTTP client library
 *
 * Uses libcurl on Unix-like platforms, WinHTTP on Windows.
 * Thread-safe: each call is independent (no shared state).
 */
#ifndef HTTPCLIENT_H
#define HTTPCLIENT_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct QJS_HTTPResponse {
    int status_code;
    char *status_text;       /* e.g. "OK", "Not Found" */
    char **header_names;     /* array of header name strings */
    char **header_values;    /* array of header value strings */
    int header_count;
    uint8_t *body;
    size_t body_len;
    char *final_url;         /* final URL after redirects */
} QJS_HTTPResponse;

/*
 * Perform a synchronous HTTP request. Returns NULL on error and sets *err_msg
 * (caller must free *err_msg with free()).
 *
 * On success, returns a heap-allocated QJS_HTTPResponse that the caller must
 * free with qjs_http_response_free().
 */
QJS_HTTPResponse *qjs_http_request(
    const char *method,
    const char *url,
    const char *const *header_names,
    const char *const *header_values,
    int header_count,
    const uint8_t *body,
    size_t body_len,
    int max_redirects,
    char **err_msg
);

void qjs_http_response_free(QJS_HTTPResponse *resp);

/* Returns 1 if HTTP is supported on this platform, 0 otherwise. */
int qjs_http_available(void);

#ifdef __cplusplus
}
#endif

#endif /* HTTPCLIENT_H */
