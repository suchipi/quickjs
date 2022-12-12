(() => {
  const timerMap = new WeakMap();
  class Interval {}

  globalThis.setInterval = function setInterval(fn, ms) {
    const interval = new Interval();
    const wrappedFn = () => {
      fn();
      const timer = setTimeout(wrappedFn, ms);
      timerMap.set(interval, timer);
    };

    const timer = setTimeout(wrappedFn, ms);
    timerMap.set(interval, timer);

    return interval;
  };

  globalThis.clearInterval = function clearInterval(interval) {
    if (interval == null) return;
    if (typeof interval != "object") return;
    const timer = timerMap.get(interval);
    if (timer != null) {
      clearTimeout(timer);
    }
  };
})();
