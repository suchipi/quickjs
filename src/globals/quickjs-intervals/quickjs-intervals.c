#include "quickjs-intervals.h"
#include "quickjs-modulesys.h"

extern const uint8_t qjsc_intervals[];
extern const uint32_t qjsc_intervals_size;

int js_intervals_add_setInterval_clearInterval_globals(JSContext *ctx)
{
  return QJMS_EvalBinary(ctx, qjsc_intervals, qjsc_intervals_size, 0);
}
