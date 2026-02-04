/*
 * Fuzzer tests for encoding libraries in src/lib/encoding/
 *
 * Tests all byte values, boundary conditions, roundtrip encode/decode,
 * and malformed inputs to ensure no crashes or undefined behavior.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <assert.h>

#include "utf-conv.h"

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

static int tests_run = 0;
static int tests_passed = 0;
static int tests_failed = 0;

#define TEST_ASSERT(cond, msg) do { \
    tests_run++; \
    if (!(cond)) { \
        printf("FAIL: %s (line %d): %s\n", __func__, __LINE__, msg); \
        tests_failed++; \
    } else { \
        tests_passed++; \
    } \
} while(0)

#define TEST_SECTION(name) printf("\n=== Testing %s ===\n", name)

/* ============== Windows-1252 Tests ============== */

#if CONFIG_WINDOWS1252
static void test_windows1252_decode_all_bytes(void) {
    /* Test that decoding all 256 byte values doesn't crash */
    for (int i = 0; i < 256; i++) {
        uint32_t cp = windows1252_decode((uint8_t)i);
        /* ASCII range should be identity */
        if (i < 0x80) {
            TEST_ASSERT(cp == (uint32_t)i, "ASCII should be identity");
        }
        /* Result should be a valid Unicode codepoint */
        TEST_ASSERT(cp <= 0x10FFFF, "Result should be valid Unicode");
    }
}

static void test_windows1252_encode_roundtrip(void) {
    /* Test roundtrip for all decodable bytes */
    for (int i = 0; i < 256; i++) {
        uint32_t cp = windows1252_decode((uint8_t)i);
        uint8_t out;
        int result = windows1252_encode(cp, &out);
        if (result == 1) {
            /* If encodable, should roundtrip */
            TEST_ASSERT(out == (uint8_t)i || windows1252_decode(out) == cp,
                       "Roundtrip should preserve codepoint");
        }
    }
}

static void test_windows1252_encode_boundary(void) {
    uint8_t out;
    /* Test encoding various codepoint boundaries */
    TEST_ASSERT(windows1252_encode(0, &out) == 1 && out == 0, "NUL encodes");
    TEST_ASSERT(windows1252_encode(0x7F, &out) == 1 && out == 0x7F, "DEL encodes");
    TEST_ASSERT(windows1252_encode(0x20AC, &out) == 1 && out == 0x80, "Euro sign encodes to 0x80");
    /* Unencodable */
    TEST_ASSERT(windows1252_encode(0x10000, &out) == 0, "Supplementary codepoint not encodable");
    TEST_ASSERT(windows1252_encode(0x4E2D, &out) == 0, "CJK not encodable");
}

static void test_windows1252(void) {
    TEST_SECTION("Windows-1252");
    test_windows1252_decode_all_bytes();
    test_windows1252_encode_roundtrip();
    test_windows1252_encode_boundary();
}
#endif

/* ============== Windows-1251 Tests ============== */

#if CONFIG_WINDOWS1251
static void test_windows1251_decode_all_bytes(void) {
    for (int i = 0; i < 256; i++) {
        uint32_t cp = windows1251_decode((uint8_t)i);
        if (i < 0x80) {
            TEST_ASSERT(cp == (uint32_t)i, "ASCII should be identity");
        }
        TEST_ASSERT(cp <= 0x10FFFF, "Result should be valid Unicode");
    }
}

static void test_windows1251_encode_roundtrip(void) {
    for (int i = 0; i < 256; i++) {
        uint32_t cp = windows1251_decode((uint8_t)i);
        uint8_t out;
        int result = windows1251_encode(cp, &out);
        if (result == 1) {
            TEST_ASSERT(out == (uint8_t)i || windows1251_decode(out) == cp,
                       "Roundtrip should preserve codepoint");
        }
    }
}

static void test_windows1251_cyrillic(void) {
    uint8_t out;
    /* Test Cyrillic characters */
    TEST_ASSERT(windows1251_encode(0x0410, &out) == 1 && out == 0xC0, "А encodes to 0xC0");
    TEST_ASSERT(windows1251_encode(0x0411, &out) == 1 && out == 0xC1, "Б encodes to 0xC1");
    TEST_ASSERT(windows1251_encode(0x044F, &out) == 1 && out == 0xFF, "я encodes to 0xFF");
    /* Decode check */
    TEST_ASSERT(windows1251_decode(0xC0) == 0x0410, "0xC0 decodes to А");
    TEST_ASSERT(windows1251_decode(0xFF) == 0x044F, "0xFF decodes to я");
}

