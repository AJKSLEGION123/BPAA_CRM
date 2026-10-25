import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE, readSession } from "@/lib/auth";
import { configured } from "@/lib/env";

const OPEN = ["/login", "/api/login", "/api/logout"];

function csp(nonce: string): string {
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function closed(): NextResponse {
  return new NextResponse("Демо закрыто. Напишите Павлу.", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function proxy(request: NextRequest) {
  // Fail closed: kill switch off, short secret or no accounts — nothing is served.
  if (!configured()) return closed();

  const path = request.nextUrl.pathname;
  const open = OPEN.includes(path);
  if (!open && !(await readSession(request.cookies.get(COOKIE)?.value))) {
    if (path.startsWith("/api/")) return new NextResponse(null, { status: 401 });
    const url = new URL("/login", request.url);
    if (path !== "/") url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url, 307);
  }

  const nonce = btoa(crypto.randomUUID());
  const policy = csp(nonce);
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", policy);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|icon.svg).*)"],
};
