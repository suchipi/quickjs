const engine = require("quickjs:engine");
console.log("level0:", engine.getFileNameFromStack(0));
try {
  console.log("level1:", engine.getFileNameFromStack(1));
} catch (e) {
  console.log("level1 error:", e.message);
}
