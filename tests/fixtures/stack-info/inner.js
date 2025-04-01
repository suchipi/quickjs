import * as engine from "quickjs:engine";

export function inner(num) {
  return engine.getStackFrameInfo(num);
}
