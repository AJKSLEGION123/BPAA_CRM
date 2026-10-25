// Texts of the Telegram messages on «Сегодня». Every number comes from the selectors.
import { MANAGERS, STAGES, managerName, sourceName, type ManagerId } from "./config";
import { demo } from "./generate";
import { daySummary, leadsOfDay, snapshot, urgentList, overList, type DealRow } from "./selectors";
import { oct, plural, weekday } from "./time";

export type Recipient = "head" | ManagerId;
export const RECIPIENTS: { id: Recipient; name: string }[] = [{ id: "head", name: "Руководитель" }, ...MANAGERS];
export const DAYS = [30, 15, 1] as const;
export type FeedDay = (typeof DAYS)[number];

export type TgLine = { text: string; dealId?: string };
export type TgMessage = {
  id: string;
  ts: number;
  slot?: "9" | "13" | "19";
  title: string;
  lines: TgLine[];
  button?: { label: string; href: string };
};

const WEEKDAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];

const FAILURE_TEXT: Record<string, { alert: string; done: string }> = {
  F1: { alert: "С 14:05 заявки из Instagram не доходят. Слежу, сообщу, когда дойдут.", done: "Дошли 2 заявки, обе с ответственным." },
  F2: { alert: "Форма сайта не передала заявку с 3 попыток. Данияр, внесите её вручную.", done: "Заявка внесена вручную, ответственный Данияр." },
  F3: { alert: "С 16:20 не отвечает WhatsApp-провайдер. Слежу, сообщу, когда заявки дойдут.", done: "Дошла 1 заявка, с ответственным." },
};
const dealLine = (r: DealRow, withManager: boolean): TgLine => ({
  text: [r.deal.client, STAGES[r.state.stage].name, `${r.state.daysIdle} дн.`, withManager ? managerName(r.deal.manager) : ""]
    .filter(Boolean).join(" · "),
  dealId: r.deal.id,
});

export function feed(day: FeedDay, to: Recipient): TgMessage[] {
  const m = to === "head" ? undefined : to;
  const out: TgMessage[] = [];

  // 9:00
  const at9 = oct(day, 9);
  const s = snapshot(at9);
  if (!m) {
    const byManager = MANAGERS.map((x) => ({ name: x.name, n: s.byManager[x.id].over })).sort((a, b) => b.n - a.n)
      .map((x) => `${x.name} ${x.n}`).join(" · ");
    out.push({
      id: `d${day}-9`, ts: at9, slot: "9", title: `Сводка на 9:00, ${WEEKDAYS[weekday(at9)]} ${day} октября`,
      lines: [
        { text: `Открытых сделок: ${s.open}` },
        { text: `Стоят дольше нормы: ${s.over} — ${byManager}` },
        { text: `Срочно, 5 дней и больше без действий: ${s.urgent}` },
        { text: `Брошены, больше 60 дней: ${s.abandoned}` },
      ],
      button: { label: "Показать список", href: "/sdelki" },
    });
  } else {
    const mine = s.byManager[m];
    const list = overList(at9, m);
    out.push({
      id: `d${day}-9`, ts: at9, slot: "9", title: `${managerName(m)}, сводка на 9:00`,
      lines: [
        { text: `У вас дольше нормы: ${mine.over}, срочно: ${mine.urgent}` },
        ...list.slice(0, 3).map((r) => dealLine(r, false)),
        ...(list.length > 3 ? [{ text: `ещё ${list.length - 3}` }] : []),
      ],
    });
  }

  // New leads go to their manager; the head sees them in the 19:00 report.
  if (m) {
    for (const l of leadsOfDay(day).filter((x) => x.manager === m && x.ts < oct(day, 19, 30))) {
      const ts = l.deliveredTs ?? l.ts;
      out.push({
        id: l.id, ts, title: `Новая заявка · ${sourceName(l.source)}`,
        lines: [{ text: `${l.client} · ${l.need}` }, { text: l.phone }, { text: `Ответственный: ${managerName(l.manager)}` }],
      });
    }
  }

  // Delivery failures: to the head and to the manager of that source.
  for (const f of demo().failures.filter((x) => oct(day) <= x.start && x.start < oct(day + 1))) {
    const owners = new Set(demo().leads.filter((l) => f.leadIds.includes(l.id)).map((l) => l.manager));
    if (m && !owners.has(m)) continue;
    const text = FAILURE_TEXT[f.id];
    out.push({ id: `${f.id}-a`, ts: f.notifyTs, title: "Сбой", lines: [{ text: text.alert }] });
    out.push({ id: `${f.id}-b`, ts: f.doneTs, title: "Сбой закончился", lines: [{ text: text.done }] });
  }

  // 13:00
  const at13 = oct(day, 13);
  const urgent = urgentList(at13, m);
  out.push({
    id: `d${day}-13`, ts: at13, slot: "13",
    title: urgent.length
      ? `Срочно: ${urgent.length} ${plural(urgent.length, "сделка", "сделки", "сделок")} без действий 5 дней и больше`
      : "Срочных сделок нет",
    lines: urgent.map((r) => dealLine(r, !m)),
  });

  // 19:00
  const at19 = oct(day, 19);
  const sum = daySummary(day);
  const leads = m ? leadsOfDay(day, at19).filter((l) => l.manager === m) : leadsOfDay(day, at19);
  const src = (["site", "wa", "ig"] as const).map((id) => `${sourceName(id)} ${leads.filter((l) => l.source === id).length}`)
    .join(", ").replace("Сайт", "сайт");
  const overAt19 = m ? snapshot(at19).byManager[m].over : sum.over;
  out.push({
    id: `d${day}-19`, ts: at19, slot: "19", title: `Итог дня, ${day} октября`,
    lines: [
      { text: `Заявок: ${leads.length} — ${src}. Без ответственного: 0` },
      ...(m ? [] : [{ text: `Сделок сдвинуто: ${sum.moved}` }, { text: `Предоплат: ${sum.prepayments}` }]),
      { text: `Стоят дольше нормы: ${overAt19}` },
    ],
  });

  return out.sort((a, b) => a.ts - b.ts);
}
