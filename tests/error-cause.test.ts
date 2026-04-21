import { test, expect } from "vitest";
import { spawn } from "first-base";
import { binDir } from "./_utils";

test("error cause", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const err = new Error("hi", { cause: new Error("yeah") });
      console.log(inspect(err));
      // Note slight deviation from the spec here: property is enumerable. This is intentional.
      console.log(inspect(Object.getOwnPropertyDescriptor(err, "cause")));
    `,
  ]);
  await run.completion;
  expect(run.cleanResult()).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": null,
      "stderr": "",
      "stdout": "Error {
    	Error: hi
    		at somewhere
    	
    }
    {
    	value: Error {
    		Error: yeah
    			at somewhere
    		
    	}
    	writable: true
    	enumerable: false
    	configurable: true
    }
    ",
    }
  `);
});
