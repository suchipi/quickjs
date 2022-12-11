const path = require("path");

/** @type {import('jest').Config} */
const config = {
  transform: {
    "\\.[jt]sx?$": [
      "babel-jest",
      {
        babelrc: false,
        presets: ["@babel/preset-typescript"],
      },
    ],
  },
  watchPathIgnorePatterns: ["node_modules", path.join(__dirname, "build")],
};

module.exports = config;
