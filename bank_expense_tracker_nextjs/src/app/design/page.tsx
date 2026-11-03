import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import {
  AlertIcon,
  AnalyticsIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ChevronRightIcon,
  ImportIcon,
  OverviewIcon,
  SearchIcon,
  SettingsIcon,
  TransactionsIcon,
} from "@/components/ui/icons";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { cn, formatINR, splitINR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Design reference",
  robots: {
    index: false,
    follow: false,
  },
};

const balance = 12485000;

const sampleTransactions = [
  {
    date: "31 Oct",
    narration: "UPI/DR/412345678901/AMAZON PAY INDIA/YESB/amazonpay@ybl",
    reference: "412345678901",
    category: "Shopping",
    amountPaise: -248900,
    balancePaise: 12485000,
    credit: false,
  },
  {
    date: "30 Oct",
    narration: "SALARY CREDIT — OCTOBER 2026",
    reference: null,
    category: "Salary",
    amountPaise: 13650000,
    balancePaise: 12733900,
    credit: true,
  },
  {
    date: "29 Oct",
    narration: "ATM WDL/1234/HDFC BANK CONNAUGHT PLACE",
    reference: "1234",
    category: "Cash",
    amountPaise: -500000,
    balancePaise: -916100,
    credit: false,
  },
  {
    date: "28 Oct",
    narration: "INT.PD:01-07-2026 TO 30-09-2026",
    reference: null,
    category: "Interest",
    amountPaise: 18420,
    balancePaise: 4083900,
    credit: true,
  },
  {
    date: "27 Oct",
    narration: "UPI/DR/409876543210/BESCOM ELECTRICITY/UTIB/bescom@sbi",
    reference: "409876543210",
    category: "Bills",
    amountPaise: -218400,
    balancePaise: 4065480,
    credit: false,
  },
];

const surfaces = [
  { name: "bg", hex: "#000000", note: "OLED, pixels off" },
  { name: "surface", hex: "#060606" },
  { name: "surface-2", hex: "#0D0D0D" },
  { name: "surface-3", hex: "#161616" },
];

const ink = [
  { name: "fg", hex: "#FFFFFF" },
  { name: "fg-2", hex: "#CBCBC6" },
  { name: "fg-3", hex: "#9D9D97" },
  { name: "line-strong", hex: "#3A3A3A" },
];

const signals = [
  { name: "credit", hex: "#40D18D", note: "money in" },
  { name: "debit", hex: "#FF6F5E", note: "money out" },
  { name: "warning", hex: "#F5B841", note: "decision waiting" },
  { name: "inverse", hex: "#FFFFFF", note: "the only fill" },
];

const rejected = [
  "Purple-to-blue gradients",
  "Glassmorphism and blurred panels",
  "Cyan or violet neon accents",
  "16px rounded cards on every block",
  "Grey border plus shadow on each card",
  "Inter, Geist, Space Grotesk, Instrument",
  "A serif hero because serif means premium",
  "Emoji standing in for icons",
  "Decorative glow with no meaning",
];

function Section({
  index,
  title,
  lede,
  children,
}: {
  index: string;
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line py-14 md:py-20">
      <div className="grid gap-8 md:grid-cols-[200px_minmax(0,1fr)] md:gap-12">
        <div>
          <p className="label text-fg-3">{index}</p>
          <h2 className="mt-4 text-[19px] leading-tight font-semibold tracking-[-0.02em]">
            {title}
          </h2>
        </div>
        <div className="min-w-0">
          <p className="mb-10 max-w-[62ch] text-[14px] leading-6 text-fg-2">
            {lede}
          </p>
          {children}
        </div>
      </div>
    </section>
  );
}

function Swatch({
  name,
  hex,
  note,
}: {
  name: string;
  hex: string;
  note?: string;
}) {
  return (
    <div>
      <div
        className="h-16 border border-line-soft"
        style={{ backgroundColor: hex }}
      />
      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] text-fg-2">{name}</span>
        <span className="figure text-[10.5px] text-fg-3">{hex}</span>
      </div>
      {note ? (
        <p className="mt-0.5 font-mono text-[10px] tracking-[0.04em] text-fg-3">
          {note}
        </p>
      ) : null}
    </div>
  );
}

