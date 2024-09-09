(() => {
  const timerMap = new WeakMap();
  class Interval {}

  globalThis.setInterval = function setInterval(fn, ms) {
    const interval = new Interval();
    const wrappedFn = () => {
      try {
        fn();
      } catch (err) {
        let consoleErrorWorked = false;
        try {
          if (
            typeof console === "object" &&
            console != null &&
            typeof console.error === "function"
          ) {
            console.error(err);
            consoleErrorWorked = true;
          }
        } catch (err2) {}
        if (!consoleErrorWorked) {
          try {
            if (typeof print === "function") {
              print(err);
            }
          } catch (err3) {}
        }
      }
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
