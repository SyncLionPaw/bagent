"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slashHelpText = slashHelpText;
exports.parseSlashCommand = parseSlashCommand;
const HELP_TEXT = [
    "斜杠命令（由壳处理，不进 Agent history）",
    "",
    "/models · /model      列出可用模型",
    "/model <id>           切换当前模型",
    "/balance · /bal       查询 DeepSeek 账户余额",
    "/config               查看当前配置",
    "/save [name]          手动存档 → ~/.bagent/{项目}/chats/{name}.json",
    "/load [name]          加载存档；无 name 读 sessions/current.json",
    "/saves                列出 chats/ 与 sessions/",
    "/help                 显示本帮助",
    "",
    "对话每轮结束与每 120s 自动写入 sessions/current.json",
    "终端另有 /quit 退出",
].join("\n");
function slashHelpText() {
    return HELP_TEXT;
}
function parseSlashCommand(input) {
    const text = input.trim();
    if (!text.startsWith("/")) {
        return { type: "none" };
    }
    if (text === "/help" || text === "/?") {
        return { type: "help" };
    }
    if (text === "/balance" || text === "/bal") {
        return { type: "show_balance" };
    }
    if (text === "/config") {
        return { type: "show_config" };
    }
    if (text === "/models" || text === "/model") {
        return { type: "list_models" };
    }
    if (text === "/saves" || text === "/list-saves") {
        return { type: "list_chats" };
    }
    const setMatch = text.match(/^\/model\s+(\S+)$/);
    if (setMatch) {
        return { type: "set_model", modelId: setMatch[1] };
    }
    const saveMatch = text.match(/^\/save(?:\s+(\S+))?$/);
    if (saveMatch) {
        return { type: "save_chat", name: saveMatch[1] };
    }
    const loadMatch = text.match(/^\/load(?:\s+(\S+))?$/);
    if (loadMatch) {
        return { type: "load_chat", name: loadMatch[1] };
    }
    return { type: "none" };
}
//# sourceMappingURL=slash.js.map