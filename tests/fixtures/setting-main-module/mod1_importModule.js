import * as mod from "quickjs:module";

console.log("hi from mod1", import.meta.main);

mod.setMainModule(mod.resolveModule("./mod3"));

mod.importModule("./mod2");
mod.importModule("./mod3");
