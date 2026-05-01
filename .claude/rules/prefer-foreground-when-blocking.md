# Prefer Foreground Bash When the Next Step Is Just "Wait"

Don't reach for `run_in_background` just because a command is slow. Only use background when there is genuinely independent work to do in parallel.

The user has a Stop hook that plays a sound when the assistant's turn ends — it's their "Claude needs me" signal. Launching a build/test in the background and then idling for the task-notification ends the turn and fires the sound even though no attention is needed yet. Running the same command in the foreground keeps the turn open until the command exits, so the Stop hook only fires when actually done and ready for the user.

## How to apply

- Long-running command + nothing else to do until it finishes → foreground Bash. Just block on it.
- Long-running command + real parallel work that can run concurrently (other independent queries, edits to unrelated files) → background is fine, because the turn stays productive while the command runs.
- Rule of thumb: if the plan after launching the command is "wait," run it in the foreground. If it's "do X, Y, Z in parallel," background it.
