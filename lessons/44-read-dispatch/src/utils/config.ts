export type AgentConfigInfo = {
  model: string;
  cwd: string;
  apiKeySource: string;
  apiKeyPath?: string;
  apiKeyPreview?: string;
};

export function maskApiKey(key: string): string {
  const t = key.trim();
  if (t.length <= 8) return "****";
  return `${t.slice(0, 3)}…${t.slice(-4)}`;
}

export function formatConfig(info: AgentConfigInfo): string {
  const lines = [
    "当前配置",
    "",
    `模型：${info.model}`,
    `工作目录：${info.cwd}`,
    `API Key：${info.apiKeySource}`,
  ];

  if (info.apiKeyPath) {
    lines.push(`Key 文件：${info.apiKeyPath}`);
  }
  if (info.apiKeyPreview) {
    lines.push(`Key 预览：${info.apiKeyPreview}`);
  }

  lines.push("", "修改模型：/model <id>");
  return lines.join("\n");
}
