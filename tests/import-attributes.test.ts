import { test, expect } from "vitest";
import { spawn } from "first-base";
import { binDir, fixturesDir } from "./_utils";

const importAttributesFixture = fixturesDir.concat("import-attributes");

// A. Basic JSON import via attribute (.json file).
test("import-attributes - JSON import via attribute on .json file", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      const data = (await import(${JSON.stringify(
        importAttributesFixture("data.json")
      )}, { with: { type: "json" } })).default;
      console.log(JSON.stringify(data));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{"hello":"world","count":42}
    ",
    }
  `);
});

// A2. JSON import via attribute on extensionless file.
test("import-attributes - JSON import on extensionless file via attribute", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      const data = (await import(${JSON.stringify(
        importAttributesFixture("data-noext")
      )}, { with: { type: "json" } })).default;
      console.log(JSON.stringify(data));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{"hello":"world","count":42}
    ",
    }
  `);
});

// A3. JSON import via attribute on .js-extensioned file (attribute beats ext).
test("import-attributes - JSON import on .js-extensioned file via attribute", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      const data = (await import(${JSON.stringify(
        importAttributesFixture("data-jsext.js")
      )}, { with: { type: "json" } })).default;
      console.log(JSON.stringify(data));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{"hello":"world","count":42}
    ",
    }
  `);
});

// A4. JSON5 import via attribute on .json5 file.
test("import-attributes - JSON5 import via attribute on .json5 file", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      const data = (await import(${JSON.stringify(
        importAttributesFixture("data.json5")
      )}, { with: { type: "json5" } })).default;
      console.log(JSON.stringify(data));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{"hello":"world","count":42,"ratio":0.5,"weird":null,"big":null,"trailing":[1,2,3]}
    ",
    }
  `);
});

// B. Extension-only loading fails by default (spec-aligned).
test("import-attributes - extension-only loading fails by default", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      try {
        await import(${JSON.stringify(importAttributesFixture("data.json"))});
        console.log("UNEXPECTED success");
      } catch (e) {
        console.log("threw:", e.constructor.name);
      }
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "threw: SyntaxError
    ",
    }
  `);
});

// C. Extension-only loading works after opt-in.
test("import-attributes - extension-only loading works after opt-in", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      const { ModuleDelegate } = await import("quickjs:engine");
      ModuleDelegate.compilers[".json"] = ModuleDelegate.compilers["json"];
      const data = (await import(${JSON.stringify(
        importAttributesFixture("data.json")
      )})).default;
      console.log(JSON.stringify(data));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{"hello":"world","count":42}
    ",
    }
  `);
});

// C2. JSON attribute treated as plain JS when compilers["json"] is removed —
//     no hardcoded fallback.
test("import-attributes - removing compilers[json] disables attribute dispatch", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      const { ModuleDelegate } = await import("quickjs:engine");
      delete ModuleDelegate.compilers["json"];
      try {
        await import(${JSON.stringify(
          importAttributesFixture("data.json")
        )}, { with: { type: "json" } });
        console.log("UNEXPECTED success");
      } catch (e) {
        console.log("threw:", e.constructor.name);
      }
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "threw: SyntaxError
    ",
    }
  `);
});

// D. import.meta.attributes populated with multi-key non-`type` attrs.
test("import-attributes - import.meta.attributes populated with multi-key", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      const m = await import(${JSON.stringify(
        importAttributesFixture("multi-key-inspect.js")
      )}, { with: { type: "custom", flavor: "spicy", chunky: "bacon" } });
      console.log(JSON.stringify(m.default));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{"type":"custom","flavor":"spicy","chunky":"bacon"}
    ",
    }
  `);
});

// D2. import.meta.attributes is `undefined` when no `with` clause was used.
test("import-attributes - import.meta.attributes is undefined when no with clause", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      const m = await import(${JSON.stringify(
        importAttributesFixture("meta-inspect.js")
      )});
      console.log("attrs===undefined:", m.attrs === undefined);
      console.log("descriptor:", JSON.stringify({
        writable: m.desc.writable,
        configurable: m.desc.configurable,
      }));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "attrs===undefined: true
    descriptor: {"writable":false,"configurable":false}
    ",
    }
  `);
});

// D3. import.meta.attributes is non-writable / non-configurable / non-extensible.
test("import-attributes - import.meta.attributes is locked-down", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      const m = await import(${JSON.stringify(
        importAttributesFixture("meta-inspect.js")
      )}, { with: { type: "custom", k: "v" } });
      console.log("descriptor:", JSON.stringify({
        writable: m.desc.writable,
        configurable: m.desc.configurable,
      }));
      console.log("isExtensible:", m.isExtensible);
      console.log("attrs.k:", m.attrs.k);
      // each key non-writable + non-configurable
      const kdesc = Object.getOwnPropertyDescriptor(m.attrs, "k");
      console.log("kdesc:", JSON.stringify({
        writable: kdesc.writable,
        configurable: kdesc.configurable,
      }));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "descriptor: {"writable":false,"configurable":false}
    isExtensible: false
    attrs.k: v
    kdesc: {"writable":false,"configurable":false}
    ",
    }
  `);
});

