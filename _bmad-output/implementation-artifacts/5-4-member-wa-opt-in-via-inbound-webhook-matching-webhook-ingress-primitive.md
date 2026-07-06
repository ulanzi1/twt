---
baseline_commit: e4d49a87cbade6a65a88762ad216b5ea3d2dc7fd
---

# Story 5.4: Member WA Opt-In via Inbound-Webhook Matching + Webhook Ingress Primitive `[SURFACE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a member who wants to receive TWT notifications via WhatsApp,
I want to send a user-initiated WhatsApp message to my Pariwar's WA Business number, with my opt-in matched via an inbound-webhook handler,
so that my consent to receive WA notifications is explicit, member-initiated, audit-logged, and independently revocable.

## Acceptance Criteria

**AC1 — Member opt-in surface + Send-Hello deep-link (FR-72 + AR-16 + architecture freeze row 4).**
**Given** a member in the app whose Pariwar has WA Business enabled (`pariwar_wa_config.enabled = true` with a `display_phone_number`),
**When** they open the notification settings,
**Then** a "Receive notifications via WhatsApp" toggle is shown; tapping it mints a **PENDING** opt-in with a unique per-member **verification phrase**, and surfaces the Pariwar's WA Business number with a **"Send Hello" deep-link** (`https://wa.me/<display_number>?text=<url-encoded verification phrase>`) that opens WhatsApp pre-filled with that phrase.
**And** if the Pariwar has WA disabled or no number configured, the toggle is absent/disabled with an explanatory line (no PENDING is minted).

**AC2 — Webhook ingress primitive: persist + ack within Meta's 5s window (AR-44 + architecture §3.11).**
**Given** the inbound-webhook ingress primitive in `apps/api/src/modules/channel-webhooks/`,
**When** Meta POSTs an inbound-message (or message-status) webhook,
**Then** the handler **verifies the Meta `X-Hub-Signature-256` HMAC** over the raw body with the Pariwar's app secret, **persists the raw payload** to a dedicated webhook-queue table, and **ACKs 200** — all with **NO business logic, NO synchronous downstream calls, NO external API calls** in the handler path, and comfortably inside Meta's 5s timeout. A `GET` on the same route answers Meta's subscription-verification challenge (`hub.mode` / `hub.verify_token` / `hub.challenge`).
**And** an invalid/absent signature fails **closed** (403/404, minimal body) and persists nothing.

**AC3 — Inbound match advances opt-in to ACTIVE (AR-16).**
**Given** a persisted inbound-message webhook event and a PENDING opt-in,
**When** the async worker drains the queue,
**Then** it matches the inbound message to a PENDING opt-in by **mobile (blind index) + verification phrase**; on match the opt-in state advances to **ACTIVE**, the Meta 24h customer-service window opens (window-expiry timestamp recorded), a canonical consent row is recorded (`consent_type: whatsapp_opt_in`), and the member sees confirmation in-app on next read.
**And** a mismatch (number not on file, or phrase not matching any PENDING) is logged and left un-matched (no state change; surfaced for member confirmation per architecture §3.4) — never a silent wrong-member ACTIVE.

