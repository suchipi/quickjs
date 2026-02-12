#include "quickjs-full-init.h"

/* returns 0 on success, nonzero on failure */
static int quickjs_full_init_modules(JSContext *ctx)
{
    if (js_init_module_std(ctx, "quickjs:std") == NULL) {
        return -1;
    }
    if (js_init_module_timers(ctx, "quickjs:timers") == NULL) {
        return -1;
    }
    if (js_init_module_os(ctx, "quickjs:os") == NULL) {
        return -1;
    }
    if (js_init_module_cmdline(ctx, "quickjs:cmdline") == NULL) {
        return -1;
    }
    if (js_init_module_bytecode(ctx, "quickjs:bytecode") == NULL) {
        return -1;
    }
    if (js_init_module_context(ctx, "quickjs:context") == NULL) {
        return -1;
    }
    if (js_init_module_engine(ctx, "quickjs:engine") == NULL) {
        return -1;
    }
    if (js_init_module_encoding(ctx, "quickjs:encoding") == NULL) {
        return -1;
    }

    return 0;
}

static int quickjs_full_init_globals(JSContext *ctx)
{
    if (js_inspect_add_inspect_global(ctx)) {
        return -1;
    }

    js_print_add_print_global(ctx);
    js_print_add_console_global(ctx);
    js_timers_add_globals(ctx);

    return 0;
}

int quickjs_full_init(JSContext *ctx)
{
    if (quickjs_full_init_modules(ctx)) {
        return -1;
    }
    if (quickjs_full_init_globals(ctx)) {
        return -1;
    }

    return 0;
}
