"use client";
// First-visit tour: cards at the bottom, no dimming, «Пропустить» always visible. Own code, no library.
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDemoStore } from "@/lib/local";
import { CtaButton } from "./CtaButton";

type Step = { text: string; href?: string; target?: string };

export function Tour({ restart, showcaseId }: { restart: boolean; showcaseId: string }) {
  const steps: Step[] = [
    { text: "Это вымышленная мастерская «Демо-Кухни», октябрь 2026. Так пакеты BPAA выглядят в работе — это не отдельная CRM." },
    { text: "Сделки неделями стоят? В 9:00, 13:00 и 19:00 вам приходит вот это.", href: "/", target: "feed" },
    { text: "Нажмите «Отметить действие» — так выглядит сделка в вашем Bitrix24.", href: `/sdelki?deal=${showcaseId}`, target: "mark" },
    { text: "Заявки теряются по дороге? Нажмите «Пришла новая заявка».", href: "/zayavki", target: "new-lead" },
    { text: "Не знаете, с чего начать? Разбор: пять цифр и план.", href: "/razbor", target: "plan" },
  ];
  const { state, update } = useDemoStore();
  const path = usePathname();
  const router = useRouter();
  const [closed, setClosed] = useState(false);
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState<string | null>(null);
  // Starts by itself until it has been finished or skipped once; the menu restarts it.
  const active = !closed && (restart || (!!state && !state.tourDone));

  // Outline the block the current card talks about, once it is on the page.
  useEffect(() => {
    if (!active || !shown) return;
    let el: Element | null = null;
    let tries = 0;
    const id = window.setInterval(() => {
      el = document.querySelector(`[data-tour="${shown}"]`);
      if (el || ++tries > 40) {
        window.clearInterval(id);
        el?.setAttribute("data-tour-active", "true");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
    return () => {
      window.clearInterval(id);
      document.querySelectorAll("[data-tour-active]").forEach((x) => x.removeAttribute("data-tour-active"));
    };
  }, [active, shown, path]);

  if (!active) return null;
  const s = steps[step];
  const last = step === steps.length - 1;
  const finish = () => {
    setClosed(true);
    setShown(null);
    update((x) => ({ ...x, tourDone: true }));
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 px-3 sm:bottom-6">
      <div className="rise pointer-events-auto mx-auto max-w-md rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-xl" role="dialog" aria-label="Как устроено демо">
        <div className="mb-2 flex items-center justify-between text-[13px] text-muted">
          <span>{step + 1} из {steps.length}</span>
          <button type="button" className="min-h-11 px-2 font-semibold" onClick={finish}>Пропустить</button>
        </div>
        <p className="text-[16px] leading-snug">{s.text}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {s.href && (
            <button type="button" className="btn btn-ghost" onClick={() => { router.push(s.href!); setShown(s.target ?? null); }}>
              Показать
            </button>
          )}
          {last ? (
            <>
              <CtaButton />
              <button type="button" className="btn btn-ghost" onClick={finish}>Готово</button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => { setStep(step + 1); setShown(null); }}>
              Дальше
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
