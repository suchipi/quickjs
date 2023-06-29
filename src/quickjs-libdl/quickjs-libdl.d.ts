declare module "quickjs:dl" {
  export const RTLD_LAZY: number;
  export const RTLD_NOW: number;
  export const RTLD_GLOBAL: number;
  export const RTLD_LOCAL: number;
  export const RTLD_NODELETE: number;
  export const RTLD_NOLOAD: number;
  export const RTLD_DEEPBIND: number;

  export function dlopen(
    filename: string,
    flags: number
  ): UserPtr<"quickjs:dl.Library">;

  export function dlsym(
    library: UserPtr<"quickjs:dl.Library">,
    symbol: string
  ): UserPtr<any>;

  export function dlclose(library: UserPtr<"quickjs:dl.Library">): void;
}
