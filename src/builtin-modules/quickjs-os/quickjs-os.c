/*
 * QuickJS OS Module
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
#include <math.h>

#ifndef HOST_NAME_MAX
#define HOST_NAME_MAX 255
#endif

#include <sys/stat.h>
#include <dirent.h>

#if defined(_WIN32)
#include <windows.h>
#include <conio.h>
#include <utime.h>
#include <io.h>
#include <tchar.h>
#else
#include <termios.h>
#include <sys/ioctl.h>
#include <sys/wait.h>

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

#include "cutils.h"
#include "list.h"
#include "quickjs-os.h"
#include "quickjs-eventloop.h"
#include "quickjs-std.h"

#ifdef USE_WORKER
#include <pthread.h>
#include <stdatomic.h>
#endif
#include "quickjs-std.h"
#include "quickjs-utils.h"
#include "quickjs-pointer.h"
#include "utf-conv.h"
#include "debugprint.h"
#include "execpath.h"
#include "quickjs-modulesys.h"
#include "quickjs-timers.h"
#include "quickjs-cmdline.h"

#ifdef USE_WORKER
/* Worker data attached to Worker objects */
typedef struct {
    JSWorkerMessagePipe *recv_pipe;
    JSWorkerMessagePipe *send_pipe;
    JSWorkerMessageHandler *msg_handler;
} JSWorkerData;

/* Arguments passed to worker thread */
typedef struct {
    char *filename; /* module filename */
    char *basename; /* module base name */
    JSWorkerMessagePipe *recv_pipe, *send_pipe;
} WorkerFuncArgs;
#endif

static void js_std_dbuf_init(JSContext *ctx, DynBuf *s)
{
    dbuf_init2(s, JS_GetRuntime(ctx), (DynBufReallocFunc *)js_realloc_rt);
}

static BOOL get_bool_option(JSContext *ctx, BOOL *pbool,
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

/**********************************************************/
/* File operations */

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

/**********************************************************/
/* RW handlers */

static JSRWHandler *find_rh(JSThreadState *ts, int fd)
{
    JSRWHandler *rh;
    struct list_head *el;

    list_for_each(el, &ts->rw_handlers) {
        rh = list_entry(el, JSRWHandler, link);
        if (rh->fd == fd)
            return rh;
    }
    return NULL;
}

static JSValue js_os_setReadHandler(JSContext *ctx, JSValueConst this_val,
                                    int argc, JSValueConst *argv, int magic)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    JSRWHandler *rh;
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
                js_rw_handler_free(JS_GetRuntime(ctx), rh);
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
            list_add_tail(&rh->link, &ts->rw_handlers);
        }
        JS_FreeValue(ctx, rh->rw_func[magic]);
        rh->rw_func[magic] = JS_DupValue(ctx, func);
    }
    return JS_UNDEFINED;
}

/**********************************************************/
/* Signal handlers */

static JSSignalHandler *find_sh(JSThreadState *ts, int sig_num)
{
    JSSignalHandler *sh;
    struct list_head *el;
    list_for_each(el, &ts->signal_handlers) {
        sh = list_entry(el, JSSignalHandler, link);
        if (sh->sig_num == sig_num)
            return sh;
    }
    return NULL;
}

static void os_signal_handler(int sig_num)
{
    js_pending_signals |= ((uint64_t)1 << sig_num);
}

#if defined(_WIN32)
typedef void (*sighandler_t)(int sig_num);
#endif

static JSValue js_os_signal(JSContext *ctx, JSValueConst this_val,
                            int argc, JSValueConst *argv)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    JSSignalHandler *sh;
    uint32_t sig_num;
    JSValueConst func;
    sighandler_t handler;

    if (!js_eventloop_is_main_thread(rt))
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
            js_signal_handler_free(JS_GetRuntime(ctx), sh);
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
            list_add_tail(&sh->link, &ts->signal_handlers);
        }
        JS_FreeValue(ctx, sh->func);
        sh->func = JS_DupValue(ctx, func);
        signal(sig_num, os_signal_handler);
    }
    return JS_UNDEFINED;
}

/**********************************************************/
/* Directory operations */

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

/**********************************************************/
/* Stat operations */

#if !defined(_WIN32)
static int64_t timespec_to_ms(const struct timespec *tv)
{
    return (int64_t)tv->tv_sec * 1000 + (tv->tv_nsec / 1000000);
}
#endif

#if defined(_WIN32)
/* Dynamic loading for GetFinalPathNameByHandleA (Vista+) */
#ifndef FILE_NAME_NORMALIZED
#define FILE_NAME_NORMALIZED 0x0
#endif

typedef DWORD (WINAPI *GetFinalPathNameByHandleA_t)(HANDLE, LPSTR, DWORD, DWORD);

static GetFinalPathNameByHandleA_t get_GetFinalPathNameByHandleA(void)
{
    static GetFinalPathNameByHandleA_t fn = NULL;
    static int initialized = 0;
    if (!initialized) {
        HMODULE kernel32 = GetModuleHandleA("kernel32.dll");
        if (kernel32) {
            fn = (GetFinalPathNameByHandleA_t)GetProcAddress(kernel32, "GetFinalPathNameByHandleA");
        }
        initialized = 1;
    }
    return fn;
}
#endif

