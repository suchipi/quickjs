// This is just a simple example demonstrating how to use qjsbootstrap.
// This file is built with the following command:
//
// cat build/qjsbootstrap.target src/qjsbootstrap/is-stdin-a-tty.js > build/is-stdin-a-tty.target && chmod +x build/is-stdin-a-tty.target

import * as std from "quickjs:std";
import * as os from "quickjs:os";

console.log("is stdin a tty?");
const istty = os.isatty(std.in.fileno());
console.log(istty);

if (istty) {
  std.exit(0);
} else {
  std.exit(1);
}