static void test_windows1251(void) {
    TEST_SECTION("Windows-1251");
    test_windows1251_decode_all_bytes();
    test_windows1251_encode_roundtrip();
    test_windows1251_cyrillic();
}
#endif

/* ============== Shift_JIS Tests ============== */

#if CONFIG_SHIFTJIS
static void test_shiftjis_decode_all_byte_pairs(void) {
    /* Test all valid lead byte ranges with all possible trail bytes */
    int valid_decodes = 0;
    for (int lead = 0x81; lead <= 0xFC; lead++) {
        /* Skip invalid lead byte range */
        if (lead >= 0xA0 && lead <= 0xDF) continue;
        if (lead > 0x9F && lead < 0xE0) continue;

        for (int trail = 0x40; trail <= 0xFC; trail++) {
            if (trail == 0x7F) continue; /* 0x7F is never valid trail */
            uint32_t cp = shiftjis_decode((uint8_t)lead, (uint8_t)trail);
            /* Result is either 0 (unmapped) or valid Unicode */
            TEST_ASSERT(cp == 0 || cp <= 0x10FFFF, "Result should be 0 or valid Unicode");
            if (cp != 0) valid_decodes++;
        }
    }
    printf("  Shift_JIS: %d valid decode pairs found\n", valid_decodes);
}

static void test_shiftjis_encode_roundtrip(void) {
    /* Test encoding known codepoints and roundtrip */
    uint8_t lead, trail;

    /* Test 日 U+65E5 */
    int result = shiftjis_encode(0x65E5, &lead, &trail);
    TEST_ASSERT(result == 2, "日 encodes to 2 bytes");
    if (result == 2) {
        uint32_t decoded = shiftjis_decode(lead, trail);
        TEST_ASSERT(decoded == 0x65E5, "日 roundtrips correctly");
    }

    /* Test ASCII */
    result = shiftjis_encode('A', &lead, &trail);
    TEST_ASSERT(result == 1 && lead == 'A', "ASCII encodes to 1 byte");

    /* Test half-width katakana U+FF71 (ｱ) */
    result = shiftjis_encode(0xFF71, &lead, &trail);
    TEST_ASSERT(result == 1 && lead == 0xB1, "Half-width katakana encodes to 1 byte");
}

static void test_shiftjis_boundary(void) {
    uint8_t lead, trail;

    /* Unencodable characters return 0 */
    TEST_ASSERT(shiftjis_encode(0x10000, &lead, &trail) == 0, "Supplementary not encodable");
    TEST_ASSERT(shiftjis_encode(0x1F600, &lead, &trail) == 0, "Emoji not encodable");

    /* Invalid decode combinations return 0 */
    TEST_ASSERT(shiftjis_decode(0x80, 0x40) == 0, "0x80 not valid lead");
    TEST_ASSERT(shiftjis_decode(0x81, 0x7F) == 0, "0x7F not valid trail");
}

static void test_shiftjis(void) {
    TEST_SECTION("Shift_JIS");
    test_shiftjis_decode_all_byte_pairs();
    test_shiftjis_encode_roundtrip();
    test_shiftjis_boundary();
}
#endif

/* ============== Big5 Tests ============== */

#if CONFIG_BIG5
static void test_big5_decode_all_byte_pairs(void) {
    int valid_decodes = 0;
    for (int lead = 0x81; lead <= 0xFE; lead++) {
        for (int trail = 0x40; trail <= 0xFE; trail++) {
            /* Skip invalid trail byte range 0x7F-0xA0 */
            if (trail >= 0x7F && trail <= 0xA0) continue;

            uint32_t cp = big5_decode((uint8_t)lead, (uint8_t)trail);
            TEST_ASSERT(cp == 0 || cp <= 0x10FFFF, "Result should be 0 or valid Unicode");
            if (cp != 0) valid_decodes++;
        }
    }
    printf("  Big5: %d valid decode pairs found\n", valid_decodes);
}

