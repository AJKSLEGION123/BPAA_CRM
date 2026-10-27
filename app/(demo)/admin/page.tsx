import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { AdminCreate } from "@/components/AdminCreate";
import { deleteAction, extendAction, toggleAction } from "./actions";
import { isAdmin, listAccounts, type StoredAccount } from "@/lib/accounts";
import { COOKIE, readSession } from "@/lib/auth";
import { fmtDateTime, fmtDayYear } from "@/lib/demo/time";
import { notifyEnabled, recentLogins, viewsOf, type Views } from "@/lib/events";
import { redis } from "@/lib/redis";

export const metadata = { title: "Админка" };

const TAB_NAMES: Record<string, string> = { "/": "Сегодня", "/zayavki": "Заявки", "/sdelki": "Сделки", "/razbor": "Разбор" };

function nextLogin(accounts: StoredAccount[]): string {
  const nums = accounts.map((a) => /^p(\d+)$/.exec(a.login)?.[1]).filter(Boolean).map(Number);
  return `p${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(2, "0")}`;
}

function viewsLine(v: Views): string {
  const parts = Object.entries(v.byPath).map(([p, n]) => `${TAB_NAMES[p]} ${n}`);
  return parts.length ? parts.join(" · ") : "ещё не открывал";
}

export default async function AdminPage() {
  const me = await readSession((await cookies()).get(COOKIE)?.value);
  if (!me || !isAdmin(me)) notFound();

  const h = await headers();
  const site = `https://${h.get("x-forwarded-host") ?? h.get("host") ?? "bpaa-demo.vercel.app"}`;
  const accounts = await listAccounts();
  const views = await Promise.all(accounts.map((a) => viewsOf(a.login)));
  const log = await recentLogins(60);
  const store = !!redis();

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Только для вас · {me}</p>
        <h1 className="mt-1 text-[28px] font-extrabold leading-tight">Доступы и входы</h1>
        <p className="mt-1 text-[16px] text-muted">
          Логин на каждого клиента, свой срок. Видно, когда клиент заходил и какие вкладки открывал.
        </p>
      </header>

      {!store && (
        <p className="rounded-[var(--radius)] bg-warn-soft p-3 text-[15px] text-warn">
          База не подключена: новые доступы не сохранятся. Работают только логины из DEMO_ACCOUNTS.
        </p>
      )}

      <section className="card space-y-3 p-4 sm:p-5">
        <h2 className="text-[20px] font-bold">Новый доступ для клиента</h2>
        <AdminCreate suggested={nextLogin(accounts)} site={site} />
      </section>

      <section className="space-y-3">
        <h2 className="text-[20px] font-bold">Доступы ({accounts.length})</h2>
        <ul className="space-y-2">
          {accounts.map((a, i) => {
            const expired = !!a.expired;
            const status = a.disabled ? "отключён" : expired ? "срок вышел" : "активен";
            const tone = a.disabled || expired ? "bg-surface-2 text-muted" : "bg-ok-soft text-ok";
            return (
              <li key={a.login} className="card flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[17px] font-bold">{a.login}</span>
                    <span className={`pill ${tone}`}>{status}</span>
                    {a.source === "env" && <span className="pill bg-surface-2 text-muted">из env</span>}
                    {isAdmin(a.login) && <span className="pill bg-accent-soft text-accent">админ</span>}
                  </div>
                  {a.note && <p className="text-[15px]">{a.note}</p>}
                  <p className="text-[14px] text-muted">
                    до {fmtDayYear(Date.parse(a.until))} · последний визит: {isAdmin(a.login) ? "ваши визиты не считаются" : views[i].last ? fmtDateTime(views[i].last!) : "—"}
                  </p>
                  <p className="text-[14px] text-muted">Просмотры: {viewsLine(views[i])}</p>
                </div>
                {a.source === "store" && (
                  <div className="flex flex-wrap gap-2">
                    <form action={extendAction.bind(null, a.login)}><button className="btn btn-ghost" type="submit">+14 дней</button></form>
                    <form action={toggleAction.bind(null, a.login, !a.disabled)}>
                      <button className="btn btn-ghost" type="submit">{a.disabled ? "Включить" : "Отключить"}</button>
                    </form>
                    <form action={deleteAction.bind(null, a.login)}>
                      <button className="btn btn-ghost text-danger" type="submit">Удалить</button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-[20px] font-bold">Журнал входов</h2>
        <p className="text-[14px] text-muted">
          {notifyEnabled()
            ? "О каждом входе клиента вам приходит сообщение в Telegram."
            : "Уведомления в Telegram выключены: добавьте в Vercel DEMO_NOTIFY_TG_TOKEN и DEMO_NOTIFY_CHAT_ID."}
          {" "}IP-адреса не хранятся: только страна и тип устройства.
        </p>
        {log.length === 0 ? (
          <p className="text-[15px] text-muted">Входов пока не было.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {log.map((e, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-[15px]">
                <span className="tabular-nums text-muted">{fmtDateTime(e.ts)}</span>
                <span className="font-semibold">{e.login}</span>
                <span className={e.ok ? "text-ok" : "text-warn"}>{e.ok ? "вошёл" : "срок вышел"}</span>
                <span className="text-muted">{[e.device, e.country].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
