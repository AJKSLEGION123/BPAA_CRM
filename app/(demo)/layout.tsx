import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Shell } from "@/components/Shell";
import { COOKIE, readSession } from "@/lib/auth";
import { showcaseId } from "@/lib/demo/selectors";

// proxy.ts already turns away visitors without a session; this is the second lock on every page.
export default async function DemoLayout({ children }: { children: ReactNode }) {
  const login = await readSession((await cookies()).get(COOKIE)?.value);
  if (!login) redirect("/login");
  return (
    <Shell login={login} showcaseId={showcaseId()}>
      {children}
    </Shell>
  );
}
