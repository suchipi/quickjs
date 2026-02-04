#include "libshiftjis.h"
#include "libshiftjis-table.h"

uint32_t shiftjis_decode(uint8_t lead, uint8_t trail)
{
    int lead_offset, trail_offset, pointer;

    /* Validate trail byte range */
    if (!((trail >= 0x40 && trail <= 0x7E) || (trail >= 0x80 && trail <= 0xFC)))
        return 0;

    lead_offset = (lead < 0xA0) ? 0x81 : 0xC1;
    trail_offset = (trail < 0x7F) ? 0x40 : 0x41;
    pointer = (lead - lead_offset) * 188 + (trail - trail_offset);

    if (pointer < 0 || pointer >= JIS0208_TABLE_SIZE)
        return 0;

    /* Pointer range 8836-10715 maps to PUA (Private Use Area) */
    if (pointer >= 8836 && pointer <= 10715)
        return 0xE000 + pointer - 8836;

    return (uint32_t)jis0208_table[pointer];
}

/* Binary search for a codepoint in the encode table */
static int find_encode_pointer(uint16_t codepoint)
{
    int lo = 0, hi = JIS0208_ENCODE_SIZE - 1;

    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        uint16_t mid_cp = jis0208_encode_table[mid].codepoint;
        if (mid_cp == codepoint)
            return jis0208_encode_table[mid].pointer;
        else if (mid_cp < codepoint)
            lo = mid + 1;
        else
            hi = mid - 1;
    }
    return -1;
}

int shiftjis_encode(uint32_t cp, uint8_t *out_lead, uint8_t *out_trail)
{
    int pointer, lead, trail;

    /* ASCII: 0x00-0x7F map directly (except 0x5C and 0x7E per WHATWG encoder) */
    if (cp <= 0x7F) {
        /* WHATWG Shift_JIS encoder: 0x00A5 (YEN) → 0x5C, 0x203E (OVERLINE) → 0x7E
           But for raw ASCII, pass through unchanged */
        *out_lead = (uint8_t)cp;
        return 1;
    }

    /* U+0080: single byte 0x80 */
    if (cp == 0x80) {
        *out_lead = 0x80;
        return 1;
    }

    /* U+00A5 (YEN SIGN) → 0x5C per WHATWG encoder */
    if (cp == 0x00A5) {
        *out_lead = 0x5C;
        return 1;
    }

    /* U+203E (OVERLINE) → 0x7E per WHATWG encoder */
    if (cp == 0x203E) {
        *out_lead = 0x7E;
        return 1;
    }

    /* Half-width katakana: U+FF61-U+FF9F → 0xA1-0xDF */
    if (cp >= 0xFF61 && cp <= 0xFF9F) {
        *out_lead = (uint8_t)(0xA1 + cp - 0xFF61);
        return 1;
    }

    /* Code points above BMP cannot be encoded */
    if (cp > 0xFFFF)
        return 0;

    /* Look up in the encode table */
    pointer = find_encode_pointer((uint16_t)cp);
    if (pointer < 0)
        return 0;

    /* Convert pointer to lead/trail bytes */
    lead = pointer / 188;
    trail = pointer % 188;

    /* Lead byte: 0x81-0x9F for lead < 31, 0xE0-0xFC for lead >= 31 */
    if (lead < 0x1F)
        *out_lead = (uint8_t)(0x81 + lead);
    else
        *out_lead = (uint8_t)(0xC1 + lead);

    /* Trail byte: 0x40-0x7E for trail < 63, 0x80-0xFC for trail >= 63 */
    if (trail < 0x3F)
        *out_trail = (uint8_t)(0x40 + trail);
    else
        *out_trail = (uint8_t)(0x41 + trail);

    return 2;
}
