# Codebase map — in plain language

> Read this before touching anything. It is written for a human, and it is
> also the context sheet to hand to any AI you want to refactor with.
> Rule of thumb for every change: **run the checks** (`npx tsc --noEmit`,
> `npm run lint`, `npx vitest run`, `npm run build`) — they are the truth,
> not anyone's opinion of "clean".

## The one idea to understand

Money is stored as **integer paise** (`₹1,276.36` → `127636`). Every number
that leaves the database goes through one door (`toTransactionDto`) and one
formatting door (`formatINR` in `src/lib/utils.ts`). If a refactor keeps
those two doors intact, it cannot corrupt the money math.

The second idea: **rows are only written on an explicit user press.**
Import = analyze → preview → confirm. Delete = confirm → soft delete.
No exception hides a write.

## Folder map (what lives where)

| Path | What it does | Safe to change? |
|---|---|---|
| `src/app/(app)/…` | The pages (dashboard, transactions, imports, analytics, settings) — each is server code that loads data with the lib functions and hands it to one component. | UI freely; data loading carefully |
| `src/app/api/…` | Route handlers. Thin on purpose: check session → validate with a Zod schema → call one lib function → return `ok()/fail()`. Any business logic belongs in `lib/data`, not here. | Add routes freely; never move ownership checks out of them |
| `src/app/(auth)/` + `/setup`, `/design` | Login, first-run setup, design-specimen page. The `/design` page has a live example of every UI piece — copy from there before inventing anything. | UI |
| `src/components/…` | All React components, grouped by page (`transactions/`, `imports/`, `common/`, `ui/`). Client components end with `"use client"`. | Freely |
| `src/lib/` | The engine room, grouped below. | With care |
| `src/helpers/statement-parser/` | Turning an Excel file into rows: `table-parser.ts` (the ported legacy parse + SBI party-name rules), `workbook-reader.ts` (open file, try password variants), `duplicate-check.ts` (the ported legacy duplicate rules). | Keep the legacy behavior — tests pin it |
| `src/validations/` | Zod schemas — every request body shape in one place. | Freely |
| `src/models/` | Mongoose schemas (`transaction`, `account`, `statement-import`). The legacy columns (`amount`, `isExpense`, `date`) are kept in sync intentionally — the old app still works against the same DB. | Do not rename fields |
| `src/types/` | TypeScript shapes the lib and UI share. | Freely |
| `tests/` → actually `src/**/*.test.ts` | The safety net (70+ tests): money math, parser behavior, identity/dedupe keys, AI-output validation. | Add; never delete to make a pass |

## `src/lib/` — the engine room

| File | What it does |
|---|---|
| `money.ts` | Paise↔rupees, integer-safe math, `formatINR`, balance rules. **Money never bypasses this file.** |
| `dates.ts` | Statement dates are CALENDAR dates stored at UTC midnight — never "now" shifted. IST month ranges live here. |
| `dbConnect.ts` | One Mongo connection. |
| `api.ts` | `ok()/fail()` response helpers, `codedError`, `respondToError`, same-origin check. |
| `auth.ts` | Single auth file: session cookie `<userId>.<token>`, bcrypt verification, owner resolution. No JWT. |
| `data/transactions.ts` | **The ledger brain.** Reads (list/filter/pagination/totals), identity (`dedupeKey`, fingerprint), and soft deletes / reviewed updates. Everything is owner-scoped. |
| `data/imports.ts` | **The import brain.** In-memory preview builder (`buildPreviewRows`), anchor updater, and confirmation (`confirmImportRows`). History created only if at least 1 row inserted. |
| `data/accounts.ts` | Account reads, balance anchor, cached balance calculation. |
| `ai.ts` | Tier 1 local embedded model (`@huggingface/transformers` with `all-MiniLM-L6-v2` embeddings vs category centroids). Fast, offline, deterministic fallback. |

## Data flow of an import (memorize this one)

```text
Excel file (.xls / .xlsx)
  → helpers/statement-parser          (workbook-reader decrypts, table-parser sniffs & cleans)
  → lib/data/imports.buildPreviewRows (in-memory preview, dedupe check vs DB and within-file)
  → lib/ai.suggestCategories          (Tier 1 offline embeddings suggest unconfident categories)
  → client preview in browser         (ZERO database footprint during analyze; can discard anytime)
  → user reviews preview              (toggles duplicate inclusions, applies category suggestions)
  → POST /api/imports/confirm         (confirmImportRows writes to transactions; refreshes balance anchor;
                                       saves StatementImport history ONLY if inserted >= 1)
```

## If another AI refactors this

Give it this file plus `AGENTS.md`, and hold it to four rules:

1. **The checks are the contract** — tsc, lint, vitest, build must all pass after every step. Refactor one file at a time, run the checks, commit only if green.
2. **The old app is the oracle** — its fields (`amount`, `isExpense`, `date`) stay written by every write path.
3. **No new libraries, no new layers** — no state managers, no DI, no "services". The simplicity goal is achieved by *deleting* code, not adding patterns.
4. **Paise stay paise** — if a refactor introduces `Number` arithmetic on rupees or floats, it is wrong, full stop.

## Ported legacy logic (do not "improve" blindly)

- `table-parser.ts` — `parseTableRows`, `extractPartyAndTitle` (regex fallbacks for
  bank phrases → UPI names → card machines), SBI column variations.
- `duplicate-check.ts` — legacy fingerprint + heuristics.
- Password variants for XLS unlock.
- One documented deviation: impossible calendar dates are now rejected instead
  of silently rolling (`fromISODate`).
