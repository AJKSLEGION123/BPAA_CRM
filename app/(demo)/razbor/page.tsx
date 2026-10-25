import Link from "next/link";
import { PackageLine, WhatIsShown } from "@/components/Blocks";
import { FIGURES, PLAN, RAZBOR_COMPANY } from "@/lib/demo/razbor";
import { fmtMoney } from "@/lib/demo/time";
import { PACKAGES } from "@/lib/prices";

export const metadata = { title: "Разбор" };

const P = PACKAGES.razbor;

export default function RazborPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[28px] font-extrabold leading-tight">Разбор</h1>
        <p className="mt-1 text-[17px] text-muted">{P.problem}</p>
      </header>
      <WhatIsShown id="razbor">
        Не знаете, где теряете клиентов? Смотрю ваши данные за 4 недели, ничего не меняю. Даю пять цифр и план.
      </WhatIsShown>
      <p className="text-[15px] font-semibold">
        Пример отчёта для другой вымышленной компании — «{RAZBOR_COMPANY}». Это не история «до и после».
      </p>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FIGURES.map((f) => (
          <li key={f.n} className="card p-4">
            <details>
              <summary className="cursor-pointer list-none">
                <span className="text-[14px] text-muted">{f.n}. {f.title}</span>
                <span className="mt-1 block text-[26px] font-extrabold leading-tight tabular-nums">{f.value}</span>
                <span className="block text-[14px] text-muted">{f.sub}</span>
                <span className="mt-2 inline-flex min-h-11 items-center text-[15px] font-semibold text-teal">Как посчитано +</span>
              </summary>
              <p className="text-[16px]">{f.how}</p>
            </details>
          </li>
        ))}
      </ol>

      <section className="card p-4 sm:p-5" data-tour="plan">
        <h2 className="text-[20px] font-bold">План</h2>
        <ol className="mt-3 space-y-3">
          {PLAN.map((s, i) => (
            <li key={s.title}>
              <Link href={PACKAGES[s.pkg].href} className="block rounded-[var(--radius)] border border-line p-3 hover:border-[#c6ccd6]">
                <span className="text-[17px] font-semibold">{i + 1}. {s.title}</span>
                <span className="block text-[16px]">{s.price} · {s.timeline} → цифра {s.figures.join(", ")}</span>
                {s.note && <span className="block text-[14px] text-muted">{s.note}</span>}
                <span className="mt-1 block text-[15px] font-semibold text-teal">Как это выглядит на «Демо-Кухнях» →</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="card p-4 sm:p-5">
        <h2 className="text-[20px] font-bold">Повторный замер</h2>
        <p className="mt-1 text-[16px]">Те же пять цифр через 30 дней после первого шага. Считаю я.</p>
        <p className="text-[15px] text-muted">Цифр «после» здесь нет: их честно считают только на ваших данных.</p>
      </section>

      <PackageLine
        line={`${P.name} · ${fmtMoney(P.price)} · ${P.timeline}`}
        more={[
          "Доступ к Bitrix24 или таблице — только на просмотр, ничего не меняю.",
          "Вашего времени — около 3–4 часов.",
          `Оплата: ${P.payment}.`,
          "Закажете «Контроль продаж» в течение 30 дней после отчёта — на 30 000 ₸ дешевле.",
        ]}
      />
    </div>
  );
}
