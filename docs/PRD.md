# PRD: PocketFlow

## Executive Summary & Product Vision

PocketFlow is a modern, gamified personal finance management application designed for web and mobile platforms. It aims to provide an intuitive and engaging user experience, differentiating itself from existing tools through a slick UI and an envelope-based budgeting system. The product vision is to empower users to take control of their finances by making budgeting feel less like a chore and more like a rewarding game.

## Problem Statement & Target Users

**Problem:** Existing personal finance apps are often perceived as clunky, overly complex, or visually unappealing. This leads to low user engagement and abandonment, preventing users from achieving their financial goals.

**Target Users:** Tech-savvy individuals (Millennials, Gen Z) who are comfortable with digital tools and seek a modern, visually engaging application to manage their personal finances. They value design, simplicity, and motivational feedback loops.

## System Scope & User Roles

The system will consist of a responsive web application and a backend service, with data synchronized in real-time. The primary user role is `User`.

| Permission | User |
|:---|:---|
| Create/View/Update/Delete Personal Profile | ✅ |
| Create/View/Update/Delete Transactions | ✅ |
| Create/View/Update/Delete Budget Envelopes | ✅ |
| View Financial Insights & Reports | ✅ |
| Manage Personal Settings (Notifications, Theme) | ✅ |
| Access Donation Page | ✅ |

## Functional Requirements

**User-Facing Requirements:**

*   **FR-01: Onboarding & Account Setup:** Users shall be able to create an account using email/password or social providers via Auth0. The onboarding flow will guide them through linking their first bank account using a Plaid Link integration.
*   **FR-02: Manual Transaction Entry:** Users shall be able to manually add, edit, and delete transactions (income, expense, transfer), specifying amount, date, category (envelope), and an optional note or receipt image.
*   **FR-03: Envelope Budgeting System:**
    *   Users shall be able to create, name, and assign a budget amount to digital "envelopes" for various spending categories (e.g., "Groceries," "Rent," "Entertainment").
    *   The system shall allow users to "fill" envelopes from their main income pool at the start of a budget cycle (e.g., monthly).
    *   Each transaction assigned to an envelope shall deduct from its budgeted amount.
*   **FR-04: Gamified Dashboard:** The main dashboard shall provide a highly visual and interactive overview of the user's financial status, including:
    *   A primary "Available to Spend" metric.
    *   Visual progress bars for each budget envelope, changing color (e.g., green -> yellow -> red) as funds are depleted.
    *   A "Financial Health" score or progress ring that improves as users stick to their budget.
*   **FR-05: Achievements & Milestones:** The system shall award users with badges or visual achievements for positive financial habits, such as "On-Budget Streak (1 Month)," "Savings Goal Reached," or "Debt Paid Down."
*   **FR-06: Custom Financial Insights:** A dedicated "Insights" page shall allow users to view customizable charts and reports, including spending by category, income vs. expense trends, and net worth over time.
*   **FR-07: Donation-Based Monetization:** The application shall include a non-intrusive, clearly marked "Support PocketFlow" section where users can make voluntary donations. This will be the sole monetization method.
*   **FR-08: Receipt Management:** Users shall be able to upload an image of a receipt (JPEG, PNG) and attach it to a transaction. Uploaded images will be stored in Cloudflare R2.

**Admin-Facing Requirements:**

*   **FR-09: System Health Dashboard:** An admin interface (protected) to monitor application health, Plaid API status, and basic user statistics (e.g., total users, active connections).

## Non-Functional Requirements

