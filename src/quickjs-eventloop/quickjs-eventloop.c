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
#include <stdlib.h>
#include <stdio.h>
#include <stddef.h>
#include <string.h>
#include <signal.h>
#include <assert.h>
#include <errno.h>

#if !defined(_WIN32)
#include <unistd.h>
#endif

#if defined(_WIN32)
#include <io.h>
#include <fcntl.h>
#define pipe(fds) _pipe(fds, 4096, _O_BINARY)
#define close _close
#define read _read
#define write _write
#endif

#include "cutils.h"
#include "quickjs-eventloop.h"

#ifndef SKIP_WORKER
#include <stdatomic.h>
#endif
#include "quickjs-utils.h"

/* Global state */
uint64_t js_pending_signals = 0;
int (*js_poll_func)(JSContext *ctx) = NULL;

#ifndef SKIP_WORKER
/* SharedArrayBuffer header for reference counting */
typedef struct {
    int ref_count;
    uint64_t buf[0];
} JSSABHeader;

static int atomic_add_int(int *ptr, int v)
{
    return atomic_fetch_add((_Atomic(uint32_t) *)ptr, v) + v;
}

static void *js_sab_alloc(void *opaque, size_t size)
{
    JSSABHeader *sab;
    sab = malloc(sizeof(JSSABHeader) + size);
    if (!sab)
        return NULL;
    sab->ref_count = 1;
    return sab->buf;
}

static void js_sab_free(void *opaque, void *ptr)
{
    JSSABHeader *sab;
    int ref_count;
    sab = (JSSABHeader *)((uint8_t *)ptr - sizeof(JSSABHeader));
    ref_count = atomic_add_int(&sab->ref_count, -1);
    assert(ref_count >= 0);
    if (ref_count == 0) {
        free(sab);
    }
}

static void js_sab_dup(void *opaque, void *ptr)
{
    JSSABHeader *sab;
    sab = (JSSABHeader *)((uint8_t *)ptr - sizeof(JSSABHeader));
    atomic_add_int(&sab->ref_count, 1);
}
#endif /* !SKIP_WORKER */

JS_BOOL js_eventloop_is_main_thread(JSRuntime *rt)
{
#ifndef SKIP_WORKER
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    return !ts->recv_pipe;
#else
    return TRUE;
#endif
}

/* returns 0 when code is unavailable */
int js_eventloop_get_exit_code(JSRuntime *rt)
{
    if (!js_eventloop_is_main_thread(rt)) {
        return 0;
    }

    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    if (ts == NULL) {
        return 0;
    }
    return ts->exit_code;
}

/* negative return value indicates set failed */
int js_eventloop_set_exit_code(JSRuntime *rt, int exit_status)
{
    if (!js_eventloop_is_main_thread(rt)) {
        return -1;
    }

    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    if (ts == NULL) {
        return -2;
    }

    ts->exit_code = exit_status;
    return 0;
}

static int interrupt_handler(JSRuntime *rt, void *opaque)
{
    return (js_pending_signals >> SIGINT) & 1;
}

void js_eventloop_interrupt_handler_start(JSContext *ctx)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);

#ifndef SKIP_WORKER
    if (!ts->recv_pipe && ++ts->eval_script_recurse == 1) {
#else
    if (++ts->eval_script_recurse == 1) {
#endif
        /* install the interrupt handler */
        JS_SetInterruptHandler(rt, interrupt_handler, NULL);
    }
}

void js_eventloop_interrupt_handler_finish(JSContext *ctx, JSValue ret)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);

#ifndef SKIP_WORKER
    if (!ts->recv_pipe && --ts->eval_script_recurse == 0) {
#else
    if (--ts->eval_script_recurse == 0) {
#endif
        /* remove the interrupt handler */
        JS_SetInterruptHandler(JS_GetRuntime(ctx), NULL, NULL);
        js_pending_signals &= ~((uint64_t)1 << SIGINT);
        /* convert the uncatchable "interrupted" error into a normal error
           so that it can be caught by the REPL */
        if (JS_IsException(ret))
            JS_ResetUncatchableError(ctx);
    }
}

void js_eventloop_call_handler(JSContext *ctx, JSValueConst func)
{
    JSValue ret, func1;
    /* 'func' might be destroyed when calling itself (if it frees the
       handler), so must take extra care */
    func1 = JS_DupValue(ctx, func);
    ret = JS_Call(ctx, func1, JS_UNDEFINED, 0, NULL);
    JS_FreeValue(ctx, func1);
    if (JS_IsException(ret))
        QJU_PrintException(ctx, stderr);
    JS_FreeValue(ctx, ret);
}

/* Cleanup functions for handler types */
void js_rw_handler_free(JSRuntime *rt, JSRWHandler *rh)
{
    list_del(&rh->link);
    JS_FreeValueRT(rt, rh->rw_func[0]);
    JS_FreeValueRT(rt, rh->rw_func[1]);
    js_free_rt(rt, rh);
}

void js_signal_handler_free(JSRuntime *rt, JSSignalHandler *sh)
{
    list_del(&sh->link);
    JS_FreeValueRT(rt, sh->func);
    js_free_rt(rt, sh);
}

void js_timer_unlink(JSRuntime *rt, JSTimer *th)
{
    if (th->link.prev) {
        list_del(&th->link);
        th->link.prev = th->link.next = NULL;
    }
}

