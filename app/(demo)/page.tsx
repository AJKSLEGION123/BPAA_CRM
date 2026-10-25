import { ArrowRight, FileChartColumn, Inbox, SquareKanban } from "lucide-react";
import Link from "next/link";
import { CtaButton } from "@/components/CtaButton";
import { TgFeed } from "@/components/TgFeed";
import { COPY } from "@/lib/copy";
import { DAYS, RECIPIENTS, feed, type FeedDay, type Recipient } from "@/lib/demo/messages";
import { leadTiles, snapshot } from "@/lib/demo/selectors";
import { fmtMoney, oct } from "@/lib/demo/time";
import { PACKAGES, bundleShown } from "@/lib/prices";

export const metadata = { title: "Сегодня" };

const SLOTS = [
  { id: "m9", label: "9:00", what: "сводка" },
  { id: "m13", label: "13:00", what: "срочные" },
  { id: "m19", label: "19:00", what: "итог дня" },
];

export default async function TodayPage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  // Both parameters are checked against a whitelist; anything else falls back to the default.
  const day = (DAYS as readonly number[]).includes(Number(sp.day)) ? (Number(sp.day) as FeedDay) : 30;
  const to = (RECIPIENTS.find((r) => r.id === sp.as)?.id ?? "head") as Recipient;
  const href = (d: number, a: Recipient) => {
    const q = new URLSearchParams();
    if (d !== 30) q.set("day", String(d));
    if (a !== "head") q.set("as", a);
    const s = q.toString();
    return `/${s ? `?${s}` : ""}#feed`;
  };

  const leads = leadTiles("today");
  const at9 = snapshot(oct(30, 9));
  const cards = [
    {
      pkg: PACKAGES.leads, icon: Inbox,
      today: `Сегодня ${leads.total} заявок, у всех есть ответственный`,
      price: `${PACKAGES.leads.name} · ${fmtMoney(PACKAGES.leads.price)} за источник`,
    },
    {
      pkg: PACKAGES.control, icon: SquareKanban,
      today: `На 9:00 дольше нормы стоят ${at9.over}, срочно — ${at9.urgent}`,
      price: `${PACKAGES.control.full} · ${fmtMoney(PACKAGES.control.price)}`,
    },
    {
      pkg: PACKAGES.razbor, icon: FileChartColumn,
      today: "Пример отчёта: пять цифр и план",
      price: `${PACKAGES.razbor.name} · ${fmtMoney(PACKAGES.razbor.price)}`,
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Пятница, 30 октября, 19:30 · «Демо-Кухни», Алматы</p>
        <h1 className="mt-1 text-[28px] font-extrabold leading-tight sm:text-[34px]">Вот что вы будете видеть каждый день</h1>
        <p className="mt-2 max-w-2xl text-[17px] text-muted">{COPY.notCrm}</p>
      </header>

      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link key={c.pkg.href} href={c.pkg.href} className="card group flex flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                <span className="mb-3 grid h-10 w-10 place-items-center rounded-[12px] bg-accent-soft text-accent" aria-hidden><Icon size={20} /></span>
                <p className="text-[15px] text-muted">{c.pkg.problem}</p>
                <p className="mt-2 text-[19px] font-bold leading-snug">{c.today}</p>
                <p className="mt-auto flex items-center gap-1 pt-4 text-[15px] font-semibold text-teal">
                  <span>{c.price}</span>
                  <ArrowRight size={16} className="shrink-0 transition group-hover:translate-x-0.5" aria-hidden />
                </p>
              </Link>
            );
          })}
        </div>
        <p className="text-[15px]">
          В демо включено: Не терять заявки (3 источника) и Контроль продаж — по прайсу {fmtMoney(bundleShown())}
          <span className="block text-[13px] text-muted">{COPY.priceSource}</span>
        </p>
      </div>

      <section id="feed" data-tour="feed" className="grid scroll-mt-28 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)] lg:items-start">
        <div className="space-y-4 lg:sticky lg:top-16">
          <div>
            <h2 className="text-[22px] font-bold">Пример сообщения в Telegram</h2>
            <p className="mt-1 text-[16px] text-muted">
              Бот сам считает заявки и сделки и пишет в 9:00, 13:00 и 19:00. Выберите день и кому пришло.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-[14px] font-semibold text-muted">День</p>
            <div className="scroll-x -mx-4 flex gap-2 px-4 lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label="День">
              {DAYS.map((d) => (
                <Link key={d} href={href(d, to)} className="chip" aria-current={d === day ? "page" : undefined} scroll={false}>
                  {d} октября
                </Link>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[14px] font-semibold text-muted">Кому пришло</p>
            <div className="scroll-x -mx-4 flex gap-2 px-4 lg:mx-0 lg:flex-wrap lg:px-0" role="group" aria-label="Кому пришло">
              {RECIPIENTS.map((r) => (
                <Link key={r.id} href={href(day, r.id)} className="chip" aria-current={r.id === to ? "page" : undefined} scroll={false}>
                  {r.name}
                </Link>
              ))}
            </div>
            <p className="text-[14px] text-muted">
              {to === "head" ? "Руководитель видит всё." : "Менеджер видит только свои сделки и свои новые заявки."} {COPY.feedNote}.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-[14px] font-semibold text-muted">Перейти к сообщению</p>
            <div className="flex flex-wrap gap-2">
              {SLOTS.map((s) => (
                <a key={s.id} href={`#${s.id}`} className="chip">{s.label} · {s.what}</a>
              ))}
            </div>
          </div>
          <div className="hidden pt-2 lg:block">
            <CtaButton />
            <p className="mt-2 text-[14px] text-muted">Бесплатный созвон 30–60 минут: назову пакет и цену из прайса.</p>
          </div>
        </div>
        <TgFeed messages={feed(day, to)} />
      </section>

      <div className="flex flex-col gap-2 lg:hidden">
        <CtaButton />
        <p className="text-[14px] text-muted">Бесплатный созвон 30–60 минут: назову пакет и цену из прайса.</p>
      </div>
    </div>
  );
}
