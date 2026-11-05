"use client";

import { useMemo } from "react";
import { CalculatorWindowSelect } from "@/components/transactions/calculator-window-select";
import { XIcon } from "@/components/ui/icons";
import { Panel, PanelHeader } from "@/components/ui/panel";
import type { Direction } from "@/types/transaction";
import { formatINR } from "@/lib/utils";

/**
 * The calculator, one "window" per transaction scenario.
 *
 * The data is a plain object that behaves like a Map:
 *   { "Groceries bill": [row, row], "EMI plan": [row] }
 * The key is the window title, the value is the list of rows added there.
 * The parent keeps this object in localStorage, so it survives a reload.
 *
 * Every window shows its own rows and its own In/Out/Net total, all at once —
 * that is the point: several scenarios side by side.
 */

export type CalculatorEntry = {
  id: string;
  label: string;
  direction: Direction;
  amountPaise: number;
  /** Formatted day-month, captured when the row was added. */
  dateLabel: string;
};

export type CalculatorWindows = Record<string, CalculatorEntry[]>;

function totalsFor(entries: CalculatorEntry[]) {
  // Integer sums, from paise to paise — never floats.
  let creditPaise = 0;
  let debitPaise = 0;

  for (const entry of entries) {
    if (entry.direction === "credit") {
      creditPaise += Math.abs(entry.amountPaise);
    } else {
      debitPaise += Math.abs(entry.amountPaise);
    }
  }

  return { creditPaise, debitPaise, netPaise: creditPaise - debitPaise };
}

function WindowTotals({ entries }: { entries: CalculatorEntry[] }) {
  const totals = useMemo(() => totalsFor(entries), [entries]);

  return (
    <dl className="space-y-2 px-5 py-4">
      <div className="flex items-baseline justify-between">
        <dt className="label text-fg-3">In</dt>
        <dd className="figure text-[13px] text-credit">
          +{formatINR(totals.creditPaise)}
        </dd>
      </div>
      <div className="flex items-baseline justify-between">
        <dt className="label text-fg-3">Out</dt>
        <dd className="figure text-[13px] text-debit">
          −{formatINR(totals.debitPaise)}
        </dd>
      </div>
      <div className="flex items-baseline justify-between border-t border-line-soft pt-2">
        <dt className="label text-fg">Net</dt>
        <dd className="figure text-[14px] text-fg">
          <span className="sr-only">Net: </span>
          {formatINR(totals.netPaise, { signed: true })}
        </dd>
      </div>
    </dl>
  );
}

export function TransactionCalculator({
  windows,
  activeTitle,
  reviewedIds,
  onActivate,
  onCreate,
  onToggleEntry,
  onClearWindow,
  onCloseWindow,
  onMarkWindowReviewed,
}: {
  windows: CalculatorWindows;
  activeTitle: string | null;
  /** Which ledger rows carry a tick right now — read-only mirror. */
  reviewedIds: Set<string>;
  onActivate: (title: string) => void;
  onCreate: (title: string) => void;
  /** Row buttons live in the ledger; a second click un-picks the row. */
  onToggleEntry: (title: string, entry: CalculatorEntry) => void;
  onClearWindow: (title: string) => void;
  onCloseWindow: (title: string) => void;
  /** Marks every still-unreviewed row of the window reviewed, in one write. */
  onMarkWindowReviewed: (title: string) => void;
}) {
  const titles = Object.keys(windows);

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <PanelHeader
          title="Calculator windows"
          meta={
            activeTitle
              ? "ADDING TO ↓"
              : titles.length
                ? "PICK A WINDOW FIRST"
                : "CREATE ONE BELOW"
          }
        />
        <div className="px-5 py-4">
          <CalculatorWindowSelect
            titles={titles}
            activeTitle={activeTitle}
            onActivate={onActivate}
            onCreate={onCreate}
          />
          <p className="mt-3 text-[12px] leading-5 text-fg-3">
            Choose (or type) a window title, then use the calculator button on
            any ledger row. Each window keeps its own rows and its own Net.{" "}
          </p>
        </div>
      </Panel>

      {titles.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {titles.map((title) => {
            const entries = windows[title];
            const unreviewedCount = entries.filter(
              (entry) => !reviewedIds.has(entry.id),
            ).length;

            return (
              <Panel key={title}>
                <PanelHeader
                  title={title}
                  meta={`${entries.length} ROW${entries.length === 1 ? "" : "S"}`}
                  action={
                    <span className="flex items-center gap-3">
                      {entries.length ? (
                        <>
                          {/* Batch tick — the whole window is one review now. */}
                          <button
                            type="button"
                            title={
                              unreviewedCount
                                ? `Mark the ${unreviewedCount} unreviewed row${unreviewedCount === 1 ? "" : "s"} as reviewed`
                                : "Every row here is reviewed"
                            }
                            disabled={!unreviewedCount}
                            onClick={() => onMarkWindowReviewed(title)}
                            className={
                              unreviewedCount
                                ? "font-mono text-[10.5px] tracking-[0.06em] text-fg-3 uppercase hover:text-fg focus-visible:outline"
                                : "font-mono text-[10.5px] tracking-[0.06em] text-fg-3/40 uppercase"
                            }
                          >
                            Mark reviewed
                            {unreviewedCount ? ` (${unreviewedCount})` : ""}
                          </button>
                          <button
                            type="button"
                            onClick={() => onClearWindow(title)}
                            className="font-mono text-[10.5px] tracking-[0.06em] text-fg-3 uppercase hover:text-fg focus-visible:outline"
                          >
                            Clear
                          </button>
                        </>
                      ) : null}
                      <button
                        type="button"
                        title="Close this window"
                        onClick={() => onCloseWindow(title)}
                        className="rounded-[2px] p-1 text-fg-3 hover:text-fg focus-visible:outline"
                      >
                        <XIcon className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  }
                />

                {entries.length === 0 ? (
                  <p className="px-5 py-5 text-[12.5px] leading-5 text-fg-3">
                    Empty. Add rows from the ledger while this window is active.
                  </p>
                ) : (
                  <ul className="px-5 py-3">
                    {entries.map((entry) => {
                      const credit = entry.direction === "credit";

                      return (
                        <li
                          key={entry.id}
                          className="flex items-start justify-between gap-3 border-b border-line-soft py-2 last:border-b-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[12.5px] text-fg-2">
                              {entry.label}
                            </p>
                            <p className="figure mt-0.5 text-[10.5px] text-fg-3">
                              {entry.dateLabel}
                              {" · "}
                              {credit ? "IN" : "OUT"}
                            </p>
                          </div>

                          <div className="flex items-start gap-2">
                            <span
                              className={
                                credit
                                  ? "figure text-[12.5px] whitespace-nowrap text-credit"
                                  : "figure text-[12.5px] whitespace-nowrap text-debit"
                              }
                            >
                              {formatINR(
                                credit ? entry.amountPaise : -entry.amountPaise,
                                { signed: true },
                              )}
                            </span>
                            <button
                              type="button"
                              title="Remove from this window"
                              onClick={() => onToggleEntry(title, entry)}
                              className="rounded-[2px] p-1 text-fg-3 hover:text-fg focus-visible:outline"
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="border-t border-line">
                  <WindowTotals entries={entries} />
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <Panel>
          <p className="px-5 py-6 text-[12.5px] leading-5 text-fg-3">
            No windows yet. Type a name in the pick list above — {"'"}Car EMIs
            {"'"}, {"'"}Next trip{"'"}, anything — and rows you add will be
            totalled there, separately from everything else.{" "}
          </p>
        </Panel>
      )}
    </div>
  );
}
