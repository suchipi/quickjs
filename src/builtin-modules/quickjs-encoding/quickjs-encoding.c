#include <string.h>
#include <errno.h>
#include <ctype.h>

#include "cutils.h"
#include "quickjs-encoding.h"

#ifndef CONFIG_SHIFTJIS
#define CONFIG_SHIFTJIS 1
#endif

#ifndef CONFIG_WINDOWS1252
#define CONFIG_WINDOWS1252 1
#endif

#ifndef CONFIG_WINDOWS1251
#define CONFIG_WINDOWS1251 1
#endif

#ifndef CONFIG_BIG5
#define CONFIG_BIG5 1
#endif

#ifndef CONFIG_EUCKR
#define CONFIG_EUCKR 1
#endif

#ifndef CONFIG_EUCJP
#define CONFIG_EUCJP 1
#endif

#ifndef CONFIG_GB18030
#define CONFIG_GB18030 1
#endif

#if CONFIG_SHIFTJIS
#include "libshiftjis.h"
#endif

#if CONFIG_WINDOWS1252
#include "libwindows1252.h"
#endif

#if CONFIG_WINDOWS1251
#include "libwindows1251.h"
#endif

#if CONFIG_BIG5
#include "libbig5.h"
#endif

#if CONFIG_EUCKR
#include "libeuckr.h"
#endif

#if CONFIG_EUCJP
#include "libeucjp.h"
#endif

#if CONFIG_GB18030
#include "libgb18030.h"
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
    return JS_ThrowError(ctx, "quickjs-encoding.c", __LINE__, "input must be an ArrayBuffer");
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
    return JS_ThrowError(ctx, "quickjs-encoding.c", __LINE__, "input must be a string");
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
#if CONFIG_WINDOWS1252
    ENCODING_WINDOWS_1252 = 4,
#endif
#if CONFIG_WINDOWS1251
    ENCODING_WINDOWS_1251 = 5,
#endif
#if CONFIG_BIG5
    ENCODING_BIG5 = 6,
#endif
#if CONFIG_EUCKR
    ENCODING_EUC_KR = 7,
#endif
#if CONFIG_EUCJP
    ENCODING_EUC_JP = 8,
#endif
#if CONFIG_GB18030
    ENCODING_GB18030 = 9,
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

typedef struct {
    TextEncoding encoding;
    uint32_t pending_surrogate;  /* Pending high surrogate for UTF-16, or 0 */
} TextEncoderData;

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

#if CONFIG_WINDOWS1252
    /* WHATWG maps iso-8859-1 to windows-1252 */
    if ((len == 12 && !strncasecmp(label, "windows-1252", 12)) ||
        (len == 6 && !strncasecmp(label, "cp1252", 6)) ||
        (len == 10 && !strncasecmp(label, "iso-8859-1", 10)) ||
        (len == 9 && !strncasecmp(label, "iso8859-1", 9)) ||
        (len == 10 && !strncasecmp(label, "iso_8859-1", 10)) ||
        (len == 6 && !strncasecmp(label, "latin1", 6)) ||
        (len == 10 && !strncasecmp(label, "iso-8859-15", 11)) ||
        (len == 8 && !strncasecmp(label, "us-ascii", 8)) ||
        (len == 5 && !strncasecmp(label, "ascii", 5)) ||
        (len == 6 && !strncasecmp(label, "x-cp1252", 8)))
        return ENCODING_WINDOWS_1252;
#endif

#if CONFIG_WINDOWS1251
    if ((len == 12 && !strncasecmp(label, "windows-1251", 12)) ||
        (len == 6 && !strncasecmp(label, "cp1251", 6)) ||
        (len == 8 && !strncasecmp(label, "x-cp1251", 8)))
        return ENCODING_WINDOWS_1251;
#endif

#if CONFIG_BIG5
    if ((len == 4 && !strncasecmp(label, "big5", 4)) ||
        (len == 10 && !strncasecmp(label, "big5-hkscs", 10)) ||
        (len == 7 && !strncasecmp(label, "cn-big5", 7)) ||
        (len == 7 && !strncasecmp(label, "csbig5", 6)) ||
        (len == 8 && !strncasecmp(label, "x-x-big5", 8)))
        return ENCODING_BIG5;
#endif

#if CONFIG_EUCKR
    if ((len == 6 && !strncasecmp(label, "euc-kr", 6)) ||
        (len == 8 && !strncasecmp(label, "cseuckr", 7)) ||
        (len == 6 && !strncasecmp(label, "korean", 6)) ||
        (len == 16 && !strncasecmp(label, "ks_c_5601-1987", 14)) ||
        (len == 7 && !strncasecmp(label, "iso-ir-149", 10)) ||
        (len == 5 && !strncasecmp(label, "csksc", 5)))
        return ENCODING_EUC_KR;
#endif

#if CONFIG_EUCJP
    if ((len == 6 && !strncasecmp(label, "euc-jp", 6)) ||
        (len == 22 && !strncasecmp(label, "cseucpkdfmtjapanese", 19)) ||
        (len == 8 && !strncasecmp(label, "x-euc-jp", 8)))
        return ENCODING_EUC_JP;
#endif

#if CONFIG_GB18030
    /* WHATWG maps gb2312 and gbk to gb18030 */
    if ((len == 7 && !strncasecmp(label, "gb18030", 7)) ||
        (len == 6 && !strncasecmp(label, "gb2312", 6)) ||
        (len == 3 && !strncasecmp(label, "gbk", 3)) ||
        (len == 7 && !strncasecmp(label, "chinese", 7)) ||
        (len == 6 && !strncasecmp(label, "csgb2312", 8)) ||
        (len == 7 && !strncasecmp(label, "x-gbk", 5)) ||
        (len == 10 && !strncasecmp(label, "gb_2312-80", 10)) ||
        (len == 10 && !strncasecmp(label, "iso-ir-58", 9)))
        return ENCODING_GB18030;
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
#if CONFIG_WINDOWS1252
    case ENCODING_WINDOWS_1252: return "windows-1252";
#endif
#if CONFIG_WINDOWS1251
    case ENCODING_WINDOWS_1251: return "windows-1251";
