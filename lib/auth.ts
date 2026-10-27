// Session cookie "<payload>.<hmac>": payload is base64url({u, exp, v}), HMAC-SHA256 with DEMO_SECRET.
// Web Crypto only, so the same code runs in proxy.ts and in server components.
import { findAccount } from "@/lib/accounts";
import { secret } from "@/lib/env";

export const COOKIE = "bpaa_demo";
export const SESSION_DAYS = 7;

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): string {
  return atob(s.replace(/-/g, "+").replace(/_/g, "/"));
}

async function hmac(data: string): Promise<string | null> {
  const key = secret();
  if (!key) return null;
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data))));
}

// Constant-time comparison of two strings of possibly different length.
export function safeEqual(a: string, b: string): boolean {
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export async function createSession(login: string, until: string): Promise<string | null> {
  const exp = Math.min(Date.now() + SESSION_DAYS * 86_400_000, Date.parse(until));
  const payload = b64url(enc.encode(JSON.stringify({ u: login, exp, v: 1 })));
  const sig = await hmac(payload);
  return sig ? `${payload}.${sig}` : null;
}

/** Returns the login of a valid session, or null. Checks signature, expiry and that the login still exists. */
export async function readSession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  try {
    const expected = await hmac(payload);
    if (!expected || !safeEqual(sig, expected)) return null;
    const { u, exp, v } = JSON.parse(fromB64url(payload));
    if (v !== 1 || typeof u !== "string" || !(Number(exp) > Date.now())) return null;
    const account = await findAccount(u);
    if (!account || account.disabled || Date.parse(account.until) < Date.now()) return null;
    return u;
  } catch {
    return null;
  }
}
