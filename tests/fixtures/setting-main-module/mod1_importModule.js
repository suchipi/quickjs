import * as engine from "quickjs:engine";

console.log("hi from mod1", import.meta.main);

engine.setMainModule(engine.resolveModule("./mod3"));

engine.importModule("./mod2");
engine.importModule("./mod3");
