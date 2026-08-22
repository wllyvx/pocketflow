# FEATURES.md: PocketFlow

This document outlines the core features and functionalities of PocketFlow, a personal finance management application. It details the user-facing capabilities, their associated user stories, acceptance criteria, and potential edge cases.

## 1. User Onboarding & Authentication

Enables new users to register and existing users to log in securely, followed by an initial setup process including bank account linking.

### User Stories
*   As a new user, I want to create an account using my email and password so I can start managing my finances.
*   As a new user, I want to create an account using my Google or Apple ID so I can quickly sign up without remembering another password.
*   As a new user, I want to link my primary bank account during onboarding so PocketFlow can automatically import my transactions.
*   As an existing user, I want to log in securely to access my financial data.

### Acceptance Criteria
*   The system shall allow account creation via email/password.
*   The system shall support social login via Google and Apple (Auth0 integration).
*   Upon successful registration, the user shall be guided to link a bank account via Plaid Link.
*   The system shall securely authenticate existing users and grant access to their data.
*   Users shall be able to reset their password if forgotten.

### Edge Cases
*   User attempts to register with an already existing email.
*   Plaid Link fails to connect to the user's bank.
*   User cancels the bank linking process during onboarding.
*   User provides invalid login credentials multiple times.

## 2. Manual Transaction Management

Allows users to manually record financial transactions that are not automatically imported or to adjust existing ones.

### User Stories
*   As a user, I want to manually add an expense transaction, specifying amount, date, category (envelope), and a note, so I can track cash payments or unlinked accounts.
*   As a user, I want to manually add an income transaction, specifying amount, date, and category (envelope), so I can track my earnings.
*   As a user, I want to manually add a transfer transaction between my accounts or envelopes.
*   As a user, I want to edit details of a manually entered transaction (e.g., category, note, amount).
*   As a user, I want to delete a manually entered transaction.

### Acceptance Criteria
*   The system shall provide a form to add new transactions with fields for amount, date, type (income/expense/transfer), category (envelope), and optional note.
*   Users shall be able to select an existing envelope for categorization.
*   Manually added transactions shall be immediately reflected in the dashboard and envelope balances.
*   Users shall be able to modify all fields of a manually entered transaction.
*   Users shall be able to permanently delete a manually entered transaction.

### Edge Cases
*   User enters a negative amount for an expense or income.
*   User attempts to delete a transaction that has already been reconciled or is part of a closed budget cycle (future consideration).
*   User selects a date in the future for a transaction.

## 3. Automated Bank Transaction Sync

Integrates with bank accounts to automatically import and categorize transactions, reducing manual effort.

### User Stories
*   As a user, I want to link multiple bank accounts via Plaid so all my financial activity is consolidated.
*   As a user, I want new transactions from my linked bank accounts to appear automatically in PocketFlow.
*   As a user, I want to easily assign an uncategorized imported transaction to an appropriate budget envelope.
*   As a user, I want to refresh my bank account data on demand if I suspect a delay in sync.

### Acceptance Criteria
*   The system shall allow users to link additional bank accounts via Plaid Link after onboarding.
*   The system shall automatically fetch new transactions from linked accounts at regular intervals (e.g., daily).
*   New, uncategorized transactions shall be clearly highlighted and prompt the user for categorization.
*   Assigning an imported transaction to an envelope shall update the envelope's balance.
*   Users shall have an option to manually trigger a sync for linked accounts.

### Edge Cases
*   Duplicate transactions are imported from the bank.
*   Plaid connection to a bank account fails or expires.
*   A transaction is imported with an unclear description, making categorization difficult.
*   User has multiple accounts at the same institution, and only some sync correctly.

## 4. Envelope Budgeting System

A core feature enabling users to allocate funds into digital "envelopes" for specific spending categories, promoting mindful spending.

