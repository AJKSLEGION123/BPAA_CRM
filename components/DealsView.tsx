"use client";
// «Сделки»: tiles, the board (stage chips on phones, 5 columns on wide screens), the deal sheet with the
// visitor's own marks, and the 30-day chart. Marks live in localStorage and only change this browser's view.
import { useEffect, useRef, useState } from "react";
import { DEMO_NOW, MANAGERS, STAGES, type ManagerId } from "@/lib/demo/config";
import { Avatar } from "./Avatar";
import { demo } from "@/lib/demo/generate";
import { dealsAt, historyLine, snapshot, type DealRow, type SeriesPoint } from "@/lib/demo/selectors";
import { fmtDateTime, fmtMoney, oct, plural } from "@/lib/demo/time";
import { COPY } from "@/lib/copy";
import { toOverrides, useDemoStore } from "@/lib/local";
import { Tile } from "./Blocks";
import { Sheet } from "./Sheet";
import { StuckChart } from "./StuckChart";

type View = number | "won" | "lost" | "abandoned";
const CLOSED: { id: Exclude<View, number>; label: string }[] = [
  { id: "won", label: "Предоплата получена" }, { id: "lost", label: "Отказ" }, { id: "abandoned", label: "Брошенные" },
];

const inView = (r: DealRow, v: View) =>
  v === "won" ? r.state.status === "won"
  : v === "lost" ? r.state.status === "lost"
  : v === "abandoned" ? r.state.abandoned
  : r.state.status === "open" && !r.state.abandoned && r.state.stage === v;

const idleText = (n: number) => `без действий ${n} ${plural(n, "день", "дня", "дней")}`;

