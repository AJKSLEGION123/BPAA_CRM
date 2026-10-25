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
  { id: "m9", label: "9:00" },
  { id: "m13", label: "13:00" },
  { id: "m19", label: "19:00" },
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
      pkg: PACKAGES.leads,
      today: `Сегодня ${leads.total} заявок, у всех есть ответственный`,
      price: `${PACKAGES.leads.name} · ${fmtMoney(PACKAGES.leads.price)} за источник`,
    },
    {
      pkg: PACKAGES.control,
      today: `На 9:00 дольше нормы стоят ${at9.over}, срочно — ${at9.urgent}`,
      price: `${PACKAGES.control.full} · ${fmtMoney(PACKAGES.control.price)}`,
    },
    {
      pkg: PACKAGES.razbor,
      today: "Пример отчёта: пять цифр и план",
      price: `${PACKAGES.razbor.name} · ${fmtMoney(PACKAGES.razbor.price)}`,
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Пятница, 30 октября, 19:30 · «Демо-Кухни», Алматы</p>
        <h1 className="mt-1 text-[28px] font-extrabold leading-tight sm:text-[34px]">Вот что вы будете видеть каждый день</h1>
        <p className="mt-2 max-w-2xl text-[17px] text-muted">{COPY.notCrm}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.pkg.href} href={c.pkg.href} className="card group flex flex-col p-4 transition hover:border-[#c6ccd6]">
            <p className="text-[16px] text-muted">{c.pkg.problem}</p>
            <p className="mt-3 text-[19px] font-bold leading-snug">{c.today}</p>
            <p className="mt-auto pt-4 text-[15px] font-semibold text-teal">{c.price} →</p>
          </Link>
        ))}
      </div>
      <p className="text-[15px]">
        В демо включено: Не терять заявки (3 источника) и Контроль продаж — по прайсу {fmtMoney(bundleShown())}
        <span className="block text-[13px] text-muted">{COPY.priceSource}</span>
      </p>

      <section id="feed" data-tour="feed" className="scroll-mt-28 space-y-3">
        <h2 className="text-[22px] font-bold">Пример сообщения в Telegram</h2>
        <div className="space-y-2">
          <div className="scroll-x -mx-4 flex gap-2 px-4" role="group" aria-label="День">
            {DAYS.map((d) => (
              <Link key={d} href={href(d, to)} className="chip" aria-current={d === day ? "page" : undefined} scroll={false}>
                {d} окт
              </Link>
            ))}
            <span className="mx-1 w-px shrink-0 bg-line" aria-hidden />
            {SLOTS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="chip">{s.label}</a>
            ))}
          </div>
          <div className="scroll-x -mx-4 flex gap-2 px-4" role="group" aria-label="Кому пришло">
            {RECIPIENTS.map((r) => (
              <Link key={r.id} href={href(day, r.id)} className="chip" aria-current={r.id === to ? "page" : undefined} scroll={false}>
                {r.name}
              </Link>
            ))}
          </div>
        </div>
        <p className="text-[14px] text-muted">
          {to === "head" ? "Руководитель видит всё." : "Менеджер видит только свои сделки и свои новые заявки."} {COPY.feedNote}.
        </p>
        <TgFeed messages={feed(day, to)} />
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <CtaButton />
        <p className="text-[14px] text-muted">Бесплатный созвон 30–60 минут: назову пакет и цену из прайса.</p>
      </div>
    </div>
  );
}
