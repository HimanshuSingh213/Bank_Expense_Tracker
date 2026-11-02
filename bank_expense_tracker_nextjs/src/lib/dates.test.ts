import { describe, expect, it } from "vitest";
import {
  fromISODate,
  istMonthRange,
  istPreviousMonthRange,
  toISODate,
  utcMidnight,
} from "@/lib/dates";

describe("calendar dates", () => {
  it("never shifts the day when formatting", () => {
    const date = new Date(Date.UTC(2026, 10, 1));
    expect(toISODate(date)).toBe("2026-11-01");
  });

  it("drops the time component", () => {
    expect(toISODate(utcMidnight(new Date("2026-11-01T18:30:00Z")))).toBe(
      "2026-11-01",
    );
  });

  it("rejects impossible dates", () => {
    expect(fromISODate("2026-02-31")).toBeNull();
    expect(fromISODate("01/11/2026")).toBeNull();
    expect(fromISODate("2026-11-01")?.toISOString()).toBe(
      "2026-11-01T00:00:00.000Z",
    );
  });
});

describe("IST month boundaries", () => {
  it("starts the month at IST midnight, expressed in UTC", () => {
    // 15 Nov 2026, 10:00 IST.
    const now = new Date("2026-11-15T04:30:00Z");
    const { from, to } = istMonthRange(now);

    expect(from.toISOString()).toBe("2026-10-31T18:30:00.000Z");
    expect(to.toISOString()).toBe("2026-11-30T18:30:00.000Z");
  });

  it("handles a moment that is already next month in IST", () => {
    // 1 Nov 2026, 02:00 IST is still 31 Oct in UTC.
    const now = new Date("2026-10-31T20:30:00Z");
    const { from } = istMonthRange(now);

    expect(from.toISOString()).toBe("2026-10-31T18:30:00.000Z");
  });

  it("rolls the previous month across a year boundary", () => {
    const now = new Date("2026-01-10T06:00:00Z");
    const { from, to } = istPreviousMonthRange(now);

    expect(from.toISOString()).toBe("2025-11-30T18:30:00.000Z");
    expect(to.toISOString()).toBe("2025-12-31T18:30:00.000Z");
  });
});
