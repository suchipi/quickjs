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

  /**
   * To override operators (+, -, ==, etc) for an object, set its
   * `Symbol.operatorSet` property to an `OperatorSet` object, which can be
   * created via `Operators.create`.
   */
  readonly operatorSet: unique symbol;
}

/**
 * An object that, if placed on another object's `Symbol.operatorSet` property,
 * will overload its operators to behave as defined by the functions this
 * OperatorSet was constructed with.
 *
 * You can create an OperatorSet via `Operators(...)` or
 * `Operators.create(...)`.
 */
declare type OperatorSet = {
  /**
   * This property is not here at runtime; we just use it to make this type
   * differ from an empty object.
   */
  __is__: "OperatorSet";
};

interface OperatorFunctions<Left, Right> {
  "+": (left: Left, right: Right) => any;
  "-": (left: Left, right: Right) => any;
  "*": (left: Left, right: Right) => any;
  "/": (left: Left, right: Right) => any;
  "%": (left: Left, right: Right) => any;
  "**": (left: Left, right: Right) => any;
  "|": (left: Left, right: Right) => any;
  "&": (left: Left, right: Right) => any;
  "^": (left: Left, right: Right) => any;
  "<<": (left: Left, right: Right) => any;
  ">>": (left: Left, right: Right) => any;
  ">>>": (left: Left, right: Right) => any;
  "==": (left: Left, right: Right) => any;
  "<": (left: Left, right: Right) => any;
  pos: (left: Left, right: Right) => any;
  neg: (left: Left, right: Right) => any;
  "++": (left: Left, right: Right) => any;
  "--": (left: Left, right: Right) => any;
  "~": (left: Left, right: Right) => any;
}

interface SelfOperators<T> extends Partial<OperatorFunctions<T, T>> {
  left?: undefined;
  right?: undefined;
}

interface LeftOperators<T, Left> extends Partial<OperatorFunctions<Left, T>> {
  left: {};
  right?: undefined;
}

interface RightOperators<T, Right>
  extends Partial<OperatorFunctions<T, Right>> {
  left?: undefined;
  right: {};
}

interface OperatorsConstructor {
  /**
   * Creates a new OperatorSet object, which should be placed on an object's
   * Symbol.operatorSet property.
   */
  <T>(
    selfOperators?: SelfOperators<T>,
    ...otherOperators: Array<LeftOperators<T, any> | RightOperators<T, any>>
  ): OperatorSet;

  /**
   * Creates a new OperatorSet object, which should be placed on an object's
   * Symbol.operatorSet property.
   */
  create: <T>(
    selfOperators?: SelfOperators<T>,
    ...otherOperators: Array<LeftOperators<T, any> | RightOperators<T, any>>
  ) => OperatorSet;

  /**
   * In math mode, the BigInt division and power operators can be overloaded by
   * using this function.
   */
  updateBigIntOperators(
    ops: Pick<OperatorFunctions<BigInt, BigInt>, "/" | "**">
  ): void;
}

declare var Operators: OperatorsConstructor;

interface Number {
  [Symbol.operatorSet]: OperatorSet;
}

interface Boolean {
  [Symbol.operatorSet]: OperatorSet;
}

interface String {
  [Symbol.operatorSet]: OperatorSet;
}

interface BigInt {
  [Symbol.operatorSet]: OperatorSet;
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

declare type BigFloatRoundingMode = number & {
  /**
   * This property is not here at runtime; we just use it to make this type
   * differ from a normal number
   */
  __is__: "BigFloatRoundingMode";
};

interface BigFloatEnvConstructor {
  /**
   * Creates a new floating point environment. Its status flags are reset.
   *
   * - If unspecified, `precision` defaults to the precision from the global floating point environment.
   * - If unspecified, `roundingMode` defaults to RNDN.
   */
  new (precision?: number, roundingMode?: BigFloatRoundingMode): BigFloatEnv;

  /**
   * The mantissa precision in bits of the global floating point environment.
   *
   * The initial value is 113.
   */
  get prec(): number;

  /**
   * The exponent size in bits of the global floating point environment,
   * assuming an IEEE 754 representation.
   *
   * The initial value is 15.
   */
  get expBits(): number;

  /**
   * Sets the mantissa precision of the global floating point environment to
   * `prec` and the exponent size to `expBits`, then calls the function `func`.
   * Then the precision and exponent size are reset to their previous values
   * and the return value of `func` is returned (or an exception is raised if
   * `func` raised an exception).
   *
   * If expBits is undefined, it is set to {@link BigFloatEnv.expBitsMax}.
   *
   * @param func The function to call within the modified environment
   * @param prec The mantissa precision (in bits) to use in the modified environment
   * @param expBits The exponent size (in bits) to use in the modified environment. Defaults to {@link BigFloatEnv.expBitsMax}.
   */
  setPrec<Ret>(func: () => Ret, prec: number, expBits?: number): Ret;

