declare module "bytecode" {
  /**
   * Convert the module or script in the specified file into bytecode.
   *
   * When converted back to a value, it will be a function.
   */
  export function fromFile(
    path: string,
    options?: { byteSwap?: boolean; sourceType?: "module" | "script" }
  ): ArrayBuffer;

  /**
   * Convert the provided value into bytecode. Doesn't work with all values.
   */
  export function fromValue(
    value: any,
    options?: { byteSwap?: boolean }
  ): ArrayBuffer;

  /**
   * Convert the provided bytecode into a value.
   */
  export function toValue(bytecode: ArrayBuffer): any;
}
