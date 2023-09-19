#include "quickjs-modulesys.h"

int QJMS_SetModuleImportMeta(JSContext *ctx, JSValueConst func_val,
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

char *QJMS_NormalizeModuleName(JSContext *ctx,
                               const char *base_name,
                               const char *name, void *opaque)
{
  JSValue global, Module, resolve;
  JSValue base_name_val, name_val;
  JSValue result_val;
  const char *result;
  JSValue argv[2];
  int argc = 2;

  global = JS_GetGlobalObject(ctx);
  if (JS_IsException(global)) {
    return NULL;
  }

  Module = JS_GetPropertyStr(ctx, global, "Module");
  if (JS_IsException(Module)) {
    JS_FreeValue(ctx, global);
    return NULL;
  }

  if (!JS_IsObject(Module)) {
    JS_FreeValue(ctx, global);
    // Return the original string as-is, so that qjsc is able to access
    // builtins
    return js_strdup(ctx, name);
  }

  resolve = JS_GetPropertyStr(ctx, Module, "resolve");
  if (JS_IsException(resolve)) {
    JS_FreeValue(ctx, Module);
    JS_FreeValue(ctx, global);
    return NULL;
  }

  if (!JS_IsFunction(ctx, resolve)) {
    JS_FreeValue(ctx, resolve);
    JS_FreeValue(ctx, Module);
    JS_FreeValue(ctx, global);

    // Return the original string as-is, so that the file which defines
    // Module.resolve is able to access builtins
    return js_strdup(ctx, name);
  }

  base_name_val = JS_NewString(ctx, base_name);
  if (JS_IsException(base_name_val)) {
    JS_FreeValue(ctx, resolve);
    JS_FreeValue(ctx, Module);
    JS_FreeValue(ctx, global);
    return NULL;
  }

  name_val = JS_NewString(ctx, name);
  if (JS_IsException(name_val)) {
    JS_FreeValue(ctx, base_name_val);
    JS_FreeValue(ctx, resolve);
    JS_FreeValue(ctx, Module);
    JS_FreeValue(ctx, global);
    return NULL;
  }

  argv[0] = name_val;
  argv[1] = base_name_val;

  result_val = JS_Call(ctx, resolve, Module, argc, argv);

  JS_FreeValue(ctx, name_val);
  JS_FreeValue(ctx, base_name_val);
  JS_FreeValue(ctx, resolve);
  JS_FreeValue(ctx, Module);
  JS_FreeValue(ctx, global);

  if (JS_IsException(result_val)) {
    return NULL;
  }

  result = JS_ToCString(ctx, result_val);
  if (result == NULL) {
    JS_FreeValue(ctx, result_val);
    return NULL;
  }

  return js_strdup(ctx, result);
}

typedef JSModuleDef *(JSInitModuleFunc)(JSContext *ctx,
                                        const char *module_name);

static JSModuleDef *QJMS_ModuleLoader_so(JSContext *ctx,
                                 const char *module_name)
{
#if defined(_WIN32)
  JS_ThrowReferenceError(ctx, "shared library modules are not supported on windows");
  return NULL;
#elif defined(CONFIG_SHARED_LIBRARY_MODULES)
  JSModuleDef *m;
  void *hd;
  JSInitModuleFunc *init;
  char *filename;

  if (!strchr(module_name, '/')) {
    /* must add a '/' so that the DLL is not searched in the
       system library paths */
    filename = js_malloc(ctx, strlen(module_name) + 2 + 1);
    if (!filename) {
      return NULL;
    }
    strcpy(filename, "./");
    strcpy(filename + 2, module_name);
  } else {
    filename = (char *)module_name;
  }

  /* C module */
  hd = dlopen(filename, RTLD_NOW | RTLD_LOCAL);
  if (filename != module_name)
    js_free(ctx, filename);
  if (!hd) {
    JS_ThrowReferenceError(ctx, "could not load module filename '%s' as shared library",
                           module_name);
    goto fail;
  }

  init = dlsym(hd, "js_init_module");
  if (!init) {
    JS_ThrowReferenceError(ctx, "could not load module filename '%s': 'js_init_module' function not found",
                           module_name);
    goto fail;
  }

  m = init(ctx, module_name);
  if (!m) {
    JS_ThrowReferenceError(ctx, "could not load module filename '%s': initialization error",
                           module_name);
  fail:
    if (hd) {
      dlclose(hd);
    }
    return NULL;
  }
  return m;
#else
  JS_ThrowReferenceError(ctx, "shared library modules are not supported in this build of quickjs");
  return NULL;
#endif /* _WIN32 or CONFIG_SHARED_LIBRARY_MODULES */
}

JSModuleDef *QJMS_ModuleLoader(JSContext *ctx,
                              const char *module_name, void *opaque)
{
  // NOTE: this function supports, but does not require,
  // delegating to a JS-global Module.read function,
  // as specified by quickjs-libc.
  JSModuleDef *m;

  // TODO: delegate the decision about when to use the native module loader
  // to the JavaScript side
  if (has_suffix(module_name, ".so")) {
    m = QJMS_ModuleLoader_so(ctx, module_name);
  } else {
    JSValue global, Module, read;
    JSValue func_val;

    global = JS_GetGlobalObject(ctx);
    if (JS_IsException(global)) {
      return NULL;
    }

    Module = JS_GetPropertyStr(ctx, global, "Module");
    if (JS_IsException(Module)) {
      JS_FreeValue(ctx, global);
      return NULL;
    }

    read = JS_GetPropertyStr(ctx, Module, "read");
    if (JS_IsException(read)) {
      JS_FreeValue(ctx, Module);
      JS_FreeValue(ctx, global);
      return NULL;
    }

    if (JS_IsFunction(ctx, read)) {
      const char *buf;
      size_t buf_len;
      JSValue module_name_val;
      JSValue result;
      JSValue argv[1];
      int argc = 1;

      module_name_val = JS_NewString(ctx, module_name);
      if (JS_IsException(module_name_val)) {
        JS_FreeValue(ctx, read);
        JS_FreeValue(ctx, Module);
        JS_FreeValue(ctx, global);
        return NULL;
      }

      argv[0] = module_name_val;
      result = JS_Call(ctx, read, Module, argc, argv);
      JS_FreeValue(ctx, module_name_val);

      JS_FreeValue(ctx, read);
      JS_FreeValue(ctx, Module);
      JS_FreeValue(ctx, global);

      if (JS_IsException(result)) {
        return NULL;
      }

      if (!JS_IsString(result)) {
        JS_ThrowTypeError(ctx, "Module.read returned non-string");
        JS_FreeValue(ctx, result);
        return NULL;
      }

      buf = JS_ToCStringLen(ctx, &buf_len, result);
      if (buf == NULL) {
        JS_FreeValue(ctx, result);
        return NULL;
      }

      /* compile the module */
      func_val = JS_Eval(ctx, buf, buf_len, module_name,
                         JS_EVAL_TYPE_MODULE | JS_EVAL_FLAG_COMPILE_ONLY);

      JS_FreeCString(ctx, buf);
      JS_FreeValue(ctx, result);
    } else {
      char *buf;
      size_t buf_len;

      JS_FreeValue(ctx, read);
      JS_FreeValue(ctx, Module);
      JS_FreeValue(ctx, global);

      buf = (char *)QJU_LoadFile(ctx, &buf_len, module_name);
      if (!buf) {
          JS_ThrowReferenceError(ctx, "could not load module filename '%s'", module_name);
          return NULL;
      }

      /* compile the module */
      func_val = JS_Eval(ctx, buf, buf_len, module_name,
                         JS_EVAL_TYPE_MODULE | JS_EVAL_FLAG_COMPILE_ONLY);

      js_free(ctx, buf);
    }

    if (JS_IsException(func_val)) {
      return NULL;
    }

    /* XXX: could propagate the exception */
    QJMS_SetModuleImportMeta(ctx, func_val, FALSE);
    /* the module is already referenced, so we must free it */
    m = JS_VALUE_GET_PTR(func_val);
    JS_FreeValue(ctx, func_val);
  }
  return m;
}

int QJMS_EvalBuf(JSContext *ctx, const void *buf, int buf_len,
                 const char *filename, int eval_flags)
{
    JSValue val;
    int ret;

    if ((eval_flags & JS_EVAL_TYPE_MASK) == JS_EVAL_TYPE_MODULE) {
      /* for the modules, we compile then run to be able to set
          import.meta */
      val = JS_Eval(ctx, buf, buf_len, filename,
                    eval_flags | JS_EVAL_FLAG_COMPILE_ONLY);

      if (!JS_IsException(val)) {
        QJMS_SetModuleImportMeta(ctx, val, TRUE);
        val = JS_EvalFunction(ctx, val);
      }
    } else {
      val = JS_Eval(ctx, buf, buf_len, filename, eval_flags);
    }
    if (JS_IsException(val)) {
      QJU_PrintException(ctx, stderr);
      ret = -1;
    } else {
      ret = 0;
    }
    JS_FreeValue(ctx, val);
    return ret;
}

int QJMS_EvalFile(JSContext *ctx, const char *filename, int module)
{
    uint8_t *buf;
    int ret, eval_flags;
    size_t buf_len;

    buf = QJU_LoadFile(ctx, &buf_len, filename);
    if (!buf) {
      perror(filename);
      exit(1);
    }

    if (module < 0) {
      module = (has_suffix(filename, ".mjs") ||
                JS_DetectModule((const char *)buf, buf_len));
    }
    if (module) {
      eval_flags = JS_EVAL_TYPE_MODULE;
    } else {
      eval_flags = JS_EVAL_TYPE_GLOBAL;
    }
    ret = QJMS_EvalBuf(ctx, buf, buf_len, filename, eval_flags);
    js_free(ctx, buf);
    return ret;
}

int QJMS_EvalBinary(JSContext *ctx, const uint8_t *buf, size_t buf_len,
                    int load_only)
{
    JSValue obj, val;
    obj = JS_ReadObject(ctx, buf, buf_len, JS_READ_OBJ_BYTECODE);
    if (JS_IsException(obj)) {
      goto exception;
    }
    if (load_only) {
      if (JS_VALUE_GET_TAG(obj) == JS_TAG_MODULE) {
        QJMS_SetModuleImportMeta(ctx, obj, FALSE);
      }
    } else {
      if (JS_VALUE_GET_TAG(obj) == JS_TAG_MODULE) {
        if (JS_ResolveModule(ctx, obj) < 0) {
          JS_FreeValue(ctx, obj);
          goto exception;
        }
        QJMS_SetModuleImportMeta(ctx, obj, TRUE);
      }
      val = JS_EvalFunction(ctx, obj);
      if (JS_IsException(val)) {
exception:
        QJU_PrintException(ctx, stderr);
        return -1;
      }
      JS_FreeValue(ctx, val);
    }

    return 0;
}

/*
  This function MAY free `module_ns`.

  - If module_ns should be unwrapped into a new object, module_ns will be freed and the new object will be returned.
  - If an error occurs, module_ns will be freed and JS_EXCEPTION will be returned.
  - If module_ns can't be unwrapped into a new object, module_ns will be returned without being freed.

  Basically, you should assume this will free `module_ns` and treat its return value as a new live value.
*/
static JSValue QJMS_InteropUnwrapExports(JSContext *ctx, JSValue module_ns)
{
  JSAtom cjs_export_atom;
  int has_cjs_export;
  JSValue cjs_export_val;

  cjs_export_atom = JS_NewAtom(ctx, "__cjsExports");
  if (cjs_export_atom == JS_ATOM_NULL) {
    JS_FreeValue(ctx, module_ns);
    return JS_EXCEPTION;
  }

  has_cjs_export = JS_HasProperty(ctx, module_ns, cjs_export_atom);
  if (has_cjs_export == -1) {
    JS_FreeAtom(ctx, cjs_export_atom);
    JS_FreeValue(ctx, module_ns);
    return JS_EXCEPTION;
  } else if (has_cjs_export == FALSE) {
    JS_FreeAtom(ctx, cjs_export_atom);
    return module_ns;
  }
  // otherwise, has_cjs_export is true

  cjs_export_val = JS_GetProperty(ctx, module_ns, cjs_export_atom);
  JS_FreeAtom(ctx, cjs_export_atom);
  if (JS_IsException(cjs_export_val)) {
    JS_FreeValue(ctx, module_ns);
    return JS_EXCEPTION;
  }

  JS_FreeValue(ctx, module_ns);
  return cjs_export_val;
}

JSValue QJMS_Require(JSContext *ctx, JSValueConst specifier)
{
    JSValue module_ns;

    module_ns = JS_DynamicImportSync(ctx, specifier);

    if (JS_IsException(module_ns)) {
      return JS_EXCEPTION;
    }

    return QJMS_InteropUnwrapExports(ctx, module_ns);
}

JSValue QJMS_Require2(JSContext *ctx, JSValueConst specifier, JSValueConst basename)
{
    JSValue module_ns;

    module_ns = JS_DynamicImportSync2(ctx, specifier, basename);

    if (JS_IsException(module_ns)) {
      return JS_EXCEPTION;
    }

    return QJMS_InteropUnwrapExports(ctx, module_ns);
}

/* load and evaluate a file as a module */
static JSValue js_require(JSContext *ctx, JSValueConst this_val,
                          int argc, JSValueConst *argv)
{
  if (argc != 1 || !JS_IsString(argv[0])) {
    return JS_ThrowTypeError(ctx, "require must be called with exactly one argument: a string");
  }

  return QJMS_Require(ctx, argv[0]);
}

JSValue QJMS_RequireResolve(JSContext *ctx, JSValueConst specifier_val)
{
  JSAtom basename_atom;
  JSValue result;

  basename_atom = JS_GetScriptOrModuleName(ctx, 1);
  if (basename_atom == JS_ATOM_NULL) {
    return JS_ThrowError(ctx, "Failed to identify the filename of the code calling require.resolve");
  }

  result = QJMS_RequireResolve2(ctx, specifier_val, basename_atom);
  JS_FreeAtom(ctx, basename_atom);
  return result;
}

JSValue QJMS_RequireResolve2(JSContext *ctx, JSValueConst specifier_val, JSAtom basename_atom)
{
  JSRuntime *rt;
  JSValue normalized_value;
  void *module_loader_opaque;
  JSModuleNormalizeFunc *normalize_module_name;
  const char *basename = NULL;
  const char *specifier = NULL;
  const char *normalized = NULL;

  specifier = JS_ToCString(ctx, specifier_val);
  if (specifier == NULL) {
    return JS_EXCEPTION;
  }

  basename = JS_AtomToCString(ctx, basename_atom);
  if (basename == NULL) {
    return JS_EXCEPTION;
  }

  rt = JS_GetRuntime(ctx);

  module_loader_opaque = JS_GetModuleLoaderOpaque(rt);
  normalize_module_name = JS_GetModuleNormalizeFunc(rt);
  if (normalize_module_name == NULL) {
    normalize_module_name = QJMS_NormalizeModuleName;
  }

  normalized = normalize_module_name(ctx, basename, specifier, module_loader_opaque);
  if (normalized == NULL) {
    JS_FreeCString(ctx, basename);
    JS_FreeCString(ctx, specifier);

    return JS_ThrowError(ctx, "Failed to normalize module name");
  }

  normalized_value = JS_NewString(ctx, normalized);
  // normalized_value could be exception here, but the handling for exception
  // case and non-exception case is the same (free stuff and return
  // normalized_value), so we don't have handling using JS_IsException

  JS_FreeCString(ctx, basename);
  JS_FreeCString(ctx, specifier);
  return normalized_value;
}

/* resolve the path to a module, using the current caller as the basename */
static JSValue js_require_resolve(JSContext *ctx, JSValueConst this_val,
                                  int argc, JSValueConst *argv)
{
  JSValue name_val;

  if (argc != 1) {
    return JS_ThrowTypeError(ctx, "require.resolve must be called with exactly one argument");
  }

  name_val = JS_ToString(ctx, argv[0]);
  if (JS_IsException(name_val)) {
    return JS_EXCEPTION;
  }

  return QJMS_RequireResolve(ctx, name_val);
}

/* Symbol.hasInstance property of Module */
static JSValue js_Module_hasInstance(JSContext *ctx, JSValueConst this_val,
                                     int argc, JSValueConst *argv)
{
  JSValue target;
  JSClassID class_id;

  if (argc < 1) {
    return JS_FALSE;
  }

  target = argv[0];

  class_id = JS_VALUE_GET_CLASS_ID(target);
  if (class_id == JS_CLASS_MODULE_NS) {
    return JS_TRUE;
  } else {
    return JS_FALSE;
  }
}

/* for modules created via Module.define */
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
static JSValue js_Module_define(JSContext *ctx, JSValueConst this_val,
                                int argc, JSValueConst *argv)
{
  JSValueConst obj;
  const char *name = NULL;
  JSModuleDef *m = NULL;
  QJUForEachPropertyState *foreach = NULL;
  JSValue ret = JS_UNDEFINED;

  if (argc < 2) {
    JS_ThrowError(ctx, "Module.define requires two arguments: a string (module name) and an object (module exports).");
    ret = JS_EXCEPTION;
    goto end;
  }

  name = JS_ToCString(ctx, argv[0]);
  if (name == NULL) {
    ret = JS_EXCEPTION;
    goto end;
  }

  if (!JS_IsObject(argv[1])) {
    JS_ThrowError(ctx, "Second argument to Module.define must be an object.");
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

static JSValue QJMS_MakeRequireFunction(JSContext *ctx)
{
  JSValue require, require_resolve;

  require = JS_NewCFunction(ctx, js_require, "require", 1);
  require_resolve = JS_NewCFunction(ctx, js_require_resolve, "require.resolve", 1);
  JS_SetPropertyStr(ctx, require, "resolve", require_resolve);

  return require;
}

void QJMS_AddRequireGlobal(JSContext *ctx)
{
  JSValue global_obj, require;

  global_obj = JS_GetGlobalObject(ctx);
  require = QJMS_MakeRequireFunction(ctx);

  JS_SetPropertyStr(ctx, global_obj, "require", require);

  JS_FreeValue(ctx, global_obj);
}

/* create the 'Module' object, which gets exposed as a global */
static JSValue QJMS_MakeModuleObject(JSContext *ctx)
{
  JSValue global_obj, module, Symbol, hasInstance, search_extensions,
    compilers;

  global_obj = JS_GetGlobalObject(ctx);

  module = JS_NewObject(ctx);

  Symbol = JS_GetPropertyStr(ctx, global_obj, "Symbol");
  JS_FreeValue(ctx, global_obj);

  hasInstance = JS_GetPropertyStr(ctx, Symbol, "hasInstance");

  JS_SetPropertyValue(ctx, module, hasInstance,
                      JS_NewCFunction(ctx, js_Module_hasInstance,
                                      "hasInstance", 1), 0);

  JS_FreeValue(ctx, hasInstance);
  JS_FreeValue(ctx, Symbol);

  search_extensions = JS_NewArray(ctx);
  JS_DefinePropertyValueUint32(ctx, search_extensions, 0,
                               JS_NewString(ctx, ".js"), JS_PROP_C_W_E);

  JS_SetPropertyStr(ctx, module, "searchExtensions", search_extensions);

  compilers = JS_NewObject(ctx);
  JS_SetPropertyStr(ctx, module, "compilers", compilers);

  JS_SetPropertyStr(ctx, module, "define",
                    JS_NewCFunction(ctx, js_Module_define, "define", 2));

  return module;
}

void QJMS_AddModuleGlobal(JSContext *ctx)
{
  JSValue global_obj, module;

  global_obj = JS_GetGlobalObject(ctx);
  module = QJMS_MakeModuleObject(ctx);

  JS_SetPropertyStr(ctx, global_obj, "Module", module);

  JS_FreeValue(ctx, global_obj);
}

void QJMS_AddGlobals(JSContext *ctx)
{
  QJMS_AddRequireGlobal(ctx);
  QJMS_AddModuleGlobal(ctx);
}
