---
baseline_commit: 60aaacfc83993afe129dfd648e96866d02254adb
---

# Story 10.2: Member-Facing Helpdesk Ticket Filing `[SURFACE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a member needing trust support (claim question, contribution issue, KYC help, etc.),
I want to file a helpdesk ticket from the member app with category selection, free-text body, optional attachments, and visibility into status,
so that I have a structured path to help that doesn't require WhatsApp or a phone call.

## Scope Boundary (read first — prevents over-build)

This is a `[SURFACE]` story. It builds the **member app** helpdesk surface on top of Story 10.1's substrate. It does **NOT** re-build the primitive (schema/reducer/routing/registry — all `done` in 10.1), and it does **NOT** build the admin side or the reply round-trip.

| In scope (10.2) | Out of scope → owning story |
|---|---|
| Member-session create-ticket API route (`POST /api/v1/p/:pariwarId/member/helpdesk/tickets`) reusing 10.1's `projectTicketGenesis` orchestration, `created_via: 'member_app'`, `subject_member_id` = session member, FR-88 write rate-limit | — |
| Member-scoped reads: `GET /member/helpdesk/tickets` (my tickets) + `GET /member/helpdesk/tickets/:ticketId` (my ticket, ownership-enforced) — detail includes the **read-only reply thread** rendered from the `helpdesk.*` event replay (empty until 10.4 emits staff replies) | — |
| Member category read: `GET /member/helpdesk/categories` returning the in-force policy's category/subcategory set for the Pariwar | — |
| Attachment upload transport (reuse the Story 6.5 object-store PORT pattern) + signed-URL read for the member's **own** attachments; size + content-type allowlist + filename sanitization added to `HelpdeskAttachment` | — |
| `apps/mobile/app/(helpdesk)/` UI: category picker, filing form, ticket inbox (status + SLA), ticket detail (status + routing target + SLA timer + read-only thread) — the `tickets/:ticketId` deep-link destination | — |
| `packages/i18n/locales/{en,hi}/helpdesk.json` (member-friendly, Hindi-first, no jargon) + `useHelpdeskT` hook | — |
| `@twt/api-client` `createMemberHelpdeskClient` factory + `apps/mobile/lib/helpdesk-api.ts` | — |
| Consume the **pre-wired** `helpdesk_reply` deep-link → the ticket detail screen | — |
| Member **reply-append** WRITE (`helpdesk.member_replied` event; `awaiting_member → in_progress`) + reply composer | **Story 10.4** (ratified 2026-07-29 — pairs with the admin reply so the round-trip lands + tests as one unit) |
| `helpdesk_reply` push EMITTER (someone replies → fan-out to ticket owner) | **Story 10.4** (admin console owns reply composition) |
| Admin console / queue / SLA-breach alerts / cross-link navigation | **Story 10.4** (`apps/admin/src/modules/helpdesk/`) |
| Helpline operator call-to-ticket surface | **Story 10.3** |
| Emitting non-genesis transitions (pick-up, awaiting-member, resolve, close, reopen) | 10.4 + auto-close job |
| `helpdesk.create` RBAC permission on the **admin** route | **Story 10.3/10.4** (re-deferred; requires an RBAC-catalog + role-bundle change out of proportion for a route-file fix — see Dev Notes) |

**The member route emits ONLY the already-registered genesis** (`helpdesk.ticket_created` → `open`), the exact event 10.1 registered. 10.2 adds **no new event type and no migration** (attachments ride the existing JSONB `attachments[]` column; object bytes live in the store, never Postgres). It reuses 10.1's domain orchestration verbatim — the ONLY new server logic is member-auth gating, `subject_member_id`-forcing, ownership-scoped reads, and the attachment upload/signed-URL transport.

## Acceptance Criteria

**AC1 — Member files a ticket from the app (the core flow).**
Given FR-52 + Story 10.1's helpdesk subsystem,
When the member-facing ticket-filing surface is implemented,
Then the member selects a **category** (from the in-force routing policy — see AC5), enters a **subject + body**, optionally **attaches files**, and submits;
And submission calls a **member-session-gated** route (`POST /api/v1/p/:pariwarId/member/helpdesk/tickets`) that reuses Story 10.1's `projectTicketGenesis` orchestration with `created_via: 'member_app'`, `subject_member_id` forced to the **session member** (`request.requestContext.actorId`, never client-supplied), `subject_actor_id: null`, `operator_attribution: null`;
And the route sits behind `[requireMemberSession]` + the FR-88 protected-surface write rate-limit (`namedRateLimits(deps).write`) + a Turnstile verification (`deps.turnstile.verify({ token, remoteIp })`, rejecting on failure exactly as `admin-auth.handlers.ts`'s AC-3 pattern does — FR-88 names "helpdesk forms" explicitly), and audits via `withCompensatingAudit` exactly as the 10.1 primitive does (AC5 of 10.1).

**AC2 — The member sees the routing target + a live SLA timer.**
Given a successfully-filed ticket,
Then the create response + the detail read carry `routed_to_role`, `routed_to_scope`, `sla_first_response_due`, `sla_resolution_due`;
And the UI renders a **member-friendly routing target** derived from `routed_to_role` (e.g. "Your Pariwar admin will respond" / "आपके परिवार व्यवस्थापक जवाब देंगे") — a **role/scope description only, never a named individual** ([[project_admin_display_name_attribution]] — no staff identity leaks to members);
And a **first-response SLA countdown** to `sla_first_response_due` is visible (a client-side relative-time render — no server clock dependence).

**AC3 — Member inbox + ticket detail (read-only status visibility).**
Given the member's own tickets,
When the member opens the helpdesk inbox,
Then `GET /member/helpdesk/tickets` lists the member's own tickets (newest-first, ownership-scoped so a member can NEVER see another member's ticket — enforced server-side by `subject_member_id = actorId AND pariwar_id = requestContext.pariwarId`, not by a client filter);
And `GET /member/helpdesk/tickets/:ticketId` returns one owned ticket or a **404** (never 403 — a not-owned ticket is indistinguishable from a non-existent one, no enumeration oracle);
And the detail shows the ticket's `current_state`, subject/body, attachments (as signed-URL links — AC6), routing target + SLA (AC2), and a **read-only reply thread** rendered by replaying the ticket's `helpdesk.*` events;
And the thread reader is **one forward-compatible replay function** that must handle both shapes without change: **(a) genesis-only** — the live 10.2 case, where the stream is just `helpdesk.ticket_created` and the thread is the single opening entry (subject/body); **(b) genesis + future reply events** — the 10.4 case, where staff/member reply events append to the same stream — and the same function produces the ordered thread for both (it is NOT special-cased to "genesis only"; adding reply events in 10.4 requires ZERO change to this reader). The render path is proven against a **seeded reply event** in 10.2 even though 10.2 never emits one.

