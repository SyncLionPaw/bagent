# 第 9 课 · Tavily 联网搜索

**约 30 分钟** · 第 8 课之后：给 Agent 接上**真实的网页搜索**

## 为什么要联网搜索

大模型的「知识」主要来自**训练语料**，有一个大致的**截止日期**（knowledge cutoff）。  
它很会推理、很会写字，但**不会自动知道今天网页上发生了什么**。

不联网时，问「最新」类问题，模型往往只能根据旧记忆**猜**——听起来很像真的，其实是**幻觉**。

**例子（你可以自己试）：**

| 问法 | 不联网（第 8 课） | 联网（第 9 课 `web_search`） |
|------|-------------------|------------------------------|
| Claude 最新版本叫什么？GPT 最新版是哪个？ | 可能答成训练时的旧型号（如 Claude 3.x、GPT-4），**语气却很肯定** | 先搜再答，能对上当前发布页 / 新闻里的名称 |
| DeepSeek 最近有什么新模型？ | 容易漏掉或未发布的型号 | 摘要里能看到近期公告 |

第 8 课的 `get_time` 能告诉你**现在几点**，但代替不了**世界上最近更新了啥**。  
第 9 课做的事就是：让模型在需要时 **Tool Call → 你真去搜 → 把搜到的摘要塞回上下文 → 再总结**，知识就不再卡在训练年份里。

这也是 Cursor、ChatGPT 网页版「联网」按钮在做的事——只不过我们这节课用 **Tavily + 自己的 `runTool`** 亲手走一遍。

## 申请 API Key

1. 打开 [Tavily 文档](https://docs.tavily.com/welcome)  
2. 注册并创建 Key：[app.tavily.com](https://app.tavily.com)（Playground 可试搜）  
3. 导出环境变量：

```bash
export TAVILY_API_KEY=tvly-你的key
export DEEPSEEK_API_KEY=sk-...
```

Tavily 面向 **AI Agent** 的搜索 API，返回适合塞进上下文的摘要（见 [Search API](https://docs.tavily.com/documentation/api-reference/endpoint/search)）。本课用 Node 自带 `fetch` 调 `POST https://api.tavily.com/search`，不装 SDK。

## 和第 8 课的区别

| | 第 8 课 | 第 9 课 |
|--|--------|--------|
| 工具 | `get_time`、`calculate` | 再加 **`web_search`（Tavily）** |
| 额外 Key | 无 | **`TAVILY_API_KEY`** |
| 联网 | 无 | 真搜索 |

Harness 与 Tool Calls 循环与第 8 课相同，只多一个工具实现。

## tools.mjs：Tavily 调用

[`tools.mjs`](https://github.com/SyncLionPaw/bagent/blob/main/lessons/09-tavily/tools.mjs)

```javascript
const res = await fetch("https://api.tavily.com/search", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
  },
  body: JSON.stringify({
    query,
    search_depth: "basic",
    max_results: 5,
  }),
});

const data = await res.json();
return data.results.map((r) => `${r.title}\n${r.content}`).join("\n\n");
```

模型仍通过 `tool_calls` 触发；你在 `runTool` 里执行上述请求，把结果以 `role: tool` 写回（同第 7 课）。

## 运行

```bash
npm run ch09
```

对比玩：

1. `npm run ch08` 问：`Claude 和 GPT 现在最新的大模型版本分别是什么？`（只靠训练记忆）  
2. `npm run ch09` 问同一句（应先 `[工具] web_search` 再答）

再试：`搜一下 DeepSeek 最近发布了什么模型`。

## 若出现 `Content Exists Risk`

Tavily 已搜到结果，但 DeepSeek **第二轮**可能因内容审核拒绝生成（终端里 `error.message` 含该字样）。本课已：

- 把 tool 结果**截断**到 1200 字再发给模型  
- API 报错时**不崩溃**，会打印说明  

可换更中性的问法，或只问单一话题（如「昨天科技新闻一条」）。

## 检查点

- [ ] 是否已 `export TAVILY_API_KEY`？  
- [ ] 问搜索类问题时是否出现 `[工具] web_search`？  
- [ ] 返回内容是否像网页摘要（标题 + content）？  

## 下一课

[第 10 课 · 网页版 Agent（第一阶段完结）](/chapters/10-web-ui)

[← 第 8 课](/chapters/08-qa-agent) · [Tavily 文档](https://docs.tavily.com/welcome)
