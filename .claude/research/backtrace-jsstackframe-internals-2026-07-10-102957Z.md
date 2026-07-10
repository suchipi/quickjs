---
name: backtrace / JSStackFrame internals
description: How the engine walks stack frames and maps pc to line/column - the static machinery in quickjs.c that build_backtrace and JS_CaptureStackFrames both use, plus the ownership/sentinel gotchas
type: research
paths:
  - "src/quickjs/quickjs.c"
  - "src/quickjs/quickjs.h"
  - "src/builtin-modules/quickjs-engine/**"
---

# Backtrace / JSStackFrame internals

All the frame-walking machinery lives `static` inside `src/quickjs/quickjs.c`. A builtin module (e.g. `quickjs-engine.c`) includes only `quickjs.h`, so it cannot call any of this directly; exposing stack data to JS requires a new public C function in `quickjs.c` that does the walk and returns a `JSValue`. `JS_CaptureStackFrames` is the first such function; `build_backtrace` (which builds `error.stack`) is the reference implementation both share the same loop shape.

## Frame representation

- `struct JSStackFrame` (definition in quickjs.c, not in the header). The live top-of-stack is `ctx->rt->current_stack_frame`; walk outward via `sf->prev_frame` (NULL terminates).
- The frame's function is `sf->cur_func`. Three cases, distinguished exactly as `build_backtrace` does:
  - **Synthetic frame**: `JS_VALUE_GET_TAG(sf->cur_func) == JS_TAG_NULL`. Cast `sf` to `JSSyntheticStackFrame *` (its first member is the `JSStackFrame`, so the cast is valid). Location comes from `ssf->filename` (a `JSAtom`), `ssf->line_num`, `ssf->col_num`. `line_num == -1` is the "no location" sentinel; `build_backtrace` only runs the mapper for synthetic frames when `line_num != -1`.
  - **Bytecode frame**: `p = JS_VALUE_GET_OBJ(sf->cur_func)` and `js_class_has_bytecode(p->class_id)`. Bytecode is `p->u.func.function_bytecode`; location only exists when `b->has_debug`. Filename is the atom `b->debug.filename`.
  - **Native (C) frame**: an object but not bytecode. No filename, no location (rendered `(native)` in stack strings).

## pc -> line/column

`find_line_num(ctx, b, pc_value, &col)` maps a bytecode offset to a **1-based** line number, writing the **1-based** column to `*col`. Call it with the offset `sf->cur_pc - b->byte_code_buf - 1`.

Gotcha - the failure sentinel: on stripped debug info (`!b->has_debug || !b->debug.pc2line_buf`) it returns `line == 0` and sets `*col == 0`. So `line == 0` means "no location", NOT "line zero". Callers must treat `find_line_num(...) == 0` as unlocated. (This fork's pc2line table encodes column deltas too, so real columns are tracked, not just lines.)

## The stack-frame mapper (source-map hook)

`map_stack_frame(ctx, filename, &line, &col)` runs a frame's `(filename, line, col)` through the host-registered mapper (`JS_SetStackFrameMapper`, exposed to JS as `setStackFrameMapper`). Ownership/behavior:

- Returns a **freshly `js_strdup`'d** filename (a copy of the original even when no mapping occurs), so the caller **always** frees the result with `js_free` - not `JS_FreeCString`.
- Updates `*line` / `*col` in place. Line/col are 1-based in and out.
- Never throws and never disturbs the in-flight exception: it saves/restores `rt->current_exception` and guards re-entrancy via `ctx->in_stack_frame_mapper` (so a throwing mapper doesn't recurse while a backtrace is being built).
- Applying the mapper keeps a captured location consistent with what `error.stack` / `err.fileName` / `err.lineNumber` / `err.columnNumber` would report for the same frame.

## Barrier

The walk must stop at `sf->js_mode & JS_MODE_BACKTRACE_BARRIER` (this is what `evalScript({ backtraceBarrier: true })` sets). `build_backtrace` and `JS_CaptureStackFrames` both `break` there, so both truncate identically.

## Ownership summary for a walk that emits data

Per frame: free every `JS_AtomToCString` result with `JS_FreeCString`, and every `map_stack_frame` result with `js_free`. See `.claude/rules/quickjs-gc-patterns.md` for the general refcount rules.
