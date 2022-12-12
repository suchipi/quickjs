String.cooked = function cooked(strings, ...values) {
  return String.raw({ raw: strings }, ...values);
};
