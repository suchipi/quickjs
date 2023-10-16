import * as mod from "quickjs:module";

console.log("hi from mod1", import.meta.main);

mod.setMainModule(mod.resolveModule("./mod3"));

import "./mod2";
import "./mod3";
