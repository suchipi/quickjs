#ifndef LIBEUCJP_H
#define LIBEUCJP_H

#include <stdint.h>

/* Decode an EUC-JP JIS X 0208 double-byte sequence (no prefix).
   lead: lead byte (0xA1-0xFE)
   trail: trail byte (0xA1-0xFE)
   Returns Unicode code point, or 0 if unmapped. */
uint32_t eucjp_decode_jis0208(uint8_t lead, uint8_t trail);

/* Decode an EUC-JP JIS X 0212 triple-byte sequence (after 0x8F prefix).
   lead: lead byte (0xA1-0xFE)
   trail: trail byte (0xA1-0xFE)
   Returns Unicode code point, or 0 if unmapped. */
uint32_t eucjp_decode_jis0212(uint8_t lead, uint8_t trail);

/* Encode a Unicode code point to EUC-JP.
   cp: Unicode code point
   out: output buffer (must have room for at least 2 bytes)
   Returns:
     0 if the code point cannot be encoded in EUC-JP
     1 if the code point encodes to a single byte (ASCII)
     2 if the code point encodes to two bytes (JIS0208 or half-width katakana)
   Note: EUC-JP encoder does NOT support JIS X 0212 (per WHATWG spec). */
int eucjp_encode(uint32_t cp, uint8_t *out);

#endif /* LIBEUCJP_H */