#endif
#if CONFIG_BIG5
    case ENCODING_BIG5: return "big5";
#endif
#if CONFIG_EUCKR
    case ENCODING_EUC_KR: return "euc-kr";
#endif
#if CONFIG_EUCJP
    case ENCODING_EUC_JP: return "euc-jp";
#endif
#if CONFIG_GB18030
    case ENCODING_GB18030: return "gb18030";
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

static void js_text_encoder_finalizer(JSRuntime *rt, JSValue val)
{
    TextEncoderData *data = JS_GetOpaque(val, js_text_encoder_class_id);
    if (data)
        js_free_rt(rt, data);
}

static JSClassDef js_text_encoder_class = {
    "TextEncoder",
    .finalizer = js_text_encoder_finalizer,
};

static JSValue js_text_encoder_ctor(JSContext *ctx, JSValueConst new_target,
                                    int argc, JSValueConst *argv)
{
    TextEncoderData *data;
    int enc;

    /* Parse label (optional; defaults to utf-8 per spec, but we allow others) */
    if (argc < 1 || JS_IsUndefined(argv[0])) {
        enc = ENCODING_UTF8;
    } else {
        const char *label = JS_ToCString(ctx, argv[0]);
        if (!label)
            return JS_EXCEPTION;
        enc = resolve_encoding_label(label);
        if (enc < 0) {
            JS_ThrowRangeError(ctx, "quickjs-encoding.c", __LINE__, "The encoding label provided ('%s') is invalid.",
                               label);
            JS_FreeCString(ctx, label);
            return JS_EXCEPTION;
        }
        JS_FreeCString(ctx, label);
    }

    JSValue obj = JS_NewObjectClass(ctx, js_text_encoder_class_id);
    if (JS_IsException(obj))
        return obj;

    data = js_mallocz(ctx, sizeof(TextEncoderData));
    if (!data) {
        JS_FreeValue(ctx, obj);
        return JS_EXCEPTION;
    }

    data->encoding = (TextEncoding)enc;
    data->pending_surrogate = 0;

    JS_SetOpaque(obj, data);
    return obj;
}

static JSValue js_text_encoder_get_encoding(JSContext *ctx,
                                            JSValueConst this_val)
{
    TextEncoderData *data = JS_GetOpaque(this_val, js_text_encoder_class_id);
    if (!data)
        return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "not a TextEncoder");
    return JS_NewString(ctx, encoding_name(data->encoding));
}

/* Encode codepoints to UTF-8, returning number of bytes written */
static size_t encode_codepoints_utf8(const uint32_t *cps, size_t count,
                                     uint8_t *out)
{
    size_t written = 0;
    for (size_t i = 0; i < count; i++) {
        written += encode_utf8_codepoint(out + written, cps[i]);
    }
    return written;
}

/* Encode codepoints to UTF-16LE, returning number of bytes written.
   pending_hi is a pointer to a pending high surrogate (or 0), updated on return.
   If stream is FALSE, lone surrogates are encoded as-is (unpaired). */
static size_t encode_codepoints_utf16le(const uint32_t *cps, size_t count,
                                        uint8_t *out, uint32_t *pending_hi,
                                        JS_BOOL stream)
{
    size_t written = 0;
    uint32_t hi = *pending_hi;

    for (size_t i = 0; i < count; i++) {
        uint32_t cp = cps[i];

        if (hi != 0) {
            /* We have a pending high surrogate */
            if (cp >= 0xDC00 && cp <= 0xDFFF) {
                /* Valid low surrogate - encode the pair */
                out[written++] = hi & 0xFF;
                out[written++] = (hi >> 8) & 0xFF;
                out[written++] = cp & 0xFF;
                out[written++] = (cp >> 8) & 0xFF;
                hi = 0;
                continue;
            } else {
                /* Encode the unpaired high surrogate */
                out[written++] = hi & 0xFF;
                out[written++] = (hi >> 8) & 0xFF;
                hi = 0;
            }
        }

        if (cp >= 0xD800 && cp <= 0xDBFF) {
            /* High surrogate */
            hi = cp;
        } else if (cp >= 0xDC00 && cp <= 0xDFFF) {
            /* Lone low surrogate - encode as-is */
            out[written++] = cp & 0xFF;
            out[written++] = (cp >> 8) & 0xFF;
        } else if (cp <= 0xFFFF) {
            /* BMP character */
            out[written++] = cp & 0xFF;
            out[written++] = (cp >> 8) & 0xFF;
        } else {
            /* Supplementary character - encode as surrogate pair */
            uint32_t adj = cp - 0x10000;
            uint16_t high = 0xD800 + (adj >> 10);
            uint16_t low = 0xDC00 + (adj & 0x3FF);
            out[written++] = high & 0xFF;
            out[written++] = (high >> 8) & 0xFF;
            out[written++] = low & 0xFF;
            out[written++] = (low >> 8) & 0xFF;
        }
    }

    if (!stream && hi != 0) {
        /* Flush pending high surrogate at end of stream */
        out[written++] = hi & 0xFF;
        out[written++] = (hi >> 8) & 0xFF;
        hi = 0;
    }

    *pending_hi = hi;
    return written;
}