static JSValue js_os_stat(JSContext *ctx, JSValueConst this_val,
                          int argc, JSValueConst *argv, int is_lstat)
{
    const char *path;
    int err, res;
    struct stat st;
    JSValue obj;
#if defined(_WIN32)
    int is_symlink = 0;
    DWORD attrs;
    GetFinalPathNameByHandleA_t pGetFinalPathNameByHandleA;
#endif

    path = JS_ToCString(ctx, argv[0]);
    if (!path)
        return JS_EXCEPTION;
#if defined(_WIN32)
    /* Check if target is a reparse point (symlink or junction) */
    attrs = GetFileAttributesA(path);
    if (attrs != INVALID_FILE_ATTRIBUTES &&
        (attrs & FILE_ATTRIBUTE_REPARSE_POINT)) {
        is_symlink = 1;
        if (is_lstat) {
            res = stat(path, &st);
        } else {
            pGetFinalPathNameByHandleA = get_GetFinalPathNameByHandleA();
            if (pGetFinalPathNameByHandleA) {
                char resolved[MAX_PATH];
                HANDLE hFile = CreateFileA(path, 0, FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                                           NULL, OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS, NULL);
                if (hFile != INVALID_HANDLE_VALUE) {
                    DWORD len = pGetFinalPathNameByHandleA(hFile, resolved, MAX_PATH, FILE_NAME_NORMALIZED);
                    CloseHandle(hFile);
                    if (len > 0 && len < MAX_PATH) {
                        const char *resolved_path = resolved;
                        if (len > 4 && resolved[0] == '\\' && resolved[1] == '\\' &&
                            resolved[2] == '?' && resolved[3] == '\\') {
                            resolved_path = resolved + 4;
                        }
                        res = stat(resolved_path, &st);
                    } else {
                        res = stat(path, &st);
                    }
                } else {
                    res = stat(path, &st);
                }
            } else {
                res = stat(path, &st);
            }
        }
    } else {
        res = stat(path, &st);
    }
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

    JS_DefinePropertyValueStr(ctx, obj, "dev", JS_NewInt64(ctx, st.st_dev), JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "ino", JS_NewInt64(ctx, st.st_ino), JS_PROP_C_W_E);
#if defined(_WIN32)
    if (is_lstat && is_symlink) {
        st.st_mode = (st.st_mode & ~S_IFMT) | 0120000;
    }
#endif
    JS_DefinePropertyValueStr(ctx, obj, "mode", JS_NewInt32(ctx, st.st_mode), JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "nlink", JS_NewInt64(ctx, st.st_nlink), JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "uid", JS_NewInt64(ctx, st.st_uid), JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "gid", JS_NewInt64(ctx, st.st_gid), JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "rdev", JS_NewInt64(ctx, st.st_rdev), JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "size", JS_NewInt64(ctx, st.st_size), JS_PROP_C_W_E);
#if !defined(_WIN32)
    JS_DefinePropertyValueStr(ctx, obj, "blocks", JS_NewInt64(ctx, st.st_blocks), JS_PROP_C_W_E);
#endif
#if defined(_WIN32)
    JS_DefinePropertyValueStr(ctx, obj, "atime", JS_NewInt64(ctx, (int64_t)st.st_atime * 1000), JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "mtime", JS_NewInt64(ctx, (int64_t)st.st_mtime * 1000), JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "ctime", JS_NewInt64(ctx, (int64_t)st.st_ctime * 1000), JS_PROP_C_W_E);
#elif defined(__APPLE__)
    JS_DefinePropertyValueStr(ctx, obj, "atime", JS_NewInt64(ctx, timespec_to_ms(&st.st_atimespec)), JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "mtime", JS_NewInt64(ctx, timespec_to_ms(&st.st_mtimespec)), JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "ctime", JS_NewInt64(ctx, timespec_to_ms(&st.st_ctimespec)), JS_PROP_C_W_E);
#else
    JS_DefinePropertyValueStr(ctx, obj, "atime", JS_NewInt64(ctx, timespec_to_ms(&st.st_atim)), JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "mtime", JS_NewInt64(ctx, timespec_to_ms(&st.st_mtim)), JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, obj, "ctime", JS_NewInt64(ctx, timespec_to_ms(&st.st_ctim)), JS_PROP_C_W_E);
#endif

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

/* Forward declarations for remaining functions */
static JSValue js_os_symlink(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);
static JSValue js_os_readlink(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);
static JSValue js_os_exec(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);
static JSValue js_os_waitpid(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);
static JSValue js_os_pipe(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);
static JSValue js_os_kill(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);
static JSValue js_os_dup(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);
static JSValue js_os_dup2(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);
static JSValue js_os_access(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);
static JSValue js_os_execPath(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);
static JSValue js_os_chmod(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);
static JSValue js_os_gethostname(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);
static JSValue js_os_WEXITSTATUS(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);
static JSValue js_os_WTERMSIG(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);
static JSValue js_os_WSTOPSIG(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);
static JSValue js_os_WIFEXITED(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);
static JSValue js_os_WIFSIGNALED(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);
static JSValue js_os_WIFSTOPPED(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);
static JSValue js_os_WIFCONTINUED(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv);

/**********************************************************/
/* Symlink/Readlink */

#if defined(_WIN32)
#ifndef SYMBOLIC_LINK_FLAG_DIRECTORY
#define SYMBOLIC_LINK_FLAG_DIRECTORY 0x1
#endif
#ifndef SYMBOLIC_LINK_FLAG_ALLOW_UNPRIVILEGED_CREATE
#define SYMBOLIC_LINK_FLAG_ALLOW_UNPRIVILEGED_CREATE 0x2
#endif

typedef BOOLEAN (WINAPI *CreateSymbolicLinkA_t)(LPCSTR, LPCSTR, DWORD);

static CreateSymbolicLinkA_t get_CreateSymbolicLinkA(void)
{
    static CreateSymbolicLinkA_t fn = NULL;
    static int initialized = 0;
    if (!initialized) {
        HMODULE kernel32 = GetModuleHandleA("kernel32.dll");
        if (kernel32) {
            fn = (CreateSymbolicLinkA_t)GetProcAddress(kernel32, "CreateSymbolicLinkA");
        }
        initialized = 1;
    }
    return fn;
}

static JSValue js_os_symlink(JSContext *ctx, JSValueConst this_val,
                              int argc, JSValueConst *argv)
{
    const char *target, *linkpath;
    DWORD flags;
    DWORD target_attrs;
    CreateSymbolicLinkA_t pCreateSymbolicLinkA;

    pCreateSymbolicLinkA = get_CreateSymbolicLinkA();
    if (!pCreateSymbolicLinkA) {
        return JS_ThrowError(ctx, "symlink is not supported on this version of Windows");
    }

    target = JS_ToCString(ctx, argv[0]);
    if (!target)
        return JS_EXCEPTION;
    linkpath = JS_ToCString(ctx, argv[1]);
    if (!linkpath) {
        JS_FreeCString(ctx, target);
        return JS_EXCEPTION;
    }

    flags = SYMBOLIC_LINK_FLAG_ALLOW_UNPRIVILEGED_CREATE;
    target_attrs = GetFileAttributesA(target);
    if (target_attrs != INVALID_FILE_ATTRIBUTES &&
        (target_attrs & FILE_ATTRIBUTE_DIRECTORY)) {
        flags |= SYMBOLIC_LINK_FLAG_DIRECTORY;
    }

    if (!pCreateSymbolicLinkA(linkpath, target, flags)) {
        DWORD err = GetLastError();
        JS_ThrowError(ctx, "CreateSymbolicLinkA failed (error code %lu)", (unsigned long)err);
        JS_FreeCString(ctx, target);
        JS_FreeCString(ctx, linkpath);
        return JS_EXCEPTION;
    }

    JS_FreeCString(ctx, target);
    JS_FreeCString(ctx, linkpath);
    return JS_UNDEFINED;
}

#ifndef IO_REPARSE_TAG_SYMLINK
#define IO_REPARSE_TAG_SYMLINK 0xA000000CL
#endif
#ifndef IO_REPARSE_TAG_MOUNT_POINT
#define IO_REPARSE_TAG_MOUNT_POINT 0xA0000003L
#endif
#ifndef FSCTL_GET_REPARSE_POINT
#define FSCTL_GET_REPARSE_POINT 0x000900A8
#endif
#ifndef MAXIMUM_REPARSE_DATA_BUFFER_SIZE
#define MAXIMUM_REPARSE_DATA_BUFFER_SIZE (16 * 1024)
#endif

typedef struct {
    ULONG  ReparseTag;
    USHORT ReparseDataLength;
    USHORT Reserved;
    union {
        struct {
            USHORT SubstituteNameOffset;
            USHORT SubstituteNameLength;
            USHORT PrintNameOffset;
            USHORT PrintNameLength;
            ULONG  Flags;
            WCHAR  PathBuffer[1];
        } SymbolicLinkReparseBuffer;
        struct {
            USHORT SubstituteNameOffset;
            USHORT SubstituteNameLength;
            USHORT PrintNameOffset;
            USHORT PrintNameLength;
            WCHAR  PathBuffer[1];
        } MountPointReparseBuffer;
    };
} QJS_REPARSE_DATA_BUFFER;

static JSValue js_os_readlink(JSContext *ctx, JSValueConst this_val,
                              int argc, JSValueConst *argv)
{
    const char *path;
    HANDLE hFile;
    BYTE buffer[MAXIMUM_REPARSE_DATA_BUFFER_SIZE];
    QJS_REPARSE_DATA_BUFFER *reparse_data = (QJS_REPARSE_DATA_BUFFER *)buffer;
    DWORD bytes_returned;
    WCHAR *target_path;
    USHORT target_len;
    char *utf8_result;
    JSValue result;

    path = JS_ToCString(ctx, argv[0]);
    if (!path)
        return JS_EXCEPTION;

    hFile = CreateFileA(path, FILE_READ_ATTRIBUTES,
        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
        NULL, OPEN_EXISTING,
        FILE_FLAG_OPEN_REPARSE_POINT | FILE_FLAG_BACKUP_SEMANTICS, NULL);

    if (hFile == INVALID_HANDLE_VALUE) {
        DWORD err = GetLastError();
        JS_ThrowError(ctx, "CreateFileA failed (error code %lu)", (unsigned long)err);
        JS_FreeCString(ctx, path);
        return JS_EXCEPTION;
    }

    if (!DeviceIoControl(hFile, FSCTL_GET_REPARSE_POINT, NULL, 0,
            buffer, sizeof(buffer), &bytes_returned, NULL)) {
        DWORD err = GetLastError();
        CloseHandle(hFile);
        JS_ThrowError(ctx, "DeviceIoControl failed (error code %lu)", (unsigned long)err);
        JS_FreeCString(ctx, path);
        return JS_EXCEPTION;
    }

    CloseHandle(hFile);

    if (reparse_data->ReparseTag == IO_REPARSE_TAG_SYMLINK) {
        target_path = reparse_data->SymbolicLinkReparseBuffer.PathBuffer +
                      (reparse_data->SymbolicLinkReparseBuffer.PrintNameOffset / sizeof(WCHAR));
        target_len = reparse_data->SymbolicLinkReparseBuffer.PrintNameLength / sizeof(WCHAR);
    } else if (reparse_data->ReparseTag == IO_REPARSE_TAG_MOUNT_POINT) {
        target_path = reparse_data->MountPointReparseBuffer.PathBuffer +
                      (reparse_data->MountPointReparseBuffer.PrintNameOffset / sizeof(WCHAR));
        target_len = reparse_data->MountPointReparseBuffer.PrintNameLength / sizeof(WCHAR);
    } else {
        JS_ThrowError(ctx, "Not a symbolic link");
        JS_FreeCString(ctx, path);
        return JS_EXCEPTION;
    }

    utf8_result = utf16_to_utf8((const uint16_t *)target_path, target_len, NULL, NULL, NULL, NULL, NULL);
    JS_FreeCString(ctx, path);

    if (!utf8_result) {
        return JS_ThrowOutOfMemory(ctx);
    }

    result = JS_NewString(ctx, utf8_result);
    free(utf8_result);
    return result;
}
#else /* !_WIN32 */
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
    JS_FreeCString(ctx, target);
    JS_FreeCString(ctx, linkpath);
    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(err), err);
        return JS_EXCEPTION;
    }
    return JS_UNDEFINED;
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
    JS_FreeCString(ctx, path);

    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(err), err);
        return JS_EXCEPTION;
    }
    buf[ret] = '\0';
    return JS_NewString(ctx, buf);
}
#endif /* !_WIN32 */

/**********************************************************/
/* Process functions - common implementations */

static JSValue js_os_access(JSContext *ctx, JSValueConst this_val,
                            int argc, JSValueConst *argv)
{
    const char *path;
    int mode, ret, err;

    path = JS_ToCString(ctx, argv[0]);
    if (!path)
        return JS_EXCEPTION;
    if (JS_ToInt32(ctx, &mode, argv[1])) {
        JS_FreeCString(ctx, path);
        return JS_EXCEPTION;
    }
    ret = access(path, mode);
    err = errno;
    JS_FreeCString(ctx, path);
    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(err), err);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, err));
        return JS_EXCEPTION;
    }
    return JS_UNDEFINED;
}

static JSValue js_os_execPath(JSContext *ctx, JSValueConst this_val,
                              int argc, JSValueConst *argv)
{
    char error_msg[2048];
    char *path = execpath(NULL, NULL, error_msg);
    if (!path) {
        return JS_ThrowError(ctx, "failed to get current executable path: %s", error_msg);
    }
    JSValue result = JS_NewString(ctx, path);
    free(path);
    return result;
}

static JSValue js_os_chmod(JSContext *ctx, JSValueConst this_val,
                           int argc, JSValueConst *argv)
{
    const char *path;
    int mode, ret, err;

    path = JS_ToCString(ctx, argv[0]);
    if (!path)
        return JS_EXCEPTION;
    if (JS_ToInt32(ctx, &mode, argv[1])) {
        JS_FreeCString(ctx, path);
        return JS_EXCEPTION;
    }
    ret = chmod(path, mode);
    err = errno;
    JS_FreeCString(ctx, path);
    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(err), err);
        return JS_EXCEPTION;
    }
    return JS_UNDEFINED;
}

static JSValue js_os_gethostname(JSContext *ctx, JSValueConst this_val,
                                 int argc, JSValueConst *argv)
{
    char buf[HOST_NAME_MAX + 1];
    if (gethostname(buf, sizeof(buf)) < 0) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
        return JS_EXCEPTION;
    }
    return JS_NewString(ctx, buf);
}

/**********************************************************/
/* Platform-specific process functions */

#if defined(_WIN32)
/* Windows implementations */

static JSValue js_os_dup(JSContext *ctx, JSValueConst this_val,
                         int argc, JSValueConst *argv)
{
    int fd, ret;
    if (JS_ToInt32(ctx, &fd, argv[0]))
        return JS_EXCEPTION;
    ret = _dup(fd);
    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
        return JS_EXCEPTION;
    }
    return JS_NewInt32(ctx, ret);
}

