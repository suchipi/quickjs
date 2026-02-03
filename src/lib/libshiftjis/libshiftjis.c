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
