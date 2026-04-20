declare module "quickjs:bytecode" {
  /**
   * Convert the module or script in the specified file into bytecode.
   *
   * When converted back to a value, it will be a function.
   */
  export function fromFile(
    path: string,
    options?: {
      byteSwap?: boolean;
      sourceType?: "module" | "script";
      encodedFileName?: string;
    }
  ): ArrayBuffer;

  /**
   * Convert the provided value into bytecode. Doesn't work with all values.
   *
   * By default, cycles and shared references are preserved — if the same
   * inner object appears at two positions in `value`, the result
   * deserialized via `toValue` will have those positions referencing a
   * single object. Self-referential graphs (e.g. `obj.self = obj`) round-
   * trip correctly. To opt out and produce a stream that errors on
   * cycles, pass `preserveReferences: false`.
   *
   * To serialize Error instances (including `TypeError`, `RangeError`,
   * `SyntaxError`, `ReferenceError`, `URIError`, `EvalError`,
   * `AggregateError`, and `InternalError`), pass `serializeErrors: true`.
   * Without it, attempting to serialize any Error instance throws
   * "unsupported object class".
   */
  export function fromValue(
    value: any,
    options?: {
      byteSwap?: boolean;
      /**
       * Preserve shared references and cycles in the serialized output.
       * When true (the default), object graphs with cycles or shared
       * inner objects are encoded with back-references so they round-
       * trip via `toValue` with identity preserved. When false, the
       * serializer throws on encountering a cycle. The matching
       * `preserveReferences` option on `toValue` must be set to decode
       * a stream produced with this flag on.
       */
      preserveReferences?: boolean;
      /**
       * Permit `Error` instances (and the native Error subclasses) to be
       * serialized. Defaults to `false` for backward compatibility. When
       * deserializing the resulting bytecode via `toValue`, pass the
       * matching option so the Error is reified to a real instance.
       */
      serializeErrors?: boolean;
    }
  ): ArrayBuffer;

  /**
   * Convert the provided bytecode into a value.
   *
   * Pass `preserveReferences: false` (the default is true) to reject
   * streams that contain back-references — attempting to decode such a
   * stream throws "invalid tag". Streams produced by `fromValue` with
   * its default settings (or with `preserveReferences: true` explicitly)
   * require the reader's `preserveReferences` to be true as well.
   *
   * Pass `serializeErrors: true` to reify any serialized Error frames
   * (see `fromValue`) back into real Error instances. Attempting to
   * deserialize a bytecode stream that contains an Error frame without
   * this option throws "invalid tag".
   */
  export function toValue(
    bytecode: ArrayBuffer,
    options?: {
      preserveReferences?: boolean;
      serializeErrors?: boolean;
    }
  ): any;
}
