#include <string.h>
#include <errno.h>
#include <ctype.h>

#include "cutils.h"
#include "quickjs-encoding.h"

#ifndef CONFIG_SHIFTJIS
#define CONFIG_SHIFTJIS 1
#endif

#if CONFIG_SHIFTJIS
#include "libshiftjis.h"
#endif

/* ---- existing toUtf8/fromUtf8 functions ---- */

static JSValue js_encoding_toUtf8(JSContext *ctx, JSValueConst this_val,
                                  int argc, JSValueConst *argv)
{
  size_t len;
  JSValue input;
  uint8_t *buf;

  input = argv[0];
  buf = JS_GetArrayBuffer(ctx, &len, input);
  if (buf == NULL) {
    return JS_ThrowError(ctx, "input must be an ArrayBuffer");
  }

  return JS_NewStringLen(ctx, (char *)buf, len);
}

static JSValue js_encoding_fromUtf8(JSContext *ctx, JSValueConst this_val,
                                    int argc, JSValueConst *argv)
{
  size_t len;
  JSValue input;
  const char *buf;

  input = argv[0];
  buf = JS_ToCStringLen2(ctx, &len, input, 1);
  if (buf == NULL) {
    return JS_ThrowError(ctx, "input must be a string");
  }

  JSValue ret = JS_NewArrayBufferCopy(ctx, (uint8_t*) buf, len);
  JS_FreeCString(ctx, buf);
  return ret;
}

static const JSCFunctionListEntry js_encoding_funcs[] = {
  JS_CFUNC_DEF("toUtf8", 1, js_encoding_toUtf8 ),
  JS_CFUNC_DEF("fromUtf8", 1, js_encoding_fromUtf8 ),
};

/* ---- TextEncoder / TextDecoder ---- */

typedef enum {
    ENCODING_UTF8 = 0,
    ENCODING_UTF16LE = 1,
    ENCODING_UTF16BE = 2,
#if CONFIG_SHIFTJIS
    ENCODING_SHIFT_JIS = 3,
#endif
} TextEncoding;

typedef struct {
    TextEncoding encoding;
    JS_BOOL fatal;
    JS_BOOL ignore_bom;
    uint8_t pending[4];
    int pending_len;
    JS_BOOL bom_seen;
} TextDecoderData;

static JSClassID js_text_encoder_class_id;
static JSClassID js_text_decoder_class_id;

/* ---- Helpers ---- */

/* Create a Uint8Array wrapping a copy of buf[0..len-1] */
static JSValue js_new_uint8array(JSContext *ctx, const uint8_t *buf, size_t len)
{
    JSValue ab, global, ctor, result;

    ab = JS_NewArrayBufferCopy(ctx, buf, len);
    if (JS_IsException(ab))
        return JS_EXCEPTION;

    global = JS_GetGlobalObject(ctx);
    ctor = JS_GetPropertyStr(ctx, global, "Uint8Array");
    JS_FreeValue(ctx, global);
    if (JS_IsException(ctor)) {
        JS_FreeValue(ctx, ab);
        return JS_EXCEPTION;
    }

    result = JS_CallConstructor(ctx, ctor, 1, &ab);
    JS_FreeValue(ctx, ctor);
    JS_FreeValue(ctx, ab);
    return result;
}

/* Get byte pointer + length from an ArrayBuffer, TypedArray, or DataView.
   Sets *out_buf and *out_len. Caller must JS_FreeValue(*ab_to_free) when done
   (it may be JS_UNDEFINED if not needed). Returns 0 on success, -1 on error. */
static int js_get_buffer_bytes(JSContext *ctx, JSValueConst val,
                               uint8_t **out_buf, size_t *out_len,
                               JSValue *ab_to_free)
{
    *ab_to_free = JS_UNDEFINED;

    /* Try ArrayBuffer first */
    *out_buf = JS_GetArrayBuffer(ctx, out_len, val);
    if (*out_buf != NULL)
        return 0;

    /* Clear the pending exception from failed GetArrayBuffer */
    JSValue exc = JS_GetException(ctx);
    JS_FreeValue(ctx, exc);

    /* Try as TypedArray or DataView */
    size_t byte_offset, byte_length, bpe;
    *ab_to_free = JS_GetTypedArrayBuffer(ctx, val, &byte_offset, &byte_length, &bpe);
    if (JS_IsException(*ab_to_free)) {
        *ab_to_free = JS_UNDEFINED;
        return -1;
    }

    *out_buf = JS_GetArrayBuffer(ctx, out_len, *ab_to_free);
    if (*out_buf == NULL) {
        JS_FreeValue(ctx, *ab_to_free);
        *ab_to_free = JS_UNDEFINED;
        return -1;
    }
    *out_buf += byte_offset;
    *out_len = byte_length;
    return 0;
}

