import { depValue } from "./delegate-resolve-count-dep.mjs";
const v = await Promise.resolve("wrapper:" + depValue);
export const value = v;
