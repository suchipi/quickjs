/*
 * Cross-platform HTTP client - dispatches to platform-specific implementation.
 */

#ifndef CONFIG_FETCH
#define CONFIG_FETCH 1
#endif

#if CONFIG_FETCH

#if defined(_WIN32)
  #include "httpclient-winhttp.c"
#elif defined(__EMSCRIPTEN__) || defined(__wasi__)
  #include "httpclient-stub.c"
#elif defined(__COSMO__)
  #include "httpclient-cosmo.c"
#else
  #include "httpclient-curl.c"
#endif

#else /* CONFIG_FETCH == 0 */

#include "httpclient-stub.c"

#endif /* CONFIG_FETCH */
