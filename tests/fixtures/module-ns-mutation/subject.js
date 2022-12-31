export const five = 5;
export const six = 6;
export default 7;

export const changed = "before";

const ns = require("./subject");

console.error("ns before mutation", inspect(ns));

ns.changed = "after";
ns.somethingNew = "this is new";

console.error("ns after mutation", inspect(ns));
