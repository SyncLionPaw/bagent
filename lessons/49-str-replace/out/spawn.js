"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentProcess = void 0;
const node_child_process_1 = require("node:child_process");
const node_readline_1 = require("node:readline");
const path = __importStar(require("node:path"));
class AgentProcess {
    proc = null;
    rl = null;
    turnWait = null;
    opWait = null;
    sessionReadyResolve = null;
    sessionReady;
    constructor() {
        this.sessionReady = new Promise((resolve) => {
            this.sessionReadyResolve = resolve;
        });
    }
    start(extensionPath, cwd, agentEnv) {
        const workerPath = path.join(extensionPath, "out", "agent", "worker.js");
        this.proc = (0, node_child_process_1.spawn)(process.execPath, [workerPath], {
            cwd,
            env: { ...process.env, ...agentEnv },
            stdio: ["pipe", "pipe", "pipe"],
        });
        this.rl = (0, node_readline_1.createInterface)({ input: this.proc.stdout });
        this.rl.on("line", (line) => {
            let parsed;
            try {
                parsed = JSON.parse(line);
            }
            catch {
                return;
            }
            if (parsed.type === "SessionReady") {
                const { sessionId, restored, messages, path: filePath } = parsed;
                this.sessionReadyResolve?.({ sessionId, restored, messages, path: filePath });
                this.sessionReadyResolve = null;
                return;
            }
            if (parsed.type === "WorkerResult") {
                const { resolve } = this.opWait ?? {};
                this.opWait = null;
                resolve?.(parsed);
                return;
            }
            if (!this.turnWait)
                return;
            const event = parsed;
            this.turnWait.onEvent(event);
            if (event.type === "TurnEnd") {
                const { resolve } = this.turnWait;
                this.turnWait = null;
                resolve();
            }
        });
        this.proc.stderr.on("data", (buf) => {
            console.error("[bagent agent]", buf.toString().trimEnd());
        });
        this.proc.on("exit", (code) => {
            if (this.turnWait) {
                this.turnWait.reject(new Error(`Agent 子进程退出 code=${code ?? "?"}`));
                this.turnWait = null;
            }
            if (this.opWait) {
                this.opWait.reject(new Error(`Agent 子进程退出 code=${code ?? "?"}`));
                this.opWait = null;
            }
            this.proc = null;
        });
    }
    sendOp(req) {
        if (!this.proc?.stdin) {
            throw new Error("Agent 子进程未启动（检查 API Key 与 ch49:compile）");
        }
        if (this.turnWait) {
            throw new Error("上一轮尚未结束，请稍后再试");
        }
        if (this.opWait) {
            throw new Error("另有操作进行中");
        }
        return new Promise((resolve, reject) => {
            this.opWait = {
                resolve: (r) => resolve(r),
                reject,
            };
            this.proc.stdin.write(`${JSON.stringify(req)}\n`);
        });
    }
    async chat(message, onEvent) {
        if (!this.proc?.stdin) {
            throw new Error("Agent 子进程未启动（检查 API Key 与 ch49:compile）");
        }
        if (this.turnWait) {
            throw new Error("上一轮尚未结束");
        }
        if (this.opWait) {
            throw new Error("另有操作进行中");
        }
        await new Promise((resolve, reject) => {
            this.turnWait = { onEvent, resolve, reject };
            const req = { op: "chat", message };
            this.proc.stdin.write(`${JSON.stringify(req)}\n`);
        });
    }
    async saveChat(name) {
        const res = await this.sendOp({
            op: "save_chat",
            name,
        });
        if (res.ok) {
            return { ok: true, name: res.name, path: res.path, messages: res.messages };
        }
        return { ok: false, error: res.error };
    }
    async loadChat(name) {
        const res = await this.sendOp({
            op: "load_chat",
            name,
        });
        if (res.ok) {
            return { ok: true, name: res.name, path: res.path, messages: res.messages };
        }
        return { ok: false, error: res.error };
    }
    async listChats() {
        const res = await this.sendOp({
            op: "list_chats",
        });
        return res.text;
    }
    approve(allow) {
        if (!this.proc?.stdin) {
            throw new Error("Agent 子进程未启动");
        }
        const req = { op: "approve", allow };
        this.proc.stdin.write(`${JSON.stringify(req)}\n`);
    }
    answerAskUser(answer) {
        if (!this.proc?.stdin) {
            throw new Error("Agent 子进程未启动");
        }
        const req = { op: "ask_user_answer", answer };
        this.proc.stdin.write(`${JSON.stringify(req)}\n`);
    }
    skipAskUser() {
        if (!this.proc?.stdin) {
            throw new Error("Agent 子进程未启动");
        }
        const req = { op: "ask_user_skip" };
        this.proc.stdin.write(`${JSON.stringify(req)}\n`);
    }
    setModel(model) {
        if (!this.proc?.stdin) {
            throw new Error("Agent 子进程未启动");
        }
        const req = { op: "set_model", model };
        this.proc.stdin.write(`${JSON.stringify(req)}\n`);
    }
    shutdown() {
        if (this.proc?.stdin) {
            this.proc.stdin.write(`${JSON.stringify({ op: "shutdown" })}\n`);
        }
        this.proc?.kill();
        this.rl?.close();
        this.proc = null;
        this.turnWait = null;
        this.opWait = null;
    }
}
exports.AgentProcess = AgentProcess;
//# sourceMappingURL=spawn.js.map