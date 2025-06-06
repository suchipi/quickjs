///<reference path="../src/quickjs/quickjs.d.ts" />
///<reference path="../src/builtin-modules/quickjs-libc/quickjs-libc.d.ts" />

import * as std from "quickjs:std";
import * as os from "quickjs:os";

os.ttySetRaw(std.in.fileno());

while (!std.in.eof()) {
  const byte = std.in.getByte();
  console.log(byte.toString(), `(${String.fromCharCode(byte)})`);

  if (byte === 10) {
    // newline
    break;
  }
}
