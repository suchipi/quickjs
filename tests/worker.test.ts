import { RunContext, spawn } from "first-base";
import { binDir, rootDir, fixturesDir, cleanResult } from "./_utils";

test("sample worker", async () => {
  const run = spawn(
    binDir("qjs"),
    [fixturesDir("workers/parent-of-sample-worker.js")],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(cleanResult(run.result)).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "in parent, sending message to worker {
    	type: "sum"
    	args: [
    		1
    		2
    		3
    	]
    }
    in worker, got message from parent {
    	data: {
    		type: "sum"
    		args: [
    			1
    			2
    			3
    		]
    	}
    }
    in worker, sending response to parent {
    	type: "sum_result"
    	result: 6
    }
    ",
    }
  `);
});

test("worker with init", async () => {
  const run = spawn(
    binDir("qjs"),
    [fixturesDir("workers/parent-of-worker-with-init.js")],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(cleanResult(run.result)).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "in parent, sending message to worker {
    	type: "sum"
    	args: [
    		1
    		2
    		3
    	]
    }
    in __init_worker [object Object]
    global is equal true
    Array is equal true
    in worker, got message from parent {
    	data: {
    		type: "sum"
    		args: [
    			1
    			2
    			3
    		]
    	}
    }
    in worker, sending response to parent {
    	type: "sum_result"
    	result: 6
    }
    ",
    }
  `);
});

test("virtual worker", async () => {
  const run = spawn(
    binDir("qjs"),
    [fixturesDir("workers/virtual-worker-module.js")],
    { cwd: rootDir() }
  );
  await run.completion;
  expect(cleanResult(run.result)).toMatchInlineSnapshot(`
    {
      "code": 0,
      "error": false,
      "stderr": "",
      "stdout": "in parent, sending message to worker {
    	type: "sum"
    	args: [
    		1
    		2
    		3
    	]
    }
    in worker, got message from parent {
    	data: {
    		type: "sum"
    		args: [
    			1
    			2
    			3
    		]
    	}
    }
    in worker, sending response to parent {
    	type: "sum_result"
    	result: 6
    }
    ",
    }
  `);
});
