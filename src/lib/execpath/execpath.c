#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <string.h>
#include <errno.h>
#include <unistd.h>
#include <limits.h>
#ifdef _WIN32
#include <libloaderapi.h>
#endif
#ifdef __APPLE__
#include <mach-o/dyld.h>
#include <libgen.h>
#endif

// NOTE: return value of execpath *must* be null-terminated!
// also, it is expected that the user will free() it

#if defined(_WIN32)
char *execpath(char *argv0, char *info_message, char *error_message)
{
  char *result;
  size_t result_size;

  result_size = sizeof(char) * PATH_MAX;
  result = malloc(result_size);
  if (result == NULL) {
    sprintf(error_message, "malloc failed to allocate %zu bytes", result_size);
    return NULL;
  }

  if (GetModuleFileNameA(NULL, result, PATH_MAX)) {
    if (info_message != NULL) {
      sprintf(info_message, "found via GetModuleFileNameA");
    }
    return result;
  } else {
    if (error_message != NULL) {
      sprintf(error_message, "GetModuleFileNameA failed");
    }
    return NULL;
  }
}
#elif defined(__APPLE__)
char *execpath(char *argv0, char *info_message, char *error_message)
{
  char *result;
  size_t result_size;
  uint32_t bufsize = 0;

  _NSGetExecutablePath(NULL, &bufsize);
  result_size = sizeof(char) * bufsize;
  result = malloc(result_size);
  if (result == NULL) {
    if (error_message != NULL) {
      sprintf(error_message, "malloc failed to allocate %zu bytes", result_size);
    }
    return NULL;
  }

  _NSGetExecutablePath(result, &bufsize);
  if (result == NULL) {
    if (error_message != NULL) {
      sprintf(error_message, "_NSGetExecutablePath failed");
    }
    return NULL;
  } else {
    if (info_message != NULL) {
      sprintf(info_message, "found via _NSGetExecutablePath");
    }
  }

  return result;
}
#else
static int exists(char *path)
{
  int ret = access(path, F_OK);
  return (ret == 0);
}

static const char *PROC_PATH_LINUX = "/proc/self/exe";
static const char *PROC_PATH_FREEBSD = "/proc/curproc/file";
static const char *PROC_PATH_SOLARIS = "/proc/self/path/a.out";

static ssize_t readlink_null_terminated(const char *pathname, char *buf, size_t bufsize)
{
  ssize_t ret;
  ret = readlink(pathname, buf, bufsize);
  if (ret == -1) {
    return -1;
  }
  if (ret == bufsize) {
    buf[ret - 1] = '\0';
    return ret;
  } else {
    buf[ret] = '\0';
    return ret + 1;
  }
}

char *execpath(char *argv0, char *info_message, char *error_message)
{
  char *result;
  size_t result_size;
  int found = 0;

  result_size = sizeof(char) * PATH_MAX;
  result = malloc(result_size);
  if (result == NULL) {
    if (error_message != NULL) {
      sprintf(error_message, "malloc failed to allocate %zu bytes", result_size);
    }
    return NULL;
  }

  if (!found && exists((char *)PROC_PATH_LINUX)) {
    if (readlink_null_terminated(PROC_PATH_LINUX, result, PATH_MAX) != -1) {
      if (info_message != NULL) {
        sprintf(info_message, "found via %s", PROC_PATH_LINUX);
      }
      found = 1;
    }
  }
  if (!found && exists((char *)PROC_PATH_FREEBSD)) {
    if (readlink_null_terminated(PROC_PATH_FREEBSD, result, PATH_MAX) != -1) {
      if (info_message != NULL) {
        sprintf(info_message, "found via %s", PROC_PATH_FREEBSD);
      }
      found = 1;
    }
  }
  if (!found && exists((char *)PROC_PATH_SOLARIS)) {
    if (readlink_null_terminated(PROC_PATH_SOLARIS, result, PATH_MAX) != -1) {
      if (info_message != NULL) {
        sprintf(info_message, "found via %s", PROC_PATH_SOLARIS);
      }
      found = 1;
    }
  }
  if (!found && argv0[0] == '/') {
    strcpy(result, argv0);
    if (info_message != NULL) {
      sprintf(info_message, "found by nature of argv0 being an absolute path");
    }
    found = 1;
  }
  if (!found && strchr(argv0, '/')) {
    strcpy(result, argv0);
    if (info_message != NULL) {
      sprintf(info_message, "found by nature of argv0 being a relative path");
    }
    found = 1;
  }
  if (!found) {
    if (error_message != NULL) {
      sprintf(error_message, "search fell through to PATH env var search, which isn't yet implemented");
    }
    // TODO: search through PATH env var
    return NULL;
  }

  return result;
}
#endif
