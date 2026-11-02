# Legacy Audit — SBI Expense Manager

> **Phase 1 deliverable** required by `AGENTS.md` §4.
> Read-only inspection of the existing Bank Expense Tracker. **No legacy code was modified.**
>
> - **Audit date:** 1 November 2026
> - **Auditor:** OpenCode (read-only static inspection)
> - **Legacy locations inspected:**
>   - `My Bank Expense Tracker/backend/` (Express + Mongoose)
>   - `My Bank Expense Tracker/frontend/` (React 19 + Vite)
>   - `index.html`, `expense.css`, `expense.js` (root-level static prototype)
> - **New application:** `bank_expense_tracker_nextjs/` (Next.js 16.4.3 scaffold, untouched apart from this document)

## How to read this document

Every claim is tagged:

- **[V]** — **Verified** by reading the cited source file/function.
- **[I]** — **Inferred** from code but not confirmed against a running system or live database.
- **[A]** — **Assumption / unknown** that cannot be resolved from the repository alone.

No database was connected to, no server was started, and no statement files were uploaded. There are **no tests, fixtures, or sample statements anywhere in the repository**, so no behaviour below could be confirmed by execution.

---

## 1. Existing folder and architecture overview

### 1.1 Two separate legacy generations exist

**[V]** The repository contains **two unrelated implementations**, not one:

| Generation | Location | Stack | Persistence | Status |
|---|---|---|---|---|
| Older prototype | root: `index.html`, `expense.css`, `expense.js` | Vanilla JS + DOM queries | `localStorage` only | Legacy, superseded |
| Current app | `My Bank Expense Tracker/` | Express 5 + Mongoose 9, React 19 + Vite 7 | MongoDB | The reference implementation |

**Root prototype** (`expense.js`, 799 lines):
- Selects elements once at module load with `document.querySelector(...)` (fragile, order-dependent).
- Stores everything in `localStorage` keys: `allTransactions`, `currentBalance`, and review flags.
- CSV import only, at `expense.js` L625–798: scans for a header line containing both `Txn Date` and `Debit`, then assumes **fixed column positions** (`cols[0]` date, `cols[2]` description, `cols[4]` debit, `cols[5]` credit), `DD-MMM-YY` dates, and a minimum of 7 columns.
- Recomputes balance from scratch after import: `currentBalance = allTransactions.reduce(...)` (L780–784).
- Categories are hard-coded keyword checks (Cashback / Travel / Food / Shopping / Bills / Others).
- **No duplicate detection, no preview, no review workflow, no password-protected files, no Excel support.**

**Conclusion [V]:** the root files are an earlier, unrelated version. They must be preserved but are **not** the migration source. Only the product ideas (calculator scratchpad, category pills, import button) are historically relevant.

### 1.2 Current app layout

**[V]**

```text
My Bank Expense Tracker/
├── .vscode/settings.json          # trivial: disables a Postman dotenv notice
├── backend/
│   ├── .env                       # MONGO_URI, MONGODB_URI, PORT, ORIGIN, ACCESS_PIN, JWT_SECRET (gitignored)
│   ├── .gitignore
│   ├── account.model.js           # 54 lines
│   ├── transaction.model.js       # 77 lines
│   ├── user.model.js              # 21 lines
│   ├── statementCore.js           # 103 lines — server-side dedup + fingerprint
│   ├── server.js                  # 792 lines — all routes, auth, import, balance
│   ├── package.json               # express 5, mongoose 9, jwt, helmet, cors, rate-limit, xlsx, officecrypto-tool
│   └── package-lock.json
└── frontend/
    ├── .env                       # VITE_BACKEND_URL (gitignored)
    ├── index.html                 # html class="dark", body bg-black (overridden by CSS)
    ├── vite.config.js             # tailwindcss + react plugins; commented-out /api proxy
    ├── eslint.config.js
    └── src/
        ├── main.jsx               # ExpenseProvider + App in StrictMode
        ├── App.jsx                # 87 lines — single page, no router
        ├── index.css              # Tailwind 4, Inter/Poppins, custom-scroll
        ├── context/ExpenseContext.jsx        # 566 lines — all state + API calls
        ├── utils/statementParser.js          # 759 lines — parsing + dedup + fingerprints
        └── components/            # 12 components
            ├── CalculatorPanel.jsx           (161)
            ├── LoadingState.jsx              (17)
            ├── LockScreen.jsx                (130)
            ├── NavBar.jsx                    (71)
            ├── personalCard.jsx              (377)
            ├── StatementImportHub.jsx        (697)
            ├── StatsSection.jsx              (125)
            ├── TransactionDetail.jsx         (197)
            ├── TransactionItem.jsx           (231)
            ├── TransactionsHeader.jsx        (136)
            ├── TransactionsList.jsx          (189)
            └── TransactionUpdateModal.jsx    (276)
```

### 1.3 Architectural characteristics

**[V]**

1. **Business logic is duplicated between client and server.**
   `frontend/src/utils/statementParser.js` and `backend/statementCore.js` both implement `normalizeDateKey`, `extractReferenceNumber`, `isDuplicateTransaction`, and fingerprinting. The server file's own comment says it *"Mirrors the frontend's isDuplicateTransaction heuristics"*. The two implementations already differ (see §5).
2. **Parsing is split across tiers.** CSV is parsed entirely in the browser with PapaParse. XLSX/XLS is base64-encoded in the browser, decrypted/opened on the server, returned as raw sheet rows, and then parsed **back in the browser** by `parseTableRows`.
3. **No routing.** The whole product is one route (`/`). Filters, pagination, selected transaction, and open modals live in React context — nothing is linkable or bookmarkable.
4. **No server-side querying.** `GET /api/transactions` returns every document; search, filtering, and pagination are client-side.
5. **Stored balance is mutated incrementally and occasionally overwritten absolutely.** Nothing derives it from transactions (see §6).
6. **Single-user assumption is baked into the server process**, not just the UI (see §7).
7. **No tests, no fixtures, no sample statements, no CI.**

---

## 2. Feature inventory

### 2.1 Working (verified by code trace)

