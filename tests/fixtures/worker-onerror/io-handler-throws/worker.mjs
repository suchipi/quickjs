import * as os from "quickjs:os";
/* Create a pipe, install a handler that consumes the byte and then throws,
   so it fires once rather than busy-looping on an ever-readable fd. */
const [readFd, writeFd] = os.pipe();
os.setReadHandler(readFd, () => {
  const buf = new ArrayBuffer(1);
  os.read(readFd, buf, 0, 1);
  os.setReadHandler(readFd, null);
  throw new Error("io handler boom");
});
os.write(writeFd, new Uint8Array([0x42]).buffer, 0, 1);