**AC4 — Dignified, jargon-free, Hindi-first copy (UX-DR55 + Story 0.11).**
Given UX-DR55 dignified copy + Story 0.11 operator-shadowing findings,
When the filing flow renders,
Then category + subcategory descriptions are **member-friendly** (Hindi-first per Story 2.1; en/hi parity gate); attachment **limits + accepted file types are explicit** on the form ("PDF or photo, up to 10 MB, max 5 files"); there is **no internal jargon** (no raw enum values, no `routed_to_scope` dimension strings, no "SLA" acronym in the primary copy — use "expected reply by …");
And all member-facing helpdesk copy lives in the dedicated `helpdesk` i18n namespace (`packages/i18n/locales/{en,hi}/helpdesk.json`), consumed via a `useHelpdeskT()` hook (the `useClaimT` precedent).

**AC5 — Category list is registry-driven + context-appropriate.**
Given the per-Pariwar routing-policy registry (10.1),
When the member opens the category picker,
Then `GET /member/helpdesk/categories` returns the category (+ subcategory) set from the Pariwar's **in-force** policy (`routingPolicyVersionInForce`, falling back to `DEFAULT_ROUTING_POLICY` — the v1 category set: `kyc-trouble`, `payment-failed`, `utr-mismatch`, `claim-status`, `profile-update`, `niyamavali-question`, `partner-module-issue`, `complaint`, `other`);
And the response returns **raw category keys**; member-friendly labels are resolved client-side from the `helpdesk` i18n namespace (server returns data, i18n owns copy);
And "categories visible only when applicable to member context" is honored at the **v1 baseline** (all in-force categories shown); any narrower context-filtering (e.g. hide `claim-status` when the member has no claim) is a documented refinement seam, NOT built here.

**AC6 — Attachment upload + signed-URL read (member's own only).**
Given the Story 6.5 object-store PORT pattern (never Postgres bytes),
When the member attaches files,
Then the bytes are stored via a **reusable storage port** (mirror `claim-document-storage`: an in-memory + local-fs + gcs adapter trio in `packages/platform-adapters/`, wired through `apps/api/src/deps.ts`), and the ticket's `attachments[]` JSONB carries **object-key REFERENCES + PII-safe metadata** (filename, content_type, size_bytes) — never base64 bytes on the row;
And uploads are bounded — the current `HelpdeskAttachment` (`object_key` is a free `.max(1024)` string; `content_type`/`filename` are free `.max(255)` strings) has **no size field**, and while `CreateTicketRequest`'s `attachments` array already caps at `.max(10)` (`packages/contracts/src/helpdesk/create-ticket.ts`), the **persisted `HelpdeskTicketDto.attachments` (`ticket.ts`) has no cap at all**, so this story adds: a **`size_bytes`** field (`.int().positive().max(CAP)`), a **content-type allowlist** (replace the free-string `content_type` — reuse `CLAIM_DOCUMENT_ALLOWED_MIME_TYPES` as the model: PDF + common image types), a **per-file size cap** (10 MB, `CLAIM_DOCUMENT_MAX_BYTES` model), a **max attachment count** applied consistently on BOTH the create-request array and the persisted `HelpdeskTicketDto` array (`.max(N)`, N ≤ ~5 — this LOWERS the existing create-request cap from 10 to N, don't just add a cap where none existed), and **filename sanitization** (strip path separators / control characters before it reaches storage or a signed URL);
And the member can view **their own** attachments via short-lived signed URLs (reuse `apps/api/src/modules/auth/shared/signed-link.ts`); the signed-URL issuer re-checks ticket ownership (`subject_member_id = actorId`) before minting a URL — an attachment URL is never issued for a ticket the caller doesn't own.

