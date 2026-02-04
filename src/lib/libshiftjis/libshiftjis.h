#ifndef LIBSHIFTJIS_H
#define LIBSHIFTJIS_H

#include <stdint.h>

/* Decode a Shift_JIS double-byte sequence to a Unicode code point.
   lead: lead byte (0x81-0x9F or 0xE0-0xFC)
   trail: trail byte (0x40-0x7E or 0x80-0xFC)
   Returns Unicode code point, or 0 if unmapped. */
uint32_t shiftjis_decode(uint8_t lead, uint8_t trail);

/* Encode a Unicode code point to Shift_JIS.
   cp: Unicode code point
   out_lead: output lead byte
   out_trail: output trail byte
   Returns:
     0 if the code point cannot be encoded in Shift_JIS
     1 if the code point encodes to a single byte (stored in *out_lead, *out_trail is undefined)
     2 if the code point encodes to two bytes (stored in *out_lead and *out_trail) */
int shiftjis_encode(uint32_t cp, uint8_t *out_lead, uint8_t *out_trail);

#endif /* LIBSHIFTJIS_H */
