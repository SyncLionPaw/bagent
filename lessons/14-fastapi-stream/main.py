# 假数据 SSE：只演示「服务端推送流」与「客户端边读边显示」，不调大模型 API
import asyncio
import json

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

DEFAULT_TEXT = (
    "这是一段假数据流式回复。"
    "用来演示 FastAPI 的 StreamingResponse 与客户端如何消费 SSE。"
    "不需要 API Key，也不需要联网调用大模型。"
)

app = FastAPI(title="bagent ch14 fake SSE")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def last_user_text(body: dict) -> str | None:
    for msg in reversed(body.get("messages") or []):
        if msg.get("role") == "user" and msg.get("content"):
            return msg["content"]
    return body.get("text")


def sse_chunk(content: str) -> str:
    payload = {
        "choices": [{"index": 0, "delta": {"content": content}, "finish_reason": None}],
    }
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


@app.get("/")
def index():
    return {
        "ok": True,
        "demo": "POST /chat/stream",
        "fake": True,
        "note": "响应为 text/event-stream；正文由服务端逐字 fake，非真实模型",
    }


@app.post("/chat/stream")
async def chat_stream(request: Request):
    body = await request.json()
    text = last_user_text(body) or DEFAULT_TEXT
    delay = float(body.get("delay", 0.06))

    async def generate():
        for char in text:
            yield sse_chunk(char)
            await asyncio.sleep(delay)
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
