"use client";
// «Что вам интересно?»: optional package ticks priced by the list, then a prefilled chat link. Nothing goes to a server.
import { useMemo, useState } from "react";
import { COPY } from "@/lib/copy";
import { contactChannel, contactUrl } from "@/lib/contact";
import { fmtMoney } from "@/lib/demo/time";
import { AFTER_RAZBOR_DISCOUNT, PACKAGES } from "@/lib/prices";
import { Sheet } from "./Sheet";

export function CtaSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [razbor, setRazbor] = useState(false);
  const [leads, setLeads] = useState(false);
  const [sources, setSources] = useState(1);
  const [control, setControl] = useState(false);

  const { total, discount, names } = useMemo(() => {
    const names: string[] = [];
    let total = 0;
    if (razbor) { total += PACKAGES.razbor.price; names.push(PACKAGES.razbor.name); }
    if (leads) {
      total += PACKAGES.leads.bySources[sources - 1];
      names.push(`${PACKAGES.leads.name} (${sources} ${sources === 1 ? "источник" : "источника"})`);
    }
    if (control) { total += PACKAGES.control.price; names.push(PACKAGES.control.full); }
    const discount = razbor && control ? AFTER_RAZBOR_DISCOUNT : 0;
    return { total: total - discount, discount, names };
  }, [razbor, leads, sources, control]);

  const text = [COPY.ctaHello, names.length ? `${COPY.ctaWant} ${names.join(", ")}.` : "", COPY.ctaEnd].filter(Boolean).join(" ");

  return (
    <Sheet open={open} onClose={onClose} title={COPY.ctaTitle}>
      <p className="mb-3 text-[15px] text-muted">Отметьте, если хотите. Это не обязательно.</p>
      <div className="space-y-2">
        <Tick checked={razbor} onChange={setRazbor} label={PACKAGES.razbor.full} price={fmtMoney(PACKAGES.razbor.price)} />
        <Tick checked={leads} onChange={setLeads} label={PACKAGES.leads.name} price={fmtMoney(PACKAGES.leads.bySources[sources - 1])}>
          {leads && (
            <div className="mt-2 flex gap-2" role="group" aria-label="Сколько источников">
              {[1, 2, 3].map((n) => (
                <button key={n} type="button" className="chip" aria-pressed={sources === n} onClick={() => setSources(n)}>
                  {n} {n === 1 ? "источник" : "источника"}
                </button>
              ))}
            </div>
          )}
        </Tick>
        <Tick checked={control} onChange={setControl} label={PACKAGES.control.full} price={fmtMoney(PACKAGES.control.price)} />
      </div>
      {names.length > 0 && (
        <div className="mt-4 rounded-[var(--radius)] bg-surface-2 p-3 text-[15px]">
          {discount > 0 && (
            <p className="text-muted">−{fmtMoney(discount)}, если начать «Контроль продаж» в течение 30 дней после отчёта</p>
          )}
          <p className="font-semibold">Разовая оплата: {fmtMoney(total)}</p>
          {(leads || control) && <p className="text-muted">В месяц: {PACKAGES.leads.monthly.toLowerCase()}</p>}
        </div>
      )}
      <a href={contactUrl(text)} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-5 w-full">
        Открыть {contactChannel}
      </a>
      <p className="mt-3 text-[14px] text-muted">{COPY.ctaNote}</p>
      <p className="mt-1 text-[13px] text-muted">{COPY.priceSource}</p>
    </Sheet>
  );
}

function Tick({ checked, onChange, label, price, children }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; price: string; children?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-line p-3">
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="flex-1 text-[16px] font-medium">{label}</span>
        <span className="text-[15px] font-semibold tabular-nums">{price}</span>
      </label>
      {children}
    </div>
  );
}