static JSValue js_os_dup2(JSContext *ctx, JSValueConst this_val,
                          int argc, JSValueConst *argv)
{
    int fd, fd2, ret;
    if (JS_ToInt32(ctx, &fd, argv[0]))
        return JS_EXCEPTION;
    if (JS_ToInt32(ctx, &fd2, argv[1]))
        return JS_EXCEPTION;
    ret = _dup2(fd, fd2);
    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
        return JS_EXCEPTION;
    }
    return JS_NewInt32(ctx, ret);
}

static JSValue js_os_pipe(JSContext *ctx, JSValueConst this_val,
                          int argc, JSValueConst *argv)
{
    int pipe_fds[2], ret;
    JSValue obj;

    ret = _pipe(pipe_fds, 4096, _O_BINARY);
    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
        return JS_EXCEPTION;
    }

    obj = JS_NewArray(ctx);
    if (JS_IsException(obj))
        return obj;
    JS_DefinePropertyValueUint32(ctx, obj, 0, JS_NewInt32(ctx, pipe_fds[0]), JS_PROP_C_W_E);
    JS_DefinePropertyValueUint32(ctx, obj, 1, JS_NewInt32(ctx, pipe_fds[1]), JS_PROP_C_W_E);
    return obj;
}

static JSValue js_os_kill(JSContext *ctx, JSValueConst this_val,
                          int argc, JSValueConst *argv)
{
    int pid, sig;
    HANDLE process_handle;

    if (JS_ToInt32(ctx, &pid, argv[0]))
        return JS_EXCEPTION;
    if (JS_ToInt32(ctx, &sig, argv[1]))
        return JS_EXCEPTION;

    process_handle = OpenProcess(PROCESS_TERMINATE, FALSE, (DWORD)pid);
    if (process_handle == NULL) {
        JS_ThrowError(ctx, "OpenProcess failed (error code %lu)", (unsigned long)GetLastError());
        return JS_EXCEPTION;
    }

    if (!TerminateProcess(process_handle, (UINT)sig)) {
        DWORD err = GetLastError();
        CloseHandle(process_handle);
        JS_ThrowError(ctx, "TerminateProcess failed (error code %lu)", (unsigned long)err);
        return JS_EXCEPTION;
    }

    CloseHandle(process_handle);
    return JS_UNDEFINED;
}

/* W* status helper functions for Windows */
static JSValue js_os_WEXITSTATUS(JSContext *ctx, JSValueConst this_val,
                                 int argc, JSValueConst *argv)
{
    int status;
    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;
    return JS_NewInt32(ctx, (status >> 8) & 0xff);
}

static JSValue js_os_WTERMSIG(JSContext *ctx, JSValueConst this_val,
                               int argc, JSValueConst *argv)
{
    int status;
    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;
    return JS_NewInt32(ctx, status & 0x7f);
}

static JSValue js_os_WSTOPSIG(JSContext *ctx, JSValueConst this_val,
                               int argc, JSValueConst *argv)
{
    int status;
    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;
    return JS_NewInt32(ctx, (status >> 8) & 0xff);
}

static JSValue js_os_WIFEXITED(JSContext *ctx, JSValueConst this_val,
                                int argc, JSValueConst *argv)
{
    int status;
    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;
    return JS_NewBool(ctx, (status & 0x7f) == 0);
}

static JSValue js_os_WIFSIGNALED(JSContext *ctx, JSValueConst this_val,
                                  int argc, JSValueConst *argv)
{
    int status;
    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;
    return JS_NewBool(ctx, (status & 0x7f) != 0 && (status & 0x7f) != 0x7f);
}

static JSValue js_os_WIFSTOPPED(JSContext *ctx, JSValueConst this_val,
                                 int argc, JSValueConst *argv)
{
    int status;
    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;
    return JS_NewBool(ctx, (status & 0xff) == 0x7f);
}

static JSValue js_os_WIFCONTINUED(JSContext *ctx, JSValueConst this_val,
                                   int argc, JSValueConst *argv)
{
    return JS_NewBool(ctx, FALSE);
}

/* Forward declarations for class IDs used by Windows functions */
static JSClassID js_win32_handle_class_id;

/* Windows helper: throw error with FormatMessage */
static JSValue js_throw_win32_error(JSContext *ctx, const char *prefix, DWORD error_code)
{
    WCHAR *msg_buf = NULL;
    DWORD msg_len = FormatMessageW(
        FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS,
        NULL, error_code, MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
        (LPWSTR)&msg_buf, 0, NULL);

    if (msg_len > 0 && msg_buf != NULL) {
        while (msg_len > 0 && (msg_buf[msg_len - 1] == L'\r' || msg_buf[msg_len - 1] == L'\n'))
            msg_buf[--msg_len] = L'\0';

        char *utf8_msg = utf16_to_utf8((const uint16_t *)msg_buf, msg_len,
                                        NULL, NULL, NULL, NULL, NULL);
        LocalFree(msg_buf);

        if (utf8_msg != NULL) {
            JS_ThrowError(ctx, "%s: %s (error code %lu)", prefix, utf8_msg, (unsigned long)error_code);
            free(utf8_msg);
        } else {
            JS_ThrowError(ctx, "%s: error code %lu", prefix, (unsigned long)error_code);
        }
    } else {
        if (msg_buf != NULL)
            LocalFree(msg_buf);
        JS_ThrowError(ctx, "%s: error code %lu", prefix, (unsigned long)error_code);
    }
    return JS_EXCEPTION;
}

/* Windows helper: malloc for UTF conversion */
static void *js_malloc_for_utf_conv(size_t size, void *opaque)
{
    return js_malloc((JSContext *)opaque, size);
}

/* Windows helper: convert C string to wide string */
static WCHAR *cstr_to_wstring(JSContext *ctx, const char *utf8)
{
    int conv_error;
    size_t conv_error_offset;
    WCHAR *wide = (WCHAR *)utf8_to_utf16(utf8, NULL, &conv_error,
                                          &conv_error_offset,
                                          js_malloc_for_utf_conv, ctx);
    if (wide == NULL) {
        JS_ThrowError(ctx, "UTF-8 to UTF-16 conversion failed at byte offset %lu: %s",
                      (unsigned long)conv_error_offset, utf_conv_strerror(conv_error));
    }
    return wide;
}

/* Windows helper: get HANDLE from stdio argument (FILE or fd) */
static HANDLE js_get_handle_from_stdio_arg(JSContext *ctx, JSValueConst val)
{
    if (JS_IsObject(val)) {
        JSSTDFile *s = JS_GetOpaque(val, js_std_file_class_id);
        if (s) {
            if (!s->f) {
                JS_ThrowError(ctx, "FILE object has been closed");
                return INVALID_HANDLE_VALUE;
            }
            int fd = fileno(s->f);
            if (fd < 0) {
                JS_ThrowError(ctx, "failed to get fd from FILE object (fileno returned %d)", fd);
                return INVALID_HANDLE_VALUE;
            }
            HANDLE h = (HANDLE)_get_osfhandle(fd);
            if (h == INVALID_HANDLE_VALUE) {
                JS_ThrowError(ctx, "_get_osfhandle failed for FILE object (fd %d)", fd);
                return INVALID_HANDLE_VALUE;
            }
            return h;
        }
    }

    if (JS_IsNumber(val)) {
        int fd;
        if (JS_ToInt32(ctx, &fd, val))
            return INVALID_HANDLE_VALUE;
        HANDLE h = (HANDLE)_get_osfhandle(fd);
        if (h == INVALID_HANDLE_VALUE) {
            JS_ThrowError(ctx, "_get_osfhandle failed for fd %d", fd);
            return INVALID_HANDLE_VALUE;
        }
        return h;
    }

    JS_ThrowTypeError(ctx, "expected a FILE object or file descriptor number");
    return INVALID_HANDLE_VALUE;
}

/* Windows PID map for tracking child processes started with block:false */
typedef struct Win32PidMapEntry {
    DWORD pid;
    HANDLE process_handle;
    struct Win32PidMapEntry *next;
} Win32PidMapEntry;

static Win32PidMapEntry *win32_pid_map_head = NULL;

static void win32_pid_map_add(DWORD pid, HANDLE process_handle)
{
    Win32PidMapEntry *entry = malloc(sizeof(Win32PidMapEntry));
    if (!entry) return;
    entry->pid = pid;
    entry->process_handle = process_handle;
    entry->next = win32_pid_map_head;
    win32_pid_map_head = entry;
}

static HANDLE win32_pid_map_find(DWORD pid)
{
    Win32PidMapEntry *entry = win32_pid_map_head;
    while (entry) {
        if (entry->pid == pid)
            return entry->process_handle;
        entry = entry->next;
    }
    return INVALID_HANDLE_VALUE;
}

static HANDLE win32_pid_map_remove(DWORD pid)
{
    Win32PidMapEntry **pp = &win32_pid_map_head;
    while (*pp) {
        if ((*pp)->pid == pid) {
            Win32PidMapEntry *entry = *pp;
            HANDLE h = entry->process_handle;
            *pp = entry->next;
            free(entry);
            return h;
        }
        pp = &(*pp)->next;
    }
    return INVALID_HANDLE_VALUE;
}

/* Windows command line argument quoting */
static void win32_quote_arg(DynBuf *dbuf, const char *arg)
{
    BOOL need_quotes = FALSE;
    const char *p;

    if (arg[0] == '\0') {
        need_quotes = TRUE;
    } else {
        for (p = arg; *p; p++) {
            if (*p == ' ' || *p == '\t' || *p == '"') {
                need_quotes = TRUE;
                break;
            }
        }
    }

    if (!need_quotes) {
        dbuf_put(dbuf, (const uint8_t *)arg, strlen(arg));
        return;
    }

    dbuf_putc(dbuf, '"');
    for (p = arg; *p; p++) {
        int num_backslashes = 0;

        while (*p == '\\') {
            num_backslashes++;
            p++;
        }

        if (*p == '\0') {
            for (int i = 0; i < num_backslashes * 2; i++)
                dbuf_putc(dbuf, '\\');
            break;
        } else if (*p == '"') {
            for (int i = 0; i < num_backslashes * 2 + 1; i++)
                dbuf_putc(dbuf, '\\');
            dbuf_putc(dbuf, '"');
        } else {
            for (int i = 0; i < num_backslashes; i++)
                dbuf_putc(dbuf, '\\');
            dbuf_putc(dbuf, *p);
        }
    }
    dbuf_putc(dbuf, '"');
}

