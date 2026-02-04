#include <stdlib.h>
#include <string.h>
#include "utf-conv.h"

static void *default_malloc(size_t size, void *opaque)
{
    (void)opaque;
    return malloc(size);
}

static inline void set_error(int *error, size_t *error_offset,
                              int code, size_t offset)
{
    if (error) *error = code;
    if (error_offset) *error_offset = offset;
}

const char *utf_conv_strerror(int error_code)
{
    switch (error_code) {
    case UTF_CONV_OK:
        return "no error";
    case UTF_CONV_ERR_ALLOC_FAILED:
        return "memory allocation failed";
    case UTF_CONV_ERR_UNEXPECTED_CONT:
        return "unexpected UTF-8 continuation byte";
    case UTF_CONV_ERR_INVALID_LEAD:
        return "invalid UTF-8 lead byte";
    case UTF_CONV_ERR_TRUNCATED_SEQ:
        return "truncated UTF-8 multi-byte sequence";
    case UTF_CONV_ERR_CODEPOINT_RANGE:
        return "codepoint out of range (> U+10FFFF)";
    case UTF_CONV_ERR_SURROGATE_IN_UTF8:
        return "surrogate codepoint encoded in UTF-8";
    case UTF_CONV_ERR_TRUNCATED_PAIR:
        return "high surrogate at end of UTF-16 input";
    case UTF_CONV_ERR_MISSING_LOW:
        return "high surrogate not followed by low surrogate";
    case UTF_CONV_ERR_UNEXPECTED_LOW:
        return "unexpected low surrogate in UTF-16 input";
    default:
        return "unknown error";
    }
}

/*
 * Decode one codepoint from a UTF-8 byte stream.
 * Returns the codepoint, advances *src past it.
 * On error, returns (uint32_t)-1 and sets *err_code.
 */
static uint32_t decode_utf8(const uint8_t **src, int *err_code)
{
    const uint8_t *cursor = *src;
    uint32_t codepoint = *cursor;

    if (codepoint < 0x80) {
        *src = cursor + 1;
        return codepoint;
    }

    int seq_len;
    uint32_t min_codepoint;
    if (codepoint < 0xc0) {
        *err_code = UTF_CONV_ERR_UNEXPECTED_CONT;
        return (uint32_t)-1;
    } else if (codepoint < 0xe0) {
        seq_len = 2;
        codepoint &= 0x1f;
        min_codepoint = 0x80;
    } else if (codepoint < 0xf0) {
        seq_len = 3;
        codepoint &= 0x0f;
        min_codepoint = 0x800;
    } else if (codepoint < 0xf8) {
        seq_len = 4;
        codepoint &= 0x07;
        min_codepoint = 0x10000;
    } else {
        *err_code = UTF_CONV_ERR_INVALID_LEAD;
        return (uint32_t)-1;
    }

    for (int idx = 1; idx < seq_len; idx++) {
        if ((cursor[idx] & 0xc0) != 0x80) {
            *err_code = UTF_CONV_ERR_TRUNCATED_SEQ;
            return (uint32_t)-1;
        }
        codepoint = (codepoint << 6) | (cursor[idx] & 0x3f);
    }

    /* reject overlong encodings */
    if (codepoint < min_codepoint) {
        *err_code = UTF_CONV_ERR_INVALID_LEAD;
        return (uint32_t)-1;
    }

    if (codepoint > 0x10ffff) {
        *err_code = UTF_CONV_ERR_CODEPOINT_RANGE;
        return (uint32_t)-1;
    }

    if (codepoint >= 0xd800 && codepoint <= 0xdfff) {
        *err_code = UTF_CONV_ERR_SURROGATE_IN_UTF8;
        return (uint32_t)-1;
    }

    *src = cursor + seq_len;
    return codepoint;
}

