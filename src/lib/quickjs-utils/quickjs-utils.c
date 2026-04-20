#include <stdlib.h>
#include <limits.h>
#include <errno.h>
#include <string.h>
#include "cutils.h"
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

  /* NOTE: state->key is borrowed from state->tab[state->i].atom (not duped),
     so we must NOT free it here — the tab loop below frees all tab atoms. */

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

uint8_t *QJU_ReadFile(JSContext *ctx, size_t *pbuf_len, const char *filename)
{
  FILE *f;
  uint8_t *buf;
  size_t buf_len;
  long lret;

  f = fopen(filename, "rb");
  if (!f) {
    return NULL;
  }
  if (fseek(f, 0, SEEK_END) < 0) {
    goto fail;
  }
  lret = ftell(f);
  if (lret < 0) {
    goto fail;
  }
  /* XXX: on Linux, ftell() return LONG_MAX for directories */
  if (lret == LONG_MAX) {
    errno = EISDIR;
    goto fail;
  }
  buf_len = lret;
  if (fseek(f, 0, SEEK_SET) < 0) {
    goto fail;
  }
  if (ctx) {
    buf = js_malloc(ctx, buf_len + 1);
  } else {
    buf = malloc(buf_len + 1);
  }
  if (!buf) {
    goto fail;
  }
  if (fread(buf, 1, buf_len, f) != buf_len) {
    errno = EIO;
    if (ctx) {
      js_free(ctx, buf);
    } else {
      free(buf);
    }
fail:
    fclose(f);
    return NULL;
  }
  buf[buf_len] = '\0';
  fclose(f);
  *pbuf_len = buf_len;
  return buf;
}

static void QJU_ToStringValueAndPrint(JSContext *ctx, FILE *f, JSValueConst val)
{
  const char *str;

  if (JS_IsException(val)) {
    fprintf(f, "[exception]");
    return;
  }

  str = JS_ToCString(ctx, val);
  if (str) {
    fprintf(f, "%s", str);
    JS_FreeCString(ctx, str);
  } else {
    // clear ToString exception
    JS_GetException(ctx);

    if (JS_IsError(ctx, val)) {
      JSValue name_val, message_val;

      name_val = JS_GetPropertyStr(ctx, val, "name");
      QJU_ToStringValueAndPrint(ctx, f, name_val);
      JS_FreeValue(ctx, name_val);

      fprintf(f, ": ");

      message_val = JS_GetPropertyStr(ctx, val, "message");
      QJU_ToStringValueAndPrint(ctx, f, message_val);
      JS_FreeValue(ctx, message_val);
    } else {
      JSValue toString_result;
      JSValue global_obj, object_ctor, object_proto, toString_fn;

      global_obj = JS_GetGlobalObject(ctx);
      object_ctor = JS_GetPropertyStr(ctx, global_obj, "Object");
      object_proto = JS_GetPropertyStr(ctx, object_ctor, "prototype");
      toString_fn = JS_GetPropertyStr(ctx, object_proto, "toString");

      toString_result = JS_Call(ctx, toString_fn, val, 0, NULL);

      JS_FreeValue(ctx, toString_fn);
      JS_FreeValue(ctx, object_proto);
      JS_FreeValue(ctx, object_ctor);
      JS_FreeValue(ctx, global_obj);

      if (!JS_IsException(toString_result)) {
        const char *result_str = JS_ToCString(ctx, toString_result);
        if (result_str) {
          fprintf(f, "%s", result_str);
          JS_FreeCString(ctx, result_str);
        }
        JS_FreeValue(ctx, toString_result);
      } else {
        fprintf(f, "[thrown object upon which Object.prototype.toString.call(...) failed]");
      }
    }
  }
}

void QJU_PrintError(JSContext *ctx, FILE *f, JSValueConst exception_val)
{
  JSValue stack_val;

  if (JS_IsError(ctx, exception_val)) {
    QJU_ToStringValueAndPrint(ctx, f, exception_val);
    fprintf(f, "\n");

    stack_val = JS_GetPropertyStr(ctx, exception_val, "stack");
    if (!JS_IsUndefined(stack_val)) {
      QJU_ToStringValueAndPrint(ctx, f, stack_val);
      fprintf(f, "\n");
    }
    JS_FreeValue(ctx, stack_val);
  } else {
    fprintf(f, "thrown non-Error value: ");

    if (JS_IsString(exception_val)) {
      JSValue json_val = JS_JSONStringify(ctx, exception_val, JS_UNDEFINED, JS_UNDEFINED);
      const char *json_str = JS_ToCString(ctx, json_val);
      fprintf(f, "%s", json_str);
      JS_FreeCString(ctx, json_str);
      JS_FreeValue(ctx, json_val);
    } else {
      QJU_ToStringValueAndPrint(ctx, f, exception_val);
    }

    fprintf(f, "\n");
  }
}

void QJU_PrintException(JSContext *ctx, FILE *f)
{
  JSValue exception_val;

  exception_val = JS_GetException(ctx);
  QJU_PrintError(ctx, f, exception_val);
  JS_FreeValue(ctx, exception_val);
}

/* Defined here, set by quickjs-os at module init. NULL means no worker
   runtime is active on this thread — all reports fall through to stderr. */
void (*qju_report_exception_hook)(JSContext *ctx, JSValueConst reason) = NULL;

void QJU_ReportException(JSContext *ctx, JSValueConst exception_val)
{
  /* The hook itself is responsible for checking whether THIS particular
     runtime has a worker-side error pipe — quickjs-utils has no
     visibility into the thread state. If the hook routes the exception,
     it returns normally and we're done. If it doesn't (e.g. main thread
     with no pipe), it must fall through to stderr itself.

     But since the hook lives in quickjs-os and only makes sense for
     worker runtimes, we keep a simpler contract here: if the hook is
     set, call it; otherwise print to stderr. quickjs-os is responsible
     for installing the hook such that it only ships errors on worker
     runtimes, not on the main thread. (In practice, quickjs-os's hook
     impl checks `ts->error_send_pipe` and falls back to
     QJU_PrintError(stderr) when it's NULL, so the end-to-end behavior
     is what you'd expect either way.) */
  if (qju_report_exception_hook != NULL) {
    qju_report_exception_hook(ctx, exception_val);
  } else {
    QJU_PrintError(ctx, stderr, exception_val);
  }
}

void QJU_PrintPromiseRejection(JSContext *ctx, JSValueConst promise,
                               JSValueConst reason, BOOL is_handled,
                               void *opaque)
{
  if (!is_handled) {
    fprintf(stderr, "Possibly unhandled promise rejection: ");
    QJU_PrintError(ctx, stderr, reason);
  }
}
