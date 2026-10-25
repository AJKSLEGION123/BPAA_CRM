// Fixed facts of the fictional «Демо-Кухни» month. Everything the UI shows is derived from these + the seed.

export const SEED = 20261030;

/** "Now" of the demo: Friday 30 October 2026, 19:30 in Almaty (UTC+5). Never moves. */
export const DEMO_NOW = Date.UTC(2026, 9, 30, 14, 30);

export const COMPANY = "Демо-Кухни";
export const CITY = "Алматы";

export type ManagerId = "aigerim" | "daniyar" | "olga" | "timur";
export const MANAGERS: { id: ManagerId; name: string }[] = [
  { id: "aigerim", name: "Айгерим" },
  { id: "daniyar", name: "Данияр" },
  { id: "olga", name: "Ольга" },
  { id: "timur", name: "Тимур" },
];
export const managerName = (id: ManagerId) => MANAGERS.find((m) => m.id === id)!.name;
/** Avatar colours, so a manager is recognisable at a glance on cards, chips and the chart. */
export const MANAGER_TONE: Record<ManagerId, { bg: string; ink: string }> = {
  aigerim: { bg: "#e3f2ec", ink: "#1e6b4f" },
  daniyar: { bg: "#e6ecfb", ink: "#2f4fa3" },
  olga: { bg: "#fbeee0", ink: "#9a4d0f" },
  timur: { bg: "#f3e6f7", ink: "#7a3290" },
};

export type SourceId = "site" | "wa" | "ig";
export const SOURCES: { id: SourceId; name: string }[] = [
  { id: "site", name: "Сайт" },
  { id: "wa", name: "WhatsApp" },
  { id: "ig", name: "Instagram" },
];
export const sourceName = (id: SourceId) => SOURCES.find((s) => s.id === id)!.name;

/** Open stages with their norm in days; won/lost are closed and have no norm. */
export const STAGES = [
  { id: 0, name: "Новая заявка", norm: 1 },
  { id: 1, name: "Консультация", norm: 2 },
  { id: 2, name: "Замер", norm: 3 },
  { id: 3, name: "Дизайн-проект и расчёт", norm: 4 },
  { id: 4, name: "Договор и предоплата", norm: 4 },
] as const;
export const URGENT_DAYS = 5; // norms are ≤ 4, so every urgent deal is also over its norm
export const ABANDONED_DAYS = 60;

// Lead volumes for October (unique leads; repeats are merged and counted separately).
export const LEAD_QUOTA: Record<SourceId, number> = { site: 60, wa: 115, ig: 65 };
export const LEADS_ON_30: Record<SourceId, number> = { site: 2, wa: 4, ig: 3 };
export const LEAD_STATUS_QUOTA = { deal: 140, work: 38, junk: 62 };
export const DUPLICATES = 17;

// Deals.
export const CARRY_OVER = 70; // open on 1 October, created in August–September
export const ABANDONED = 14; // last action no later than 31 July
export const WON_IN_OCT = 34;
export const LOST_IN_OCT = 78;
export const OPEN_ON_30 = 98;

/** Quotas at 9:00 on 1 and 30 October: over norm and urgent, per manager. */
export const QUOTA_DAY1: Record<ManagerId, number> = { timur: 12, daniyar: 7, olga: 2, aigerim: 4 };
export const QUOTA_DAY30: Record<ManagerId, { over: number; urgent: number }> = {
  timur: { over: 11, urgent: 4 },
  daniyar: { over: 6, urgent: 2 },
  olga: { over: 4, urgent: 1 },
  aigerim: { over: 3, urgent: 1 },
};
export const MOVED_ON_30 = 12;
export const WON_ON_30 = 2;