// E. Caching with same attributes — module evaluated once.
test("import-attributes - caching with same attributes evaluates once", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      await import(${JSON.stringify(
        importAttributesFixture("side-effect.js")
      )});
      await import(${JSON.stringify(
        importAttributesFixture("side-effect.js")
      )});
      console.log("done");
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "side-effect
    done
    ",
    }
  `);
});

// F. Caching with different attributes — each distinct attribute set is a
//    distinct module instance.
test("import-attributes - different attributes = distinct module instances", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      const { ModuleDelegate } = await import("quickjs:engine");
      ModuleDelegate.compilers["toml"] = (filename, content) =>
        \`console.log("side-effect-toml"); export default 1;\`;
      ModuleDelegate.compilers["yaml"] = (filename, content) =>
        \`console.log("side-effect-yaml"); export default 2;\`;
      // Use the same specifier path with two different attribute sets.
      // Each is a distinct module instance, so each compiles + runs once.
      await import(${JSON.stringify(
        importAttributesFixture("side-effect.js")
      )}, { with: { type: "toml" } });
      await import(${JSON.stringify(
        importAttributesFixture("side-effect.js")
      )}, { with: { type: "yaml" } });
      console.log("done");
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "side-effect-toml
    side-effect-yaml
    done
    ",
    }
  `);
});

// G. require(name, options) accepts the with clause.
test("import-attributes - require(name, { with: { type } })", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      const data = require(${JSON.stringify(
        importAttributesFixture("data.json")
      )}, { with: { type: "json" } }).default;
      console.log(JSON.stringify(data));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{"hello":"world","count":42}
    ",
    }
  `);
});

// H. import.meta.require(name, options) accepts the with clause.
test("import-attributes - import.meta.require(name, { with: { type } })", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      const data = import.meta.require(${JSON.stringify(
        importAttributesFixture("data.json")
      )}, { with: { type: "json" } }).default;
      console.log(JSON.stringify(data));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{"hello":"world","count":42}
    ",
    }
  `);
});

// I. Dynamic import() with attributes (already covered above) — keep this one
//    explicit as the canonical case.
test("import-attributes - dynamic import() with attributes", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      const m = await import(${JSON.stringify(
        importAttributesFixture("data.json")
      )}, { with: { type: "json" } });
      console.log(JSON.stringify(m.default));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{"hello":"world","count":42}
    ",
    }
  `);
});

// J. engine.importModule with options.
test("import-attributes - engine.importModule with options", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      const { importModule } = await import("quickjs:engine");
      const m = importModule(${JSON.stringify(
        importAttributesFixture("data.json")
      )}, undefined, { with: { type: "json" } });
      console.log(JSON.stringify(m.default));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "{"hello":"world","count":42}
    ",
    }
  `);
});

// K. ModuleDelegate.read error propagation.
test("import-attributes - ModuleDelegate.read error propagation", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      const { ModuleDelegate } = await import("quickjs:engine");
      ModuleDelegate.read = () => { throw new Error("boom-read"); };
      try {
        await import(${JSON.stringify(importAttributesFixture("data.json"))});
        console.log("UNEXPECTED success");
      } catch (e) {
        console.log("caught:", e.message);
      }
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "caught: boom-read
    ",
    }
  `);
});

// K2. ModuleDelegate.resolve error propagation.
test("import-attributes - ModuleDelegate.resolve error propagation", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      const { ModuleDelegate } = await import("quickjs:engine");
      ModuleDelegate.resolve = () => { throw new Error("boom-resolve"); };
      try {
        await import(${JSON.stringify(importAttributesFixture("data.json"))});
        console.log("UNEXPECTED success");
      } catch (e) {
        console.log("caught:", e.message);
      }
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "caught: boom-resolve
    ",
    }
  `);
});

// L. compilers["json"] error propagation.
test("import-attributes - compiler error propagation", async () => {
  const run = spawn(binDir("qjs"), [
    "-m",
    "-e",
    `
      const { ModuleDelegate } = await import("quickjs:engine");
      ModuleDelegate.compilers["json"] = () => { throw new Error("boom-compiler"); };
      try {
        await import(${JSON.stringify(
          importAttributesFixture("data.json")
        )}, { with: { type: "json" } });
        console.log("UNEXPECTED success");
      } catch (e) {
        console.log("caught:", e.message);
      }
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "caught: boom-compiler
    ",
    }
  `);
});

// Custom import type
test("import-attributes - custom import type", async () => {
  const run = spawn(binDir("qjs"), [
    "-I",
    importAttributesFixture("registers-text-attribute-type.js"),
    "-m",
    "-e",
    `
      import rawtext from ${JSON.stringify(
        importAttributesFixture("rawtext")
      )} with { type: "text" };
      console.log(rawtext);
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "bla bla bla

    this is raw text

    ",
    }
  `);
});
