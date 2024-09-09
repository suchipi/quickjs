// WHATWG encoding spec at https://encoding.spec.whatwg.org/ would be better,
// but this is better than nothing
declare module "quickjs:encoding" {
  export function toUtf8(input: ArrayBuffer): string;
  export function fromUtf8(input: string): ArrayBuffer;
}