/* Resolve encoding label (case-insensitive, whitespace-trimmed).
   Returns encoding enum or -1 on failure. */
static int resolve_encoding_label(const char *label)
{
    /* Trim leading whitespace */
    while (*label && isspace((unsigned char)*label)) label++;

    /* Find end (trim trailing whitespace) */
    size_t len = strlen(label);
    while (len > 0 && isspace((unsigned char)label[len - 1])) len--;

    /* Compare case-insensitively */
    if ((len == 5 && !strncasecmp(label, "utf-8", 5)) ||
        (len == 4 && !strncasecmp(label, "utf8", 4)) ||
        (len == 17 && !strncasecmp(label, "unicode-1-1-utf-8", 17)))
        return ENCODING_UTF8;

    if ((len == 8 && !strncasecmp(label, "utf-16le", 8)) ||
        (len == 6 && !strncasecmp(label, "utf-16", 6)))
        return ENCODING_UTF16LE;

    if (len == 8 && !strncasecmp(label, "utf-16be", 8))
        return ENCODING_UTF16BE;

#if CONFIG_SHIFTJIS
    if ((len == 9 && !strncasecmp(label, "shift_jis", 9)) ||
        (len == 9 && !strncasecmp(label, "shift-jis", 9)) ||
        (len == 4 && !strncasecmp(label, "sjis", 4)) ||
        (len == 10 && !strncasecmp(label, "csshiftjis", 10)) ||
        (len == 5 && !strncasecmp(label, "ms932", 5)) ||
        (len == 8 && !strncasecmp(label, "ms_kanji", 8)) ||
        (len == 11 && !strncasecmp(label, "windows-31j", 11)) ||
        (len == 6 && !strncasecmp(label, "x-sjis", 6)))
        return ENCODING_SHIFT_JIS;
#endif

    return -1;
}

static const char *encoding_name(TextEncoding enc)
{
    switch (enc) {
    case ENCODING_UTF8:    return "utf-8";
    case ENCODING_UTF16LE: return "utf-16le";
    case ENCODING_UTF16BE: return "utf-16be";
#if CONFIG_SHIFTJIS
    case ENCODING_SHIFT_JIS: return "shift_jis";
#endif
    default:               return "utf-8";
    }
}

/* Returns the expected byte length of a UTF-8 sequence given its lead byte,
   or 0 if the byte is invalid as a lead byte. */
static int utf8_seq_len(uint8_t b)
{
    if (b < 0x80) return 1;
    if (b < 0xC2) return 0;  /* 0x80-0xBF are continuation, 0xC0-0xC1 are overlong */
    if (b < 0xE0) return 2;
    if (b < 0xF0) return 3;
    if (b < 0xF5) return 4;  /* 0xF5+ would produce codepoints > U+10FFFF */
    return 0;
}

/* Decode one codepoint from a UTF-8 sequence of known length.
   Returns the codepoint, or (uint32_t)-1 if the sequence is invalid
   (bad continuation bytes, overlong, surrogate, or out of range). */
static uint32_t decode_utf8_codepoint(const uint8_t *src, int len)
{
    uint32_t cp;

    switch (len) {
    case 1:
        return src[0];
    case 2:
        if ((src[1] & 0xC0) != 0x80) return (uint32_t)-1;
        cp = ((uint32_t)(src[0] & 0x1F) << 6) | (src[1] & 0x3F);
        if (cp < 0x80) return (uint32_t)-1;  /* overlong */
        return cp;
    case 3:
        if ((src[1] & 0xC0) != 0x80 || (src[2] & 0xC0) != 0x80)
            return (uint32_t)-1;
        cp = ((uint32_t)(src[0] & 0x0F) << 12) |
             ((uint32_t)(src[1] & 0x3F) << 6) |
             (src[2] & 0x3F);
        if (cp < 0x800) return (uint32_t)-1;  /* overlong */
        if (cp >= 0xD800 && cp <= 0xDFFF) return (uint32_t)-1;  /* surrogate */
        return cp;
    case 4:
        if ((src[1] & 0xC0) != 0x80 || (src[2] & 0xC0) != 0x80 ||
            (src[3] & 0xC0) != 0x80)
            return (uint32_t)-1;
        cp = ((uint32_t)(src[0] & 0x07) << 18) |
             ((uint32_t)(src[1] & 0x3F) << 12) |
             ((uint32_t)(src[2] & 0x3F) << 6) |
             (src[3] & 0x3F);
        if (cp < 0x10000 || cp > 0x10FFFF) return (uint32_t)-1;
        return cp;
    default:
        return (uint32_t)-1;
    }
}

