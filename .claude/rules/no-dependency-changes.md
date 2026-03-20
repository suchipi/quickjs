# Do Not Change Dependencies Without Human Approval

NEVER add, remove, or modify entries in `dependencies`, `devDependencies`, `optionalDependencies`, `peerDependencies`, or `bundledDependencies` in `package.json` without explicit permission from a human. Do not run `npm install <package>`, `npm uninstall`, or any equivalent that would change these.

This applies even if it means blocking on a permission prompt for hours. Wait for the human.