/* Windows helper: convert JS value to wide string */
static WCHAR *js_to_wstring(JSContext *ctx, JSValueConst val)
{
    const char *utf8 = JS_ToCString(ctx, val);
    if (utf8 == NULL)
        return NULL;

    int conv_error;
    size_t conv_error_offset;
    WCHAR *wide = (WCHAR *)utf8_to_utf16(utf8, NULL, &conv_error,
                                          &conv_error_offset,
                                          js_malloc_for_utf_conv, ctx);
    JS_FreeCString(ctx, utf8);
    if (wide == NULL) {
        JS_ThrowError(ctx, "UTF-8 to UTF-16 conversion failed at byte offset %lu: %s",
                      (unsigned long)conv_error_offset, utf_conv_strerror(conv_error));
    }
    return wide;
}

/* Win32Handle helper: create a new Win32Handle JS object */
static JSValue js_new_win32_handle(JSContext *ctx, HANDLE handle)
{
    JSValue obj = JS_NewObjectClass(ctx, js_win32_handle_class_id);
    if (JS_IsException(obj))
        return obj;

    HANDLE *handle_ptr = js_malloc(ctx, sizeof(HANDLE));
    if (handle_ptr == NULL) {
        JS_FreeValue(ctx, obj);
        return JS_EXCEPTION;
    }
    *handle_ptr = handle;
    JS_SetOpaque(obj, handle_ptr);
    return obj;
}

/* Win32Handle helper: extract HANDLE from a Win32Handle or Pointer object */
static HANDLE js_get_handle(JSContext *ctx, JSValueConst val)
{
    HANDLE *handle_ptr;

    if (!JS_IsObject(val)) {
        JS_ThrowTypeError(ctx, "expected a Win32Handle object");
        return INVALID_HANDLE_VALUE;
    }

    if (JS_VALUE_GET_CLASS_ID(val) == js_win32_handle_class_id) {
        handle_ptr = JS_GetOpaque(val, js_win32_handle_class_id);
        if (handle_ptr == NULL) {
            JS_ThrowTypeError(ctx, "invalid Win32Handle object");
            return INVALID_HANDLE_VALUE;
        }
        return *handle_ptr;
    } else if (JS_VALUE_GET_CLASS_ID(val) == js_pointer_class_id) {
        return (HANDLE)JS_GetOpaque(val, js_pointer_class_id);
    }

    JS_ThrowTypeError(ctx, "expected a Win32Handle or Pointer object");
    return INVALID_HANDLE_VALUE;
}

/* Win32Handle helper: close handle and mark as invalid */
static int js_close_win32_handle(JSContext *ctx, JSValueConst val)
{
    if (!JS_IsObject(val) || JS_VALUE_GET_CLASS_ID(val) != js_win32_handle_class_id) {
        JS_ThrowTypeError(ctx, "expected a Win32Handle object");
        return -1;
    }

    HANDLE *handle_ptr = JS_GetOpaque(val, js_win32_handle_class_id);
    if (handle_ptr == NULL || *handle_ptr == INVALID_HANDLE_VALUE) {
        JS_ThrowError(ctx, "handle is already closed");
        return -1;
    }

    if (!CloseHandle(*handle_ptr)) {
        js_throw_win32_error(ctx, "CloseHandle failed", GetLastError());
        return -1;
    }

    *handle_ptr = INVALID_HANDLE_VALUE;
    return 0;
}

/* Windows os.CreateProcess - returns {pid, processHandle, tid, threadHandle} */
static JSValue js_os_CreateProcess(JSContext *ctx, JSValueConst this_val,
                                   int argc, JSValueConst *argv)
{
    STARTUPINFOW startup_info = {0};
    PROCESS_INFORMATION process_info = {0};
    const char *module_name = NULL;
    const char *command_line = NULL;
    WCHAR *module_name_wide = NULL;
    WCHAR *command_line_wide = NULL;
    uint32_t flags = 0;
    WCHAR *env_block = NULL;
    WCHAR *current_dir_wide = NULL;
    BOOL inherit_handles = FALSE;

    startup_info.cb = sizeof(startup_info);

    if (argc == 0) {
        return JS_ThrowTypeError(ctx, "CreateProcess requires at least one argument");
    }

    command_line = JS_ToCString(ctx, argv[0]);
    if (command_line == NULL)
        return JS_EXCEPTION;

    if (argc >= 2 && JS_IsObject(argv[1])) {
        JSValue options_val = argv[1];
        JSValue val;

        val = JS_GetPropertyStr(ctx, options_val, "moduleName");
        if (JS_IsException(val))
            goto fail;
        if (!JS_IsUndefined(val)) {
            module_name = JS_ToCString(ctx, val);
            JS_FreeValue(ctx, val);
            if (module_name == NULL)
                goto fail;
        }

        val = JS_GetPropertyStr(ctx, options_val, "flags");
        if (JS_IsException(val))
            goto fail;
        if (!JS_IsUndefined(val)) {
            if (JS_ToUint32(ctx, &flags, val)) {
                JS_FreeValue(ctx, val);
                goto fail;
            }
            JS_FreeValue(ctx, val);
        }

        val = JS_GetPropertyStr(ctx, options_val, "cwd");
        if (JS_IsException(val))
            goto fail;
        if (!JS_IsUndefined(val)) {
            current_dir_wide = js_to_wstring(ctx, val);
            JS_FreeValue(ctx, val);
            if (current_dir_wide == NULL)
                goto fail;
        }

        /* stdio redirection */
        static const char *std_names[3] = { "stdin", "stdout", "stderr" };
        HANDLE std_handles[3] = { INVALID_HANDLE_VALUE, INVALID_HANDLE_VALUE, INVALID_HANDLE_VALUE };
        for (int std_i = 0; std_i < 3; std_i++) {
            val = JS_GetPropertyStr(ctx, options_val, std_names[std_i]);
            if (JS_IsException(val))
                goto fail;
            if (!JS_IsUndefined(val)) {
                std_handles[std_i] = js_get_handle_from_stdio_arg(ctx, val);
                JS_FreeValue(ctx, val);
                if (std_handles[std_i] == INVALID_HANDLE_VALUE)
                    goto fail;
            }
        }

        if (std_handles[0] != INVALID_HANDLE_VALUE ||
            std_handles[1] != INVALID_HANDLE_VALUE ||
            std_handles[2] != INVALID_HANDLE_VALUE) {
            startup_info.dwFlags |= STARTF_USESTDHANDLES;
            startup_info.hStdInput = std_handles[0] != INVALID_HANDLE_VALUE
                ? std_handles[0] : GetStdHandle(STD_INPUT_HANDLE);
            startup_info.hStdOutput = std_handles[1] != INVALID_HANDLE_VALUE
                ? std_handles[1] : GetStdHandle(STD_OUTPUT_HANDLE);
            startup_info.hStdError = std_handles[2] != INVALID_HANDLE_VALUE
                ? std_handles[2] : GetStdHandle(STD_ERROR_HANDLE);
            inherit_handles = TRUE;
        }
    }

    if (module_name != NULL) {
        module_name_wide = cstr_to_wstring(ctx, module_name);
        if (module_name_wide == NULL)
            goto fail;
    }
    command_line_wide = cstr_to_wstring(ctx, command_line);
    if (command_line_wide == NULL)
        goto fail;

    if (!CreateProcessW(module_name_wide, command_line_wide,
                        NULL, NULL, inherit_handles, flags,
                        env_block, current_dir_wide,
                        &startup_info, &process_info)) {
        js_throw_win32_error(ctx, "CreateProcess failed", GetLastError());
        goto fail;
    }

    JS_FreeCString(ctx, module_name);
    JS_FreeCString(ctx, command_line);
    if (module_name_wide) js_free(ctx, module_name_wide);
    if (command_line_wide) js_free(ctx, command_line_wide);
    if (current_dir_wide) js_free(ctx, current_dir_wide);
    if (env_block) js_free(ctx, env_block);

    JSValue result = JS_NewObject(ctx);
    if (JS_IsException(result)) {
        CloseHandle(process_info.hProcess);
        CloseHandle(process_info.hThread);
        return JS_EXCEPTION;
    }

    JS_DefinePropertyValueStr(ctx, result, "pid",
        JS_NewInt32(ctx, (int)process_info.dwProcessId), JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, result, "processHandle",
        js_new_win32_handle(ctx, process_info.hProcess), JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, result, "tid",
        JS_NewInt32(ctx, (int)process_info.dwThreadId), JS_PROP_C_W_E);
    JS_DefinePropertyValueStr(ctx, result, "threadHandle",
        js_new_win32_handle(ctx, process_info.hThread), JS_PROP_C_W_E);

    return result;

 fail:
    JS_FreeCString(ctx, module_name);
    JS_FreeCString(ctx, command_line);
    if (module_name_wide) js_free(ctx, module_name_wide);
    if (command_line_wide) js_free(ctx, command_line_wide);
    if (current_dir_wide) js_free(ctx, current_dir_wide);
    if (env_block) js_free(ctx, env_block);
    return JS_EXCEPTION;
}

