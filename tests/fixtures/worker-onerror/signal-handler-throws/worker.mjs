import * as os from "quickjs:os";
os.signal(os.SIGUSR1, () => {
  throw new Error("signal handler boom");
});
os.kill(os.getpid(), os.SIGUSR1);
