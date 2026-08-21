# Plan FR-02: Manual Transaction Management

## 1. Executive Summary & Objective

FR-02 enables users to manually record, view, edit, and delete financial transactions (Income, Expense, Transfer).
This feature forms the financial tracking core of PocketFlow in Phase 1 (MVP) before automated Plaid sync in Phase 2.

### Core Goals:
- Allow recording **Income**, **Expense**, and **Transfer** transactions with amount, date, envelope allocation, and optional notes.
- Support **editing** and **deleting** transactions with automatic envelope balance adjustments and general pool recalculation.
- Enforce validation: `amount > 0`, `date <= 1 year in future`.
- Handle **overspending** gracefully: expense transactions that cause an envelope balance to go negative are saved successfully, while the UI displays clear over-budget indicators (`#EF4444`).
- Provide responsive and instant visual feedback on the Dashboard and Envelope Progress without full page reloads.

---

## 2. Technical Scope & Architecture

Per `docs/ARCHITECTURE.md` and `docs/REQUIREMENTS.md`:

```
┌────────────────────────────────────────────────────────┐
│               packages/shared                           │
│  - Zod schemas: createTransactionSchema,                │
│    updateTransactionSchema, listTransactionsQuerySchema │
│  - Shared TypeScript interfaces & DTOs                 │
└───────────────────▲────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────┴───────────────┐ ┌─────┴────────────────────────┐
│ apps/web (Astro)      │ │ apps/api (Hono / D1 Worker)  │
│ - TransactionModal    │ │ - routes/transactions.ts     │
│ - TransactionsPanel   │ │ - services/                  │
│ - api-client.ts       │ │   transaction.service.ts     │
│ - Reactive Event Bus  │ │ - db/schema.ts & migrations  │
└───────────────────────┘ └──────────────────────────────┘
```

---

## 3. Detailed Work Breakdown

### 3.1 Documentation Alignment (`docs/`)
- Update `docs/API.md`:
  - Document `GET /transactions/:id`, `PUT /transactions/:id`, `DELETE /transactions/:id`.
  - Clarify `envelopeId` optionality for `income` and `transfer`.
  - Standardize request/response field `receiptImageUrl`.
- Update `docs/DATABASE.md`:
  - Clarify that in MVP Phase 1, `transactions.accountId` is nullable until Plaid accounts are introduced in Phase 2.
  - Document `destinationEnvelopeId` for envelope-to-envelope transfer transactions.

### 3.2 Data Contracts & Validation (`packages/shared`)
- File: `packages/shared/src/index.ts`
- **Schemas**:
  - `transactionTypeSchema`: `"income" | "expense" | "transfer"`
  - `createTransactionSchema`:
    - `type`: `transactionTypeSchema`
    - `amount`: `z.number().positive("Amount must be greater than 0")`
    - `description`: `z.string().trim().min(1, "Description is required").max(255)`
    - `date`: ISO 8601 string, must not exceed 1 year in the future
    - `envelopeId`: `z.string().optional().nullable()` (Required if `type === 'expense'`)
    - `destinationEnvelopeId`: `z.string().optional().nullable()` (For envelope-to-envelope transfers)
    - `receiptImageUrl`: `z.string().url().optional().nullable()`
    - `sourceAccountId` / `destinationAccountId`: optional UUIDs
  - `updateTransactionSchema`: partial update schema with valid positive amount and date checks
  - `listTransactionsQuerySchema`:
    - `page`: `z.coerce.number().int().min(1).default(1)`
    - `limit`: `z.coerce.number().int().min(1).max(50).default(10)`
    - `type`: optional filter
    - `envelopeId`: optional filter
    - `startDate`: optional ISO date string
    - `endDate`: optional ISO date string
  - Standard response types: `TransactionItem`, `PaginatedTransactionsResult`.

### 3.3 Database Layer & Migrations (`apps/api`)
- File: `apps/api/src/db/schema.ts`
- Changes:
  - Make `transactions.accountId` nullable (`text("account_id").references(() => accounts.id)`) to support manual transactions without Plaid in MVP.
  - Add optional `destinationEnvelopeId` reference on `transactions` table (`text("destination_envelope_id").references(() => envelopes.id)`).
  - Generate and apply Drizzle migration: `0003_make_transaction_account_id_nullable.sql`.

### 3.4 Backend Service Layer (`apps/api/src/services/`)
- File: `apps/api/src/services/transaction.service.ts`
- **Business Logic Rules**:
  1. **Create Transaction**:
     - *Expense*: Deduct from envelope balance (`envelope.currentAmount -= amount`). If `currentAmount < 0`, allow overspending and update envelope record.
     - *Income*: If `envelopeId` specified, add to envelope (`envelope.currentAmount += amount`). If null, contributes to general Available to Spend pool.
     - *Transfer*: If between envelopes (`envelopeId` -> `destinationEnvelopeId`), deduct from source envelope and credit target envelope.
     - Insert transaction row with `isManual = true`.
  2. **List Transactions**:
     - Filter by `userId`, optional `type`, `envelopeId`, `startDate`, `endDate`.
     - Order by `date DESC, createdAt DESC`.
     - Return items with envelope details (`envelopeName`, `envelopeColorHex`) + pagination metadata (`totalItems`, `totalPages`, `currentPage`, `itemsPerPage`).
  3. **Get Transaction by ID**:
     - Query single transaction scoped strictly to `userId`.
  4. **Update Transaction**:
     - Retrieve existing transaction.
     - Revert previous balance impact on old envelope(s).
     - Apply new balance impact on new envelope(s).
     - Update transaction record in D1.
  5. **Delete Transaction**:
     - Retrieve existing transaction.
     - Revert balance impact on envelope(s).
     - Delete record from `transactions` table.

