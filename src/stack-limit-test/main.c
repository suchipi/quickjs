#include <stdio.h>
#include <string.h>
#include "quickjs-libc.h"

extern const uint32_t qjsc_loop_size;
extern const uint8_t qjsc_loop[];

static JSContext *JS_NewCustomContext(JSRuntime *rt)
{
  JSContext *ctx = JS_NewContextRaw(rt);
  if (!ctx)
    return NULL;
  JS_AddIntrinsicBaseObjects(ctx);
  JS_AddIntrinsicDate(ctx);
  JS_AddIntrinsicEval(ctx);
  JS_AddIntrinsicStringNormalize(ctx);
  JS_AddIntrinsicRegExp(ctx);
  JS_AddIntrinsicJSON(ctx);
  JS_AddIntrinsicProxy(ctx);
  JS_AddIntrinsicMapSet(ctx);
  JS_AddIntrinsicTypedArrays(ctx);
  JS_AddIntrinsicPromise(ctx);
  JS_AddIntrinsicBigInt(ctx);
  js_init_module_os(ctx, "os");
  js_init_module_std(ctx, "std");

  return ctx;
}

int main(int argc, char **argv)
{
  JSRuntime *rt;
  JSContext *ctx;

  if (argc != 3) {
    printf("You must provide two positional arguments: the max stack size (or NONE to skip calling JS_SetMaxStackSize), and the memory limit (or NONE to skip calling JS_SetMemoryLimit).\n");
    return 1;
  }

  rt = JS_NewRuntime();
  js_std_set_worker_new_context_func(JS_NewCustomContext);
  js_std_init_handlers(rt);

  if (!strcmp(argv[1], "NONE")) {
    printf("skipping JS_SetMaxStackSize call\n");
  } else {
    double max_stack_size = strtod(argv[1], NULL);

    printf("max_stack_size: (double)%f, (size_t)%zu\n", max_stack_size, (size_t)max_stack_size);

    JS_SetMaxStackSize(rt, max_stack_size);
  }

  if (!strcmp(argv[2], "NONE")) {
    printf("skipping JS_SetMemoryLimit call\n");
  } else {
    double memory_limit = strtod(argv[1], NULL);

    printf("memory_limit: (double)%f, (size_t)%zu\n", memory_limit, (size_t)memory_limit);

    JS_SetMemoryLimit(rt, memory_limit);
  }

  JS_SetModuleLoaderFunc(rt, js_module_normalize_name, js_module_loader, NULL);
  ctx = JS_NewCustomContext(rt);
  js_std_add_helpers(ctx, argc, argv);
  js_std_eval_binary(ctx, qjsc_loop, qjsc_loop_size, 0);
  js_std_loop(ctx);
  JS_FreeContext(ctx);
  JS_FreeRuntime(rt);
  return 0;
}
