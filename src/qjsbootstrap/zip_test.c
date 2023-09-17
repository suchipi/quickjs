#include <stdio.h>
#include <sys/stat.h>
#include <string.h>
#include <errno.h>
#include "cutils.h"
#include "zip.h"

typedef enum {
  CODE_KIND_UNKNOWN,
  CODE_KIND_UTF8,
  CODE_KIND_BYTECODE,
} CODE_KIND;

typedef struct code_from_zip_result_t {
  int status;
  CODE_KIND kind;
} code_from_zip_result_t;

static code_from_zip_result_t read_code_from_zip(char *filename, size_t* appended_code_len, void **appended_code)
{
  code_from_zip_result_t ret = { 0, CODE_KIND_UNKNOWN };
  struct zip_t *zip = NULL;

  {
    int level;
    for (level = 0; level < 10; level++) {
      zip = zip_open(filename, level, 'r');
      if (zip != NULL) {
        break;
      }
    }
  }
  if (zip == NULL) {
    printf("failed to open %s as zip file\n", filename);
    ret.status = 1;
    return ret;
  }
  {
    int main_bin_result = zip_entry_open(zip, "main.bin");
    if (main_bin_result == 0) {
      ret.kind = CODE_KIND_BYTECODE;
    } else {
      int main_js_result = zip_entry_open(zip, "main.js");
      if (main_js_result == 0) {
        ret.kind = CODE_KIND_UTF8;
      } else {
        printf("failed to open %s as zip file\n", filename);
        ret.status = 1;
        zip_close(zip);
        return ret;
      }
    }

    {
      ssize_t entry_read_result = zip_entry_read(zip, appended_code, appended_code_len);
      if (entry_read_result < 0) {
        const char *entry_name;
        if (ret.kind == CODE_KIND_BYTECODE) {
          entry_name = "main.bin";
        } else {
          entry_name = "main.js";
        }
        printf("failed to read '%s' in zip '%s': %s\n", entry_name, filename, zip_strerror(entry_read_result));
        ret.status = 1;
        zip_entry_close(zip);
        zip_close(zip);
        return ret;
      }
    }
    zip_entry_close(zip);
  }
  zip_close(zip);

  return ret;
}

int main(int argc, char **argv)
{
  code_from_zip_result_t result;
  size_t appended_code_len = 0;
  void *appended_code = NULL;

  result = read_code_from_zip(argv[1], &appended_code_len, &appended_code);

  printf(
    "status: %d\nkind: %d\nlen: %zu\ncode: %s\n",
    result.status, result.kind, appended_code_len, (char *) appended_code
  );

  return result.status;
}
