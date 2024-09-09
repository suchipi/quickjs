#ifndef QUICKJS_FULL_INIT_H
#define QUICKJS_FULL_INIT_H

#include "quickjs.h"
#include "quickjs-print.h"
#include "quickjs-inspect.h"
#include "quickjs-intervals.h"
#include "quickjs-libc.h"
#include "quickjs-bytecode.h"
#include "quickjs-context.h"
#include "quickjs-pointer.h"
#include "quickjs-modulesys.h"
#include "quickjs-libengine.h"
#include "quickjs-encoding.h"

/* returns 0 on success, nonzero on failure */
int quickjs_full_init(JSContext *ctx);

#endif /* ifndef QUICKJS_FULL_INIT_H */
