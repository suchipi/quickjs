#include <string.h>
#include <errno.h>

#include "quickjs-libc.h"
#include "quickjs-libbytecode.h"
#include "quickjs-utils.h"
#include "quickjs-modulesys.h"
#include "cutils.h"

static JSValue js_module_isMainModule(JSContext *ctx, JSValueConst this_val,
                                      int argc, JSValueConst *argv)
{
  const char *module_name;
  int result;

  if (argc < 1) {
    return JS_ThrowTypeError(ctx, "std.isMainModule requires one argument: the resolved module name to check");
  }

  module_name = JS_ToCString(ctx, argv[0]);
  if (module_name == NULL) {
    return JS_EXCEPTION;
  }

  result = QJMS_IsMainModule(JS_GetRuntime(ctx), module_name);
  return JS_NewBool(ctx, result);
}

static JSValue js_module_setMainModule(JSContext *ctx, JSValueConst this_val,
                                       int argc, JSValueConst *argv)
{
  const char *module_name;

  if (argc < 1) {
    return JS_ThrowTypeError(ctx, "std.setMainModule requires one argument: the resolved module name to set");
  }

  module_name = JS_ToCString(ctx, argv[0]);
  if (module_name == NULL) {
    return JS_EXCEPTION;
  }

  QJMS_SetMainModule(JS_GetRuntime(ctx), module_name);

  return JS_UNDEFINED;
}

/* load and evaluate a file as a script */
static JSValue js_module_runScript(JSContext *ctx, JSValueConst this_val,
                                   int argc, JSValueConst *argv)
{
  uint8_t *buf;
  const char *filename;
  JSValue ret;
  size_t buf_len;

  filename = JS_ToCString(ctx, argv[0]);
  if (!filename) {
    return JS_EXCEPTION;
  }
  buf = QJU_ReadFile(ctx, &buf_len, filename);
  if (!buf) {
    JS_ThrowReferenceError(ctx, "could not load '%s'", filename);
    JS_FreeCString(ctx, filename);
    return JS_EXCEPTION;
  }
  ret = JS_Eval(ctx, (char *)buf, buf_len, filename,
                JS_EVAL_TYPE_GLOBAL);
  js_free(ctx, buf);
  JS_FreeCString(ctx, filename);
  return ret;
}

/* load and evaluate a file as a module */
static JSValue js_module_importModule(JSContext *ctx, JSValueConst this_val,
                                      int argc, JSValueConst *argv)
{
  if (argc == 1) {
    return JS_DynamicImportSync(ctx, argv[0]);
  } else if (argc == 2 && !JS_IsUndefined(argv[1])) {
    return JS_DynamicImportSync2(ctx, argv[0], argv[1]);
  } else {
    return JS_ThrowTypeError(ctx, "importModule must be called with one or two arguments");
  }
}

/* return the name of the calling script or module */
static JSValue js_module_getFileNameFromStack(JSContext *ctx, JSValueConst this_val,
                                              int argc, JSValueConst *argv)
{
  int stack_levels = 0;
  JSAtom filename;

  if (argc == 1) {
    if (JS_ToInt32(ctx, &stack_levels, argv[0])) {
      return JS_EXCEPTION;
    }
  }

  filename = JS_GetScriptOrModuleName(ctx, stack_levels + 1);
  if (filename == JS_ATOM_NULL) {
    return JS_ThrowError(ctx, "Cannot determine the caller filename for the given stack level. Maybe you're using eval?");
  } else {
    return JS_AtomToString(ctx, filename);
  }
}

/* resolve the absolute path to a module */
static JSValue js_module_resolveModule(JSContext *ctx, JSValueConst this_val,
                                       int argc, JSValueConst *argv)
{
  if (argc == 1) {
    JSValue specifier = argv[0];
    return QJMS_RequireResolve(ctx, specifier);
  } else if (argc == 2 && !JS_IsUndefined(argv[1])) {
    JSValue result;
    JSValue specifier = argv[0];
    JSValue basename_val = argv[1];

    JSAtom basename_atom = JS_ValueToAtom(ctx, basename_val);
    if (basename_atom == JS_ATOM_NULL) {
      return JS_EXCEPTION;
    }

    result = QJMS_RequireResolve2(ctx, specifier, basename_atom);
    JS_FreeAtom(ctx, basename_atom);
    return result;
  } else {
    return JS_ThrowTypeError(ctx, "resolveModule must be called with one or two arguments");
  }
}

