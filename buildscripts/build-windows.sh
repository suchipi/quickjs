#! /bin/sh -ex
export tup_vardict="/home/suchipi/Code/quickjs/tup-generate.vardict"
cd "src/cutils"
(gcc -c cutils.c -rdynamic -g -flto -o cutils.host.o -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm)
(x86_64-w64-mingw32-gcc -c cutils.c  -g -flto -o cutils.target.o -D_GNU_SOURCE -D__USE_MINGW_ANSI_STDIO -D_WIN32 -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -static -Wall -lpthread -lm)
cd "../libbf"
(gcc -c libbf.c -rdynamic -g -flto -o libbf.host.o -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm)
(x86_64-w64-mingw32-gcc -c libbf.c  -g -flto -o libbf.target.o -D_GNU_SOURCE -D__USE_MINGW_ANSI_STDIO -D_WIN32 -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -static -Wall -lpthread -lm)
cd "../libregexp"
(gcc -c libregexp.c -rdynamic -g -flto -o libregexp.host.o -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm)
(x86_64-w64-mingw32-gcc -c libregexp.c  -g -flto -o libregexp.target.o -D_GNU_SOURCE -D__USE_MINGW_ANSI_STDIO -D_WIN32 -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -static -Wall -lpthread -lm)
cd "../libunicode"
(gcc ../cutils/cutils.host.o unicode_gen.c -rdynamic -g -flto -o unicode_gen.host -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm && rm -rf unicode_gen.host.dSYM)
(./unicode_gen.host downloaded libunicode-table.h)
(gcc -c libunicode.c -rdynamic -g -flto -o libunicode.host.o -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm)
(x86_64-w64-mingw32-gcc -c libunicode.c  -g -flto -o libunicode.target.o -D_GNU_SOURCE -D__USE_MINGW_ANSI_STDIO -D_WIN32 -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -static -Wall -lpthread -lm)
cd "../quickjs"
(gcc -c quickjs.c -rdynamic -g -flto -o quickjs.host.o -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm)
(x86_64-w64-mingw32-gcc -c quickjs.c  -g -flto -o quickjs.target.o -D_GNU_SOURCE -D__USE_MINGW_ANSI_STDIO -D_WIN32 -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -static -Wall -lpthread -lm)
cd "../quickjs-libc"
(gcc -c quickjs-libc.c -rdynamic -g -flto -o quickjs-libc.host.o -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm)
(x86_64-w64-mingw32-gcc -c quickjs-libc.c  -g -flto -o quickjs-libc.target.o -D_GNU_SOURCE -D__USE_MINGW_ANSI_STDIO -D_WIN32 -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -static -Wall -lpthread -lm)
cd "../run-test262"
(gcc run-test262.c ../cutils/cutils.host.o ../libbf/libbf.host.o ../libregexp/libregexp.host.o ../libunicode/libunicode.host.o ../quickjs/quickjs.host.o ../quickjs-libc/quickjs-libc.host.o -rdynamic -g -flto -o run-test262.host -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm && rm -rf run-test262.host.dSYM)
(x86_64-w64-mingw32-gcc run-test262.c ../cutils/cutils.target.o ../libbf/libbf.target.o ../libregexp/libregexp.target.o ../libunicode/libunicode.target.o ../quickjs/quickjs.target.o ../quickjs-libc/quickjs-libc.target.o  -g -flto -o run-test262.target -D_GNU_SOURCE -D__USE_MINGW_ANSI_STDIO -D_WIN32 -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -static -Wall -lpthread -lm && rm -rf run-test262.target.dSYM)
cd "../qjsc"
(gcc qjsc.c ../cutils/cutils.host.o ../libbf/libbf.host.o ../libregexp/libregexp.host.o ../libunicode/libunicode.host.o ../quickjs/quickjs.host.o ../quickjs-libc/quickjs-libc.host.o -rdynamic -g -flto -o qjsc.host -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm && rm -rf qjsc.host.dSYM)
(x86_64-w64-mingw32-gcc qjsc.c ../cutils/cutils.target.o ../libbf/libbf.target.o ../libregexp/libregexp.target.o ../libunicode/libunicode.target.o ../quickjs/quickjs.target.o ../quickjs-libc/quickjs-libc.target.o  -g -flto -o qjsc.target -D_GNU_SOURCE -D__USE_MINGW_ANSI_STDIO -D_WIN32 -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -static -Wall -lpthread -lm && rm -rf qjsc.target.dSYM)
cd "../qjscalc"
(../qjsc/qjsc.host -fbignum -c -o qjscalc.c qjscalc.js)
(x86_64-w64-mingw32-gcc -c qjscalc.c  -g -flto -o qjscalc.target.o -D_GNU_SOURCE -D__USE_MINGW_ANSI_STDIO -D_WIN32 -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -static -Wall -lpthread -lm)
(gcc -c qjscalc.c -rdynamic -g -flto -o qjscalc.host.o -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm)
cd "../repl"
(../qjsc/qjsc.host -c -o repl.c -m repl.js)
(gcc -c repl.c -rdynamic -g -flto -o repl.host.o -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm)
(x86_64-w64-mingw32-gcc -c repl.c  -g -flto -o repl.target.o -D_GNU_SOURCE -D__USE_MINGW_ANSI_STDIO -D_WIN32 -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -static -Wall -lpthread -lm)
cd "../qjs"
(gcc qjs.c ../cutils/cutils.host.o ../libbf/libbf.host.o ../libregexp/libregexp.host.o ../libunicode/libunicode.host.o ../quickjs/quickjs.host.o ../quickjs-libc/quickjs-libc.host.o ../qjscalc/qjscalc.host.o ../repl/repl.host.o -rdynamic -g -flto -o qjs.host -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm && rm -rf qjs.host.dSYM)
(x86_64-w64-mingw32-gcc qjs.c ../cutils/cutils.target.o ../libbf/libbf.target.o ../libregexp/libregexp.target.o ../libunicode/libunicode.target.o ../quickjs/quickjs.target.o ../quickjs-libc/quickjs-libc.target.o ../qjscalc/qjscalc.target.o ../repl/repl.target.o  -g -flto -o qjs.target -D_GNU_SOURCE -D__USE_MINGW_ANSI_STDIO -D_WIN32 -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -static -Wall -lpthread -lm && rm -rf qjs.target.dSYM)
cd "../archive"
(gcc-ar -rcs quickjs.host.a ../cutils/cutils.host.o ../libbf/libbf.host.o ../libregexp/libregexp.host.o ../libunicode/libunicode.host.o ../quickjs/quickjs.host.o ../quickjs-libc/quickjs-libc.host.o)
(x86_64-w64-mingw32-gcc-ar -rcs quickjs.target.a ../cutils/cutils.target.o ../libbf/libbf.target.o ../libregexp/libregexp.target.o ../libunicode/libunicode.target.o ../quickjs/quickjs.target.o ../quickjs-libc/quickjs-libc.target.o)