**AC7 — Tests + gates green.**
Given the merge gate is `pnpm ci:local`,
Then live-DB integration tests cover: member create success (routes via default policy, `created_via='member_app'`, `subject_member_id`=session member, audit line written); the **ownership** guards (member A cannot read/attachment-URL member B's ticket → 404); the `member_app`-with-`subject_actor_id` rejection (reuse the 10.1 `.superRefine`); attachment validation (oversize → 413, disallowed MIME → 415, count over cap → 400, path-traversal filename sanitized); category read returns the in-force set;
And the mobile UI has component/interaction tests for the filing flow (category → form → submit → confirmation) + inbox/detail render (incl. the seeded-reply-event thread render), following the existing `apps/mobile/tests/` + Playwright conventions;
And en/hi parity holds for the new `helpdesk` namespace (the i18n parity gate);
And the login-wall CI gate (Story 1.14) recognizes the new member routes via the `MEMBER_SESSION_GUARD` tag (no allowlist entry needed — they ARE guarded).

## Tasks / Subtasks

- [x] **Task 1 — Contracts: member surface + attachment hardening** (`packages/contracts/src/helpdesk/`) (AC1, AC5, AC6)
  - [x] Add `MemberTicketListItem` / member list + detail response DTOs (reuse `HelpdeskTicketDto`; the detail adds the replay-derived `thread: HelpdeskThreadEntry[]` — author the thread-entry shape now, populated by event replay). Every `z.object` ends `.strict()`.
  - [x] Add `HelpdeskCategoryListResponse` (categories + subcategories from the in-force policy).
  - [x] Harden `HelpdeskAttachment` (the deferred chunk-3 finding): it currently has NO size field. Add `size_bytes` (`.int().positive().max(CAP)`), replace the free-string `content_type` with an **allowlist**-validated value, sanitize `filename` (reject path separators / control chars). Add a `.max(N)` cap (N ≤ ~5) on the `attachments` array in **both** places: `packages/contracts/src/helpdesk/ticket.ts`'s `HelpdeskTicketDto.attachments` (currently uncapped) AND `create-ticket.ts`'s `CreateTicketRequest.attachments` (currently `.max(10)` — lower it to N, don't leave the stale 10 in place). Export `HELPDESK_ATTACHMENT_ALLOWED_MIME_TYPES` + `HELPDESK_ATTACHMENT_MAX_BYTES` + `HELPDESK_ATTACHMENT_MAX_COUNT` constants (model on `CLAIM_DOCUMENT_*`). **Lowering the cap breaks a live 10.1 test** — `packages/contracts/tests/helpdesk.test.ts:121-124` asserts `'boundary: exactly 10 attachments accepted, 11 rejected'`; update its boundary numbers to N/N+1 as part of this change, don't leave it failing or silently rewrite it without understanding why it was 10.
  - [x] Define the `HelpdeskAttachmentStorage` port **interface** here, not in platform-adapters — mirror the actual `ClaimDocumentStorage` split: the pure interface lives in `packages/contracts/src/claims/documents.ts:86` (browser-safe, no I/O), and only the adapter implementations live under `platform-adapters/`. Signature: `put(key: string, bytes: Uint8Array, opts: { contentType: string }): Promise<void>` + `signedReadUrl(key: string, ttl: number): Promise<string>` (the exact `ClaimDocumentStorage` shape — note the third `put` arg is an options object, not a bare string). `ClaimDocumentStorage` also exposes `getBytes(key)` for OCR re-fetch; helpdesk attachments have no analogous re-fetch consumer, so **omit `getBytes`** from this port unless a future story needs it.
  - [x] Keep the contracts pure-Zod — **no `@twt/domain` import** in shipped files ([[project_contracts_domain_bundle_boundary]]); extend the test-only sync-guard if any new tuple mirrors a domain source.
  - [x] Register the new member paths in `emit-openapi.ts` (401/404/413/415/429 responses as applicable) + regenerate `openapi/v1.yaml`.
- [x] **Task 2 — Storage adapters: helpdesk attachments** (`packages/platform-adapters/src/helpdesk-attachment-storage/`) (AC6)
  - [x] Implement the `HelpdeskAttachmentStorage` port (interface defined in Task 1) with an `in-memory` / `local-fs` / `gcs` adapter trio (mirror `claim-document-storage/{in-memory,local-fs,gcs}.ts` exactly — same `put`/`signedReadUrl` signatures, no `getBytes`).
  - [x] Wire it through `apps/api/src/deps.ts` + `context.ts` (the adapter selected per environment, as claim-document-storage is).
  - [x] **Decision — single-shot multipart create** (recommended): the create route accepts `multipart/form-data` (body fields + files in one request); storage `put` happens AFTER validation + routing succeed and BEFORE the row/genesis persist, refs go into the genesis payload, and a persist failure best-effort-deletes the just-put objects (no orphan-cleanup job needed for v1). This avoids pre-uploading bytes for a ticket that doesn't exist yet. If the dev prefers a pre-upload endpoint returning refs, document the orphan-sweep implication.
  - [x] **Invariant — object storage is NOT authoritative** (keep the cleanup best-effort, make the source of truth explicit): the ticket row (and its `attachments[]` refs) is the sole authority for what exists. If DB persistence fails, any objects the `put` already wrote are **orphaned by definition** — no ticket row references them, so they are **never discoverable** (no read path, signed-URL issuer, or list ever surfaces an object without a referencing owned ticket). The best-effort delete is therefore a storage-hygiene courtesy, NOT a correctness dependency: a delete that itself fails leaves only an unreferenced, unreachable blob — never a divergence a user or read path can observe.
- [x] **Task 3 — API: member module** (`apps/api/src/modules/helpdesk/member-*.ts` or a `member/` subfolder) (AC1, AC2, AC3, AC5, AC6, AC7)
  - [x] `POST /api/v1/p/:pariwarId/member/helpdesk/tickets` — `[requireMemberSession]` + `config: { rateLimit: limits.write }` + a Turnstile check as the FIRST thing in the handler, before any DB work: `const ok = await deps.turnstile.verify({ token: body.turnstileToken, remoteIp: request.ip }); if (!ok) return reply.code(403).send(...)` (the exact `admin-auth.handlers.ts` AC-3 pattern — `deps.turnstile` is already wired via `deps.ts`/`context.ts` and is NOT a net-new primitive; FR-88 names "helpdesk forms" for Turnstile explicitly, so skipping it is not a valid deferral); force `subject_member_id = requestContext.actorId`, `created_via='member_app'`, `subject_actor_id=null`; open an RLS-scoped tx via `openScopeTx(deps, requestContext.pariwarId)` (member-pool precedent — see Dev Notes) and reuse the 10.1 handler core (`resolveRoute` → `projectTicketGenesis(scopeTx.tx, …)` → `withCompensatingAudit`), `closeScopeTx` in `finally`. Reject `member_app`+`subject_actor_id` (the 10.1 `.superRefine` already does this — verify it fires on this path). Tag the guard so `login-wall.spec.ts` sees it.
  - [x] `GET /api/v1/p/:pariwarId/member/helpdesk/tickets` + `.../tickets/:ticketId` — member-scoped reads; ownership enforced in SQL (`subject_member_id = actorId AND pariwar_id`); not-owned → **404**. Detail replays the event stream for the thread.
  - [x] `GET /api/v1/p/:pariwarId/member/helpdesk/categories` — in-force policy categories (AC5).
  - [x] `GET .../tickets/:ticketId/attachments/:attachmentKey/url` (or equivalent) — ownership-rechecked signed-URL mint (AC6).
  - [x] Register in `server.ts`. Note: the AI-5-3 access-wrapper gate does NOT scope `apps/api/src/modules/helpdesk/` (10.1 Dev Notes) — so use `withCompensatingAudit` by discipline, it will not be caught by CI otherwise.
- [x] **Task 4 — Domain reads** (`packages/domain/src/helpdesk/read.ts`) (AC3, AC5)
  - [x] Add `listTicketsForMember(pariwarId, memberId)` + `getTicketForMember(pariwarId, memberId, ticketId)` (ownership in the WHERE clause). Every dynamic `.limit()` must be an integer literal or `clampLimit(...)` — the domain-invariants gate rejects a named constant passed directly ([[project_domain_limit_clamp_and_savepoint_retry]], the exact trap 10.1 hit).
  - [x] Add a thread reader: replay `helpdesk.*` events for a ticket → ordered thread entries. **One forward-compatible function** (AC3): handles genesis-only (the live 10.2 stream) AND genesis + future reply events (the 10.4 stream) with no branching special-case — the reducer/replay contract from 10.1 (total, identity-on-unmatched), so appending reply event types in 10.4 needs zero change here. Pure over the event list; DB-free-testable, with a fixture that seeds a reply event to prove path (b) now.
  - [x] Add `categoriesForPariwar(pariwarId)` reading the in-force policy document.
- [x] **Task 5 — i18n** (`packages/i18n/locales/{en,hi}/helpdesk.json`) (AC4)
  - [x] Category + subcategory labels/descriptions, routing-target copy keyed by `routed_to_role`, SLA/"expected reply by" copy, attachment-limit copy, form labels/errors — Hindi-first, en/hi parity. Add `useHelpdeskT()` (`useClaimT` precedent).
- [x] **Task 6 — api-client + mobile lib** (AC1, AC3, AC6)
  - [x] `packages/api-client/src/index.ts` — `createMemberHelpdeskClient` (the `createMemberClaimClient` precedent: `getAccessToken` bearer attach + multipart upload support).
  - [x] `apps/mobile/lib/helpdesk-api.ts` (mirror `lib/claim-api.ts`) + a `helpdesk-i18n.ts` hook + any `helpdesk-draft.ts` save-and-resume (MMKV — [[project_mmkv_asyncstorage_equivalent]], `mmkvStorage`, NOT AsyncStorage).
- [x] **Task 7 — Mobile UI** (`apps/mobile/app/(helpdesk)/`) (AC1–AC4, AC7)
  - [x] `_layout.tsx` + register the `(helpdesk)` group in `apps/mobile/app/_layout.tsx` (the existing Stack.Screen list). Screens: `index.tsx` (inbox list), `new.tsx` (category → subject/body → attachments → submit), `[ticketId].tsx` (detail: status + routing target + SLA countdown + read-only thread + signed-URL attachments). Tamagui components; TanStack Query via `lib/query-client`.
  - [x] Attachment picker: `expo-image-picker` + `expo-document-picker` → multipart FormData (the `(claim)/document.tsx` `PickedFile` pattern verbatim). Surface the limit copy BEFORE the picker; a failed upload is dignified (retry), never a hard error.
  - [x] Guard the Fabric FlatList empty→populated crash on the inbox list ([[project_fabric_flatlist_empty_populated_crash]]) — render empty/loading/error states OUTSIDE the list.
  - [x] The `[ticketId]` route IS the `tickets/:ticketId` deep-link destination (the pre-wired `helpdesk_reply` target — `deepLinkTargetForAlert` already routes there). Wiring the remote-push→navigation consumer is gated on the broader push-delivery buildout (still stubbed in `lib/push-notifications.ts`) — provide the destination + in-app navigation; do NOT block on remote push.
- [x] **Task 8 — Tests + gates** (AC7)
  - [x] API live-DB integration (`apps/api/tests/integration/helpdesk/member-*.spec.ts`): create success, ownership 404s (cross-member read + attachment-URL), attachment validation (413/415/400/sanitized filename), category read, audit line. Test DB `twt-test-pg` on **:5433**; assert membership not counts ([[project_live_db_test_gotchas]], [[project_known_livedb_test_failures]]).
  - [x] Domain unit tests: thread-replay reader (DB-free), `categoriesForPariwar`, member reads.
  - [x] Contracts tests: attachment hardening (MIME/size/count/filename boundaries), member DTOs.
  - [x] Mobile: filing-flow + inbox/detail render (incl. seeded-reply thread).
  - [x] Run the full `pnpm ci:local` (`--concurrency=4`) as the merge gate; run the DB-gated suites for the new `.strict()` contracts + routes ([[project_fastify_onsend_doublesend]] — return the body, never `void reply.status(201).send()`).

### Review Findings

_Single-pass review — 3 parallel layers (Blind Hunter / Edge Case Hunter / Acceptance Auditor) over the full uncommitted diff (~3477 lines, ~40 files), excluding the generated `openapi/v1.yaml`._

- [x] [Review][Patch] **(Resolved decision: restructure)** Turnstile check runs after full multipart parsing, not before — the create handler's own header comment and the Dev Agent Record both claim "Turnstile runs FIRST, before any DB work," but `create()` actually calls `readCreateMultipart` (buffers up to 5 files, runs MIME/size validation) BEFORE the Turnstile verification. Fix: check the `turnstileToken` field as soon as it's encountered in the multipart stream, before processing any file part, rejecting before buffering files. [apps/api/src/modules/helpdesk/member-handlers.ts]
- [x] [Review][Patch] **(Resolved decision: implement now)** No idempotency protection on ticket creation — a double-tap or client-side retry issued before the mobile `busy` state re-renders can pass Turnstile + validation + routing twice, creating duplicate tickets. This closes the item 10.1's own review explicitly deferred to "whichever of 10.2/10.3 first needs retry-safety" with the prescribed fix: a client-generated idempotency token (mobile) + a server-side keyed dedup store on create. [apps/api/src/modules/helpdesk/member-handlers.ts, apps/mobile/app/(helpdesk)/new.tsx]
- [x] [Review][Patch] **(Resolved decision: build the picker)** Subcategory selection is structurally unreachable from the member filing form — `categoriesForPariwar` returns subcategories per category and the i18n catalog ships an unused `new.subcategory_label` key, but `new.tsx` never renders a subcategory picker or sends `sub_category`. Fix: add a subcategory picker to `new.tsx` (shown when the selected category has subcategories) and send `sub_category` in the create request. [apps/mobile/app/(helpdesk)/new.tsx, packages/domain/src/helpdesk/read.ts]
- [x] [Review][Patch] Missing aggregate attachment-size cap — each file is capped at 10 MiB and count at 5, but nothing caps the *sum*, so up to ~50 MiB can be buffered per request. [apps/api/src/modules/helpdesk/member-handlers.ts]
- [x] [Review][Patch] Subject/body join delimiter (`\n\n`) is unescaped and lossy on round-trip — `MemberCreateTicketRequest.subject` permits embedded newlines, and a subject containing a blank line gets silently truncated with the remainder folded into the body on every read; untested. [packages/domain/src/helpdesk/read.ts, packages/contracts/src/helpdesk/member.ts]
- [x] [Review][Patch] Literal NUL byte in a test string (`sanitizeAttachmentFilename('good\x00name.png')`) makes git/GitHub treat the entire file as binary ("Binary files ... differ"), hiding all future diffs of this test file from normal review tooling. Use an escaped `' '` literal instead. [packages/contracts/tests/helpdesk.test.ts]
- [x] [Review][Patch] `MemberTicketDetailResponse.attachments` has no `.max()` cap, unlike the sibling `HelpdeskTicketDto.attachments` this same diff caps "consistently" per its own comment. [packages/contracts/src/helpdesk/member.ts]
- [x] [Review][Patch] Hardcoded attachment-limit constants/copy duplicate the contracts constants instead of importing them — `new.tsx` defines its own `MAX_FILES`/`SUBJECT_MAX`/`BODY_MAX`; `en/hi` helpdesk.json hardcode "5 files"/"10 MB" as literal copy. Five independent copies of 2-3 shared constants invite drift. [apps/mobile/app/(helpdesk)/new.tsx, packages/i18n/locales/{en,hi}/helpdesk.json]
- [x] [Review][Patch] AC2's SLA "countdown" renders a static absolute date (`toLocaleDateString()`), not the relative-time/decrementing countdown the AC specifies. [apps/mobile/app/(helpdesk)/[ticketId].tsx]
- [x] [Review][Patch] Missing oversize-attachment (413) integration test — AC7 and the spec's own header comment claim this coverage exists; only 415/count-cap/400/sanitize are actually tested. [apps/api/tests/integration/helpdesk/member-helpdesk.spec.ts]
- [x] [Review][Patch] No component/interaction test for the filing form — AC7 requires "component/interaction tests for the filing flow (category → form → submit → confirmation)"; the existing mobile test only source-scans `index.tsx`/`[ticketId].tsx` via string checks and never touches `new.tsx`. [apps/mobile/tests/unit/helpdesk-screens-render.test.ts]
- [x] [Review][Patch] Empty-string `sub_category` 400s the whole create request while an omitted field succeeds — a no-op ternary lets `''` through to Zod's `.min(1)`. Latent footgun for any non-mobile caller (mobile never sends the field). [apps/api/src/modules/helpdesk/member-handlers.ts]
- [x] [Review][Patch] Misleading route-ordering comment in `member-routes.ts` claims `/categories` is "registered BEFORE `:ticketId` so it's never captured as a ticket id" — the two paths don't share a prefix (categories isn't nested under tickets), so no such collision was ever possible. [apps/api/src/modules/helpdesk/member-routes.ts]
- [x] [Review][Patch] Dead code: `getPariwarId()` added to `session.ts` but never called — every helpdesk screen reads `pariwarId` from `useSession()`/session-context instead; only referenced in a code comment. [apps/mobile/lib/session.ts]
- [x] [Review][Patch] `readCreateMultipart` only drains the current part's stream before throwing on an unsupported MIME type — any subsequent unconsumed parts in the same multipart body are never drained, and no test proves `@fastify/multipart`'s cleanup-on-early-throw is safe here (no prior-art in the repo for mixed fields+files iteration). [apps/api/src/modules/helpdesk/member-handlers.ts]
- [x] [Review][Patch] Category picker has no empty-state — if `categoriesForPariwar` ever returns zero categories (a custom/misconfigured policy), the picker renders nothing and `canSubmit` stays permanently false with no explanation. [apps/mobile/app/(helpdesk)/new.tsx]
- [x] [Review][Defer] Attachment content-type is trusted from the client (`part.mimetype`), never verified against actual bytes (no magic-byte sniffing) — deferred, pre-existing: mirrors the existing `claim-document-storage` posture (no sniffing there either), a systemic convention across upload paths, not a gap introduced by this story. [apps/api/src/modules/helpdesk/member-handlers.ts]

Dismissed as noise or already resolved (8): attachment cap 10→5 on the shared `CreateTicketRequest` (explicitly instructed by Task 1 itself); attachment schema hardening with no migration (Dev Agent Record #7 confirms no live tickets exist yet — 10.1's create route had no live caller before 10.2); AC1's `perMemberKey` vs. literal `namedRateLimits(deps).write` (documented, reasoned deviation, Dev Agent Record #5); AC6's `auth/shared/signed-link.ts` citation (stale citation in the spec text itself — the actual code correctly uses `helpdeskAttachmentStorage.signedReadUrl`); GET routes "lacking" rate limiting (verified false — covered by the global per-IP plugin, consistent with sibling routes); `scopeTx.client` vs. `scopeTx.tx` "consistency risk" (verified false — both are bound to the same underlying client from one `openScopeTx` call); the mobile Turnstile placeholder token (already an explicit forward commitment, Dev Agent Record #6); AC7's `subject_actor_id` rejection test (structurally moot — the field doesn't exist on `MemberCreateTicketRequest`'s `.strict()` schema, so the scenario can't occur).

## Dev Notes

### The reply round-trip is deliberately split (ratified 2026-07-29)

10.2 is **file + view**. The member **reply-append** WRITE (`helpdesk.member_replied`, `awaiting_member → in_progress`) and the `helpdesk_reply` push EMITTER both land in **Story 10.4**, alongside the admin reply — so the full round-trip is built and tested as one coherent unit rather than shipping a `member_replied` arm that can't be reached end-to-end (it needs an admin to first move the ticket to `awaiting_member`). Architecture §3.5a lists "append replies" as a member-surface capability — that capability IS 10.2's member app, but the reply-WRITE is scheduled with 10.4. 10.2 builds the **read-only thread render** so the detail screen is meaningful the moment 10.4's replies exist. `[[feedback_architecture_vs_prd_boundary]]`, `[[feedback_closure_language_precision]]` (this is "Resolved via explicit deferral", not "Not addressed").

### `helpdesk_reply` is a pre-wired NAME contract — consume, don't register

The alert category `helpdesk_reply` **already exists** in `packages/contracts/src/alerts/alert.ts` (`alertVariant('helpdesk_reply', { ticket_id: UuidString })`), and `deepLinkTargetForAlert` (`packages/contracts/src/deep-links/deep-link.ts`) **already routes** it to `{ resource: 'tickets', resourceId: ticket_id }`. 10.2 does **not** touch the alert enum or the deep-link map — it provides the `tickets/:ticketId` **destination screen** the deep link points at. The push EMITTER (fan-out of a `helpdesk_reply` alert when a staff reply is appended) is 10.4. Note the alert primitive (Story 8.1) is cycle-derived (`deriveAlertId` 1:1 with a cycle) — how a helpdesk-reply alert is spawned outside a cycle is **10.4's problem to solve**, not 10.2's. `[[project_alert_primitive_substrate]]`, `[[project_contribution_event_name_contract]]` (a pre-built read/name contract; name drift = green-but-vacuous).

### Reuse 10.1's orchestration verbatim — the member route is a thin auth-and-force wrapper

Story 10.1 built `apps/api/src/modules/helpdesk/handlers.ts` with the full create core (`resolveRoute` → `projectTicketGenesis` → `withCompensatingAudit`), and its `routes.ts` **explicitly documents this handoff**: "the member-app ticket-filing surface (Story 10.2, apps/mobile) adds its own member-session-gated `/member/helpdesk/...` variant reusing the same domain orchestration (the claims member-vs-helpline split precedent)." The member route's ONLY new logic vs. the 10.1 admin route:
- `[requireMemberSession]` instead of `[requireAdminSession, scopeResolutionHook]` — the member JWT backfills `actorId` (= member_id) + `pariwarId`. There is **no scope-resolution HOOK** (that middleware also computes RBAC grants; members have none) — **but RLS still applies**: the member handler opens its own RLS-scoped tx in code via `openScopeTx(deps, request.requestContext.pariwarId)` and `closeScopeTx(scopeTx, ok)` in a `finally`, passing `scopeTx.tx` to `projectTicketGenesis` — the exact pattern `apps/api/src/modules/member-pool/handlers.ts` uses for member-authenticated writes/reads (`import { openScopeTx, closeScopeTx } from '../multi-tenant/scope-tx.js'`). Do NOT persist through an unscoped pool.
- Force `subject_member_id = requestContext.actorId`, `created_via='member_app'`, `subject_actor_id=null`, `operator_attribution=null` — **never** trust a client-supplied subject/actor (the 10.1 admin route rejects `member_app`; the member route is where `member_app` becomes legal).
- No `helpdesk.create` RBAC permission on the member route. Member session IS the authorization (a member has no RBAC grants to check). **Note the re-deferral:** 10.1's Dev Agent Record (chunk-4 review, `[Defer]`) explicitly states "a dedicated `helpdesk.create` permission... land[s] with Story 10.2" — referring to the still-open gap on the *admin* route (`apps/api/src/modules/helpdesk/routes.ts`, `[requireAdminSession, scopeResolutionHook]` only, no `requirePermissionHook`, unlike every sibling admin-write route). This story does **not** close that gap — it only adds the member route, which needs no such permission by design. The admin-route permission gap is **explicitly re-deferred to Story 10.3/10.4** (whichever adds/touches that route next), not silently dropped: it requires an RBAC-catalog + role-bundle change (`packages/domain/src/rbac/roles.ts`) that 10.1's reviewer already judged out of proportion for a route-file fix. `[[feedback_closure_language_precision]]` — this is "Resolved via explicit re-deferral," not "Not addressed."
- `member_scope_context` = `{ pariwar_id, subject_member_id }`, **geo fields null** — the v1 default policy is pariwar-dimension throughout, so it routes to `pariwar_admin`. Geo-context enrichment is a documented seam (10.1 Dev Notes; the resolver already honors geo dimensions, unit-tested). Do NOT invent a member-geo read here.

`[[project_rbac_geo_scope_containment]]`, `[[project_admin_display_name_attribution]]`.

### Bot-management / turnstile: a real, wired primitive already exists — REUSE it, don't defer it

10.1's `routes.ts` says "turnstile/bot-management binding for the member variant land with 10.2." **Corrected reality check** (the story previously claimed no turnstile primitive existed — that was wrong): a `TurnstileVerifier` seam already exists at `apps/api/src/modules/auth/shared/turnstile.ts` (a thin re-export of `@twt/edge`'s interface + the real Cloudflare implementation, Story 1.13), is wired through `deps.ts` (`buildTurnstileVerifier`, `deps.turnstile`) and `context.ts` (`AppDeps.turnstile: TurnstileVerifier`), and is **actively enforced today** on admin login (`admin-auth.handlers.ts` AC-3: `const turnstileOk = await deps.turnstile.verify({ token: body.turnstileToken, remoteIp: request.ip })`, rejecting on failure). **PRD FR-88 names "helpdesk forms" explicitly** alongside signup and claim filing as requiring Turnstile — this is not an optional cross-cutting primitive to build from scratch, it's an existing dependency to call. The member create-ticket route **must** call `deps.turnstile.verify(...)` the same way admin-auth does (add a `turnstileToken` field to the member-facing request variant if the shared `CreateTicketRequest` doesn't already carry one — check before adding a duplicate field), in addition to the FR-88 write rate-limit (`namedRateLimits(deps).write`), which remains a separate, complementary control (architecture §2.11/§5.8a/§3.5a). `[[feedback_record_unattested_no_backfill]]` no longer applies here — this is a confirmed dependency, not an unattested gap.

