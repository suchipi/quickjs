import * as std from "quickjs:std";

console.log("hi from mod1", import.meta.main);

std.setMainModule(std.resolveModule("./mod3"));

std.importModule("./mod2");
std.importModule("./mod3");
