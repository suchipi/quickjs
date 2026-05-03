import path from "path";
import { pathMarker } from "path-less-traveled";
import { spawn } from "first-base";
import { beforeAll, vi } from "vitest";

export const rootDir = pathMarker(path.resolve(__dirname, ".."));
export const binDir = pathMarker(rootDir("build", "bin"));
export const fixturesDir = pathMarker(rootDir("tests", "fixtures"));
export const testsWorkDir = pathMarker(rootDir("tests", "workdir"));

export const winBinDir = pathMarker(
  rootDir("build", "x86_64-pc-windows-static", "bin")
);
export const qjsExe = winBinDir("qjs.exe");

export const shouldRunWineTests = !process.env.CI;
export const shouldRunWasmTests = !process.env.CI;

// WINEDEBUG=-all silences `00cc:err:...` / `003c:fixme:...` channels;
// MVK_CONFIG_LOG_LEVEL=0 silences MoltenVK's `[mvk-info]` boot logs.
export function wineSpawn(
  args: Array<string>,
  options?: Parameters<typeof spawn>[2]
) {
  const baseEnv = options?.env ?? process.env;
  return spawn("wine", [qjsExe, ...args], {
    ...options,
    env: {
      ...baseEnv,
      WINEDEBUG: "-all",
      MVK_CONFIG_LOG_LEVEL: "0",
    },
  });
}

export function setupWineHooks() {
  vi.setConfig({ testTimeout: 60000 });
  beforeAll(async () => {
    // Warm wineserver so the first test doesn't eat its cold-start cost.
    const run = wineSpawn(["-e", "2 + 2"]);
    await run.completion;
  }, 60000);
}