  /**
   * Integer; the minimum allowed precision. Must be at least 2.
   */
  readonly precMin: number;

  /**
   * Integer; the maximum allowed precision. Must be at least 113.
   */
  readonly precMax: number;

  /**
   * Integer; the minimum allowed exponent size in bits. Must be at least 3.
   */
  readonly expBitsMin: number;

  /**
   * Integer; the maximum allowed exponent size in bits. Must be at least 15.
   */
  readonly expBitsMax: number;

  /**
   * Round to nearest, with ties to even rounding mode.
   */
  readonly RNDN: BigFloatRoundingMode;

  /**
   * Round to zero rounding mode.
   */
  readonly RNDZ: BigFloatRoundingMode;

  /**
   * Round to -Infinity rounding mode.
   */
  readonly RNDD: BigFloatRoundingMode;

  /**
   * Round to +Infinity rounding mode.
   */
  readonly RNDU: BigFloatRoundingMode;

  /**
   * Round to nearest, with ties away from zero rounding mode.
   */
  readonly RNDNA: BigFloatRoundingMode;

  /**
   * Round away from zero rounding mode.
   */
  readonly RNDA: BigFloatRoundingMode;

  /**
   * Faithful rounding mode. The result is non-deterministically rounded to
   * -Infinity or +Infinity.
   *
   * This rounding mode usually gives a faster and deterministic running time
   * for the floating point operations.
   */
  readonly RNDF: BigFloatRoundingMode;

  prototype: BigFloatEnv;
}

declare var BigFloatEnv: BigFloatEnvConstructor;

/**
 * A BigFloatEnv contains:
 *
 * - the mantissa precision in bits
 * - the exponent size in bits assuming an IEEE 754 representation;
 * - the subnormal flag (if true, subnormal floating point numbers can be generated by the floating point operations).
 * - the rounding mode
 * - the floating point status. The status flags can only be set by the floating point operations. They can be reset with BigFloatEnv.prototype.clearStatus() or with the various status flag setters.
 */
interface BigFloatEnv {
  /**
   * The mantissa precision, in bits.
   *
   * If precision was not specified as an argument to the BigFloatEnv
   * constructor, defaults to the precision value of the global floating-point
   * environment ({@link BigFloatEnv.prec}).
   */
  get prec(): number;
  set prec(newValue: number);

  /**
   * The exponent size in bits assuming an IEEE 754 representation.
   *
   * Defaults to the exponent size of the global floating-point environment
   * ({@link BigFloatEnv.expBits}).
   */
  get expBits(): number;
  set expBits(newValue: number);

  /**
   * The rounding mode.
   *
   * If the rounding mode was not specified as an argument to the BigFloatEnv
   * constructor, defaults to {@link BigFloatEnv.RNDN}.
   */
  get rndMode(): BigFloatRoundingMode;
  set rndMode(newMode: BigFloatRoundingMode);

  /** subnormal flag. It is false when expBits = expBitsMax. Defaults to false. */
  get subnormal(): boolean;
  set subnormal(newValue: boolean);

  /** Status flag; cleared by `clearStatus`. */
  get invalidOperation(): boolean;
  set invalidOperation(newValue: boolean);

  /** Status flag; cleared by `clearStatus`. */
  get divideByZero(): boolean;
  set divideByZero(newValue: boolean);

  /** Status flag; cleared by `clearStatus`. */
  get overflow(): boolean;
  set overflow(newValue: boolean);

  /** Status flag; cleared by `clearStatus`. */
  get underflow(): boolean;
  set underflow(newValue: boolean);

  /** Status flag; cleared by `clearStatus`. */
  get inexact(): boolean;
  set inexact(newValue: boolean);

  /**
   * Clear the status flags (invalidOperation, divideByZero, overflow,
   * underflow, and inexact).
   */
  clearStatus(): void;
}

interface BigFloatConstructor {
  /**
   * If `value` is a numeric type, it is converted to BigFloat without rounding.
   *
   * If `value`` is a string, it is converted to BigFloat using the precision of the global floating point environment ({@link BigFloatEnv.prec}).
   */
  (value: number | string | bigint | BigFloat): BigFloat;

  prototype: BigFloat;

