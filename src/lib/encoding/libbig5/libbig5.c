#include "libbig5.h"
#include "libbig5-table.h"

uint32_t big5_decode(uint8_t lead, uint8_t trail)
{
    int pointer, trail_offset;

    /* Validate lead byte range: 0x81-0xFE */
    if (lead < 0x81 || lead > 0xFE)
        return 0;

    /* Validate trail byte range: 0x40-0x7E or 0xA1-0xFE */
    if (trail >= 0x40 && trail <= 0x7E)
        trail_offset = trail - 0x40;
    else if (trail >= 0xA1 && trail <= 0xFE)
        trail_offset = trail - 0x62;  /* 0xA1 - 0x40 + (0x7E - 0x40 + 1) = 0x62 */
    else
        return 0;

    /* Calculate pointer */
    pointer = (lead - 0x81) * 157 + trail_offset;

    if (pointer < 0 || pointer >= BIG5_TABLE_SIZE)
        return 0;

    return big5_decode_table[pointer];
}

/* Binary search for a codepoint in the encode table */
static int find_encode_pointer(uint32_t codepoint)
{
    int lo = 0, hi = BIG5_ENCODE_SIZE - 1;

    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        uint32_t mid_cp = big5_encode_table[mid].codepoint;
        if (mid_cp == codepoint)
            return big5_encode_table[mid].pointer;
        else if (mid_cp < codepoint)
            lo = mid + 1;
        else
            hi = mid - 1;
    }
    return -1;
}

int big5_encode(uint32_t cp, uint8_t *out_lead, uint8_t *out_trail)
{
    int pointer, lead, trail_offset;

    /* ASCII: 0x00-0x7F map directly */
    if (cp < 0x80) {
        *out_lead = (uint8_t)cp;
        return 1;
    }

    /* Look up in the encode table */
    pointer = find_encode_pointer(cp);
    if (pointer < 0)
        return 0;

    /* Convert pointer to lead/trail bytes */
    lead = pointer / 157;
    trail_offset = pointer % 157;

    /* Lead byte: 0x81 + lead */
    *out_lead = (uint8_t)(0x81 + lead);

    /* Trail byte: 0x40-0x7E for trail_offset < 63, 0xA1-0xFE for trail_offset >= 63 */
    if (trail_offset < 63)
        *out_trail = (uint8_t)(0x40 + trail_offset);
    else
        *out_trail = (uint8_t)(0x62 + trail_offset);  /* 0xA1 + (trail_offset - 63) = 0x62 + trail_offset */

    return 2;
}
