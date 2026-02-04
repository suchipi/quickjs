#include "libgb18030.h"
#include "libgb18030-table.h"

uint32_t gb18030_decode_twobyte(uint8_t lead, uint8_t trail)
{
    int pointer, trail_offset;

    /* Validate lead byte range: 0x81-0xFE */
    if (lead < 0x81 || lead > 0xFE)
        return 0;

    /* Validate trail byte range: 0x40-0x7E or 0x80-0xFE */
    if (trail >= 0x40 && trail <= 0x7E)
        trail_offset = trail - 0x40;
    else if (trail >= 0x80 && trail <= 0xFE)
        trail_offset = trail - 0x41;  /* 0x80 - 0x40 + (0x7E - 0x40 + 1) - 1 = 0x3F */
    else
        return 0;

    /* Calculate pointer: (lead - 0x81) * 190 + trail_offset */
    pointer = (lead - 0x81) * 190 + trail_offset;

    if (pointer < 0 || pointer >= GB18030_TABLE_SIZE)
        return 0;

    return gb18030_decode_table[pointer];
}

uint32_t gb18030_decode_fourbyte(uint8_t b1, uint8_t b2, uint8_t b3, uint8_t b4)
{
    int pointer;
    int lo, hi, mid;
    uint32_t range_pointer, range_codepoint, offset;

    /* Validate byte ranges */
    if (b1 < 0x81 || b1 > 0xFE) return 0;
    if (b2 < 0x30 || b2 > 0x39) return 0;
    if (b3 < 0x81 || b3 > 0xFE) return 0;
    if (b4 < 0x30 || b4 > 0x39) return 0;

    /* Calculate pointer from 4-byte sequence */
    pointer = ((b1 - 0x81) * 10 * 126 * 10) +
              ((b2 - 0x30) * 126 * 10) +
              ((b3 - 0x81) * 10) +
              (b4 - 0x30);

    /* Binary search for the range containing this pointer */
    lo = 0;
    hi = GB18030_RANGES_SIZE - 1;

    while (lo < hi) {
        mid = (lo + hi + 1) / 2;
        if (gb18030_ranges_table[mid].pointer <= (unsigned int)pointer)
            lo = mid;
        else
            hi = mid - 1;
    }

    /* Found the range at index lo */
    range_pointer = gb18030_ranges_table[lo].pointer;
    range_codepoint = gb18030_ranges_table[lo].codepoint;

    /* Calculate offset from range start */
    offset = pointer - range_pointer;

    return range_codepoint + offset;
}

/* Binary search for a codepoint in the 2-byte encode table */
static int find_encode_pointer(uint32_t codepoint)
{
    int lo = 0, hi = GB18030_ENCODE_SIZE - 1;

    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        uint32_t mid_cp = gb18030_encode_table[mid].codepoint;
        if (mid_cp == codepoint)
            return gb18030_encode_table[mid].pointer;
        else if (mid_cp < codepoint)
            lo = mid + 1;
        else
            hi = mid - 1;
    }
    return -1;
}

/* Binary search for a codepoint in the ranges table (for encoding) */
static int find_range_for_codepoint(uint32_t codepoint, uint32_t *out_pointer)
{
    int lo = 0, hi = GB18030_RANGES_SIZE - 1;
    int mid;

    while (lo < hi) {
        mid = (lo + hi + 1) / 2;
        if (gb18030_ranges_table[mid].codepoint <= codepoint)
            lo = mid;
        else
            hi = mid - 1;
    }

    /* Check if codepoint is within this range */
    if (lo < GB18030_RANGES_SIZE) {
        uint32_t range_codepoint = gb18030_ranges_table[lo].codepoint;
        uint32_t range_pointer = gb18030_ranges_table[lo].pointer;
        uint32_t offset = codepoint - range_codepoint;

        /* The pointer for this codepoint */
        *out_pointer = range_pointer + offset;
        return 1;
    }
    return 0;
}

int gb18030_encode(uint32_t cp, uint8_t *out)
{
    int pointer;
    int lead, trail_offset;
    uint32_t range_pointer;

    /* ASCII: 0x00-0x7F map directly */
    if (cp < 0x80) {
        out[0] = (uint8_t)cp;
        return 1;
    }

    /* Try the 2-byte encode table first */
    pointer = find_encode_pointer(cp);
    if (pointer >= 0) {
        /* Convert pointer to lead/trail bytes */
        lead = pointer / 190;
        trail_offset = pointer % 190;

        /* Lead byte: 0x81 + lead */
        out[0] = (uint8_t)(0x81 + lead);

        /* Trail byte: 0x40-0x7E for trail_offset < 63, 0x80-0xFE for trail_offset >= 63 */
        if (trail_offset < 63)
            out[1] = (uint8_t)(0x40 + trail_offset);
        else
            out[1] = (uint8_t)(0x41 + trail_offset);  /* 0x80 + (trail_offset - 63) = 0x41 + trail_offset */

        return 2;
    }

    /* Use 4-byte encoding via ranges */
    if (find_range_for_codepoint(cp, &range_pointer)) {
        /* Convert pointer to 4-byte sequence */
        out[3] = (uint8_t)(0x30 + (range_pointer % 10));
        range_pointer /= 10;
        out[2] = (uint8_t)(0x81 + (range_pointer % 126));
        range_pointer /= 126;
        out[1] = (uint8_t)(0x30 + (range_pointer % 10));
        range_pointer /= 10;
        out[0] = (uint8_t)(0x81 + range_pointer);

        return 4;
    }

    /* Should not reach here for valid Unicode codepoints */
    return 0;
}
