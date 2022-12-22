#ifndef QUICKJS_UTILS_H
#define QUICKJS_UTILS_H

#include "quickjs.h"

typedef struct JSForEachPropertyState
{
  uint32_t len;
  uint32_t i;
  JSPropertyEnum *tab;
  JSAtom key;
  const char *key_str;
  JSValue val;
} JSForEachPropertyState;

/* free using JS_FreeForEachPropertyState */
JSForEachPropertyState *JS_NewForEachPropertyState(JSContext *ctx, JSValue obj, int flags)
{
  JSForEachPropertyState *data;

  data = (JSForEachPropertyState *)js_mallocz(ctx, sizeof(*data));
  if (data == NULL) {
    return NULL;
  }

  if (JS_GetOwnPropertyNames(ctx, &data->tab, &data->len, obj, flags) < 0) {
    js_free(ctx, data);
    return NULL;
  }

  return data;
}

// put a block after this invocation; it will be run once per property
#define JS_ForEachProperty(ctx, state) \
  for (state->i = 0; state->i < state->len; state->i++)

// fills in `state` with data for the current property.
// return value will be JS_EXCEPTION if an exception was thrown, or JS_UNDEFINED otherwise.
// you must JS_DupValue `state->val` if you wanna keep it around.
JSValue JS_ForEachProperty_Read(JSContext *ctx, JSValue obj, JSForEachPropertyState *state, JS_BOOL stringify_keys)
{
  // Free key_str from previous iteration, if present
  if (state->key_str != NULL) {
    JS_FreeCString(ctx, state->key_str);
  }

  state->key = JS_ATOM_NULL;
  state->val = JS_NULL;

  state->key = state->tab[state->i].atom;
  state->val = JS_GetPropertyInternal(ctx, obj, state->key, obj, 1);
  if (JS_IsException(state->val)) {
    return JS_EXCEPTION;
  }

  // GetPropertyInternal dups this, but we don't want to increase the refcount,
  // so we call free to bring it back down to what it was. If you want to keep
  // this value, dup it yourself.
  JS_FreeValue(ctx, state->val);

  if (stringify_keys) {
    state->key_str = JS_AtomToCString(ctx, state->key);
    if (state->key_str == NULL) {
        return JS_EXCEPTION;
    }
  }

  return JS_UNDEFINED;
}

void JS_FreeForEachPropertyState(JSContext *ctx, JSForEachPropertyState *state)
{
  int i;
  int len;

  if (state == NULL) {
    return;
  }

  if (state->key_str != NULL) {
    JS_FreeCString(ctx, state->key_str);
  }

  if (state->key != JS_ATOM_NULL) {
    JS_FreeAtom(ctx, state->key);
  }

  if (state->tab != NULL) {
    len = state->len;
    for (i = 0; i < len; i++)
    {
      JS_FreeAtom(ctx, state->tab[i].atom);
    };
    js_free(ctx, state->tab);
  }

  js_free(ctx, state);
}

#endif /* ifndef QUICKJS_UTILS_H */
