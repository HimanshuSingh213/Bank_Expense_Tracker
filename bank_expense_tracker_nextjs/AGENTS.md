# AGENTS.md — SBI Expense Manager (Next.js Rebuild)

> This file is the project-level instruction manual for OpenCode and other coding agents.
> Read it before inspecting, planning, or changing code. Follow the phases in order.
> The new application is SBI-specialised first. Do not expand it into a generic finance platform during the initial rebuild.

---

## 1. Project goal

Rebuild the existing **Bank Expense Tracker** as a clean, maintainable Next.js + TypeScript application, with **State Bank of India (SBI) statement handling as the first-class use case**.

The current application is the reference implementation. It contains business rules and working behaviour that must be inspected and understood before anything is migrated. It is not automatically the ideal architecture or UI.

The rebuild must deliver:

- A clear, polished, consistent frontend with the information hierarchy and organisational clarity of the user's Anviksha project, but with a more refined visual design and better interaction details.
- Correct SBI statement import, parsing, transaction normalisation, duplicate detection, transaction management, and balance handling.
- A maintainable codebase with straightforward TypeScript and clear separation of UI, domain logic, database access, and API handlers.
- A safe migration path that leaves the existing application usable and untouched while the new app is developed.
- An architecture that can accept AI-assisted features later without requiring a rewrite. Do not implement AI features in the initial rebuild.

The first release is deliberately narrow: **make the existing SBI workflow correct, understandable, and pleasant to use before adding new product features.**

## 2. Repository layout and non-negotiable boundaries

The Git repository root is `Bank_Expense_Tracker/`. The current layout is:

```text
Bank_Expense_Tracker/
├── .git/
├── bank_expense_tracker_nextjs/  # NEW Next.js application
│   ├── AGENTS.md
│   ├── docs/
│   └── src/
├── My Bank Expense Tracker/      # legacy application directory
├── expense.css                   # legacy standalone file; preserve
├── expense.js                    # legacy standalone file; preserve
├── index.html                    # legacy standalone file; preserve
├── .gitattributes
└── README.md
```

The legacy `My Bank Expense Tracker/` directory contains the existing `backend/` (Express + Mongoose) and `frontend/` (React + Vite) folders, along with any other existing legacy files. Inspect its actual contents rather than assuming the tree is complete.

The new application already has its own folder at the repository root:

`bank_expense_tracker_nextjs/`

**Keep this location and folder name, including its exact lowercase spelling, because the filesystem is case-sensitive. Do not create `next-app/`, do not rename the folder, and do not move the new folder into `My Bank Expense Tracker/`.**

### Strict boundaries

1. All new application code, configuration, tests, and documentation belong inside `bank_expense_tracker_nextjs/`.
2. Do not move, rename, delete, overwrite, or refactor `My Bank Expense Tracker/`, the root-level `index.html`, `expense.css`, `expense.js`, or other legacy files.
3. Initialise and run Next.js only inside `bank_expense_tracker_nextjs/`.
4. Do not make the legacy app depend on the new app, or vice versa, during the initial rebuild.
5. The new app must connect to the existing MongoDB database using an environment variable. Do not create a replacement database unless explicitly approved.
6. Never run destructive database operations, mass updates, migrations, or cleanup scripts without a reviewed plan, a backup, and explicit user approval.
7. If a task appears to require editing outside `bank_expense_tracker_nextjs/`, stop and explain why before doing it.
8. **Never delete, move, rename, overwrite, or otherwise destroy any file, directory, branch, Git history, MongoDB document, collection, or index without explicit permission from the user for that specific action.** Inspection and reading never require permission; destructive actions always do. Propose the action, explain the consequence, and wait for approval.

## 3. Setup: initialise the new app in the existing folder

The user has already created:

`Bank_Expense_Tracker/bank_expense_tracker_nextjs/`

and placed this `AGENTS.md` inside it.

> **Current status (verified 1 November 2026):** the scaffold is already initialised in this folder — Next.js 16.4.3, React 19.3.0, TypeScript 5, Tailwind CSS 4, ESLint, App Router with the `@/*` alias, in a `src/` directory. Node 24.21.0 / npm 11.19.0 are installed, and `npx tsc --noEmit` and `npm run lint` both pass.
>
> The bootstrap steps below are retained as historical reference. **Do not run `create-next-app` again in this folder** — it would overwrite the existing scaffold and configuration.

