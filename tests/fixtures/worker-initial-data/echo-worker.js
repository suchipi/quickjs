import * as os from "quickjs:os";

// Read initialData synchronously during module evaluation, then echo it back
// so the parent can confirm the round-trip.
console.log("worker sees initialData:", inspect(os.Worker.initialData));
os.Worker.parent.postMessage(os.Worker.initialData);
