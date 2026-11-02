# Rebuild Plan — SBI Expense Manager (Next.js)

> **Phase 2 deliverable** required by `AGENTS.md` §4.
> Derived from `docs/legacy-audit.md` (verified 1 November 2026) and the conventions of
> [`HimanshuSingh213/Anviksha`](https://github.com/HimanshuSingh213/Anviksha).
>
> **Status: awaiting approval.** Application code so far is limited to the Phase 0 design
> foundation (tokens, fonts, UI primitives, and a `noindex` specimen page). No business logic,
> no database access, no API routes.
> The legacy app is untouched and remains the reference implementation until cutover.

---

## 0. Approval summary

This plan does three things:

1. **Fixes the three unsafe foundations** the audit found — unscoped data access, balance overwritten from statement files, and duplicate detection that ignores the SBI reference column.
2. **Builds the SBI-first product** in the Anviksha folder/route/validation style, with a restrained dark financial UI.
3. **Sequences the work** into nine small phases, each with acceptance criteria and a required check run.

**What I need from you to start Phase 0:** approval of this plan, or amendments to the decisions in §2.

**What I need before Phase 3 (parser):** at least one **sanitised** SBI statement per format you actually use (CSV, XLS/XLSX, password-protected). Without them the parser cannot be verified against reality — see D1.

---

## 1. Scope

### 1.1 In scope (release 1)

- One owner, one SBI account (model supports more; UI shows one).
- Login, session, logout.
- Upload → detect → parse → normalise → duplicate analysis → preview → confirm → import history.
- Transaction list, search, filter, sort, pagination, detail, create, edit, delete, review toggling.
- Balance that is correct by construction and reconcilable against imported statements.
- Dashboard summary and analytics computed server-side from persisted transactions.
- Settings: account profile, balance anchor, CSV export.
- Tests protecting every financial rule above.

### 1.2 Explicitly out of scope (release 1)

Other banks · PDF statements · AI features · budgets · recurring-transaction detection · multi-window calculator · bulk review beyond "select → mark reviewed" · notifications · mobile app · public registration · multi-tenant UI.

---

## 2. Decisions requiring your approval

Each decision has a **recommended default**. If you approve the plan as written, these defaults are what I implement.

| # | Decision | Recommended default | Why |
|---|---|---|---|
| **D1** | SBI statement samples | You provide ≥1 **sanitised** sample per format before Phase 3. If none by then, release 1 ships CSV/TSV only and XLS/XLSX is reported as "unsupported format" until samples arrive. | The audit found the preset metadata is cosmetic and the parser guesses columns. Profiles must be written against real headers, not assumptions. |
| **D2** | Balance meaning | **Anchored ledger** (see §9): `balance = anchor.balance + Σ signed transactions after anchor.date`. `currentBalance` remains in the DB only as a cached projection of that formula. | Works with partial history, never clobbers on historical import, and can be reconciled. |
| **D3** | Historical import effect | Importing a statement whose period ends **before** the current anchor date **never** changes the account balance. The preview shows this explicitly. | Direct fix for audit §6.4(2). |
| **D4** | Auth model | Keep the **single app password** (env-stored scrypt hash) and issue an **httpOnly** session cookie. No registration, no second user. | Personal app; `AGENTS.md` §8 forbids public registration. No user data model change required. |
| **D5** | Account scope | One account in the UI; schema fields (`userId` on account) already support more later. | Avoids premature multi-account UI. |
| **D6** | Theme | **Dark**, true black `#000000` with pure white ink, monospaced figures, and colour reserved for credit/debit/warning (§6.1). | Confirmed direction in `AGENTS.md` §7; legacy was effectively light. Pure black is deliberate for OLED. |
| **D7** | PDF | Deferred. | Legacy does not support it; no samples. |
| **D8** | Excel library | `exceljs` for `.xlsx`, HTML-table sniffing for `.xls`-as-HTML. **No `xlsx@0.18.5`.** True binary `.xls` (BIFF) returns a clear "convert to CSV/XLSX" error in release 1. | Avoids the known advisories in the pinned SheetJS npm build (audit §9.2.10). Revisit if your samples prove BIFF is required. |
| **D9** | Money representation | **Integer paise** in new fields; legacy `amount: Number` kept in sync for compatibility and read-time converted with `Math.round(x * 100)`. | Precision-safe without a data migration. |
| **D10** | Delete semantics | **Soft delete** (`deletedAt`), excluded from every query, restorable. | Financial records should be recoverable; satisfies "never destroy data without permission". |
| **D11** | Mongo writes | Use `session`/transaction when the deployment supports it; otherwise a documented ordered-write + idempotency + recovery path. Detected at runtime. | Audit found every multi-write path non-atomic. |
| **D12** | Legacy app coexistence | The new app reads the **same database**. Only one app may write at a time. Freeze legacy writes when Phase 5 (import confirm) lands. | Two writers would corrupt the balance projection. |
| **D13** | Raw file retention | Do **not** store uploaded statement files. Store SHA-256, file name, size, parsed rows, and each transaction's raw source row. | Provenance without storing full bank statements (AGENTS §8, §14). |
| **D14** | Client data flow | Client components + `axios` + typed `ApiResponse<T>` (Anviksha style). No Zustand unless a real need appears. Server components only for shell/layout. | Matches your habits; keeps one data path and server-authoritative filtering. |
| **D15** | Charts | Phase 7 decides between `recharts` and lightweight CSS bars. Default: CSS bars + tables first, add `recharts` only if a chart genuinely adds information. | Avoids bundle creep on a personal dashboard. |

---

## 3. Conventions adopted from Anviksha

| Convention | How it is applied here |
|---|---|
| Route groups `(auth)` / `(app)` | `src/app/(auth)/login`, `src/app/(app)/{dashboard,transactions,imports,analytics,settings}` |
| API under `src/app/api/(auth)/…` and feature folders | `api/(auth)/login`, `api/transactions`, `api/accounts`, `api/imports`, `api/dashboard` |
| `ApiSuccessResponse<T>` / `ApiErrorResponse` | Same shape, extended error-code union (§14) |
| Zod schemas in `src/validations/*.validation.ts` | `login.validation.ts`, `transaction.validation.ts`, `import.validation.ts`, `account.validation.ts` |
| Co-located tests `*.test.ts` | Domain logic tested next to its source; fixtures under `tests/fixtures/` |
| Vitest + Testing Library, `vitest.config.mjs` + `vitest.setup.tsx` | Copied structure from Anviksha, `@` alias resolved |
| `src/lib/<domain>/` for pure logic | `src/lib/accounting/`, `src/lib/statement/`, `src/lib/transactions/` |
| Local `cn()` helper (no `clsx`/`tailwind-merge`) | `src/lib/utils.ts` as in Anviksha |
| `sonner` toasts, `react-hook-form` + `zodResolver` | Same stack, same usage. Icons are hand-drawn in `components/ui/icons.tsx` (1.5px stroke, 20px grid) instead of `lucide-react` — a 14-icon set is smaller than the dependency and stays visually consistent |
| Page metadata per route | `export const metadata` in each page/layout |
| Design tokens in `globals.css` via `@theme inline` | Same mechanism; the palette and type pairing are original (§6.1) |

**Deliberate deviations from Anviksha:**

- Session cookie is **httpOnly** (Anviksha reads `document.cookie`; that is not acceptable for financial data).
- No `zustand` in release 1.
- No `cheerio`, `jspdf`, `html2canvas`, `@vercel/analytics`.

---

## 4. Target folder structure

Only create folders that contain real code. This is the shape at the **end** of Phase 9.

```text
bank_expense_tracker_nextjs/
├── AGENTS.md
├── docs/
│   ├── legacy-audit.md
│   └── rebuild-plan.md
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       ├── page.tsx
│   │   │       └── layout.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx                 # shell: sidebar/topbar, session guard
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── transactions/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── imports/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── api/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── logout/route.ts
│   │   │   │   └── session/route.ts
│   │   │   ├── accounts/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── transactions/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [id]/route.ts
│   │   │   │   └── bulk-review/route.ts
│   │   │   ├── imports/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       └── confirm/route.ts
│   │   │   └── dashboard/summary/route.ts
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── page.tsx                       # redirect → /dashboard
│   ├── components/
│   │   ├── common/                        # AppShell, NavBar, PageHeader, ErrorBoundary
│   │   ├── ui/                            # Button, Input, Select, Badge, Card, Table,
│   │   │                                  # Dialog, Skeleton, EmptyState, ErrorState, Pagination
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── imports/
│   │   ├── analytics/
│   │   └── settings/
│   ├── hooks/                             # useDebouncedValue, useTransactionFilters
│   ├── lib/
│   │   ├── dbConnect.ts
│   │   ├── utils.ts                       # cn, formatINR, formatDate, formatDateRange
│   │   ├── auth/
│   │   │   ├── password.ts                # scrypt hash/verify
│   │   │   ├── session.ts                 # jose sign/verify, cookie helpers
│   │   │   └── require-session.ts         # server guard + ownership helpers
│   │   ├── accounting/
│   │   │   ├── balance.ts                 # anchored-ledger maths (pure)
│   │   │   └── balance.test.ts
│   │   ├── transactions/
│   │   │   ├── identity.ts                # reference extraction + dedupe keys
│   │   │   ├── duplicates.ts              # candidate matching / confidence
│   │   │   └── *.test.ts
│   │   ├── statement/
│   │   │   ├── types.ts
│   │   │   ├── detect.ts                  # content sniffing
│   │   │   ├── read-workbook.ts           # xlsx / html / delimited → table rows
│   │   │   ├── profiles/sbi.ts            # header maps per SBI layout
│   │   │   ├── normalize.ts               # dates, amounts, direction, reference
│   │   │   ├── parse.ts                   # orchestration, issues, totals
│   │   │   └── *.test.ts
│   │   ├── imports/
│   │   │   ├── draft.ts                   # create/read/expire drafts
│   │   │   └── commit.ts                  # atomic confirm + balance update
│   │   └── data/                          # ownership-scoped repository functions
│   │       ├── accounts.ts
│   │       ├── transactions.ts
│   │       └── imports.ts
│   ├── models/
│   │   ├── user.model.ts
│   │   ├── account.model.ts
│   │   ├── transaction.model.ts
│   │   └── statement-import.model.ts
│   ├── types/
│   │   ├── ApiResponse.ts
│   │   ├── transaction.ts
│   │   ├── account.ts
│   │   ├── statement.ts
│   │   └── dashboard.ts
│   └── validations/
│       ├── login.validation.ts
│       ├── transaction.validation.ts
│       ├── account.validation.ts
│       └── import.validation.ts
├── tests/
│   ├── fixtures/statements/               # sanitised files only
│   ├── helpers/db.ts                      # mongodb-memory-server bootstrap
│   └── integration/*.test.ts
├── vitest.config.mjs
├── vitest.setup.tsx
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

**Not created:** `store/`, `repositories/`, `services/`, DI containers, `src/lib/ai/` (no AI in release 1).

---

## 5. Route and page map

| Route | Group | Purpose | Data source |
|---|---|---|---|
| `/` | — | Redirect to `/dashboard` | — |
| `/login` | `(auth)` | Password entry, error/rate-limit states | `POST /api/auth/login` |
| `/dashboard` | `(app)` | Account snapshot, month metrics, attention strip, recent activity | `GET /api/dashboard/summary`, `GET /api/transactions?limit=8` |
| `/transactions` | `(app)` | Filterable, searchable, paginated ledger | `GET /api/transactions` |
| `/transactions/[id]` | `(app)` | Full detail, provenance, edit, delete | `GET/PATCH/DELETE /api/transactions/[id]` |
| `/imports` | `(app)` | Upload panel + import history | `POST/GET /api/imports` |
| `/imports/[id]` | `(app)` | Draft preview **or** committed result | `GET /api/imports/[id]` |
| `/analytics` | `(app)` | Range-based totals, category split, monthly trend | `GET /api/dashboard/summary?from=&to=` |
| `/settings` | `(app)` | Account profile, balance anchor, export, session | `GET/PATCH /api/accounts/[id]` |

**URL state is authoritative for filters.** `/transactions?q=amazon&from=2026-10-01&to=2026-10-31&category=Shopping&direction=debit&reviewed=false&page=2` must be linkable, bookmarkable, and survive refresh. No filter state lives only in React.

---

## 6. UI system and page specifications

### 6.1 Design language — "Statement"

A statement, not a dashboard. True black for an OLED panel, pure white ink, and colour reserved
almost entirely for money direction. Rows are ruled horizontally like a printed statement;
nothing is boxed.

This direction exists because the previous draft was the AI default wearing better clothes: a
neutral grotesque body with an "editorial" serif display, a coloured accent doing interaction,
and a 1px grey border around every card. Current field guidance on AI-generated interfaces
names exactly those tells — `Inter`/`Geist`/`Space Grotesk`, a "serif means premium" display
face, purple-to-blue gradients, neon on dark, and a bordered card for every block. The system
below is the deliberate inverse.

**What is banned, and why:**

| Rejected | Reason |
|---|---|
| Gradients of any kind | The single strongest "generated" signal; used as wallpaper, never meaning |
| Glass / blur / glow | Decoration that hides hierarchy instead of creating it |
| Cyan or violet accents | The cyberpunk default, disconnected from a bank statement |
| A serif display face | "Serif = premium" is a reflex, not a decision |
| Inter, Geist, Space Grotesk, Instrument | The most over-used defaults in generated UI |
| Rounded 12–16px cards | Turns a ledger into a marketing page |
| Grey border + shadow on every card | The #1 layout tell; panels lift by value instead |
| Emoji as icons | Signals throwaway work |

Palette (implemented in `src/app/globals.css`):

```css
:root {
  /* Surfaces — true black (OLED), panels lift by value only */
  --bg: #000000;
  --surface: #060606;
  --surface-2: #0d0d0d;
  --surface-3: #161616;

  /* Rules — structural hairlines, never card outlines */
  --line-soft: #141414;
  --line: #242424;
  --line-strong: #3a3a3a;
  --line-control: #666666;   /* 3.7:1 — WCAG 1.4.11 for input/button edges */

  /* Ink — one pure white, two supporting values */
  --fg: #ffffff;             /* 21:1 on black */
  --fg-2: #cbcbc6;           /* 12.9:1 */
  --fg-3: #9d9d97;           /* 7.7:1 */
  --fg-inverse: #000000;

  /* Money direction — the only saturated colour in the product */
  --credit: #40d18d;         /* 10.7:1 — money in */
  --debit: #ff6f5e;          /*  7.7:1 — money out */
  --warning: #f5b841;        /* 11.8:1 — a decision waiting */
}
```

Measured contrast on `--surface` (#060606):  white 20.3 · `--fg-2` 12.4 · `--fg-3` 7.4 ·
credit 10.4 · debit 7.4 · warning 11.4. Everything clears WCAG AAA for normal text; the
smallest label is 10.5px and still measures 7.4:1.

**Typography — one superfamily, two cuts:**

| Role | Face | Setting |
|---|---|---|
| Prose, headings, standalone figures | **IBM Plex Sans** | 400 / 500 / 600 |
| Anything that must align in a column | **IBM Plex Mono** | 400 / 500 / 600 |

The split is functional, not decorative. **Mono sets what lines up** — dates, references,
amounts in a table, micro-labels. **The sans sets what stands alone** — the balance, a page
title, a section heading — because a display figure should read as one mass, not as a row of
characters. Both are loaded through `next/font` with **`latin-ext`**, since U+20B9 (₹) lives
only in that subset; this was verified by reading the compiled `woff2` cmaps, not assumed.
Instrument Sans/Serif were rejected earlier for having no ₹ glyph at all.

IBM Plex was commissioned for a specific product and has real letterform quirks (the angled
`a` terminal, the flattened `g`); it is not one of the default faces that generated interfaces
reach for.

Type scale: label 10.5px/0.16em caps · meta 11px · table 13px · body 14px · section 19px ·
page title 30px · display figure 50–60px at −0.03em.

Rules:

- **Radii 2px. One border weight (1px). One shadow (dialog overlay only).**
- **Interaction is white.** Buttons, focus rings, selection, the active nav rule. There is no
  brand accent to spend, so a green amount can never be mistaken for a link.
- **Exactly one filled control exists:** the primary button (white fill, black label).
  Everything else is an outline or a ghost.
- **Panels have no border and no radius.** Separation comes from spacing and a value shift to
  `--surface`. Hairlines are used only as structural rules (table rows, section dividers).
- Money is never colour-only: amounts carry `+`/`−`, and the row states `Debit`/`Credit` where
  space allows.
- Focus ring: 2px `--fg`, 2px offset, everywhere, and it never fades in — `:focus-visible` sets
  `transition: none` so the ring is either there or it is not. Selection inverts to white-on-black.
- Control edges (inputs, outlined buttons, checkboxes) use `--line-control`, because a 1.85:1
  hairline fails WCAG 1.4.11; structural rules keep the quieter `--line`.
- `prefers-reduced-motion` removes transitions.
- A live specimen of every token, control and composition lives at `/` while the app shell is
  being built (development artifact, sample figures labelled, `noindex`).

### 6.2 Shared UI primitives (`components/ui/`)

| Component | Contract |
|---|---|
| `Button` | variants `primary \| secondary \| ghost \| danger`, `size`, `loading`, disabled-while-pending, `aria-busy` |
| `Input` / `Select` / `Textarea` | label, hint, error, `aria-invalid`, `aria-describedby`; error text below, never an `alert()` |
| `Panel` / `PanelHeader` | no border, no radius, no shadow; a value lift to `--surface` separates it. Header carries title (sans), meta (mono), and one action |
| `Badge` | `neutral \| credit \| debit \| warning \| info` |
| `Table` | sticky header, zebra-free row separators, hover, sortable header buttons, `aria-sort` |
| `Dialog` | focus trap, Escape to close, restore focus, `role="dialog"` + `aria-modal`, scroll lock |
| `Skeleton` | per-page shapes, not a generic spinner |
| `EmptyState` | icon, heading, one sentence, one next action |
| `ErrorState` | heading, reason, retry button |
| `Pagination` | page, page size, total, first/prev/next/last |

### 6.3 Page specs

**Login (`/login`)**
Single password field, show/hide, submit with pending state, inline error for wrong password, explicit message for rate limiting with retry time, no "100% local" copy (data is server-side).

**Dashboard (`/dashboard`)**
1. `PageHeader`: "Dashboard" + account line "SBI · Savings · ****1234" + primary action **Import statement**.
2. **Balance panel** (the hero, one panel): current balance set large in IBM Plex Sans 600 at −0.03em, tabular; below it `Statement balance ₹X as of 31 Oct 2026` + `Since then: +₹12,400 in · −₹8,150 out` in mono; a "Reconcile" link opening a dialog with the formula and the anchor source.
3. **Metric row** (4 max): Spend this month · Income this month · Net change · Unreviewed.
4. **Needs attention** strip, only when non-empty: unreviewed transactions, draft import waiting, possible duplicates in the last import, balance not reconciled.
5. **Recent activity** table: 8 rows — date, narration (2-line clamp), category, ref, amount. Link to `/transactions`.

States: skeleton matching panel heights; empty (no transactions) → import CTA + "or add a transaction"; error → `ErrorState` with retry; no fake numbers ever.

**Transactions (`/transactions`)**
Toolbar: search (300 ms debounce, server-side), date range (This month / Last month / Last 3 months / Custom), category multi-select, direction toggle, review status, **Reset**.
Table columns: `☐ | Date | Narration & reference | Category | Type | Amount | Balance | Review`.
Below `sm`, the date column is dropped and the date is printed into the narration's mono meta
line (`31 Oct · REF 412345678901`); narration clamps to two lines. Direction stays written, not
merely coloured, at every width.
Row click → `/transactions/[id]`. Selection enables a sticky bar: `N selected` → **Mark reviewed** / **Mark unreviewed** / **Clear**.
Pagination: server-side, 25 default, 50/100 options, total count shown.

**Transaction detail (`/transactions/[id]`)**
Read-only facts: amount + direction, date, value date (if present), narration verbatim, reference, category, balance after, review status and timestamp, source (`import`/`manual`), import file name + row number.
Actions: **Edit** (dialog form), **Delete** (confirm dialog stating the exact balance effect), **Mark reviewed**.
Not-found and forbidden states are distinct pages, not toasts.

**Imports (`/imports`)**
Upload panel: drag-and-drop + file picker, accepted formats stated, size/row limits stated, client-side pre-check, password field appears only when the server reports `PASSWORD_REQUIRED`.
History table: file name, period, rows inserted / skipped / invalid, status badge, date, link to `/imports/[id]`.
Empty state: explains the three-step flow.

**Import detail (`/imports/[id]`)**
Draft mode:
- Summary cards: rows parsed · new · possible duplicates · invalid · total credits · total debits · opening balance · closing balance.
- Warning banner when `opening + credits − debits ≠ closing` (with the exact difference) or when the statement period does not continue from the last anchor.
- Tabs: All · New · Possible duplicates · Invalid.
- Per-row: checkbox, date, narration, reference, direction (editable), category (editable), amount, issue text explaining **why** it was flagged.
- Sticky footer: selected count, **Confirm import (N)**, and an **Update balance anchor to this statement** checkbox — disabled with a reason when the statement predates the anchor (D3).

Committed mode: immutable result summary with the same counts and a link to the filtered transactions.

**Analytics (`/analytics`)**
Range selector; totals (credits, debits, net); category breakdown table with count, total, share bar; monthly trend (table + optional bars); top recipients. All values come from the server; the page performs no arithmetic on fetched lists.

**Settings (`/settings`)**
Account profile (bank name, type, last 4 only), **balance anchor** (current anchor, source, date; "Set balance manually" requires a note and shows the effect), CSV export of the filtered ledger, session info + **Log out**, and a placeholder danger zone clearly marked "not available in this release".

### 6.4 Responsive and accessibility requirements

- ≥1280px: full layout with left navigation.
- 768–1279px: navigation collapses to a top bar; tables keep all columns.
- <768px: tables become stacked record cards; amounts stay right-aligned and fully visible; filter toolbar becomes a sheet.
- Every page: loading, empty, success, validation error, server error, disabled/pending action states.
- Keyboard: all actions reachable, dialogs trap and restore focus, skip-to-content link, `aria-live` for toasts and import progress.

---

## 7. Data model mapping

**Strategy: extend in place.** Keep the existing collections and `_id` values. Add fields; never rename or delete a stored field without a separate approved migration. All new fields are optional at the schema level so legacy documents remain valid.

### 7.1 `userinfos` → `src/models/user.model.ts`

| Field | Change |
|---|---|
| `_id`, `name`, `email`, `provider`, timestamps | Keep. **Remove** the hard-coded personal defaults; values must be explicit. |
| `passwordHash` | **Not added.** The app password lives in `AUTH_PASSWORD_HASH` (env), not per-user. |
| `settings` | New optional subdocument (locale, date format). Reserved; not used in release 1. |

Exactly one document is expected. Phase 2 includes a read-only check that reports how many exist; it does not create or delete any.

### 7.2 `accountinfos` → `src/models/account.model.ts`

| Field | Change |
|---|---|
| `_id`, `userId`, `accountId`, `bankName`, `accountType`, `accountNumber`, `parserPreset`, `currentBalance`, `lastSyncedAt`, timestamps | Keep for compatibility. `parserPreset` is deprecated and never read. `accountNumber` stores **last 4 only**. |
| `currency` | New, default `"INR"`. |
| `balanceAnchor` | New: `{ balancePaise: number, asOfDate: Date, source: "statement" \| "manual" \| "opening", importId?: ObjectId, note?: string, setAt: Date }`. |
| `currentBalance` | Becomes a **cached projection** of `computeBalance()`. Written only by the same operation that changes the anchor or transactions (§9). |

**Naming note:** `accountinfos.accountId` (string, e.g. `ACC-1759…`) is a human-readable reference. `transactions.accountId` (ObjectId) is the foreign key. The new code never joins by the string field; it uses `_id`. This is documented in the model file.

### 7.3 `transactions` → `src/models/transaction.model.ts`

| Legacy field | New handling |
|---|---|
| `userId` | **Required at write time** (application-enforced). Every query filters on it. |
| `accountId` (ObjectId) | Required at write time; ownership verified via the account. |
| `title` | Keep. Now a short display title derived from narration; never truncated with `...` in a way that hides information (full narration is preserved in `description`). |
| `amount` (Number) | Keep in sync: `amount = amountPaise / 100` for legacy readers. Never used in domain maths. |
| `isExpense` | Keep as the canonical direction flag for compatibility. |
| `category` | Keep, but constrained to a fixed vocabulary (§7.5). Default **`Others`**. |
| `recipient`, `description`, `isOnline` | Keep. `description` holds the verbatim narration and is never truncated. |
| `reviewed` | Keep; add `reviewedAt`. |
| `balance` | Keep as the statement's running balance at that row when present. |
| `fingerprint` | Keep for legacy compatibility but stop relying on it. |
| `source` | Keep: `"manual" \| "statement-import"`. |
| `date` (Mixed) | Keep untouched. New reads use `txnDate` and fall back to `date` when `txnDate` is absent. |
| **New** `amountPaise` | Integer paise. Authoritative for all new maths. |
| **New** `txnDate` | `Date` at `00:00:00.000Z` of the statement date (calendar date, not a timestamp). |
| **New** `valueDate` | Optional `Date` at UTC midnight. |
| **New** `direction` | `"debit" \| "credit"` — derived and stored to make queries explicit. Must always agree with `isExpense`. |
| **New** `referenceNumber` | Parsed from the SBI ref/cheque column, else from narration. |
| **New** `balanceAfterPaise` | Statement running balance in paise, when present. |
| **New** `dedupeKey` | Sparse **unique** index; set only when a strong reference exists (§10). |
| **New** `importId`, `importRowNumber`, `rawRow` | Provenance. `rawRow` is the original cell array for that row. |
| **New** `deletedAt` | Soft delete marker. Every query filters `deletedAt: null`. |

Indexes: `{ userId, txnDate: -1 }`, `{ userId, accountId, txnDate: -1 }`, `{ userId, category, txnDate: -1 }`, `{ userId, reviewed }`, `{ dedupeKey: 1 }` **unique + sparse**, `{ importId }`.

### 7.4 `statementimports` (new collection) → `src/models/statement-import.model.ts`

```ts
{
  userId: ObjectId;              // required
  accountId: ObjectId;           // required
  status: "draft" | "committed" | "failed" | "discarded";
  originalFileName: string;
  fileSize: number;
  fileSha256: string;
  detectedFormat: "sbi-csv" | "sbi-xls-html" | "sbi-xlsx" | "unknown";
  statementPeriod: { from: Date; to: Date } | null;
  statementOpeningBalancePaise: number | null;
  statementClosingBalancePaise: number | null;
  rows: PreviewRow[];            // embedded; capped at 5,000
  totals: { parsed; valid; invalid; new; possibleDuplicate; selected };
  result: { inserted; skipped; invalid; anchorUpdated: boolean } | null;
  idempotencyKey: string;        // unique index
  expiresAt?: Date;              // TTL index, drafts only
  committedAt?: Date;
  createdAt / updatedAt;
}
```

Additive collection: safe, no existing data touched.

### 7.5 Category vocabulary (fixed for release 1)

`Food`, `Travel`, `Shopping`, `Bills`, `Investments`, `Salary`, `Transfer`, `Cash`, `Fees & Charges`, `Interest`, `Others`.

Auto-categorisation defaults to `Others` (the legacy default of `Bills` was misleading). Keyword mapping is data-driven in `src/lib/transactions/categorize.ts` with tests; users can override per row in preview and per transaction in edit.

---

## 8. Money and date rules

1. **All arithmetic is integer paise.** No `Number` addition of rupees anywhere in new code.
2. Conversion boundaries only:
   - parse: `toPaise(text)` strips `,`, `₹`, spaces, handles CR/DR suffixes and parentheses;
   - display: `formatINR(paise)` → `Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })`;
   - legacy read: `Math.round(doc.amount * 100)` only when `amountPaise` is missing.
3. **Dates are calendar dates**, stored at `00:00:00Z`, formatted with UTC parts so `01/11/2026` never becomes `31/10/2026` in any timezone.
4. Statement periods and analytics use **IST day boundaries** (`Asia/Kolkata`) converted to UTC ranges explicitly in `src/lib/dates.ts`.
5. `createdAt`/`updatedAt` remain real timestamps; they are never used as transaction dates.
6. Comparison tolerance is exact: `a === b` in paise. No `0.01` float epsilon.

---

## 9. Balance: the anchored-ledger invariant

### 9.1 The rule (single source of truth)

```text
currentBalance = anchor.balancePaise
               + Σ signed(txn) for every txn where txn.txnDate > anchor.asOfDate
                 and txn.deletedAt = null

