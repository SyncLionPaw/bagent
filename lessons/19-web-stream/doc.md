# 第 19 课 · 抽出 `consumeSSE`

**约 15 分钟** · [第 18 课](/chapters/18-streaming) 之后 · **一个 HTML 文件**

[第 18 课](/chapters/18-streaming) 把 SSE 解析循环写在 `chat()` 里。本课 **UI 相同**，把循环抽成 **`consumeSSE`**，方便复用。

---

## 打开

```bash
npm run ch19
```

页顶 API Key 与第 18 课共用 `sessionStorage`。

---

## 和第 18 课的区别

| | 第 18 课 | 第 19 课 |
|--|----------|----------|
| UI | 聊天气泡 | 相同 |
| 解析 | 内联在 `chat()` | `consumeSSE(res, onUpdate)` |

---

## 安全提示

浏览器直连仅适合本机练习；上线用 [第 20 课](/chapters/20-web-stream-server) 藏 Key。

[← 第 18 课](/chapters/18-streaming) · [第 20 课 网关 →](/chapters/20-web-stream-server)
