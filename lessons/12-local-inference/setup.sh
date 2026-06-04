#!/usr/bin/env bash
# 用法: ./setup.sh cpu | cuda
set -euo pipefail
cd "$(dirname "$0")"

variant="${1:-}"
if [ "$variant" != cpu ] && [ "$variant" != cuda ]; then
  echo "用法: $0 cpu|cuda"
  echo "  cpu  — 仅 CPU 版 PyTorch（默认，Mac / 无 NVIDIA 用这个）"
  echo "  cuda — CUDA 版 PyTorch（需 NVIDIA 驱动 + GPU）"
  exit 1
fi

if command -v uv >/dev/null 2>&1; then
  echo "→ 使用 uv 管理虚拟环境"
  [ -d .venv ] || uv venv .venv
  install() { uv pip install "$@" --python .venv/bin/python; }
else
  echo "→ 未找到 uv，回退到 python3 -m venv"
  [ -d .venv ] || python3 -m venv .venv
  install() { .venv/bin/python -m pip install "$@"; }
fi

py=".venv/bin/python"
install --upgrade pip

if [ "$variant" = cpu ]; then
  install torch --index-url https://download.pytorch.org/whl/cpu
else
  install torch --index-url https://download.pytorch.org/whl/cu124
fi

install "transformers>=4.40"
echo "$variant" > .venv-variant

echo ""
echo "完成 (${variant})。运行: npm run ch12  或  ./run.sh"
echo "权重将下载到本目录 models/，删除: rm -rf models .venv"
