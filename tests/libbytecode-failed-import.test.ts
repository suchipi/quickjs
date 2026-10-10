import { beforeEach, expect, test } from "vitest";
import fs from "fs";
import { pathMarker } from "path-less-traveled";
import { rm, mkdir } from "shelljs";
import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

const workDir = pathMarker(
  rootDir("build/tests/libbytecode-failed-import")
);

const sources: Record<string, string> = {
  "leaf.mjs": `
    console.log("leaf ran");
    export const leaf = "leaf value";
  `,
  "needs-leaf.mjs": `
    import { leaf } from "./leaf.mjs";
    console.log("needs-leaf ran with", leaf + "; import.meta.url is a", typeof import.meta.url);
  `,
  "uses-meta.mjs": `
    console.log("uses-meta ran; import.meta.url is a", typeof import.meta.url);
  `,
  "nested.mjs": `
    import { leaf } from "./leaf.mjs";
    console.log("nested ran");
    export const nestedValue = "nested(" + leaf + ")";
  `,
  "entry.mjs": `
    import { nestedValue } from "./nested.mjs";
    console.log("entry ran with", nestedValue);
  `,
};

const prelude = `
  const std = require("quickjs:std");
  const os = require("quickjs:os");
  const bytecode = require("quickjs:bytecode");

  function revive(name) {
    const file = std.open(name + ".bin", "rb");
    file.seek(0, std.SEEK_END);
    const size = file.tell();
    file.seek(0, std.SEEK_SET);
    const buffer = new ArrayBuffer(size);
    file.read(buffer, 0, size);
    file.close();
    return bytecode.toValue(buffer);
  }

  function call(label, revived) {
    try {
      revived();
      console.log(label, "-> returned");
    } catch (error) {
      console.log(label, "->", error.constructor.name);
    }
  }

  function restoreLeaf() {
    os.rename("leaf.mjs.hidden", "leaf.mjs");
  }
`;

beforeEach(async () => {
  rm("-rf", workDir());
  mkdir("-p", workDir());

  for (const [name, source] of Object.entries(sources)) {
    fs.writeFileSync(workDir(name), source);
  }

  // Compiling a module loads its imports, and a process that has loaded
  // leaf.mjs keeps it. So everything is compiled here, while leaf.mjs
  // exists, and each test revives the bytecode in a process of its own
  // that starts out without it.
  for (const name of Object.keys(sources)) {
    const compile = spawn(
      binDir("quickjs-run"),
      [
        binDir("file-to-bytecode.js"),
        workDir(name),
        workDir(name.replace(/\.mjs$/, ".bin")),
      ],
      { cwd: workDir() }
    );
    await compile.completion;
    expect(compile.cleanResult()).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": null,
        "stderr": "",
        "stdout": "",
      }
    `);
  }

  fs.renameSync(workDir("leaf.mjs"), workDir("leaf.mjs.hidden"));
});

test("a revived module loads its imports again on the next call after they failed to load", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        ${prelude}
        const needsLeaf = revive("needs-leaf");
        call("first call, leaf.mjs missing", needsLeaf);
        call("second call, leaf.mjs missing", needsLeaf);
        restoreLeaf();
        call("third call, leaf.mjs present", needsLeaf);
        call("fourth call", needsLeaf);
      `,
    ],
    { cwd: workDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "first call, leaf.mjs missing -> Error
    second call, leaf.mjs missing -> Error
    leaf ran
    needs-leaf ran with leaf value; import.meta.url is a string
    third call, leaf.mjs present -> returned
    fourth call -> returned
    ",
    }
  `);
});

test("a revived module that another revived module imports recovers from a failed load too", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        ${prelude}
        const nested = revive("nested");
        const entry = revive("entry");
        call("entry, leaf.mjs missing", entry);
        call("entry again, leaf.mjs missing", entry);
        call("nested on its own, leaf.mjs missing", nested);
        restoreLeaf();
        call("entry, leaf.mjs present", entry);
        call("nested on its own, leaf.mjs present", nested);
      `,
    ],
    { cwd: workDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "entry, leaf.mjs missing -> Error
    entry again, leaf.mjs missing -> Error
    nested on its own, leaf.mjs missing -> Error
    leaf ran
    nested ran
    entry ran with nested(leaf value)
    entry, leaf.mjs present -> returned
    nested on its own, leaf.mjs present -> returned
    ",
    }
  `);
});

test("a failed load leaves other revived modules in the context's module list", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        ${prelude}
        const usesMeta = revive("uses-meta");
        const needsLeaf = revive("needs-leaf");
        call("needs-leaf, leaf.mjs missing", needsLeaf);
        call("uses-meta", usesMeta);
      `,
    ],
    { cwd: workDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "needs-leaf, leaf.mjs missing -> Error
    uses-meta ran; import.meta.url is a string
    uses-meta -> returned
    ",
    }
  `);
});

test("importing a revived module by path after its imports failed to load", async () => {
  const run = spawn(
    binDir("qjs"),
    [
      "-e",
      `
        ${prelude}
        async function importByPath(label) {
          try {
            await import(${JSON.stringify(workDir("needs-leaf.mjs"))});
            console.log(label, "-> imported");
          } catch (error) {
            console.log(label, "->", error.constructor.name);
          }
        }

        const needsLeaf = revive("needs-leaf");
        importByPath("import, leaf.mjs missing")
          .then(() => {
            call("call, leaf.mjs missing", needsLeaf);
            restoreLeaf();
            call("call, leaf.mjs present", needsLeaf);
            return importByPath("import, leaf.mjs present");
          });
      `,
    ],
    { cwd: workDir() }
  );
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "import, leaf.mjs missing -> Error
    call, leaf.mjs missing -> Error
    leaf ran
    needs-leaf ran with leaf value; import.meta.url is a string
    call, leaf.mjs present -> returned
    import, leaf.mjs present -> imported
    ",
    }
  `);
});