/* Encode codepoints to UTF-16BE, returning number of bytes written. */
static size_t encode_codepoints_utf16be(const uint32_t *cps, size_t count,
                                        uint8_t *out, uint32_t *pending_hi,
                                        JS_BOOL stream)
{
    size_t written = 0;
    uint32_t hi = *pending_hi;

    for (size_t i = 0; i < count; i++) {
        uint32_t cp = cps[i];

        if (hi != 0) {
            /* We have a pending high surrogate */
            if (cp >= 0xDC00 && cp <= 0xDFFF) {
                /* Valid low surrogate - encode the pair */
                out[written++] = (hi >> 8) & 0xFF;
                out[written++] = hi & 0xFF;
                out[written++] = (cp >> 8) & 0xFF;
                out[written++] = cp & 0xFF;
                hi = 0;
                continue;
            } else {
                /* Encode the unpaired high surrogate */
                out[written++] = (hi >> 8) & 0xFF;
                out[written++] = hi & 0xFF;
                hi = 0;
            }
        }

        if (cp >= 0xD800 && cp <= 0xDBFF) {
            /* High surrogate */
            hi = cp;
        } else if (cp >= 0xDC00 && cp <= 0xDFFF) {
            /* Lone low surrogate - encode as-is */
            out[written++] = (cp >> 8) & 0xFF;
            out[written++] = cp & 0xFF;
        } else if (cp <= 0xFFFF) {
            /* BMP character */
            out[written++] = (cp >> 8) & 0xFF;
            out[written++] = cp & 0xFF;
        } else {
            /* Supplementary character - encode as surrogate pair */
            uint32_t adj = cp - 0x10000;
            uint16_t high = 0xD800 + (adj >> 10);
            uint16_t low = 0xDC00 + (adj & 0x3FF);
            out[written++] = (high >> 8) & 0xFF;
            out[written++] = high & 0xFF;
            out[written++] = (low >> 8) & 0xFF;
            out[written++] = low & 0xFF;
        }
    }

    if (!stream && hi != 0) {
        /* Flush pending high surrogate at end of stream */
        out[written++] = (hi >> 8) & 0xFF;
        out[written++] = hi & 0xFF;
        hi = 0;
    }

    *pending_hi = hi;
    return written;
}

#if CONFIG_SHIFTJIS
/* Encode codepoints to Shift_JIS, returning number of bytes written.
   For codepoints that cannot be encoded, output '?' as fallback. */
static size_t encode_codepoints_shiftjis(const uint32_t *cps, size_t count,
                                         uint8_t *out)
{
    size_t written = 0;
    for (size_t i = 0; i < count; i++) {
        uint32_t cp = cps[i];
        uint8_t lead, trail;
        int len = shiftjis_encode(cp, &lead, &trail);
        if (len == 0) {
            /* Cannot encode - use '?' as fallback */
            out[written++] = '?';
        } else if (len == 1) {
            out[written++] = lead;
        } else {
            out[written++] = lead;
            out[written++] = trail;
        }
    }
    return written;
}
#endif

#if CONFIG_WINDOWS1252
/* Encode codepoints to Windows-1252, returning number of bytes written.
   For codepoints that cannot be encoded, output '?' as fallback. */
static size_t encode_codepoints_windows1252(const uint32_t *cps, size_t count,
                                            uint8_t *out)
{
    size_t written = 0;
    for (size_t i = 0; i < count; i++) {
        uint32_t cp = cps[i];
        uint8_t byte;
        int len = windows1252_encode(cp, &byte);
        if (len == 0) {
            out[written++] = '?';
        } else {
            out[written++] = byte;
        }
    }
    return written;
}
#endif

#if CONFIG_WINDOWS1251
/* Encode codepoints to Windows-1251, returning number of bytes written. */
static size_t encode_codepoints_windows1251(const uint32_t *cps, size_t count,
                                            uint8_t *out)
{
    size_t written = 0;
    for (size_t i = 0; i < count; i++) {
        uint32_t cp = cps[i];
        uint8_t byte;
        int len = windows1251_encode(cp, &byte);
        if (len == 0) {
            out[written++] = '?';
        } else {
            out[written++] = byte;
        }
    }
    return written;
}
#endif

#if CONFIG_BIG5
/* Encode codepoints to Big5, returning number of bytes written. */
static size_t encode_codepoints_big5(const uint32_t *cps, size_t count,
                                     uint8_t *out)
{
    size_t written = 0;
    for (size_t i = 0; i < count; i++) {
        uint32_t cp = cps[i];
        uint8_t lead, trail;
        int len = big5_encode(cp, &lead, &trail);
        if (len == 0) {
            out[written++] = '?';
        } else if (len == 1) {
            out[written++] = lead;
        } else {
            out[written++] = lead;
            out[written++] = trail;
        }
    }
    return written;
}
#endif

#if CONFIG_EUCKR
/* Encode codepoints to EUC-KR, returning number of bytes written. */
static size_t encode_codepoints_euckr(const uint32_t *cps, size_t count,
                                      uint8_t *out)
{
    size_t written = 0;
    for (size_t i = 0; i < count; i++) {
        uint32_t cp = cps[i];
        uint8_t lead, trail;
        int len = euckr_encode(cp, &lead, &trail);
        if (len == 0) {
            out[written++] = '?';
        } else if (len == 1) {
            out[written++] = lead;
        } else {
            out[written++] = lead;
            out[written++] = trail;
        }
    }
    return written;
}
#endif

#if CONFIG_EUCJP
/* Encode codepoints to EUC-JP, returning number of bytes written. */
static size_t encode_codepoints_eucjp(const uint32_t *cps, size_t count,
                                      uint8_t *out)
{
    size_t written = 0;
    for (size_t i = 0; i < count; i++) {
        uint32_t cp = cps[i];
        uint8_t buf[2];
        int len = eucjp_encode(cp, buf);
        if (len == 0) {
            out[written++] = '?';
        } else if (len == 1) {
            out[written++] = buf[0];
        } else {
            out[written++] = buf[0];
            out[written++] = buf[1];
        }
    }
    return written;
}
#endif

#if CONFIG_GB18030
/* Encode codepoints to GB18030, returning number of bytes written. */
static size_t encode_codepoints_gb18030(const uint32_t *cps, size_t count,
                                        uint8_t *out)
{
    size_t written = 0;
    for (size_t i = 0; i < count; i++) {
        uint32_t cp = cps[i];
        uint8_t buf[4];
        int len = gb18030_encode(cp, buf);
        if (len == 0) {
            out[written++] = '?';
        } else {
            for (int j = 0; j < len; j++) {
                out[written++] = buf[j];
            }
        }
    }
    return written;
}
#endif

/* Parse UTF-16 code units from a JS string to codepoints.
   Returns allocated array of codepoints (caller must free), count in *out_count.
   Returns NULL on allocation failure. */
