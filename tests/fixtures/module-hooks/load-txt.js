// Have to use require instead of import so that things load in order

require("./txt-compiler");
require("./txt-search-extension");

const mod = require("./something");

console.log("content:", mod.default);
