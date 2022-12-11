#include <errno.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "execpath.h"

int main(int argc, char *argv[])
{
  char *program_path;

  for (int i = 0; i < argc; i++) {
    printf("%d: \"%s\"\n", i, argv[i]);
  }

  program_path = execpath(argv[0]);
  if (program_path == NULL) {
    printf("execpath failed: %s\n", strerror(errno));
  } else {
    printf("execpath result: %s\n", program_path);
    free(program_path);
  }

  return 0;
}
