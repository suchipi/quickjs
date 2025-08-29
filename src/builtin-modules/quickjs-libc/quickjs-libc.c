/*
 * QuickJS C library
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
#include <stdarg.h>
#include <inttypes.h>
#include <string.h>
#include <assert.h>
#include <unistd.h>
#include <errno.h>
#include <fcntl.h>
#include <sys/time.h>
#include <time.h>
#include <signal.h>
#include <limits.h>

// HOST_NAME_MAX comes from limits.h but only if __USE_POSIX is defined and I don't
// wanna fuck with that
#ifndef HOST_NAME_MAX
#define HOST_NAME_MAX 255
#endif

#include <sys/stat.h>
#include <dirent.h>
#include <time.h>
#if defined(_WIN32)
#include <windows.h>
#include <conio.h>
#include <utime.h>
#include <io.h>
#else
#include <termios.h>
#include <sys/ioctl.h>
#include <sys/wait.h>
#include <pwd.h>

#if defined(__APPLE__)
typedef sig_t sighandler_t;
#if !defined(environ)
#include <crt_externs.h>
#define environ (*_NSGetEnviron())
#endif
#endif /* __APPLE__ */

#if defined(__FreeBSD__)
extern char **environ;

typedef void (*sighandler_t)(int);
sighandler_t signal(int signum, sighandler_t handler);
#endif

#endif /* _WIN32 else */

#if !defined(_WIN32)
/* enable the os.Worker API. IT relies on POSIX threads */
#define USE_WORKER
#endif

#ifdef USE_WORKER
#include <pthread.h>
#include <stdatomic.h>
#endif

#include "cutils.h"
#include "list.h"
#include "quickjs-libc.h"
#include "quickjs-utils.h"
#include "quickjs-modulesys.h"
#include "debugprint.h"
#include "execpath.h"

/* TODO:
   - add socket calls
*/

typedef struct {
    struct list_head link;
    int fd;
    JSValue rw_func[2];
} JSOSRWHandler;

typedef struct {
    struct list_head link;
    int sig_num;
    JSValue func;
} JSOSSignalHandler;

typedef struct {
    struct list_head link;
    BOOL has_object;
    int64_t timeout;
    JSValue func;
} JSOSTimer;

typedef struct {
    struct list_head link;
    uint8_t *data;
    size_t data_len;
    /* list of SharedArrayBuffers, necessary to free the message */
    uint8_t **sab_tab;
    size_t sab_tab_len;
} JSWorkerMessage;

typedef struct {
    int ref_count;
#ifdef USE_WORKER
    pthread_mutex_t mutex;
#endif
    struct list_head msg_queue; /* list of JSWorkerMessage.link */
    int read_fd;
    int write_fd;
} JSWorkerMessagePipe;

typedef struct {
    struct list_head link;
    JSWorkerMessagePipe *recv_pipe;
    JSValue on_message_func;
} JSWorkerMessageHandler;

typedef struct JSThreadState {
    struct list_head os_rw_handlers; /* list of JSOSRWHandler.link */
    struct list_head os_signal_handlers; /* list JSOSSignalHandler.link */
    struct list_head os_timers; /* list of JSOSTimer.link */
    struct list_head port_list; /* list of JSWorkerMessageHandler.link */
    int eval_script_recurse; /* only used in the main thread */
    JSWorkerMessagePipe *recv_pipe, *send_pipe; /* not used in the main thread */
    int exit_code; /* only used in the main thread */
} JSThreadState;

BOOL js_std_is_main_thread(JSRuntime *rt)
{
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    return !ts->recv_pipe;
}

static uint64_t os_pending_signals;
static int (*os_poll_func)(JSContext *ctx);

static void js_std_dbuf_init(JSContext *ctx, DynBuf *s)
{
    dbuf_init2(s, JS_GetRuntime(ctx), (DynBufReallocFunc *)js_realloc_rt);
}

static BOOL my_isdigit(int c)
{
    return (c >= '0' && c <= '9');
}

static JSValue js_printf_internal(JSContext *ctx,
                                  int argc, JSValueConst *argv, FILE *fp)
{
    char fmtbuf[32];
    uint8_t cbuf[UTF8_CHAR_LEN_MAX+1];
    JSValue res;
    DynBuf dbuf;
    const char *fmt_str;
    const uint8_t *fmt, *fmt_end;
    const uint8_t *p;
    char *q;
    int i, c, len, mod;
    size_t fmt_len;
    int32_t int32_arg;
    int64_t int64_arg;
    double double_arg;
    const char *string_arg;
    /* Use indirect call to dbuf_printf to prevent gcc warning */
    int (*dbuf_printf_fun)(DynBuf *s, const char *fmt, ...) = (void*)dbuf_printf;

    js_std_dbuf_init(ctx, &dbuf);

    if (argc > 0) {
        fmt_str = JS_ToCStringLen(ctx, &fmt_len, argv[0]);
        if (!fmt_str)
            goto fail;

        i = 1;
        fmt = (const uint8_t *)fmt_str;
        fmt_end = fmt + fmt_len;
        while (fmt < fmt_end) {
            for (p = fmt; fmt < fmt_end && *fmt != '%'; fmt++)
                continue;
            dbuf_put(&dbuf, p, fmt - p);
            if (fmt >= fmt_end)
                break;
            q = fmtbuf;
            *q++ = *fmt++;  /* copy '%' */

            /* flags */
            for(;;) {
                c = *fmt;
                if (c == '0' || c == '#' || c == '+' || c == '-' || c == ' ' ||
                    c == '\'') {
                    if (q >= fmtbuf + sizeof(fmtbuf) - 1)
                        goto invalid;
                    *q++ = c;
                    fmt++;
                } else {
                    break;
                }
            }
            /* width */
            if (*fmt == '*') {
                if (i >= argc)
                    goto missing;
                if (JS_ToInt32(ctx, &int32_arg, argv[i++]))
                    goto fail;
                q += snprintf(q, fmtbuf + sizeof(fmtbuf) - q, "%d", int32_arg);
                fmt++;
            } else {
                while (my_isdigit(*fmt)) {
                    if (q >= fmtbuf + sizeof(fmtbuf) - 1)
                        goto invalid;
                    *q++ = *fmt++;
                }
            }
            if (*fmt == '.') {
                if (q >= fmtbuf + sizeof(fmtbuf) - 1)
                    goto invalid;
                *q++ = *fmt++;
                if (*fmt == '*') {
                    if (i >= argc)
                        goto missing;
                    if (JS_ToInt32(ctx, &int32_arg, argv[i++]))
                        goto fail;
                    q += snprintf(q, fmtbuf + sizeof(fmtbuf) - q, "%d", int32_arg);
                    fmt++;
                } else {
                    while (my_isdigit(*fmt)) {
                        if (q >= fmtbuf + sizeof(fmtbuf) - 1)
                            goto invalid;
                        *q++ = *fmt++;
                    }
                }
            }

            /* we only support the "l" modifier for 64 bit numbers */
            mod = ' ';
            if (*fmt == 'l') {
                mod = *fmt++;
            }

            /* type */
            c = *fmt++;
            if (q >= fmtbuf + sizeof(fmtbuf) - 1)
                goto invalid;
            *q++ = c;
            *q = '\0';

            switch (c) {
            case 'c':
                if (i >= argc)
                    goto missing;
                if (JS_IsString(argv[i])) {
                    string_arg = JS_ToCString(ctx, argv[i++]);
                    if (!string_arg)
                        goto fail;
                    int32_arg = unicode_from_utf8((uint8_t *)string_arg, UTF8_CHAR_LEN_MAX, &p);
                    JS_FreeCString(ctx, string_arg);
                } else {
                    if (JS_ToInt32(ctx, &int32_arg, argv[i++]))
                        goto fail;
                }
                /* handle utf-8 encoding explicitly */
                if ((unsigned)int32_arg > 0x10FFFF)
                    int32_arg = 0xFFFD;
                /* ignore conversion flags, width and precision */
                len = unicode_to_utf8(cbuf, int32_arg);
                dbuf_put(&dbuf, cbuf, len);
                break;

            case 'd':
            case 'i':
            case 'o':
            case 'u':
            case 'x':
            case 'X':
                if (i >= argc)
                    goto missing;
                if (JS_ToInt64Ext(ctx, &int64_arg, argv[i++]))
                    goto fail;
                if (mod == 'l') {
                    /* 64 bit number */
#if defined(_WIN32)
                    if (q >= fmtbuf + sizeof(fmtbuf) - 3)
                        goto invalid;
                    q[2] = q[-1];
                    q[-1] = 'I';
                    q[0] = '6';
                    q[1] = '4';
                    q[3] = '\0';
                    dbuf_printf_fun(&dbuf, fmtbuf, (int64_t)int64_arg);
#else
                    if (q >= fmtbuf + sizeof(fmtbuf) - 2)
                        goto invalid;
                    q[1] = q[-1];
                    q[-1] = q[0] = 'l';
                    q[2] = '\0';
                    dbuf_printf_fun(&dbuf, fmtbuf, (long long)int64_arg);
#endif
                } else {
                    dbuf_printf_fun(&dbuf, fmtbuf, (int)int64_arg);
                }
                break;

            case 's':
                if (i >= argc)
                    goto missing;
                /* XXX: handle strings containing null characters */
                string_arg = JS_ToCString(ctx, argv[i++]);
                if (!string_arg)
                    goto fail;
                dbuf_printf_fun(&dbuf, fmtbuf, string_arg);
                JS_FreeCString(ctx, string_arg);
                break;

            case 'e':
            case 'f':
            case 'g':
            case 'a':
            case 'E':
            case 'F':
            case 'G':
            case 'A':
                if (i >= argc)
                    goto missing;
                if (JS_ToFloat64(ctx, &double_arg, argv[i++]))
                    goto fail;
                dbuf_printf_fun(&dbuf, fmtbuf, double_arg);
                break;

            case '%':
                dbuf_putc(&dbuf, '%');
                break;

            default:
                /* XXX: should support an extension mechanism */
            invalid:
                JS_ThrowTypeError(ctx, "invalid conversion specifier in format string");
                goto fail;
            missing:
                JS_ThrowReferenceError(ctx, "missing argument for conversion specifier");
                goto fail;
            }
        }
        JS_FreeCString(ctx, fmt_str);
    }
    if (dbuf.error) {
        res = JS_ThrowOutOfMemory(ctx);
    } else {
        if (fp) {
            len = fwrite(dbuf.buf, 1, dbuf.size, fp);
            res = JS_NewInt32(ctx, len);
        } else {
            res = JS_NewStringLen(ctx, (char *)dbuf.buf, dbuf.size);
        }
    }
    dbuf_free(&dbuf);
    return res;

fail:
    dbuf_free(&dbuf);
    return JS_EXCEPTION;
}

/* load a file as a UTF-8 encoded string */
static JSValue js_std_loadFile(JSContext *ctx, JSValueConst this_val,
                               int argc, JSValueConst *argv)
{
    uint8_t *buf;
    const char *filename;
    JSValue ret;
    size_t buf_len;

    filename = JS_ToCString(ctx, argv[0]);
    if (!filename)
        return JS_EXCEPTION;
    buf = QJU_ReadFile(ctx, &buf_len, filename);
    if (!buf) {
        JS_ThrowError(ctx, "%s (errno = %d, filename = %s)", strerror(errno), errno, filename);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        JS_AddPropertyToException(ctx, "filename", JS_NewString(ctx, filename));

        JS_FreeCString(ctx, filename);

        return JS_EXCEPTION;
    }
    JS_FreeCString(ctx, filename);
    ret = JS_NewStringLen(ctx, (char *)buf, buf_len);
    js_free(ctx, buf);
    return ret;
}

/* returns 0 when code is unavailable */
static int js_std_get_exit_code(JSRuntime *rt) {
    if (!js_std_is_main_thread(rt)) {
        return 0;
    }

    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    if (ts == NULL) {
        return 0;
    }
    return ts->exit_code;
}

/* negative return value indicates set failed */
static int js_std_set_exit_code(JSRuntime *rt, int exit_status) {
    if (!js_std_is_main_thread(rt)) {
        return -1;
    }

    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    if (ts == NULL) {
        return -2;
    }

    ts->exit_code = exit_status;
    return 0;
}

static JSValue js_std_getExitCode(JSContext *ctx, JSValueConst this_val,
                                  int argc, JSValueConst *argv)
{
    int status;
    JSRuntime *rt;

    rt = JS_GetRuntime(ctx);

    if (!js_std_is_main_thread(rt)) {
        return JS_ThrowError(ctx, "std.getExitCode can only be called from the main thread");
    }

    status = js_std_get_exit_code(rt);

    return JS_NewInt32(ctx, status);
}

static JSValue js_std_setExitCode(JSContext *ctx, JSValueConst this_val,
                                  int argc, JSValueConst *argv)
{
    int status, set_result;
    JSRuntime *rt;

    if (JS_ToInt32(ctx, &status, argv[0])) {
        return JS_EXCEPTION;
    }

    rt = JS_GetRuntime(ctx);
    set_result = js_std_set_exit_code(rt, status);

    if (set_result == -1) {
        return JS_ThrowError(ctx, "std.setExitCode can only be called from the main thread");
    } else if (set_result == -2) {
        return JS_ThrowError(ctx, "The current JS runtime has no ThreadState object, so the exit code cannot be set. Did you forget to call js_std_init_handlers?");
    } else if (set_result < 0) {
        return JS_ThrowError(ctx, "Failed to set that exit code: unknown error, code %d", set_result);
    } else {
        // success
        return JS_UNDEFINED;
    }
}

static JSValue js_std_exit(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    int status;
    JSRuntime *rt;

    rt = JS_GetRuntime(ctx);

    if (!js_std_is_main_thread(rt)) {
        return JS_ThrowError(ctx, "std.exit can only be called from the main thread");
    }

    if (argc == 0 || JS_IsUndefined(argv[0])) {
        status = js_std_get_exit_code(rt);
    } else {
        if (JS_ToInt32(ctx, &status, argv[0])) {
            status = -1;
        }
        js_std_set_exit_code(rt, status);
    }

    exit(status);
    return JS_UNDEFINED;
}

static JSValue js_std_getenv(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    const char *name, *str;
    name = JS_ToCString(ctx, argv[0]);
    if (!name)
        return JS_EXCEPTION;
    str = getenv(name);
    JS_FreeCString(ctx, name);
    if (!str)
        return JS_UNDEFINED;
    else
        return JS_NewString(ctx, str);
}

#if defined(_WIN32)
static void setenv(const char *name, const char *value, int overwrite)
{
    char *str;
    size_t name_len, value_len;
    name_len = strlen(name);
    value_len = strlen(value);
    str = malloc(name_len + 1 + value_len + 1);
    memcpy(str, name, name_len);
    str[name_len] = '=';
    memcpy(str + name_len + 1, value, value_len);
    str[name_len + 1 + value_len] = '\0';
    _putenv(str);
    free(str);
}

static void unsetenv(const char *name)
{
    setenv(name, "", TRUE);
}
#endif /* _WIN32 */

static JSValue js_std_setenv(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    const char *name, *value;
    name = JS_ToCString(ctx, argv[0]);
    if (!name)
        return JS_EXCEPTION;
    value = JS_ToCString(ctx, argv[1]);
    if (!value) {
        JS_FreeCString(ctx, name);
        return JS_EXCEPTION;
    }
    setenv(name, value, TRUE);
    JS_FreeCString(ctx, name);
    JS_FreeCString(ctx, value);
    return JS_UNDEFINED;
}

static JSValue js_std_unsetenv(JSContext *ctx, JSValueConst this_val,
                               int argc, JSValueConst *argv)
{
    const char *name;
    name = JS_ToCString(ctx, argv[0]);
    if (!name)
        return JS_EXCEPTION;
    unsetenv(name);
    JS_FreeCString(ctx, name);
    return JS_UNDEFINED;
}

/* return an object containing the list of the available environment
   variables. */
static JSValue js_std_getenviron(JSContext *ctx, JSValueConst this_val,
                                 int argc, JSValueConst *argv)
{
    char **envp;
    const char *name, *p, *value;
    JSValue obj;
    uint32_t idx;
    size_t name_len;
    JSAtom atom;
    int ret;

    obj = JS_NewObject(ctx);
    if (JS_IsException(obj))
        return JS_EXCEPTION;
    envp = environ;
    for(idx = 0; envp[idx] != NULL; idx++) {
        name = envp[idx];
        p = strchr(name, '=');
        name_len = p - name;
        if (!p)
            continue;
        value = p + 1;
        atom = JS_NewAtomLen(ctx, name, name_len);
        if (atom == JS_ATOM_NULL)
            goto fail;
        ret = JS_DefinePropertyValue(ctx, obj, atom, JS_NewString(ctx, value),
                                     JS_PROP_C_W_E);
        JS_FreeAtom(ctx, atom);
        if (ret < 0)
            goto fail;
    }
    return obj;
 fail:
    JS_FreeValue(ctx, obj);
    return JS_EXCEPTION;
}

static JSValue js_std_getuid(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
#ifdef _WIN32
    return JS_ThrowError(ctx, "getuid is not supported on Windows");
#else
    int32_t uid = getuid();
    return JS_NewInt32(ctx, uid);
#endif

}

static JSValue js_std_geteuid(JSContext *ctx, JSValueConst this_val,
                              int argc, JSValueConst *argv)
{
#ifdef _WIN32
    return JS_ThrowError(ctx, "geteuid is not supported on Windows");
#else
    int32_t uid = geteuid();
    return JS_NewInt32(ctx, uid);
#endif
}

