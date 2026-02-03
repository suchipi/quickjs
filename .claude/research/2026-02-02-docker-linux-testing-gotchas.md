# Docker Linux Testing Gotchas

## Testing platform-specific builds

Tests use `build/bin/` as the binary directory (see `tests/_utils.ts` `binDir`). When testing platform-specific builds (e.g. `build/x86_64-unknown-linux-musl/bin/`), use Docker volume mounts to overlay the paths:

```
-v "$HEREDIR/build/x86_64-unknown-linux-musl/bin":/opt/quickjs/build/bin
-v "$HEREDIR/build/x86_64-unknown-linux-musl/lib":/opt/quickjs/build/lib
-v "$HEREDIR/build/x86_64-unknown-linux-musl/include":/opt/quickjs/build/include
```

`build/dts` is the same across all platforms and doesn't need overlaying.

## ARM macOS host: glibc x86_64 binaries need `--platform linux/amd64`

On ARM macOS (OrbStack/Docker Desktop), musl and static x86_64 binaries run fine under emulation in their Alpine container. But glibc x86_64 binaries fail with:

```
OrbStack ERROR: Dynamic loader not found: /lib64/ld-linux-x86-64.so.2
```

The `multi-unknown-linux-gnu` Docker image is built for the host arch (ARM) since it cross-compiles. To *run* the x86_64 glibc binaries it produced, you must either:
- Rebuild the image with `--platform linux/amd64`, or
- Use a separate amd64 Ubuntu image

## node_modules conflicts between host and container

Host node_modules (macOS/ARM) have native binaries incompatible with Linux/x86_64 containers. Use a Docker volume to isolate:

```
-v "quickjs-ci-node-modules":/opt/quickjs/node_modules
```

Then `npm install` runs inside the container and produces the right native binaries.

## Expected test failures in Docker

- `shared-library-modules.test.ts` — `.so` extras aren't available unless `build/extras/` is also overlaid. Always fails for static builds (shared libs unsupported).
- `load-module-via-urlget.test.ts` — times out in containers without internet.
- `create-process.test.ts` — Wine tests, skipped when `CI=true`.

## QJU_ForEachProperty atom ownership

`state->key` in `QJU_ForEachPropertyState` is **borrowed** from `state->tab[state->i].atom` — it is NOT duped. The cleanup in `QJU_FreeForEachPropertyState` frees all atoms via the tab loop. Do not add a separate `JS_FreeAtom(ctx, state->key)` call or it will double-free.
