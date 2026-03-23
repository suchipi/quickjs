/*
 * HTTP client stub for platforms without networking (WASM/WASI, or CONFIG_FETCH=0).
 */

#include <stdlib.h>
#include <string.h>
#include "httpclient.h"

QJS_HTTPResponse *qjs_http_request(
    const char *method,
    const char *url,
    const char *const *header_names,
    const char *const *header_values,
    int header_count,
    const uint8_t *body,
    size_t body_len,
    int max_redirects,
    char **err_msg)
{
    *err_msg = strdup("fetch is not supported on this platform");
    return NULL;
}

void qjs_http_response_free(QJS_HTTPResponse *resp) {
    (void)resp;
}

int qjs_http_available(void) {
    return 0;
}