static uint32_t *parse_string_to_codepoints(JSContext *ctx, const char *utf8_str,
                                            size_t utf8_len, size_t *out_count)
{
    /* Count codepoints first */
    size_t cp_count = 0;
    const uint8_t *p = (const uint8_t *)utf8_str;
    const uint8_t *end = p + utf8_len;

    while (p < end) {
        int seq = utf8_seq_len(*p);
        if (seq == 0 || p + seq > end) {
            p++;  /* Skip invalid byte */
        } else {
            p += seq;
            cp_count++;
        }
    }

    uint32_t *cps = js_malloc(ctx, (cp_count + 1) * sizeof(uint32_t));
    if (!cps)
        return NULL;

    /* Parse codepoints */
    p = (const uint8_t *)utf8_str;
    size_t idx = 0;
    while (p < end && idx < cp_count) {
        int seq = utf8_seq_len(*p);
        if (seq == 0 || p + seq > end) {
            cps[idx++] = 0xFFFD;  /* Replacement for invalid */
            p++;
        } else {
            uint32_t cp = decode_utf8_codepoint(p, seq);
            if (cp == (uint32_t)-1)
                cp = 0xFFFD;
            cps[idx++] = cp;
            p += seq;
        }
    }

    *out_count = idx;
    return cps;
}

static JSValue js_text_encoder_encode(JSContext *ctx, JSValueConst this_val,
                                      int argc, JSValueConst *argv)
{
    TextEncoderData *data = JS_GetOpaque(this_val, js_text_encoder_class_id);
    if (!data)
        return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "not a TextEncoder");

    const char *str;
    size_t len;

    if (argc < 1 || JS_IsUndefined(argv[0])) {
        return js_new_uint8array(ctx, NULL, 0);
    }

    str = JS_ToCStringLen2(ctx, &len, argv[0], 0);
    if (!str)
        return JS_EXCEPTION;

    /* Parse stream option */
    JS_BOOL stream_flag = FALSE;
    if (argc >= 2 && JS_IsObject(argv[1])) {
        JSValue v = JS_GetPropertyStr(ctx, argv[1], "stream");
        if (JS_IsException(v)) {
            JS_FreeCString(ctx, str);
            return JS_EXCEPTION;
        }
        if (!JS_IsUndefined(v))
            stream_flag = JS_ToBool(ctx, v);
        JS_FreeValue(ctx, v);
    }

    /* For UTF-8, just return the string bytes directly (fast path) */
    if (data->encoding == ENCODING_UTF8) {
        JSValue result = js_new_uint8array(ctx, (const uint8_t *)str, len);
        JS_FreeCString(ctx, str);
        return result;
    }

    /* Parse string to codepoints */
    size_t cp_count;
    uint32_t *cps = parse_string_to_codepoints(ctx, str, len, &cp_count);
    JS_FreeCString(ctx, str);
    if (!cps)
        return JS_EXCEPTION;

    /* Allocate output buffer: worst case 4 bytes per codepoint */
    size_t out_cap = cp_count * 4 + 4;
    uint8_t *out = js_malloc(ctx, out_cap);
    if (!out) {
        js_free(ctx, cps);
        return JS_EXCEPTION;
    }

    size_t written = 0;

    switch (data->encoding) {
    case ENCODING_UTF16LE:
        written = encode_codepoints_utf16le(cps, cp_count, out,
                                            &data->pending_surrogate, stream_flag);
        break;
    case ENCODING_UTF16BE:
        written = encode_codepoints_utf16be(cps, cp_count, out,
                                            &data->pending_surrogate, stream_flag);
        break;
#if CONFIG_SHIFTJIS
    case ENCODING_SHIFT_JIS:
        written = encode_codepoints_shiftjis(cps, cp_count, out);
        break;
#endif
#if CONFIG_WINDOWS1252
    case ENCODING_WINDOWS_1252:
        written = encode_codepoints_windows1252(cps, cp_count, out);
        break;
#endif
#if CONFIG_WINDOWS1251
    case ENCODING_WINDOWS_1251:
        written = encode_codepoints_windows1251(cps, cp_count, out);
        break;
#endif
#if CONFIG_BIG5
    case ENCODING_BIG5:
        written = encode_codepoints_big5(cps, cp_count, out);
        break;
#endif
#if CONFIG_EUCKR
    case ENCODING_EUC_KR:
        written = encode_codepoints_euckr(cps, cp_count, out);
        break;
#endif
#if CONFIG_EUCJP
    case ENCODING_EUC_JP:
        written = encode_codepoints_eucjp(cps, cp_count, out);
        break;
#endif
#if CONFIG_GB18030
    case ENCODING_GB18030:
        written = encode_codepoints_gb18030(cps, cp_count, out);
        break;
#endif
    default:
        written = encode_codepoints_utf8(cps, cp_count, out);
        break;
    }

    js_free(ctx, cps);

    JSValue result = js_new_uint8array(ctx, out, written);
    js_free(ctx, out);
    return result;
}

