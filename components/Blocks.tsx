"use client";
// Small blocks repeated on every tab: «Что здесь показано», the package line with «Подробнее», number tiles.
import { useEffect, useState, type ReactNode } from "react";
import { COPY } from "@/lib/copy";
import { useDemoStore } from "@/lib/local";
import { CtaButton } from "./CtaButton";

/** Open on the first visit to the tab, folded afterwards (remembered in `seen`). */
export function WhatIsShown({ id, children }: { id: string; children: ReactNode }) {
  const { state, update } = useDemoStore();
  const [toggled, setToggled] = useState<boolean | null>(null);
  const unseen = !!state && !state.seen.includes(id);
  const open = toggled ?? unseen;
  const setOpen = (v: boolean) => setToggled(v);

  useEffect(() => {
    if (!unseen) return;
    // Remember the visit, but keep the block open until the visitor folds it or leaves the tab.
    const t = window.setTimeout(() => {
      setToggled(true);
      update((s) => ({ ...s, seen: [...s.seen, id] }));
    }, 0);
    return () => window.clearTimeout(t);
  }, [unseen, id, update]);

  return (
    <div className="rounded-[var(--radius)] bg-teal-soft px-4 py-2">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        className="flex min-h-10 w-full items-center justify-between gap-3 text-left text-[15px] font-semibold text-teal">
        {COPY.whatShown}
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open && <div className="pb-2 text-[16px] leading-relaxed">{children}</div>}
    </div>
  );
}

export function PackageLine({ line, more }: { line: string; more: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card mt-8 p-4 sm:p-5">
      <p className="text-[17px] font-bold">{line}</p>
      <button type="button" className="mt-1 min-h-11 text-[15px] font-semibold text-teal" aria-expanded={open} onClick={() => setOpen(!open)}>
        {COPY.more} {open ? "−" : "+"}
      </button>
      {open && (
        <ul className="mb-3 list-disc space-y-1 pl-5 text-[16px]">
          {more.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}
      <CtaButton className="w-full sm:w-auto" />
      <p className="mt-2 text-[13px] text-muted">{COPY.priceSource}</p>
    </section>
  );
}

export function Tile({ label, value, tone = "ink", sub }: { label: string; value: ReactNode; tone?: "ink" | "warn" | "danger" | "muted" | "ok"; sub?: ReactNode }) {
  const color = { ink: "text-ink", warn: "text-warn", danger: "text-danger", muted: "text-muted", ok: "text-ok" }[tone];
  return (
    <div className="card h-full p-3 sm:p-4">
      <div className="text-[14px] text-muted">{label}</div>
      <div className={`mt-1 text-[28px] font-extrabold leading-none tabular-nums ${color}`}>{value}</div>
      {sub && <div className="mt-1 text-[13px] text-muted">{sub}</div>}
    </div>
  );
}
