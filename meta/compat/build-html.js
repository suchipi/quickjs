#!/usr/bin/env node
// Renders output/results.json into compatibility tables, by feeding our results
// to compat-table's own build.js rather than reimplementing its HTML output.
//
// build.js reaches for environments.json and the data-*.js suites through
// require(), so priming the module cache with edited copies is enough to
// redirect it: it renders our column, into our output directory, and the
// submodule checkout is never written to.

var fs = require("fs");
var path = require("path");
var common = require("./common");

if (!fs.existsSync(common.resultsFile)) {
  console.error("No results at " + common.resultsFile);
  console.error("Run `node meta/compat/run-tests.js` first.");
  process.exit(1);
}

var stored = JSON.parse(fs.readFileSync(common.resultsFile, "utf-8"));
var cheerio = require(path.join(common.submoduleDir, "node_modules", "cheerio"));

var ASSETS = ["master.css", "master.js", "logo.png", "favicon.ico", "mdn.png"];

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

var generatedOn = new Date(stored.generated).toISOString().slice(0, 10);
var columnLabel = "QuickJS " + stored.version;

var environments = require(path.join(common.submoduleDir, "environments.json"));
// build.js checks every id recorded in a test's `res` against this map, so the
// other engines have to stay listed; emptying test_suites is what drops their
// columns from the rendered tables.
Object.keys(environments).forEach(function (id) {
  environments[id].test_suites = [];
});
environments[common.key] = {
  full: columnLabel + " (@suchipi fork)",
  short: "QuickJS",
  family: common.family,
  platformtype: "engine",
  test_suites: common.suites.slice(),
};