/* Windows os.WaitForSingleObject */
static JSValue js_os_WaitForSingleObject(JSContext *ctx, JSValueConst this_val,
                                         int argc, JSValueConst *argv)
{
    if (argc < 1) {
        return JS_ThrowTypeError(ctx, "WaitForSingleObject requires at least 1 argument");
    }

    HANDLE handle = js_get_handle(ctx, argv[0]);
    if (handle == INVALID_HANDLE_VALUE)
        return JS_EXCEPTION;

    DWORD timeout_ms = INFINITE;
    if (argc >= 2 && !JS_IsUndefined(argv[1])) {
        double timeout_val;
        if (JS_ToFloat64(ctx, &timeout_val, argv[1]))
            return JS_EXCEPTION;
        if (isinf(timeout_val) && timeout_val > 0) {
            timeout_ms = INFINITE;
        } else if (timeout_val < 0) {
            return JS_ThrowRangeError(ctx, "timeout must be non-negative");
        } else {
            timeout_ms = (DWORD)timeout_val;
        }
    }

    DWORD result = WaitForSingleObject(handle, timeout_ms);
    if (result == WAIT_FAILED) {
        return js_throw_win32_error(ctx, "WaitForSingleObject failed", GetLastError());
    }

    return JS_NewUint32(ctx, result);
}

/* Windows os.GetExitCodeProcess */
static JSValue js_os_GetExitCodeProcess(JSContext *ctx, JSValueConst this_val,
                                        int argc, JSValueConst *argv)
{
    if (argc < 1) {
        return JS_ThrowTypeError(ctx, "GetExitCodeProcess requires 1 argument");
    }

    HANDLE handle = js_get_handle(ctx, argv[0]);
    if (handle == INVALID_HANDLE_VALUE)
        return JS_EXCEPTION;

    DWORD exit_code;
    if (!GetExitCodeProcess(handle, &exit_code)) {
        return js_throw_win32_error(ctx, "GetExitCodeProcess failed", GetLastError());
    }

    return JS_NewUint32(ctx, exit_code);
}

/* Windows os.TerminateProcess */
static JSValue js_os_TerminateProcess(JSContext *ctx, JSValueConst this_val,
                                      int argc, JSValueConst *argv)
{
    if (argc < 2) {
        return JS_ThrowTypeError(ctx, "TerminateProcess requires 2 arguments");
    }

    HANDLE handle = js_get_handle(ctx, argv[0]);
    if (handle == INVALID_HANDLE_VALUE)
        return JS_EXCEPTION;

    uint32_t exit_code;
    if (JS_ToUint32(ctx, &exit_code, argv[1]))
        return JS_EXCEPTION;

    if (!TerminateProcess(handle, exit_code)) {
        return js_throw_win32_error(ctx, "TerminateProcess failed", GetLastError());
    }

    return JS_UNDEFINED;
}

/* Windows os.CloseHandle */
static JSValue js_os_CloseHandle(JSContext *ctx, JSValueConst this_val,
                                 int argc, JSValueConst *argv)
{
    if (argc < 1) {
        return JS_ThrowTypeError(ctx, "CloseHandle requires 1 argument");
    }

    /* For Win32Handle objects, use special close that marks as invalid */
    if (JS_IsObject(argv[0]) &&
        JS_VALUE_GET_CLASS_ID(argv[0]) == js_win32_handle_class_id) {
        if (js_close_win32_handle(ctx, argv[0]) < 0)
            return JS_EXCEPTION;
        return JS_UNDEFINED;
    }

    /* Fall back to plain Pointer-based handle closing */
    HANDLE handle = js_get_handle(ctx, argv[0]);
    if (handle == INVALID_HANDLE_VALUE)
        return JS_EXCEPTION;

    if (!CloseHandle(handle)) {
        return js_throw_win32_error(ctx, "CloseHandle failed", GetLastError());
    }

    return JS_UNDEFINED;
}

/* Windows os.CreatePipe - returns { readEnd: FILE, writeEnd: FILE } */
static JSValue js_os_CreatePipe(JSContext *ctx, JSValueConst this_val,
                                int argc, JSValueConst *argv)
{
    HANDLE read_handle, write_handle;
    SECURITY_ATTRIBUTES sec_attrs;
    BOOL inherit_handle = TRUE;

    if (argc >= 1 && JS_IsObject(argv[0])) {
        JSValue val = JS_GetPropertyStr(ctx, argv[0], "inheritHandle");
        if (!JS_IsException(val) && !JS_IsUndefined(val)) {
            inherit_handle = JS_ToBool(ctx, val) ? TRUE : FALSE;
        }
        JS_FreeValue(ctx, val);
    }

    sec_attrs.nLength = sizeof(SECURITY_ATTRIBUTES);
    sec_attrs.bInheritHandle = inherit_handle;
    sec_attrs.lpSecurityDescriptor = NULL;

    if (!CreatePipe(&read_handle, &write_handle, &sec_attrs, 0)) {
        return js_throw_win32_error(ctx, "CreatePipe failed", GetLastError());
    }

    /* Convert read HANDLE to FILE* via CRT fd */
    int read_fd = _open_osfhandle((intptr_t)read_handle, _O_RDONLY | _O_BINARY);
    if (read_fd == -1) {
        CloseHandle(read_handle);
        CloseHandle(write_handle);
        return JS_ThrowError(ctx, "CreatePipe: _open_osfhandle failed for read end (errno %d)", errno);
    }
    FILE *read_file = fdopen(read_fd, "rb");
    if (!read_file) {
        _close(read_fd); /* also closes read_handle */
        CloseHandle(write_handle);
        return JS_ThrowError(ctx, "CreatePipe: fdopen failed for read end (errno %d)", errno);
    }

    /* Convert write HANDLE to FILE* via CRT fd */
    int write_fd = _open_osfhandle((intptr_t)write_handle, _O_WRONLY | _O_BINARY);
    if (write_fd == -1) {
        fclose(read_file); /* closes read_fd and read_handle */
        CloseHandle(write_handle);
        return JS_ThrowError(ctx, "CreatePipe: _open_osfhandle failed for write end (errno %d)", errno);
    }
    FILE *write_file = fdopen(write_fd, "wb");
    if (!write_file) {
        fclose(read_file);
        _close(write_fd); /* also closes write_handle */
        return JS_ThrowError(ctx, "CreatePipe: fdopen failed for write end (errno %d)", errno);
    }

    JSValue result = JS_NewObject(ctx);
    if (JS_IsException(result)) {
        fclose(read_file);
        fclose(write_file);
        return JS_EXCEPTION;
    }

    /* Create FILE objects using js_std_new_file from quickjs-std */
    JSValue read_file_val = js_std_new_file(ctx, read_file, TRUE, FALSE);
    JS_SetPropertyStr(ctx, read_file_val, "target", JS_NewString(ctx, "pipe:read"));
    JS_DefinePropertyValueStr(ctx, result, "readEnd", read_file_val, JS_PROP_C_W_E);

    JSValue write_file_val = js_std_new_file(ctx, write_file, TRUE, FALSE);
    JS_SetPropertyStr(ctx, write_file_val, "target", JS_NewString(ctx, "pipe:write"));
    JS_DefinePropertyValueStr(ctx, result, "writeEnd", write_file_val, JS_PROP_C_W_E);

    return result;
}

