import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/run-test262/**", "**/node_modules/**"],
    setupFiles: ["./tests/_setup.ts"],
    watch: false,
    server: {
      watch: {
        ignored: ["**/node_modules/**", path.join(__dirname, "build")],
      },
    },
  },
});
