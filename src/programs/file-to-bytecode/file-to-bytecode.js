#!/usr/bin/env quickjs-run

// Simple script which reads in a file, converts it to bytecode, and writes out
// the bytecode to a new file.

/// <reference path="../../quickjs/quickjs.d.ts" />
/// <reference path="../../builtin-modules/quickjs-libc/quickjs-libc.d.ts" />
/// <reference path="../../builtin-modules/quickjs-bytecode/quickjs-bytecode.d.ts" />

import * as std from "quickjs:std";
import * as Bytecode from "quickjs:bytecode";

function main() {
  // Pull `--strip <source|debug>` out of scriptArgs; leave everything
  // else positional.
  const positional = [];
  let strip = false;
  for (let i = 0; i < scriptArgs.length; i++) {
    const arg = scriptArgs[i];
    if (arg === "--strip") {
      strip = scriptArgs[++i];
    } else {
      positional.push(arg);
    }
  }

  if (strip !== false && strip !== "source" && strip !== "debug") {
    throw new Error(
      `Invalid --strip value: ${JSON.stringify(strip)} (expected "source" or "debug")`
    );
  }

  let [_quickjsRun, _thisScript, inputFile, outputFile, encodedFileName] =
    positional;

  if (!(inputFile && outputFile)) {
    throw new Error(
      "Usage: file-to-bytecode [--strip <source|debug>] <input.js> <output.bin> [encodedFileName]"
    );
  }

  if (!encodedFileName) {
    encodedFileName = inputFile;
  }

  const bytecode = Bytecode.fromFile(inputFile, {
    encodedFileName,
    strip,
  });
  const out = std.open(outputFile, "wb");
  out.write(bytecode, 0, bytecode.byteLength);
}

main();
