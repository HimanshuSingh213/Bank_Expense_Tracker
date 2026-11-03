"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { TransactionDetailModal } from "@/components/transactions/transaction-detail-modal";
import { TransactionEditForm } from "@/components/transactions/transaction-edit-form";
import { CategoryBadge } from "@/components/transactions/category-badge";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CalculatorIcon,
  CheckIcon,
  TrashIcon,
  XIcon,
} from "@/components/ui/icons";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import {
  formatDayMonth,
  formatINR,
  formatStatementDate,
  parseDate,
} from "@/lib/utils";
import type { TransactionDto } from "@/types/transaction";

/**
 * The ledger table, now interactive.
 *
 * - Click a row → detail modal (the full record page still exists via a link
 *   inside the modal).
 * - Check button → reviewed    - these two flip instantly on screen with
 * - Trash button → delete        useOptimistic, before the server answers.
 *
 * If the server refuses a change, the toast explains and `router.refresh()`
 * pulls the real rows back, so there is no fake state left behind.
 */

type RowChange =
  | { type: "review"; id: string; reviewed: boolean }
  | { type: "delete"; id: string };

function applyChange(
  items: TransactionDto[],
  change: RowChange,
): TransactionDto[] {
  if (change.type === "delete") {
    return items.filter((item) => item.id !== change.id);
  }
  return items.map((item) =>
    item.id === change.id ? { ...item, reviewed: change.reviewed } : item,
  );
}