static void test_big5_encode_roundtrip(void) {
    uint8_t lead, trail;

    /* Test 中 U+4E2D */
    int result = big5_encode(0x4E2D, &lead, &trail);
    TEST_ASSERT(result == 2, "中 encodes to 2 bytes");
    if (result == 2) {
        uint32_t decoded = big5_decode(lead, trail);
        TEST_ASSERT(decoded == 0x4E2D, "中 roundtrips correctly");
    }

    /* Test ASCII */
    result = big5_encode('A', &lead, &trail);
    TEST_ASSERT(result == 1 && lead == 'A', "ASCII encodes to 1 byte");
}

static void test_big5_boundary(void) {
    uint8_t lead, trail;

    TEST_ASSERT(big5_encode(0x10000, &lead, &trail) == 0, "Supplementary not encodable");
    TEST_ASSERT(big5_decode(0x80, 0x40) == 0, "0x80 not valid lead");
    TEST_ASSERT(big5_decode(0x81, 0x7F) == 0, "0x7F not valid trail");
}

static void test_big5(void) {
    TEST_SECTION("Big5");
    test_big5_decode_all_byte_pairs();
    test_big5_encode_roundtrip();
    test_big5_boundary();
}
#endif

/* ============== EUC-KR Tests ============== */

#if CONFIG_EUCKR
static void test_euckr_decode_all_byte_pairs(void) {
    int valid_decodes = 0;
    for (int lead = 0x81; lead <= 0xFE; lead++) {
        for (int trail = 0x41; trail <= 0xFE; trail++) {
            uint32_t cp = euckr_decode((uint8_t)lead, (uint8_t)trail);
            TEST_ASSERT(cp == 0 || cp <= 0x10FFFF, "Result should be 0 or valid Unicode");
            if (cp != 0) valid_decodes++;
        }
    }
    printf("  EUC-KR: %d valid decode pairs found\n", valid_decodes);
}

static void test_euckr_encode_roundtrip(void) {
    uint8_t lead, trail;

    /* Test 한 U+D55C */
    int result = euckr_encode(0xD55C, &lead, &trail);
    TEST_ASSERT(result == 2, "한 encodes to 2 bytes");
    if (result == 2) {
        uint32_t decoded = euckr_decode(lead, trail);
        TEST_ASSERT(decoded == 0xD55C, "한 roundtrips correctly");
    }

    /* Test ASCII */
    result = euckr_encode('A', &lead, &trail);
    TEST_ASSERT(result == 1 && lead == 'A', "ASCII encodes to 1 byte");
}

static void test_euckr_boundary(void) {
    uint8_t lead, trail;

    TEST_ASSERT(euckr_encode(0x10000, &lead, &trail) == 0, "Supplementary not encodable");
    TEST_ASSERT(euckr_decode(0x80, 0x41) == 0, "0x80 not valid lead");
    TEST_ASSERT(euckr_decode(0x81, 0x40) == 0, "0x40 not valid trail");
}

static void test_euckr(void) {
    TEST_SECTION("EUC-KR");
    test_euckr_decode_all_byte_pairs();
    test_euckr_encode_roundtrip();
    test_euckr_boundary();
}
#endif

/* ============== EUC-JP Tests ============== */

#if CONFIG_EUCJP
static void test_eucjp_decode_jis0208_all(void) {
    int valid_decodes = 0;
    for (int lead = 0xA1; lead <= 0xFE; lead++) {
        for (int trail = 0xA1; trail <= 0xFE; trail++) {
            uint32_t cp = eucjp_decode_jis0208((uint8_t)lead, (uint8_t)trail);
            TEST_ASSERT(cp == 0 || cp <= 0x10FFFF, "Result should be 0 or valid Unicode");
            if (cp != 0) valid_decodes++;
        }
    }
    printf("  EUC-JP JIS0208: %d valid decode pairs found\n", valid_decodes);
}

static void test_eucjp_decode_jis0212_all(void) {
    int valid_decodes = 0;
    for (int lead = 0xA1; lead <= 0xFE; lead++) {
        for (int trail = 0xA1; trail <= 0xFE; trail++) {
            uint32_t cp = eucjp_decode_jis0212((uint8_t)lead, (uint8_t)trail);
            TEST_ASSERT(cp == 0 || cp <= 0x10FFFF, "Result should be 0 or valid Unicode");
            if (cp != 0) valid_decodes++;
        }
    }
    printf("  EUC-JP JIS0212: %d valid decode pairs found\n", valid_decodes);
}

