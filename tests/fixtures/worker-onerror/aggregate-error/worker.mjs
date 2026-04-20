await Promise.resolve();
throw new AggregateError([
  new TypeError("t"),
  new RangeError("r"),
], "agg-msg");
