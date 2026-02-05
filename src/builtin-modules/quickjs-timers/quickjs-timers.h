/*
 * QuickJS Timers Module
 *
 * Copyright (c) 2017-2021 Fabrice Bellard
 * Copyright (c) 2017-2021 Charlie Gordon
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
#ifndef QUICKJS_TIMERS_H
#define QUICKJS_TIMERS_H

#include "quickjs.h"

#ifdef __cplusplus
extern "C" {
#endif

JSModuleDef *js_init_module_timers(JSContext *ctx, const char *module_name);

/* Add setTimeout, clearTimeout, setInterval, clearInterval as globals */
void js_timers_add_globals(JSContext *ctx);

/* Get current time in milliseconds */
int64_t js_timers_get_time_ms(void);

/* Get timer class ID (for use by poll function) */
JSClassID js_timers_get_class_id(void);

#ifdef __cplusplus
}
#endif

#endif /* QUICKJS_TIMERS_H */
