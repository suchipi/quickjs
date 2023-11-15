import * as mod from "quickjs:module";
import * as ns from "./exports-five";

console.log("isModuleNamespace(ns):", mod.isModuleNamespace(ns));
console.log("isModuleNamespace({}):", mod.isModuleNamespace({}));
console.log("isModuleNamespace(null):", mod.isModuleNamespace(null));
console.log("isModuleNamespace(42):", mod.isModuleNamespace(42));
