import { type Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { AlertIcon, CheckIcon, ChevronRightIcon, TransactionsIcon } from "@/components/ui/icons";
import { publicErrorMessage } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { addDays, fromISODate, toISODate, IST_OFFSET_MS } from "@/lib/dates";
import { currentBalancePaise, getPrimaryAccountDoc, last4 } from "@/lib/data/accounts";
import { latestImport } from "@/lib/data/imports";
import {
  countUnreviewed,
  latestStatementBalance,
  recentTransactions,
  totalsForRange,
} from "@/lib/data/transactions";
import { TransactionsWorkspace } from "@/components/transactions/transactions-workspace";
import type { TransactionDto } from "@/types/transaction";
import {
  formatINR,
  formatStatementDate,
  splitINR,
} from "@/lib/utils";

export const metadata: Metadata = {
  title: "Overview",
};

type DashboardState =
  | {
      ok: true;
      account: { bankName: string; accountType: string; last4: string } | null;
      /** The last balance the statement itself printed, and when. */
      statementBalance: { balancePaise: number | null; asOf: string | null };
      anchorDate: string | null;
      anchorBalancePaise: number;
      recent: TransactionDto[];
      totals: { creditPaise: number; debitPaise: number; netPaise: number; count: number };
      unreviewed: number;
      lastImport: Awaited<ReturnType<typeof latestImport>>;
    }
  | { ok: false; reason: string };

/** Short month names for the two-month window label. */
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The last two IST months ending with the current one, as date strings. */
function twoMonthWindow(now: Date): {
  from: string;
  to: string;
  label: string;
} {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();

  return {
    from: toISODate(new Date(Date.UTC(year, month - 1, 1))),
    to: toISODate(new Date(Date.UTC(year, month + 1, 0))),
    label: `${SHORT_MONTHS[(month - 1 + 12) % 12]} – ${SHORT_MONTHS[month]} ${year}`,
  };
}

async function loadDashboard(userId: string): Promise<DashboardState> {
  try {
    const account = await getPrimaryAccountDoc(userId);

    if (!account) {
      // No account document: still render the frame with zeroed figures.
      return {
        ok: true,
        account: null,
        statementBalance: { balancePaise: null, asOf: null },
        anchorDate: null,
        anchorBalancePaise: 0,
        recent: [],
        totals: { creditPaise: 0, debitPaise: 0, netPaise: 0, count: 0 },
        unreviewed: 0,
        lastImport: null,
      };
    }

    const window = twoMonthWindow(new Date());
    const windowFrom = fromISODate(window.from);
    const windowTo = fromISODate(window.to);

    const [statementBalance, anchorBalancePaise, recent, totals, unreviewed, lastImport] =
      await Promise.all([
        latestStatementBalance(userId, String(account._id)),
        currentBalancePaise(userId, account),
        recentTransactions(userId, 5),
        totalsForRange(
          userId,
          windowFrom ?? new Date(),
          windowTo ? addDays(windowTo, 1) : new Date(),
        ),
        countUnreviewed(userId),
        latestImport(userId),
      ]);

    return {
      ok: true,
      account: {
        bankName: account.bankName,
        accountType: account.accountType,
        last4: last4(account.accountNumber),
      },
      statementBalance: {
        balancePaise: statementBalance.balancePaise,
        asOf: statementBalance.asOf
          ? formatStatementDate(statementBalance.asOf)
          : null,
      },
      anchorDate: account.balanceAnchor?.asOfDate
        ? formatStatementDate(account.balanceAnchor.asOfDate)
        : null,
      anchorBalancePaise,
      recent,
      totals,
      unreviewed,
      lastImport,
    };
  } catch (error) {
    console.error("Dashboard failed:", error);
    return { ok: false, reason: publicErrorMessage(error) };
  }
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const window = twoMonthWindow(new Date());
  const state = await loadDashboard(session.userId);
  if (!state.ok) {
    return (
      <>
        <PageHeader title="Overview" meta="COULD NOT LOAD" />
        <ErrorState
          title="The overview could not be loaded"
          reason={state.reason}
        />
      </>
    );
  }

  const {
    account,
    anchorDate,
    anchorBalancePaise,
    statementBalance,
    recent,
    totals,
    unreviewed,
    lastImport,
  } = state;

  // The headline figure: the computed anchored-ledger balance — the same
  // formula Settings uses. The statement's own printed balance is shown
  // below as context, not as the headline.
  const balancePaise = anchorBalancePaise;
  const balanceAsOf = anchorDate;

  return (
    <>
      <PageHeader
        title="Overview"
        meta={`${window.label} · State Bank of India${account ? ` ···${account.last4}` : ""}`}
        action={
          <Link
            href="/imports"
            className={buttonClass("secondary", "sm")}
          >
            Import statement
          </Link>
        }
      />

      {/* The one figure that owns the page. */}
      <section className="panel">
        <div className="grid lg:grid-cols-12">
          <div className="border-b border-line p-5 sm:p-7 lg:col-span-7 lg:border-r lg:border-b-0 lg:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="label text-fg-3">Available balance</span>
              {account ? (
                <span className="figure text-[10.5px] text-fg-3">
                  {account.accountType} · ···{account.last4}
                </span>
              ) : null}
            </div>

            <p className="amount mt-7 text-[38px] leading-none text-fg sm:text-[52px]">
              {balancePaise < 0 ? "−" : ""}
              {splitINR(balancePaise).major}
              <span className="text-fg-3">{splitINR(balancePaise).minor}</span>
            </p>

            <p className="figure mt-5 text-[10.5px] tracking-[0.04em] text-fg-3 uppercase">
              {anchorDate
                ? `Anchored ledger balance · as of ${anchorDate}`
                : statementBalance.balancePaise !== null && balanceAsOf
                  ? `Last statement balance · as of ${balanceAsOf}`
                  : "No balances recorded yet"}
            </p>

            <div className="mt-9 grid gap-x-6 gap-y-3.5 border-t border-line pt-6 sm:grid-cols-3">
              <div className="flex items-baseline justify-between gap-3 sm:block">
                <p className="label text-fg-3">In · 2 months</p>
                <p className="figure mt-0 text-[15px] whitespace-nowrap text-credit sm:mt-2.5">
                  +{formatINR(totals.creditPaise)}
                </p>
              </div>
              <div className="flex items-baseline justify-between gap-3 sm:block">
                <p className="label text-fg-3">Out · 2 months</p>
                <p className="figure text-[15px] whitespace-nowrap text-debit sm:mt-2.5">
                  −{formatINR(totals.debitPaise)}
                </p>
              </div>
              <div className="flex items-baseline justify-between gap-3 sm:block">
                <p className="label text-fg-3">Net</p>
                <p className="figure text-[15px] whitespace-nowrap text-fg sm:mt-2.5">
                  {formatINR(totals.netPaise, { signed: true })}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="border-b border-line px-5 py-5 sm:px-6">
              <span className="label text-fg-3">{window.label}</span>

              <dl className="mt-5 space-y-3.5">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[12.5px] text-fg-2">Spend</dt>
                  <dd className="figure text-[13px] text-fg">
                    {formatINR(totals.debitPaise)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[12.5px] text-fg-2">Income</dt>
                  <dd className="figure text-[13px] text-fg">
                    {formatINR(totals.creditPaise)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-line-soft pt-3.5">
                  <dt className="text-[12.5px] text-fg-2">Transactions</dt>
                  <dd className="figure text-[13px] text-fg">
                    {totals.count}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <div className="flex items-baseline justify-between gap-4">
                <span className="label text-fg-3">Review queue</span>
                <span
                  className={
                    unreviewed > 0
                      ? "figure text-[13px] text-warning"
                      : "figure text-[13px] text-fg-3"
                  }
                >
                  {unreviewed}
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-5 text-fg-3">
                {unreviewed > 0
                  ? "Imported rows stay here until you confirm them."
                  : "Every imported row has been confirmed."}
              </p>
              {unreviewed > 0 ? (
                <Link
                  href="/transactions?reviewed=unreviewed"
                  className={buttonClass("secondary", "sm", "mt-3")}
                >
                  Open queue
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader
            title="Recent activity"
            meta="LATEST 5 ROWS"
            action={
              <Link
                href="/transactions"
                className={buttonClass("ghost", "sm", "-mr-2")}
              >
                View all
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </Link>
            }
          />

          {recent.length ? (
            <TransactionsWorkspace items={recent} />
          ) : (
            <EmptyState
              icon={<TransactionsIcon className="h-4 w-4" />}
              title="No transactions yet"
              description="Import your SBI statement and the rows will appear here."
            />
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Attention"
            meta={unreviewed > 0 ? "ONE ITEM WAITING" : "NOTHING WAITING"}
            action={
              unreviewed > 0 ? (
                <Badge tone="warning">REVIEW</Badge>
              ) : undefined
            }
          />

          <div className="divide-y divide-line-soft">
            {unreviewed > 0 ? (
              <div className="flex items-start gap-3 px-5 py-4">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div className="min-w-0">
                  <p className="text-[13px] text-fg">
                    {unreviewed} transaction{unreviewed === 1 ? "" : "s"} still
                    unreviewed
                  </p>
                  <p className="mt-1.5 text-[12px] leading-5 text-fg-3">
                    They were imported but have not been confirmed since.
                  </p>
                  <Link
                    href="/transactions?reviewed=unreviewed"
                    className={buttonClass("secondary", "sm", "mt-3")}
                  >
                    Review rows
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 px-5 py-4">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-credit" />
                <div>
                  <p className="text-[13px] text-fg">Nothing needs review</p>
                  <p className="mt-1.5 text-[12px] leading-5 text-fg-3">
                    New imports will appear here before they are confirmed.
                  </p>
                </div>
              </div>
            )}

            <div className="px-5 py-4">
              <span className="label text-fg-3">Last import</span>
              {lastImport ? (
                <>
                  <p className="mt-2.5 truncate text-[13px] text-fg">
                    {lastImport.fileName}
                  </p>
                  <p className="figure mt-1.5 text-[10.5px] text-fg-3">
                    {formatStatementDate(new Date(lastImport.createdAt))} ·{" "}
                    {lastImport.inserted} inserted · {lastImport.skipped}{" "}
                    skipped
                  </p>
                  <Link
                    href="/imports"
                    className={buttonClass("secondary", "sm", "mt-3")}
                  >
                    Import history
                  </Link>
                </>
              ) : (
                <>
                  <p className="mt-2.5 text-[13px] text-fg">
                    No statement imported yet
                  </p>
                  <p className="mt-1.5 text-[12px] leading-5 text-fg-3">
                    SBI statements will be listed here with their result.
                  </p>
                </>
              )}
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
