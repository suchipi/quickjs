#!/usr/bin/env bash

QJS=$(realpath ./build-default/src/qjs/qjs)

if [ ! -x "${QJS}" ]; then
  echo "qjs binary not found; run tup? make sure you're running this shell script with PWD set to the repo root."
  exit 1
fi

# "${QJS}" ./tests/microbench.js
echo "test_bignum.js..."
"${QJS}" --bignum ./tests/test_bignum.js

echo "test_bjson.js..."
"${QJS}" ./tests/test_bjson.js

echo "test_builtin.js..."
"${QJS}" ./tests/test_builtin.js

echo "test_closure.js..."
"${QJS}" ./tests/test_closure.js

echo "test_language.js..."
"${QJS}" ./tests/test_language.js

echo "test_loop.js..."
"${QJS}" ./tests/test_loop.js

echo "test_op_overloading.js..."
"${QJS}" --bignum ./tests/test_op_overloading.js

echo "test_qjscalc.js..."
"${QJS}" --qjscalc ./tests/test_qjscalc.js

echo "test_std.js..."
"${QJS}" ./tests/test_std.js

echo "test_worker.js..."
"${QJS}" ./tests/test_worker.js