static JSValue js_text_encoder_encodeInto(JSContext *ctx,
                                          JSValueConst this_val,
                                          int argc, JSValueConst *argv)
{
    TextEncoderData *data = JS_GetOpaque(this_val, js_text_encoder_class_id);
    if (!data)
        return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "not a TextEncoder");

    const char *str;
    size_t str_len;
    uint8_t *dest_buf;
    size_t dest_len;
    JSValue ab_to_free;

    if (argc < 2)
        return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "encodeInto requires 2 arguments");

    str = JS_ToCStringLen2(ctx, &str_len, argv[0], 0);
    if (!str)
        return JS_EXCEPTION;

    if (js_get_buffer_bytes(ctx, argv[1], &dest_buf, &dest_len, &ab_to_free) < 0) {
        JS_FreeCString(ctx, str);
        return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "second argument must be a Uint8Array");
    }

    const uint8_t *src = (const uint8_t *)str;
    size_t src_pos = 0, written = 0;
    uint64_t read_utf16 = 0;

    if (data->encoding == ENCODING_UTF8) {
        /* UTF-8: copy bytes directly (codepoint by codepoint) */
        while (src_pos < str_len) {
            int seq = utf8_seq_len(src[src_pos]);
            if (seq == 0) {
                /* Invalid lead byte */
                break;
            }
            if (src_pos + seq > str_len)
                break;
            if (written + seq > dest_len)
                break;

            memcpy(dest_buf + written, src + src_pos, seq);
            written += seq;

            uint32_t cp = decode_utf8_codepoint(src + src_pos, seq);
            read_utf16 += (cp >= 0x10000) ? 2 : 1;

            src_pos += seq;
        }
    } else if (data->encoding == ENCODING_UTF16LE || data->encoding == ENCODING_UTF16BE) {
        /* UTF-16: encode each codepoint as 2 or 4 bytes */
        JS_BOOL big_endian = (data->encoding == ENCODING_UTF16BE);

        while (src_pos < str_len) {
            int seq = utf8_seq_len(src[src_pos]);
            if (seq == 0 || src_pos + seq > str_len)
                break;

            uint32_t cp = decode_utf8_codepoint(src + src_pos, seq);
            if (cp == (uint32_t)-1) {
                src_pos++;
                continue;
            }

            /* Determine bytes needed for this codepoint */
            size_t bytes_needed;
            if (cp >= 0xD800 && cp <= 0xDFFF) {
                /* Lone surrogate - 2 bytes */
                bytes_needed = 2;
            } else if (cp <= 0xFFFF) {
                bytes_needed = 2;
            } else {
                bytes_needed = 4;  /* Surrogate pair */
            }

            if (written + bytes_needed > dest_len)
                break;

            /* Encode */
            if (cp >= 0xD800 && cp <= 0xDFFF) {
                /* Lone surrogate */
                if (big_endian) {
                    dest_buf[written++] = (cp >> 8) & 0xFF;
                    dest_buf[written++] = cp & 0xFF;
                } else {
                    dest_buf[written++] = cp & 0xFF;
                    dest_buf[written++] = (cp >> 8) & 0xFF;
                }
            } else if (cp <= 0xFFFF) {
                if (big_endian) {
                    dest_buf[written++] = (cp >> 8) & 0xFF;
                    dest_buf[written++] = cp & 0xFF;
                } else {
                    dest_buf[written++] = cp & 0xFF;
                    dest_buf[written++] = (cp >> 8) & 0xFF;
                }
            } else {
                /* Supplementary - surrogate pair */
                uint32_t adj = cp - 0x10000;
                uint16_t high = 0xD800 + (adj >> 10);
                uint16_t low = 0xDC00 + (adj & 0x3FF);
                if (big_endian) {
                    dest_buf[written++] = (high >> 8) & 0xFF;
                    dest_buf[written++] = high & 0xFF;
                    dest_buf[written++] = (low >> 8) & 0xFF;
                    dest_buf[written++] = low & 0xFF;
                } else {
                    dest_buf[written++] = high & 0xFF;
                    dest_buf[written++] = (high >> 8) & 0xFF;
                    dest_buf[written++] = low & 0xFF;
                    dest_buf[written++] = (low >> 8) & 0xFF;
                }
            }

            read_utf16 += (cp >= 0x10000) ? 2 : 1;
            src_pos += seq;
        }
    }
#if CONFIG_SHIFTJIS
    else if (data->encoding == ENCODING_SHIFT_JIS) {
        /* Shift_JIS: encode each codepoint as 1 or 2 bytes */
        while (src_pos < str_len) {
            int seq = utf8_seq_len(src[src_pos]);
            if (seq == 0 || src_pos + seq > str_len)
                break;

            uint32_t cp = decode_utf8_codepoint(src + src_pos, seq);
            if (cp == (uint32_t)-1) {
                src_pos++;
                continue;
            }

            uint8_t lead, trail;
            int enc_len = shiftjis_encode(cp, &lead, &trail);

            if (enc_len == 0) {
                /* Cannot encode - use '?' */
                if (written + 1 > dest_len)
                    break;
                dest_buf[written++] = '?';
            } else if (enc_len == 1) {
                if (written + 1 > dest_len)
                    break;
                dest_buf[written++] = lead;
            } else {
                if (written + 2 > dest_len)
                    break;
                dest_buf[written++] = lead;
                dest_buf[written++] = trail;
            }

            read_utf16 += (cp >= 0x10000) ? 2 : 1;
            src_pos += seq;
        }
    }
#endif

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
            JS_ThrowRangeError(ctx, "quickjs-encoding.c", __LINE__, "The encoding label provided ('%s') is invalid.",
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
        return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "not a TextDecoder");
    return JS_NewString(ctx, encoding_name(data->encoding));
}

static JSValue js_text_decoder_get_fatal(JSContext *ctx,
                                         JSValueConst this_val)
{
    TextDecoderData *data = JS_GetOpaque(this_val, js_text_decoder_class_id);
    if (!data)
        return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "not a TextDecoder");
    return JS_NewBool(ctx, data->fatal);
}

static JSValue js_text_decoder_get_ignoreBOM(JSContext *ctx,
                                             JSValueConst this_val)
{
    TextDecoderData *data = JS_GetOpaque(this_val, js_text_decoder_class_id);
    if (!data)
        return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "not a TextDecoder");
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
                return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
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
                        return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
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
                return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
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
                    return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
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
                        return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
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
                    return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
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
                return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
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
                        return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
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
                return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
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
            return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
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

#if CONFIG_WINDOWS1252
/* ---- Windows-1252 decode ---- */

static JSValue decode_windows1252_bytes(JSContext *ctx, TextDecoderData *data,
                                        const uint8_t *buf, size_t len,
                                        JS_BOOL stream)
{
    /* Output buffer: worst case each byte becomes 3 UTF-8 bytes */
    size_t out_cap = len * 3 + 1;
    uint8_t *out = js_malloc(ctx, out_cap);
    if (!out)
        return JS_EXCEPTION;

    size_t out_pos = 0;

    for (size_t i = 0; i < len; i++) {
        uint8_t b = buf[i];
        uint32_t cp;

        if (b < 0x80) {
            /* ASCII */
            out[out_pos++] = b;
        } else {
            cp = windows1252_decode(b);
            if (cp == 0) {
                /* Unmapped byte */
                if (data->fatal) {
                    js_free(ctx, out);
                    return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
                }
                memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
                out_pos += 3;
            } else {
                out_pos += encode_utf8_codepoint(out + out_pos, cp);
            }
        }
    }

    /* If not streaming, reset state */
    if (!stream) {
        data->pending_len = 0;
        data->bom_seen = FALSE;
    }

    JSValue result = JS_NewStringLen(ctx, (char *)out, out_pos);
    js_free(ctx, out);
    return result;
}
#endif /* CONFIG_WINDOWS1252 */

