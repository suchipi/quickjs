---
paths:
  - src/globals/quickjs-inspect/**/*
  - src/globals/quickjs-print/**/*
  - src/programs/repl/repl.js
  - .tmp/be06b3e.patch
---

# Comparison: Upstream JS_PrintValue vs Fork's inspect()

## Executive Summary

Upstream's new C-level `JS_PrintValue()` API and the fork's JS-implemented `inspect()` function serve the same purpose—human-readable object formatting—but have fundamentally different scopes and capabilities:

- **Upstream JS_PrintValue**: A minimal, safe-by-default C function with no allocations in raw mode, designed for console output and error handling. Features hardcoded depth/string/item limits. No color support, no custom formatting hooks.
- **Fork's inspect()**: A feature-rich JavaScript function with extensive formatting options (20+ config parameters), color support, custom symbol hooks (`inspect.custom`), source code display, and sophisticated styling. Designed as a general-purpose serialization/pretty-printing library.

**Core tension**: They cannot coexist cleanly in `console.log`/`print` without one of them being the primary path. Their output formats diverge significantly.

---

## 1. API Surface

### Upstream: JSPrintValueOptions

```c
typedef struct {
    JS_BOOL show_hidden : 8;        /* only show enumerable properties */
    JS_BOOL show_closure : 8;        /* show closure variables */
    JS_BOOL raw_dump : 8;            /* avoid doing autoinit and avoid malloc() (internal use) */
    uint32_t max_depth;              /* recurse up to this depth, 0 = no limit */
    uint32_t max_string_length;      /* print no more than this length for strings, 0 = no limit */
    uint32_t max_item_count;         /* print no more than this count for arrays/objects, 0 = no limit */
} JSPrintValueOptions;
```

**Public functions**:
- `JS_PrintValue(JSContext *ctx, FILE *fo, JSValueConst val, const JSPrintValueOptions *options)` – Print with context (allows side-effects like calling `.toString()`)
- `JS_PrintValueRT(JSRuntime *rt, FILE *fo, JSValueConst val, const JSPrintValueOptions *options)` – Print without context (safe, no malloc in raw mode)
- `JS_PrintValueSetDefaultOptions(JSPrintValueOptions *options)` – Initialize with defaults (max_depth=2, max_string_length=1000, max_item_count=100)

**Semantics**:
- `show_hidden`: Include non-enumerable properties
- `show_closure`: Include `[[Closure]]` and `[[HomeObject]]` annotations for functions
- `raw_dump`: Internal flag; when true, shows raw pointers and avoids calling user code
- Limits are soft: "no more than N", but strings are truncated with `... M more character(s)` suffix
- No option for colors, custom separators, or styling

### Fork: InspectOptions

```typescript
interface InspectOptions {
  all?: boolean;                     /* Display non-enumerable properties */
  followGetters?: boolean;           /* Invoke getter functions */
  indexes?: boolean;                /* Display indexes of iterable entries */
  maxDepth?: number;                /* Hide after N recursions, default Infinity */
  noAmp?: boolean;                  /* Don't format well-known symbols as @@… */
  noHex?: boolean;                  /* Don't format byte-arrays as hexadecimal */
  noSource?: boolean;               /* Don't display function source code */
  proto?: boolean;                  /* Show __proto__ properties */
  sort?: boolean;                   /* Sort properties alphabetically */
  colours?: boolean | 256 | 8 | InspectColours;  /* ANSI color config */
  indent?: string;                  /* Indentation prefix, default '\t' */
}

interface InspectColours {
  off, red, grey, green, darkGreen, punct, keys, keyEscape, typeColour, 
  primitive, escape, date, hexBorder, hexValue, hexOffset, reference, 
  srcBorder, srcRowNum, srcRowText, nul, nulProt, undef, noExts, frozen, 
  sealed, regex, string, symbol, symbolFade, braces, quotes, empty, dot
  /* ~24 color keys */
}
```

**Semantics**:
- `followGetters`: Actually invoke getter functions (upstream has no equivalent; only `show_hidden` for non-enumerable)
- `maxDepth`: Defaults to Infinity (no limit); displayed as truncation at depth boundary
- `noSource`: Suppress function source code (upstream has no control; functions shown as `[Function name]`)
- `proto`: Show `__proto__` chain (upstream has no control; only normal properties shown)
- `sort`: Alphabetical sorting (upstream: insertion order)
- Full ANSI color palette with 256 or 8-color modes, or custom RGB codes
- `chars` decorator override (arrows, braces, ellipsis, etc.) – upstream hardcoded

**Divergence**: Inspect is a 20+ parameter design space; JS_PrintValue is 6 parameters with no colors, no source, no proto, no getter invocation.

---

## 2. Output Format Comparison

### Test Case 1: Simple Object `{ a: 1, b: "x" }`

