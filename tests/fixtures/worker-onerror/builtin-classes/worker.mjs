/* Throw one Error that carries an `inner` object of one-per-subclass
   instances, so a single worker spawn exercises all 9 recognized Error
   classes at once. */
await Promise.resolve();
const err = new Error("builtin-classes-wrapper");
err.inner = {
  typeError: new TypeError("t"),
  rangeError: new RangeError("r"),
  syntaxError: new SyntaxError("s"),
  referenceError: new ReferenceError("ref"),
  uriError: new URIError("uri"),
  evalError: new EvalError("e"),
  internalError: new InternalError("i"),
  aggregateError: new AggregateError([], "agg"),
};
throw err;
