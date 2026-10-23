// Only build if CONFIG_TEMPORAL_INTL is not explicitly set to 0
if (process.env.CONFIG_TEMPORAL_INTL !== "0") {
  const sources = [
    "collator.c",
    "datetimeformat.c",
    "displaynames.c",
    "durationformat.c",
    "intl.c",
    "listformat.c",
    "locale-data.c",
    "locale.c",
    "numberformat.c",
    "pluralrules.c",
    "relativetimeformat.c",
    "segmenter.c",
  ];

  for (const source of sources) {
    const name = source.replace(/\.c$/, "");
    build({
      output: builddir(`intermediate/intl-${name}.host.o`),
      rule: "cc_host",
      inputs: [rel(source)],
    });
    build({
      output: builddir(`intermediate/intl-${name}.target.o`),
      rule: "cc_target",
      inputs: [rel(source)],
    });
  }
}