/* Windows os.exec */
static JSValue js_os_exec(JSContext *ctx, JSValueConst this_val,
                          int argc, JSValueConst *argv)
{
    JSValueConst options, args = argv[0];
    JSValue val, ret_val;
    const char *file = NULL, *str, *cwd_str = NULL;
    uint32_t exec_argc, i;
    int ret;
    BOOL block_flag = TRUE;
    STARTUPINFOW startup_info = {0};
    PROCESS_INFORMATION process_info = {0};
    WCHAR *command_line_wide = NULL;
    WCHAR *module_name_wide = NULL;
    WCHAR *current_dir_wide = NULL;
    WCHAR *env_block = NULL;
    uint32_t create_flags = 0;
    BOOL inherit_handles = FALSE;
    static const char *std_names[3] = { "stdin", "stdout", "stderr" };
    HANDLE std_handles[3] = { INVALID_HANDLE_VALUE, INVALID_HANDLE_VALUE, INVALID_HANDLE_VALUE };

    startup_info.cb = sizeof(startup_info);

    val = JS_GetPropertyStr(ctx, args, "length");
    if (JS_IsException(val))
        return JS_EXCEPTION;
    ret = JS_ToUint32(ctx, &exec_argc, val);
    JS_FreeValue(ctx, val);
    if (ret)
        return JS_EXCEPTION;
    if (exec_argc < 1 || exec_argc > 65535)
        return JS_ThrowTypeError(ctx, "invalid number of arguments");

    DynBuf cmd_buf;
    js_std_dbuf_init(ctx, &cmd_buf);

    for (i = 0; i < exec_argc; i++) {
        val = JS_GetPropertyUint32(ctx, args, i);
        if (JS_IsException(val))
            goto exception;
        str = JS_ToCString(ctx, val);
        JS_FreeValue(ctx, val);
        if (!str)
            goto exception;
        if (i > 0)
            dbuf_putc(&cmd_buf, ' ');
        win32_quote_arg(&cmd_buf, str);
        JS_FreeCString(ctx, str);
    }
    dbuf_putc(&cmd_buf, '\0');

    if (argc >= 2) {
        options = argv[1];

        if (get_bool_option(ctx, &block_flag, options, "block"))
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
            cwd_str = JS_ToCString(ctx, val);
            JS_FreeValue(ctx, val);
            if (!cwd_str)
                goto exception;
        }

        for (int std_i = 0; std_i < 3; std_i++) {
            val = JS_GetPropertyStr(ctx, options, std_names[std_i]);
            if (JS_IsException(val))
                goto exception;
            if (!JS_IsUndefined(val)) {
                std_handles[std_i] = js_get_handle_from_stdio_arg(ctx, val);
                JS_FreeValue(ctx, val);
                if (std_handles[std_i] == INVALID_HANDLE_VALUE)
                    goto exception;
            }
        }

        val = JS_GetPropertyStr(ctx, options, "env");
        if (JS_IsException(val))
            goto exception;
        if (!JS_IsUndefined(val)) {
            if (!JS_IsObject(val)) {
                JS_ThrowTypeError(ctx, "'env' option must be an object");
                JS_FreeValue(ctx, val);
                goto exception;
            }

            DynBuf env_dbuf;
            js_std_dbuf_init(ctx, &env_dbuf);

            QJUForEachPropertyState *foreach = QJU_NewForEachPropertyState(ctx, val, JS_GPN_STRING_MASK | JS_GPN_ENUM_ONLY);
            if (foreach == NULL) {
                dbuf_free(&env_dbuf);
                JS_FreeValue(ctx, val);
                goto exception;
            }
            QJU_ForEachProperty(ctx, foreach) {
                JSValue read_result = QJU_ForEachProperty_Read(ctx, val, foreach);
                if (JS_IsException(read_result)) {
                    dbuf_free(&env_dbuf);
                    QJU_FreeForEachPropertyState(ctx, foreach);
                    JS_FreeValue(ctx, val);
                    goto exception;
                }

                const char *key_str = JS_AtomToCString(ctx, foreach->key);
                if (key_str == NULL) {
                    dbuf_free(&env_dbuf);
                    QJU_FreeForEachPropertyState(ctx, foreach);
                    JS_FreeValue(ctx, val);
                    goto exception;
                }

                const char *val_str = JS_ToCString(ctx, foreach->val);
                if (val_str == NULL) {
                    JS_FreeCString(ctx, key_str);
                    dbuf_free(&env_dbuf);
                    QJU_FreeForEachPropertyState(ctx, foreach);
                    JS_FreeValue(ctx, val);
                    goto exception;
                }

                DynBuf entry_buf;
                dbuf_init(&entry_buf);
                dbuf_put(&entry_buf, (const uint8_t *)key_str, strlen(key_str));
                dbuf_putc(&entry_buf, '=');
                dbuf_put(&entry_buf, (const uint8_t *)val_str, strlen(val_str));
                dbuf_putc(&entry_buf, '\0');
                JS_FreeCString(ctx, key_str);
                JS_FreeCString(ctx, val_str);

                size_t wide_len;
                WCHAR *wide_entry = (WCHAR *)utf8_to_utf16(
                    (const char *)entry_buf.buf, &wide_len, NULL, NULL,
                    js_malloc_for_utf_conv, ctx);
                dbuf_free(&entry_buf);
                if (wide_entry == NULL) {
                    JS_ThrowTypeError(ctx, "failed to convert environment variable to UTF-16");
                    dbuf_free(&env_dbuf);
                    QJU_FreeForEachPropertyState(ctx, foreach);
                    JS_FreeValue(ctx, val);
                    goto exception;
                }

                dbuf_put(&env_dbuf, (const uint8_t *)wide_entry,
                         (wide_len + 1) * sizeof(WCHAR));
                js_free(ctx, wide_entry);
            }
            QJU_FreeForEachPropertyState(ctx, foreach);
            JS_FreeValue(ctx, val);

            WCHAR wide_null = 0;
            dbuf_put(&env_dbuf, (const uint8_t *)&wide_null, sizeof(WCHAR));

            env_block = js_malloc(ctx, env_dbuf.size);
            if (!env_block) {
                dbuf_free(&env_dbuf);
                goto exception;
            }
            memcpy(env_block, env_dbuf.buf, env_dbuf.size);
            dbuf_free(&env_dbuf);
            create_flags |= CREATE_UNICODE_ENVIRONMENT;
        }
    }

    if (std_handles[0] != INVALID_HANDLE_VALUE ||
        std_handles[1] != INVALID_HANDLE_VALUE ||
        std_handles[2] != INVALID_HANDLE_VALUE) {
        startup_info.dwFlags |= STARTF_USESTDHANDLES;
        startup_info.hStdInput = std_handles[0] != INVALID_HANDLE_VALUE
            ? std_handles[0] : GetStdHandle(STD_INPUT_HANDLE);
        startup_info.hStdOutput = std_handles[1] != INVALID_HANDLE_VALUE
            ? std_handles[1] : GetStdHandle(STD_OUTPUT_HANDLE);
        startup_info.hStdError = std_handles[2] != INVALID_HANDLE_VALUE
            ? std_handles[2] : GetStdHandle(STD_ERROR_HANDLE);
        inherit_handles = TRUE;
    }

    if (file != NULL) {
        module_name_wide = cstr_to_wstring(ctx, file);
        if (module_name_wide == NULL)
            goto exception;
    }
    command_line_wide = cstr_to_wstring(ctx, (const char *)cmd_buf.buf);
    if (command_line_wide == NULL)
        goto exception;
    if (cwd_str != NULL) {
        current_dir_wide = cstr_to_wstring(ctx, cwd_str);
        if (current_dir_wide == NULL)
            goto exception;
    }

    if (!CreateProcessW(module_name_wide, command_line_wide,
                        NULL, NULL, inherit_handles, create_flags,
                        env_block, current_dir_wide,
                        &startup_info, &process_info)) {
        js_throw_win32_error(ctx, "CreateProcess failed", GetLastError());
        goto exception;
    }

    if (block_flag) {
        WaitForSingleObject(process_info.hProcess, INFINITE);
        DWORD exit_code;
        GetExitCodeProcess(process_info.hProcess, &exit_code);
        CloseHandle(process_info.hProcess);
        CloseHandle(process_info.hThread);
        ret = (int)exit_code;
    } else {
        CloseHandle(process_info.hThread);
        win32_pid_map_add(process_info.dwProcessId, process_info.hProcess);
        ret = (int)process_info.dwProcessId;
    }

    ret_val = JS_NewInt32(ctx, ret);
 done:
    dbuf_free(&cmd_buf);
    JS_FreeCString(ctx, file);
    JS_FreeCString(ctx, cwd_str);
    if (command_line_wide) js_free(ctx, command_line_wide);
    if (module_name_wide) js_free(ctx, module_name_wide);
    if (current_dir_wide) js_free(ctx, current_dir_wide);
    if (env_block) js_free(ctx, env_block);
    return ret_val;
 exception:
    ret_val = JS_EXCEPTION;
    goto done;
}

/* Windows os.waitpid */
#define WIN32_WNOHANG 1

static JSValue js_os_waitpid(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
    int pid, options = 0;
    JSValue obj;
    HANDLE process_handle;
    DWORD exit_code, wait_result;

    if (JS_ToInt32(ctx, &pid, argv[0]))
        return JS_EXCEPTION;

    if (argc > 1) {
        if (JS_ToInt32(ctx, &options, argv[1]))
            return JS_EXCEPTION;
    }

    process_handle = win32_pid_map_find((DWORD)pid);
    if (process_handle == INVALID_HANDLE_VALUE) {
        JS_ThrowError(ctx, "no child process with pid %d (was it started with os.exec block:false?)", pid);
        return JS_EXCEPTION;
    }

    if (options & WIN32_WNOHANG) {
        wait_result = WaitForSingleObject(process_handle, 0);
        if (wait_result == WAIT_TIMEOUT) {
            obj = JS_NewArray(ctx);
            if (JS_IsException(obj))
                return obj;
            JS_DefinePropertyValueUint32(ctx, obj, 0, JS_NewInt32(ctx, 0), JS_PROP_C_W_E);
            JS_DefinePropertyValueUint32(ctx, obj, 1, JS_NewInt32(ctx, 0), JS_PROP_C_W_E);
            return obj;
        }
    } else {
        wait_result = WaitForSingleObject(process_handle, INFINITE);
    }

    if (wait_result == WAIT_FAILED) {
        return js_throw_win32_error(ctx, "WaitForSingleObject failed in waitpid", GetLastError());
    }

    GetExitCodeProcess(process_handle, &exit_code);
    win32_pid_map_remove((DWORD)pid);
    CloseHandle(process_handle);

    int status = (int)((exit_code & 0xff) << 8);

    obj = JS_NewArray(ctx);
    if (JS_IsException(obj))
        return obj;
    JS_DefinePropertyValueUint32(ctx, obj, 0, JS_NewInt32(ctx, pid), JS_PROP_C_W_E);
    JS_DefinePropertyValueUint32(ctx, obj, 1, JS_NewInt32(ctx, status), JS_PROP_C_W_E);
    return obj;
}

#else /* !_WIN32 - Unix implementations */

static JSValue js_os_dup(JSContext *ctx, JSValueConst this_val,
                         int argc, JSValueConst *argv)
{
    int fd, ret;
    if (JS_ToInt32(ctx, &fd, argv[0]))
        return JS_EXCEPTION;
    ret = dup(fd);
    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
        return JS_EXCEPTION;
    }
    return JS_NewInt32(ctx, ret);
}

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
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
        return JS_EXCEPTION;
    }
    return JS_NewInt32(ctx, ret);
}

static JSValue js_os_pipe(JSContext *ctx, JSValueConst this_val,
                          int argc, JSValueConst *argv)
{
    int pipe_fds[2], ret;
    JSValue obj;

    ret = pipe(pipe_fds);
    if (ret < 0) {
        JS_ThrowError(ctx, "%s (errno = %d)", strerror(errno), errno);
        return JS_EXCEPTION;
    }

    obj = JS_NewArray(ctx);
    if (JS_IsException(obj))
        return obj;
    JS_DefinePropertyValueUint32(ctx, obj, 0, JS_NewInt32(ctx, pipe_fds[0]), JS_PROP_C_W_E);
    JS_DefinePropertyValueUint32(ctx, obj, 1, JS_NewInt32(ctx, pipe_fds[1]), JS_PROP_C_W_E);
    return obj;
}

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
        return JS_EXCEPTION;
    }
    return JS_UNDEFINED;
}

/* W* status helper functions for Unix */
static JSValue js_os_WEXITSTATUS(JSContext *ctx, JSValueConst this_val,
                                 int argc, JSValueConst *argv)
{
    int status;
    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;
    return JS_NewInt32(ctx, WEXITSTATUS(status));
}

static JSValue js_os_WTERMSIG(JSContext *ctx, JSValueConst this_val,
                               int argc, JSValueConst *argv)
{
    int status;
    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;
    return JS_NewInt32(ctx, WTERMSIG(status));
}

static JSValue js_os_WSTOPSIG(JSContext *ctx, JSValueConst this_val,
                               int argc, JSValueConst *argv)
{
    int status;
    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;
    return JS_NewInt32(ctx, WSTOPSIG(status));
}

static JSValue js_os_WIFEXITED(JSContext *ctx, JSValueConst this_val,
                                int argc, JSValueConst *argv)
{
    int status;
    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;
    return JS_NewBool(ctx, WIFEXITED(status));
}