static JSValue js_std_getgid(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
#ifdef _WIN32
    return JS_ThrowError(ctx, "getgid is not supported on Windows");
#else
    int32_t gid = getgid();
    return JS_NewInt32(ctx, gid);
#endif
}

static JSValue js_std_getegid(JSContext *ctx, JSValueConst this_val,
                              int argc, JSValueConst *argv)
{
#ifdef _WIN32
    return JS_ThrowError(ctx, "getegid is not supported on Windows");
#else
    int32_t gid = getegid();
    return JS_NewInt32(ctx, gid);
#endif
}

static JSValue js_std_getpwuid(JSContext *ctx, JSValueConst this_val,
    int argc, JSValueConst *argv)
{
#ifdef _WIN32
    return JS_ThrowError(ctx, "getpwuid is not supported on Windows");
#else
    uid_t id = -1;
    struct passwd *pwd = {0};
    JSValue result_val = JS_NULL;
    JSValue name_val = JS_NULL;
    JSValue passwd_val = JS_NULL;
    JSValue uid_val = JS_NULL;
    JSValue gid_val = JS_NULL;
    JSValue gecos_val = JS_NULL;
    JSValue dir_val = JS_NULL;
    JSValue shell_val = JS_NULL;

    if (JS_ToUint32(ctx, &id, argv[0])) {
        return JS_EXCEPTION;
    }

    pwd = getpwuid(id);
    result_val = JS_NewObject(ctx);
    if (JS_IsException(result_val)) {
        goto fail;
    }

    name_val = JS_NewString(ctx, pwd->pw_name);
    if (JS_IsException(name_val)) {
        goto fail;
    }
    JS_DefinePropertyValueStr(ctx, result_val, "name", name_val, JS_PROP_C_W_E);

    passwd_val = JS_NewString(ctx, pwd->pw_passwd);
    if (JS_IsException(passwd_val)) {
        goto fail;
    }
    JS_DefinePropertyValueStr(ctx, result_val, "passwd", passwd_val, JS_PROP_C_W_E);

    uid_val = JS_NewUint32(ctx, pwd->pw_uid);
    JS_DefinePropertyValueStr(ctx, result_val, "uid", uid_val, JS_PROP_C_W_E);

    gid_val = JS_NewUint32(ctx, pwd->pw_gid);
    JS_DefinePropertyValueStr(ctx, result_val, "gid", gid_val, JS_PROP_C_W_E);

    gecos_val = JS_NewString(ctx, pwd->pw_gecos);
    if (JS_IsException(gecos_val)) {
        goto fail;
    }
    JS_DefinePropertyValueStr(ctx, result_val, "gecos", gecos_val, JS_PROP_C_W_E);

    dir_val = JS_NewString(ctx, pwd->pw_dir);
    if (JS_IsException(dir_val)) {
        goto fail;
    }
    JS_DefinePropertyValueStr(ctx, result_val, "dir", dir_val, JS_PROP_C_W_E);

    shell_val = JS_NewString(ctx, pwd->pw_shell);
    if (JS_IsException(shell_val)) {
        goto fail;
    }
    JS_DefinePropertyValueStr(ctx, result_val, "shell", shell_val, JS_PROP_C_W_E);

    return result_val;
fail:
    JS_FreeValue(ctx, shell_val);
    JS_FreeValue(ctx, dir_val);
    JS_FreeValue(ctx, gecos_val);
    JS_FreeValue(ctx, gid_val);
    JS_FreeValue(ctx, uid_val);
    JS_FreeValue(ctx, passwd_val);
    JS_FreeValue(ctx, name_val);
    JS_FreeValue(ctx, result_val);
    return JS_EXCEPTION;
#endif
}

static int interrupt_handler(JSRuntime *rt, void *opaque)
{
    return (os_pending_signals >> SIGINT) & 1;
}

static int get_bool_option(JSContext *ctx, BOOL *pbool,
                           JSValueConst obj,
                           const char *option)
{
    JSValue val;
    val = JS_GetPropertyStr(ctx, obj, option);
    if (JS_IsException(val))
        return -1;
    if (!JS_IsUndefined(val)) {
        *pbool = JS_ToBool(ctx, val);
    }
    JS_FreeValue(ctx, val);
    return 0;
}

void js_std_interrupt_handler_start(JSContext *ctx)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);

    if (!ts->recv_pipe && ++ts->eval_script_recurse == 1) {
        /* install the interrupt handler */
        JS_SetInterruptHandler(rt, interrupt_handler, NULL);
    }
}

void js_std_interrupt_handler_finish(JSContext *ctx, JSValue ret)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);

    if (!ts->recv_pipe && --ts->eval_script_recurse == 0) {
        /* remove the interrupt handler */
        JS_SetInterruptHandler(JS_GetRuntime(ctx), NULL, NULL);
        os_pending_signals &= ~((uint64_t)1 << SIGINT);
        /* convert the uncatchable "interrupted" error into a normal error
           so that it can be caught by the REPL */
        if (JS_IsException(ret))
            JS_ResetUncatchableError(ctx);
    }
}

static JSClassID js_std_file_class_id;

typedef struct {
    FILE *f;
    BOOL close_in_finalizer;
    BOOL is_popen;
} JSSTDFile;

static void js_std_file_finalizer(JSRuntime *rt, JSValue val)
{
    JSSTDFile *s = JS_GetOpaque(val, js_std_file_class_id);
    if (s) {
        if (s->f && s->close_in_finalizer) {
            if (s->is_popen)
                pclose(s->f);
            else
                fclose(s->f);
        }
        js_free_rt(rt, s);
    }
}

static JSValue js_std_parseExtJSON(JSContext *ctx, JSValueConst this_val,
                                   int argc, JSValueConst *argv)
{
    JSValue obj;
    const char *str;
    size_t len;

    str = JS_ToCStringLen(ctx, &len, argv[0]);
    if (!str)
        return JS_EXCEPTION;
    obj = JS_ParseJSON2(ctx, str, len, "<input>", JS_PARSE_JSON_EXT);
    JS_FreeCString(ctx, str);
    return obj;
}

static JSValue js_new_std_file(JSContext *ctx, FILE *f,
                               BOOL close_in_finalizer,
                               BOOL is_popen)
{
    JSSTDFile *s;
    JSValue obj;
    obj = JS_NewObjectClass(ctx, js_std_file_class_id);
    if (JS_IsException(obj))
        return obj;
    s = js_mallocz(ctx, sizeof(*s));
    if (!s) {
        JS_FreeValue(ctx, obj);
        return JS_EXCEPTION;
    }
    s->close_in_finalizer = close_in_finalizer;
    s->is_popen = is_popen;
    s->f = f;
    JS_SetOpaque(obj, s);
    return obj;
}

static JSValue js_std_isFILE(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    JSSTDFile *s = JS_GetOpaque(argv[0], js_std_file_class_id);
    if (s == NULL) {
        return JS_FALSE;
    } else {
        return JS_TRUE;
    }
}

static JSValue js_std_open(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    const char *filename, *mode = NULL;
    FILE *f;
    JSValue ret;

    if (argc != 2) {
        return JS_ThrowTypeError(ctx, "open must be called with two arguments: 'filename' and 'flags'. Instead, it was called with %d argument(s).", argc);
    }

    filename = JS_ToCString(ctx, argv[0]);
    if (!filename) {
        return JS_EXCEPTION;
    }
    mode = JS_ToCString(ctx, argv[1]);
    if (!mode) {
        JS_FreeCString(ctx, filename);
        return JS_EXCEPTION;
    }

    if (mode[strspn(mode, "rwa+b")] != '\0') {
        JS_ThrowTypeError(ctx, "invalid file mode: %s", mode);
        JS_AddPropertyToException(ctx, "filename", JS_NewString(ctx, filename));
        JS_AddPropertyToException(ctx, "mode", JS_NewString(ctx, mode));
        return JS_EXCEPTION;
    }

    f = fopen(filename, mode);
    if (!f) {
        JS_ThrowError(ctx, "%s (errno = %d, filename = %s, mode = %s)", strerror(errno), errno, filename, mode);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        JS_AddPropertyToException(ctx, "filename", JS_NewString(ctx, filename));
        JS_AddPropertyToException(ctx, "mode", JS_NewString(ctx, mode));

        JS_FreeCString(ctx, filename);
        JS_FreeCString(ctx, mode);

        return JS_EXCEPTION;
    }

    ret = js_new_std_file(ctx, f, TRUE, FALSE);
    JS_SetPropertyStr(ctx, ret, "target", JS_NewString(ctx, filename));

    JS_FreeCString(ctx, filename);
    JS_FreeCString(ctx, mode);

    return ret;
}

static JSValue js_std_popen(JSContext *ctx, JSValueConst this_val,
                            int argc, JSValueConst *argv)
{
    const char *filename, *mode = NULL;
    FILE *f;
    JSValue ret;

    if (argc != 2) {
        return JS_ThrowTypeError(ctx, "popen must be called with two arguments: 'filename' and 'flags'. Instead, it was called with %d argument(s).", argc);
    }

    filename = JS_ToCString(ctx, argv[0]);
    if (!filename) {
        return JS_EXCEPTION;
    }
    mode = JS_ToCString(ctx, argv[1]);
    if (!mode) {
        JS_FreeCString(ctx, filename);
        return JS_EXCEPTION;
    }
    if (mode[strspn(mode, "rw")] != '\0') {
        JS_ThrowTypeError(ctx, "invalid file mode: %s", mode);
        JS_AddPropertyToException(ctx, "filename", JS_NewString(ctx, filename));
        JS_AddPropertyToException(ctx, "mode", JS_NewString(ctx, mode));
        return JS_EXCEPTION;
    }

    f = popen(filename, mode);
    if (!f) {
        JS_ThrowError(ctx, "%s (errno = %d, filename = %s, mode = %s)", strerror(errno), errno, filename, mode);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        JS_AddPropertyToException(ctx, "filename", JS_NewString(ctx, filename));
        JS_AddPropertyToException(ctx, "mode", JS_NewString(ctx, mode));

        JS_FreeCString(ctx, filename);
        JS_FreeCString(ctx, mode);

        return JS_EXCEPTION;
    }

    ret = js_new_std_file(ctx, f, TRUE, FALSE);
    JS_SetPropertyStr(ctx, ret, "target", JS_NewString(ctx, filename));

    JS_FreeCString(ctx, filename);
    JS_FreeCString(ctx, mode);

    return ret;
}

static JSValue js_std_fdopen(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
    const char *mode;
    FILE *f;
    int fd;
    JSValue ret;

    if (argc != 2) {
        return JS_ThrowTypeError(ctx, "fdopen must be called with two arguments: 'fd' and 'flags'. Instead, it was called with %d argument(s).", argc);
    }

    if (JS_ToInt32(ctx, &fd, argv[0]))
        return JS_EXCEPTION;
    mode = JS_ToCString(ctx, argv[1]);
    if (!mode) {
        return JS_EXCEPTION;
    }
    if (mode[strspn(mode, "rwa+b")] != '\0') {
        JS_ThrowTypeError(ctx, "invalid file mode: %s", mode);
        JS_AddPropertyToException(ctx, "mode", JS_NewString(ctx, mode));
        return JS_EXCEPTION;
    }

    f = fdopen(fd, mode);
    if (!f) {
        JS_ThrowError(ctx, "%s (errno = %d, fd = %d, mode = %s)", strerror(errno), errno, fd, mode);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        JS_AddPropertyToException(ctx, "fd", JS_NewInt32(ctx, fd));
        JS_AddPropertyToException(ctx, "mode", JS_NewString(ctx, mode));

        JS_FreeCString(ctx, mode);

        return JS_EXCEPTION;
    }

    JS_FreeCString(ctx, mode);

    ret = js_new_std_file(ctx, f, TRUE, FALSE);
    JS_SetPropertyStr(ctx, ret, "target", JS_NewInt32(ctx, fd));
    return ret;
}

static JSValue js_std_tmpfile(JSContext *ctx, JSValueConst this_val,
                              int argc, JSValueConst *argv)
{
    FILE *f;
    JSValue ret;

    f = tmpfile();
    if (!f) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        return JS_EXCEPTION;
    }

    ret = js_new_std_file(ctx, f, TRUE, FALSE);
    JS_SetPropertyStr(ctx, ret, "target", JS_NewString(ctx, "tmpfile"));
    return ret;
}

static JSValue js_std_sprintf(JSContext *ctx, JSValueConst this_val,
                          int argc, JSValueConst *argv)
{
    return js_printf_internal(ctx, argc, argv, NULL);
}

static JSValue js_std_printf(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
    return js_printf_internal(ctx, argc, argv, stdout);
}

static JSValue js_std_strftime(JSContext *ctx, JSValueConst this_val,
                               int argc, JSValueConst *argv)
{
    int32_t max_bytes;
    double epoch_as_double;
    time_t epoch;
    struct tm time;
    size_t returned_str_size;
    JSValue output_str_val;
    const char *format_str = NULL;
    char *output_str = NULL;

    if (argc != 3) {
        return JS_ThrowTypeError(ctx, "strftime must be called with exactly three arguments: max bytes to write, a format string, and a Date object (or number).");
    }

    if (JS_ToInt32(ctx, &max_bytes, argv[0])) {
        return JS_EXCEPTION;
    }

    format_str = JS_ToCString(ctx, argv[1]);
    if (format_str == NULL) {
        return JS_EXCEPTION;
    }

    // Note: coerces Date to number here
    if (JS_ToFloat64(ctx, &epoch_as_double, argv[2])) {
        JS_FreeCString(ctx, format_str);
        return JS_EXCEPTION;
    }

    // JS epoch is in ms, but strftime epoch is in seconds, so divide by 1000
    epoch = (time_t) (epoch_as_double / 1000);
    if (!localtime_r(&epoch, &time)) {
        int err = errno;
        char *err_msg = strerror(err);
        JS_ThrowTypeError(ctx, "localtime_r failed: %s (errno = %d)", err_msg, err);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, err));
        JS_FreeCString(ctx, format_str);
        return JS_EXCEPTION;
    }

    output_str = js_malloc(ctx, (size_t) max_bytes);
    if (!output_str) {
        JS_FreeCString(ctx, format_str);
        return JS_EXCEPTION;
    }

    returned_str_size = strftime(output_str, (size_t) max_bytes, format_str, &time);
    JS_FreeCString(ctx, format_str);
    if (returned_str_size == 0) {
        js_free(ctx, output_str);
        return JS_ThrowRangeError(ctx, "specified size for formatted string was not large enough to hold it. call again with larger max bytes");
    }

    output_str_val = JS_NewStringLen(ctx, output_str, returned_str_size);
    js_free(ctx, output_str);
    return output_str_val;
}

static FILE *js_std_file_get(JSContext *ctx, JSValueConst obj)
{
    JSSTDFile *s = JS_GetOpaque2(ctx, obj, js_std_file_class_id);
    if (!s)
        return NULL;
    if (!s->f) {
        JS_ThrowTypeError(ctx, "invalid file handle");
        return NULL;
    }
    return s->f;
}

static JSValue js_std_file_puts(JSContext *ctx, JSValueConst this_val,
                                int argc, JSValueConst *argv, int magic)
{
    FILE *f;
    int i;
    const char *str;
    size_t len;

    if (magic == 0) {
        f = stdout;
    } else {
        f = js_std_file_get(ctx, this_val);
        if (!f)
            return JS_EXCEPTION;
    }

    for(i = 0; i < argc; i++) {
        str = JS_ToCStringLen(ctx, &len, argv[i]);
        if (!str)
            return JS_EXCEPTION;
        fwrite(str, 1, len, f);
        JS_FreeCString(ctx, str);
    }
    return JS_UNDEFINED;
}

static JSValue js_std_file_close(JSContext *ctx, JSValueConst this_val,
                                 int argc, JSValueConst *argv)
{
    JSSTDFile *s = JS_GetOpaque2(ctx, this_val, js_std_file_class_id);
    if (!s)
        return JS_EXCEPTION;
    if (!s->f)
        return JS_ThrowTypeError(ctx, "invalid file handle");
    if (s->is_popen) {
        if (pclose(s->f) < 0) {
            JS_ThrowTypeError(ctx, "failed to close file: %s (errno = %d)", strerror(errno), errno);
            JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
            return JS_EXCEPTION;
        }
    } else {
        if (fclose(s->f) < 0) {
            JS_ThrowTypeError(ctx, "failed to close file: %s (errno = %d)", strerror(errno), errno);
            JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
            return JS_EXCEPTION;
        }
    }
    s->f = NULL;
    return JS_UNDEFINED;
}

static JSValue js_std_file_printf(JSContext *ctx, JSValueConst this_val,
                                  int argc, JSValueConst *argv)
{
    FILE *f = js_std_file_get(ctx, this_val);
    if (!f)
        return JS_EXCEPTION;
    return js_printf_internal(ctx, argc, argv, f);
}

static JSValue js_std_file_flush(JSContext *ctx, JSValueConst this_val,
                                 int argc, JSValueConst *argv)
{
    FILE *f = js_std_file_get(ctx, this_val);
    if (!f)
        return JS_EXCEPTION;
    fflush(f);
    return JS_UNDEFINED;
}

static JSValue js_std_file_sync(JSContext *ctx, JSValueConst this_val,
                                 int argc, JSValueConst *argv)
{
    int fd;
    FILE *f = js_std_file_get(ctx, this_val);
    if (!f)
        return JS_EXCEPTION;

    fd = fileno(f);

    #ifdef _WIN32
    _commit(fd);
    #else
    fsync(fd);
    #endif

    return JS_UNDEFINED;
}

