# 第 13 课 · 推理服务框架一览（扩展阅读）

**约 15 分钟** · 纯阅读，**无代码** · 第 12 课之后

## 你为什么需要知道这些

| 阶段 | 你在做什么 |
|------|------------|
| 第 11 课 | 调云端 **`/chat/completions`**，收 JSON |
| 第 12 课 | 用 **`transformers`** 在本机 `generate`，一次一个请求、自己计时 |
| 线上产品 | 同一套权重，但要 **高吞吐、低延迟、连续批处理、OpenAI 兼容 API** |

第 12 课的 `model.generate` 适合**学习和体感**；  
真要对外提供「像 DeepSeek 那样的推理服务」，通常不会在业务进程里直接挂一个 Hugging Face `pipeline`，而是把权重交给 **推理引擎 / 推理服务框架**，前面再挂 API 网关（第 11 课那张图里的中间层）。

本课只做**地图**：名字、解决什么问题、官方文档链接。想深入时按链接自己读，不必在本仓库写代码。

---

## 一张对照表（先建立印象）

| 项目 | 大致定位 | 和本课路线的关系 |
|------|----------|------------------|
| **[vLLM](https://docs.vllm.ai/)** | 开源 GPU 推理与服务，PagedAttention、continuous batching，常提供 OpenAI 兼容 HTTP | 自建推理服务时最常见选项之一 |
| **[SGLang](https://docs.sglang.ai/)** | 高性能推理 + 结构化生成 / 前端语言，强调吞吐与灵活控制流 | 与 vLLM 同属「专业推理栈」，选型时可对比阅读 |
| **[llama.cpp](https://github.com/ggml-org/llama.cpp)** | C/C++，CPU/Apple Silicon/部分 GPU，量化友好，偏本地与边缘 | 本机轻量跑模型、少依赖 Python 时 |
| **[TensorRT-LLM](https://nvidia.github.io/TensorRT-LLM/)** | NVIDIA 栈上的优化推理与部署 | 深度用 NVIDIA GPU 做生产部署时 |
| **[Text Generation Inference (TGI)](https://huggingface.co/docs/text-generation-inference)** | Hugging Face 推出的推理服务容器 | HF 生态、K8s 部署 |
| **[Ollama](https://github.com/ollama/ollama)** | 本地一键拉模型 + 聊天 API，易用 | 快速体验本地模型，不是最大吞吐方案 |

它们都在做一件事：**把 checkpoint 变成可持续对外服务的推理能力**——只是优化方向（吞吐 / 延迟 / 易用 / 硬件）不同。

---

## vLLM

**解决什么**：同一张 GPU 上同时服务很多请求，提高 **tokens/s**，降低排队；用 **PagedAttention** 等方式更省显存。

**你会在什么场景听到它**：自建 API 替代直接调云端、K8s 里起 `vllm serve`、与 LangChain / 自研 Agent 网关对接。

**建议阅读（官方）**：

- 文档首页：[https://docs.vllm.ai/](https://docs.vllm.ai/)
- 快速开始：[Getting Started](https://docs.vllm.ai/en/latest/getting_started/quickstart.html)
- OpenAI 兼容服务：[OpenAI Compatible Server](https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html)
- 设计背景 PagedAttention 论文（可选）：[Efficient Memory Management for LLM Serving (PagedAttention)](https://arxiv.org/abs/2309.06180)

读完后应能回答：**它和第 12 课脚本比，多出来的主要是批处理与显存管理，而不是「另一种模型」**。

---

## SGLang

**解决什么**：高性能 **LLM 推理运行时**，同时提供 **SGL 前端语言**，方便写带分支、并行、工具流的生成程序（和纯字符串 prompt 略有不同）。

**你会在什么场景听到它**：与 vLLM 并列讨论选型；需要复杂控制流或极致吞吐时的方案之一。

**建议阅读（官方）**：

- 文档首页：[https://docs.sglang.ai/](https://docs.sglang.ai/)
- 安装与本地跑起来：[Install & Local Run](https://docs.sglang.ai/start/install.html)
- 后端与 OpenAI 兼容：[Backend & API](https://docs.sglang.ai/backend/openai_api_completions.html)（以文档站当前目录为准）

和 vLLM 不必二选一才能学完本课程——**知道「还有这一条技术线」即可**；真要部署时再按团队硬件与 API 需求选型。

---

## 其它常见名字（按需点开）

### llama.cpp

- 仓库：[https://github.com/ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp)
- 特点：量化模型（GGUF）、CPU/Metal 友好，适合「笔记本上先跑起来」。
- 文档/wiki：见仓库 **Documentation** 与 [wiki](https://github.com/ggml-org/llama.cpp/wiki)。

### TensorRT-LLM（NVIDIA）

- 文档：[https://nvidia.github.io/TensorRT-LLM/](https://nvidia.github.io/TensorRT-LLM/)
- 特点：在 NVIDIA GPU 上做图优化与内核融合，偏**生产部署与性能极限**。

### Hugging Face TGI

- 文档：[Text Generation Inference](https://huggingface.co/docs/text-generation-inference)
- 特点：容器化推理服务，和 HF Hub 模型配合紧。

### Ollama

- 官网 / 仓库：[https://ollama.com](https://ollama.com) · [GitHub](https://github.com/ollama/ollama)
- 特点：**易用**优先；本地 `ollama run` + HTTP API，适合开发机体验，底层可能组合多种运行时。

---

## 和 DeepSeek / 第 11 课 API 怎么接上

很多推理框架会提供 **OpenAI 兼容** 的 `POST /v1/chat/completions`（路径因部署略异）。  
你在第 1–10 课写的 `fetch` + `messages` **往往只需改 `baseURL` 和 `model`**，Harness 逻辑可以不变——这也是课程坚持教兼容 API 的原因。

```text
你的 Agent (JS)  →  fetch  →  vLLM / SGLang / Ollama 提供的 HTTP
                              →  框架内部：加载权重、批处理、KV Cache
                              →  返回 choices / usage（形态接近第 11 课）
```

云端 DeepSeek 则是厂商帮你运维了右侧整栈；本课列的项目是**你自己运维**时的常见选型。

---

## 本课建议怎么学

1. 先扫上文对照表，记住 **vLLM / SGLang** 两个名字。  
2. 各打开一篇 **Quickstart**，看启动命令与监听端口，不必跟装。  
3. 看一页 **OpenAI compatible API**，对照第 11 课响应字段。  
4. 有 Mac 且只想本地玩：可浏览 **Ollama** 或 **llama.cpp** 文档目录，和第 12 课对比「易用 vs 教学脚本」。  

**检查点（自测）**：

- [ ] 能说出 vLLM / SGLang 主要优化的是 **Serving**，不是训练吗？  
- [ ] 能说出它们与第 12 课 `transformers` 脚本的分工差异吗？  
- [ ] 知道 Agent 代码换 `baseURL` 可能就能对接自建推理服务吗？  

---

## 下一课

第二部分连载继续（token、上下文、RAG 等可按目录更新）。  
[第 14 课](/chapters/14-fastapi-stream) → [第 15 课 解析](/chapters/15-sse-parse) → [第 16 课 真流式](/chapters/16-streaming)。

[← 第 12 课](/chapters/12-local-inference)