#if CONFIG_WINDOWS1251
/* ---- Windows-1251 decode ---- */

static JSValue decode_windows1251_bytes(JSContext *ctx, TextDecoderData *data,
                                        const uint8_t *buf, size_t len,
                                        JS_BOOL stream)
{
    /* Output buffer: worst case each byte becomes 3 UTF-8 bytes */
    size_t out_cap = len * 3 + 1;
    uint8_t *out = js_malloc(ctx, out_cap);
    if (!out)
        return JS_EXCEPTION;

    size_t out_pos = 0;

    for (size_t i = 0; i < len; i++) {
        uint8_t b = buf[i];
        uint32_t cp;

        if (b < 0x80) {
            /* ASCII */
            out[out_pos++] = b;
        } else {
            cp = windows1251_decode(b);
            if (cp == 0) {
                /* Unmapped byte */
                if (data->fatal) {
                    js_free(ctx, out);
                    return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
                }
                memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
                out_pos += 3;
            } else {
                out_pos += encode_utf8_codepoint(out + out_pos, cp);
            }
        }
    }

    /* If not streaming, reset state */
    if (!stream) {
        data->pending_len = 0;
        data->bom_seen = FALSE;
    }

    JSValue result = JS_NewStringLen(ctx, (char *)out, out_pos);
    js_free(ctx, out);
    return result;
}
#endif /* CONFIG_WINDOWS1251 */

#if CONFIG_BIG5
/* ---- Big5 decode ---- */

static JSValue decode_big5_bytes(JSContext *ctx, TextDecoderData *data,
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

    /* Output buffer */
    size_t out_cap = work_len * 4 + 1;
    uint8_t *out = js_malloc(ctx, out_cap);
    if (!out) {
        if (work_allocated) js_free(ctx, work);
        return JS_EXCEPTION;
    }
    size_t pos = 0, out_pos = 0;

    while (pos < work_len) {
        uint8_t b = work[pos];

        /* ASCII */
        if (b <= 0x7F) {
            out[out_pos++] = b;
            pos++;
            continue;
        }

        /* Lead byte for double-byte (0x81-0xFE) */
        if (b >= 0x81 && b <= 0xFE) {
            if (pos + 1 >= work_len) {
                /* Need trail byte */
                if (stream) {
                    data->pending[0] = b;
                    data->pending_len = 1;
                    break;
                } else {
                    if (data->fatal) {
                        js_free(ctx, out);
                        if (work_allocated) js_free(ctx, work);
                        return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
                    }
                    memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
                    out_pos += 3;
                    pos++;
                    break;
                }
            }

            uint8_t trail = work[pos + 1];

            /* Validate trail byte (0x40-0x7E or 0xA1-0xFE) */
            if ((trail >= 0x40 && trail <= 0x7E) || (trail >= 0xA1 && trail <= 0xFE)) {
                uint32_t cp = big5_decode(b, trail);
                if (cp != 0) {
                    out_pos += encode_utf8_codepoint(out + out_pos, cp);
                    pos += 2;
                    continue;
                }
            }

            /* Failed lookup or invalid trail */
            if (data->fatal) {
                js_free(ctx, out);
                if (work_allocated) js_free(ctx, work);
                return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
            }
            memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
            out_pos += 3;

            /* If trail is ASCII, don't consume it */
            if (trail <= 0x7F)
                pos += 1;
            else
                pos += 2;
            continue;
        }

        /* Invalid byte (0x80, 0xFF) */
        if (data->fatal) {
            js_free(ctx, out);
            if (work_allocated) js_free(ctx, work);
            return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
        }
        memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
        out_pos += 3;
        pos++;
    }

    if (work_allocated)
        js_free(ctx, work);

    if (!stream) {
        data->pending_len = 0;
        data->bom_seen = FALSE;
    }

    JSValue result = JS_NewStringLen(ctx, (char *)out, out_pos);
    js_free(ctx, out);
    return result;
}
#endif /* CONFIG_BIG5 */

#if CONFIG_EUCKR
/* ---- EUC-KR decode ---- */

static JSValue decode_euckr_bytes(JSContext *ctx, TextDecoderData *data,
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

    /* Output buffer */
    size_t out_cap = work_len * 4 + 1;
    uint8_t *out = js_malloc(ctx, out_cap);
    if (!out) {
        if (work_allocated) js_free(ctx, work);
        return JS_EXCEPTION;
    }
    size_t pos = 0, out_pos = 0;

    while (pos < work_len) {
        uint8_t b = work[pos];

        /* ASCII */
        if (b <= 0x7F) {
            out[out_pos++] = b;
            pos++;
            continue;
        }

        /* Lead byte for double-byte (0x81-0xFE) */
        if (b >= 0x81 && b <= 0xFE) {
            if (pos + 1 >= work_len) {
                /* Need trail byte */
                if (stream) {
                    data->pending[0] = b;
                    data->pending_len = 1;
                    break;
                } else {
                    if (data->fatal) {
                        js_free(ctx, out);
                        if (work_allocated) js_free(ctx, work);
                        return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
                    }
                    memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
                    out_pos += 3;
                    pos++;
                    break;
                }
            }

            uint8_t trail = work[pos + 1];

            /* Validate trail byte (0x41-0xFE) */
            if (trail >= 0x41 && trail <= 0xFE) {
                uint32_t cp = euckr_decode(b, trail);
                if (cp != 0) {
                    out_pos += encode_utf8_codepoint(out + out_pos, cp);
                    pos += 2;
                    continue;
                }
            }

            /* Failed lookup or invalid trail */
            if (data->fatal) {
                js_free(ctx, out);
                if (work_allocated) js_free(ctx, work);
                return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
            }
            memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
            out_pos += 3;

            /* If trail is ASCII, don't consume it */
            if (trail <= 0x7F)
                pos += 1;
            else
                pos += 2;
            continue;
        }

        /* Invalid byte (0x80) */
        if (data->fatal) {
            js_free(ctx, out);
            if (work_allocated) js_free(ctx, work);
            return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
        }
        memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
        out_pos += 3;
        pos++;
    }

    if (work_allocated)
        js_free(ctx, work);

    if (!stream) {
        data->pending_len = 0;
        data->bom_seen = FALSE;
    }

    JSValue result = JS_NewStringLen(ctx, (char *)out, out_pos);
    js_free(ctx, out);
    return result;
}
#endif /* CONFIG_EUCKR */