Because `create-next-app` may reject a non-empty target directory, temporarily move `AGENTS.md` out of the app folder before initialising the scaffold. Run these commands from the **repository root**:

```bash
cd bank_expense_tracker_nextjs
mv AGENTS.md ../AGENTS.md.temp
npx create-next-app@latest .
```

Choose:

- TypeScript: Yes
- ESLint: Yes
- React Compiler: use the recommended default
- Tailwind CSS: Yes
- `src/` directory: Yes
- App Router: Yes
- Import alias: `@/*`
- For any prompt asking whether to generate a default `AGENTS.md`, choose No because the project has its own instruction file.

After the scaffold and dependency installation finish, restore the instruction file:

```bash
mv ../AGENTS.md.temp AGENTS.md
```

Then verify the scaffold:

```bash
node --version
npm --version
npm run dev
```

Open `http://localhost:3000`, confirm the starter page loads, and stop the server with `Ctrl+C`.

The official Next.js installation guide documents `create-next-app` and its setup options. The current Next.js minimum Node.js version is 20.9. If the CLI reports an unsupported Node version, upgrade Node before proceeding.

Next:

1. Confirm `AGENTS.md` is back inside `bank_expense_tracker_nextjs/`.
2. Open **the `bank_expense_tracker_nextjs/` folder itself** in Cursor (not the repository root and not `My Bank Expense Tracker/`).
3. Open the integrated terminal in that folder.
4. Start OpenCode from that folder using `opencode`.
5. Confirm the agent has read `AGENTS.md` before asking it to work.

Do not install every possible library at the beginning. Add dependencies only when the relevant implementation phase needs them. Keep the initial scaffold small.

### Initial environment files

Create `.env.example` with variable names and safe placeholders only. Never commit real secrets.

Expected variables will be finalised after the inspection, but may include:

```env
MONGODB_URI=
JWT_SECRET=
APP_URL=http://localhost:3000
```

Do not invent a MongoDB database name or collection naming strategy. Inspect the current application and database configuration first. Keep `.env.local` out of Git.

## 4. Required working method: inspect → plan → approve → implement

This sequence is mandatory. Do not skip ahead because the user has asked for a rebuild.

### Phase 0 — Setup verification

Check only the new Next.js scaffold, package scripts, TypeScript configuration, lint configuration, and Git status.

- Confirm the current working directory is `bank_expense_tracker_nextjs/`.
- Confirm the legacy directories are outside the working directory and have not changed.
- Confirm the app starts.
- Do not start migrating business logic yet.

### Phase 1 — Read-only legacy inspection

**No code edits during this phase.**

Inspect the legacy implementation thoroughly enough to explain how the current product actually works. The legacy code may be in `../My Bank Expense Tracker/` and in root-level legacy files such as `../index.html`, `../expense.css`, and `../expense.js`. Read relevant files rather than guessing from filenames. The repository root is the parent of the current `bank_expense_tracker_nextjs/` working directory.

Inspect at least:

- The actual contents of `../My Bank Expense Tracker/`, including its `backend/` and `frontend/` folders.
- Root-level legacy files `../index.html`, `../expense.css`, and `../expense.js`, and determine whether they are part of the same application or a separate/older version.
- Express server setup, routes, controllers, middleware, and configuration.
- Mongoose User, Account, and Transaction models and their indexes/defaults.
- Authentication and user/account ownership assumptions.
- SBI statement upload and parsing code.
- Supported statement file types and actual SBI column/header variations.
- Date, amount, debit/credit, narration, reference number, and balance extraction.
- Transaction normalisation and fingerprint generation.
- Duplicate detection rules and their limitations.
- Import preview, validation, confirmation, and failure handling.
- Transaction create/edit/delete logic.
- How account balances are calculated or adjusted.
- Dashboard totals, analytics, filters, search, pagination, and exports.
- Existing calculator behaviour, but treat the proposed multi-window calculator as a later enhancement.
- Frontend pages, components, state/context, API calls, loading/error/empty states, and styling.
- Existing tests, sample statements, fixtures, and documentation, if present.

For every important behaviour, identify its source file and explain it in plain language.

