/** npm: @suchipi/print@2.2.0. License: ISC */

/*
Copyright (c) 2016-2022, John Gardner
Copyright (c) 2022 Lily Skye

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

/**
 * Options for {@link inspect}.
 */
declare interface InspectOptions {
  /** Whether to display non-enumerable properties. Defaults to false. */
  all?: boolean;

  /** Whether to invoke getter functions. Defaults to false. */
  followGetters?: boolean;

  /** Whether to display the indexes of iterable entries. Defaults to false. */
  indexes?: boolean;

  /** Hide object details after 𝑁 recursions. Defaults to Infinity. */
  maxDepth?: number;

  /** If true, don't identify well-known symbols as `@@…`. Defaults to false. */
  noAmp?: boolean;

  /** If true, don't format byte-arrays as hexadecimal. Defaults to false. */
  noHex?: boolean;

  /** If true, don't display function source code. Defaults to false. */
  noSource?: boolean;

  /** Whether to show `__proto__` properties if possible. Defaults to false. */
  proto?: boolean;

  /** Whether to sort properties alphabetically. When false, properties are sorted by creation order. Defaults to false. */
  sort?: boolean;

  /** Options that control whether and how ANSI terminal escape sequences for colours should be added to the output. Defaults to false, meaning no colours. */
  colours?: boolean | 256 | 8 | InspectColours;

  /** Prefix string to use for indentation. Defaults to '\t'. */
  indent?: string;
}

declare interface InspectColours {
  off?: string | number;
  red?: string | number;
  grey?: string | number;
  green?: string | number;
  darkGreen?: string | number;
  punct?: string | number;
  keys?: string | number;
  keyEscape?: string | number;
  typeColour?: string | number;
  primitive?: string | number;
  escape?: string | number;
  date?: string | number;
  hexBorder?: string | number;
  hexValue?: string | number;
  hexOffset?: string | number;
  reference?: string | number;
  srcBorder?: string | number;
  srcRowNum?: string | number;
  srcRowText?: string | number;
  nul?: string | number;
  nulProt?: string | number;
  undef?: string | number;
  noExts?: string | number;
  frozen?: string | number;
  sealed?: string | number;
  regex?: string | number;
  string?: string | number;
  symbol?: string | number;
  symbolFade?: string | number;
  braces?: string | number;
  quotes?: string | number;
  empty?: string | number;
  dot?: string | number;
}

declare interface InspectFunction {
  /**
   * Generate a human-readable representation of a value.
   *
   * @param value - Value to inspect
   * @param options - Additional settings for refining output
   * @returns A string representation of `value`.
   */
  (value: any, options?: InspectOptions): string;

  /**
   * Generate a human-readable representation of a value.
   *
   * @param value - Value to inspect
   * @param key - The value's corresponding member name
   * @param options - Additional settings for refining output
   * @returns A string representation of `value`.
   */
  (value: any, key?: string | symbol, options?: InspectOptions): string;
}

/**
 * Generate a human-readable representation of a value.
 *
 * @param value - Value to inspect
 * @param key - The value's corresponding member name
 * @param options - Additional settings for refining output
 * @returns A string representation of `value`.
 */
declare var inspect: InspectFunction;
