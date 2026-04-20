setTimeout(() => {
  throw new RangeError("late");
}, 10);
