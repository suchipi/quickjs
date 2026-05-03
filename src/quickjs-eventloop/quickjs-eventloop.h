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

#ifdef _WIN32
#include <windows.h>
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

/* Cross-platform wakeup primitive used by message pipes. On POSIX it's a
   self-pipe (read_fd / write_fd); on Windows it's a manual-reset Event
   handle that can be passed to WaitForMultipleObjects alongside other
   waitable handles. The pipe owns the waker; callers signal/clear via
   the js_waker_* helpers in quickjs-os.c. */
typedef struct JSWaker {
#ifdef _WIN32
    HANDLE handle;
#else
    int read_fd;
    int write_fd;
#endif
} JSWaker;

/* Worker message pipe for inter-thread communication */
typedef struct JSWorkerMessagePipe {
    int ref_count;
    pthread_mutex_t mutex;
    struct list_head msg_queue; /* list of JSWorkerMessage.link */
    JSWaker waker;
    /* The writer-side sets `closed` under `mutex` to signal EOF to the
       reader. Windows Events have no built-in EOF, so the reader checks
       this flag whenever it dequeues the last message. POSIX uses the
       same flag for parity rather than relying on read()==0. */
    int closed;
} JSWorkerMessagePipe;

/* Worker message handler */
typedef struct JSWorkerMessageHandler {
    struct list_head link;
    JSWorkerMessagePipe *recv_pipe;
    JSValue on_message_func;
} JSWorkerMessageHandler;

/* Worker error handler — parent-side counterpart to an onerror listener
   on a Worker object. The error pipe is one-way (worker → parent) and is
   eagerly created at Worker ctor time (before `.onerror` is assigned),
   so errors can queue even before the user registers a handler. When
   `on_error_func` is JS_NULL at dispatch time, handle_posted_error falls
   back to printing the error to stderr (matching today's pre-onerror
   behavior byte-for-byte). */
typedef struct JSWorkerErrorHandler {
    struct list_head link;
    JSWorkerMessagePipe *recv_pipe;
    JSValue on_error_func;
} JSWorkerErrorHandler;
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
    struct list_head error_port_list;  /* list of JSWorkerErrorHandler.link (main thread's side of per-worker error pipes) */
    JSWorkerMessagePipe *recv_pipe, *send_pipe; /* not used in the main thread */
    JSWorkerMessagePipe *error_send_pipe; /* worker-side only: write-end of the one-way error pipe back to the parent */
    char *entry_filename;              /* worker-side only: duped filename of the entry module; used as a fallback in worker_send_error when a thrown reason lacks a fileName own-prop */
    void *last_reported_reason_ptr;    /* worker-side only: pointer identity of the last reason value routed to the error pipe. Used by qju_report_exception_hook_impl to dedupe the chain of tracker fires produced by module-evaluation machinery when a module has a top-level throw — the chain shares a single reason value, so comparing pointer identity collapses the N reports into one. Non-JS_TAG_OBJECT values (strings, numbers) are never deduped because they don't have stable pointer identity in QuickJS's tagged-value representation. */
    int active_worker_count;           /* number of active worker threads (main thread only); mirrored from worker_done_signal->active_count, refreshed under its mutex */
    struct JSWorkerDoneSignal *worker_done_signal; /* signaling channel for worker-completion notifications (main thread only; lazily allocated on first worker) */
#endif
} JSThreadState;

#ifndef SKIP_WORKER
/* Cross-thread signaling channel the parent uses to wake on worker
   completion. The parent's JSThreadState owns one of these, lazily
   allocated by js_eventloop_register_worker; each spawned worker thread
   gets the same pointer via WorkerFuncArgs and signals it on exit. The
   parent reads `active_count` under `mutex` whenever the waker fires. */
typedef struct JSWorkerDoneSignal {
    JSWaker waker;
    pthread_mutex_t mutex;
    int active_count;
} JSWorkerDoneSignal;
#endif

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

/* JSWaker helpers — implemented in quickjs-os.c. */
int js_waker_init(JSWaker *w);
void js_waker_signal(JSWaker *w);
void js_waker_clear(JSWaker *w);
void js_waker_close(JSWaker *w);

/* Worker lifecycle tracking (main thread only).
   register returns the parent's JSWorkerDoneSignal, which the worker
   thread signals on exit. The signal struct is owned by ts and freed
   in js_eventloop_free; workers only borrow the pointer. */
JSWorkerDoneSignal *js_eventloop_register_worker(JSRuntime *rt);
void js_eventloop_signal_worker_done(JSWorkerDoneSignal *sig);
#endif

#ifdef __cplusplus
}
#endif

#endif /* QUICKJS_EVENTLOOP_H */
