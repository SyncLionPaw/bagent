<p align="center">
  <img src="docs/public/logo.png" alt="bagent" width="320" />
</p>

# bagent

**用 JavaScript 循序渐进学会大模型 Agent** — 中文课程（非生产 SDK）。

**https://synclionpaw.github.io/bagent/**

```bash
npm install
npm run dev      # 文档站
npm run ch01     # 第 1 课
npm run ch02     # 第 2 课
npm run ch03     # 第 3 课：循环（无历史）
npm run ch04     # 第 4 课：多轮对话（带历史）
npm run ch05     # 第 5 课：系统提示词（老船长）
npm run ch05-shy # 第 5 课：害羞小男孩小慢
npm run ch06     # 第 6 课：封装函数
npm run ch07     # 第 7 课：Tool Calls
npm run ch08     # 第 8 课：第一个 Agent（只需 DEEPSEEK_API_KEY）
npm run ch09     # 第 9 课：Tavily 联网搜索
npm run ch10     # 第 10 课：网页 Agent（浏览器打开 localhost:3100）
npm run ch11     # 第 11 课：chat/completions 响应字段说明
npm run ch12:setup:cpu   # 第 12 课：安装依赖（CPU，优先 uv）
npm run ch12:setup:cuda  # 第 12 课：安装依赖（CUDA）
npm run ch12             # 第 12 课：本地推理（权重在 lessons/12-local-inference/models/）
npm run ch14:setup   # 第 14 课：FastAPI 依赖（假数据流，无需 Key）
npm run ch14:server  # 第 14 课：起服务（另开终端）
npm run ch14         # 第 14 课：Node 消费 SSE 打字机
npm run ch15:hand    # 第 15 课：手写 SSE 解析（需 ch14:server）
npm run ch15:parser  # 第 15 课：eventsource-parser 解析
npm run ch18         # 第 18 课：浏览器 SSE（内联解析）
npm run ch19         # 第 19 课：浏览器 SSE（consumeSSE）
npm run ch20         # 第 20 课：Node 藏 Key → localhost:3020
npm run ch22
npm run ch22:types
npm run ch23
npm run ch24
npm run ch25
npm run ch26
npm run ch28:server
npm run ch28:client
npm run ch30:compile   # 第 30 课 VS Code 插件，见 lessons/30-vscode-extension/doc.md
```

课文源文件：`lessons/` · 构建后站点：`docs/`