#if CONFIG_EUCJP
/* ---- EUC-JP decode ---- */

static JSValue decode_eucjp_bytes(JSContext *ctx, TextDecoderData *data,
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

    /* Output buffer */
    size_t out_cap = work_len * 4 + 1;
    uint8_t *out = js_malloc(ctx, out_cap);
    if (!out) {
        if (work_allocated) js_free(ctx, work);
        return JS_EXCEPTION;
    }
    size_t pos = 0, out_pos = 0;

    while (pos < work_len) {
        uint8_t b = work[pos];

        /* ASCII */
        if (b <= 0x7F) {
            out[out_pos++] = b;
            pos++;
            continue;
        }

        /* 0x8E: JIS X 0201 half-width katakana (2 bytes) */
        if (b == 0x8E) {
            if (pos + 1 >= work_len) {
                if (stream) {
                    data->pending[0] = b;
                    data->pending_len = 1;
                    break;
                } else {
                    if (data->fatal) {
                        js_free(ctx, out);
                        if (work_allocated) js_free(ctx, work);
                        return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
                    }
                    memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
                    out_pos += 3;
                    pos++;
                    break;
                }
            }

            uint8_t trail = work[pos + 1];
            if (trail >= 0xA1 && trail <= 0xDF) {
                /* Half-width katakana: U+FF61 + (trail - 0xA1) */
                uint32_t cp = 0xFF61 + trail - 0xA1;
                out_pos += encode_utf8_codepoint(out + out_pos, cp);
                pos += 2;
                continue;
            }

            /* Invalid trail */
            if (data->fatal) {
                js_free(ctx, out);
                if (work_allocated) js_free(ctx, work);
                return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
            }
            memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
            out_pos += 3;
            if (trail <= 0x7F)
                pos += 1;
            else
                pos += 2;
            continue;
        }

        /* 0x8F: JIS X 0212 (3 bytes) */
        if (b == 0x8F) {
            if (pos + 2 >= work_len) {
                if (stream) {
                    size_t remaining = work_len - pos;
                    memcpy(data->pending, work + pos, remaining);
                    data->pending_len = remaining;
                    break;
                } else {
                    if (data->fatal) {
                        js_free(ctx, out);
                        if (work_allocated) js_free(ctx, work);
                        return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
                    }
                    while (pos < work_len) {
                        memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
                        out_pos += 3;
                        pos++;
                    }
                    break;
                }
            }

            uint8_t lead = work[pos + 1];
            uint8_t trail = work[pos + 2];

            if (lead >= 0xA1 && lead <= 0xFE && trail >= 0xA1 && trail <= 0xFE) {
                uint32_t cp = eucjp_decode_jis0212(lead, trail);
                if (cp != 0) {
                    out_pos += encode_utf8_codepoint(out + out_pos, cp);
                    pos += 3;
                    continue;
                }
            }

            /* Failed lookup or invalid bytes */
            if (data->fatal) {
                js_free(ctx, out);
                if (work_allocated) js_free(ctx, work);
                return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
            }
            memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
            out_pos += 3;
            pos += 1;  /* Only consume the 0x8F */
            continue;
        }

        /* 0xA1-0xFE: JIS X 0208 (2 bytes) */
        if (b >= 0xA1 && b <= 0xFE) {
            if (pos + 1 >= work_len) {
                if (stream) {
                    data->pending[0] = b;
                    data->pending_len = 1;
                    break;
                } else {
                    if (data->fatal) {
                        js_free(ctx, out);
                        if (work_allocated) js_free(ctx, work);
                        return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
                    }
                    memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
                    out_pos += 3;
                    pos++;
                    break;
                }
            }

            uint8_t trail = work[pos + 1];

            if (trail >= 0xA1 && trail <= 0xFE) {
                uint32_t cp = eucjp_decode_jis0208(b, trail);
                if (cp != 0) {
                    out_pos += encode_utf8_codepoint(out + out_pos, cp);
                    pos += 2;
                    continue;
                }
            }

            /* Failed lookup or invalid trail */
            if (data->fatal) {
                js_free(ctx, out);
                if (work_allocated) js_free(ctx, work);
                return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
            }
            memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
            out_pos += 3;
            if (trail <= 0x7F)
                pos += 1;
            else
                pos += 2;
            continue;
        }

        /* Invalid byte (0x80, 0x90-0xA0, etc.) */
        if (data->fatal) {
            js_free(ctx, out);
            if (work_allocated) js_free(ctx, work);
            return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
        }
        memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
        out_pos += 3;
        pos++;
    }

    if (work_allocated)
        js_free(ctx, work);

    if (!stream) {
        data->pending_len = 0;
        data->bom_seen = FALSE;
    }

    JSValue result = JS_NewStringLen(ctx, (char *)out, out_pos);
    js_free(ctx, out);
    return result;
}
#endif /* CONFIG_EUCJP */

#if CONFIG_GB18030
/* ---- GB18030 decode ---- */

