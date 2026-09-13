#!/usr/bin/env node
// Runs compat-table's data-*.js feature tests against a QuickJS binary and
// records the results in output/results.json, for build-html.js to render.

var fs = require("fs");
var path = require("path");
var childProcess = require("child_process");
var common = require("./common");

var args = common.parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(
    [
      "Usage: node meta/compat/run-tests.js [options]",
      "",
      "  --engine <path>     QuickJS binary to test (default: build/bin/qjs)",
      "  --suite <names>     comma-separated subset of: " + common.suites.join(", "),
      "  --test-name <text>  only run tests whose name or group contains <text>",
      "  --timeout <ms>      per-test timeout (default: 20000)",
    ].join("\n")
  );
  process.exit(0);
}

var engine = path.resolve(
  args.engine ||
    path.join(common.rootDir, "build", "bin", process.platform === "win32" ? "qjs.exe" : "qjs")
);
var suites = args.suite ? String(args.suite).split(",") : common.suites;
var timeout = Number(args.timeout || 20000);

var unknownSuites = suites.filter(function (suite) {
  return common.suites.indexOf(suite) === -1;
});
if (unknownSuites.length > 0) {
  console.error("Unknown suite(s): " + unknownSuites.join(", "));
  console.error("Available: " + common.suites.join(", "));
  process.exit(1);
}

if (!fs.existsSync(engine)) {
  console.error("No QuickJS binary at " + engine);
  console.error("Build one with `env QUICKJS_EXTRAS=1 meta/build.sh`, or pass --engine <path>.");
  process.exit(1);
}

function engineVersion() {
  var stdout;
  try {
    stdout = childProcess.execFileSync(engine, ["--help"], { encoding: "utf-8" });
  } catch (error) {
    // qjs --help exits nonzero, but it still prints the version banner.
    stdout = String(error.stdout || "");
  }
  var match = /QuickJS version (\S+)/.exec(stdout);
  return match ? match[1] : "unknown";
}

var version = engineVersion();
console.log("Engine: " + engine);
console.log("Version: " + version);

// runner_support.js discovers suites by listing data-*.js in the working
// directory, reads environments.json from it, and writes its generated test.js
// there too. Running from a scratch directory keeps the submodule pristine and
// makes --suite a matter of which data files we expose.
fs.mkdirSync(common.workDir, { recursive: true });
fs.readdirSync(common.workDir).forEach(function (entry) {
  if (/^data-.*\.js$/.test(entry)) {
    fs.unlinkSync(path.join(common.workDir, entry));
  }
});
suites.forEach(function (suite) {
  // Only the filename matters: runner_support.js lists this directory to learn
  // which suites exist, then require()s the real data file from the submodule.
  fs.writeFileSync(
    path.join(common.workDir, "data-" + suite + ".js"),
    "// placeholder; runner_support.js loads the real file from the submodule\n"
  );
});

// Only our own environment goes in here, so the "expected result" that
// runner_support.js looks up is always the sentinel planted below.
var environment = {};
environment[common.key] = {
  full: "QuickJS " + version,
  short: "QuickJS",
  family: common.family,
  platformtype: "engine",
  test_suites: common.suites.slice(),
};
fs.writeFileSync(
  path.join(common.workDir, "environments.json"),
  JSON.stringify(environment, null, 2) + "\n"
);

// runner_support.js never tells the runner which test it is running, and it
// does not return results either. It does hand the recorded `res` value to
// resultsMatch though, so planting a sentinel there lets us recover the test
// identity and capture the result.
suites.forEach(function (suite) {
  common.eachTest(suite, common.dataFor(suite).tests, function (testKey, test) {
    if (!test.res) {
      test.res = {};
    }
    test.res[common.key] = { __testKey: testKey };
  });
});

var SUCCESS = /^\[SUCCESS\]$/m;

// A test reports itself by printing, so the exit status is not the verdict:
// several tests deliberately leave a promise rejected, which qjs reports and
// exits nonzero over even once the test has already printed [SUCCESS].
function run(extraArgs, testFilename) {
  var args = ["--no-unhandled-rejection", "--script"].concat(extraArgs, [testFilename]);
  try {
    return SUCCESS.test(
      childProcess.execFileSync(engine, args, {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: timeout,
      })
    );
  } catch (error) {
    return SUCCESS.test(String(error.stdout || ""));
  }
}

function runner(testFilename) {
  if (run([], testFilename)) {
    return true;
  }
  // compat-table renders this as "Strict": supported, but only in strict mode.
  if (run(["--strict"], testFilename)) {
    return "strict";
  }
  return false;
}

var results = {};
var tally = { true: 0, strict: 0, false: 0 };

function resultsMatch(expect, actual) {
  if (expect && typeof expect === "object" && expect.__testKey) {
    results[expect.__testKey] = actual;
    tally[String(actual)] = (tally[String(actual)] || 0) + 1;
    process.stderr.write(actual === true ? "." : actual === "strict" ? "s" : "x");
  }
  // Reporting drift against our own freshly measured numbers is meaningless.
  return true;
}

process.chdir(common.workDir);
require(path.join(common.submoduleDir, "runner_support.js")).runTests(
  runner,
  common.key,
  common.family,
  {
    resultsMatch: resultsMatch,
    suites: suites,
    testName: args["test-name"],
  }
);
process.stderr.write("\n");

var merged = {};
if (fs.existsSync(common.resultsFile)) {
  var previous = JSON.parse(fs.readFileSync(common.resultsFile, "utf-8"));
  // Keep results for suites this run did not cover, so --suite stays additive.
  Object.keys(previous.results || {}).forEach(function (testKey) {
    if (suites.indexOf(common.suiteOf(testKey)) === -1) {
      merged[testKey] = previous.results[testKey];
    }
  });
}
Object.keys(results).forEach(function (testKey) {
  merged[testKey] = results[testKey];
});

fs.mkdirSync(common.outputDir, { recursive: true });
fs.writeFileSync(
  common.resultsFile,
  JSON.stringify(
    {
      engine: engine,
      version: version,
      generated: new Date().toISOString(),
      results: merged,
    },
    null,
    2
  ) + "\n"
);

console.log(
  "\nsupported: " +
    tally["true"] +
    ", strict-mode only: " +
    tally["strict"] +
    ", unsupported: " +
    tally["false"]
);
console.log("Wrote " + path.relative(common.rootDir, common.resultsFile));
