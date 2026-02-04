#include "libeucjp.h"
#include "libeucjp-table.h"

uint32_t eucjp_decode_jis0208(uint8_t lead, uint8_t trail)
{
    int pointer;

    /* Validate byte ranges: 0xA1-0xFE */
    if (lead < 0xA1 || lead > 0xFE)
        return 0;
    if (trail < 0xA1 || trail > 0xFE)
        return 0;

    /* Calculate pointer: (lead - 0xA1) * 94 + (trail - 0xA1) */
    pointer = (lead - 0xA1) * 94 + (trail - 0xA1);

    if (pointer < 0 || pointer >= EUCJP_JIS0208_SIZE)
        return 0;

    return eucjp_jis0208_table[pointer];
}

uint32_t eucjp_decode_jis0212(uint8_t lead, uint8_t trail)
{
    int pointer;

    /* Validate byte ranges: 0xA1-0xFE */
    if (lead < 0xA1 || lead > 0xFE)
        return 0;
    if (trail < 0xA1 || trail > 0xFE)
        return 0;

    /* Calculate pointer: (lead - 0xA1) * 94 + (trail - 0xA1) */
    pointer = (lead - 0xA1) * 94 + (trail - 0xA1);

    if (pointer < 0 || pointer >= EUCJP_JIS0212_SIZE)
        return 0;

    return eucjp_jis0212_table[pointer];
}

/* Binary search for a codepoint in the encode table */
static int find_encode_pointer(uint32_t codepoint)
{
    int lo = 0, hi = EUCJP_ENCODE_SIZE - 1;

    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        uint32_t mid_cp = eucjp_encode_table[mid].codepoint;
        if (mid_cp == codepoint)
            return eucjp_encode_table[mid].pointer;
        else if (mid_cp < codepoint)
            lo = mid + 1;
        else
            hi = mid - 1;
    }
    return -1;
}

int eucjp_encode(uint32_t cp, uint8_t *out)
{
    int pointer, lead, trail;

    /* ASCII: 0x00-0x7F map directly */
    if (cp < 0x80) {
        out[0] = (uint8_t)cp;
        return 1;
    }

    /* U+00A5 (YEN SIGN) → 0x5C per WHATWG */
    if (cp == 0x00A5) {
        out[0] = 0x5C;
        return 1;
    }

    /* U+203E (OVERLINE) → 0x7E per WHATWG */
    if (cp == 0x203E) {
        out[0] = 0x7E;
        return 1;
    }

    /* Half-width katakana: U+FF61-U+FF9F → 0x8E + 0xA1-0xDF */
    if (cp >= 0xFF61 && cp <= 0xFF9F) {
        out[0] = 0x8E;
        out[1] = (uint8_t)(0xA1 + cp - 0xFF61);
        return 2;
    }

    /* Look up in JIS0208 encode table */
    pointer = find_encode_pointer(cp);
    if (pointer < 0)
        return 0;

    /* Convert pointer to lead/trail bytes */
    lead = pointer / 94;
    trail = pointer % 94;

    /* Lead byte: 0xA1 + lead */
    out[0] = (uint8_t)(0xA1 + lead);

    /* Trail byte: 0xA1 + trail */
    out[1] = (uint8_t)(0xA1 + trail);

    return 2;
}
