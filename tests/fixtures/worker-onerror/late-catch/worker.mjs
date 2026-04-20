const p = Promise.reject(new Error("x"));
setTimeout(() => p.catch(() => {}), 0);
