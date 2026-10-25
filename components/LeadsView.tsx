"use client";
// «Заявки»: tiles, the «Пришла новая заявка» button, the feed with day separators and the failure list.
// The month is regenerated here from the same seed, so nothing large travels from the server.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DEMO_NOW, managerName, sourceName, type SourceId } from "@/lib/demo/config";
import { demo } from "@/lib/demo/generate";
import type { Lead, PreparedLead } from "@/lib/demo/model";
import { leadTiles, type Period } from "@/lib/demo/selectors";
import { dayNumber, fmtDayLong, fmtDayShort, fmtTime, fmtWeekdayDay, localHour } from "@/lib/demo/time";
import { useDemoStore } from "@/lib/local";
import { Avatar } from "./Avatar";
import { Tile } from "./Blocks";
import { Sheet } from "./Sheet";

const SOURCE_TONE: Record<SourceId, string> = { site: "text-teal bg-teal-soft", wa: "text-ok bg-ok-soft", ig: "text-ig bg-[#fbeaf3]" };
const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "Новая", cls: "bg-accent-soft text-accent" },
  work: { label: "В работе", cls: "bg-warn-soft text-warn" },
  deal: { label: "Сделка создана", cls: "bg-ok-soft text-ok" },
  junk: { label: "Не целевая", cls: "bg-surface-2 text-muted" },
};
const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Сегодня" }, { id: "week", label: "Неделя" }, { id: "month", label: "Месяц" },
];
const FILTERS: { id: "all" | SourceId; label: string }[] = [
  { id: "all", label: "Все" }, { id: "site", label: "Сайт" }, { id: "wa", label: "WhatsApp" }, { id: "ig", label: "Instagram" },
];
const PAGE = 40;

type Row = Lead & { simulated?: PreparedLead };

/** Status shown on the card: today's untouched evening leads are still «Новая». */
const statusOf = (l: Row) =>
  l.simulated ? "new" : l.status === "work" && dayNumber(l.ts) === dayNumber(DEMO_NOW) && localHour(l.ts) >= 17 ? "new" : l.status;

/** Same lead id → same small delays, so the path reads the same on every visit. */
const spread = (id: string, min: number, max: number) => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return min + (h % (max - min + 1));
};

function pathOf(l: Row): { ts: number; text: string }[] {
  const arrived = l.deliveredTs ?? l.ts;
  const steps = [{ ts: l.ts, text: `Пришла: ${sourceName(l.source)}` }];
  if (l.deliveredTs) steps.push({ ts: l.deliveredTs, text: "Дошла после сбоя" });
  steps.push({ ts: arrived + 60_000, text: "В Bitrix24, ответственный назначен" });
  steps.push({ ts: arrived + 60_000, text: `Уведомление в Telegram: ${managerName(l.manager)}` });
  if (l.simulated) return steps;
  const deal = l.dealId ? demo().deals.find((d) => d.id === l.dealId) : undefined;
  const taken = deal ? deal.events[0].ts - 5 * 60_000 : arrived + spread(l.id, 6, 45) * 60_000;
  if (taken < DEMO_NOW && statusOf(l) !== "new") steps.push({ ts: taken, text: "Взята в работу" });
  if (deal) steps.push({ ts: deal.events[0].ts, text: "Создана сделка" });
  if (l.status === "junk") steps.push({ ts: taken + spread(l.id, 5, 30) * 60_000, text: "Отмечена: не целевая" });
  return steps.filter((s) => s.ts <= DEMO_NOW + 3_600_000);
}

