# note: this is just here for CLion intellisense. we don't build with cmake
cmake_minimum_required(VERSION 3.26)
project(quickjs C)

set(CMAKE_C_STANDARD 99)

include_directories(src/archives)
include_directories(src/cutils)
include_directories(src/debugprint)
include_directories(src/execpath)
include_directories(src/libbf)
include_directories(src/libregexp)
include_directories(src/libunicode)
include_directories(src/list)
include_directories(src/quickjs)
include_directories(src/quickjs-libbytecode)
include_directories(src/quickjs-libc)
include_directories(src/quickjs-libcontext)
include_directories(src/quickjs-libpointer)
include_directories(src/quickjs-modulesys)
include_directories(src/quickjs-utils)

add_definitions(
        -DCONFIG_VERSION="suchipi-abcdef12345678"
        -DCONFIG_BIGNUM
        -DCONFIG_LTO
        -DCONFIG_PREFIX='"/usr/local"'
        -DCONFIG_ALL_UNICODE
        -DCONFIG_SHARED_LIBRARY_MODULES
        -DUSE_WORKER
)

add_executable(quickjs
        src/archives/quickjs-full-init.c
        src/archives/quickjs-full-init.h
        src/cutils/cutils.c
        src/cutils/cutils.h
        src/debugprint/debugprint.h
        src/execpath/execpath.c
        src/execpath/execpath.h
        src/libbf/libbf.c
        src/libbf/libbf.h
        src/libregexp/libregexp-opcode.h
        src/libregexp/libregexp.c
        src/libregexp/libregexp.h
        src/libunicode/libunicode.c
        src/libunicode/libunicode.h
        src/libunicode/unicode_gen.c
        src/libunicode/unicode_gen_def.h
        src/list/list.h
        src/qjs/qjs.c
        src/qjsbootstrap/qjsbootstrap.c
        src/qjsc/qjsc.c
        src/quickjs/quickjs-atom.h
        src/quickjs/quickjs-opcode.h
        src/quickjs/quickjs.h
        src/quickjs/quickjs.c
        src/quickjs-libbytecode/quickjs-libbytecode.c
        src/quickjs-libbytecode/quickjs-libbytecode.h
        src/quickjs-libc/quickjs-libc.c
        src/quickjs-libc/quickjs-libc.h
        src/quickjs-libcontext/quickjs-libcontext.c
        src/quickjs-libcontext/quickjs-libcontext.h
        src/quickjs-libpointer/quickjs-libpointer.c
        src/quickjs-libpointer/quickjs-libpointer.h
        src/quickjs-modulesys/module-impl-stub.c
        src/quickjs-modulesys/quickjs-modulesys.c
        src/quickjs-modulesys/quickjs-modulesys.h
        src/quickjs-run/quickjs-run.c
        src/quickjs-utils/quickjs-utils.c
        src/quickjs-utils/quickjs-utils.h
        src/run-test262/run-test262.c
        src/shared-library-modules/example-fib/fib.c
        src/shared-library-modules/example-point/point.c
        src/stack-limit-test/main.c
        src/util/log-argv.c)
