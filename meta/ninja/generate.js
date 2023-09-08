#!/usr/bin/env bun

const { HOST, TARGET, QUICKJS_SHINOBI_EXTRA_FILES } = process.env;

if (!HOST) {
  throw new Error("You must define the HOST env var");
}

if (!TARGET) {
  throw new Error("You must define the TARGET env var");
}

const { Shinobi } = require("@suchipi/shinobi");

const files = [
  `meta/ninja/envs/host/${HOST}.ninja.js`,
  `meta/ninja/envs/target/${TARGET}.ninja.js`,
  "meta/ninja/defs.ninja.js",
  "meta/ninja/rules.ninja.js",
];

if (QUICKJS_SHINOBI_EXTRA_FILES) {
  const parsed = JSON.parse(QUICKJS_SHINOBI_EXTRA_FILES);
  if (!Array.isArray(parsed)) {
    throw new Error(
      "When present, env var QUICKJS_SHINOBI_EXTRA_FILES must be a JSON array of strings"
    );
  }
  files.push(...parsed);
}

files.push(...process.argv.slice(2));

const shinobi = new Shinobi();

for (const file of files) {
  shinobi.load(file);
}

const result = shinobi.render();

const fs = require("fs");

fs.writeFileSync("build.ninja", result);