/* Encode a codepoint as UTF-8. Returns the number of bytes written (1-4). */
static int encode_utf8_codepoint(uint8_t *dst, uint32_t cp)
{
    if (cp < 0x80) {
        dst[0] = (uint8_t)cp;
        return 1;
    } else if (cp < 0x800) {
        dst[0] = 0xC0 | (uint8_t)(cp >> 6);
        dst[1] = 0x80 | (uint8_t)(cp & 0x3F);
        return 2;
    } else if (cp < 0x10000) {
        dst[0] = 0xE0 | (uint8_t)(cp >> 12);
        dst[1] = 0x80 | (uint8_t)((cp >> 6) & 0x3F);
        dst[2] = 0x80 | (uint8_t)(cp & 0x3F);
        return 3;
    } else {
        dst[0] = 0xF0 | (uint8_t)(cp >> 18);
        dst[1] = 0x80 | (uint8_t)((cp >> 12) & 0x3F);
        dst[2] = 0x80 | (uint8_t)((cp >> 6) & 0x3F);
        dst[3] = 0x80 | (uint8_t)(cp & 0x3F);
        return 4;
    }
}

/* U+FFFD in UTF-8 */
static const uint8_t REPLACEMENT_UTF8[] = { 0xEF, 0xBF, 0xBD };

/* ---- TextEncoder ---- */

static JSClassDef js_text_encoder_class = {
    "TextEncoder",
};

static JSValue js_text_encoder_ctor(JSContext *ctx, JSValueConst new_target,
                                    int argc, JSValueConst *argv)
{
    return JS_NewObjectClass(ctx, js_text_encoder_class_id);
}

static JSValue js_text_encoder_get_encoding(JSContext *ctx,
                                            JSValueConst this_val)
{
    return JS_NewString(ctx, "utf-8");
}

static JSValue js_text_encoder_encode(JSContext *ctx, JSValueConst this_val,
                                      int argc, JSValueConst *argv)
{
    const char *str;
    size_t len;

    if (argc < 1 || JS_IsUndefined(argv[0])) {
        return js_new_uint8array(ctx, NULL, 0);
    }

    str = JS_ToCStringLen2(ctx, &len, argv[0], 0);
    if (!str)
        return JS_EXCEPTION;

    JSValue result = js_new_uint8array(ctx, (const uint8_t *)str, len);
    JS_FreeCString(ctx, str);
    return result;
}

static JSValue js_text_encoder_encodeInto(JSContext *ctx,
                                          JSValueConst this_val,
                                          int argc, JSValueConst *argv)
{
    const char *str;
    size_t str_len;
    uint8_t *dest_buf;
    size_t dest_len;
    JSValue ab_to_free;

    if (argc < 2)
        return JS_ThrowTypeError(ctx, "encodeInto requires 2 arguments");

    str = JS_ToCStringLen2(ctx, &str_len, argv[0], 0);
    if (!str)
        return JS_EXCEPTION;

    if (js_get_buffer_bytes(ctx, argv[1], &dest_buf, &dest_len, &ab_to_free) < 0) {
        JS_FreeCString(ctx, str);
        return JS_ThrowTypeError(ctx, "second argument must be a Uint8Array");
    }

    const uint8_t *src = (const uint8_t *)str;
    size_t src_pos = 0, written = 0;
    uint64_t read_utf16 = 0;

    while (src_pos < str_len) {
        int seq = utf8_seq_len(src[src_pos]);
        if (seq == 0) {
            /* Invalid lead byte — shouldn't happen from JS_ToCStringLen2,
               but handle gracefully */
            break;
        }
        if (src_pos + seq > str_len)
            break;
        if (written + seq > dest_len)
            break;

        memcpy(dest_buf + written, src + src_pos, seq);
        written += seq;

        /* Count UTF-16 code units consumed */
        uint32_t cp = decode_utf8_codepoint(src + src_pos, seq);
        read_utf16 += (cp >= 0x10000) ? 2 : 1;

        src_pos += seq;
    }

    JS_FreeCString(ctx, str);
    JS_FreeValue(ctx, ab_to_free);

    JSValue result = JS_NewObject(ctx);
    JS_SetPropertyStr(ctx, result, "read", JS_NewInt64(ctx, read_utf16));
    JS_SetPropertyStr(ctx, result, "written", JS_NewInt64(ctx, written));
    return result;
}

