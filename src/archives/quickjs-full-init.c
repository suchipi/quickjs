#include "quickjs-full-init.h"

extern const uint8_t qjsc_inspect[];
extern const uint32_t qjsc_inspect_size;

static void quickjs_full_init_modules(JSContext *ctx)
{
    js_init_module_std(ctx, "quickjs:std");
    js_init_module_os(ctx, "quickjs:os");
    js_init_module_bytecode(ctx, "quickjs:bytecode");
    js_init_module_context(ctx, "quickjs:context");
    js_init_module_pointer(ctx, "quickjs:pointer");
}

static void quickjs_full_init_globals(JSContext *ctx)
{
    js_std_eval_binary(ctx, qjsc_inspect, qjsc_inspect_size, 0);
}

void quickjs_full_init(JSContext *ctx)
{
    quickjs_full_init_modules(ctx);
    quickjs_full_init_globals(ctx);
}