  /**
   * The value of {@link Math.LN2} rounded to nearest, ties to even with the
   * current global precision.
   *
   * The constant values are cached for small precisions.
   */
  get LN2(): BigFloat;

  /**
   * The value of {@link Math.PI} rounded to nearest, ties to even with
   * the current global precision.
   *
   * The constant values are cached for small precisions.
   */
  get PI(): BigFloat;

  /**
   * The value of {@link Number.MIN_VALUE} as a BigFloat.
   */
  get MIN_VALUE(): BigFloat;

  /**
   * The value of {@link Number.MAX_VALUE} as a BigFloat.
   */
  get MAX_VALUE(): BigFloat;

  /**
   * The value of {@link Number.EPSILON} as a BigFloat.
   */
  get EPSILON(): BigFloat;

  /**
   * Rounds the floating point number `a` according to the floating point
   * environment `e` or the global environment if `e` is undefined.
   */
  fpRound(a: BigFloat, e?: BigFloatEnv): BigFloat;

  /**
   * Parses the string `a` as a floating point number in radix `radix`.
   *
   * The radix is 0 (default) or from 2 to 36. The radix 0 means radix 10
   * unless there is a hexadecimal or binary prefix.
   *
   * The result is rounded according to the floating point environment `e` or
   * the global environment if `e` is undefined.
   */
  parseFloat(a: string, radix?: number, e?: BigFloatEnv): BigFloat;

  /**
   * Returns true if `a` is a finite bigfloat. Returns false otherwise.
   */
  isFinite(a: BigFloat): boolean;

  /**
   * Returns true if a is a NaN bigfloat. Returns false otherwise.
   */
  isNaN(a: BigFloat): boolean;

  /**
   * Adds `a` and `b` together and rounds the resulting floating point number
   * according to the floating point environment `e`, or the global environment
   * if e is undefined.
   *
   * If `e` is specified, the floating point status flags on `e` are updated.
   */
  add(a: BigFloat, b: BigFloat, e?: BigFloatEnv): BigFloat;

  /**
   * Subtracts `b` from `a` and rounds the resulting floating point number
   * according to the floating point environment `e`, or the global environment
   * if e is undefined.
   *
   * If `e` is specified, the floating point status flags on `e` are updated.
   */
  sub(a: BigFloat, b: BigFloat, e?: BigFloatEnv): BigFloat;

  /**
   * Multiplies `a` and `b` together and rounds the resulting floating point
   * number according to the floating point environment `e`, or the global
   * environment if e is undefined.
   *
   * If `e` is specified, the floating point status flags on `e` are updated.
   */
  mul(a: BigFloat, b: BigFloat, e?: BigFloatEnv): BigFloat;

  /**
   * Divides `a` by `b` and rounds the resulting floating point number
   * according to the floating point environment `e`, or the global environment
   * if e is undefined.
   *
   * If `e` is specified, the floating point status flags on `e` are updated.
   */
  div(a: BigFloat, b: BigFloat, e?: BigFloatEnv): BigFloat;

  /**
   * Rounds `x` down to the nearest integer.
   *
   * No additional rounding (ie. BigFloatEnv-related rounding) is performed.
   */
  floor(x: BigFloat): BigFloat;

  /**
   * Rounds `x` up to the nearest integer.
   *
   * No additional rounding (ie. BigFloatEnv-related rounding) is performed.
   */
  ceil(x: BigFloat): BigFloat;

  /**
   * Rounds `x` to the nearest integer.
   *
   * No additional rounding (ie. BigFloatEnv-related rounding) is performed.
   */
  round(x: BigFloat): BigFloat;

  /**
   * Truncates the fractional part of `x`, resulting in an integer.
   *
   * No additional rounding (ie. BigFloatEnv-related rounding) is performed.
   */
  trunc(x: BigFloat): BigFloat;

  /**
   * Returns the absolute value of `x`.
   *
   * No additional rounding (ie. BigFloatEnv-related rounding) is performed.
   */
  abs(x: BigFloat): BigFloat;

  /**
   * Floating point remainder. The quotient is truncated to zero.
   *
   * `e` is an optional floating point environment.
   */
  fmod(x: BigFloat, y: BigFloat, e?: BigFloatEnv): BigFloat;

  /**
   * Floating point remainder. The quotient is rounded to the nearest integer
   * with ties to even.
   *
   * `e` is an optional floating point environment.
   */
  remainder(x: BigFloat, y: BigFloat, e?: BigFloatEnv): BigFloat;

  /**
   * Square root. Returns a rounded floating point number.
   *
   * e is an optional floating point environment.
   */
  sqrt(x: BigFloat, e?: BigFloatEnv): BigFloat;

