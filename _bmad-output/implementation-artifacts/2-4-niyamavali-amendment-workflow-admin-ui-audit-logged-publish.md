# Story 2.4: Niyamavali Amendment Workflow Admin UI + Audit-Logged Publish `[SURFACE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Pariwar Admin or higher role,
I want an admin UI workflow to author + amend + publish Niyamavali clauses with diff preview + tone-review sign-off (Story 2.2) + audit logging (Story 1.10),
so that the registry shape commitments from Story 2.3 are exposed as a usable trustee workflow.

> **Seam discipline (read first).** This is the `[SURFACE]` story that turns the Story 2.3 `[PRIMITIVE]` (the `clause_versions` / `niyamavali_amendments` data model + the framework-agnostic `niyamavali.*` accessors) into a real trustee workflow: an `apps/api/src/modules/rules/` HTTP surface + an `apps/admin/src/modules/niyamavali-admin/` React surface. It is **the first consumer** of the Story 2.2 tone-review gate (`requireToneReviewSignoff`) and the **owner of the deferred 409/404 HTTP mapping, the audit-or-throw write path, and the draft store** that 2.3 explicitly handed forward. It does **NOT** interpret rule payloads (that is Epic 4) and does **NOT** build the public render (that is Story 2.5). [Source: epics.md#Story-2.4 L1474-1490; [[2-3 file]] Dev Notes §"409 ownership", §"tone-review note"]

## Acceptance Criteria

> AC1–AC4 are verbatim-derived from epics.md L1480-1490 (Story 2.4), re-numbered for traceability. AC5–AC8 are the **binding obligations the create-story analysis surfaces** — each is a commitment Story 2.3 / Story 2.2 explicitly deferred *to this story* with a recorded re-trigger (deferred-work.md, gate-inventory.md). They gate review exactly like the epic ACs. [Source: [[feedback_record_unattested_no_backfill]] — un-gated commitments decay; each carries its source.]

**AC1 — The authoring → review → publish workflow (the five capabilities).**
Given Story 2.3's registry shape + Story 1.8 RBAC (`Pariwar Admin` or higher) + Story 1.10 audit log + Story 2.2's tone-review gate, when the admin UI workflow is authored, then a trustee with the `niyamavali.amend` permission can:
- **(a) create** a new clause with trustee-allocated `clause_id` (validates AC2 format + per-Pariwar uniqueness; conflict → 409 — see AC6);
- **(b) edit** a clause **draft** that does **NOT** affect the published version until published (the draft is server-persisted so the non-author reviewer can load it — see Dev Notes §"The draft store");
- **(c) preview the diff** between draft and current published version, showing **both** the structured-payload diff (`niyamavali.computePayloadDiff`) **and** a rendered-content diff;
- **(d) submit for tone-review**, routing to a **non-author** reviewer carrying the `niyamavali.review` permission;
- **(e) publish**, **only after** a recorded tone-review sign-off (AC4) **and** within RBAC scope.

**AC2 — Publish writes one audit line with the full provenance.**
Given a clause is published, when the publish endpoint succeeds, then it emits a **single** audit log line (Story 1.10 hash-chain writer) carrying the full diff document (as a hash — never raw copy), tone-reviewer attribution, the `clause_id`, and the newly-minted `clause_version_id`.

**AC3 — Publish fires the member-notification scaffolding hook (placeholder).**
Given a clause is published, when publish succeeds, then a member-notification scaffolding hook is invoked as a **placeholder** — Epic 5 consumes it to fire `niyamavali.amended` push notifications to affected members. 2.4 ships the hook seam + the call site, NOT the notification delivery. [Source: epics.md L1486; event name `niyamavali.amended` already reserved — packages/domain/tests/rbac/permissions.test.ts L58]

**AC4 — Publish without tone-review sign-off → 409 `tone-review-required`.**
Given a publish attempt without a recorded (resource-bound, non-author, content-current) tone-review sign-off, when the publish endpoint is called, then the request is rejected with a **409** indicating `tone-review-required` (the existing `ToneReviewRequiredError` → 409 mapping); the admin UI surfaces the rejection clearly with the path to resolution (submit for review / await a non-author sign-off).

**AC5 — Binding: audit-or-throw on the publish write path (the 2.3 → 2.4 `audit_id` NOT-NULL contract).**
Story 2.3 left `clause_versions.audit_id` **nullable** because domain-direct creates + the structural seed predate this audited route; the NOT-NULL invariant is **enforced here**. Given a clause is published, when the new `clause_versions` row (and, for an amendment, the `niyamavali_amendments` row) is written, then its `audit_id` is **non-null and references the AC2 audit line** — **no published clause exists without an audit line**. If the audit write fails, the publish fails (the scope transaction rolls back; see Dev Notes §"Publish sequencing & audit-or-throw"). [Source: [[2-3 file]] Task 2, Resolved-decisions #3, ADR-0020 decision 2]

**AC6 — Binding: the deferred typed-error → HTTP mapping (the 2.3 "409 ownership" seam).**
Given a `clause_id` allocation conflict (`ClauseIdConflictError`), when the create endpoint runs, then the error-mapping middleware renders **HTTP 409** with code `niyamavali.clause_id_conflict`. Given an amend/deprecate targets a non-existent `clause_id` (`ClauseNotFoundError`), then it renders **HTTP 404** with code `niyamavali.clause_not_found`. [Source: [[2-3 file]] Dev Notes §"409 ownership"; packages/domain/src/niyamavali/errors.ts L13-65; apps/api/src/middleware/error-mapping/index.ts]

**AC7 — Binding: the deferred `clause_versions` immutability trigger lands on this audited write path.**
Story 2.3 deferred the column-restricted Postgres trigger to "when the audited write path is established." Given the audited write path now exists, when the migration runs, then a `BEFORE UPDATE` trigger on `clause_versions` **rejects any UPDATE of `payload`, `clause_id`, or `version`** (the three columns that must be historically immutable), while allowing UPDATE of `superseded_by_version`, `deprecated_at`, and `audit_id` (the legitimately-mutable columns). [Source: deferred-work.md L32 "Column-restricted immutability trigger on `clause_versions`"; [[2-3 file]] §"clause_versions is NOT fully append-only"]

**AC8 — Binding: the deferred amendment-ledger hardening (De2 cross-tenant CHECK + De4 list index).**
Given the audited write path + the new list-amendments read path now exist, when the migration runs, then (i) `niyamavali_amendments` carries a guard that its `pariwar_id` matches the `pariwar_id` of its FK'd `from_clause_version_id` / `to_clause_version_id` rows (De2 — a CHECK or `BEFORE INSERT` trigger), and (ii) an index `(pariwar_id, created_at)` supports the time-ordered list-amendments query (De4). [Source: deferred-work.md L10 (De2), L12 (De4)]

## Tasks / Subtasks

> Build order is bottom-up: schema → domain → contracts → API → error-map → UI → notification hook → tests → governance. The **draft store (Task 1/2)** is the central net-new design — read Dev Notes §"The draft store" before starting.

- [x] **Task 1 — `clause_drafts` schema + RLS + migration `0015` (folds in the deferred migration items: AC7, AC8).** `packages/domain/src/schema/clause_drafts.ts` + `packages/domain/src/policies/clause-drafts-rls.ts` + `packages/domain/migrations/0015_*.sql`
  - [x] New table `clause_drafts` (snake_case-plural). Columns (snake_case DB / camelCase TS / snake_case JSONB keys — architecture L3663-3677): `draft_id` (uuid PK `.defaultRandom()` `.$type<ClauseDraftId>()`), `pariwar_id` (uuid `.$type<PariwarId>().notNull()` — RLS predicate column), `clause_id` (text `.$type<ClauseId>().notNull()` — target clause; allocated at draft-create for `create`, the existing id for `amend`), `operation` (`pgEnum('clause_draft_operation', ['create','amend'])` notNull — **2.4 UI scope is create + amend only; split/merge/deprecate domain ops exist but are NOT surfaced here**, see Dev Notes §"Scope boundary"), `payload` (jsonb notNull — the pending opaque content), `effective_date` (timestamptz notNull), `benefit_mechanism` (the existing `benefit_mechanism` pgEnum, notNull), `affected_member_scope` (jsonb **nullable** — required for `amend`, null for `create`; validated by `assertAffectedMemberScope` on the amend path), `status` (`pgEnum('clause_draft_status', ['draft','in_review','signed_off','published','discarded'])` notNull default `'draft'`), `authored_by_actor` (uuid notNull), `tone_reviewed_by` (uuid nullable), `tone_reviewed_at` (timestamptz nullable), `tone_review_content_hash` (text nullable — SHA-256 hex of the reviewed payload; binds the sign-off to exact content), `published_clause_version_id` (uuid nullable `.$type<ClauseVersionId>()` — set on publish), `created_at`/`updated_at` (timestamptz notNull defaultNow), `audit_id` (uuid nullable, FK → `audit_log_entries.audit_id`).
  - [x] Add `ClauseDraftId = Brand<'ClauseDraftId'>` + `clauseDraftId` smart constructor (UUID — reuse `uuidBrand('ClauseDraftId')`) in `packages/domain/src/ids/index.ts`; export from barrel. [Source: packages/domain/src/ids/index.ts; [[2-3 file]] Task 1 precedent]
  - [x] Index `(pariwar_id, status)` (list drafts awaiting review) and `(pariwar_id, clause_id)` (find the open draft for a clause). A **partial unique** index on `(pariwar_id, clause_id) WHERE status IN ('draft','in_review','signed_off')` enforces "at most one open draft per clause" (avoid two competing drafts of the same clause). Hand-supplement the partial-unique if drizzle cannot express it.
  - [x] RLS: **tenant-isolated read + write**, mirror `clause-versions-rls.ts` (NOT cross-readable). Use the exact fail-closed `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`, `to appRole`. [Source: packages/domain/src/policies/clause-versions-rls.ts]
  - [x] **AC7 (deferred immutability trigger):** hand-supplement into `0015` a `BEFORE UPDATE` trigger on `clause_versions` that `RAISE`s if `NEW.payload IS DISTINCT FROM OLD.payload OR NEW.clause_id <> OLD.clause_id OR NEW.version <> OLD.version`. Allow all other column updates (`superseded_by_version`, `deprecated_at`, `audit_id`). Mirror the events_log trigger DDL style. [Source: deferred-work.md L32; events_log migration 0001 trigger precedent]
  - [x] **AC8 (De2):** hand-supplement a `BEFORE INSERT` trigger (or CHECK via a function) on `niyamavali_amendments` rejecting a row whose `pariwar_id` ≠ the `pariwar_id` of the FK'd `from_clause_version_id`/`to_clause_version_id` rows. [Source: deferred-work.md L10]
  - [x] **AC8 (De4):** add index `niyamavali_amendments_pariwar_created_at_idx ON niyamavali_amendments (pariwar_id, created_at)`. [Source: deferred-work.md L12]
  - [x] ⚠ `pnpm db:generate` ONCE (→ `0015`); hand-supplement the three triggers/index; **never regenerate an applied migration** (drizzle skips by journal `when`, not SQL hash → silent `42P07`). Commit `meta/_journal.json` + `meta/0015_snapshot.json`. `pnpm db:check` clean. [Source: [[project_live_db_test_gotchas]]]

- [x] **Task 2 — Domain: draft accessors + the tone-review resolver-backing read + `listClauses` (AC1, AC4, AC5).** `packages/domain/src/niyamavali/drafts.ts` (+ extend `read.ts`, barrel)
  - [x] `createDraft(db, input)`, `updateDraft(db, draftId, patch)`, `getDraft(db, pariwarId, draftId)`, `listDrafts(db, pariwarId, {status?, limit})`, `discardDraft(...)`. **Editing a non-published draft (`updateDraft`) MUST reset `status → 'draft'` and CLEAR `tone_reviewed_by`/`tone_reviewed_at`/`tone_review_content_hash`** — any content change invalidates a prior sign-off (re-review required). [Source: Dev Notes §"The sign-off is content-bound"]
  - [x] `submitForReview(db, pariwarId, draftId)` — `draft → in_review`.
  - [x] `recordDraftSignoff(db, pariwarId, draftId, {reviewedBy, contentHash, reviewedAt})` — sets the sign-off columns + `status → signed_off`. **Reject if `reviewedBy === authoredByActor`** (defense-in-depth; the gate also denies this — gate.ts invariant 3). The contentHash is `sha256Hex(canonicalJsonStringify(draft.payload))` of the **current** payload.
  - [x] `resolveDraftSignoff(db, pariwarId, draftId): ToneReviewSignoff | null` — returns a `ToneReviewSignoff` ONLY when `status === 'signed_off'` AND `tone_review_content_hash === sha256(canonicalJson(current payload))`; otherwise `null`. **The gate (`evaluateToneReviewGate`) does NOT compare content hashes** — content-binding is THIS resolver's job (see Dev Notes). `resourceLocator = niyamavali:clause:<clause_id>`. [Source: packages/domain/src/tone-review/gate.ts L62-108 — checks present/resource-bound/non-author, NOT contentHash]
  - [x] `markDraftPublished(db, pariwarId, draftId, clauseVersionId, auditId)` — `status → published`, set `published_clause_version_id` + `audit_id`.
  - [x] `listClauses(db, pariwarId, {limit})` in `read.ts` — the admin "pick a clause to amend / browse the registry" read (latest version per `clause_id`, newest-first). **No such accessor exists yet** — `read.ts` has only single-clause resolvers. [Source: packages/domain/src/niyamavali/read.ts — no list accessor]
  - [x] `listAmendments(db, pariwarId, {limit})` in `read.ts` — time-ordered (uses the De4 index from Task 1).
  - [x] Reuse existing accessors unchanged for publish: `createClause` / `amendClause` (they accept `auditId` + `authoredByActor` already — write.ts L62, L141). **Do NOT reimplement create/amend.** [Source: packages/domain/src/niyamavali/write.ts L117, L158]

- [x] **Task 3 — Transport contracts: request/response DTOs (AC1-AC4).** `packages/contracts/src/rules/clause.ts` (+ barrel)
  - [x] Add: `CreateClauseDraftRequest` (`clauseId`, `payload`, `effectiveDate`, `benefitMechanism`), `AmendClauseDraftRequest` (`clauseId`, `payload`, `effectiveDate`, `affectedMemberScope`, optional `benefitMechanism`), `UpdateClauseDraftRequest` (payload/effectiveDate/scope patch), `ClauseDraftResponse` (mirrors the `clause_drafts` row; `.strict()`), `ToneReviewSignoffRequest` (the reviewer endpoint — carries nothing the server can't derive except an explicit confirm flag), `DiffPreviewResponse` (`structuredDiff: DiffDocumentSchema`, `renderedDiff: <before/after display fields>`), `PublishClauseResponse` (`clauseVersionId`, `clauseId`, `version`, `auditId`). Reuse the existing `ClauseIdSchema`, `ClausePayloadSchema`, `AffectedMemberScopeSchema`, `DiffDocumentSchema`, `BenefitMechanism`. [Source: packages/contracts/src/rules/clause.ts L38-139 — reuse, do not redeclare]
  - [x] **These DTOs are the FIRST niyamavali ENDPOINTS, so they DO register via `.openapi()`** (unlike the 2.3 plain-`z.*` schemas) and the committed `openapi/v1.yaml` snapshot **will** change — that is expected here (2.3's "byte-identical" rule applied only because 2.3 added no endpoint). Mirror the `AddPariwarRequest`/`ProvisionedPariwar` registration style. Run `pnpm contracts:check-openapi-determinism` and regenerate the snapshot. [Source: packages/contracts/src/rules/clause.ts L3-6; apps/api/src/modules/pariwar-provisioning/index.ts L98-99]
  - [x] Keep the type-assignability defense (contracts is source-of-truth; no hand-written shadow types). Export via `packages/contracts/src/rules/index.ts`.

- [x] **Task 4 — API module `apps/api/src/modules/rules/` — the routes (AC1-AC5).** Register in `apps/api/src/server.ts` (mirror `registerPariwarProvisioningModule`). All routes are **tenant-scoped** under `/api/v1/p/:pariwarId/niyamavali/...` with the chain `[requireAdminSession(deps), scopeResolutionHook(deps), requirePermissionHook(deps, <key>)]`. [Source: apps/api/src/modules/multi-tenant/index.ts L37-66 — the scoped-route convention]
  - [x] `GET  /clauses` — list registry (`niyamavali.amend`). `GET /clauses/:clauseId/versions` — version history (supports AC1a: lets the UI show prior versions of a clause being created/amended; no standalone AC, traceable to AC1).
  - [x] `POST /clauses/drafts` — create draft (`niyamavali.amend`); body `CreateClauseDraftRequest` or `AmendClauseDraftRequest` (discriminate on operation). `clause_id` format/uniqueness for `create` is validated at **publish** by `createClause` (the 409 seam); the draft create may pre-check + surface early.
  - [x] `PUT  /clauses/drafts/:draftId` — edit draft (`niyamavali.amend`); resets sign-off (Task 2).
  - [x] `GET  /clauses/drafts/:draftId/diff` — diff preview (`niyamavali.amend` or `niyamavali.review`); structured diff via `computePayloadDiff(currentPublished?.payload ?? {}, draft.payload)` + rendered-content diff (Dev Notes §"Diff preview").
  - [x] `POST /clauses/drafts/:draftId/submit-for-review` — `niyamavali.amend`.
  - [x] `POST /clauses/drafts/:draftId/tone-review` — **reviewer sign-off** (`niyamavali.review`). Calls `recordDraftSignoff(...)` AND `recordToneReviewSignoff(deps, {...})` (the Story 2.2 audit emission → `tone_review.signoff`). **Reject self-review (reviewer === author) with 409/403.** [Source: apps/api/src/modules/tone-review/index.ts L268-279]
  - [x] `POST /clauses/drafts/:draftId/publish` — **publish** (`niyamavali.amend`) with the tone-review gate in the preHandler chain: `requireToneReviewSignoff(deps, { resolveSignoff: r => resolveDraftSignoff(r.scopeTx.tx, r.scopeTx.pariwarId, draftId), resolveAuthoredBy: …, resolveResourceLocator: r => 'niyamavali:clause:'+clauseId })`. On allow, the handler runs the publish sequence (Dev Notes §"Publish sequencing & audit-or-throw") + fires the member-notification hook (Task 7). [Source: apps/api/src/modules/tone-review/index.ts L199-244]
  - [x] **`asOf` call-site discipline (2.3 deferral):** when the publish/diff path calls `resolveByClauseId`, do **NOT** pass an app-server `now()` — let it default to DB `now()` (DB-authoritative time §1.11). [Source: deferred-work.md L33]
  - [x] Rate-limit writes with `named.write`, reads with `named.read` (provisioning precedent) — applies uniformly: the diff-preview `GET` (cheap, called frequently while authoring) uses `named.read`; create/edit/submit/sign-off/publish all use `named.write`. No special-cased class needed. Re-brand path-param `pariwarId` at the wire boundary as in `toPassportResponse`. [Source: apps/api/src/modules/pariwar-provisioning/index.ts L66, L103]

- [x] **Task 5 — Error-mapping: the deferred 409/404 (AC6).** `apps/api/src/middleware/error-mapping/index.ts`
  - [x] Add `if (error instanceof ClauseIdConflictError) reply.status(409).send(error.toErrorResponse(requestId))` (the class already has `toErrorResponse` — errors.ts L36). Add `ClauseNotFoundError → 404` (this class has **no** `toErrorResponse` yet — either add one mirroring `ClauseIdConflictError`, recommended, or use an inline `envelope(error.code, …)`). Import both from `@twt/domain` (top-level exports). [Source: packages/domain/src/niyamavali/errors.ts L22-65; packages/domain/src/index.ts L46-50; error-mapping pattern L for ToneReviewRequiredError]
  - [x] These mappings need an integration test asserting the status + code (the middleware is the only place an HTTP consumer sees these).

- [x] **Task 6 — Admin UI module `apps/admin/src/modules/niyamavali-admin/` + route + client + hooks (AC1, AC4).**
  - [x] Module components (mirror `apps/admin/src/modules/audit-integrity/` shape: `Page.tsx` + sub-components + a `derive.ts` for pure view-logic): a clause-list table, a draft authoring/edit form (capturing payload display fields + `effective_date` + `benefit_mechanism` + (amend) `affected_member_scope`), a **diff-preview panel** (structured + rendered, AC1c), a submit-for-review action, a reviewer sign-off action (visible to `niyamavali.review` holders), and a publish action. The `affected_member_scope` field is **trustee-authored, not validated for completeness here** (architecture §1.10 treats scope completeness as a review criterion, but enforcement is Epic 4) — surface brief inline form guidance prompting the trustee to scope it correctly, since a wrong/incomplete scope will only be caught later. [Source: apps/admin/src/modules/audit-integrity/* shape; apps/admin/src/modules/pariwar-provisioning/AddPariwarForm.tsx form precedent; architecture.md §1.10]
  - [x] Route: add a TanStack-Router code-based route (e.g. `/p/$pariwarId/niyamavali`) in `apps/admin/src/router.tsx` + a `routes/NiyamavaliRoute.tsx` wrapper. **Note the path discrepancy:** the admin app today has only flat global routes (`/audit/integrity`, `/provisioning`); 2.4 introduces the first **`/p/:pariwarId/`-scoped** admin route. Confirm the scoped path param threads into the API client calls. [Source: apps/admin/src/router.tsx — code-based routing, DD-1]
  - [x] API client: add the niyamavali calls to `apps/admin/src/api/client.ts`, each parsing the response with the Task-3 `@twt/contracts` schemas (the hand-written-fetch + Zod-parse pattern, DD-7 — no codegen). [Source: apps/admin/src/api/client.ts L1-8]
  - [x] TanStack Query hooks in `apps/admin/src/api/hooks.ts`: list/draft queries + create/edit/submit/signoff/publish mutations that invalidate the list on success. Niyamavali authoring is **NOT** a strong-consistency surface like audit-integrity, so default cache (not the `staleTime:0` verifier defaults) is fine for the list. [Source: apps/admin/src/api/hooks.ts L23-31, L50-58]
  - [x] **AC4 UI:** on a `409 tone-review-required` from publish, surface a clear, non-author-friendly message + the resolution path (submit / await sign-off). The `ApiError` carries `status` + `code` for branching. [Source: apps/admin/src/api/client.ts ApiError L]
  - [x] **Surface classification (Story 2.1):** the admin chrome/labels are **admin-facing → English-primary** and MAY ship English-only. The **clause payload content** the trustee authors is member-visible content destined for the public render (2.5) — author bilingual where the display convention calls for it; the authoritative bilingual display contract crystallizes at 2.5. Do not block 2.4 on a full member-visible i18n catalog for admin chrome. [Source: [[2-1 file]] surface-classification convention; ux-design-specification.md L48 Tier-2 trustee tooling]

- [x] **Task 7 — Member-notification scaffolding hook (AC3 — placeholder).** `apps/api/src/modules/rules/` (a small seam, NOT a delivery impl)
  - [x] On successful publish, invoke a placeholder hook (e.g. `deps.niyamavaliAmendedHook?.(...)` injected via `AppDeps`, default a no-op/console seam — the `deployTrigger`/`toneReviewAuditSink` injectable-seam precedent). Carries `{ pariwarId, clauseId, clauseVersionId, affectedMemberScope }`. Epic 5 wires the real `niyamavali.amended` push fan-out (which resolves `affected_member_scope` → member ids via Epic 4 / FR-12A). **Do NOT** resolve scope → members or send anything here (seam-clean). [Source: epics.md L1486; architecture §1.10 L1053-1066 — scope resolution is Epic 4]

- [x] **Task 8 — Tests (all ACs).**
  - [x] **Unit (`packages/domain`, no DB):** draft state-machine transitions (edit resets sign-off + clears hash); `resolveDraftSignoff` content-binding (signed_off + matching hash → returns; signed_off + stale hash → null; non-signed-off → null); self-review rejection.
  - [x] **Integration / live-DB (`packages/domain/tests/integration/niyamavali/…`):** the immutability trigger (AC7 — UPDATE of payload/clause_id/version rejected; UPDATE of superseded_by_version/deprecated_at/audit_id allowed); the De2 cross-tenant amendment guard (AC8); `clause_drafts` RLS isolation (tenant A cannot read/write tenant B's drafts; extend `cross-pariwar-leak.spec.ts`); `listClauses`/`listAmendments`. Use `SET LOCAL ROLE twt_app` + `setPariwarScope`; afterEach ROLLBACK; assert membership not counts. [Source: [[project_live_db_test_gotchas]]; [[2-3 file]] Task 9]
  - [x] **API integration (`apps/api`, `fastify.inject`):** the full create-draft → edit → submit → sign-off → publish flow returns 200 + writes one audit line with clause_id + clause_version_id + reviewer (AC2); **publish without sign-off → 409 `tone-review-required`** (AC4); publish where the author signed their own draft → denied (AC1d non-author); **edit-after-signoff → publish → 409** (content-binding); **`ClauseIdConflictError` → 409** + **`ClauseNotFoundError` → 404** (AC6); published clause has non-null `audit_id` (AC5); the member-notification hook fired with the right payload (capture the fake). Use the AppDeps test-wiring with a capturing `toneReviewAuditSink` + capturing notification-hook fake. [Source: apps/api integration test harness; context.ts AppDeps fakes]
  - [x] **Admin UI:** component/render tests for the diff panel + the 409 surfacing (match the audit-integrity test depth).
  - [x] ESLint per-package (`pnpm --filter @twt/domain lint`, `--filter @twt/api lint`, `--filter @twt/admin lint`). [Source: [[project_eslint_config_per_package_cwd]]]

- [x] **Task 9 — Governance: gate-inventory flip + deferred-work closures (binding).**
  - [x] **gate-inventory.md L51** (`tone-review` publish gate): flip from "installed but mounted by **no route**" → **"ENFORCING as of Story 2.4 — `requireToneReviewSignoff` mounted on the Niyamavali publish route; sign-off resolver + durable persistence (`clause_drafts.tone_review_*`) supplied."** [Source: gate-inventory.md L51, L55]
  - [x] **deferred-work.md** — close, per [[feedback_closure_language_precision]] ("Closed by [edit]" only where this story produced the artifact):
    - L49 (sign-off PERSISTENCE) → **Closed by [edit]** — `clause_drafts` + `resolveDraftSignoff` are the durable record + resolver.
    - L50 (gate CONSUMER WIRING) → **Closed by [edit]** — mounted on the publish preHandler chain.
    - L32 (column-restricted immutability trigger) → **Closed by [edit]** — trigger in migration 0015 (AC7).
    - L33 (`resolveByClauseId` asOf call-site) → **Closed by [edit]** — the route call site lets it default to DB `now()` (AC verified).
    - L10 (De2 cross-tenant amendment guard) → **Closed by [edit]** — guard in 0015 (AC8).
    - L12 (De4 `(pariwar_id, created_at)` index) → **Closed by [edit]** — index in 0015 + the list-amendments route exists (AC8).
    - Add a Story 2.4 deferred section for any NEW deferrals (e.g. split/merge/deprecate UI not surfaced; rendered-content-diff depth — see Dev Notes §"Diff preview").
  - [x] Note the Story 0.13 dependency: this Niyamavali amendment surface is in the 0.13 counsel-return integration list, but **0.13 does NOT gate Epic 2 closure** (seeded/authored content is provisional). Do not block on legal review. [Source: deferred-work.md L797, L809; epics.md L1399]

- [x] **Task 10 — ADR-0021 (draft store + publish state machine) + adr-index (governance).**
  - [x] Author `docs/adr/ADR-0021-niyamavali-draft-publish-workflow.md` capturing: the **server-persisted `clause_drafts` decision** (why not client-only — the non-author reviewer must load the exact pending content), the **draft state machine**, the **content-bound sign-off** (edit invalidates sign-off; the resolver enforces hash-match because the gate does not), the **audit-or-throw publish sequencing** (incl. the cross-connection servicePool-audit / scope-tx-clause ordering + orphan-audit-on-rollback acceptability), and the **2.4 UI scope boundary** (create+amend only; split/merge/deprecate domain ops not surfaced). Append the row to `docs/knowledge-transfer/adr-index.md` (status `drafted`; bump counts). [Source: [[2-3 file]] Task 11 / ADR-0020 precedent]

- [x] **Task 11 — Merge gate + sprint-status ledger.**
  - [x] `pnpm ci:local` green (mirrors all 14 ci.yml jobs; integration needs `DATABASE_URL` on `:5433`). [Source: [[project_ci_actions_suspension_local_mirror]]]
  - [x] Sprint-status: flip `development_status[2-4-…]` ready-for-dev → in-progress → review; add the reverse-chron `last_updated` COMMENT entry; one combined entry at completion. [Source: [[project_sprint_status_ledger]]]

## Dev Notes

### Binding obligations (do not let the story close without these)
- **AC4 + AC5 + AC6 are the load-bearing seam closures this story OWNS.** Story 2.2 shipped the tone-review gate mechanism but mounted it on no route and deferred sign-off persistence + the resolver to "Story 2.4" (deferred-work.md L49-50; gate-inventory.md L51). Story 2.3 shipped the registry shape but deferred the 409/404 HTTP mapping, the audit-or-throw `audit_id` NOT-NULL enforcement, the `clause_versions` immutability trigger, and the asOf call-site discipline to "Story 2.4" ([[2-3 file]] Dev Notes; deferred-work.md L10, L12, L32, L33). **If any is missing, it is a code-review finding** ([[feedback_record_unattested_no_backfill]] — un-gated commitments decay; this story is the gate).

### The draft store (THE central net-new design — read before Task 1)
Story 2.3's data model has **no draft concept**: `createClause` inserts a published `version=1` immediately and `amendClause` inserts a published `version+1` immediately (write.ts L82-103, L167-180). But AC1(b) requires "edit a clause **draft** that does not affect the published version until published," and AC1(d) requires routing the draft "to a **non-author** reviewer." **A different user (the reviewer) must be able to load the exact pending content** → the draft **must be server-persisted**, not client-only state. Hence the new `clause_drafts` table (Task 1). The published `clause_versions` row is only minted at publish time (by the existing `createClause`/`amendClause`), consuming the draft. This is the single most important thing to get right; it is recorded in ADR-0021 (Task 10).

### The sign-off is content-bound — but the gate is not (subtle, do not miss)
`evaluateToneReviewGate` (gate.ts L62-108) checks exactly three things: a sign-off is present with a reviewer, its `resourceLocator` matches the publish target, and `reviewedBy !== authoredBy`. **It does NOT compare content hashes.** So a sign-off recorded against an *old* draft payload would still pass the gate if you naively return it. The **content-binding is the consumer's job** (this story): `resolveDraftSignoff` returns a `ToneReviewSignoff` **only** when the draft is `signed_off` AND `tone_review_content_hash === sha256(canonicalJson(current payload))`. Symmetrically, `updateDraft` clears the sign-off columns on any edit. Net effect: edit-after-signoff ⇒ re-review required ⇒ publish 409s until a fresh non-author sign-off. Use `canonicalJsonStringify` (`@twt/domain`) for deterministic hashing — the same primitive 2.3 used for `computePayloadDiff`. [Source: gate.ts L62-108; tone-review/index.ts L181-188 resolveSignoff seam; canonical-json.ts:35]

### Publish sequencing & audit-or-throw (AC2 + AC5)
`writeAuditEntry(servicePool, input)` runs on the **BYPASSRLS `servicePool`** in its **own** transaction (advisory-locked global hash chain) and **returns the inserted row incl. `auditId`** (write.ts L118-180). The clause write runs on the **request `scopeTx.tx`** (RLS-scoped). `clause_versions.audit_id` is an FK → `audit_log_entries.audit_id`. Recommended order inside the publish handler:
1. On `scopeTx.tx`: `createClause`/`amendClause` (mints `clause_version_id`; `audit_id` momentarily null). **Do not commit yet** (the multi-tenant `onSend` hook commits on 2xx).
2. `await writeAuditEntry(deps.servicePool, { action: 'niyamavali.amended', resourceLocator: '<clauseVersionId>', requestPayloadHash: sha256(canonicalJson(diff_document)), actorId, pariwarId, responseStatus: 200, traceId })` → `auditId`. **If this throws, let it propagate** → the scope tx rolls back (step 1 undone) → no published clause without an audit line (AC5). ✅
3. On `scopeTx.tx`: UPDATE the new `clause_versions` row (and, for amend, the `niyamavali_amendments` row) `SET audit_id = auditId` (allowed by the AC7 trigger — `audit_id` is mutable). Also `markDraftPublished`.
4. Fire the AC3 member-notification hook. Return → `onSend` COMMITs the scope tx.

**Known + accepted edge:** the audit row (step 2, separate connection) commits independently; if step 3/COMMIT later fails and the scope tx rolls back, the audit row survives as an *append-only record of an attempted publish* whose `resourceLocator` references a now-absent `clause_version_id`. This is acceptable for an append-only audit log (it records intent) and preserves the only hard invariant — *no published clause without `audit_id`*. Document in ADR-0021. The audit `requestPayloadHash` is a **digest of the diff document, never raw copy** (AC2 "as a hash"). [Source: write.ts L118-180; multi-tenant/index.ts L21-27 onSend commit; tone-review/index.ts L16-23 "no raw copy" precedent]

### Diff preview (AC1c)
- **Structured-payload diff:** `niyamavali.computePayloadDiff(prev, next)` already exists and returns `{ added, removed, changed }` (the `DiffDocumentSchema` shape). For an **amend**, `prev = resolveByClauseId(tx, pariwarId, clauseId)` payload (current published, DB-`now()` default); for a **create**, `prev = {}` (all-added). [Source: packages/domain/src/niyamavali/diff.ts; read.ts L21-47]
- **Rendered-content diff:** render the payload's **human-readable display fields** as before/after text and diff that. The current seed only populates `title_en` (plus `rule_code` + rule-specific scalars — e.g. `restoration_window_days`, `threshold_percent`) — there is **no `title_hi` and no `body_*` field in the seed today**, so do not assume those keys exist; render whatever display-shaped string keys are actually present in a given payload (a readable key:value fallback for the rest), and treat any bilingual `_hi` companion fields as optional/future, not a current contract. The `payload` is **opaque** (freeze row 14 — Epic 4 owns rule semantics), so the rendered diff is a *display-field* rendering, not a rule interpretation. Keep it pragmatic; the authoritative bilingual display convention is finalized by Story 2.5's public render — coordinate, don't over-build here. Record any depth deferral in deferred-work.md. [Source: packages/domain/seed/niyamavali-v1-clauses.sql — verified actual payload keys; epics.md L1389 seam]

### Scope boundary (what 2.4 does NOT do)
- **No rule evaluation** — payloads are stored/diffed/resolved, never interpreted (Epic 4). [epics.md L1389]
- **No public render** — Story 2.5. 2.4 is admin-side authoring only.
- **UI surfaces create + amend + publish only.** The domain layer also has `splitClause`/`mergeClauses`/`deprecateClause` (write.ts L229-323), but AC1 lists only create/edit/preview/submit/publish. Do **not** build split/merge/deprecate UI in 2.4; note them as available domain ops for a later surface. (`deprecateClause` already throws on double-deprecation; `amendClause` already throws `ClauseNotFoundError` on a deprecated head — 2.3 review resolutions D2/D3, write.ts L163, L300.)
- **No scope→member resolution / no push delivery** — the notification hook is a placeholder (Epic 5).

### RBAC keys (already seeded — Story 1.8)
`niyamavali.amend` + `niyamavali.review` exist in `SEED_PERMISSION_KEYS` and the role bundles (roles.ts L60-61; permissions.ts L87-88). `Pariwar Admin` or higher carries `niyamavali.amend`. Use `requirePermissionHook(deps, 'niyamavali.amend' | 'niyamavali.review')` — the **tenant-scoped** hook (needs `request.scopeTx`), NOT `requireGlobalPermission`. [Source: packages/domain/src/rbac/{roles.ts,permissions.ts}; apps/api/src/modules/rbac/index.ts L68-110]

### Tenant-scoped route plumbing (the established convention)
Scoped routes mount under `/api/v1/p/:pariwarId/…` with `preHandler: [requireAdminSession(deps), scopeResolutionHook(deps), requirePermissionHook(deps, key)]`. The `scopeResolutionHook` opens the per-request scope tx (`SET LOCAL ROLE twt_app` + `SET LOCAL app.pariwar_id` inside a BEGIN) and sets `request.scopeTx`; the `multi-tenant` module's `onSend` hook COMMITs on <400 / ROLLBACKs otherwise and releases the client. Your handler runs domain accessors on `request.scopeTx.tx` (the RLS-scoped Drizzle handle). [Source: apps/api/src/modules/multi-tenant/index.ts L19-66; modules/multi-tenant/scope-tx.ts L36-78]

### Project Structure Notes
- API module: `apps/api/src/modules/rules/` (architecture source-tree L4274 §4.2 "Niyamavali rule registry (FR-7..11)"). Register in `server.ts`.
- Admin module: `apps/admin/src/modules/niyamavali-admin/` (architecture L4239) + `apps/admin/src/routes/` wrapper + `router.tsx` route. **The admin app uses TanStack Router code-based routing (DD-1) + a hand-written Zod-validated fetch client (DD-7) + TanStack Query — NOT file-based codegen or OpenAPI codegen.** Mirror the audit-integrity + pariwar-provisioning modules.
- Domain: `packages/domain/src/{schema/clause_drafts.ts, policies/clause-drafts-rls.ts, niyamavali/drafts.ts}`; extend `niyamavali/read.ts` + `ids/index.ts`; migration `0015`.
- Contracts: `packages/contracts/src/rules/clause.ts` (+ barrel) — **now with `.openapi()`** (first endpoints).
- Naming (architecture L3663-3677): DB snake_case, TS camelCase, JSONB snake_case keys; tables snake_case-plural.

### Testing standards summary
- Live-DB integration: `twt-test-pg` Docker on `:5433`; `DATABASE_URL` → `:5433`. Test login role is superuser (bypasses RLS) → `SET LOCAL ROLE twt_app` then `setPariwarScope` to exercise policies; afterEach ROLLBACK. Own-committing writers accumulate rows — assert membership, not counts. [Source: [[project_live_db_test_gotchas]]; packages/domain/tests/integration/_helpers.ts]
- **Fastify `onSend` caution:** the scope-tx lifecycle uses an async `onSend` hook; this is the documented surface where `void reply.status(204).send()`-style handlers expose `ERR_HTTP_HEADERS_SENT`. Return real bodies from your handlers (the provisioning routes do), and run the DB-gated API suites. [Source: [[project_fastify_onsend_doublesend]]]
- ESLint runs per-package; rule carve-out globs are cwd-relative role globs. [Source: [[project_eslint_config_per_package_cwd]]]
- Merge gate: `pnpm ci:local` (GitHub Actions suspended). [Source: [[project_ci_actions_suspension_local_mirror]]]

### References
- [Source: epics.md#Story-2.4 L1474-1490] — the user story + AC1-AC4 verbatim.
- [Source: epics.md#Epic-2 L1385-1403] — epic body, the shape-vs-engine seam, demoable closure, dependencies, label legend.
- [Source: _bmad-output/implementation-artifacts/2-3-…md] — the registry primitive this story consumes: write.ts/read.ts/errors.ts signatures, ADR-0020 decisions (audit_id nullable→NOT-NULL, RLS posture, affected_member_scope), the explicit 2.4 deferrals.
- [Source: packages/domain/src/niyamavali/{write.ts,read.ts,errors.ts,diff.ts,scope.ts}] — `createClause`/`amendClause`/`resolveByClauseId`/`computePayloadDiff`/`ClauseIdConflictError`/`ClauseNotFoundError`.
- [Source: packages/domain/src/tone-review/gate.ts L28-108 + apps/api/src/modules/tone-review/index.ts L175-279] — `ToneReviewSignoff`, `evaluateToneReviewGate`, `requireToneReviewSignoff`, `recordToneReviewSignoff`, `RequireToneReviewSignoffOptions`.
- [Source: packages/domain/src/audit/write.ts L71-188] — `AuditEntryInput`, `writeAuditEntry` returns `auditId` (audit-or-throw substrate).
- [Source: apps/api/src/modules/pariwar-provisioning/index.ts] — the golden route+audit module pattern (RBAC preHandler chain, scope tx, `auditSink.emit`, response mapping, rate-limit).
- [Source: apps/api/src/modules/multi-tenant/index.ts + modules/multi-tenant/scope-tx.ts] — the tenant-scoped route convention + scope-tx lifecycle.
- [Source: apps/api/src/modules/rbac/index.ts] — `requirePermissionHook` (scoped) vs `requireGlobalPermission`.
- [Source: apps/api/src/middleware/error-mapping/index.ts] — typed-error → HTTP envelope mapping (add the 409/404).
- [Source: apps/api/src/context.ts] — `AppDeps` (`db`, `pool`, `servicePool`, `toneReviewAuditSink`, `auditSink`, `clock`); add the notification-hook seam.
- [Source: packages/contracts/src/rules/clause.ts L31-139] — reuse `ClauseIdSchema`/`ClausePayloadSchema`/`AffectedMemberScopeSchema`/`DiffDocumentSchema`/`BenefitMechanism`; add endpoint DTOs with `.openapi()`.
- [Source: apps/admin/src/{router.tsx, api/client.ts, api/hooks.ts, modules/audit-integrity/*, modules/pariwar-provisioning/AddPariwarForm.tsx}] — admin app patterns.
- [Source: packages/domain/src/rbac/{roles.ts L60-61, permissions.ts L87-88}] — `niyamavali.amend`/`niyamavali.review` seeded keys.
- [Source: deferred-work.md L10, L12, L32, L33, L49, L50, L797, L809; gate-inventory.md L51, L55] — the deferrals this story closes + 0.13 (non-gating) dependency.
- [Source: architecture.md L1053-1066 (§1.10 scope), L1081-1099 (§1.11 DB-time), L4217/L4239/L4274/L4517 (source tree), L3663-3677 (naming)].
- [Source: ux-design-specification.md L48, L241-243, L1219, L1243] — Tier-2 trustee tooling = Niyamavali amendment workflow + diff view (organism enum deferred to §10; plain-language re-vet protocol is a human process, not a 2.4 build item).
- Memory: [[project_live_db_test_gotchas]], [[project_sprint_status_ledger]], [[project_eslint_config_per_package_cwd]], [[project_ci_actions_suspension_local_mirror]], [[project_fastify_onsend_doublesend]], [[feedback_closure_language_precision]], [[feedback_record_unattested_no_backfill]].

## Open Questions / Decisions for BigDev (resolve at dev-start; defaults chosen)
1. **Draft persistence model** — chosen: a dedicated `clause_drafts` table (server-persisted) because the non-author reviewer must load the exact pending content. Alternative (client-only draft) is rejected — it cannot satisfy AC1(d) cross-user review. **Confirm.**
2. **2.4 UI scope** — chosen: create + amend + publish only; split/merge/deprecate domain ops not surfaced (not in AC1). **Confirm** none are needed for the Epic 2 demo.
3. **Rendered-content diff depth** — chosen: render known display fields (`title_*`/`body_*`) + a readable key:value fallback; full bilingual display contract deferred to Story 2.5. **Confirm** this is sufficient for the diff-preview AC at 2.4.
4. **Payload authoring UX** — chosen: a guided form for display fields + `benefit_mechanism`/`effective_date`/`affected_member_scope`, payload stored opaque (no rule-evaluation semantics hardcoded — Epic 4 owns those). **Confirm** no raw-JSON editor is required for trustees at 2.4.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.8 (claude-opus-4-8) — bmad-dev-story workflow.

### Debug Log References

- `pnpm --filter @twt/domain db:generate` → `migrations/0015_strong_cerise.sql`; hand-supplemented the GRANT/FORCE + AC7 immutability trigger + AC8 De2 cross-tenant guard + De4 index; `db:migrate` + `db:check` clean against the live test DB (:5433).
- `pnpm contracts:emit-openapi` + `contracts:check-openapi-determinism` → green (first niyamavali endpoints; `openapi/v1.yaml` updated as expected).
- Live-DB suites (DATABASE_URL on :5433): `@twt/domain` 312 pass (incl. clause-drafts 14 + migration-0015-triggers 8 + drafts unit 8); `@twt/api` 131 pass (incl. niyamavali-workflow 9); `@twt/admin` 38 pass (incl. niyamavali derive 7 + diff-panel 5 + page 1).
- `pnpm ci:local` → **16 jobs green** (lint, typecheck, build, unit test, db-check, contracts-determinism, crypto-check, tokens-theme, i18n-parity, pii-scrape, friction-budget, schema-diff, benefit-mechanism, microcopy, cadence-check, integration-tests).

### Completion Notes List

- **Central net-new design (ADR-0021):** server-persisted `clause_drafts` table — the only way to satisfy AC1(b)/(d) (a non-author reviewer loading the exact pending content). State machine `draft→in_review→signed_off→published`(+`discarded`); partial-unique enforces at-most-one-open-draft-per-clause.
- **Content-bound sign-off (the subtle correctness point):** the tone-review gate does NOT compare content hashes — `resolveDraftSignoff` (pure `signoffFromDraftRow`) returns a sign-off only when `status=signed_off` AND `tone_review_content_hash === sha256(canonicalJson(current payload))`; `updateDraft` clears the sign-off on any edit. Net: edit-after-signoff ⇒ publish 409s until a fresh non-author sign-off.
- **Audit-or-throw publish (AC2/AC5):** the append-only amendment ledger cannot back-fill `audit_id`, so the publish writes the audit line FIRST and passes it (plus a PRE-GENERATED `clause_version_id`) into `createClause`/`amendClause` so BOTH the version row AND the amendment row carry `audit_id` non-null at INSERT, and the single audit line's hash commits the full provenance (diff + reviewer + clause_id + clause_version_id). `createClause`/`amendClause` gained an optional, backward-compatible `clauseVersionId` param to enable this. Orphan-audit-on-rollback is the accepted edge (documented in ADR-0021).
- **Deferred-work closures (binding):** AC4+AC5+AC6 + the 2.2 sign-off-persistence/gate-wiring + the 2.3 immutability-trigger/asOf/De2/De4 deferrals all landed; gate-inventory flipped the tone-review row to ENFORCING; ADR-0021 drafted.
- **Scope boundaries honored:** no rule evaluation (Epic 4); no public render (Story 2.5); create+amend UI only (split/merge/deprecate domain ops not surfaced); the member-notification hook is a placeholder seam (Epic 5).
- **Open Decisions #1–#4 confirmed as chosen:** dedicated `clause_drafts` table; create+amend+publish only; rendered-diff = display fields + readable key:value fallback; guided form (no raw-JSON editor).

### File List

**Domain (`packages/domain`)**
- `src/ids/index.ts` — added `ClauseDraftId` brand + `clauseDraftId` constructor (modified)
- `src/schema/clause_drafts.ts` — new `clause_drafts` table + enums + row types (new)
- `src/policies/clause-drafts-rls.ts` — tenant-isolation RLS (new)
- `src/schema/index.ts`, `src/policies/index.ts` — barrel registration (modified)
- `src/niyamavali/drafts.ts` — draft accessors + `draftContentHash` + `signoffFromDraftRow` + `resolveDraftSignoff` (new)
- `src/niyamavali/read.ts` — `listClauses` + `listAmendments` (modified)
- `src/niyamavali/write.ts` — optional `clauseVersionId` on create/amend (modified)
- `src/niyamavali/errors.ts` — `DraftNotFoundError`/`DraftStateError`/`DraftSelfReviewError` (modified)
- `src/niyamavali/index.ts`, `src/index.ts` — barrel + top-level error exports (modified)
- `migrations/0015_strong_cerise.sql` + `migrations/meta/{_journal.json,0015_snapshot.json}` — migration 0015 (new)
- `tests/niyamavali/drafts.test.ts` (new); `tests/integration/niyamavali/{clause-drafts,migration-0015-triggers}.spec.ts` (new)

**Contracts (`packages/contracts`)**
- `src/rules/clause.ts` — draft endpoint DTOs (`CreateClauseDraftRequest`/`AmendClauseDraftRequest`/`CreateDraftBody`/`UpdateClauseDraftRequest`/`ClauseDraftResponse`/`ToneReviewSignoffRequest`/`DiffPreviewResponse`/`PublishClauseResponse` + enums + `ClauseDraftIdSchema`) (modified)
- `src/rules/index.ts` — barrel comment (modified)
- `scripts/emit-openapi.ts` — register the niyamavali components + 11 endpoint paths (modified)
- `tests/rules.test.ts` — enum lockstep + `ClauseDraftResponse` type-assignability + DTO tests (modified)
- `openapi/v1.yaml` (repo root) — regenerated (modified)

**API (`apps/api`)**
- `src/modules/rules/index.ts` — the route module (new)
- `src/modules/rules/notification-hook.ts` — AC3 hook seam (new)
- `src/modules/rules/render-diff.ts` — rendered-content diff helper (new)
- `src/modules/rules/responses.ts` — DTO mappers (new)
- `src/context.ts` — `niyamavaliAmendedHook` on `AppDeps` (modified)
- `src/deps.ts` — wire the console hook (modified)
- `src/server.ts` — `registerRulesModule` (modified)
- `src/middleware/error-mapping/index.ts` — 409/404 + draft-error mapping (AC6) (modified)
- `tests/integration/_setup.ts` — capturing hook fake + PUT in `makeClient` (modified)
- `tests/integration/niyamavali-workflow.spec.ts` — full-flow + all-AC integration (new)

**Admin (`apps/admin`)**
- `src/api/client.ts` — niyamavali calls (modified)
- `src/api/hooks.ts` — niyamavali query/mutation hooks (modified)
- `src/modules/niyamavali-admin/{derive.ts,DiffPanel.tsx,DraftForm.tsx,NiyamavaliPage.tsx}` (new)
- `src/routes/NiyamavaliRoute.tsx` (new); `src/router.tsx` — register the scoped route (modified)
- `tests/{niyamavali-derive.test.ts,niyamavali-diff-panel.test.tsx,niyamavali-page.test.tsx}` (new)

**Governance / docs**
- `_bmad-output/implementation-artifacts/gate-inventory.md` — tone-review row → ENFORCING (modified)
- `_bmad-output/implementation-artifacts/deferred-work.md` — Story 2.4 resolutions + new deferrals (modified)
- `docs/adr/ADR-0021-niyamavali-draft-publish-workflow.md` (new)
- `docs/knowledge-transfer/adr-index.md` — ADR-0021 row + revision-log + counts → 139 (modified)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status → review + ledger entry (modified)

## Senior Developer Review (AI)

**Reviewer:** Codex (codex-cli, gpt-5.1-codex, model_reasoning_effort=high) via `bmad-story-automator-review`, finalized by Claude Sonnet 4.6 after the Codex session crashed (exit 1) post-fix, pre-writeup.

**Outcome:** Approve (0 CRITICAL issues remain after fixes).

### Findings

1. **[HIGH → FIXED] AC1(b) "edit a clause draft" had no UI affordance.** `DraftForm`/`NiyamavaliPage` only supported *create*; there was no way for a trustee to edit an existing draft (the domain layer's `updateDraft` — which correctly resets sign-off on any content change — was unreachable from the UI). Fixed: added `isEditable`, `buildDraftPatch`, `draftToFormFields` to `derive.ts`; wired an Edit/Save-changes flow through `DraftForm.tsx` → `NiyamavaliPage.tsx` → `useUpdateDraft` (`apps/admin/src/api/hooks.ts:150`) → `PUT /clauses/drafts/:draftId`. Covered by new tests in `niyamavali-derive.test.ts` (`isEditable`, `buildDraftPatch`, `draftToFormFields`) and `niyamavali-page.test.tsx` ("lets a trustee edit an existing draft and saves a patch").
2. **[HIGH → FIXED] `GET /clauses/drafts` (list drafts) was gated to `niyamavali.amend` only**, contradicting the route module's own documented intent (`apps/api/src/modules/rules/index.ts` header: "reads accept niyamavali.amend OR niyamavali.review — the non-author reviewer must load content") and blocking AC1(d)'s non-author reviewer from listing drafts awaiting their tone-review sign-off. Fixed: `preHandler` for the list route now uses the `read` gate (`requireNiyamavaliReadAccess`), consistent with the single-draft load and diff-preview routes which already used `read`.

### Verification (post-fix, this session)

- `pnpm --filter @twt/admin test` → 42/42 pass (incl. the new edit-flow + derive tests).
- `pnpm --filter @twt/admin typecheck` / `lint` → clean.
- `pnpm --filter @twt/api typecheck` / `lint` → clean.
- `pnpm --filter @twt/api test` (DATABASE_URL on :5433) → 131/131 pass, incl. `niyamavali-workflow.spec.ts` (9/9).
- `pnpm --filter @twt/contracts test` → 150/150 pass.
- `pnpm --filter @twt/domain test` (DATABASE_URL on :5433) → 312/313 pass; 1 failure (`pariwar-passport-policy-regression.spec.ts`, unrelated RLS suite) was a `testTimeout` under concurrent-suite DB load, reproduced as a pass in isolation (61ms) — flaky, not a regression from this story.

No MEDIUM/LOW issues recorded — re-examination per the adversarial-review re-check threshold found no further issues beyond the two above.

## Change Log

| Date | Change |
|---|---|
| 2026-06-21 | Story 2.4 implemented end-to-end (all 11 tasks, AC1–AC8). Migration 0015 (clause_drafts + AC7/AC8 triggers); domain draft accessors + content-bound resolver; first niyamavali endpoint contracts (.openapi()); apps/api rules module (tone-review-gated, audit-or-throw publish) + 409/404 error-mapping; admin niyamavali-admin UI + scoped route; AC3 notification hook seam. Governance: gate-inventory tone-review → ENFORCING; deferred-work 2.2/2.3 deferrals closed; ADR-0021 drafted. `pnpm ci:local` green (16 jobs). Status → review. |
| 2026-06-21 | Codex adversarial code review (`bmad-story-automator-review`): found + fixed 2 HIGH issues — missing edit-draft UI (AC1(b) gap) and an over-restrictive `niyamavali.amend`-only gate on the drafts-list route that blocked non-author reviewers (AC1(d)). Re-verified full suite green (admin/api/contracts/domain) post-fix. Status → done. |
