import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE, readSession } from "@/lib/auth";
import { trackView } from "@/lib/events";

// Page views per demo login, sent by the shell with sendBeacon. Only the four tab paths are counted.
export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const sent = req.headers.get("origin");
  if (sent && sent !== origin) return new NextResponse(null, { status: 403 });
  const login = await readSession((await cookies()).get(COOKIE)?.value);
  if (!login) return new NextResponse(null, { status: 401 });
  const body = await req.text();
  const path = body.length < 100 ? body : "";
  await trackView(login, path);
  return new NextResponse(null, { status: 204 });
}
