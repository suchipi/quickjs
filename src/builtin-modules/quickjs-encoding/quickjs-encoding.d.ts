declare module "quickjs:encoding" {
  export function toUtf8(input: ArrayBuffer): string;
  export function fromUtf8(input: string): ArrayBuffer;

  /**
   * Encodes a string into bytes, following the WHATWG Encoding standard.
   * Supports UTF-8, UTF-16LE, UTF-16BE, and Shift_JIS encodings (non-standard extension).
   */
  export class TextEncoder {
    constructor(
      label?:
        | TextEncoding
        | "utf8"
        | "utf-16"
        | "unicode-1-1-utf-8"
        | "shift-jis"
        | "sjis"
        | "csshiftjis"
        | "ms932"
        | "ms_kanji"
        | "windows-31j"
        | "x-sjis"
    );
    readonly encoding: TextEncoding;
    /**
     * Encodes the input string into bytes.
     * @param input The string to encode.
     * @param options Options for encoding. The `stream` option (non-standard) can be used
     *                to preserve state for stateful encodings like UTF-16.
     */
    encode(input?: string, options?: { stream?: boolean }): Uint8Array;
    /**
     * Encodes the source string into the destination Uint8Array.
     * Note: Unlike the standard TextEncoder, this supports all encodings (non-standard extension).
     */
    encodeInto(
      source: string,
      destination: Uint8Array
    ): { read: number; written: number };
  }

  type TextEncoding = "utf-8" | "utf-16le" | "utf-16be" | "shift_jis";

  /**
   * Decodes bytes into a string, following the WHATWG Encoding standard.
   * Supports UTF-8, UTF-16LE, UTF-16BE, and Shift_JIS encodings.
   */
  export class TextDecoder {
    constructor(
      label?:
        | TextEncoding
        | "utf8"
        | "utf-16"
        | "unicode-1-1-utf-8"
        | "shift-jis"
        | "sjis"
        | "csshiftjis"
        | "ms932"
        | "ms_kanji"
        | "windows-31j"
        | "x-sjis",
      options?: { fatal?: boolean; ignoreBOM?: boolean }
    );
    readonly encoding: TextEncoding;
    readonly fatal: boolean;
    readonly ignoreBOM: boolean;
    decode(
      input?: ArrayBuffer | ArrayBufferView,
      options?: { stream?: boolean }
    ): string;
  }
}
