# Todo FR-02: Manual Transaction Management

## Phase 0: Documentation Alignment
- [x] 0.1 Update `docs/API.md` with `GET /transactions/:id`, `PUT /transactions/:id`, `DELETE /transactions/:id` and payload fields (`receiptImageUrl`)
- [x] 0.2 Update `docs/DATABASE.md` with note on `accountId` nullability in MVP (Fase 1) and `destinationEnvelopeId`

## Phase 1: Shared Data Contracts & Validation
- [x] 1.1 Add `transactionTypeSchema` (`"income" | "expense" | "transfer"`) in `packages/shared/src/index.ts`
- [x] 1.2 Add `createTransactionSchema` with validations (`amount > 0`, `date <= 1 year`, required envelope for expense, `receiptImageUrl`)
- [x] 1.3 Add `updateTransactionSchema` with partial validations
- [x] 1.4 Add `listTransactionsQuerySchema` with pagination and filter parameters
- [x] 1.5 Export TypeScript DTO types (`CreateTransactionInput`, `UpdateTransactionInput`, `ListTransactionsQuery`, `TransactionItem`)
- [x] 1.6 Run `corepack pnpm --filter @pocketflow/shared build` / typecheck

## Phase 2: Database Schema & Migration
- [x] 2.1 Update `transactions` in `apps/api/src/db/schema.ts` to make `accountId` nullable
- [x] 2.2 Add `destinationEnvelopeId` (optional nullable reference) in `apps/api/src/db/schema.ts`
- [x] 2.3 Generate migration `0003_make_transaction_account_id_nullable.sql` using `drizzle-kit`
- [x] 2.4 Apply migration to local D1 SQLite database

## Phase 3: Backend Business Logic & REST Endpoints
- [x] 3.1 Implement `apps/api/src/services/transaction.service.ts`:
  - [x] 3.1.1 `listTransactions`: filtering, sorting, envelope join, and pagination calculation
  - [x] 3.1.2 `getTransactionById`: fetch single item scoped to `userId`
  - [x] 3.1.3 `createTransaction`: income / expense (with overspending support) / transfer balance mutations
  - [x] 3.1.4 `updateTransaction`: delta reversion and re-application of balances
  - [x] 3.1.5 `deleteTransaction`: balance reversion and record removal
- [x] 3.2 Implement `apps/api/src/routes/transactions.ts` with Hono router:
  - [x] 3.2.1 `GET /api/transactions`
  - [x] 3.2.2 `POST /api/transactions`
  - [x] 3.2.3 `GET /api/transactions/:id`
  - [x] 3.2.4 `PUT /api/transactions/:id`
  - [x] 3.2.5 `DELETE /api/transactions/:id`
- [x] 3.3 Mount `/api/transactions` in `apps/api/src/index.ts`
- [x] 3.4 Ensure `/api/dashboard` reflects accurate aggregated income, spent, and envelope balances
- [x] 3.5 Typecheck API with `corepack pnpm --filter @pocketflow/api typecheck`

## Phase 4: Frontend API Client & Components
- [x] 4.1 Update `apps/web/src/lib/api-client.ts` with transaction CRUD functions
- [x] 4.2 Upgrade `apps/web/src/components/AddTransactionModal.astro`:
- [ ] 4.2.1 Type segmented control (`Expense` / `Income` / `Transfer`)
- [ ] 4.2.2 Formatted currency input for amount
- [x] 4.2.3 Date picker input with max 1-year constraint
- [x] 4.2.4 Dynamic envelope selector dropdown populated from user's envelopes
- [x] 4.2.5 Destination envelope selector for transfers
- [x] 4.2.6 Description / Note input field
- [x] 4.2.7 Client-side validation & inline error messaging
- [x] 4.2.8 Dual mode: Create Transaction vs Edit Transaction
- [x] 4.3 Upgrade `apps/web/src/components/TransactionsPanel.astro`:
- [x] 4.3.1 Filter controls (Type & Envelope filters)
- [ ] 4.3.2 Transaction row presentation (type icon, envelope badge, formatted amount, date)
- [x] 4.3.3 Edit and Delete action triggers
- [x] 4.3.4 Delete confirmation dialog
- [x] 4.3.5 Pagination controls (Previous / Next / Page counter)
- [x] 4.3.6 Empty state when no transactions match
- [x] 4.4 Update `apps/web/src/pages/index.astro` & Dashboard integration:
- [x] 4.4.1 Reactive event listeners (`pocketflow:dashboard-ready`, `pocketflow:refresh-data`)
- [x] 4.4.2 Visual over-budget styling for envelope progress bars (`bg-accent-danger`) and negative balances
- [x] 4.5 Verify web build with `corepack pnpm --filter @pocketflow/web check` and `corepack pnpm --filter @pocketflow/web build`

## Phase 5: Verification & End-to-End Testing
- [x] 5.1 Test creating an Expense transaction and verify envelope balance deduction (Playwright)
- [x] 5.2 Test overspending expense transaction and verify negative balance & red badge display (Playwright)
- [x] 5.3 Test creating an Income transaction and verify balance addition (Playwright)
- [x] 5.4 Test envelope transfer transaction and verify source deduction & target addition (Playwright)
- [x] 5.5 Test editing an existing transaction and verify balance recalculation (Playwright)
- [x] 5.6 Test deleting a transaction and verify balance restoration (Playwright)
- [x] 5.7 Test filtering by type and envelope, and verify pagination navigation (Playwright)
- [x] 5.8 Full workspace typecheck with `corepack pnpm typecheck`