static void test_eucjp_encode_roundtrip(void) {
    uint8_t out[4];

    /* Test 日 U+65E5 */
    int result = eucjp_encode(0x65E5, out);
    TEST_ASSERT(result == 2, "日 encodes to 2 bytes");
    if (result == 2) {
        uint32_t decoded = eucjp_decode_jis0208(out[0], out[1]);
        TEST_ASSERT(decoded == 0x65E5, "日 roundtrips correctly");
    }

    /* Test ASCII */
    result = eucjp_encode('A', out);
    TEST_ASSERT(result == 1 && out[0] == 'A', "ASCII encodes to 1 byte");

    /* Test half-width katakana U+FF71 (ｱ) → 0x8E 0xB1 */
    result = eucjp_encode(0xFF71, out);
    TEST_ASSERT(result == 2 && out[0] == 0x8E && out[1] == 0xB1,
               "Half-width katakana encodes correctly");
}

static void test_eucjp_boundary(void) {
    uint8_t out[4];

    TEST_ASSERT(eucjp_encode(0x10000, out) == 0, "Supplementary not encodable");
    TEST_ASSERT(eucjp_decode_jis0208(0xA0, 0xA1) == 0, "0xA0 not valid lead");
    TEST_ASSERT(eucjp_decode_jis0208(0xA1, 0xA0) == 0, "0xA0 not valid trail");
}

static void test_eucjp(void) {
    TEST_SECTION("EUC-JP");
    test_eucjp_decode_jis0208_all();
    test_eucjp_decode_jis0212_all();
    test_eucjp_encode_roundtrip();
    test_eucjp_boundary();
}
#endif

/* ============== GB18030 Tests ============== */

#if CONFIG_GB18030
static void test_gb18030_decode_twobyte_all(void) {
    int valid_decodes = 0;
    for (int lead = 0x81; lead <= 0xFE; lead++) {
        for (int trail = 0x40; trail <= 0xFE; trail++) {
            if (trail == 0x7F) continue; /* 0x7F is never valid */
            uint32_t cp = gb18030_decode_twobyte((uint8_t)lead, (uint8_t)trail);
            TEST_ASSERT(cp == 0 || cp <= 0x10FFFF, "Result should be 0 or valid Unicode");
            if (cp != 0) valid_decodes++;
        }
    }
    printf("  GB18030 2-byte: %d valid decode pairs found\n", valid_decodes);
}

static void test_gb18030_decode_fourbyte_sample(void) {
    /* Test known 4-byte sequences */

    /* U+10000 = 0x90 0x30 0x81 0x30 */
    uint32_t cp = gb18030_decode_fourbyte(0x90, 0x30, 0x81, 0x30);
    TEST_ASSERT(cp == 0x10000, "U+10000 decodes correctly");

    /* Test boundary: first 4-byte sequence */
    cp = gb18030_decode_fourbyte(0x81, 0x30, 0x81, 0x30);
    TEST_ASSERT(cp == 0 || cp <= 0x10FFFF, "First 4-byte is valid or 0");

    /* Test invalid 4-byte (second byte not 0x30-0x39) */
    cp = gb18030_decode_fourbyte(0x81, 0x40, 0x81, 0x30);
    TEST_ASSERT(cp == 0, "Invalid second byte returns 0");
}

static void test_gb18030_encode_roundtrip(void) {
    uint8_t out[4];

    /* Test 中 U+4E2D (2-byte) */
    int result = gb18030_encode(0x4E2D, out);
    TEST_ASSERT(result == 2, "中 encodes to 2 bytes");
    if (result == 2) {
        uint32_t decoded = gb18030_decode_twobyte(out[0], out[1]);
        TEST_ASSERT(decoded == 0x4E2D, "中 roundtrips correctly");
    }

    /* Test ASCII */
    result = gb18030_encode('A', out);
    TEST_ASSERT(result == 1 && out[0] == 'A', "ASCII encodes to 1 byte");

    /* Test U+10000 (4-byte) */
    result = gb18030_encode(0x10000, out);
    TEST_ASSERT(result == 4, "U+10000 encodes to 4 bytes");
    if (result == 4) {
        uint32_t decoded = gb18030_decode_fourbyte(out[0], out[1], out[2], out[3]);
        TEST_ASSERT(decoded == 0x10000, "U+10000 roundtrips correctly");
    }

    /* Test emoji U+1F600 (4-byte) */
    result = gb18030_encode(0x1F600, out);
    TEST_ASSERT(result == 4, "Emoji encodes to 4 bytes");
    if (result == 4) {
        uint32_t decoded = gb18030_decode_fourbyte(out[0], out[1], out[2], out[3]);
        TEST_ASSERT(decoded == 0x1F600, "Emoji roundtrips correctly");
    }
}

