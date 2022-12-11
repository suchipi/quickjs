/*
 * QuickJS bootstrap
 *
 * Built by Lily Skye, using some code generated by qjsc.
 *
 * Copyright (c) 2022-2022 Lily Skye
 * Copyright (c) 2017-2021 Fabrice Bellard
 * Copyright (c) 2017-2021 Charlie Gordon
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
#include <stdio.h>
#include <sys/stat.h>
#include <string.h>
#include <errno.h>
#include "execpath.h"
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

const uint64_t bootstrap_bin_size = BOOTSTRAP_BIN_SIZE;

#ifndef off_t
#define off_t long long
#endif

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

static int eval_buf(JSContext *ctx, const void *buf, int buf_len,
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
        js_module_set_import_meta(ctx, val, TRUE, TRUE);
        val = JS_EvalFunction(ctx, val);
    }
  } else {
    val = JS_Eval(ctx, buf, buf_len, filename, eval_flags);
  }

  if (JS_IsException(val)) {
    js_std_dump_error(ctx);
    ret = 1;
  } else {
    ret = 0;
  }

  JS_FreeValue(ctx, val);
  return ret;
}

int main(int argc, char **argv)
{
  JSRuntime *rt;
  JSContext *ctx;
  char *self_binary_path;
  off_t base_len;
  off_t file_len;
  off_t appended_code_len;
  char *appended_code;
  char execpath_error[2048];

  errno = 0;
  self_binary_path = execpath(argv[0], NULL, (char *)&execpath_error);
  if (self_binary_path == NULL) {
    printf("failed to find location of self executable: %s\n", execpath_error);
    return 1;
  }

  base_len = bootstrap_bin_size;
  file_len = get_file_size(self_binary_path);

  if (file_len == 0) {
    printf("failed to get binary size: %s\n", strerror(errno));
    return 1;
  }

  appended_code_len = file_len - base_len;

  if (appended_code_len == 0) {
    printf("append UTF-8 encoded JavaScript to the end of this binary to change this binary into a program that executes that JavaScript code\n");
    return 0;
  }

  appended_code = read_section(self_binary_path, base_len, appended_code_len);
  if (appended_code == NULL) {
    printf("failed to read appended code: %s\n", strerror(errno));
    return 1;
  }
  free(self_binary_path);

  rt = JS_NewRuntime();
  js_std_set_worker_new_context_func(JS_NewCustomContext);
  js_std_init_handlers(rt);
  JS_SetMaxStackSize(rt, 8000000);
  JS_SetModuleLoaderFunc(rt, js_module_normalize_name, js_module_loader, NULL);
  ctx = JS_NewCustomContext(rt);
  js_std_add_helpers(ctx, argc, argv);

  if (eval_buf(ctx, appended_code, appended_code_len, argv[0], JS_EVAL_TYPE_MODULE)) {
    return 1;
  }

  js_std_loop(ctx);
  JS_FreeContext(ctx);
  JS_FreeRuntime(rt);
  return 0;
}
