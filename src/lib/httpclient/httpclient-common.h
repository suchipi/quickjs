/*
 * Shared utilities for httpclient implementations.
 *
 * This header is included by httpclient-curl.c and httpclient-cosmo.c.
 * It provides a growing buffer and header parsing context used by both
 * libcurl-based implementations.
 */

#ifndef HTTPCLIENT_COMMON_H
#define HTTPCLIENT_COMMON_H

#include <stdlib.h>
#include <string.h>
#include <stdint.h>

/* Growing byte buffer for accumulating response data */
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

/* Header parsing context for collecting response headers */
typedef struct {
    char **names;
    char **values;
    int count;
    int cap;
    char *status_text;
} HeaderCtx;

static void header_ctx_init(HeaderCtx *h) {
    memset(h, 0, sizeof(*h));
}

static int header_ctx_add(HeaderCtx *h, const char *name, size_t name_len,
                          const char *value, size_t value_len) {
    if (h->count >= h->cap) {
        int new_cap = (h->cap == 0) ? 16 : h->cap * 2;
        char **nn = realloc(h->names, new_cap * sizeof(char *));
        char **nv = realloc(h->values, new_cap * sizeof(char *));
        if (!nn || !nv) return -1;
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

/* libcurl write callback: accumulates body data into a Buffer */
static size_t curl_write_cb(char *ptr, size_t size, size_t nmemb, void *userdata) {
    Buffer *b = (Buffer *)userdata;
    size_t total = size * nmemb;
    if (buf_append(b, ptr, total) < 0)
        return 0;
    return total;
}

/* libcurl header callback: parses status line and headers into HeaderCtx */
static size_t curl_header_cb(char *buf, size_t size, size_t nitems, void *userdata) {
    HeaderCtx *h = (HeaderCtx *)userdata;
    size_t total = size * nitems;

    /* Status line: "HTTP/x.x CODE REASON\r\n" */
    if (total >= 5 && strncmp(buf, "HTTP/", 5) == 0) {
        /* Clear any previous headers (happens on redirects) */
        for (int i = 0; i < h->count; i++) {
            free(h->names[i]);
            free(h->values[i]);
        }
        h->count = 0;
        free(h->status_text);
        h->status_text = NULL;

        /* Extract status text (skip "HTTP/x.x CODE ") */
        const char *p = buf;
        const char *end = buf + total;
        while (p < end && *p != ' ') p++;  /* skip version */
        if (p < end) p++;
        while (p < end && *p != ' ') p++;  /* skip code */
        if (p < end) p++;
        const char *text_start = p;
        const char *text_end = end;
        while (text_end > text_start &&
               (text_end[-1] == '\r' || text_end[-1] == '\n'))
            text_end--;
        if (text_end > text_start)
            h->status_text = strndup(text_start, text_end - text_start);
        return total;
    }

    /* Empty line terminates headers */
    if (total <= 2)
        return total;

    /* Header line: "Name: Value\r\n" */
    const char *colon = memchr(buf, ':', total);
    if (!colon)
        return total;
    size_t name_len = colon - buf;
    const char *val_start = colon + 1;
    size_t remaining = total - (val_start - buf);
    while (remaining > 0 && (*val_start == ' ' || *val_start == '\t')) {
        val_start++;
        remaining--;
    }
    while (remaining > 0 &&
           (val_start[remaining - 1] == '\r' || val_start[remaining - 1] == '\n'))
        remaining--;
    header_ctx_add(h, buf, name_len, val_start, remaining);
    return total;
}

#endif /* HTTPCLIENT_COMMON_H */