| Feature | Primary source |
|---|---|
| PIN unlock + JWT session (30 days) | `server.js` `POST /api/auth/login` (L172–219); `ExpenseContext.jsx` `login` (L108–132), `verifyAuth` (L143–172) |
| Session lock/logout | `NavBar.jsx` → `logout` (`ExpenseContext.jsx` L134–140) |
| Account balance card + inline edit | `personalCard.jsx` L48–58, `ExpenseContext.jsx` L453–474 |
| Bank/account profile (name, type, preset, last-4) | `personalCard.jsx` L60–78; `server.js` `PATCH /api/accounts/info` (L309–326) |
| Import `.csv` / `.tsv` / `.txt` | `parseFileStatement` (L626–647) → PapaParse → `parseTableRows` |
| Import `.xlsx` / `.xls` (plain) | `parseFileStatement` L649–752; server `POST /api/statement/decrypt-and-parse` |
| Import password-protected XLSX/XLS | `server.js` L676–728 (3 strategies) + `generatePasswordVariants` (L622–657) |
| Import HTML-table-saved-as-`.xls` | `server.js` Strategy 3 (L715–728) |
| Password prompt with bank-specific hints | `StatementImportHub.jsx` L354–492, `getPasswordHint` (L217–232) |
| Import preview with row selection | `StatementImportHub.jsx` `preparePreview` (L110–153), preview modal (L494–693) |
| Per-row category override + DR/CR toggle in preview | `updateItemCategory` / `toggleItemType` (L183–197) |
| Duplicate badge + reason ("Already in tracker" / "Duplicate in file") | `preparePreview` L121–145 |
| Bulk insert with server-side re-dedup | `server.js` `ingestTransactions` (L410–497), `POST /api/transactions/bulk` (L500–534) |
| Transaction list with search | `TransactionsHeader.jsx`; filtering in `ExpenseContext.jsx` L243–287 |
| Category filter, type pills (Expense/Income/UPI/Cash/Reviewed/Pending) | `TransactionsHeader.jsx` L13–21; `ExpenseContext.jsx` L256–273 |
| Client-side pagination (20/page, 5-button window) | `ExpenseContext.jsx` L290–305; `TransactionsList.jsx` L54–69 |
| Transaction detail modal | `TransactionDetail.jsx` |
| Transaction edit modal | `TransactionUpdateModal.jsx`; `server.js` L537–595 |
| Transaction delete with confirm | `ExpenseContext.jsx` L418–447; `server.js` L599–619 |
| Single reviewed/unreviewed toggle | `TransactionItem.jsx` L111–127; `ExpenseContext.jsx` `toggleReviewed` L449–451 |
| Calculator scratchpad (select rows → income/expense/net) | `CalculatorPanel.jsx`; `ExpenseContext.jsx` L41–47, 307–319 |
| 30-day income/expense totals | `ExpenseContext.jsx` `stats` (L221–241) |
| Manual refresh | `NavBar.jsx` → `loadDashboardData` |

### 2.2 Partially working / UI does not match behaviour

| Finding | Evidence |
|---|---|
| **Bank presets are cosmetic.** `BANK_PRESETS[].headers` and `.dateFormats` are never read by the parser. `parseTableRows` uses generic header sniffing for every preset. `extractPartyAndTitle(description, bankPreset)` never uses `bankPreset`. The server receives `bankPreset` and ignores it. | `statementParser.js` L4–85, L155–208, L449–494; `server.js` L660–782 |
| **"Skip Already Imported Duplicates" cannot be bypassed.** Unchecking it lets the user *select* duplicate rows, but `ingestTransactions` always drops them. The user's choice is silently discarded. | `StatementImportHub.jsx` L158; `server.js` L445–448 |
| **Skipped counts are thrown away.** The API returns `skippedDuplicates`, but `bulkAddTransactions` only returns `count`, so the UI says "Imported N" without saying how many rows were dropped. | `ExpenseContext.jsx` L362–369 |
| **No import history.** Success is a 4-second banner. Nothing records the file, time, period, inserted/skipped/invalid counts. | `StatementImportHub.jsx` L167–172 |
| **No "add transaction" UI.** `addTransaction` is exported by the context and `POST /api/transactions` exists, but **no component calls either**. Manual entry is impossible in the current UI. | `ExpenseContext.jsx` L322–348, L538; grep across `src/` |
| **Client balance drifts after edits.** The client only adjusts its local balance when `amount` changed, ignoring `isExpense`/date changes, which the server does apply. | `ExpenseContext.jsx` L393–407 |
| **No error surface.** Parse failures, save failures, and delete failures use `alert()` / `console.error`. Duplicate skips and invalid rows are silent. | throughout `StatementImportHub.jsx`, `ExpenseContext.jsx` |
| **Stats include the future.** `txnDate >= thirtyDaysAgo` has no upper bound, so future-dated rows are counted. Local-timezone maths. | `ExpenseContext.jsx` L221–241 |
| **Theme intent contradicts implementation.** `index.html` sets `class="dark"` and `index.css` defines a `dark` variant, but `body` is `#f8fafc`, the shell is `bg-[#f1f5f9]`, and cards are white/slate-light. The UI is effectively light. | `frontend/index.html`, `index.css`, `App.jsx` L41 |
| **Lock-screen copy is misleading.** "PIN Protection • 100% Private Local Session" — data is server-persisted in MongoDB. | `LockScreen.jsx` L125–127 |
| **Reviewed rows are heavily de-emphasised** (60% opacity + line-through title), making review hard to verify. | `TransactionItem.jsx` L106, L150–152 |

### 2.3 Broken / unreachable code

| Finding | Evidence |
|---|---|
| `err.insertedDocs` fallback for `E11000` never runs: Mongo's `insertMany` error exposes `result.insertedIds` / `writeErrors`, not `insertedDocs`. Moreover `fingerprint` has **no unique index**, so `E11000` cannot occur from dedup at all. | `server.js` L469–477; `transaction.model.js` L57–60 |
| Value-date branch is unreachable: `dateCol` starts at `0`, and every branch is guarded by `dateCol === 0`, so the `value date` branch can never execute. Value date is never captured. | `statementParser.js` L476–477 |
| `getTransactionFingerprint` is imported but never called. | `StatementImportHub.jsx` L8 |
| `allowedOrigins` is computed and then ignored because CORS calls `callback(null, true)`. | `server.js` L65–76 |
| `singleAmountCol` only matches the literal headers `amount`, `txn amount`, `transaction amount`, `net amount`; `"Amount (INR)"` and similar variants are missed. | `statementParser.js` L482 |
| `getTransactionFingerprint`'s `COMPOSITE` variant embeds `ROW:${index}`, so it can never be stable across imports. | `statementParser.js` L355–358 |

### 2.4 Unused / unclear