**AC4 — Opt-in reversibility + independent audit invariant (this story's load-bearing commitment; Story 1.10 + Story 2.7).**
**Given** an opt-in OR opt-out event (member-initiated revocation from app settings, Meta-side block / "STOP" inbound, or trustee admin action),
**When** the event occurs,
**Then** it is **independently audit-logged** via Story 1.10 with all five fields: (a) `timestamp`, (b) `originating_channel` (`member_app | meta_webhook_inbound | meta_webhook_block | admin_action`), (c) `matched_member_identity` (linked `member_id` + verification phrase matched), (d) `current_consent_state_snapshot` (opt-in state **before AND after** the transition: `PENDING | ACTIVE | REVOKED | BLOCKED_BY_META | EXPIRED_24H_WINDOW`), (e) `audit_id` linkage to the canonical hash chain.
**And** opt-in records persist via Story 2.7's consent registry as `consent_type: whatsapp_opt_in` — the registry is the canonical "did this member have valid WA consent at time Y?" query surface (`consentExists`).
**And** the opt-in is **independently revocable** — a member can revoke from app settings without affecting any other consent type; revocation immediately disables WA delivery for that member; future re-opt-in is permitted but **requires a new user-initiated WA message** (no inferred re-consent — a new PENDING + verification phrase).

**AC5 — Full auditable history for compliance review (DPDPA + trustee defensibility).**
**Given** any consent dispute or audit query,
**When** the full opt-in / revocation history for a member is requested,
**Then** it is queryable in chronological order with all five required fields per audit line; **no inferred state** — every transition has its own auditable event carrying the before/after consent-state snapshot.

**AC6 — WA delivery-resolver opt-in gate goes live (closes the Story 5.3 seam).**
**Given** Story 5.3 left the `DeliveryResolver` WA arm resolving **no** member target "until 5.4 lands its ACTIVE-state read,"
**When** this story lands the opt-in read model,
**Then** the composition-layer WA delivery resolver resolves a WA target for a member **only** when BOTH gates pass: the Pariwar admin toggle (`enabled`, 5.3) **and** the member opt-in ACTIVE + within the 24h window (this story) — wiring the `resolveWaTarget` read into composition **without** changing the frozen `DeliveryResolver` / `dispatch` / `ChannelProvider` / `CANONICAL_CHANNEL_LADDER`.

## Tasks / Subtasks

> **Read before you start.** This is a `[SURFACE]` story spanning domain substrate → webhook ingress primitive → async worker → member API → mobile UI → composition wiring → ADR. It builds **live ingress processing** (matching, state transitions, status persistence) — this is **not** the frozen `dispatch` fan-out ([[project_channels_no_live_dispatch_yet]]); the webhook worker is ingress, not dispatch. Do NOT change `ChannelProvider`, `DeliveryResolver`, `dispatch`, or `CANONICAL_CHANNEL_LADDER` shapes — AC6 is composition wiring only. Follow the exact substrate + factory + fixture + audit-or-throw shapes Stories 5.1–5.3 and 2.7 established. **Verify every Meta-specific fact (webhook payload shape, signature header/algorithm, GET-challenge params, error semantics) against the current Meta WhatsApp Cloud API docs at implement time — do NOT hardcode from memory** (the same caveat 5.3 applied to graph version + error codes).

### Task 1 — Consent-type enum: add `whatsapp_opt_in` (AC4) `[domain + contracts]`

- [x] Add `'whatsapp_opt_in'` to the domain `consentTypeEnum` (`packages/domain/src/schema/consent_records.ts`) — the schema header **explicitly names this as the Epic-5 additive** ("New consent types (e.g. `whatsapp_opt_in` Epic 5 …) are added by their OWN consumer epic via an additive `ALTER TYPE … ADD VALUE` migration"). Append at the END of the enum list (never reorder — reordering an existing pgEnum breaks stored ordinals).
- [x] Add `'whatsapp_opt_in'` to the contracts `ConsentTypeSchema` z.enum (`packages/contracts/src/consent/consent-record.ts`) — **lockstep**: the two lists are duplicated because `@twt/domain` cannot import `@twt/contracts` (turbo cycle); `packages/contracts/tests/consent.test.ts` asserts equality of the pgEnum `.enumValues` ↔ the z.enum `.options`. Both must change together or the anti-drift test fails.
- [x] Migration: `ALTER TYPE consent_type ADD VALUE 'whatsapp_opt_in'`. **Gotcha:** `ALTER TYPE … ADD VALUE` cannot run inside a transaction block on Postgres, and a newly added enum value cannot be USED in the same transaction it was added — generate this as its OWN migration file, separate from any migration that inserts a `whatsapp_opt_in` row. Let `drizzle-kit generate` emit it; never hand-edit an already-applied migration ([[project_live_db_test_gotchas]]).

### Task 2 — `pariwar_wa_config` additive columns: webhook credentials (AC2) `[domain]`

- [x] Add two additive columns to `pariwar_wa_config` (`packages/domain/src/schema/pariwar_wa_config.ts`), both **Secret-Manager NAME pointers** (plain `text`, NULLABLE, NEVER the secret value — the AI-4-3(c) credential-name-is-a-pointer discipline the table already uses for `access_token_secret_name`):
  - `app_secret_secret_name` — the NAME of the Meta **app secret** used to verify inbound `X-Hub-Signature-256` (HMAC-SHA256 over the raw request body). NULL ⇒ this Pariwar's webhook cannot be verified ⇒ ingress rejects (fail-closed).
  - `webhook_verify_token_secret_name` — the NAME of the token echoed in Meta's `GET` subscription-verification challenge (`hub.verify_token`). NULL ⇒ GET challenge fails-closed.
- [x] Extend the `channelConfig` WA-config accessors + `WaConfigResponse` / `WaConfigUpsertRequest` contracts + the trustee admin form (`apps/admin`) to read/write the two new NAME fields — mirror how `access_token_secret_name` flows through `handlers.ts` `putWaConfig` (audited over the NON-secret fields; a NAME is a safe pointer, the resolved value never appears). This is the EXPECTED openapi/v1.yaml + admin-form diff.
- [x] Add a domain reverse-lookup accessor `getWaConfigByPhoneNumberId(db, phoneNumberId)` (tenant-scoped read) — the worker needs Pariwar-from-`phone_number_id` when correlating a persisted event (the URL path already carries `pariwarId` for signature verification; this backs cross-checks + status-callback correlation).

### Task 3 — `member_wa_opt_in` state-machine substrate (AC1, AC3, AC4) `[domain]`

- [x] New table `member_wa_opt_in` (`packages/domain/src/schema/member_wa_opt_in.ts`), TENANT-ISOLATED inline RLS (the 0037/0038 `member_device_tokens` / `pariwar_wa_config` pattern — NOT a cross-tenant carve-out). Columns:
  - `opt_in_id` uuid PK `defaultRandom()`, branded `MemberWaOptInId` (add to `packages/domain/src/ids/index.ts`).
  - `pariwar_id` uuid NOT NULL, branded `PariwarId` (tenant/RLS key).
  - `member_id` uuid NOT NULL (the member subject; matches the consent-registry `subject_id` convention — polymorphic, NO FK, NO brand, since `members` cross-references live in Epic 3; mirror `consent_records.subject_id`).
  - `state` — a `pgEnum('wa_opt_in_state', [...])` over **`PENDING | ACTIVE | REVOKED | BLOCKED_BY_META | EXPIRED_24H_WINDOW`** (lockstep-assert against a contracts z.enum, same discipline as `consent_type`).
  - `verification_phrase` text NOT NULL — the unique per-PENDING match token pre-filled into the Send-Hello deep-link (see Dev Notes "Verification-phrase generation"). **DB-enforced uniqueness:** add a **partial unique index** `UNIQUE (pariwar_id, verification_phrase) WHERE state = 'PENDING'` so two concurrently-outstanding PENDING opt-ins in a Pariwar can NEVER share a phrase (a collision would let one member's inbound WA message match another member's PENDING → wrong-member ACTIVE, an AC3/AC4 integrity break). Partial (not global) so a phrase is free to recur across historical/terminal rows. `createPendingOptIn` must **retry-on-conflict**: on a `23505` unique violation, regenerate the phrase and re-insert (bounded retries) — never surface the raw Postgres error.
  - `mobile_blind_index` text NOT NULL — deterministic HMAC of the member's mobile (the SAME `member_identities.mobile_blind_index` value, computed at the apps/api boundary via the `mobileBlindIndex` helper — the domain never sees plaintext; mirror `search-read.ts`). The inbound match key.
  - `window_expires_at` timestamptz NULL — the Meta 24h customer-service window end, set on ACTIVE transition; NULL while PENDING.
  - `consent_id` uuid NULL — FK-free link to the `consent_records` row minted on ACTIVE (the registry is canonical; this is a convenience back-reference).
  - timestamps (`created_at`, `updated_at`) + `matched_at` timestamptz NULL (set when a webhook match flips PENDING→ACTIVE).
  - Index on `(pariwar_id, mobile_blind_index, state)` (the worker's PENDING-match lookup) and `(pariwar_id, member_id)` (the member-status read).
- [x] Domain accessors (`packages/domain/src/channel-config/wa-opt-in.ts` or a new `wa-opt-in/` module — mirror the consent read/write/errors split):
  - `createPendingOptIn(db, {pariwarId, memberId, mobileBlindIndex, verificationPhrase})` — inserts a PENDING row. Reject a second PENDING for the same `(pariwar_id, member_id)` while one is outstanding (typed error) — a member re-tapping the toggle re-uses / re-issues, not duplicates.
  - `matchPendingOptIn(db, {pariwarId, mobileBlindIndex, verificationPhrase})` → the PENDING row or null (the worker's match query).
  - `activateOptIn(db, {optInId, windowExpiresAt, consentId})` — PENDING→ACTIVE with guards (illegal from non-PENDING → typed error).
  - `revokeOptIn(db, {optInId, toState})` — ACTIVE→REVOKED (member/STOP) or ACTIVE→BLOCKED_BY_META (Meta block) or PENDING→EXPIRED_24H_WINDOW; guards on legal transitions.
  - `getOptInForMember(db, {pariwarId, memberId})` — latest opt-in row (member-status read + the AC6 resolver gate).
  - `isOptInActive(db, {pariwarId, memberId, at?})` — boolean gate: ACTIVE **and** (`window_expires_at` is null OR `at < window_expires_at`) — the composition WA resolver consumes this alongside `consentExists`.
- [x] Follow the 2.7 **audit-linkage-is-a-consumer-obligation** posture: these accessors accept a caller-supplied `auditId` where a transition is audited but do NOT open their own transaction or write audit lines (the route/worker writes the audit line FIRST, threads the id — audit-or-throw). Mirror `consent/write.ts` exactly.

### Task 4 — Webhook-queue substrate + ingress primitive (AC2) `[domain + apps/api]`

- [x] New table `wa_inbound_webhook_events` (`packages/domain/src/schema/wa_inbound_webhook_events.ts`) — the §3.11 dedicated webhook-queue table. Columns: `event_id` uuid PK; `pariwar_id` uuid NOT NULL (from the URL path — RLS key); `raw_payload` jsonb NOT NULL (the verified inbound body, stored intact for the worker + provenance); `signature_verified` boolean NOT NULL; `processed_at` timestamptz NULL (worker sets on drain — un-processed = NULL); `received_at` timestamptz NOT NULL default now(); index on `(processed_at)` for the drain scan. TENANT-ISOLATED inline RLS; the raw payload is Meta-opaque webhook data (numbers appear — treat as operational, NOT Tier-1 envelope-encrypted; document the PII call in the schema header like `whatsapp_send_status`).
- [x] Domain accessors: `persistInboundWebhookEvent(db, {...})` (insert; runs on the ingress request tx) and `claimUnprocessedWebhookEvents(db, limit)` / `markWebhookEventProcessed(db, eventId)` (worker drain).
- [x] New module `apps/api/src/modules/channel-webhooks/` — the **ingress primitive**. Routes (per-Pariwar path so the app secret is known BEFORE the body is trusted — see Dev Notes "Per-Pariwar webhook path"):
  - `GET /api/v1/webhooks/whatsapp/:pariwarId` — Meta subscription verification. Resolve the Pariwar's `webhook_verify_token_secret_name` → value; if `hub.mode === 'subscribe'` AND `hub.verify_token` matches, respond **200 with the raw `hub.challenge` string** (Meta requires the bare challenge echoed); else 403. NO session guard (Meta is unauthenticated — the verify-token IS the auth).
  - `POST /api/v1/webhooks/whatsapp/:pariwarId` — the persist+ack receiver. Steps, in order: (1) capture the **RAW request body** (see Dev Notes "Raw-body capture" — you need the exact bytes for the HMAC), (2) resolve the Pariwar's `app_secret_secret_name` → value and verify `X-Hub-Signature-256` = `sha256=` + HMAC-SHA256(rawBody, appSecret) using a **timing-safe compare** (`crypto.timingSafeEqual`), (3) on failure → fail-closed (403/404, minimal body, persist nothing), (4) on success → `persistInboundWebhookEvent` on the RLS-scoped tx, (5) **respond 200 with a minimal body**. NO matching, NO consent write, NO audit, NO external call here — all that is Task 5's worker. Keep the handler p99 well under 5s.
  - The route is **login-wall-exempt** (no session guard) — add it to the login-wall allowlist with a comment (mirror how other unauthenticated public routes are allowlisted; the login-wall CI gate — [[project_eslint_config_per_package_cwd]] adjacent — fails on un-guarded, non-allowlisted routes). The webhook's auth is the Meta signature, not a session.
  - CSRF: this is a machine-to-machine POST with no cookie; it is NOT under the `app.csrfProtection` double-submit set (that is `logout`-only per the 1.11a review) — do NOT add CSRF to it. The origin/signature check is the protection.

### Task 5 — Async webhook worker: match, transition, status (AC3, AC4) `[apps/jobs]`

- [x] New worker `apps/jobs/src/wa-webhook-processor.ts` (register in `apps/jobs/src/index.ts` + boot, mirror `device-token-cleanup.ts` / the pg-boss job-class pattern from Story 1.12). It drains `wa_inbound_webhook_events` (`claimUnprocessedWebhookEvents`) and, per event, parses the Meta payload and branches:
  - **Inbound text message** → compute the sender's `mobile_blind_index` (the `from` msisdn via the `mobileBlindIndex` helper) → `matchPendingOptIn` by (blindIndex, verification phrase extracted from the message text). On match: write the audit line FIRST (5 fields; `originating_channel: meta_webhook_inbound`; before-state `PENDING`, after-state `ACTIVE`), then in one scoped tx `recordConsent({consentType:'whatsapp_opt_in', grantedViaActor:'member_self', auditId})` + `activateOptIn({windowExpiresAt: now+24h, consentId})` — audit-or-throw (audit id threaded; tx rollback ⇒ no ACTIVE without an audit line). On no-match: log + leave un-processed-into-matched (surface for member confirmation), no state change.
  - **Inbound "STOP" / opt-out keyword** → an opt-out signal. **Explicit STOP matching semantics (do not guess):** (1) resolve the sender to a member the SAME way as a match — the inbound `from` msisdn → `mobileBlindIndex` → the member's **ACTIVE** opt-in in this Pariwar (a STOP is scoped to a member's active opt-in, NOT phrase-matched — a STOP carries no verification phrase). (2) Keyword test: the message body, **trimmed + case-folded, matched as the WHOLE message** (not a substring — a legitimate sentence containing "stop" must NOT revoke), equals one of a small allowlist — **`STOP`** (Meta/WhatsApp's own opt-out keyword) plus documented synonyms `UNSUBSCRIBE` / `CANCEL` / the Hindi equivalent (confirm the exact set against Meta's opt-out-keyword docs + the Story 2.1 i18n copy at implement time). (3) On a keyword match with an ACTIVE opt-in: audit (`meta_webhook_inbound`, before `ACTIVE`, after `REVOKED`) then `revokeConsent` + `revokeOptIn(REVOKED)`. (4) A STOP from a member with **no ACTIVE opt-in** (already revoked, never opted in, or only PENDING) is a **no-op** (log + mark processed) — idempotent, never an illegal transition. Meta ALSO surfaces user opt-out as a `statuses[].status = failed` with an opt-out error code — that path is authoritative for **BLOCKED_BY_META** (below); this inbound-keyword path handles the in-conversation "STOP" text.
  - **Message-status callback** (delivered/read/failed/blocked) → consume Story 5.3's exported `mapMetaStatus(metaStatus)` + `upsertWaSendStatus(...)` (the Q2 ownership split — 5.4 owns the receiver, 5.3 owns the mapping + persistence seam). A `blocked` status additionally transitions the member's opt-in to **BLOCKED_BY_META** (audit `meta_webhook_block`, before `ACTIVE`, after `BLOCKED_BY_META`) + `revokeConsent`.
  - Mark the event `processed_at` at the end (idempotent — re-draining a processed event is a no-op; the wamid upsert + opt-in transition guards make replays safe).
- [x] A separate periodic sweep (or fold into the same worker) expires stale PENDING opt-ins that never received an inbound match after a bounded TTL, and transitions ACTIVE→EXPIRED_24H_WINDOW when `window_expires_at` passes. Audit each with **`originating_channel: system_expiry`** (the confirmed fifth channel value for time-based, system-originated transitions — `actorId: null`, before-state `PENDING`/`ACTIVE`, after-state `EXPIRED_24H_WINDOW`). Reuse the `member-renewal-lifecycle.ts` scheduled-sweep shape.
- [x] Best-effort / isolated writes on the worker's own pool (NOT a request tx — the worker holds none), the AI-4-3(d) posture `push-invalidation.ts` documents: a broken write logs and continues; never poison the queue drain.

### Task 6 — Member-facing API + mobile surface (AC1, AC4) `[apps/api + apps/mobile]`

- [x] Member routes (`apps/api/src/modules/channel-webhooks/` or a sibling `wa-opt-in/` module), all `requireMemberSession`-gated (token-bearer; `request.requestContext.actorId = member_id`, `.pariwarId` — the `device-token.routes.ts` member precedent):
  - `POST /api/v1/member/wa-opt-in` — mint a PENDING (generate verification phrase, compute the member's `mobileBlindIndex` at the boundary, `createPendingOptIn`), audit (`member_app`, before `null/none`, after `PENDING`), and RETURN `{ displayPhoneNumber, deepLink, verificationPhrase, state }`. 409 if the Pariwar has WA disabled/no number.
  - `GET /api/v1/member/wa-opt-in` — current opt-in state for the member (drives the settings toggle + confirmation/retry copy).
  - `DELETE /api/v1/member/wa-opt-in` (or `POST …/revoke`) — member-initiated revocation: audit (`member_app`, before `ACTIVE`, after `REVOKED`) then `revokeConsent` + `revokeOptIn(REVOKED)`. Independently revocable — touches ONLY `whatsapp_opt_in`, never another consent type (AC4).
  - New contracts DTOs in `packages/contracts/src/…` (registered in openapi/v1.yaml — the EXPECTED diff); reuse the consent DTO conventions.
- [x] Mobile settings surface (`apps/mobile`) — add a "Receive notifications via WhatsApp" row in the notification-settings screen (create the settings screen if none exists under `apps/mobile/app/(tabs)` / a settings route; check existing screen patterns + `apps/mobile/lib/member-api.ts` for the API-client convention). States: **off/retry** (CTA "Want WhatsApp notifications? Tap here to enable" → calls `POST wa-opt-in` → opens the deep-link via `Linking.openURL`), **pending** ("Waiting for your WhatsApp message…"), **active** (confirmation + a revoke control), **blocked/expired** (retry CTA). Bilingual copy via the i18n utility (Story 2.1 — hi/en parity; the i18n-parity CI gate). No AsyncStorage — use `lib/mmkv` if any local persistence is needed ([[project_mmkv_asyncstorage_equivalent]]).
- [x] Trustee **admin opt-out** (`originating_channel: admin_action`) — a scoped-admin route to force a member's WA opt-out (trustee defensibility). Gate on the **existing `member.moderate` RBAC key** (the confirmed reuse — an admin acting on a member's opt-in is a moderation WRITE, semantically parallel to `member.suspend`/`member.moderate`; `pariwar.configure_channels` is per-Pariwar channel config, NOT a per-member action, so it does NOT fit). **No catalog bump** — `PERMISSION_CATALOG_VERSION` stays 5; adding a key would force 5→6 + the RBAC catalog CI gate, and no new key is needed. Chain: `[requireAdminSession, scopeResolutionHook, requirePermissionHook(member.moderate)]` (the channel-config admin precedent). Audit (`admin_action`, before/after snapshot) + `revokeConsent` + `revokeOptIn`.

### Task 7 — Composition wiring: WA resolver opt-in gate goes live (AC6) `[apps/api composition]`

- [x] Wire the composition-layer WA delivery resolver (`apps/api/src/modules/channel-config/composition.ts`, the `resolveWhatsappProviderDeps` neighbourhood) so the WA-target read now consults `isOptInActive(pariwarId, memberId, at)` (this story) **AND** the config `enabled` toggle (5.3) — 5.3 explicitly left this arm "resolving no member target until 5.4 lands its ACTIVE-state read." This is composition wiring ONLY — do **NOT** modify `DeliveryResolver`, `dispatch`, `ChannelProvider`, or `CANONICAL_CHANNEL_LADDER` ([[project_channels_no_live_dispatch_yet]]). There is still **no live `dispatch` call site** — ship the reusable resolver read, and record seam-vs-live in the Dev Agent Record (as 5.2/5.3 did).

### Task 8 — ADR + tests + merge gate

- [x] **ADR** (next free number after ADR-0028): record the **webhook-ingress design** — per-Pariwar webhook URL path, per-Pariwar app-secret signature verification, persist-and-ack-within-5s, async-worker processing, and the opt-in-lifecycle-state-table + consent-registry-canonical split. This is a cloud-control / external-dependency decision → an ADR, not only Dev Notes ([[feedback_architecture_vs_adr_boundary]]). Mirror ADR-0028's structure (Status/Date/Author/Ratifying-trustees + Alternatives/References/Changelog).
- [x] **Access-wrapper walk (AI-4-3 a–e)** for the member routes + admin route + webhook ingress: (a) caller-auth verified (member session / admin session+permission / Meta signature); (b) omitted/failed auth fails **closed** (401/403 for sessions; 403/404 for a bad signature — never persist an unverified event); (c) no secret value in any audit line (the app-secret / verify-token NAMEs are pointers; resolved values never logged/audited); (d) best-effort worker writes isolated; (e) route scopes match their guards. The `access-wrapper:check` AST gate scans only `packages/validity-service`, so record this walk in the Dev Agent Record.
- [x] **Tests.** Unit (`.test.ts`, DB-free): signature-verification pass/fail (timing-safe, wrong secret, tampered body), GET-challenge match/mismatch, Meta-payload parsing (inbound text / STOP / status-callback branches), verification-phrase generation uniqueness, opt-in state-machine transition guards, `isOptInActive` window logic. Integration (`tests/integration/**/*.spec.ts`, live-DB, `describe.skipIf(!hasDatabase)`, `pool: 'forks'`): webhook persist+ack E2E, worker match→ACTIVE + consent row + audit line (all 5 fields), STOP→REVOKED, block→BLOCKED_BY_META, member opt-in/revoke routes (fail-closed + audit-no-secret), consent-registry `consentExists('whatsapp_opt_in')` after ACTIVE, RLS tenant isolation on all three new tables, the enum lockstep test. NEVER hit a real Meta network in tests.
- [x] **Merge gate** `pnpm ci:local` (mirrors all 14 ci.yml jobs — [[project_ci_actions_suspension_local_mirror.md]]; integration needs `DATABASE_URL` on :5433). Expect green on: lint, typecheck, build, db-check, **schema-diff** (4 new/changed tables + config columns + consent enum are the EXPECTED diff), contracts-determinism (new member wa-opt-in DTOs + config-field additions = EXPECTED openapi diff), channels-determinism (NO change — you consume 5.3 seams, don't touch them), crypto-check, access-wrapper-invariants, RBAC catalog (only bumps IF you add a permission), friction-budget (the new mobile settings surface must stay under the page-weight ceiling — [[project_friction_budget_baseline_ratchet]]), **i18n-parity** (hi/en for all new member copy), pii-scrape, login-wall (the webhook allowlist entry). The `test`/`integration-tests` turbo jobs may surface the DOCUMENTED live-DB concurrency flakes under parallel load ([[project_known_livedb_test_failures]], [[project_ci_local_concurrency_oversubscription]]) — confirm any suspect innocent by running it in isolation; no Story-5.4 spec should be among them.
- [x] Update `sprint-status.yaml`: flip `5-4-…` `ready-for-dev → in-progress → review` and add the top-of-file reverse-chron COMMENT ledger entry at completion ([[project_sprint_status_ledger]]).

### Review Findings

_Code review run 2026-07-06 (Blind Hunter + Edge Case Hunter + Acceptance Auditor, full mode against this story)._

- [x] [Review][Patch] Add basic normalization to inbound verification-phrase matching — case-fold + normalize dash/whitespace variants before matching, so an autocorrected or manually-retyped message still matches (resolved from [Decision]; BigDev 2026-07-06) [packages/domain/src/wa-opt-in/phrase.ts:37-46]
- [x] [Review][Patch] Update mobile "Waiting for your WhatsApp message…" copy to disclose up-to-~60s confirmation latency, no cron change (resolved from [Decision]; BigDev 2026-07-06) [apps/mobile/app/(settings)/notifications.tsx]

- [x] [Review][Patch] Audit-before-state-write has no compensation on failure, violating the codebase's MANDATORY P1 compensating-audit pattern (AC4/AC5's "load-bearing" invariant) — no compensating `*_rolled_back` audit line if the consent+state tx fails after the audit already committed, unlike the established precedent in `terms/member-terms.handlers.ts` and `medical.handlers.ts` [apps/api/src/modules/wa-opt-in/handlers.ts:188-232; apps/jobs/src/wa-webhook-processor.ts:244-266]
- [x] [Review][Patch] Domain opt-in errors documented as wired into error-mapping but never imported there — `WaOptInPendingExistsError`/`WaOptInStateError`/`WaOptInNotFoundError` fall through to a generic 500 instead of the documented 404/409 under concurrent races [apps/api/src/middleware/error-mapping/index.ts; apps/api/src/modules/wa-opt-in/handlers.ts:597-665,703-747]
- [x] [Review][Patch] GET-challenge `hub.verify_token` compared with plain `!==` instead of a constant-time compare, unlike every other secret comparison in this story [apps/api/src/modules/channel-webhooks/handlers.ts:68-69]
- [x] [Review][Patch] No DB-enforced uniqueness on one-outstanding-PENDING-per-member — SELECT-then-INSERT race can create two live PENDING rows for one member; also untested [packages/domain/src/wa-opt-in/write.ts:5122-5140]
- [x] [Review][Patch] `claimUnprocessedWebhookEvents` lacks `FOR UPDATE SKIP LOCKED` — overlapping worker ticks/replicas can double-process the same event [packages/domain/src/wa-opt-in/webhook-events.ts:54-63]
- [x] [Review][Patch] Malformed webhook payload shape throws outside the per-item try/catch — the event is never marked processed and is retried+re-thrown every tick, poisoning the drain [apps/jobs/src/wa-webhook-processor.ts:179-224]
- [x] [Review][Patch] Trailing `markWebhookEventProcessed` call sits outside per-item guards — a late throw after partial success causes full-event reprocessing, relying on untested idempotency [apps/jobs/src/wa-webhook-processor.ts]
- [x] [Review][Patch] `windowExpiresAt` computed from the worker's local clock instead of DB `now()` — clock skew shifts the 24h window boundary vs `isOptInActive`'s DB-based check [apps/jobs/src/wa-webhook-processor.ts:254]
- [x] [Review][Patch] STOP-keyword matching lacks Unicode (NFKC) normalization/zero-width-char handling — a legitimate opt-out message can be silently ignored [apps/jobs/src/wa-webhook-processor.ts:87-91]
- [x] [Review][Patch] Mobile deep-link `Linking.openURL` has no catch — an unhandled rejection (WhatsApp not installed) leaves no error shown and the busy state stuck [apps/mobile/app/(settings)/notifications.tsx:67-69]
- [x] [Review][Patch] `buildSendHelloDeepLink` doesn't validate `displayPhoneNumber` has digits before building the wa.me link — malformed admin config silently produces a broken deep-link [apps/api/src/modules/wa-opt-in/handlers.ts:29-32]
- [x] [Review][Patch] AC4's `matched_member_identity`/verification-phrase audit field is populated only on the worker's inbound-match transition, omitted on mint/revoke/admin-revoke/STOP/block/expiry even when already in hand [packages/domain/src/wa-opt-in/audit.ts; apps/api/src/modules/wa-opt-in/handlers.ts; apps/jobs/src/wa-webhook-processor.ts]
- [x] [Review][Patch] `CreateWaOptInResponse.state` typed against the full 5-value enum though `mint()` only ever returns `PENDING` [packages/contracts/src/wa-opt-in/opt-in.ts]
- [x] [Review][Patch] Blind-index/mobile-normalization logic duplicated apps/api ↔ apps/jobs with no shared parity test enforcing it stays byte-identical [apps/jobs/src/wa-webhook-processor.ts]
- [x] [Review][Patch] Inbound message handling has no explicit `type === 'text'` guard — relies implicitly on extraction functions returning empty for non-text payloads [apps/jobs/src/wa-webhook-processor.ts]

- [x] [Review][Defer] TOCTOU on webhook config read vs event persist (two separate transactions) — `POST /webhooks/whatsapp/:pariwarId` opens one scope tx to read `pariwar_wa_config` (secret names) and a second, independent scope tx to persist the event [apps/api/src/modules/channel-webhooks/handlers.ts] — deferred, secret rotation is rare; accepted as a narrow pre-existing-style risk (BigDev 2026-07-06)
- [x] [Review][Defer] Webhook GET/POST endpoints have no app-level rate limiting — a flood of garbage requests still triggers a Secret-Manager lookup + DB tx per request before failing closed [apps/api/src/modules/channel-webhooks/handlers.ts] — deferred, pre-existing pattern (no other public route in this codebase has app-level rate limiting either; infra/gateway-level concern)
- [x] [Review][Defer] Hardcoded Meta error codes (`WA_BLOCK_ERROR_CODES`) and `STOP_KEYWORDS` have no config-override surface [apps/jobs/src/wa-webhook-processor.ts] — deferred, already explicitly disclosed as an indicative/verify-at-deploy-time caveat in this story's own Dev Agent Record

## Dev Notes

### What this story IS vs IS NOT

- **IS:** the member WA **opt-in flow** (settings toggle + Send-Hello deep-link + verification phrase), the **inbound-webhook ingress primitive** (`apps/api/src/modules/channel-webhooks/`, Meta signature verification + persist-and-ack-within-5s per AR-44/§3.11), the **opt-in state machine** (`PENDING | ACTIVE | REVOKED | BLOCKED_BY_META | EXPIRED_24H_WINDOW`) as a domain substrate, the **consent-registry integration** (`whatsapp_opt_in`), the **five-field independent audit** of every opt-in/opt-out transition, the **async worker** that matches inbound messages + processes status callbacks (consuming 5.3's `mapMetaStatus` + `upsertWaSendStatus`), and the **composition wiring** that makes the WA delivery resolver's member-opt-in gate live (AC6).
- **IS NOT:** the outbound WA transport / provider / config table / templates (**Story 5.3** — DONE; you consume its seams, never change them). NOT the live `dispatch` fan-out ([[project_channels_no_live_dispatch_yet]] — the webhook worker is INGRESS processing, not dispatch). NOT the push→WA→SMS fallback ladder (5.6). NOT cost-optimization (5.7) or degraded-mode SMS bridge (5.8). NOT step-up-OTP delivery (5.9). NOT Telegram (5.5). NOT the `mapMetaStatus` function or the `whatsapp_send_status` persistence seam (both are Story 5.3's — you CALL them).

### The 5.3 → 5.4 boundary (Q2 ownership split, CONFIRMED by BigDev 2026-07-05)

Story 5.3 explicitly deferred to this story and left seams ready:
- **5.3 OWNS (done):** outbound WA transport, Meta request construction, the pure `mapMetaStatus(metaStatus) → SendStatus['state']` (`packages/channels/src/providers/whatsapp-status.ts`), and the per-send status-update repository seam `upsertWaSendStatus` (`packages/domain/src/channel-config/wa-status.ts`, `whatsapp_send_status` table).
- **5.4 OWNS (this story):** the HTTP webhook receiver/endpoint, Meta signature verification, payload parsing, retries, and the 5s ack — and it CONSUMES 5.3's exported `mapMetaStatus` + `upsertWaSendStatus`. [Source: 5-3 Dev Notes "WA send-status webhook — ownership split"; whatsapp-status.ts header lines 1-10]
- 5.3 also left the `DeliveryResolver` WA arm "resolving no member target until 5.4 lands its ACTIVE-state read" and shipped only the admin `enabled` toggle gate — **AC6 lands the member-opt-in half** so both gates are live in composition. [Source: 5-3 Dev Notes lines 87, 201, 245]

### Opt-in state model: state table + consent registry (the crux)

The consent registry (Story 2.7) records only **grant** (`granted_at` + `audit_id`) and **revoke** (`revoked_at` + `revocation_reason` + `revoked_audit_id`) — a two-state row. But AC4 requires a **five-state** operational lifecycle (`PENDING | ACTIVE | REVOKED | BLOCKED_BY_META | EXPIRED_24H_WINDOW`) plus the verification phrase, the pending-match key, and the 24h-window expiry. So:
- **`member_wa_opt_in`** (this story) owns the **operational state machine** — PENDING (awaiting inbound match), the 24h window, BLOCKED_BY_META, EXPIRED_24H_WINDOW, the verification phrase, the mobile blind index. This mirrors the member-lifecycle "state machine + events" split ([[project_member_lifecycle_domain_substrate]] — the state machine framework lives in `@twt/domain`; `@twt/domain` CANNOT import `@twt/events`, so keep any event-shaped reads to the substrate you own).
- **`consent_records`** stays the **canonical "valid consent at time Y?" surface** — `recordConsent('whatsapp_opt_in')` on ACTIVE, `revokeConsent` on REVOKED/BLOCKED. `consentExists(pariwarId, memberId, 'whatsapp_opt_in', at)` is what any downstream compliance query and the AC6 resolver ultimately trust. The state table's `state`/`window_expires_at` add the operational nuance the registry's grant/revoke cannot express.
- The two are kept consistent by audit-or-throw: the audit line is written FIRST, then consent + state-table transition happen in one scoped tx threading the audit id — a rollback leaves NO ACTIVE consent AND no ACTIVE state. Mirror `consent/write.ts`'s documented consumer obligation (module header lines 15-23) — the domain accessors accept a caller-supplied `auditId`, they never write the audit line themselves.

### Per-Pariwar webhook path (design decision — recorded in the ADR)

Meta's `X-Hub-Signature-256` is an HMAC keyed by the **app secret** — you must know WHICH Pariwar's app secret before you can verify, and you cannot trust the payload body (which carries `phone_number_id`) until AFTER verification. Resolution: a **per-Pariwar URL path** `/api/v1/webhooks/whatsapp/:pariwarId` so the Pariwar (→ its `app_secret_secret_name` + `webhook_verify_token_secret_name`) is known from the path BEFORE the body is parsed. This is consistent with per-Pariwar WA credentials (AR-17) and keeps the AR-53 single-module-swap surface small. Each Pariwar registers this URL with its Meta App out-of-band (a runbook step, like template registration). **Alternative considered + rejected:** a single global endpoint that reverse-looks-up the Pariwar from the payload `phone_number_id` — rejected because it forces trusting un-verified body content to select the verification key (a signature-bypass smell). Record both in the ADR. `getWaConfigByPhoneNumberId` (Task 2) still exists for status-callback correlation but is NOT on the trust-establishing path.

### Raw-body capture for HMAC (Fastify gotcha)

The HMAC must be computed over the **exact raw bytes** Meta sent — Fastify's JSON parser produces a re-serialized object whose bytes differ (key order, whitespace), so hashing the parsed object fails verification. Capture the raw body: register a content-type parser (or the `rawBody` option) **scoped to the webhook route only** so you get `request.rawBody` (a Buffer/string) for the HMAC while still parsing JSON for the persist step. Do NOT globally change body parsing. Keep the handler's response fast — send the `200` (or the GET challenge) via a body-independent path; if you set any header before the body, prefer `onRequest`/`preHandler` over an async `onSend` to avoid the `ERR_HTTP_HEADERS_SENT` double-send trap ([[project_fastify_onsend_doublesend]]).

### Verification-phrase generation

Generate a short, unique, URL-safe, human-legible phrase per PENDING opt-in (e.g. a fixed prefix + a random suffix, or a passphrase from a wordlist) — it must (a) survive round-tripping through WhatsApp's message text unchanged, (b) be extractable from the inbound message body by the worker, and (c) be unique enough that two members' PENDING phrases never collide within a Pariwar (enforce with the `(pariwar_id, mobile_blind_index, state=PENDING)` lookup + a uniqueness check). Do NOT rely on the inbound `from` number alone — architecture §3.4 warns the WA number may differ from the mobile-on-file ("mismatch logged + surfaced for member confirmation"); the phrase is the disambiguator. Use `crypto.randomUUID()`/`randomBytes` for the entropy, never `Math.random`.

### Matching: mobile blind index + verification phrase

Member identity resolution v1 is **mobile blind index + member_id + pariwar_id** ([[project_membership_number_deferred_feature]]). The inbound `from` msisdn → `mobileBlindIndex` helper (the SAME deterministic HMAC used by `member_identities.mobile_blind_index` and the login path; the domain accessor never sees plaintext — `search-read.ts` precedent, lines 13-17). Match a PENDING opt-in on `(pariwar_id, mobile_blind_index, verification_phrase, state=PENDING)`. Normalize the msisdn to the SAME E.164 shape the stored blind index was computed over (Meta sends `from` WITHOUT the leading `+`; the stored form may include it — reconcile before hashing, mirror `whatsapp-business.ts` `toMsisdn`).

### Five-field audit — exact shape (AC4)

The `originating_channel` value set is the **five** values: `member_app` (settings toggle mint/revoke), `meta_webhook_inbound` (matched inbound message / STOP), `meta_webhook_block` (Meta block/opt-out status callback → BLOCKED_BY_META), `admin_action` (trustee force opt-out), `system_expiry` (time-based EXPIRED_24H_WINDOW / stale-PENDING sweep). Every opt-in/opt-out transition writes ONE `writeAuditEntry` (Story 1.10, `packages/domain/src/audit/write.ts`) BEFORE the state write (audit-or-throw). The `AuditEntryInput` shape (lines 71-88): `pariwarId`, `actorId` (member_id for member/webhook-matched; admin user_id for admin_action; null for a system sweep), `actorRole`, `action` (dotted lowercase, e.g. `member.wa_opt_in_activated` / `member.wa_opt_in_revoked` — must match `/^[a-z0-9_]+(\.[a-z0-9_]+)+$/`), `resourceLocator` (e.g. `pariwar/<id>/member/<id>/wa-opt-in`), `requestPayloadHash` (SHA-256 hex over a canonical JSON of the NON-secret transition facts — reuse `canonicalJsonStringify` like `channel-config/handlers.ts`), `responseStatus`, `traceId`. AC4's five domain fields map thus: `timestamp` = the chain `recorded_at`; `originating_channel` + `matched_member_identity` + `current_consent_state_snapshot` (before/after) → encode into the hashed payload AND (for queryable history, AC5) persist alongside the state transition; `audit_id` = the returned row's `auditId` threaded into the consent/opt-in rows. **NEVER** put the app secret / verify token / access token value into the payload hash — the NAMEs are pointers, the resolved values never reach an audit line (AI-4-3(c); the 5.3 discipline).

### Architecture + source references

- [Source: epics.md#Story 5.4 (lines 2142-2164)] — user story, ACs (opt-in toggle + Send-Hello deep-link, webhook ingress persist+ack within 5s, inbound match → ACTIVE + 24h window, five-field independent audit, consent-registry `whatsapp_opt_in`, independent revocability + no inferred re-consent, full chronological history).
- [Source: architecture.md#Member WA opt-in flow (lines 2047-2075)] — the Yes/No branches, inbound-message handling (match WA number to mobile-on-file; mismatch logged + surfaced), ACTIVE + 24h window on match, STOP/withdrawal handling, opt-in-origination requirement (user-initiated ONLY — no passive defaults/pre-checked/bundled/inferred consent).
- [Source: architecture.md#3.11 Webhook ingress pattern (lines 2374-2387)] — verify signature → persist to a dedicated webhook-queue table → ack (200 + minimal body) → return; NO business logic / synchronous downstream / external call in the handler; workers drain the queue per pg-boss job classes.
- [Source: architecture.md#3.12 External-call resilience (lines 2389-2402)] — timeout + circuit breaker + bounded exponential-backoff retry for the (outbound-status) Meta interactions the worker touches.
- [Source: architecture.md#3.4 dual-gated WA (lines 126-127, 1938-1940, 2092-2098)] — WA fires only when admin toggle ON (5.3) AND member opt-in ACTIVE (this story); enforced by the DeliveryResolver composition seam.
- [Source: architecture.md line 4544] — "Webhook ingress | per-module `webhooks/` (persist + ack pattern)".
- [Source: packages/domain/src/schema/consent_records.ts (header lines 83-104)] — `whatsapp_opt_in` is the named Epic-5 additive via `ALTER TYPE`; the seven current values; the lockstep discipline vs contracts.
- [Source: packages/domain/src/consent/{write,read}.ts] — `recordConsent` / `revokeConsent` / `consentExists`; the caller-supplied-auditId + audit-or-throw consumer obligation; revoke is a MUTATE never a DELETE.
- [Source: packages/domain/src/schema/pariwar_wa_config.ts] — the config singleton (`enabled`, `display_phone_number`, `phone_number_id`, `access_token_secret_name`, `graph_api_version`) this story extends with two webhook-credential NAME columns.
- [Source: packages/channels/src/providers/whatsapp-status.ts + packages/domain/src/channel-config/wa-status.ts] — the `mapMetaStatus` + `upsertWaSendStatus` seams the worker consumes.
- [Source: apps/api/src/modules/channel-config/{routes,handlers}.ts] — the scoped-admin chain + audit-over-non-secret-fields pattern for the config-column extension + admin opt-out route.
- [Source: apps/api/src/modules/device-token/device-token.routes.ts + auth/shared/member-session-guard.ts] — the `requireMemberSession` token-bearer member-route precedent for the opt-in API.
- [Source: apps/api/src/modules/audit-log/index.ts + packages/domain/src/audit/write.ts] — the `writeAuditEntry` signature + `deps.servicePool` audit-write posture.
- [Source: apps/jobs/src/{index,boot,device-token-cleanup,member-renewal-lifecycle}.ts] — the pg-boss worker registration + scheduled-sweep precedent for the webhook processor + PENDING/window-expiry sweeps.
- [Source: packages/domain/src/member/search-read.ts (lines 13-17, 44, 96-97)] — the `mobileBlindIndex` deterministic-HMAC match key (computed at the apps/api boundary, plaintext never in the domain).

### Project Structure Notes

- **New domain schema files:** `member_wa_opt_in.ts`, `wa_inbound_webhook_events.ts` (+ register in `packages/domain/src/schema/index.ts`); `pariwar_wa_config.ts` extended (2 columns); `consent_records.ts` enum extended. New branded ids `MemberWaOptInId` + `WaInboundWebhookEventId` in `ids/index.ts`. New domain accessor module(s) `channel-config/wa-opt-in.ts` (or `wa-opt-in/`) + webhook-event accessors + `getWaConfigByPhoneNumberId`.
- **New apps/api module:** `apps/api/src/modules/channel-webhooks/` (webhook ingress routes + raw-body parser + signature verify) and the member opt-in routes/handlers (here or a sibling module) — register in the app's route composition. Contracts additions in `packages/contracts/src/`.
- **New apps/jobs worker:** `apps/jobs/src/wa-webhook-processor.ts` + registration.
- **Mobile:** notification-settings surface in `apps/mobile` (create a settings route if none) + `lib/member-api.ts` client methods.
- **Migrations:** expect ~4 drizzle migrations (config columns; `member_wa_opt_in` + its RLS; `wa_inbound_webhook_events` + its RLS; the `consent_type ALTER TYPE` as its OWN file). Never regenerate an applied migration; never `DROP SCHEMA` to reset ([[project_live_db_test_gotchas]]).
- **ADR:** `_bmad-output/planning-artifacts/` (or the repo's `docs/adr/` — check ADR-0028's home) — the next free number.
- **Naming discipline** (architecture L3663-3677): DB columns snake_case, TS fields camelCase; tables snake_case-plural.

### Latest technical / Meta API notes (verify at implement time — do NOT hardcode from memory)

- **Signature header:** Meta signs inbound webhooks with `X-Hub-Signature-256: sha256=<hex HMAC-SHA256(rawBody, appSecret)>`. Verify with `crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')` and `crypto.timingSafeEqual`. Confirm the exact header name + `sha256=` prefix against current Meta docs.
- **GET subscription verification:** Meta calls `GET …?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<n>`; on a token match respond **200 with the bare `hub.challenge` value** (plain text, not JSON). Confirm the param names.
- **Inbound payload shape:** the `entry[].changes[].value.messages[]` (inbound text; `from`, `text.body`) vs `entry[].changes[].value.statuses[]` (delivery/read/failed/blocked; `id` = wamid, `status`, `recipient_id`) branches — parse both; verify the current JSON shape.
- **5s ack window:** Meta retries with backoff if you do not ack ~within 5s; persist+ack keeps you far inside it. Never do matching/consent/audit synchronously in the handler.
- **STOP handling:** WhatsApp surfaces user opt-out; treat an inbound "STOP" (case-insensitive, trimmed) as a revoke signal AND rely on Meta block/`statuses[].status = failed` with the relevant error as the authoritative block signal → BLOCKED_BY_META.

### Decisions (CONFIRMED by BigDev 2026-07-06)

1. **Per-Pariwar webhook URL path** `/api/v1/webhooks/whatsapp/:pariwarId` — CONFIRMED (the signature key is known from the path before the body is trusted). `app_secret_secret_name` / `webhook_verify_token_secret_name` are per-Pariwar NAME pointers; if the ops model turns out to be a shared Meta App, the same NAME simply resolves to a shared secret — no code change. Record the per-Pariwar-URL rationale + the shared-App-fallback note in the ADR.
2. **Admin opt-out gate = the existing `member.moderate` RBAC key** — CONFIRMED. No new key, no `PERMISSION_CATALOG_VERSION` bump (stays 5). See Task 6.
3. **`system_expiry` originating-channel value** — CONFIRMED. Add it as the fifth `originating_channel` value (`member_app | meta_webhook_inbound | meta_webhook_block | admin_action | system_expiry`) for the time-based EXPIRED_24H_WINDOW / stale-PENDING sweep (Task 5), `actorId: null`.

### Additional requirements (BigDev, 2026-07-06)

- **Verification-phrase uniqueness is DB-enforced** — a partial unique index `UNIQUE (pariwar_id, verification_phrase) WHERE state = 'PENDING'` + `createPendingOptIn` retry-on-`23505`. Application-level generation alone is insufficient; the DB constraint is the integrity backstop against a wrong-member match (Task 3).
- **STOP matching is explicit + whole-message** — resolve sender by mobile-blind-index to an ACTIVE opt-in, whole-message case-folded keyword allowlist match (never substring), no-op when no ACTIVE opt-in; the `statuses[].status=failed` opt-out code is authoritative for BLOCKED_BY_META (Task 5).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Claude Code, bmad-dev-story workflow).

### Debug Log References

- **`ALTER TYPE … ADD VALUE` in a tx (Task 1):** modern Postgres (PG12+) allows ADD VALUE inside a migration
  transaction as long as the new value is not USED in the same tx. Landed `whatsapp_opt_in` as its own
  migration (0040) with `IF NOT EXISTS`; no migration uses the value (consent rows are written at runtime).
  `db:migrate` applied 0040–0043 cleanly against `twt-test-pg`.
- **Retry-on-`23505` poisoned the caller tx (Task 3):** the first cut caught the unique-violation and
  re-inserted on the same connection — but a failed statement aborts the whole Postgres tx, so the retry
  errored identically. A `db.transaction()` savepoint was WRONG here too: drizzle's `NodePgDatabase.transaction`
  issues a real `BEGIN`/`COMMIT` (not `SAVEPOINT`) on a client-bound Db, which would COMMIT the caller's scope
  tx early (it broke RLS isolation + the phrase-regen test). Fixed with explicit `SAVEPOINT` /
  `ROLLBACK TO SAVEPOINT` SQL around each insert attempt (these accessors always run inside a scope tx), plus
  an `isUniqueViolation` helper that walks the drizzle-wrapped error's `.cause` chain for SQLSTATE 23505.
- **Live-DB opt-in accessor spec (Task 3):** 10/10 green after the savepoint fix; the webhook ingress spec
  (Task 4) 6/6; the worker spec (Task 5) 3/3; the member opt-in E2E (Task 6) 4/4; the resolveWaTarget unit
  (Task 7) 5/5. openapi/v1.yaml re-emitted deterministically with the new member opt-in paths + config columns.

### Completion Notes List

Implemented Story 5.4 end-to-end across the eight tasks; all ACs satisfied.

- **Task 1 (AC4):** `whatsapp_opt_in` appended to the domain `consentTypeEnum` + the contracts
  `ConsentTypeSchema` (lockstep test updated) + migration 0040 (`ALTER TYPE … ADD VALUE`, its own file).
- **Task 2 (AC2):** two additive Secret-Manager NAME columns on `pariwar_wa_config`
  (`app_secret_secret_name`, `webhook_verify_token_secret_name`) + migration 0041; extended the WA-config
  accessor / `WaConfigDto` contract / admin form; added `getWaConfigByPhoneNumberId` (status-callback
  correlation, NOT on the trust-establishing path).
- **Task 3 (AC1/AC3/AC4):** new `member_wa_opt_in` five-state machine (`PENDING | ACTIVE | REVOKED |
  BLOCKED_BY_META | EXPIRED_24H_WINDOW`) + `wa_inbound_webhook_events` queue (migrations 0042/0043, inline
  tenant-isolation RLS) + branded ids + the DB-enforced partial-unique verification phrase (retry-on-23505
  via SAVEPOINT) + the `waOptIn` accessor namespace (create/match/activate/revoke/isOptInActive/getForMember,
  the webhook-queue persist/claim/mark, the phrase generate/extract, the shared 5-field audit-hash encoder).
- **Task 4 (AC2):** `apps/api/src/modules/channel-webhooks/` ingress primitive — per-Pariwar path, GET
  subscription challenge, POST verify-persist-ack-within-5s with a route-scoped raw-body parser +
  `crypto.timingSafeEqual`, fail-closed on bad signature (persists nothing), login-wall allowlisted, NO
  business logic in the handler. Added the injectable `resolveChannelSecret` seam to AppDeps (prod resolves
  via `resolveSecretValue`; tests inject a deterministic fake).
- **Task 5 (AC3/AC4):** `apps/jobs/src/wa-webhook-processor.ts` — drains the queue: inbound match → ACTIVE +
  `recordConsent('whatsapp_opt_in')` + 24h window (audit-or-throw), STOP (whole-message keyword allowlist) →
  REVOKED, Meta block error code → BLOCKED_BY_META, status callbacks → 5.3's `mapMetaStatus` +
  `upsertWaSendStatus`; plus the stale-PENDING / past-window sweep → EXPIRED_24H_WINDOW (`system_expiry`,
  actorId null). Best-effort/isolated writes; registered as a pg-boss cron in boot.ts. Added `@twt/channels`
  to apps/jobs + the `WA_WEBHOOK_PROCESSOR` queue name.
- **Task 6 (AC1/AC4):** member-session-gated opt-in routes (POST mint/re-use → deep-link + phrase, GET
  status, DELETE revoke — independently revocable) + contracts DTOs (openapi registered) + the trustee
  `admin_action` force-opt-out on `member.moderate` (no catalog bump) + the api-client SDK methods + the
  mobile notification-settings screen (bilingual hi/en, wa.me deep-link via `Linking.openURL`, MMKV not
  needed) + a home-tab entry.
- **Task 7 (AC6):** `resolveWaTarget` in the channel-config composition seam — resolves a WA `SendTarget`
  ONLY when the admin toggle AND `isOptInActive` both pass (decrypts the member's mobile in the composition
  layer). Closes the 5.3 seam WITHOUT touching the frozen `DeliveryResolver`/`dispatch`/`ChannelProvider`/
  `CANONICAL_CHANNEL_LADDER`; still NO live dispatch call site (5.2/5.3 posture).
- **Task 8:** ADR-0029 (webhook-ingress design + opt-in lifecycle); openapi re-emitted deterministically;
  `pnpm ci:local` merge gate.

**Seam-vs-live (recorded per the 5.2/5.3 discipline):** AC6 ships the reusable `resolveWaTarget` READ; there
is still no live `dispatch` call site — the live fan-out consumes this read in a later story. The webhook
worker builds LIVE ingress processing (matching/transitions), which is ingress, NOT the frozen `dispatch`
fan-out.

**Access-wrapper walk (AI-4-3 a–e), recorded here because the `access-wrapper:check` AST gate scans only
`packages/validity-service`:**
- **(a) caller-auth verified:** member routes → `requireMemberSession` (token-bearer); admin opt-out →
  `[requireAdminSession, scopeResolutionHook, requirePermissionHook(member.moderate)]`; webhook GET/POST →
  the Meta verify-token / `X-Hub-Signature-256` HMAC (verified in the handler).
- **(b) omitted/failed auth fails CLOSED:** member routes → 401; admin → 401 (no session) / 403 (no
  permission); webhook → 403 on a bad/absent verify-token or signature, and persists NOTHING.
- **(c) no secret value in any audit line:** the app-secret / verify-token / access-token NAMEs are pointers;
  the resolved values never reach an audit line (the opt-in audit hash is over `originating_channel` +
  `matched_member_identity` + before/after state only — never a secret or a raw mobile).
- **(d) best-effort worker writes isolated:** the webhook worker's per-event / per-sweep-row writes are
  wrapped in try/catch that logs + continues; a broken write never poisons the drain.
- **(e) route scopes match their guards:** the member routes carry the member session + open their own scope
  tx; the admin route runs under the scoped-admin chain + `request.scopeTx`; the webhook routes are
  per-Pariwar-path-scoped (RLS keyed on the URL `pariwarId`).

**Admin opt-out test:** a dedicated live-DB admin-auth E2E was added
(`tests/integration/wa-opt-in/admin-opt-out.spec.ts`, 3/3 green): `pariwar_admin` (carries `member.moderate`)
force-opt-out → 200 REVOKED + the consent row revoked + an `admin_action` audit line (actor = the admin, an
opaque hash — never a secret); `state_trustee` (granted in the Pariwar but WITHOUT `member.moderate`) →
fail-closed (403/404), NO state change (AI-4-3(b)); a member with no ACTIVE opt-in → 409.

**Meta-fact caveats (verify at deploy time):** the inbound payload shape, the BLOCKED_BY_META opt-out error
codes (`WA_BLOCK_ERROR_CODES`), and the STOP-keyword set (`STOP_KEYWORDS`, incl. Hindi) are INDICATIVE and
flagged in-code — re-verify against the current Meta Cloud API reference (the same caveat ADR-0028 applied).

**Blind-index reproduction:** `apps/jobs/.../wa-webhook-processor.ts` replicates `normalizeMobile` + the
`member_mobile` / `MEMBER_IDENTITY_NAMESPACE` constants from `apps/api/.../auth/shared/mobile-index.ts`
(apps/jobs cannot import apps/api) — kept byte-identical + commented; the member route uses the STORED
`member_identities.mobile_blind_index` as the PENDING match key so the two agree.

### File List

**Domain (`packages/domain`)**
- `src/schema/consent_records.ts` (M — enum), `src/schema/pariwar_wa_config.ts` (M — 2 columns),
  `src/schema/member_wa_opt_in.ts` (A), `src/schema/wa_inbound_webhook_events.ts` (A), `src/schema/index.ts` (M)
- `src/ids/index.ts` (M — `MemberWaOptInId`, `WaInboundWebhookEventId`)
- `src/channel-config/wa-config.ts` (M — 2 fields + `getWaConfigByPhoneNumberId`), `src/channel-config/index.ts` (M)
- `src/wa-opt-in/{read,write,webhook-events,phrase,audit,errors,index}.ts` (A)
- `src/index.ts` (M — `waOptIn` namespace + top-level error exports)
- `migrations/0040_consent-type-whatsapp-opt-in.sql` (A), `migrations/0041_pariwar-wa-config-webhook-credentials.sql` (A),
  `migrations/0042_member-wa-opt-in.sql` (A), `migrations/0043_wa-inbound-webhook-events.sql` (A), `migrations/meta/_journal.json` (M)
- `tests/wa-opt-in/phrase.test.ts` (A), `tests/integration/wa-opt-in/wa-opt-in.spec.ts` (A),
  `tests/integration/channel-config/wa-config.spec.ts` (M — baseConfig 2 fields)

**Contracts (`packages/contracts`)**
- `src/consent/consent-record.ts` (M), `src/channel-config/config.ts` (M — 2 fields),
  `src/wa-opt-in/{opt-in,index}.ts` (A), `src/index.ts` (M)
- `scripts/emit-openapi.ts` (M — opt-in components + 4 paths)
- `tests/consent.test.ts` (M), `tests/wa-opt-in.test.ts` (A)
- `../../openapi/v1.yaml` (M — regenerated)

**Queue (`packages/queue`)**
- `src/index.ts` (M — `WA_WEBHOOK_PROCESSOR` queue name)

**API (`apps/api`)**
- `src/context.ts` (M — `resolveChannelSecret` seam), `src/deps.ts` (M — prod resolver), `src/server.ts` (M — 2 modules)
- `src/modules/channel-config/{handlers,composition,index}.ts` (M — config cols + `resolveWaTarget`)
- `src/modules/channel-webhooks/{signature,handlers,routes,index}.ts` (A)
- `src/modules/wa-opt-in/{handlers,routes,index}.ts` (A)
- `tests/integration/_setup.ts` (M — `resolveChannelSecret` fake + makeClient widen), `tests/integration/login-wall.spec.ts` (M),
  `tests/integration/channel-config.spec.ts` (M), `tests/unit/whatsapp-composition.test.ts` (M),
  `tests/unit/webhook-signature.test.ts` (A), `tests/unit/wa-target.test.ts` (A),
  `tests/integration/channel-webhooks.spec.ts` (A), `tests/integration/wa-opt-in/wa-opt-in.spec.ts` (A),
  `tests/integration/wa-opt-in/admin-opt-out.spec.ts` (A)

**Jobs (`apps/jobs`)**
- `package.json` (M — `@twt/channels`), `src/wa-webhook-processor.ts` (A), `src/boot.ts` (M),
  `tests/wa-webhook-processor.test.ts` (A)

**API client (`packages/api-client`)**
- `src/index.ts` (M — 3 opt-in methods + DELETE support)

**i18n (`packages/i18n`)**
- `locales/en/common.json` (M — `waNotifications.*`), `locales/hi/common.json` (M — `waNotifications.*`)

**Admin (`apps/admin`)**
- `src/modules/channel-config/WaConfigForm.tsx` (M — 2 credential-NAME fields), `tests/wa-config-form.test.tsx` (M)

**Mobile (`apps/mobile`)**
- `app/(settings)/{_layout,notifications}.tsx` (A), `app/_layout.tsx` (M — group), `app/(tabs)/index.tsx` (M — entry),
  `components/notifications/NotificationSettingsEntry.tsx` (A)

**Docs**
- `docs/adr/ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md` (A)

**Sprint status**
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (M)

## Change Log

| Date | Change |
|---|---|
| 2026-07-06 | Story 5.4 implemented (Tasks 1–8): `whatsapp_opt_in` consent type; `pariwar_wa_config` webhook-credential NAME columns; `member_wa_opt_in` five-state machine + `wa_inbound_webhook_events` queue (migrations 0040–0043); the `apps/api/channel-webhooks` per-Pariwar signed webhook ingress (verify-persist-ack-within-5s); the `apps/jobs/wa-webhook-processor` async worker (match→ACTIVE, STOP→REVOKED, block→BLOCKED_BY_META, status callbacks, system_expiry sweep); the member opt-in API + api-client SDK + bilingual mobile settings surface + trustee `admin_action` opt-out (`member.moderate`); the AC6 dual-gated `resolveWaTarget` composition read; ADR-0029; openapi/v1.yaml regenerated. `pnpm ci:local` green. Consumes-not-changes all Story 5.3 seams + the frozen `dispatch`/`ChannelProvider`/`DeliveryResolver`/`CANONICAL_CHANNEL_LADDER`. |
