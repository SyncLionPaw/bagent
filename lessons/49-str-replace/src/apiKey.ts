import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";

export const DEFAULT_API_KEY_PATH = "~/.bagent/deepseek-api-key";
export const DEFAULT_TAVILY_KEY_PATH = "~/.bagent/tavily-api-key";

function expandHome(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return path.join(homedir(), p.slice(2));
  return p;
}

export function resolveApiKeyPath(raw: string, workspaceRoot?: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("~")) return path.resolve(expandHome(trimmed));
  if (path.isAbsolute(trimmed)) return trimmed;
  if (workspaceRoot) return path.join(workspaceRoot, trimmed);
  return path.resolve(trimmed);
}

function readFirstKeyLine(filePath: string): string | undefined {
  if (!existsSync(filePath)) return undefined;

  const first = readFileSync(filePath, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));

  return first || undefined;
}

export function loadKey(envName: string, filePath: string): string | undefined {
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) return fromEnv;
  return readFirstKeyLine(filePath);
}

export function loadDeepSeekApiKey(filePath: string): string | undefined {
  return loadKey("DEEPSEEK_API_KEY", filePath);
}

export function loadTavilyApiKey(filePath: string): string | undefined {
  return loadKey("TAVILY_API_KEY", filePath);
}
