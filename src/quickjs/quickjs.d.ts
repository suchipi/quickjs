interface ObjectConstructor {
  /**
   * Convert the specified value to a primitive value.
   *
   * The provided hint indicates a preferred return type, which may or may not
   * be respected by the engine.
   *
   * See the abstract operation "ToPrimitive" in the ECMAScript standard for
   * more info.
   */
  toPrimitive(
    input: any,
    hint: "string" | "number" | "default"
  ): string | number | bigint | boolean | undefined | symbol | null;

  /**
   * Returns a boolean indicating whether the specified value is a primitive value.
   */
  isPrimitive(input: any): boolean;
}

interface StringConstructor {
  /**
   * A no-op template literal tag.
   *
   * https://github.com/tc39/proposal-string-cooked
   */
  cooked(
    strings: readonly string[] | ArrayLike<string>,
    ...substitutions: any[]
  ): string;
}