#### Inspection report required

Create `docs/legacy-audit.md` inside `bank_expense_tracker_nextjs/` containing:

1. Existing folder and architecture overview.
2. Feature inventory: working, partially working, broken, unclear, and unused.
3. SBI statement formats and parsing pipeline.
4. Existing database schema and field meanings.
5. Transaction identity and duplicate-detection rules.
6. Balance calculation/update rules, including create/edit/delete/import effects.
7. Authentication and data ownership model.
8. Frontend route and component inventory.
9. Known bugs, security risks, data-integrity risks, and technical debt.
10. A list of files that contain logic worth migrating, with reasons.
11. A list of logic that should be rewritten rather than copied, with reasons.
12. Questions that cannot be answered from the code alone.

Do not silently "fix" issues during inspection. Record them.

#### Important issues to explicitly verify

The old implementation may contain personal-app shortcuts such as a fixed/default user, automatic personal user/account creation, fallback IDs, or queries that do not scope records by owner. Treat these as audit findings, not patterns to reproduce.

Verify that every transaction/account query is correctly scoped to the authenticated owner. Never assume old records are safe merely because the app is currently used by one person.

Do not assume the current balance-adjustment logic is correct. Trace all relevant operations and describe the exact effects before proposing a replacement.

### Phase 2 — Design and migration plan

After the audit, stop and present a concise but complete plan to the user. Do not implement until the user approves it.

Create `docs/rebuild-plan.md` with:

- Target architecture and folder structure.
- Route/page map.
- UI layout and navigation proposal.
- Data model mapping from old schema to new schema.
- SBI import pipeline design.
- Transaction lifecycle and balance-consistency strategy.
- Authentication/session approach.
- API endpoint list and ownership/security rules.
- Validation and error-handling approach.
- Testing plan.
- Migration phases with dependencies and acceptance criteria.
- Risks, unresolved questions, and decisions requiring user input.
- Explicit list of what is deferred to later releases.

For each legacy feature, label it:

- **Migrate as-is** — only if its behaviour is verified and correct.
- **Rewrite** — preserve the product behaviour but improve implementation.
- **Fix before migration** — existing behaviour is incorrect or unsafe.
- **Defer** — not required for the SBI-first rebuild.
- **Remove** — only with a clear reason and user approval.

The plan must be specific. Avoid vague statements such as "improve the backend" or "make UI better." Name the page, operation, data fields, validation, and expected result.

### Approval gate

At the end of Phase 2, stop. Summarise the plan and ask the user to approve or amend it. Do not start implementation, database writes, or legacy edits until approval is given.

## 5. Product scope: first release is SBI-focused

The first release should reproduce and improve the verified core workflow:

1. Open the dashboard and see a reliable account/transaction summary.
2. Import an SBI statement.
3. Parse and normalise the statement.
4. Preview transactions before saving.
5. Identify likely duplicates and explain why they were flagged.
6. Confirm the import.
7. Browse, search, filter, and inspect transactions.
8. Add, edit, and delete transactions where supported by the approved design.
9. Keep account balance and transaction totals consistent.
10. Review import history and understand what was imported or skipped.

Do not add support for other banks during the initial release. Keep the parser boundary clean enough that other banks could be added later, but do not build generic multi-bank abstractions prematurely.

### SBI-specific parsing requirements

The audit must determine the real SBI formats supported by the existing app. Do not assume all SBI PDFs, CSVs, or Excel exports have identical headers or layouts.

Preserve and test:

- Transaction date and, if present, value date.
- Narration/description without accidental truncation.
- Debit and credit direction.
- Amount precision and currency.
- Available/running balance when present.
- Reference/UTR/cheque number when present.
- Transaction type where it can be reliably inferred.
- Original source row or sufficient provenance for debugging.
- Statement period and account metadata when available.

Parsing must be deterministic. AI must not be used to calculate balances, decide whether a transaction exists, or silently modify imported financial values.

For unsupported, malformed, password-protected, or ambiguous files, show a clear error or request the required input. Never silently import partial or incorrectly interpreted data.

## 6. Target architecture and folder structure

Use the App Router and `src/` directory. Follow the general organisation used in the user's Anviksha project: route groups, feature-oriented components, helpers, `lib`, models, types, and validations. Keep this project simpler than a large SaaS codebase.

