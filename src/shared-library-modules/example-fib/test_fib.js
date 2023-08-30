/* example of JS module importing a C module */

import { fib } from "../../../build/extras/fib.so";

console.log("fib(10)=", fib(10));