static const JSCFunctionListEntry js_text_encoder_proto_funcs[] = {
    JS_CGETSET_DEF("encoding", js_text_encoder_get_encoding, NULL),
    JS_CFUNC_DEF("encode", 0, js_text_encoder_encode),
    JS_CFUNC_DEF("encodeInto", 2, js_text_encoder_encodeInto),
};

/* ---- TextDecoder ---- */

static void js_text_decoder_finalizer(JSRuntime *rt, JSValue val)
{
    TextDecoderData *data = JS_GetOpaque(val, js_text_decoder_class_id);
    if (data)
        js_free_rt(rt, data);
}

static JSClassDef js_text_decoder_class = {
    "TextDecoder",
    .finalizer = js_text_decoder_finalizer,
};

static JSValue js_text_decoder_ctor(JSContext *ctx, JSValueConst new_target,
                                    int argc, JSValueConst *argv)
{
    TextDecoderData *data;
    int enc;

    /* Parse label */
    if (argc < 1 || JS_IsUndefined(argv[0])) {
        enc = ENCODING_UTF8;
    } else {
        const char *label = JS_ToCString(ctx, argv[0]);
        if (!label)
            return JS_EXCEPTION;
        enc = resolve_encoding_label(label);
        if (enc < 0) {
            JS_ThrowRangeError(ctx, "The encoding label provided ('%s') is invalid.",
                               label);
            JS_FreeCString(ctx, label);
            return JS_EXCEPTION;
        }
        JS_FreeCString(ctx, label);
    }

    /* Parse options */
    JS_BOOL fatal = FALSE;
    JS_BOOL ignore_bom = FALSE;
    if (argc >= 2 && JS_IsObject(argv[1])) {
        JSValue v;

        v = JS_GetPropertyStr(ctx, argv[1], "fatal");
        if (JS_IsException(v))
            return JS_EXCEPTION;
        if (!JS_IsUndefined(v))
            fatal = JS_ToBool(ctx, v);
        JS_FreeValue(ctx, v);

        v = JS_GetPropertyStr(ctx, argv[1], "ignoreBOM");
        if (JS_IsException(v))
            return JS_EXCEPTION;
        if (!JS_IsUndefined(v))
            ignore_bom = JS_ToBool(ctx, v);
        JS_FreeValue(ctx, v);
    }

    JSValue obj = JS_NewObjectClass(ctx, js_text_decoder_class_id);
    if (JS_IsException(obj))
        return obj;

    data = js_mallocz(ctx, sizeof(TextDecoderData));
    if (!data) {
        JS_FreeValue(ctx, obj);
        return JS_EXCEPTION;
    }

    data->encoding = (TextEncoding)enc;
    data->fatal = fatal;
    data->ignore_bom = ignore_bom;
    data->pending_len = 0;
    data->bom_seen = FALSE;

    JS_SetOpaque(obj, data);
    return obj;
}

static JSValue js_text_decoder_get_encoding(JSContext *ctx,
                                            JSValueConst this_val)
{
    TextDecoderData *data = JS_GetOpaque(this_val, js_text_decoder_class_id);
    if (!data)
        return JS_ThrowTypeError(ctx, "not a TextDecoder");
    return JS_NewString(ctx, encoding_name(data->encoding));
}

static JSValue js_text_decoder_get_fatal(JSContext *ctx,
                                         JSValueConst this_val)
{
    TextDecoderData *data = JS_GetOpaque(this_val, js_text_decoder_class_id);
    if (!data)
        return JS_ThrowTypeError(ctx, "not a TextDecoder");
    return JS_NewBool(ctx, data->fatal);
}

static JSValue js_text_decoder_get_ignoreBOM(JSContext *ctx,
                                             JSValueConst this_val)
{
    TextDecoderData *data = JS_GetOpaque(this_val, js_text_decoder_class_id);
    if (!data)
        return JS_ThrowTypeError(ctx, "not a TextDecoder");
    return JS_NewBool(ctx, data->ignore_bom);
}

/* ---- UTF-8 decode with validation, replacement, BOM, and streaming ---- */

