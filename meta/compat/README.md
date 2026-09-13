# ECMAScript compatibility tables

Generates [compat-table](https://github.com/compat-table/compat-table)-style HTML pages showing which ECMAScript features this fork implements, by running compat-table's own feature tests against a built `qjs` binary.

## Usage

```sh
meta/compat/build.sh
```

That fetches the submodule and installs its dependencies if needed, runs every test against `build/bin/qjs`, and writes the pages to `meta/compat/output/`. Open `meta/compat/output/index.html` for the summary, or `meta/compat/output/es2016plus/index.html` for the table that mirrors <https://compat-table.github.io/compat-table/es2016plus/>.

You need a built engine first (`env QUICKJS_EXTRAS=1 meta/build.sh`), plus Node.js and network access for the initial `npm install` inside the submodule.

| Command | What it does |
|---------|--------------|
| `meta/compat/build.sh` | Test `build/bin/qjs` and rebuild all pages. |
| `meta/compat/build.sh --engine build/x86_64-pc-windows-static/bin/qjs.exe` | Test a different binary. |
| `meta/compat/build.sh --suite es6,esnext` | Re-run only some suites. Results for the others are kept. |
| `meta/compat/build.sh --test-name "async"` | Re-run only tests whose name or group matches. |
| `meta/compat/build.sh --html-only` | Re-render the pages from the existing `results.json`. |
| `node meta/compat/run-tests.js --help` | Full option list for the test runner. |

Output is gitignored. `meta/clean.sh` removes it.

## How it works

The point of the submodule is that almost nothing here has to be maintained. compat-table already has the feature tests, the test harness that turns them into runnable scripts, and the HTML generator. These scripts only supply the engine and redirect the output.

**`run-tests.js`** hands compat-table's `runner_support.js` a runner that spawns `qjs` on each generated test file and looks for `[SUCCESS]` in its output. A test that fails is retried with `--strict`, and passing only then is recorded as compat-table's `"strict"` result. Results land in `output/results.json`.

`runner_support.js` reports drift against recorded results rather than returning them, and it never tells the runner which test is running. To recover both, `run-tests.js` plants a sentinel object as each test's recorded result beforehand; `runner_support.js` passes that sentinel to our `resultsMatch` callback alongside the actual result, which is enough to pair them up. It also discovers suites by listing `data-*.js` in the working directory and writes its scratch `test.js` there, so the runner works out of `.tmp/compat/` (holding symlinks and a one-entry `environments.json`) and leaves the submodule checkout untouched.

**`build-html.js`** reuses compat-table's `build.js` unmodified. `build.js` pulls `environments.json` and the `data-*.js` suites in through `require()`, so priming Node's module cache with edited copies is enough to steer it:

- every environment keeps its entry, because `build.js` validates the ids recorded on each test against that map, but their `test_suites` are emptied so only the QuickJS column renders;
- each test's `res.quickjs` is set from `results.json`;
- `target_file` and `skeleton_file` are repointed at our output directory and at lightly edited copies of compat-table's skeletons (retitled, third-party widgets dropped, directory links rewritten to `index.html` so the pages open from the filesystem).

Everything after that - categories, tally cells, significance weighting, footnotes, spec and MDN links, the sortable table - is compat-table's code. `master.css`, `master.js` and the images are copied across as-is, except that the analytics loader is stripped out of `master.js`.

## Caveats

- The pages load jQuery from a CDN. Without network access the table still renders, but sorting and the percentage totals in the header do not run.
- The "Current browser" column runs the same tests live in whatever browser opens the page. That is compat-table's own feature, and it compares your browser rather than QuickJS.
- Results are not checked in, so nothing here is verified by CI; the tables reflect whichever binary you last pointed the script at.
- Tests are run as scripts through `eval`, so features that need module goal semantics are reported the way compat-table's other command-line engine runners report them.
