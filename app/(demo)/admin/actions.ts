"use server";
// Admin actions. Every one re-checks the session and the admin list: server actions are public endpoints.
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createAccount, deleteAccount, extendAccount, isAdmin, setDisabled } from "@/lib/accounts";
import { COOKIE, readSession } from "@/lib/auth";

async function requireAdmin(): Promise<string> {
  const login = await readSession((await cookies()).get(COOKIE)?.value);
  if (!login || !isAdmin(login)) throw new Error("forbidden");
  return login;
}

export type CreateState = { ok: true; login: string; password: string; until: string } | { ok: false; error: string } | null;

export async function createAction(_: CreateState, form: FormData): Promise<CreateState> {
  await requireAdmin();
  const login = String(form.get("login") ?? "").trim().toLowerCase();
  const days = Number(form.get("days") ?? 30);
  const note = String(form.get("note") ?? "").trim();
  const r = await createAccount(login, days, note);
  revalidatePath("/admin");
  return r.ok ? { ok: true, login, password: r.password, until: r.until } : r;
}

export async function extendAction(login: string): Promise<void> {
  await requireAdmin();
  await extendAccount(login, 14);
  revalidatePath("/admin");
}

export async function toggleAction(login: string, disabled: boolean): Promise<void> {
  await requireAdmin();
  await setDisabled(login, disabled);
  revalidatePath("/admin");
}

export async function deleteAction(login: string): Promise<void> {
  await requireAdmin();
  await deleteAccount(login);
  revalidatePath("/admin");
}
