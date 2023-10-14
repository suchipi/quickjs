#ifndef QUICKJS_FULL_INIT_H
#define QUICKJS_FULL_INIT_H

#include "quickjs.h"
#include "quickjs-libc.h"
#include "quickjs-libbytecode.h"
#include "quickjs-libcontext.h"
#include "quickjs-libpointer.h"
#include "quickjs-modulesys.h"
#include "quickjs-libmodule.h"

/* returns 0 on success, nonzero on failure */
int quickjs_full_init(JSContext *ctx);

#endif /* ifndef QUICKJS_FULL_INIT_H */