- `transaction.source` is written but never surfaced or filtered, and XLSX imports are mislabelled `csv-import` (`server.js` L513).
- `accountinfos.accountId` (string `ACC-<timestamp>`) exists alongside Mongo `_id`; `transactions.accountId` is a *different* field (ObjectId). Two meanings, one name.
- `transaction.balance` is stored but only used by dedup; it is never displayed.
- `bankPresets.badgeColor` is declared but unused.
- Root-level prototype is fully unused by the current app.

---

## 3. SBI statement formats and parsing pipeline

### 3.1 Supported inputs

**[V]**

| Extension | Route through the system | Notes |
|---|---|---|
| `.csv`, `.tsv`, `.txt` | `parseFileStatement` → `Papa.parse(file)` → `parseTableRows` | Browser only; no server involvement |
| `.xlsx`, `.xls` | ArrayBuffer → base64 → `POST /api/statement/decrypt-and-parse` → `sheetData` → `parseTableRows` | Falls back to client SheetJS if the backend is unreachable |
| `.pdf` | **Not supported** | `parseFileStatement` throws `Unsupported file format` (L754) |

Other constraints **[V]**:
- Only the **first worksheet** is used (`workbook.SheetNames[0]`).
- `sheet_to_json(worksheet, { header: 1, raw: false })` — values arrive as formatted strings.
- No client-side file size check; the server's `express.json({ limit: '10mb' })` (L79) caps uploads at roughly 7.5 MB of binary after base64 expansion.
- No MIME/extension cross-check beyond the filename suffix.
- There is **no format detection step**. The user picks a bank preset (which does nothing), and the parser guesses columns.

### 3.2 Server decryption (`server.js` L660–782)

**[V]** Strategy order:

1. **Direct `XLSX.read`** with each password variant (or `undefined` if none entered).
2. **`officecrypto-tool.decrypt`** then `XLSX.read` — covers Agile and Standard ECMA-376 encryption.
3. **HTML fallback** — decode the buffer as UTF-8; if it contains `<table`/`<tr`/`<html`, parse with `XLSX.read(textContent, { type: 'string' })`. This catches SBI exports that are HTML tables with an `.xls` extension.
4. **Failure classification** — returns `{ encrypted: true, isPasswordRequired: true, message }` when the file appears to be an encryption/password problem (`isEncrypted`, missing password, or an error message matching `/password|encrypted|cannot find workbook|unsupported|CFB/i`), otherwise a generic `Could not parse statement file` error.

Password variants generated by `generatePasswordVariants` (L622–657):

- raw, trimmed, `UPPER`, `lower`
- non-alphanumeric characters stripped (plus upper/lower variants)
- `DDMMYYYY` → `DDMMYY`
- `DDMMYY` → `DDMM19YY` and `DDMM20YY`
- for 10-digit input: last 4 and last 5 digits

**[V]** This expands to at most ~9 candidates, each tried against two strategies.

**[I]** Rate limit for this endpoint is 20 requests / 5 minutes per IP (`statementLimiter`, L55–62), which is sensible for a CPU-heavy endpoint but also strict if a user retries a password several times.

### 3.3 Header detection (`parseTableRows`, L449–494)

**[V]**

- Scans the first **100 rows** for a candidate header row.
- A row qualifies if it contains a date-ish token (`date`, `tran date`, `txn date`, `posting date`, `value date`) **and** at least one of: a description-ish token, `debit`, `credit`, `withdrawal`, `amount`.
- Column mapping is by substring match:
  - date: `date|txn|tran|posting` (excluding `value`)
  - description: `narration|description|particular|details|remarks|merchant`
  - debit: `debit|withdrawal|dr|dr amt`
  - credit: `credit|deposit|cr|cr amt`
  - balance: `balance|closing|bal|available bal`
  - single amount: exact `amount|txn amount|transaction amount|net amount`
  - type: `type|dr / cr|dr/cr|cr/dr`
- If **no** amount column is found, it falls back to **hard-coded positions** `debit=3, credit=4, balance=5` regardless of the real layout (L490–494).
- When several columns match, the **last** match wins for description/debit/credit/balance.
- The `Ref No./Cheque No.` column of SBI exports is **never mapped**.

### 3.4 Row handling (L500–617)

**[V]**

1. **Footer/summary suppression.** Rows containing any of ~30 keywords are skipped: `total`, `grand total`, `opening balance`, `closing balance`, `available balance`, `total transactions`, `total withdrawal`, `total deposit`, `total debit`, `total credit`, `statement summary`, `account summary`, `brought forward`, `carried forward`, `computer generated`, `generated on/at`, `page `, `page no`, `statement period`, `end of statement/report`, `disclaimer`, `important notice`, `count of`, `b/f`, `c/f`.
   Before skipping, `extractClosingBalanceFromSummaryRow` (L406–447) tries to harvest a labelled balance from that row via regex over every cell, then falls back to the balance column or the last numeric cell.
2. **Strict date validation.** `parseDateSafely` (L210–296) must return a valid date, otherwise the row is dropped. It explicitly rejects strings containing `total/sum/page/balance/statement/period/generated/note/disclaimer/count`.
3. **Description required** and not equal to a header word (`narration`, `particulars`, `description`, `details`, `remarks`, or anything starting with `total`).
4. **Amounts** parsed as `parseFloat(String(cell).replace(/,/g, ''))`.
5. If debit and credit are both > 0, **debit wins and credit is discarded** (L591–593).
6. If only a single amount column exists, the row is a **credit** only when the type cell contains `cr`, `credit`, `received`, or `refund`; **everything else is treated as a debit** (L577–587).
7. Rows with both amounts zero are dropped.
8. `closingBalance` is reassigned on **every** successfully parsed row, so it ends as the **last data row's running balance in file order** (or a summary-row value if one is found later).

### 3.5 Date parsing (`parseDateSafely`, L210–296)

**[V]**

- JS `Date` → if midnight, re-anchor at **12:00 UTC**; otherwise keep.
- Excel serial (`20000 < n < 80000`) → epoch conversion with optional fractional time; date-only values anchored at 12:00 UTC.
- Strings split on `[-/.\s]+`, interpreted as `D/M/Y`, with 2-digit years mapped to `20YY`, month names supported, and `YYYY-MM-DD` detected when the first part is 4 characters.
- Fallback to native `new Date(...)`, re-anchored to UTC midday.
- Returns `null` when anything fails, so the row is dropped.

**Limitation [V]:** `M/D/Y` is never considered; the parser assumes day-first ordering. **[A]** acceptable for SBI (India), but it will misread any US-formatted export.

### 3.6 Derived fields

