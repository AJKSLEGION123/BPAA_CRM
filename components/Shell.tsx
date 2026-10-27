"use client";
// Frame of every demo page. Wide screens: sidebar like a work tool. Phones: header + bottom tabs.
// The honesty strip sits on top everywhere and cannot be closed.
import { CalendarDays, Ellipsis, FileChartColumn, Inbox, Info, LogOut, RotateCcw, Shield, SquareKanban, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { COPY } from "@/lib/copy";
import { contactLabel } from "@/lib/contact";
import { LoginContext, useDemoStore } from "@/lib/local";
import { ShellContext } from "./CtaButton";
import { CtaSheet } from "./CtaSheet";
import { Sheet } from "./Sheet";
import { Tour } from "./Tour";

export const TABS: { href: string; label: string; icon: LucideIcon; hint: string }[] = [
  { href: "/", label: "Сегодня", icon: CalendarDays, hint: "Сводки в Telegram" },
  { href: "/zayavki", label: "Заявки", icon: Inbox, hint: "Не терять заявки" },
  { href: "/sdelki", label: "Сделки", icon: SquareKanban, hint: "Контроль продаж" },
  { href: "/razbor", label: "Разбор", icon: FileChartColumn, hint: "Пять цифр и план" },
];

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

type Actions = { onTour: () => void; onReal: () => void; onReset: () => void };

export function Shell({ login, admin, showcaseId, children }: { login: string; admin: boolean; showcaseId: string; children: ReactNode }) {
  usePageViews(admin);
  const [cta, setCta] = useState(false);
  const [real, setReal] = useState(false);
  const [tourKey, setTourKey] = useState(0);
  const { reset } = useDemoStore();
  const actions: Actions = { onTour: () => setTourKey((k) => k + 1), onReal: () => setReal(true), onReset: reset };

  return (
    <LoginContext value={login}>
      <ShellContext value={{ openCta: () => setCta(true) }}>
        <div className="sticky top-0 z-30 flex h-9 items-center justify-between gap-3 bg-ink px-4 text-[13px] text-white">
          <span className="font-semibold">{COPY.strip}</span>
          <button type="button" onClick={() => setCta(true)} className="font-semibold text-[#ffb27d] underline-offset-2 hover:underline">
            {COPY.stripCta}
          </button>
        </div>
        <div className="lg:flex">
          <Sidebar actions={actions} admin={admin} onCta={() => setCta(true)} />
          <div className="min-w-0 flex-1">
            <Header actions={actions} admin={admin} />
            <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:pb-12 lg:px-8 lg:pt-8">{children}</main>
            <footer className="mx-auto max-w-6xl space-y-1 px-4 pb-28 text-[13px] text-muted sm:pb-10 lg:px-8">
              <p>{COPY.footerWho}</p>
              <p>{COPY.footerTm}</p>
            </footer>
          </div>
        </div>
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

function Logo() {
  return (
    <Link href="/" className="flex flex-col">
      <span className="text-[22px] font-extrabold leading-none tracking-tight">BPAA<span className="text-accent">.</span></span>
      <span className="mt-1 text-[13px] text-muted">«Демо-Кухни», Алматы</span>
    </Link>
  );
}

function Sidebar({ actions, admin, onCta }: { actions: Actions; admin: boolean; onCta: () => void }) {
  const path = usePathname();
  const small = "flex min-h-10 w-full items-center gap-2 rounded-[var(--radius)] px-3 text-left text-[14px] text-muted hover:bg-surface-2 hover:text-ink";
  return (
    <aside className="sticky top-9 hidden h-[calc(100vh-36px)] w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
      <Logo />
      <nav className="mt-8 space-y-1" aria-label="Разделы">
        {TABS.map((t) => {
          const on = isActive(path, t.href);
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}
              className={`flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 ${on ? "bg-accent-soft text-accent" : "text-ink hover:bg-surface-2"}`}>
              <Icon size={20} strokeWidth={2} aria-hidden />
              <span className="flex flex-col">
                <span className="text-[16px] font-semibold leading-tight">{t.label}</span>
                <span className={`text-[13px] leading-tight ${on ? "text-accent/80" : "text-muted"}`}>{t.hint}</span>
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-1">
        {admin && <Link href="/admin" className={small}><Shield size={16} aria-hidden />Админка: доступы и входы</Link>}
        <button type="button" className={small} onClick={actions.onTour}><Info size={16} aria-hidden />Как устроено демо</button>
        <button type="button" className={small} onClick={actions.onReal}><Info size={16} aria-hidden />{COPY.realTitle}</button>
        <button type="button" className={small} onClick={actions.onReset}><RotateCcw size={16} aria-hidden />Сбросить демо</button>
        <form method="post" action="/api/logout">
          <button type="submit" className={small}><LogOut size={16} aria-hidden />Выйти</button>
        </form>
        <button type="button" onClick={onCta} className="btn btn-primary mt-3 h-auto min-h-[var(--control-h)] w-full whitespace-normal px-3 py-2 text-[15px] leading-tight">{contactLabel}</button>
      </div>
    </aside>
  );
}

function Header({ actions, admin }: { actions: Actions; admin: boolean }) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const box = useRef<HTMLDivElement>(null);

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

  const item = "flex min-h-11 w-full items-center gap-3 px-4 text-left text-[16px] hover:bg-surface-2";
  return (
    <header className="sticky top-9 z-20 border-b border-line bg-surface/95 backdrop-blur lg:hidden">
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
            <Ellipsis size={20} aria-hidden />
          </button>
          {menu && (
            <div className="rise absolute right-0 top-12 w-64 overflow-hidden rounded-[var(--radius)] border border-line bg-surface py-1 shadow-lg" role="menu">
              {admin && <Link role="menuitem" href="/admin" className={item} onClick={() => setMenu(false)}><Shield size={18} aria-hidden />Админка</Link>}
              <button role="menuitem" className={item} onClick={() => { setMenu(false); actions.onTour(); }}><Info size={18} aria-hidden />Как устроено демо</button>
              <button role="menuitem" className={item} onClick={() => { setMenu(false); actions.onReal(); }}><Info size={18} aria-hidden />{COPY.realTitle}</button>
              <button role="menuitem" className={item} onClick={() => { setMenu(false); actions.onReset(); }}><RotateCcw size={18} aria-hidden />Сбросить демо</button>
              <form method="post" action="/api/logout">
                <button role="menuitem" className={item} type="submit"><LogOut size={18} aria-hidden />Выйти</button>
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
        const Icon = t.icon;
        return (
          <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined}
            className={`flex h-16 flex-col items-center justify-center gap-1 text-[13px] font-semibold ${on ? "text-accent" : "text-muted"}`}>
            <Icon size={22} strokeWidth={on ? 2.4 : 2} aria-hidden />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Counts which tabs a prospect opens (shown on /admin). Pavel's own visits are not counted. */
function usePageViews(admin: boolean) {
  const path = usePathname();
  useEffect(() => {
    if (admin) return;
    try {
      navigator.sendBeacon("/api/track", path);
    } catch {
      // no beacon support: the demo works the same, the visit is just not counted
    }
  }, [path, admin]);
}
