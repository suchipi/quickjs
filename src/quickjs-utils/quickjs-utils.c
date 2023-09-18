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

int QJU_SetModuleImportMeta(JSContext *ctx, JSValueConst func_val,
                              JS_BOOL is_main)
{
    JSModuleDef *m;
    char url_buf[4096];
    JSValue meta_obj, global_obj, require;
    JSAtom module_name_atom;
    const char *module_name;

    assert(JS_VALUE_GET_TAG(func_val) == JS_TAG_MODULE);
    m = JS_VALUE_GET_PTR(func_val);

    module_name_atom = JS_GetModuleName(ctx, m);
    module_name = JS_AtomToCString(ctx, module_name_atom);
    JS_FreeAtom(ctx, module_name_atom);
    if (!module_name)
        return -1;
    if (!strchr(module_name, ':')) {
        strcpy(url_buf, "file://");
        pstrcat(url_buf, sizeof(url_buf), module_name);
    } else {
        pstrcpy(url_buf, sizeof(url_buf), module_name);
    }
    JS_FreeCString(ctx, module_name);

    global_obj = JS_GetGlobalObject(ctx);
    require = JS_GetPropertyStr(ctx, global_obj, "require");
    if (JS_IsException(require)) {
        return -1;
    }
    JS_FreeValue(ctx, global_obj);

    meta_obj = JS_GetImportMeta(ctx, m);
    if (JS_IsException(meta_obj)) {
        return -1;
    }
    JS_DefinePropertyValueStr(ctx, meta_obj, "url",
                              JS_NewString(ctx, url_buf),
                              JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, meta_obj, "main",
                              JS_NewBool(ctx, is_main),
                              JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, meta_obj, "require",
                              require, JS_PROP_C_W_E);
    JS_FreeValue(ctx, meta_obj);
    return 0;
}
