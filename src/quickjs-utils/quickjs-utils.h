#ifndef QUICKJS_UTILS_H
#define QUICKJS_UTILS_H

#include "quickjs.h"
#include "debugprint.h"

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

#define QJU_AssertArgLength(function_name, expected_arg_length) \
  if (argc != expected_arg_length) { \
    return JS_ThrowTypeError(ctx, "expected %d argument(s) to %s, but received %d", expected_arg_length, function_name, argc); \
  }

#endif /* ifndef QUICKJS_UTILS_H */