static JSValue js_std_file_tell(JSContext *ctx, JSValueConst this_val,
                                int argc, JSValueConst *argv, int is_bigint)
{
    FILE *f = js_std_file_get(ctx, this_val);
    int64_t pos;
    if (!f)
        return JS_EXCEPTION;
#if defined(__linux__)
    pos = ftello(f);
#else
    pos = ftell(f);
#endif
    if (is_bigint)
        return JS_NewBigInt64(ctx, pos);
    else
        return JS_NewInt64(ctx, pos);
}

static JSValue js_std_file_seek(JSContext *ctx, JSValueConst this_val,
                                int argc, JSValueConst *argv)
{
    FILE *f = js_std_file_get(ctx, this_val);
    int64_t pos;
    int whence, ret;
    if (!f)
        return JS_EXCEPTION;
    if (JS_ToInt64Ext(ctx, &pos, argv[0]))
        return JS_EXCEPTION;
    if (JS_ToInt32(ctx, &whence, argv[1]))
        return JS_EXCEPTION;
#if defined(__linux__)
    ret = fseeko(f, pos, whence);
#else
    ret = fseek(f, pos, whence);
#endif
    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        return JS_EXCEPTION;
    }

    return JS_UNDEFINED;
}

static JSValue js_std_file_eof(JSContext *ctx, JSValueConst this_val,
                               int argc, JSValueConst *argv)
{
    FILE *f = js_std_file_get(ctx, this_val);
    if (!f)
        return JS_EXCEPTION;
    return JS_NewBool(ctx, feof(f));
}

static JSValue js_std_file_fileno(JSContext *ctx, JSValueConst this_val,
                                  int argc, JSValueConst *argv)
{
    FILE *f = js_std_file_get(ctx, this_val);
    if (!f)
        return JS_EXCEPTION;
    return JS_NewInt32(ctx, fileno(f));
}

static JSValue js_std_file_writeTo(JSContext *ctx, JSValueConst this_val,
                                   int argc, JSValueConst *argv)
{
    FILE *self, *target;
    double bufsize_double, limit_double;
    size_t bufsize, limit, total_read, total_written;

    if (argc < 2) {
        return JS_ThrowTypeError(ctx, "writeTo must be called with at least two arguments: 'target' and 'bufferSize'. Instead, it was called with %d argument(s).", argc);
    }

    self = js_std_file_get(ctx, this_val);
    if (self == NULL) {
        return JS_EXCEPTION;
    }
    target = js_std_file_get(ctx, argv[0]);
    if (target == NULL) {
        return JS_EXCEPTION;
    }
    if (JS_ToFloat64(ctx, &bufsize_double, argv[1])) {
        return JS_EXCEPTION;
    }
    if (bufsize_double <= 0) {
        return JS_ThrowTypeError(ctx, "'bufferSize' must be greater than 0");
    }
    bufsize = (size_t) bufsize_double;

    if (argc == 3) {
        if (JS_ToFloat64(ctx, &limit_double, argv[2])) {
            return JS_EXCEPTION;
        }
        if (limit_double < 0) {
            return JS_ThrowTypeError(ctx, "'limit' cannot be negative");
        }
        limit = (size_t) limit_double;
    } else {
        limit = 0;
    }

    if (limit != 0 && limit < bufsize) {
        bufsize = limit;
    }

    total_read = 0;
    total_written = 0;
    {
        size_t bytes_to_read, bytes_read, bytes_written;
        BOOL is_final_write;
        uint8_t *buf;

        bytes_read = 0;
        bytes_written = 0;
        is_final_write = FALSE;

        buf = js_malloc(ctx, bufsize);
        if (buf == NULL) {
            return JS_EXCEPTION;
        }

        while (TRUE) {
            if (limit == 0) {
                bytes_to_read = bufsize;
            } else {
                bytes_to_read = limit - total_read;
                if (bytes_to_read > bufsize) {
                    bytes_to_read = bufsize;
                }
            }

            if (bytes_to_read <= 0) {
                break;
            }

            bytes_read = fread(buf, 1, bytes_to_read, self);
            total_read += bytes_read;
            if (bytes_read < bytes_to_read) {
                if (ferror(self)) {
                    js_free(ctx, buf);
                    JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
                    JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
                    JS_AddPropertyToException(ctx, "totalBytesWritten", JS_NewInt64(ctx, total_written));
                    JS_AddPropertyToException(ctx, "totalBytesRead", JS_NewInt64(ctx, total_read));
                    return JS_EXCEPTION;
                } else {
                    is_final_write = TRUE;
                }
            }

            // NOTE: fwrite is a no-op when bytes_read is 0
            bytes_written = fwrite(buf, 1, bytes_read, target);
            total_written += bytes_written;
            if (bytes_written < bytes_read) {
                if (ferror(target)) {
                    js_free(ctx, buf);
                    JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
                    JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
                    JS_AddPropertyToException(ctx, "totalBytesWritten", JS_NewInt64(ctx, total_written));
                    JS_AddPropertyToException(ctx, "totalBytesRead", JS_NewInt64(ctx, total_read));
                    return JS_EXCEPTION;
                } else {
                    js_free(ctx, buf);
                    JS_ThrowError(ctx, "Failed to write file: reached EOF before we were done writing data");
                    JS_AddPropertyToException(ctx, "attemptedWriteSize", JS_NewInt64(ctx, bytes_read));
                    JS_AddPropertyToException(ctx, "actualWriteSize", JS_NewInt64(ctx, bytes_written));
                    JS_AddPropertyToException(ctx, "totalBytesWritten", JS_NewInt64(ctx, total_written));
                    JS_AddPropertyToException(ctx, "totalBytesRead", JS_NewInt64(ctx, total_read));
                    return JS_EXCEPTION;
                }
            }

            if (is_final_write) {
                break;
            }
        }

        js_free(ctx, buf);
    }

    return JS_NewInt64(ctx, total_written);
}

static JSValue js_std_file_read_write(JSContext *ctx, JSValueConst this_val,
                                      int argc, JSValueConst *argv, int is_write)
{
    FILE *f = js_std_file_get(ctx, this_val);
    uint64_t pos, len;
    size_t size, ret;
    uint8_t *buf;

    if (!f)
        return JS_EXCEPTION;
    if (JS_ToIndex(ctx, &pos, argv[1]))
        return JS_EXCEPTION;
    if (JS_ToIndex(ctx, &len, argv[2]))
        return JS_EXCEPTION;
    buf = JS_GetArrayBuffer(ctx, &size, argv[0]);
    if (!buf)
        return JS_EXCEPTION;
    if (pos + len > size)
        return JS_ThrowRangeError(ctx, "read/write array buffer overflow");
    if (is_write) {
        ret = fwrite(buf + pos, 1, len, f);
    } else {
        ret = fread(buf + pos, 1, len, f);
    }

    if (ferror(f) != 0) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        return JS_EXCEPTION;
    }
    if (feof(f) != 0) {
        ret = 0;
    }

    return JS_NewInt64(ctx, ret);
}

/* XXX: could use less memory and go faster */
static JSValue js_std_file_getline(JSContext *ctx, JSValueConst this_val,
                                   int argc, JSValueConst *argv)
{
    FILE *f = js_std_file_get(ctx, this_val);
    int c;
    DynBuf dbuf;
    JSValue obj;

    if (!f)
        return JS_EXCEPTION;

    js_std_dbuf_init(ctx, &dbuf);
    for(;;) {
        c = fgetc(f);
        if (c == EOF) {
            if (dbuf.size == 0) {
                /* EOF */
                dbuf_free(&dbuf);
                return JS_NULL;
            } else {
                break;
            }
        }
        if (c == '\n')
            break;
        if (dbuf_putc(&dbuf, c)) {
            dbuf_free(&dbuf);
            return JS_ThrowOutOfMemory(ctx);
        }
    }
    obj = JS_NewStringLen(ctx, (const char *)dbuf.buf, dbuf.size);
    dbuf_free(&dbuf);
    return obj;
}

/* XXX: could use less memory and go faster */
static JSValue js_std_file_readAsString(JSContext *ctx, JSValueConst this_val,
                                        int argc, JSValueConst *argv)
{
    FILE *f = js_std_file_get(ctx, this_val);
    int c;
    DynBuf dbuf;
    JSValue obj;
    uint64_t max_size64;
    size_t max_size;
    JSValueConst max_size_val;

    if (!f)
        return JS_EXCEPTION;

    if (argc >= 1)
        max_size_val = argv[0];
    else
        max_size_val = JS_UNDEFINED;
    max_size = (size_t)-1;
    if (!JS_IsUndefined(max_size_val)) {
        if (JS_ToIndex(ctx, &max_size64, max_size_val))
            return JS_EXCEPTION;
        if (max_size64 < max_size)
            max_size = max_size64;
    }

    js_std_dbuf_init(ctx, &dbuf);
    while (max_size != 0) {
        c = fgetc(f);
        if (c == EOF)
            break;
        if (dbuf_putc(&dbuf, c)) {
            dbuf_free(&dbuf);
            return JS_EXCEPTION;
        }
        max_size--;
    }
    obj = JS_NewStringLen(ctx, (const char *)dbuf.buf, dbuf.size);
    dbuf_free(&dbuf);
    return obj;
}

static JSValue js_std_file_getByte(JSContext *ctx, JSValueConst this_val,
                                   int argc, JSValueConst *argv)
{
    FILE *f = js_std_file_get(ctx, this_val);
    if (!f)
        return JS_EXCEPTION;
    return JS_NewInt32(ctx, fgetc(f));
}

static JSValue js_std_file_putByte(JSContext *ctx, JSValueConst this_val,
                                   int argc, JSValueConst *argv)
{
    FILE *f = js_std_file_get(ctx, this_val);
    int c;
    if (!f)
        return JS_EXCEPTION;
    if (JS_ToInt32(ctx, &c, argv[0]))
        return JS_EXCEPTION;
    errno = 0;
    c = fputc(c, f);
    if (c == EOF) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));

        return JS_EXCEPTION;
    }
    return JS_UNDEFINED;
}


static JSValue js_std_file_setvbuf(JSContext *ctx, JSValueConst this_val,
                                   int argc, JSValueConst *argv)
{
    int mode;
    uint32_t size_uint;
    size_t size;
    FILE *f;

    if (argc != 2) {
        // we don't support changing the buffer
        return JS_ThrowTypeError(ctx, "setvbuf must be called exactly two arguments: 'mode' and 'size'.");
    }

    f = js_std_file_get(ctx, this_val);
    if (!f) {
        return JS_EXCEPTION;
    }

    if (JS_ToInt32(ctx, &mode, argv[0])) {
        return JS_EXCEPTION;
    }

    if (JS_ToUint32(ctx, &size_uint, argv[1])) {
        return JS_EXCEPTION;
    }

    size = (size_t)size_uint;

    if (mode != _IOFBF && mode != _IOLBF && mode != _IONBF) {
        JS_ThrowError(ctx, "'mode' argument must be either 'std._IOFBF', 'std._IOLBF', or 'std._IONBF'. Instead, received '%d'.", mode);
        JS_AddPropertyToException(ctx, "mode", JS_NewInt32(ctx, mode));

        return JS_EXCEPTION;
    }

    errno = 0;
    if (setvbuf(f, NULL, mode, size)) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));

        return JS_EXCEPTION;
    }

    return JS_UNDEFINED;
}

/* urlGet */

#define URL_GET_PROGRAM "curl -s -i -L"
#define URL_GET_BUF_SIZE 4096

static int http_get_header_line(FILE *f, char *buf, size_t buf_size,
                                DynBuf *dbuf)
{
    int c, read = 0;
    char *p;

    p = buf;
    for(;;) {
        c = fgetc(f);
        if (c < 0)
            return 0 - errno;
        read++;
        if ((p - buf) < buf_size - 1) {
            *p++ = c;
        } else {
            errno = EOVERFLOW;
            return 0 - errno;
        }
        if (dbuf)
            dbuf_putc(dbuf, c);
        if (c == '\n')
            break;
    }
    *p = '\0';
    return read;
}

static int http_get_status(const char *buf)
{
    const char *p = buf;
    while (*p != ' ' && *p != '\0')
        p++;
    if (*p != ' ')
        return 0;
    while (*p == ' ')
        p++;
    return atoi(p);
}

static JSValue js_std_urlGet(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
    const char *url;
    DynBuf cmd_buf;
    DynBuf data_buf_s, *data_buf = &data_buf_s;
    DynBuf header_buf_s, *header_buf = &header_buf_s;
    char *buf;
    size_t i, len;
    int c, status = 0, get_header_line_result, is_redirect;
    JSValue response = JS_UNDEFINED, ret_obj;
    JSValueConst options_obj;
    FILE *f;
    BOOL binary_flag, full_flag;

    url = JS_ToCString(ctx, argv[0]);
    if (!url)
        return JS_EXCEPTION;

    binary_flag = FALSE;
    full_flag = FALSE;

    if (argc >= 2) {
        options_obj = argv[1];

        if (get_bool_option(ctx, &binary_flag, options_obj, "binary"))
            goto fail_obj;

        if (get_bool_option(ctx, &full_flag, options_obj, "full")) {
        fail_obj:
            JS_FreeCString(ctx, url);
            return JS_EXCEPTION;
        }
    }

    js_std_dbuf_init(ctx, &cmd_buf);
    dbuf_printf(&cmd_buf, "%s ''", URL_GET_PROGRAM);
    len = strlen(url);
    for(i = 0; i < len; i++) {
        c = url[i];
        if (c == '\'' || c == '\\')
            dbuf_putc(&cmd_buf, '\\');
        dbuf_putc(&cmd_buf, c);
    }
    JS_FreeCString(ctx, url);
    dbuf_putstr(&cmd_buf, "''");
    dbuf_putc(&cmd_buf, '\0');
    if (dbuf_error(&cmd_buf)) {
        dbuf_free(&cmd_buf);
        return JS_EXCEPTION;
    }

    debugprint("Running curl: %s\n", (char *)cmd_buf.buf);

    f = popen((char *)cmd_buf.buf, "r");
    if (!f) {
        JS_ThrowTypeError(ctx, "could not start curl: %s", strerror(errno));
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        dbuf_free(&cmd_buf);
        return JS_EXCEPTION;
    } else {
        dbuf_free(&cmd_buf);
    }

    js_std_dbuf_init(ctx, data_buf);
    js_std_dbuf_init(ctx, header_buf);

    buf = js_malloc(ctx, URL_GET_BUF_SIZE);
    if (!buf)
        goto fail;

read_headers:
    /* get the HTTP status */
    get_header_line_result = http_get_header_line(f, buf, URL_GET_BUF_SIZE, NULL);
    if (get_header_line_result < 0) {
        JS_ThrowTypeError(ctx, "failed to read output from curl: %s", strerror(-get_header_line_result));
        goto fail;
    }
    status = http_get_status(buf);

    is_redirect = 300 <= status && status <= 399;

    /* wait until there is an empty line */
    for(;;) {
        get_header_line_result = http_get_header_line(f, buf, URL_GET_BUF_SIZE, is_redirect ? header_buf : NULL);
        if (get_header_line_result < 0) {
            JS_ThrowTypeError(ctx, "failed to read output from curl: %s", strerror(-get_header_line_result));
            goto fail;
        }
        if (!strcmp(buf, "\r\n"))
            break;
    }

    if (dbuf_error(header_buf))
        goto fail;

    if (header_buf->size >= 2) {
        header_buf->size -= 2; /* remove the trailing CRLF */
    }

    // if 3xx response code
    if (is_redirect) {
        debugprint("following redirect (%d)\n", status);
        goto read_headers;
    }

    /* download the data */
    for(;;) {
        errno = 0;
        len = fread(buf, 1, URL_GET_BUF_SIZE, f);
        if (len == 0)
            break;
        dbuf_put(data_buf, (uint8_t *)buf, len);
    }

    if (dbuf_error(data_buf))
        goto fail;
    if (binary_flag) {
        response = JS_NewArrayBufferCopy(ctx,
                                         data_buf->buf, data_buf->size);
    } else {
        response = JS_NewStringLen(ctx, (char *)data_buf->buf, data_buf->size);
    }
    if (JS_IsException(response))
        goto fail;

    js_free(ctx, buf);
    buf = NULL;
    pclose(f);
    f = NULL;
    dbuf_free(data_buf);
    data_buf = NULL;

    if (full_flag) {
        ret_obj = JS_NewObject(ctx);
        if (JS_IsException(ret_obj))
            goto fail;

        JS_DefinePropertyValueStr(ctx, ret_obj, "response",
                                  response,
                                  JS_PROP_C_W_E);

        JS_DefinePropertyValueStr(ctx, ret_obj, "responseHeaders",
                                      JS_NewStringLen(ctx, (char *)header_buf->buf,
                                                      header_buf->size),
                                      JS_PROP_C_W_E);

        JS_DefinePropertyValueStr(ctx, ret_obj, "status",
                                    JS_NewInt32(ctx, status),
                                    JS_PROP_C_W_E);
    } else {
        if (!(status >= 200 && status <= 299)) {
            ret_obj = JS_ThrowError(ctx, "HTTP response status code was %d. Url was: '%s'. To allow non-2xx status codes, pass the 'full' option to urlGet.", status, url);
        } else {
            ret_obj = response;
        }
    }
    dbuf_free(header_buf);
    return ret_obj;
 fail:
    if (f)
        pclose(f);
    js_free(ctx, buf);
    if (data_buf)
        dbuf_free(data_buf);
    if (header_buf)
        dbuf_free(header_buf);
    JS_FreeValue(ctx, response);
    return JS_EXCEPTION;
}

static JSClassDef js_std_file_class = {
    "FILE",
    .finalizer = js_std_file_finalizer,
};

