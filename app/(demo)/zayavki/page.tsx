import { PackageLine, WhatIsShown } from "@/components/Blocks";
import { LeadsView } from "@/components/LeadsView";
import { fmtMoney } from "@/lib/demo/time";
import { PACKAGES } from "@/lib/prices";

export const metadata = { title: "Заявки" };

const P = PACKAGES.leads;

export default function LeadsPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[28px] font-extrabold leading-tight">Заявки</h1>
        <p className="mt-1 text-[17px] text-muted">{P.problem}</p>
      </header>
      <WhatIsShown id="zayavki">
        Заявки с сайта, из WhatsApp и Instagram сами попадают в Bitrix24 или таблицу. У каждой есть ответственный, ему
        приходит сообщение в Telegram. Повтор не создаёт новую заявку.
      </WhatIsShown>
      <LeadsView />
      <PackageLine
        line={`${P.name} · от ${fmtMoney(P.price)} · ${P.timeline}`}
        more={[
          `В демо 3 источника — это ${fmtMoney(P.bySources[2])}, срок ${P.timelineMulti}.`,
          "Сайт или провайдер уже передают заявки сами — скажу, пакет не нужен.",
          "Звонки пакет не ловит, их вносит менеджер.",
          "Клиентам этот пакет не отвечает.",
          "В демо: Instagram — Айгерим, сайт — Данияр, WhatsApp — по очереди Ольга и Тимур.",
          `${P.monthly}.`,
          `${P.provider}.`,
        ]}
      />
    </div>
  );
}
