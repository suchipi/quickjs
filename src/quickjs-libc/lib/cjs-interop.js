(() => {
  const has = Object.prototype.hasOwnProperty;

  Object.defineProperty(globalThis, "exports", {
    get() {
      return Module.getNamespace();
    },
  });

  const module = {
    get exports() {
      const ns = Module.getNamespace();
      if (has.call(ns, "__cjsExports")) {
        return ns.__cjsExports;
      } else {
        return ns;
      }
    },
    set exports(newVal) {
      const ns = Module.getNamespace();

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

  globalThis.module = module;
})();
