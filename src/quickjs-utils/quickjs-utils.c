#include "quickjs-utils.h"

QJUForEachPropertyState *QJU_NewForEachPropertyState(JSContext *ctx, JSValue obj, int flags)
{
  QJUForEachPropertyState *state;

  state = (QJUForEachPropertyState *)js_mallocz(ctx, sizeof(*state));
  if (state == NULL) {
    return NULL;
  }

  if (JS_GetOwnPropertyNames(ctx, &state->tab, &state->len, obj, flags) < 0) {
    js_free(ctx, state);
    return NULL;
  }

  state->key = JS_ATOM_NULL;
  state->val = JS_NULL;

  return state;
}

#define QJU_ForEachProperty(ctx, state) \
  for (state->i = 0; state->i < state->len; state->i++)

JSValue QJU_ForEachProperty_Read(JSContext *ctx, JSValue obj, QJUForEachPropertyState *state)
{
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
  return JS_UNDEFINED;
}

void QJU_FreeForEachPropertyState(JSContext *ctx, QJUForEachPropertyState *state)
{
  if (state == NULL) {
    return;
  }

  if (state->key != JS_ATOM_NULL) {
    JS_FreeAtom(ctx, state->key);
  }

  if (state->tab != NULL) {
    int i;
    int len = state->len;
    for (i = 0; i < len; i++) {
      JS_FreeAtom(ctx, state->tab[i].atom);
    };
    js_free(ctx, state->tab);
  }

  js_free(ctx, state);
}
