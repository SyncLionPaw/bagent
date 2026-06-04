#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -x .venv/bin/python ]; then
  echo "请先安装依赖，例如:"
  echo "  npm run ch12:setup:cpu"
  echo "  npm run ch12:setup:cuda   # 有 NVIDIA GPU 时"
  exit 1
fi

exec .venv/bin/python run.py
