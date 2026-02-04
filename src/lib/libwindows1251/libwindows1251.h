#ifndef LIBWINDOWS1251_H
#define LIBWINDOWS1251_H

#include <stdint.h>

/* Decode a Windows-1251 byte to a Unicode code point.
   byte: input byte (0x80-0xFF for extended range, 0x00-0x7F for ASCII)
   Returns Unicode code point. For bytes 0x00-0x7F, returns the byte value.
   For bytes 0x80-0xFF, returns the mapped codepoint (or the byte value if unmapped). */
uint32_t windows1251_decode(uint8_t byte);

/* Encode a Unicode code point to Windows-1251.
   cp: Unicode code point
   out_byte: output byte
   Returns:
     1 if the code point was encoded successfully (stored in *out_byte)
     0 if the code point cannot be encoded in Windows-1251 */
int windows1251_encode(uint32_t cp, uint8_t *out_byte);

#endif /* LIBWINDOWS1251_H */
