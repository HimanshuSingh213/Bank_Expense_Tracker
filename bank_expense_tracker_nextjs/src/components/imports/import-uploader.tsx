"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { CategoryBadge } from "@/components/transactions/category-badge";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { formatINR } from "@/lib/utils";

/**
 * The Excel uploader, the preview of what was parsed, and the confirm step.
 *
 * Nothing reaches the ledger here: "Analyze" only builds the draft. The
 * table below shows every row with its verdict — new, duplicate (with the
 * reason named), or skipped. "Import N rows" is the only action that writes.
 */

export type PreviewRow = {
  rowNumber: number;
  narration: string;
  txnDate: string | null;
  direction: "debit" | "credit" | null;
  amountPaise: number | null;
  balanceAfterPaise: number | null;
  category?: string;
  categoryConfident?: boolean;
  aiCategory?: string | null;
  aiConfidence?: number | null;
  verdict: "new" | "duplicate" | "possible" | "invalid";
  reason?: string | null;
  selected: boolean;
};
type Draft = {
  id: string;
  fileName: string;
  periodFrom: string | null;
  periodTo: string | null;
  closingBalancePaise: number | null;
  totals: {
    parsed: number;
    valid: number;
    invalid: number;
    new: number;
    possibleDuplicate: number;
    selected: number;
  };
};

const VERDICT_WORDS: Record<PreviewRow["verdict"], { label: string; tone: "credit" | "debit" | "warning" | "neutral" }> = {
  new: { label: "NEW", tone: "credit" },
  duplicate: { label: "DUPLICATE", tone: "warning" },
  possible: { label: "POSSIBLE", tone: "warning" },
  invalid: { label: "SKIPPED", tone: "neutral" },
};

