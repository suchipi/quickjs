const engine = require("quickjs:engine");

function capture() {
  return engine.getStackFrames();
}

function middle() {
  return capture();
}

function outer() {
  return middle();
}

const frames = outer();
console.log(inspect(frames));
