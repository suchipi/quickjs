#include <stdio.h>
#include <sys/stat.h>
#include <string.h>
#include <errno.h>
#include "cutils.h"
#include <zip.h>

typedef enum {
  CODE_KIND_UNKNOWN,
  CODE_KIND_UTF8,
  CODE_KIND_BYTECODE,
} CODE_KIND;

typedef struct read_result_t {
  int status;
  CODE_KIND kind;
} read_result_t;

static read_result_t read_code_from_zip(char *filename, size_t* appended_code_len, void **appended_code)
{
  read_result_t ret = { 0, CODE_KIND_UNKNOWN };
  zip_t *archive = NULL;
  int err = 0;

  archive = zip_open(filename, ZIP_RDONLY, &err);
  if (err) {
    printf("failed to open %s as zip file (error %d): %s\n", filename, err, zip_strerror(archive));
    ret.status = 1;
    return ret;
  }

  zip_discard(archive);

  return ret;
}

int main(int argc, char **argv)
{
  read_result_t result;
  size_t appended_code_len = 0;
  void *appended_code = NULL;

  result = read_code_from_zip(argv[1], &appended_code_len, &appended_code);

  printf(
    "status: %d\nkind: %d\nlen: %zu\ncode: %s\n",
    result.status, result.kind, appended_code_len, (char *) appended_code
  );

  return result.status;
}
