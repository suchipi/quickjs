import * as os from "quickjs:os";

const data = os.Worker.initialData;
os.Worker.parent.postMessage({
  cyclePreserved: data.self === data,
  typedArrayIsUint8: data.bytes instanceof Uint8Array,
  typedArrayContents: Array.from(data.bytes),
  dateIsDate: data.when instanceof Date,
  dateTime: data.when.getTime(),
});
