import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { getSession } from "@/lib/auth/session";
import { publicErrorMessage } from "@/lib/errors";
import { getTransaction } from "@/lib/data/transactions";
import type { TransactionDto } from "@/types/transaction";
import { formatINR, formatStatementDate, parseDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Transaction",
};

export default async function TransactionDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await props.params;

  let transaction: TransactionDto | null;
  let detailFailed: string | null = null;

  try {
    transaction = await getTransaction(session.userId, id);
  } catch (error) {
    console.error("Transaction detail failed:", error);
    transaction = null;
    detailFailed = publicErrorMessage(error);
  }

  if (detailFailed) {
    return (
      <>
        <PageHeader title="Transaction" meta="COULD NOT LOAD" />
        <ErrorState
          title="This transaction could not be loaded"
          reason={detailFailed}
          action={
            <Link
              href="/transactions"
              className={buttonClass("secondary", "sm")}
            >
              Back to ledger
            </Link>
          }
        />
      </>
    );
  }

  if (!transaction) notFound();

  const credit = transaction.direction === "credit";
  const date = parseDate(transaction.txnDate);
  const valueDate = parseDate(transaction.valueDate);

  return (
    <>
      <PageHeader
        title={transaction.title}
        meta={`${date ? formatStatementDate(date) : "NO DATE"} · ${
          credit ? "CREDIT" : "DEBIT"
        }`}
        action={
          <Link href="/transactions" className={buttonClass("secondary", "sm")}>
            Back to ledger
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel>
          <PanelHeader
            title="Transaction"
            meta={`ID ${transaction.id.slice(-8).toUpperCase()}`}
          />

          <div className="px-5 py-6">
            <p className="label text-fg-3">Amount</p>
            <p
              className={
                credit
                  ? "figure mt-2.5 text-[26px] font-medium text-credit"
                  : "figure mt-2.5 text-[26px] font-medium text-debit"
              }
            >
              {formatINR(
                credit ? transaction.amountPaise : -transaction.amountPaise,
                { signed: true },
              )}
            </p>
            <p className="mt-1.5 text-[12px] text-fg-3">
              {credit ? "Credit — money in" : "Debit — money out"}
            </p>

            <dl className="mt-8 divide-y divide-line-soft border-t border-line">
              <DetailRow label="Date">
                {date ? formatStatementDate(date) : "—"}
              </DetailRow>
              <DetailRow label="Value date">
                {valueDate ? formatStatementDate(valueDate) : "—"}
              </DetailRow>
              <DetailRow label="Reference">
                {transaction.referenceNumber ?? "—"}
              </DetailRow>
              <DetailRow label="Category">{transaction.category}</DetailRow>
              <DetailRow label="Balance after">
                {transaction.balanceAfterPaise === null
                  ? "—"
                  : formatINR(transaction.balanceAfterPaise)}
              </DetailRow>
              <DetailRow label="Source">
                {transaction.source === "statement-import"
                  ? "Statement import"
                  : "Manual entry"}
              </DetailRow>
              <DetailRow label="Import row">
                {transaction.importRowNumber === null
                  ? "—"
                  : String(transaction.importRowNumber)}
              </DetailRow>
            </dl>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Narration" meta="AS THE BANK WROTE IT" />
            <p className="figure px-5 py-5 text-[12px] leading-6 break-words text-fg-2">
              {transaction.narration || transaction.title}
            </p>
          </Panel>

          <Panel>
            <PanelHeader title="Review" meta="CONFIRMATION STATE" />
            <div className="px-5 py-5">
              {transaction.reviewed ? (
                <Badge tone="neutral" dot>
                  REVIEWED
                </Badge>
              ) : (
                <Badge tone="warning" dot>
                  UNREVIEWED
                </Badge>
              )}

              <p className="mt-3 text-[12px] leading-5 text-fg-3">
                {transaction.reviewed
                  ? "This row has been confirmed."
                  : "Imported rows start unreviewed; they stay legible until confirmed."}
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-[12px] text-fg-3">{label}</dt>
      <dd className="figure text-right text-[12.5px] break-words text-fg-2">
        {children}
      </dd>
    </div>
  );
}
