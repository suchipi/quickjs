// Have to use require instead of import so that things load in order

require("./empty-ext-compiler");

const mod = require("./dotted.dir/extensionless-module");

console.log("content:", mod.default);