static JSValue decode_gb18030_bytes(JSContext *ctx, TextDecoderData *data,
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

    /* Output buffer */
    size_t out_cap = work_len * 4 + 1;
    uint8_t *out = js_malloc(ctx, out_cap);
    if (!out) {
        if (work_allocated) js_free(ctx, work);
        return JS_EXCEPTION;
    }
    size_t pos = 0, out_pos = 0;

    while (pos < work_len) {
        uint8_t b = work[pos];

        /* ASCII */
        if (b <= 0x7F) {
            out[out_pos++] = b;
            pos++;
            continue;
        }

        /* Lead byte (0x81-0xFE) */
        if (b >= 0x81 && b <= 0xFE) {
            if (pos + 1 >= work_len) {
                if (stream) {
                    data->pending[0] = b;
                    data->pending_len = 1;
                    break;
                } else {
                    if (data->fatal) {
                        js_free(ctx, out);
                        if (work_allocated) js_free(ctx, work);
                        return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
                    }
                    memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
                    out_pos += 3;
                    pos++;
                    break;
                }
            }

            uint8_t b2 = work[pos + 1];

            /* Check for 4-byte sequence (second byte 0x30-0x39) */
            if (b2 >= 0x30 && b2 <= 0x39) {
                if (pos + 3 >= work_len) {
                    if (stream) {
                        size_t remaining = work_len - pos;
                        memcpy(data->pending, work + pos, remaining);
                        data->pending_len = remaining;
                        break;
                    } else {
                        if (data->fatal) {
                            js_free(ctx, out);
                            if (work_allocated) js_free(ctx, work);
                            return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
                        }
                        while (pos < work_len) {
                            memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
                            out_pos += 3;
                            pos++;
                        }
                        break;
                    }
                }

                uint8_t b3 = work[pos + 2];
                uint8_t b4 = work[pos + 3];

                if (b3 >= 0x81 && b3 <= 0xFE && b4 >= 0x30 && b4 <= 0x39) {
                    uint32_t cp = gb18030_decode_fourbyte(b, b2, b3, b4);
                    if (cp != 0) {
                        out_pos += encode_utf8_codepoint(out + out_pos, cp);
                        pos += 4;
                        continue;
                    }
                }

                /* Invalid 4-byte sequence */
                if (data->fatal) {
                    js_free(ctx, out);
                    if (work_allocated) js_free(ctx, work);
                    return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
                }
                memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
                out_pos += 3;
                pos += 1;
                continue;
            }

            /* 2-byte sequence (second byte 0x40-0x7E or 0x80-0xFE) */
            if ((b2 >= 0x40 && b2 <= 0x7E) || (b2 >= 0x80 && b2 <= 0xFE)) {
                uint32_t cp = gb18030_decode_twobyte(b, b2);
                if (cp != 0) {
                    out_pos += encode_utf8_codepoint(out + out_pos, cp);
                    pos += 2;
                    continue;
                }
            }

            /* Failed lookup or invalid trail */
            if (data->fatal) {
                js_free(ctx, out);
                if (work_allocated) js_free(ctx, work);
                return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
            }
            memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
            out_pos += 3;
            if (b2 <= 0x7F)
                pos += 1;
            else
                pos += 2;
            continue;
        }

        /* Invalid byte (0x80, 0xFF) */
        if (data->fatal) {
            js_free(ctx, out);
            if (work_allocated) js_free(ctx, work);
            return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "The encoded data was not valid.");
        }
        memcpy(out + out_pos, REPLACEMENT_UTF8, 3);
        out_pos += 3;
        pos++;
    }

    if (work_allocated)
        js_free(ctx, work);

    if (!stream) {
        data->pending_len = 0;
        data->bom_seen = FALSE;
    }

    JSValue result = JS_NewStringLen(ctx, (char *)out, out_pos);
    js_free(ctx, out);
    return result;
}
#endif /* CONFIG_GB18030 */

/* ---- TextDecoder.decode() ---- */

static JSValue js_text_decoder_decode(JSContext *ctx, JSValueConst this_val,
                                      int argc, JSValueConst *argv)
{
    TextDecoderData *data = JS_GetOpaque(this_val, js_text_decoder_class_id);
    if (!data)
        return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "not a TextDecoder");

    /* Get input bytes */
    uint8_t *input_buf = NULL;
    size_t input_len = 0;
    JSValue ab_to_free = JS_UNDEFINED;

    if (argc >= 1 && !JS_IsUndefined(argv[0]) && !JS_IsNull(argv[0])) {
        if (js_get_buffer_bytes(ctx, argv[0], &input_buf, &input_len,
                                &ab_to_free) < 0) {
            return JS_ThrowTypeError(ctx, "quickjs-encoding.c", __LINE__, "input must be an ArrayBuffer, TypedArray, or DataView");
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
#if CONFIG_WINDOWS1252
    case ENCODING_WINDOWS_1252:
        result = decode_windows1252_bytes(ctx, data, input_buf ? input_buf : (uint8_t *)"",
                                          input_len, stream_flag);
        break;
#endif
#if CONFIG_WINDOWS1251
    case ENCODING_WINDOWS_1251:
        result = decode_windows1251_bytes(ctx, data, input_buf ? input_buf : (uint8_t *)"",
                                          input_len, stream_flag);
        break;
#endif
#if CONFIG_BIG5
    case ENCODING_BIG5:
        result = decode_big5_bytes(ctx, data, input_buf ? input_buf : (uint8_t *)"",
                                   input_len, stream_flag);
        break;
#endif
#if CONFIG_EUCKR
    case ENCODING_EUC_KR:
        result = decode_euckr_bytes(ctx, data, input_buf ? input_buf : (uint8_t *)"",
                                    input_len, stream_flag);
        break;
#endif
#if CONFIG_EUCJP
    case ENCODING_EUC_JP:
        result = decode_eucjp_bytes(ctx, data, input_buf ? input_buf : (uint8_t *)"",
                                    input_len, stream_flag);
        break;
#endif
#if CONFIG_GB18030
    case ENCODING_GB18030:
        result = decode_gb18030_bytes(ctx, data, input_buf ? input_buf : (uint8_t *)"",
                                      input_len, stream_flag);
        break;
#endif
    default:
        result = JS_ThrowError(ctx, "quickjs-encoding.c", __LINE__, "unsupported encoding");
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