  /**
   * Returns a rounded floating point number.
   *
   * `e` is an optional floating point environment.
   */
  sin(x: BigFloat, e?: BigFloatEnv): BigFloat;

  /**
   * Returns a rounded floating point number.
   *
   * `e` is an optional floating point environment.
   */
  cos(x: BigFloat, e?: BigFloatEnv): BigFloat;

  /**
   * Returns a rounded floating point number.
   *
   * `e` is an optional floating point environment.
   */
  tan(x: BigFloat, e?: BigFloatEnv): BigFloat;

  /**
   * Returns a rounded floating point number.
   *
   * `e` is an optional floating point environment.
   */
  asin(x: BigFloat, e?: BigFloatEnv): BigFloat;

  /**
   * Returns a rounded floating point number.
   *
   * `e` is an optional floating point environment.
   */
  acos(x: BigFloat, e?: BigFloatEnv): BigFloat;

  /**
   * Returns a rounded floating point number.
   *
   * `e` is an optional floating point environment.
   */
  atan(x: BigFloat, e?: BigFloatEnv): BigFloat;

  /**
   * Returns a rounded floating point number.
   *
   * `e` is an optional floating point environment.
   */
  atan2(x: BigFloat, y: BigFloat, e?: BigFloatEnv): BigFloat;

  /**
   * Returns a rounded floating point number.
   *
   * `e` is an optional floating point environment.
   */
  exp(x: BigFloat, e?: BigFloatEnv): BigFloat;

  /**
   * Returns a rounded floating point number.
   *
   * `e` is an optional floating point environment.
   */
  log(x: BigFloat, e?: BigFloatEnv): BigFloat;

  /**
   * Returns a rounded floating point number.
   *
   * `e` is an optional floating point environment.
   */
  pow(x: BigFloat, y: BigFloat, e?: BigFloatEnv): BigFloat;
}

declare var BigFloat: BigFloatConstructor;

/**
 * The BigFloat type represents floating point numbers in base 2 with the IEEE 754 semantics.
 *
 * A floating point number is represented as a sign, mantissa and exponent.
 *
 * The special values NaN, +/-Infinity, +0 and -0 are supported.
 *
 * The mantissa and exponent can have any bit length with an implementation specific minimum and maximum.
 */
interface BigFloat {
  valueOf(): BigFloat;

  /** radix must be between 2 and 36 */
  toString(radix?: number): string;

  /**
   * Returns a string containing a number represented either in exponential or
   * fixed-point notation with a specified number of digits.
   *
   * @param precision Number of significant digits. There is no range limit on this number.
   * @param roundingMode The rounding mode to use when representing the value. Defaults to {@link BigFloatEnv.RNDNA}.
   * @param radix The base to use when representing the value. Must be an integer between 2 and 36. Defaults to 10.
   */
  toPrecision(
    precision: number,
    roundingMode?: BigFloatRoundingMode,
    radix?: number
  ): string;

  /**
   * Returns a string representing a number in fixed-point notation.
   *
   * @param fractionDigits Number of digits after the decimal point. There is no range limit on this number.
   * @param roundingMode The rounding mode to use when representing the value. Defaults to {@link BigFloatEnv.RNDNA}.
   * @param radix The base to use when representing the value. Must be an integer between 2 and 36. Defaults to 10.
   */
  toFixed(
    fractionDigits: number,
    roundingMode?: BigFloatRoundingMode,
    radix?: number
  ): string;

  /**
   * Returns a string containing a number represented in exponential notation.
   *
   * @param fractionDigits Number of digits after the decimal point. Must be in the range 0 - 20, inclusive.
   * @param roundingMode The rounding mode to use when representing the value. Defaults to {@link BigFloatEnv.RNDNA}.
   * @param radix The base to use when representing the value. Must be an integer between 2 and 36. Defaults to 10.
   */
  toExponential(
    fractionDigits: number,
    roundingMode?: BigFloatRoundingMode,
    radix?: number
  ): string;

  [Symbol.typeofValue]: () => "bigfloat";
}

declare type BigDecimalRoundingMode =
  | "floor"
  | "ceiling"
  | "down"
  | "up"
  | "half-even"
  | "half-up";

declare type BigDecimalRoundingObject =
  | {
      /** must be >= 1 */
      maximumSignificantDigits: number;
      roundingMode: BigDecimalRoundingMode;
    }
  | {
      /** must be >= 0 */
      maximumFractionDigits: number;
      roundingMode: BigDecimalRoundingMode;
    };

interface BigDecimalConstructor {
  (): BigDecimal;
  (value: number | string | bigint | BigFloat): BigDecimal;

