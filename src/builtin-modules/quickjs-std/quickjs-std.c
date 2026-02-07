/*
 * QuickJS Standard Library Module
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
#include <limits.h>
#include <math.h>

#include <sys/stat.h>
#include <dirent.h>

#if defined(_WIN32)
#include <windows.h>
#include <io.h>
#else
#include <pwd.h>

#if defined(__APPLE__)
#if !defined(environ)
#include <crt_externs.h>
#define environ (*_NSGetEnviron())
#endif
#endif /* __APPLE__ */

#if defined(__FreeBSD__)
extern char **environ;
#endif

#endif /* _WIN32 else */

#include "cutils.h"
#include "quickjs-std.h"
#include "quickjs-utils.h"
#include "utf-conv.h"
#include "debugprint.h"

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
                JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "invalid conversion specifier in format string");
                goto fail;
            missing:
                JS_ThrowReferenceError(ctx, "<internal>/quickjs-std.c", __LINE__, "missing argument for conversion specifier");
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

/* load a file as a UTF-8 encoded string. exported for QMJS module-impl.js */
JSValue js_std_loadFile(JSContext *ctx, JSValueConst this_val,
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
        JS_ThrowError(ctx, "<internal>/quickjs-std.c", __LINE__, "%s (errno = %d, filename = %s)", strerror(errno), errno, filename);
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
    return JS_ThrowError(ctx, "<internal>/quickjs-std.c", __LINE__, "getuid is not supported on Windows");
#else
    int32_t uid = getuid();
    return JS_NewInt32(ctx, uid);
#endif

}

static JSValue js_std_geteuid(JSContext *ctx, JSValueConst this_val,
                              int argc, JSValueConst *argv)
{
#ifdef _WIN32
    return JS_ThrowError(ctx, "<internal>/quickjs-std.c", __LINE__, "geteuid is not supported on Windows");
#else
    int32_t uid = geteuid();
    return JS_NewInt32(ctx, uid);
#endif
}

static JSValue js_std_getgid(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv)
{
#ifdef _WIN32
    return JS_ThrowError(ctx, "<internal>/quickjs-std.c", __LINE__, "getgid is not supported on Windows");
#else
    int32_t gid = getgid();
    return JS_NewInt32(ctx, gid);
#endif
}

static JSValue js_std_getegid(JSContext *ctx, JSValueConst this_val,
                              int argc, JSValueConst *argv)
{
#ifdef _WIN32
    return JS_ThrowError(ctx, "<internal>/quickjs-std.c", __LINE__, "getegid is not supported on Windows");
#else
    int32_t gid = getegid();
    return JS_NewInt32(ctx, gid);
#endif
}