**[V]**

- `extractPartyAndTitle(description, bankPreset)` (L155–208):
  - `INTEREST CREDIT` / `INT.PD` → "Bank Interest Credit"
  - `CHQ WDL` / `CHEQUE` → "Cheque Withdrawal"
  - `ATM WDL` / `CASH WDL` → "ATM Cash Withdrawal"
  - `SALARY` / `ACH/SAL` → "Monthly Salary Credit"
  - `UPI/` or `UPI-` → split and take segment 3 (or 1), strip `@handle` and 5+ digit runs, title-case
  - `POS ` / `ECOM ` → first 3 words after the prefix
  - otherwise first keyword match from `CATEGORY_RULES`
  - otherwise **first chunk truncated to 25 characters + `...`** (L205–207)
  - `bankPreset` is accepted but never used.
- `categorizeTransaction(title, description)` (L135–143): first keyword win across Food / Travel / Shopping / Bills / Investments. **Default is `Bills`.**
- `isOnline` = `description` contains `UPI`.
- `reviewed` = `false`.
- `balance` = running balance from the balance column, if present.
- `description` = raw narration, preserved (good).
- `title` and `recipient` = **synthesised**, potentially truncated, and not the bank's narration.

**Data lost by the parser [V]:** reference/UTR/cheque number (column never read), value date, transaction code/type, statement period, opening balance, account metadata, source sheet/row index, and the raw row itself.

---

## 4. Database schema and field meanings

### 4.1 Collections

**[I]** Model names are `userInfo`, `accountInfo`, `transaction`. Mongoose's default pluralisation therefore creates collections `userinfos`, `accountinfos`, and `transactions`. This must be confirmed with a read-only query before migration work.

### 4.2 `userinfos` — `backend/user.model.js`

**[V]**

| Field | Type | Details |
|---|---|---|
| `name` | String | default `"Himanshu Singh"` |
| `email` | String | default `"personal@expense.local"` |
| `provider` | String | default `"local"` |
| `createdAt`, `updatedAt` | Date | timestamps |

- No password, no roles, no settings, no relations.
- Personal name hard-coded as a **data default**.

### 4.3 `accountinfos` — `backend/account.model.js`

**[V]**

| Field | Type | Details |
|---|---|---|
| `userId` | ObjectId → `userInfo` | **required**, indexed |
| `accountId` | String | **required, unique**; format `ACC-<Date.now()>` |
| `bankName` | String | default `"State Bank of India"` |
| `accountType` | String | default `"Savings Account"` |
| `accountNumber` | String | default `""`; UI labels it "Last 4 digits / Account Reference" |
| `parserPreset` | String | default `"sbi"`; **stored but functionally unused** |
| `currentBalance` | Number | double, default `0`; the single balance of record |
| `lastSyncedAt` | Date | default now; displayed to the user |
| `createdAt`, `updatedAt` | Date | timestamps |

**Naming collision [V]:** `accountinfos.accountId` is a human-readable string, while `transactions.accountId` is an ObjectId pointing at the account document. Same name, different types and meanings.

### 4.4 `transactions` — `backend/transaction.model.js`

**[V]**

| Field | Type | Details |
|---|---|---|
| `userId` | ObjectId → `userInfo` | **not required**, indexed |
| `accountId` | ObjectId → `accountInfo` | **not required**, indexed |
| `title` | String | required, trimmed — **synthesised**, may be truncated to 25 chars |
| `amount` | Number | required, `min: 0` (zero allowed) |
| `isExpense` | Boolean | required, default `true` |
| `category` | String | required, default `"Others"` |
| `recipient` | String | default `""` |
| `description` | String | default `""` — raw narration |
| `isOnline` | Boolean | default `false` |
| `reviewed` | Boolean | default `false` |
| `balance` | Number | optional — running balance **at that row** |
| `fingerprint` | String | indexed, **not unique**; md5 computed at insert only |
| `source` | String | default `"manual"` |
| `date` | **Mixed** | default now, indexed |
| `createdAt`, `updatedAt` | Date | timestamps |

Additional indexes on `{ date: -1 }` and `{ createdAt: -1 }`.

### 4.5 Schema observations that affect the rebuild

1. **Money is `Number` (IEEE-754 double).** Every calculation in the app is float arithmetic with ad-hoc rounding (`Math.floor(x * 100) / 100` in the root prototype; nothing in the current app).
2. **`date` is `Mixed`.** Documents may contain `Date`, ISO string, or number. `$sort: { date: -1 }` sorts by BSON type before value, so mixed data can sort incorrectly. Date-only statement values are stored as `12:00 UTC` anchors.
3. **`userId`/`accountId` are optional**, so orphaned or unowned rows are representable — and `GET /api/transactions` returns them regardless.
4. **`fingerprint` has no uniqueness constraint**, so de-duplication is purely application-level and race-prone.
5. **No import/batch document**, no provenance, no soft delete, no audit fields.
6. **`reviewed` already exists**, so the requested "bulk review" is an extension of an existing field rather than a new concept.
7. **[A]** There may already be duplicate rows, orphaned rows, or a `currentBalance` that no longer matches the transactions. This must be measured read-only before any migration.

---

## 5. Transaction identity and duplicate-detection rules

### 5.1 The decision sequence

**[V]** Implemented twice — `frontend/src/utils/statementParser.js` L361–403 and `backend/statementCore.js` L42–84. Both are:

1. `|candidate.amount − existing.amount| >= 0.01` → **not a duplicate**.
2. `isExpense` differs → **not a duplicate**.
3. Extract a reference from `description || title`:
   - `UPI|IMPS` + optional `DR|CR|P2A|P2P|NET` + 10–16 digits
   - `UPI|IMPS` + 10–16 digits
   - `UPI\d{10,16}`
   - `NEFT|RTGS` + 12–22 alphanumeric
   - `RRN|UTR` + 10–20 alphanumeric
   - `Chq`/`Cheque` + exactly 6 digits (prefixed `CHQ:`)
   - If **both** have references: equal → duplicate; **different → immediately not a duplicate**.
4. Different `YYYY-MM-DD` date keys → **not a duplicate**.
5. If **both** have numeric `balance`: equal within 1 paise → duplicate; otherwise **not a duplicate**.
6. Otherwise, exact lowercase-trimmed `description` equality → duplicate.
7. Otherwise not a duplicate.

### 5.2 Intra-file detection

**[V]** Two different mechanisms exist:

