/**
 * Date rules.
 *
 * A statement date is a calendar date, not a moment in time. It is stored at
 * 00:00:00.000Z and always formatted from UTC parts, so 01/11/2026 can never
 * display as 31/10/2026 in another timezone.
 *
 * Month boundaries for reports are IST (Asia/Kolkata, UTC+05:30) day
 * boundaries, converted to explicit UTC instants here.
 */

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** The UTC midnight of a calendar date, discarding any time component. */
export function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** YYYY-MM-DD from UTC parts. */
export function toISODate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses YYYY-MM-DD at UTC midnight. Returns null for anything else. */
export function fromISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  // Reject impossible dates such as 2026-02-31.
  if (toISODate(date) !== `${year}-${month}-${day}`) return null;

  return date;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * The IST calendar month containing `now`, expressed as a half-open UTC range
 * `[from, to)`.
 */
export function istMonthRange(now: Date): { from: Date; to: Date } {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();

  return {
    from: new Date(Date.UTC(year, month, 1) - IST_OFFSET_MS),
    to: new Date(Date.UTC(year, month + 1, 1) - IST_OFFSET_MS),
  };
}

/** The IST calendar month before the one containing `now`. */
export function istPreviousMonthRange(now: Date): { from: Date; to: Date } {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();

  return {
    from: new Date(Date.UTC(year, month - 1, 1) - IST_OFFSET_MS),
    to: new Date(Date.UTC(year, month, 1) - IST_OFFSET_MS),
  };
}

/** "October 2026" for the IST month containing `date`. */
const monthName = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export function istMonthLabel(date: Date): string {
  return monthName.format(date);
}

/**
 * The IST calendar month containing `now`, as two `YYYY-MM-DD` values.
 *
 * Report filters use these strings because a statement date is a calendar date
 * stored at UTC midnight — comparing it against IST instants would shift the
 * first and last day of every month.
 */
export function istCalendarMonth(now: Date): {
  from: string;
  to: string;
  label: string;
} {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();

  return {
    from: toISODate(new Date(Date.UTC(year, month, 1))),
    to: toISODate(new Date(Date.UTC(year, month + 1, 0))),
    label: istMonthLabel(now),
  };
}
