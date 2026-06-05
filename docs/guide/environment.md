# 环境准备

课程主线 **Node.js**；**第 12、14 课**用 Python（transformers / FastAPI）。

| 项目 | 要求 |
|------|------|
| Node.js | **20+**（内置 `fetch`） |
| npm | `npm install` 装文档站依赖 |
| 第 1 课 | 有效的 `DEEPSEEK_API_KEY` |
| 第 9 课 | `TAVILY_API_KEY`（[Tavily](https://docs.tavily.com/welcome) 注册） |
| 第 12 课 | Python **3.10+**；推荐 [uv](https://docs.astral.sh/uv/)；`npm run ch12:setup:cpu` 或 `ch12:setup:cuda` |
| 第 14 课 | Python **3.10+**（假数据 SSE，无需 API Key）；`npm run ch14:setup`，双终端 `ch14:server` / `ch14` |

```bash
npm install
export DEEPSEEK_API_KEY="sk-..."
export TAVILY_API_KEY="tvly-..."   # 第 9 课
npm run ch01
npm run ch02
npm run ch03
npm run ch04
npm run ch05
npm run ch05-shy
npm run ch06
npm run ch07
npm run ch08
npm run ch09
npm run ch10     # 第 10 课：浏览器 http://localhost:3100
npm run ch11     # 第 11 课：打印响应各字段说明
npm run ch12:setup:cpu   # 第 12 课：先装依赖（无 GPU 用这个）
npm run ch12:setup:cuda  # 第 12 课：NVIDIA GPU 用这个
npm run ch12             # 第 12 课：推理计时（权重在课内 models/）
npm run ch14:setup && npm run ch14:server   # 第 14 课假数据 SSE（终端 1，无需 Key）
npm run ch14                                # 第 14 课（终端 2）
npm run ch15:hand && npm run ch15:parser    # 第 15 课：解析对照（需 ch14:server）
npm run ch18                                # 第 18 课：浏览器流式（内联解析）
npm run ch19                                # 第 19 课：浏览器流式（consumeSSE）
npm run ch20                                # 第 20 课：Node 真 API 流式
# 第 22 课起：第三阶段（连载中）
npm run dev    # 文档 http://localhost:5173/bagent/
```

[第 1 课 →](../chapters/01-deepseek)