| Category | Requirement | Target |
|:---|:---|:---|
| **Performance** | First Contentful Paint (FCP) | < 1.5 seconds |
| | API Response Time (p95) | < 200ms |
| | Real-time Data Sync Latency | < 500ms |
| **Security** | Authentication & Authorization | Handled via Auth0 (OAuth 2.0, JWT) |
| | Data at Rest | All PII and financial data encrypted in D1 |
| | Data in Transit | TLS 1.3 enforced for all client-server communication |
| | Bank Credentials | Never stored; handled via Plaid's secure token exchange |
| **Scalability** | Concurrent Users | Support 1,000 concurrent users initially |
| | Monthly Active Users (MAU) | Architected to scale to 50,000 MAU within first year |
| **Availability** | System Uptime | 99.9% |
| | Data Durability | Automated daily backups of Cloudflare D1 |

## Technology Stack & Rationale

| Component | Technology | Rationale |
|:---|:---|:---|
| Frontend | Astro.js | Excellent performance (Islands Architecture), great DX, and ideal for building fast, content-rich web apps that feel native. |
| UI Styling | Tailwind CSS | Utility-first framework enables rapid, consistent, and custom UI development, matching the "slick UI" requirement. |
| Backend | Node.js (NestJS) | Provides a structured, scalable architecture for building efficient and reliable APIs. TypeScript support improves code quality. |
| Database | Cloudflare D1 | Serverless SQL database at the edge, offering low latency, tight integration with Workers, and simplified operations. |
| Object Storage | Cloudflare R2 | S3-compatible storage with zero egress fees, perfect for cost-effectively storing user-uploaded receipts. |
| Hosting | Cloudflare Pages & Workers | Fully serverless stack for global, low-latency delivery of the frontend and backend logic. Excellent scalability and cost-efficiency. |
| Authentication | Auth0 | Offloads complex security logic, providing robust, secure authentication with social login options out-of-the-box. |
| Bank Integration | Plaid | Industry-standard for secure, reliable bank account aggregation, enabling the core transaction sync feature. |

## Success Metrics & KPIs

| Metric | KPI | Target (First 6 Months) |
|:---|:---|:---|
| User Adoption | Monthly Active Users (MAU) | > 5,000 |
| User Engagement | Transactions Logged per User/Week | > 5 |
| | DAU/MAU Ratio | > 20% |
| User Retention | 30-Day Retention Rate | > 25% |
| Monetization | Monthly Donation Revenue | > $500 |

## Risk Analysis & Mitigation

| Risk | Impact | Mitigation Strategy |
|:---|:---|:---|
| **Security Breach** | Critical | Utilize Auth0 for authentication. Encrypt all sensitive data at rest. Adhere strictly to Plaid's security guidelines. Conduct regular dependency scans and security audits. |
| **Plaid API Costs** | High | Abstract the bank aggregation service behind an internal interface to allow for future replacement. Implement caching for non-critical data. Monitor Plaid API usage and costs closely. |
| **Low User Adoption** | High | Prioritize a polished, bug-free, and highly engaging UX/UI. Implement a viral loop (e.g., shareable achievement badges). Conduct user feedback sessions post-launch to iterate quickly. |
| **Data Synchronization Errors** | Medium | Implement robust error handling and logging for the Plaid sync process. Provide a clear UI for users to manually resolve transaction discrepancies or categorization issues. |

## Constraints & Assumptions

**Constraints:**

*   The initial product is a web application with a mobile-responsive design. A native mobile app is out of scope for v1.
*   Monetization is strictly limited to voluntary user donations. No ads, subscriptions, or data selling.
*   The technology stack is fixed as specified.
*   The application will only support USD ($) and US-based financial institutions at launch.

**Assumptions:**

*   Users are willing to connect their bank accounts via Plaid.
*   The target demographic will find the gamified approach to budgeting motivating.
*   The serverless Cloudflare infrastructure can meet performance and scalability requirements.
*   The donation model will be sufficient to cover operational costs long-term.

## Out of Scope

The following features will NOT be included in the initial release:

*   Shared budgets or multi-user accounts (for couples/families).
*   Investment, loan, or mortgage tracking.
*   Advanced financial forecasting or AI-driven advice.
*   Bill payment reminders and scheduling.
*   Multi-currency support.
*   Native iOS or Android applications.