void js_timer_free(JSRuntime *rt, JSTimer *th)
{
    JS_FreeValueRT(rt, th->func);
    js_free_rt(rt, th);
}

#ifndef SKIP_WORKER
static void js_free_message(JSWorkerMessage *msg)
{
    size_t i;
    /* free the SAB */
    for(i = 0; i < msg->sab_tab_len; i++) {
        js_sab_free(NULL, msg->sab_tab[i]);
    }
    free(msg->sab_tab);
    free(msg->data);
    free(msg);
}

void js_worker_message_pipe_free(JSWorkerMessagePipe *ps)
{
    struct list_head *el, *el1;
    JSWorkerMessage *msg;
    int ref_count;

    if (!ps)
        return;

    ref_count = atomic_add_int(&ps->ref_count, -1);
    assert(ref_count >= 0);
    if (ref_count == 0) {
        list_for_each_safe(el, el1, &ps->msg_queue) {
            msg = list_entry(el, JSWorkerMessage, link);
            js_free_message(msg);
        }
        pthread_mutex_destroy(&ps->mutex);
        close(ps->read_fd);
        close(ps->write_fd);
        free(ps);
    }
}
#endif /* !SKIP_WORKER */

void js_eventloop_init(JSRuntime *rt)
{
    JSThreadState *ts;

    ts = malloc(sizeof(*ts));
    if (!ts) {
        fprintf(stderr, "Could not allocate memory for the thread state\n");
        exit(1);
    }
    memset(ts, 0, sizeof(*ts));
    init_list_head(&ts->rw_handlers);
    init_list_head(&ts->signal_handlers);
    init_list_head(&ts->timers);
#ifndef SKIP_WORKER
    init_list_head(&ts->port_list);
    ts->worker_done_read_fd = -1;
    ts->worker_done_write_fd = -1;
#endif

    JS_SetRuntimeOpaque(rt, ts);

#ifndef SKIP_WORKER
    /* set the SharedArrayBuffer memory handlers */
    {
        JSSharedArrayBufferFunctions sf;
        memset(&sf, 0, sizeof(sf));
        sf.sab_alloc = js_sab_alloc;
        sf.sab_free = js_sab_free;
        sf.sab_dup = js_sab_dup;
        JS_SetSharedArrayBufferFunctions(rt, &sf);
    }
#endif
}

void js_eventloop_free(JSRuntime *rt)
{
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    struct list_head *el, *el1;

    list_for_each_safe(el, el1, &ts->rw_handlers) {
        JSRWHandler *rh = list_entry(el, JSRWHandler, link);
        js_rw_handler_free(rt, rh);
    }

    list_for_each_safe(el, el1, &ts->signal_handlers) {
        JSSignalHandler *sh = list_entry(el, JSSignalHandler, link);
        js_signal_handler_free(rt, sh);
    }

    list_for_each_safe(el, el1, &ts->timers) {
        JSTimer *th = list_entry(el, JSTimer, link);
        js_timer_unlink(rt, th);
        if (!th->has_object)
            js_timer_free(rt, th);
    }

#ifndef SKIP_WORKER
    /* Note: port_list cleanup is handled by the OS module */
    js_worker_message_pipe_free(ts->recv_pipe);
    js_worker_message_pipe_free(ts->send_pipe);

    if (ts->worker_done_read_fd >= 0)
        close(ts->worker_done_read_fd);
    if (ts->worker_done_write_fd >= 0)
        close(ts->worker_done_write_fd);
#endif

    free(ts);
    JS_SetRuntimeOpaque(rt, NULL); /* fail safe */
}

/* Worker lifecycle tracking.
   The main thread tracks active workers so the event loop stays alive
   while workers are running. Workers signal completion by writing a byte
   to a shared notification pipe. */
int js_eventloop_register_worker(JSRuntime *rt)
{
#ifndef SKIP_WORKER
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    if (ts->worker_done_read_fd < 0) {
        int fds[2];
        if (pipe(fds) < 0)
            return -1;
        ts->worker_done_read_fd = fds[0];
        ts->worker_done_write_fd = fds[1];
    }
    ts->active_worker_count++;
    return ts->worker_done_write_fd;
#else
    return -1;
#endif
}

void js_eventloop_signal_worker_done(int write_fd)
{
    uint8_t ch = 0;
    int ret;

    if (write_fd == -1) {
        return;
    }

    for (;;) {
        ret = write(write_fd, &ch, 1);
        if (ret == 1)
            break;
        if (ret < 0 && errno != EAGAIN && errno != EINTR)
            break;
    }
}

/* main loop which calls the user JS callbacks */
int js_eventloop_run(JSContext *ctx)
{
    JSRuntime *rt;
    JSContext *ctx1;
    int err;

    rt = JS_GetRuntime(ctx);

    for(;;) {
        /* execute the pending jobs */
        for(;;) {
            err = JS_ExecutePendingJob(rt, &ctx1);
            if (err <= 0) {
                if (err < 0) {
                    QJU_PrintException(ctx1, stderr);
                }
                break;
            }
        }

        if (!js_poll_func || js_poll_func(ctx))
            break;
    }

    if (err < 0) {
        js_eventloop_set_exit_code(rt, 1);
    }

    return js_eventloop_get_exit_code(rt);
}