static JSValue js_os_WIFSIGNALED(JSContext *ctx, JSValueConst this_val,
                                  int argc, JSValueConst *argv)
{
    int status;
    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;
    return JS_NewBool(ctx, WIFSIGNALED(status));
}

static JSValue js_os_WIFSTOPPED(JSContext *ctx, JSValueConst this_val,
                                 int argc, JSValueConst *argv)
{
    int status;
    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;
    return JS_NewBool(ctx, WIFSTOPPED(status));
}

static JSValue js_os_WIFCONTINUED(JSContext *ctx, JSValueConst this_val,
                                   int argc, JSValueConst *argv)
{
    int status;
    if (JS_ToInt32(ctx, &status, argv[0]))
        return JS_EXCEPTION;
#ifdef WIFCONTINUED
    return JS_NewBool(ctx, WIFCONTINUED(status));
#else
    return JS_NewBool(ctx, FALSE);
#endif
}

/* Build environment array from JS object */
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

        /* remap the stdin/stdout/stderr handles if necessary */
        for(i = 0; i < 3; i++) {
            if (std_fds[i] != (int)i) {
                if (dup2(std_fds[i], i) < 0)
                    _exit(127);
            }
        }

        /* Close all file descriptors >= 3 */
        {
            DIR *dir = opendir("/dev/fd");
            if (dir) {
                int dir_fd = dirfd(dir);
                struct dirent *entry;
                while ((entry = readdir(dir)) != NULL) {
                    int fd = atoi(entry->d_name);
                    if (fd >= 3 && fd != dir_fd)
                        close(fd);
                }
                closedir(dir);
            } else {
                /* fallback: use a bounded iteration */
                int fd_max = (int)sysconf(_SC_OPEN_MAX);
                if (fd_max < 0 || fd_max > 65536)
                    fd_max = 65536;
                for(i = 3; i < (uint32_t)fd_max; i++)
                    close(i);
            }
        }
        if (cwd) {
            if (chdir(cwd) < 0)
                _exit(127);
        }
        if (uid != (uint32_t)-1) {
            if (setuid(uid) < 0)
                _exit(127);
        }
        if (gid != (uint32_t)-1) {
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

#endif /* !_WIN32 */

/**********************************************************/
/* Win32Handle class */

#if !defined(_WIN32)
/* Non-Windows: just need the class ID */
static JSClassID js_win32_handle_class_id;
#endif

/* Win32Handle finalizer - closes the handle if still open */
static void js_win32_handle_finalizer(JSRuntime *rt, JSValue val)
{
#if defined(_WIN32)
    HANDLE *handle_ptr = JS_GetOpaque(val, js_win32_handle_class_id);
    if (handle_ptr) {
        if (*handle_ptr != INVALID_HANDLE_VALUE) {
            CloseHandle(*handle_ptr);
        }
        js_free_rt(rt, handle_ptr);
    }
#else
    (void)val;
#endif
}

static JSClassDef js_win32_handle_class = {
    "Win32Handle",
    .finalizer = js_win32_handle_finalizer,
};

static JSValue js_win32_handle_ctor(JSContext *ctx, JSValueConst this_val,
                                    int argc, JSValueConst *argv)
{
    return JS_ThrowError(ctx, "Win32Handle objects cannot be created by JavaScript code");
}

/**********************************************************/
/* Worker class */

static JSClassID js_worker_class_id;

#ifdef USE_WORKER
static JSContext *(*js_worker_new_context_func)(JSRuntime *rt);

static int atomic_add_int(int *ptr, int v)
{
    return atomic_fetch_add((_Atomic(uint32_t) *)ptr, v) + v;
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
    /* free the SAB - use js_worker_message_pipe_free's approach */
    for(i = 0; i < msg->sab_tab_len; i++) {
        /* sab_free equivalent - decrement ref count */
        typedef struct {
            int ref_count;
            uint64_t buf[0];
        } JSSABHeader;
        JSSABHeader *sab = (JSSABHeader *)((uint8_t *)msg->sab_tab[i] - sizeof(JSSABHeader));
        int ref_count = atomic_add_int(&sab->ref_count, -1);
        if (ref_count == 0)
            free(sab);
    }
    free(msg->sab_tab);
    free(msg->data);
    free(msg);
}

static void js_free_message_pipe_local(JSWorkerMessagePipe *ps)
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
        js_free_message_pipe_local(port->recv_pipe);
        JS_FreeValueRT(rt, port->on_message_func);
        list_del(&port->link);
        js_free_rt(rt, port);
    }
}

