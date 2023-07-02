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
     */
    constructor(options?: {
      /** Enables `Date`. Defaults to `true` */
      date?: boolean;

      /** Enables `eval`. Defaults to `true` */
      eval?: boolean;

      /** Enables `String.prototype.normalize`. Defaults to `true`. */
      stringNormalize?: boolean;

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

      /** Enables "use math". Defaults to `true`. */
      useMath?: boolean;

      /**
       * Enables:
       *
       * - inspect
       * - console
       * - print
       * - require (and require.resolve)
       * - setTimeout
       * - clearTimeout
       * - setInterval
       * - clearInterval
       * - String.cooked
       * - String.dedent
       *
       * Defaults to `true`.
       *
       * NOTE: The following globals, normally part of `js_std_add_helpers`, are NEVER added:
       *
       * - Module
       * - scriptArgs
       *
       * If you need them in the new context, copy them over from your context's globalThis onto the child context's globalThis.
       */
      stdHelpers?: boolean;

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