/** @see https://api-docs.deepseek.com/zh-cn/api/get-user-balance */

export type BalanceInfo = {
  currency: string;
  total_balance: string;
  granted_balance: string;
  topped_up_balance: string;
};

export type UserBalance = {
  is_available: boolean;
  balance_infos: BalanceInfo[];
};

const BALANCE_URL = "https://api.deepseek.com/user/balance";
const TIMEOUT_MS = 15_000;

export async function fetchBalance(apiKey: string): Promise<UserBalance> {
  let res: Response;
  try {
    res = await fetch(BALANCE_URL, {
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

  return (await res.json()) as UserBalance;
}

export function formatBalance(balance: UserBalance): string {
  const status = balance.is_available ? "可调用" : "余额不足";
  const lines = balance.balance_infos.map((b) => {
    const cur = b.currency === "CNY" ? "人民币" : b.currency === "USD" ? "美元" : b.currency;
    return [
      `· ${cur}（${b.currency}）`,
      `  总可用：${b.total_balance}`,
      `  赠金：${b.granted_balance}  充值：${b.topped_up_balance}`,
    ].join("\n");
  });

  return ["DeepSeek 账户余额", `状态：${status}`, "", ...lines].join("\n");
}