static void test_gb18030_all_bmp_encode(void) {
    /* Test that all BMP codepoints can be encoded */
    uint8_t out[4];
    int failed = 0;
    for (uint32_t cp = 0; cp <= 0xFFFF; cp++) {
        /* Skip surrogates */
        if (cp >= 0xD800 && cp <= 0xDFFF) continue;

        int result = gb18030_encode(cp, out);
        if (result == 0) {
            failed++;
            if (failed <= 5) {
                printf("  Warning: U+%04X not encodable\n", cp);
            }
        }
    }
    TEST_ASSERT(failed == 0, "All BMP codepoints should be encodable in GB18030");
    if (failed > 0) {
        printf("  %d BMP codepoints failed to encode\n", failed);
    }
}

static void test_gb18030_boundary(void) {
    uint8_t out[4];

    /* GB18030 should encode all valid Unicode */
    TEST_ASSERT(gb18030_encode(0x10FFFF, out) == 4, "Max Unicode encodes");

    /* Invalid decode */
    TEST_ASSERT(gb18030_decode_twobyte(0x80, 0x40) == 0, "0x80 not valid lead");
    TEST_ASSERT(gb18030_decode_twobyte(0x81, 0x7F) == 0, "0x7F not valid trail");
}

static void test_gb18030(void) {
    TEST_SECTION("GB18030");
    test_gb18030_decode_twobyte_all();
    test_gb18030_decode_fourbyte_sample();
    test_gb18030_encode_roundtrip();
    test_gb18030_all_bmp_encode();
    test_gb18030_boundary();
}
#endif

/* ============== UTF Conversion Tests ============== */

static void test_utf_conv_basic(void) {
    TEST_SECTION("UTF Conversion");

    /* Test utf8_to_utf16 */
    size_t out_len;
    int error;
    size_t error_offset;

    uint16_t *utf16 = utf8_to_utf16("Hello", &out_len, &error, &error_offset, NULL, NULL);
    TEST_ASSERT(utf16 != NULL, "utf8_to_utf16 succeeds for ASCII");
    TEST_ASSERT(error == UTF_CONV_OK, "No error for ASCII");
    TEST_ASSERT(out_len == 5, "Correct length for ASCII");
    if (utf16) {
        TEST_ASSERT(utf16[0] == 'H' && utf16[4] == 'o', "Correct content");
        free(utf16);
    }

    /* Test utf16_to_utf8 */
    uint16_t utf16_input[] = {'H', 'i', 0};
    char *utf8 = utf16_to_utf8(utf16_input, 2, &out_len, &error, &error_offset, NULL, NULL);
    TEST_ASSERT(utf8 != NULL, "utf16_to_utf8 succeeds for ASCII");
    TEST_ASSERT(error == UTF_CONV_OK, "No error for ASCII");
    TEST_ASSERT(out_len == 2, "Correct length for ASCII");
    if (utf8) {
        TEST_ASSERT(strcmp(utf8, "Hi") == 0, "Correct content");
        free(utf8);
    }
}

static void test_utf_conv_multibyte(void) {
    size_t out_len;
    int error;
    size_t error_offset;

    /* Test UTF-8 with multibyte characters */
    /* あ = E3 81 82 = U+3042 */
    uint16_t *utf16 = utf8_to_utf16("\xE3\x81\x82", &out_len, &error, &error_offset, NULL, NULL);
    TEST_ASSERT(utf16 != NULL, "utf8_to_utf16 succeeds for Japanese");
    TEST_ASSERT(out_len == 1, "One UTF-16 code unit for あ");
    if (utf16) {
        TEST_ASSERT(utf16[0] == 0x3042, "Correct codepoint for あ");
        free(utf16);
    }

    /* Test surrogate pair: U+1F600 = D83D DE00 */
    utf16 = utf8_to_utf16("\xF0\x9F\x98\x80", &out_len, &error, &error_offset, NULL, NULL);
    TEST_ASSERT(utf16 != NULL, "utf8_to_utf16 succeeds for emoji");
    TEST_ASSERT(out_len == 2, "Two UTF-16 code units for emoji (surrogate pair)");
    if (utf16) {
        TEST_ASSERT(utf16[0] == 0xD83D && utf16[1] == 0xDE00, "Correct surrogate pair");
        free(utf16);
    }
}