signed(txn) = txn.direction === "credit" ? +txn.amountPaise : −txn.amountPaise
```

- The **anchor** is `{ balancePaise, asOfDate, source }` on the account.
- Transactions **on or before** the anchor date are historical context; they never affect the current balance.
- `account.currentBalance` (rupees) is written as `currentBalancePaise / 100` in the same operation, purely so the legacy app and old readers see a correct number. It is never edited directly.
- Manual balance entry is **not** a free-text overwrite; it creates an anchor (`source: "manual"`) with a required note and an audit line.

### 9.2 Why this shape

| Problem in the audit | How the anchor solves it |
|---|---|
| Import overwrote balance from the file, order-dependently | Imports never set `currentBalance`. They may create/advance the anchor only when the statement continues the timeline. |
| Historical import clobbered the present | A statement ending before the anchor cannot move it (D3). |
| Zero-row import still rewrote the balance | Anchor changes are explicit and user-confirmed; no rows → no anchor change. |
| Balance drifted from transactions | The formula is recomputed on every mutation and shown in a reconcile dialog. |
| Partial history made "derive from all transactions" impossible | The anchor carries the untracked past. |

### 9.3 Anchor advancement rules on import

At confirm time, let `S` = statement period, `A` = current anchor.

1. `S.to <= A.asOfDate` → anchor unchanged. Preview says: *"This statement ends before your current balance date; your balance will not change."*
2. `S.to > A.asOfDate` and `S.from <= A.asOfDate + 1 day` → offer **Update balance anchor** (checked by default) to `{ balancePaise: statementClosing, asOfDate: S.to, source: "statement", importId }`, then recompute.
3. `S.to > A.asOfDate` and `S.from > A.asOfDate + 1 day` → **gap detected**. Anchor update is offered but unchecked, with: *"This statement starts after your last balance date. Importing it and moving the anchor may double-count transactions between {A.asOfDate} and {S.from}."* The user must tick an explicit acknowledgement.
4. Statement arithmetic fails (`opening + credits − debits ≠ closing`, tolerance ₹0.01) → hard warning naming the difference; import allowed but the anchor update is unchecked by default.

### 9.4 Atomicity

- If the deployment supports sessions (replica set), commit runs inside `session.withTransaction`.
- Otherwise: (a) insert transactions with `importId` + `idempotencyKey`, (b) update the anchor, (c) write `currentBalance` projection, (d) mark the import `committed`. Each step is idempotent and the commit endpoint re-drives a `failed` import to completion without duplicating rows (unique `dedupeKey` + `importId` check).
- The topology is detected once at startup (`hello().setName` / `logicalSessionTimeoutMinutes`) and logged without credentials.

---

## 10. Transaction identity and duplicate policy

### 10.1 Reference extraction (priority order)

1. The SBI **`Ref No./Cheque No.` column**, if the detected profile maps it.
2. `UPI`/`IMPS` + optional `DR|CR|P2A|P2P|NET` + 10–16 digits.
3. `NEFT`/`RTGS` + 12–22 alphanumerics.
4. `RRN`/`UTR` + 10–20 alphanumerics.
5. `Chq`/`Cheque` + 6 digits (stored prefixed `CHQ:`).

Normalisation: uppercase, strip spaces/hyphens. Store `referenceNumber` on the transaction.

### 10.2 Keys

- **`dedupeKey`** (unique, sparse): set **only** when `referenceNumber` exists.
  `sha256(accountId | referenceNumber | txnDate(YYYY-MM-DD) | amountPaise | direction)`.
  This is the one hard database constraint, and it only applies where the bank gives us an identifier.
- **`fingerprint`** (non-unique, informational): `sha256(accountId | txnDate | amountPaise | direction | normalizedNarration)`.

### 10.3 Duplicate analysis (never silent)

The parser compares each candidate against (a) rows already accepted in the same file and (b) existing non-deleted transactions for that account in `txnDate ± 3 days`. It returns a verdict with a reason:

| Verdict | Condition | Preview behaviour |
|---|---|---|
| `duplicate` (high) | Same `referenceNumber` **and** same amount/direction/date | Row unselected by default; reason: *"Same reference number 123456789012"*. Server also enforces `dedupeKey` uniqueness. |
| `duplicate` (high) | Same date, amount, direction, and equal running balance | Unselected; reason: *"Same date, amount and running balance"*. |
| `possible` (medium) | Same date, amount, direction; no reference; different narration | **Unselected**, reason: *"Same date and amount — different narration"*; the user can select it and it will import. |
| `possible` (medium) | Same reference but different amount/date | Unselected with an explicit mismatch explanation. |
| `none` | Anything else | Selected. |

**Nothing is ever dropped automatically.** The server imports exactly the rows the client marks `selected`, except where a unique `dedupeKey` rejects a duplicate — that outcome is reported as `skipped`, with a reason, never silently.

### 10.4 Retry behaviour

Re-importing the same file with the same references inserts nothing and reports `skipped: N` with reasons. Rows without references may be re-flagged as `possible`; the preview defaults to unselected, so a plain retry is safe.

---

## 11. SBI import pipeline

```text
select file
  → client pre-check (extension, size ≤ 10 MB)
  → POST /api/imports (multipart)
  → content sniffing (magic bytes / HTML / delimiter) — never trust the extension
  → password required?  → 409 PASSWORD_REQUIRED  → user enters password  → retry
  → workbook → table rows (first sheet only, cap 5,000 rows)
  → profile selection + header scoring (no fixed column indices)
  → row normalisation → issues per row
  → duplicate analysis against this file + DB
  → draft stored (status=draft, TTL 24 h) + preview returned
  → user reviews, toggles rows, edits direction/category
  → POST /api/imports/{id}/confirm  (Idempotency-Key)
  → atomic commit: transactions + anchor + projection + import status
  → result summary + history entry
