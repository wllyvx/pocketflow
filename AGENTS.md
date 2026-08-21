# AGENTS.md — PocketFlow

This document is the **entry point** for AI coding agents (Claude Code or similar) working in the PocketFlow repo. Read this before touching any code.

> **Document location:** All `.md` files referenced below live in the **`docs/`** folder at the repo root. Example full paths: `docs/ARCHITECTURE.md`, `docs/REQUIREMENTS.md`, etc. Always open files from that path — don't assume they sit at the repo root directly.

This project is built by a **solo developer assisted by an AI coding agent**, with no fixed calendar deadline. The documents below are the *source of truth* — don't assume or invent details that aren't in them. If a decision isn't covered by any document, ask the user instead of guessing.

## 1. Document Map & When to Read Each One

Read documents based on the task at hand — not every document needs a full read for every task, but **`ARCHITECTURE.md` and `REQUIREMENTS.md` are mandatory reading at the start of every work session**.

| Document (path) | Read when | Main content |
|---|---|---|
| `docs/ARCHITECTURE.md` | Always, at session start | Final tech stack, monorepo structure, API design principles, security. **Overrides `docs/PRD.md`** on technical matters (see §2). |
| `docs/REQUIREMENTS.md` | Always, at session start | MVP scope vs later phases, actionable FRs, NFRs, open questions not yet finalized. |
| `docs/ROADMAP.md` | Before starting a new task | Which phase/checklist item is being worked on, work order, Definition of Done per phase. |
| `docs/DATABASE.md` | When working on the data layer/schema | ERD, table definitions. **Note:** the schema in this document is written in Prisma, but the project uses **Drizzle ORM** (see §2) — table structure & relations remain the reference, only the ORM syntax needs translating. |
| `docs/API.md` | When working on endpoints/API contracts | Request/response format, endpoint list, status codes. The `success/data/error/pagination` format **does not change** and must be followed exactly. |
| `docs/FEATURES.md` | When feature behavior detail is needed | User stories, acceptance criteria, edge cases per feature. More detailed than REQUIREMENTS.md. |
| `docs/PRD.md` | For product/business context | Product vision, target users, KPIs, out-of-scope items. **For technical decisions, `ARCHITECTURE.md` wins** (see §2). |
| `docs/USER_FLOW.md` | When working on UI/pages | Navigation flow, rough text wireframes, mermaid flowcharts per feature. |
| `docs/DESIGN.md` | When working on visual components/styling | Colors, typography, spacing (4px grid), interaction/motion, accessibility standards. |

> Before starting a session, list the `docs/` folder to confirm there are no new files not yet covered by this table (documents may be added as the project evolves).

## 2. Conflict Resolution Rules Between Documents

These documents were written at different times, and **`PRD.md` is now stale on technical details**. If there's a conflict:

