import { PackageLine, WhatIsShown } from "@/components/Blocks";
import { DealsView } from "@/components/DealsView";
import { demo } from "@/lib/demo/generate";
import { series } from "@/lib/demo/selectors";
import { fmtMoney } from "@/lib/demo/time";
import { PACKAGES } from "@/lib/prices";

export const metadata = { title: "Сделки" };

const P = PACKAGES.control;

export default async function DealsPage({ searchParams }: PageProps<"/sdelki">) {
  const sp = await searchParams;
  const id = typeof sp.deal === "string" && demo().deals.some((d) => d.id === sp.deal) ? sp.deal : undefined;
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[28px] font-extrabold leading-tight">Сделки</h1>
        <p className="mt-1 text-[17px] text-muted">{P.problem}</p>
      </header>
      <WhatIsShown id="sdelki">
        Так выглядят сделки в Bitrix24. Бот каждый день считает, какие стоят дольше нормы, и пишет вам и менеджерам.
        Сделки бот только читает.
      </WhatIsShown>
      <DealsView series={series()} initialDeal={id} />
      <PackageLine
        line={`${P.full} · ${fmtMoney(P.price)} · ${P.timeline}`}
        more={[
          "До оплаты проверяю, можно ли на вашем тарифе Bitrix24 подключить бота.",
          "Нормы по этапам задаём вместе.",
          "Менеджер видит только свои сделки.",
          `${P.monthly}.`,
        ]}
      />
    </div>
  );
}
