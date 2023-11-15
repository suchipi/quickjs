import * as engine from "quickjs:engine";
import * as ns from "./exports-five";

console.log("isModuleNamespace(ns):", engine.isModuleNamespace(ns));
console.log("isModuleNamespace({}):", engine.isModuleNamespace({}));
console.log("isModuleNamespace(null):", engine.isModuleNamespace(null));
console.log("isModuleNamespace(42):", engine.isModuleNamespace(42));
