const ns = require("./subject2");

console.error("ns before mutation", inspect(ns));

ns.default = 17;

console.error("ns after mutation", inspect(ns));
