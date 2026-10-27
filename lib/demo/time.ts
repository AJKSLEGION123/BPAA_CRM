// Time helpers with a fixed UTC+5 offset (Kazakhstan has been on UTC+5 since 1 March 2024; old tz databases say +6,
// so the tz database is never used). All timestamps are UTC milliseconds.

const OFFSET = 5 * 3_600_000;
const DAY = 86_400_000;
const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const WEEKDAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];

/** UTC ms for a local Almaty wall-clock time. month is 1-based. */
export function local(year: number, month: number, day: number, hour = 0, minute = 0): number {
  return Date.UTC(year, month - 1, day, hour, minute) - OFFSET;
}

/** October 2026 day (1..31) at a local time. */
export const oct = (day: number, hour = 0, minute = 0) => local(2026, 10, day, hour, minute);

function parts(ts: number) {
  const d = new Date(ts + OFFSET);
  return {
    y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(),
    h: d.getUTCHours(), mi: d.getUTCMinutes(), dow: d.getUTCDay(),
  };
}

/** Whole local calendar days since the epoch; used for "days without action". */
export const dayNumber = (ts: number) => Math.floor((ts + OFFSET) / DAY);
export const daysBetween = (from: number, to: number) => dayNumber(to) - dayNumber(from);
/** UTC ms for a local wall-clock time on a day number. */
export const atDay = (dn: number, hour = 0, minute = 0) => dn * DAY - OFFSET + hour * 3_600_000 + minute * 60_000;
export const weekday = (ts: number) => parts(ts).dow;
export const localHour = (ts: number) => parts(ts).h;
export const localDay = (ts: number) => parts(ts).d;

const pad = (n: number) => String(n).padStart(2, "0");
export const fmtTime = (ts: number) => { const p = parts(ts); return `${p.h}:${pad(p.mi)}`; };
export const fmtDayShort = (ts: number) => { const p = parts(ts); return `${p.d} ${MONTHS_SHORT[p.m]}`; };
export const fmtDayLong = (ts: number) => { const p = parts(ts); return `${p.d} ${MONTHS_GEN[p.m]}`; };
/** With the year: for real dates such as access expiry, which can fall in another year. */
export const fmtDayYear = (ts: number) => { const p = parts(ts); return `${p.d} ${MONTHS_GEN[p.m]} ${p.y}`; };
export const fmtWeekdayDay = (ts: number) => {
  const p = parts(ts);
  const w = WEEKDAYS[p.dow];
  return `${w[0].toUpperCase()}${w.slice(1)}, ${p.d} ${MONTHS_GEN[p.m]}`;
};
export const fmtDateTime = (ts: number) => `${fmtDayShort(ts)}, ${fmtTime(ts)}`;

/** Russian plural: plural(5, "день", "дня", "дней"). */
export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

export const fmtMoney = (n: number) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₸`;