function TypeRow({
  role,
  spec,
  sample,
  className,
}: {
  role: string;
  spec: string;
  sample: string;
  className: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-6 border-b border-line-soft py-4 last:border-0">
      <span className={cn("block truncate text-fg", className)}>{sample}</span>
      <span className="shrink-0 text-right">
        <span className="block font-mono text-[10.5px] tracking-[0.08em] text-fg-2 uppercase">
          {role}
        </span>
        <span className="figure mt-0.5 block text-[10px] text-fg-3">
          {spec}
        </span>
      </span>
    </div>
  );
}

export default function DesignReference() {
  const hero = splitINR(balance);

  return (
    <main id="main" className="min-h-dvh">
      <div className="mx-auto w-full max-w-[1240px] px-6 pb-24 md:px-10">
        {/* Masthead */}
        <header className="pt-12 md:pt-16">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[11px] font-semibold tracking-[0.3em] text-fg">
                LEDGER
              </span>
              <span className="font-mono text-[10.5px] tracking-[0.1em] text-fg-3">
                SBI / PERSONAL STATEMENT
              </span>
            </div>
            <span className="font-mono text-[10.5px] tracking-[0.12em] text-fg-3 uppercase">
              Design reference · Phase 0
            </span>
          </div>

          <h1 className="mt-10 max-w-[20ch] text-[38px] leading-[1.05] font-semibold tracking-[-0.035em] sm:text-[48px] md:text-[56px]">
            A statement, not a dashboard.
          </h1>

          <p className="mt-6 max-w-[60ch] text-[14.5px] leading-7 text-fg-2">
            True black. White ink. Figures that line up in a column are set in
            mono; the balance is set heavy and tight so it reads as one mass.
            Colour appears in exactly three places — money in, money out, and a
            decision waiting for you.
          </p>

          <dl className="mt-10 grid max-w-[680px] grid-cols-2 gap-px overflow-hidden bg-line sm:grid-cols-4">
            {[
              { k: "Base", v: "#000000" },
              { k: "Ink", v: "#FFFFFF" },
              { k: "Type", v: "Plex Sans + Mono" },
              { k: "Colour", v: "3 signals only" },
            ].map((item) => (
              <div key={item.k} className="bg-bg px-4 py-3">
                <dt className="label text-fg-3">{item.k}</dt>
                <dd className="figure mt-2 text-[12px] text-fg">{item.v}</dd>
              </div>
            ))}
          </dl>
        </header>

        {/* 01 — Typography */}
        <Section
          index="01 / Type"
          title="Two cuts, one superfamily"
          lede="IBM Plex Sans carries prose and every standalone figure. IBM Plex Mono carries anything that has to line up in a column — dates, references, amounts in a table, micro-labels. Mono is an alignment tool here, not a display trick, and there is no third typeface: no serif standing in for quality."
        >
          <div className="grid items-start gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
            <div className="bg-surface p-7">
              <div className="flex items-start justify-between gap-4">
                <span className="label text-fg-3">Available balance</span>
                <span className="figure text-[10.5px] text-fg-3">
                  SBI ···4821
                </span>
              </div>

              <p className="amount mt-10 text-[34px] leading-none text-fg sm:text-[42px] lg:text-[50px]">
                {hero.major}
                <span className="text-fg-3">{hero.minor}</span>
              </p>

              <div className="mt-8 grid grid-cols-2 gap-4 border-t border-line pt-5">
                <div>
                  <p className="label text-fg-3">In</p>
                  <p className="figure mt-2 text-[15px] text-credit">
                    +1,36,500.00
                  </p>
                </div>
                <div>
                  <p className="label text-fg-3">Out</p>
                  <p className="figure mt-2 text-[15px] text-debit">
                    −18,240.00
                  </p>
                </div>
              </div>

              <p className="mt-8 font-mono text-[10.5px] leading-5 text-fg-3">
                The rupee sign (U+20B9) exists only in the latin-ext subset of
                both cuts, so both subsets are loaded. Verified by reading the
                compiled woff2 character maps.
              </p>
            </div>

            <div>
              <TypeRow
                role="Figure · 50"
                spec="Sans 600 / −0.03em / tabular"
                className="amount text-[40px] leading-none"
                sample="₹12,48,500"
              />
              <TypeRow
                role="Page title · 30"
                spec="Sans 600 / −0.02em"
                className="text-[30px] leading-tight font-semibold tracking-[-0.02em]"
                sample="Transactions"
              />
              <TypeRow
                role="Section · 19"
                spec="Sans 600 / −0.02em"
                className="text-[19px] font-semibold tracking-[-0.02em]"
                sample="Needs attention"
              />
              <TypeRow
                role="Body · 14"
                spec="Sans 400 / 1.6"
                className="text-[14px] leading-6 text-fg-2"
                sample="Eight rows were not matched to your ledger."
              />
              <TypeRow
                role="Data · 13"
                spec="Mono 400 / tabular"
                className="figure text-[13px] text-fg-2"
                sample="−₹2,489.00"
              />
              <TypeRow
                role="Meta · 11"
                spec="Mono 400 / 0.06em"
                className="figure text-[11px] text-fg-3"
                sample="Imported 31 Oct 2026, 18:42"
              />
              <TypeRow
                role="Label · 10.5"
                spec="Mono 500 / 0.16em / caps"
                className="label text-fg-3"
                sample="REFERENCE NUMBER"
              />
            </div>
          </div>
        </Section>

        {/* 02 — Palette */}
        <Section
          index="02 / Colour"
          title="Black, white, and three signals"
          lede="There is no brand accent to spend. Interaction is white — buttons, focus rings, selection, the active row. Colour is reserved for meaning, so a green amount can never be mistaken for a link."
        >
          <div className="space-y-10">
            <div>
              <p className="label mb-3 text-fg-3">Surfaces</p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {surfaces.map((s) => (
                  <Swatch key={s.name} {...s} />
                ))}
              </div>
            </div>

            <div>
              <p className="label mb-3 text-fg-3">Ink &amp; rules</p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {ink.map((s) => (
                  <Swatch key={s.name} {...s} />
                ))}
              </div>
            </div>

            <div>
              <p className="label mb-3 text-fg-3">Signals</p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {signals.map((s) => (
                  <Swatch key={s.name} {...s} />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* 03 — Controls */}
        <Section
          index="03 / Controls"
          title="One fill, then quiet"
          lede="A 36-pixel control height, a 2-pixel corner, a 1-pixel rule. Only the primary action gets a solid fill; secondary actions are outlines that turn white on hover. There is no gradient anywhere in the product."
        >
          <div className="space-y-12">
            <div>
              <p className="label mb-4 text-fg-3">Buttons</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">
                  Import statement
                  <ImportIcon className="h-4 w-4" />
                </Button>
                <Button variant="secondary">Filter</Button>
                <Button variant="ghost">Reset</Button>
                <Button variant="danger">Delete</Button>
                <Button variant="primary" disabled>
                  Disabled
                </Button>
                <Button variant="secondary" size="sm">
                  Small
                </Button>
                <Button variant="secondary" size="lg">
                  Large
                </Button>
              </div>
            </div>

            <div>
              <p className="label mb-4 text-fg-3">Status</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="credit" dot>
                  CREDIT
                </Badge>
                <Badge tone="debit" dot>
                  DEBIT
                </Badge>
                <Badge tone="warning" dot>
                  NEEDS REVIEW
                </Badge>
                <Badge tone="info" dot>
                  IMPORTED
                </Badge>
                <Badge tone="neutral">UNREVIEWED</Badge>
                <Badge tone="neutral">
                  <CheckIcon className="h-3 w-3" />
                  REVIEWED
                </Badge>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Field
                label="Amount"
                htmlFor="demo-amount"
                hint="Rupees and paise. Negative values are debits."
              >
                <Input
                  id="demo-amount"
                  defaultValue="2,489.00"
                  inputMode="decimal"
                  className="figure"
                />
              </Field>
              <Field label="Category" htmlFor="demo-category">
                <Select id="demo-category" defaultValue="Shopping">
                  <option>Shopping</option>
                  <option>Food</option>
                  <option>Travel</option>
                  <option>Bills</option>
                </Select>
              </Field>
              <Field
                label="Reference number"
                htmlFor="demo-reference"
                error="A reference number must be 6 to 22 characters."
              >
                <Input
                  id="demo-reference"
                  defaultValue="4123"
                  aria-invalid="true"
                  aria-describedby="demo-reference-error"
                  className="figure"
                />
              </Field>
              <div className="flex items-start gap-3 pt-6">
                <Checkbox id="demo-reviewed" defaultChecked />
                <label
                  htmlFor="demo-reviewed"
                  className="text-[12.5px] leading-5 text-fg-2"
                >
                  Mark this transaction as reviewed
                  <span className="mt-1 block font-mono text-[10.5px] text-fg-3">
                    Reviewed rows leave the queue, and stay fully legible.
                  </span>
                </label>
              </div>
            </div>
          </div>
        </Section>

        {/* 04 — Data */}
        <Section
          index="04 / Data"
          title="The ledger is the product"
          lede="Rows are dense and ruled horizontally only. Dates, references and amounts are monospaced so they line up down the column. Direction is written as well as coloured — a debit says Debit, not just red."
        >
          <Panel>
            <PanelHeader
              title="Recent activity"
              meta="5 OF 214 ROWS"
              action={
                <Button variant="ghost" size="sm">
                  View all
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <Table>
              <thead>
                <tr>
                  <Th className="hidden w-[86px] sm:table-cell">Date</Th>
                  <Th>Narration</Th>
                  <Th className="hidden w-[124px] md:table-cell">Category</Th>
                  <Th className="hidden w-[118px] sm:table-cell">Type</Th>
                  <Th className="w-[136px] text-right">Amount</Th>
                  <Th className="hidden w-[150px] text-right xl:table-cell">
                    Balance
                  </Th>
                </tr>
              </thead>
              <tbody>
                {sampleTransactions.map((txn) => (
                  <Tr key={`${txn.date}-${txn.reference ?? txn.narration}`}>
                    <Td className="figure hidden whitespace-nowrap text-fg-3 sm:table-cell">
                      {txn.date}
                    </Td>
                    <Td className="max-w-0">
                      <span className="line-clamp-2 text-fg">
                        {txn.narration}
                      </span>
                      <span className="figure mt-1 block truncate text-[10.5px] text-fg-3">
                        <span className="sm:hidden">{txn.date} · </span>
                        {txn.reference
                          ? `REF ${txn.reference}`
                          : "NO REFERENCE"}
                      </span>
                    </Td>
                    <Td className="hidden md:table-cell">
                      <Badge tone="neutral">{txn.category.toUpperCase()}</Badge>
                    </Td>
                    <Td className="hidden sm:table-cell">
                      {txn.credit ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.06em] text-credit">
                          <ArrowDownLeftIcon className="h-3 w-3" />
                          CREDIT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.06em] text-debit">
                          <ArrowUpRightIcon className="h-3 w-3" />
                          DEBIT
                        </span>
                      )}
                    </Td>
                    <Td
                      className={cn(
                        "figure w-[136px] text-right font-medium whitespace-nowrap",
                        txn.credit ? "text-credit" : "text-debit",
                      )}
                    >
                      {formatINR(txn.amountPaise, { signed: true })}
                    </Td>
                    <Td className="figure hidden w-[150px] text-right whitespace-nowrap text-fg-3 xl:table-cell">
                      {formatINR(txn.balancePaise)}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Panel>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Panel>
              <PanelHeader title="Empty state" meta="NOTHING IMPORTED YET" />
              <EmptyState
                icon={<ImportIcon className="h-4 w-4" />}
                title="Import your first SBI statement"
                description="CSV, XLS, or XLSX. You will see every row before anything is saved."
                action={<Button variant="primary">Choose a file</Button>}
              />
            </Panel>

            <Panel>
              <PanelHeader
                title="Attention"
                meta="TWO ITEMS WAITING"
                action={<Badge tone="warning">REVIEW</Badge>}
              />
              <div className="divide-y divide-line-soft">
                <div className="flex items-start gap-3 px-5 py-4">
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <div>
                    <p className="text-[13px] text-fg">
                      Two rows look like duplicates of 31 Oct
                    </p>
                    <p className="mt-1.5 text-[12px] leading-5 text-fg-3">
                      Same date, amount and direction, different narration.
                      Nothing is dropped automatically.
                    </p>
                    <Button variant="secondary" size="sm" className="mt-3">
                      Review rows
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3 px-5 py-4">
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <div>
                    <p className="text-[13px] text-fg">
                      Six transactions are still unreviewed
                    </p>
                    <p className="mt-1.5 text-[12px] leading-5 text-fg-3">
                      They were imported on 31 Oct and have not been confirmed
                      since.
                    </p>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </Section>

        {/* 05 — Composition */}
        <Section
          index="05 / Composition"
          title="Overview"
          lede="One figure owns the page. The balance is set large, heavy and tight in pure white; everything else steps down in both size and value so the eye lands there first. Figures below are sample data."
        >
          <Panel>
            <div className="flex items-center justify-between border-b border-line px-5 py-2.5">
              <span className="label text-fg-3">Overview</span>
              <Badge tone="warning">SAMPLE DATA</Badge>
            </div>

            <div className="grid lg:grid-cols-12">
              <div className="border-b border-line p-7 lg:col-span-7 lg:border-r lg:border-b-0 lg:p-8">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="label text-fg-3">Available balance</span>
                  <span className="figure text-[10.5px] text-fg-3">
                    SBI · SAVINGS · ···4821
                  </span>
                </div>

                <p className="amount mt-7 text-[38px] leading-none sm:text-[52px]">
                  {hero.major}
                  <span className="text-fg-3">{hero.minor}</span>
                </p>

                <p className="mt-5 font-mono text-[10.5px] tracking-[0.04em] text-fg-3">
                  STATEMENT BALANCE · 31 OCT 2026 · ANCHOR IMPORT 14
                </p>

                <div className="mt-9 grid gap-x-6 gap-y-3.5 border-t border-line pt-6 sm:grid-cols-3">
                  <div className="flex items-baseline justify-between gap-3 sm:block">
                    <p className="label text-fg-3">In</p>
                    <p className="figure mt-0 text-[16px] whitespace-nowrap text-credit sm:mt-2.5">
                      +1,36,500.00
                    </p>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 sm:block">
                    <p className="label text-fg-3">Out</p>
                    <p className="figure text-[16px] whitespace-nowrap text-debit sm:mt-2.5">
                      −18,240.00
                    </p>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 sm:block">
                    <p className="label text-fg-3">Net</p>
                    <p className="figure text-[16px] whitespace-nowrap text-fg sm:mt-2.5">
                      +1,18,260.00
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="border-b border-line px-6 py-5">
                  <span className="label text-fg-3">October 2026</span>

                  <dl className="mt-5 space-y-3.5">
                    {[
                      { k: "Spend", v: "18,240.00", cls: "text-fg" },
                      { k: "Income", v: "1,36,500.00", cls: "text-fg" },
                    ].map((row) => (
                      <div
                        key={row.k}
                        className="flex items-baseline justify-between gap-4"
                      >
                        <dt className="text-[12.5px] text-fg-2">{row.k}</dt>
                        <dd className={cn("figure text-[13px]", row.cls)}>
                          {row.v}
                        </dd>
                      </div>
                    ))}
                    <div className="flex items-baseline justify-between gap-4 border-t border-line-soft pt-3.5">
                      <dt className="text-[12.5px] text-fg-2">Net</dt>
                      <dd className="figure text-[13px] text-credit">
                        +1,18,260.00
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="px-6 py-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="label text-fg-3">Review queue</span>
                    <span className="figure text-[13px] text-warning">6</span>
                  </div>
                  <p className="mt-2 font-mono text-[10.5px] leading-5 text-fg-3">
                    Six transactions have not been confirmed since import.
                  </p>
                  <Button variant="secondary" size="sm" className="mt-3">
                    Open queue
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t border-line">
              <div className="flex items-baseline justify-between px-5 py-3.5">
                <span className="text-[12.5px] font-medium text-fg">
                  Recent activity
                </span>
                <span className="label text-fg-3">Latest 3</span>
              </div>
              <Table>
                <thead>
                  <tr>
                    <Th className="hidden w-[86px] sm:table-cell">Date</Th>
                    <Th>Narration</Th>
                    <Th className="hidden w-[120px] sm:table-cell">Category</Th>
                    <Th className="w-[136px] text-right">Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {sampleTransactions.slice(0, 3).map((txn) => (
                    <Tr key={`recent-${txn.reference ?? txn.narration}`}>
                      <Td className="figure hidden whitespace-nowrap text-fg-3 sm:table-cell">
                        {txn.date}
                      </Td>
                      <Td className="max-w-0">
                        <span className="line-clamp-2 text-fg">
                          {txn.narration}
                        </span>
                        <span className="figure mt-1 block truncate text-[10.5px] text-fg-3 sm:hidden">
                          {txn.date} · {txn.category.toUpperCase()}
                        </span>
                      </Td>
                      <Td className="hidden sm:table-cell">
                        <Badge tone="neutral">
                          {txn.category.toUpperCase()}
                        </Badge>
                      </Td>
                      <Td
                        className={cn(
                          "figure w-[136px] text-right font-medium whitespace-nowrap",
                          txn.credit ? "text-credit" : "text-debit",
                        )}
                      >
                        {formatINR(txn.amountPaise, { signed: true })}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Panel>
        </Section>

        {/* 06 — Shell */}
        <Section
          index="06 / Shell"
          title="Application shell"
          lede="A 212-pixel rail, a single hairline, and content that starts at the left edge. The wordmark is small and widely set, like stationery — not a second headline competing with the balance."
        >
          <div className="bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-2.5">
              <span className="label text-fg-3">Shell</span>
              <Badge tone="neutral">PREVIEW</Badge>
            </div>

            <div className="grid min-h-[360px] md:grid-cols-[212px_minmax(0,1fr)]">
              <aside className="border-b border-line p-5 md:border-r md:border-b-0">
                <div className="flex items-baseline gap-2.5">
                  <span className="font-mono text-[12px] font-semibold tracking-[0.24em] text-fg">
                    LEDGER
                  </span>
                </div>
                <p className="mt-1.5 font-mono text-[9.5px] tracking-[0.14em] text-fg-3">
                  SBI ···4821
                </p>

                <nav className="mt-8 space-y-0.5" aria-label="Preview navigation">
                  {[
                    { label: "Overview", icon: OverviewIcon, active: true },
                    { label: "Transactions", icon: TransactionsIcon },
                    { label: "Imports", icon: ImportIcon },
                    { label: "Analytics", icon: AnalyticsIcon },
                    { label: "Settings", icon: SettingsIcon },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        "flex items-center gap-2.5 border-l py-2 pl-3 text-[12.5px]",
                        item.active
                          ? "-ml-px border-fg font-medium text-fg"
                          : "-ml-px border-transparent text-fg-3",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </div>
                  ))}
                </nav>

                <div className="mt-8 border-t border-line pt-4">
                  <p className="text-[11.5px] text-fg-2">Himanshu Singh</p>
                  <p className="figure mt-1 text-[10.5px] text-fg-3">
                    LAST IMPORT 31 OCT
                  </p>
                </div>
              </aside>

              <div className="p-6 md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
                  <div>
                    <h3 className="text-[26px] leading-tight font-semibold tracking-[-0.025em]">
                      Overview
                    </h3>
                    <p className="figure mt-2 text-[10.5px] tracking-[0.06em] text-fg-3">
                      RECONCILED 31 OCT 2026
                    </p>
                  </div>
                  <Button variant="primary" size="sm">
                    <ImportIcon className="h-3.5 w-3.5" />
                    Import
                  </Button>
                </div>

                <div className="mt-7 border-t border-line pt-5">
                  <div className="grid gap-5 sm:grid-cols-3">
                    {["Balance", "This month", "Unreviewed"].map((label) => (
                      <div key={label}>
                        <p className="label text-fg-3">{label}</p>
                        <div className="mt-3 h-5 w-24 bg-surface-3" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 border-t border-line pt-5">
                  <div className="flex items-center justify-between">
                    <p className="label text-fg-3">Recent activity</p>
                    <SearchIcon className="h-3.5 w-3.5 text-fg-3" />
                  </div>
                  <div className="mt-5 space-y-3">
                    {[72, 58, 66, 44].map((width, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="h-3 w-10 bg-surface-3" />
                        <div
                          className="h-3 bg-surface-3"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* 07 — Rejected */}
        <Section
          index="07 / Not this"
          title="What the system refuses to do"
          lede="These are the patterns that make an interface read as generated rather than designed. They are banned here, and they are written down so they cannot creep back in later."
        >
          <ul className="grid gap-x-10 gap-y-0 sm:grid-cols-2">
            {rejected.map((item) => (
              <li
                key={item}
                className="flex items-baseline gap-3 border-b border-line-soft py-3"
              >
                <span className="mt-px text-[11px] text-debit">✕</span>
                <span className="text-[13px] text-fg-2">{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <footer className="flex flex-wrap items-start justify-between gap-6 border-t border-line pt-8">
          <p className="max-w-[62ch] font-mono text-[10.5px] leading-5 text-fg-3">
            Development artifact for Phase 0. No real financial data appears on
            this page. The root route becomes a redirect to /dashboard once the
            application shell is connected to persisted transactions.
          </p>
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.1em] text-fg-3">
            <span className="inline-block h-1 w-1 rounded-full bg-credit" />
            TOKENS COMPILED
          </div>
        </footer>
      </div>
    </main>
  );
}
