// Builds the fictional October of «Демо-Кухни» from the seed. Pure and memoised, so the server, the browser and the
// tests all see the same month. Counts are set by quotas; the rng only decides which lead or deal and when.
import {
  ABANDONED, CARRY_OVER, DUPLICATES, LEADS_ON_30, LEAD_QUOTA, LEAD_STATUS_QUOTA, LOST_IN_OCT, MOVED_ON_30,
  OPEN_ON_30, QUOTA_DAY1, QUOTA_DAY30, SEED, STAGES, URGENT_DAYS, WON_IN_OCT, WON_ON_30,
  type ManagerId, type SourceId,
} from "./config";
import type { Deal, DealEvent, DemoData, Failure, Lead, LeadStatus, PreparedLead } from "./model";
import { mulberry32, type Rng } from "./rng";
import { atDay, dayNumber, local, oct, weekday } from "./time";

const D1 = dayNumber(oct(1)); // local day number of 1 October
const octDay = (ts: number) => dayNumber(ts) - D1 + 1; // 1..30 in October, ≤ 0 before it
const MIN = 60_000;
const M: ManagerId[] = ["aigerim", "daniyar", "olga", "timur"];

// How the 98 open deals (9:00, 30 October), the 70 carried over and the 14 abandoned split between managers.
const OPEN_BY_MANAGER: Record<ManagerId, number> = { aigerim: 28, daniyar: 24, olga: 22, timur: 24 };
const CARRY_BY_MANAGER: Record<ManagerId, number> = { aigerim: 18, daniyar: 18, olga: 14, timur: 20 };
const ABANDONED_BY_MANAGER: Record<ManagerId, number> = { aigerim: 2, daniyar: 4, olga: 3, timur: 5 };

const NAMES = [
  "Асель", "Динара", "Марат", "Айжан", "Сергей", "Наталья", "Бауыржан", "Гульнара", "Ержан", "Алия", "Канат",
  "Светлана", "Дмитрий", "Жанар", "Нурлан", "Айгуль", "Виктория", "Арман", "Мадина", "Евгений", "Салтанат", "Руслан",
  "Лаура", "Кайрат", "Анна", "Галым", "Ирина", "Аскар", "Зарина", "Олжас", "Татьяна", "Ербол", "Камила", "Максим",
  "Индира", "Самат", "Елена", "Даурен", "Карина", "Алмас", "Юлия", "Бекзат", "Меруерт", "Андрей", "Сабина", "Талгат",
  "Алина", "Санжар", "Дана", "Игорь", "Асем", "Жандос", "Мария", "Нуржан", "Айсулу", "Владимир", "Гаухар", "Азамат",
  "Ксения", "Мирас",
]; // «Ерлан» is reserved for the showcase deal; manager names are not used for clients
const SHOWCASE = { client: "Ерлан", need: "Кухня угловая 3,2 м, МДФ", amount: 1_240_000, stage: 2, idle: 9 };

const NEEDS = [
  { text: "Кухня прямая 2,8 м, ЛДСП", min: 600_000, max: 850_000, w: 3 },
  { text: "Кухня прямая 3,4 м, МДФ", min: 850_000, max: 1_300_000, w: 2 },
  { text: "Кухня угловая 3,2 м, МДФ", min: 900_000, max: 1_500_000, w: 3 },
  { text: "Кухня угловая 4 м, ЛДСП", min: 750_000, max: 1_100_000, w: 2 },
  { text: "Кухня с островом, МДФ в эмали", min: 1_800_000, max: 3_200_000, w: 1 },
  { text: "Кухня П-образная 5 м, МДФ в эмали", min: 1_500_000, max: 2_600_000, w: 1 },
  { text: "Шкаф-купе 2,4 м", min: 600_000, max: 750_000, w: 2 },
  { text: "Шкаф-купе 3 м с антресолью", min: 650_000, max: 900_000, w: 2 },
  { text: "Гардеробная 2×2 м", min: 700_000, max: 1_200_000, w: 1 },
  { text: "Кухня и шкаф в прихожую", min: 1_200_000, max: 2_000_000, w: 1 },
];
const JUNK_NEEDS = [
  "Ремонт квартиры под ключ", "Ищет готовую кухню со склада", "Спросил цену, на звонок не ответил",
  "Предлагает рекламу", "Ошиблись номером", "Починить старый шкаф",
];