static const JSCFunctionListEntry js_std_funcs[] = {
    JS_CFUNC_DEF("setExitCode", 1, js_std_setExitCode ),
    JS_CFUNC_DEF("getExitCode", 0, js_std_getExitCode ),
    JS_CFUNC_DEF("exit", 1, js_std_exit ),
    JS_CFUNC_DEF("getenv", 1, js_std_getenv ),
    JS_CFUNC_DEF("setenv", 1, js_std_setenv ),
    JS_CFUNC_DEF("unsetenv", 1, js_std_unsetenv ),
    JS_CFUNC_DEF("getenviron", 1, js_std_getenviron ),
    JS_CFUNC_DEF("getuid", 0, js_std_getuid ),
    JS_CFUNC_DEF("geteuid", 0, js_std_geteuid ),
    JS_CFUNC_DEF("getgid", 0, js_std_getgid ),
    JS_CFUNC_DEF("getegid", 0, js_std_getegid ),
    JS_CFUNC_DEF("getpwuid", 1, js_std_getpwuid ),
    JS_CFUNC_DEF("urlGet", 1, js_std_urlGet ),
    JS_CFUNC_DEF("loadFile", 1, js_std_loadFile ),
    JS_CFUNC_DEF("parseExtJSON", 1, js_std_parseExtJSON ),

    /* FILE I/O */
    JS_CFUNC_DEF("isFILE", 1, js_std_isFILE ),
    JS_CFUNC_DEF("open", 2, js_std_open ),
    JS_CFUNC_DEF("popen", 2, js_std_popen ),
    JS_CFUNC_DEF("fdopen", 2, js_std_fdopen ),
    JS_CFUNC_DEF("tmpfile", 0, js_std_tmpfile ),
    JS_CFUNC_MAGIC_DEF("puts", 1, js_std_file_puts, 0 ),
    JS_CFUNC_DEF("printf", 1, js_std_printf ),
    JS_CFUNC_DEF("sprintf", 1, js_std_sprintf ),
    JS_CFUNC_DEF("strftime", 3, js_std_strftime ),
    JS_PROP_INT32_DEF("SEEK_SET", SEEK_SET, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("SEEK_CUR", SEEK_CUR, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("SEEK_END", SEEK_END, JS_PROP_CONFIGURABLE ),

    JS_PROP_INT32_DEF("_IOFBF", _IOFBF, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("_IOLBF", _IOLBF, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("_IONBF", _IONBF, JS_PROP_CONFIGURABLE ),
};

static const JSCFunctionListEntry js_std_file_proto_funcs[] = {
    JS_PROP_STRING_DEF("[Symbol.toStringTag]", "FILE", JS_PROP_CONFIGURABLE ),

    JS_CFUNC_DEF("close", 0, js_std_file_close ),
    JS_CFUNC_MAGIC_DEF("puts", 1, js_std_file_puts, 1 ),
    JS_CFUNC_DEF("printf", 1, js_std_file_printf ),
    JS_CFUNC_DEF("flush", 0, js_std_file_flush ),
    JS_CFUNC_DEF("sync", 0, js_std_file_sync ),
    JS_CFUNC_MAGIC_DEF("tell", 0, js_std_file_tell, 0 ),
    JS_CFUNC_MAGIC_DEF("tello", 0, js_std_file_tell, 1 ),
    JS_CFUNC_DEF("seek", 2, js_std_file_seek ),
    JS_CFUNC_DEF("eof", 0, js_std_file_eof ),
    JS_CFUNC_DEF("fileno", 0, js_std_file_fileno ),
    JS_CFUNC_MAGIC_DEF("read", 3, js_std_file_read_write, 0 ),
    JS_CFUNC_MAGIC_DEF("write", 3, js_std_file_read_write, 1 ),
    JS_CFUNC_DEF("writeTo", 3, js_std_file_writeTo ),
    JS_CFUNC_DEF("getline", 0, js_std_file_getline ),
    JS_CFUNC_DEF("readAsString", 0, js_std_file_readAsString ),
    JS_CFUNC_DEF("getByte", 0, js_std_file_getByte ),
    JS_CFUNC_DEF("putByte", 1, js_std_file_putByte ),
    JS_CFUNC_DEF("setvbuf", 2, js_std_file_setvbuf ),
};

static int js_std_init(JSContext *ctx, JSModuleDef *m)
{
    JSValue proto;
    JSValue stdin_FILE;
    JSValue stdout_FILE;
    JSValue stderr_FILE;

    /* FILE class */
    /* the class ID is created once */
    JS_NewClassID(&js_std_file_class_id);
    /* the class is created once per runtime */
    JS_NewClass(JS_GetRuntime(ctx), js_std_file_class_id, &js_std_file_class);
    proto = JS_NewObject(ctx);
    JS_SetPropertyFunctionList(ctx, proto, js_std_file_proto_funcs,
                               countof(js_std_file_proto_funcs));
    JS_SetClassProto(ctx, js_std_file_class_id, proto);

    JS_SetModuleExportList(ctx, m, js_std_funcs,
                           countof(js_std_funcs));

    stdin_FILE = js_new_std_file(ctx, stdin, FALSE, FALSE);
    JS_SetPropertyStr(ctx, stdin_FILE, "target", JS_NewString(ctx, "stdin"));
    JS_SetModuleExport(ctx, m, "in", stdin_FILE);

    stdout_FILE = js_new_std_file(ctx, stdout, FALSE, FALSE);
    JS_SetPropertyStr(ctx, stdout_FILE, "target", JS_NewString(ctx, "stdout"));
    JS_SetModuleExport(ctx, m, "out", stdout_FILE);

    stderr_FILE = js_new_std_file(ctx, stderr, FALSE, FALSE);
    JS_SetPropertyStr(ctx, stderr_FILE, "target", JS_NewString(ctx, "stderr"));
    JS_SetModuleExport(ctx, m, "err", stderr_FILE);

    return 0;
}

JSModuleDef *js_init_module_std(JSContext *ctx, const char *module_name)
{
    JSModuleDef *m;
    m = JS_NewCModule(ctx, module_name, js_std_init, NULL);
    if (!m)
        return NULL;
    JS_AddModuleExportList(ctx, m, js_std_funcs, countof(js_std_funcs));
    JS_AddModuleExport(ctx, m, "in");
    JS_AddModuleExport(ctx, m, "out");
    JS_AddModuleExport(ctx, m, "err");
    return m;
}

/**********************************************************/
/* 'quickjs:os' module */

static JSValue js_os_open(JSContext *ctx, JSValueConst this_val,
                          int argc, JSValueConst *argv)
{
    const char *filename;
    int flags, mode, ret;

    filename = JS_ToCString(ctx, argv[0]);
    if (!filename)
        return JS_EXCEPTION;
    if (JS_ToInt32(ctx, &flags, argv[1])) {
        JS_FreeCString(ctx, filename);
        return JS_EXCEPTION;
    }
    if (argc >= 3 && !JS_IsUndefined(argv[2])) {
        if (JS_ToInt32(ctx, &mode, argv[2])) {
            JS_FreeCString(ctx, filename);
            return JS_EXCEPTION;
        }
    } else {
        mode = 0666;
    }
#if defined(_WIN32)
    /* force binary mode by default */
    if (!(flags & O_TEXT))
        flags |= O_BINARY;
#endif
    ret = open(filename, flags, mode);
    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d, filename = %s)", strerror(errno), errno, filename);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        JS_AddPropertyToException(ctx, "filename", JS_NewString(ctx, filename));

        JS_FreeCString(ctx, filename);

        return JS_EXCEPTION;
    }
    JS_FreeCString(ctx, filename);
    return JS_NewInt32(ctx, ret);
}

static JSValue js_os_close(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    int fd, ret;
    if (JS_ToInt32(ctx, &fd, argv[0]))
        return JS_EXCEPTION;
    ret = close(fd);
    if (ret == 0) {
        return JS_UNDEFINED;
    } else {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        return JS_EXCEPTION;
    }
}

static JSValue js_os_seek(JSContext *ctx, JSValueConst this_val,
                          int argc, JSValueConst *argv)
{
    int fd, whence;
    int64_t pos, ret;
    BOOL is_bigint;

    if (JS_ToInt32(ctx, &fd, argv[0]))
        return JS_EXCEPTION;
    is_bigint = JS_IsBigInt(ctx, argv[1]);
    if (JS_ToInt64Ext(ctx, &pos, argv[1]))
        return JS_EXCEPTION;
    if (JS_ToInt32(ctx, &whence, argv[2]))
        return JS_EXCEPTION;
    ret = lseek(fd, pos, whence);
    if (ret == -1)
        ret = -errno;
    if (is_bigint)
        return JS_NewBigInt64(ctx, ret);
    else
        return JS_NewInt64(ctx, ret);
}

static JSValue js_os_read_write(JSContext *ctx, JSValueConst this_val,
                                      int argc, JSValueConst *argv, int magic)
{
    int fd;
    uint64_t pos, len;
    size_t size;
    ssize_t ret;
    uint8_t *buf;

    if (JS_ToInt32(ctx, &fd, argv[0]))
        return JS_EXCEPTION;
    if (JS_ToIndex(ctx, &pos, argv[2]))
        return JS_EXCEPTION;
    if (JS_ToIndex(ctx, &len, argv[3]))
        return JS_EXCEPTION;
    buf = JS_GetArrayBuffer(ctx, &size, argv[1]);
    if (!buf)
        return JS_EXCEPTION;
    if (pos + len > size)
        return JS_ThrowRangeError(ctx, "read/write array buffer overflow");
    if (magic)
        ret = write(fd, buf + pos, len);
    else
        ret = read(fd, buf + pos, len);

    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        return JS_EXCEPTION;
    } else {
        return JS_NewInt64(ctx, ret);
    }
}

static JSValue js_os_isatty(JSContext *ctx, JSValueConst this_val,
                            int argc, JSValueConst *argv)
{
    int fd;
    if (JS_ToInt32(ctx, &fd, argv[0]))
        return JS_EXCEPTION;
    return JS_NewBool(ctx, (isatty(fd) != 0));
}

#if defined(_WIN32)
static JSValue js_os_ttyGetWinSize(JSContext *ctx, JSValueConst this_val,
                                   int argc, JSValueConst *argv)
{
    int fd;
    HANDLE handle;
    CONSOLE_SCREEN_BUFFER_INFO info;
    JSValue obj;

    if (JS_ToInt32(ctx, &fd, argv[0]))
        return JS_EXCEPTION;
    handle = (HANDLE)_get_osfhandle(fd);

    if (!GetConsoleScreenBufferInfo(handle, &info))
        return JS_NULL;
    obj = JS_NewArray(ctx);
    if (JS_IsException(obj))
        return obj;
    JS_DefinePropertyValueUint32(ctx, obj, 0, JS_NewInt32(ctx, info.dwSize.X), JS_PROP_C_W_E);
    JS_DefinePropertyValueUint32(ctx, obj, 1, JS_NewInt32(ctx, info.dwSize.Y), JS_PROP_C_W_E);
    return obj;
}

/* Windows 10 built-in VT100 emulation */
#define __ENABLE_VIRTUAL_TERMINAL_PROCESSING 0x0004
#define __ENABLE_VIRTUAL_TERMINAL_INPUT 0x0200

static JSValue js_os_ttySetRaw(JSContext *ctx, JSValueConst this_val,
                               int argc, JSValueConst *argv)
{
    int fd;
    HANDLE handle;

    if (JS_ToInt32(ctx, &fd, argv[0]))
        return JS_EXCEPTION;
    handle = (HANDLE)_get_osfhandle(fd);
    SetConsoleMode(handle, ENABLE_WINDOW_INPUT | __ENABLE_VIRTUAL_TERMINAL_INPUT);
    _setmode(fd, _O_BINARY);
    if (fd == 0) {
        handle = (HANDLE)_get_osfhandle(1); /* corresponding output */
        SetConsoleMode(handle, ENABLE_PROCESSED_OUTPUT | ENABLE_WRAP_AT_EOL_OUTPUT | __ENABLE_VIRTUAL_TERMINAL_PROCESSING);
    }
    return JS_UNDEFINED;
}
#else
static JSValue js_os_ttyGetWinSize(JSContext *ctx, JSValueConst this_val,
                                   int argc, JSValueConst *argv)
{
    int fd;
    struct winsize ws;
    JSValue obj;

    if (JS_ToInt32(ctx, &fd, argv[0]))
        return JS_EXCEPTION;
    if (ioctl(fd, TIOCGWINSZ, &ws) == 0 &&
        ws.ws_col >= 4 && ws.ws_row >= 4) {
        obj = JS_NewArray(ctx);
        if (JS_IsException(obj))
            return obj;
        JS_DefinePropertyValueUint32(ctx, obj, 0, JS_NewInt32(ctx, ws.ws_col), JS_PROP_C_W_E);
        JS_DefinePropertyValueUint32(ctx, obj, 1, JS_NewInt32(ctx, ws.ws_row), JS_PROP_C_W_E);
        return obj;
    } else {
        return JS_NULL;
    }
}

static struct termios oldtty;

static void term_exit(void)
{
    tcsetattr(0, TCSANOW, &oldtty);
}

/* XXX: should add a way to go back to normal mode */
static JSValue js_os_ttySetRaw(JSContext *ctx, JSValueConst this_val,
                               int argc, JSValueConst *argv)
{
    struct termios tty;
    int fd;

    if (JS_ToInt32(ctx, &fd, argv[0]))
        return JS_EXCEPTION;

    memset(&tty, 0, sizeof(tty));
    tcgetattr(fd, &tty);
    oldtty = tty;

    tty.c_iflag &= ~(IGNBRK|BRKINT|PARMRK|ISTRIP
                          |INLCR|IGNCR|ICRNL|IXON);
    tty.c_oflag |= OPOST;
    tty.c_lflag &= ~(ECHO|ECHONL|ICANON|IEXTEN);
    tty.c_cflag &= ~(CSIZE|PARENB);
    tty.c_cflag |= CS8;
    tty.c_cc[VMIN] = 1;
    tty.c_cc[VTIME] = 0;

    tcsetattr(fd, TCSANOW, &tty);

    atexit(term_exit);
    return JS_UNDEFINED;
}

#endif /* !_WIN32 */

static JSValue js_os_remove(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
    const char *filename;
    int ret, err;

    filename = JS_ToCString(ctx, argv[0]);
    if (!filename)
        return JS_EXCEPTION;
#if defined(_WIN32)
    {
        struct stat st;
        if (stat(filename, &st) == 0 && S_ISDIR(st.st_mode)) {
            ret = rmdir(filename);
        } else {
            ret = unlink(filename);
        }
    }
#else
    ret = remove(filename);
#endif
    err = errno;
    JS_FreeCString(ctx, filename);
    if (ret == 0) {
        return JS_UNDEFINED;
    } else {
        return JS_ThrowError(ctx, "%s (errno = %d)", strerror(err), err);
    }
}

static JSValue js_os_rename(JSContext *ctx, JSValueConst this_val,
                            int argc, JSValueConst *argv)
{
    const char *oldpath, *newpath;
    int ret, err;

    oldpath = JS_ToCString(ctx, argv[0]);
    if (!oldpath)
        return JS_EXCEPTION;
    newpath = JS_ToCString(ctx, argv[1]);
    if (!newpath) {
        JS_FreeCString(ctx, oldpath);
        return JS_EXCEPTION;
    }
    ret = rename(oldpath, newpath);
    err = errno;
    JS_FreeCString(ctx, oldpath);
    JS_FreeCString(ctx, newpath);
    if (ret == 0) {
        return JS_UNDEFINED;
    } else {
        return JS_ThrowError(ctx, "%s (errno = %d)", strerror(err), err);
    }
}

static JSOSRWHandler *find_rh(JSThreadState *ts, int fd)
{
    JSOSRWHandler *rh;
    struct list_head *el;

    list_for_each(el, &ts->os_rw_handlers) {
        rh = list_entry(el, JSOSRWHandler, link);
        if (rh->fd == fd)
            return rh;
    }
    return NULL;
}

static void free_rw_handler(JSRuntime *rt, JSOSRWHandler *rh)
{
    int i;
    list_del(&rh->link);
    for(i = 0; i < 2; i++) {
        JS_FreeValueRT(rt, rh->rw_func[i]);
    }
    js_free_rt(rt, rh);
}

static JSValue js_os_setReadHandler(JSContext *ctx, JSValueConst this_val,
                                    int argc, JSValueConst *argv, int magic)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    JSOSRWHandler *rh;
    int fd;
    JSValueConst func;

    if (JS_ToInt32(ctx, &fd, argv[0]))
        return JS_EXCEPTION;
    func = argv[1];
    if (JS_IsNull(func)) {
        rh = find_rh(ts, fd);
        if (rh) {
            JS_FreeValue(ctx, rh->rw_func[magic]);
            rh->rw_func[magic] = JS_NULL;
            if (JS_IsNull(rh->rw_func[0]) &&
                JS_IsNull(rh->rw_func[1])) {
                /* remove the entry */
                free_rw_handler(JS_GetRuntime(ctx), rh);
            }
        }
    } else {
        if (!JS_IsFunction(ctx, func))
            return JS_ThrowTypeError(ctx, "second argument to os.setReadHandler was not a function.");
        rh = find_rh(ts, fd);
        if (!rh) {
            rh = js_mallocz(ctx, sizeof(*rh));
            if (!rh)
                return JS_EXCEPTION;
            rh->fd = fd;
            rh->rw_func[0] = JS_NULL;
            rh->rw_func[1] = JS_NULL;
            list_add_tail(&rh->link, &ts->os_rw_handlers);
        }
        JS_FreeValue(ctx, rh->rw_func[magic]);
        rh->rw_func[magic] = JS_DupValue(ctx, func);
    }
    return JS_UNDEFINED;
}

