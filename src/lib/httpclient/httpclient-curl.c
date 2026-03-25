/*
 * HTTP client implementation using libcurl (Unix-like platforms).
 */

#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <curl/curl.h>
#include "httpclient.h"
#include "httpclient-common.h"

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
    CURL *curl;
    CURLcode res;
    Buffer resp_body;
    HeaderCtx resp_headers;
    struct curl_slist *header_list = NULL;
    QJS_HTTPResponse *response = NULL;

    *err_msg = NULL;
    buf_init(&resp_body);
    header_ctx_init(&resp_headers);

    curl = curl_easy_init();
    if (!curl) {
        *err_msg = strdup("Failed to initialize libcurl");
        return NULL;
    }

    /* URL */
    curl_easy_setopt(curl, CURLOPT_URL, url);

    /* Method */
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, method);

    /* Request headers */
    for (int i = 0; i < req_header_count; i++) {
        char header_line[4096];
        snprintf(header_line, sizeof(header_line), "%s: %s",
                 req_header_names[i], req_header_values[i]);
        header_list = curl_slist_append(header_list, header_line);
    }
    if (header_list)
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, header_list);

    /* Request body */
    if (body && body_len > 0) {
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, (long)body_len);
    }

    /* Redirects */
    if (max_redirects > 0) {
        curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
        curl_easy_setopt(curl, CURLOPT_MAXREDIRS, (long)max_redirects);
    } else {
        curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 0L);
    }

    /* Response callbacks */
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, curl_write_cb);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &resp_body);
    curl_easy_setopt(curl, CURLOPT_HEADERFUNCTION, curl_header_cb);
    curl_easy_setopt(curl, CURLOPT_HEADERDATA, &resp_headers);

    /* Timeout (30 seconds) */
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 30L);

    /* Accept any encoding the server supports */
    curl_easy_setopt(curl, CURLOPT_ACCEPT_ENCODING, "");

    /* Perform the request */
    res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        *err_msg = strdup(curl_easy_strerror(res));
        goto cleanup;
    }

    /* Build response */
    response = calloc(1, sizeof(QJS_HTTPResponse));
    if (!response) {
        *err_msg = strdup("Out of memory");
        goto cleanup;
    }

    /* Status code */
    long status_code;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &status_code);
    response->status_code = (int)status_code;

    /* Status text */
    response->status_text = resp_headers.status_text
        ? strdup(resp_headers.status_text)
        : strdup("");

    /* Final URL (after redirects) */
    char *effective_url = NULL;
    curl_easy_getinfo(curl, CURLINFO_EFFECTIVE_URL, &effective_url);
    response->final_url = effective_url ? strdup(effective_url) : strdup(url);

    /* Headers - transfer ownership from HeaderCtx to response */
    response->header_names = resp_headers.names;
    response->header_values = resp_headers.values;
    response->header_count = resp_headers.count;
    /* Prevent header_ctx_free from freeing these */
    resp_headers.names = NULL;
    resp_headers.values = NULL;
    resp_headers.count = 0;

    /* Body - transfer ownership */
    response->body = resp_body.data;
    response->body_len = resp_body.len;
    resp_body.data = NULL;
    resp_body.len = 0;

cleanup:
    curl_slist_free_all(header_list);
    curl_easy_cleanup(curl);
    buf_free(&resp_body);
    header_ctx_free(&resp_headers);
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
