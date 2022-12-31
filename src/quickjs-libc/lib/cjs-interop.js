(() => {
  const has = Object.prototype.hasOwnProperty;

  function getNs() {
    try {
      return Module.getNamespace();
    } catch (err) {
      return undefined;
    }
  }

  Object.defineProperty(globalThis, "exports", {
    get() {
      return getNs();
    },
  });

  Object.defineProperty(globalThis, "module", {
    get() {
      const ns = getNs();
      if (ns == null) {
        return undefined;
      }

      return {
        get exports() {
          if (has.call(ns, "__cjsExports")) {
            return ns.__cjsExports;
          } else {
            return ns;
          }
        },
        set exports(newVal) {
          ns.__cjsExports = newVal;

          for (const key in newVal) {
            try {
              Object.defineProperty(ns, key, {
                get() {
                  return newVal.key;
                },
                set(subKey, subVal) {
                  newVal[subKey] = subVal;
                },
              });
            } catch (err) {
              // ignored
            }
          }
        },
      };
    },
  });
})();
