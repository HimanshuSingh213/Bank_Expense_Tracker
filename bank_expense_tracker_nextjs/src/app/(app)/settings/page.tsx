import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/common/page-header";
import { LogoutButton } from "@/components/common/logout-button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SettingsIcon } from "@/components/ui/icons";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { getSession } from "@/lib/auth/session";
import { publicErrorMessage } from "@/lib/errors";
import {
  currentBalancePaise,
  getPrimaryAccountDoc,
  last4,
} from "@/lib/data/accounts";
import { getUserById } from "@/lib/data/users";
import { formatINR, formatStatementDate, splitINR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Settings",
};

type SettingsState =
  | {
      ok: true;
      user: { name: string; email: string; provider: string };
      balancePaise: number;
      anchor: {
        balancePaise: number;
        asOfDate: Date;
        source: string;
        note: string | null;
      } | null;
      account: { bankName: string; accountType: string; last4: string } | null;
    }
  | { ok: false; reason: string };

async function loadSettings(userId: string): Promise<SettingsState> {
  try {
    const [user, account] = await Promise.all([
      getUserById(userId),
      getPrimaryAccountDoc(userId),
    ]);

    if (!user) {
      return { ok: false, reason: "The signed-in user no longer exists." };
    }

    return {
      ok: true,
      user: {
        name: user.name ?? "",
        email: user.email ?? "",
        provider: user.provider ?? "local",
      },
      balancePaise: account ? await currentBalancePaise(userId, account) : 0,
      anchor: account?.balanceAnchor
        ? {
            balancePaise: account.balanceAnchor.balancePaise,
            asOfDate: account.balanceAnchor.asOfDate,
            source: account.balanceAnchor.source,
            note: account.balanceAnchor.note ?? null,
          }
        : null,
      account: account
        ? {
            bankName: account.bankName,
            accountType: account.accountType,
            last4: last4(account.accountNumber),
          }
        : null,
    };
  } catch (error) {
    console.error("Settings failed:", error);
    return { ok: false, reason: publicErrorMessage(error) };
  }
}

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const state = await loadSettings(session.userId);

  if (!state.ok) {
    return (
      <>
        <PageHeader title="Settings" meta="COULD NOT LOAD" />
        <ErrorState
          title="Settings could not be loaded"
          reason={state.reason}
        />
      </>
    );
  }

  const { user, balancePaise, anchor, account } = state;
  const hero = splitINR(balancePaise);

  return (
    <>
      <PageHeader
        title="Settings"
        meta="ACCOUNT · BALANCE · SESSION"
        description="These details come from the existing database. Editing is deliberately limited until the import pipeline is connected, so a balance change can never happen by accident."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Account" meta="ACCOUNTINFOS" />
          {account ? (
            <dl className="divide-y divide-line-soft px-5">
              <Row label="Bank">{account.bankName}</Row>
              <Row label="Type">{account.accountType}</Row>
              <Row label="Account">
                <span className="figure">···{account.last4}</span>
              </Row>
              <Row label="Currency">INR</Row>
            </dl>
          ) : (
            <EmptyState
              icon={<SettingsIcon className="h-4 w-4" />}
              title="No account record"
              description="Add one accountinfos document for this owner, then reload."
            />
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Balance"
            meta={anchor ? "ANCHORED LEDGER" : "ALL RECORDED TRANSACTIONS"}
            action={
              anchor ? (
                <Badge tone="neutral">{anchor.source.toUpperCase()}</Badge>
              ) : undefined
            }
          />

          <div className="px-5 py-5">
            <p className="label text-fg-3">Current balance</p>
            <p className="amount mt-2 text-[30px] leading-none text-fg">
              {balancePaise < 0 ? "−" : ""}
              {hero.major}
              <span className="text-fg-3">{hero.minor}</span>
            </p>

            <div className="mt-6 border-t border-line pt-5">
              <p className="label text-fg-3">Formula</p>
              <p className="figure mt-2.5 text-[11.5px] leading-6 text-fg-2">
                anchor + Σ signed transactions after the anchor date
              </p>
            </div>

            <dl className="mt-5 divide-y divide-line-soft">
              <Row label="Anchor balance">
                {anchor ? formatINR(anchor.balancePaise) : "None"}
              </Row>
              <Row label="As of">
                {anchor
                  ? formatStatementDate(anchor.asOfDate)
                  : "No anchor set"}
              </Row>
              <Row label="Note">{anchor?.note || "—"}</Row>
            </dl>

            <p className="mt-4 text-[12px] leading-5 text-fg-3">
              {anchor
                ? "Transactions dated on or before the anchor are historical context; they do not change the current balance."
                : "With no anchor, every recorded transaction contributes. That is only safe when the full history is present."}
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Session" meta="ONE OWNER" />
          <dl className="divide-y divide-line-soft px-5">
            <Row label="Name">{user.name || "—"}</Row>
            <Row label="Email">{user.email || "—"}</Row>
            <Row label="Provider">{user.provider || "local"}</Row>
          </dl>
          <div className="px-5 py-4">
            <p className="text-[12px] leading-5 text-fg-3">
              The session is an httpOnly cookie, valid for seven days. Signing
              out clears it immediately.
            </p>
            <LogoutButton className="mt-3 -ml-2" />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Data" meta="WHAT THIS BUILD READS" />
          <div className="px-5 py-5">
            <p className="text-[12.5px] leading-6 text-fg-2">
              Collections are read in place:{" "}
              <span className="figure text-fg">userinfos</span>,{" "}
              <span className="figure text-fg">accountinfos</span>,{" "}
              <span className="figure text-fg">transactions</span> and{" "}
              <span className="figure text-fg">statementimports</span>.
            </p>
            <p className="mt-3 text-[12px] leading-5 text-fg-3">
              No collection is renamed, migrated or rewritten. Money is stored
              as integer paise in new fields; original fields are kept so the
              legacy application keeps working.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-[12px] text-fg-3">{label}</dt>
      <dd className="figure text-right text-[12.5px] break-words text-fg-2">
        {children}
      </dd>
    </div>
  );
}
