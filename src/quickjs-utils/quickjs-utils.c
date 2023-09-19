#include "quickjs-utils.h"

// NOTE: quickjs-utils is not allowed to use stuff from
// quickjs-modulesys, as that would create a dependency cycle.

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

uint8_t *QJU_LoadFile(JSContext *ctx, size_t *pbuf_len, const char *filename)
{
    FILE *f;
    uint8_t *buf;
    size_t buf_len;
    long lret;

    f = fopen(filename, "rb");
    if (!f)
        return NULL;
    if (fseek(f, 0, SEEK_END) < 0)
        goto fail;
    lret = ftell(f);
    if (lret < 0)
        goto fail;
    /* XXX: on Linux, ftell() return LONG_MAX for directories */
    if (lret == LONG_MAX) {
        errno = EISDIR;
        goto fail;
    }
    buf_len = lret;
    if (fseek(f, 0, SEEK_SET) < 0)
        goto fail;
    if (ctx)
        buf = js_malloc(ctx, buf_len + 1);
    else
        buf = malloc(buf_len + 1);
    if (!buf)
        goto fail;
    if (fread(buf, 1, buf_len, f) != buf_len) {
        errno = EIO;
        if (ctx)
            js_free(ctx, buf);
        else
            free(buf);
    fail:
        fclose(f);
        return NULL;
    }
    buf[buf_len] = '\0';
    fclose(f);
    *pbuf_len = buf_len;
    return buf;
}

static void qju_ToStringValueAndPrint(JSContext *ctx, FILE *f, JSValueConst val)
{
    const char *str;

    str = JS_ToCString(ctx, val);
    if (str) {
        fprintf(f, "%s\n", str);
        JS_FreeCString(ctx, str);
    } else {
        fprintf(f, "[exception]\n");
    }
}

void QJU_PrintError(JSContext *ctx, FILE *f, JSValueConst exception_val)
{
    JSValue val;
    BOOL is_error;

    is_error = JS_IsError(ctx, exception_val);
    qju_ToStringValueAndPrint(ctx, f, exception_val);
    if (is_error) {
        val = JS_GetPropertyStr(ctx, exception_val, "stack");
        if (!JS_IsUndefined(val)) {
            qju_ToStringValueAndPrint(ctx, f, val);
        }
        JS_FreeValue(ctx, val);
    }
}

void QJU_PrintException(JSContext *ctx, FILE *f)
{
    JSValue exception_val;

    exception_val = JS_GetException(ctx);
    QJU_PrintError(ctx, f, exception_val);
    JS_FreeValue(ctx, exception_val);
}