  /**
   * Adds together `a` and `b` and rounds the result according to the rounding
   * object `e`. If the rounding object is not present, the operation is
   * executed with infinite precision; in other words, no rounding occurs when
   * the rounding object is not present.
   */
  add(a: BigDecimal, b: BigDecimal, e?: BigDecimalRoundingObject): BigDecimal;

  /**
   * Subtracts `b` from `a` and rounds the result according to the rounding
   * object `e`. If the rounding object is not present, the operation is
   * executed with infinite precision; in other words, no rounding occurs when
   * the rounding object is not present.
   */
  sub(a: BigDecimal, b: BigDecimal, e?: BigDecimalRoundingObject): BigDecimal;

  /**
   * Multiplies together `a` and `b` and rounds the result according to the
   * rounding object `e`. If the rounding object is not present, the operation
   * is executed with infinite precision; in other words, no rounding occurs
   * when the rounding object is not present.
   */
  mul(a: BigDecimal, b: BigDecimal, e?: BigDecimalRoundingObject): BigDecimal;

  /**
   * Divides `a` by `b` and rounds the result according to the rounding object
   * `e`.
   *
   * If the rounding object is not present, an attempt is made to perform the
   * operation with infinite precision. However, not all quotients can be
   * represented with infinite precision. If the quotient cannot be represented
   * with infinite precision, a RangeError is thrown.
   *
   * A RangeError is thrown when dividing by zero.
   */
  div(a: BigDecimal, b: BigDecimal, e?: BigDecimalRoundingObject): BigDecimal;

  /**
   * Perform the modulo operation of `a` by `b` and round the result according
   * to the rounding object `e`. If the rounding object is not present, the
   * operation is executed with infinite precision; in other words, no rounding
   * occurs when the rounding object is not present.
   */
  mod(a: BigDecimal, b: BigDecimal, e?: BigDecimalRoundingObject): BigDecimal;

  /**
   * Obtain the square root of `a`, rounding the result according to the
   * rounding object `e`.
   *
   * If `a` is less than zero, a RangeError will be thrown.
   *
   * Note that the rounding object is *required*.
   */
  sqrt(a: BigDecimal, e: BigDecimalRoundingObject): BigDecimal;

  /**
   * Rounds `a` using the rounding object `e`.
   */
  round(a: BigDecimal, e: BigDecimalRoundingObject): BigDecimal;

  prototype: BigDecimal;
}

declare var BigDecimal: BigDecimalConstructor;

/**
 * The BigDecimal type represents floating point numbers in base 10.
 *
 * It is inspired from the proposal available at https://github.com/littledan/proposal-bigdecimal.
 *
 * The BigDecimal floating point numbers are always normalized and finite.
 * There is no concept of -0, Infinity or NaN. By default, all the computations
 * are done with infinite precision.
 */
interface BigDecimal {
  /**
   * Returns the bigdecimal primitive value corresponding to this BigDecimal.
   */
  valueOf(): BigDecimal;

  /**
   * Converts this BigDecimal to a string with infinite precision in base 10.
   */
  toString(): string;

  /**
   * Returns a string containing a number represented either in exponential or
   * fixed-point notation with a specified number of digits.
   *
   * @param precision Number of significant digits. There is no range limit on this number.
   * @param roundingMode The rounding mode to use when representing the value. Defaults to "half-up".
   */
  toPrecision(precision: number, roundingMode?: BigDecimalRoundingMode): string;

  /**
   * Returns a string representing a number in fixed-point notation.
   *
   * @param fractionDigits Number of digits after the decimal point. There is no range limit on this number.
   * @param roundingMode The rounding mode to use when representing the value. Defaults to "half-up".
   */
  toFixed(
    fractionDigits: number,
    roundingMode?: BigDecimalRoundingMode
  ): string;

  /**
   * Returns a string containing a number represented in exponential notation.
   *
   * @param fractionDigits Number of digits after the decimal point. Must be in the range 0 - 20, inclusive.
   * @param roundingMode The rounding mode to use when representing the value. Defaults to "half-up".
   */
  toExponential(
    fractionDigits: number,
    roundingMode?: BigDecimalRoundingMode
  ): string;
}

// Note that BigFloat and BigDecimal have custom operator overloads defined in
// QuickJS, but TypeScript does not support operator overloading. As such,
// TypeScript will not understand or handle unary/binary operators for BigFloat
// and BigDecimal properly.
