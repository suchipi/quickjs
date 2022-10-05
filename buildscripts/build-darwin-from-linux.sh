#! /bin/sh -ex
export tup_vardict="/home/suchipi/Code/quickjs/tup-generate.vardict"
cd "src/cutils"
(gcc -c cutils.c -rdynamic -g -flto -o cutils.host.o -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm)
(x86_64-apple-darwin20.4-clang -c cutils.c  -g -o cutils.target.o -D__APPLE__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -funsigned-char -Wno-unused-command-line-argument -fPIC -Wall -ldl -lpthread -lm)
cd "../libbf"
(gcc -c libbf.c -rdynamic -g -flto -o libbf.host.o -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm)
(x86_64-apple-darwin20.4-clang -c libbf.c  -g -o libbf.target.o -D__APPLE__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -funsigned-char -Wno-unused-command-line-argument -fPIC -Wall -ldl -lpthread -lm)
cd "../libregexp"
(gcc -c libregexp.c -rdynamic -g -flto -o libregexp.host.o -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm)
(x86_64-apple-darwin20.4-clang -c libregexp.c  -g -o libregexp.target.o -D__APPLE__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -funsigned-char -Wno-unused-command-line-argument -fPIC -Wall -ldl -lpthread -lm)
cd "../libunicode"
(gcc ../cutils/cutils.host.o unicode_gen.c -rdynamic -g -flto -o unicode_gen.host -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm && rm -rf unicode_gen.host.dSYM)
(./unicode_gen.host downloaded libunicode-table.h)
(gcc -c libunicode.c -rdynamic -g -flto -o libunicode.host.o -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm)
(x86_64-apple-darwin20.4-clang -c libunicode.c  -g -o libunicode.target.o -D__APPLE__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -funsigned-char -Wno-unused-command-line-argument -fPIC -Wall -ldl -lpthread -lm)
cd "../quickjs"
(gcc -c quickjs.c -rdynamic -g -flto -o quickjs.host.o -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm)
(x86_64-apple-darwin20.4-clang -c quickjs.c  -g -o quickjs.target.o -D__APPLE__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -funsigned-char -Wno-unused-command-line-argument -fPIC -Wall -ldl -lpthread -lm)
cd "../quickjs-libc"
(gcc -c quickjs-libc.c -rdynamic -g -flto -o quickjs-libc.host.o -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm)
(x86_64-apple-darwin20.4-clang -c quickjs-libc.c  -g -o quickjs-libc.target.o -D__APPLE__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -funsigned-char -Wno-unused-command-line-argument -fPIC -Wall -ldl -lpthread -lm)
cd "../qjsc"
(gcc qjsc.c ../archives/core/../../cutils/cutils.host.o ../archives/core/../../libbf/libbf.host.o ../archives/core/../../libregexp/libregexp.host.o ../archives/core/../../libunicode/libunicode.host.o ../archives/core/../../quickjs/quickjs.host.o ../quickjs-libc/quickjs-libc.host.o -rdynamic -g -flto -o qjsc.host -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm && rm -rf qjsc.host.dSYM)
(x86_64-apple-darwin20.4-clang qjsc.c ../archives/core/../../cutils/cutils.target.o ../archives/core/../../libbf/libbf.target.o ../archives/core/../../libregexp/libregexp.target.o ../archives/core/../../libunicode/libunicode.target.o ../archives/core/../../quickjs/quickjs.target.o ../quickjs-libc/quickjs-libc.target.o  -g -o qjsc.target -D__APPLE__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -funsigned-char -Wno-unused-command-line-argument -fPIC -Wall -ldl -lpthread -lm && rm -rf qjsc.target.dSYM)
cd "../inspect"
(../qjsc/qjsc.host -c -o inspect.c -m inspect.js)
(gcc -c inspect.c -rdynamic -g -flto -o inspect.host.o -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm)
(x86_64-apple-darwin20.4-clang -c inspect.c  -g -o inspect.target.o -D__APPLE__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -funsigned-char -Wno-unused-command-line-argument -fPIC -Wall -ldl -lpthread -lm)
cd "../run-test262"
(gcc run-test262.c ../archives/core/../../cutils/cutils.host.o ../archives/core/../../libbf/libbf.host.o ../archives/core/../../libregexp/libregexp.host.o ../archives/core/../../libunicode/libunicode.host.o ../archives/core/../../quickjs/quickjs.host.o ../archives/full/../../inspect/inspect.host.o ../archives/full/../../quickjs-libc/quickjs-libc.host.o -rdynamic -g -flto -o run-test262.host -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm && rm -rf run-test262.host.dSYM)
(x86_64-apple-darwin20.4-clang run-test262.c ../archives/core/../../cutils/cutils.target.o ../archives/core/../../libbf/libbf.target.o ../archives/core/../../libregexp/libregexp.target.o ../archives/core/../../libunicode/libunicode.target.o ../archives/core/../../quickjs/quickjs.target.o ../archives/full/../../inspect/inspect.target.o ../archives/full/../../quickjs-libc/quickjs-libc.target.o  -g -o run-test262.target -D__APPLE__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -funsigned-char -Wno-unused-command-line-argument -fPIC -Wall -ldl -lpthread -lm && rm -rf run-test262.target.dSYM)
cd "../qjscalc"
(../qjsc/qjsc.host -fbignum -c -o qjscalc.c qjscalc.js)
(x86_64-apple-darwin20.4-clang -c qjscalc.c  -g -o qjscalc.target.o -D__APPLE__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -funsigned-char -Wno-unused-command-line-argument -fPIC -Wall -ldl -lpthread -lm)
(gcc -c qjscalc.c -rdynamic -g -flto -o qjscalc.host.o -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm)
cd "../repl"
(../qjsc/qjsc.host -c -o repl.c -m repl.js)
(gcc -c repl.c -rdynamic -g -flto -o repl.host.o -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm)
(x86_64-apple-darwin20.4-clang -c repl.c  -g -o repl.target.o -D__APPLE__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -funsigned-char -Wno-unused-command-line-argument -fPIC -Wall -ldl -lpthread -lm)
cd "../qjs"
(gcc qjs.c ../archives/core/../../cutils/cutils.host.o ../archives/core/../../libbf/libbf.host.o ../archives/core/../../libregexp/libregexp.host.o ../archives/core/../../libunicode/libunicode.host.o ../archives/core/../../quickjs/quickjs.host.o ../archives/full/../../inspect/inspect.host.o ../archives/full/../../quickjs-libc/quickjs-libc.host.o ../qjscalc/qjscalc.host.o ../repl/repl.host.o -rdynamic -g -flto -o qjs.host -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm && rm -rf qjs.host.dSYM)
(x86_64-apple-darwin20.4-clang qjs.c ../archives/core/../../cutils/cutils.target.o ../archives/core/../../libbf/libbf.target.o ../archives/core/../../libregexp/libregexp.target.o ../archives/core/../../libunicode/libunicode.target.o ../archives/core/../../quickjs/quickjs.target.o ../archives/full/../../inspect/inspect.target.o ../archives/full/../../quickjs-libc/quickjs-libc.target.o ../qjscalc/qjscalc.target.o ../repl/repl.target.o  -g -o qjs.target -D__APPLE__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -funsigned-char -Wno-unused-command-line-argument -fPIC -Wall -ldl -lpthread -lm && rm -rf qjs.target.dSYM)
cd "../stack-limit-test"
(../qjsc/qjsc.host -c -o loop.c -m loop.js)
(gcc main.c loop.c ../archives/core/../../cutils/cutils.host.o ../archives/core/../../libbf/libbf.host.o ../archives/core/../../libregexp/libregexp.host.o ../archives/core/../../libunicode/libunicode.host.o ../archives/core/../../quickjs/quickjs.host.o ../archives/full/../../inspect/inspect.host.o ../archives/full/../../quickjs-libc/quickjs-libc.host.o -rdynamic -g -flto -o test.host -D_GNU_SOURCE -D__linux__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_LTO -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE  -Wall -ldl -lpthread -lm && rm -rf test.host.dSYM)
(x86_64-apple-darwin20.4-clang main.c loop.c ../archives/core/../../cutils/cutils.target.o ../archives/core/../../libbf/libbf.target.o ../archives/core/../../libregexp/libregexp.target.o ../archives/core/../../libunicode/libunicode.target.o ../archives/core/../../quickjs/quickjs.target.o ../archives/full/../../inspect/inspect.target.o ../archives/full/../../quickjs-libc/quickjs-libc.target.o  -g -o test.target -D__APPLE__ -DCONFIG_VERSION="\"suchipi-`git rev-parse --short HEAD`\"" -DCONFIG_BIGNUM -DCONFIG_PREFIX="\"/usr/local\"" -DCONFIG_ALL_UNICODE -funsigned-char -Wno-unused-command-line-argument -fPIC -Wall -ldl -lpthread -lm && rm -rf test.target.dSYM)
cd "../archives/core"
(gcc-ar -rcs quickjs-core.host.a ./../../cutils/cutils.host.o ./../../libbf/libbf.host.o ./../../libregexp/libregexp.host.o ./../../libunicode/libunicode.host.o ./../../quickjs/quickjs.host.o)
(x86_64-apple-darwin20.4-ar -rcs quickjs-core.target.a ./../../cutils/cutils.target.o ./../../libbf/libbf.target.o ./../../libregexp/libregexp.target.o ./../../libunicode/libunicode.target.o ./../../quickjs/quickjs.target.o)
cd "../full"
(gcc-ar -rcs quickjs-full.host.a ../core/../../cutils/cutils.host.o ../core/../../libbf/libbf.host.o ../core/../../libregexp/libregexp.host.o ../core/../../libunicode/libunicode.host.o ../core/../../quickjs/quickjs.host.o ./../../inspect/inspect.host.o ./../../quickjs-libc/quickjs-libc.host.o)
(x86_64-apple-darwin20.4-ar -rcs quickjs-full.target.a ../core/../../cutils/cutils.target.o ../core/../../libbf/libbf.target.o ../core/../../libregexp/libregexp.target.o ../core/../../libunicode/libunicode.target.o ../core/../../quickjs/quickjs.target.o ./../../inspect/inspect.target.o ./../../quickjs-libc/quickjs-libc.target.o)
