---
paths:
  - "tests/**/*.ts"
---

# Test Patterns in quickjs

This document describes test patterns observed in the quickjs codebase.

## Test Infrastructure

- Tests use **Jest** with **Babel** for TypeScript transpilation
- Tests are located in `tests/*.test.ts`
- Test utilities are in `tests/_utils.ts`
- Test fixtures go in `tests/fixtures/`
- Working directories for tests that create files go in `tests/workdir/`

## Running Tests

```bash
npm test                              # Run all tests
npx jest tests/foo.test.ts --runInBand  # Run a single test file
```

Tests must be built first (`env QUICKJS_EXTRAS=1 meta/build.sh`) since they run compiled binaries from `build/bin/`. The QUICKJS_EXTRAS is needed to create some additional compilation outputs which some tests use.

## Core Pattern: Integration Tests via Process Spawning

Most tests are **integration tests** that spawn the compiled `qjs` binary and verify stdout/stderr/exit codes. The `first-base` library provides the `spawn` function for this.

### Basic Test Structure

```typescript
import { spawn } from "first-base";
import { binDir } from "./_utils";

test("description", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
    // JavaScript code to run in qjs
    console.log("output");
  `,
  ]);
  await run.completion;
  expect(run.result).toMatchObject({
    code: 0,
    error: false,
    stdout: "output\n",
  });
});
```

### Key Points

1. **Inline spawn calls** - Don't create helper functions like `runQjs()`. Call `spawn(binDir("qjs"), [...])` directly in each test.

2. **Use `-e` flag** - Pass JavaScript code as a string argument with `-e`.

3. **Template literals for code** - Use backtick strings for multi-line JavaScript code passed to qjs.

4. **await run.completion** - Always await the completion before checking results.

5. **run.result structure** - Contains `{ code, error, stdout, stderr }`.

## Test Utilities (`tests/_utils.ts`)

### Path Markers

The codebase uses `path-less-traveled`'s `pathMarker` for path construction:

```typescript
import { pathMarker } from "path-less-traveled";

export const rootDir = pathMarker(path.resolve(__dirname, ".."));
export const binDir = pathMarker(rootDir("build", "bin"));
export const fixturesDir = pathMarker(rootDir("tests", "fixtures"));
export const testsWorkDir = pathMarker(rootDir("tests", "workdir"));
```

PathMarkers are callable and return absolute paths:

- `binDir("qjs")` → `/path/to/quickjs/build/bin/qjs`
- `rootDir()` → `/path/to/quickjs`

Use `.concat()` to create derived PathMarkers:

```typescript
const workDir = testsWorkDir.concat("symlinks");
workDir(); // → /path/to/quickjs/tests/workdir/symlinks
workDir("file.txt"); // → /path/to/quickjs/tests/workdir/symlinks/file.txt
```

### cleanString / cleanResult

For stable snapshots, replace absolute paths with `<rootDir>`:

```typescript
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
```

Use `cleanResult(run.result)` in assertions when output may contain paths.

## Working Directory Pattern

For tests that create files, use a dedicated work directory:

```typescript
import fs from "fs";
import { testsWorkDir } from "./_utils";

const workDir = testsWorkDir.concat("my-test");

describe("my test", () => {
  beforeAll(() => {
    fs.rmSync(workDir(), { recursive: true, force: true });
    fs.mkdirSync(workDir(), { recursive: true });
    // Create test fixtures...
  });

  afterAll(() => {
    fs.rmSync(workDir(), { recursive: true, force: true });
  });

  test("...", async () => {
    // Tests can now use workDir("file.txt") etc.
  });
});
```

## Passing Data to qjs Code

Use `JSON.stringify()` to safely embed values in the code string:

```typescript
const testWorkDir = workDir();

const run = spawn(binDir("qjs"), [
  "-e",
  `
  const workDir = ${JSON.stringify(testWorkDir)};
  // workDir is now safely embedded with proper escaping
`,
]);
```

## Assertion Patterns

### Exact Match

```typescript
expect(run.result).toMatchInlineSnapshot(`
  {
    "code": 0,
    "error": false,
    "stderr": "",
    "stdout": "expected output\\n",
  }
`);
```

### Partial Match with toMatchObject

```typescript
expect(cleanResult(run.result)).toMatchObject({
  code: 0,
  error: false,
  stdout: expect.stringContaining("partial match"),
});
```

### Checking stdout separately

```typescript
expect(cleanResult(run.result).stdout).toContain("expected text");
```

## Wine Testing (Historical Note)

Wine testing was attempted for Windows binaries but **Wine's CreateSymbolicLinkA is a stub** that doesn't actually work. Wine tests were removed from symlinks.test.ts for this reason.

If Wine testing is needed for other functionality, the pattern would be:

- Check if Wine is available
- Use `wine` command with the Windows exe path
- Convert Unix paths to Wine paths (`Z:` + path with backslashes)
- Filter Wine stderr noise (lines starting with `[mvk-`, `\t`, hex addresses)

## Example: Complete Test File

See `tests/getpwuid.test.ts` for a minimal example:

```typescript
import { spawn } from "first-base";
import { binDir } from "./_utils";

test("pwuid", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const std = require("quickjs:std");
      console.log("arity", std.getpwuid.length);
      // ... more code
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`...`);
});
```

See `tests/symlinks.test.ts` for a more complex example with beforeAll/afterAll and working directories.
