/**
 * The `"quickjs:curl"` module provides networking functions implemented with
 * libcurl, which is loaded dynamically at runtime.
 */
declare module "quickjs:curl" {
  /**
   * Options for {@link urlGet}.
   */
  export interface UrlGetOptions {
    /**
     * When true, the response body is returned as an ArrayBuffer instead of a
     * string. Defaults to false.
     */
    binary?: boolean;

    /**
     * When true, `urlGet` returns an object with `response`, `responseHeaders`,
     * and `status` properties instead of only the response body, and it
     * doesn't throw when the http status code is outside 200-299. Defaults to
     * false.
     */
    full?: boolean;

    /**
     * Request headers to send, as an object whose keys are header names and
     * whose values are header values. Numbers and bigints get converted to
     * strings. An empty string sends the header with no value.
     *
     * Be aware that libcurl may also add other headers, such as `Accept` or
     * `Host`. That said, the header values you specify will take precedence
     * over values added by libcurl.
     */
    headers?: Record<string, string | number | bigint>;
  }

  export interface UrlGet {
    /**
     * Download `url` using libcurl (dynamically loaded). Returns string when
     * the http status code is between 200 and 299, and throws otherwise.
     *
     * Pass an object with { full: true } as the second argument to get response
     * headers and status code. See {@link UrlGetOptions} for all options.
     */
    (url: string): string;

    /**
     * Download `url` using libcurl (dynamically loaded).
     *
     * Returns an object with three properties:
     *
     * - `response`: response body content (ArrayBuffer)
     * - `responseHeaders`: headers separated by CRLF (string)
     * - `status`: status code (number)
     *
     * See {@link UrlGetOptions} for all options.
     */
    (url: string, options: UrlGetOptions & { full: true; binary: true }): {
      status: number;
      response: ArrayBuffer;
      responseHeaders: string;
    };

    /**
     * Download `url` using libcurl (dynamically loaded).
     *
     * Returns an object with three properties:
     *
     * - `response`: response body content (string)
     * - `responseHeaders`: headers separated by CRLF (string)
     * - `status`: status code (number)
     *
     * See {@link UrlGetOptions} for all options.
     */
    (url: string, options: UrlGetOptions & { full: true }): {
      status: number;
      response: string;
      responseHeaders: string;
    };

    /**
     * Download `url` using libcurl (dynamically loaded).
     *
     * Returns an object with three properties:
     *
     * - `response`: response body content (string)
     * - `responseHeaders`: headers separated by CRLF (string)
     * - `status`: status code (number)
     *
     * See {@link UrlGetOptions} for all options.
     */
    (url: string, options: UrlGetOptions & { full: true; binary: false }): {
      status: number;
      response: string;
      responseHeaders: string;
    };

    /**
     * Download `url` using libcurl (dynamically loaded). Returns ArrayBuffer
     * when the http status code is between 200 and 299, and throws otherwise.
     *
     * Pass an object with { full: true } as the second argument to get response
     * headers and status code. See {@link UrlGetOptions} for all options.
     */
    (url: string, options: UrlGetOptions & { binary: true }): ArrayBuffer;

    /**
     * Download `url` using libcurl (dynamically loaded). Returns ArrayBuffer
     * when the http status code is between 200 and 299, and throws otherwise.
     *
     * Pass an object with { full: true } as the second argument to get response
     * headers and status code. See {@link UrlGetOptions} for all options.
     */
    (
      url: string,
      options: UrlGetOptions & { binary: true; full: false }
    ): ArrayBuffer;

    /**
     * Download `url` using libcurl (dynamically loaded). Returns string when
     * the http status code is between 200 and 299, and throws otherwise.
     *
     * Pass an object with { full: true } as the second argument to get response
     * headers and status code. See {@link UrlGetOptions} for all options.
     */
    (url: string, options: UrlGetOptions & { binary: false }): string;

