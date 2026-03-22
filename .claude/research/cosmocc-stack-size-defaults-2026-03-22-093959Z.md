---
paths:
  - "meta/ninja/envs/target/cosmo.ninja.js"
  - "meta/ninja/envs/target/cross-cosmo.ninja.js"
  - "src/programs/qjs/qjs.c"
---

# Cosmopolitan Libc (cosmocc) Stack Size Defaults

## Main Thread Stack Size

The main thread stack size is controlled by `ape_stack_memsz`, defined in the APE linker script (`ape/ape.lds`):

```
ape_stack_memsz = DEFINED(ape_stack_memsz) ? ape_stack_memsz : 8 * 1024 * 1024;
```

**Default: 8 MB (8,388,608 bytes).**

This value must be a power of two, and `ape_stack_vaddr` must be aligned to it. The default `ape_stack_vaddr` is `0x700000000000`.

Programs can override this at compile time using the `STATIC_STACK_SIZE(BYTES)` macro from `<libc/runtime/stack.h>`.

## Windows-Specific Behavior

On Windows, the PE header embedded in the APE binary declares conservative values:
- **SizeOfStackReserve**: `0x10000` (64 KB)
- **SizeOfStackCommit**: `0x1000` (4 KB)

However, these PE header values are NOT the actual runtime stack size. The Cosmopolitan runtime (`libc/runtime/winmain.greg.c`) manually allocates the real stack on Windows startup using `VirtualAllocEx`:

```c
char *stackaddr = (char *)GetStaticStackAddr(0);
size_t stacksize = GetStaticStackSize();  // == ape_stack_memsz == 8 MB by default
VirtualAllocEx(GetCurrentProcess(), stackaddr, stacksize,
               kNtMemReserve | kNtMemCommit, kNtPageReadwrite);
```

So the main thread on Windows also gets the full 8 MB stack, despite the small PE header values. A guard page is placed at the stack base.

## Thread (pthread) Stack Size

Thread stack sizes use a different constant. `GetStackSize()` from `<libc/runtime/stack.h>` returns:
- **Normal mode**: 81,920 bytes (80 KB)
- **Debug mode**: 163,840 bytes (160 KB)

This is the default for `pthread_attr_getstacksize()` and is used when creating new threads with `NewCosmoStack()`. It is much smaller than the main thread stack.

## Relevance to quickjs

This project does NOT currently use `STATIC_STACK_SIZE()` to customize the main thread stack. On Cosmopolitan builds, the default 8 MB main thread stack applies. The quickjs engine's own `JS_SetMaxStackSize` is a separate concept (it limits JS recursion depth by checking the C stack pointer difference, not the OS stack allocation).
