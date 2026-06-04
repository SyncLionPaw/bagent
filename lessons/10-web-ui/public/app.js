const log = document.getElementById("log");
const form = document.getElementById("form");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");

let messages = [];
let busy = false;

function append(el) {
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
}

function bubble(text, className) {
  const el = document.createElement("div");
  el.className = `msg ${className}`;
  el.textContent = text;
  append(el);
  return el;
}

async function chat(userText) {
  messages.push({ role: "user", content: userText });
  bubble(userText, "user");

  const pending = bubble("思考中…", "assistant pending");
  sendBtn.disabled = true;
  busy = true;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();
    pending.remove();

    if (!res.ok || data.error) {
      bubble(data.error ?? "请求失败", "error");
      messages.pop();
      return;
    }

    if (data.tools?.length) {
      const lines = data.tools.map(
        (t) => `🔧 ${t.name}(${t.arguments}) → ${t.preview}`,
      );
      bubble(lines.join("\n"), "tools");
    }

    messages = data.messages;
    bubble(data.content, "assistant");
  } catch (err) {
    pending.remove();
    bubble(String(err.message), "error");
    messages.pop();
  } finally {
    sendBtn.disabled = false;
    busy = false;
    input.focus();
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || busy) return;
  input.value = "";
  chat(text);
});


input.focus();
