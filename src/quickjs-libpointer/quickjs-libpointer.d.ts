declare module "quickjs:pointer" {
  /**
   * An opaque pointer value which can be passed around by JS
   */
  export class Pointer {
    static NULL: Pointer;

    /** Returns a boolean indicating whether the provided value is a `Pointer` object. */
    static isPointer(value: any): value is Pointer;

    /** For debug logging purposes only; format can vary from platform to platform and is not guaranteed to be present or consistent. */
    _info?: string;
  }
}