    /**
     * Download `url` using libcurl (dynamically loaded). Returns string when
     * the http status code is between 200 and 299, and throws otherwise.
     *
     * Pass an object with { full: true } as the second argument to get response
     * headers and status code. See {@link UrlGetOptions} for all options.
     */
    (url: string, options: UrlGetOptions & { full: false }): string;

    /**
     * Download `url` using libcurl (dynamically loaded). Returns string when
     * the http status code is between 200 and 299, and throws otherwise.
     *
     * Pass an object with { full: true } as the second argument to get response
     * headers and status code. See {@link UrlGetOptions} for all options.
     */
    (
      url: string,
      options: UrlGetOptions & { binary: false; full: false }
    ): string;

    /**
     * Download `url` using libcurl (dynamically loaded). Returns string when
     * the http status code is between 200 and 299, and throws otherwise.
     *
     * Pass an object with { full: true } as the second argument to get response
     * headers and status code. See {@link UrlGetOptions} for all options.
     */
    (
      url: string,
      options: UrlGetOptions & { binary?: false; full?: false }
    ): string;

    /**
     * Download `url` using libcurl (dynamically loaded).
     *
     * When the `full` option is true, returns an object with three
     * properties:
     *
     * - `response`: response body content (ArrayBuffer when the `binary`
     *   option is true, string otherwise)
     * - `responseHeaders`: headers separated by CRLF (string)
     * - `status`: status code (number)
     *
     * Otherwise, returns the response body (ArrayBuffer when the `binary`
     * option is true, string otherwise) when the http status code is between
     * 200 and 299, and throws otherwise.
     *
     * See {@link UrlGetOptions} for all options.
     */
    (url: string, options: UrlGetOptions):
      | string
      | ArrayBuffer
      | {
          status: number;
          response: string | ArrayBuffer;
          responseHeaders: string;
        };
  }

  export var urlGet: UrlGet;

  /**
   * Options for {@link urlRequest}.
   */
  export interface UrlRequestOptions extends Omit<UrlGetOptions, "full"> {
    /**
     * The request body. Strings are sent as UTF-8.
     *
     * When omitted, the request has no body, except that a POST request sends
     * an empty one.
     *
     * When a body is sent, libcurl adds the header
     * `Content-Type: application/x-www-form-urlencoded`, unless you specify a
     * `Content-Type` in `headers`.
     *
     * Passing a body with the HEAD method throws a TypeError.
     */
    body?: string | ArrayBuffer;

    /**
     * What to do when the server responds with a redirect. Defaults to `"follow"`.
     *
     * - `"follow"`: Follow any 3xx response that has a `Location` header. See {@link UrlRequest} for how redirects affect the method and body.
     * - `"error"`: Throw an Error for any response that `"follow"` would follow, which is any 3xx response that has a `Location` header. A 3xx response without a `Location` header is returned as-is.
     * - `"manual"`: Don't follow the redirect. `urlRequest` returns the redirect response itself, with its status, headers (including `location`), and body.
     */
    redirect?: "follow" | "error" | "manual";
  }

  /**
   * The type of {@link urlRequest}.
   *
   * By default, `urlRequest` follows redirects, which affect the request like
   * this:
   *
   * - After a 301, 302, or 303 redirect, a POST becomes a GET without a body,
   *   like in browsers.
   * - A 303 redirect also drops the body of any other method, but keeps the
   *   method.
   * - Otherwise, the method and body are both kept.
   *
   * Use the `redirect` option to throw on redirects or to get the redirect
   * response instead. See {@link UrlRequestOptions}.
   */
  export interface UrlRequest {
    /**
     * Send a request to `url` using libcurl (dynamically loaded).
     *
     * Returns an object with three properties:
     *
     * - `response`: response body content (string)
     * - `responseHeaders`: an object whose keys are lowercased header names and whose values are arrays of header values (it's an array in case the header is specified more than once)
     * - `status`: status code (number)
     *
     * Unlike {@link urlGet}, this doesn't throw when the http status code is
     * outside 200-299. Redirects are followed unless the `redirect` option
     * says otherwise; see {@link UrlRequest} for how they affect the method
     * and body.
     *
     * @param method - The request method, such as `"GET"`, `"POST"`, `"PUT"`, or `"DELETE"`. It's sent exactly as written, so it's case-sensitive.
     * @param url - The URL to send the request to.
     */
    (method: string, url: string): {
      status: number;
      response: string;
      responseHeaders: { [name: string]: Array<string> | undefined };
    };