**Upstream JS_PrintValue (no options)**:
```
{ a: 1, b: "x" }
```

**Fork inspect (no options)**:
```
Object {
	a: 1,
	b: "x"
}
```

| Aspect         | Upstream         | Fork             | Difference |
|---|---|---|---|
| Type label     | None             | `Object`         | Fork names type |
| Indentation    | Single line      | Multi-line with `\t` | Fork expands |
| Brackets       | `{ }`            | `{ }`            | Same |
| Spacing        | `: ` (colon-space) | `: ` + newline  | Fork newlines |
| Color          | None             | Optional ANSI   | Fork can colorize |

### Test Case 2: Nested Object (3 levels) `{ a: { b: { c: 1 } } }`

**Upstream JS_PrintValue (default options)**:
```
{ a: { b: [Object] } }
```
Stops at depth 2 (max_depth=2 default), shows `[Object]` placeholder for deeper objects.

**Fork inspect (maxDepth=Infinity)**:
```
Object {
	a: Object {
		b: Object {
			c: 1
		}
	}
}
```
Unlimited nesting by default, but can be truncated with `... maxDepth exceeded` or `…`.

**Difference**: Upstream's depth limiting is silent abbreviation; fork shows truncation marker `…`.

### Test Case 3: Array of 100 Numbers `[0, 1, ..., 99]`

**Upstream JS_PrintValue (default)**:
```
[ 0, 1, 2, ..., 99, 100 items ]
```
Actually prints first N items (max_item_count=100 default), then `... M more item(s)` suffix.

**Fork inspect (default)**:
```
[
	0: 0,
	1: 1,
	2: 2,
	...
	99: 99
]
```
Expands all 100 items with optional indexing.

| Aspect    | Upstream | Fork | Difference |
|---|---|---|---|
| Abbreviation | `... 50 more items` | `… × 50` or full expansion | Fork shows each, upstream batches |
| One-line | Yes, default | Multi-line | Fork expands by default |
| Index labels | No | Yes (if `indexes: true`) | Fork can annotate indices |

### Test Case 4: Map

**Upstream** (from patch code):
```
Map(3) { 
    key0 => value0, key1 => value1, key2 => value2
 }
```
Format: `Map(count) { key => value, ... }`. Uses recursive `js_print_value()` for keys/values.

**Fork**:
```
Map {
	0.key -> Symbol(Symbol.iterator)
	0.value -> [Function]
	1.key -> "anotherKey"
	1.value -> "anotherValue"
	...
}
```
Enumerates entries as `index.key` and `index.value` properties in object-like format.

**Difference**: Upstream treats Maps as special key-value syntax; fork treats them as objects with indexed properties.

### Test Case 5: Set

**Upstream**:
```
Set(2) { <value0>, <value1> }
```

**Fork**:
```
Set {
	0 -> <value0>,
	1 -> <value1>
}
```

### Test Case 6: Function

**Upstream (from patch)**:
```
[Function greet]
```
or if `show_closure` is true:
```
[Function greet]
  [[Closure]]: [<closed_var0>, <closed_var1>]
  [[HomeObject]]: [object Object]
 }
```

**Fork**:
```
Function: greet() {
	// ... source code displayed line-by-line with syntax coloring
	// (unless noSource=true)
}
```

**Difference**: Upstream shows `[Function name]` with optional closure dump; fork shows full source code by default.

### Test Case 7: Proxy

**Upstream**: Shows as generic object (no special handling in patch).

**Fork**: No special handling visible; shows properties from Proxy target.

### Test Case 8: Circular Reference

**Upstream** (from patch, lines 895-910):
```
{ a: 1, b: [circular 0] }
```
Shows `[circular <depth_index>]` pointing back to ancestor level.

**Fork**:
```
Object {
	a: 1,
	b: -> {root} // reference marker with path string
}
```

**Difference**: Upstream uses depth index; fork uses path string and arrow `->`.

### Test Case 9: Symbol-keyed Property

**Upstream**:
```
{ normalKey: 1, Symbol(mySymbol): 2 }
```
Formats symbol as `Symbol(name)`.

**Fork**:
```
Object {
	normalKey: 1,
	Symbol(mySymbol): 2
}
```

**Difference**: Same formatting; fork can suppress `@@` notation with `noAmp: true` for well-known symbols.

### Test Case 10: Date

**Upstream**:
```
Date "2026-05-04T12:34:56.789Z"
```

**Fork**:
```
Date "2026-05-04T12:34:56.789Z"
```

**Difference**: Same format; fork applies color if colors enabled.

### Test Case 11: Error

**Upstream** (from patch, lines 606–621):
```
Error: message
    at <stack trace>
```
Includes stack property if present, indented.

**Fork**:
```
Error: message
    at line 1 in <file>
    ... (full stack with coloring)
```

**Difference**: Same content; fork colorizes and indents differently.

