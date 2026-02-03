#ifndef LIBSHIFTJIS_H
#define LIBSHIFTJIS_H

#include <stdint.h>

/* Decode a Shift_JIS double-byte sequence to a Unicode code point.
   lead: lead byte (0x81-0x9F or 0xE0-0xFC)
   trail: trail byte (0x40-0x7E or 0x80-0xFC)
   Returns Unicode code point, or 0 if unmapped. */
uint32_t shiftjis_decode(uint8_t lead, uint8_t trail);

#endif /* LIBSHIFTJIS_H */