Use this as the initial target shape, adjusting only when the audit and approved plan justify it:

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
│   │   ├── (app)/
│   │   │   ├── dashboard/
│   │   │   ├── transactions/
│   │   │   ├── imports/
│   │   │   ├── analytics/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── (auth)/
│   │   │   ├── transactions/
│   │   │   ├── accounts/
│   │   │   └── imports/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── common/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── imports/
│   │   ├── analytics/
│   │   └── ui/
│   ├── helpers/
│   │   ├── statement-parser/
│   │   ├── transaction-fingerprint/
│   │   └── transaction-duplicate/
│   ├── lib/
│   │   ├── dbConnect.ts
│   │   ├── auth/
│   │   ├── utils/
│   │   └── ai/                 # future provider-independent AI boundary only
│   ├── models/
│   ├── types/
│   └── validations/
├── tests/
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

Do not create empty folders just to match this diagram. Create a folder when there is real code for it. Do not introduce Zustand, Redux, repositories, factories, dependency-injection containers, or generic service layers without a demonstrated need.

### Code organisation

- Keep route handlers thin: authenticate, validate, call domain logic, return a response.
- Put reusable SBI parsing and transaction-domain logic in `helpers/` or a clearly named domain module.
- Put database connection, authentication primitives, and shared server utilities in `lib/`.
- Keep Mongoose models in `models/`.
- Keep Zod schemas in `validations/`.
- Keep React components focused and feature-oriented.
- Prefer clear names and small functions over clever abstractions.
- Avoid duplicating business rules between frontend and backend. Server-side rules are authoritative.

## 7. Frontend quality bar

The frontend is a major part of this rebuild, not a final coat of paint.

Use Anviksha as a reference for clear navigation, page organisation, and understandable information hierarchy. Improve the visual execution: spacing, typography, component consistency, responsive behaviour, and interaction feedback.

### Design law — "Statement" (approved, do not drift)

**Read `docs/design-system.md` before writing any UI.** It is binding. The short version:

- Base is **`#000000`** (OLED), ink is **`#ffffff`**, panels lift to `#060606` / `#0d0d0d` / `#161616`.
- **There is no brand accent.** Interaction is white — focus ring, selection, active nav rule. Colour means exactly three things: `--credit` money in, `--debit` money out, `--warning` a decision waiting.
- **Fonts are IBM Plex Sans + IBM Plex Mono**, loaded with `subsets: ["latin", "latin-ext"]` because the rupee sign (U+20B9) exists only in `latin-ext`. Never introduce another typeface, and never a serif.
- **Mono sets what aligns** (table figures, dates, references, labels via `.figure` / `.label`). **Sans 600 at −0.03em sets what stands alone** (the balance via `.amount`).
- **Radii 2px. One border weight. No shadows. Panels have no border, no radius** — separation comes from value and structural hairlines, never from a box around a block.
- **Exactly one filled control exists:** the primary button (white fill, black label). Everything else is an outline or a ghost.
- **Banned:** gradients, glass/blur/glow, cyan or violet accents, neon-on-dark, 12–16px rounded cards, a grey border plus shadow on each card, emoji as icons, Inter/Geist/Space Grotesk/Instrument, and a serif used to signal "premium".
- Contrast is checked, not assumed: body ≥ 7:1, labels ≥ 4.5:1, control edges ≥ 3:1 (`--line-control`).
- The specimen at `/design` proves the system; read a component there before inventing a new one.

If a task seems to require breaking one of these rules, stop and ask. A new colour, font, radius or shadow is a product decision, not an implementation detail.

### Design direction

- Premium, restrained financial dashboard.
- **True-black "Statement" theme is approved and implemented** — see the design law above and `docs/design-system.md`. Do not substitute a different direction.
- Clear typography and strong hierarchy.
- Consistent spacing, sizing, borders, radii, and icon usage.
- No unnecessary gradients, glowing effects, glassmorphism, or decorative AI-style visuals.
- Avoid overcrowded dashboards and excessive cards.
- Use tables where financial records need comparison and scanning.
- Use clear labels for credits, debits, balances, pending review, duplicates, and import status.
- Use Indian currency formatting (INR) consistently.
- Use accessible contrast, keyboard interaction, focus states, and semantic controls.

