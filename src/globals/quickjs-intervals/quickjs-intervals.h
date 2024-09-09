#ifndef QUICKJS_INTERVALS_H
#define QUICKJS_INTERVALS_H

#include "quickjs.h"

/* Adds 'setInterval' and 'clearInterval' globals */
int js_intervals_add_setInterval_clearInterval_globals(JSContext *ctx);

#endif /* ifndef QUICKJS_INTERVALS_H */
