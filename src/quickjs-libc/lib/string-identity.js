String.identity = function identity(strings, ...values) {
  return String.raw({ raw: strings }, ...values);
};