### Required UX states

Every data-driven page must account for:

- Initial/loading state.
- Empty state with a useful next action.
- Successful state.
- Validation errors.
- API/server errors.
- Disabled or pending actions.
- Responsive layout for smaller screens.

Do not use fake financial data in production screens. If sample data is needed during design, clearly mark it as mock data and remove it before connecting real records.

### Initial page responsibilities

The approved plan should define exact contents, but the likely responsibilities are:

- **Dashboard:** current account snapshot, balance context, recent activity, and useful summary metrics.
- **Transactions:** searchable/filterable transaction table with clear debit/credit distinction and transaction details.
- **Imports:** SBI statement upload, file validation, parsing preview, duplicate review, confirmation, and import history.
- **Analytics:** reliable summaries based on persisted transactions, with date-range controls and clear definitions.
- **Settings:** account and application settings required by the first release.

Do not design all pages independently. Establish shared layout, navigation, page headers, table patterns, form patterns, status indicators, and feedback components.

## 8. Database, authentication, and security

The existing MongoDB database is the source of truth during the rebuild. First inspect the old models, collection names, indexes, and connection settings. Do not rename collections or alter stored records as part of ordinary feature development.

### Data integrity

- Preserve existing MongoDB document `_id` values if a data migration is later approved.
- Do not duplicate imported transactions.
- Define and test transaction identity/fingerprint rules using actual SBI statement examples.
- Use database indexes where they support proven query patterns and uniqueness constraints.
- Make import confirmation idempotent where practical: retrying the same import must not create duplicate records.
- Use transactions/session-based writes when the deployment's MongoDB topology supports them; otherwise design explicit, recoverable write sequences.
- Do not rely on client-side totals as authoritative balances.
- Document whether balance is derived from transactions or stored and reconciled. Do not mix approaches casually.
- Never use JavaScript floating-point arithmetic carelessly for financial values. Choose a consistent precision-safe representation after auditing the current data and calculations.
- Keep timestamps and statement dates distinct. Handle date-only values and timezone conversion deliberately.

### Authentication and ownership

Inspect the current auth implementation, but do not reproduce unsafe shortcuts.

- Never trust a user ID supplied by the browser as proof of ownership.
- Derive the authenticated user from a verified server-side session/token.
- Every transaction and account read/update/delete must be scoped to the authenticated owner.
- Validate all route parameters and request bodies.
- Keep secrets server-side and out of client bundles.
- Use secure, HTTP-only cookies for browser sessions if JWT-based authentication is retained.
- Apply appropriate password hashing if password authentication is used.
- Protect state-changing endpoints against CSRF where applicable.
- Rate-limit login and sensitive operations.
- Do not add public registration unless the user explicitly approves it. This is a personal finance application.
- Do not log passwords, tokens, full account numbers, complete statements, or other sensitive financial data.

The final authentication design must be proposed in `docs/rebuild-plan.md` before implementation.

## 9. SBI import pipeline

Keep the import flow explicit and reviewable:

```text
File selection
    ↓
File type / size / password checks
    ↓
SBI format detection
    ↓
Parsing
    ↓
Normalisation and validation
    ↓
Fingerprint + duplicate analysis
    ↓
Preview with warnings and totals
    ↓
User confirmation
    ↓
Persist import + transactions safely
    ↓
Reconcile account summary
    ↓
Import result and history
```

Rules:

- Do not persist parsed transactions before the user confirms the preview, unless the approved design explicitly uses a temporary import record.
- Clearly separate new, duplicate, invalid, and ambiguous rows.
- Explain duplicate reasons where possible (for example, matching reference number or matching fingerprint fields).
- Do not automatically discard a transaction solely because its narration resembles another transaction.
- Preserve enough import provenance to investigate parser errors.
- A failed import must not leave partially updated balances or orphaned transaction records.
- Keep parsing logic independent of React components and API route files.
- Test with representative SBI fixtures and edge cases discovered during the audit.

## 10. Future enhancements — backlog only, not initial implementation

These are product ideas to record, not permission to implement now.

### Multi-window personal calculator

The user wants to calculate multiple transaction scenarios simultaneously. The eventual design may support:

- Multiple independent calculator windows/panels open at once.
- Each calculator retaining its own inputs and result while switching between them.
- Different transaction types or calculation scenarios in parallel.
- Naming or labelling each calculation.
- Resetting or closing one calculation without affecting others.
- Reviewing several calculations together.
- Clear separation between temporary calculations and actual saved transactions.

Do not assume the exact calculator formula or transaction types. Ask the user to define the workflow when this feature is prioritised.

### Bulk review actions

The user also wants review-oriented workflows, potentially including:

- Select multiple transactions.
- Mark selected transactions as reviewed.
- Mark all eligible transactions as reviewed.
- Filter reviewed/unreviewed transactions.
- Show review status and review timestamp.
- Avoid marking duplicates or invalid rows as reviewed unless the approved rules permit it.

Do not add review fields to the production schema until the feature is designed and approved. During the audit, record whether the old app already has any related concept.

### Other future possibilities

- Additional banks and statement formats.
- AI-assisted transaction categorisation or narration explanation.
- AI-assisted import anomaly explanations.
- More advanced analytics and reports.
- Export improvements.

Keep a `docs/future-backlog.md` if useful. Do not allow future ideas to delay the SBI-first release.

## 11. AI-integration readiness — architecture only for now

The user plans to add AI later. Keep the codebase ready for it without adding AI dependencies, API keys, model calls, or AI UI in the initial rebuild.

When AI work is eventually approved:

- Keep AI calls on the server.
- Use a provider-independent interface so providers can be switched without rewriting product logic.
- Keep provider-specific SDKs and request formats inside provider adapters.
- Validate model output with Zod before using it.
- Treat model output as untrusted suggestions, never as authoritative financial data.
- Require user confirmation before applying AI-generated categorisation or edits.
- Do not send full bank statements, account numbers, credentials, or unnecessary personal data to a model.
- Minimise/redact data before external requests.
- Handle rate limits, timeouts, malformed output, provider outages, and cost limits.
- Make AI features optional; core import and transaction workflows must work without an AI provider.
- Record the model/provider used only when useful and safe.

Potential future organisation (do not create empty files now):

```text
src/lib/ai/
├── types.ts
├── schemas.ts
├── service.ts
└── providers/
    ├── gemini.ts
    └── groq.ts
```

Gemini and Groq are possible future providers, not fixed choices. Re-evaluate current official SDKs, model availability, pricing, privacy terms, and structured-output support when AI implementation begins.

## 12. Testing and verification

Tests must protect financial correctness, not just whether a page renders.

At minimum, build tests for:

- SBI format detection.
- Date and amount parsing.
- Debit/credit classification.
- Narration and reference extraction.
- Running-balance handling where present.
- Invalid and ambiguous rows.
- Transaction fingerprint stability.
- Duplicate detection, including false-positive cases.
- Import retry/idempotency.
- Create/edit/delete balance effects.
- Ownership isolation between users.
- API validation and authentication.
- Dashboard/analytics calculations against known fixtures.

For each migrated feature, compare old and new behaviour using representative inputs. If old behaviour is wrong, document the difference and test the corrected rule.

Before declaring a phase complete, run the relevant checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Run the project's test command when tests have been configured. Do not claim checks passed unless they were actually run and passed. Fix errors introduced by the current change before moving on.

## 13. Implementation phases after approval

Work in small phases. Finish and verify one phase before starting the next.

Suggested order (adjust only in the approved plan):

1. **Foundation:** project configuration, shared styles, fonts, layout shell, navigation, reusable UI primitives.
2. **Database and domain foundation:** connection, audited models, types, validation schemas, ownership-safe data access.
3. **Authentication:** approved login/session flow and protected app routes.
4. **SBI parser migration:** port or rewrite parser logic with fixtures and tests; no production import writes yet.
5. **Import preview:** upload, detect, parse, validate, show rows and totals, display duplicate warnings.
6. **Import confirmation:** safe persistence, idempotency, error recovery, account reconciliation.
7. **Transactions:** list, details, search, filters, pagination, and approved CRUD operations.
8. **Dashboard and analytics:** build from verified persisted data and tested calculations.
9. **Hardening:** security review, edge cases, responsive UI, accessibility, performance, and full regression testing.

At the start of each phase:

- State the scope and files expected to change.
- Identify dependencies and risks.
- Do not quietly add unrelated features.