static JSValue js_module_evalScript(JSContext *ctx, JSValueConst this_val,
                                    int argc, JSValueConst *argv)
{
  const char *code;
  const char *filename = "<evalScript>";
  BOOL filename_needs_to_be_freed = FALSE;
  size_t len;
  JSValue ret;
  JSValueConst options_obj, filename_val, backtrace_barrier_val;
  BOOL backtrace_barrier = FALSE;
  int flags;

  if (argc >= 2) {
    options_obj = argv[1];
    if (!JS_IsObject(options_obj)) {
      return JS_ThrowTypeError(ctx, "'options' argument must be an object");
    }

    backtrace_barrier_val = JS_GetPropertyStr(ctx, options_obj, "backtraceBarrier");
    if (!JS_IsBool(backtrace_barrier_val) && !JS_IsUndefined(backtrace_barrier_val)) {
      return JS_ThrowTypeError(ctx, "'backtraceBarrier' option must be a boolean");
    }
    backtrace_barrier = JS_ToBool(ctx, backtrace_barrier_val);
    if (backtrace_barrier == -1) {
      return JS_EXCEPTION;
    }

    filename_val = JS_GetPropertyStr(ctx, options_obj, "filename");
    if (JS_IsException(filename_val)) {
      return JS_EXCEPTION;
    }

    if (JS_IsString(filename_val)) {
      filename = JS_ToCString(ctx, filename_val);
      if (!filename) {
        return JS_EXCEPTION;
      }
      filename_needs_to_be_freed = TRUE;
    }
  }

  code = JS_ToCStringLen(ctx, &len, argv[0]);
  if (!code) {
    if (filename_needs_to_be_freed) {
      JS_FreeCString(ctx, filename);
    }
    return JS_EXCEPTION;
  }

  js_std_interrupt_handler_start(ctx);

  flags = JS_EVAL_TYPE_GLOBAL;
  if (backtrace_barrier) {
    flags |= JS_EVAL_FLAG_BACKTRACE_BARRIER;
  }

  ret = JS_Eval(ctx, code, len, filename, flags);
  JS_FreeCString(ctx, code);

  if (filename_needs_to_be_freed) {
    JS_FreeCString(ctx, filename);
  }

  js_std_interrupt_handler_finish(ctx, ret);
  return ret;
}

static const JSCFunctionListEntry js_bytecode_funcs[] = {
  JS_CFUNC_DEF("isMainModule", 1, js_module_isMainModule ),
  JS_CFUNC_DEF("setMainModule", 1, js_module_setMainModule ),
  JS_CFUNC_DEF("runScript", 1, js_module_runScript ),
  JS_CFUNC_DEF("importModule", 2, js_module_importModule ),
  JS_CFUNC_DEF("getFileNameFromStack", 1, js_module_getFileNameFromStack ),
  JS_CFUNC_DEF("resolveModule", 2, js_module_resolveModule ),
  JS_CFUNC_DEF("evalScript", 2, js_module_evalScript ),
};

static int js_module_init(JSContext *ctx, JSModuleDef *m)
{
  return JS_SetModuleExportList(ctx, m, js_bytecode_funcs,
                                countof(js_bytecode_funcs));
}

JSModuleDef *js_init_module_module(JSContext *ctx, const char *module_name)
{
  JSModuleDef *m;
  m = JS_NewCModule(ctx, module_name, js_module_init, NULL);
  if (!m) {
    return NULL;
  }
  JS_AddModuleExportList(ctx, m, js_bytecode_funcs, countof(js_bytecode_funcs));
  return m;
}