### 3.5 API Route Handlers (`apps/api/src/routes/`)
- File: `apps/api/src/routes/transactions.ts`
  - `GET /api/transactions` -> 200 OK with paginated list.
  - `POST /api/transactions` -> 201 Created with created transaction object.
  - `GET /api/transactions/:id` -> 200 OK / 404 Not Found.
  - `PUT /api/transactions/:id` -> 200 OK / 404 Not Found / 400 Bad Request.
  - `DELETE /api/transactions/:id` -> 200 OK / 404 Not Found.
- File: `apps/api/src/index.ts`
  - Mount transaction routes under `/api/transactions`.
  - Maintain synchronization with `/api/dashboard` calculations.

### 3.6 Frontend Client & API Integration (`apps/web`)
- File: `apps/web/src/lib/api-client.ts`
  - Export `getTransactions(token, query)`
  - Export `getTransactionById(token, id)`
  - Export `createTransaction(token, input)`
  - Export `updateTransaction(token, id, input)`
  - Export `deleteTransaction(token, id)`

### 3.7 Frontend UI Components (`apps/web/src/components/`)
- **Add / Edit Transaction Modal (`apps/web/src/components/AddTransactionModal.astro`)**:
  - Segmented control for Type: `Expense` (Coral/Red active), `Income` (Emerald green active), `Transfer` (Indigo/Blue active).
  - Amount input with IDR currency prefix (`Rp`) and real-time formatting.
  - Date input (native date picker, default today/now).
  - Dynamic Envelope selector dropdown populated with current user envelopes and remaining balances.
  - Destination Envelope dropdown (visible when `Transfer` is active).
  - Note/Description text input.
  - Receipt image URL input / placeholder for FR-07.
  - Mode support: Create new transaction vs Edit existing transaction (pre-populated with existing data).
  - Inline validation & error alerts.
- **Transactions Panel & List (`apps/web/src/components/TransactionsPanel.astro`)**:
  - Filter bar: Type selector (`All`, `Income`, `Expense`, `Transfer`), Envelope filter dropdown.
  - List items with:
    - Type icon + color badge (Emerald for Income, Coral/Red for Expense, Blue for Transfer).
    - Description, envelope name, date/time.
    - Formatted amount (`+ Rp 500.000` / `- Rp 45.000`).
    - Action buttons: Edit (pencil icon) & Delete (trash icon).
    - Over-budget warning badge if transaction pushed envelope into negative balance.
  - Delete Confirmation Dialog with destructive action styling.
  - Pagination navigation (`Previous`, `Page X of Y`, `Next`).
  - Empty state with CTA when no transactions exist.
- **Dashboard Reactivity & Overspending Indicators (`apps/web/src/pages/index.astro`)**:
  - Event-driven re-fetch and render without page refresh (`pocketflow:dashboard-ready`, `pocketflow:refresh-data`).
  - Over-budget progress bar coloring: switch to `bg-accent-danger` (`#EF4444` / `#D66D57`) when `currentAmount < 0` or over 100%.

---

## 4. Verification Plan

### Automated Checks:
```powershell
corepack pnpm typecheck
corepack pnpm --filter @pocketflow/api typecheck
corepack pnpm --filter @pocketflow/web check
corepack pnpm --filter @pocketflow/web build
```

### Functional & End-to-End Scenarios:
1. **Income Transaction**:
   - Add income of `Rp 1.000.000` assigned to an envelope.
   - Verify envelope `currentAmount` increases by `1.000.000`.
   - Verify dashboard "Monthly Income" and "Available to Spend" update accordingly.
2. **Expense Transaction (Normal)**:
   - Add expense of `Rp 50.000` from `Groceries` envelope.
   - Verify envelope `currentAmount` decreases by `50.000`.
   - Verify transaction appears in recent transactions with `- Rp 50.000` in red.
3. **Expense Transaction (Overspending Edge Case)**:
   - Add expense of `Rp 200.000` from an envelope with balance `Rp 100.000`.
   - Verify transaction is created successfully.
   - Verify envelope balance displays negative (`-Rp 100.000`) and progress bar turns red (`#EF4444`).
4. **Transfer Transaction**:
   - Transfer `Rp 50.000` from `Groceries` to `Transport`.
   - Verify source envelope decreases and destination envelope increases.
5. **Edit Transaction**:
   - Edit an existing expense from `Rp 50.000` to `Rp 70.000`.
   - Verify envelope balance adjusts by `- Rp 20.000`.
6. **Delete Transaction**:
   - Delete an expense of `Rp 70.000`.
   - Verify envelope balance is restored by `+ Rp 70.000`.
   - Verify transaction is removed from the list.
7. **Filtering & Pagination**:
   - Filter by type `Expense`, verify only expenses are shown.
   - Navigate pages and verify pagination controls.
