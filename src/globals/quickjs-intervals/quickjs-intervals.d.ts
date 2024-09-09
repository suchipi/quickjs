declare type Interval = { [Symbol.toStringTag]: "Interval" };

declare function setInterval(func: (...args: any) => any, ms: number): Interval;
declare function clearInterval(interval: Interval): void;
