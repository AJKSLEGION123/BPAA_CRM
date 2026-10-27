// Upstash Redis (Vercel Marketplace). Optional: without the KV env vars the demo runs on DEMO_ACCOUNTS alone,
// so tests, local builds and a disconnected store never break the login.
import "server-only";
import { Redis } from "@upstash/redis";

let client: Redis | null | undefined;

export function redis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

/** Runs a Redis call but never lets a store outage break the page: logs and returns the fallback. */
export async function safe<T>(fn: (r: Redis) => Promise<T>, fallback: T): Promise<T> {
  const r = redis();
  if (!r) return fallback;
  try {
    return await fn(r);
  } catch (e) {
    console.error("redis:", e instanceof Error ? e.message : e);
    return fallback;
  }
}

export const KEY = {
  account: (login: string) => `acct:${login}`,
  accounts: "accts",
  views: (login: string) => `views:${login}`,
  log: "log:logins",
  fails: (ipHash: string) => `fail:${ipHash}`,
} as const;
