#!/usr/bin/env quickjs-run

// Simple script which reads in a file, converts it to bytecode, and writes out
// the bytecode to a new file.

/// <reference path="../quickjs/quickjs.d.ts" />
/// <reference path="../quickjs-libc/quickjs-libc.d.ts" />
/// <reference path="../quickjs-libbytecode/quickjs-libbytecode.d.ts" />

import * as std from "quickjs:std";
import * as Bytecode from "quickjs:bytecode";

function main() {
  const [_quickjsRun, _thisScript, inputFile, outputFile] = scriptArgs;

  if (!(inputFile && outputFile)) {
    throw new Error(
      "You must pass two positional arguments to this script: the input file path (js) and the output file path (bytecode binary)."
    );
  }

  const bytecode = Bytecode.fromFile(inputFile);
  const out = std.open(outputFile, "wb");
  out.write(bytecode, 0, bytecode.byteLength);
}

main();
