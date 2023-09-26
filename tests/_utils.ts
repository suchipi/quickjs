import path from "path";
import { pathMarker } from "path-less-traveled";
import type { RunContext } from "first-base";

export const rootDir = pathMarker(path.resolve(__dirname, ".."));
export const binDir = pathMarker(rootDir("build", "bin"));

export function cleanString(str: string): string {
  return str.replaceAll(rootDir(), "<rootDir>");
}

export function cleanResult(
  result: RunContext["result"]
): RunContext["result"] {
  return {
    ...result,
    stderr: cleanString(result.stderr),
    stdout: cleanString(result.stdout),
  };
}
