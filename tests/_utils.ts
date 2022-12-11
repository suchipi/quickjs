import path from "path";
import { pathMarker } from "path-less-traveled";

export const rootDir = pathMarker(path.resolve(__dirname, ".."));
export const binDir = pathMarker(rootDir("build", "bin"));
