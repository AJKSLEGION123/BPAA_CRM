"use client";
// «Сколько сделок стоит дольше нормы», 1–30 October at 9:00. One series at a time; tap a day for its breakdown.
import { useState } from "react";
import { MANAGERS, type ManagerId } from "@/lib/demo/config";
import type { SeriesPoint } from "@/lib/demo/selectors";

const W = 640, H = 220, L = 34, R = 12, T = 14, B = 28;

export function StuckChart({ series }: { series: SeriesPoint[] }) {
  const [who, setWho] = useState<"all" | ManagerId>("all");
  const [day, setDay] = useState(30);
  const values = series.map((p) => (who === "all" ? p.total : p.byManager[who]));
  const top = Math.max(5, Math.ceil(Math.max(...series.map((p) => p.total)) / 5) * 5);
  const x = (i: number) => L + (i * (W - L - R)) / (series.length - 1);
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ticks = Array.from({ length: top / 5 + 1 }, (_, i) => i * 5).filter((v) => v % (top > 20 ? 10 : 5) === 0);
  const p = series[day - 1];
  const breakdown = MANAGERS.map((m) => ({ name: m.name, n: p.byManager[m.id] })).sort((a, b) => b.n - a.n);

  return (
    <div>
      <div className="scroll-x -mx-4 mb-3 flex gap-2 px-4" role="group" aria-label="Чья линия">
        {[{ id: "all" as const, name: "Всего" }, ...MANAGERS].map((m) => (
          <button key={m.id} type="button" className="chip" aria-pressed={who === m.id} onClick={() => setWho(m.id)}>{m.name}</button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
        aria-label={`Дольше нормы: 1 октября ${values[0]}, 30 октября ${values[values.length - 1]}`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--border)" />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">{v}</text>
          </g>
        ))}
        {[1, 5, 10, 15, 20, 25, 30].map((d) => (
          <text key={d} x={x(d - 1)} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--muted)">{d === 1 ? "1 окт" : d}</text>
        ))}
        <line x1={x(day - 1)} x2={x(day - 1)} y1={T} y2={H - B} stroke="var(--teal)" strokeDasharray="3 3" opacity="0.5" />
        <path d={line} fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinejoin="round" />
        {values.map((v, i) => (
          <g key={i} onClick={() => setDay(i + 1)} className="cursor-pointer">
            <rect x={x(i) - 10} y={T} width="20" height={H - T - B} fill="transparent" />
            <circle cx={x(i)} cy={y(v)} r={i + 1 === day ? 5 : 3} fill={i + 1 === day ? "var(--teal)" : "var(--surface)"} stroke="var(--teal)" strokeWidth="2" />
          </g>
        ))}
      </svg>
      <p className="mt-2 text-[16px]">
        <b>{day} октября, 9:00:</b> всего {p.total} — {breakdown.map((b) => `${b.name} ${b.n}`).join(" · ")}
      </p>
    </div>
  );
}
