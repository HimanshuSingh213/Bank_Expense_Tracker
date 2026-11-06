# SBI Expense Manager (Next.js Rebuild)

A clean, maintainable Next.js + TypeScript ledger rebuilt specifically for **State Bank of India (SBI)** statements.

---

## Key Principles & Architecture

### 1. Authoritative Integer Paise
- All monetary arithmetic is performed in integer paise (`amountPaise`). Floating-point arithmetic on money is forbidden.
- Legacy fields (`amount`, `isExpense`, `date`, `balance`) are kept strictly synchronized for backward compatibility with existing MongoDB databases.

### 2. Anchored Ledger Balance
- Balances are not stored as static truths that can drift out of sync.
- The account document carries a `balanceAnchor` (`balancePaise`, `asOfDate`, `source`, `note`).
- **Current Balance** is dynamically calculated on read: `anchorPaise + sum(signedPaise after asOfDate)`.
- Upon statement import confirmation, the anchor is refreshed from the statement's ending balance (`source: "statement"`), never regressing to an older date.

### 3. In-Memory Preview & Zero-Footprint Import Pipeline
- **Analyze** (`POST /api/imports`): Parses `.xls` / `.xlsx` files entirely in memory on the server. Decrypts with optional passwords, cleans narrations, flags duplicates against existing ledger entries, and returns a preview directly to client state.
- **No DB footprint for drafts**: Drafts are never written to MongoDB. The user can discard a preview at any time with zero database pollution.
- **Confirm** (`POST /api/imports/confirm`): Rows reach the ledger only when explicitly confirmed.
- **Import History**: A record in `statementimports` is created **only if at least 1 row was actually imported** (`inserted >= 1`). If 0 rows are inserted, no history record is created.

### 4. Categorization Engine
- **Deterministic Rules**: High-confidence keyword matching in `src/helpers/statement-parser/table-parser.ts` handles common Indian banking narrations (UPI, Swiggy, Zomato, PVR/INOX, salaries, ATM cash withdrawals, bill payments).
- **Tier 1 Offline Embeddings**: Unclassified narrations use `@huggingface/transformers` (`all-MiniLM-L6-v2` 8-bit quantized embeddings) compared against category centroids in ~2ms per row with zero cloud API dependencies.
- Tier 2 external LLM/Ollama calls were removed to avoid hallucinations and maintain sub-second preview performance.

### 5. Streamlined Auth & Scoping
- Single auth file (`src/lib/auth.ts`) utilizing bcrypt and secure HTTP-only cookies containing `<userId>.<sessionToken>`.
- Every database read and write is strictly owner-scoped by the verified `userId`.

---

## Statement Import Data Flow

```text
Excel Statement (.xls / .xlsx)
  │
  ▼
POST /api/imports (Analyze)
  ├── workbook-reader: Decrypt workbook with password variants
  ├── table-parser: Sniff headers, extract dates, paise amounts, party/reference info
  ├── duplicate-check: Detect duplicates against DB and intra-file twin rows
  └── ai.suggestCategories: Tier 1 embeddings suggest unconfident categories
  │
  ▼
In-Memory Preview UI (Client State)
  ├── Review parsed rows, amounts, running balances, and duplicate reasons
  ├── Toggle row inclusion/exclusion
  ├── Apply AI category suggestions
  └── Discard preview at any time (Zero DB footprint)
  │
  ▼
POST /api/imports/confirm (Confirm)
  ├── Transaction.insertMany(ordered: false)
  ├── refreshAnchorFromRows: Updates account balance anchor
  └── StatementImport.create: Saved ONLY if inserted >= 1
```

---

## Deployment on Vercel

### 1. Root Directory Setting
Because the repository root contains the legacy application alongside the Next.js rebuild, configure the **Root Directory** in your Vercel Project Settings:
```text
bank_expense_tracker_nextjs
```

### 2. Environment Variables
Configure the following in the Vercel Dashboard (**Project Settings → Environment Variables**):

| Variable | Description | Example / Default |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string (Atlas or self-hosted) | `mongodb+srv://...` |
| `STATEMENT_PASSWORD` | (Optional) Default fallback password for encrypted SBI statements | `01011990` |
| `AI_CATEGORY_SUGGESTIONS` | Set to `off` to disable `@huggingface/transformers` and rely 100% on deterministic keyword parser | `on` (or `off`) |

> **Vercel Serverless Recommendation**: If you experience cold-start overhead or serverless function bundle limits with `@huggingface/transformers`, set `AI_CATEGORY_SUGGESTIONS=off`. The application will instantly fall back to the deterministic keyword parser with zero overhead.

---

## Verification Gates

Before submitting changes, all four quality gates must pass cleanly:

```bash
# 1. TypeScript type checking
npx tsc --noEmit

# 2. ESLint
npm run lint

# 3. Unit and integration test suite
npx vitest run

# 4. Next.js production build
npm run build
```