export function LeadsView() {
  const { leads, failures, prepared } = demo();
  const { state, update } = useDemoStore();
  const [period, setPeriod] = useState<Period>("month");
  const [tab, setTab] = useState<"feed" | "failures">("feed");
  const [filter, setFilter] = useState<"all" | SourceId>("all");
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<Row | null>(null);
  const [toast, setToast] = useState<{ title: string; lines: string[] } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const simulated = state?.simulated ?? 0;
  const arrived = prepared.slice(0, simulated);
  const extra = arrived.filter((p) => p.kind !== "duplicate");
  const extraRepeats = arrived.filter((p) => p.kind === "duplicate");

  const sim: Row[] = extra.map((p) => ({
    id: `N${p.n}`, ts: DEMO_NOW, source: p.source, client: p.client, phone: p.phone, need: p.need, manager: p.manager,
    status: "work", repeats: [], simulated: p,
  }));
  const rows: Row[] = [...sim.reverse(), ...[...leads].reverse()];

  const base = leadTiles(period);
  const tiles = {
    ...base,
    total: base.total + extra.length,
    repeats: base.repeats + extraRepeats.length,
    failures: base.failures + extra.filter((p) => p.kind === "failure").length,
    bySource: { ...base.bySource },
  };
  for (const p of extra) tiles.bySource[p.source]++;

  const visible = rows.filter((l) => filter === "all" || l.source === filter);
  const hintNew = state && !state.seen.includes("hint-new-lead");

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const show = (title: string, lines: string[]) => {
    setToast({ title, lines });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 7000);
  };

  const nextLead = () => {
    const p = prepared[simulated];
    if (!p) return;
    update((s) => ({ ...s, simulated: s.simulated + 1, seen: s.seen.includes("hint-new-lead") ? s.seen : [...s.seen, "hint-new-lead"] }));
    setTab("feed");
    const note = [`${p.client} · ${p.need}`, p.phone, `Ответственный: ${managerName(p.manager)}`];
    if (p.kind === "duplicate") {
      const first = leads.find((l) => l.id === p.dupOf)!;
      show("Повтор", [`Тот же номер уже писал в ${fmtTime(first.ts)}. Добавлено к заявке, новая не создана.`]);
    } else if (p.kind === "failure") {
      show("Сбой", ["Не дошла с первой попытки — в списке сбоев, вам пришло сообщение."]);
      timer.current = window.setTimeout(() => show(`Новая заявка · ${sourceName(p.source)}`, [...note.slice(0, 2), `Дошла, ответственный ${managerName(p.manager)}`]), 2000);
    } else {
      show(`Новая заявка · ${sourceName(p.source)}`, note);
    }
  };

  const contacted = new Set(state?.contacted ?? []);
  let lastDay = -1;

  return (
    <div className="space-y-5">
      <div className="relative inline-flex" data-tour="new-lead">
        {simulated < prepared.length ? (
          <button type="button" className="btn btn-primary" onClick={nextLead}>Пришла новая заявка</button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[16px] text-muted">Заготовленные заявки закончились</span>
            <button type="button" className="btn btn-ghost" onClick={() => update((s) => ({ ...s, simulated: 0 }))}>Сбросить</button>
          </div>
        )}
        {hintNew && simulated === 0 && (
          <span className="absolute -right-1 -top-1 h-3.5 w-3.5 animate-pulse rounded-full bg-teal ring-2 ring-surface" aria-label="Нажмите — придёт новая заявка" />
        )}
      </div>

      <section className="space-y-2">
        <div className="flex gap-2" role="group" aria-label="Период">
          {PERIODS.map((p) => (
            <button key={p.id} type="button" className="chip" aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>{p.label}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Tile label="Заявок" value={tiles.total} />
          <div className="col-span-2 sm:col-span-1"><Tile label="Сайт · WhatsApp · Instagram" value={`${tiles.bySource.site} · ${tiles.bySource.wa} · ${tiles.bySource.ig}`} /></div>
          <Tile label="Без ответственного" value={tiles.unassigned} tone="ok" />
          <Tile label="Повторов склеено" value={tiles.repeats} sub="новых заявок не создали" />
          <Tile label="Сбоев" value={tiles.failures} sub="все заявки дошли" />
        </div>
      </section>

      <div className="flex gap-2 border-b border-line" role="tablist">
        {(["feed", "failures"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`-mb-px min-h-11 border-b-2 px-2 text-[16px] font-semibold ${tab === t ? "border-accent text-ink" : "border-transparent text-muted"}`}>
            {t === "feed" ? "Лента" : "Список сбоев"}
          </button>
        ))}
      </div>

      {tab === "failures" ? (
        <ul className="space-y-2">
          {extra.filter((p) => p.kind === "failure").map((p) => (
            <li key={p.n} className="card p-4 text-[16px]">
              <b>Только что:</b> заявка из {sourceName(p.source)} не дошла с первой попытки. Дошла через 2 секунды, ответственный {managerName(p.manager)}.
            </li>
          ))}
          {[...failures].reverse().map((f) => (
            <li key={f.id} className="card p-4 text-[16px]">
              <b>{fmtDayShort(f.start)}, {fmtTime(f.start)}–{fmtTime(f.end)}:</b> {f.what}.{" "}
              {f.leadIds.length === 1 ? "1 заявка пришла" : `${f.leadIds.length} заявки пришли`} в {fmtTime(f.doneTs)}
              {f.leadIds.length === 1 ? ", с ответственным." : ", обе с ответственным."} Вам пришло сообщение о сбое в {fmtTime(f.notifyTs)}.
            </li>
          ))}
        </ul>
      ) : (
        <section className="space-y-3">
          <div className="scroll-x -mx-4 flex gap-2 px-4" role="group" aria-label="Источник">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => { setFilter(f.id); setShown(PAGE); }}>
                {f.label}
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {visible.slice(0, shown).map((l) => {
              const dn = dayNumber(l.ts);
              const sep = dn !== lastDay;
              lastDay = dn;
              const st = STATUS[statusOf(l)];
              const merged = l.repeats.length + extraRepeats.filter((p) => p.dupOf === l.id).length;
              return (
                <li key={l.id}>
                  {sep && <h3 className="pb-1 pt-3 text-[14px] font-semibold text-muted">{fmtWeekdayDay(l.ts)}</h3>}
                  <button type="button" onClick={() => setOpen(l)} className={`card block w-full p-3 text-left sm:p-4 ${l.simulated ? "rise border-accent" : ""}`}>
                    <div className="flex flex-wrap items-center gap-2 text-[14px]">
                      <span className="font-semibold tabular-nums">{l.simulated ? "только что" : fmtTime(l.ts)}</span>
                      <span className={`pill ${SOURCE_TONE[l.source]}`}>{sourceName(l.source)}</span>
                      <span className={`pill ${st.cls}`}>{st.label}</span>
                      {merged > 0 && <span className="pill bg-surface-2 text-muted">+{merged} повтор</span>}
                      {(l.failureId || l.simulated?.kind === "failure") && <span className="pill bg-warn-soft text-warn">после сбоя</span>}
                      {contacted.has(l.id) && <span className="pill bg-teal-soft text-teal">Вы: связался</span>}
                    </div>
                    <div className="mt-2 text-[17px] font-semibold">{l.client} <span className="font-normal text-muted">{l.phone}</span></div>
                    <div className="text-[16px]">{l.need}</div>
                    <div className="mt-2 flex items-center gap-2 text-[15px] text-muted">
                      <Avatar id={l.manager} withName />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {visible.length > shown && (
            <button type="button" className="btn btn-ghost w-full" onClick={() => setShown(shown + PAGE)}>
              Показать ещё {Math.min(PAGE, visible.length - shown)}
            </button>
          )}
        </section>
      )}

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? `${open.client} · ${sourceName(open.source)}` : ""}>
        {open && (
          <div className="space-y-4 text-[16px]">
            <div>
              <p>{open.need}</p>
              <p className="text-muted">{open.phone} · ответственный {managerName(open.manager)}</p>
              <p className="text-muted">{open.simulated ? "только что" : `${fmtDayLong(open.ts)}, ${fmtTime(open.ts)}`}</p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Путь заявки</h3>
              <ol className="space-y-2 border-l-2 border-teal pl-4">
                {pathOf(open).map((s, i) => (
                  <li key={i}><span className="tabular-nums text-muted">{open.simulated ? "только что" : fmtTime(s.ts)}</span> · {s.text}</li>
                ))}
              </ol>
            </div>
            <div className="rounded-[var(--radius)] bg-[#e9eef3] p-3">
              <p className="mb-1 text-[13px] text-muted">Пример сообщения в Telegram</p>
              <div className="rounded-[var(--radius)] bg-surface p-3">
                <b>Новая заявка · {sourceName(open.source)}</b>
                <p>{open.client} · {open.need}</p>
                <p>{open.phone}</p>
                <p>Ответственный: {managerName(open.manager)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {open.dealId && <Link href={`/sdelki?deal=${open.dealId}`} className="btn btn-primary">Открыть сделку</Link>}
              <button type="button" className="btn btn-ghost" aria-pressed={contacted.has(open.id)}
                onClick={() => update((s) => ({
                  ...s, contacted: s.contacted.includes(open.id) ? s.contacted.filter((x) => x !== open.id) : [...s.contacted, open.id],
                }))}>
                {contacted.has(open.id) ? "Снять отметку «Связался»" : "Связался"}
              </button>
            </div>
            <p className="text-[13px] text-muted">Отметки видите только вы, в этом браузере.</p>
          </div>
        )}
      </Sheet>

      {toast && (
        <div className="rise fixed inset-x-3 bottom-24 z-40 mx-auto max-w-sm rounded-[var(--radius-lg)] bg-[#e9eef3] p-3 shadow-xl sm:bottom-6" role="status">
          <div className="mb-1 flex items-center justify-between text-[13px] text-muted">
            <span>Пример сообщения в Telegram</span>
            <button type="button" className="min-h-8 px-2" aria-label="Закрыть" onClick={() => setToast(null)}>✕</button>
          </div>
          <div className="rounded-[var(--radius)] bg-surface p-3 text-[15px]">
            <b>{toast.title}</b>
            {toast.lines.map((t) => <p key={t}>{t}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}