    /**
     * Send a request to `url` using libcurl (dynamically loaded).
     *
     * Returns an object with three properties:
     *
     * - `response`: response body content (ArrayBuffer)
     * - `responseHeaders`: an object whose keys are lowercased header names and whose values are arrays of header values (it's an array in case the header is specified more than once)
     * - `status`: status code (number)
     *
     * Unlike {@link urlGet}, this doesn't throw when the http status code is
     * outside 200-299. Redirects are followed unless the `redirect` option
     * says otherwise; see {@link UrlRequest} for how they affect the method
     * and body.
     *
     * @param method - The request method, such as `"GET"`, `"POST"`, `"PUT"`, or `"DELETE"`. It's sent exactly as written, so it's case-sensitive.
     * @param url - The URL to send the request to.
     * @param options - Options pertaining to the request. See {@link UrlRequestOptions} for all options.
     */
    (
      method: string,
      url: string,
      options: UrlRequestOptions & { binary: true }
    ): {
      status: number;
      response: ArrayBuffer;
      responseHeaders: { [name: string]: Array<string> | undefined };
    };

    /**
     * Send a request to `url` using libcurl (dynamically loaded).
     *
     * Returns an object with three properties:
     *
     * - `response`: response body content (string)
     * - `responseHeaders`: an object whose keys are lowercased header names and whose values are arrays of header values (it's an array in case the header is specified more than once)
     * - `status`: status code (number)
     *
     * Unlike {@link urlGet}, this doesn't throw when the http status code is
     * outside 200-299. Redirects are followed unless the `redirect` option
     * says otherwise; see {@link UrlRequest} for how they affect the method
     * and body.
     *
     * @param method - The request method, such as `"GET"`, `"POST"`, `"PUT"`, or `"DELETE"`. It's sent exactly as written, so it's case-sensitive.
     * @param url - The URL to send the request to.
     * @param options - Options pertaining to the request. See {@link UrlRequestOptions} for all options.
     */
    (
      method: string,
      url: string,
      options: UrlRequestOptions & { binary?: false }
    ): {
      status: number;
      response: string;
      responseHeaders: { [name: string]: Array<string> | undefined };
    };

    /**
     * Send a request to `url` using libcurl (dynamically loaded).
     *
     * Returns an object with three properties:
     *
     * - `response`: response body content (ArrayBuffer when the `binary`
     *   option is true, string otherwise)
     * - `responseHeaders`: an object whose keys are lowercased header names and whose values are arrays of header values (it's an array in case the header is specified more than once)
     * - `status`: status code (number)
     *
     * Unlike {@link urlGet}, this doesn't throw when the http status code is
     * outside 200-299. Redirects are followed unless the `redirect` option
     * says otherwise; see {@link UrlRequest} for how they affect the method
     * and body.
     *
     * @param method - The request method, such as `"GET"`, `"POST"`, `"PUT"`, or `"DELETE"`. It's sent exactly as written, so it's case-sensitive.
     * @param url - The URL to send the request to.
     * @param options - Options pertaining to the request. See {@link UrlRequestOptions} for all options.
     */
    (method: string, url: string, options: UrlRequestOptions): {
      status: number;
      response: string | ArrayBuffer;
      responseHeaders: { [name: string]: Array<string> | undefined };
    };
  }

  export var urlRequest: UrlRequest;
}