### Test Case 12: Regex

**Upstream**:
```
/pattern/flags
```
Calls `js_regexp_toString()`.

**Fork**:
```
/pattern/flags
```

**Difference**: Same; fork applies color.

---

## 3. Special Cases: Fork Extensions

### Custom inspect() Symbol

The fork's `inspect.custom` symbol allows user code to override formatting:

```javascript
const obj = { x: 1 };
obj[inspect.custom] = function (inputs) {
  // inputs = { key, type, brackets, oneLine, linesBefore, linesAfter, propLines, tooDeep, indent, typeSuffix, opts, colours }
  // Mutate inputs to customize output
  propLines.push("customProp: customValue");
};
inspect(obj); // Calls obj[inspect.custom](inputs) before rendering
```

**Upstream has no equivalent**: No user-overridable formatting hook.

### Symbol Formatting and @@ Notation

Fork detects well-known symbols (e.g., `Symbol.iterator` → `@@iterator`) and colorizes them. Configurable with `noAmp: true`.

**Upstream**: Shows `Symbol(name)` without `@@` notation.

### Source Code Display

Fork stores and formats the full source code of functions (via `Function.prototype.toString()`) with line numbers and syntax coloring.

**Upstream**: Shows only `[Function name]`, no source.

### Proto Chain and Extensibility Metadata

Fork can show `__proto__`, frozen/sealed/non-extensible flags, null-prototype annotation.

**Upstream**: Only `show_hidden` for non-enumerable; no proto chain display. Closures shown only with `show_closure` flag.

### Byte-Array Hex Formatting

Fork can format `Uint8Array` in hex columns (od(1)-like style) or as a list.

**Upstream**: TypedArrays shown as hex values in loop (lines 500–549 of patch), with element count limit.

---

## 4. Output Completeness: Upstream Capabilities Fork Lacks

### Access to Closure Variables at C-Level

Upstream's `show_closure` flag can dump closure variable references because the C code can directly inspect `JSFunctionBytecode` and `JSVarRef` structures:

```c
if (s->options.show_closure && js_class_has_bytecode(p->class_id)) {
    JSFunctionBytecode *b = p->u.func.function_bytecode;
    if (b->closure_var_count) {
        JSVarRef **var_refs = p->u.func.var_refs;
        // ... iterate and print closure vars
    }
}
```

**Fork cannot**: JavaScript code cannot introspect closure variables; they are hidden by the runtime.

### Raw Dump Mode (No Side Effects)

Upstream's `raw_dump` flag avoids calling user code (getters, `.toString()`, autoinit), safe for debugging GC objects:

```c
if ((prs->flags & JS_PROP_TMASK) == JS_PROP_GETSET) {
    if (s->options.raw_dump) {
        fprintf(s->fo, "[Getter %p Setter %p]", ...);
    } else {
        // Invoke getters
    }
}
```

**Fork cannot**: Always invokes getters if `followGetters: true`; no way to skip side-effects.

### Variable Reference Inspection

Upstream can show `[varref %p]` for closure variable references (lines 682–687).

**Fork**: No visibility into varref mechanics.

---

## 5. Where Upstream's Implementation Is Invoked

From the patch (`be06b3e92b77a343adefa49a4b29e1ad523014ea`):

### Call Site 1: `print()` Function (quickjs-libc.c, lines 3891–3914)

**Before**: Converted all args to strings via `JS_ToCStringLen()`, wrote strings.

**After**: 
- Strings: Still convert to string and write
- Objects/other: Call `JS_PrintValue(ctx, stdout, v, NULL)`

```c
for(i = 0; i < argc; i++) {
    if (i != 0)
        putchar(' ');
    v = argv[i];
    if (JS_IsString(v)) {
        // ... write string
    } else {
        JS_PrintValue(ctx, stdout, v, NULL);  // <-- NEW
    }
}
```

**Fork currently**: Uses string coercion for all args.

### Call Site 2: `console.log()` via `__printObject()` (quickjs-libc.c, lines 1083–1090)

**New function** added:
```c
static JSValue js_std_file_printObject(JSContext *ctx, JSValueConst this_val,
                                       int argc, JSValueConst *argv)
{
    JS_PrintValue(ctx, stdout, argv[0], NULL);
    return JS_UNDEFINED;
}
```

Registered as `std.__printObject(obj)` in standard library.

**Fork currently**: No `__printObject`; console.log uses string coercion.

### Call Site 3: REPL (repl.js, lines 1009–1015 in upstream)

**Before**: Custom `print()` function with recursive depth/array truncation logic.

**After**: Replaced with:
```javascript
if (hex_mode) {
    // Format numbers in hex
} else {
    std.__printObject(result);  // <-- Calls C-level JS_PrintValue
}
```

**Fork currently**: REPL calls `print(result)` which calls `inspect(result, { colours: true, indent: "  " })`.

