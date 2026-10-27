"use client";
// New prospect login: the password is shown once, together with the message to send.
import { Check, Copy } from "lucide-react";
import { useActionState, useState } from "react";
import { createAction, type CreateState } from "@/app/(demo)/admin/actions";
import { fmtDayYear } from "@/lib/demo/time";

export function AdminCreate({ suggested, site }: { suggested: string; site: string }) {
  const [state, action, pending] = useActionState<CreateState, FormData>(createAction, null);
  const [copied, setCopied] = useState(false);
  const message = state?.ok
    ? `Здравствуйте! Демо BPAA: ${site}\nЛогин: ${state.login}\nПароль: ${state.password}\nДоступ до ${fmtDayYear(Date.parse(state.until))}.`
    : "";

  const input = "mt-1 h-[var(--control-h)] w-full rounded-md border border-line bg-surface px-3 text-[16px]";
  return (
    <div className="space-y-4">
      <form action={action} className="grid gap-3 sm:grid-cols-[1fr_140px_2fr_auto] sm:items-end">
        <label className="block">
          <span className="text-[14px] font-semibold">Логин</span>
          <input name="login" defaultValue={suggested} required pattern="[A-Za-z0-9_\-]{2,32}" autoComplete="off" spellCheck={false} className={input} />
        </label>
        <label className="block">
          <span className="text-[14px] font-semibold">Срок</span>
          <select name="days" defaultValue="14" className={input}>
            <option value="7">7 дней</option>
            <option value="14">14 дней</option>
            <option value="30">30 дней</option>
            <option value="60">60 дней</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[14px] font-semibold">Кому (для себя)</span>
          <input name="note" maxLength={120} placeholder="Салон, Алматы — Айгуль" className={input} />
        </label>
        <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "Создаю…" : "Создать доступ"}</button>
      </form>
      {state && !state.ok && <p role="alert" className="text-[15px] text-danger">{state.error}</p>}
      {state?.ok && (
        <div className="rise rounded-[var(--radius)] border border-ok bg-ok-soft p-4">
          <p className="text-[15px] font-semibold text-ok">Доступ создан. Пароль показывается один раз — отправьте сообщение сейчас.</p>
          <pre className="mt-2 whitespace-pre-wrap rounded-md bg-surface p-3 text-[15px]">{message}</pre>
          <button type="button" className="btn btn-ghost mt-2" onClick={async () => {
            try {
              await navigator.clipboard.writeText(message);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}>
            {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
            {copied ? "Скопировано" : "Скопировать сообщение"}
          </button>
        </div>
      )}
    </div>
  );
}
