import { type Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { publicErrorMessage } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { categoryTotals, totalsForRange } from "@/lib/data/transactions";
import { addDays, fromISODate, istCalendarMonth } from "@/lib/dates";
import { analyticsHref } from "@/lib/transactions/query";
import { formatINR, formatStatementDate } from "@/lib/utils";
import { PageHeader } from "@/components/common/page-header";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Field, Input } from "@/components/ui/field";
import { AnalyticsIcon } from "@/components/ui/icons";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Analytics",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

type AnalyticsState =
  | {
      ok: true;
      totals: { creditPaise: number; debitPaise: number; netPaise: number; count: number };
      categories: Array<{ category: string; debitPaise: number; count: number }>;
    }
  | { ok: false; reason: string };

async function loadAnalytics(userId: string, from: Date, to: Date): Promise<AnalyticsState> {
  try {
    const [totals, categories] = await Promise.all([
      totalsForRange(userId, from, to),
      categoryTotals(userId, from, to),
    ]);

    return { ok: true, totals, categories };
  } catch (error) {
    console.error("Analytics failed:", error);
    return { ok: false, reason: publicErrorMessage(error) };
  }
}

export default async function AnalyticsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await props.searchParams;
  const month = istCalendarMonth(new Date());

  const from = fromISODate(first(params.from))
    ? first(params.from)
    : month.from;
  const to = fromISODate(first(params.to)) ? first(params.to) : month.to;

  const fromDate = fromISODate(from);
  const toDate = fromISODate(to);
  const invalidRange = Boolean(fromDate && toDate && fromDate > toDate);

  const state = invalidRange
    ? ({ ok: true, totals: { creditPaise: 0, debitPaise: 0, netPaise: 0, count: 0 }, categories: [] } as const)
    : await loadAnalytics(
        session.userId,
        fromDate ?? new Date(),
        toDate ? addDays(toDate, 1) : new Date(),
      );

  if (!state.ok) {
    return (
      <>
        <PageHeader title="Analytics" meta="COULD NOT LOAD" />
        <ErrorState
          title="Analytics could not be loaded"
          reason={state.reason}
        />
      </>
    );
  }

  const { totals, categories } = state;

  return (
      <>
        <PageHeader
          title="Analytics"
          meta={
            fromDate && toDate
              ? `${formatStatementDate(fromDate)} — ${formatStatementDate(toDate)}`
              : "CHOOSE A RANGE"
          }
          description="Totals are computed from saved transactions only. The range is inclusive, and a statement date is compared as a calendar date, not as a moment in time."
        />

        <form
          action="/analytics"
          method="get"
          className="panel mb-6 flex flex-wrap items-end gap-3 px-4 py-4"
        >
          <Field label="From" htmlFor="analytics-from" className="w-[160px]">
            <Input
              id="analytics-from"
              name="from"
              type="date"
              defaultValue={from}
              className="figure"
            />
          </Field>
          <Field label="To" htmlFor="analytics-to" className="w-[160px]">
            <Input
              id="analytics-to"
              name="to"
              type="date"
              defaultValue={to}
              className="figure"
            />
          </Field>
          <button type="submit" className={buttonClass("secondary", "md")}>
            Apply range
          </button>
          <Link
            href={analyticsHref(month.from, month.to)}
            className="inline-flex h-9 items-center px-2 text-[12.5px] text-fg-3 hover:text-fg"
          >
            This month
          </Link>
        </form>

        {invalidRange ? (
          <div
            role="alert"
            className="border-l-2 border-debit bg-debit-surface px-5 py-4"
          >
            <p className="text-[13px] font-medium text-fg">
              The start date is after the end date
            </p>
            <p className="mt-1.5 text-[12.5px] leading-5 text-fg-2">
              Choose a start date on or before the last day of the range. No
              figures are shown for an impossible range.
            </p>
          </div>
        ) : (
          <>
            <dl className="mb-6 grid grid-cols-2 gap-px overflow-hidden bg-line md:grid-cols-4">
              <div className="bg-surface px-4 py-3.5">
                <dt className="label text-fg-3">In</dt>
                <dd className="figure mt-2 text-[15px] whitespace-nowrap text-credit">
                  +{formatINR(totals.creditPaise)}
                </dd>
              </div>
              <div className="bg-surface px-4 py-3.5">
                <dt className="label text-fg-3">Out</dt>
                <dd className="figure mt-2 text-[15px] whitespace-nowrap text-debit">
                  −{formatINR(totals.debitPaise)}
                </dd>
              </div>
              <div className="bg-surface px-4 py-3.5">
                <dt className="label text-fg-3">Net</dt>
                <dd className="figure mt-2 text-[15px] whitespace-nowrap text-fg">
                  {formatINR(totals.netPaise, { signed: true })}
                </dd>
              </div>
              <div className="bg-surface px-4 py-3.5">
                <dt className="label text-fg-3">Rows</dt>
                <dd className="figure mt-2 text-[15px] text-fg">
                  {totals.count}
                </dd>
              </div>
            </dl>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
              <Panel>
                <PanelHeader
                  title="Where the money went"
                  meta="DEBITS ONLY · LARGEST FIRST"
                />

                {categories.length ? (
                  <Table>
                    <thead>
                      <tr>
                        <Th>Category</Th>
                        <Th className="hidden w-[80px] text-right sm:table-cell">
                          Rows
                        </Th>
                        <Th className="w-[130px] text-right">Amount</Th>
                        <Th className="hidden w-[120px] text-right md:table-cell">
                          Share
                        </Th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((row) => {
                        const share = totals.debitPaise
                          ? (row.debitPaise / totals.debitPaise) * 100
                          : 0;

                        return (
                          <Tr key={row.category}>
                            <Td className="max-w-0">
                              <span className="block truncate text-fg">
                                {row.category}
                              </span>
                              <div
                                aria-hidden="true"
                                className="mt-2 h-1 w-full max-w-[220px] bg-surface-3"
                              >
                                <div
                                  className="h-full bg-debit"
                                  style={{ width: `${share.toFixed(1)}%` }}
                                />
                              </div>
                            </Td>
                            <Td className="figure hidden text-right text-fg-3 sm:table-cell">
                              {row.count}
                            </Td>
                            <Td className="figure w-[130px] text-right whitespace-nowrap text-fg">
                              {formatINR(row.debitPaise)}
                            </Td>
                            <Td className="figure hidden text-right text-fg-3 md:table-cell">
                              {share.toFixed(1)}%
                            </Td>
                          </Tr>
                        );
                      })}
                    </tbody>
                  </Table>
                ) : (
                  <EmptyState
                    icon={<AnalyticsIcon className="h-4 w-4" />}
                    title="No debits in this range"
                    description="Widen the range, or pick a month in which money left the account."
                  />
                )}
              </Panel>

              <Panel>
                <PanelHeader title="How this is calculated" meta="DEFINITIONS" />
                <dl className="divide-y divide-line-soft px-5">
                  <div className="py-4">
                    <dt className="label text-fg-3">Range</dt>
                    <dd className="mt-2 text-[12.5px] leading-5 text-fg-2">
                      Inclusive of both dates. Stored statement dates are
                      calendar dates at UTC midnight, so no row moves across a
                      month edge.
                    </dd>
                  </div>
                  <div className="py-4">
                    <dt className="label text-fg-3">In and out</dt>
                    <dd className="mt-2 text-[12.5px] leading-5 text-fg-2">
                      Credits add to In, debits add to Out. The signed amount
                      is stored in integer paise; no floating-point arithmetic
                      is used.
                    </dd>
                  </div>
                  <div className="py-4">
                    <dt className="label text-fg-3">Categories</dt>
                    <dd className="mt-2 text-[12.5px] leading-5 text-fg-2">
                      The split covers debits only. Credits are summarised
                      above and are not forced into a spending category.
                    </dd>
                  </div>
                </dl>
              </Panel>
            </div>
          </>
        )}
      </>
    );
}
