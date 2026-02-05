// Definitions for the quickjs:timers module and global timer functions

declare module "quickjs:timers" {
  export type Timer = { [Symbol.toStringTag]: "Timer" };

  /** Call the function func after delay ms. Return a handle to the timer. */
  export function setTimeout(
    func: (...args: any) => any,
    delay: number
  ): Timer;

  /** Cancel a timer. */
  export function clearTimeout(handle: Timer): void;

  /** Call the function func repeatedly, with delay ms between each call. Return a handle to the timer. */
  export function setInterval(
    func: (...args: any) => any,
    delay: number
  ): Timer;

  /** Cancel an interval timer. */
  export function clearInterval(handle: Timer): void;
}

/** An opaque timer handle returned by setTimeout/setInterval */
declare type Timer = import("quickjs:timers").Timer;

/** Call the function func after delay ms. Return a handle to the timer. */
declare var setTimeout: typeof import("quickjs:timers").setTimeout;

/** Cancel a timer. */
declare var clearTimeout: typeof import("quickjs:timers").clearTimeout;

/** Call the function func repeatedly, with delay ms between each call. Return a handle to the timer. */
declare var setInterval: typeof import("quickjs:timers").setInterval;

/** Cancel an interval timer. */
declare var clearInterval: typeof import("quickjs:timers").clearInterval;
