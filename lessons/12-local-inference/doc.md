# 第 12 课 · 本地极小模型推理（transformers）

**约 30 分钟** · 第 11 课之后：**在本机跑一小段 forward**，感受加载与生成耗时

## 本课用 Python（例外说明）

课程主线仍是 **JavaScript / Node**。  
这一课用 **[Hugging Face `transformers`](https://huggingface.co/docs/transformers)** 在本机下载极小权重并 `generate`。

- 不需要 `DEEPSEEK_API_KEY`  
- **权重只落在本课目录 `models/`**，不写入 `~/.cache/huggingface`；随时 `rm -rf models` 清空  
- 虚拟环境优先 **[uv](https://docs.astral.sh/uv/)**，没有则回退 `python3 -m venv`  
- **两套安装**：CPU 版 / CUDA 版 PyTorch（二选一）

---

## 和第 11 课的关系

| | 第 11 课（云端） | 第 12 课（本地） |
|--|------------------|------------------|
| 权重在哪 | 厂商机房 | **`lessons/12-local-inference/models/`** |
| 你怎么调用 | `fetch` → JSON | `transformers` → `model.generate` |
| 计时看什么 | 网络 + 机房推理 | **下载到本目录** + **加载** + **本机 forward** |

---

## 用什么模型

[`sshleifer/tiny-gpt2`](https://huggingface.co/sshleifer/tiny-gpt2)：体积极小，适合教学计时。  
**不是**产品级对话模型；只用来建立「推理要花时间」的体感。

---

## 1. 安装依赖（先做一次）

在仓库根目录：

```bash
# 无 NVIDIA GPU / Mac / 只想 CPU
npm run ch12:setup:cpu

# 有 NVIDIA GPU + 驱动（CUDA 12.x 线）
npm run ch12:setup:cuda
```

脚本 [`setup.sh`](https://github.com/SyncLionPaw/bagent/blob/main/lessons/12-local-inference/setup.sh) 会：

1. 有 `uv` → `uv venv .venv`；否则 → `python3 -m venv .venv`  
2. 用 **PyTorch 官方索引** 安装对应版本：  
   - **cpu**：`https://download.pytorch.org/whl/cpu`  
   - **cuda**：`https://download.pytorch.org/whl/cu124`  
3. 再装 `transformers`  
4. 写入 `.venv-variant`（`cpu` 或 `cuda`），方便你对照日志  

也可在本课目录手动执行：`./setup.sh cpu` 或 `./setup.sh cuda`（需 `chmod +x setup.sh run.sh`）。

| 版本 | 何时选 |
|------|--------|
| **cpu** | 默认；Mac、无独显、或只想先跑通 |
| **cuda** | 机器有 NVIDIA GPU 且驱动正常；`run.py` 里 `torch.cuda.is_available()` 为真才会用 GPU |

装过 CUDA 版但检测不到 GPU 时，脚本仍会跑，只是自动落在 **cpu** 上。

---

## 2. 权重下载位置

`run.py` 启动时设置：

```text
lessons/12-local-inference/models/     ← HF_HOME
lessons/12-local-inference/models/hub/ ← 实际 hub 缓存
```

**删掉整个课就不占磁盘：**

```bash
rm -rf lessons/12-local-inference/models
rm -rf lessons/12-local-inference/.venv   # 连环境一起删
```

---

## 3. 运行

```bash
npm run ch12
```

内部调用 [`run.sh`](https://github.com/SyncLionPaw/bagent/blob/main/lessons/12-local-inference/run.sh) → `.venv/bin/python run.py`。

第一次会联网把 `tiny-gpt2` 拉到 `models/`；之后再跑主要是加载 + 推理时间。

示例输出（数字因机器而异）：

```text
权重目录: .../lessons/12-local-inference/models
设备: cpu（安装时选了 cpu）

加载 tokenizer: 0.xx s
加载模型权重:   0.xx s
推理耗时: 0.xxx s（新生成约 32 tokens）
约 xx.x tokens/s（cpu，极小模型，仅作体感）
```

---

## 代码在干什么

[`run.py`](https://github.com/SyncLionPaw/bagent/blob/main/lessons/12-local-inference/run.py)：

1. 把缓存指到本课 `models/`  
2. `from_pretrained(..., cache_dir=...)` 加载 tokenizer / 模型  
3. `.to(device)` 后 `generate`（`device` 由 CUDA 是否可用决定）  
4. 分别计时「加载」与「推理」，打印粗略 tokens/s  

`do_sample=False`：贪心解码，方便重复对比耗时。

---

## 该怎么读这些数字

- **加载合计**：从 `models/` 读入内存；云端 API 把这步藏在机房冷启动里。  
- **推理耗时**：一次 `generate`；token 越多越久。  
- **tokens/s**：仅作体感；真实产品会用 GPU 集群、vLLM 等把吞吐拉高很多。  

---

## 检查点

- [ ] 会用 `npm run ch12:setup:cpu` 或 `:cuda` 装好 `.venv` 吗？  
- [ ] 知道权重在 **`lessons/12-local-inference/models/`**，而不是用户主目录默认缓存吗？  
- [ ] 能区分「加载权重」和「generate」两段耗时吗？  
- [ ] 能说清与第 11 课 `chat/completions` 的分工对应吗？  

## 下一课

[第 13 课 · vLLM / SGLang 等推理框架一览](/chapters/13-inference-engines)（扩展阅读，无代码）。  
流式实践见 [第 14–16 课](/chapters/14-fastapi-stream)。

[← 第 11 课](/chapters/11-inference) · [uv](https://docs.astral.sh/uv/) · [transformers](https://huggingface.co/docs/transformers) · [tiny-gpt2](https://huggingface.co/sshleifer/tiny-gpt2)
