// Who opened the demo and what they looked at. No IPs and no user agents are stored:
// only the country Vercel reports, the device class and the page path.
import "server-only";
import { createHash } from "node:crypto";
import { KEY, safe } from "@/lib/redis";

export type LoginEvent = { ts: number; login: string; ok: boolean; reason?: string; country?: string; device?: string };

export const TRACKED = ["/", "/zayavki", "/sdelki", "/razbor"] as const;
const LOG_SIZE = 500;
const FAIL_WINDOW_S = 15 * 60;

export function clientInfo(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const ua = req.headers.get("user-agent") ?? "";
  return {
    // Salted hash: enough to count failures per client, useless for identifying anyone.
    ipHash: createHash("sha256").update(`${process.env.DEMO_SECRET ?? ""}:${ip}`).digest("hex").slice(0, 32),
    country: req.headers.get("x-vercel-ip-country") ?? undefined,
    device: /Mobi|Android|iPhone/i.test(ua) ? "телефон" : "компьютер",
  };
}

export async function logLogin(e: LoginEvent): Promise<void> {
  await safe(async (r) => {
    await r.lpush(KEY.log, JSON.stringify(e));
    await r.ltrim(KEY.log, 0, LOG_SIZE - 1);
    return true;
  }, false);
}

export async function recentLogins(n = 60): Promise<LoginEvent[]> {
  const raw = await safe((r) => r.lrange<unknown>(KEY.log, 0, n - 1), [] as unknown[]);
  return raw.map((x) => (typeof x === "string" ? JSON.parse(x) : x) as LoginEvent);
}

/** Failed logins per client in the last 15 minutes; null when the store is unavailable. */
export async function failures(ipHash: string): Promise<number | null> {
  return safe(async (r) => Number((await r.get<number>(KEY.fails(ipHash))) ?? 0), null);
}

export async function addFailure(ipHash: string): Promise<void> {
  await safe(async (r) => {
    const n = await r.incr(KEY.fails(ipHash));
    if (n === 1) await r.expire(KEY.fails(ipHash), FAIL_WINDOW_S);
    return true;
  }, false);
}

export async function trackView(login: string, path: string): Promise<void> {
  if (!(TRACKED as readonly string[]).includes(path)) return;
  await safe(async (r) => {
    await r.hincrby(KEY.views(login), path, 1);
    await r.hset(KEY.views(login), { _last: Date.now() });
    return true;
  }, false);
}

export type Views = { last?: number; byPath: Record<string, number> };

export async function viewsOf(login: string): Promise<Views> {
  const h = await safe((r) => r.hgetall<Record<string, unknown>>(KEY.views(login)), null);
  const byPath: Record<string, number> = {};
  for (const p of TRACKED) if (h?.[p]) byPath[p] = Number(h[p]);
  return { last: h?._last ? Number(h._last) : undefined, byPath };
}

/** Telegram message to Pavel. Off unless DEMO_NOTIFY_TG_TOKEN and DEMO_NOTIFY_CHAT_ID are set. */
export async function notify(text: string): Promise<void> {
  const token = process.env.DEMO_NOTIFY_TG_TOKEN;
  const chat = process.env.DEMO_NOTIFY_CHAT_ID;
  if (!token || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(3000),
    });
  } catch (e) {
    console.error("notify:", e instanceof Error ? e.message : e);
  }
}

export const notifyEnabled = () => !!(process.env.DEMO_NOTIFY_TG_TOKEN && process.env.DEMO_NOTIFY_CHAT_ID);
