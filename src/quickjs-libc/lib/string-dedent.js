/*
 * string-dedent (from npm)
 *
 * Copyright (c) 2020-2022 Justin Ridgewell
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

// We are using it as a polyfill for https://github.com/tc39/proposal-string-dedent

(() => {
  const cache = new WeakMap();
  const newline = /(\n|\r\n?|\u2028|\u2029)/g;
  const leadingWhitespace = /^\s*/;
  const nonWhitespace = /\S/;
  const slice = Array.prototype.slice;
  function dedent(arg) {
    if (typeof arg === "string") {
      return process([arg])[0];
    }
    if (typeof arg === "function") {
      return function () {
        const args = slice.call(arguments);
        args[0] = processTemplateStringsArray(args[0]);
        return arg.apply(this, args);
      };
    }
    const strings = processTemplateStringsArray(arg);
    // TODO: This is just `String.cooked`: https://tc39.es/proposal-string-cooked/
    let s = getCooked(strings, 0);
    for (let i = 1; i < strings.length; i++) {
      s += arguments[i] + getCooked(strings, i);
    }
    return s;
  }
  function getCooked(strings, index) {
    const str = strings[index];
    if (str === undefined)
      throw new TypeError(`invalid cooked string at index ${index}`);
    return str;
  }
  function processTemplateStringsArray(strings) {
    const cached = cache.get(strings);
    if (cached) return cached;
    const dedented = process(strings);
    cache.set(strings, dedented);
    Object.defineProperty(dedented, "raw", {
      value: Object.freeze(process(strings.raw)),
    });
    Object.freeze(dedented);
    return dedented;
  }
  function process(strings) {
    // splitQuasis is now an array of arrays. The inner array is contains text content lines on the
    // even indices, and the newline char that ends the text content line on the odd indices.
    // In the first array, the inner array's 0 index is the opening line of the template literal.
    // In all other arrays, the inner array's 0 index is the continuation of the line directly after a
    // template expression.
    //
    // Eg, in the following case:
    //
    // ```
    // String.dedent`
    //   first
    //   ${expression} second
    //   third
    // `
    // ```
    //
    // We expect the following splitQuasis:
    //
    // ```
    // [
    //   ["", "\n", "  first", "\n", "  "],
    //   [" second", "\n", "  third", "\n", ""],
    // ]
    // ```
    const splitQuasis = strings.map((quasi) =>
      quasi === null || quasi === void 0 ? void 0 : quasi.split(newline)
    );
    let common;
    for (let i = 0; i < splitQuasis.length; i++) {
      const lines = splitQuasis[i];
      if (lines === undefined) continue;
      // The first split is the static text starting at the opening line until the first template
      // expression (or the end of the template if there are no expressions).
      const firstSplit = i === 0;
      // The last split is all the static text after the final template expression until the closing
      // line. If there are no template expressions, then the first split is also the last split.
      const lastSplit = i + 1 === splitQuasis.length;
      // The opening line must be empty (it very likely is) and it must not contain a template
      // expression. The opening line's trailing newline char is removed.
      if (firstSplit) {
        // Length > 1 ensures there is a newline, and there is not a template expression.
        if (lines.length === 1 || lines[0].length > 0) {
          throw new Error("invalid content on opening line");
        }
        // Clear the captured newline char.
        lines[1] = "";
      }
      // The closing line may only contain whitespace and must not contain a template expression. The
      // closing line and its preceding newline are removed.
      if (lastSplit) {
        // Length > 1 ensures there is a newline, and there is not a template expression.
        if (lines.length === 1 || nonWhitespace.test(lines[lines.length - 1])) {
          throw new Error("invalid content on closing line");
        }
        // Clear the captured newline char, and the whitespace on the closing line.
        lines[lines.length - 2] = "";
        lines[lines.length - 1] = "";
      }
      // In the first spit, the index 0 is the opening line (which must be empty by now), and in all
      // other splits, its the content trailing the template expression (and so can't be part of
      // leading whitespace).
      // Every odd index is the captured newline char, so we'll skip and only process evens.
      for (let j = 2; j < lines.length; j += 2) {
        const text = lines[j];
        // If we are on the last line of this split, and we are not processing the last split (which
        // is after all template expressions), then this line contains a template expression.
        const lineContainsTemplateExpression =
          j + 1 === lines.length && !lastSplit;
        // leadingWhitespace is guaranteed to match something, but it could be 0 chars.
        const leading = leadingWhitespace.exec(text)[0];
        // Empty lines do not affect the common indentation, and whitespace only lines are emptied
        // (and also don't affect the comon indentation).
        if (!lineContainsTemplateExpression && leading.length === text.length) {
          lines[j] = "";
          continue;
        }
        common = commonStart(leading, common);
      }
    }
    const min = common ? common.length : 0;
    return splitQuasis.map((lines) => {
      if (lines === undefined) return lines;
      let quasi = lines[0];
      for (let i = 1; i < lines.length; i += 2) {
        const newline = lines[i];
        const text = lines[i + 1];
        quasi += newline + text.slice(min);
      }
      return quasi;
    });
  }
  function commonStart(a, b) {
    if (b === undefined || a === b) return a;
    let i = 0;
    for (const len = Math.min(a.length, b.length); i < len; i++) {
      if (a[i] !== b[i]) break;
    }
    return a.slice(0, i);
  }

  String.dedent = dedent;
})();
