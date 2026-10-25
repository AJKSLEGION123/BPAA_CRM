import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { COPY } from "../lib/copy";
import { MANAGERS } from "../lib/demo/config";
import { demo, generate } from "../lib/demo/generate";
import { feed } from "../lib/demo/messages";
import { daySummary, leadTiles, overList, series, snapshot, urgentList } from "../lib/demo/selectors";
import { oct } from "../lib/demo/time";
import { bundleShown } from "../lib/prices";

const at9 = oct(30, 9);
const CLIENT_HASHES = new Set([
  "329a150432bfedfe0877e61e47e18fc23cbbdea73a9c6e2e64422f1b489a40d4",
  "f450495d50317b46e5475b9e5ad9d7a98c77002bc7a97a37bcfa092111b6b57b",
  "e124adcce1fb2f88e1ea799c3d0820845ed343e6c739e54131fcb3a56e4bc1bd",
  "e15f1e7e38a77f2e75a0587fdad8fb8cff9c01f896045dd7066ccbb9e46876aa",
  "7e109a1d496a5757402334e2327d718f5a02e62ff6f17cd38ec5f2a7d57ceb15",
  "e184e6afcc528b7cd1b5f10b13396e451ef220074848400adbbb11734f5191a1",
]);

describe("demo month", () => {
  test("same seed, same month", () => {
    expect(JSON.stringify(generate())).toBe(JSON.stringify(generate()));
  });

  test("quotas at 9:00 on 30 October", () => {
    const s = snapshot(at9);
    expect([s.open, s.over, s.urgent, s.abandoned]).toEqual([98, 24, 8, 14]);
    expect(MANAGERS.map((m) => s.byManager[m.id].over)).toEqual([3, 6, 4, 11]); // Айгерим, Данияр, Ольга, Тимур
    expect(MANAGERS.map((m) => s.byManager[m.id].urgent)).toEqual([1, 2, 1, 4]);
  });

  test("the same numbers at 13:00, 19:00 and 19:30", () => {
    for (const [h, m] of [[13, 0], [19, 0], [19, 30]]) {
      const s = snapshot(oct(30, h, m));
      expect([s.over, s.urgent, s.abandoned]).toEqual([24, 8, 14]);
    }
  });

  test("tiles equal list lengths, urgent is part of over norm", () => {
    const s = snapshot(at9);
    const over = overList(at9);
    const urgent = urgentList(at9);
    expect(over.length).toBe(s.over);
    expect(urgent.length).toBe(s.urgent);
    const overIds = new Set(over.map((r) => r.deal.id));
    expect(urgent.every((r) => overIds.has(r.deal.id))).toBe(true);
  });

  test("leads: volumes, owners, repeats, failures", () => {
    const t = leadTiles("month");
    expect(t.total).toBe(240);
    expect(t.bySource).toEqual({ site: 60, wa: 115, ig: 65 });
    expect([t.unassigned, t.repeats, t.failures]).toEqual([0, 17, 3]);
    expect(demo().leads.every((l) => !!l.manager)).toBe(true);
    expect(leadTiles("today").bySource).toEqual({ site: 2, wa: 4, ig: 3 });
  });

  test("October outcomes: 34 prepayments, 78 refusals", () => {
    const has = (k: string) => demo().deals.filter((d) => d.events.some((e) => e.kind === k)).length;
    expect([has("won"), has("lost")]).toEqual([34, 78]);
  });

  test("30 October report: 12 moved, 2 prepayments", () => {
    const d = daySummary(30);
    expect([d.leads, d.moved, d.prepayments, d.over]).toEqual([9, 12, 2, 24]);
  });

  test("series: mixed trend, Olga up, Timur first on 1 and 30 October", () => {
    const s = series();
    const [first, last] = [s[0], s[29]];
    expect(Math.abs(last.total - first.total)).toBeLessThanOrEqual(3);
    expect(last.byManager.olga).toBeGreaterThan(first.byManager.olga);
    for (const p of [first, last]) {
      const top = Math.max(...Object.values(p.byManager));
      expect(p.byManager.timur).toBe(top);
    }
    expect(first.total).toBe(25);
  });

  test("messages carry the selector numbers and the showcase deal", () => {
    const head = feed(30, "head").map((m) => [m.title, ...m.lines.map((l) => l.text)].join("\n")).join("\n");
    expect(head).toContain("Стоят дольше нормы: 24 — Тимур 11 · Данияр 6 · Ольга 4 · Айгерим 3");
    expect(head).toContain("Срочно: 8 сделок без действий 5 дней и больше");
    expect(head).toContain("Заявок: 9 — сайт 2, WhatsApp 4, Instagram 3\nБез ответственного: 0");
    const timur = feed(30, "timur").flatMap((m) => m.lines.map((l) => l.text));
    expect(timur).toContain("Ерлан · Замер · 9 дн.");
    const oct15 = feed(15, "head").map((m) => m.lines.map((l) => l.text).join(" ")).join(" ");
    expect(oct15).toContain("С 14:05 заявки из Instagram не доходят");
  });

  test("bundle shown in the demo is 600 000 ₸", () => {
    expect(bundleShown()).toBe(600_000);
  });
});

describe("texts", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name)) files.push(p);
    }
  };
  for (const d of ["app", "components", "lib"]) walk(join(__dirname, "..", d));
  const sources = files.map((f) => readFileSync(f, "utf8")).join("\n") + JSON.stringify(demo());

  test("no unmasked phone numbers", () => {
    // Text fields only: timestamps are numbers and never shown as digits.
    const strings: string[] = [];
    JSON.stringify(demo(), (_, v) => (typeof v === "string" && strings.push(v), v));
    for (const s of strings) expect(s.replace(/\D/g, " ")).not.toMatch(/\d{10}/);
    expect(demo().leads.every((l) => /^\+7 7•• ••• •• \d\d$/.test(l.phone))).toBe(true);
  });

  test("no client names", () => {
    // Real client names are checked by SHA-256 of the word, so this public repo never spells them out.
    const words = new Set(sources.toLowerCase().match(/[\p{L}\d]+/gu) ?? []);
    const hits = [...words].filter((w) => CLIENT_HASHES.has(createHash("sha256").update(w).digest("hex")));
    expect(hits).toEqual([]);
  });

  test("no banned claims", () => {
    const banned = [/клиник/i, /кейс/i, /наши клиенты/i, /24\/7/, /команда/i, /офис/i, /рост продаж на/i];
    for (const b of banned) expect(sources, String(b)).not.toMatch(b);
  });

  test("copy lines are at most 120 characters", () => {
    const lines = Object.values(COPY).flatMap((v) => (Array.isArray(v) ? v : [v]));
    for (const l of lines) expect(l.length, l).toBeLessThanOrEqual(120);
  });
});
