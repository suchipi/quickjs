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
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "Error {
    	Error: hi
    		at <eval> (<cmdline>:2)
    	
    	
    	cause: Error {
    		Error: yeah
    			at <eval> (<cmdline>:2)
    		
    	}
    }
    {
    	value: Error {
    		Error: yeah
    			at <eval> (<cmdline>:2)
    		
    	}
    	writable: true
    	enumerable: true
    	configurable: true
    }
    ",
    }
  `);
});
