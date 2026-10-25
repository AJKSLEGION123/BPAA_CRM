// Every number the UI shows comes from here, computed from the same leads and deal events, so the tabs agree.
import { DEMO_NOW, MANAGERS, SOURCES, STAGES, managerName, sourceName, type ManagerId, type SourceId } from "./config";
import { demo } from "./generate";
import { stateAt, type Deal, type DealEvent, type DealState, type Failure, type Lead } from "./model";
import { dayNumber, oct } from "./time";

/** Visitor's own marks from localStorage: extra events per deal id, applied on top of the month. */
export type Overrides = Record<string, DealEvent[]>;

export type Counts = { open: number; over: number; urgent: number };
export type Snapshot = Counts & { ts: number; abandoned: number; byManager: Record<ManagerId, Counts> };

const emptyCounts = (): Counts => ({ open: 0, over: 0, urgent: 0 });

export function snapshot(ts: number, overrides: Overrides = {}): Snapshot {
  const byManager = Object.fromEntries(MANAGERS.map((m) => [m.id, emptyCounts()])) as Record<ManagerId, Counts>;
  const out: Snapshot = { ts, ...emptyCounts(), abandoned: 0, byManager };
  for (const d of demo().deals) {
    const s = stateAt(d, ts, overrides[d.id]);
    if (!s || s.status !== "open") continue;
    if (s.abandoned) { out.abandoned++; continue; }
    const m = byManager[d.manager];
    out.open++; m.open++;
    if (s.overNorm) { out.over++; m.over++; }
    if (s.urgent) { out.urgent++; m.urgent++; }
  }
  return out;
}

export type DealRow = { deal: Deal; state: DealState };

/** Deals with their state at `ts`, open ones first by days without action. */
export function dealsAt(ts: number, overrides: Overrides = {}, manager?: ManagerId): DealRow[] {
  const rows: DealRow[] = [];
  for (const deal of demo().deals) {
    if (manager && deal.manager !== manager) continue;
    const state = stateAt(deal, ts, overrides[deal.id]);
    if (state) rows.push({ deal, state });
  }
  return rows.sort((a, b) => b.state.daysIdle - a.state.daysIdle || a.deal.id.localeCompare(b.deal.id));
}

export const overList = (ts: number, manager?: ManagerId, overrides: Overrides = {}) =>
  dealsAt(ts, overrides, manager).filter((r) => r.state.overNorm);
export const urgentList = (ts: number, manager?: ManagerId, overrides: Overrides = {}) =>
  dealsAt(ts, overrides, manager).filter((r) => r.state.urgent);

export type SeriesPoint = { day: number; total: number; byManager: Record<ManagerId, number> };

/** Deals over their norm at 9:00 on each day of October, total and per manager. */
export function series(): SeriesPoint[] {
  return Array.from({ length: 30 }, (_, i) => {
    const s = snapshot(oct(i + 1, 9));
    const byManager = Object.fromEntries(MANAGERS.map((m) => [m.id, s.byManager[m.id].over])) as Record<ManagerId, number>;
    return { day: i + 1, total: s.over, byManager };
  });
}

const sameDay = (ts: number, day: number) => dayNumber(ts) === dayNumber(oct(day, 12));
const bySourceOf = (leads: Lead[]) =>
  Object.fromEntries(SOURCES.map((s) => [s.id, leads.filter((l) => l.source === s.id).length])) as Record<SourceId, number>;

export function leadsOfDay(day: number, until = Infinity): Lead[] {
  return demo().leads.filter((l) => sameDay(l.ts, day) && l.ts < until);
}

export type DaySummary = {
  day: number;
  leads: number;
  bySource: Record<SourceId, number>;
  unassigned: number;
  moved: number;
  prepayments: number;
  over: number;
  failures: Failure[];
};

/** The 19:00 day report: leads, moves and prepayments before 19:00, deals over the norm at 19:00. */
export function daySummary(day: number): DaySummary {
  const until = Math.min(oct(day, 19), DEMO_NOW);
  const leads = leadsOfDay(day, until);
  let moved = 0;
  let prepayments = 0;
  for (const d of demo().deals) {
    for (const e of d.events) {
      if (e.ts >= until || !sameDay(e.ts, day)) continue;
      if (e.kind === "stage") moved++;
      if (e.kind === "won") prepayments++;
    }
  }
  return {
    day, leads: leads.length, bySource: bySourceOf(leads), unassigned: leads.filter((l) => !l.manager).length,
    moved, prepayments, over: snapshot(until).over,
    failures: demo().failures.filter((f) => sameDay(f.start, day)),
  };
}

export type Period = "today" | "week" | "month";
export const PERIOD_FROM: Record<Period, number> = { today: oct(30), week: oct(24), month: oct(1) };

export type LeadTiles = {
  total: number;
  bySource: Record<SourceId, number>;
  unassigned: number;
  repeats: number;
  failures: number;
};

export function leadTiles(period: Period): LeadTiles {
  const from = PERIOD_FROM[period];
  const { leads, failures } = demo();
  const inPeriod = leads.filter((l) => l.ts >= from && l.ts <= DEMO_NOW);
  const repeats = leads.flatMap((l) => l.repeats).filter((r) => r.ts >= from && r.ts <= DEMO_NOW).length;
  return {
    total: inPeriod.length, bySource: bySourceOf(inPeriod), unassigned: inPeriod.filter((l) => !l.manager).length,
    repeats, failures: failures.filter((f) => f.start >= from && f.start <= DEMO_NOW).length,
  };
}

// Deal history in the sheet. Nouns, not verbs: managers are both men and women.
const ACTIONS: string[][] = [
  ["Звонок клиенту", "Сообщение в WhatsApp"],
  ["Консультация по телефону", "Отправлены примеры работ"],
  ["Время замера согласовано", "Напоминание о замере"],
  ["Отправлен расчёт", "Обсуждение дизайн-проекта"],
  ["Отправлен договор", "Напоминание о предоплате"],
];

export function historyLine(deal: Deal, e: DealEvent, i: number): string {
  if (e.kind === "created") return `Заявка: ${sourceName(deal.source)}, ответственный ${managerName(deal.manager)}`;
  if (e.kind === "stage") return `Этап: ${STAGES[e.stage].name}`;
  if (e.kind === "won") return "Предоплата получена";
  if (e.kind === "lost") return "Отказ";
  return ACTIONS[e.stage][i % 2];
}

/** Timur's «Ерлан · Замер · 9 дн.»: the 13:00 message and tour step 3 lead to it. */
export const showcaseId = () => demo().deals.find((d) => d.client === "Ерлан")!.id;

export const isToday =(ts: number) => dayNumber(ts) === dayNumber(DEMO_NOW) && ts <= DEMO_NOW;
