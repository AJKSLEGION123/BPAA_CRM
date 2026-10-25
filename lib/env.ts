// Server-side configuration. Fail closed: a missing or short secret, or no accounts, means the demo is shut.

export type Account = { login: string; hash: string; until: string };

export function demoEnabled(): boolean {
  return process.env.DEMO_ENABLED !== "false";
}

export function secret(): string | null {
  const s = process.env.DEMO_SECRET ?? "";
  return s.length >= 32 ? s : null;
}

export function accounts(): Account[] {
  try {
    const list = JSON.parse(process.env.DEMO_ACCOUNTS ?? "[]");
    if (!Array.isArray(list)) return [];
    return list.filter(
      (a): a is Account =>
        a && typeof a.login === "string" && typeof a.hash === "string" && typeof a.until === "string",
    );
  } catch {
    return [];
  }
}

export function configured(): boolean {
  return demoEnabled() && secret() !== null && accounts().length > 0;
}