At the end of each phase:

- Summarise what changed.
- List files created/modified.
- Report tests and commands actually run.
- State known limitations.
- Wait for approval before moving to the next phase when the user is reviewing the work.

## 14. Git and change safety

- Check `git status` before work.
- **Never run `git commit`, `git push`, `git tag`, `git reset`, `git rebase`, `git merge`, `git checkout -- <path>`, `git stash drop`, `git clean`, or any other history- or worktree-altering command without explicit permission for that specific action.** Only the user decides what is committed, pushed, or published. When work is ready, propose the commit and wait.
- **Never delete, move, rename, truncate, or overwrite any file, directory, branch, MongoDB document, collection, or index without explicit permission for that specific action.** State exactly what would be removed and why, then wait.
- Never discard the user's uncommitted changes.
- Keep changes scoped to `bank_expense_tracker_nextjs/`.
- Do not commit secrets, real bank statements, account numbers, or personal financial data.
- Do not add real statement files to fixtures. Use sanitised/redacted fixtures.
- Do not create a database migration script until the migration plan is approved.
- Keep diffs focused and reviewable.

## 15. Definition of done

A feature is not complete merely because the page looks finished.

A feature is complete only when:

- Its behaviour matches the approved requirement.
- Financial values and transaction direction are correct.
- Ownership and validation are enforced on the server.
- Loading, empty, success, and error states are handled.
- Relevant tests pass.
- Lint, TypeScript, and production build checks pass where applicable.
- No legacy files or unrelated project areas were changed.
- The user receives a concise explanation of what was implemented and what remains.

---

# OpenCode: first-session instructions

Use OpenCode from inside `Bank_Expense_Tracker/bank_expense_tracker_nextjs/`. Keep the first session in **Plan mode**.

## First prompt — audit only

Paste this as the first task:

> Read `AGENTS.md` completely. We are rebuilding the existing Bank Expense Tracker as an SBI-specialised Next.js + TypeScript application in this `bank_expense_tracker_nextjs/` directory.
>
> This is Phase 1: READ-ONLY LEGACY INSPECTION. Do not edit, create, delete, move, or format any source files. Do not install dependencies. Do not write to MongoDB. Do not change the legacy app.
>
> Inspect the legacy `../My Bank Expense Tracker/` directory and the root-level legacy files `../index.html`, `../expense.css`, and `../expense.js`. Trace the actual SBI statement import flow, supported file formats, parsing, normalisation, duplicate detection, transaction CRUD, balance updates, database models, authentication, dashboard calculations, and current frontend behaviour. Read the relevant source files, not just filenames.
>
> Produce `docs/legacy-audit.md` inside `bank_expense_tracker_nextjs/` only after completing the inspection. If creating this report would violate the read-only restriction, present the report in your response first and wait for permission to write it.
>
> Clearly separate verified facts from assumptions. Cite exact legacy file paths and function names. Identify security and data-integrity issues, especially user/account scoping and balance reconciliation. Do not propose a migration until you understand the current behaviour.
>
> At the end, summarise the audit and list unanswered questions. STOP. Do not implement anything.

## Second prompt — plan only, after reviewing the audit

> Using the approved legacy audit, prepare the detailed rebuild plan described in `AGENTS.md`. The new product is SBI-first. Follow the clarity and organisation of Anviksha, but design a more polished and consistent frontend. Specify exact pages, components, API routes, data flow, model mapping, SBI import pipeline, balance strategy, tests, and phase acceptance criteria. Put future multi-window calculator, bulk review actions, and AI features in a deferred backlog; do not implement them now. Do not edit application source code or touch MongoDB. Present the plan and STOP for my approval.

## Third prompt — implementation, only after approval

> Implement only Phase 1 of the approved rebuild plan. Before editing, list the exact files you intend to create or modify and the acceptance criteria. Keep all changes inside `bank_expense_tracker_nextjs/`. Do not migrate business logic or connect to production data unless this phase explicitly requires it. After implementation, run the relevant checks, report their actual results, and STOP for review.

---

## Final instruction

When uncertain, inspect and explain before changing code. Correctness, traceability, and a clear user experience matter more than speed or adding features. The old app is a source of behaviour to understand—not a codebase to copy blindly.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