- **Preview (client):** keeps a `seenRefs` set and a `seenFullRows` set. With a reference → duplicate if the ref was seen before. Without a reference → key is `date|amount|isExpense|balance|description` (`StatementImportHub.jsx` L118–146).
- **Server:** runs the full pairwise `findDuplicateIn(candidate, intraBatch)` against rows already accepted in the same batch (`server.js` L445–449).

These are **not equivalent**. For example, a row with no parseable reference and no running balance can be flagged differently depending on which fields survive serialisation. The preview badge is therefore advisory, not authoritative.

### 5.3 Fingerprints

**[V]**

- **Server (stored):** `md5(dateKey|amount.toFixed(2)|ref|description.toLowerCase())` — `statementCore.js` L86–95.
- **Frontend (unused):** a structured key that prefers `REF:<ref>|AMT|TYPE`, else `DT|AMT|TYPE|BAL|DESC`, else `DT|AMT|TYPE|DESC|ROW:<index>` — L333–359.
- Fingerprints are computed **only at insert**, never recomputed after edits, and never used for lookups or uniqueness.
- The stored md5 is derived partly from a **mutable** field (`description`), so it is not a stable identity.

### 5.4 Limitations

**[V]**

1. **The strongest SBI signal is never used.** The `Ref No./Cheque No.` column is not mapped by the parser and is never read. Reference extraction only inspects narration text, so a huge fraction of real rows end up with `ref = null`.
2. **False positives are silently destructive.** Two genuinely distinct transactions on the same date with the same amount, same direction, no parseable reference, and no running balance are treated as duplicates and **dropped without warning** (e.g. two ₹500 withdrawals, or two identical small UPI payments to the same merchant).
3. **False negatives create duplicates.** Re-importing the same statement after any narration change produces different keys.
4. **0.01 tolerance is a heuristic, not a precision strategy.** It compares floats by subtraction.
5. **Cheque numbers are matched only when exactly 6 digits**; other lengths fall through to weaker rules.
6. **Intra-batch and DB rules diverge** (§5.2), and the client/server copies can drift independently.
7. **The user cannot override a duplicate** because the server always drops them.
8. **There is no cross-account isolation logic**, because there is effectively one account; the model would allow more.
9. **`skippedDuplicates` is computed but never shown** to the user.

---

## 6. Balance calculation / update rules

### 6.1 The core fact

**[V]** `accountinfos.currentBalance` is a **stored value**, mutated by increments and occasionally **overwritten absolutely** from statement data. It is **never derived** from the transaction collection, and nothing reconciles the two. The app mixes both strategies casually.

### 6.2 Every operation's exact effect

| Operation | Source | Effect on `currentBalance` | Atomicity |
|---|---|---|---|
| **Create** `POST /api/transactions` | `server.js` L364–401 | `$inc` by `isExpense ? −amount : +amount` **after** saving the document | Two separate writes, no session |
| **Manual set** `PATCH /api/accounts/balance` | L283–306 | Absolute overwrite + `lastSyncedAt` | Single write |
| **Bulk import** `POST /api/transactions/bulk` → `ingestTransactions` | L410–534 | See §6.3 | Insert-many + balance write, no session |
| **Update** `PUT`/`PATCH /api/transactions/:id` | L537–595 | `$inc` by `newSigned − oldSigned` **after** saving | Document already saved when balance write happens |
| **Delete** `DELETE /api/transactions/:id` | L599–619 | `$inc` by the reversal, **then** `deleteOne()` | Reversal and delete can diverge |

### 6.3 Import balance — detailed trace **[V]**

Inside `ingestTransactions` (L420–496):

```text
explicitClosingBalance = null
for each item (in the order the client sent them):
    netBalanceChange += isExpense ? -amount : +amount
    if item.balance is a number:        explicitClosingBalance = item.balance   // "last one wins"
    if item.closingBalance is a number: explicitClosingBalance = item.closingBalance

insertMany(docs)

if explicitClosingBalance !== null:
    currentBalance = explicitClosingBalance        // ABSOLUTE OVERWRITE
else:
    $inc currentBalance by netBalanceChange
```

Then in the route (L508–522):

```text
if req.body.closingBalance is a number:
    currentBalance = req.body.closingBalance      // ANOTHER ABSOLUTE OVERWRITE,
                                                  // applied even when 0 rows were inserted
```

The client sends `previewData.closingBalance`, which comes from `parseTableRows`, which assigns `closingBalance` on **every parsed row**, so it equals the **last data row's running balance in file order**.

### 6.4 Consequences (all [V], derived from the trace above)

1. **Order dependence.** `preparePreview` sorts newest-first (`StatementImportHub.jsx` L112–116), so items reach the server newest→oldest. The in-`ingest` "last row wins" therefore captures the **oldest** row's balance; the route-level override then replaces it with the last row **in file order**. For a newest-first export, the final value is the **earliest** balance in the statement.
2. **Historical imports clobber the present.** Importing a June statement when August transactions already exist sets the live balance to June's closing figure. The account card then contradicts the transaction list.
3. **Zero-row imports still rewrite the balance.** Re-importing an already-imported file inserts nothing but still applies `req.body.closingBalance`.
4. **No reconciliation invariant exists.** After import, `currentBalance ≠ opening + Σcredits − Σdebits` for the tracked rows, and the UI has no way to detect or explain the gap.
5. **All multi-write sequences are non-atomic.** No `session`/`transaction` is used anywhere. A failure between writes leaves the document and the balance inconsistent. In particular:
   - delete: if `deleteOne` fails after `$inc`, the balance is reversed but the row remains → the next successful delete reverses it again;
   - update: if the balance write fails, the row is already changed;
   - create: if `$inc` fails, the row exists with no balance effect.
6. **Legacy rows without `accountId` break updates.** `findByIdAndUpdate(updatedTxn.accountId, ...)` with an undefined/null id throws a CastError → the transaction is saved, the balance is not, and the endpoint returns 500.
7. **Edits never recompute `fingerprint`**, so identity metadata goes stale immediately.
8. **The client mirrors only part of the rule**, so the displayed balance drifts until a manual refresh.
9. **No guard for negative balances**, no opening-balance concept, no statement-period awareness.
10. **Floating-point accumulation** across hundreds of increments compounds rounding error.

### 6.5 Decision required

The rebuild must choose and document **one** invariant. The two candidates visible in the code are:

- **Statement-truth:** the bank's closing balance is authoritative; transactions are a record, and the balance is reconciled per statement period.
- **Transaction-derived:** balance = opening balance + sum of tracked transactions; imports contribute deltas only.

