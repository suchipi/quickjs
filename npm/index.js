const fs = require("fs");
const path = require("path");
const detectLibc = require("detect-libc");

function buildArtifactsLocation() {
  return path.resolve(__dirname, "..", "build");
}
exports.buildArtifactsLocation = buildArtifactsLocation;

const platforms = require("./platforms.json");
exports.platforms = platforms;

function identifyCurrentPlatform() {
  const matchingPlatforms = platforms.filter((platform) => {
    return (
      platform.os === process.platform &&
      platform.architectures.includes(process.arch)
    );
  });

  let desiredAbi;
  if (process.platform === "linux") {
    switch (detectLibc.familySync()) {
      case "glibc": {
        desiredAbi = "gnu";
        break;
      }
      case "musl": {
        desiredAbi = "musl";
        break;
      }
      default: {
        desiredAbi = "static";
        break;
      }
    }
  } else {
    desiredAbi = "static";
  }

  const matchingPlatform =
    matchingPlatforms.find((platform) => platform.abi === desiredAbi) ||
    matchingPlatforms[0];

  if (matchingPlatform) {
    return matchingPlatform;
  } else {
    throw new Error(
      `Unsupported platform: ${process.platform}/${process.arch}`
    );
  }
}
exports.identifyCurrentPlatform = identifyCurrentPlatform;
