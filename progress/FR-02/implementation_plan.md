# Implementation Plan — FR-02: Manual Transaction Management

Implementation plan for **FR-02: Manual Transaction Management**, enabling users to create, view, edit, and delete manual transactions (Income, Expense, Transfer) with automatic envelope balance updates and over-budget visual indicators.

## User Review Required

> [!IMPORTANT]
> **Database Schema & Documentation Alignment for MVP:**
> 1. In `apps/api/src/db/schema.ts`, `transactions.accountId` was previously defined as `notNull()`. In MVP Phase 1 (before Plaid bank sync in Phase 2), manual transactions do not belong to a synced bank account. We make `transactions.accountId` nullable and add an optional `destinationEnvelopeId` to support envelope transfers directly. A Drizzle migration (`0003_make_transaction_account_id_nullable.sql`) will be generated.
> 2. `docs/DATABASE.md` and `docs/API.md` will be updated to reflect these endpoints (`GET /transactions/:id`, `PUT /transactions/:id`, `DELETE /transactions/:id`) and field names (`receiptImageUrl`).

> [!NOTE]
> **Over-budget Behavior:**
> Per `docs/REQUIREMENTS.md` FR-02, an expense that exceeds an envelope's remaining balance is saved successfully. The envelope balance becomes negative and the UI shows an over-budget status indicator (using red accent tokens `--color-accent-danger: #EF4444`).

## Open Questions

None blocking. All requirements and contracts are aligned with `docs/ARCHITECTURE.md`, `docs/REQUIREMENTS.md`, `docs/DATABASE.md`, `docs/API.md`, `docs/USER_FLOW.md`, and `docs/DESIGN.md`.

---

## Proposed Changes

### 0. Documentation Alignment (`docs/`)

#### [MODIFY] [docs/API.md](file:///d:/PERSONAL/App%20Development/Pocketflow/docs/API.md)
- Add documentation for `GET /transactions/:id`, `PUT /transactions/:id`, `DELETE /transactions/:id`.
- Standardize payload property `receiptImageUrl`.

#### [MODIFY] [docs/DATABASE.md](file:///d:/PERSONAL/App%20Development/Pocketflow/docs/DATABASE.md)
- Document nullability of `accountId` for manual transactions in MVP Phase 1 and `destinationEnvelopeId`.

---

### 1. Shared Package (`packages/shared`)

Define and export transaction Zod schemas, validation rules, and TypeScript DTOs.

#### [MODIFY] [packages/shared/src/index.ts](file:///d:/PERSONAL/App%20Development/Pocketflow/packages/shared/src/index.ts)
- Add `transactionTypeSchema` (`"income" | "expense" | "transfer"`).
- Add `createTransactionSchema` validating:
  - `amount > 0`
  - `date` ISO string (<= 1 year in future)
  - `description` (1 to 255 chars)
  - `envelopeId` (required if `type === 'expense'`)
  - `destinationEnvelopeId` (optional for transfer)
  - `receiptImageUrl` (optional)
- Add `updateTransactionSchema` (partial update schema with validations).
- Add `listTransactionsQuerySchema` (`page`, `limit`, `type`, `envelopeId`, `startDate`, `endDate`).
- Export TypeScript types: `CreateTransactionInput`, `UpdateTransactionInput`, `ListTransactionsQuery`, `TransactionItem`, `PaginatedTransactionsResult`.

---

### 2. Backend Database & Services (`apps/api`)

Update Drizzle schema, generate migration, implement isolated business logic service, and REST endpoints.

#### [MODIFY] [apps/api/src/db/schema.ts](file:///d:/PERSONAL/App%20Development/Pocketflow/apps/api/src/db/schema.ts)
- Make `transactions.accountId` nullable (`text("account_id").references(() => accounts.id)`).
- Add `destinationEnvelopeId` nullable column (`text("destination_envelope_id").references(() => envelopes.id)`).

#### [NEW] [apps/api/migrations/0003_make_transaction_account_id_nullable.sql](file:///d:/PERSONAL/App%20Development/Pocketflow/apps/api/migrations/0003_make_transaction_account_id_nullable.sql)
- Drizzle migration for the schema updates.

