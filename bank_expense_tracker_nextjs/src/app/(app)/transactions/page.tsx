import { type Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { publicErrorMessage } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { listTransactions } from "@/lib/data/transactions";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionsWorkspace } from "@/components/transactions/transactions-workspace";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TransactionsIcon } from "@/components/ui/icons";
import { Panel, PanelHeader } from "@/components/ui/panel";
import {
  PAGE_SIZE,
  readTransactionSearch,
  toTransactionFilters,
  transactionHref,
} from "@/lib/transactions/query";
import type { TransactionListResult } from "@/types/transaction";
import type { TransactionSearch } from "@/lib/transactions/query";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Transactions",
};

type LedgerState =
  | { ok: true; result: TransactionListResult }
  | { ok: false; reason: string };

async function loadLedger(
  userId: string,
  search: TransactionSearch,
): Promise<LedgerState> {
  try {
    const result = await listTransactions(
      userId,
      toTransactionFilters(search),
    );
    return { ok: true, result };
  } catch (error) {
    console.error("Transactions failed:", error);
    return { ok: false, reason: publicErrorMessage(error) };
  }
}

export default async function TransactionsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const search = readTransactionSearch(await props.searchParams);
  const state = await loadLedger(session.userId, search);

  if (!state.ok) {
    return (
      <>
        <PageHeader title="Transactions" meta="COULD NOT LOAD" />
        <ErrorState
          title="The ledger could not be loaded"
          reason={state.reason}
        />
      </>
    );
  }

  const { result } = state;
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const filtered = Boolean(
    search.q ||
      search.category ||
      search.direction ||
      search.reviewed ||
      search.from ||
      search.to,
  );

  return (
    <>
      <PageHeader
        title="Transactions"
        meta={`${result.total} matching row${result.total === 1 ? "" : "s"}`}
        description="Every row in the ledger, newest first. Filters live in the URL, so a view can be bookmarked or shared with yourself."
        action={
          <Link href="/imports" className={buttonClass("secondary", "sm")}>
            Import statement
          </Link>
        }
      />

      <TransactionFilters search={search} />

      <dl className="mb-6 grid grid-cols-3 gap-px overflow-hidden bg-line">
        <div className="bg-surface px-4 py-3">
          <dt className="label text-fg-3">In</dt>
          <dd className="figure mt-2 text-[14px] whitespace-nowrap text-credit">
            +{formatINR(result.totals.creditPaise)}
          </dd>
        </div>
        <div className="bg-surface px-4 py-3">
          <dt className="label text-fg-3">Out</dt>
          <dd className="figure mt-2 text-[14px] whitespace-nowrap text-debit">
            −{formatINR(result.totals.debitPaise)}
          </dd>
        </div>
        <div className="bg-surface px-4 py-3">
          <dt className="label text-fg-3">Net</dt>
          <dd className="figure mt-2 text-[14px] whitespace-nowrap text-fg">
            {formatINR(result.totals.netPaise, { signed: true })}
          </dd>
        </div>
      </dl>

      <Panel>
        <PanelHeader
          title="Ledger"
          meta={
            result.total
              ? `PAGE ${search.page} OF ${totalPages}`
              : "NO MATCHING ROWS"
          }
        />

        {result.items.length ? (
          <TransactionsWorkspace items={result.items} />
        ) : (
          <EmptyState
            icon={<TransactionsIcon className="h-4 w-4" />}
            title={
              search.page > 1
                ? "This page is past the end of the list"
                : filtered
                  ? "No rows match these filters"
                  : "No transactions yet"
            }
            description={
              search.page > 1
                ? "The filters changed since this link was saved. Start from the first page."
                : filtered
                  ? "Clear a filter or widen the date range. Nothing has been changed."
                  : "Import your SBI statement and the rows will appear here."
            }
            action={
              search.page > 1 ? (
                <Link
                  href={transactionHref(search, 1)}
                  className={buttonClass("secondary", "sm")}
                >
                  First page
                </Link>
              ) : filtered ? (
                <Link
                  href="/transactions"
                  className={buttonClass("secondary", "sm")}
                >
                  Reset filters
                </Link>
              ) : (
                <Link
                  href="/imports"
                  className={buttonClass("secondary", "sm")}
                >
                  Go to imports
                </Link>
              )
            }
          />
        )}

        <Pagination
          page={Math.min(search.page, totalPages)}
          totalPages={totalPages}
          hrefFor={(page) => transactionHref(search, page)}
        />
      </Panel>
    </>
  );
}
