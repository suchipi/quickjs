import * as engine from "quickjs:engine";

console.log("hi from mod1", import.meta.main);

engine.setMainModule(engine.resolveModule("./mod3"));

import "./mod2";
import "./mod3";