The current code attempts both simultaneously, which is why it drifts.

---

## 7. Authentication and data-ownership model

### 7.1 Boot-time context

**[V]** `initPersonalContext` (`server.js` L99–140) runs after Mongo connects:

1. `userInfo.findOne()` — if none, **creates** a user with the personal name/email defaults.
2. `accountInfo.findOne({ userId })` — if none, falls back to `accountInfo.findOne()` (**adopts any account in the collection**).
3. If still none, **creates** `ACC-<Date.now()>` (SBI / Savings / balance 0).
4. Caches `{ userId, accountId }` in a module-level object for the process lifetime.

**[V]** Optional fields in login's JWT payload fall back to a **hard-coded ObjectId**: `userId || '6947e733c2c118727b747f12'` (L202).

### 7.2 Authentication

**[V]**

- Login is a **single shared access PIN** (`ACCESS_PIN`) compared with `===` — no per-user credentials, no hashing, no constant-time compare (L181).
- Server refuses to boot without `ACCESS_PIN` or `JWT_SECRET` (L27–36) — a genuine improvement over hard-coded secrets.
- Token: `jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '30d' })`.
- Verification: `authMiddleware` validates the Bearer token and sets `req.user` (L151–165).
- **`req.user` is then never used by any handler.** Every handler calls `getContext()` and uses the cached global ids.
- Token lives in **`sessionStorage`** (`ExpenseContext.jsx` L20–21, 122). Readable by any script on the page.
- No refresh, no revocation, no logout endpoint; logout only clears `sessionStorage`.

### 7.3 Ownership enforcement

**[V] — every data route is unscoped:**

| Endpoint | Query | Ownership check |
|---|---|---|
| `GET /api/transactions` | `transaction.find({})` | **none** — returns the entire collection |
| `GET /api/accounts/account` | `accountInfo.findById(cachedAccountId)` | cached only |
| `PATCH /api/accounts/balance` | `findByIdAndUpdate(cachedAccountId)` | cached only |
| `PATCH /api/accounts/info` | `findByIdAndUpdate(cachedAccountId)` | cached only |
| `POST /api/transactions` | writes `cached userId/accountId` | cached only |
| `POST /api/transactions/bulk` | reads `find({ accountId })`, writes cached ids | cached only |
| `PUT`/`PATCH /api/transactions/:id` | `findById(id)` | **none** |
| `DELETE /api/transactions/:id` | `findById(id)` | **none** |
| `GET /api/me` | `findById(cachedUserId)` | cached only |
| `GET /api/auth/verify` | cached user | token validity only |

**Practical impact [V]:** any valid token (or any second trusted user, if one is ever added) can read, edit, and delete **every transaction in the database**. Because there is currently exactly one real user, this is invisible in daily use — but it is precisely the "personal-app shortcut" `AGENTS.md` forbids reproducing.

### 7.4 Other security-relevant configuration

**[V]**

| Item | Finding |
|---|---|
| CORS | `origin: callback(null, true)` **with `credentials: true`** — reflects any origin; `allowedOrigins` computation is dead code (L65–76) |
| Helmet | enabled with `contentSecurityPolicy: false` (L78) |
| Rate limits | login 5/min/IP; statement decrypt 20/5 min/IP; **no global or per-token limiter** |
| Body limit | `express.json({ limit: '10mb' })` |
| Validation | none — ad-hoc `String()`, `Number()`, `Boolean()` coercion; `Boolean("false") === true` |
| Logging | file name, byte size and "password provided" are logged; failing decryptions log error text; no secrets logged |
| DNS | `dns.setServers(['8.8.8.8','1.1.1.1','8.8.4.4'])` overrides system resolvers at import time (L2–7) |
| Trust proxy | `app.set('trust proxy', 1)` — correct behind a proxy, but also means a spoofed `X-Forwarded-For` can influence rate-limit keys if the deployment is not actually behind a trusted proxy |
| Dependencies | `xlsx@0.18.5` (npm build frozen; known prototype-pollution / ReDoS advisories), `officecrypto-tool@0.0.19` (pre-1.0) — both should be re-evaluated before reuse |

---

## 8. Frontend route and component inventory

**[V]** One route. No router, no layouts, no URL state.

| File | Responsibility | Notable behaviour |
|---|---|---|
| `src/main.jsx` | Mounts `ExpenseProvider` + `App` in `StrictMode` | — |
| `src/App.jsx` | Auth gate (`authChecking` → spinner; `!isAuthenticated` → `LockScreen`) then dashboard | Composes every section inline; global "Syncing" overlay when `isSyncing` |
| `context/ExpenseContext.jsx` | Token, user, account, transactions, filters, pagination, calculator selection, all API calls, 30-day stats | `authFetch` logs out on 401 (L83–105); `loadDashboardData` fetches account + me + all transactions in parallel (L175–213) |
| `components/LockScreen.jsx` | PIN entry, show/hide, shake error | Copy claims "100% Private Local Session" |
| `components/NavBar.jsx` | Greeting (time-based), Sync, Lock | Personal name fallback `'Himanshu'` |
| `components/personalCard.jsx` | Balance card, inline edit, bank/profile modal | Writes `parserPreset`; gradient card; "Switch Bank" |
| `components/StatsSection.jsx` | 30-day income, 30-day spend, net balance | Pure client-side maths |
| `components/StatementImportHub.jsx` | Preset pills, drag-drop, password modal, preview modal, confirm | `alert()` on all failures; preset selection is cosmetic |
| `components/CalculatorPanel.jsx` | Income/expense/net for ticked transactions | Selection persisted in `localStorage` |
| `components/TransactionsHeader.jsx` | Search, category select, type pills, reset | Counts, filters in context |
| `components/TransactionsList.jsx` | Rows, loading + empty states, pagination | `window.scrollTo({ top: 400 })` on page change |
| `components/TransactionItem.jsx` | Reviewed toggle, calculator toggle, category badge, DR/CR amount, edit/delete | Reviewed rows at 60% opacity with line-through |
| `components/TransactionDetail.jsx` | Read-only detail modal | Gradient sections |
| `components/TransactionUpdateModal.jsx` | Edit form | Validates title/amount with `alert()` |
| `components/LoadingState.jsx` | Full-screen sync overlay | — |
| `utils/statementParser.js` | Presets, categories, date/amount parsing, dedup, fingerprints, file→rows | Shared by the import hub |

**State management [V]:** a single React context. No Zustand/Redux/React Query. All server state is manually mirrored into context and patched optimistically, which is the source of the balance drift in §6.

