const fs = require("fs");
const path = require("path");

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

  const matchingPlatform =
    matchingPlatforms.find((platform) => platform.abi === "static") ||
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