export function ImportUploader({
  accountLabel,
  initialDraft,
  initialRows,
}: {
  accountLabel: string | null;
  initialDraft: Draft | null;
  initialRows: PreviewRow[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [blockingError, setBlockingError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft | null>(initialDraft ?? null);
  const [rows, setRows] = useState<PreviewRow[]>(initialRows ?? []);

  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  /** Discards preview completely with zero database footprint. */
  function discardPreview() {
    setDraft(null);
    setRows([]);
    setFile(null);
    setPassword("");
    setBlockingError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.info("Preview discarded.");
  }

  /**
   * Turns an AI suggestion into the row's category in client state.
   */
  function applySuggestion(row: PreviewRow) {
    if (!row.aiCategory) return;

    setRows((prev) =>
      prev.map((item) =>
        item.rowNumber === row.rowNumber
          ? { ...item, category: row.aiCategory ?? item.category, aiCategory: null, aiConfidence: null }
          : item,
      ),
    );
    toast.success(`Category set to ${row.aiCategory}.`);
  }

  /** Apply every AI suggestion at once in client state. */
  function applyAll() {
    let applied = 0;
    setRows((prev) =>
      prev.map((item) => {
        if (
          item.verdict === "new" &&
          item.aiCategory &&
          item.aiCategory !== item.category
        ) {
          applied++;
          return { ...item, category: item.aiCategory, aiCategory: null, aiConfidence: null };
        }
        return item;
      }),
    );

    toast.success(
      applied
        ? `${applied} suggestion${applied === 1 ? "" : "s"} applied.`
        : "Nothing to apply — every suggestion is already the row's category.",
    );
  }

  /** The one-click re-tick: include a duplicate on purpose, or drop it back. */
  function toggleRowSelected(row: PreviewRow) {
    const nextSelected = !row.selected;
    setRows((prev) =>
      prev.map((item) =>
        item.rowNumber === row.rowNumber
          ? { ...item, selected: nextSelected }
          : item,
      ),
    );

    toast.info(
      nextSelected
        ? "Row included in the import."
        : "Row will be skipped (can be re-included).",
    );
  }

  async function analyze() {
    if (!file) {
      toast.error("Choose an Excel statement first.");
      return;
    }

    setAnalyzing(true);
    setBlockingError(null);

    try {
      const body = new FormData();
      body.append("file", file);
      if (password) body.append("password", password);

      const response = await fetch("/api/imports", {
        method: "POST",
        body,
      });

      const parsed = await response.json().catch(() => null);
      const data = parsed?.data ?? parsed;

      if (!response.ok) {
        if (data?.code === "INVALID_FILE_PASSWORD") {
          setNeedsPassword(true);
        }
        setBlockingError(data?.error ?? "The statement could not be analyzed.");
        toast.error(data?.error ?? "The statement could not be analyzed.");
        return;
      }

      const draftData = data?.draft;
      if (!draftData || !Array.isArray(draftData.rows)) {
        setBlockingError("The server returned an empty response. Try again.");
        toast.error("The server returned an empty response. Try again.");
        return;
      }

      const parsedRows: PreviewRow[] = draftData.rows ?? [];
      const newCount = parsedRows.filter((row) => row.verdict === "new").length;
      const duplicateCount = parsedRows.filter(
        (row) => row.verdict === "duplicate" || row.verdict === "possible",
      ).length;

      setDraft({
        id: draftData.id || "preview",
        fileName: draftData.fileName,
        periodFrom: draftData.periodFrom,
        periodTo: draftData.periodTo,
        closingBalancePaise: draftData.closingBalancePaise,
        totals: draftData.totals,
      });
      setRows(parsedRows);
      toast.success(
        `${newCount} new row${newCount === 1 ? "" : "s"} parsed${
          duplicateCount ? ` · ${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"} flagged` : ""
        } — check the preview, then confirm.`,
      );
    } catch {
      const reason = "The server could not be reached. Try again.";
      setBlockingError(reason);
      toast.error(reason);
    } finally {
      setAnalyzing(false);
    }
  }

  async function confirm() {
    if (!draft) return;

    setConfirming(true);

    try {
      const response = await fetch("/api/imports/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: draft.fileName,
          periodFrom: draft.periodFrom,
          periodTo: draft.periodTo,
          closingBalancePaise: draft.closingBalancePaise,
          rows,
        }),
      });

      const parsed = await response.json().catch(() => null);
      const data = parsed?.data ?? parsed;

      if (!response.ok) {
        toast.error(data?.error ?? "The import could not be completed.");
        return;
      }

      toast.success(
        `${data.inserted} row${data.inserted === 1 ? "" : "s"} imported into the ledger.`,
      );

      // Wait for the server to re-render (history table + dashboard totals)
      // before wiping the client draft state, so the next Analyze request
      // never hits a mid-refresh server.
      await router.refresh();

      setDraft(null);
      setRows([]);
      setFile(null);
      setPassword("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      toast.error("The import could not be completed. Try again.");
    } finally {
      setConfirming(false);
    }
  }

  /** Rows that will actually be written — mirrors the confirm filter. */
  const importableCount = rows.filter(
    (row) =>
      row.selected && row.verdict !== "invalid" && (row.amountPaise ?? 0) > 0,
  ).length;

  const suggestedCount = rows.filter(
    (row) => row.verdict === "new" && row.aiCategory && row.aiCategory !== row.category,
  ).length;

  const skippedDuplicateCount = rows.filter(
    (row) =>
      (row.verdict === "duplicate" || row.verdict === "possible") &&
      !row.selected,
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <PanelHeader
          title="Import an Excel statement"
          meta={accountLabel ?? "PRIMARY ACCOUNT"}
        />

        <div className="px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)]">
            <Field
              label="Statement file"
              htmlFor="import-file"
              hint=".xls or .xlsx, exported from YONO / OnlineSBI. Up to 8 MB."
            >
              <div className="relative flex h-9 w-full items-center rounded-[2px] border border-line-control bg-surface-2 px-3 text-[13px] text-fg transition-[background-color,border-color,color] hover:border-fg-2 focus-within:border-fg">
                <span className="mr-3 inline-flex shrink-0 select-none items-center justify-center rounded-[2px] border border-line-control bg-surface-elevated px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.04em] text-fg">
                  Choose File
                </span>
                <span className="truncate font-mono text-[11.5px] text-fg-3">
                  {file ? file.name : "No file chosen"}
                </span>
                <input
                  ref={fileInputRef}
                  id="import-file"
                  type="file"
                  accept=".xls,.xlsx"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </div>
            </Field>

            <Field
              label={needsPassword ? "Statement password" : "Password (if asked)"}
              htmlFor="import-password"
              hint="Usually a DOB (DDMMYYYY) or customer ID. Variants are tried for you."
            >
              <Input
                id="import-password"
                type="password"
                autoComplete="off"
                className="h-9"
                aria-invalid={needsPassword ? "true" : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
          </div>

          {blockingError ? (
            <p className="mt-3 text-[12px] leading-5 text-debit">{blockingError}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              onClick={analyze}
              disabled={analyzing || !file}
              aria-busy={analyzing}
            >
              {analyzing ? "Analyzing…" : "Analyze file"}
            </Button>

            {draft && importableCount > 0 ? (
              <Button variant="primary" onClick={confirm} disabled={confirming} aria-busy={confirming}>
                {confirming
                  ? "Importing…"
                  : `Import ${importableCount} row${importableCount === 1 ? "" : "s"}`}
              </Button>
            ) : null}

            {draft ? (
              <Button
                variant="secondary"
                onClick={discardPreview}
                disabled={confirming || analyzing}
              >
                Discard preview
              </Button>
            ) : null}

            {draft ? (
              <span className="figure font-mono text-[10.5px] tracking-[0.06em] text-fg-3 uppercase">
                {skippedDuplicateCount
                  ? `${skippedDuplicateCount} duplicate${skippedDuplicateCount === 1 ? "" : "s"} will be skipped`
                  : "no duplicates skipped"}
              </span>
            ) : null}
          </div>

          <p className="mt-3 text-[12px] leading-5 text-fg-3">
            Analyze reads the file and shows the preview only. Rows reach the
            ledger when you press Import — and nothing partial is written if
            the browser or the connection drops mid-way.
          </p>
        </div>
      </Panel>

      {draft ? (
        <Panel>
          <PanelHeader
            title="Preview"
            meta={`${draft.fileName} · ${importableCount} TO IMPORT${
              skippedDuplicateCount ? ` · ${skippedDuplicateCount} DUPLICATE${skippedDuplicateCount === 1 ? "" : "S"} SKIPPED` : ""
            }`}
            action={
              suggestedCount > 0 ? (
                <button
                  type="button"
                  onClick={applyAll}
                  className="border border-line-control px-3 py-1.5 font-mono text-[10.5px] tracking-[0.06em] text-fg-3 uppercase hover:border-fg hover:text-fg focus-visible:outline disabled:opacity-50 disabled:hover:border-line-control disabled:hover:text-fg-3"
                >
                  Apply all {suggestedCount}
                </button>
              ) : null
            }
          />

          <div className="max-h-[560px] overflow-y-auto">
            <Table>
              <thead className="sticky top-0 z-10 bg-surface">
                <tr>
                  <Th className="w-[110px]">Date</Th>
                  <Th>Narration</Th>
                  <Th className="hidden w-[120px] md:table-cell">Category</Th>
                  <Th className="w-[120px] text-right">Amount</Th>
                  <Th className="hidden w-[130px] text-right lg:table-cell">Balance</Th>
                  <Th className="w-[110px]">Verdict</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const credit = row.direction === "credit";
                  const verdict = VERDICT_WORDS[row.verdict];
                  const hidden =
                    row.verdict === "invalid" ||
                    ((row.verdict === "duplicate" || row.verdict === "possible") &&
                      !row.selected);

                  return (
                    <Tr key={row.rowNumber}>
                      <Td className="figure whitespace-nowrap text-fg-3">
                        {row.txnDate ? row.txnDate.slice(8, 10) + "/" + row.txnDate.slice(5, 7) : "—"}
                      </Td>

                      <Td className={hidden ? "max-w-0 opacity-50" : "max-w-0"}>
                        <span className="block truncate text-fg">{row.narration}</span>
                        {row.reason ? (
                          <span className="figure mt-1 block text-[10.5px] text-warning">
                            {row.reason}
                          </span>
                        ) : null}
                      </Td>

                      <Td className="hidden md:table-cell">
                        {row.category ? <CategoryBadge category={row.category} /> : "—"}
                        {row.aiCategory && row.aiCategory !== row.category ? (
                          <span className="mt-1 flex items-center gap-2">
                            <span className="figure text-[10.5px] text-warning">
                              AI: {row.aiCategory}
                              {typeof row.aiConfidence === "number" ? " ·" +
                                String(Math.round(row.aiConfidence * 100)) + "%" : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => applySuggestion(row)}
                              className="rounded-[2px] border border-warning px-1.5 py-0.5 figure text-[9.5px] uppercase tracking-[0.06em] text-warning hover:bg-[#f5b8411a] focus-visible:outline"
                            >
                              Apply
                            </button>
                          </span>
                        ) : null}
                      </Td>

                      <Td className="figure text-right whitespace-nowrap">
                        <span className={credit ? "text-credit" : "text-debit"}>
                          {formatINR(
                            credit ? (row.amountPaise ?? 0) : -(row.amountPaise ?? 0),
                            { signed: true },
                          )}
                        </span>
                      </Td>

                      <Td className="figure hidden text-right whitespace-nowrap text-fg-3 lg:table-cell">
                        {row.balanceAfterPaise === null ? "—" : formatINR(row.balanceAfterPaise)}
                      </Td>

                      <Td>
                        <Badge tone={verdict.tone} dot>
                          {verdict.label}
                        </Badge>

                        {/* The one-click re-tick: include a duplicate on purpose,
                            or skip a suspicious row before the confirm. */}
                        {row.verdict !== "invalid" ? (
                          <button
                            type="button"
                            onClick={() => toggleRowSelected(row)}
                            className="mt-1.5 figure text-[9.5px] tracking-[0.06em] text-fg-3 uppercase hover:text-fg focus-visible:outline"
                          >
                            {row.selected
                              ? row.verdict === "new"
                                ? "Skip"
                                : "Exclude"
                              : row.verdict === "new"
                                ? "Stop skipping"
                                : "Include"}
                          </button>
                        ) : null}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