static JSValue decode_utf8_bytes(JSContext *ctx, TextDecoderData *data,
                                 const uint8_t *buf, size_t len,
                                 JS_BOOL stream)
{
    /* Build working buffer: pending + new input */
    size_t work_len = data->pending_len + len;
    uint8_t *work;
    int work_allocated = 0;

    if (data->pending_len > 0) {
        work = js_malloc(ctx, work_len);
        if (!work)
            return JS_EXCEPTION;
        memcpy(work, data->pending, data->pending_len);
        memcpy(work + data->pending_len, buf, len);
        work_allocated = 1;
    } else {
        work = (uint8_t *)buf;
    }
    data->pending_len = 0;

    /* Output buffer: worst case each byte becomes 3 bytes (U+FFFD) */
    size_t out_cap = work_len * 3 + 1;
    uint8_t *out = js_malloc(ctx, out_cap);
    if (!out) {
        if (work_allocated) js_free(ctx, work);
        return JS_EXCEPTION;
    }

    size_t pos = 0, out_pos = 0;

    while (pos < work_len) {
        int seq = utf8_seq_len(work[pos]);

        if (seq == 0) {
            /* Invalid lead byte */
            if (data->fatal) {
                js_free(ctx, out);
                if (work_allocated) js_free(ctx, work);
                return JS_ThrowTypeError(ctx, "The encoded data was not valid.");
            }
            memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
            out_pos += 3;
            pos += 1;
            continue;
        }

        if (pos + seq > work_len) {
            /* Incomplete sequence at end */
            if (stream) {
                data->pending_len = work_len - pos;
                memcpy(data->pending, work + pos, data->pending_len);
                break;
            } else {
                /* Each remaining byte is an error */
                while (pos < work_len) {
                    if (data->fatal) {
                        js_free(ctx, out);
                        if (work_allocated) js_free(ctx, work);
                        return JS_ThrowTypeError(ctx, "The encoded data was not valid.");
                    }
                    memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
                    out_pos += 3;
                    pos++;
                }
                break;
            }
        }

        /* Validate the sequence */
        uint32_t cp = decode_utf8_codepoint(work + pos, seq);
        if (cp == (uint32_t)-1) {
            /* Invalid sequence — advance by 1 byte per WHATWG */
            if (data->fatal) {
                js_free(ctx, out);
                if (work_allocated) js_free(ctx, work);
                return JS_ThrowTypeError(ctx, "The encoded data was not valid.");
            }
            memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
            out_pos += 3;
            pos += 1;
            continue;
        }

        /* Valid — copy the original bytes */
        memcpy(out + out_pos, work + pos, seq);
        out_pos += seq;
        pos += seq;
    }

    if (work_allocated)
        js_free(ctx, work);

    /* BOM stripping */
    size_t skip = 0;
    if (!data->ignore_bom && !data->bom_seen && out_pos >= 3) {
        if (out[0] == 0xEF && out[1] == 0xBB && out[2] == 0xBF) {
            skip = 3;
        }
    }
    if (!data->ignore_bom)
        data->bom_seen = TRUE;

    /* If not streaming, reset state */
    if (!stream) {
        data->pending_len = 0;
        data->bom_seen = FALSE;
    }

    JSValue result = JS_NewStringLen(ctx, (char *)(out + skip), out_pos - skip);
    js_free(ctx, out);
    return result;
}

/* ---- UTF-16 decode with BOM, streaming, byte-swap ---- */