static JSOSSignalHandler *find_sh(JSThreadState *ts, int sig_num)
{
    JSOSSignalHandler *sh;
    struct list_head *el;
    list_for_each(el, &ts->os_signal_handlers) {
        sh = list_entry(el, JSOSSignalHandler, link);
        if (sh->sig_num == sig_num)
            return sh;
    }
    return NULL;
}

static void free_sh(JSRuntime *rt, JSOSSignalHandler *sh)
{
    list_del(&sh->link);
    JS_FreeValueRT(rt, sh->func);
    js_free_rt(rt, sh);
}

static void os_signal_handler(int sig_num)
{
    os_pending_signals |= ((uint64_t)1 << sig_num);
}

#if defined(_WIN32)
typedef void (*sighandler_t)(int sig_num);
#endif

static JSValue js_os_signal(JSContext *ctx, JSValueConst this_val,
                            int argc, JSValueConst *argv)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    JSOSSignalHandler *sh;
    uint32_t sig_num;
    JSValueConst func;
    sighandler_t handler;

    if (!js_std_is_main_thread(rt))
        return JS_ThrowTypeError(ctx, "signal handler can only be set in the main thread");

    if (JS_ToUint32(ctx, &sig_num, argv[0]))
        return JS_EXCEPTION;
    if (sig_num >= 64)
        return JS_ThrowRangeError(ctx, "invalid signal number");
    func = argv[1];
    /* func = null: SIG_DFL, func = undefined, SIG_IGN */
    if (JS_IsNull(func) || JS_IsUndefined(func)) {
        sh = find_sh(ts, sig_num);
        if (sh) {
            free_sh(JS_GetRuntime(ctx), sh);
        }
        if (JS_IsNull(func))
            handler = SIG_DFL;
        else
            handler = SIG_IGN;
        signal(sig_num, handler);
    } else {
        if (!JS_IsFunction(ctx, func))
            return JS_ThrowTypeError(ctx, "second argument to os.signal was not a function.");
        sh = find_sh(ts, sig_num);
        if (!sh) {
            sh = js_mallocz(ctx, sizeof(*sh));
            if (!sh)
                return JS_EXCEPTION;
            sh->sig_num = sig_num;
            list_add_tail(&sh->link, &ts->os_signal_handlers);
        }
        JS_FreeValue(ctx, sh->func);
        sh->func = JS_DupValue(ctx, func);
        signal(sig_num, os_signal_handler);
    }
    return JS_UNDEFINED;
}

#if defined(__linux__) || defined(__APPLE__)
static int64_t get_time_ms(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint64_t)ts.tv_sec * 1000 + (ts.tv_nsec / 1000000);
}
#else
/* more portable, but does not work if the date is updated */
static int64_t get_time_ms(void)
{
    struct timeval tv;
    gettimeofday(&tv, NULL);
    return (int64_t)tv.tv_sec * 1000 + (tv.tv_usec / 1000);
}
#endif

static void unlink_timer(JSRuntime *rt, JSOSTimer *th)
{
    if (th->link.prev) {
        list_del(&th->link);
        th->link.prev = th->link.next = NULL;
    }
}

static void free_timer(JSRuntime *rt, JSOSTimer *th)
{
    JS_FreeValueRT(rt, th->func);
    js_free_rt(rt, th);
}

static JSClassID js_os_timer_class_id;

static void js_os_timer_finalizer(JSRuntime *rt, JSValue val)
{
    JSOSTimer *th = JS_GetOpaque(val, js_os_timer_class_id);
    if (th) {
        th->has_object = FALSE;
        if (!th->link.prev)
            free_timer(rt, th);
    }
}

static void js_os_timer_mark(JSRuntime *rt, JSValueConst val,
                             JS_MarkFunc *mark_func)
{
    JSOSTimer *th = JS_GetOpaque(val, js_os_timer_class_id);
    if (th) {
        JS_MarkValue(rt, th->func, mark_func);
    }
}

static JSValue js_os_setTimeout(JSContext *ctx, JSValueConst this_val,
                                int argc, JSValueConst *argv)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    int64_t delay;
    JSValueConst func;
    JSOSTimer *th;
    JSValue obj;

    func = argv[0];
    if (!JS_IsFunction(ctx, func))
        return JS_ThrowTypeError(ctx, "first argument to setTimeout was not a function");
    if (JS_ToInt64(ctx, &delay, argv[1]))
        return JS_EXCEPTION;
    obj = JS_NewObjectClass(ctx, js_os_timer_class_id);
    if (JS_IsException(obj))
        return obj;
    th = js_mallocz(ctx, sizeof(*th));
    if (!th) {
        JS_FreeValue(ctx, obj);
        return JS_EXCEPTION;
    }
    th->has_object = TRUE;
    th->timeout = get_time_ms() + delay;
    th->func = JS_DupValue(ctx, func);
    list_add_tail(&th->link, &ts->os_timers);
    JS_SetOpaque(obj, th);
    return obj;
}

static JSValue js_os_clearTimeout(JSContext *ctx, JSValueConst this_val,
                                  int argc, JSValueConst *argv)
{
    JSOSTimer *th = JS_GetOpaque(argv[0], js_os_timer_class_id);
    if (th == NULL) {
        return JS_UNDEFINED;
    }

    unlink_timer(JS_GetRuntime(ctx), th);
    return JS_UNDEFINED;
}

static JSClassDef js_os_timer_class = {
    "OSTimer",
    .finalizer = js_os_timer_finalizer,
    .gc_mark = js_os_timer_mark,
};


static const JSCFunctionListEntry js_os_timer_proto_funcs[] = {
    JS_PROP_STRING_DEF("[Symbol.toStringTag]", "OSTimer", JS_PROP_CONFIGURABLE ),
};

static void call_handler(JSContext *ctx, JSValueConst func)
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

#if defined(_WIN32)

static int js_os_poll(JSContext *ctx)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    int min_delay, console_fd;
    int64_t cur_time, delay;
    JSOSRWHandler *rh;
    struct list_head *el;

    /* XXX: handle signals if useful */

    if (list_empty(&ts->os_rw_handlers) && list_empty(&ts->os_timers))
        return -1; /* no more events */

    /* XXX: only timers and basic console input are supported */
    if (!list_empty(&ts->os_timers)) {
        cur_time = get_time_ms();
        min_delay = 10000;
        list_for_each(el, &ts->os_timers) {
            JSOSTimer *th = list_entry(el, JSOSTimer, link);
            delay = th->timeout - cur_time;
            if (delay <= 0) {
                JSValue func;
                /* the timer expired */
                func = th->func;
                th->func = JS_UNDEFINED;
                unlink_timer(rt, th);
                if (!th->has_object)
                    free_timer(rt, th);
                call_handler(ctx, func);
                JS_FreeValue(ctx, func);
                return 0;
            } else if (delay < min_delay) {
                min_delay = delay;
            }
        }
    } else {
        min_delay = -1;
    }

    console_fd = -1;
    list_for_each(el, &ts->os_rw_handlers) {
        rh = list_entry(el, JSOSRWHandler, link);
        if (rh->fd == 0 && !JS_IsNull(rh->rw_func[0])) {
            console_fd = rh->fd;
            break;
        }
    }

    if (console_fd >= 0) {
        DWORD ti, ret;
        HANDLE handle;
        if (min_delay == -1)
            ti = INFINITE;
        else
            ti = min_delay;
        handle = (HANDLE)_get_osfhandle(console_fd);
        ret = WaitForSingleObject(handle, ti);
        if (ret == WAIT_OBJECT_0) {
            list_for_each(el, &ts->os_rw_handlers) {
                rh = list_entry(el, JSOSRWHandler, link);
                if (rh->fd == console_fd && !JS_IsNull(rh->rw_func[0])) {
                    call_handler(ctx, rh->rw_func[0]);
                    /* must stop because the list may have been modified */
                    break;
                }
            }
        }
    } else {
        Sleep(min_delay);
    }
    return 0;
}
#else

#ifdef USE_WORKER

static void js_free_message(JSWorkerMessage *msg);

/* return 1 if a message was handled, 0 if no message */
static int handle_posted_message(JSRuntime *rt, JSContext *ctx,
                                 JSWorkerMessageHandler *port)
{
    JSWorkerMessagePipe *ps = port->recv_pipe;
    int ret;
    struct list_head *el;
    JSWorkerMessage *msg;
    JSValue obj, data_obj, func, retval;

    pthread_mutex_lock(&ps->mutex);
    if (!list_empty(&ps->msg_queue)) {
        el = ps->msg_queue.next;
        msg = list_entry(el, JSWorkerMessage, link);

        /* remove the message from the queue */
        list_del(&msg->link);

        if (list_empty(&ps->msg_queue)) {
            uint8_t buf[16];
            int ret;
            for(;;) {
                ret = read(ps->read_fd, buf, sizeof(buf));
                if (ret >= 0)
                    break;
                if (errno != EAGAIN && errno != EINTR)
                    break;
            }
        }

        pthread_mutex_unlock(&ps->mutex);

        data_obj = JS_ReadObject(ctx, msg->data, msg->data_len,
                                 JS_READ_OBJ_SAB | JS_READ_OBJ_REFERENCE);

        js_free_message(msg);

        if (JS_IsException(data_obj))
            goto fail;
        obj = JS_NewObject(ctx);
        if (JS_IsException(obj)) {
            JS_FreeValue(ctx, data_obj);
            goto fail;
        }
        JS_DefinePropertyValueStr(ctx, obj, "data", data_obj, JS_PROP_C_W_E);

        /* 'func' might be destroyed when calling itself (if it frees the
           handler), so must take extra care */
        func = JS_DupValue(ctx, port->on_message_func);
        retval = JS_Call(ctx, func, JS_UNDEFINED, 1, (JSValueConst *)&obj);
        JS_FreeValue(ctx, obj);
        JS_FreeValue(ctx, func);
        if (JS_IsException(retval)) {
        fail:
            QJU_PrintException(ctx, stderr);
        } else {
            JS_FreeValue(ctx, retval);
        }
        ret = 1;
    } else {
        pthread_mutex_unlock(&ps->mutex);
        ret = 0;
    }
    return ret;
}
#else
static int handle_posted_message(JSRuntime *rt, JSContext *ctx,
                                 JSWorkerMessageHandler *port)
{
    return 0;
}
#endif

static int js_os_poll(JSContext *ctx)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    int ret, fd_max, min_delay;
    int64_t cur_time, delay;
    fd_set rfds, wfds;
    JSOSRWHandler *rh;
    struct list_head *el;
    struct timeval tv, *tvp;

    /* only check signals in the main thread */
    if (!ts->recv_pipe &&
        unlikely(os_pending_signals != 0)) {
        JSOSSignalHandler *sh;
        uint64_t mask;

        list_for_each(el, &ts->os_signal_handlers) {
            sh = list_entry(el, JSOSSignalHandler, link);
            mask = (uint64_t)1 << sh->sig_num;
            if (os_pending_signals & mask) {
                os_pending_signals &= ~mask;
                call_handler(ctx, sh->func);
                return 0;
            }
        }
    }

    if (list_empty(&ts->os_rw_handlers) && list_empty(&ts->os_timers) &&
        list_empty(&ts->port_list))
        return -1; /* no more events */

    if (!list_empty(&ts->os_timers)) {
        cur_time = get_time_ms();
        min_delay = 10000;
        list_for_each(el, &ts->os_timers) {
            JSOSTimer *th = list_entry(el, JSOSTimer, link);
            delay = th->timeout - cur_time;
            if (delay <= 0) {
                JSValue func;
                /* the timer expired */
                func = th->func;
                th->func = JS_UNDEFINED;
                unlink_timer(rt, th);
                if (!th->has_object)
                    free_timer(rt, th);
                call_handler(ctx, func);
                JS_FreeValue(ctx, func);
                return 0;
            } else if (delay < min_delay) {
                min_delay = delay;
            }
        }
        tv.tv_sec = min_delay / 1000;
        tv.tv_usec = (min_delay % 1000) * 1000;
        tvp = &tv;
    } else {
        tvp = NULL;
    }

    FD_ZERO(&rfds);
    FD_ZERO(&wfds);
    fd_max = -1;
    list_for_each(el, &ts->os_rw_handlers) {
        rh = list_entry(el, JSOSRWHandler, link);
        fd_max = max_int(fd_max, rh->fd);
        if (!JS_IsNull(rh->rw_func[0]))
            FD_SET(rh->fd, &rfds);
        if (!JS_IsNull(rh->rw_func[1]))
            FD_SET(rh->fd, &wfds);
    }

    list_for_each(el, &ts->port_list) {
        JSWorkerMessageHandler *port = list_entry(el, JSWorkerMessageHandler, link);
        if (!JS_IsNull(port->on_message_func)) {
            JSWorkerMessagePipe *ps = port->recv_pipe;
            fd_max = max_int(fd_max, ps->read_fd);
            FD_SET(ps->read_fd, &rfds);
        }
    }

    ret = select(fd_max + 1, &rfds, &wfds, NULL, tvp);
    if (ret > 0) {
        list_for_each(el, &ts->os_rw_handlers) {
            rh = list_entry(el, JSOSRWHandler, link);
            if (!JS_IsNull(rh->rw_func[0]) &&
                FD_ISSET(rh->fd, &rfds)) {
                call_handler(ctx, rh->rw_func[0]);
                /* must stop because the list may have been modified */
                goto done;
            }
            if (!JS_IsNull(rh->rw_func[1]) &&
                FD_ISSET(rh->fd, &wfds)) {
                call_handler(ctx, rh->rw_func[1]);
                /* must stop because the list may have been modified */
                goto done;
            }
        }

        list_for_each(el, &ts->port_list) {
            JSWorkerMessageHandler *port = list_entry(el, JSWorkerMessageHandler, link);
            if (!JS_IsNull(port->on_message_func)) {
                JSWorkerMessagePipe *ps = port->recv_pipe;
                if (FD_ISSET(ps->read_fd, &rfds)) {
                    if (handle_posted_message(rt, ctx, port))
                        goto done;
                }
            }
        }
    }
    done:
    return 0;
}
#endif /* !_WIN32 */

static JSValue js_os_getcwd(JSContext *ctx, JSValueConst this_val,
                            int argc, JSValueConst *argv)
{
    char buf[PATH_MAX];

    if (!getcwd(buf, sizeof(buf))) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        return JS_EXCEPTION;
    } else {
        return JS_NewString(ctx, buf);
    }
}

static JSValue js_os_chdir(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    const char *target;
    int ret, err;

    target = JS_ToCString(ctx, argv[0]);
    if (!target)
        return JS_EXCEPTION;

    ret = chdir(target);
    err = errno;
    if (ret != 0) {
        JS_ThrowError(ctx, "%s (errno = %d, target = %s)", strerror(err), err, target);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, err));
        JS_AddPropertyToException(ctx, "target", JS_NewString(ctx, target));

        JS_FreeCString(ctx, target);

        return JS_EXCEPTION;
    } else {
        JS_FreeCString(ctx, target);
        return JS_UNDEFINED;
    }
}

static JSValue js_os_mkdir(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    int mode, ret, err;
    const char *path;

    if (argc >= 2) {
        if (JS_ToInt32(ctx, &mode, argv[1]))
            return JS_EXCEPTION;
    } else {
        mode = 0777;
    }
    path = JS_ToCString(ctx, argv[0]);
    if (!path)
        return JS_EXCEPTION;
#if defined(_WIN32)
    (void)mode;
    ret = mkdir(path);
#else
    ret = mkdir(path, mode);
#endif
    err = errno;

    if (ret == 0) {
        JS_FreeCString(ctx, path);
        return JS_UNDEFINED;
    } else {
        JS_ThrowError(ctx, "%s (errno = %d, path = %s)", strerror(err), err, path);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, err));
        JS_AddPropertyToException(ctx, "path", JS_NewString(ctx, path));

        JS_FreeCString(ctx, path);

        return JS_EXCEPTION;
    }
}

static JSValue js_os_readdir(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
    const char *path;
    DIR *dirstream;
    struct dirent *direntry;
    JSValue array;
    int err, close_ret;
    uint32_t len;

    path = JS_ToCString(ctx, argv[0]);
    if (!path)
        return JS_EXCEPTION;

    array = JS_NewArray(ctx);
    if (JS_IsException(array)) {
        JS_FreeCString(ctx, path);
        return JS_EXCEPTION;
    }

    dirstream = opendir(path);
    err = errno;
    if (!dirstream) {
        JS_ThrowError(ctx, "%s (errno = %d, path = %s)", strerror(err), err, path);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, err));
        JS_AddPropertyToException(ctx, "path", JS_NewString(ctx, path));

        JS_FreeCString(ctx, path);

        return JS_EXCEPTION;
    }

    len = 0;
    for(;;) {
        errno = 0;
        direntry = readdir(dirstream);
        if (!direntry) {
            if (errno != 0) {
                JS_ThrowError(ctx, "%s (errno = %d, path = %s)", strerror(errno), errno, path);
                JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
                JS_AddPropertyToException(ctx, "path", JS_NewString(ctx, path));

                JS_FreeCString(ctx, path);

                return JS_EXCEPTION;
            } else {
                break;
            }
        }

        JS_DefinePropertyValueUint32(ctx, array, len++,
                                     JS_NewString(ctx, direntry->d_name),
                                     JS_PROP_C_W_E);
    }

    close_ret = closedir(dirstream);
    if (close_ret != 0) {
        JS_ThrowError(ctx, "%s (errno = %d, path = %s)", strerror(errno), errno, path);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        JS_AddPropertyToException(ctx, "path", JS_NewString(ctx, path));

        JS_FreeCString(ctx, path);

        return JS_EXCEPTION;
    }

    JS_FreeCString(ctx, path);

    return array;
}

