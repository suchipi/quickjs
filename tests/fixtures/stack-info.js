import { outer } from "./stack-info/outer";

for (const num of [0, 1, 2, 3, 4, -1, Infinity, -Infinity]) {
  try {
    console.log(num + ":", JSON.stringify(outer(num)));
  } catch (err) {
    console.log(num + " error:", err);
  }
}