**Styling [V]:** Tailwind 4 via `@tailwindcss/vite`, `Inter`/`Poppins` from Google Fonts, custom scrollbar utilities, heavy use of `framer-motion` for enter/exit and hover. Visual language is light/slate with a few gradient accents; several arbitrary hex colours in category badges are duplicated in two components.

**UX-state coverage [V]:**
- Covered: transaction-list loading, transaction-list empty, import parsing, import preview, password error, sync overlay.
- Missing: account/stat skeletons, failed initial load, failed save/delete, import partial failure, invalid-row reporting, network-offline state, keyboard/focus management in modals, escape-to-close, focus trap.

---

## 9. Known bugs, security risks, data-integrity risks, technical debt

### 9.1 Data integrity (ordered by severity)

1. **Import overwrites the account balance from file data, order-dependently, even when zero rows insert** (§6.3–6.4). The stored balance can silently become wrong after any import.
2. **Real transactions can be silently discarded as duplicates** when date, amount, direction match and no reference/balance is available (§5.4).
3. **Re-imports can create duplicates** when narrations differ (§5.4).
4. **Invalid rows are dropped without any count or reason.** `ingestTransactions` `continue`s on `amount <= 0` (L423) and on duplicates, and the UI never sees the difference between "parsed 120, inserted 96" and "inserted 120".
5. **All multi-write operations are non-atomic** (§6.4.5).
6. **Closing-balance extraction is heuristic** and can latch onto an unrelated `total`/`balance` cell, then be written to the live account balance.
7. **Single-amount statements with a `Deposit`/`Withdrawal` type column invert deposits into debits** (§3.4.6).
8. **Value date, reference number, statement period, and opening balance are lost** (§3.6).
9. **`date` is `Mixed`**, so sort order and day grouping are not guaranteed.
10. **Client and server business rules diverge** (balance, dedup, stats, filters).
11. **No idempotency key per import.** Replaying a request can re-apply the balance rewrite even when inserts are skipped.
12. **No tests or fixtures** protect any of the above.

### 9.2 Security

1. **No ownership scoping on any data route**; `GET /api/transactions` reveals the whole collection; `:id` routes are unrestricted (§7.3).
2. **Hard-coded fallback user ObjectId** in the JWT payload.
3. **Auto-created default personal user and account**, including adopting "any account" if none matches the user.
4. **CORS reflects any origin with credentials**; the allow-list is dead code.
5. **Token in `sessionStorage`**, 30-day lifetime, no revocation — XSS-exfiltratable.
6. **PIN compared with `===`**, not constant-time.
7. **CSP disabled** in Helmet.
8. **No request-body validation**; type coercion bugs (e.g. `Boolean("false")`).
9. **No audit trail** for destructive operations.
10. **Dependency risk** in `xlsx@0.18.5` and `officecrypto-tool@0.0.19`.
11. **Statement bytes are accepted without MIME verification**, decrypted in-process, with a 10 MB JSON cap and no malware/zip-bomb consideration beyond parser behaviour.
12. **Personal data defaults** (name/email) are baked into model defaults and API fallbacks.

### 9.3 Technical debt

- Duplicated domain logic across client and server, already divergent.
- Parser hard-codes fallback column indices and ignores the preset metadata it advertises.
- Business rules live in React context rather than a domain module.
- All transactions fetched to the client; filtering/pagination/aggregation are client-side.
- `alert()`-driven error handling; no typed error model; parse failures can masquerade as password failures and vice versa.
- Single route with a modal stack; nothing linkable.
- Inconsistent category vocabulary (parser default `Bills`, model default `Others`, 11 UI categories, only 5 auto-assigned).
- Dead code paths (§2.3) that imply safeguards which do not exist (unique index, CORS allow-list, inserted-docs recovery).
- Personal identifiers hard-coded across UI and server.

---

## 10. Files containing logic worth migrating (as behaviour, not as code)

| File | What to take | Why |
|---|---|---|
| `frontend/src/utils/statementParser.js` | Header-sniffing rules; footer/summary skip list; `parseDateSafely` with 12:00-UTC anchoring and Excel-serial handling; `extractClosingBalanceFromSummaryRow`; `extractPartyAndTitle` narration patterns; `CATEGORY_RULES` | These encode real SBI layout quirks learned from actual files. Port to TypeScript, make deterministic and testable, and extend with the missing reference column. |
| `backend/statementCore.js` | Reference regexes and the pairwise dedup decision order | The rule set is product behaviour. Consolidate into one server-side module — do not keep two copies. |
| `backend/server.js` L622–782 | The three decryption strategies and `generatePasswordVariants` | Genuinely useful SBI behaviour (encrypted XLSX, HTML-as-`.xls`, DOB variants). Extract into `helpers/`/`lib/`, server-side only. |
| `backend/*.model.js` | Field names and semantics (`isExpense`, `category`, `recipient`, `description`, `balance`, `reviewed`, `source`, `fingerprint`), collection naming, `_id` compatibility | Required for a safe migration path and for reading existing data unchanged. |
| `context/ExpenseContext.jsx` | API contract shapes; filter, search and pagination semantics; reviewed toggle; calculator selection model | Behavioural reference for the rebuilt UI and for the eventual import/transaction APIs. |
| `components/StatementImportHub.jsx` | The upload → password → preview → dedup → correct → confirm flow | The flow matches `AGENTS.md` §9 and should be preserved, with real error handling and provenance added. |
| `components/TransactionItem.jsx`, `personalCard.jsx`, `TransactionsList.jsx`, `TransactionsHeader.jsx` | Information hierarchy: balance first, DR/CR clarity, category badges, review affordance, scan-friendly rows | Reference for what the user actually uses daily. Visual treatment is to be redesigned, not copied. |
| `expense.js` (root) | **Nothing functional** | Different app, fixed columns, `localStorage`, no dedup. Historical intent only. |

---

## 11. Logic that should be rewritten rather than copied