#if !defined(_WIN32)
static int64_t timespec_to_ms(const struct timespec *tv)
{
    return (int64_t)tv->tv_sec * 1000 + (tv->tv_nsec / 1000000);
}
#endif

static JSValue js_os_stat(JSContext *ctx, JSValueConst this_val,
                          int argc, JSValueConst *argv, int is_lstat)
{
    const char *path;
    int err, res;
    struct stat st;
    JSValue obj;

    path = JS_ToCString(ctx, argv[0]);
    if (!path)
        return JS_EXCEPTION;
#if defined(_WIN32)
    res = stat(path, &st);
#else
    if (is_lstat) {
        res = lstat(path, &st);
    } else {
        res = stat(path, &st);
    }
#endif
    err = errno;
    if (res < 0) {
#if !defined(_WIN32)
        if (!is_lstat && lstat(path, &st) == 0 && ((st.st_mode & S_IFMT) == S_IFLNK)) {
            // If stat failed but lstat didn't, that means the link itself
            // is fine, but what it points to has a problem. We can surface
            // this information more clearly by including what the link
            // points to in the error message.

            char linkpath[PATH_MAX];
            int ret = readlink(path, linkpath, sizeof(linkpath) - 1);

            if (ret >= 0) {
                if (ret < PATH_MAX) {
                    linkpath[ret] = '\0';
                }

                JS_ThrowError(ctx, "%s (errno = %d, path = %s, linkpath = %s)", strerror(err), err, path, linkpath);
                JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, err));
                JS_AddPropertyToException(ctx, "path", JS_NewString(ctx, path));
                JS_AddPropertyToException(ctx, "linkpath", JS_NewString(ctx, linkpath));

                JS_FreeCString(ctx, path);

                return JS_EXCEPTION;
            }
        }
#endif

        JS_ThrowError(ctx, "%s (errno = %d, path = %s)", strerror(err), err, path);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, err));
        JS_AddPropertyToException(ctx, "path", JS_NewString(ctx, path));

        JS_FreeCString(ctx, path);

        return JS_EXCEPTION;
    }

    JS_FreeCString(ctx, path);

    obj = JS_NewObject(ctx);
    if (JS_IsException(obj))
        return JS_EXCEPTION;

    JS_DefinePropertyValueStr(ctx, obj, "dev",
                                JS_NewInt64(ctx, st.st_dev),
                                JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "ino",
                                JS_NewInt64(ctx, st.st_ino),
                                JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "mode",
                                JS_NewInt32(ctx, st.st_mode),
                                JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "nlink",
                                JS_NewInt64(ctx, st.st_nlink),
                                JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "uid",
                                JS_NewInt64(ctx, st.st_uid),
                                JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "gid",
                                JS_NewInt64(ctx, st.st_gid),
                                JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "rdev",
                                JS_NewInt64(ctx, st.st_rdev),
                                JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "size",
                                JS_NewInt64(ctx, st.st_size),
                                JS_PROP_C_W_E);
#if !defined(_WIN32)
    JS_DefinePropertyValueStr(ctx, obj, "blocks",
                                JS_NewInt64(ctx, st.st_blocks),
                                JS_PROP_C_W_E);
#endif
#if defined(_WIN32)
    JS_DefinePropertyValueStr(ctx, obj, "atime",
                                JS_NewInt64(ctx, (int64_t)st.st_atime * 1000),
                                JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "mtime",
                                JS_NewInt64(ctx, (int64_t)st.st_mtime * 1000),
                                JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "ctime",
                                JS_NewInt64(ctx, (int64_t)st.st_ctime * 1000),
                                JS_PROP_C_W_E);
#elif defined(__APPLE__)
    JS_DefinePropertyValueStr(ctx, obj, "atime",
                                JS_NewInt64(ctx, timespec_to_ms(&st.st_atimespec)),
                                JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "mtime",
                                JS_NewInt64(ctx, timespec_to_ms(&st.st_mtimespec)),
                                JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "ctime",
                                JS_NewInt64(ctx, timespec_to_ms(&st.st_ctimespec)),
                                JS_PROP_C_W_E);
#else
    JS_DefinePropertyValueStr(ctx, obj, "atime",
                                JS_NewInt64(ctx, timespec_to_ms(&st.st_atim)),
                                JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "mtime",
                                JS_NewInt64(ctx, timespec_to_ms(&st.st_mtim)),
                                JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "ctime",
                                JS_NewInt64(ctx, timespec_to_ms(&st.st_ctim)),
                                JS_PROP_C_W_E);
#endif

    // TODO: it'd be nice to provide birth time, too, when available.
    // for Linux, that'd mean using crtime

    return obj;
}

#if !defined(_WIN32)
static void ms_to_timeval(struct timeval *tv, uint64_t v)
{
    tv->tv_sec = v / 1000;
    tv->tv_usec = (v % 1000) * 1000;
}
#endif

static JSValue js_os_utimes(JSContext *ctx, JSValueConst this_val,
                            int argc, JSValueConst *argv)
{
    const char *path;
    int64_t atime, mtime;
    int ret, err;

    if (JS_ToInt64(ctx, &atime, argv[1]))
        return JS_EXCEPTION;
    if (JS_ToInt64(ctx, &mtime, argv[2]))
        return JS_EXCEPTION;
    path = JS_ToCString(ctx, argv[0]);
    if (!path)
        return JS_EXCEPTION;
#if defined(_WIN32)
    {
        struct _utimbuf times;
        times.actime = atime / 1000;
        times.modtime = mtime / 1000;
        ret = _utime(path, &times);
    }
#else
    {
        struct timeval times[2];
        ms_to_timeval(&times[0], atime);
        ms_to_timeval(&times[1], mtime);
        ret = utimes(path, times);
    }
#endif
    err = errno;
    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d, path = %s)", strerror(err), err, path);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, err));
        JS_AddPropertyToException(ctx, "path", JS_NewString(ctx, path));

        JS_FreeCString(ctx, path);

        return JS_EXCEPTION;
    } else {
        JS_FreeCString(ctx, path);
        return JS_UNDEFINED;
    }
}

/* sleep(delay_ms) */
static JSValue js_os_sleep(JSContext *ctx, JSValueConst this_val,
                          int argc, JSValueConst *argv)
{
    int64_t delay;
    int ret;

    if (JS_ToInt64(ctx, &delay, argv[0]))
        return JS_EXCEPTION;
    if (delay < 0)
        delay = 0;
#if defined(_WIN32)
    {
        if (delay > INT32_MAX)
            delay = INT32_MAX;
        Sleep(delay);
        ret = 0;
    }
#else
    {
        struct timespec ts;

        ts.tv_sec = delay / 1000;
        ts.tv_nsec = (delay % 1000) * 1000000;
        ret = nanosleep(&ts, NULL);
    }
#endif
    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        return JS_EXCEPTION;
    } else {
        return JS_UNDEFINED;
    }
}

#if defined(_WIN32)
static char *realpath(const char *path, char *buf)
{
    if (!_fullpath(buf, path, PATH_MAX)) {
        errno = ENOENT;
        return NULL;
    } else {
        return buf;
    }
}
#endif

static JSValue js_os_realpath(JSContext *ctx, JSValueConst this_val,
                              int argc, JSValueConst *argv)
{
    const char *path;
    char buf[PATH_MAX], *res;
    int err;

    path = JS_ToCString(ctx, argv[0]);
    if (!path)
        return JS_EXCEPTION;
    res = realpath(path, buf);
    err = errno;
    if (!res) {
        JS_ThrowError(ctx, "%s (errno = %d, path = %s)", strerror(err), err, path);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, err));
        JS_AddPropertyToException(ctx, "path", JS_NewString(ctx, path));

        JS_FreeCString(ctx, path);

        return JS_EXCEPTION;
    } else {
        JS_FreeCString(ctx, path);
        return JS_NewString(ctx, buf);
    }
}

#if !defined(_WIN32)
static JSValue js_os_symlink(JSContext *ctx, JSValueConst this_val,
                              int argc, JSValueConst *argv)
{
    const char *target, *linkpath;
    int ret, err;

    target = JS_ToCString(ctx, argv[0]);
    if (!target)
        return JS_EXCEPTION;
    linkpath = JS_ToCString(ctx, argv[1]);
    if (!linkpath) {
        JS_FreeCString(ctx, target);
        return JS_EXCEPTION;
    }
    ret = symlink(target, linkpath);
    err = errno;
    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d, target = %s, linkpath = %s)", strerror(err), err, target, linkpath);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, err));
        JS_AddPropertyToException(ctx, "target", JS_NewString(ctx, target));
        JS_AddPropertyToException(ctx, "linkpath", JS_NewString(ctx, linkpath));

        JS_FreeCString(ctx, target);
        JS_FreeCString(ctx, linkpath);

        return JS_EXCEPTION;
    } else {
        JS_FreeCString(ctx, target);
        JS_FreeCString(ctx, linkpath);

        return JS_UNDEFINED;
    }
}

static JSValue js_os_readlink(JSContext *ctx, JSValueConst this_val,
                              int argc, JSValueConst *argv)
{
    const char *path;
    char buf[PATH_MAX];
    ssize_t ret;
    int err;

    path = JS_ToCString(ctx, argv[0]);
    if (!path)
        return JS_EXCEPTION;

    ret = readlink(path, buf, sizeof(buf) - 1);
    err = errno;

    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d, path = %s)", strerror(err), err, path);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, err));
        JS_AddPropertyToException(ctx, "path", JS_NewString(ctx, path));

        JS_FreeCString(ctx, path);

        return JS_EXCEPTION;
    } else {
        if (ret < PATH_MAX) {
            buf[ret] = '\0';
        }

        JS_FreeCString(ctx, path);
        return JS_NewString(ctx, buf);
    }
}

static char **build_envp(JSContext *ctx, JSValueConst obj)
{
    uint32_t len, i;
    JSPropertyEnum *tab;
    char **envp, *pair;
    const char *key, *str;
    JSValue val;
    size_t key_len, str_len;

    if (JS_GetOwnPropertyNames(ctx, &tab, &len, obj,
                               JS_GPN_STRING_MASK | JS_GPN_ENUM_ONLY) < 0)
        return NULL;
    envp = js_mallocz(ctx, sizeof(envp[0]) * ((size_t)len + 1));
    if (!envp)
        goto fail;
    for(i = 0; i < len; i++) {
        val = JS_GetProperty(ctx, obj, tab[i].atom);
        if (JS_IsException(val))
            goto fail;
        str = JS_ToCString(ctx, val);
        JS_FreeValue(ctx, val);
        if (!str)
            goto fail;
        key = JS_AtomToCString(ctx, tab[i].atom);
        if (!key) {
            JS_FreeCString(ctx, str);
            goto fail;
        }
        key_len = strlen(key);
        str_len = strlen(str);
        pair = js_malloc(ctx, key_len + str_len + 2);
        if (!pair) {
            JS_FreeCString(ctx, key);
            JS_FreeCString(ctx, str);
            goto fail;
        }
        memcpy(pair, key, key_len);
        pair[key_len] = '=';
        memcpy(pair + key_len + 1, str, str_len);
        pair[key_len + 1 + str_len] = '\0';
        envp[i] = pair;
        JS_FreeCString(ctx, key);
        JS_FreeCString(ctx, str);
    }
 done:
    for(i = 0; i < len; i++)
        JS_FreeAtom(ctx, tab[i].atom);
    js_free(ctx, tab);
    return envp;
 fail:
    if (envp) {
        for(i = 0; i < len; i++)
            js_free(ctx, envp[i]);
        js_free(ctx, envp);
        envp = NULL;
    }
    goto done;
}

/* execvpe is not available on non GNU systems */
static int my_execvpe(const char *filename, char **argv, char **envp)
{
    char *path, *p, *p_next, *p1;
    char buf[PATH_MAX];
    size_t filename_len, path_len;
    BOOL eacces_error;

    filename_len = strlen(filename);
    if (filename_len == 0) {
        errno = ENOENT;
        return -1;
    }
    if (strchr(filename, '/'))
        return execve(filename, argv, envp);

    path = getenv("PATH");
    if (!path)
        path = (char *)"/bin:/usr/bin";
    eacces_error = FALSE;
    p = path;
    for(p = path; p != NULL; p = p_next) {
        p1 = strchr(p, ':');
        if (!p1) {
            p_next = NULL;
            path_len = strlen(p);
        } else {
            p_next = p1 + 1;
            path_len = p1 - p;
        }
        /* path too long */
        if ((path_len + 1 + filename_len + 1) > PATH_MAX)
            continue;
        memcpy(buf, p, path_len);
        buf[path_len] = '/';
        memcpy(buf + path_len + 1, filename, filename_len);
        buf[path_len + 1 + filename_len] = '\0';

        execve(buf, argv, envp);

        switch(errno) {
        case EACCES:
            eacces_error = TRUE;
            break;
        case ENOENT:
        case ENOTDIR:
            break;
        default:
            return -1;
        }
    }
    if (eacces_error)
        errno = EACCES;
    return -1;
}

/* exec(args[, options]) -> exitcode */
static JSValue js_os_exec(JSContext *ctx, JSValueConst this_val,
                          int argc, JSValueConst *argv)
{
    JSValueConst options, args = argv[0];
    JSValue val, ret_val;
    const char **exec_argv, *file = NULL, *str, *cwd = NULL;
    char **envp = environ;
    uint32_t exec_argc, i;
    int ret, pid, status;
    BOOL block_flag = TRUE, use_path = TRUE;
    static const char *std_name[3] = { "stdin", "stdout", "stderr" };
    int std_fds[3];
    uint32_t uid = -1, gid = -1;

    val = JS_GetPropertyStr(ctx, args, "length");
    if (JS_IsException(val))
        return JS_EXCEPTION;
    ret = JS_ToUint32(ctx, &exec_argc, val);
    JS_FreeValue(ctx, val);
    if (ret)
        return JS_EXCEPTION;
    /* arbitrary limit to avoid overflow */
    if (exec_argc < 1 || exec_argc > 65535) {
        return JS_ThrowTypeError(ctx, "invalid number of arguments");
    }
    exec_argv = js_mallocz(ctx, sizeof(exec_argv[0]) * (exec_argc + 1));
    if (!exec_argv)
        return JS_EXCEPTION;
    for(i = 0; i < exec_argc; i++) {
        val = JS_GetPropertyUint32(ctx, args, i);
        if (JS_IsException(val))
            goto exception;
        str = JS_ToCString(ctx, val);
        JS_FreeValue(ctx, val);
        if (!str)
            goto exception;
        exec_argv[i] = str;
    }
    exec_argv[exec_argc] = NULL;

    for(i = 0; i < 3; i++)
        std_fds[i] = i;

    /* get the options, if any */
    if (argc >= 2) {
        options = argv[1];

        if (get_bool_option(ctx, &block_flag, options, "block"))
            goto exception;
        if (get_bool_option(ctx, &use_path, options, "usePath"))
            goto exception;

        val = JS_GetPropertyStr(ctx, options, "file");
        if (JS_IsException(val))
            goto exception;
        if (!JS_IsUndefined(val)) {
            file = JS_ToCString(ctx, val);
            JS_FreeValue(ctx, val);
            if (!file)
                goto exception;
        }

        val = JS_GetPropertyStr(ctx, options, "cwd");
        if (JS_IsException(val))
            goto exception;
        if (!JS_IsUndefined(val)) {
            cwd = JS_ToCString(ctx, val);
            JS_FreeValue(ctx, val);
            if (!cwd)
                goto exception;
        }

        /* stdin/stdout/stderr handles */
        for(i = 0; i < 3; i++) {
            val = JS_GetPropertyStr(ctx, options, std_name[i]);
            if (JS_IsException(val))
                goto exception;
            if (!JS_IsUndefined(val)) {
                int fd;
                ret = JS_ToInt32(ctx, &fd, val);
                JS_FreeValue(ctx, val);
                if (ret)
                    goto exception;
                std_fds[i] = fd;
            }
        }

        val = JS_GetPropertyStr(ctx, options, "env");
        if (JS_IsException(val))
            goto exception;
        if (!JS_IsUndefined(val)) {
            envp = build_envp(ctx, val);
            JS_FreeValue(ctx, val);
            if (!envp)
                goto exception;
        }

        val = JS_GetPropertyStr(ctx, options, "uid");
        if (JS_IsException(val))
            goto exception;
        if (!JS_IsUndefined(val)) {
            ret = JS_ToUint32(ctx, &uid, val);
            JS_FreeValue(ctx, val);
            if (ret)
                goto exception;
        }

        val = JS_GetPropertyStr(ctx, options, "gid");
        if (JS_IsException(val))
            goto exception;
        if (!JS_IsUndefined(val)) {
            ret = JS_ToUint32(ctx, &gid, val);
            JS_FreeValue(ctx, val);
            if (ret)
                goto exception;
        }
    }

    pid = fork();
    if (pid < 0) {
        JS_ThrowTypeError(ctx, "fork error");
        goto exception;
    }
    if (pid == 0) {
        /* child */
        int fd_max = sysconf(_SC_OPEN_MAX);

        /* remap the stdin/stdout/stderr handles if necessary */
        for(i = 0; i < 3; i++) {
            if (std_fds[i] != i) {
                if (dup2(std_fds[i], i) < 0)
                    _exit(127);
            }
        }

        for(i = 3; i < fd_max; i++)
            close(i);
        if (cwd) {
            if (chdir(cwd) < 0)
                _exit(127);
        }
        if (uid != -1) {
            if (setuid(uid) < 0)
                _exit(127);
        }
        if (gid != -1) {
            if (setgid(gid) < 0)
                _exit(127);
        }

        if (!file)
            file = exec_argv[0];
        if (use_path)
            ret = my_execvpe(file, (char **)exec_argv, envp);
        else
            ret = execve(file, (char **)exec_argv, envp);
        _exit(127);
    }
    /* parent */
    if (block_flag) {
        for(;;) {
            ret = waitpid(pid, &status, 0);
            if (ret == pid) {
                if (WIFEXITED(status)) {
                    ret = WEXITSTATUS(status);
                    break;
                } else if (WIFSIGNALED(status)) {
                    ret = -WTERMSIG(status);
                    break;
                }
            }
        }
    } else {
        ret = pid;
    }
    ret_val = JS_NewInt32(ctx, ret);
 done:
    JS_FreeCString(ctx, file);
    JS_FreeCString(ctx, cwd);
    for(i = 0; i < exec_argc; i++)
        JS_FreeCString(ctx, exec_argv[i]);
    js_free(ctx, exec_argv);
    if (envp != environ) {
        char **p;
        p = envp;
        while (*p != NULL) {
            js_free(ctx, *p);
            p++;
        }
        js_free(ctx, envp);
    }
    return ret_val;
 exception:
    ret_val = JS_EXCEPTION;
    goto done;
}

