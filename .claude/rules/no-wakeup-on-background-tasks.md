# Don't ScheduleWakeup on Top of Bash run_in_background

Don't pair `ScheduleWakeup` with a Bash `run_in_background` command when all you're doing is waiting for that command to finish.

`run_in_background` already fires a task-notification the instant the command exits. That event is both faster and more precise than any timer would be. Adding a `ScheduleWakeup` on top queues a redundant alarm that may fire before *or* after the real completion — noise at best, and it can cause a mid-build resume that polls or acts on incomplete state.

## How to apply

- If a command was launched with Bash `run_in_background`, the correct behavior is: go idle, do unrelated work, or respond to the user — and wait for the task-notification. Don't schedule a wakeup "just in case."
- `ScheduleWakeup` is for cases where there is no single exit event to wait on: self-paced autonomous loops, polling an external system on an interval, or scheduling follow-up work at a concrete later time.
- Rule of thumb: if the question the timer would answer is "is my own background command done yet?" — don't set the timer.
