#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -x .venv/bin/python ]; then
  echo "请先: npm run ch14:setup"
  exit 1
fi

exec .venv/bin/uvicorn main:app --host 127.0.0.1 --port 8014
