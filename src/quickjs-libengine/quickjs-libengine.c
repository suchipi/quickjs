#include <string.h>
#include <errno.h>

#include "quickjs-libc.h"
#include "quickjs-libbytecode.h"
#include "quickjs-utils.h"
#include "quickjs-modulesys.h"
#include "cutils.h"

static JSValue js_engine_isMainModule(JSContext *ctx, JSValueConst this_val,
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

static JSValue js_engine_setMainModule(JSContext *ctx, JSValueConst this_val,
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
static JSValue js_engine_runScript(JSContext *ctx, JSValueConst this_val,
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
static JSValue js_engine_importModule(JSContext *ctx, JSValueConst this_val,
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
static JSValue js_engine_getFileNameFromStack(JSContext *ctx, JSValueConst this_val,
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
static JSValue js_engine_resolveModule(JSContext *ctx, JSValueConst this_val,
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

static JSValue js_engine_evalScript(JSContext *ctx, JSValueConst this_val,
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

static JSValue js_engine_isModuleNamespace(JSContext *ctx, JSValueConst this_val,
                                           int argc, JSValueConst *argv)
{
  JSValue target;
  JSClassID class_id;

  if (argc < 1) {
    return JS_FALSE;
  }

  target = argv[0];

  if (!JS_IsObject(target)) {
    return JS_FALSE;
  }

  class_id = JS_VALUE_GET_CLASS_ID(target);
  if (class_id == JS_CLASS_MODULE_NS) {
    return JS_TRUE;
  } else {
    return JS_FALSE;
  }
}

/* for modules created via defineBuiltinModule */
static int js_userdefined_module_init(JSContext *ctx, JSModuleDef *m)
{
  JSValueConst *objp;
  JSValueConst obj;
  QJUForEachPropertyState *foreach = NULL;
  int ret = 0;

  objp = (JSValue *)JS_GetModuleUserData(m);
  if (objp == NULL) {
    JS_ThrowTypeError(ctx, "user-defined module did not have exports object as userdata");
    ret = -1;
    goto end;
  }

  obj = *objp;

  foreach = QJU_NewForEachPropertyState(ctx, obj, JS_GPN_STRING_MASK | JS_GPN_ENUM_ONLY);
  if (foreach == NULL) { // out of memory
    ret = -1;
    goto end;
  }

  QJU_ForEachProperty(ctx, foreach) {
    const char *key_str;
    JSValue read_result = QJU_ForEachProperty_Read(ctx, obj, foreach);
    if (JS_IsException(read_result)) {
      ret = -1;
      goto end;
    }
    key_str = JS_AtomToCString(ctx, foreach->key);
    if (key_str == NULL) {
      ret = -1;
      goto end;
    }

    JS_SetModuleExport(ctx, m, key_str, JS_DupValue(ctx, foreach->val));
  }

end:
  QJU_FreeForEachPropertyState(ctx, foreach);
  JS_SetModuleUserData(m, NULL);

  return ret;
}

/* add a user-defined module into the module cache */
static JSValue js_engine_defineBuiltinModule(JSContext *ctx, JSValueConst this_val,
                                       int argc, JSValueConst *argv)
{
  JSValueConst obj;
  const char *name = NULL;
  JSModuleDef *m = NULL;
  QJUForEachPropertyState *foreach = NULL;
  JSValue ret = JS_UNDEFINED;

  if (argc < 2) {
    JS_ThrowError(ctx, "defineBuiltinModule requires two arguments: a string (module name) and an object (module exports).");
    ret = JS_EXCEPTION;
    goto end;
  }

  name = JS_ToCString(ctx, argv[0]);
  if (name == NULL) {
    ret = JS_EXCEPTION;
    goto end;
  }

  if (!JS_IsObject(argv[1])) {
    JS_ThrowError(ctx, "Second argument to defineBuiltinModule must be an object.");
    ret = JS_EXCEPTION;
    goto end;
  }

  obj = argv[1];

  m = JS_NewCModule(ctx, name, js_userdefined_module_init, &obj);
  if (m == NULL) {
    ret = JS_EXCEPTION;
    goto end;
  }

  foreach = QJU_NewForEachPropertyState(ctx, obj, JS_GPN_STRING_MASK | JS_GPN_ENUM_ONLY);
  if (foreach == NULL) {
    ret = JS_EXCEPTION;
    goto end;
  }

  QJU_ForEachProperty(ctx, foreach) {
    const char *key_str;

    JSValue read_result = QJU_ForEachProperty_Read(ctx, obj, foreach);
    if (JS_IsException(read_result)) {
      ret = JS_EXCEPTION;
      goto end;
    }

    key_str = JS_AtomToCString(ctx, foreach->key);
    if (key_str == NULL) {
      ret = JS_EXCEPTION;
      goto end;
    }

    JS_AddModuleExport(ctx, m, key_str);
  }

  // force module instantiation to happen now while &obj is still a valid
  // pointer. js_userdefined_module_init will set m->user_data to NULL.
  m = JS_RunModule(ctx, "", name);
  if (m == NULL) {
    ret = JS_EXCEPTION;
    goto end;
  } else {
    ret = JS_UNDEFINED;
  }

end:
  JS_FreeCString(ctx, name);
  QJU_FreeForEachPropertyState(ctx, foreach);

  return ret;
}

static const JSCFunctionListEntry js_bytecode_funcs[] = {
  JS_CFUNC_DEF("isMainModule", 1, js_engine_isMainModule ),
  JS_CFUNC_DEF("setMainModule", 1, js_engine_setMainModule ),
  JS_CFUNC_DEF("runScript", 1, js_engine_runScript ),
  JS_CFUNC_DEF("importModule", 2, js_engine_importModule ),
  JS_CFUNC_DEF("getFileNameFromStack", 1, js_engine_getFileNameFromStack ),
  JS_CFUNC_DEF("resolveModule", 2, js_engine_resolveModule ),
  JS_CFUNC_DEF("evalScript", 2, js_engine_evalScript ),
  JS_CFUNC_DEF("isModuleNamespace", 1, js_engine_isModuleNamespace ),
  JS_CFUNC_DEF("defineBuiltinModule", 2, js_engine_defineBuiltinModule ),
};

static int js_module_init(JSContext *ctx, JSModuleDef *m)
{
  JSValue module_loader_internals, module_delegate;

  if (JS_SetModuleExportList(ctx, m, js_bytecode_funcs,
                             countof(js_bytecode_funcs)))
  {
    return -1;
  }

  module_loader_internals = QJMS_GetModuleLoaderInternals(ctx);
  if (JS_IsNull(module_loader_internals)) {
    return -1;
  }
  module_delegate = JS_GetPropertyStr(ctx, module_loader_internals, "ModuleDelegate");
  if (JS_IsException(module_delegate)) {
    return -1;
  }
  JS_FreeValue(ctx, module_loader_internals);

  JS_SetModuleExport(ctx, m, "ModuleDelegate", module_delegate);

  return 0;
}

JSModuleDef *js_init_module_engine(JSContext *ctx, const char *module_name)
{
  JSModuleDef *m;
  m = JS_NewCModule(ctx, module_name, js_module_init, NULL);
  if (!m) {
    return NULL;
  }
  JS_AddModuleExportList(ctx, m, js_bytecode_funcs, countof(js_bytecode_funcs));
  JS_AddModuleExport(ctx, m, "ModuleDelegate");
  return m;
}
