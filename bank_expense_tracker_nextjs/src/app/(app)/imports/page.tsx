import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { publicErrorMessage } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getPrimaryAccountDoc, last4 } from "@/lib/data/accounts";
import { listImports } from "@/lib/data/imports";
import { ImportUploader } from "@/components/imports/import-uploader";
import { PageHeader } from "@/components/common/page-header";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ImportIcon } from "@/components/ui/icons";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import type { ImportStatus } from "@/types/import";
import { formatStatementDate, parseDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Imports",
};

const STATUS: Record<ImportStatus, { label: string; tone: BadgeTone }> = {
  committed: { label: "COMMITTED", tone: "neutral" },
  draft: { label: "AWAITING REVIEW", tone: "warning" },
  failed: { label: "FAILED", tone: "debit" },
  discarded: { label: "DISCARDED", tone: "neutral" },
};

function period(from: string | null, to: string | null): string {
  const start = parseDate(from);
  const end = parseDate(to);

  if (!start || !end) return "—";
  return `${formatStatementDate(start)} — ${formatStatementDate(end)}`;
}

type ImportsState =
  | { ok: true; imports: Awaited<ReturnType<typeof listImports>> }
  | { ok: false; reason: string };

async function loadImports(userId: string): Promise<ImportsState> {
  try {
    return { ok: true, imports: await listImports(userId) };
  } catch (error) {
    console.error("Imports failed:", error);
    return { ok: false, reason: publicErrorMessage(error) };
  }
}

async function loadAccountLabel(userId: string): Promise<string | null> {
  try {
    const account = await getPrimaryAccountDoc(userId);
    if (!account) return "PRIMARY ACCOUNT";
    return `${account.bankName.toUpperCase()} · ••${last4(account.accountNumber)}`;
  } catch {
    return null;
  }
}

export default async function ImportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [state, accountLabel] = await Promise.all([
    loadImports(session.userId),
    loadAccountLabel(session.userId),
  ]);

  if (!state.ok) {
    return (
      <>
        <PageHeader title="Imports" meta="COULD NOT LOAD" />
        <ErrorState
          title="Import history could not be loaded"
          reason={state.reason}
        />
      </>
    );
  }

  const { imports } = state;

  return (
    <>
      <PageHeader
        title="Imports"
        meta={`${imports.length} statement${imports.length === 1 ? "" : "s"} recorded`}
        description="Analyse an Excel statement, read the preview, then confirm. Rows only reach the ledger after the preview; duplicates are named, never guessed."
      />

      <ImportUploader
        accountLabel={accountLabel}
        initialDraft={null}
        initialRows={[]}
      />

        <div className="mt-6">
        <Panel>
          <PanelHeader
            title="Import history"
            meta={imports.length ? "NEWEST FIRST" : "NOTHING YET"}
          />

          {imports.length ? (
            <Table>
              <thead>
                <tr>
                  <Th className="hidden w-[120px] sm:table-cell">Imported</Th>
                  <Th>File</Th>
                  <Th className="hidden w-[210px] lg:table-cell">Period</Th>
                  <Th className="w-[150px]">Status</Th>
                  <Th className="hidden w-[190px] text-right md:table-cell">
                    Result
                  </Th>
                </tr>
              </thead>
              <tbody>
                {imports.map((item) => {
                  const created = parseDate(item.createdAt);
                  const status = STATUS[item.status];

                  return (
                    <Tr key={item.id}>
                      <Td className="figure hidden whitespace-nowrap text-fg-3 sm:table-cell">
                        {created ? formatStatementDate(created) : "—"}
                      </Td>
                      <Td className="max-w-0">
                        <span className="block truncate text-fg">
                          {item.fileName}
                        </span>
                        <span className="figure mt-1 block text-[10.5px] text-fg-3 uppercase">
                          {item.format} ·{" "}
                          <span className="sm:hidden">
                            {created ? formatStatementDate(created) : "—"} ·{" "}
                          </span>
                          {item.rowsParsed} rows parsed
                        </span>
                      </Td>
                      <Td className="figure hidden text-[11.5px] whitespace-nowrap text-fg-3 lg:table-cell">
                        {period(item.periodFrom, item.periodTo)}
                      </Td>
                      <Td>
                        <Badge tone={status.tone} dot>
                          {status.label}
                        </Badge>
                      </Td>
                      <Td className="figure hidden text-right text-[11.5px] whitespace-nowrap text-fg-2 md:table-cell">
                        {item.status === "committed"
                          ? `${item.inserted} in · ${item.skipped} skipped · ${item.invalid} invalid`
                          : "—"}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              icon={<ImportIcon className="h-4 w-4" />}
              title="No statements imported yet"
              description="Analyze an Excel statement above — the preview appears here before anything is written."
            />
          )}
        </Panel>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Preview first",
              body: "Parsed rows are shown with totals and warnings before anything is written.",
            },
            {
              title: "Duplicates named",
              body: "A row is only flagged as a possible duplicate when the reason can be shown.",
            },
            {
              title: "Nothing partial",
              body: "A failed import leaves no half-written rows and no moved balance.",
            },
          ].map((item) => (
            <div key={item.title} className="panel px-5 py-4">
              <p className="text-[13px] font-medium text-fg">{item.title}</p>
              <p className="mt-1.5 text-[12px] leading-5 text-fg-3">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </>
    );
}
