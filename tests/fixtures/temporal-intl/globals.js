console.log(typeof Temporal, typeof Intl);
console.log(new Intl.NumberFormat("en-US").format(1234.5));
console.log(Temporal.PlainDate.from("2026-01-02").add({ days: 30 }).toString());

try {
  Temporal.Duration.from({ years: 1.5 });
} catch (error) {
  console.log(
    error.name,
    error.stack.includes("<internal>/temporal/duration.c:")
  );
}
