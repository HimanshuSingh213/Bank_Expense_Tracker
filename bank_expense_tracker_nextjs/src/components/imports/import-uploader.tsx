"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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

type PreviewRow = {
  rowNumber: number;
  narration: string;
  txnDate: string | null;
  direction: "debit" | "credit" | null;
  amountPaise: number | null;
  balanceAfterPaise: number | null;
  category?: string;
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

export function ImportUploader({ accountLabel }: { accountLabel: string | null }) {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [blockingError, setBlockingError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [counters, setCounters] = useState<{ new: number; duplicate: number } | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);

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

      if (!response.ok) {
        if (parsed?.code === "INVALID_FILE_PASSWORD") {
          setNeedsPassword(true);
        }
        setBlockingError(parsed?.error ?? "The statement could not be analyzed.");
        toast.error(parsed?.error ?? "The statement could not be analyzed.");
        return;
      }

      const rows = parsed.draft?.rows ?? [];
      const newCount = rows.filter((row: PreviewRow) => row.verdict === "new").length;
      const duplicateCount = rows.filter(
        (row: PreviewRow) => row.verdict === "duplicate" || row.verdict === "possible",
      ).length;

      setDraft({
        id: parsed.draft.id,
        fileName: parsed.draft.fileName,
        periodFrom: parsed.draft.periodFrom,
        periodTo: parsed.draft.periodTo,
        closingBalancePaise: parsed.draft.closingBalancePaise,
        totals: parsed.draft.totals,
      });
      setRows(rows);
      setCounters({ new: newCount, duplicate: duplicateCount });
      toast.success(
        `${newCount} new row${newCount === 1 ? "" : "s"} parsed — check the preview, then confirm.`,
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
      const response = await fetch(`/api/imports/${draft.id}/confirm`, {
        method: "POST",
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(body?.error ?? "The import could not be completed.");
        return;
      }

      toast.success(
        `${body.inserted} row${body.inserted === 1 ? "" : "s"} imported into the ledger.`,
      );

      setDraft(null);
      setRows([]);
      setCounters(null);
      setFile(null);
      setPassword("");
      router.refresh(); // the history table + the dashboard totals
    } catch {
      toast.error("The server could not be reached. Try again.");
    } finally {
      setConfirming(false);
    }
  }

  const importableCount = counters?.new ?? 0;

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
              <Input
                id="import-file"
                type="file"
                accept=".xls,.xlsx"
                className="h-9 w-full"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
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
              <span className="figure font-mono text-[10.5px] tracking-[0.06em] text-fg-3 uppercase">
                {counters?.duplicate
                  ? `${counters.duplicate} duplicate${counters.duplicate === 1 ? "" : "s"} will be skipped`
                  : "no duplicates found"}
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
            meta={`${draft.fileName} · ${importableCount} NEW · ${counters?.duplicate ?? 0} DUPLICATE${
              (counters?.duplicate ?? 0) === 1 ? "" : "S"
            }`}
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
                  const hidden = row.verdict === "duplicate" || row.verdict === "invalid";

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
