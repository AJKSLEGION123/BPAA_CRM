import { NextResponse } from "next/server";
import { checkLogin } from "@/lib/accounts";
import { COOKIE, createSession } from "@/lib/auth";

// Backup brake only; the real limit is a Vercel WAF rate-limit rule on POST /api/login (10/min per IP).
const WINDOW_MS = 15 * 60_000;
const MAX_FAILS = 8;
const MIN_MS = 800; // every answer takes at least this long, success or not
const fails = new Map<string, { n: number; since: number }>();

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Same-origin relative target only; anything else falls back to "/". */
function safeNext(raw: FormDataEntryValue | null, origin: string): string {
  const s = typeof raw === "string" ? raw : "";
  if (!s.startsWith("/") || s.startsWith("//") || s.startsWith("/\\")) return "/";
  try {
    const url = new URL(s, origin);
    return url.origin === origin ? url.pathname + url.search : "/";
  } catch {
    return "/";
  }
}

async function settle(started: number): Promise<void> {
  const left = MIN_MS - (Date.now() - started);
  if (left > 0) await new Promise((r) => setTimeout(r, left));
}

export async function POST(req: Request) {
  const started = Date.now();
  const origin = new URL(req.url).origin;
  const sentOrigin = req.headers.get("origin");
  if (sentOrigin && sentOrigin !== origin) return new NextResponse(null, { status: 403 });

  const ip = clientIp(req);
  const rec = fails.get(ip);
  if (rec && started - rec.since < WINDOW_MS && rec.n >= MAX_FAILS) {
    await settle(started);
    return NextResponse.redirect(new URL("/login?e=wait", origin), 303);
  }

  const form = await req.formData();
  const login = String(form.get("user") ?? "").trim().slice(0, 64);
  const pass = String(form.get("pass") ?? "").slice(0, 128);
  const next = safeNext(form.get("next"), origin);

  const result = checkLogin(login, pass);
  if (!result.ok) {
    if (result.reason === "bad") {
      const cur = rec && started - rec.since < WINDOW_MS ? rec : { n: 0, since: started };
      fails.set(ip, { n: cur.n + 1, since: cur.since });
    }
    await settle(started);
    const back = new URL("/login", origin);
    back.searchParams.set("e", result.reason);
    if (next !== "/") back.searchParams.set("next", next);
    return NextResponse.redirect(back, 303);
  }

  fails.delete(ip);
  const token = await createSession(result.account.login, result.account.until);
  await settle(started);
  if (!token) return new NextResponse("Демо закрыто", { status: 503 });
  const res = NextResponse.redirect(new URL(next, origin), 303);
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86_400,
  });
  return res;
}
