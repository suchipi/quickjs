#ifndef UTF_CONV_H
#define UTF_CONV_H

#include <stdint.h>
#include <stddef.h>

typedef void *(*utf_conv_malloc_fn)(size_t size, void *opaque);

/* error codes */
#define UTF_CONV_OK                     0
#define UTF_CONV_ERR_ALLOC_FAILED       1
#define UTF_CONV_ERR_UNEXPECTED_CONT    2  /* unexpected continuation byte */
#define UTF_CONV_ERR_INVALID_LEAD       3  /* invalid lead byte (>= 0xf8) */
#define UTF_CONV_ERR_TRUNCATED_SEQ      4  /* truncated multi-byte sequence */
#define UTF_CONV_ERR_CODEPOINT_RANGE    5  /* codepoint > U+10FFFF */
#define UTF_CONV_ERR_SURROGATE_IN_UTF8  6  /* surrogate half encoded in UTF-8 */
#define UTF_CONV_ERR_TRUNCATED_PAIR     7  /* high surrogate at end of input */
#define UTF_CONV_ERR_MISSING_LOW        8  /* high surrogate not followed by low */
#define UTF_CONV_ERR_UNEXPECTED_LOW     9  /* unexpected low surrogate */

/*
 * Return a constant string describing a UTF_CONV_ERR_* error code.
 */
const char *utf_conv_strerror(int error_code);

/*
 * Convert a UTF-8 string to a newly allocated UTF-16 (little-endian) string.
 *
 * utf8: input null-terminated UTF-8 string
 * out_len: if non-NULL, receives the number of uint16_t code units in the
 *          output (not counting the null terminator)
 * error: if non-NULL, receives a UTF_CONV_ERR_* code on failure (set to
 *        UTF_CONV_OK on success)
 * error_offset: if non-NULL, receives the byte offset in the input where
 *               the error was detected (only meaningful when returning NULL)
 * alloc: allocation function (if NULL, uses stdlib malloc)
 * opaque: opaque pointer passed through to alloc
 *
 * Returns a null-terminated UTF-16LE array, or NULL on failure.
 * The caller must free the returned pointer using the corresponding
 * free function.
 */
uint16_t *utf8_to_utf16(const char *utf8, size_t *out_len, int *error,
                         size_t *error_offset,
                         utf_conv_malloc_fn alloc, void *opaque);

/*
 * Convert a UTF-16 (little-endian) string to a newly allocated UTF-8 string.
 *
 * utf16: input null-terminated UTF-16LE string
 * utf16_len: number of uint16_t code units (not counting null terminator),
 *            or (size_t)-1 to auto-detect from null terminator
 * out_len: if non-NULL, receives the byte length of the output
 *          (not counting the null terminator)
 * error: if non-NULL, receives a UTF_CONV_ERR_* code on failure (set to
 *        UTF_CONV_OK on success)
 * error_offset: if non-NULL, receives the byte offset in the input where
 *               the error was detected (only meaningful when returning NULL)
 * alloc: allocation function (if NULL, uses stdlib malloc)
 * opaque: opaque pointer passed through to alloc
 *
 * Returns a null-terminated UTF-8 string, or NULL on failure.
 * The caller must free the returned pointer using the corresponding
 * free function.
 */
char *utf16_to_utf8(const uint16_t *utf16, size_t utf16_len, size_t *out_len,
                     int *error, size_t *error_offset,
                     utf_conv_malloc_fn alloc, void *opaque);

#endif /* UTF_CONV_H */
