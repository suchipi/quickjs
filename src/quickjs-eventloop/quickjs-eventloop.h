/*
 * QuickJS Event Loop Infrastructure
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
#ifndef QUICKJS_EVENTLOOP_H
#define QUICKJS_EVENTLOOP_H

#include "quickjs.h"
#include "list.h"

#ifndef SKIP_WORKER
#include <pthread.h>
#endif

#ifdef __cplusplus
extern "C" {
#endif

/* Read/write handler for file descriptors */
typedef struct JSRWHandler {
    struct list_head link;
    int fd;
    JSValue rw_func[2];
} JSRWHandler;

/* Signal handler */
typedef struct JSSignalHandler {
    struct list_head link;
    int sig_num;
    JSValue func;
} JSSignalHandler;

/* Timer */
typedef struct JSTimer {
    struct list_head link;
    JS_BOOL has_object;
    int64_t timeout;
    int64_t interval; /* 0 for setTimeout, >0 for setInterval */
    JSValue func;
} JSTimer;

#ifndef SKIP_WORKER
/* Worker message */
typedef struct JSWorkerMessage {
    struct list_head link;
    uint8_t *data;
    size_t data_len;
    /* list of SharedArrayBuffers, necessary to free the message */
    uint8_t **sab_tab;
    size_t sab_tab_len;
} JSWorkerMessage;

/* Worker message pipe for inter-thread communication */
typedef struct JSWorkerMessagePipe {
    int ref_count;
    pthread_mutex_t mutex;
    struct list_head msg_queue; /* list of JSWorkerMessage.link */
    int read_fd;
    int write_fd;
} JSWorkerMessagePipe;

/* Worker message handler */
typedef struct JSWorkerMessageHandler {
    struct list_head link;
    JSWorkerMessagePipe *recv_pipe;
    JSValue on_message_func;
} JSWorkerMessageHandler;
#endif /* !SKIP_WORKER */

/* Thread state - central event loop state attached to runtime */
typedef struct JSThreadState {
    struct list_head rw_handlers;      /* list of JSRWHandler.link */
    struct list_head signal_handlers;  /* list of JSSignalHandler.link */
    struct list_head timers;           /* list of JSTimer.link */
    int eval_script_recurse;           /* only used in the main thread */
    int exit_code;                     /* only used in the main thread */
#ifndef SKIP_WORKER
    struct list_head port_list;        /* list of JSWorkerMessageHandler.link */
    JSWorkerMessagePipe *recv_pipe, *send_pipe; /* not used in the main thread */
    int active_worker_count;           /* number of active worker threads (main thread only) */
    int worker_done_read_fd;           /* pipe read end for worker completion notifications (main thread only) */
    int worker_done_write_fd;          /* pipe write end for worker completion notifications (shared with workers) */
#endif
} JSThreadState;

/* Global state */
extern uint64_t js_pending_signals;
extern int (*js_poll_func)(JSContext *ctx);

/* Lifecycle */
void js_eventloop_init(JSRuntime *rt);
void js_eventloop_free(JSRuntime *rt);
int js_eventloop_run(JSContext *ctx);

/* Utilities */
JS_BOOL js_eventloop_is_main_thread(JSRuntime *rt);
void js_eventloop_call_handler(JSContext *ctx, JSValueConst func);

/* Interrupt handling */
void js_eventloop_interrupt_handler_start(JSContext *ctx);
void js_eventloop_interrupt_handler_finish(JSContext *ctx, JSValue ret);

/* Exit code management */
int js_eventloop_get_exit_code(JSRuntime *rt);
int js_eventloop_set_exit_code(JSRuntime *rt, int exit_status);

/* Cleanup functions for handler types - used by modules */
void js_rw_handler_free(JSRuntime *rt, JSRWHandler *rh);
void js_signal_handler_free(JSRuntime *rt, JSSignalHandler *sh);
void js_timer_unlink(JSRuntime *rt, JSTimer *th);
void js_timer_free(JSRuntime *rt, JSTimer *th);

#ifndef SKIP_WORKER
void js_worker_message_pipe_free(JSWorkerMessagePipe *ps);

/* Worker lifecycle tracking (main thread only) */
int js_eventloop_register_worker(JSRuntime *rt);
void js_eventloop_signal_worker_done(int write_fd);
#endif

#ifdef __cplusplus
}
#endif

#endif /* QUICKJS_EVENTLOOP_H */
