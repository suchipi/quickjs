// Force file to be parsed as a module
export {};

console.log(
  inspect({
    "import.meta.require": import.meta.require,
    "import.meta.require === globalThis.require":
      import.meta.require === globalThis.require,
    "import.meta.require('quickjs:bytecode')": import.meta.require(
      "quickjs:bytecode"
    ),
  })
);
