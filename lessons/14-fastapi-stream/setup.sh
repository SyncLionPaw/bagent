#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if command -v uv >/dev/null 2>&1; then
  echo "→ 使用 uv 管理虚拟环境"
  [ -d .venv ] || uv venv .venv
  install() { uv pip install "$@" --python .venv/bin/python; }
else
  echo "→ 未找到 uv，回退到 python3 -m venv"
  [ -d .venv ] || python3 -m venv .venv
  install() { .venv/bin/python -m pip install "$@"; }
fi

install --upgrade pip
install "fastapi>=0.110" "uvicorn[standard]>=0.27"

echo ""
echo "完成。终端 1: npm run ch14:server"
echo "      终端 2: export DEEPSEEK_API_KEY=... && npm run ch14"
