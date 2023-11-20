---
title: Project Goals - Suchipi's QuickJS Fork
---

# Goals

Suchipi's QuickJS fork makes several changes to the original QuickJS source code, all aligned with the following goals:

## User-facing changes

- Change the APIs of the `std` and `os` modules to follow idiomatic conventions popular among the JavaScript community
- Add TypeScript types (`.d.ts` files) for everything specific to QuickJS
- Extend the engine with more builtin modules and functions
  - Some of these are new ECMAScript APIs, some are proposed ECMAScript APIs, and some are new original APIs
- Make the engine's module loader more flexible and configurable
- Create JavaScript-facing APIs that allow engine users to access engine internals

## Development changes (for the fork repo)

- Make it easier to cross-compile the engine for other OSes
- Support additional target OSes (ie. BSD)
- Make the build process more organized and structured
- Test using snapshot testing

---

[Back to Index](/index.md)
