# No Git Mutations Without Human Approval

NEVER run `git commit`, `git push`, `git merge`, `git rebase`, `git reset`, `git checkout`, `git switch`, `git cherry-pick`, `git revert`, `git stash push`, `git stash pop`, `git stash drop`, or any other git command that modifies repository state without explicit permission from a user.

Read-only git commands (`git log`, `git diff`, `git show`, `git blame`, `git status`, etc.) are fine.

This applies even if it means blocking on a permission prompt for hours. Wait for the user.

## Exemption: upstream-merge work

While executing the upstream catch-up protocol described in [../upstream-merge/plan.md](../upstream-merge/plan.md), this rule does not apply to the git mutations prescribed by that protocol — `git commit` for tracking-file updates and port work, and `git merge -s ours --no-ff <sha>` for ancestry markers. That exemption is authorized by the user for the duration of the upstream-merge work only, and only covers those commands in the shape described by the protocol. Destructive operations (`git reset --hard`, `git push --force`, `git rebase`, `git checkout` over uncommitted work, etc.) and any git mutations outside the protocol still require explicit per-invocation approval.
