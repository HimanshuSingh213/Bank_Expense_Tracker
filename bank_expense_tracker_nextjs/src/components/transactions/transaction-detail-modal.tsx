"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { XIcon } from "@/components/ui/icons";
import { CategoryBadge } from "@/components/transactions/category-badge";
import type { TransactionDto } from "@/types/transaction";
import { formatINR, formatStatementDate, parseDate } from "@/lib/utils";

/**
 * One transaction, full width, without leaving the page. A row is opened by
 * clicking anywhere on it; the small "full record" link still opens the
 * dedicated page for anyone who wants the URL.
 *
 * The overlay is pure black and the sheet uses the same surface values as a
 * panel — no extra colours, no rounding, no shadows.
 */
export function TransactionDetailModal({
  item,
  onRequestClose,
  children,
}: {
  item: TransactionDto;
  onRequestClose: () => void;
  /** The edit form — rendered inside the modal footer by the parent. */
  children?: ReactNode;
}) {
  // Escape closes the modal, like every other dialog.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onRequestClose();
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onRequestClose]);

  const credit = item.direction === "credit";
  const date = parseDate(item.txnDate);
  const valueDate = parseDate(item.valueDate);

  const rows: Array<{ label: string; value: string; category?: string }> = [
    { label: "Date", value: date ? formatStatementDate(date) : "—" },
    { label: "Value date", value: valueDate ? formatStatementDate(valueDate) : "—" },
    { label: "Category", value: item.category, category: item.category },
    { label: "Reference", value: item.referenceNumber ?? "None" },
    {
      label: "Source",
      value: item.importId ? "Statement import" : "Before migration",
    },
    {
      label: "Reviewed",
      value: item.reviewed
        ? item.reviewedAt
          ? (() => {
              const at = parseDate(item.reviewedAt);
              return at ? `Yes · ${formatStatementDate(at)}` : "Yes";
            })()
          : "Yes"
        : "No",
    },
    {
      label: "Balance after",
      value: item.balanceAfterPaise === null ? "—" : formatINR(item.balanceAfterPaise),
    },
    { label: "Record", value: `…${item.id.slice(-8).toUpperCase()}` },
  ];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-[2px]"
      onClick={onRequestClose}
      data-name="transaction-detail-modal"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Transaction from ${date ? formatStatementDate(date) : "unknown date"}`}
        className="panel mx-4 my-10 sm:mx-auto sm:max-w-[560px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p
              className={
                credit
                  ? "figure text-[22px] leading-7 font-medium text-credit"
                  : "figure text-[22px] leading-7 font-medium text-debit"
              }
            >
              {formatINR(credit ? item.amountPaise : -item.amountPaise, { signed: true })}
            </p>
            <p className="mt-1 font-mono text-[10.5px] tracking-[0.06em] text-fg-3">
              {credit ? "CREDIT" : "DEBIT"} · INR
            </p>
          </div>

          <button
            type="button"
            onClick={onRequestClose}
            aria-label="Close"
            className="rounded-[2px] p-1.5 text-fg-3 hover:bg-surface-2 hover:text-fg focus-visible:outline"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-[13.5px] leading-6 text-fg">{item.narration || item.title}</p>

          <dl className="mt-5 border-t border-line-soft">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-6 border-b border-line-soft py-2"
              >
                <dt className="label text-fg-3">{row.label}</dt>
                <dd className="figure min-w-0 truncate text-right text-[12.5px] text-fg-2">
                  {row.category ? (
                    <CategoryBadge category={row.category} />
                  ) : (
                    row.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
          {children ? (
            children
          ) : (
            <Link
              href={`/transactions/${item.id}`}
              className="font-mono text-[10.5px] tracking-[0.06em] text-fg-3 uppercase hover:text-fg"
            >
              Open full record →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
