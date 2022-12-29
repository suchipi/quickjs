import * as std from "quickjs:std";

function sum(nums) {
  return nums.reduce((prev, curr) => prev + curr, 0);
}

const result = sum(
  scriptArgs.slice(1).map((arg) => {
    const num = parseFloat(arg);
    if (Number.isNaN(num)) {
      throw new Error("Not a number: " + arg);
    }
    return num;
  })
);

std.out.puts(result + "\n");
