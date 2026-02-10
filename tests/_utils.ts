import path from "path";
import { pathMarker } from "path-less-traveled";

export const rootDir = pathMarker(path.resolve(__dirname, ".."));
export const binDir = pathMarker(rootDir("build", "bin"));
export const fixturesDir = pathMarker(rootDir("tests", "fixtures"));
export const testsWorkDir = pathMarker(rootDir("tests", "workdir"));
