"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TransactionCalculator, type CalculatorEntry, type CalculatorWindows } from "@/components/transactions/transaction-calculator";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { formatDayMonth, parseDate } from "@/lib/utils";
import type { TransactionDto } from "@/types/transaction";

/**
 * Owns the calculator as a Map in spirit — a plain object where every key is
 * a window title and its value is the rows added there:
 *
 *   { "Car EMIs": [...], "Trip budget": [...] }
 *
 * The object lives in localStorage, so a reload keeps every window. Nothing
 * from the calculator touches the database — it is a scratchpad, the ledger
 * itself stays the authoritative record on the server.
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

export function TransactionsWorkspace({ items }: { items: TransactionDto[] }) {
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

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
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
        />
      </div>

      <div className="xl:sticky xl:top-8 xl:w-[300px] shrink-0">
        <TransactionCalculator
          windows={kept}
          activeTitle={activeTitle}
          onActivate={setActiveTitle}
          onCreate={createWindow}
          onToggleEntry={toggleEntry}
          onClearWindow={clearWindow}
          onCloseWindow={closeWindow}
        />
      </div>
    </div>
  );
}
