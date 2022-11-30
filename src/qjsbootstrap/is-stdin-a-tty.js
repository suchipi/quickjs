// This is just a simple example demonstrating how to use qjsbootstrap.
// This file is built with the following command:
//
// cat build/qjsbootstrap.target src/qjsbootstrap/is-stdin-a-tty.js > build/is-stdin-a-tty.target && chmod +x build/is-stdin-a-tty.target

// TODO: would be nice if this ran as a module... then we could use import instead of require
//
// import * as std from "std";
// import * as os from "os";

const std = require("std");
const os = require("os");

console.log("is stdin a tty?");
const istty = os.isatty(std.in);
console.log(istty);

if (istty) {
  std.exit(0);
} else {
  std.exit(1);
}
