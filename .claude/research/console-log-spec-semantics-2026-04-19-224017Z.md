---
paths:
  - "src/globals/**"
  - "src/builtin-modules/quickjs-std/**"
  - "src/quickjs/quickjs.c"
---

# console.log stringification-failure semantics per spec

Investigated whether "console.log prints arg A then throws on arg B" is spec-compliant.

## ECMA-262 does not specify `console`

The ECMA-262 spec (https://tc39.es/ecma262/) has zero occurrences of the
word "console". It is a WHATWG-defined API, not a TC39-defined one.
ECMA-262 only defines the core language + things like Array, globalThis,
etc. — I/O, file system, and console are explicitly out of scope.

## WHATWG Console Standard: Logger / Formatter / Printer

Source: https://console.spec.whatwg.org/ (§2.1 Logger, §2.2 Formatter,
§2.3 Printer).

- `console.log(...data)` is defined as: "Perform Logger(\"log\", data)".
- Logger: if args empty return; else if only one arg, call
  `Printer(logLevel, « first »)`; otherwise call
  `Printer(logLevel, Formatter(args))`.
- Formatter ONLY coerces args when a format specifier (`%s`, `%d`, `%i`,
  `%f`, `%o`, `%O`, `%c`) is found in the first arg. When there are no
  format specifiers, Formatter returns `args` unchanged (step 5: "If no
  format specifier was found, return args"). So for
  `console.log("before:", moduleNamespaceObject)` with no `%` specifier
  in `"before:"`, the spec does no coercion — the module namespace is
  handed to Printer as-is.
- Printer is explicitly **implementation-defined**: "The printer
  operation is implementation-defined. ... How the implementation prints
  args is up to the implementation".

So the entire question of *when* coercion happens (atomically up front
vs. interleaved per-arg) and *what happens if an arg throws during
coercion* is **not pinned down by the spec**. It falls into Printer,
which the spec refuses to specify.

The one normative ordering constraint the spec does give is that
printing must happen before Logger returns (§2.1 note: "It's important
that the printing occurs before returning from the algorithm").

## Practical implication for QuickJS fork

QuickJS's observed behavior — `console.log("before:", ns)` writes
"before:" to stdout, then throws "failed to convert value to primitive:
[object Module]" — is **not a spec violation**, because the spec doesn't
prescribe behavior when Printer's argument-stringification throws. It is
a UX choice.

Node.js historically had similar issues with proxies/namespaces; Node
12+ hardened `util.inspect` to not invoke user traps during
console.log formatting (nodejs/node issues #10731, #12453, #28557).
That's a precedent for "make console.log robust to arg-side throws",
but it's a Node design decision, not a spec requirement.

## Key takeaway

If QuickJS wants to make `console.log` atomic (either print everything
or print nothing on error), that's a reasonable UX improvement, but it
is not required by any spec. The current interleaved-and-fail behavior
is spec-conformant. The real question is just: what do we want the user
experience to be.
