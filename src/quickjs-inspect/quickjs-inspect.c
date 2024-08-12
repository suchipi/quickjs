#include "quickjs-inspect.h"
#include "quickjs-modulesys.h"

extern const uint8_t qjsc_inspect[];
extern const uint32_t qjsc_inspect_size;

int js_inspect_add_inspect_global(JSContext *ctx)
{
  return QJMS_EvalBinary(ctx, qjsc_inspect, qjsc_inspect_size, 0);
}
