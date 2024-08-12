import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

test("inspect", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const obj = {
        something: {
          theSomething: true,
        }
      }

      print(inspect(obj));
    `,
  ]);
  await run.completion;
  expect(run.result).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "{
    	something: {
    		theSomething: true
    	}
    }
    ",
    }
  `);
});
