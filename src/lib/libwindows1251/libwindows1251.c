#include "libwindows1251.h"
#include "libwindows1251-table.h"

uint32_t windows1251_decode(uint8_t byte)
{
    /* ASCII range passes through */
    if (byte < 0x80)
        return byte;

    /* Look up in decode table */
    uint32_t cp = windows1251_decode_table[byte - 0x80];

    /* If unmapped (0), return the byte value itself */
    return cp ? cp : byte;
}

/* Binary search for a codepoint in the encode table */
static int find_encode_byte(uint32_t codepoint)
{
    int lo = 0, hi = WINDOWS1251_ENCODE_SIZE - 1;

    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        uint32_t mid_cp = windows1251_encode_table[mid].codepoint;
        if (mid_cp == codepoint)
            return windows1251_encode_table[mid].byte;
        else if (mid_cp < codepoint)
            lo = mid + 1;
        else
            hi = mid - 1;
    }
    return -1;
}

int windows1251_encode(uint32_t cp, uint8_t *out_byte)
{
    /* ASCII range: 0x00-0x7F map directly */
    if (cp < 0x80) {
        *out_byte = (uint8_t)cp;
        return 1;
    }

    /* Look up in the encode table */
    int byte = find_encode_byte(cp);
    if (byte >= 0) {
        *out_byte = (uint8_t)byte;
        return 1;
    }

    return 0;
}