static JSValue decode_utf16_bytes(JSContext *ctx, TextDecoderData *data,
                                  const uint8_t *buf, size_t len,
                                  JS_BOOL stream, JS_BOOL big_endian)
{
    /* Build working buffer: pending + new input */
    size_t work_len = data->pending_len + len;
    uint8_t *work;
    int work_allocated = 0;

    if (data->pending_len > 0) {
        work = js_malloc(ctx, work_len);
        if (!work)
            return JS_EXCEPTION;
        memcpy(work, data->pending, data->pending_len);
        memcpy(work + data->pending_len, buf, len);
        work_allocated = 1;
    } else {
        work = (uint8_t *)buf;
    }
    data->pending_len = 0;

    size_t pos = 0;

    /* BOM stripping */
    if (!data->ignore_bom && !data->bom_seen && work_len >= 2) {
        if (big_endian && work[0] == 0xFE && work[1] == 0xFF) {
            pos = 2;
        } else if (!big_endian && work[0] == 0xFF && work[1] == 0xFE) {
            pos = 2;
        }
    }
    if (!data->ignore_bom)
        data->bom_seen = TRUE;

    /* Output buffer: worst case each 2-byte code unit becomes 3 UTF-8 bytes,
       plus replacement chars. Use (work_len * 3) as safe upper bound. */
    size_t out_cap = work_len * 3 + 1;
    uint8_t *out = js_malloc(ctx, out_cap);
    if (!out) {
        if (work_allocated) js_free(ctx, work);
        return JS_EXCEPTION;
    }
    size_t out_pos = 0;

    while (pos < work_len) {
        /* Need at least 2 bytes for a code unit */
        if (pos + 1 >= work_len) {
            /* Odd trailing byte */
            if (stream) {
                data->pending_len = work_len - pos;
                memcpy(data->pending, work + pos, data->pending_len);
            } else {
                if (data->fatal) {
                    js_free(ctx, out);
                    if (work_allocated) js_free(ctx, work);
                    return JS_ThrowTypeError(ctx, "The encoded data was not valid.");
                }
                memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
                out_pos += 3;
            }
            break;
        }

        uint16_t cu;
        if (big_endian)
            cu = ((uint16_t)work[pos] << 8) | work[pos + 1];
        else
            cu = work[pos] | ((uint16_t)work[pos + 1] << 8);
        pos += 2;

        if (cu >= 0xD800 && cu <= 0xDBFF) {
            /* High surrogate — need low surrogate */
            if (pos + 1 >= work_len) {
                /* No room for low surrogate */
                if (stream) {
                    /* Save the high surrogate bytes (plus any odd trailing byte) */
                    data->pending_len = work_len - (pos - 2);
                    memcpy(data->pending, work + (pos - 2), data->pending_len);
                } else {
                    if (data->fatal) {
                        js_free(ctx, out);
                        if (work_allocated) js_free(ctx, work);
                        return JS_ThrowTypeError(ctx, "The encoded data was not valid.");
                    }
                    memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
                    out_pos += 3;
                    /* If there's one more byte, that's also an error */
                    if (pos < work_len) {
                        memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
                        out_pos += 3;
                    }
                }
                break;
            }

            uint16_t cu2;
            if (big_endian)
                cu2 = ((uint16_t)work[pos] << 8) | work[pos + 1];
            else
                cu2 = work[pos] | ((uint16_t)work[pos + 1] << 8);

            if (cu2 >= 0xDC00 && cu2 <= 0xDFFF) {
                /* Valid surrogate pair */
                uint32_t cp = 0x10000 + ((uint32_t)(cu - 0xD800) << 10) +
                              (cu2 - 0xDC00);
                out_pos += encode_utf8_codepoint(out + out_pos, cp);
                pos += 2;
            } else {
                /* Lone high surrogate */
                if (data->fatal) {
                    js_free(ctx, out);
                    if (work_allocated) js_free(ctx, work);
                    return JS_ThrowTypeError(ctx, "The encoded data was not valid.");
                }
                memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
                out_pos += 3;
                /* Don't consume cu2 — it will be processed next iteration */
            }
        } else if (cu >= 0xDC00 && cu <= 0xDFFF) {
            /* Lone low surrogate */
            if (data->fatal) {
                js_free(ctx, out);
                if (work_allocated) js_free(ctx, work);
                return JS_ThrowTypeError(ctx, "The encoded data was not valid.");
            }
            memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
            out_pos += 3;
        } else {
            /* BMP character */
            out_pos += encode_utf8_codepoint(out + out_pos, cu);
        }
    }

    if (work_allocated)
        js_free(ctx, work);

    /* If not streaming, reset state */
    if (!stream) {
        data->pending_len = 0;
        data->bom_seen = FALSE;
    }

    JSValue result = JS_NewStringLen(ctx, (char *)out, out_pos);
    js_free(ctx, out);
    return result;
}

#if CONFIG_SHIFTJIS
/* ---- Shift_JIS decode per WHATWG Encoding Standard ---- */