### Call Site 4: Error Reporting (quickjs-libc.c, lines 4026–4033)

**Before**: Called `js_dump_obj()` which coerced to string.

**After**: 
```c
JS_PrintValue(ctx, stderr, exception_val, NULL);
fputc('\n', stderr);
```

**Fork currently**: No change to error handling visible in quick review.

---

## 6. Risk of API Duplication: Behavioral Divergence

### Scenario: Dual Code Path Problem

If the fork adds `JS_PrintValue()` as a public C API but keeps `inspect()` as the primary path for `console.log`/`print`/REPL:

**Path A (current)**: `console.log(obj)` → JS string coercion → string output
**Path B (if ported)**: C consumer calls `JS_PrintValue(ctx, stdout, obj, NULL)` → structured output

**Observable difference**:
```javascript
// Path A (current fork)
console.log({ a: 1 }); 
// Output: [object Object]  (or calls toString if defined)

// Path B (hypothetical C caller)
JS_PrintValue(ctx, stdout, obj, NULL);
// Output: { a: 1 }
```

### Specific Divergences If Not Unified

| Aspect | Current Fork | Upstream JS_PrintValue | Impact |
|---|---|---|---|
| Depth limit | Unbounded (default) | 2 | Objects at depth >2 shown as `[Object]` vs expanded |
| String limit | Unbounded | 1000 chars | Long strings truncated vs full output |
| Item count | All shown | 100 items max | Arrays >100 items truncated vs full |
| Colors | Controllable | None | ANSI codes appear in C-level output (none) |
| Function display | Source code (lines) | `[Function name]` | Functions shown as huge blocks vs single line |
| Closures | Hidden | Visible if `show_closure=true` | Debug info leak in one path, not the other |
| Error formatting | Full stack with colors | Stack + truncation | Different error output |

### How to Unify

**Option 1**: Replace `console.log`/`print` REPL to use `JS_PrintValue()`, bypass `inspect()` entirely.
- **Pro**: Single code path, matches upstream.
- **Con**: Loses all fork customizations (colors, source, proto, 20+ options).

**Option 2**: Implement `inspect()` as a wrapper that calls `JS_PrintValue()` internally.
- **Pro**: Keeps both APIs, shared implementation.
- **Con**: Requires JS-to-C bridge; may lose some color/formatting fidelity.

**Option 3**: Implement `JS_PrintValue()` as a thin wrapper that calls JavaScript `inspect()` internally.
- **Pro**: Single truth; C API defers to JS.
- **Con**: Upstream's design assumes `JS_PrintValue()` is C-only, safe from JS side-effects.

---

## 7. Key Gotchas

### Upstream Design Assumptions

1. **No malloc() in raw_dump mode**: Internal use only; `JS_PrintValueRT` without context avoids allocations.
2. **Depth is index-based for circularref**: `[circular 0]` means ancestor at stack level 0, not a numeric pointer.
3. **Default options are conservative**: max_depth=2, max_string=1000, max_item=100 to prevent output explosion.

### Fork Design Assumptions

1. **`inspect.custom` hook is global**: All objects can override via symbol; no security isolation.
2. **maxDepth defaults to Infinity**: Unbounded recursion risk if object graph is deep.
3. **Colors are ANSI codes**: Output includes escape sequences; piping to files produces junk unless stripped.
4. **Source code can be huge**: Function source is stored verbatim; displaying can create megabytes of output.

---

## 8. Recommendation

**If porting `JS_PrintValue()`:**

1. **Do not replace** the fork's `inspect()` entirely; they serve different audiences.
2. **Expose `JS_PrintValue()`** as a C-only public API for embedders.
3. **Keep `inspect()`** as the default for JavaScript-side `console.log`/`print`/REPL.
4. **Add optional bridge** (e.g., a setting) to allow users to swap formatters if desired, but make it opt-in.
5. **Document** the differences clearly: downstream consumers may notice output changes if they copy-paste C call sites from upstream.

---

## Files Involved

- **Upstream implementation**: `/Users/suchipi/Code/quickjs/.tmp/be06b3e.patch` (full diff)
- **Upstream API definition**: Lines 1103–1118 of patch (quickjs.h additions)
- **Upstream core logic**: Lines 244–987 of patch (quickjs.c js_print_* functions)
- **Fork inspect()**: `/Users/suchipi/Code/quickjs/src/globals/quickjs-inspect/inspect.js`
- **Fork inspect API**: `/Users/suchipi/Code/quickjs/src/globals/quickjs-inspect/quickjs-inspect.d.ts`
- **Fork print/console**: `/Users/suchipi/Code/quickjs/src/globals/quickjs-print/quickjs-print.c`
- **Fork REPL**: `/Users/suchipi/Code/quickjs/src/programs/repl/repl.js` (lines 881–1043)

