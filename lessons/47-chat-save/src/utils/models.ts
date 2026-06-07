export const DEFAULT_MODEL = "deepseek-v4-flash";

export type ModelInfo = {
  id: string;
  owned_by?: string;
};

type ModelsResponse = {
  data?: ModelInfo[];
};

const MODELS_URL = "https://api.deepseek.com/models";
const TIMEOUT_MS = 15_000;

export async function listModels(apiKey: string): Promise<ModelInfo[]> {
  let res: Response;
  try {
    res = await fetch(MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`无法连接 DeepSeek API：${detail}`);
  }

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const json = (await res.json()) as ModelsResponse;
  return json.data ?? [];
}

export function formatModelList(
  models: ModelInfo[],
  currentModel: string,
): string {
  if (models.length === 0) {
    return "（API 未返回模型列表）";
  }

  const lines = models.map((m) => {
    const mark = m.id === currentModel ? " ← 当前" : "";
    const owner = m.owned_by ? ` (${m.owned_by})` : "";
    return `· ${m.id}${owner}${mark}`;
  });

  return [
    `可用模型（当前：${currentModel}）`,
    "",
    ...lines,
    "",
    "切换：/model <模型 id>",
  ].join("\n");
}
