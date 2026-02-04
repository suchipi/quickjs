declare module "quickjs:encoding" {
  export function toUtf8(input: ArrayBuffer): string;
  export function fromUtf8(input: string): ArrayBuffer;

  /**
   * Encodes a string into bytes, following the WHATWG Encoding standard.
   * Supports UTF-8, UTF-16LE, UTF-16BE, Shift_JIS, Windows-1252, Windows-1251,
   * Big5, EUC-KR, EUC-JP, and GB18030 encodings.
   */
  export class TextEncoder {
    constructor(label?: TextEncodingLabel);
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

  /** The canonical encoding name returned by `.encoding` property */
  type TextEncoding =
    | "utf-8"
    | "utf-16le"
    | "utf-16be"
    | "shift_jis"
    | "windows-1252"
    | "windows-1251"
    | "big5"
    | "euc-kr"
    | "euc-jp"
    | "gb18030";

  /** All encoding labels accepted by TextEncoder/TextDecoder constructor */
  type TextEncodingLabel =
    | TextEncoding
    // UTF-8 aliases
    | "utf8"
    | "unicode-1-1-utf-8"
    // UTF-16 aliases
    | "utf-16"
    // Shift_JIS aliases
    | "shift-jis"
    | "sjis"
    | "csshiftjis"
    | "ms932"
    | "ms_kanji"
    | "windows-31j"
    | "x-sjis"
    // Windows-1252 aliases (WHATWG maps iso-8859-1 to windows-1252)
    | "cp1252"
    | "iso-8859-1"
    | "iso8859-1"
    | "iso_8859-1"
    | "latin1"
    | "iso-8859-15"
    | "us-ascii"
    | "ascii"
    | "x-cp1252"
    // Windows-1251 aliases
    | "cp1251"
    | "x-cp1251"
    // Big5 aliases
    | "big5-hkscs"
    | "cn-big5"
    | "csbig5"
    | "x-x-big5"
    // EUC-KR aliases
    | "cseuckr"
    | "korean"
    | "ks_c_5601-1987"
    | "iso-ir-149"
    | "csksc"
    // EUC-JP aliases
    | "cseucpkdfmtjapanese"
    | "x-euc-jp"
    // GB18030 aliases (WHATWG maps gb2312 and gbk to gb18030)
    | "gb2312"
    | "gbk"
    | "chinese"
    | "csgb2312"
    | "x-gbk"
    | "gb_2312-80"
    | "iso-ir-58";

  /**
   * Decodes bytes into a string, following the WHATWG Encoding standard.
   * Supports UTF-8, UTF-16LE, UTF-16BE, Shift_JIS, Windows-1252, Windows-1251,
   * Big5, EUC-KR, EUC-JP, and GB18030 encodings.
   */
  export class TextDecoder {
    constructor(
      label?: TextEncodingLabel,
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
