declare module "quickjs:fetch" {
  /**
   * Fetch a resource from the network.
   *
   * Returns a Promise that resolves to a Response object.
   * The networking happens in a background thread so the event loop is not blocked.
   */
  export function fetch(url: string, init?: RequestInit): Promise<Response>;

  export interface RequestInit {
    /** HTTP method (default: "GET") */
    method?: string;
    /** Request headers */
    headers?: HeadersInit;
    /** Request body (for POST, PUT, etc.) */
    body?: string | ArrayBuffer;
    /** Redirect behavior: "follow" (default), "error", or "manual" */
    redirect?: "follow" | "error" | "manual";
  }

  type HeadersInit = Record<string, string> | [string, string][] | Headers;

  export class Headers {
    constructor(init?: HeadersInit);
    /** Returns the first value for the given header name, or null. */
    get(name: string): string | null;
    /** Sets the value for the given header name (replaces existing). */
    set(name: string, value: string): void;
    /** Returns true if the header exists. */
    has(name: string): boolean;
    /** Removes the header with the given name. */
    delete(name: string): void;
    /** Appends a value to an existing header, or adds a new one. */
    append(name: string, value: string): void;
    /** Calls the callback for each header. */
    forEach(
      callback: (value: string, name: string, headers: Headers) => void
    ): void;
    /** Returns an array of [name, value] pairs. */
    entries(): [string, string][];
  }

  export class Response {
    /** True if the status is in the range 200-299. */
    readonly ok: boolean;
    /** The HTTP status code. */
    readonly status: number;
    /** The HTTP status text (e.g. "OK"). */
    readonly statusText: string;
    /** The response headers. */
    readonly headers: Headers;
    /** The final URL after any redirects. */
    readonly url: string;
    /** True if the response was the result of a redirect. */
    readonly redirected: boolean;
    /** The response type (always "basic"). */
    readonly type: string;
    /** Returns the body as a string. */
    text(): Promise<string>;
    /** Parses the body as JSON. */
    json(): Promise<any>;
    /** Returns the body as an ArrayBuffer. */
    arrayBuffer(): Promise<ArrayBuffer>;
  }
}

// Global declarations
declare function fetch(
  url: string,
  init?: import("quickjs:fetch").RequestInit
): Promise<import("quickjs:fetch").Response>;

declare var Headers: typeof import("quickjs:fetch").Headers;
declare var Response: typeof import("quickjs:fetch").Response;