### User Stories
*   As a user, I want to create custom budget envelopes (e.g., "Groceries," "Rent," "Fun") with specific budget amounts.
*   As a user, I want to "fill" my envelopes from my available income at the start of a budget cycle (e.g., monthly).
*   As a user, I want to see the remaining balance in each envelope as I spend.
*   As a user, I want to easily move funds between different envelopes.
*   As a user, I want to edit or delete an existing envelope.

### Acceptance Criteria
*   The system shall allow users to create, name, and assign a budget amount to new envelopes.
*   Users shall be able to define a budget cycle (e.g., monthly, bi-weekly).
*   The system shall provide a mechanism to allocate funds from a general "Available to Spend" pool into envelopes.
*   Transactions assigned to an envelope shall automatically deduct from its budgeted amount.
*   The system shall display the current balance and original budget for each envelope.
*   Users shall be able to transfer funds from one envelope to another.
*   Users shall be able to modify the name or budget of an envelope.
*   Users shall be able to delete an envelope, with options to reallocate remaining funds or associated transactions.
*   Each envelope shall display a "health bar" representing its remaining funds, with color thresholds: green (more than 30% remaining), yellow (1-30% remaining), red (0% = depleted), purple (surplus: allocated more than budget), and red with an "OVER SPENDING" badge (negative balance).
*   The health bar shall show status badges for distinct states: "SURPLUS" (current > budget), "OVER SPENDING" (current < 0), and "Not Funded" (envelope created but not yet allocated funds).
*   Hovering over the health bar shall display a tooltip showing the budgeted amount, current remaining, spent amount, health percentage, and status label.

The health bar can be in one of six distinct states:

1. **Healthy** — green bar; more than 30% of the budget remains.
2. **Low** — amber/yellow bar; 1–30% of the budget remains (warning).
3. **Depleted** — red bar at 0%; budget is fully used but not yet overspent.
4. **Over Spending** — red bar at 0% with an "OVER SPENDING" badge; balance is negative (`currentAmount < 0`).
5. **Surplus** — purple/indigo bar capped at 100% with a "SURPLUS" badge; more funds were allocated than the budgeted amount.
6. **Not Funded** — gray bar at 0% with a "Not Funded" badge; the envelope exists but has not yet been allocated any funds.

### Edge Cases
*   User attempts to spend more than available in an envelope (over-spending).
*   User deletes an envelope with a non-zero balance.
*   User attempts to create an envelope with a duplicate name.
*   User tries to fill envelopes without sufficient "Available to Spend" funds.

## 5. Gamified Financial Dashboard

Provides a modern, slick, and interactive overview of the user's financial health, incorporating gamified elements.

### User Stories
*   As a user, I want to see my total "Available to Spend" at a glance on the dashboard.
*   As a user, I want visual health bars for each envelope that change color based on remaining funds, so I can quickly see my budget status.
*   As a user, I want to see a "Financial Health" score or ring that reflects my budgeting adherence and overall financial progress.
*   As a user, I want to quickly access my recent transactions from the dashboard.
*   As a user, I want the dashboard to feel engaging and motivating.

### Acceptance Criteria
*   The dashboard shall prominently display the user's current "Available to Spend" amount.
*   Each active budget envelope shall have a visual health bar indicating remaining vs. budgeted amount.
*   Health bars shall visually deplete and change color (green → yellow → red) as the envelope's funds are spent.
*   A "Financial Health" metric (score or visual indicator) shall be displayed, reflecting budgeting performance.
*   The dashboard shall include a section for recently added or imported transactions.
*   The UI/UX of the dashboard shall be modern, intuitive, and visually appealing.

### Edge Cases
*   No envelopes are created, resulting in an empty health bar section.
*   "Available to Spend" becomes negative due to overspending.
*   Financial Health score calculation needs to handle edge cases like new users with no history.

## 6. Achievements & Rewards

Motivates users through a system of badges and milestones for positive financial behaviors.

