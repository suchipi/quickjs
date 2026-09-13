var path = require("path");

var rootDir = path.resolve(__dirname, "..", "..");
var submoduleDir = path.join(__dirname, "compat-table");
var outputDir = path.join(__dirname, "output");
var workDir = path.join(rootDir, ".tmp", "compat");
var resultsFile = path.join(outputDir, "results.json");

// Identifies our column in compat-table's `res` maps and environments.json.
var key = "quickjs";
var family = "QuickJS";

var suites = ["es5", "es6", "es2016plus", "esnext", "esintl", "non-standard"];

function dataFor(suite) {
  return require(path.join(submoduleDir, "data-" + suite + ".js"));
}

// Pre-order walk in the same order runner_support.js visits tests, handing each
// one a key that stays stable between the test run and the HTML build. A few
// sibling tests share a name, so repeats get a suffix.
function eachTest(suite, tests, visit) {
  var seen = Object.create(null);

  function walk(parents, test) {
    var trail = parents.concat(test.name);
    var base = suite + ": " + trail.join(" -> ");
    seen[base] = (seen[base] || 0) + 1;
    visit(seen[base] > 1 ? base + " #" + seen[base] : base, test);
    (test.subtests || []).forEach(function (subtest) {
      walk(trail, subtest);
    });
  }

  tests.forEach(function (test) {
    walk([], test);
  });
}

function parseArgs(argv) {
  var args = {};

  for (var i = 0; i < argv.length; i++) {
    var match = /^--([^=]+)(?:=([\s\S]*))?$/.exec(argv[i]);
    if (!match) {
      throw new Error("Unexpected argument: " + argv[i]);
    }
    if (match[2] !== undefined) {
      args[match[1]] = match[2];
    } else if (argv[i + 1] === undefined || /^--/.test(argv[i + 1])) {
      args[match[1]] = true;
    } else {
      args[match[1]] = argv[++i];
    }
  }

  return args;
}

function suiteOf(testKey) {
  return testKey.slice(0, testKey.indexOf(":"));
}

module.exports = {
  rootDir: rootDir,
  submoduleDir: submoduleDir,
  outputDir: outputDir,
  workDir: workDir,
  resultsFile: resultsFile,
  key: key,
  family: family,
  suites: suites,
  dataFor: dataFor,
  eachTest: eachTest,
  parseArgs: parseArgs,
  suiteOf: suiteOf,
};