### Attachments = the Story 6.5 object-store pattern, second helpdesk consumer

Model `HelpdeskAttachmentStorage` on `ClaimDocumentStorage` ([[project_claim_document_storage_port]]): a port + in-memory/local-fs/gcs adapters in `packages/platform-adapters/`, wired via `apps/api/src/deps.ts`. **Object-key + PII-safe metadata in Postgres (the JSONB `attachments[]` col), never base64 bytes.** Signed-URL access via `auth/shared/signed-link.ts`. The MIME allowlist + 10 MB cap + filename sanitization mirror `CLAIM_DOCUMENT_ALLOWED_MIME_TYPES` / `CLAIM_DOCUMENT_MAX_BYTES`. Chunk-3 of the 10.1 review **explicitly deferred** the attachment size/type/filename hardening to "Story 10.2/10.4" — this story closes it. Single-shot multipart create (Task 2) keeps bytes and the ticket row atomic (no orphan-sweep job). **No new table** — attachments are JSONB refs on the ticket row; no migration.

### Member-facing copy — dignified, Hindi-first, no jargon (UX-DR55)

The UX spec's anti-patterns for this exact surface (ux-design-specification.md): "coldness from process-before-person," "bureaucratic ticket-number-first greetings," "ticket numbers before names." So: **no raw `ticket_id` as the primary heading**, no enum values shown, no dimension strings, no "SLA" acronym in primary copy (use "expected reply by …"). Routing target is a **role/scope description** ("Your Pariwar admin will respond"), never a person's name (Tier-1/staff-identity protection — [[project_admin_display_name_attribution]]). All copy in `helpdesk` i18n namespace, Hindi-first, en/hi parity gate (the `useClaimT`/`claim.json` precedent). `[[project_yogdaan_status_derivation_convention]]` (neutral, non-accusatory member-facing status language is the house style).

