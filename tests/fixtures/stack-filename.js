import { outer } from "./stack-filename/outer";

for (const num of [0, 1, 2, 3, 4, -1, Infinity, -Infinity]) {
  try {
    console.log(num + ":", outer(num));
  } catch (err) {
    console.log(num + " error:", err);
  }
}
