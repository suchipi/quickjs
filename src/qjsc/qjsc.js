///<reference path="../quickjs-libbytecode/quickjs-libbytecode.d.ts" />
///<reference path="../quickjs-libc/quickjs-libc.d.ts" />
///<reference path="../quickjs-modulesys/quickjs-modulesys.d.ts" />
///<reference path="../quickjs-libengine/quickjs-libengine.d.ts" />

import * as ByteCode from "quickjs:bytecode";
import * as std from "quickjs:std";
import * as engine from "quickjs:engine";

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
   * @property stackSize {number | null}
   * @property enableBigNum {boolean} enable BigFloat, BigDecimal, and operator overloading
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
    stackSize: null,
    enableBigNum: false,
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
      case "-S": {
        const nextArg = args[0];
        if (nextArg) {
          const asNum = parseInt(nextArg);
          if (Number.isNaN(asNum)) {
            throw new Error("Expected numeric arg after '-S' (the stack size)");
          }
          options.stackSize = asNum;
          args.shift();
        } else {
          throw new Error("Expected numeric arg after '-S' (the stack size)");
        }
        break;
      }
      case "-fbignum": {
        options.enableBigNum = true;
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

  const modulesToInit = [];

  // Hook module loader before load so we know which modules to include
  const originalResolve = engine.ModuleDelegate.resolve;
  engine.ModuleDelegate.resolve = function patchedResolve(name, fromFile) {
    if (name.includes(":")) {
      modulesToInit.push({
        modName: name,
        varName: name.replace(/^quickjs:/, ""),
      });
    } else {
      throw new Error(
        "Relative module import isn't supported by this implementation of qjsc"
      );
    }
    return originalResolve.call(this, name, fromFile);
  };

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
      out += '#include "quickjs-libc.h"\n';
      out += '#include "quickjs-utils.h"\n';
      out += '#include "quickjs-print.h"\n';
      out += '#include "quickjs-inspect.h"\n';
      out += '#include "quickjs-intervals.h"\n';
      out += '#include "quickjs-modulesys.h"\n';
      out += "\n\n";

      out += `const uint32_t ${cname}_size = ${length};\n\n`;
      out += `const uint8_t ${cname}[${length}] = {\n`;
      out += dumpHex(fileByteCode);
      out += "};\n\n";

      out += "static JSContext *JS_NewCustomContext(JSRuntime *rt)\n";
      out += "{\n";
      out += "  JSContext *ctx = JS_NewContextRaw(rt);\n";
      out += "  if (!ctx) {\n";
      out += "    return NULL;\n";
      out += "  }\n";
      out += "  JS_AddIntrinsicBaseObjects(ctx);\n";
      out += "  JS_AddIntrinsicDate(ctx);\n";
      out += "  JS_AddIntrinsicEval(ctx);\n";
      out += "  JS_AddIntrinsicStringNormalize(ctx);\n";
      out += "  JS_AddIntrinsicRegExp(ctx);\n";
      out += "  JS_AddIntrinsicJSON(ctx);\n";
      out += "  JS_AddIntrinsicProxy(ctx);\n";
      out += "  JS_AddIntrinsicMapSet(ctx);\n";
      out += "  JS_AddIntrinsicTypedArrays(ctx);\n";
      out += "  JS_AddIntrinsicPromise(ctx);\n";

      if (options.enableBigNum) {
        out += "  JS_AddIntrinsicBigFloat(ctx);\n";
        out += "  JS_AddIntrinsicBigDecimal(ctx);\n";
        out += "  JS_AddIntrinsicOperators(ctx);\n";
        out += "  JS_EnableBignumExt(ctx, 1);\n";
      }

      for (const { varName, modName } of modulesToInit) {
        out += "  {\n";
        out += `    extern JSModuleDef *js_init_module_${varName}(JSContext *ctx, const char *name);\n`;
        out += `    js_init_module_${varName}(ctx, ${JSON.stringify(
          modName
        )});\n`;
        out += "  }\n";
      }

      out += "  js_inspect_add_inspect_global(ctx);\n";
      out += "  js_intervals_add_setInterval_clearInterval_globals(ctx);\n";

      out += "  return ctx;\n";
      out += "}\n\n";

      out += "int main(int argc, char **argv)\n";
      out += "{\n";
      out += "  JSRuntime *rt;\n";
      out += "  JSContext *ctx;\n";
      out += "  int exit_status;\n";
      out += "  rt = JS_NewRuntime();\n";
      out += "  js_std_set_worker_new_context_func(JS_NewCustomContext);\n";
      out += "  js_std_init_handlers(rt);\n";

      if (options.stackSize != null) {
        out += `  JS_SetMaxStackSize(rt, ${options.stackSize});\n`;
      }

      out += "  QJMS_InitState(rt);\n";
      out += "  ctx = JS_NewCustomContext(rt);\n";
      out += "  js_std_add_helpers(ctx, argc, argv);\n";
      out += "  js_print_add_print_global(ctx);\n";
      out += "  js_print_add_console_global(ctx);\n";
      out += "  QJMS_InitContext(ctx);\n";

      // This is where we actually load the compiled bytecode
      out += `  QJMS_EvalBinary(ctx, ${cname}, ${cname}_size, 0);\n`;

      out += "  exit_status = js_std_loop(ctx);\n";
      out += "  QJMS_FreeState(rt);\n";
      out += "  JS_FreeContext(ctx);\n";
      out += "  js_std_free_handlers(rt);\n";
      out += "  JS_FreeRuntime(rt);\n";
      out += "  return exit_status;\n";
      out += "}\n";

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
