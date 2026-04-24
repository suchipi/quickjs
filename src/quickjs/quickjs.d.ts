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

interface SymbolConstructor {
  /**
   * A method that changes the result of using the `typeof` operator on the
   * object. Called by the semantics of the typeof operator.
   *
   * Note that the following semantics will come into play when use of the
   * `typeof` operator causes the engine to call a `Symbol.typeofValue` method
   * on an object:
   *
   * - If the method returns any value other than one of the string values
   *   which are normally the result of using the `typeof` operator, the engine
   *   behaves as if no `Symbol.typeofValue` method was present on the object.
   * - If an error is thrown from this method, or an error is thrown while
   *   accessing this property, the error will be silently ignored, and the
   *   engine will behave as if no `Symbol.typeofValue` method was present on
   *   the object.
   * - If this property is present on an object, but the value of that property
   *   is not a function, the engine will not consider that value when
   *   determining the result of the `typeof` operation (it'll ignore it).
   */
  readonly typeofValue: unique symbol;
}

interface BigIntConstructor {
  /**
   * Return trunc(a/b).
   *
   * b = 0 raises a RangeError exception.
   */
  tdiv(a: bigint, b: bigint): bigint;

  /**
   * Return \lfloor a/b \rfloor.
   *
   * b = 0 raises a RangeError exception.
   */
  fdiv(a: bigint, b: bigint): bigint;

  /**
   * Return \lceil a/b \rceil.
   *
   * b = 0 raises a RangeError exception.
   */
  cdiv(a: bigint, b: bigint): bigint;

  /**
   * Return sgn(b) \lfloor a/{|b|} \rfloor (Euclidian division).
   *
   * b = 0 raises a RangeError exception.
   */
  ediv(a: bigint, b: bigint): bigint;

  /**
   * Perform trunc(a/b) and return an array of two elements. The first element
   * is the quotient, the second is the remainder.
   *
   * b = 0 raises a RangeError exception.
   */
  tdivrem(a: bigint, b: bigint): [bigint, bigint];

  /**
   * Perform \lfloor a/b \rfloor and return an array of two elements. The first
   * element is the quotient, the second is the remainder.
   *
   * b = 0 raises a RangeError exception.
   */
  fdivrem(a: bigint, b: bigint): [bigint, bigint];

  /**
   * Perform \lceil a/b \rceil and return an array of two elements. The first
   * element is the quotient, the second is the remainder.
   *
   * b = 0 raises a RangeError exception.
   */
  cdivrem(a: bigint, b: bigint): [bigint, bigint];

  /**
   * Perform sgn(b) \lfloor a/{|b|} \rfloor (Euclidian division) and return an
   * array of two elements. The first element is the quotient, the second is
   * the remainder.
   *
   * b = 0 raises a RangeError exception.
   */
  edivrem(a: bigint, b: bigint): [bigint, bigint];

  /**
   * Return \lfloor \sqrt(a) \rfloor.
   *
   * A RangeError exception is raised if a < 0.
   */
  sqrt(a: bigint): bigint;

  /**
   * Return an array of two elements. The first element is
   * \lfloor \sqrt{a} \rfloor. The second element is
   * a-\lfloor \sqrt{a} \rfloor^2.
   *
   * A RangeError exception is raised if a < 0.
   */
  sqrtrem(a: bigint): [bigint, bigint];

  /**
   * Return -1 if a \leq 0 otherwise return \lfloor \log2(a) \rfloor.
   */
  floorLog2(a: bigint): bigint;

  /**
   * Return the number of trailing zeros in the two’s complement binary representation of a.
   *
   * Return -1 if a=0.
   */
  ctz(a: bigint): bigint;
}

