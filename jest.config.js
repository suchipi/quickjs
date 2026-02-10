const path = require("path");

/** @type {import('jest').Config} */
const config = {
  transform: {
    "\\.[jt]sx?$": [
      "babel-jest",
      {
        babelrc: false,
        presets: [
          "@babel/preset-typescript",
          ["@babel/preset-env", { targets: { node: "current" } }],
        ],
      },
    ],
  },
  watchPathIgnorePatterns: ["node_modules", path.join(__dirname, "build")],
  testPathIgnorePatterns: ["run-test262"],
  globalTeardown: "./tests/_teardown.ts",
};

module.exports = config;