static void js_worker_finalizer(JSRuntime *rt, JSValue val)
{
    JSWorkerData *worker = JS_GetOpaque(val, js_worker_class_id);
    if (worker) {
        js_free_message_pipe_local(worker->recv_pipe);
        js_free_message_pipe_local(worker->send_pipe);
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
    js_eventloop_init(rt);

    QJMS_InitState(rt);

    /* set the pipe to communicate with the parent */
    ts = JS_GetRuntimeOpaque(rt);
    ts->recv_pipe = args->recv_pipe;
    ts->send_pipe = args->send_pipe;

    ctx = js_worker_new_context_func(rt);
    if (ctx == NULL) {
        fprintf(stderr, "JS_NewContext failure");
    }

    JS_SetCanBlock(rt, TRUE);

    js_cmdline_add_scriptArgs(ctx, -1, NULL);
    js_timers_add_globals(ctx);
    QJMS_InitContext(ctx);

    if (!JS_RunModule(ctx, args->basename, args->filename))
        QJU_PrintException(ctx, stderr);
    free(args->filename);
    free(args->basename);
    free(args);

    js_eventloop_run(ctx);

    QJMS_FreeState(rt);
    JS_FreeContext(ctx);
    js_eventloop_free(rt);
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
    if (!js_eventloop_is_main_thread(rt))
        return JS_ThrowTypeError(ctx, "cannot create a worker inside a worker");

    /* base name, assuming the calling function is a normal JS function */
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
        js_free_message_pipe_local(args->recv_pipe);
        js_free_message_pipe_local(args->send_pipe);
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
        typedef struct {
            int ref_count;
            uint64_t buf[0];
        } JSSABHeader;
        JSSABHeader *sab = (JSSABHeader *)((uint8_t *)msg->sab_tab[i] - sizeof(JSSABHeader));
        atomic_add_int(&sab->ref_count, 1);
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

#else /* !USE_WORKER */

static JSClassDef js_worker_class = {
    "Worker",
};

static JSValue js_worker_ctor(JSContext *ctx, JSValueConst new_target,
                              int argc, JSValueConst *argv)
{
    return JS_ThrowError(ctx, "the Worker class is not supported on this platform");
}

#endif /* USE_WORKER */

void js_os_set_worker_new_context_func(JSContext *(*func)(JSRuntime *rt))
{
#ifdef USE_WORKER
    js_worker_new_context_func = func;
#else
    (void)func;
#endif
}

/**********************************************************/
/* Poll function */

#ifdef USE_WORKER
/* Handle a posted message from a worker.
   Return 1 if a message was handled, 0 if no message. */
static int handle_posted_message(JSRuntime *rt, JSContext *ctx,
                                 JSWorkerMessageHandler *port)
{
    JSWorkerMessagePipe *ps = port->recv_pipe;
    int ret;
    JSWorkerMessage *msg;
    JSValue obj, data_obj, func, retval;

    pthread_mutex_lock(&ps->mutex);
    if (!list_empty(&ps->msg_queue)) {
        msg = list_entry(ps->msg_queue.next, JSWorkerMessage, link);

        /* remove the message from the queue */
        list_del(&msg->link);

        if (list_empty(&ps->msg_queue)) {
            /* read the notification byte when queue becomes empty */
            uint8_t buf[16];
            int r;
            for(;;) {
                r = read(ps->read_fd, buf, sizeof(buf));
                if (r >= 0)
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
#endif /* USE_WORKER */

#if defined(__linux__) || defined(__APPLE__)
static int64_t get_time_ms(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint64_t)ts.tv_sec * 1000 + (ts.tv_nsec / 1000000);
}
#else
static int64_t get_time_ms(void)
{
    struct timeval tv;
    gettimeofday(&tv, NULL);
    return (int64_t)tv.tv_sec * 1000 + (tv.tv_usec / 1000);
}
#endif

#if defined(_WIN32)
static int js_os_poll(JSContext *ctx)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    int min_delay, console_fd;
    int64_t cur_time, delay;
    JSRWHandler *rh;
    struct list_head *el;

    if (list_empty(&ts->rw_handlers) && list_empty(&ts->timers))
        return -1;

    if (!list_empty(&ts->timers)) {
        cur_time = get_time_ms();
        min_delay = 10000;
        list_for_each(el, &ts->timers) {
            JSTimer *th = list_entry(el, JSTimer, link);
            delay = th->timeout - cur_time;
            if (delay <= 0) {
                JSValue func = th->func;
                th->func = JS_UNDEFINED;
                if (th->interval > 0) {
                    th->timeout = cur_time + th->interval;
                    th->func = JS_DupValue(ctx, func);
                } else {
                    js_timer_unlink(rt, th);
                    if (!th->has_object)
                        js_timer_free(rt, th);
                }
                js_eventloop_call_handler(ctx, func);
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
    list_for_each(el, &ts->rw_handlers) {
        rh = list_entry(el, JSRWHandler, link);
        if (rh->fd == 0 && !JS_IsNull(rh->rw_func[0])) {
            console_fd = rh->fd;
            break;
        }
    }

    if (console_fd >= 0) {
        DWORD ti, ret;
        HANDLE handle;
        ti = (min_delay == -1) ? INFINITE : min_delay;
        handle = (HANDLE)_get_osfhandle(console_fd);
        ret = WaitForSingleObject(handle, ti);
        if (ret == WAIT_OBJECT_0) {
            list_for_each(el, &ts->rw_handlers) {
                rh = list_entry(el, JSRWHandler, link);
                if (rh->fd == console_fd && !JS_IsNull(rh->rw_func[0])) {
                    js_eventloop_call_handler(ctx, rh->rw_func[0]);
                    break;
                }
            }
        }
    } else {
        Sleep(min_delay);
    }
    return 0;
}
#else /* !_WIN32 */
static int js_os_poll(JSContext *ctx)
{
    JSRuntime *rt = JS_GetRuntime(ctx);
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
    int ret, fd_max, min_delay;
    int64_t cur_time, delay;
    fd_set rfds, wfds;
    JSRWHandler *rh;
    struct list_head *el;
    struct timeval tv, *tvp;

    if (!ts->recv_pipe && unlikely(js_pending_signals != 0)) {
        JSSignalHandler *sh;
        uint64_t mask;
        list_for_each(el, &ts->signal_handlers) {
            sh = list_entry(el, JSSignalHandler, link);
            mask = (uint64_t)1 << sh->sig_num;
            if (js_pending_signals & mask) {
                js_pending_signals &= ~mask;
                js_eventloop_call_handler(ctx, sh->func);
                return 0;
            }
        }
    }

    if (list_empty(&ts->rw_handlers) && list_empty(&ts->timers) &&
        list_empty(&ts->port_list))
        return -1;

    if (!list_empty(&ts->timers)) {
        cur_time = get_time_ms();
        min_delay = 10000;
        list_for_each(el, &ts->timers) {
            JSTimer *th = list_entry(el, JSTimer, link);
            delay = th->timeout - cur_time;
            if (delay <= 0) {
                JSValue func = th->func;
                th->func = JS_UNDEFINED;
                if (th->interval > 0) {
                    th->timeout = cur_time + th->interval;
                    th->func = JS_DupValue(ctx, func);
                } else {
                    js_timer_unlink(rt, th);
                    if (!th->has_object)
                        js_timer_free(rt, th);
                }
                js_eventloop_call_handler(ctx, func);
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
    list_for_each(el, &ts->rw_handlers) {
        rh = list_entry(el, JSRWHandler, link);
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
        list_for_each(el, &ts->rw_handlers) {
            rh = list_entry(el, JSRWHandler, link);
            if (!JS_IsNull(rh->rw_func[0]) && FD_ISSET(rh->fd, &rfds)) {
                js_eventloop_call_handler(ctx, rh->rw_func[0]);
                return 0;
            }
            if (!JS_IsNull(rh->rw_func[1]) && FD_ISSET(rh->fd, &wfds)) {
                js_eventloop_call_handler(ctx, rh->rw_func[1]);
                return 0;
            }
        }

#ifdef USE_WORKER
        /* Handle worker messages */
        list_for_each(el, &ts->port_list) {
            JSWorkerMessageHandler *port = list_entry(el, JSWorkerMessageHandler, link);
            if (!JS_IsNull(port->on_message_func)) {
                JSWorkerMessagePipe *ps = port->recv_pipe;
                if (FD_ISSET(ps->read_fd, &rfds)) {
                    if (handle_posted_message(rt, ctx, port))
                        return 0;
                }
            }
        }
#endif
    }
    return 0;
}
#endif /* !_WIN32 */

/**********************************************************/
/* Module function list and initialization */

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
#else
    JS_PROP_INT32_DEF("O_BINARY", 0x8000, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("O_TEXT", 0x4000, JS_PROP_CONFIGURABLE ),
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
#if defined(_WIN32)
    JS_PROP_INT32_DEF("SIGQUIT", 3, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("SIGPIPE", 13, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("SIGALRM", 14, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("SIGUSR1", 10, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("SIGUSR2", 12, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("SIGCHLD", 17, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("SIGCONT", 18, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("SIGSTOP", 19, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("SIGTSTP", 20, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("SIGTTIN", 21, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("SIGTTOU", 22, JS_PROP_CONFIGURABLE ),
#else
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
    /* NOTE: Timer functions removed - now in quickjs-timers module */
    JS_PROP_STRING_DEF("platform", OS_PLATFORM, 0 ),
    JS_CFUNC_DEF("getcwd", 0, js_os_getcwd ),
    JS_CFUNC_DEF("chdir", 0, js_os_chdir ),
    JS_CFUNC_DEF("mkdir", 1, js_os_mkdir ),
    JS_CFUNC_DEF("readdir", 1, js_os_readdir ),
    OS_FLAG(S_IFMT),
    OS_FLAG(S_IFIFO),
    OS_FLAG(S_IFCHR),
    OS_FLAG(S_IFDIR),
    OS_FLAG(S_IFBLK),
    OS_FLAG(S_IFREG),
#if defined(_WIN32)
    JS_PROP_INT32_DEF("S_IFSOCK", 0140000, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("S_IFLNK", 0120000, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("S_ISGID", 02000, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("S_ISUID", 04000, JS_PROP_CONFIGURABLE ),
#else
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
    JS_CFUNC_MAGIC_DEF("lstat", 1, js_os_stat, 1 ),
    JS_CFUNC_DEF("utimes", 3, js_os_utimes ),
    JS_CFUNC_DEF("sleep", 1, js_os_sleep ),
    JS_CFUNC_DEF("realpath", 1, js_os_realpath ),
    JS_CFUNC_DEF("symlink", 2, js_os_symlink ),
    JS_CFUNC_DEF("readlink", 1, js_os_readlink ),
#if defined(_WIN32)
    OS_FLAG(WAIT_OBJECT_0),
    OS_FLAG(WAIT_ABANDONED),
    OS_FLAG(WAIT_TIMEOUT),
    OS_FLAG(WAIT_FAILED),
    JS_CFUNC_DEF("CreateProcess", 2, js_os_CreateProcess ),
    JS_CFUNC_DEF("WaitForSingleObject", 2, js_os_WaitForSingleObject ),
    JS_CFUNC_DEF("GetExitCodeProcess", 1, js_os_GetExitCodeProcess ),
    JS_CFUNC_DEF("TerminateProcess", 2, js_os_TerminateProcess ),
    JS_CFUNC_DEF("CloseHandle", 1, js_os_CloseHandle ),
    JS_CFUNC_DEF("CreatePipe", 1, js_os_CreatePipe ),
#else
    JS_PROP_INT32_DEF("WAIT_OBJECT_0", 0, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("WAIT_ABANDONED", 0x80, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("WAIT_TIMEOUT", 0x102, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("WAIT_FAILED", (int)0xFFFFFFFF, JS_PROP_CONFIGURABLE ),
#endif
    JS_CFUNC_DEF("exec", 1, js_os_exec ),
    JS_CFUNC_DEF("waitpid", 2, js_os_waitpid ),
#if defined(_WIN32)
    JS_PROP_INT32_DEF("WNOHANG", 1, JS_PROP_CONFIGURABLE ),
    JS_PROP_INT32_DEF("WUNTRACED", 2, JS_PROP_CONFIGURABLE ),
#else
    OS_FLAG(WNOHANG),
    OS_FLAG(WUNTRACED),
#endif
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
    JS_CFUNC_DEF("access", 2, js_os_access ),
    JS_CFUNC_DEF("execPath", 0, js_os_execPath ),
    JS_CFUNC_DEF("chmod", 2, js_os_chmod ),
    JS_CFUNC_DEF("gethostname", 0, js_os_gethostname ),
    OS_FLAG(R_OK),
    OS_FLAG(W_OK),
    OS_FLAG(X_OK),
    OS_FLAG(F_OK),
};

static int js_os_init(JSContext *ctx, JSModuleDef *m)
{
#ifdef USE_WORKER
    JSRuntime *rt = JS_GetRuntime(ctx);
    JSThreadState *ts = JS_GetRuntimeOpaque(rt);
#endif

    /* Win32Handle class */
    JS_NewClassID(&js_win32_handle_class_id);
    JS_NewClass(JS_GetRuntime(ctx), js_win32_handle_class_id, &js_win32_handle_class);
    {
        JSValue win32_handle_proto, win32_handle_ctor_val;
        win32_handle_proto = JS_NewObject(ctx);
        win32_handle_ctor_val = JS_NewCFunction2(ctx, js_win32_handle_ctor, "Win32Handle", 0,
                                                  JS_CFUNC_constructor, 0);
        JS_SetConstructor(ctx, win32_handle_ctor_val, win32_handle_proto);
        JS_SetClassProto(ctx, js_win32_handle_class_id, win32_handle_proto);
        JS_SetModuleExport(ctx, m, "Win32Handle", win32_handle_ctor_val);
    }

    /* Set poll function */
    js_poll_func = js_os_poll;

    /* Worker class */
    JS_NewClassID(&js_worker_class_id);
    JS_NewClass(JS_GetRuntime(ctx), js_worker_class_id, &js_worker_class);
    {
        JSValue proto, obj;
        proto = JS_NewObject(ctx);
#ifdef USE_WORKER
        JS_SetPropertyFunctionList(ctx, proto, js_worker_proto_funcs, countof(js_worker_proto_funcs));
#endif
        obj = JS_NewCFunction2(ctx, js_worker_ctor, "Worker", 1,
                                JS_CFUNC_constructor, 0);
        JS_SetConstructor(ctx, obj, proto);
        JS_SetClassProto(ctx, js_worker_class_id, proto);
#ifdef USE_WORKER
        /* Set 'Worker.parent' if necessary (only in worker threads) */
        if (ts->recv_pipe && ts->send_pipe) {
            JS_DefinePropertyValueStr(ctx, obj, "parent",
                                      js_worker_ctor_internal(ctx, JS_UNDEFINED, ts->recv_pipe, ts->send_pipe),
                                      JS_PROP_C_W_E);
        }
#endif
        JS_SetModuleExport(ctx, m, "Worker", obj);
    }

    return JS_SetModuleExportList(ctx, m, js_os_funcs, countof(js_os_funcs));
}

JSModuleDef *js_init_module_os(JSContext *ctx, const char *module_name)
{
    JSModuleDef *m;
    m = JS_NewCModule(ctx, module_name, js_os_init, NULL);
    if (!m)
        return NULL;
    JS_AddModuleExportList(ctx, m, js_os_funcs, countof(js_os_funcs));
    JS_AddModuleExport(ctx, m, "Worker");
    JS_AddModuleExport(ctx, m, "Win32Handle");
    return m;
}
