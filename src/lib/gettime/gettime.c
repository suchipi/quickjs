#if defined(__linux__) || defined(__APPLE__) || defined(__wasi__) || defined(__EMSCRIPTEN__)
#include <time.h>
#else
#include <sys/time.h>
#endif

#include "gettime.h"

#if defined(__linux__) || defined(__APPLE__) || defined(__wasi__) || defined(__EMSCRIPTEN__)
int64_t gettime_ms(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint64_t)ts.tv_sec * 1000 + (ts.tv_nsec / 1000000);
}

int64_t gettime_ns(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (int64_t)ts.tv_sec * 1000000000 + ts.tv_nsec;
}
#else
/* more portable, but does not work if the date is updated */
int64_t gettime_ms(void)
{
    struct timeval tv;
    gettimeofday(&tv, NULL);
    return (int64_t)tv.tv_sec * 1000 + (tv.tv_usec / 1000);
}

int64_t gettime_ns(void)
{
    struct timeval tv;
    gettimeofday(&tv, NULL);
    return (int64_t)tv.tv_sec * 1000000000 + (int64_t)tv.tv_usec * 1000;
}
#endif
