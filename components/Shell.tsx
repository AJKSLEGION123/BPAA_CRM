"use client";
// Frame of every demo page: honesty strip, header with tabs and menu, footer, bottom nav, CTA sheet and tour.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { COPY } from "@/lib/copy";
import { LoginContext, useDemoStore } from "@/lib/local";
import { ShellContext } from "./CtaButton";
import { CtaSheet } from "./CtaSheet";
import { Sheet } from "./Sheet";
import { Tour } from "./Tour";

export const TABS = [
  { href: "/", label: "Сегодня" },
  { href: "/zayavki", label: "Заявки" },
  { href: "/sdelki", label: "Сделки" },
  { href: "/razbor", label: "Разбор" },
] as const;

export function Shell({ login, showcaseId, children }: { login: string; showcaseId: string; children: ReactNode }) {
  const [cta, setCta] = useState(false);
  const [real, setReal] = useState(false);
  const [tourKey, setTourKey] = useState(0);

  return (
    <LoginContext value={login}>
      <ShellContext value={{ openCta: () => setCta(true) }}>
        <div className="sticky top-0 z-30">
          <div className="flex h-9 items-center justify-between gap-3 bg-ink px-4 text-[13px] text-white">
            <span className="font-semibold">{COPY.strip}</span>
            <button type="button" onClick={() => setCta(true)} className="font-semibold text-[#ffb27d] underline-offset-2 hover:underline">
              {COPY.stripCta}
            </button>
          </div>
          <Header onReal={() => setReal(true)} onTour={() => setTourKey((k) => k + 1)} />
        </div>
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:pb-12">{children}</main>
        <footer className="mx-auto max-w-6xl space-y-1 px-4 pb-28 text-[13px] text-muted sm:pb-10">
          <p>{COPY.footerWho}</p>
          <p>{COPY.footerTm}</p>
        </footer>
        <BottomNav />
        <CtaSheet open={cta} onClose={() => setCta(false)} />
        <Sheet open={real} onClose={() => setReal(false)} title={COPY.realTitle}>
          <ul className="space-y-2 text-[16px]">
            {COPY.real.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </Sheet>
        <Tour key={tourKey} restart={tourKey > 0} showcaseId={showcaseId} />
      </ShellContext>
    </LoginContext>
  );
}

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

function Header({ onReal, onTour }: { onReal: () => void; onTour: () => void }) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const { reset } = useDemoStore();

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  const item = "flex min-h-11 w-full items-center px-4 text-left text-[16px] hover:bg-surface-2";
  return (
    <header className="border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold tracking-tight">BPAA<span className="text-accent">.</span></span>
          <span className="text-[14px] text-muted">«Демо-Кухни», Алматы</span>
        </Link>
        <nav className="ml-6 hidden gap-1 sm:flex" aria-label="Разделы">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className="chip" aria-current={isActive(path, t.href) ? "page" : undefined}>
              {t.label}
            </Link>
          ))}
        </nav>
        <div ref={box} className="relative ml-auto">
          <button type="button" className="btn btn-ghost w-11 px-0" aria-label="Меню" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
            ⋯
          </button>
          {menu && (
            <div className="rise absolute right-0 top-12 w-64 overflow-hidden rounded-[var(--radius)] border border-line bg-surface py-1 shadow-lg" role="menu">
              <button role="menuitem" className={item} onClick={() => { setMenu(false); onTour(); }}>Как устроено демо</button>
              <button role="menuitem" className={item} onClick={() => { setMenu(false); onReal(); }}>{COPY.realTitle}</button>
              <button role="menuitem" className={item} onClick={() => { setMenu(false); reset(); }}>Сбросить демо</button>
              <form method="post" action="/api/logout">
                <button role="menuitem" className={item} type="submit">Выйти</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden" aria-label="Разделы">
      {TABS.map((t) => {
        const on = isActive(path, t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}
            className={`flex h-14 items-center justify-center text-[15px] font-semibold ${on ? "text-accent" : "text-muted"}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
