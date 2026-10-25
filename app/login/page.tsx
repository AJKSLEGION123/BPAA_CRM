import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { COOKIE, readSession } from "@/lib/auth";
import { COPY } from "@/lib/copy";
import { contactChannel, contactUrl } from "@/lib/contact";

export const metadata = { title: "Вход" };

// One message for a wrong login and a wrong password, so the form does not tell which logins exist.
const ERRORS: Record<string, string> = {
  bad: "Неверный логин или пароль",
  expired: `Доступ по этому логину закончился. Напишите Павлу в ${contactChannel}.`,
  wait: "Слишком много попыток. Попробуйте через 15 минут.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  await connection();
  if (await readSession((await cookies()).get(COOKIE)?.value)) redirect("/");
  const sp = await searchParams;
  const error = typeof sp.e === "string" ? ERRORS[sp.e] : undefined;
  const next = typeof sp.next === "string" ? sp.next : "/";
  const ask = contactUrl("Здравствуйте! Хочу посмотреть демо BPAA. Пришлите, пожалуйста, логин и пароль.");

  return (
    <>
      <div className="flex h-9 items-center justify-between gap-3 bg-ink px-4 text-[13px] text-white">
        <span className="font-semibold">{COPY.strip}</span>
        <a href={ask} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#ffb27d]">{COPY.stripCta}</a>
      </div>
      <main className="grid min-h-[calc(100vh-36px)] place-items-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <div className="text-3xl font-extrabold tracking-tight">BPAA<span className="text-accent">.</span></div>
            <h1 className="mt-3 text-[24px] font-bold leading-tight">Как пакеты BPAA выглядят в работе</h1>
            <p className="mt-2 text-[16px] text-muted">{COPY.invented}</p>
          </div>
          <form method="post" action="/api/login" className="card space-y-4 p-6">
            <input type="hidden" name="next" value={next} />
            <label className="block">
              <span className="text-[15px] font-semibold">Логин</span>
              <input name="user" autoComplete="username" autoCapitalize="none" spellCheck={false} required
                className="mt-1 h-[var(--control-h)] w-full rounded-md border border-line bg-surface px-3 text-[16px]" />
            </label>
            <label className="block">
              <span className="text-[15px] font-semibold">Пароль</span>
              <input name="pass" type="password" autoComplete="current-password" required
                className="mt-1 h-[var(--control-h)] w-full rounded-md border border-line bg-surface px-3 text-[16px]" />
            </label>
            {error && <p role="alert" className="text-[15px] text-danger">{error}</p>}
            <button className="btn btn-primary w-full" type="submit">Войти</button>
          </form>
          <p className="mt-4 text-[15px]">
            Нет пароля?{" "}
            <a href={ask} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal">Напишите Павлу в {contactChannel}</a>
          </p>
        </div>
      </main>
    </>
  );
}
