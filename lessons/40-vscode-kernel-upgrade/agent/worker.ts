import { createInterface } from "node:readline";
import { AgentLoop } from "./loop";
import type { ToolCall } from "./messages";

type WorkerRequest =
  | { op: "chat"; message: string }
  | { op: "approve"; allow: boolean }
  | { op: "shutdown" };

function emit(event: unknown) {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

if (!process.env.DEEPSEEK_API_KEY) {
  console.error("缺少 DEEPSEEK_API_KEY（插件应从 ~/.bagent/deepseek-api-key 注入）");
  process.exit(1);
}

const agent = new AgentLoop();
let busy = false;
let approvalResolve: ((allow: boolean) => void) | null = null;

async function approve(_call: ToolCall): Promise<boolean> {
  return new Promise((resolve) => {
    approvalResolve = resolve;
  });
}

const rl = createInterface({ input: process.stdin });

rl.on("line", async (line) => {
  let req: WorkerRequest;
  try {
    req = JSON.parse(line) as WorkerRequest;
  } catch {
    return;
  }

  if (req.op === "shutdown") {
    rl.close();
    process.exit(0);
  }

  if (req.op === "approve") {
    approvalResolve?.(req.allow);
    approvalResolve = null;
    return;
  }

  if (req.op !== "chat" || !req.message.trim()) return;
  if (busy) {
    emit({ type: "TurnEnd", text: "错误: 上一轮尚未结束" });
    return;
  }

  busy = true;
  try {
    for await (const event of agent.turn(req.message.trim(), approve)) {
      emit(event);
    }
  } catch (err) {
    emit({
      type: "TurnEnd",
      text: `错误: ${err instanceof Error ? err.message : String(err)}`,
    });
  } finally {
    busy = false;
    approvalResolve = null;
  }
});