export function TransactionTable({
  items: serverItems,
  calculatorIds,
  onToggleCalculator,
}: {
  items: TransactionDto[];
  /** Rows already sitting in the calculator (disabled-tick state). */
  calculatorIds: string[];
  /** Parent owns the calculator rows; the toggle both adds and removes. */
  onToggleCalculator: (item: TransactionDto) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [items, setOptimistic] = useOptimistic(
    serverItems,
    (current, change: RowChange) => applyChange(current, change),
  );

  const [openItem, setOpenItem] = useState<TransactionDto | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function toggleReviewed(item: TransactionDto) {
    startTransition(async () => {
      setOptimistic({
        type: "review",
        id: item.id,
        reviewed: !item.reviewed,
      });

      try {
        const response = await fetch(`/api/transactions/${item.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reviewed: !item.reviewed }),
        });

        if (!response.ok) {
          toast.error("The row was not marked. Refreshing…");
        } else {
          toast.success(!item.reviewed ? "Marked as reviewed." : "Back to unreviewed.");
        }
      } catch {
        toast.error("The server could not be reached. Refreshing…");
      }

      // Fresh data from the server wins over anything optimistic.
      router.refresh();
    });
  }

  function deleteRow(item: TransactionDto) {
    setConfirmDeleteId(null);
    setOpenItem(null); // the modal belongs to a row that is going away
    startTransition(async () => {
      setOptimistic({ type: "delete", id: item.id });

      try {
        const response = await fetch(`/api/transactions/${item.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          toast.error("The row was not deleted. Refreshing…");
        } else {
          toast.success("Row deleted. It can be recovered from the database.");
        }
      } catch {
        toast.error("The server could not be reached. Refreshing…");
      }

      router.refresh();
    });
  }

  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th className="hidden w-[112px] sm:table-cell">Date</Th>
            <Th>Narration</Th>
            <Th className="hidden w-[124px] md:table-cell">Category</Th>
            <Th className="hidden w-[118px] sm:table-cell">Type</Th>
            <Th className="w-[128px] text-right">Amount</Th>
            <Th className="hidden w-[144px] text-right xl:table-cell">Balance</Th>
            <Th className="w-[118px] text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const date = parseDate(item.txnDate);
            const credit = item.direction === "credit";
            const inCalculator = calculatorIds.includes(item.id);

            return (
              <Tr key={item.id}>
                <Td className="figure hidden whitespace-nowrap text-fg-3 sm:table-cell">
                  {date ? formatStatementDate(date) : "—"}
                </Td>

                <Td className="max-w-0">
                  {/* The row opener. A button, so it works with the keyboard. */}
                  <button
                    type="button"
                    onClick={() => {
                      setOpenItem(item);
                      setOpenEdit(false);
                    }}
                    className="block max-w-full cursor-pointer text-left"
                  >
                    <span className="line-clamp-2 text-fg hover:underline hover:underline-offset-2">
                      {item.narration || item.title}
                    </span>
                  </button>
                  <span className="figure mt-1 block truncate text-[10.5px] text-fg-3">
                    <span className="sm:hidden">
                      {date ? formatDayMonth(date) : "—"} ·{" "}
                    </span>
                    {item.referenceNumber
                      ? `REF ${item.referenceNumber}`
                      : "NO REFERENCE"}
                  </span>
                </Td>

                <Td className="hidden md:table-cell">
                  <CategoryBadge category={item.category} />
                </Td>

                <Td className="hidden sm:table-cell">
                  {credit ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.06em] text-credit">
                      <ArrowDownLeftIcon className="h-3 w-3" />
                      CREDIT
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.06em] text-debit">
                      <ArrowUpRightIcon className="h-3 w-3" />
                      DEBIT
                    </span>
                  )}
                </Td>

                <Td
                  className={
                    credit
                      ? "figure w-[128px] text-right font-medium whitespace-nowrap text-credit"
                      : "figure w-[128px] text-right font-medium whitespace-nowrap text-debit"
                  }
                >
                  {formatINR(
                    credit ? item.amountPaise : -item.amountPaise,
                    { signed: true },
                  )}
                </Td>

                <Td className="figure hidden w-[144px] text-right whitespace-nowrap text-fg-3 xl:table-cell">
                  {item.balanceAfterPaise === null
                    ? "—"
                    : formatINR(item.balanceAfterPaise)}
                </Td>

                <Td className="w-[118px]">
                  <div className="flex items-center justify-end gap-0.5">
                    {/* Reviewed — white tick when the row is done. */}
                    <button
                      type="button"
                      title={item.reviewed ? "Unreview" : "Mark reviewed"}
                      aria-pressed={item.reviewed}
                      onClick={() => toggleReviewed(item)}
                      className={
                        item.reviewed
                          ? "group rounded-[2px] p-1.5 bg-fg text-bg focus-visible:outline"
                          : "group rounded-[2px] p-1.5 text-fg-3 hover:bg-surface-2 hover:text-fg focus-visible:outline"
                      }
                    >
                      <CheckIcon className="h-3.5 w-3.5" />
                    </button>

                    {/* Add to the calculator. Second click removes it. */}
                    <button
                      type="button"
                      title={
                        inCalculator
                          ? "In the calculator — click to remove"
                          : "Add to calculator"
                      }
                      aria-pressed={inCalculator}
                      onClick={() => onToggleCalculator(item)}
                      className={
                        inCalculator
                          ? "group rounded-[2px] p-1.5 bg-fg text-bg focus-visible:outline"
                          : "group rounded-[2px] p-1.5 text-fg-3 hover:bg-surface-2 hover:text-fg focus-visible:outline"
                      }
                    >
                      <CalculatorIcon className="h-3.5 w-3.5" />
                    </button>

                    {/* Delete — first click asks, second click does. */}
                    {confirmDeleteId === item.id ? (
                      <>
                        <button
                          type="button"
                          title="Yes, delete this row"
                          onClick={() => deleteRow(item)}
                          className="group rounded-[2px] bg-debit text-bg p-1.5 focus-visible:outline"
                        >
                          <CheckIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="No, keep it"
                          onClick={() => setConfirmDeleteId(null)}
                          className="group rounded-[2px] border border-line-control p-1.5 text-fg-3 hover:text-fg focus-visible:outline"
                        >
                          <XIcon className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        title="Delete row"
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="group rounded-[2px] p-1.5 text-fg-3 hover:bg-surface-2 hover:text-debit focus-visible:outline"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>

      {openItem ? (
        <TransactionDetailModal
          item={openItem}
          onRequestClose={() => {
            setOpenItem(null);
            setOpenEdit(false);
          }}
        >
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            <Link
              href={`/transactions/${openItem.id}`}
              className="self-center font-mono text-[10.5px] tracking-[0.06em] text-fg-3 uppercase hover:text-fg"
            >
              Full record →
            </Link>

            {openEdit ? (
              <span className="self-center font-mono text-[10.5px] tracking-[0.06em] text-fg-3">
                EDITING
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setOpenEdit(true)}
                className="justify-self-start sm:justify-self-end"
              >
                <span className="border border-line-control px-3 py-2 font-mono text-[10.5px] tracking-[0.06em] text-fg uppercase hover:border-fg focus-visible:outline">
                  Edit fields
                </span>
              </button>
            )}

            {confirmDeleteId === openItem.id ? (
              <button
                type="button"
                onClick={() => deleteRow(openItem)}
                className="justify-self-start border border-debit bg-debit px-3 py-2 font-mono text-[10.5px] tracking-[0.06em] text-bg uppercase focus-visible:outline sm:justify-self-end"
              >
                Confirm delete
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteId(openItem.id)}
                className="justify-self-start border border-debit-border px-3 py-2 font-mono text-[10.5px] tracking-[0.06em] text-debit uppercase hover:border-debit focus-visible:outline sm:justify-self-end"
              >
                Delete
              </button>
            )}
          </div>

          {openEdit ? (
            <div className="border-t border-line">
              <TransactionEditForm
                item={openItem}
                onSaved={() => {
                  setOpenItem(null);
                  setOpenEdit(false);
                }}
                onRequestClose={() => setOpenEdit(false)}
              />
            </div>
          ) : null}
        </TransactionDetailModal>
      ) : null}
    </>
  );
}