static JSValue decode_shiftjis_bytes(JSContext *ctx, TextDecoderData *data,
                                      const uint8_t *buf, size_t len,
                                      JS_BOOL stream)
{
    /* Build working buffer: pending + new input */
    size_t work_len = data->pending_len + len;
    uint8_t *work;
    int work_allocated = 0;

    if (data->pending_len > 0) {
        work = js_malloc(ctx, work_len);
        if (!work)
            return JS_EXCEPTION;
        memcpy(work, data->pending, data->pending_len);
        memcpy(work + data->pending_len, buf, len);
        work_allocated = 1;
    } else {
        work = (uint8_t *)buf;
    }
    data->pending_len = 0;

    /* Output buffer: worst case each byte becomes U+FFFD (3 UTF-8 bytes),
       or a decoded codepoint up to 4 UTF-8 bytes. Use work_len * 4 + 1. */
    size_t out_cap = work_len * 4 + 1;
    uint8_t *out = js_malloc(ctx, out_cap);
    if (!out) {
        if (work_allocated) js_free(ctx, work);
        return JS_EXCEPTION;
    }
    size_t pos = 0, out_pos = 0;

    while (pos < work_len) {
        uint8_t b = work[pos];

        /* ASCII range (0x00-0x7F) or 0x80 — return code point = byte */
        if (b <= 0x7F) {
            out[out_pos++] = b;
            pos++;
            continue;
        }
        if (b == 0x80) {
            out_pos += encode_utf8_codepoint(out + out_pos, 0x80);
            pos++;
            continue;
        }

        /* Half-width katakana (0xA1-0xDF) → U+FF61 + (byte - 0xA1) */
        if (b >= 0xA1 && b <= 0xDF) {
            out_pos += encode_utf8_codepoint(out + out_pos, 0xFF61 + b - 0xA1);
            pos++;
            continue;
        }

        /* Lead byte for double-byte (0x81-0x9F, 0xE0-0xFC) */
        if ((b >= 0x81 && b <= 0x9F) || (b >= 0xE0 && b <= 0xFC)) {
            if (pos + 1 >= work_len) {
                /* Need trail byte */
                if (stream) {
                    data->pending[0] = b;
                    data->pending_len = 1;
                    break;
                } else {
                    /* Incomplete at end of stream — error */
                    if (data->fatal) {
                        js_free(ctx, out);
                        if (work_allocated) js_free(ctx, work);
                        return JS_ThrowTypeError(ctx, "The encoded data was not valid.");
                    }
                    memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
                    out_pos += 3;
                    pos++;
                    break;
                }
            }

            uint8_t trail = work[pos + 1];

            /* Check trail byte validity */
            if ((trail >= 0x40 && trail <= 0x7E) || (trail >= 0x80 && trail <= 0xFC)) {
                /* Compute pointer */
                int lead_offset = (b < 0xA0) ? 0x81 : 0xC1;
                int trail_offset = (trail < 0x7F) ? 0x40 : 0x41;
                int pointer = (b - lead_offset) * 188 + (trail - trail_offset);

                /* Pointer range 8836-10715: PUA */
                if (pointer >= 8836 && pointer <= 10715) {
                    uint32_t cp = 0xE000 + pointer - 8836;
                    out_pos += encode_utf8_codepoint(out + out_pos, cp);
                    pos += 2;
                    continue;
                }

                /* Look up in jis0208 table */
                uint32_t cp = shiftjis_decode(b, trail);
                if (cp != 0) {
                    out_pos += encode_utf8_codepoint(out + out_pos, cp);
                    pos += 2;
                    continue;
                }
            }

            /* Failed lookup or invalid trail byte */
            if (data->fatal) {
                js_free(ctx, out);
                if (work_allocated) js_free(ctx, work);
                return JS_ThrowTypeError(ctx, "The encoded data was not valid.");
            }
            memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
            out_pos += 3;

            /* WHATWG: if trail is ASCII, don't consume it */
            if (trail <= 0x7F)
                pos += 1;  /* consume only lead */
            else
                pos += 2;  /* consume both */
            continue;
        }

        /* Bytes 0xA0, 0xFD-0xFF: invalid */
        if (data->fatal) {
            js_free(ctx, out);
            if (work_allocated) js_free(ctx, work);
            return JS_ThrowTypeError(ctx, "The encoded data was not valid.");
        }
        memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
        out_pos += 3;
        pos++;
    }

    if (work_allocated)
        js_free(ctx, work);

    /* If not streaming, reset state */
    if (!stream) {
        data->pending_len = 0;
        data->bom_seen = FALSE;
    }

    JSValue result = JS_NewStringLen(ctx, (char *)out, out_pos);
    js_free(ctx, out);
    return result;
}
#endif /* CONFIG_SHIFTJIS */

/* ---- TextDecoder.decode() ---- */

