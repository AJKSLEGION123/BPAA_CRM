// The BPAA price fields the demo shows, copied from bpaa/price_short.json (version 2026-10-24).
// The bot package is not here on purpose: it stays out of the demo until launch blocker 1 is cleared (ads_plan.md).
export const PRICE_DATE = "24.10.2026";

export const PACKAGES = {
  razbor: {
    name: "Разбор",
    full: "Разбор: где теряются клиенты",
    problem: "Клиенты теряются, а где и что чинить первым — непонятно.",
    price: 140_000,
    timeline: "1–2 недели",
    payment: "70 000 ₸ на старте, 70 000 ₸ после отчёта и созвона",
    href: "/razbor",
  },
  leads: {
    name: "Не терять заявки",
    full: "Не терять заявки",
    problem: "Заявки с сайта и из мессенджеров теряются по дороге к менеджеру.",
    price: 150_000,
    bySources: [150_000, 250_000, 350_000],
    timeline: "1–2 недели",
    timelineMulti: "2–3 недели",
    monthly: "Сервер 5 000–15 000 ₸ в месяц (0 ₸, если свой)",
    provider: "Нет WhatsApp-провайдера — от 6 000 ₸ в месяц за номер",
    href: "/zayavki",
  },
  control: {
    name: "Контроль продаж",
    full: "Контроль продаж в Bitrix24",
    problem: "Сделки неделями стоят у менеджеров, руководитель узнаёт об этом поздно.",
    price: 250_000,
    priceAfterRazbor: 220_000,
    timeline: "2–4 недели",
    monthly: "Сервер 5 000–15 000 ₸ в месяц (0 ₸, если свой)",
    href: "/sdelki",
  },
} as const;

/** Discount on «Контроль продаж» ordered within 30 days after the Разбор report. */
export const AFTER_RAZBOR_DISCOUNT = 30_000;

/** What the demo shows, priced by the list: «Не терять заявки» for 3 sources + «Контроль продаж». */
export const bundleShown = () => PACKAGES.leads.bySources[2] + PACKAGES.control.price;
