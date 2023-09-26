// Force file to be parsed as a module
export {};

console.log(
  inspect({
    "import.meta.resolve": import.meta.resolve,
    "import.meta.resolve === globalThis.require.resolve":
      import.meta.resolve === globalThis.require.resolve,
    "import.meta.resolve('./log-four')": import.meta.resolve("./log-four"),
  })
);
