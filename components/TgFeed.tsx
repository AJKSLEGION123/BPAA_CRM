// Example Telegram messages in a neutral phone-like chat frame. No logos: the frame says what it is.
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { TgMessage } from "@/lib/demo/messages";
import { fmtTime } from "@/lib/demo/time";

export function TgFeed({ messages }: { messages: TgMessage[] }) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_8px_30px_rgb(20_24_33/0.08)]">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-teal text-[16px] font-bold text-white" aria-hidden>B</span>
        <div className="leading-tight">
          <div className="text-[16px] font-semibold">Бот BPAA</div>
          <div className="text-[13px] text-muted">пример сообщений · не настоящий Telegram</div>
        </div>
      </div>
      <div className="space-y-3 bg-[#e6ecf2] p-3 sm:p-4">
        {messages.map((m) => (
          <article key={m.id} id={m.slot ? `m${m.slot}` : undefined}
            className="max-w-[560px] scroll-mt-32 rounded-[18px] rounded-bl-[6px] bg-surface px-4 pb-2 pt-3 shadow-sm">
            <h3 className="text-[16px] font-bold leading-snug">{m.title}</h3>
            {m.lines.length > 0 && (
              <ul className="mt-1 space-y-1 text-[16px] leading-snug">
                {m.lines.map((l, i) => (
                  <li key={i} className={l.dealId ? "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line/70 pt-2 first:border-0 first:pt-0" : ""}>
                    <span>{l.text}</span>
                    {l.dealId && (
                      <Link href={`/sdelki?deal=${l.dealId}`}
                        className="inline-flex min-h-9 items-center gap-1 rounded-full bg-teal-soft px-3 text-[14px] font-semibold text-teal hover:bg-[#d6eef2]">
                        Открыть сделку <ArrowRight size={14} aria-hidden />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {m.button && (
              <Link href={m.button.href} className="mt-3 flex min-h-11 items-center justify-center rounded-[12px] bg-teal-soft text-[15px] font-semibold text-teal hover:bg-[#d6eef2]">
                {m.button.label}
              </Link>
            )}
            <time className="mt-1 block text-right text-[13px] text-muted tabular-nums">{fmtTime(m.ts)}</time>
          </article>
        ))}
      </div>
    </div>
  );
}
