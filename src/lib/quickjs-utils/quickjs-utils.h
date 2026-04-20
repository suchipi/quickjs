#ifndef QUICKJS_UTILS_H
#define QUICKJS_UTILS_H

#include "quickjs.h"

typedef struct QJUForEachPropertyState
{
  uint32_t len;
  uint32_t i;
  JSPropertyEnum *tab;
  JSAtom key;
  JSValue val;
} QJUForEachPropertyState;

/* free using QJU_FreeForEachPropertyState */
QJUForEachPropertyState *QJU_NewForEachPropertyState(JSContext *ctx, JSValue obj, int flags);

// put a block after this invocation; it will be run once per property
#define QJU_ForEachProperty(ctx, state) \
  for (state->i = 0; state->i < state->len; state->i++)

// fills in `state` with data for the current property.
// return value will be JS_EXCEPTION if an exception was thrown, or JS_UNDEFINED otherwise.
// you must JS_DupValue `state->val` if you wanna keep it around.
JSValue QJU_ForEachProperty_Read(JSContext *ctx, JSValue obj, QJUForEachPropertyState *state);

void QJU_FreeForEachPropertyState(JSContext *ctx, QJUForEachPropertyState *state);

/* reads the contents of the file at `filename` into a buffer. */
uint8_t *QJU_ReadFile(JSContext *ctx, size_t *pbuf_len, const char *filename);

/*
prints `exception_val` to `f`. If `exception_val` is an Error,
it gets printed nicely.
*/
void QJU_PrintError(JSContext *ctx, FILE *f, JSValueConst exception_val);

/*
prints the context's current exception to `f`.
this calls JS_GetException, so the exception will be cleared.
*/
void QJU_PrintException(JSContext *ctx, FILE *f);

/*
Report an uncaught exception, either by routing it to a worker's error
pipe (if one is installed on the runtime's JSThreadState and the hook
pointer below has been registered) or by printing to stderr. Does not
consume `exception_val`. Safe to call from any exception handler — does
not rethrow.

In practice, the worker runtime sets up the hook so any code path inside
a worker that would otherwise stderr-dump (timer throws, unhandled
rejections, onmessage throws, etc.) instead delivers the exception to
the parent's `worker.onerror` handler. The main (non-worker) runtime
never sets the hook, so QJU_ReportException falls through to stderr —
byte-identical to today's QJU_PrintException-based code.
*/
void QJU_ReportException(JSContext *ctx, JSValueConst exception_val);

/*
Hook pointer set by quickjs-os at module init. When a runtime's
JSThreadState has a non-NULL error_send_pipe (i.e. we're running inside
a worker) AND this hook is set, QJU_ReportException routes the exception
through the hook instead of printing to stderr.

Rationale: quickjs-utils sits below both quickjs-eventloop and
quickjs-os in the dependency graph, so it can't call worker-side code
directly. The hook inverts the dependency.
*/
extern void (*qju_report_exception_hook)(JSContext *ctx, JSValueConst reason);

/* an unhandled promise rejection handler suitable for passing into JS_SetHostPromiseRejectionTracker */
void QJU_PrintPromiseRejection(JSContext *ctx, JSValueConst promise,
                               JSValueConst reason, JS_BOOL is_handled,
                               void *opaque);

#endif /* ifndef QUICKJS_UTILS_H */
