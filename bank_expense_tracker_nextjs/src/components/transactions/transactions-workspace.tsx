"use client";

import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { TransactionCalculator, type CalculatorEntry, type CalculatorWindows } from "@/components/transactions/transaction-calculator";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { formatDayMonth, parseDate } from "@/lib/utils";
import type { TransactionDto } from "@/types/transaction";

/**
 * Owns the calculator as a Map in spirit — a plain object where every key is
 * a window title and its value is the rows added there:
 *
 *   { "Car EMIs": [...], "Trip budget": [...]. }
 *
 * The object lives in localStorage, so a reload keeps every window — rows
 * included. Nothing from the calculator touches the database — it is a
 * scratchpad, the ledger itself stays the authoritative record on the server.
 *
 * This component also owns the optimistic ledger state: every review/delet-
 * ion, single or bulk, starts here so the table below flips instantly and
 * the calculator's reviewed counts agree with it.
 */

const STORAGE_KEY = "calculator-windows-v1";

function readStoredWindows(): CalculatorWindows {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function storeWindows(windows: CalculatorWindows) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(windows));
  } catch {
    // Private mode or full storage — the calculator still works this session.
  }
}

function toEntry(item: TransactionDto): CalculatorEntry {
  const date = parseDate(item.txnDate);

  return {
    id: item.id,
    label: item.title || item.narration,
    direction: item.direction,
    amountPaise: item.amountPaise,
    dateLabel: date ? formatDayMonth(date) : "NO DATE",
  };
}

/** Same shape as the table used to hold — extended with the bulk actions. */
type LedgerChange =
  | { type: "review"; id: string; reviewed: boolean }
  | { type: "delete"; id: string }
  | { type: "reviewMany"; ids: string[]; reviewed: boolean }
  | { type: "deleteMany"; ids: string[] };

function applyChange(items: TransactionDto[], change: LedgerChange) {
  if (change.type === "delete") {
    return items.filter((item) => item.id !== change.id);
  }
  if (change.type === "deleteMany") {
    const gone = new Set(change.ids);
    return items.filter((item) => !gone.has(item.id));
  }
  if (change.type === "reviewMany") {
    const ids = new Set(change.ids);
    return items.map((item) =>
      ids.has(item.id) ? { ...item, reviewed: change.reviewed } : item,
    );
  }
  return items.map((item) =>
    item.id === change.id ? { ...item, reviewed: change.reviewed } : item,
  );
}

