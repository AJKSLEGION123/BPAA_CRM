"use client";
// Bottom sheet on phones, centred panel on wide screens. Native <dialog>: focus trap, Esc and focus return for free.
import { useEffect, useRef, type ReactNode } from "react";

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex min-h-full items-end justify-center sm:items-center sm:p-6" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="rise w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-t-[var(--radius-lg)] bg-surface p-5 pb-8 shadow-xl sm:rounded-[var(--radius-lg)] sm:pb-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-lg font-bold leading-snug">{title}</h2>
            <button type="button" onClick={onClose} className="btn btn-ghost -mr-1 -mt-1 w-11 shrink-0 px-0" aria-label="Закрыть">
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </dialog>
  );
}
