import { scryptSync, timingSafeEqual } from "node:crypto";
import { accounts, type Account } from "@/lib/env";

// hash format: scrypt:N:r:p:<salt b64url>:<key b64url>; made by scripts/add-account.mjs.
// Colons, not "$": Next expands $NAME inside .env files, which silently corrupted the hash.
const DUMMY = "scrypt:16384:8:1:AAAAAAAAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

function verifyHash(password: string, hash: string): boolean {
  const [alg, n, r, p, salt, key] = hash.split(":");
  if (alg !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64url");
  const got = scryptSync(password, Buffer.from(salt, "base64url"), expected.length || 32, {
    N: Number(n), r: Number(r), p: Number(p),
  });
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export type LoginResult = { ok: true; account: Account } | { ok: false; reason: "bad" | "expired" };

export function checkLogin(login: string, password: string): LoginResult {
  const account = accounts().find((a) => a.login === login);
  // Unknown logins still pay the scrypt cost, so timing does not reveal which logins exist.
  const valid = verifyHash(password, account?.hash ?? DUMMY) && !!account;
  if (!valid || !account) return { ok: false, reason: "bad" };
  if (Date.parse(account.until) < Date.now()) return { ok: false, reason: "expired" };
  return { ok: true, account };
}
