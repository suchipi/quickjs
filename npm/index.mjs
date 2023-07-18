import path from "node:path";
import child_process from "node:child_process";

export function buildArtifactsLocation() {
  return path.resolve(__dirname, "..", "build");
}

export function identifyCurrentPlatform() {
  const platform = process.platform;
  switch (platform) {
    case "darwin":
    case "linux":
    case "win32": {
      break;
    }
    default: {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  let arch = process.arch;
  switch (arch) {
    case "arm64": {
      arch = "aarch64";
      break;
    }
    case "x64": {
      arch = "x86_64";
      break;
    }
    default: {
      throw new Error(`Unsupported processor architecture: ${arch}`);
    }
  }

  switch (platform) {
    case "darwin": {
      return `${arch}-apple-darwin`;
    }
    case "win32": {
      if (arch !== "x86_64") {
        throw new Error(`Architecture is not supported on Windows: ${arch}`);
      }
      return `${arch}-pc-windows-static`;
    }
    case "linux": {
      const lddInfo = runShell(`ldd --version 2>&1 || true`);
      if (/musl/.test(lddInfo)) {
        return `${arch}-unknown-linux-musl`;
      } else if (/GLIBC|GNU/.test(lddInfo)) {
        return `${arch}-unknown-linux-gnu`;
      } else {
        return `${arch}-unknown-linux-static`;
      }
    }
    default: {
      // should be unreachable
      throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}

function runShell(cmd) {
  return child_process
    .spawnSync(cmd, { shell: true, encoding: "utf-8" })
    .stdout.trim();
}