#### [NEW] [apps/api/src/services/transaction.service.ts](file:///d:/PERSONAL/App%20Development/Pocketflow/apps/api/src/services/transaction.service.ts)
- `list(userId, query)`: filters, pagination, order by `date DESC, createdAt DESC`.
- `getById(userId, id)`: single transaction query scoped to user.
- `create(userId, input)`:
  - Expense: `envelope.currentAmount -= amount` (allows negative for overspending).
  - Income: `envelope.currentAmount += amount` (if envelopeId provided).
  - Transfer: `sourceEnvelope.currentAmount -= amount` and `destEnvelope.currentAmount += amount`.
  - Inserts transaction record with `isManual = true`.
- `update(userId, id, input)`: atomically reverts old transaction balance impact and applies new balance impact.
- `delete(userId, id)`: atomically reverts balance impact and deletes the transaction record.

#### [NEW] [apps/api/src/routes/transactions.ts](file:///d:/PERSONAL/App%20Development/Pocketflow/apps/api/src/routes/transactions.ts)
- `GET /api/transactions`
- `POST /api/transactions`
- `GET /api/transactions/:id`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`

#### [MODIFY] [apps/api/src/index.ts](file:///d:/PERSONAL/App%20Development/Pocketflow/apps/api/src/index.ts)
- Mount `/api/transactions` routes with `requireAuth` middleware.
- Ensure `/api/dashboard` aggregated totals and envelope summaries synchronize with transactions.

---

### 3. Frontend Web App (`apps/web`)

API client methods, interactive modals for Add/Edit/Delete, filterable transactions list, over-budget indicators, and reactive event bus.

#### [MODIFY] [apps/web/src/lib/api-client.ts](file:///d:/PERSONAL/App%20Development/Pocketflow/apps/web/src/lib/api-client.ts)
- Add `getTransactions(token, query)`
- Add `getTransactionById(token, id)`
- Add `createTransaction(token, input)`
- Add `updateTransaction(token, id, input)`
- Add `deleteTransaction(token, id)`

#### [MODIFY] [apps/web/src/components/AddTransactionModal.astro](file:///d:/PERSONAL/App%20Development/Pocketflow/apps/web/src/components/AddTransactionModal.astro)
- Add Type selector (`Expense`, `Income`, `Transfer`).
- Add formatted Amount input (Rp prefix), Date picker, Envelope dropdown (populated with user's envelopes), Destination envelope (for transfers), Note input.
- Support both **Create** and **Edit** transaction modes.
- Client-side validation and inline error display.

#### [MODIFY] [apps/web/src/components/TransactionsPanel.astro](file:///d:/PERSONAL/App%20Development/Pocketflow/apps/web/src/components/TransactionsPanel.astro)
- Filter controls: Type filter pills (`All`, `Income`, `Expense`, `Transfer`), Envelope filter dropdown.
- Transaction items: Type icons, envelope badge, formatted amount (`+ Rp` / `- Rp`), date/time.
- Over-budget warning badges on transactions causing negative balances.
- Edit and Delete action triggers.
- Delete confirmation modal dialog.
- Pagination navigation (`Previous`, `Page X of Y`, `Next`).

#### [MODIFY] [apps/web/src/pages/index.astro](file:///d:/PERSONAL/App%20Development/Pocketflow/apps/web/src/pages/index.astro)
- Event listener handlers (`pocketflow:dashboard-ready`, `pocketflow:refresh-data`).
- Over-budget visual styling on envelope cards (progress bar turns red `#EF4444` when `currentAmount < 0` or over 100%).

---

## Verification Plan

### Automated Tests
```powershell
# Typecheck workspace and all packages
corepack pnpm typecheck

# Check Astro and web package build
corepack pnpm --filter @pocketflow/web check
corepack pnpm --filter @pocketflow/web build
```

### Manual & API Verification
1. **Income Transaction**:
   - Create income transaction of `Rp 1.000.000` allocated to an envelope.
   - Verify envelope `currentAmount` and "Monthly Income" update correctly.
2. **Expense Transaction & Overspending**:
   - Record expense of `Rp 50.000` from `Groceries`. Verify envelope decreases.
   - Record expense of `Rp 200.000` from envelope with `Rp 100.000` balance. Verify overspending is allowed, balance is `-Rp 100.000`, and red indicator appears.
3. **Transfer Transaction**:
   - Transfer `Rp 50.000` from `Groceries` to `Transport`. Verify source decreases and destination increases.
4. **Edit & Delete**:
   - Edit an expense from `Rp 50.000` to `Rp 80.000` and verify balance delta is `-Rp 30.000`.
   - Delete the expense and verify balance is restored by `+Rp 80.000`.
5. **Filters & Pagination**:
   - Apply filters by Type (`Expense`) and Envelope. Verify results and page controls.