function localizeHref(href) {
  if (!href || /^(?:[a-z]+:|#)/i.test(href) || /\.\w+$/.test(href)) {
    return href;
  }
  // Directory links only resolve behind a web server; make the pages browsable
  // straight off the filesystem.
  return href.replace(/\/?$/, "/index.html");
}

function writeSkeleton(suite, data) {
  var $ = cheerio.load(fs.readFileSync(path.join(common.submoduleDir, data.skeleton_file), "utf-8"));

  $("title").text(columnLabel + " - " + data.name + " support");

  $("script").each(function () {
    var script = $(this);
    if (/google-analytics|flattr/.test((script.attr("src") || "") + (script.html() || ""))) {
      script.remove();
    }
  });
  $("#header iframe, #header .FlattrButton").remove();
  $("#header .social").prepend(
    '<span class="hidden-tablet" style="color:#eee">' +
      escapeHtml(columnLabel) +
      " &middot; generated " +
      escapeHtml(generatedOn) +
      "</span>&nbsp;&nbsp;"
  );

  // The colour swatches key the per-engine column colours, of which there is
  // now only one; the significance dots below them still apply.
  $(".legend .swatch").parent().remove();
  $(".legend br").remove();

  // Only one platform group still has a column under it. master.js recomputes
  // these colspans, but a computed 0 renders as 1, so the empty groups would
  // otherwise sit across the table.
  var keptGroup = environments[common.key].platformtype + "-header";
  $("thead th.platformtype[id]").each(function () {
    var group = $(this);
    if (group.attr("id") !== keptGroup) {
      group.remove();
    }
  });

  $("#header a").each(function () {
    var link = $(this);
    link.attr("href", localizeHref(link.attr("href")));
  });

  var target = path.join(common.workDir, "skeleton-" + suite + ".html");
  fs.mkdirSync(common.workDir, { recursive: true });
  fs.writeFileSync(target, $.root().html());
  return target;
}

var tallies = {};

common.suites.forEach(function (suite) {
  var data = common.dataFor(suite);
  var tally = (tallies[suite] = { yes: 0, strict: 0, no: 0, unknown: 0 });

  common.eachTest(suite, data.tests, function (testKey, test) {
    if (!test.res) {
      test.res = {};
    }
    var result = stored.results[testKey];
    if (result === undefined) {
      delete test.res[common.key];
    } else {
      test.res[common.key] = result;
    }

    // Supertests get a tally cell derived from their subtests, so counting them
    // as well would double up.
    if (test.subtests) {
      return;
    }
    if (result === true) {
      tally.yes++;
    } else if (result === "strict") {
      tally.strict++;
    } else if (result === false) {
      tally.no++;
    } else {
      tally.unknown++;
    }
  });

  fs.mkdirSync(path.join(common.outputDir, suite), { recursive: true });
  // handle() resolves both of these against the submodule directory.
  data.skeleton_file = path.relative(common.submoduleDir, writeSkeleton(suite, data));
  data.target_file = path.relative(
    common.submoduleDir,
    path.join(common.outputDir, suite, "index.html")
  );
});

ASSETS.forEach(function (asset) {
  var contents = fs.readFileSync(path.join(common.submoduleDir, asset));
  if (asset === "master.js") {
    var source = contents.toString("utf-8");
    var stripped = source.replace(/\(function \(\) \{[\s\S]*?google-analytics[\s\S]*?\}\)\(\);\n?/, "");
    if (stripped === source) {
      console.warn("Warning: could not strip the analytics loader from master.js");
    }
    contents = Buffer.from(stripped, "utf-8");
  }
  fs.writeFileSync(path.join(common.outputDir, asset), contents);
});

function indexPage() {
  var rows = common.suites
    .map(function (suite) {
      var tally = tallies[suite];
      var total = tally.yes + tally.strict + tally.no + tally.unknown;
      var pct = total === 0 ? 0 : Math.round((tally.yes / total) * 100);
      return (
        "<tr>" +
        '<td><a href="' + suite + '/index.html">' + escapeHtml(common.dataFor(suite).name) + "</a></td>" +
        '<td class="num">' + tally.yes + " / " + total + "</td>" +
        '<td class="num">' + pct + "%</td>" +
        '<td class="num">' + (tally.strict || "") + "</td>" +
        '<td class="num">' + (tally.unknown || "") + "</td>" +
        "</tr>"
      );
    })
    .join("\n      ");

  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width">',
    '  <link rel="shortcut icon" href="favicon.ico">',
    "  <title>" + escapeHtml(columnLabel) + " ECMAScript support</title>",
    "  <style>",
    "    body { font-family: 'Open Sans', 'Helvetica Neue', Arial, sans-serif; margin: 0; color: #222; }",
    "    header { background: #333; color: #eee; padding: 20px 30px; }",
    "    header h1 { margin: 0 0 4px; font-size: 22px; font-weight: 600; }",
    "    header p { margin: 0; font-size: 13px; color: #aaa; }",
    "    main { padding: 24px 30px 40px; max-width: 720px; }",
    "    table { border-collapse: collapse; width: 100%; font-size: 14px; }",
    "    th, td { padding: 8px 12px; border-bottom: 1px solid #ddd; text-align: left; }",
    "    th { font-weight: 600; background: #f6f6f6; }",
    "    td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }",
    "    a { color: #1a6bbd; }",
    "    footer { padding: 0 30px 30px; font-size: 12px; color: #777; max-width: 720px; }",
    "  </style>",
    "</head>",
    "<body>",
    "  <header>",
    "    <h1>" + escapeHtml(columnLabel) + " ECMAScript support</h1>",
    "    <p>Generated " + escapeHtml(generatedOn) + " from " + escapeHtml(stored.engine) + "</p>",
    "  </header>",
    "  <main>",
    "    <table>",
    "      <thead>",
    "        <tr>",
    "          <th>Suite</th>",
    '          <th class="num">Passing</th>',
    '          <th class="num">Percent</th>',
    '          <th class="num">Strict only</th>',
    '          <th class="num">Not run</th>',
    "        </tr>",
    "      </thead>",
    "      <tbody>",
    "      " + rows,
    "      </tbody>",
    "    </table>",
    "  </main>",
    "  <footer>",
    "    Counts cover individual feature tests, unweighted; the per-suite pages weight",
    "    them by significance the way",
    '    <a href="https://compat-table.github.io/compat-table/es2016plus/">compat-table</a> does.',
    "    Test data comes from the",
    '    <a href="https://github.com/compat-table/compat-table">compat-table</a> project.',
    "  </footer>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

fs.writeFileSync(path.join(common.outputDir, "index.html"), indexPage());

// build.js does its work in a process.nextTick callback, which runs first.
require(path.join(common.submoduleDir, "build.js"));
setImmediate(function () {
  console.log("\nOpen " + path.join(path.relative(common.rootDir, common.outputDir), "index.html"));
});