1. **All balance logic.** Define one documented invariant, apply it atomically, and expose reconciliation. Do not carry over the increment/overwrite mix.
2. **Import persistence.** One transactional write path with an import/batch record, an idempotency key, per-row outcomes (inserted / duplicate / invalid / ambiguous), and recoverable failure semantics.
3. **Duplicate detection.** One server-side implementation; parse and store the reference column; build a deterministic identity key rather than an md5 over mutable text; document false-positive/false-negative behaviour; add the smallest safe unique constraint.
4. **Authentication and ownership.** Derive identity from a verified session, scope every query, validate every input, choose cookie-vs-bearer deliberately, add CSRF/rate-limit policy, and remove all hard-coded ids and personal defaults.
5. **Parser architecture.** An SBI adapter with explicit, testable column mappings and provenance (sheet, row number, raw cells), explicit unsupported/ambiguous outcomes, and no silent fallback indices. Presets must actually change behaviour or be removed.
6. **Money and dates.** Integer paise or `Decimal128`; date-only statement dates stored distinctly from timestamps; timezone (IST) documented.
7. **Client data flow.** Server-side filtering, search, pagination and aggregates; no whole-collection fetch; no client arithmetic treated as truth.
8. **Analytics.** Server-computed from persisted data with explicit ranges and definitions.
9. **UI shell.** Routes, layouts, shared primitives, design tokens, accessible modals, inline validation, and complete loading/empty/error states; remove every `alert()`.
10. **Configuration and security.** Fix CORS, re-enable CSP, add schema validation, and re-evaluate `xlsx`/`officecrypto-tool`.

---

## 12. Questions that cannot be answered from the code alone

### Statement data (blocking for parser design)
1. **[A]** Which exact SBI exports do you actually use — YONO CSV, OnlineSBI XLS/XLSX, or password-protected files? We need at least one **sanitised** sample per format (redacted amounts/account numbers) to confirm header layouts.
2. **[A]** Do your files contain a **value date** or a **separate Ref/Cheque column** you rely on? Are they ordered **newest-first or oldest-first**?
3. **[A]** Are PDF statements required for release 1, or is CSV/XLS sufficient?

### Data (blocking for migration)
4. **[A]** Which collections and documents exist in the live database? Are there transactions with null/duplicate `userId` or `accountId`? Are there existing duplicates? Has `currentBalance` already drifted?
5. **[A]** Must existing `_id` values and collection names be preserved? (Audit recommendation: yes.)
6. **[A]** Is this one account only, or must the model anticipate multiple SBI accounts later?

### Money and balance semantics (blocking for the plan)
7. **[A]** Should "balance" mean the **bank's latest closing balance**, or **opening + tracked credits − debits**?
8. **[A]** On importing a **historical** statement, should the live balance change at all? What reconciliation rule should apply?

### Product and authentication
9. **[A]** Keep the single-PIN gate (personal, no accounts), or move to a real per-user login? Is public registration to remain disabled?
10. **[A]** Are all 11 UI categories canonical, or should auto-categorisation use a defined subset? Should unmatched rows default to `Others` or `Bills`?
11. **[A]** Is manual "add transaction" in scope for release 1? The endpoint exists but has never had a UI.
12. **[A]** Is the **dark theme** confirmed? The legacy UI is effectively light despite a `dark` class.
13. **[A]** Should raw uploaded statements be stored for provenance, or only parsed rows plus metadata?

### Environment
14. **[A]** Deployment target and MongoDB topology — replica set (enables sessions/transactions)? Upload size limits? Node/Next version to pin?
15. **[A]** Is the **Anviksha** project available anywhere as a design reference? It is not in this repository.
16. **[A]** Confirm the canonical folder name is `bank_expense_tracker_nextjs/` (see the naming note below).

---

## Appendix A — API endpoint inventory

**[V]** All routes are defined in `backend/server.js`.

| Method | Path | Auth | Limiter | Notes |
|---|---|---|---|---|
| POST | `/api/auth/login` | no | 5/min/IP | Shared PIN → 30-day JWT |
| GET | `/api/auth/verify` | yes | — | Returns cached user |
| GET | `/api/me` | yes | — | Cached user, personal defaults |
| GET | `/api/accounts/account` | yes | — | Cached account |
| PATCH | `/api/accounts/balance` | yes | — | Absolute balance overwrite |
| PATCH | `/api/accounts/info` | yes | — | Bank/type/preset/last-4 |
| GET | `/api/transactions` | yes | — | **`find({})` — unscoped** |
| POST | `/api/transactions` | yes | — | Unused by the UI |
| POST | `/api/transactions/bulk` | yes | — | Dedup + insert + balance overwrite |
| PUT / PATCH | `/api/transactions/:id` | yes | — | **Unscoped**, balance diff |
| DELETE | `/api/transactions/:id` | yes | — | **Unscoped**, balance reversal |
| POST | `/api/statement/decrypt-and-parse` | yes | 20/5 min/IP | Base64 file → sheet rows |

## Appendix B — Client persistence keys

**[V]**

| Key | Storage | Purpose |
|---|---|---|
| `expense_token` | `sessionStorage` | JWT |
| `expense_calc_ids` | `localStorage` | Calculator selection (array of transaction `_id`s) |
| `expense_theme` | `localStorage` | Written as `'dark'` on mount; not actually applied |

Root prototype (separate app): `allTransactions`, `currentBalance`, and per-transaction review flags in `localStorage`.

## Appendix C — Dependency inventory

**Backend [V]:** express 5, mongoose 9, jsonwebtoken 9, helmet 8, cors 2, express-rate-limit 8, dotenv 17, xlsx 0.18.5, officecrypto-tool 0.0.19, nodemon (dev).

**Frontend [V]:** react 19, react-dom 19, vite 7, tailwindcss 4 + `@tailwindcss/vite`, framer-motion 13, papaparse 5, xlsx 0.18.5, eslint 9.

**New app [V]:** next 16.4.3, react 19.3.0, react-dom 19.3.0, tailwindcss 4 + `@tailwindcss/turbopack`, react-compiler, eslint-config-next 16.4.3, typescript 5.

---

## Summary

The current app is a genuinely useful personal tool with a well-shaped SBI import flow, but its financial core rests on three unsafe shortcuts:

1. **A global cached user/account with no query scoping** — any authenticated request can read or mutate everything.
2. **Duplicate detection that never reads the reference column**, so it can silently discard real transactions and cannot reliably prevent duplicates.
3. **A stored balance that is overwritten from whichever statement was imported last**, producing a figure that no longer reconciles with the transaction list.

Client and server each implement the same rules independently, so they can and do disagree. None of this behaviour is protected by tests, and the repository contains no sample statements.

The rebuild's most valuable work is therefore not visual: it is **one balance invariant, one transaction-identity rule, and one atomic import path**, each verified against real (sanitised) SBI files.

---

### Document history

| Date | Author | Change |
|---|---|---|
| 2026-11-01 | OpenCode | Initial read-only audit of the legacy React + Vite app and root prototype |
