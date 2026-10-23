/**
 * The `"quickjs:net"` module provides networking functions.
 */
declare module "quickjs:net" {
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
    // Keep the most specific overloads first: UrlGetOptions admits every option, so an earlier looser overload would capture calls meant for a later one.

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
  }

  export var urlGet: UrlGet;
}