```

### 11.1 Format detection (`detect.ts`)

| Signal | Format | Reader |
|---|---|---|
| `PK\x03\x04` | XLSX (zip) | `exceljs` (password → `officecrypto-tool` decrypt first, then re-detect) |
| `D0 CF 11 E0 A1 B1 1A E1` | OLE2: legacy `.xls` **or** encrypted OOXML | try decrypt, then re-detect; otherwise `UNSUPPORTED_FORMAT` with guidance |
| text containing `<table` / `<html` | HTML table saved as `.xls` | HTML → rows (small tolerant parser; no `cheerio` needed) |
| text with `,` / `\t` / `;` | Delimited | PapaParse with delimiter sniff |
| anything else | Unknown | `UNSUPPORTED_FORMAT` |

Passwords: keep the legacy `generatePasswordVariants` behaviour (raw, trimmed, upper, lower, non-alphanumeric stripped, `DDMMYYYY⇄DDMMYY`, `19YY`/`20YY`, last 4/5 of a 10-digit number) extracted into a tested helper. Max 9 variants, 2 strategies, hard timeout.

### 11.2 Header detection (`profiles/sbi.ts`)

- Scan the first 100 rows; score each row against a token list (`txn date`, `value date`, `narration`, `description`, `particulars`, `debit`, `withdrawal`, `credit`, `deposit`, `balance`, `ref no`, `cheque`).
- A row is a header if it matches a date token **and** at least two of {narration, debit, credit, amount}.
- Map columns explicitly from that row. **Never** fall back to fixed indices. If debit/credit **and** a single amount column are both missing → `UNSUPPORTED_LAYOUT` with the header row echoed back to the user.
- `Ref No./Cheque No.` is mapped when present (the legacy app never did).
- `Value Date` captured when present.

### 11.3 Row rules

- Skip footer/summary rows using the verified keyword list (opening balance, closing balance, total, brought forward, carried forward, computer generated, disclaimer, page, statement period, …) but **harvest** labelled opening/closing balances from them first.
- Preserve `narration` verbatim — no 25-character truncation.
- Amount parsing: commas, `₹`, `Cr`/`Dr` suffixes, parentheses, `-`/empty as zero.
- Both debit and credit > 0 → **invalid** row with `BOTH_DEBIT_AND_CREDIT` (never silently pick debit).
- Single amount column without a type column → **ambiguous**; direction must be resolved by the user in preview, not guessed.
- Date parsing: `DD/MM/YYYY`, `DD-MM-YYYY`, `DD-MMM-YYYY`, `DD-MM-YY`, `YYYY-MM-DD`, Excel serial. Day-first is explicit; `M/D/Y` is only used if the file's month values prove it.
- Ordering detection: compare the running-balance delta against the signed amount for consecutive rows to determine newest-first vs oldest-first; report `ORDER_UNVERIFIED` if it cannot be established.

### 11.4 Preview row contract

```ts
type PreviewRow = {
  rowNumber: number;
  raw: string[];
  txnDate: string | null;      // YYYY-MM-DD
  valueDate: string | null;
  narration: string;
  referenceNumber: string | null;
  debitPaise: number | null;
  creditPaise: number | null;
  balancePaise: number | null;
  direction: "debit" | "credit" | null;
  category: string;
  selected: boolean;
  status: "valid" | "invalid" | "ambiguous";
  issues: { code: IssueCode; message: string }[];
  duplicate?: { verdict: "duplicate" | "possible"; reason: string; matchedTransactionId?: string };
};
```

`IssueCode`: `MISSING_DATE` · `UNPARSEABLE_DATE` · `MISSING_NARRATION` · `NO_AMOUNT` · `UNPARSEABLE_AMOUNT` · `BOTH_DEBIT_AND_CREDIT` · `UNKNOWN_DIRECTION` · `BALANCE_BREAK` · `ORDER_UNVERIFIED` · `DUPLICATE_IN_FILE` · `DUPLICATE_IN_DB` · `POSSIBLE_DUPLICATE_IN_DB`.

### 11.5 Limits and failure handling

- Upload ≤ **10 MB**; rows ≤ **5,000**; one sheet; processing timeout 30 s.
- Draft TTL **24 h**; expired confirm → `410 IMPORT_EXPIRED`, nothing written.
- Password-protected without password → `409 PASSWORD_REQUIRED` (distinct from a wrong password).
- Wrong password → `422 INVALID_FILE_PASSWORD`, attempts counted toward the rate limit.
- Any parser exception → `422 IMPORT_FAILED` with a safe message; no stack traces, no file contents in logs.
- A failed confirm leaves the draft intact and the account untouched.

---

## 12. Authentication, session, ownership

### 12.1 Login

- One **app password**, stored as a scrypt hash in `AUTH_PASSWORD_HASH` (`scrypt$N=16384,r=8,p=1$<salt-b64>$<hash-b64>`).
- Verification uses `node:crypto.scrypt` + `timingSafeEqual`. No extra dependency, no plaintext comparison.
- A small script (run manually, with your approval) generates the hash: `node scripts/hash-password.mjs`.
- `POST /api/auth/login` compares in constant time, on failure returns `INVALID_CREDENTIALS` after a fixed delay floor.
- Rate limit: **5 attempts / 15 minutes per IP** and **10 / hour globally** (in-memory limiter for a single-instance deployment; documented as such).
- No registration route. No default password. Server refuses to boot without `AUTH_PASSWORD_HASH`, `AUTH_SESSION_SECRET`, `MONGODB_URI`.

### 12.2 Session

- JWT (HS256, `jose`): `{ sub: userId, iat, exp, jti }`, 7-day expiry.
- Cookie `expense_session`: `httpOnly`, `sameSite=lax`, `secure` in production, `path=/`.
- `POST /api/auth/logout` clears the cookie (and is the only revocation available in release 1 — documented).
- `GET /api/auth/session` returns `{ id, name, email }` or `401 SESSION_EXPIRED`.
- `src/proxy.ts` checks only for cookie **presence** to redirect unauthenticated page requests; every API route and server component performs real verification via `requireSession()`.

### 12.3 Ownership rules (non-negotiable)

1. `userId` always comes from the verified session — never from a body, query, or header.
2. Every read/update/delete filters `{ _id, userId: session.userId }`. `findById` alone is banned by lint rule/review checklist.
3. `accountId` in a request is validated to belong to the session user before use.
4. `PATCH /api/accounts/[id]` and all transaction mutations re-verify ownership inside the same query.
5. No hard-coded ObjectIds, no boot-time user/account creation, no "adopt any account" fallback.
6. CSRF: every mutating request must have an `Origin`/`Referer` matching `APP_URL`; mismatches → `403 FORBIDDEN`.
7. No secrets or full account numbers in logs; account numbers are stored and displayed as last-4 only.

### 12.4 Environment (`.env.example`)

```env
MONGODB_URI=
AUTH_PASSWORD_HASH=
AUTH_SESSION_SECRET=
APP_URL=http://localhost:3000
```

`.gitignore` must be corrected to `!.env.example` so the template is committable while `.env.local` stays ignored.

---

## 13. API contract

All responses use:

```ts
type ApiSuccessResponse<T> = { success: true; data: T };
type ApiErrorResponse = { success: false; error: string; code: ApiErrorCode; details?: unknown };
```

| Method | Route | Purpose | Ownership |
|---|---|---|---|
| POST | `/api/auth/login` | password → session cookie | public, rate-limited |
| POST | `/api/auth/logout` | clear cookie | session |
| GET | `/api/auth/session` | current user | session |
| GET | `/api/accounts` | the owner's accounts | `userId` scope |
| PATCH | `/api/accounts/[id]` | profile + anchor (manual) | `_id + userId` |
| GET | `/api/transactions` | list: `q, from, to, category, direction, reviewed, page, limit, sort` | `userId` scope |
| POST | `/api/transactions` | manual create | `userId` from session |
| GET | `/api/transactions/[id]` | detail | `_id + userId` |
| PATCH | `/api/transactions/[id]` | edit | `_id + userId` |
| DELETE | `/api/transactions/[id]` | soft delete | `_id + userId` |
| PATCH | `/api/transactions/bulk-review` | `{ ids: string[], reviewed: boolean }` (max 200) | all ids owned |
| POST | `/api/imports` | multipart upload → draft + preview | account owned |
| GET | `/api/imports` | history, paginated | `userId` scope |
| GET | `/api/imports/[id]` | draft preview or committed result | `_id + userId` |
| POST | `/api/imports/[id]/confirm` | commit selected rows (`Idempotency-Key`) | `_id + userId` |
| GET | `/api/dashboard/summary` | totals, month metrics, attention items | `userId` scope |

Example list response:

```ts
type TransactionListResponse = {
  items: TransactionDto[];
  page: number;
  limit: number;
  total: number;
  totals: { creditPaise: number; debitPaise: number; netPaise: number };
};
```

Route handlers stay thin: `requireSession()` → `Schema.parse()` → `lib/data/*` or `lib/imports/*` → `NextResponse.json`.

---

## 14. Validation and error handling

- Every request body and query string is parsed with Zod from `src/validations/`. No `Boolean("false")` coercion; use `z.coerce.boolean()` only where a real boolean is impossible.
- ObjectId params validated (`z.string().regex(/^[0-9a-f]{24}$/i)`).
- Pagination capped: `limit ≤ 100`, `page ≥ 1`.
- `ApiErrorCode` union:

```ts
type ApiErrorCode =
  | "SESSION_EXPIRED" | "INVALID_CREDENTIALS" | "FORBIDDEN"
  | "VALIDATION_ERROR" | "NOT_FOUND" | "CONFLICT"
  | "RATE_LIMITED" | "PASSWORD_REQUIRED" | "INVALID_FILE_PASSWORD"
  | "UNSUPPORTED_FORMAT" | "UNSUPPORTED_LAYOUT" | "FILE_TOO_LARGE"
  | "TOO_MANY_ROWS" | "IMPORT_FAILED" | "IMPORT_EXPIRED"
  | "UPSTREAM_ERROR" | "UNKNOWN";
```

- UI mapping: `SESSION_EXPIRED` → redirect to `/login?expired=true`; `VALIDATION_ERROR` → inline field errors; `RATE_LIMITED` → message with `retryAfter`; everything else → `toast.error` **plus** an inline `ErrorState` where the page cannot render without the data.
- **No `alert()`, no silent `catch`.** Every failure has a visible outcome.
- Server logs: request id, route, code, duration. Never passwords, tokens, narration text, amounts, or file contents.

---

## 15. Testing plan

Stack: **Vitest 4** + `@testing-library/react` + `jsdom`, `mongodb-memory-server` for data-layer and integration tests. Co-located `*.test.ts` for pure logic; `tests/integration/*.test.ts` for routes and ownership.

### 15.1 Parser (`src/lib/statement/*.test.ts`)

- YONO CSV with `Txn Date, Value Date, Description, Ref No./Cheque No., Debit, Credit, Balance`.
- OnlineSBI HTML-table `.xls`.
- XLSX with 5 title rows before the header.
- Header variations: `Withdrawal`/`Deposit`, `Particulars`, `Post Date`.
- Footer suppression: opening/closing balance, totals, page numbers, disclaimer.
- Amount forms: `1,234.56`, `₹500`, `500.00 Cr`, `(250.00)`, `-`, blank.
- Dates: `01/11/2026`, `01-Nov-2026`, `01-11-26`, `2026-11-01`, Excel serial; invalid date → `UNPARSEABLE_DATE`.
- Both debit and credit present → invalid, not debit-wins.
- Missing narration → invalid.
- Narration preserved verbatim (including long UPI strings).
- Reference column extracted; narration fallback order honoured.
- Newest-first and oldest-first ordering detection.
- No amount column at all → `UNSUPPORTED_LAYOUT` (must not use fixed indices).
- Duplicate rows inside one file both flagged, both still importable.
- Oversized file / too many rows / binary `.xls` / encrypted without password → correct typed errors.

### 15.2 Identity and duplicates

- Same reference + same amount/date → `duplicate`.
- Same reference + different amount → `possible`, not dropped.
- No reference, same date/amount/direction, different narration → `possible`.
- Two genuinely distinct same-day same-amount purchases with different references → **not** duplicates.
- Equal running balance vs different running balance.
- `dedupeKey` is stable across two parses of the same file.
- Unique sparse index rejects a second insert with the same key; unrelated rows without keys are unaffected.

### 15.3 Balance (`src/lib/accounting/balance.test.ts`)

- No anchor → sum of all transactions.
- Anchor + transactions after → correct; transactions on/before anchor excluded.
- Credit and debit signs.
- Edit amount, direction, or date across the anchor boundary → recompute.
- Soft delete → recompute; restore → recompute.
- Historical import with anchor untouched → balance unchanged (the key regression test).
- Zero-row import → no balance change.
- `0.1 + 0.2` style accumulation is exact in paise.
- Anchor advancement rules 1–4 from §9.3, including the gap warning.

### 15.4 Import lifecycle (integration)

- Preview writes **no** transactions and creates exactly one draft.
- Confirm inserts exactly the selected rows, one import record, correct anchor.
- Same `Idempotency-Key` twice → one commit, identical response.
- Different key, same file → no duplicate rows (unique `dedupeKey` + possible-duplicate defaults).
- Expired draft → `410`, nothing written.
- Invalid rows excluded and counted.
- A forced mid-commit failure leaves no partial transactions (session topology) or is recoverable (non-session topology).

### 15.5 Auth and ownership (integration)

- Wrong password → `401`; 6th attempt → `429`.
- No cookie → `401 SESSION_EXPIRED`.
- Cookie is `httpOnly`, `sameSite=lax`.
- Mutating request with a foreign `Origin` → `403`.
- Two seeded owners: user A cannot read, patch, delete, or import into user B's account (matrix of every route).
- Bulk review with one foreign id → whole request rejected.

### 15.6 Queries and analytics

- Pagination and filtering are applied in the database (assert with a query spy or by seeding more rows than the page size).
- Month boundaries are IST-correct; future-dated rows excluded from "this month".
- Soft-deleted and foreign rows never appear in totals.
- Dashboard totals equal the sum of the filtered list for the same range.

Fixtures live in `tests/fixtures/statements/` and are **sanitised**: fake account numbers, rounded amounts, invented narrations. No real statement ever enters the repository.

---

## 16. Phased implementation

Each phase lists scope, dependencies, and acceptance criteria. Work stops for review at the end of each phase; a commit is **proposed**, never made, until you approve it.

### Phase 0 — Foundation and shell

**Scope:** `package.json` scripts (`test`, `test:watch`, `typecheck`), `vitest.config.mjs`, `vitest.setup.tsx`, `tsconfig` `types: ["vitest/globals"]`, `globals.css` tokens, `layout.tsx` (fonts, metadata, toaster), `src/lib/utils.ts` (`cn`, `formatINR`, `formatDate`), `components/ui/*`, `(app)/layout.tsx` shell + navigation, `src/app/page.tsx` redirect, `.env.example`, `.gitignore` fix.
**Dependencies:** `zod`, `axios`, `sonner`, `react-hook-form`, `@hookform/resolvers`, `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/*`.
**Acceptance:** shell renders at 1440/1024/390 px with all empty states; focus ring visible on every control; `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm test` all pass.

**Delivered ahead of approval** (design only, no business logic): `globals.css` tokens and base
styles, `layout.tsx` fonts and metadata, `lib/utils.ts` (`cn`, `formatINR`, `splitINR`,
`formatStatementDate`), `components/ui/{button,badge,panel,table,field,empty-state,icons}.tsx`,
and a `noindex` specimen page at `/` proving every token, control, and composition. Verified in
Chromium at 1440 px and 390 px: no horizontal overflow, `--fg-3` at 4.9:1 on `--surface`.
`/` becomes a redirect to `/dashboard` when Phase 0's shell lands.

### Phase 1 — Domain foundation

**Scope:** `lib/dbConnect.ts`, `models/*`, `types/*`, `validations/*`, `lib/money.ts`/`dates.ts`, `lib/transactions/identity.ts`, `lib/accounting/balance.ts`, plus tests. A **read-only** `scripts/inspect-db.mjs` that reports collection counts, orphaned `userId`/`accountId`, duplicate `dedupeKey` candidates, and balance drift — run only with your approval.
**Acceptance:** balance and identity test suites green; models compile; no API routes; no writes performed.

### Phase 2 — Authentication

**Scope:** `lib/auth/*`, `api/(auth)/*`, `src/proxy.ts`, `(auth)/login/*`, session-aware shell.
**Acceptance:** httpOnly cookie set/cleared; unauthenticated `/dashboard` redirects to `/login`; rate limit works; auth tests green; no hard-coded ids present (grep check).

### Phase 3 — SBI parser (no persistence)

**Scope:** `lib/statement/*` with `detect`, `read-workbook`, `profiles/sbi`, `normalize`, `parse`; fixtures; tests.
**Dependency:** your sanitised samples (D1).
**Acceptance:** every fixture parses to the documented `PreviewRow` contract; unsupported inputs fail with typed errors; zero database access in this phase.

### Phase 4 — Import preview

**Scope:** `api/imports` (POST/GET), `api/imports/[id]` (GET), `lib/imports/draft.ts`, `lib/data/imports.ts`, `(app)/imports/page.tsx`, `(app)/imports/[id]/page.tsx`, import components.
**Acceptance:** upload → password prompt → preview works end-to-end; **no transactions written**; draft TTL set; counts and reasons correct; every issue visible in the UI.

### Phase 5 — Import confirmation

**Scope:** `api/imports/[id]/confirm`, `lib/imports/commit.ts`, anchor logic, idempotency, import result view, history table.
**Dependency:** D11 topology decision.
**Acceptance:** all §15.4 tests pass; double confirm creates nothing extra; the balance regression test (historical import does not change balance) passes.

### Phase 6 — Transactions

**Scope:** list/create/detail/update/delete/bulk-review routes, `(app)/transactions/*`, filter URL state, dialogs.
**Acceptance:** server-side filtering/search/pagination verified; ownership matrix passes; balance recomputes on every mutation; empty/loading/error states complete.

### Phase 7 — Dashboard and analytics

**Scope:** `api/dashboard/summary`, `(app)/dashboard`, `(app)/analytics`.
**Acceptance:** dashboard totals reconcile with the transaction list for the same range; month boundaries IST-correct; no client-side arithmetic used as truth.

### Phase 8 — Settings and export

**Scope:** account profile, manual anchor with note, CSV export, session/logout.
**Acceptance:** anchor change recomputes balance and is visible in the audit line; export matches filters; no full account number displayed.

### Phase 9 — Hardening

**Scope:** accessibility audit (keyboard, focus, contrast, labels), responsive pass, CSP/security headers in `next.config.ts`, dependency review, query-index review, error-path review, full regression.
**Acceptance:** all checks pass; no `findById` without `userId`; no `alert()`; no `console.log` of financial data; documented known limitations.

---

## 17. Legacy feature disposition

Labels per `AGENTS.md` §4: **Migrate as-is** · **Rewrite** · **Fix before migration** · **Defer** · **Remove**.

| Legacy feature | Label | Note |
|---|---|---|
| App-password gate (`POST /api/auth/login`) | **Fix before migration** | Keep single-password product, replace plaintext env compare with scrypt + httpOnly cookie + rate limit. |
| JWT in `sessionStorage` | **Fix before migration** | httpOnly cookie; 7 days; no client-readable token. |
| Auto-created user/account at boot | **Remove** | Violates ownership rules. Accounts must exist explicitly. |
| Hard-coded fallback user ObjectId | **Remove** | Security defect. |
| `GET /api/transactions` returning `find({})` | **Fix before migration** | Scoped, filtered, paginated. |
| Unscoped `:id` update/delete | **Fix before migration** | `_id + userId`. |
| Balance card + inline edit | **Rewrite** | Becomes anchored balance panel + explicit anchor dialog. |
| Bank/account profile editor | **Rewrite** | Last-4 only, validated. |
| Bank presets (`BANK_PRESETS`) | **Remove** | Cosmetic; replaced by real format profiles. |
| CSV/TSV import | **Rewrite** | Server-side, deterministic, provenance, no fixed indices. |
| XLSX import (plain) | **Rewrite** | `exceljs`, first sheet, header scoring. |
| Password-protected XLSX/XLS | **Fix before migration** | Keep variant generation (Migrate as-is behaviour) but isolate, timeout, and distinguish wrong-password from unsupported. |
| HTML-table-as-`.xls` import | **Migrate as-is** (behaviour) | Verified and genuinely useful; reimplemented with tests. |
| Password hints by bank | **Rewrite** | Keep the hint text; the bank choice no longer implies a parser preset. |
| Import preview with row selection | **Rewrite** | Same flow, real issue reporting, no forced skips. |
| Per-row category + DR/CR toggle | **Rewrite** | Persisted and validated; direction no longer guessed. |
| Duplicate badge + reason | **Fix before migration** | Verdicts become explicit (`duplicate`/`possible`), never silent, reference column used. |
| Server bulk dedup that always drops duplicates | **Fix before migration** | Honour the user's selection; unique index only on strong reference keys. |
| "Skip already imported duplicates" toggle that is ignored | **Remove** | Replaced by per-row selection. |
| Client-side dedup (second implementation) | **Remove** | One server-side rule set. |
| Fingerprint (md5 over mutable text) | **Rewrite** | Stable `dedupeKey` + informational `fingerprint`. |
| `skippedDuplicates` discarded by the client | **Fix before migration** | Counts shown per import. |
| Transaction list + search | **Rewrite** | Server-side search, URL state, pagination. |
| Category filter / type pills | **Rewrite** | Real filters, multi-select categories, direction, review status. |
| Client-side pagination | **Rewrite** | Server-side, capped page size. |
| Transaction detail modal | **Rewrite** | Deep-linkable `/transactions/[id]` page. |
| Transaction edit modal | **Rewrite** | Validated form, balance recompute, audit of effect. |
| Transaction delete + confirm | **Fix before migration** | Soft delete, ownership check, explicit balance effect. |
| Reviewed toggle | **Migrate as-is** (behaviour) | Keep the concept; add `reviewedAt` and bulk action. |
| Add-transaction endpoint with no UI | **Rewrite** | Real create form, in scope for release 1. |
| Calculator scratchpad | **Defer** | Backlog; multi-window design needs your input. |
| 30-day stats (no upper bound) | **Fix before migration** | Explicit ranges, IST boundaries, no future rows. |
| Manual refresh button | **Remove** | Pages fetch on navigation; background refresh not needed for a personal app. |
| Client-side balance patching after edits | **Remove** | Server recompute is authoritative. |
| `alert()` / silent failure handling | **Remove** | Typed errors, inline messages, toasts. |
| Import history (absent) | **Rewrite** | New `statementimports` collection + page. |
| `transaction.source` never surfaced | **Fix before migration** | Shown on detail; `statement-import` vs `manual`. |
| `transaction.balance` stored but never displayed | **Rewrite** | Displayed as `balanceAfterPaise` on detail. |
| `accountinfos.accountId` string vs ObjectId collision | **Fix before migration** | Documented; relations always use `_id`. |
| Category vocabulary drift (`Bills` vs `Others`) | **Fix before migration** | One fixed list, default `Others`. |
| Light UI despite `dark` class | **Rewrite** | Real dark theme. |
| Lock screen "100% Private Local Session" copy | **Remove** | False claim. |
| Reviewed rows at 60% opacity + line-through | **Rewrite** | Clear badge, readable row. |
| CORS reflecting any origin | **Remove** | Same-origin app; explicit `APP_URL` only. |
| CSP disabled | **Fix before migration** | Security headers in `next.config.ts`. |
| No request validation | **Fix before migration** | Zod on every route. |
| No audit trail for destructive actions | **Rewrite** | Soft delete + `reviewedAt` + anchor history fields. |
| Root `index.html` / `expense.js` prototype | **Remove** (from migration scope) | Separate older app; preserved on disk, never referenced. |

---

## 18. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| No real SBI samples (D1) | Parser may not match real headers | Phase 3 gated on samples; CSV-only fallback with strict validation and explicit unsupported errors. |
| MongoDB without replica set | No multi-document transactions | Idempotent ordered writes + `dedupeKey` uniqueness + re-drivable `failed` imports (D11). |
| Legacy data already inconsistent | Balance/duplicates wrong at launch | Read-only inspection script in Phase 1; reconciliation report; **no automatic fixing** — each correction proposed and approved. |
| Legacy app still writing during development | Balance projection conflicts | Freeze legacy writes when Phase 5 lands (D12); both apps never write simultaneously. |
| `date` is `Mixed` in existing documents | Sort/group errors on old rows | Read-time normalisation to `txnDate`; no rewrite until an approved migration. |
| Two apps, one `currentBalance` field | Divergent meaning | Field is documented as a projection; only the new write path sets it; legacy writes frozen. |
| Excel dependency risk | Security advisories, format gaps | `exceljs` + HTML sniff; binary `.xls` explicitly unsupported in release 1 (D8). |
| Single shared password | Anyone with the password has full access | Long scrypt-hashed secret, rate limiting, httpOnly cookie, no public exposure; documented limitation. |
| No file retention | Harder to debug a parser failure after the fact | Store `fileSha256`, header row echo, and each row's `rawRow`; user can re-upload the file for a re-parse. |
| Large statements (2,000+ rows) | Slow preview, large payloads | Row cap 5,000, paginated preview table, embedded rows in one draft document (well under 16 MB). |
| Timezone drift | Wrong day grouping | UTC-midnight calendar dates + explicit IST conversion for ranges; tests around month boundaries. |
| Scope creep (calculator, AI, other banks) | Delays the SBI release | §1.2 and §19 keep them out; any addition requires your approval and a plan amendment. |

---

## 19. Deferred backlog (recorded, not implemented)

1. **Multi-window calculator** — several named scratchpads open at once, each retaining inputs/results, closable independently, clearly separate from saved transactions. Needs your workflow definition first.
2. **Bulk review actions beyond select → mark reviewed** — rules for which rows are eligible, whether duplicates/invalid rows can be reviewed, review timestamps in filters.
3. **PDF statements** — needs a deterministic extraction strategy and samples.
4. **Additional banks** — would require a second profile plus its own tests; the parser boundary is being kept clean for this.
5. **AI assistance** — provider-independent server boundary, Zod-validated output, suggestions only, user confirmation required, data minimisation. Not before the SBI workflow is proven.
6. **Multi-account UI**, budgets, recurring detection, notifications, mobile app.
7. **Raw statement retention** with encryption at rest, if debugging demands it later.
8. **Session revocation list / device management**.
9. **Statement-period gap detection across imports** as a first-class reconciliation report.

---

## 20. Definition of done and required checks

A phase is complete only when:

- Behaviour matches this plan (or an approved amendment).
- Amounts are integer-paise correct and direction is never guessed.
- Every query is scoped to the session owner.
- Loading, empty, success, validation-error, and server-error states exist.
- Relevant tests pass.
- These commands were actually run and passed:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

- No legacy file was modified.
- A short summary lists files created/modified, commands run with results, and known limitations.
- Nothing is committed or pushed until you explicitly approve it.

---

## 21. Approval checklist

Please confirm or amend:

- [ ] **D1** — will you provide sanitised SBI samples before Phase 3? Which formats?
- [ ] **D2/D3** — anchored-ledger balance, and historical imports never change the balance.
- [ ] **D4** — single app password + httpOnly cookie (no multi-user login).
- [ ] **D5** — one account in the UI for release 1.
- [ ] **D6** — true-black "Statement" theme: `#000000` base, pure white ink, mono figures, colour only for credit/debit/warning (§6.1).
- [ ] **D8** — `exceljs` instead of `xlsx`; binary `.xls` unsupported in release 1.
- [ ] **D9** — integer paise with a compatibility mirror.
- [ ] **D10** — soft delete with restore.
- [ ] **D11** — confirm whether your MongoDB is a replica set (enables transactions).
- [ ] **D12** — freeze legacy app writes when Phase 5 lands.
- [ ] **D14** — client components + axios + React context (no Zustand).
- [ ] **Phase 0** may begin once the above are settled.

**Reply with "approved" plus any changes, and I will start Phase 0 only — listing every file I intend to create or modify before touching it.**

---

### Document history

| Date | Author | Change |
|---|---|---|
| 2026-11-01 | OpenCode | Initial rebuild plan derived from `docs/legacy-audit.md` and Anviksha conventions |
| 2026-11-01 | OpenCode | §6.1 replaced with the original "Ledger" design system; typography moved to Public Sans + Newsreader after finding Instrument Sans/Serif have no ₹ glyph; Phase 0 design foundation delivered and verified |
| 2026-11-02 | OpenCode | "Ledger" retired. §6.1 rewritten as **"Statement"**: #000000 base for OLED, pure white ink, no brand accent (interaction is white), colour only for credit/debit/warning, hairline rules instead of bordered cards, IBM Plex Sans + Mono. Triggered by user feedback that the first draft was dull and low-contrast; backed by research into AI-generated design tells. §6.2 `Panel` row and §6.3 dashboard hero reconciled with the new tokens. |
