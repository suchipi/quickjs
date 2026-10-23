# "quickjs:net" (namespace)

The `"quickjs:net"` module provides networking functions.

```ts
declare module "quickjs:net" {
  export interface UrlGetOptions {
    binary?: boolean;
    full?: boolean;
    headers?: Record<string, string | number | bigint>;
  }
  export interface UrlGet {
    (url: string): string;
    (
      url: string,
      options: UrlGetOptions & {
        full: true;
        binary: true;
      },
    ): {
      status: number;
      response: ArrayBuffer;
      responseHeaders: string;
    };
    (
      url: string,
      options: UrlGetOptions & {
        full: true;
      },
    ): {
      status: number;
      response: string;
      responseHeaders: string;
    };
    (
      url: string,
      options: UrlGetOptions & {
        full: true;
        binary: false;
      },
    ): {
      status: number;
      response: string;
      responseHeaders: string;
    };
    (
      url: string,
      options: UrlGetOptions & {
        binary: true;
      },
    ): ArrayBuffer;
    (
      url: string,
      options: UrlGetOptions & {
        binary: true;
        full: false;
      },
    ): ArrayBuffer;
    (
      url: string,
      options: UrlGetOptions & {
        binary: false;
      },
    ): string;
    (
      url: string,
      options: UrlGetOptions & {
        full: false;
      },
    ): string;
    (
      url: string,
      options: UrlGetOptions & {
        binary: false;
        full: false;
      },
    ): string;
    (
      url: string,
      options: UrlGetOptions & {
        binary?: false;
        full?: false;
      },
    ): string;
  }
  export var urlGet: UrlGet;
}
```

## "quickjs:net".UrlGetOptions (exported interface)

