#ifndef LIBBIG5_H
#define LIBBIG5_H

#include <stdint.h>

/* Decode a Big5 double-byte sequence to a Unicode code point.
   lead: lead byte (0x81-0xFE)
   trail: trail byte (0x40-0x7E or 0xA1-0xFE)
   Returns Unicode code point, or 0 if unmapped. */
uint32_t big5_decode(uint8_t lead, uint8_t trail);

/* Encode a Unicode code point to Big5.
   cp: Unicode code point
   out_lead: output lead byte
   out_trail: output trail byte
   Returns:
     0 if the code point cannot be encoded in Big5
     1 if the code point encodes to a single byte (ASCII, stored in *out_lead)
     2 if the code point encodes to two bytes (stored in *out_lead and *out_trail) */
int big5_encode(uint32_t cp, uint8_t *out_lead, uint8_t *out_trail);

#endif /* LIBBIG5_H */
