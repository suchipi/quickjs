import { spawn } from "first-base";
import { binDir, rootDir } from "./_utils";

test("inspect.custom", async () => {
  const run = spawn(binDir("qjs"), [
    "-e",
    `
      const obj = {
        something: {
          theSomething: true,
          [inspect.custom]: (inputs) => {
            inputs.brackets = ["<", ">"];
            inputs.linesBefore.push("yup");
            inputs.linesAfter.push("yeah!");
          }
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
    	something: <
    		yup
    		
    		theSomething: true
    		Symbol(inspect.custom): Function "[inspect.custom]" {
    			│1│ (inputs) => {
    			│2│             inputs.brackets = ["<", ">"];
    			│3│             inputs.linesBefore.push("yup");
    			│4│             inputs.linesAfter.push("yeah!");
    			│5│           }
    		}
    		
    		yeah!
    	>
    }
    ",
    }
  `);
});
