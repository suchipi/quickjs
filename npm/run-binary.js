#!/usr/bin/env node
const path = require("path");
const child_process = require("child_process");
const { identifyCurrentPlatform, buildArtifactsLocation } = require(".");

module.exports = function runBinary(name) {
  const buildDir = buildArtifactsLocation();
  const platform = identifyCurrentPlatform();

  const bin = path.resolve(
    buildDir,
    platform.name,
    "bin",
    name + platform.programSuffix
  );

  const argv = process.argv.slice(2);

  child_process.spawn(bin, argv, { stdio: "inherit" }).on("exit", process.exit);
};
