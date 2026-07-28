#!/usr/bin/env bash
set -e
cd /c/Users/Monto/Documents/Prueba/tat360-app
export WRANGLER_LOG_PATH=.wrangler/wrangler.log
./node_modules/.bin/vinext dev --host 127.0.0.1
