# Use Approved Tools Only — No Unapproved Alternatives

ALWAYS use the dedicated tools (Read, Glob, Grep, Edit, Write) instead of shell equivalents. Unapproved Bash commands will block on a permission prompt and halt all progress until the user approves. If the user is away, this can waste hours.

## Specific rules

- **File search**: Use `Glob`, NOT `find` or `ls`. (`find`'s `-exec` flag is too broad to trust unattended.)
- **Content search**: Use `Grep`, NOT `grep`, `rg`, `ag`, or `ack`.
- **Read files**: Use `Read`, NOT `cat`, `head`, `tail`, or `less`. (`head` and `tail` are approved in the allowlist but `Read` is preferred.)
- **Edit files**: Use `Edit`, NOT `sed` or `awk`.
- **Write files**: Use `Write`, NOT `echo >`, `cat <<EOF >`, or `tee`.

## Why

The `.claude/settings.local.json` permissions allowlist is deliberately narrow — only safe, read-only shell commands are approved. If you reach for an unapproved shell command, the permission prompt will block until the user returns, which could be hours. The dedicated tools don't require shell permissions and are always available.

## How to apply

Before using any Bash tool call, ask yourself: "Is there a dedicated tool that does this?" If yes, use it. Only use Bash for operations that genuinely require shell execution (git commands, compiled binaries, etc.) and that are on the approved list.
