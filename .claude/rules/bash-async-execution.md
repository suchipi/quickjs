# Bash Async Execution: Foreground vs Background, and Wakeups

## Prefer foreground when the next step is just "wait"

Don't reach for `run_in_background` just because a command is slow. Only use background when there is genuinely independent work to do in parallel.

The user has a Stop hook that plays a sound when the assistant's turn ends — it's their "Claude needs me" signal. Launching a build/test in the background and then idling for the task-notification ends the turn and fires the sound even though no attention is needed yet. Running the same command in the foreground keeps the turn open until the command exits, so the Stop hook only fires when actually done and ready for the user.

- Long-running command + nothing else to do until it finishes → foreground Bash. Just block on it.
- Long-running command + real parallel work that can run concurrently (other independent queries, edits to unrelated files) → background is fine, because the turn stays productive while the command runs.
- Rule of thumb: if the plan after launching the command is "wait," run it in the foreground. If it's "do X, Y, Z in parallel," background it.

## Don't ScheduleWakeup on top of background tasks

Don't pair `ScheduleWakeup` with a Bash `run_in_background` command when all you're doing is waiting for that command to finish.

`run_in_background` already fires a task-notification the instant the command exits. That event is both faster and more precise than any timer would be. Adding a `ScheduleWakeup` on top queues a redundant alarm that may fire before *or* after the real completion — noise at best, and it can cause a mid-build resume that polls or acts on incomplete state.

- If a command was launched with Bash `run_in_background`, the correct behavior is: go idle, do unrelated work, or respond to the user — and wait for the task-notification. Don't schedule a wakeup "just in case."
- `ScheduleWakeup` is for cases where there is no single exit event to wait on: self-paced autonomous loops, polling an external system on an interval, or scheduling follow-up work at a concrete later time.
- Rule of thumb: if the question the timer would answer is "is my own background command done yet?" — don't set the timer.