async function postBulk(body: { action: "review" | "delete"; ids: string[]; reviewed?: boolean }) {
  return fetch("/api/transactions/bulk", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function TransactionsWorkspace({ items: serverItems }: { items: TransactionDto[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [items, setOptimistic] = useOptimistic(serverItems, applyChange);
  const [windows, setWindows] = useState<CalculatorWindows>({});
  const [activeTitle, setActiveTitle] = useState<string | null>(null);

  // Load the saved windows when the page becomes interactive. React cannot
  // read localStorage during a server render, so this is the hydration step
  // for it — a documented exception to the effect lint rule.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWindows(readStoredWindows());
  }, []);

  // Keep every window in step with the ledger, as pure rendering maths: any
  // pick whose row was deleted (or re-filtered) drops out automatically.
  const ledgerIds = new Set(items.map((item) => item.id));
  const kept: CalculatorWindows = {};

  for (const [title, entries] of Object.entries(windows)) {
    kept[title] = entries.filter((entry) => ledgerIds.has(entry.id));
  }

  const pickedIds = new Set(
    Object.values(kept)
      .flat()
      .map((entry) => entry.id),
  );

  // Which ledger rows are reviewed right now — the calculator reads this so
  // its per-window button only counts rows that still need the tick.
  const reviewedIds = new Set(
    items.filter((item) => item.reviewed).map((item) => item.id),
  );

  const titleList = Object.keys(kept);

  // Persist only what really changed, after render.
  const summary = JSON.stringify(kept);

  useEffect(() => {
    const stored = readStoredWindows();
    if (JSON.stringify(stored) !== summary) storeWindows(kept);
    // `kept` is derived above; `summary` is a content-fingerprint of it, so
    // this dependency pair is complete even though `kept` is a new object
    // every render — the compare above must no-op in that case.
  }, [summary]); // eslint-disable-line react-hooks/exhaustive-deps

  function createWindow(title: string) {
    if (windows[title] !== undefined) {
      setActiveTitle(title);
      toast.info(`"${title}" already exists — it is active now.`);
      return;
    }

    const next = { ...windows, [title]: [] };
    setWindows(next);
    storeWindows(next);
    setActiveTitle(title);
    toast.success(`Window "${title}" opened.`);
  }

  /** Both the ledger button and the ✕ inside a window run through this. */
  function toggleEntry(title: string, entry: CalculatorEntry) {
    const list = windows[title] ?? [];
    const exists = list.some((row) => row.id === entry.id);

    const next = {
      ...windows,
      [title]: exists
        ? list.filter((row) => row.id !== entry.id)
        : [...list, entry],
    };

    setWindows(next);
    storeWindows(next);
    toast.info(exists ? `Removed from "${title}".` : `Added to "${title}".`);
  }

  function clearWindow(title: string) {
    const next = { ...windows, [title]: [] };
    setWindows(next);
    storeWindows(next);
    toast.info(`"${title}" emptied.`);
  }

  /** Close = remove the whole key. The rows in the ledger are untouched. */
  function closeWindow(title: string) {
    const next = { ...windows };
    delete next[title];
    setWindows(next);
    storeWindows(next);

    if (activeTitle === title) setActiveTitle(null);
    toast.info(`Window "${title}" closed.`);
  }

  // ---------------------------------------------------------------------------
  // Ledger mutations — optimistic first, server behind it, refresh to settle.
  // ---------------------------------------------------------------------------

  function toggleReviewed(item: TransactionDto) {
    startTransition(async () => {
      setOptimistic({ type: "review", id: item.id, reviewed: !item.reviewed });

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

  /**
   * Shared engine for both bulk actions — the table's multiselect delete
   * and the calculator window's "mark reviewed". The ids come from the
   * rows the user can actually see, so a stale id would still mean a row
   * they own.
   */
  function sendBulk(action: "review" | "delete", ids: string[], reviewed?: boolean) {
    if (!ids.length) return;

    startTransition(async () => {
      setOptimistic(
        action === "review"
          ? { type: "reviewMany", ids, reviewed: reviewed === true }
          : { type: "deleteMany", ids },
      );

      const noun = `${ids.length} row${ids.length === 1 ? "" : "s"}`;

      try {
        const response = await postBulk({ action, ids, reviewed });

        if (!response.ok) {
          toast.error(`The ${action} failed for ${noun}. Refreshing…`);
        } else {
          const data = (await response.json().catch(() => null)) as
            | { data?: { modified?: number } }
            | null;
          const moved = data?.data?.modified ?? ids.length;

          toast.success(
            action === "review"
              ? `${moved} row${moved === 1 ? "" : "s"} marked reviewed.`
              : `${moved} row${moved === 1 ? "" : "s"} deleted. Recoverable from the database.`,
          );
        }
      } catch {
        toast.error("The server could not be reached. Refreshing…");
      }

      router.refresh();
    });
  }

  /** Calculator window button: unreviewed rows in the window get the tick. */
  function markWindowReviewed(title: string) {
    const entries = kept[title] ?? [];
    const unreviewed = entries.filter((entry) => !reviewedIds.has(entry.id));

    if (!unreviewed.length) {
      toast.info(`"${title}" — every row is already reviewed.`);
      return;
    }

    sendBulk(
      "review",
      unreviewed.map((entry) => entry.id),
      true,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0 flex-1">
        <TransactionTable
          items={items}
          calculatorIds={[...pickedIds]}
          onToggleCalculator={(item) => {
            // Nothing chosen yet: activate the first window, or ask for one.
            let target = activeTitle;

            if (!target) {
              if (!titleList.length) {
                toast.error(
                  "Create a calculator window first — type its name in the pick list.",
                );
                return;
              }
              target = titleList[0];
              setActiveTitle(target);
            }

            toggleEntry(target, toEntry(item));
          }}
          onToggleReviewed={toggleReviewed}
          onDelete={deleteRow}
          onDeleteMany={(ids) => sendBulk("delete", ids)}
        />
      </div>

      {/* Calculator — full width, below the ledger */}
      <div className="w-full">
        <TransactionCalculator
          windows={kept}
          activeTitle={activeTitle}
          reviewedIds={reviewedIds}
          onActivate={setActiveTitle}
          onCreate={createWindow}
          onToggleEntry={toggleEntry}
          onClearWindow={clearWindow}
          onCloseWindow={closeWindow}
          onMarkWindowReviewed={markWindowReviewed}
        />
      </div>
    </div>
  );
}
