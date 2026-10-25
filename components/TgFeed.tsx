// Neutral chat frame with example Telegram messages. No logos: the frame only says what it is.
import Link from "next/link";
import type { TgMessage } from "@/lib/demo/messages";
import { fmtTime } from "@/lib/demo/time";

export function TgFeed({ messages }: { messages: TgMessage[] }) {
  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] bg-[#e9eef3] p-3 sm:p-4">
      {messages.map((m) => (
        <article key={m.id} id={m.slot ? `m${m.slot}` : undefined}
          className="max-w-[560px] scroll-mt-32 rounded-[var(--radius-lg)] rounded-tl-sm bg-surface px-4 py-3 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] font-semibold text-teal">Бот BPAA</span>
            <time className="text-[13px] text-muted tabular-nums">{fmtTime(m.ts)}</time>
          </div>
          <h3 className="mt-1 text-[16px] font-bold leading-snug">{m.title}</h3>
          {m.lines.length > 0 && (
            <ul className="mt-1 space-y-1 text-[16px] leading-snug">
              {m.lines.map((l, i) => (
                <li key={i} className={l.dealId ? "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line pt-2 first:border-0 first:pt-0" : ""}>
                  <span>{l.text}</span>
                  {l.dealId && (
                    <Link href={`/sdelki?deal=${l.dealId}`} className="inline-flex min-h-11 items-center text-[15px] font-semibold text-teal">
                      Открыть сделку →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          {m.button && (
            <Link href={m.button.href} className="btn btn-ghost mt-3 w-full">{m.button.label}</Link>
          )}
        </article>
      ))}
    </div>
  );
}
