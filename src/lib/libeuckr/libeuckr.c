#include "libeuckr.h"
#include "libeuckr-table.h"

uint32_t euckr_decode(uint8_t lead, uint8_t trail)
{
    int pointer;

    /* Validate lead byte range: 0x81-0xFE */
    if (lead < 0x81 || lead > 0xFE)
        return 0;

    /* Validate trail byte range: 0x41-0xFE */
    if (trail < 0x41 || trail > 0xFE)
        return 0;

    /* Calculate pointer */
    pointer = (lead - 0x81) * 190 + (trail - 0x41);

    if (pointer < 0 || pointer >= EUCKR_TABLE_SIZE)
        return 0;

    return euckr_decode_table[pointer];
}

/* Binary search for a codepoint in the encode table */
static int find_encode_pointer(uint32_t codepoint)
{
    int lo = 0, hi = EUCKR_ENCODE_SIZE - 1;

    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        uint32_t mid_cp = euckr_encode_table[mid].codepoint;
        if (mid_cp == codepoint)
            return euckr_encode_table[mid].pointer;
        else if (mid_cp < codepoint)
            lo = mid + 1;
        else
            hi = mid - 1;
    }
    return -1;
}

int euckr_encode(uint32_t cp, uint8_t *out_lead, uint8_t *out_trail)
{
    int pointer, lead, trail;

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
    lead = pointer / 190;
    trail = pointer % 190;

    /* Lead byte: 0x81 + lead */
    *out_lead = (uint8_t)(0x81 + lead);

    /* Trail byte: 0x41 + trail */
    *out_trail = (uint8_t)(0x41 + trail);

    return 2;
}
