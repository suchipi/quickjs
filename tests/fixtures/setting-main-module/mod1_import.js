import * as std from "quickjs:std";

console.log("hi from mod1", import.meta.main);

std.setMainModule(std.resolveModule("./mod3"));

import "./mod2";
import "./mod3";
