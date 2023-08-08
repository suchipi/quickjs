#include "quickjs.h"
#include <curl/curl.h>

#define countof(x) (sizeof(x) / sizeof((x)[0]))

/* returns NULL when unknown code */
static const char *CURLcode_to_string(CURLcode code)
{
  switch (code) {
    case CURLE_OK: return "CURLE_OK";
    case CURLE_UNSUPPORTED_PROTOCOL: return "CURLE_UNSUPPORTED_PROTOCOL";
    case CURLE_FAILED_INIT: return "CURLE_FAILED_INIT";
    case CURLE_URL_MALFORMAT: return "CURLE_URL_MALFORMAT";
    case CURLE_NOT_BUILT_IN: return "CURLE_NOT_BUILT_IN";
    case CURLE_COULDNT_RESOLVE_PROXY: return "CURLE_COULDNT_RESOLVE_PROXY";
    case CURLE_COULDNT_RESOLVE_HOST: return "CURLE_COULDNT_RESOLVE_HOST";
    case CURLE_COULDNT_CONNECT: return "CURLE_COULDNT_CONNECT";
    case CURLE_WEIRD_SERVER_REPLY: return "CURLE_WEIRD_SERVER_REPLY";
    case CURLE_REMOTE_ACCESS_DENIED: return "CURLE_REMOTE_ACCESS_DENIED";
    case CURLE_FTP_ACCEPT_FAILED: return "CURLE_FTP_ACCEPT_FAILED";
    case CURLE_FTP_WEIRD_PASS_REPLY: return "CURLE_FTP_WEIRD_PASS_REPLY";
    case CURLE_FTP_ACCEPT_TIMEOUT: return "CURLE_FTP_ACCEPT_TIMEOUT";
    case CURLE_FTP_WEIRD_PASV_REPLY: return "CURLE_FTP_WEIRD_PASV_REPLY";
    case CURLE_FTP_WEIRD_227_FORMAT: return "CURLE_FTP_WEIRD_227_FORMAT";
    case CURLE_FTP_CANT_GET_HOST: return "CURLE_FTP_CANT_GET_HOST";
    case CURLE_HTTP2: return "CURLE_HTTP2";
    case CURLE_FTP_COULDNT_SET_TYPE: return "CURLE_FTP_COULDNT_SET_TYPE";
    case CURLE_PARTIAL_FILE: return "CURLE_PARTIAL_FILE";
    case CURLE_FTP_COULDNT_RETR_FILE: return "CURLE_FTP_COULDNT_RETR_FILE";
    case CURLE_OBSOLETE20: return "CURLE_OBSOLETE20";
    case CURLE_QUOTE_ERROR: return "CURLE_QUOTE_ERROR";
    case CURLE_HTTP_RETURNED_ERROR: return "CURLE_HTTP_RETURNED_ERROR";
    case CURLE_WRITE_ERROR: return "CURLE_WRITE_ERROR";
    case CURLE_OBSOLETE24: return "CURLE_OBSOLETE24";
    case CURLE_UPLOAD_FAILED: return "CURLE_UPLOAD_FAILED";
    case CURLE_READ_ERROR: return "CURLE_READ_ERROR";
    case CURLE_OUT_OF_MEMORY: return "CURLE_OUT_OF_MEMORY";
    case CURLE_OPERATION_TIMEDOUT: return "CURLE_OPERATION_TIMEDOUT";
    case CURLE_OBSOLETE29: return "CURLE_OBSOLETE29";
    case CURLE_FTP_PORT_FAILED: return "CURLE_FTP_PORT_FAILED";
    case CURLE_FTP_COULDNT_USE_REST: return "CURLE_FTP_COULDNT_USE_REST";
    case CURLE_OBSOLETE32: return "CURLE_OBSOLETE32";
    case CURLE_RANGE_ERROR: return "CURLE_RANGE_ERROR";
    case CURLE_HTTP_POST_ERROR: return "CURLE_HTTP_POST_ERROR";
    case CURLE_SSL_CONNECT_ERROR: return "CURLE_SSL_CONNECT_ERROR";
    case CURLE_BAD_DOWNLOAD_RESUME: return "CURLE_BAD_DOWNLOAD_RESUME";
    case CURLE_FILE_COULDNT_READ_FILE: return "CURLE_FILE_COULDNT_READ_FILE";
    case CURLE_LDAP_CANNOT_BIND: return "CURLE_LDAP_CANNOT_BIND";
    case CURLE_LDAP_SEARCH_FAILED: return "CURLE_LDAP_SEARCH_FAILED";
    case CURLE_OBSOLETE40: return "CURLE_OBSOLETE40";
    case CURLE_FUNCTION_NOT_FOUND: return "CURLE_FUNCTION_NOT_FOUND";
    case CURLE_ABORTED_BY_CALLBACK: return "CURLE_ABORTED_BY_CALLBACK";
    case CURLE_BAD_FUNCTION_ARGUMENT: return "CURLE_BAD_FUNCTION_ARGUMENT";
    case CURLE_OBSOLETE44: return "CURLE_OBSOLETE44";
    case CURLE_INTERFACE_FAILED: return "CURLE_INTERFACE_FAILED";
    case CURLE_OBSOLETE46: return "CURLE_OBSOLETE46";
    case CURLE_TOO_MANY_REDIRECTS: return "CURLE_TOO_MANY_REDIRECTS";
    case CURLE_UNKNOWN_OPTION: return "CURLE_UNKNOWN_OPTION";
    case CURLE_SETOPT_OPTION_SYNTAX: return "CURLE_SETOPT_OPTION_SYNTAX";
    case CURLE_OBSOLETE50: return "CURLE_OBSOLETE50";
    case CURLE_OBSOLETE51: return "CURLE_OBSOLETE51";
    case CURLE_GOT_NOTHING: return "CURLE_GOT_NOTHING";
    case CURLE_SSL_ENGINE_NOTFOUND: return "CURLE_SSL_ENGINE_NOTFOUND";
    case CURLE_SSL_ENGINE_SETFAILED: return "CURLE_SSL_ENGINE_SETFAILED";
    case CURLE_SEND_ERROR: return "CURLE_SEND_ERROR";
    case CURLE_RECV_ERROR: return "CURLE_RECV_ERROR";
    case CURLE_OBSOLETE57: return "CURLE_OBSOLETE57";
    case CURLE_SSL_CERTPROBLEM: return "CURLE_SSL_CERTPROBLEM";
    case CURLE_SSL_CIPHER: return "CURLE_SSL_CIPHER";
    case CURLE_PEER_FAILED_VERIFICATION: return "CURLE_PEER_FAILED_VERIFICATION aka CURLE_SSL_CACERT";
    case CURLE_BAD_CONTENT_ENCODING: return "CURLE_BAD_CONTENT_ENCODING";
    case CURLE_OBSOLETE62: return "CURLE_OBSOLETE62";
    case CURLE_FILESIZE_EXCEEDED: return "CURLE_FILESIZE_EXCEEDED";
    case CURLE_USE_SSL_FAILED: return "CURLE_USE_SSL_FAILED";
    case CURLE_SEND_FAIL_REWIND: return "CURLE_SEND_FAIL_REWIND";
    case CURLE_SSL_ENGINE_INITFAILED: return "CURLE_SSL_ENGINE_INITFAILED";
    case CURLE_LOGIN_DENIED: return "CURLE_LOGIN_DENIED";
    case CURLE_TFTP_NOTFOUND: return "CURLE_TFTP_NOTFOUND";
    case CURLE_TFTP_PERM: return "CURLE_TFTP_PERM";
    case CURLE_REMOTE_DISK_FULL: return "CURLE_REMOTE_DISK_FULL";
    case CURLE_TFTP_ILLEGAL: return "CURLE_TFTP_ILLEGAL";
    case CURLE_TFTP_UNKNOWNID: return "CURLE_TFTP_UNKNOWNID";
    case CURLE_REMOTE_FILE_EXISTS: return "CURLE_REMOTE_FILE_EXISTS";
    case CURLE_TFTP_NOSUCHUSER: return "CURLE_TFTP_NOSUCHUSER";
    case CURLE_OBSOLETE75: return "CURLE_OBSOLETE75";
    case CURLE_OBSOLETE76: return "CURLE_OBSOLETE76";
    case CURLE_SSL_CACERT_BADFILE: return "CURLE_SSL_CACERT_BADFILE";
    case CURLE_REMOTE_FILE_NOT_FOUND: return "CURLE_REMOTE_FILE_NOT_FOUND";
    case CURLE_SSH: return "CURLE_SSH  ";
    case CURLE_SSL_SHUTDOWN_FAILED: return "CURLE_SSL_SHUTDOWN_FAILED";
    case CURLE_AGAIN: return "CURLE_AGAIN";
    case CURLE_SSL_CRL_BADFILE: return "CURLE_SSL_CRL_BADFILE";
    case CURLE_SSL_ISSUER_ERROR: return "CURLE_SSL_ISSUER_ERROR";
    case CURLE_FTP_PRET_FAILED: return "CURLE_FTP_PRET_FAILED";
    case CURLE_RTSP_CSEQ_ERROR: return "CURLE_RTSP_CSEQ_ERROR";
    case CURLE_RTSP_SESSION_ERROR: return "CURLE_RTSP_SESSION_ERROR";
    case CURLE_FTP_BAD_FILE_LIST: return "CURLE_FTP_BAD_FILE_LIST";
    case CURLE_CHUNK_FAILED: return "CURLE_CHUNK_FAILED";
    case CURLE_NO_CONNECTION_AVAILABLE: return "CURLE_NO_CONNECTION_AVAILABLE";
    case CURLE_SSL_PINNEDPUBKEYNOTMATCH: return "CURLE_SSL_PINNEDPUBKEYNOTMATCH";
    case CURLE_SSL_INVALIDCERTSTATUS: return "CURLE_SSL_INVALIDCERTSTATUS";
    case CURLE_HTTP2_STREAM: return "CURLE_HTTP2_STREAM";
    case CURLE_RECURSIVE_API_CALL: return "CURLE_RECURSIVE_API_CALL";
    case CURLE_AUTH_ERROR: return "CURLE_AUTH_ERROR";
    case CURLE_HTTP3: return "CURLE_HTTP3";
    case CURLE_QUIC_CONNECT_ERROR: return "CURLE_QUIC_CONNECT_ERROR";
    case CURLE_PROXY: return "CURLE_PROXY";
    case CURLE_SSL_CLIENTCERT: return "CURLE_SSL_CLIENTCERT";
    case CURLE_UNRECOVERABLE_POLL: return "CURLE_UNRECOVERABLE_POLL";
    default: return NULL;
  }
}

