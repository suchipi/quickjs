/*
 * HTTP client implementation using libcurl (Unix-like platforms).
 */

#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <curl/curl.h>
#include "httpclient.h"

/* Growing buffer for accumulating response data */
typedef struct {
    uint8_t *data;
    size_t len;
    size_t cap;
} Buffer;

static void buf_init(Buffer *b) {
    b->data = NULL;
    b->len = 0;
    b->cap = 0;
}

static int buf_append(Buffer *b, const void *src, size_t n) {
    if (b->len + n > b->cap) {
        size_t new_cap = (b->cap == 0) ? 4096 : b->cap;
        while (new_cap < b->len + n)
            new_cap *= 2;
        uint8_t *tmp = realloc(b->data, new_cap);
        if (!tmp) return -1;
        b->data = tmp;
        b->cap = new_cap;
    }
    memcpy(b->data + b->len, src, n);
    b->len += n;
    return 0;
}

static void buf_free(Buffer *b) {
    free(b->data);
    b->data = NULL;
    b->len = 0;
    b->cap = 0;
}

/* Header parsing context */
typedef struct {
    char **names;
    char **values;
    int count;
    int cap;
    char *status_text;
} HeaderCtx;

static void header_ctx_init(HeaderCtx *h) {
    h->names = NULL;
    h->values = NULL;
    h->count = 0;
    h->cap = 0;
    h->status_text = NULL;
}

static int header_ctx_add(HeaderCtx *h, const char *name, size_t name_len,
                          const char *value, size_t value_len) {
    if (h->count >= h->cap) {
        int new_cap = (h->cap == 0) ? 16 : h->cap * 2;
        char **nn = realloc(h->names, new_cap * sizeof(char *));
        char **nv = realloc(h->values, new_cap * sizeof(char *));
        if (!nn || !nv) {
            free(nn);
            free(nv);
            return -1;
        }
        h->names = nn;
        h->values = nv;
        h->cap = new_cap;
    }
    h->names[h->count] = strndup(name, name_len);
    h->values[h->count] = strndup(value, value_len);
    if (!h->names[h->count] || !h->values[h->count])
        return -1;
    h->count++;
    return 0;
}

static void header_ctx_free(HeaderCtx *h) {
    for (int i = 0; i < h->count; i++) {
        free(h->names[i]);
        free(h->values[i]);
    }
    free(h->names);
    free(h->values);
    free(h->status_text);
}

/* libcurl write callback: accumulates body data */
static size_t write_callback(char *ptr, size_t size, size_t nmemb, void *userdata) {
    Buffer *b = (Buffer *)userdata;
    size_t total = size * nmemb;
    if (buf_append(b, ptr, total) < 0)
        return 0;
    return total;
}

/* libcurl header callback: parses response headers */
static size_t header_callback(char *buffer, size_t size, size_t nitems, void *userdata) {
    HeaderCtx *h = (HeaderCtx *)userdata;
    size_t total = size * nitems;

    /* Check for status line (e.g. "HTTP/1.1 200 OK\r\n") */
    if (total >= 5 && strncmp(buffer, "HTTP/", 5) == 0) {
        /* New response (could be after a redirect) — clear previous headers */
        for (int i = 0; i < h->count; i++) {
            free(h->names[i]);
            free(h->values[i]);
        }
        h->count = 0;
        free(h->status_text);
        h->status_text = NULL;

        /* Extract status text after the status code */
        const char *p = buffer;
        const char *end = buffer + total;
        /* Skip "HTTP/x.x " */
        while (p < end && *p != ' ') p++;
        if (p < end) p++; /* skip space */
        /* Skip status code */
        while (p < end && *p != ' ') p++;
        if (p < end) p++; /* skip space */
        /* Rest is the status text (trim trailing \r\n) */
        const char *text_start = p;
        const char *text_end = end;
        while (text_end > text_start &&
               (text_end[-1] == '\r' || text_end[-1] == '\n'))
            text_end--;
        if (text_end > text_start) {
            h->status_text = strndup(text_start, text_end - text_start);
        }
        return total;
    }

    /* Skip empty line (end of headers) */
    if (total <= 2)
        return total;

    /* Parse "Name: Value\r\n" */
    const char *colon = memchr(buffer, ':', total);
    if (!colon)
        return total;

    size_t name_len = colon - buffer;
    const char *val_start = colon + 1;
    size_t remaining = total - (val_start - buffer);

    /* Skip leading whitespace in value */
    while (remaining > 0 && (*val_start == ' ' || *val_start == '\t')) {
        val_start++;
        remaining--;
    }
    /* Trim trailing \r\n */
    while (remaining > 0 &&
           (val_start[remaining - 1] == '\r' || val_start[remaining - 1] == '\n'))
        remaining--;

    header_ctx_add(h, buffer, name_len, val_start, remaining);
    return total;
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
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &resp_body);
    curl_easy_setopt(curl, CURLOPT_HEADERFUNCTION, header_callback);
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
