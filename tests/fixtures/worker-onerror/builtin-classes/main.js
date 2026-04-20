const { Worker } = require("quickjs:os");
const w = new Worker("./worker.mjs");
w.onerror = (ev) => {
  /* Entry-point Error: plain Error (not a subclass) */
  console.log("Error instanceof Error:", ev.error instanceof Error);
  console.log("Error has nested:", typeof ev.error.inner);
  const classes = ev.error.inner;
  console.log("classes.typeError is TypeError:", classes.typeError instanceof TypeError);
  console.log("classes.rangeError is RangeError:", classes.rangeError instanceof RangeError);
  console.log("classes.syntaxError is SyntaxError:", classes.syntaxError instanceof SyntaxError);
  console.log("classes.referenceError is ReferenceError:", classes.referenceError instanceof ReferenceError);
  console.log("classes.uriError is URIError:", classes.uriError instanceof URIError);
  console.log("classes.evalError is EvalError:", classes.evalError instanceof EvalError);
  console.log("classes.internalError is InternalError:", classes.internalError instanceof InternalError);
  console.log("classes.aggregateError is AggregateError:", classes.aggregateError instanceof AggregateError);
  w.terminate();
};