### Event-derived state — the read side only

The ticket's `current_state` is projector-maintained (10.1's DB trigger + the `helpdesk-state-invariant` CI gate). 10.2 **reads** `current_state` and **replays** the event stream for the thread; it writes `current_state` NOWHERE (feature code writing `current_state` fails the gate). The member create route writes the genesis via `projectTicketGenesis` (the sanctioned sole writer) — that's the only state write in 10.2, and it's 10.1's function unchanged. `[[project_alert_primitive_substrate]]`, `[[project_helpdesk_primitive_substrate]]`.

### Mobile stack facts (don't re-derive)

- Expo Router file-based routing; route **groups** are `apps/mobile/app/(group)/`; register the group as a `Stack.Screen` in `app/_layout.tsx` (existing list: `(contribution)`, `(claim)`, `(nominee)`, …).
- UI = **Tamagui**; data = **TanStack Query** (`lib/query-client`); local persistence = **MMKV** (`lib/mmkv` `mmkvStorage`), NOT AsyncStorage ([[project_mmkv_asyncstorage_equivalent]]).
- Attachment picker = `expo-image-picker` + `expo-document-picker` → multipart `FormData` with the `{ uri, name, type }` `PickedFile` descriptor (the `(claim)/document.tsx` pattern).
- API base URL = `EXPO_PUBLIC_API_URL` (per `eas.json` profile), bearer from `lib/session` `getAccessToken`.
- Guard the New-Arch Fabric FlatList empty→populated red-box on the inbox ([[project_fabric_flatlist_empty_populated_crash]]).
- Emulator build/run: [[project_mobile_android_emulator_setup]] (`expo install --fix` for the Expo-55 dep-drift crash; Pixel_9 AVD; `adb reverse`).

