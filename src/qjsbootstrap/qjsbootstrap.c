#include <stdio.h>
#include <sys/stat.h>
#include <string.h>
#include <errno.h>
#include "quickjs-libc.h"
#include "cutils.h"

extern const uint8_t qjsc_inspect[];
extern const uint32_t qjsc_inspect_size;

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
  {
    extern JSModuleDef *js_init_module_os(JSContext *ctx, const char *name);
    js_init_module_os(ctx, "os");
  }
  {
    extern JSModuleDef *js_init_module_std(JSContext *ctx, const char *name);
    js_init_module_std(ctx, "std");
  }
  js_std_eval_binary(ctx, qjsc_inspect, qjsc_inspect_size, 0);
  return ctx;
}

// We put the size in a struct so the compiler doesn't optimize it in such a
// way that it changes file size when BOOTSTRAP_BIN_SIZE changes size.
typedef struct SizeWrapper {
  uint8_t start_indicator[6];
  uint64_t size;
  uint8_t end_indicator[6];
} SizeWrapper;

#define BYTESEQ 0xFF, 0xFE, 0x0B, 0xA5, 0xED

const SizeWrapper size_wrapper = {
  // Start indicator
  { BYTESEQ, 0xAA },
  // base bootstrap binary size
  BOOTSTRAP_BIN_SIZE,
  // End indicator
  { BYTESEQ, 0xBB },
};

static off_t get_file_size(char *filename)
{
  struct stat st;
  int ret = 0;

  ret = stat(filename, &st);
  if (ret == -1) {
    return 0;
  } else {
    return st.st_size;
  }
}

static char *read_section(char *filename, off_t offset, off_t len)
{
  size_t bytes_read;
  char *data = NULL;
  FILE *fp = fopen(filename, "r");
  if (fp == NULL) {
    return data;
  }

  if (fseek(fp, 0, SEEK_END)) {
    fclose(fp);
    return NULL;
  }

  // +1 is for null termination
  data = malloc(sizeof(char) * (len + 1));

  if (fseek(fp, offset, SEEK_SET)) {
    fclose(fp);
    return NULL;
  }

  bytes_read = fread(data, sizeof(char), len, fp);
  data[bytes_read + 1] = '\0';

  fclose(fp);

  return data;
}

int main(int argc, char **argv)
{
  JSRuntime *rt;
  JSContext *ctx;
  JSValue result;
  off_t base_len;
  off_t file_len;
  off_t appended_code_len;
  char *appended_code;

  base_len = size_wrapper.size;
  file_len = get_file_size(argv[0]);

  if (file_len == 0) {
    printf("failed to get binary size: %s\n", strerror(errno));
    return 1;
  }

  appended_code_len = file_len - base_len;

  if (appended_code_len == 0) {
    printf("append UTF-8 encoded JavaScript to the end of this binary to change this binary into a program that executes that JavaScript code\n");
    return 0;
  }

  appended_code = read_section(argv[0], base_len, appended_code_len);
  if (appended_code == NULL) {
    printf("failed to read appended code: %s\n", strerror(errno));
    return 1;
  }

  rt = JS_NewRuntime();
  js_std_set_worker_new_context_func(JS_NewCustomContext);
  js_std_init_handlers(rt);
  JS_SetMaxStackSize(rt, 8000000);
  JS_SetModuleLoaderFunc(rt, js_module_normalize_name, js_module_loader, NULL);
  ctx = JS_NewCustomContext(rt);
  js_std_add_helpers(ctx, argc, argv);

  result = JS_Eval(ctx, appended_code, appended_code_len, argv[0], 0);
  if (JS_IsException(result)) {
    const char *err_str = JS_ToCString(ctx, JS_GetException(ctx));
    fputs(err_str, stderr);
    fputs("\n", stderr);
    js_free(ctx, err_str);
    return 1;
  }

  js_std_loop(ctx);
  JS_FreeContext(ctx);
  JS_FreeRuntime(rt);
  return 0;
}
