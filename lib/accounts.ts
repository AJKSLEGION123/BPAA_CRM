import "server-only";
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { accounts as envAccounts, type Account } from "@/lib/env";
import { KEY, safe } from "@/lib/redis";

// Two sources of logins: DEMO_ACCOUNTS (env, needs a redeploy; Pavel's own login lives here) and Redis
// (created on /admin, no redeploy). The env wins on a name clash.
// hash format: scrypt:N:r:p:<salt b64url>:<key b64url>.
// Colons, not "$": Next expands $NAME inside .env files, which silently corrupted the hash.
const DUMMY = "scrypt:16384:8:1:AAAAAAAAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const N = 16384, R = 8, P = 1;
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no look-alikes
export const LOGIN_RE = /^[a-z0-9_-]{2,32}$/i;

export type StoredAccount = Account & { source: "env" | "store"; note?: string; created?: string; disabled?: boolean; expired?: boolean };

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 32, { N, r: R, p: P });
  return `scrypt:${N}:${R}:${P}:${salt.toString("base64url")}:${key.toString("base64url")}`;
}

export function newPassword(): string {
  return Array.from({ length: 14 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

function verifyHash(password: string, hash: string): boolean {
  const [alg, n, r, p, salt, key] = hash.split(":");
  if (alg !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64url");
  const got = scryptSync(password, Buffer.from(salt, "base64url"), expected.length || 32, {
    N: Number(n), r: Number(r), p: Number(p),
  });
  return expected.length === got.length && timingSafeEqual(expected, got);
}

function fromStore(login: string, h: Record<string, unknown> | null): StoredAccount | null {
  if (!h || typeof h.hash !== "string") return null;
  return {
    login, hash: h.hash, until: String(h.until), source: "store",
    note: h.note ? String(h.note) : undefined, created: h.created ? String(h.created) : undefined,
    disabled: String(h.disabled) === "1",
  };
}

// The proxy checks the account on every request; a short cache keeps that to one Redis read per login per 30 s.
const cache = new Map<string, { at: number; account: StoredAccount | null }>();
const forget = (login: string) => cache.delete(login);

export async function findAccount(login: string): Promise<StoredAccount | null> {
  const env = envAccounts().find((a) => a.login === login);
  if (env) return { ...env, source: "env" };
  const hit = cache.get(login);
  if (hit && Date.now() - hit.at < 30_000) return hit.account;
  const account = fromStore(login, await safe((r) => r.hgetall<Record<string, unknown>>(KEY.account(login)), null));
  cache.set(login, { at: Date.now(), account });
  return account;
}

export type LoginResult = { ok: true; account: StoredAccount } | { ok: false; reason: "bad" | "expired" };

export async function checkLogin(login: string, password: string): Promise<LoginResult> {
  const account = LOGIN_RE.test(login) ? await findAccount(login) : null;
  // Unknown logins still pay the scrypt cost, so timing does not reveal which logins exist.
  const valid = verifyHash(password, account?.hash ?? DUMMY) && !!account && !account.disabled;
  if (!valid || !account) return { ok: false, reason: "bad" };
  if (Date.parse(account.until) < Date.now()) return { ok: false, reason: "expired" };
  return { ok: true, account };
}

export async function listAccounts(): Promise<StoredAccount[]> {
  const env: StoredAccount[] = envAccounts().map((a) => ({ ...a, source: "env" }));
  const logins = await safe((r) => r.smembers(KEY.accounts), [] as string[]);
  const stored = await Promise.all(logins.map(async (l) =>
    fromStore(l, await safe((r) => r.hgetall<Record<string, unknown>>(KEY.account(l)), null))));
  const now = Date.now();
  return [...env, ...stored.filter((a): a is StoredAccount => !!a && !env.some((e) => e.login === a.login))]
    .map((a) => ({ ...a, expired: Date.parse(a.until) < now }));
}

export async function createAccount(login: string, days: number, note: string):
  Promise<{ ok: true; password: string; until: string } | { ok: false; error: string }> {
  if (!LOGIN_RE.test(login)) return { ok: false, error: "Логин: 2–32 латинские буквы, цифры, - или _" };
  if (!(days >= 1 && days <= 365)) return { ok: false, error: "Срок: от 1 до 365 дней" };
  if (await findAccount(login)) return { ok: false, error: "Такой логин уже есть" };
  const password = newPassword();
  const until = new Date(Date.now() + days * 86_400_000).toISOString();
  const saved = await safe(async (r) => {
    await r.hset(KEY.account(login), { hash: hashPassword(password), until, note: note.slice(0, 120), created: new Date().toISOString(), disabled: "0" });
    await r.sadd(KEY.accounts, login);
    return true;
  }, false);
  forget(login);
  return saved ? { ok: true, password, until } : { ok: false, error: "База недоступна, попробуйте ещё раз" };
}

export async function extendAccount(login: string, days: number): Promise<void> {
  const a = await findAccount(login);
  if (!a || a.source !== "store") return;
  const until = new Date(Math.max(Date.now(), Date.parse(a.until)) + days * 86_400_000).toISOString();
  await safe((r) => r.hset(KEY.account(login), { until }), 0);
  forget(login);
}

export async function setDisabled(login: string, disabled: boolean): Promise<void> {
  const a = await findAccount(login);
  if (!a || a.source !== "store") return;
  await safe((r) => r.hset(KEY.account(login), { disabled: disabled ? "1" : "0" }), 0);
  forget(login);
}

export async function deleteAccount(login: string): Promise<void> {
  const a = await findAccount(login);
  if (!a || a.source !== "store") return;
  await safe(async (r) => {
    await r.del(KEY.account(login), KEY.views(login));
    await r.srem(KEY.accounts, login);
    return true;
  }, false);
  forget(login);
}

export const isAdmin = (login: string) =>
  (process.env.ADMIN_LOGINS ?? "pavel").split(",").map((s) => s.trim()).filter(Boolean).includes(login);