static JSValue js_std_getpwuid(JSContext *ctx, JSValueConst this_val,
    int argc, JSValueConst *argv)
{
#ifdef _WIN32
    return JS_ThrowError(ctx, "<internal>/quickjs-std.c", __LINE__, "getpwuid is not supported on Windows");
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

/* FILE class */

JSClassID js_std_file_class_id;

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

JSValue js_std_new_file(JSContext *ctx, FILE *f,
                        JS_BOOL close_in_finalizer,
                        JS_BOOL is_popen)
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
        return JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "open must be called with two arguments: 'filename' and 'flags'. Instead, it was called with %d argument(s).", argc);
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
        JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "invalid file mode: %s", mode);
        JS_AddPropertyToException(ctx, "filename", JS_NewString(ctx, filename));
        JS_AddPropertyToException(ctx, "mode", JS_NewString(ctx, mode));
        return JS_EXCEPTION;
    }

    f = fopen(filename, mode);
    if (!f) {
        JS_ThrowError(ctx, "<internal>/quickjs-std.c", __LINE__, "%s (errno = %d, filename = %s, mode = %s)", strerror(errno), errno, filename, mode);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        JS_AddPropertyToException(ctx, "filename", JS_NewString(ctx, filename));
        JS_AddPropertyToException(ctx, "mode", JS_NewString(ctx, mode));

        JS_FreeCString(ctx, filename);
        JS_FreeCString(ctx, mode);

        return JS_EXCEPTION;
    }

    ret = js_std_new_file(ctx, f, TRUE, FALSE);
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
        return JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "popen must be called with two arguments: 'filename' and 'flags'. Instead, it was called with %d argument(s).", argc);
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
        JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "invalid file mode: %s", mode);
        JS_AddPropertyToException(ctx, "filename", JS_NewString(ctx, filename));
        JS_AddPropertyToException(ctx, "mode", JS_NewString(ctx, mode));
        return JS_EXCEPTION;
    }

    f = popen(filename, mode);
    if (!f) {
        JS_ThrowError(ctx, "<internal>/quickjs-std.c", __LINE__, "%s (errno = %d, filename = %s, mode = %s)", strerror(errno), errno, filename, mode);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        JS_AddPropertyToException(ctx, "filename", JS_NewString(ctx, filename));
        JS_AddPropertyToException(ctx, "mode", JS_NewString(ctx, mode));

        JS_FreeCString(ctx, filename);
        JS_FreeCString(ctx, mode);

        return JS_EXCEPTION;
    }

    ret = js_std_new_file(ctx, f, TRUE, FALSE);
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
        return JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "fdopen must be called with two arguments: 'fd' and 'flags'. Instead, it was called with %d argument(s).", argc);
    }

    if (JS_ToInt32(ctx, &fd, argv[0]))
        return JS_EXCEPTION;
    mode = JS_ToCString(ctx, argv[1]);
    if (!mode) {
        return JS_EXCEPTION;
    }
    if (mode[strspn(mode, "rwa+b")] != '\0') {
        JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "invalid file mode: %s", mode);
        JS_AddPropertyToException(ctx, "mode", JS_NewString(ctx, mode));
        return JS_EXCEPTION;
    }

    f = fdopen(fd, mode);
    if (!f) {
        JS_ThrowError(ctx, "<internal>/quickjs-std.c", __LINE__, "%s (errno = %d, fd = %d, mode = %s)", strerror(errno), errno, fd, mode);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        JS_AddPropertyToException(ctx, "fd", JS_NewInt32(ctx, fd));
        JS_AddPropertyToException(ctx, "mode", JS_NewString(ctx, mode));

        JS_FreeCString(ctx, mode);

        return JS_EXCEPTION;
    }

    JS_FreeCString(ctx, mode);

    ret = js_std_new_file(ctx, f, TRUE, FALSE);
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
        JS_ThrowError(ctx, "<internal>/quickjs-std.c", __LINE__, "%s (errno = %d)", strerror(errno), errno);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        return JS_EXCEPTION;
    }

    ret = js_std_new_file(ctx, f, TRUE, FALSE);
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
        return JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "strftime must be called with exactly three arguments: max bytes to write, a format string, and a Date object (or number).");
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
        JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "localtime_r failed: %s (errno = %d)", err_msg, err);
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
        return JS_ThrowRangeError(ctx, "<internal>/quickjs-std.c", __LINE__, "specified size for formatted string was not large enough to hold it. call again with larger max bytes");
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
        JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "invalid file handle");
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
        return JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "invalid file handle");
    if (s->is_popen) {
        if (pclose(s->f) < 0) {
            JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "failed to close file: %s (errno = %d)", strerror(errno), errno);
            JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
            return JS_EXCEPTION;
        }
    } else {
        if (fclose(s->f) < 0) {
            JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "failed to close file: %s (errno = %d)", strerror(errno), errno);
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
        JS_ThrowError(ctx, "<internal>/quickjs-std.c", __LINE__, "%s (errno = %d)", strerror(errno), errno);
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
        return JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "writeTo must be called with at least two arguments: 'target' and 'bufferSize'. Instead, it was called with %d argument(s).", argc);
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
        return JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "'bufferSize' must be greater than 0");
    }
    bufsize = (size_t) bufsize_double;

    if (argc == 3) {
        if (JS_ToFloat64(ctx, &limit_double, argv[2])) {
            return JS_EXCEPTION;
        }
        if (limit_double < 0) {
            return JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "'limit' cannot be negative");
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
                    JS_ThrowError(ctx, "<internal>/quickjs-std.c", __LINE__, "%s (errno = %d)", strerror(errno), errno);
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
                    JS_ThrowError(ctx, "<internal>/quickjs-std.c", __LINE__, "%s (errno = %d)", strerror(errno), errno);
                    JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
                    JS_AddPropertyToException(ctx, "totalBytesWritten", JS_NewInt64(ctx, total_written));
                    JS_AddPropertyToException(ctx, "totalBytesRead", JS_NewInt64(ctx, total_read));
                    return JS_EXCEPTION;
                } else {
                    js_free(ctx, buf);
                    JS_ThrowError(ctx, "<internal>/quickjs-std.c", __LINE__, "Failed to write file: reached EOF before we were done writing data");
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
        return JS_ThrowRangeError(ctx, "<internal>/quickjs-std.c", __LINE__, "read/write array buffer overflow");
    if (is_write) {
        ret = fwrite(buf + pos, 1, len, f);
    } else {
        ret = fread(buf + pos, 1, len, f);
    }

    if (ferror(f) != 0) {
        JS_ThrowError(ctx, "<internal>/quickjs-std.c", __LINE__, "%s (errno = %d)", strerror(errno), errno);
        JS_AddPropertyToException(ctx, "errno", JS_NewInt32(ctx, errno));
        return JS_EXCEPTION;
    }
    if (ret == 0 && feof(f) != 0) {
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
        JS_ThrowError(ctx, "<internal>/quickjs-std.c", __LINE__, "%s (errno = %d)", strerror(errno), errno);
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
        return JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "setvbuf must be called exactly two arguments: 'mode' and 'size'.");
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
        JS_ThrowError(ctx, "<internal>/quickjs-std.c", __LINE__, "'mode' argument must be either 'std._IOFBF', 'std._IOLBF', or 'std._IONBF'. Instead, received '%d'.", mode);
        JS_AddPropertyToException(ctx, "mode", JS_NewInt32(ctx, mode));

        return JS_EXCEPTION;
    }

    errno = 0;
    if (setvbuf(f, NULL, mode, size)) {
        JS_ThrowError(ctx, "<internal>/quickjs-std.c", __LINE__, "%s (errno = %d)", strerror(errno), errno);
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
        JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "could not start curl: %s", strerror(errno));
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
        JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "failed to read output from curl: %s", strerror(-get_header_line_result));
        goto fail;
    }
    status = http_get_status(buf);

    is_redirect = 300 <= status && status <= 399;

    /* wait until there is an empty line */
    for(;;) {
        get_header_line_result = http_get_header_line(f, buf, URL_GET_BUF_SIZE, is_redirect ? header_buf : NULL);
        if (get_header_line_result < 0) {
            JS_ThrowTypeError(ctx, "<internal>/quickjs-std.c", __LINE__, "failed to read output from curl: %s", strerror(-get_header_line_result));
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
            ret_obj = JS_ThrowError(ctx, "<internal>/quickjs-std.c", __LINE__, "HTTP response status code was %d. Url was: '%s'. To allow non-2xx status codes, pass the 'full' option to urlGet.", status, url);
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

    stdin_FILE = js_std_new_file(ctx, stdin, FALSE, FALSE);
    JS_SetPropertyStr(ctx, stdin_FILE, "target", JS_NewString(ctx, "stdin"));
    JS_SetModuleExport(ctx, m, "in", stdin_FILE);

    stdout_FILE = js_std_new_file(ctx, stdout, FALSE, FALSE);
    JS_SetPropertyStr(ctx, stdout_FILE, "target", JS_NewString(ctx, "stdout"));
    JS_SetModuleExport(ctx, m, "out", stdout_FILE);

    stderr_FILE = js_std_new_file(ctx, stderr, FALSE, FALSE);
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