export function DealsView({ series, initialDeal }: { series: SeriesPoint[]; initialDeal?: string }) {
  const { state, update } = useDemoStore();
  const overrides = toOverrides(state);
  const hasMarks = Object.keys(state?.marks ?? {}).length > 0;
  const [who, setWho] = useState<"all" | ManagerId>("all");
  const [view, setView] = useState<View>(2);
  const [closedView, setClosedView] = useState<Exclude<View, number> | null>(null);
  const [openId, setOpenId] = useState<string | null>(initialDeal ?? null);
  const [norms, setNorms] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    // Keep ?deal= in the address so the sheet can be shared and reopened; no navigation, no reload.
    const url = new URL(window.location.href);
    if (openId) url.searchParams.set("deal", openId);
    else url.searchParams.delete("deal");
    window.history.replaceState(null, "", url);
  }, [openId]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const base = snapshot(oct(30, 9));
  const mine = hasMarks ? snapshot(DEMO_NOW, overrides) : null;
  const rows = dealsAt(DEMO_NOW, overrides, who === "all" ? undefined : who);
  const count = (v: View) => rows.filter((r) => inView(r, v)).length;
  const urgentIn = (v: number) => rows.some((r) => inView(r, v) && r.state.urgent);
  const byManager = MANAGERS.map((m) => ({ ...m, n: base.byManager[m.id].over })).sort((a, b) => b.n - a.n);

  const deal = openId ? demo().deals.find((d) => d.id === openId) : undefined;
  const row = deal ? dealsAt(DEMO_NOW, overrides).find((r) => r.deal.id === deal.id) : undefined;

  const markDeal = (id: string, kind: "action" | "stage", stage: number) => {
    const first = !state?.seen.includes("first-mark");
    update((s) => ({
      ...s,
      marks: { ...s.marks, [id]: [...(s.marks[id] ?? []), { kind, stage }] },
      seen: first ? [...s.seen, "first-mark"] : s.seen,
    }));
    if (first) setToast(COPY.firstMark);
  };
  const mark = (kind: "action" | "stage", stage: number) => deal && markDeal(deal.id, kind, stage);

  // Desktop drag between columns: same action as «Перевести на этап», own pointer code, no library.
  const [drag, setDrag] = useState<{ id: string; from: number; x: number; y: number; over: number | null; label: string } | null>(null);
  const dragged = useRef(false);
  const startDrag = (e: React.PointerEvent, r: DealRow) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || r.state.status !== "open" || r.state.abandoned) return;
    const x0 = e.clientX, y0 = e.clientY;
    dragged.current = false;
    const stageAt = (x: number, y: number) => {
      const col = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-stage]");
      return col ? Number(col.dataset.stage) : null;
    };
    const move = (ev: PointerEvent) => {
      if (!dragged.current && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
      dragged.current = true;
      setDrag({ id: r.deal.id, from: r.state.stage, x: ev.clientX, y: ev.clientY, over: stageAt(ev.clientX, ev.clientY), label: r.deal.client });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const to = dragged.current ? stageAt(ev.clientX, ev.clientY) : null;
      if (to !== null && to !== r.state.stage) markDeal(r.deal.id, "stage", to);
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const card = (r: DealRow) => {
    const s = r.state;
    const tone = s.abandoned || s.status !== "open" ? "border-l-line text-muted" : s.urgent ? "border-l-danger" : s.overNorm ? "border-l-warn" : "border-l-ok";
    const idle = s.urgent ? "text-danger font-semibold" : s.overNorm ? "text-warn font-semibold" : "text-muted";
    const isMarked = !!overrides[r.deal.id];
    return (
      <li key={r.deal.id}>
        <button type="button" onPointerDown={(e) => startDrag(e, r)}
          onClick={() => { if (!dragged.current) setOpenId(r.deal.id); dragged.current = false; }}
          className={`card block w-full select-none border-l-4 p-3 text-left transition hover:shadow-md ${tone} ${drag?.id === r.deal.id ? "opacity-40" : ""}`}>
          <div className="flex items-start justify-between gap-2">
            <span className="text-[16px] font-semibold text-ink">{r.deal.client}</span>
            <Avatar id={r.deal.manager} />
          </div>
          <div className="text-[15px] text-ink">{r.deal.need}</div>
          <div className={`mt-1 text-[14px] ${idle}`}>
            {s.status === "won" ? "Предоплата получена" : s.status === "lost" ? "Отказ" : idleText(s.daysIdle)}
            {isMarked && <span className="ml-2 font-normal text-teal">· ваша отметка</span>}
          </div>
        </button>
      </li>
    );
  };

  const list = (v: View) => {
    const items = rows.filter((r) => inView(r, v));
    return items.length ? <ul className="space-y-2">{items.map(card)}</ul> : <p className="text-[15px] text-muted">Здесь пусто.</p>;
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <Tile label="Дольше нормы" value={base.over} tone="warn" sub={mine && mine.over !== base.over ? `с вашими отметками: ${mine.over}` : undefined} />
          <Tile label="Срочно" value={base.urgent} tone="danger" sub={mine && mine.urgent !== base.urgent ? `с вашими отметками: ${mine.urgent}` : "5 дней и больше"} />
          <Tile label="Брошены" value={base.abandoned} tone="muted" sub="больше 60 дней" />
        </div>
        <p className="text-[16px]"><span className="text-muted">Дольше нормы у менеджеров:</span> {byManager.map((m) => `${m.name} ${m.n}`).join(" · ")}</p>
        <p className="text-[14px] text-muted">{COPY.legend}</p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="scroll-x -mx-4 flex gap-2 px-4" role="group" aria-label="Как видит менеджер">
            {[{ id: "all" as const, name: "Все" }, ...MANAGERS].map((m) => (
              <button key={m.id} type="button" className="chip" aria-pressed={who === m.id} onClick={() => setWho(m.id)}>{m.name}</button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setNorms(true)}>Нормы по этапам</button>
        </div>
        <p className="text-[14px] text-muted">{COPY.boardNote}<span className="hidden lg:inline"> Карточку можно перетащить в другой этап.</span></p>

        {/* Phones and tablets: stage chips, one list. */}
        <div className="lg:hidden">
          <div className="scroll-x -mx-4 mb-3 flex gap-2 px-4" role="tablist" aria-label="Этапы">
            {STAGES.map((s) => (
              <button key={s.id} role="tab" type="button" className="chip" aria-selected={view === s.id} onClick={() => setView(s.id)}>
                {s.name} <span className="tabular-nums opacity-70">{count(s.id)}</span>
                {urgentIn(s.id) && <span className="h-2 w-2 rounded-full bg-danger" aria-label="есть срочные" />}
              </button>
            ))}
            {CLOSED.map((c) => (
              <button key={c.id} role="tab" type="button" className="chip" aria-selected={view === c.id} onClick={() => setView(c.id)}>
                {c.label} <span className="tabular-nums opacity-70">{count(c.id)}</span>
              </button>
            ))}
          </div>
          {list(view)}
        </div>

        {/* Wide screens: five open columns, closed stages folded below. */}
        <div className="hidden gap-3 lg:grid lg:grid-cols-5">
          {STAGES.map((s) => (
            <div key={s.id} data-stage={s.id}
              className={`min-w-0 rounded-[var(--radius-lg)] p-2 transition ${drag && drag.over === s.id && drag.from !== s.id ? "bg-teal-soft ring-2 ring-teal" : "bg-surface-2"}`}>
              <h3 className="flex min-h-11 items-start justify-between gap-2 px-1 pb-2 text-[15px] font-bold leading-tight">
                <span>{s.name}</span>
                <span className="flex items-center gap-1 tabular-nums text-muted">
                  {urgentIn(s.id) && <span className="h-2 w-2 rounded-full bg-danger" aria-label="есть срочные" />}
                  {count(s.id)}
                </span>
              </h3>
              {/* Long columns scroll inside, so the chart below stays one screen away. */}
              <div className="max-h-[70vh] overflow-y-auto pr-1">{list(s.id)}</div>
            </div>
          ))}
        </div>
        <div className="hidden lg:block">
          <div className="flex gap-2">
            {CLOSED.map((c) => (
              <button key={c.id} type="button" className="chip" aria-pressed={closedView === c.id}
                onClick={() => setClosedView(closedView === c.id ? null : c.id)}>
                {c.label} <span className="tabular-nums opacity-70">{count(c.id)}</span>
              </button>
            ))}
          </div>
          {closedView && <div className="mt-3 grid grid-cols-3 gap-2">{rows.filter((r) => inView(r, closedView)).map(card)}</div>}
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        <h2 className="text-[20px] font-bold">Сравнение за 30 дней</h2>
        <p className="mb-3 text-[16px] text-muted">Сколько сделок стоит дольше нормы, каждый день в 9:00</p>
        <StuckChart series={series} />
        <p className="mt-3 text-[15px] font-semibold">{COPY.chartNote}</p>
        <p className="text-[13px] text-muted">{COPY.chartSmall}</p>
      </section>

      <Sheet open={!!deal} onClose={() => setOpenId(null)} title={deal ? `${deal.client} · ${deal.need}` : ""}>
        {deal && row && (
          <div className="space-y-4 text-[16px]">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt className="text-muted">Этап</dt>
              <dd>{row.state.status === "won" ? "Предоплата получена" : row.state.status === "lost" ? "Отказ" : `${STAGES[row.state.stage].name} · норма ${STAGES[row.state.stage].norm} ${plural(STAGES[row.state.stage].norm, "день", "дня", "дней")}`}</dd>
              {row.state.status === "open" && (
                <>
                  <dt className="text-muted">Без действий</dt>
                  <dd className={row.state.urgent ? "font-semibold text-danger" : row.state.overNorm ? "font-semibold text-warn" : ""}>
                    {row.state.daysIdle} {plural(row.state.daysIdle, "день", "дня", "дней")}
                    {row.state.abandoned ? " · брошена" : row.state.urgent ? " · срочно" : row.state.overNorm ? " · дольше нормы" : ""}
                  </dd>
                </>
              )}
              <dt className="text-muted">Сумма</dt>
              <dd className="tabular-nums">{fmtMoney(deal.amount)}</dd>
              <dt className="text-muted">Ответственный</dt>
              <dd><Avatar id={deal.manager} withName size={24} /></dd>
            </dl>

            <div>
              <h3 className="mb-2 font-semibold">История</h3>
              <ol className="space-y-1.5 border-l-2 border-line pl-4">
                {(overrides[deal.id] ?? []).map((e, i) => (
                  <li key={`m${i}`} className="text-teal">только что · Вы: {e.kind === "stage" ? `этап «${STAGES[e.stage].name}»` : "действие отмечено"}</li>
                )).reverse()}
                {deal.events.map((e, i) => ({ e, i })).filter(({ e }) => e.ts <= DEMO_NOW).slice(-5).reverse().map(({ e, i }) => (
                  <li key={i}><span className="tabular-nums text-muted">{fmtDateTime(e.ts)}</span> · {historyLine(deal, e, i)}</li>
                ))}
              </ol>
            </div>

            {row.state.status === "open" && (
              <div className="space-y-2">
                <button type="button" data-tour="mark" className="btn btn-primary w-full" onClick={() => mark("action", row.state.stage)}>
                  Отметить действие
                </button>
                <label className="block">
                  <span className="sr-only">Перевести на этап</span>
                  <select className="btn btn-ghost w-full appearance-none text-center" value=""
                    onChange={(e) => e.target.value && mark("stage", Number(e.target.value))}>
                    <option value="">Перевести на этап…</option>
                    {STAGES.filter((s) => s.id !== row.state.stage).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                <button type="button" className="btn btn-ghost w-full" onClick={() => setToast(COPY.bitrixHint)}>Открыть в Bitrix24</button>
              </div>
            )}
            {toast && <p role="status" className="rise rounded-[var(--radius)] bg-ink p-3 text-[15px] text-white">{toast}</p>}
            {hasMarks && (
              <button type="button" className="min-h-11 text-[15px] font-semibold text-teal" onClick={() => update((s) => ({ ...s, marks: {} }))}>
                Сбросить мои изменения
              </button>
            )}
          </div>
        )}
      </Sheet>

      <Sheet open={norms} onClose={() => setNorms(false)} title="Нормы по этапам">
        <ul className="space-y-1 text-[16px]">
          {STAGES.map((s) => <li key={s.id}>{s.name} — {s.norm} {plural(s.norm, "день", "дня", "дней")}</li>)}
          <li className="pt-2">Срочно — 5 дней и больше без действий</li>
          <li>Брошена — больше 60 дней</li>
        </ul>
        <p className="mt-3 text-[14px] text-muted">В проекте задаём вместе с вами.</p>
      </Sheet>

      {drag && (
        <div className="pointer-events-none fixed z-[70] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius)] border border-line bg-surface px-3 py-2 text-[15px] font-semibold shadow-xl"
          style={{ left: drag.x, top: drag.y }}>
          {drag.label}
          {drag.over !== null && drag.over !== drag.from && <span className="block text-[13px] font-normal text-teal">→ {STAGES[drag.over].name}</span>}
        </div>
      )}
      {toast && !deal && (
        <div className="rise fixed inset-x-3 bottom-24 z-[60] mx-auto max-w-sm rounded-[var(--radius-lg)] bg-ink p-4 text-[15px] text-white shadow-xl sm:bottom-6" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