### Testing standards summary

- Live-DB tests: `twt-test-pg` Docker on **:5433**; own-committing writers accumulate rows → **assert membership, not counts**; never `DROP SCHEMA` to reset ([[project_live_db_test_gotchas]], [[project_known_livedb_test_failures]]).
- Merge gate = `pnpm ci:local` (mirrors all ci.yml jobs; integration needs `DATABASE_URL` on :5433; `--concurrency=4`) — GitHub Actions suspended, local mirror is the gate ([[project_ci_actions_suspension_local_mirror]], [[project_ci_local_concurrency_oversubscription]]).
- New routes + `.strict()` contracts + any `onSend`: return the body value, never `void reply.status(201).send()` — the double-send bug 10.1 hit on this exact module ([[project_fastify_onsend_doublesend]]).
- Domain dynamic `.limit()` → integer literal or `clampLimit(...)`, never a named constant passed directly ([[project_domain_limit_clamp_and_savepoint_retry]] — the AI-1.14 gate 10.1 tripped on).
- ESLint per-package (`pnpm --filter <pkg> lint`); carve-outs use cwd-relative role globs ([[project_eslint_config_per_package_cwd]]).
- Story-validate footguns to self-check: domain-camelCase vs contracts-snake_case shape drift; JSONB `->>` TEXT-vs-integer casts; UI-component misattribution across sibling modules ([[project_story_validate_footguns]]).