### User Stories
*   As a user, I want to earn badges for achieving financial milestones (e.g., "First Budget Cycle Complete," "No Overspending Month").
*   As a user, I want to see a collection of my earned achievements to track my progress.
*   As a user, I want to feel rewarded for sticking to my budget and improving my financial habits.

### Acceptance Criteria
*   The system shall automatically award predefined achievements based on user actions and financial data.
*   Achievements shall have unique names and visual badges.
*   A dedicated section shall display all earned and potential achievements.
*   Users shall receive a notification when an achievement is unlocked.

### Edge Cases
*   Achievement criteria are met but the badge is not awarded.
*   User's data changes (e.g., transaction deletion) causing an achievement to become invalid (should not revoke, but prevent future awards).

## 7. Financial Insights & Reporting

Provides customizable charts and reports to help users understand their spending patterns and financial trends.

### User Stories
*   As a user, I want to view a breakdown of my spending by category over a selected period.
*   As a user, I want to see trends of my income versus expenses over time.
*   As a user, I want to track my net worth evolution.
*   As a user, I want to customize the date range for my financial reports.

### Acceptance Criteria
*   The "Insights" page shall offer a spending by category report (e.g., pie chart, bar chart).
*   The system shall generate an income vs. expense trend report (e.g., line graph).
*   The system shall display a net worth over time report (requires tracking assets/liabilities, initially derived from account balances).
*   All reports shall allow users to select custom date ranges (e.g., last 7 days, current month, last 3 months, custom range).

### Edge Cases
*   No data available for a selected period, resulting in empty reports.
*   Reports become complex or slow with a very large number of transactions.

## 8. Receipt Attachment & Storage

Allows users to attach images of receipts to transactions for better record-keeping.

### User Stories
*   As a user, I want to upload an image of a receipt and attach it to a specific transaction.
*   As a user, I want to view the attached receipt image when reviewing a transaction.
*   As a user, I want to delete an attached receipt image.

### Acceptance Criteria
*   The system shall provide an option to upload an image (JPEG, PNG) when adding or editing a transaction.
*   Uploaded images shall be stored securely in Cloudflare R2.
*   Attached receipts shall be viewable from the transaction details screen.
*   Users shall be able to remove an attached receipt from a transaction.

### Edge Cases
*   User attempts to upload an unsupported file type.
*   Uploaded image file size exceeds the allowed limit.
*   Network error during receipt upload.

## 9. Voluntary Donation Support

Enables users to voluntarily contribute financially to support the development and maintenance of PocketFlow.

### User Stories
*   As a user, I want to find a clear and non-intrusive way to donate to PocketFlow if I appreciate the service.
*   As a user, I want to choose a donation amount.

### Acceptance Criteria
*   A dedicated "Support PocketFlow" section shall be accessible from the application.
*   The section shall clearly explain the donation model and its purpose.
*   Users shall be able to initiate a voluntary donation via a secure payment gateway.
*   The system shall offer predefined donation amounts and potentially a custom amount option.

### Edge Cases
*   Payment gateway integration fails during a donation attempt.
*   User attempts to donate an invalid amount (e.g., zero or negative).

## 10. Admin System Health Monitoring

Provides administrators with a protected interface to monitor the application's operational status.

### User Stories
*   As an administrator, I want to view the overall health status of the PocketFlow application.
*   As an administrator, I want to monitor the status of the Plaid API integration.
*   As an administrator, I want to see basic user statistics (e.g., total users, active users).

### Acceptance Criteria
*   A protected admin dashboard shall display key system health metrics.
*   The dashboard shall show the current operational status of the Plaid API.
*   Basic user statistics, such as total registered users and daily/monthly active users, shall be visible.
*   Access to this dashboard shall be restricted to authorized personnel only.

### Edge Cases
*   Monitoring services fail to report accurate data.
*   Plaid API reports an outage, but the system doesn't reflect it immediately.