/* waitpid(pid, block) -> [pid, status] */
static JSValue js_os_waitpid(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
    int pid, status, options = 0, ret;
    JSValue obj;

    if (JS_ToInt32(ctx, &pid, argv[0]))
        return JS_EXCEPTION;

    if (argc > 1) {
        if (JS_ToInt32(ctx, &options, argv[1]))
            return JS_EXCEPTION;
    }

    ret = waitpid(pid, &status, options);
    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        return JS_EXCEPTION;
    }

    obj = JS_NewArray(ctx);
    if (JS_IsException(obj))
        return obj;
    JS_DefinePropertyValueUint32(ctx, obj, 0, JS_NewInt32(ctx, ret),
                                 JS_PROP_C_W_E);
    JS_DefinePropertyValueUint32(ctx, obj, 1, JS_NewInt32(ctx, status),
                                 JS_PROP_C_W_E);
    return obj;
}

/* WEXITSTATUS(status) -> number */
static JSValue js_os_WEXITSTATUS(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
    int status;

    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;

    return JS_NewInt32(ctx, WEXITSTATUS(status));
}

/* WTERMSIG(status) -> number */
static JSValue js_os_WTERMSIG(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
    int status;

    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;

    return JS_NewInt32(ctx, WTERMSIG(status));
}

/* WSTOPSIG(status) -> number */
static JSValue js_os_WSTOPSIG(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
    int status;

    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;

    return JS_NewInt32(ctx, WSTOPSIG(status));
}

/* WIFEXITED(status) -> boolean */
static JSValue js_os_WIFEXITED(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
    int status;

    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;

    return JS_NewBool(ctx, WIFEXITED(status));
}

/* WIFSIGNALED(status) -> boolean */
static JSValue js_os_WIFSIGNALED(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
    int status;

    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;

    return JS_NewBool(ctx, WIFSIGNALED(status));
}

/* WIFSTOPPED(status) -> boolean */
static JSValue js_os_WIFSTOPPED(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
    int status;

    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;

    return JS_NewBool(ctx, WIFSTOPPED(status));
}

/* WIFCONTINUED(status) -> boolean */
static JSValue js_os_WIFCONTINUED(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
    int status;

    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;

#ifdef WIFCONTINUED
    return JS_NewBool(ctx, WIFCONTINUED(status));
#else
    return JS_ThrowError(ctx, "WIFCONTINUED is not available on this platform");
#endif
}

/* pipe() -> [read_fd, write_fd] */
static JSValue js_os_pipe(JSContext *ctx, JSValueConst this_val,
                          int argc, JSValueConst *argv)
{
    int pipe_fds[2], ret;
    JSValue obj;

    ret = pipe(pipe_fds);
    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        return JS_EXCEPTION;
    }

    obj = JS_NewArray(ctx);
    if (JS_IsException(obj))
        return obj;
    JS_DefinePropertyValueUint32(ctx, obj, 0, JS_NewInt32(ctx, pipe_fds[0]),
                                 JS_PROP_C_W_E);
    JS_DefinePropertyValueUint32(ctx, obj, 1, JS_NewInt32(ctx, pipe_fds[1]),
                                 JS_PROP_C_W_E);
    return obj;
}

/* kill(pid, sig) */
static JSValue js_os_kill(JSContext *ctx, JSValueConst this_val,
                          int argc, JSValueConst *argv)
{
    int pid, sig, ret;

    if (JS_ToInt32(ctx, &pid, argv[0]))
        return JS_EXCEPTION;
    if (JS_ToInt32(ctx, &sig, argv[1]))
        return JS_EXCEPTION;
    ret = kill(pid, sig);
    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        return JS_EXCEPTION;
    } else {
        return JS_UNDEFINED;
    }
}

/* dup(fd) */
static JSValue js_os_dup(JSContext *ctx, JSValueConst this_val,
                         int argc, JSValueConst *argv)
{
    int fd, ret;

    if (JS_ToInt32(ctx, &fd, argv[0]))
        return JS_EXCEPTION;
    ret = dup(fd);
    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d, fd = %d)", strerror(errno), errno, fd);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        JS_AddPropertyToException(ctx, "fd", JS_NewInt32(ctx, fd));
        return JS_EXCEPTION;
    } else {
        return JS_NewInt32(ctx, ret);
    }
}

/* dup2(fd) */
static JSValue js_os_dup2(JSContext *ctx, JSValueConst this_val,
                         int argc, JSValueConst *argv)
{
    int fd, fd2, ret;

    if (JS_ToInt32(ctx, &fd, argv[0]))
        return JS_EXCEPTION;
    if (JS_ToInt32(ctx, &fd2, argv[1]))
        return JS_EXCEPTION;
    ret = dup2(fd, fd2);
    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d, fd = %d, fd2 = %d)", strerror(errno), errno, fd, fd2);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        JS_AddPropertyToException(ctx, "fd", JS_NewInt32(ctx, fd));
        JS_AddPropertyToException(ctx, "fd2", JS_NewInt32(ctx, fd2));
        return JS_EXCEPTION;
    } else {
        return JS_NewInt32(ctx, ret);
    }
}

#endif /* !_WIN32 */

static JSValue js_os_access(JSContext *ctx, JSValueConst this_val,
                            int argc, JSValueConst *argv)
{
    const char *path;
    int amode, err, ret;

    path = JS_ToCString(ctx, argv[0]);
    if (!path) {
        return JS_EXCEPTION;
    }

    if (JS_ToInt32(ctx, &amode, argv[1])) {
        JS_FreeCString(ctx, path);
        return JS_EXCEPTION;
    }

    ret = access(path, amode);
    err = errno;
    if (ret != 0) {
        JS_ThrowError(ctx, "%s (errno = %d, path = %s, amode = %d)", strerror(err), err, path, amode);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, err));
        JS_AddPropertyToException(ctx, "path", JS_NewString(ctx, path));
        JS_AddPropertyToException(ctx, "amode", JS_NewInt32(ctx, amode));

        JS_FreeCString(ctx, path);
        return JS_EXCEPTION;
    } else {
        JS_FreeCString(ctx, path);
        return JS_UNDEFINED;
    }
}

static JSValue js_os_execPath(JSContext *ctx, JSValueConst this_val,
                              int argc, JSValueConst *argv)
{
    JSValue global_obj;
    JSValue scriptArgs;
    JSValue argv0_val;
    char *argv0;
    char *result;
    char execpath_error[2048];

    global_obj = JS_GetGlobalObject(ctx);
    if (JS_IsException(global_obj)) {
        return JS_EXCEPTION;
    }

    scriptArgs = JS_GetPropertyStr(ctx, global_obj, "scriptArgs");
    if (JS_IsException(scriptArgs)) {
        JS_FreeValue(ctx, global_obj);
        return JS_EXCEPTION;
    }

    argv0_val = JS_GetPropertyUint32(ctx, scriptArgs, 0);
    if (JS_IsException(argv0_val)) {
        JS_FreeValue(ctx, global_obj);
        return JS_EXCEPTION;
    }

    argv0 = (char *)JS_ToCString(ctx, argv0_val);
    JS_FreeValue(ctx, argv0_val);
    JS_FreeValue(ctx, scriptArgs);
    if (argv0 == NULL) {
        JS_FreeValue(ctx, global_obj);
        return JS_EXCEPTION;
    }

    result = execpath(argv0, NULL, (char *)&execpath_error);
    if (result == NULL) {
        JS_ThrowError(ctx, "Couldn't determine exec path: %s", execpath_error);
        JS_FreeValue(ctx, global_obj);
        return JS_EXCEPTION;
    }

    JS_FreeValue(ctx, global_obj);
    return JS_NewString(ctx, result);
}

static JSValue js_os_chmod(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    const char *path;
    uint32_t mode;
    int ret, err;

    path = JS_ToCString(ctx, argv[0]);
    if (!path) {
        return JS_EXCEPTION;
    }

    if (JS_ToUint32(ctx, &mode, argv[1])) {
        JS_FreeCString(ctx, path);
        return JS_EXCEPTION;
    }

    errno = 0;
    ret = chmod(path, (mode_t)mode);
    err = errno;
    if (ret != 0) {
        JS_ThrowError(ctx, "%s (errno = %d, path = %s, mode = %u)", strerror(err), err, path, mode);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, err));
        JS_AddPropertyToException(ctx, "path", JS_NewString(ctx, path));
        JS_AddPropertyToException(ctx, "mode", JS_NewInt32(ctx, mode));

        JS_FreeCString(ctx, path);
        return JS_EXCEPTION;
    }

    JS_FreeCString(ctx, path);
    return JS_UNDEFINED;
}

static JSValue js_os_gethostname(JSContext *ctx, JSValueConst this_val,
                                 int argc, JSValueConst *argv)
{
    int ret = 0;
    char hostname[HOST_NAME_MAX] = {0};

    ret = gethostname(hostname, HOST_NAME_MAX);
    if (ret != 0) {
        JS_ThrowError(ctx, "Failed to obtain hostname (result = %d)", ret);
        JS_AddPropertyToException(ctx, "result", JS_NewInt32(ctx, ret));

        return JS_EXCEPTION;
    }

    return JS_NewString(ctx, hostname);
}

#ifdef USE_WORKER

/* Worker */

typedef struct {
    JSWorkerMessagePipe *recv_pipe;
    JSWorkerMessagePipe *send_pipe;
    JSWorkerMessageHandler *msg_handler;
} JSWorkerData;

typedef struct {
    char *filename; /* module filename */
    char *basename; /* module base name */
    JSWorkerMessagePipe *recv_pipe, *send_pipe;
} WorkerFuncArgs;

typedef struct {
    int ref_count;
    uint64_t buf[0];
} JSSABHeader;

static JSClassID js_worker_class_id;
static JSContext *(*js_worker_new_context_func)(JSRuntime *rt);

static int atomic_add_int(int *ptr, int v)
{
    return atomic_fetch_add((_Atomic(uint32_t) *)ptr, v) + v;
}

/* shared array buffer allocator */
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

static JSWorkerMessagePipe *js_new_message_pipe(void)
{
    JSWorkerMessagePipe *ps;
    int pipe_fds[2];

    if (pipe(pipe_fds) < 0)
        return NULL;

    ps = malloc(sizeof(*ps));
    if (!ps) {
        close(pipe_fds[0]);
        close(pipe_fds[1]);
        return NULL;
    }
    ps->ref_count = 1;
    init_list_head(&ps->msg_queue);
    pthread_mutex_init(&ps->mutex, NULL);
    ps->read_fd = pipe_fds[0];
    ps->write_fd = pipe_fds[1];
    return ps;
}

static JSWorkerMessagePipe *js_dup_message_pipe(JSWorkerMessagePipe *ps)
{
    atomic_add_int(&ps->ref_count, 1);
    return ps;
}

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

static void js_free_message_pipe(JSWorkerMessagePipe *ps)
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

static void js_free_port(JSRuntime *rt, JSWorkerMessageHandler *port)
{
    if (port) {
        js_free_message_pipe(port->recv_pipe);
        JS_FreeValueRT(rt, port->on_message_func);
        list_del(&port->link);
        js_free_rt(rt, port);
    }
}

static void js_worker_finalizer(JSRuntime *rt, JSValue val)
{
    JSWorkerData *worker = JS_GetOpaque(val, js_worker_class_id);
    if (worker) {
        js_free_message_pipe(worker->recv_pipe);
        js_free_message_pipe(worker->send_pipe);
        js_free_port(rt, worker->msg_handler);
        js_free_rt(rt, worker);
    }
}

static JSClassDef js_worker_class = {
    "Worker",
    .finalizer = js_worker_finalizer,
};

static void *worker_func(void *opaque)
{
    WorkerFuncArgs *args = opaque;
    JSRuntime *rt;
    JSThreadState *ts;
    JSContext *ctx;

    rt = JS_NewRuntime();
    if (rt == NULL) {
        fprintf(stderr, "JS_NewRuntime failure");
        exit(1);
    }
    js_std_init_handlers(rt);

    QJMS_InitState(rt);

    /* set the pipe to communicate with the parent */
    ts = JS_GetRuntimeOpaque(rt);
    ts->recv_pipe = args->recv_pipe;
    ts->send_pipe = args->send_pipe;

    // function pointer to avoid linking the whole JS_NewContext() if not needed,
    // but also it gives people a place to put
    // js_print_add_print_global, js_inspect_add_inspect_global, etc
    ctx = js_worker_new_context_func(rt);
    if (ctx == NULL) {
        fprintf(stderr, "JS_NewContext failure");
    }

    JS_SetCanBlock(rt, TRUE);

    js_std_add_helpers(ctx, -1, NULL);
    QJMS_InitContext(ctx);

    if (!JS_RunModule(ctx, args->basename, args->filename))
        QJU_PrintException(ctx, stderr);
    free(args->filename);
    free(args->basename);
    free(args);

    js_std_loop(ctx);

    QJMS_FreeState(rt);
    JS_FreeContext(ctx);
    js_std_free_handlers(rt);
    JS_FreeRuntime(rt);
    return NULL;
}

static JSValue js_worker_ctor_internal(JSContext *ctx, JSValueConst new_target,
                                       JSWorkerMessagePipe *recv_pipe,
                                       JSWorkerMessagePipe *send_pipe)
{
    JSValue obj = JS_UNDEFINED, proto;
    JSWorkerData *s;

    /* create the object */
    if (JS_IsUndefined(new_target)) {
        proto = JS_GetClassProto(ctx, js_worker_class_id);
    } else {
        proto = JS_GetPropertyStr(ctx, new_target, "prototype");
        if (JS_IsException(proto))
            goto fail;
    }
    obj = JS_NewObjectProtoClass(ctx, proto, js_worker_class_id);
    JS_FreeValue(ctx, proto);
    if (JS_IsException(obj))
        goto fail;
    s = js_mallocz(ctx, sizeof(*s));
    if (!s)
        goto fail;
    s->recv_pipe = js_dup_message_pipe(recv_pipe);
    s->send_pipe = js_dup_message_pipe(send_pipe);

    JS_SetOpaque(obj, s);
    return obj;
 fail:
    JS_FreeValue(ctx, obj);
    return JS_EXCEPTION;
}

static JSValue js_worker_ctor(JSContext *ctx, JSValueConst new_target,
                              int argc, JSValueConst *argv)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    WorkerFuncArgs *args = NULL;
    pthread_t tid;
    pthread_attr_t attr;
    JSValue obj = JS_UNDEFINED;
    int ret;
    const char *filename = NULL, *basename;
    JSAtom basename_atom;

    /* XXX: in order to avoid problems with resource liberation, we
       don't support creating workers inside workers */
    if (!js_std_is_main_thread(rt))
        return JS_ThrowTypeError(ctx, "cannot create a worker inside a worker");

    /* base name, assuming the calling function is a normal JS
       function */
    basename_atom = JS_GetScriptOrModuleName(ctx, 1);
    if (basename_atom == JS_ATOM_NULL) {
        return JS_ThrowTypeError(ctx, "could not determine calling script or module name");
    }
    basename = JS_AtomToCString(ctx, basename_atom);
    JS_FreeAtom(ctx, basename_atom);
    if (!basename)
        goto fail;

    /* module name */
    filename = JS_ToCString(ctx, argv[0]);
    if (!filename)
        goto fail;

    args = malloc(sizeof(*args));
    if (!args)
        goto oom_fail;
    memset(args, 0, sizeof(*args));
    args->filename = strdup(filename);
    args->basename = strdup(basename);

    /* ports */
    args->recv_pipe = js_new_message_pipe();
    if (!args->recv_pipe)
        goto oom_fail;
    args->send_pipe = js_new_message_pipe();
    if (!args->send_pipe)
        goto oom_fail;

    obj = js_worker_ctor_internal(ctx, new_target,
                                  args->send_pipe, args->recv_pipe);
    if (JS_IsException(obj))
        goto fail;

    pthread_attr_init(&attr);
    /* no join at the end */
    pthread_attr_setdetachstate(&attr, PTHREAD_CREATE_DETACHED);
    ret = pthread_create(&tid, &attr, worker_func, args);
    pthread_attr_destroy(&attr);
    if (ret != 0) {
        JS_ThrowTypeError(ctx, "could not create worker");
        goto fail;
    }
    JS_FreeCString(ctx, basename);
    JS_FreeCString(ctx, filename);
    return obj;
 oom_fail:
    JS_ThrowOutOfMemory(ctx);
 fail:
    JS_FreeCString(ctx, basename);
    JS_FreeCString(ctx, filename);
    if (args) {
        free(args->filename);
        free(args->basename);
        js_free_message_pipe(args->recv_pipe);
        js_free_message_pipe(args->send_pipe);
        free(args);
    }
    JS_FreeValue(ctx, obj);
    return JS_EXCEPTION;
}

