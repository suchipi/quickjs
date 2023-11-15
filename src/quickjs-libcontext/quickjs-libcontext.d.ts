declare module "quickjs:context" {
  /**
   * A separate global context (or 'realm') within which code can be executed.
   */
  export class Context {
    /**
     * Create a new global context (or 'realm') within code can be executed.
     *
     * @param options Options for what globals/modules/etc to make available within the context.
     *
     * The following globals are always present, regardless of options:
     *
     * - Object
     * - Function
     * - Error
     * - EvalError
     * - RangeError
     * - ReferenceError
     * - SyntaxError
     * - TypeError
     * - URIError
     * - InternalError
     * - AggregateError
     * - Array
     * - parseInt
     * - parseFloat
     * - isNaN
     * - isFinite
     * - decodeURI
     * - decodeURIComponent
     * - encodeURI
     * - encodeURIComponent
     * - escape
     * - unescape
     * - Infinity
     * - NaN
     * - undefined
     * - __date_clock
     * - Number
     * - Boolean
     * - String
     * - Math
     * - Reflect
     * - Symbol
     * - eval (but it doesn't work unless the `eval` option is enabled)
     * - globalThis
     *
     * Note that new contexts don't have a `scriptArgs` global. If you need one
     * to be present in the new context, you can add one onto the Context's
     * `globalThis` property.
     */
    constructor(options?: {
      /** Enables `Date`. Defaults to `true` */
      date?: boolean;

      /** Enables `eval`. Defaults to `true` */
      eval?: boolean;

      /** Enables `String.prototype.normalize`. Defaults to `true`. */
      stringNormalize?: boolean;

      /** Enables `String.dedent`. Defaults to `true`. */
      stringDedent?: boolean;

      /** Enables `RegExp`. Defaults to `true`. */
      regExp?: boolean;

      /** Enables `JSON`. Defaults to `true`. */
      json?: boolean;

      /** Enables `Proxy`. Defaults to `true`. */
      proxy?: boolean;

      /** Enables `Map` and `Set`. Defaults to `true`. */
      mapSet?: boolean;

      /**
       * Enables:
       *
       * - ArrayBuffer
       * - SharedArrayBuffer
       * - Uint8ClampedArray
       * - Int8Array
       * - Uint8Array
       * - Int16Array
       * - Uint16Array
       * - Int32Array
       * - Uint32Array
       * - BigInt64Array
       * - BigUint64Array
       * - Float32Array
       * - Float64Array
       * - DataView
       *
       * Defaults to `true`.
       */
      typedArrays?: boolean;

      /**
       * Enables:
       *
       * - Promise
       * - async functions
       * - async iterators
       * - async generators
       *
       * Defaults to `true`.
       */
      promise?: boolean;

      /** Enables `BigInt`. Defaults to `true`. */
      bigint?: boolean;

      /** Enables `BigFloat`. Defaults to `true`. */
      bigfloat?: boolean;

      /** Enables `BigDecimal`. Defaults to `true`. */
      bigdecimal?: boolean;

      /**
       * Enables:
       *
       * - Operators
       * - OperatorSet creation
       * - operator overloading
       *
       * Defaults to `true`.
       */
      operators?: boolean;

      /** Enables `"use math"`. Defaults to `true`. */
      useMath?: boolean;

      /** Enables `inspect`. Defaults to `true`. */
      inspect?: boolean;
      /** Enables `console`. Defaults to `true`. */
      console?: boolean;
      /** Enables `print`. Defaults to `true`. */
      print?: boolean;
      /** Enables `require`. Defaults to `true`. */
      moduleGlobals?: boolean;
      /**
       * Enables `setTimeout`, `clearTimeout`, `setInterval`, and
       * `clearInterval`. Defaults to `true`.
       */
      timers?: boolean;

      /** Enable builtin modules. */
      modules?: {
        /** Enables the "quickjs:std" module. Defaults to `true`. */
        "quickjs:std"?: boolean;
        /** Enables the "quickjs:os" module. Defaults to `true`. */
        "quickjs:os"?: boolean;
        /** Enables the "quickjs:bytecode" module. Defaults to `true`. */
        "quickjs:bytecode"?: boolean;
        /** Enables the "quickjs:context" module. Defaults to `true`. */
        "quickjs:context"?: boolean;
        /** Enables the "quickjs:module" module. Defaults to `true`. */
        "quickjs:module"?: boolean;
      };
    });

    /**
     * The `globalThis` object used by this context.
     *
     * You can add to or remove from it to change what is visible to the context.
     */
    globalThis: typeof globalThis;

    /**
     * Runs code within the context and returns the result.
     *
     * @param code The code to run.
     */
    eval(code: string): any;
  }
}