uint16_t *utf8_to_utf16(const char *utf8, size_t *out_len, int *error,
                         size_t *error_offset,
                         utf_conv_malloc_fn alloc, void *opaque)
{
    const uint8_t *src;
    const uint8_t *start;
    uint16_t *result, *dest;
    size_t count;
    uint32_t codepoint;
    int err_code;

    if (alloc == NULL)
        alloc = default_malloc;

    /* first pass: count UTF-16 code units needed */
    count = 0;
    start = (const uint8_t *)utf8;
    src = start;
    while (*src) {
        err_code = UTF_CONV_OK;
        codepoint = decode_utf8(&src, &err_code);
        if (codepoint == (uint32_t)-1) {
            set_error(error, error_offset, err_code, (size_t)(src - start));
            return NULL;
        }

        if (codepoint >= 0x10000)
            count += 2; /* surrogate pair */
        else
            count += 1;
    }

    result = (uint16_t *)alloc((count + 1) * sizeof(uint16_t), opaque);
    if (result == NULL) {
        set_error(error, error_offset, UTF_CONV_ERR_ALLOC_FAILED, 0);
        return NULL;
    }

    /* second pass: encode */
    dest = result;
    src = start;
    while (*src) {
        err_code = UTF_CONV_OK;
        codepoint = decode_utf8(&src, &err_code);
        /* errors already caught in first pass */

        if (codepoint >= 0x10000) {
            codepoint -= 0x10000;
            *dest++ = 0xd800 | (codepoint >> 10);
            *dest++ = 0xdc00 | (codepoint & 0x3ff);
        } else {
            *dest++ = (uint16_t)codepoint;
        }
    }
    *dest = 0;

    set_error(error, error_offset, UTF_CONV_OK, 0);
    if (out_len != NULL)
        *out_len = count;
    return result;
}

char *utf16_to_utf8(const uint16_t *utf16, size_t utf16_len, size_t *out_len,
                     int *error, size_t *error_offset,
                     utf_conv_malloc_fn alloc, void *opaque)
{
    const uint16_t *src, *end;
    char *result;
    uint8_t *dest;
    size_t byte_count;
    uint32_t codepoint;

    if (alloc == NULL)
        alloc = default_malloc;

    /* determine length */
    if (utf16_len == (size_t)-1) {
        utf16_len = 0;
        while (utf16[utf16_len] != 0)
            utf16_len++;
    }

    end = utf16 + utf16_len;

    /* first pass: count UTF-8 bytes needed */
    byte_count = 0;
    src = utf16;
    while (src < end) {
        codepoint = *src++;
        if (codepoint >= 0xd800 && codepoint <= 0xdbff) {
            /* high surrogate */
            if (src >= end) {
                set_error(error, error_offset, UTF_CONV_ERR_TRUNCATED_PAIR,
                          (size_t)((src - 1) - utf16) * sizeof(uint16_t));
                return NULL;
            }
            uint32_t low_surrogate = *src;
            if (low_surrogate < 0xdc00 || low_surrogate > 0xdfff) {
                set_error(error, error_offset, UTF_CONV_ERR_MISSING_LOW,
                          (size_t)((src - 1) - utf16) * sizeof(uint16_t));
                return NULL;
            }
            src++;
            codepoint = 0x10000 + ((codepoint - 0xd800) << 10) + (low_surrogate - 0xdc00);
        } else if (codepoint >= 0xdc00 && codepoint <= 0xdfff) {
            set_error(error, error_offset, UTF_CONV_ERR_UNEXPECTED_LOW,
                      (size_t)((src - 1) - utf16) * sizeof(uint16_t));
            return NULL;
        }

        if (codepoint < 0x80)
            byte_count += 1;
        else if (codepoint < 0x800)
            byte_count += 2;
        else if (codepoint < 0x10000)
            byte_count += 3;
        else
            byte_count += 4;
    }

    result = (char *)alloc(byte_count + 1, opaque);
    if (result == NULL) {
        set_error(error, error_offset, UTF_CONV_ERR_ALLOC_FAILED, 0);
        return NULL;
    }

    /* second pass: encode */
    dest = (uint8_t *)result;
    src = utf16;
    while (src < end) {
        codepoint = *src++;
        if (codepoint >= 0xd800 && codepoint <= 0xdbff) {
            uint32_t low_surrogate = *src++;
            codepoint = 0x10000 + ((codepoint - 0xd800) << 10) + (low_surrogate - 0xdc00);
        }

        if (codepoint < 0x80) {
            *dest++ = (uint8_t)codepoint;
        } else if (codepoint < 0x800) {
            *dest++ = 0xc0 | (codepoint >> 6);
            *dest++ = 0x80 | (codepoint & 0x3f);
        } else if (codepoint < 0x10000) {
            *dest++ = 0xe0 | (codepoint >> 12);
            *dest++ = 0x80 | ((codepoint >> 6) & 0x3f);
            *dest++ = 0x80 | (codepoint & 0x3f);
        } else {
            *dest++ = 0xf0 | (codepoint >> 18);
            *dest++ = 0x80 | ((codepoint >> 12) & 0x3f);
            *dest++ = 0x80 | ((codepoint >> 6) & 0x3f);
            *dest++ = 0x80 | (codepoint & 0x3f);
        }
    }
    *dest = '\0';

    set_error(error, error_offset, UTF_CONV_OK, 0);
    if (out_len != NULL)
        *out_len = byte_count;
    return result;
}
