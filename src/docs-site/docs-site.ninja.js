// TODO (in shinobi): second arg shouldn't be required
const markdownFiles = glob("src/docs-site/pages/**/*.md", {});

for (const file of markdownFiles) {
  build({
    rule: "render-markdown",
    output: builddir(
      `docs-site/${file
        .replace(/^src\/docs-site\/pages/, "")
        .replace(/\.md$/, ".html")}`
    ),
    inputs: file,
  });
}
