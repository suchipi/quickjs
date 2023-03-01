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
  /** This property is not here at runtime; we just use it to make this type differ from an empty object */
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

  /** In math mode, the BigInt division and power operators can be overloaded by using this function. */
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