1. **`docs/ARCHITECTURE.md` wins for all technical decisions** (backend framework, ORM, repo structure). Example: `docs/PRD.md` mentions NestJS + Prisma — **ignore that**, use **Hono + Drizzle ORM** per `docs/ARCHITECTURE.md`.
2. **`docs/REQUIREMENTS.md` wins for feature scope** (what's included in MVP vs deferred). `docs/PRD.md` covers features that `docs/REQUIREMENTS.md` explicitly defers to later phases (Plaid sync, Donation, Admin Health Monitoring) — don't implement these in Phase 1 unless explicitly requested.
3. **`docs/API.md` and `docs/DATABASE.md` remain authoritative for data contracts/structure**, even though the ORM syntax in `docs/DATABASE.md` needs to be translated to Drizzle.
4. If a user instruction explicitly conflicts with these documents, follow the user's instruction for that session, but let the user know it diverges from the documents and ask whether the documents should be updated (see §5).

## 3. How to Work Per Session

- Work on **one `docs/ROADMAP.md` checklist item** (or a small related group) per session — don't request or attempt an entire phase at once.
- Before writing code: check `docs/REQUIREMENTS.md` for the relevant feature's acceptance criteria, check `docs/DATABASE.md`/`docs/API.md` for data contracts, check `docs/USER_FLOW.md` if there's a UI component involved.
- Follow the monorepo structure in `docs/ARCHITECTURE.md` §2 (`apps/web`, `apps/api`, `packages/shared`) — don't invent a new folder structure without strong reason.
- Business logic (envelope balance calculation, achievement engine, financial health score) goes in `apps/api/src/services/`, not directly in route handlers.
- Validate requests with Zod schemas in `packages/shared`, reused on the frontend.
- Prioritize quality and tests in Phase 0 and early Phase 1 (Envelope + Transactions) — every other feature depends on this foundation.

## 4. Open Questions — Don't Assume

The following two items are **not yet finalized** (see `docs/REQUIREMENTS.md` §6). If a task touches these areas, **ask the user first** instead of guessing the final formula/list:

- The exact **Financial Health Score** formula (only a rough direction exists in `docs/REQUIREMENTS.md` FR-04: a combination of % of envelopes not over budget + transaction-logging consistency).
- The final **achievements** list and unlock criteria (only an early draft exists in `docs/REQUIREMENTS.md` FR-05).
- The retention/deletion policy for receipt images when an account is deleted.

## 5. Keeping the Documents Accurate

Whenever a new decision is made that diverges from the documents (e.g., the Financial Health Score formula gets finalized, or there's an architecture change), **update the relevant document in `docs/`** (usually `REQUIREMENTS.md` and/or `ARCHITECTURE.md`) in the same session — don't let the documents go stale, since they're the context used for the next work session.

## 6. Responses

- Keep responses concise and to the point, unless the user asks other questions.

## 7. Planning Mode

- Always ask clarifying questions.
- Never assume design, tech stack, or features.
- Use deep-dive subagents to assist with research.
- Use deep-dive subagents to review the different aspects of your plan before presenting it to the user.
- Use a more capable/higher-tier model for planning — plan quality directly determines execution quality, so don't economize here.

## 8. Change/Edit Mode

- Never implement features yourself when possible — use sub-agents!
- Identify changes from the plan that can be implemented in parallel, and use sub-agents to implement the features efficiently.
- When using sub-agents to implement features, act as a coordinator only.
- Use a cheaper/lighter model for executing an already-approved plan — implementation of well-specified tasks doesn't need the top-tier model, and this keeps cost down across many sub-agent calls.
- After completing features (large or small), always run commands like lint, type check, and `astro build` to check code quality.

## 9. Progress Tracking (per FR)

Progress for each functional requirement (FR) is tracked in `progress/FR-XX/` (e.g. `progress/FR-01/`, `progress/FR-02/`), separate from `docs/`, which holds the stable source-of-truth specs. Each FR folder may contain:

- `plan.md` — the approach, decisions, and work breakdown agreed on during Planning Mode.
- `todo.md` — the granular checklist tracked and updated during Change/Edit Mode.

**Rules the agent must follow:**

- At the start of every session touching an FR, check whether `progress/FR-XX/plan.md` and `progress/FR-XX/todo.md` already exist.
- **If they exist:** read them first for context (current status, what's done, what's pending, prior decisions), and keep them updated as work progresses (check off completed items, add newly discovered tasks, note blockers).
- **If they don't exist:** do **not** create them automatically. Their absence means that FR hasn't been scoped/started yet by the user — surface this to the user instead of assuming or generating a plan/todo unprompted.
- The user owns creation of `plan.md` and `todo.md`. The agent's role is limited to reading and updating existing files, never initializing new ones on its own.
- Never let `todo.md` duplicate `docs/ROADMAP.md` — `docs/ROADMAP.md` stays at the phase/roadmap level; `progress/FR-XX/` is the technical execution breakdown of a single roadmap item.

## 10. Tech Stack Summary (final, from `docs/ARCHITECTURE.md`)

- **Frontend:** Astro.js
- **Backend:** Hono on Cloudflare Workers
- **ORM:** Drizzle ORM
- **Database:** Cloudflare D1
- **Storage:** Cloudflare R2 (receipt images)
- **Auth:** Auth0 (OAuth 2.0 / JWT)
- **Bank sync:** Plaid — **Phase 2, not implemented in MVP**
- **Monorepo:** pnpm workspaces
- **Deploy:** `wrangler deploy` (single target: Cloudflare Workers)

## Token Optimization & Codebase Memory MCP
You must maximize token efficiency. NEVER read raw code files or use full-text grep to discover repository structures, call chains, or dependencies. Instead, ALWAYS leverage the active `codebase-memory-mcp` knowledge graph using these rules:
- **Symbol Discovery:** Use `search_graph` or `get_architecture` to locate functions, classes, and types instead of opening files.
- **Call Chains:** Use `trace_call_path` to map execution flows or dependencies between components.
- **Impact & Dead Code:** Run Cypher queries (`query_graph`) or specialized impact analysis tools to check for breaking changes or unused code before refactoring.
- **File Reading Limits:** Only read raw text files after narrowing down exact line numbers via the MCP server. Only read minimal code chunks; never read whole files larger than 100 lines unless strictly required for a rewrite.