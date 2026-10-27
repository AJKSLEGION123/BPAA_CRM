import { NextResponse, after } from "next/server";
import { checkLogin, isAdmin } from "@/lib/accounts";
import { COOKIE, createSession } from "@/lib/auth";
import { addFailure, clientInfo, failures, logLogin, notify } from "@/lib/events";

// Failed attempts are counted per client in Redis, so the limit holds across function instances.
// The in-memory map is the fallback when the store is unavailable.
const WINDOW_MS = 15 * 60_000;
const MAX_FAILS = 8;
const MIN_MS = 800; // every answer takes at least this long, success or not
const localFails = new Map<string, { n: number; since: number }>();

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

  const info = clientInfo(req);
  const stored = await failures(info.ipHash);
  const local = localFails.get(info.ipHash);
  const localCount = local && started - local.since < WINDOW_MS ? local.n : 0;
  if ((stored ?? localCount) >= MAX_FAILS) {
    await settle(started);
    return NextResponse.redirect(new URL("/login?e=wait", origin), 303);
  }

  const form = await req.formData();
  const login = String(form.get("user") ?? "").trim().slice(0, 64);
  const pass = String(form.get("pass") ?? "").slice(0, 128);
  const next = safeNext(form.get("next"), origin);

  const result = await checkLogin(login, pass);
  if (!result.ok) {
    if (result.reason === "bad") {
      if (stored === null) localFails.set(info.ipHash, { n: localCount + 1, since: localCount ? local!.since : started });
      else await addFailure(info.ipHash);
    }
    // Only record attempts for logins that exist, so the log never collects guessed names or typos of passwords.
    if (result.reason === "expired") after(() => logLogin({ ts: started, login, ok: false, reason: "expired", country: info.country, device: info.device }));
    await settle(started);
    const back = new URL("/login", origin);
    back.searchParams.set("e", result.reason);
    if (next !== "/") back.searchParams.set("next", next);
    return NextResponse.redirect(back, 303);
  }

  localFails.delete(info.ipHash);
  const token = await createSession(result.account.login, result.account.until);
  after(async () => {
    await logLogin({ ts: started, login: result.account.login, ok: true, country: info.country, device: info.device });
    if (!isAdmin(result.account.login)) {
      const note = result.account.note ? ` (${result.account.note})` : "";
      await notify(`Демо BPAA: вошёл ${result.account.login}${note}, ${info.device}${info.country ? `, ${info.country}` : ""}`);
    }
  });
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
