#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <string.h>
#include <errno.h>
#include <unistd.h>
#include <limits.h>
#if defined(_WIN32)
#include <libloaderapi.h>
#elif defined(__APPLE__)
#include <mach-o/dyld.h>
#include <libgen.h>
#elif defined(__FreeBSD__)
#include <sys/param.h>
#include <sys/queue.h>
#include <sys/socket.h>
#include <libprocstat.h>
#endif

#if defined(_WIN32)
char *get_program_path(char *argv0)
{
  char *result;

  result = malloc(sizeof(char) * PATH_MAX);
  if (result == NULL) {
    return NULL;
  }

  if (GetModuleFileNameA(NULL, result, PATH_MAX)) {
    return result;
  } else {
    return NULL;
  }
}
#elif defined(__APPLE__)
char *get_program_path(char *argv0)
{
  char *result;
  char *result_realpath;
  uint32_t bufsize = 0;

  _NSGetExecutablePath(NULL, &bufsize);
  result = malloc(sizeof(char) * bufsize);

  _NSGetExecutablePath(result, &bufsize);

  result_realpath = realpath(result, NULL);
  if (result_realpath == NULL) {
    free(result);
    return NULL;
  }

  free(result);
  return result_realpath;
}
#elif defined(__FreeBSD__)
#include <sys/sysctl.h>

char *get_program_path(char *argv0)
{
  pid_t pid;
  struct procstat *procstat;
  struct kinfo_proc *kp;
  uint procs_count;
  char *result_realpath;
  char *result = NULL;

  procstat = procstat_open_sysctl();
  pid = getpid();
  kp = procstat_getprocs(procstat, KERN_PROC_PID, pid, &procs_count);

  if (procs_count < 1) {
    procstat_freeprocs(procstat, kp);
    procstat_close(procstat);
    return NULL;
  }

  result = malloc(sizeof(char) * PATH_MAX);
  procstat_getpathname(procstat, kp, result, PATH_MAX);

  procstat_freeprocs(procstat, kp);
  procstat_close(procstat);

  if (result == NULL) {
    return NULL;
  }

  result_realpath = realpath(result, NULL);
  if (result_realpath == NULL) {
    free(result);
    return NULL;
  }

  free(result);
  return result_realpath;
}
#else
static int exists(char *path)
{
  int ret = access(path, F_OK);
  return (ret == 0);
}

static const char *PROC_PATH_LINUX = "/proc/self/exe";
static const char *PROC_PATH_SOLARIS = "/proc/self/path/a.out";

char *get_program_path(char *argv0)
{
  char *result;
  char *result_realpath;
  int found = 0;

  result = malloc(sizeof(char) * PATH_MAX);
  if (result == NULL) {
    return NULL;
  }

  if (!found && exists((char *)PROC_PATH_LINUX)) {
    if (readlink(PROC_PATH_LINUX, result, PATH_MAX) != -1) {
      found = 1;
    }
  }
  if (!found && exists((char *)PROC_PATH_FREEBSD)) {
    if (readlink(PROC_PATH_FREEBSD, result, PATH_MAX) != -1) {
      found = 1;
    }
  }
  if (!found && exists((char *)PROC_PATH_SOLARIS)) {
    if (readlink(PROC_PATH_SOLARIS, result, PATH_MAX) != -1) {
      found = 1;
    }
  }
  if (!found && argv0[0] == '/') {
    strcpy(result, argv0);
    found = 1;
  }
  if (!found && strchr(argv0, '/')) {
    strcpy(result, argv0);
    found = 1;
  }
  if (!found) {
    // TODO: search through PATH env var
    return NULL;
  }

  result_realpath = realpath(result, NULL);
  if (result_realpath == NULL) {
    free(result);
    return NULL;
  }

  free(result);
  return result_realpath;
}
#endif
