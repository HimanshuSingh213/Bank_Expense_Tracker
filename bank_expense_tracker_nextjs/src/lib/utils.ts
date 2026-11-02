type ClassInput =
  | string
  | null
  | undefined
  | false
  | Record<string, boolean>;

/**
 * Joins class names. Intentionally tiny — no clsx or tailwind-merge.
 */
export function cn(...inputs: ClassInput[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === "string") {
      classes.push(input);
    } else {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }

  return classes.join(" ");
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats integer paise for display. Money is never stored as rupees.
 * `formatINR(12485000)` → "₹1,24,850.00"
 */
export function formatINR(paise: number, options?: { signed?: boolean }): string {
  const formatted = inr.format(Math.abs(paise) / 100);

  if (!options?.signed) return formatted;

  return `${paise < 0 ? "−" : "+"}${formatted}`;
}

/**
 * Splits a formatted amount so the decimals can be typeset more quietly.
 * Returns { major: "₹1,24,850", minor: ".00" }
 */
export function splitINR(paise: number): { major: string; minor: string } {
  const formatted = inr.format(Math.abs(paise) / 100);
  const dot = formatted.lastIndexOf(".");

  return {
    major: formatted.slice(0, dot),
    minor: formatted.slice(dot),
  };
}

const statementDate = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Formats a calendar date stored at 00:00 UTC without shifting the day.
 */
export function formatStatementDate(date: Date): string {
  return statementDate.format(date);
}

const dayMonth = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

/** "31 Oct" — the compact form used inside tables. */
export function formatDayMonth(date: Date): string {
  return dayMonth.format(date);
}

/** Parses an ISO timestamp from the API into a Date, or null. */
export function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