static JSValue js_worker_postMessage(JSContext *ctx, JSValueConst this_val,
                                     int argc, JSValueConst *argv)
{
    JSWorkerData *worker = JS_GetOpaque2(ctx, this_val, js_worker_class_id);
    JSWorkerMessagePipe *ps;
    size_t data_len, sab_tab_len, i;
    uint8_t *data;
    JSWorkerMessage *msg;
    uint8_t **sab_tab;

    if (!worker)
        return JS_EXCEPTION;

    data = JS_WriteObject2(ctx, &data_len, argv[0],
                           JS_WRITE_OBJ_SAB | JS_WRITE_OBJ_REFERENCE,
                           &sab_tab, &sab_tab_len);
    if (!data)
        return JS_EXCEPTION;

    msg = malloc(sizeof(*msg));
    if (!msg)
        goto fail;
    msg->data = NULL;
    msg->sab_tab = NULL;

    /* must reallocate because the allocator may be different */
    msg->data = malloc(data_len);
    if (!msg->data)
        goto fail;
    memcpy(msg->data, data, data_len);
    msg->data_len = data_len;

    msg->sab_tab = malloc(sizeof(msg->sab_tab[0]) * sab_tab_len);
    if (!msg->sab_tab)
        goto fail;
    memcpy(msg->sab_tab, sab_tab, sizeof(msg->sab_tab[0]) * sab_tab_len);
    msg->sab_tab_len = sab_tab_len;

    js_free(ctx, data);
    js_free(ctx, sab_tab);

    /* increment the SAB reference counts */
    for(i = 0; i < msg->sab_tab_len; i++) {
        js_sab_dup(NULL, msg->sab_tab[i]);
    }

    ps = worker->send_pipe;
    pthread_mutex_lock(&ps->mutex);
    /* indicate that data is present */
    if (list_empty(&ps->msg_queue)) {
        uint8_t ch = '\0';
        int ret;
        for(;;) {
            ret = write(ps->write_fd, &ch, 1);
            if (ret == 1)
                break;
            if (ret < 0 && (errno != EAGAIN || errno != EINTR))
                break;
        }
    }
    list_add_tail(&msg->link, &ps->msg_queue);
    pthread_mutex_unlock(&ps->mutex);
    return JS_UNDEFINED;
 fail:
    if (msg) {
        free(msg->data);
        free(msg->sab_tab);
        free(msg);
    }
    js_free(ctx, data);
    js_free(ctx, sab_tab);
    return JS_EXCEPTION;

}

static JSValue js_worker_set_onmessage(JSContext *ctx, JSValueConst this_val,
                                   JSValueConst func)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    JSWorkerData *worker = JS_GetOpaque2(ctx, this_val, js_worker_class_id);
    JSWorkerMessageHandler *port;

    if (!worker)
        return JS_EXCEPTION;

    port = worker->msg_handler;
    if (JS_IsNull(func)) {
        if (port) {
            js_free_port(rt, port);
            worker->msg_handler = NULL;
        }
    } else {
        if (!JS_IsFunction(ctx, func))
            return JS_ThrowTypeError(ctx, "attempting to set worker.onmessage to a non-null, non-function value.");
        if (!port) {
            port = js_mallocz(ctx, sizeof(*port));
            if (!port)
                return JS_EXCEPTION;
            port->recv_pipe = js_dup_message_pipe(worker->recv_pipe);
            port->on_message_func = JS_NULL;
            list_add_tail(&port->link, &ts->port_list);
            worker->msg_handler = port;
        }
        JS_FreeValue(ctx, port->on_message_func);
        port->on_message_func = JS_DupValue(ctx, func);
    }
    return JS_UNDEFINED;
}

static JSValue js_worker_get_onmessage(JSContext *ctx, JSValueConst this_val)
{
    JSWorkerData *worker = JS_GetOpaque2(ctx, this_val, js_worker_class_id);
    JSWorkerMessageHandler *port;
    if (!worker)
        return JS_EXCEPTION;
    port = worker->msg_handler;
    if (port) {
        return JS_DupValue(ctx, port->on_message_func);
    } else {
        return JS_NULL;
    }
}

static const JSCFunctionListEntry js_worker_proto_funcs[] = {
    JS_CFUNC_DEF("postMessage", 1, js_worker_postMessage ),
    JS_CGETSET_DEF("onmessage", js_worker_get_onmessage, js_worker_set_onmessage ),
};

#else
// Stub versions

static JSClassID js_worker_class_id;

static JSValue js_worker_ctor(JSContext *ctx, JSValueConst new_target,
                              int argc, JSValueConst *argv)
{
    return JS_ThrowError(ctx, "the Worker class is not supported on this platform");
}

static JSClassDef js_worker_class = {
    "Worker",
};
#endif /* USE_WORKER */

void js_std_set_worker_new_context_func(JSContext *(*func)(JSRuntime *rt))
{
#ifdef USE_WORKER
    js_worker_new_context_func = func;
#endif
}

#if defined(_WIN32)
#define OS_PLATFORM "win32"
#elif defined(__APPLE__)
#define OS_PLATFORM "darwin"
#elif defined(EMSCRIPTEN)
#define OS_PLATFORM "js"
#elif defined(__FreeBSD__)
#define OS_PLATFORM "freebsd"
#else
#define OS_PLATFORM "linux"
#endif

#define OS_FLAG(x) JS_PROP_INT32_DEF(#x, x, JS_PROP_CONFIGURABLE )

static const JSCFunctionListEntry js_os_funcs[] = {
    JS_CFUNC_DEF("open", 2, js_os_open ),
    OS_FLAG(O_RDONLY),
    OS_FLAG(O_WRONLY),
    OS_FLAG(O_RDWR),
    OS_FLAG(O_APPEND),
    OS_FLAG(O_CREAT),
    OS_FLAG(O_EXCL),
    OS_FLAG(O_TRUNC),
#if defined(_WIN32)
    OS_FLAG(O_BINARY),
    OS_FLAG(O_TEXT),
#endif
    JS_CFUNC_DEF("close", 1, js_os_close ),
    JS_CFUNC_DEF("seek", 3, js_os_seek ),
    JS_CFUNC_MAGIC_DEF("read", 4, js_os_read_write, 0 ),
    JS_CFUNC_MAGIC_DEF("write", 4, js_os_read_write, 1 ),
    JS_CFUNC_DEF("isatty", 1, js_os_isatty ),
    JS_CFUNC_DEF("ttyGetWinSize", 1, js_os_ttyGetWinSize ),
    JS_CFUNC_DEF("ttySetRaw", 1, js_os_ttySetRaw ),
    JS_CFUNC_DEF("remove", 1, js_os_remove ),
    JS_CFUNC_DEF("rename", 2, js_os_rename ),
    JS_CFUNC_MAGIC_DEF("setReadHandler", 2, js_os_setReadHandler, 0 ),
    JS_CFUNC_MAGIC_DEF("setWriteHandler", 2, js_os_setReadHandler, 1 ),
    JS_CFUNC_DEF("signal", 2, js_os_signal ),
    OS_FLAG(SIGINT),
    OS_FLAG(SIGABRT),
    OS_FLAG(SIGFPE),
    OS_FLAG(SIGILL),
    OS_FLAG(SIGSEGV),
    OS_FLAG(SIGTERM),
#if !defined(_WIN32)
    OS_FLAG(SIGQUIT),
    OS_FLAG(SIGPIPE),
    OS_FLAG(SIGALRM),
    OS_FLAG(SIGUSR1),
    OS_FLAG(SIGUSR2),
    OS_FLAG(SIGCHLD),
    OS_FLAG(SIGCONT),
    OS_FLAG(SIGSTOP),
    OS_FLAG(SIGTSTP),
    OS_FLAG(SIGTTIN),
    OS_FLAG(SIGTTOU),
#endif
    JS_CFUNC_DEF("setTimeout", 2, js_os_setTimeout ),
    JS_CFUNC_DEF("clearTimeout", 1, js_os_clearTimeout ),
    JS_PROP_STRING_DEF("platform", OS_PLATFORM, 0 ),
    JS_CFUNC_DEF("getcwd", 0, js_os_getcwd ),
    JS_CFUNC_DEF("chdir", 0, js_os_chdir ),
    JS_CFUNC_DEF("mkdir", 1, js_os_mkdir ),
    JS_CFUNC_DEF("readdir", 1, js_os_readdir ),
    /* st_mode constants */
    OS_FLAG(S_IFMT),
    OS_FLAG(S_IFIFO),
    OS_FLAG(S_IFCHR),
    OS_FLAG(S_IFDIR),
    OS_FLAG(S_IFBLK),
    OS_FLAG(S_IFREG),
#if !defined(_WIN32)
    OS_FLAG(S_IFSOCK),
    OS_FLAG(S_IFLNK),
    OS_FLAG(S_ISGID),
    OS_FLAG(S_ISUID),
#endif
    OS_FLAG(S_IRWXU),
    OS_FLAG(S_IRUSR),
    OS_FLAG(S_IWUSR),
    OS_FLAG(S_IXUSR),
    OS_FLAG(S_IRWXG),
    OS_FLAG(S_IRGRP),
    OS_FLAG(S_IWGRP),
    OS_FLAG(S_IXGRP),
    OS_FLAG(S_IRWXO),
    OS_FLAG(S_IROTH),
    OS_FLAG(S_IWOTH),
    OS_FLAG(S_IXOTH),

    JS_CFUNC_MAGIC_DEF("stat", 1, js_os_stat, 0 ),
    JS_CFUNC_DEF("utimes", 3, js_os_utimes ),
    JS_CFUNC_DEF("sleep", 1, js_os_sleep ),
    JS_CFUNC_DEF("realpath", 1, js_os_realpath ),
#if !defined(_WIN32)
    JS_CFUNC_MAGIC_DEF("lstat", 1, js_os_stat, 1 ),
    JS_CFUNC_DEF("symlink", 2, js_os_symlink ),
    JS_CFUNC_DEF("readlink", 1, js_os_readlink ),
    JS_CFUNC_DEF("exec", 1, js_os_exec ),
    JS_CFUNC_DEF("waitpid", 2, js_os_waitpid ),

    OS_FLAG(WNOHANG),
    OS_FLAG(WUNTRACED),

    JS_CFUNC_DEF("WEXITSTATUS", 1, js_os_WEXITSTATUS ),
    JS_CFUNC_DEF("WTERMSIG", 1, js_os_WTERMSIG ),
    JS_CFUNC_DEF("WSTOPSIG", 1, js_os_WSTOPSIG ),
    JS_CFUNC_DEF("WIFEXITED", 1, js_os_WIFEXITED ),
    JS_CFUNC_DEF("WIFSIGNALED", 1, js_os_WIFSIGNALED ),
    JS_CFUNC_DEF("WIFSTOPPED", 1, js_os_WIFSTOPPED ),
    JS_CFUNC_DEF("WIFCONTINUED", 1, js_os_WIFCONTINUED ),

    JS_CFUNC_DEF("pipe", 0, js_os_pipe ),
    JS_CFUNC_DEF("kill", 2, js_os_kill ),
    JS_CFUNC_DEF("dup", 1, js_os_dup ),
    JS_CFUNC_DEF("dup2", 2, js_os_dup2 ),
#endif
    JS_CFUNC_DEF("access", 2, js_os_access ),
    JS_CFUNC_DEF("execPath", 0, js_os_execPath ),
    JS_CFUNC_DEF("chmod", 2, js_os_chmod ),
    JS_CFUNC_DEF("gethostname", 0, js_os_gethostname ),
    /* constants for access */
    OS_FLAG(R_OK),
    OS_FLAG(W_OK),
    OS_FLAG(X_OK),
    OS_FLAG(F_OK),
};

static int js_os_init(JSContext *ctx, JSModuleDef *m)
{
    JSValue timer_proto;

    os_poll_func = js_os_poll;

    /* OSTimer class */
    JS_NewClassID(&js_os_timer_class_id);
    JS_NewClass(JS_GetRuntime(ctx), js_os_timer_class_id, &js_os_timer_class);
    timer_proto = JS_NewObject(ctx);
    JS_SetPropertyFunctionList(ctx, timer_proto, js_os_timer_proto_funcs,
                               countof(js_os_timer_proto_funcs));
    JS_SetClassProto(ctx, js_os_timer_class_id, timer_proto);

    {
#ifdef USE_WORKER
        JSRuntime *rt = JS_GetRuntime(ctx);
        JSThreadState *ts = JS_GetRuntimeOpaque(rt);
#endif /* USE_WORKER */
        JSValue proto, obj;
        /* Worker class */
        JS_NewClassID(&js_worker_class_id);
        JS_NewClass(JS_GetRuntime(ctx), js_worker_class_id, &js_worker_class);
        proto = JS_NewObject(ctx);
#ifdef USE_WORKER
        JS_SetPropertyFunctionList(ctx, proto, js_worker_proto_funcs, countof(js_worker_proto_funcs));
#endif /* USE_WORKER */

        obj = JS_NewCFunction2(ctx, js_worker_ctor, "Worker", 1,
                                JS_CFUNC_constructor, 0);
        JS_SetConstructor(ctx, obj, proto);

        JS_SetClassProto(ctx, js_worker_class_id, proto);

#ifdef USE_WORKER
        /* set 'Worker.parent' if necessary */
        if (ts->recv_pipe && ts->send_pipe) {
            JS_DefinePropertyValueStr(ctx, obj, "parent",
                                      js_worker_ctor_internal(ctx, JS_UNDEFINED, ts->recv_pipe, ts->send_pipe),
                                      JS_PROP_C_W_E);
        }
#endif /* USE_WORKER */

        JS_SetModuleExport(ctx, m, "Worker", obj);
    }


    return JS_SetModuleExportList(ctx, m, js_os_funcs,
                                  countof(js_os_funcs));
}

JSModuleDef *js_init_module_os(JSContext *ctx, const char *module_name)
{
    JSModuleDef *m;
    m = JS_NewCModule(ctx, module_name, js_os_init, NULL);
    if (!m)
        return NULL;
    JS_AddModuleExportList(ctx, m, js_os_funcs, countof(js_os_funcs));
    JS_AddModuleExport(ctx, m, "Worker");
    return m;
}

/**********************************************************/

void js_std_add_scriptArgs(JSContext *ctx, int argc, char **argv)
{
    JSValue global_obj, args;
    int i;

    global_obj = JS_GetGlobalObject(ctx);

    args = JS_NewArray(ctx);

    for (i = 0; i < argc; i++) {
        JS_SetPropertyUint32(ctx, args, i, JS_NewString(ctx, argv[i]));
    }

    JS_SetPropertyStr(ctx, global_obj, "scriptArgs", args);

    if (JS_IsException(JS_FreezeObjectValue(ctx, args))) {
        QJU_PrintException(ctx, stderr);
    }

    JS_FreeValue(ctx, global_obj);
}

void js_std_add_timeout(JSContext *ctx)
{
    JSValue global_obj, setTimeout, clearTimeout;

    global_obj = JS_GetGlobalObject(ctx);

    setTimeout = JS_NewCFunction(ctx, js_os_setTimeout, "setTimeout", 2);
    JS_SetPropertyStr(ctx, global_obj, "setTimeout", setTimeout);

    clearTimeout = JS_NewCFunction(ctx, js_os_clearTimeout, "clearTimeout", 1);
    JS_SetPropertyStr(ctx, global_obj, "clearTimeout", clearTimeout);

    JS_FreeValue(ctx, global_obj);
}

void js_std_add_helpers(JSContext *ctx, int argc, char **argv)
{
    js_std_add_scriptArgs(ctx, argc, argv);
    js_std_add_timeout(ctx);
}

void js_std_init_handlers(JSRuntime *rt)
{
    JSThreadState *ts;

    ts = malloc(sizeof(*ts));
    if (!ts) {
        fprintf(stderr, "Could not allocate memory for the worker");
        exit(1);
    }
    memset(ts, 0, sizeof(*ts));
    init_list_head(&ts->os_rw_handlers);
    init_list_head(&ts->os_signal_handlers);
    init_list_head(&ts->os_timers);
    init_list_head(&ts->port_list);

    JS_SetRuntimeOpaque(rt, ts);

#ifdef USE_WORKER
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

void js_std_free_handlers(JSRuntime *rt)
{
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    struct list_head *el, *el1;

    list_for_each_safe(el, el1, &ts->os_rw_handlers) {
        JSOSRWHandler *rh = list_entry(el, JSOSRWHandler, link);
        free_rw_handler(rt, rh);
    }

    list_for_each_safe(el, el1, &ts->os_signal_handlers) {
        JSOSSignalHandler *sh = list_entry(el, JSOSSignalHandler, link);
        free_sh(rt, sh);
    }

    list_for_each_safe(el, el1, &ts->os_timers) {
        JSOSTimer *th = list_entry(el, JSOSTimer, link);
        unlink_timer(rt, th);
        if (!th->has_object)
            free_timer(rt, th);
    }

#ifdef USE_WORKER
    /* XXX: free port_list ? */
    js_free_message_pipe(ts->recv_pipe);
    js_free_message_pipe(ts->send_pipe);
#endif

    free(ts);
    JS_SetRuntimeOpaque(rt, NULL); /* fail safe */
}

/* main loop which calls the user JS callbacks */
int js_std_loop(JSContext *ctx)
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

        if (!os_poll_func || os_poll_func(ctx))
            break;
    }

    if (err < 0) {
        js_std_set_exit_code(rt, 1);
    }

    return js_std_get_exit_code(rt);
}