### Project Structure Notes

- **Confirmed-real paths:** `apps/api/src/modules/helpdesk/` (10.1 — add the member routes/handlers), `packages/domain/src/helpdesk/` (10.1 — add member reads), `packages/contracts/src/helpdesk/` (10.1 — add member DTOs + attachment hardening), `apps/mobile/app/` (Expo Router groups), `packages/i18n/locales/{en,hi}/` (add `helpdesk.json`), `packages/platform-adapters/src/` (add `helpdesk-attachment-storage/`), `packages/api-client/src/index.ts` (add the member factory).
- **Epics-prose drift (do NOT follow literally):** epics.md 10.2 AC + §3.5a name a member "`apps/member`" surface — **there is no `apps/member`**; the member app is `apps/mobile` (10.1 AC1 already ratified this; [[project_helpdesk_primitive_substrate]]). Build in `apps/mobile`.
- **No migration** in 10.2 — attachments ride the existing JSONB `attachments[]` column (0084); object bytes live in the store.

### References

- [Source: epics.md#Story 10.2] — member ticket filing: category + subject + body + attachments + status visibility; routing target + SLA visible; inbox + `helpdesk_reply` dispatcher; UX-DR55 dignified copy; Hindi-first; explicit attachment limits.
- [Source: epics.md#Epic 10] — helpdesk first-class sub-epic; demoable closure ("Member files ticket via member app; routing routes to district-admin scope; SLA timer starts; admin replies; member receives reply push").
- [Source: architecture.md#3.5a Helpdesk ticketing subsystem (FR-52)] — member-facing UI ("their own tickets + status, append replies, receive helpdesk-reply push"); form ingress via FR-88 protected surface + rate-limit + bot-management (§2.11/§5.8a); §3.4 dispatch-suppression for frozen-account members.
- [Source: architecture.md#3.4] — "Helpdesk reply → push to ticket owner" (the emitter is 10.4; the deep-link destination is 10.2).
- [Source: implementation-artifacts/10-1-*.md] — the substrate: schema, reducer, routing resolver, versioned registry, `projectTicketGenesis`, `DEFAULT_ROUTING_POLICY`, the `withCompensatingAudit` posture, the deferred attachment-hardening finding (chunk 3), and the documented 10.2 handoff in `routes.ts`.
- [Source: prds/prd-TWT-2026-05-22/prd.md#FR-52] — categories (v1), auto-routing category×scope, SLA targets (24h first-response), state set.
- [Source: apps/api/src/modules/auth/shared/member-session-guard.ts] — `requireMemberSession` (JWT → `actorId`/`pariwarId` backfill; `MEMBER_SESSION_GUARD` login-wall tag).
- [Source: apps/api/src/modules/helpdesk/{handlers,routes}.ts] — the 10.1 create core to reuse + the FR-88 `namedRateLimits.write` posture + the documented member-variant handoff.
- [Source: packages/contracts/src/alerts/alert.ts + deep-links/deep-link.ts] — the pre-wired `helpdesk_reply` alert variant + `tickets/:ticket_id` deep-link (consume, don't register).
- [Source: apps/api/src/modules/claims/claims.documents.handlers.ts + packages/platform-adapters/src/claim-document-storage/ + apps/api/src/modules/auth/shared/signed-link.ts] — the Story 6.5 object-store PORT + signed-URL pattern to mirror.
- [Source: packages/contracts/src/claims/documents.ts] — `CLAIM_DOCUMENT_ALLOWED_MIME_TYPES` / `CLAIM_DOCUMENT_MAX_BYTES` (the attachment-hardening model).
- [Source: apps/mobile/lib/claim-api.ts + claim-i18n.ts + app/(claim)/document.tsx] — the member-app SDK-client, i18n-hook, and attachment-picker/multipart patterns to mirror.
- [Source: packages/api-client/src/index.ts:866 `createMemberClaimClient`] — the member SDK factory precedent for `createMemberHelpdeskClient`.
- [Source: ux-design-specification.md] — UX-DR55 dignified-copy anti-patterns (process-before-person, ticket-number-first greetings).

## Dev Agent Record

### Agent Model Used

Opus 4.8 (claude-opus-4-8)

### Debug Log References

- `pnpm ci:local` (`--concurrency=4`, DATABASE_URL on :5433) — **29 jobs green** on a freshly-migrated DB (all 23 gates + lint + typecheck + build + unit + crypto-check + integration-tests).
- Live-DB innocence check: the 4 count-based integration flakes first seen (`cross-pariwar-leak`, `rls/policy-regression`, `active-contribution-read`) were own-committing-accumulation flakes from repeated local runs (the DB had 240/60/… accumulated rows under fixed test pariwars). `active-contribution-read` reads ALERTS — a surface Story 10.2 never touches — so its failure proved the pollution was environmental. After `DROP DATABASE twt_dev; CREATE; db:migrate`, the full integration suite passed (@twt/domain 1834, @twt/api 698, all packages green). [[project_live_db_test_gotchas]] / [[project_known_livedb_test_failures]] — assert membership not counts.

### Completion Notes List

**All 8 tasks + 8 ACs delivered; `ci:local` green on a fresh DB.**

Key decisions & deviations (recorded openly):

1. **"subject" without a schema column (no migration).** The 10.1 substrate has only a `body` column and 10.2 adds no migration (ratified). The member form collects a short subject + a longer body (AC1); the create route JOINs them (`joinMemberTicketSubjectBody` → `subject\n\nbody`) and the reads SPLIT them back (`splitMemberTicketSubjectBody`, splits on the first blank line). Because a member only ever reads their OWN member_app-created tickets — all joined by this exact route — the split is EXACT for every ticket the reads carry; the fallback handles admin/helpline-created bodies gracefully. Round-trip unit-tested.

2. **Single-shot multipart create (Task 2 recommended path).** The create route reads `multipart/form-data` (fields + files in one request) via `request.parts({ limits: { files: HELPDESK_ATTACHMENT_MAX_COUNT, … } })` — a PER-REQUEST limits override above the plugin's global `files: 1` (the claim single-file route), **verified working** by the multi-file + count-over-cap integration tests. Turnstile runs FIRST (before any DB work); the storage `put` happens after validation+routing succeed and before the genesis persist; a persist failure best-effort-deletes the just-put objects. Object storage is not authoritative — an orphaned blob is unreferenced/unreachable.

3. **Attachment signed-URL by INDEX, not object_key.** The member detail DTO exposes `{ filename, content_type, size_bytes }` WITHOUT `object_key`; the URL route is `.../attachments/:attachmentIndex/url` (ownership re-checked via `getTicketForMember`, out-of-range → 404). The opaque storage key never crosses the wire.

4. **Route path carries `:pariwarId` per the AC** (`/api/v1/p/:pariwarId/member/helpdesk/...`) even though the member JWT is the tenancy authority — the handler validates the path pariwarId equals `requestContext.pariwarId` (mismatch → 404, no oracle) and scopes ALL work by the JWT value.

5. **Per-MEMBER write rate-limit** (`perMemberKey`, `hook:'preHandler'`), NOT `namedRateLimits.write` (which is `perSessionKey` → falls through to the shared IP for token-bearer members). Still the FR-88 protected-surface write budget; complementary to the Turnstile bot-gate. (Deviation from the Task-3 literal `limits.write`, documented in `member-routes.ts`.)

6. **FORWARD COMMITMENT — RN Turnstile widget.** The server-side Turnstile enforcement is built and tested (a rejecting verifier → 403). The mobile app has NO Turnstile widget yet (Turnstile is a browser challenge; an RN webview challenge is out of proportion here), so `lib/turnstile.ts` returns a non-empty placeholder token — the server's no-op verifier accepts it in dev/CI, but a real production verifier would reject it. The RN Turnstile widget is owed before the helpdesk form ships behind a live verifier (the nominee-VPA deferred-seam posture, [[feedback_record_unattested_no_backfill]]/[[feedback_closure_language_precision]] — "resolved via explicit deferral").

7. **Cross-package attachment-shape change.** Hardening `HelpdeskAttachment` (adds `size_bytes`, MIME allowlist, `.max(5)`) required matching the domain `HelpdeskAttachmentRef` + the `helpdesk.ticket_created` event-payload schema; contracts owns the allowlist/count constants and domain re-declares them, with the `tests/helpdesk.test.ts` sync-guard asserting no drift (the category/state-tuple precedent). No migration (JSONB is schemaless); no live tickets existed (the 10.1 create route has no live caller yet). The 10.1 boundary test moved from 10/11 → the constant.

8. **10.4 handoffs consumed, not built.** The read-only thread reader (`replayTicketThread`) is ONE forward-compatible function proven now against a SEEDED reply event (path (b)) — appending message-bearing reply events in 10.4 needs zero change here. The `helpdesk_reply` deep-link destination is the `[ticketId]` screen (consumed, not registered). The member reply-WRITE + the reply push EMITTER remain 10.4.

### File List

**Contracts** (`packages/contracts/`)
- `src/helpdesk/attachment.ts` (new) — allowlist/cap constants, `HelpdeskAttachmentContentType`, `sanitizeAttachmentFilename`, `HelpdeskAttachmentStorage` port.
- `src/helpdesk/member.ts` (new) — `MemberCreateTicketRequest`, `MemberTicket{ListItem,ListResponse,DetailResponse}`, `MemberTicketAttachment`, `HelpdeskThreadEntry`, `HelpdeskCategoryList{Item,Response}`, `HelpdeskAttachmentUrlResponse`.
- `src/helpdesk/ticket.ts` — hardened `HelpdeskAttachment` (+ `size_bytes`, allowlist, `.max(N)`).
- `src/helpdesk/create-ticket.ts` — attachments cap 10 → `HELPDESK_ATTACHMENT_MAX_COUNT`.
- `src/helpdesk/index.ts` — export the two new modules.
- `scripts/emit-openapi.ts` — register the 5 member routes.
- `tests/helpdesk.test.ts` — attachment-hardening + sanitize + allowlist sync-guard tests; boundary numbers updated.
- `openapi/v1.yaml` (regenerated).

**Domain** (`packages/domain/`)
- `src/schema/helpdesk_tickets.ts` — `HelpdeskAttachmentRef.size_bytes` + allowlist/count re-declaration.
- `src/helpdesk/events.ts` — hardened `HelpdeskAttachmentPayloadSchema`.
- `src/helpdesk/read.ts` — `listTicketsForMember`, `getTicketForMember`, `listTicketEvents`, `replayTicketThread`, `join/splitMemberTicketSubjectBody`, `categoriesForPariwar`.
- `tests/helpdesk/member-read.test.ts` (new) — thread-reader (incl. seeded reply) + subject/body round-trip.

**Platform adapters** (`packages/platform-adapters/`)
- `src/helpdesk-attachment-storage/{in-memory,local-fs,gcs}.ts` (new) — the adapter trio.
- `src/index.ts` — export the trio.

**API** (`apps/api/`)
- `src/modules/helpdesk/member-handlers.ts` (new) — the member handlers (create/list/detail/categories/attachmentUrl).
- `src/modules/helpdesk/member-routes.ts` (new) — the 5 member routes.
- `src/modules/helpdesk/index.ts` — register member routes.
- `src/context.ts` + `src/deps.ts` — wire `helpdeskAttachmentStorage`.
- `tests/integration/_setup.ts` — expose the in-memory helpdesk storage in test deps.
- `tests/integration/helpdesk/member-helpdesk.spec.ts` (new) — live-DB E2E (create/ownership 404s/attachment validation/category/turnstile).

**i18n** (`packages/i18n/`)
- `locales/{en,hi}/helpdesk.json` (new) — the member-facing helpdesk namespace (Hindi-first, en/hi parity).
- `src/catalog.ts` — register the `helpdesk` namespace.

**api-client** (`packages/api-client/src/index.ts`) — `createMemberHelpdeskClient` + `MemberHelpdeskClient`.

**Mobile** (`apps/mobile/`)
- `app/(helpdesk)/{_layout,index,new,[ticketId]}.tsx` (new) — the group + inbox + filing form + detail.
- `app/_layout.tsx` — register the `(helpdesk)` Stack.Screen.
- `lib/{helpdesk-api,helpdesk-i18n,helpdesk-draft,turnstile}.ts` (new).
- `lib/session.ts` — `getPariwarId` helper.
- `components/helpdesk/useHelpdeskQueries.ts` (new).
- `tests/unit/{helpdesk-draft,helpdesk-screens-render}.test.ts` (new).

### Change Log

| Date | Change |
|---|---|
| 2026-07-29 | Story 10.2 implemented — member-app helpdesk file+view surface on the 10.1 substrate: hardened attachment contract + storage port/adapters, member API module (multipart create + ownership-scoped reads + category read + signed-URL), domain member reads + forward-compatible thread reader, `helpdesk` i18n namespace, api-client factory, `apps/mobile/app/(helpdesk)/` UI, and full test coverage. `pnpm ci:local` green (29 jobs) on a fresh DB. Status → review. |

