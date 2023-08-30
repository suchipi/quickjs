import * as std from "quickjs:std";
/* example of JS module importing a C module with a class in it */
import { Point } from "../../../build/extras/point.so";

function assert(condition) {
  if (!condition) {
    throw Error("assertion failed");
  }
}

const tests = {
  "normal usage": () => {
    const point = new Point(2, 3);
    assert(point.x === 2);
    assert(point.y === 3);
    point.x = 4;
    assert(point.x === 4);
    assert(point.norm() == 5);
  },
  "subclass usage": () => {
    class ColorPoint extends Point {
      constructor(x, y, color) {
        super(x, y);
        this.color = color;
      }
      getColor() {
        return this.color;
      }
    }

    const point2 = new ColorPoint(2, 3, 0xffffff);
    assert(point2.x === 2);
    assert(point2.color === 0xffffff);
    assert(point2.getColor() === 0xffffff);
  },
};

for (const [name, testFn] of Object.entries(tests)) {
  std.out.puts(name + "...");

  try {
    testFn();
    std.out.puts(" PASS\n");
  } catch (err) {
    std.out.puts(" FAIL\n");
    console.error(err.message + "\n" + err.stack);
  }
}
