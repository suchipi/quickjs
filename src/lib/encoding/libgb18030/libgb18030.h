#ifndef LIBGB18030_H
#define LIBGB18030_H

#include <stdint.h>

/* Decode a GB18030 2-byte sequence to a Unicode code point.
   lead: lead byte (0x81-0xFE)
   trail: trail byte (0x40-0x7E or 0x80-0xFE)
   Returns Unicode code point, or 0 if unmapped. */
uint32_t gb18030_decode_twobyte(uint8_t lead, uint8_t trail);

/* Decode a GB18030 4-byte sequence to a Unicode code point.
   b1: first byte (0x81-0xFE)
   b2: second byte (0x30-0x39)
   b3: third byte (0x81-0xFE)
   b4: fourth byte (0x30-0x39)
   Returns Unicode code point, or 0 if invalid. */
uint32_t gb18030_decode_fourbyte(uint8_t b1, uint8_t b2, uint8_t b3, uint8_t b4);

/* Encode a Unicode code point to GB18030.
   cp: Unicode code point
   out: output buffer (must have room for at least 4 bytes)
   Returns:
     0 if the code point cannot be encoded (should not happen for valid Unicode)
     1 if the code point encodes to a single byte (ASCII)
     2 if the code point encodes to two bytes
     4 if the code point encodes to four bytes */
int gb18030_encode(uint32_t cp, uint8_t *out);

#endif /* LIBGB18030_H */
