// Only build if CONFIG_TEMPORAL_INTL is not explicitly set to 0
if (process.env.CONFIG_TEMPORAL_INTL !== "0") {
  const sources = [
    "calendar.c",
    "duration.c",
    "instant.c",
    "now.c",
    "plaindate.c",
    "plaindatetime.c",
    "plainmonthday.c",
    "plaintime.c",
    "plainyearmonth.c",
    "temporal.c",
    "timezone.c",
    "tzdata_generated.c",
    "zoneddatetime.c",
  ];

  for (const source of sources) {
    const name = source.replace(/\.c$/, "");
    build({
      output: builddir(`intermediate/temporal-${name}.host.o`),
      rule: "cc_host",
      inputs: [rel(source)],
    });
    build({
      output: builddir(`intermediate/temporal-${name}.target.o`),
      rule: "cc_target",
      inputs: [rel(source)],
    });
  }
}
