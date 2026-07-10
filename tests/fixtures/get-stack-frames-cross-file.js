import { getStackFrames } from "quickjs:engine";
import { captureInHelper } from "./get-stack-frames-helper";

function capture() {
  return getStackFrames();
}

function callThroughHelper() {
  return captureInHelper(capture);
}

const frames = callThroughHelper();
console.log(inspect(frames));
