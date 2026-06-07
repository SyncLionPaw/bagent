export type SlashAction =
  | { type: "none" }
  | { type: "list_models" }
  | { type: "set_model"; modelId: string }
  | { type: "show_balance" }
  | { type: "show_config" }
  | { type: "help" };

const HELP_TEXT = [
  "斜杠命令（由壳处理，不进 Agent history）",
  "",
  "/models · /model      列出可用模型",
  "/model <id>           切换当前模型",
  "/balance · /bal       查询 DeepSeek 账户余额",
  "/config               查看当前配置（模型、cwd、Key 来源）",
  "/help                 显示本帮助",
  "",
  "终端另有 /quit 退出",
].join("\n");

export function slashHelpText(): string {
  return HELP_TEXT;
}

export function parseSlashCommand(input: string): SlashAction {
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

  const setMatch = text.match(/^\/model\s+(\S+)$/);
  if (setMatch) {
    return { type: "set_model", modelId: setMatch[1] };
  }

  return { type: "none" };
}