static JSValue js_curl(JSContext *ctx, JSValueConst this_val,
                      int argc, JSValueConst *argv)
{
    CURL *curl;
    CURLcode result;

    curl = curl_easy_init();
    if (curl == NULL) {
      return JS_ThrowInternalError(ctx, "curl_easy_init failed");
    }

    curl_easy_setopt(curl, CURLOPT_URL, "https://example.com");
    result = curl_easy_perform(curl);
    curl_easy_cleanup(curl);

    if (result != CURLE_OK) {
      const char *name = CURLcode_to_string(result);
      if (name == NULL) {
        name = "UNKNOWN";
      }

      JS_ThrowError(ctx, "curl_easy_perform failed (c ode = %d, name = %s)", result, name);
      JS_AddPropertyToException(ctx, "code", JS_NewInt32(ctx, result));
      JS_AddPropertyToException(ctx, "name", JS_NewString(ctx, name));
      return JS_EXCEPTION;
    } else {
      // TODO body goes here
      return JS_UNDEFINED;
    }
}

static const JSCFunctionListEntry js_curl_funcs[] = {
    JS_CFUNC_DEF("curl", 1, js_curl ),
};

static int js_curl_init(JSContext *ctx, JSModuleDef *m)
{
    return JS_SetModuleExportList(ctx, m, js_curl_funcs,
                                  countof(js_curl_funcs));
}

#ifdef JS_SHARED_LIBRARY
#define JS_INIT_MODULE js_init_module
#else
#define JS_INIT_MODULE js_init_module_curl
#endif

JSModuleDef *JS_INIT_MODULE(JSContext *ctx, const char *module_name)
{
    JSModuleDef *m;
    m = JS_NewCModule(ctx, module_name, js_curl_init, NULL);
    if (!m)
        return NULL;
    JS_AddModuleExportList(ctx, m, js_curl_funcs, countof(js_curl_funcs));
    return m;
}