Options for [urlGet](/meta/docs/quickjs-net.md#quickjs-net-urlget-exported-urlget).

```ts
interface UrlGetOptions {
  binary?: boolean;
  full?: boolean;
  headers?: Record<string, string | number | bigint>;
}
```

### UrlGetOptions.binary (boolean property)

When true, the response body is returned as an ArrayBuffer instead of a
string. Defaults to false.

```ts
binary?: boolean;
```

### UrlGetOptions.full (boolean property)

When true, `urlGet` returns an object with `response`, `responseHeaders`,
and `status` properties instead of only the response body, and it
doesn't throw when the http status code is outside 200-299. Defaults to
false.

```ts
full?: boolean;
```

### UrlGetOptions.headers (property)

Request headers to send, as an object whose keys are header names and
whose values are header values. Numbers and bigints get converted to
strings. An empty string sends the header with no value.

Be aware that libcurl may also add other headers, such as `Accept` or
`Host`. That said, the header values you specify will take precedence
over values added by libcurl.

```ts
headers?: Record<string, string | number | bigint>;
```

## "quickjs:net".UrlGet (exported interface)

```ts
interface UrlGet {
  (url: string): string;
  (
    url: string,
    options: UrlGetOptions & {
      full: true;
      binary: true;
    },
  ): {
    status: number;
    response: ArrayBuffer;
    responseHeaders: string;
  };
  (
    url: string,
    options: UrlGetOptions & {
      full: true;
    },
  ): {
    status: number;
    response: string;
    responseHeaders: string;
  };
  (
    url: string,
    options: UrlGetOptions & {
      full: true;
      binary: false;
    },
  ): {
    status: number;
    response: string;
    responseHeaders: string;
  };
  (
    url: string,
    options: UrlGetOptions & {
      binary: true;
    },
  ): ArrayBuffer;
  (
    url: string,
    options: UrlGetOptions & {
      binary: true;
      full: false;
    },
  ): ArrayBuffer;
  (
    url: string,
    options: UrlGetOptions & {
      binary: false;
    },
  ): string;
  (
    url: string,
    options: UrlGetOptions & {
      full: false;
    },
  ): string;
  (
    url: string,
    options: UrlGetOptions & {
      binary: false;
      full: false;
    },
  ): string;
  (
    url: string,
    options: UrlGetOptions & {
      binary?: false;
      full?: false;
    },
  ): string;
}
```

### UrlGet(...) (call signature)

Download `url` using libcurl (dynamically loaded). Returns string when
the http status code is between 200 and 299, and throws otherwise.

Pass an object with { full: true } as the second argument to get response
headers and status code. See [UrlGetOptions](/meta/docs/quickjs-net.md#quickjs-net-urlgetoptions-exported-interface) for all options.

```ts
(url: string): string;
```

### UrlGet(...) (call signature)

Download `url` using libcurl (dynamically loaded).

Returns an object with three properties:

- `response`: response body content (ArrayBuffer)
- `responseHeaders`: headers separated by CRLF (string)
- `status`: status code (number)

See [UrlGetOptions](/meta/docs/quickjs-net.md#quickjs-net-urlgetoptions-exported-interface) for all options.

```ts
(url: string, options: UrlGetOptions & {
  full: true;
  binary: true;
}): {
  status: number;
  response: ArrayBuffer;
  responseHeaders: string;
};
```

### UrlGet(...) (call signature)

Download `url` using libcurl (dynamically loaded).

Returns an object with three properties:

- `response`: response body content (string)
- `responseHeaders`: headers separated by CRLF (string)
- `status`: status code (number)

See [UrlGetOptions](/meta/docs/quickjs-net.md#quickjs-net-urlgetoptions-exported-interface) for all options.

```ts
(url: string, options: UrlGetOptions & {
  full: true;
}): {
  status: number;
  response: string;
  responseHeaders: string;
};
```

### UrlGet(...) (call signature)

Download `url` using libcurl (dynamically loaded).

Returns an object with three properties:

- `response`: response body content (string)
- `responseHeaders`: headers separated by CRLF (string)
- `status`: status code (number)

See [UrlGetOptions](/meta/docs/quickjs-net.md#quickjs-net-urlgetoptions-exported-interface) for all options.

```ts
(url: string, options: UrlGetOptions & {
  full: true;
  binary: false;
}): {
  status: number;
  response: string;
  responseHeaders: string;
};
```

### UrlGet(...) (call signature)

Download `url` using libcurl (dynamically loaded). Returns ArrayBuffer
when the http status code is between 200 and 299, and throws otherwise.

Pass an object with { full: true } as the second argument to get response
headers and status code. See [UrlGetOptions](/meta/docs/quickjs-net.md#quickjs-net-urlgetoptions-exported-interface) for all options.

```ts
(url: string, options: UrlGetOptions & {
  binary: true;
}): ArrayBuffer;
```

### UrlGet(...) (call signature)

Download `url` using libcurl (dynamically loaded). Returns ArrayBuffer
when the http status code is between 200 and 299, and throws otherwise.

Pass an object with { full: true } as the second argument to get response
headers and status code. See [UrlGetOptions](/meta/docs/quickjs-net.md#quickjs-net-urlgetoptions-exported-interface) for all options.

```ts
(url: string, options: UrlGetOptions & {
  binary: true;
  full: false;
}): ArrayBuffer;
```

### UrlGet(...) (call signature)

Download `url` using libcurl (dynamically loaded). Returns string when
the http status code is between 200 and 299, and throws otherwise.

Pass an object with { full: true } as the second argument to get response
headers and status code. See [UrlGetOptions](/meta/docs/quickjs-net.md#quickjs-net-urlgetoptions-exported-interface) for all options.

```ts
(url: string, options: UrlGetOptions & {
  binary: false;
}): string;
```

### UrlGet(...) (call signature)

Download `url` using libcurl (dynamically loaded). Returns string when
the http status code is between 200 and 299, and throws otherwise.

Pass an object with { full: true } as the second argument to get response
headers and status code. See [UrlGetOptions](/meta/docs/quickjs-net.md#quickjs-net-urlgetoptions-exported-interface) for all options.

```ts
(url: string, options: UrlGetOptions & {
  full: false;
}): string;
```

### UrlGet(...) (call signature)

Download `url` using libcurl (dynamically loaded). Returns string when
the http status code is between 200 and 299, and throws otherwise.

Pass an object with { full: true } as the second argument to get response
headers and status code. See [UrlGetOptions](/meta/docs/quickjs-net.md#quickjs-net-urlgetoptions-exported-interface) for all options.

```ts
(url: string, options: UrlGetOptions & {
  binary: false;
  full: false;
}): string;
```

### UrlGet(...) (call signature)

Download `url` using libcurl (dynamically loaded). Returns string when
the http status code is between 200 and 299, and throws otherwise.

Pass an object with { full: true } as the second argument to get response
headers and status code. See [UrlGetOptions](/meta/docs/quickjs-net.md#quickjs-net-urlgetoptions-exported-interface) for all options.

```ts
(url: string, options: UrlGetOptions & {
  binary?: false;
  full?: false;
}): string;
```

## "quickjs:net".urlGet (exported UrlGet)

```ts
var urlGet: UrlGet;
```