static void test_utf_conv_invalid(void) {
    size_t out_len;
    int error;
    size_t error_offset;

    /* Invalid UTF-8: lone continuation byte */
    uint16_t *utf16 = utf8_to_utf16("\x80", &out_len, &error, &error_offset, NULL, NULL);
    TEST_ASSERT(utf16 == NULL, "Lone continuation byte fails");
    TEST_ASSERT(error == UTF_CONV_ERR_UNEXPECTED_CONT, "Correct error code");
    TEST_ASSERT(error_offset == 0, "Error at offset 0");

    /* Invalid UTF-8: truncated sequence */
    utf16 = utf8_to_utf16("\xE3\x81", &out_len, &error, &error_offset, NULL, NULL);
    TEST_ASSERT(utf16 == NULL, "Truncated sequence fails");
    TEST_ASSERT(error == UTF_CONV_ERR_TRUNCATED_SEQ, "Correct error code");

    /* Invalid UTF-8: invalid lead byte */
    utf16 = utf8_to_utf16("\xFF", &out_len, &error, &error_offset, NULL, NULL);
    TEST_ASSERT(utf16 == NULL, "Invalid lead byte fails");
    TEST_ASSERT(error == UTF_CONV_ERR_INVALID_LEAD, "Correct error code");

    /* Invalid UTF-16: lone high surrogate */
    uint16_t bad_utf16[] = {0xD83D, 0};
    char *utf8 = utf16_to_utf8(bad_utf16, 1, &out_len, &error, &error_offset, NULL, NULL);
    TEST_ASSERT(utf8 == NULL, "Lone high surrogate fails");
    TEST_ASSERT(error == UTF_CONV_ERR_TRUNCATED_PAIR, "Correct error code");

    /* Invalid UTF-16: lone low surrogate */
    uint16_t bad_utf16_2[] = {0xDE00, 0};
    utf8 = utf16_to_utf8(bad_utf16_2, 1, &out_len, &error, &error_offset, NULL, NULL);
    TEST_ASSERT(utf8 == NULL, "Lone low surrogate fails");
    TEST_ASSERT(error == UTF_CONV_ERR_UNEXPECTED_LOW, "Correct error code");
}

static void test_utf_conv_strerror(void) {
    /* Test that all error codes have messages */
    TEST_ASSERT(utf_conv_strerror(UTF_CONV_OK) != NULL, "OK has message");
    TEST_ASSERT(utf_conv_strerror(UTF_CONV_ERR_ALLOC_FAILED) != NULL, "ALLOC_FAILED has message");
    TEST_ASSERT(utf_conv_strerror(UTF_CONV_ERR_UNEXPECTED_CONT) != NULL, "UNEXPECTED_CONT has message");
    TEST_ASSERT(utf_conv_strerror(UTF_CONV_ERR_INVALID_LEAD) != NULL, "INVALID_LEAD has message");
    TEST_ASSERT(utf_conv_strerror(UTF_CONV_ERR_TRUNCATED_SEQ) != NULL, "TRUNCATED_SEQ has message");
    TEST_ASSERT(utf_conv_strerror(UTF_CONV_ERR_CODEPOINT_RANGE) != NULL, "CODEPOINT_RANGE has message");
    TEST_ASSERT(utf_conv_strerror(UTF_CONV_ERR_SURROGATE_IN_UTF8) != NULL, "SURROGATE_IN_UTF8 has message");
    TEST_ASSERT(utf_conv_strerror(UTF_CONV_ERR_TRUNCATED_PAIR) != NULL, "TRUNCATED_PAIR has message");
    TEST_ASSERT(utf_conv_strerror(UTF_CONV_ERR_MISSING_LOW) != NULL, "MISSING_LOW has message");
    TEST_ASSERT(utf_conv_strerror(UTF_CONV_ERR_UNEXPECTED_LOW) != NULL, "UNEXPECTED_LOW has message");
}

