await Promise.resolve();
/* JS_WriteObject can't serialize function values — so attaching one as
   an own-property on the Error forces the primary serialization to fail,
   exercising the meta-error retry path in worker_send_error. */
throw Object.assign(new Error("real msg"), {
  bad: () => 1,
});
