import { RunContext, spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

function cleanResult(result: RunContext["result"]): RunContext["result"] {
  function cleanStr(str: string): string {
    return (
      str
        // behavior of %p varies with platform, so don't encode it in the test
        .replace(/_info: [^\n]+\n/, "_info: <VARIES WITH PLATFORM>\n")

        // whitespace shenanigans are abound because of prettier interacting with the inline snapshot...
        .replace(/\t/g, "  ")
        .split("\n")
        .map((part) => {
          if (part.trim() === "") {
            return "";
          } else {
            return part;
          }
        })
        .join("\n")
    );
  }

  return {
    ...result,
    stderr: cleanStr(result.stderr),
    stdout: cleanStr(result.stdout),
  };
}

test("pointer", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        const { Pointer } = require("quickjs:pointer");

        console.log("Pointer:", inspect(Pointer));

        console.log("Pointer.isPointer(42):", Pointer.isPointer(42));
        console.log("Pointer.isPointer(Pointer.NULL):", Pointer.isPointer(Pointer.NULL));
      `,
    ],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(cleanResult(run.result)).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "Pointer: Function "Pointer" {
      NULL: Pointer {
        _info: <VARIES WITH PLATFORM>
      }
      isPointer: Function "isPointer" {
        │1│ function isPointer() {
        │2│     [native code]
        │3│ }
      }

      │1│ function Pointer() {
      │2│     [native code]
      │3│ }
    }
    Pointer.isPointer(42): false
    Pointer.isPointer(Pointer.NULL): true
    ",
    }
  `);
});