static void test_utf_conv(void) {
    test_utf_conv_basic();
    test_utf_conv_multibyte();
    test_utf_conv_invalid();
    test_utf_conv_strerror();
}

/* ============== Random/Stress Tests ============== */

static uint32_t xorshift32(uint32_t *state) {
    uint32_t x = *state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    *state = x;
    return x;
}

static void test_random_decodes(void) {
    TEST_SECTION("Random Decode Stress Test");
    uint32_t rng_state = 12345;

    printf("  Testing 100000 random byte sequences...\n");
    for (int i = 0; i < 100000; i++) {
        uint8_t b1 = xorshift32(&rng_state) & 0xFF;
        uint8_t b2 = xorshift32(&rng_state) & 0xFF;
        uint8_t b3 = xorshift32(&rng_state) & 0xFF;
        uint8_t b4 = xorshift32(&rng_state) & 0xFF;

        /* These should not crash regardless of input */
#if CONFIG_SHIFTJIS
        (void)shiftjis_decode(b1, b2);
#endif
#if CONFIG_WINDOWS1252
        (void)windows1252_decode(b1);
#endif
#if CONFIG_WINDOWS1251
        (void)windows1251_decode(b1);
#endif
#if CONFIG_BIG5
        (void)big5_decode(b1, b2);
#endif
#if CONFIG_EUCKR
        (void)euckr_decode(b1, b2);
#endif
#if CONFIG_EUCJP
        (void)eucjp_decode_jis0208(b1, b2);
        (void)eucjp_decode_jis0212(b1, b2);
#endif
#if CONFIG_GB18030
        (void)gb18030_decode_twobyte(b1, b2);
        (void)gb18030_decode_fourbyte(b1, b2, b3, b4);
#endif
    }
    TEST_ASSERT(1, "Random decode stress test completed without crash");
}

static void test_random_encodes(void) {
    TEST_SECTION("Random Encode Stress Test");
    uint32_t rng_state = 67890;
    uint8_t out[4];
    uint8_t lead, trail;

    printf("  Testing 100000 random codepoints...\n");
    for (int i = 0; i < 100000; i++) {
        uint32_t cp = xorshift32(&rng_state) % 0x110000;

        /* Skip surrogates */
        if (cp >= 0xD800 && cp <= 0xDFFF) continue;

        /* These should not crash regardless of input */
#if CONFIG_SHIFTJIS
        (void)shiftjis_encode(cp, &lead, &trail);
#endif
#if CONFIG_WINDOWS1252
        (void)windows1252_encode(cp, out);
#endif
#if CONFIG_WINDOWS1251
        (void)windows1251_encode(cp, out);
#endif
#if CONFIG_BIG5
        (void)big5_encode(cp, &lead, &trail);
#endif
#if CONFIG_EUCKR
        (void)euckr_encode(cp, &lead, &trail);
#endif
#if CONFIG_EUCJP
        (void)eucjp_encode(cp, out);
#endif
#if CONFIG_GB18030
        (void)gb18030_encode(cp, out);
#endif
    }
    TEST_ASSERT(1, "Random encode stress test completed without crash");
}

/* ============== Main ============== */

int main(int argc, char **argv) {
    printf("Encoding Library Fuzzer Tests\n");
    printf("==============================\n");

#if CONFIG_WINDOWS1252
    test_windows1252();
#endif
#if CONFIG_WINDOWS1251
    test_windows1251();
#endif
#if CONFIG_SHIFTJIS
    test_shiftjis();
#endif
#if CONFIG_BIG5
    test_big5();
#endif
#if CONFIG_EUCKR
    test_euckr();
#endif
#if CONFIG_EUCJP
    test_eucjp();
#endif
#if CONFIG_GB18030
    test_gb18030();
#endif

    test_utf_conv();

    test_random_decodes();
    test_random_encodes();

    printf("\n==============================\n");
    printf("Tests run: %d\n", tests_run);
    printf("Passed: %d\n", tests_passed);
    printf("Failed: %d\n", tests_failed);

    return tests_failed > 0 ? 1 : 0;
}
