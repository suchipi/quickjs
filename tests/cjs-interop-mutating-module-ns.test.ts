import { spawn } from "first-base";
import { binDir } from "./_utils";

describe("mutating the module namespace", () => {
  test("requesting default and ns", async () => {
    const run = spawn(
      binDir("qjs"),
      ["./fixtures/module-ns-mutation/loads-all.js"],
      {
        cwd: __dirname,
      }
    );
    await run.completion;
    expect(run.result).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": false,
        "stderr": "ns before mutation {
      	Null prototype
      	
      	changed: "before"
      	default: 7
      	five: 5
      	six: 6
      }
      ns after mutation {
      	Null prototype
      	
      	changed: "after"
      	default: 7
      	five: 5
      	six: 6
      	somethingNew: "this is new"
      }
      ",
        "stdout": "default 7
      * {
      	Null prototype
      	
      	changed: "after"
      	default: 7
      	five: 5
      	six: 6
      	somethingNew: "this is new"
      }
      ",
      }
    `);
  });

  test("requesting new named export", async () => {
    const run = spawn(
      binDir("qjs"),
      ["./fixtures/module-ns-mutation/loads-new.js"],
      {
        cwd: __dirname,
      }
    );
    await run.completion;
    expect(run.result).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": false,
        "stderr": "ns before mutation {
      	Null prototype
      	
      	changed: "before"
      	default: 7
      	five: 5
      	six: 6
      	somethingNew: undefined
      }
      ns after mutation {
      	Null prototype
      	
      	changed: "after"
      	default: 7
      	five: 5
      	six: 6
      	somethingNew: "this is new"
      }
      ",
        "stdout": "somethingNew this is new
      ",
      }
    `);
  });

  test("requesting new default export", async () => {
    const run = spawn(
      binDir("qjs"),
      ["./fixtures/module-ns-mutation/loads-new-default.js"],
      {
        cwd: __dirname,
      }
    );
    await run.completion;
    expect(run.result).toMatchInlineSnapshot(`
      {
        "code": 0,
        "error": false,
        "stderr": "ns before mutation {
      	Null prototype
      	
      	default: undefined
      }
      ns after mutation {
      	Null prototype
      	
      	default: 17
      }
      ",
        "stdout": "default 17
      ",
      }
    `);
  });
});
