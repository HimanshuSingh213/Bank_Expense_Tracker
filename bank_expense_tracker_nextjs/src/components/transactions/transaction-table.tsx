"use client";

import Link from "next/link";
import { useState } from "react";
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
 * The ledger table, interactive in three ways.
 *
 * - Click a row → detail modal (the full record page still exists via a link
 *   inside the modal).
 * - Check button → reviewed, trash button → delete — both flip instantly
 *   because the parent keeps the optimistic state; these buttons just call it.
 * - Tick boxes → select rows, then delete them all in one confirmed write.
 *   Selection lives only on this page — it never writes until confirmed.
 */

export function TransactionTable({
  items,
  calculatorIds,
  onToggleCalculator,
  onToggleReviewed,
  onDelete,
  onDeleteMany,
}: {
  items: TransactionDto[];
  /** Rows already sitting in the calculator (disabled-tick state). */
  calculatorIds: string[];
  /** Parent owns the calculator rows; the toggle both adds and removes. */
  onToggleCalculator: (item: TransactionDto) => void;
  /** Optimistic mutations, implemented by the workspace above. */
  onToggleReviewed: (item: TransactionDto) => void;
  onDelete: (item: TransactionDto) => void;
  onDeleteMany: (ids: string[]) => void;
}) {
  const [openItem, setOpenItem] = useState<TransactionDto | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteMany, setConfirmDeleteMany] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedSet = new Set(selectedIds);
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  function toggleOne(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((row) => row !== id)
        : [...current, id],
    );
  }

  /** Tick every row on the page, or untick everything. */
  function toggleAll() {
    setSelectedIds(allSelected ? [] : items.map((item) => item.id));
  }

  function deleteSelected() {
    setConfirmDeleteMany(false);
    setSelectedIds([]);
    onDeleteMany(selectedIds.length ? selectedIds : items.map((item) => item.id));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Bulk bar — appears only while rows are ticked. */}
      {selectedIds.length ? (
        <div className="flex flex-wrap items-center gap-4 border border-line-control px-4 py-2.5">
          <span className="label text-fg-3">
            {selectedIds.length} selected
          </span>

          {confirmDeleteMany ? (
            <>
              <button
                type="button"
                onClick={deleteSelected}
                className="border border-debit bg-debit px-3 py-1.5 font-mono text-[10.5px] tracking-[0.06em] text-bg uppercase focus-visible:outline"
              >
                Yes, delete {selectedIds.length}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteMany(false)}
                className="border border-line-control px-3 py-1.5 font-mono text-[10.5px] tracking-[0.06em] text-fg-3 uppercase hover:border-fg hover:text-fg focus-visible:outline"
              >
                Keep
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDeleteMany(true)}
              className="inline-flex items-center gap-1.5 border border-debit-border px-3 py-1.5 font-mono text-[10.5px] tracking-[0.06em] text-debit uppercase hover:border-debit focus-visible:outline"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Delete
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setSelectedIds([]);
              setConfirmDeleteMany(false);
            }}
            className="font-mono text-[10.5px] tracking-[0.06em] text-fg-3 uppercase hover:text-fg focus-visible:outline"
          >
            Clear selection
          </button>
        </div>
      ) : null}

      <Table>
        <thead>
          <tr>
            <Th className="w-[36px]">
              <button
                type="button"
                role="checkbox"
                aria-checked={allSelected}
                title={allSelected ? "Untick all" : "Tick every row"}
                onClick={toggleAll}
                className={
                  allSelected
                    ? "grid h-4 w-4 place-items-center rounded-[2px] bg-fg text-bg focus-visible:outline"
                    : "grid h-4 w-4 place-items-center rounded-[2px] border border-line-control text-fg hover:border-fg focus-visible:outline"
                }
              >
                {allSelected ? <CheckIcon className="h-2.5 w-2.5" /> : null}
              </button>
            </Th>
            <Th className="hidden w-[112px] sm:table-cell">Date</Th>
            <Th>Party</Th>
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
            const chosen = selectedSet.has(item.id);
            // Who this row was with — sender on a credit, recipient on a
            // debit. The full narration stays out of the table; it lives in
            // the detail modal.
            const party =
              item.recipient || item.title || item.narration || "—";

            return (
              <Tr key={item.id}>
                <Td className="w-[36px]">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={chosen}
                    title={chosen ? "Remove from selection" : "Select this row"}
                    onClick={() => toggleOne(item.id)}
                    className={
                      chosen
                        ? "grid h-4 w-4 place-items-center rounded-[2px] bg-fg text-bg focus-visible:outline"
                        : "grid h-4 w-4 place-items-center rounded-[2px] border border-line-control text-fg hover:border-fg focus-visible:outline"
                    }
                  >
                    {chosen ? <CheckIcon className="h-2.5 w-2.5" /> : null}
                  </button>
                </Td>

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
                    <span className="line-clamp-1 text-fg hover:underline hover:underline-offset-2">
                      {party}
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
                      onClick={() => onToggleReviewed(item)}
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
                          onClick={() => {
                            setConfirmDeleteId(null);
                            onDelete(item);
                          }}
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
                onClick={() => {
                  setConfirmDeleteId(null);
                  setOpenItem(null); // the modal belongs to a row that is going away
                  onDelete(openItem);
                }}
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
    </div>
  );
}
