#!/usr/bin/env node
const path = require("path");
const child_process = require("child_process");

const [target, ...args] = process.argv.slice(2);
const argv0 = path.basename(target);

console.log({ target, args, argv0 });

child_process.spawnSync(target, args, { argv0, stdio: "inherit" });