static JSValue js_text_decoder_decode(JSContext *ctx, JSValueConst this_val,
                                      int argc, JSValueConst *argv)
{
    TextDecoderData *data = JS_GetOpaque(this_val, js_text_decoder_class_id);
    if (!data)
        return JS_ThrowTypeError(ctx, "not a TextDecoder");

    /* Get input bytes */
    uint8_t *input_buf = NULL;
    size_t input_len = 0;
    JSValue ab_to_free = JS_UNDEFINED;

    if (argc >= 1 && !JS_IsUndefined(argv[0]) && !JS_IsNull(argv[0])) {
        if (js_get_buffer_bytes(ctx, argv[0], &input_buf, &input_len,
                                &ab_to_free) < 0) {
            return JS_ThrowTypeError(ctx, "input must be an ArrayBuffer, TypedArray, or DataView");
        }
    }

    /* Parse stream option */
    JS_BOOL stream_flag = FALSE;
    if (argc >= 2 && JS_IsObject(argv[1])) {
        JSValue v = JS_GetPropertyStr(ctx, argv[1], "stream");
        if (JS_IsException(v)) {
            JS_FreeValue(ctx, ab_to_free);
            return JS_EXCEPTION;
        }
        if (!JS_IsUndefined(v))
            stream_flag = JS_ToBool(ctx, v);
        JS_FreeValue(ctx, v);
    }

    JSValue result;
    switch (data->encoding) {
    case ENCODING_UTF8:
        result = decode_utf8_bytes(ctx, data, input_buf ? input_buf : (uint8_t *)"",
                                   input_len, stream_flag);
        break;
    case ENCODING_UTF16LE:
        result = decode_utf16_bytes(ctx, data, input_buf ? input_buf : (uint8_t *)"",
                                    input_len, stream_flag, FALSE);
        break;
    case ENCODING_UTF16BE:
        result = decode_utf16_bytes(ctx, data, input_buf ? input_buf : (uint8_t *)"",
                                    input_len, stream_flag, TRUE);
        break;
#if CONFIG_SHIFTJIS
    case ENCODING_SHIFT_JIS:
        result = decode_shiftjis_bytes(ctx, data, input_buf ? input_buf : (uint8_t *)"",
                                        input_len, stream_flag);
        break;
#endif
    default:
        result = JS_ThrowError(ctx, "unsupported encoding");
        break;
    }

    JS_FreeValue(ctx, ab_to_free);
    return result;
}

static const JSCFunctionListEntry js_text_decoder_proto_funcs[] = {
    JS_CGETSET_DEF("encoding", js_text_decoder_get_encoding, NULL),
    JS_CGETSET_DEF("fatal", js_text_decoder_get_fatal, NULL),
    JS_CGETSET_DEF("ignoreBOM", js_text_decoder_get_ignoreBOM, NULL),
    JS_CFUNC_DEF("decode", 0, js_text_decoder_decode),
};

/* ---- Module initialization ---- */

static int js_encoding_init(JSContext *ctx, JSModuleDef *m)
{
    JSValue te_proto, te_ctor, td_proto, td_ctor;

    /* Existing function exports */
    JS_SetModuleExportList(ctx, m, js_encoding_funcs, countof(js_encoding_funcs));

    /* TextEncoder class */
    JS_NewClassID(&js_text_encoder_class_id);
    JS_NewClass(JS_GetRuntime(ctx), js_text_encoder_class_id,
                &js_text_encoder_class);
    te_proto = JS_NewObject(ctx);
    JS_SetPropertyFunctionList(ctx, te_proto, js_text_encoder_proto_funcs,
                               countof(js_text_encoder_proto_funcs));
    te_ctor = JS_NewCFunction2(ctx, js_text_encoder_ctor, "TextEncoder", 0,
                               JS_CFUNC_constructor, 0);
    JS_SetConstructor(ctx, te_ctor, te_proto);
    JS_SetClassProto(ctx, js_text_encoder_class_id, te_proto);
    JS_SetModuleExport(ctx, m, "TextEncoder", te_ctor);

    /* TextDecoder class */
    JS_NewClassID(&js_text_decoder_class_id);
    JS_NewClass(JS_GetRuntime(ctx), js_text_decoder_class_id,
                &js_text_decoder_class);
    td_proto = JS_NewObject(ctx);
    JS_SetPropertyFunctionList(ctx, td_proto, js_text_decoder_proto_funcs,
                               countof(js_text_decoder_proto_funcs));
    td_ctor = JS_NewCFunction2(ctx, js_text_decoder_ctor, "TextDecoder", 0,
                               JS_CFUNC_constructor, 0);
    JS_SetConstructor(ctx, td_ctor, td_proto);
    JS_SetClassProto(ctx, js_text_decoder_class_id, td_proto);
    JS_SetModuleExport(ctx, m, "TextDecoder", td_ctor);

    return 0;
}

JSModuleDef *js_init_module_encoding(JSContext *ctx, const char *module_name)
{
    JSModuleDef *m;
    m = JS_NewCModule(ctx, module_name, js_encoding_init, NULL);
    if (!m) {
        return NULL;
    }
    JS_AddModuleExportList(ctx, m, js_encoding_funcs, countof(js_encoding_funcs));
    JS_AddModuleExport(ctx, m, "TextEncoder");
    JS_AddModuleExport(ctx, m, "TextDecoder");
    return m;
}
