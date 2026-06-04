# 第 12 课：transformers 本地推理；权重下载到本课 models/
import os
import time
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

ROOT = Path(__file__).resolve().parent
MODELS_DIR = ROOT / "models"
MODELS_DIR.mkdir(exist_ok=True)
os.environ["HF_HOME"] = str(MODELS_DIR)
os.environ["HUGGINGFACE_HUB_CACHE"] = str(MODELS_DIR / "hub")

MODEL = "sshleifer/tiny-gpt2"
PROMPT = "The capital of France is"
MAX_NEW_TOKENS = 32
CACHE_DIR = str(MODELS_DIR / "hub")

device = "cuda" if torch.cuda.is_available() else "cpu"
variant_file = ROOT / ".venv-variant"
variant = variant_file.read_text().strip() if variant_file.exists() else "unknown"

print(f"模型: {MODEL}")
print(f"权重目录: {MODELS_DIR}")
print(f"设备: {device}（安装时选了 {variant}）")
print("首次运行会从 Hugging Face 下载到上述目录；删掉 models/ 即可清空\n")

t0 = time.perf_counter()
tokenizer = AutoTokenizer.from_pretrained(MODEL, cache_dir=CACHE_DIR)
t1 = time.perf_counter()
model = AutoModelForCausalLM.from_pretrained(MODEL, cache_dir=CACHE_DIR).to(device)
t2 = time.perf_counter()

print(f"加载 tokenizer: {t1 - t0:.2f} s")
print(f"加载模型权重:   {t2 - t1:.2f} s")
print(f"加载合计:       {t2 - t0:.2f} s\n")

inputs = tokenizer(PROMPT, return_tensors="pt").to(device)
input_len = inputs["input_ids"].shape[1]

t3 = time.perf_counter()
output_ids = model.generate(
    **inputs,
    max_new_tokens=MAX_NEW_TOKENS,
    do_sample=False,
)
t4 = time.perf_counter()

text = tokenizer.decode(output_ids[0], skip_special_tokens=True)
new_tokens = output_ids.shape[1] - input_len
elapsed = t4 - t3

print(f"prompt: {PROMPT!r}")
print(f"输出:   {text}\n")
print(f"推理耗时: {elapsed:.3f} s（新生成约 {new_tokens} tokens）")
if elapsed > 0 and new_tokens > 0:
    print(f"约 {new_tokens / elapsed:.1f} tokens/s（{device}，极小模型，仅作体感）")
print(
    "\n对比第 11 课云端 API：慢在本地加载权重 + forward；"
    "权重可随时 rm -rf lessons/12-local-inference/models",
)