// The 9 leads of 30 October (site 2, WhatsApp 4, Instagram 3), all before 19:20.
const ON_30: { source: SourceId; h: number; m: number }[] = [
  { source: "wa", h: 8, m: 41 }, { source: "ig", h: 10, m: 34 }, { source: "site", h: 11, m: 20 },
  { source: "wa", h: 12, m: 15 }, { source: "ig", h: 14, m: 28 }, { source: "site", h: 15, m: 47 },
  { source: "wa", h: 16, m: 3 }, { source: "ig", h: 17, m: 55 }, { source: "wa", h: 18, m: 52 },
];
const ON_30_DEALS = ["11:20", "14:28"]; // become deals the same day, after 9:00
const ON_30_JUNK = "16:03";
const ON_30_MERGE = { at: "12:15", repeat: { h: 13, m: 40, source: "ig" as SourceId } }; // WhatsApp + Instagram

function assert(ok: boolean, msg: string): asserts ok {
  if (!ok) throw new Error(`demo data: ${msg}`);
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const hm = (ts: number) => {
  const d = new Date(ts + 5 * 3_600_000);
  return `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
};

/** Largest-remainder split of `total` by weights. */
function allocate(total: number, weights: number[]): number[] {
  const all = sum(weights);
  const raw = weights.map((w) => (w / all) * total);
  const out = raw.map(Math.floor);
  const order = raw.map((r, i) => ({ i, f: r - Math.floor(r) })).sort((a, b) => b.f - a.f || a.i - b.i);
  for (let j = 0, rest = total - sum(out); rest > 0; j++, rest--) out[order[j].i]++;
  return out;
}

/** Weighted sample of k items without replacement (Efraimidis–Spirakis). */
function sample<T>(rng: Rng, items: T[], k: number, weight: (x: T) => number = () => 1): T[] {
  assert(k <= items.length, `sample needs ${k}, has ${items.length}`);
  return items
    .map((x) => ({ x, key: Math.pow(rng.next(), 1 / Math.max(weight(x), 1e-9)) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, k)
    .map((e) => e.x);
}

function pickWeighted<T extends { w: number }>(rng: Rng, items: readonly T[]): T {
  let r = rng.next() * sum(items.map((i) => i.w));
  for (const it of items) if ((r -= it.w) < 0) return it;
  return items[items.length - 1];
}

const phone = (rng: Rng) => `+7 7•• ••• •• ${String(rng.int(0, 99)).padStart(2, "0")}`;
const workTime = (rng: Rng, dn: number, from = 10, to = 18) => atDay(dn, rng.int(from, to), rng.int(0, 59));
const amountFor = (rng: Rng, text: string) => {
  const n = NEEDS.find((x) => x.text === text) ?? NEEDS[0];
  return Math.round((n.min + rng.next() * (n.max - n.min)) / 10_000) * 10_000;
};

/** Chance that the next step on a deal comes later than the stage norm. Olga slips towards the end of the month. */
function lateChance(m: ManagerId, dn: number): number {
  const t = Math.min(Math.max(dn - D1 + 1, 0), 30) / 30;
  if (m === "timur") return 0.45;
  if (m === "daniyar") return 0.2;
  if (m === "olga") return 0.04 + 0.3 * t;
  return 0.08;
}

type End = "touch" | "won" | "lost";

/**
 * Events after `fromTs` up to and including the closing event at `endTs`. Steps in between are drawn from the
 * stage norms and the manager's lateness; intermediate steps never fall before day `notBefore` or on the end day.
 * "touch" ends with an action or a move into `endStage`, "won" with the prepayment, "lost" with the refusal.
 */
function path(
  rng: Rng, m: ManagerId, fromTs: number, fromStage: number, endTs: number, endStage: number, end: End,
  notBefore: number,
): DealEvent[] {
  const out: DealEvent[] = [];
  const endDn = dayNumber(endTs);
  const need = end === "won" ? 4 : endStage;
  let dn = dayNumber(fromTs);
  let stage = fromStage;
  for (;;) {
    const norm = STAGES[stage].norm;
    const late = rng.next() < lateChance(m, dn);
    let next = dn + (late ? norm + rng.int(1, 5) : rng.int(1, norm));
    // A deal that is already over its norm when the segment opens does not get picked up on the first morning.
    const stale = notBefore - dn > norm;
    if (next < notBefore) next = notBefore + (stale ? rng.int(1, late ? 11 : 7) : rng.int(0, 1));
    if (next >= endDn) break;
    const left = need - stage;
    const move = left > 0 && (left >= endDn - next || rng.next() < 0.5);
    if (move) stage++;
    out.push({ ts: workTime(rng, next), kind: move ? "stage" : "action", stage });
    dn = next;
  }
  // Too few steps fitted before the end: add the missing moves on the last free days, then on the end day itself.
  const finalMove = end === "touch" && stage < need ? 1 : 0;
  let missing = need - stage - finalMove;
  const firstFree = Math.max(dn + 1, notBefore);
  const days = Math.max(0, endDn - firstFree);
  for (let d = endDn - Math.min(missing, days); d < endDn; d++, missing--) {
    out.push({ ts: workTime(rng, d), kind: "stage", stage: ++stage });
  }
  for (let k = missing; k >= 1; k--) out.push({ ts: endTs - k * 20 * MIN, kind: "stage", stage: ++stage });
  if (end === "won") out.push({ ts: endTs, kind: "won", stage: 4 });
  else if (end === "lost") out.push({ ts: endTs, kind: "lost", stage });
  else out.push({ ts: endTs, kind: finalMove ? "stage" : "action", stage: stage + finalMove });
  return out;
}

type Draft = Omit<Deal, "id" | "events"> & {
  created: number;
  head: DealEvent[]; // events up to the October segment (carry-over: up to the last September step)
  start: { ts: number; stage: number }; // where the October segment starts
  notBefore: number;
  role?: { kind: "won" | "lost"; ts: number; stage: number } | { kind: "open"; stage: number; idle: number };
  on30?: "move" | "won";
};

export function generate(): DemoData {
  const rng = mulberry32(SEED);

  // 1. Calendar and leads.
  assert(sum(Object.values(LEAD_QUOTA)) === sum(Object.values(LEAD_STATUS_QUOTA)), "lead quotas");
  for (const s of ["site", "wa", "ig"] as SourceId[]) {
    assert(ON_30.filter((x) => x.source === s).length === LEADS_ON_30[s], `30 Oct leads for ${s}`);
  }
  const dayWeights = Array.from({ length: 29 }, (_, i) => {
    const w = weekday(oct(i + 1, 12));
    return w === 0 ? 0.6 : w === 6 ? 0.8 : 1;
  });
  const raw: { ts: number; source: SourceId }[] = [];
  for (const source of ["site", "wa", "ig"] as SourceId[]) {
    const perDay = allocate(LEAD_QUOTA[source] - LEADS_ON_30[source], dayWeights);
    perDay.forEach((n, i) => {
      for (let k = 0; k < n; k++) {
        const evening = rng.next() < (source === "wa" ? 0.35 : source === "ig" ? 0.3 : 0.2);
        const h = evening ? rng.int(19, 22) : rng.int(source === "ig" ? 10 : 8, 18);
        raw.push({ ts: oct(i + 1, h, rng.int(0, 59)), source });
      }
    });
  }
  for (const x of ON_30) raw.push({ ts: oct(30, x.h, x.m), source: x.source });

  // Failures: put the affected leads inside their windows and keep everyone else of that source out of them.
  const failureSpec: { day: number; source: SourceId; at: [number, number][]; clearHour: number; shiftTo: number }[] = [
    { day: 15, source: "ig", at: [[14, 12], [14, 31]], clearHour: 14, shiftTo: 16 },
    { day: 21, source: "site", at: [[11, 40]], clearHour: 11, shiftTo: 13 },
    { day: 27, source: "wa", at: [[16, 20]], clearHour: 16, shiftTo: 17 },
  ];
  for (const f of failureSpec) {
    const same = raw.filter((r) => r.source === f.source && octDay(r.ts) === f.day);
    assert(same.length >= f.at.length, `failure day ${f.day} has too few ${f.source} leads`);
    same.forEach((r, i) => {
      if (i < f.at.length) r.ts = oct(f.day, f.at[i][0], f.at[i][1]);
      else if (new Date(r.ts + 5 * 3_600_000).getUTCHours() === f.clearHour) r.ts += (f.shiftTo - f.clearHour) * 60 * MIN;
    });
  }
  raw.sort((a, b) => a.ts - b.ts);

  let waTurn = 0;
  const leads: Lead[] = raw.map((r, i) => ({
    id: `L${String(i + 1).padStart(3, "0")}`,
    ts: r.ts,
    source: r.source,
    client: rng.pick(NAMES),
    phone: phone(rng),
    need: "",
    manager: r.source === "ig" ? "aigerim" : r.source === "site" ? "daniyar" : waTurn++ % 2 === 0 ? "olga" : "timur",
    status: "work" as LeadStatus,
    repeats: [],
  }));

  const failures: Failure[] = [
    { id: "F1", start: oct(15, 14, 5), end: oct(15, 14, 45), source: "ig", what: "заявки из Instagram не доходили (сбой связи)", notifyTs: oct(15, 14, 15), doneTs: oct(15, 14, 46), leadIds: [] },
    { id: "F2", start: oct(21, 11, 40), end: oct(21, 11, 42), source: "site", what: "форма сайта не передала заявку с 3 попыток", notifyTs: oct(21, 11, 42), doneTs: oct(21, 11, 55), leadIds: [] },
    { id: "F3", start: oct(27, 16, 20), end: oct(27, 16, 35), source: "wa", what: "WhatsApp-провайдер не отвечал 15 минут", notifyTs: oct(27, 16, 25), doneTs: oct(27, 16, 35), leadIds: [] },
  ];
  for (const f of failures) {
    for (const l of leads) {
      if (l.source === f.source && l.ts >= f.start && l.ts <= f.end) {
        l.failureId = f.id;
        l.deliveredTs = f.doneTs;
        f.leadIds.push(l.id);
      }
    }
  }
  assert(failures.map((f) => f.leadIds.length).join() === "2,1,1", "failure leads");

  // 2. Lead statuses: 140 deals, 38 in work, 62 not target.
  const on30 = leads.filter((l) => octDay(l.ts) === 30);
  const at = (l: Lead) => hm(l.ts);
  for (const l of on30) l.status = ON_30_DEALS.includes(at(l)) ? "deal" : at(l) === ON_30_JUNK ? "junk" : "work";
  const before = leads.filter((l) => l.ts < oct(29, 17));
  const dealLeads = sample(rng, before, LEAD_STATUS_QUOTA.deal - ON_30_DEALS.length, (l) => (l.manager === "aigerim" ? 1.35 : 1));
  for (const l of dealLeads) l.status = "deal";
  const rest = leads.filter((l) => l.status === "work" && octDay(l.ts) < 30);
  const workLeft = LEAD_STATUS_QUOTA.work - on30.filter((l) => l.status === "work").length;
  const work = new Set(sample(rng, rest, workLeft, (l) => 1 + 4 * (octDay(l.ts) / 30) ** 2));
  for (const l of rest) l.status = work.has(l) ? "work" : "junk";
  for (const l of leads) {
    l.need = l.status === "junk" ? rng.pick(JUNK_NEEDS) : pickWeighted(rng, NEEDS).text;
  }
  const count = (s: LeadStatus) => leads.filter((l) => l.status === s).length;
  assert(count("deal") === LEAD_STATUS_QUOTA.deal && count("work") === LEAD_STATUS_QUOTA.work, "lead statuses");

  // 3. Repeats: 16 across the month plus the WhatsApp + Instagram merge on 30 October.
  for (const l of sample(rng, leads.filter((x) => x.ts < oct(29)), DUPLICATES - 1)) {
    const others = (["site", "wa", "ig"] as SourceId[]).filter((s) => s !== l.source);
    const ts = Math.min(l.ts + rng.int(30, 2 * 1440) * MIN, oct(30, 8, 0));
    l.repeats.push({ ts, source: rng.next() < 0.65 ? l.source : rng.pick(others) });
  }
  const merged = on30.find((l) => at(l) === ON_30_MERGE.at)!;
  merged.repeats.push({ ts: oct(30, ON_30_MERGE.repeat.h, ON_30_MERGE.repeat.m), source: ON_30_MERGE.repeat.source });
  assert(sum(leads.map((l) => l.repeats.length)) === DUPLICATES, "repeats");

  // 4. Deals: from October leads, carried over from August–September, abandoned since summer.
  const drafts: Draft[] = [];
  for (const l of leads.filter((x) => x.status === "deal")) {
    const base = l.deliveredTs ?? l.ts;
    let ts = base + rng.int(10, octDay(l.ts) === 30 ? 40 : 90) * MIN;
    const dn = dayNumber(ts);
    if (ts < atDay(dn, 10)) ts = atDay(dn, 10, rng.int(0, 40));
    else if (ts >= atDay(dn, 19)) ts = atDay(dn + 1, 10, rng.int(0, 40));
    const created: DealEvent = { ts, kind: "created", stage: 0 };
    drafts.push({
      client: l.client, need: l.need, amount: amountFor(rng, l.need), manager: l.manager, source: l.source,
      origin: "oct", leadId: l.id, created: ts, head: [created], start: { ts, stage: 0 }, notBefore: dayNumber(ts) + 1,
    });
  }

  const carryStageW = [0.1, 0.2, 0.25, 0.25, 0.2].map((w, stage) => ({ w, stage }));
  for (const m of M) {
    const n = CARRY_BY_MANAGER[m];
    const over = new Set(sample(rng, Array.from({ length: n }, (_, i) => i), QUOTA_DAY1[m]));
    for (let i = 0; i < n; i++) {
      // Over the norm on 1 October: about half urgent, the rest a day or two late on an early stage.
      const urgent = over.has(i) && rng.next() < 0.45;
      const s1 = over.has(i) && !urgent ? pickWeighted(rng, carryStageW.slice(0, 3)).stage : pickWeighted(rng, carryStageW).stage;
      const norm = STAGES[s1].norm;
      const idle = !over.has(i) ? rng.int(1, norm)
        : urgent ? Math.max(URGENT_DAYS, norm + 1) + rng.int(0, 5)
        : rng.int(norm + 1, URGENT_DAYS - 1);
      const last = workTime(rng, D1 - idle, 11, 17);
      const created = workTime(rng, Math.max(dayNumber(local(2026, 8, 2)), D1 - idle - rng.int(s1 + 2, s1 * 5 + 10)));
      const need = pickWeighted(rng, NEEDS).text;
      const head = [{ ts: created, kind: "created" as const, stage: 0 }, ...path(rng, m, created, 0, last, s1, "touch", dayNumber(created) + 1)];
      drafts.push({
        client: rng.pick(NAMES), need, amount: amountFor(rng, need), manager: m, source: rng.pick(["site", "wa", "ig"] as SourceId[]),
        origin: "carry", created, head, start: { ts: last, stage: s1 }, notBefore: D1,
      });
    }
  }

  for (const m of M) {
    for (let i = 0; i < ABANDONED_BY_MANAGER[m]; i++) {
      const created = workTime(rng, dayNumber(local(2026, 6, rng.int(1, 30))));
      const last = workTime(rng, Math.min(dayNumber(created) + rng.int(3, 30), dayNumber(local(2026, 7, 31))));
      const need = pickWeighted(rng, NEEDS).text;
      const head = [{ ts: created, kind: "created" as const, stage: 0 }, ...path(rng, m, created, 0, last, rng.int(0, 3), "touch", dayNumber(created) + 1)];
      drafts.push({
        client: rng.pick(NAMES), need, amount: amountFor(rng, need), manager: m, source: rng.pick(["site", "wa", "ig"] as SourceId[]),
        origin: "abandoned", created, head, start: { ts: last, stage: head[head.length - 1].stage }, notBefore: D1,
      });
    }
  }
  assert(drafts.filter((d) => d.origin === "carry").length === CARRY_OVER, "carry-over");
  assert(drafts.filter((d) => d.origin === "abandoned").length === ABANDONED, "abandoned");

  // 5. Final roles. Deals created on 30 October stay new; the rest are open at 9:00 on the 30th, won or lost.
  const newOn30 = drafts.filter((d) => d.origin === "oct" && octDay(d.created) === 30);
  const active = drafts.filter((d) => d.origin !== "abandoned" && !newOn30.includes(d));
  assert(newOn30.length === ON_30_DEALS.length, "deals created on 30 Oct");
  const cDay = (d: Draft) => (d.origin === "carry" ? 0 : octDay(d.created));
  const feasible = (d: Draft, stage: number, idle: number) => {
    const a = 30 - idle;
    if (d.origin === "carry") return stage >= d.start.stage && stage - d.start.stage <= a;
    const c = cDay(d);
    return a === c ? stage === 0 : a > c && stage <= a - c;
  };

  const open: Draft[] = [];
  for (const m of M) {
    const mine = active.filter((d) => d.manager === m);
    const forced = mine.filter((d) => cDay(d) >= 28);
    const pool = mine.filter((d) => !forced.includes(d));
    const picked = sample(rng, pool, OPEN_BY_MANAGER[m] - forced.length, (d) => (d.origin === "carry" ? 0.9 : 0.5 + (2 * cDay(d)) / 30));
    open.push(...forced, ...picked);
  }
  assert(open.length === OPEN_ON_30, "open on 30 Oct");
  const closed = active.filter((d) => !open.includes(d));
  assert(closed.length === WON_IN_OCT - WON_ON_30 + LOST_IN_OCT, "closed deals");

  const wonPool = closed.filter((d) => d.origin === "carry" || cDay(d) <= 24);
  const won = new Set(sample(rng, wonPool, WON_IN_OCT - WON_ON_30, (d) =>
    (d.origin === "carry" ? 1.5 : 1) * ({ aigerim: 1.6, daniyar: 1, olga: 1.1, timur: 0.7 } as const)[d.manager]));
  for (const d of closed) {
    const c = Math.max(cDay(d), 0);
    const s0 = d.start.stage;
    if (won.has(d)) {
      const minDay = d.origin === "carry" ? Math.max(1, 4 - s0) : c + 5;
      d.role = { kind: "won", ts: workTime(rng, D1 + rng.int(minDay, 29) - 1, 11, 17), stage: 4 };
    } else {
      const day = rng.int(d.origin === "carry" ? 1 : c + 1, 29);
      const room = d.origin === "carry" ? 4 : Math.min(4, day - c - 1);
      const lostW = [0.32, 0.3, 0.16, 0.13, 0.09].map((w, stage) => ({ w: stage >= s0 && stage <= Math.max(room, s0) ? w : 0, stage }));
      d.role = { kind: "lost", ts: workTime(rng, D1 + day - 1, 11, 17), stage: pickWeighted(rng, lostW).stage };
    }
  }

  // Open deals at 9:00 on 30 October: per-manager over-norm and urgent quotas, the showcase first.
  const openStageW = [0.15, 0.25, 0.25, 0.2, 0.15].map((w, stage) => ({ w, stage }));
  const urgentStageW = [0.1, 0.25, 0.3, 0.2, 0.15].map((w, stage) => ({ w, stage }));
  const overStageW = [0.4, 0.35, 0.25].map((w, stage) => ({ w, stage }));
  const overIdle = [[2, 4], [3, 4], [4, 4]] as const;
  const take = (pool: Draft[], draw: () => { stage: number; idle: number }, what: string) => {
    for (let tries = 0; tries < 200; tries++) {
      const { stage, idle } = draw();
      const fits = pool.filter((d) => !d.role && feasible(d, stage, idle));
      if (fits.length) {
        const d = rng.pick(fits);
        d.role = { kind: "open", stage, idle };
        return d;
      }
    }
    throw new Error(`demo data: no deal fits ${what}`);
  };
  for (const m of M) {
    const pool = open.filter((d) => d.manager === m);
    const q = QUOTA_DAY30[m];
    let urgent = q.urgent;
    if (m === "timur") {
      const d = take(pool, () => ({ stage: SHOWCASE.stage, idle: SHOWCASE.idle }), "the showcase");
      Object.assign(d, { client: SHOWCASE.client, need: SHOWCASE.need, amount: SHOWCASE.amount });
      urgent--;
    }
    for (let i = 0; i < urgent; i++) take(pool, () => ({ stage: pickWeighted(rng, urgentStageW).stage, idle: rng.int(URGENT_DAYS, 12) }), "urgent");
    for (let i = 0; i < q.over - q.urgent; i++) {
      take(pool, () => {
        const stage = pickWeighted(rng, overStageW).stage;
        return { stage, idle: rng.int(overIdle[stage][0], overIdle[stage][1]) };
      }, "over norm");
    }
    for (const d of pool.filter((x) => !x.role)) {
      let role: { stage: number; idle: number } | null = null;
      for (let tries = 0; tries < 30 && !role; tries++) {
        const stage = pickWeighted(rng, openStageW).stage;
        const idle = rng.int(1, STAGES[stage].norm);
        if (feasible(d, stage, idle)) role = { stage, idle };
      }
      for (let stage = 0; stage < STAGES.length && !role; stage++) {
        for (let idle = 1; idle <= STAGES[stage].norm && !role; idle++) if (feasible(d, stage, idle)) role = { stage, idle };
      }
      assert(role !== null, "no in-norm state fits");
      d.role = { kind: "open", ...role };
    }
  }
  // 30 October: 2 prepayments and 12 moves, only on deals within their norm.
  const inNorm = open.filter((d) => d.role?.kind === "open" && d.role.idle <= STAGES[d.role.stage].norm);
  const fourOk = inNorm.filter((d) => [1, 2, 3, 4].some((idle) => feasible(d, 4, idle)));
  for (const d of sample(rng, fourOk, WON_ON_30)) {
    const idles = [1, 2, 3, 4].filter((idle) => feasible(d, 4, idle));
    d.role = { kind: "open", stage: 4, idle: rng.pick(idles) };
    d.on30 = "won";
  }
  for (const d of sample(rng, inNorm.filter((x) => !x.on30 && x.role?.kind === "open" && x.role.stage < 4), MOVED_ON_30)) d.on30 = "move";

  // 6. Event timelines.
  for (const d of newOn30) d.role = { kind: "open", stage: 0, idle: 0 };
  const deals: Deal[] = [];
  for (const d of drafts) {
    let events = [...d.head];
    const r = d.role;
    if (d.origin === "abandoned" || !r) {
      // nothing after summer
    } else if (r.kind === "open") {
      if (d.origin !== "oct" || 30 - r.idle > cDay(d)) {
        const anchor = workTime(rng, D1 + 29 - r.idle, 11, 17);
        events.push(...path(rng, d.manager, d.start.ts, d.start.stage, anchor, r.stage, "touch", d.notBefore));
      }
      if (d.on30 === "won") events.push({ ts: workTime(rng, D1 + 29, 10, 18), kind: "won", stage: 4 });
      if (d.on30 === "move") events.push({ ts: workTime(rng, D1 + 29, 10, 18), kind: "stage", stage: r.stage + 1 });
    } else {
      events.push(...path(rng, d.manager, d.start.ts, d.start.stage, r.ts, r.stage, r.kind, d.notBefore));
    }
    events = events.sort((a, b) => a.ts - b.ts);
    deals.push({
      id: "", client: d.client, need: d.need, amount: d.amount, manager: d.manager, source: d.source,
      origin: d.origin, leadId: d.leadId, events,
    });
  }
  deals.sort((a, b) => a.events[0].ts - b.events[0].ts);
  deals.forEach((d, i) => (d.id = `D${1001 + i}`));
  const byLead = new Map(deals.filter((d) => d.leadId).map((d) => [d.leadId!, d]));
  for (const l of leads) {
    const d = byLead.get(l.id);
    if (d) {
      l.dealId = d.id;
      l.client = d.client; // the showcase renames its deal; the lead follows
      l.need = d.need;
    }
  }

  // 7. The 6 leads behind «Пришла новая заявка». №3 repeats the 18:52 lead, №5 hits a delivery failure.
  const last = on30.find((l) => at(l) === "18:52")!;
  const prepared: PreparedLead[] = [
    { n: 1, kind: "normal", source: "ig", client: "Сабина", phone: phone(rng), need: "Кухня угловая 3,6 м, МДФ", manager: "aigerim" },
    { n: 2, kind: "normal", source: "wa", client: "Арман", phone: phone(rng), need: "Шкаф-купе 2,4 м", manager: "timur" },
    { n: 3, kind: "duplicate", source: "wa", client: last.client, phone: last.phone, need: last.need, manager: last.manager, dupOf: last.id },
    { n: 4, kind: "normal", source: "ig", client: "Дана", phone: phone(rng), need: "Гардеробная 2×2 м", manager: "aigerim" },
    { n: 5, kind: "failure", source: "wa", client: "Нурлан", phone: phone(rng), need: "Кухня прямая 3,4 м, МДФ", manager: "olga" },
    { n: 6, kind: "normal", source: "site", client: "Алина", phone: phone(rng), need: "Кухня с островом, МДФ в эмали", manager: "daniyar" },
  ];

  return { leads, deals, failures, prepared };
}

let cache: DemoData | null = null;
export function demo(): DemoData {
  return (cache ??= generate());
}
