///<reference path="../quickjs-libbytecode/quickjs-libbytecode.d.ts" />
///<reference path="../quickjs-libc/quickjs-libc.d.ts" />

import * as ByteCode from "quickjs:bytecode";
import * as std from "quickjs:std";

const leadingArgsToSkip = basename(scriptArgs[0]) === "qjs" ? 2 : 1;
main([...scriptArgs].slice(leadingArgsToSkip));

function main(args) {
  /**
   * @typedef Options
   * @property inputFile {string | null}
   * @property inputName {string | null}
   * @property outputMode {"bytecodeSource" | "programSource"}
   * @property outputFilename {string}
   * @property byteSwap {boolean}
   * @property sourceType {"module" | "script" | undefined} undefined means auto
   * @property name {string | null}
   */

  /** @type {Options} */
  const options = {
    inputFile: null,
    inputName: null,
    outputMode: "bytecodeSource",
    outputFilename: "out.c",
    byteSwap: false,
    sourceType: undefined,
    name: null,
  };

  let arg;
  while ((arg = args.shift())) {
    switch (arg) {
      case "-c": {
        options.outputMode = "bytecodeSource";
        break;
      }
      case "-e": {
        options.outputMode = "programSource";
        break;
      }
      case "-o": {
        options.outputFilename = args.shift();
        break;
      }
      case "-x": {
        const nextArg = args[0];
        if (nextArg === "1" || nextArg === "true") {
          options.byteSwap = true;
          args.shift();
        } else if (nextArg === "0" || nextArg === "false") {
          options.byteSwap = false;
          args.shift();
        } else {
          options.byteSwap = true;
        }
        break;
      }
      case "-m": {
        const nextArg = args[0];
        if (nextArg === "1" || nextArg === "true") {
          options.sourceType = "module";
          args.shift();
        } else if (nextArg === "0" || nextArg === "false") {
          options.sourceType = "script";
          args.shift();
        } else {
          options.sourceType = "module";
        }
        break;
      }
      case "-N": {
        const nextArg = args[0];
        if (nextArg) {
          options.name = nextArg;
          args.shift();
        } else {
          throw new Error("Expected string arg after '-N' (the module name)");
        }
        break;
      }
      // TODO: the other options
      default: {
        if (options.inputFile === null) {
          options.inputFile = arg;
        } else {
          console.warn(`Warning: ignoring unused input arg: ${arg}`);
        }
      }
    }
  }

  const encodedFileName = options.name || basename(options.inputFile);

  const fileByteCode = ByteCode.fromFile(options.inputFile, {
    byteSwap: options.byteSwap,
    sourceType: options.sourceType,
    encodedFileName,
  });

  const cname = toIdentifier(encodedFileName);

  let out = "";
  out += `/* File generated automatically by the QuickJS compiler. */\n\n`;

  const length = fileByteCode.byteLength;
  switch (options.outputMode) {
    case "bytecodeSource": {
      out += `#include <inttypes.h>\n\n`;
      out += `const uint32_t ${cname}_size = ${length};\n\n`;
      out += `const uint8_t ${cname}[${length}] = {\n`;
      out += dumpHex(fileByteCode);
      out += "};\n\n";
      break;
    }
    case "programSource": {
      throw new Error("TODO");
      break;
    }
  }

  const outfile = std.open(options.outputFilename, "w");
  outfile.puts(out);
  console.log(`wrote to ${options.outputFilename}`);
}

/**
 * @param {string} input The filepath
 * @returns {string} The last part of that filepath
 */
function basename(input) {
  const parts = input.split(/(?:\/|\\)+/g);
  return parts.at(-1);
}

/**
 * @param {string} input The string to replace special characters in
 * @returns {string} The string with special characters replaced with underscores
 */
function toIdentifier(input) {
  return input.replaceAll(/(?:^[^A-Za-z]|[^A-Za-z0-9])+/g, "_");
}

/**
 * @param {ArrayBuffer} input the bytes to print
 * @returns {string} those bytes printed
 */
function dumpHex(input) {
  let out = "";

  const uint8View = new Uint8Array(input);

  const len = uint8View.byteLength;
  for (let i = 0; i < len; i++) {
    const byte = uint8View[i].toString(16).padStart(2, "0");
    out += ` 0x${byte},`;

    if ((i + 1) % 8 === 0) {
      out += "\n";
    }
  }

  if (!out.endsWith("\n")) {
    out += "\n";
  }

  return out;
}
