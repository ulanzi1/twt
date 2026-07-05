---
baseline_commit: 5557cda5ac2cce07068227b4e301501e52988260
---

# Story 5.1: Structured `alert` Payload Schema + Channel-Provider Abstraction + Central Dispatcher `[PRIMITIVE]`

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Solo Builder authoring the channel primitive that downstream epics (Epic 6 claim notifications, Epic 8 contribution notifications) consume,
I want a structured `alert` payload schema in `packages/contracts/alerts`, a channel-provider abstraction in `packages/channels`, and a central dispatcher that takes an alert and fans out to enabled channels per the three-tier hierarchy,
so that the FR-23 nudge seam (architectural freeze row 15) is enforced by construction — Epic 6 / Epic 8 trigger logic *publishes* alerts, the dispatcher *owns* delivery.

**This is the FIRST story of Epic 5 and a `[PRIMITIVE]`.** It ships the substrate only: the payload schema, the provider interface + provider stubs, the dispatcher, the immutability + byte-identical-replay invariant, and the two audit lines. It does **not** integrate any real provider SDK (FCM/APNs/WA/SMS/Telegram concrete sends land in Stories 5.2–5.6), does **not** implement cost-optimization (5.7) or the degraded-mode bridge (5.8), and does **not** build the WA opt-in webhook (5.4).

## Acceptance Criteria

**AC1 — Alert payload schema (Zod, in `packages/contracts`).**
Author an `Alert` Zod schema in `packages/contracts/src/alerts/` carrying exactly these fields: `alert_id` (UUID), `pariwar_id` (UUID), `member_id` (UUID), `alert_category` (enum, 9 values: `alert_published | deadline_reminder | contribution_confirmed | contribution_mismatch | claim_status_change | helpdesk_reply | module_new | step_up_otp | niyamavali_amended`), `time_critical` (boolean — overrides cost-optimization per AR-18/Story 5.7), `provenance_refs` (traceability into source events, e.g. `clause_id`, `claim_id`, `pool_id`, `audit_id`), `payload_data` (typed per category via a **discriminated union** keyed on `alert_category`), `created_at` (ISO-8601 datetime), `created_by_actor`. Schema is `.strict()`. NO `.openapi()` registration (internal queue seam, not an HTTP endpoint → `openapi/v1.yaml` stays byte-identical) — same posture as the existing `notifications/` and `consent/` contracts.

**AC2 — Channel-provider abstraction + provider stubs (in `packages/channels`).**
Expose a `ChannelProvider` interface with `send(rendered_message, target): Promise<SendResult>` and `getStatus(message_id): Promise<SendStatus>`. Concrete providers (`fcm`, `apns`, `whatsapp-business`, `sms-dlt`, `telegram`) live in `packages/channels/src/providers/` and are **stubs** in this story (implement the interface, no real SDK) — real integration is 5.2–5.6. Each channel also has a **pure renderer** `render(alert): RenderedMessage` whose input is read-only (`Readonly<Alert>`).

**AC3 — Central dispatcher: policy-agnostic, fixed channel order, sole suppression boundary.**
Expose `dispatch(alert)` that fans out to the enabled channels. The dispatcher is **policy-agnostic**: cost-optimization (5.7) and the degraded-mode SMS bridge (5.8) **wrap** the dispatcher rather than live inside it.
- **Canonical channel iteration order (dispatcher-owned, fixed).** Fan-out follows a single canonical order declared as **one constant/tuple in the dispatcher** — the three-tier fallback ladder **(1) in-app push (FCM/APNs) → (2) WhatsApp Business → (3) SMS-DLT**, with **(4) Telegram mirror** dispatched as a parallel fire-and-forget side-channel that is NOT part of the fallback ladder and never affects ladder ordering or outcome. The order MUST NOT be derived from object-key iteration, `Map`/`Set` insertion order, or config enumeration (all re-orderable / non-obvious). Downstream stories add providers *into* this fixed order; they never re-sequence it. A unit test asserts the order is fixed.
- **Per-channel category eligibility** is enforced (Telegram is announcements-only — per-member/per-claim categories such as `contribution_confirmed`, `helpdesk_reply`, `claim_status_change` are NOT eligible for Telegram; architecture §3.4 Telegram privacy posture).
- **Lifecycle suppression is the dispatcher's exclusive boundary.** The dispatcher owns lifecycle-driven dispatch suppression (frozen-account push suppression, architecture §3.4) as the single source of truth for what is dispatched to whom. Story 5.1 intentionally ships only the **extension point** (a typed hook), because the required member-state read model is not yet part of this primitive. **No caller and no downstream story (5.2–5.9, Epic 6/8) may implement suppression independently** — suppression logic must live only at this boundary.

**AC4 — Alert-payload immutability-after-dispatch invariant (this story's load-bearing commitment).**
Once `dispatch(alert)` is called, the payload is **immutable for that dispatch cycle** — no field of the original payload may be modified. Enforced at **two layers**: (a) type-system — `Readonly<Alert>` (deep) so renderer signatures cannot mutate; (b) runtime — a deep-freeze-after-dispatch guard. Channel renderers may transform *presentation* (push title vs WA UTILITY template vs concise SMS) but MUST NOT mutate semantic payload meaning, provenance refs, or alert classification. An attempted mutation logs an audit line as a **P0 architectural violation**.

**AC5 — Byte-identical replay determinism — RENDER phase only (CI-gated, per channel).**
Renderers are **pure functions of the immutable payload**: replaying a dispatch with the same `alert_id` produces **byte-identical rendered messages per channel**. A CI test asserts this for **every channel**. Model on the existing `packages/validity-service` `determinism-replay` gate (100 runs distributed across 8 real worker threads → exactly one distinct hash). This IS Epic 4's determinism muscle in a new domain (epic-4-retro §6, signal 1).
- **The guarantee is scoped to the RENDER phase only** (`alert → RenderedMessage`). **Provider delivery (`send`/`getStatus`) is intentionally OUTSIDE this guarantee** — network calls, provider responses, `message_id`s, timing, retries, and delivery outcomes are non-deterministic by nature. The determinism gate asserts rendered-output equality, **never** delivery equality; do not assert determinism over `SendResult`/`SendStatus`.

**AC6 — Channel-renderer escaping discipline (security).**
Each renderer escapes payload data at variable substitution. A CI test asserts that a fixture with markdown / template syntax / injection payloads in a name-like field renders as **inert text** in each channel (architecture §3.4 "Channel-renderer escaping discipline").

**AC7 — Audit lines (Story 1.10 hash chain).**
On dispatch, write **one** dispatch audit line recording the alert payload digest + the list of channels attempted; **each** channel's send writes its **own** audit line with the rendered-message hash + send status. Use `writeAuditEntry` from `@twt/domain`. The rendered-message hash written to an audit row MUST be an **HMAC / blind index** (server-held key), never `sha256(rawRenderedMessage)`, because rendered messages carry member PII (AI-4-3 checklist item (c)). Never write a raw payload into an audit field.

## Tasks / Subtasks

- [x] **Task 1 — `Alert` payload schema (AC1).**
  - [x] Create `packages/contracts/src/alerts/alert.ts`: the `Alert` Zod object (`.strict()`) + `AlertCategory` z.enum (9 values) + the per-category `payload_data` **discriminated union** (`z.discriminatedUnion('alert_category', [...])` or a `payload_data` union keyed to category — pick one and document; the discriminant must make each category's `payload_data` shape statically known). Reuse `Iso8601Datetime` and UUID primitives from `packages/contracts/src/_common/`.
  - [x] Create `packages/contracts/src/alerts/index.ts` barrel; add `export * from './alerts/index.js';` to `packages/contracts/src/index.ts` with a comment matching the house style (note: NO `.openapi()`, `openapi/v1.yaml` unchanged).
  - [x] Unit test `packages/contracts/tests/alerts.test.ts`: valid payload per category parses; unknown key rejected (`.strict()`); wrong `payload_data` shape for a category rejected by the discriminated union.
  - [x] Verify `openapi/v1.yaml` is byte-identical after (run `pnpm turbo run contracts:check-openapi-determinism`).

- [x] **Task 2 — New package `@twt/channels` scaffold (AC2).**
  - [x] Create `packages/channels/` with `package.json` (`"name": "@twt/channels"`, `"private": true`, `"type": "module"`, `"main": "./src/index.ts"`, scripts mirroring a leaf package — build/lint/typecheck/test + a `test:determinism` script), `tsconfig.json` (extends `../../tsconfig.base.json`), `eslint.config.js` (`export default twtConfig`), `vitest.config.ts` (mirror validity-service — `.test.ts` unit + `tests/**` include, `pool: 'forks'`).
  - [x] Dependencies: `@twt/contracts` (Alert schema), `@twt/domain` (canonical-json + audit + HMAC), `@twt/eslint-config-twt` (dev). Do NOT add real provider SDKs yet.
  - [x] Confirm `pnpm-workspace.yaml` `packages/*` glob picks it up (it does — no edit needed); run `pnpm install`.

- [x] **Task 3 — `ChannelProvider` interface + provider stubs (AC2).**
  - [x] `packages/channels/src/provider.ts`: `ChannelProvider` interface (`send(rendered: RenderedMessage, target: SendTarget): Promise<SendResult>`, `getStatus(message_id): Promise<SendStatus>`), plus `RenderedMessage`, `SendTarget`, `SendResult`, `SendStatus` types.
  - [x] `packages/channels/src/providers/{fcm,apns,whatsapp-business,sms-dlt,telegram}.ts`: each implements `ChannelProvider` as a **stub** (returns a well-formed `SendResult` / not-implemented marker; no network). These are the swap seams (architecture §3.4 "Providers are swappable").

- [x] **Task 4 — Pure renderers + immutability guard (AC4, AC5, AC6).**
  - [x] `packages/channels/src/render.ts`: per-channel pure `render(alert: Readonly<Alert>): RenderedMessage`. NO clock reads, NO randomness, NO external I/O inside a renderer (determinism sources — Epic 4 date-math dissolution lesson). All variable substitution goes through an **escaping** helper.
  - [x] `packages/channels/src/freeze.ts`: a `deepFreeze<T>(value: T): Readonly<T>` (none exists in the repo — create it) + the `Readonly<Alert>` deep type. `dispatch` deep-freezes the alert before any renderer runs.
  - [x] Mutation-attempt path: in dev/test, a strict-mode assignment to a frozen field throws; catch/detect and write the **P0 architectural-violation** audit line (AC4). Document how the guard behaves in prod (frozen object → silent no-op in non-strict, throw in strict/module scope — assert the module runs in strict mode so mutation throws).

- [x] **Task 5 — Central dispatcher (AC3, AC7).**
  - [x] Declare the **canonical channel iteration order** as a single exported `const` tuple in the dispatcher: `[push, whatsapp, sms]` fallback ladder + `telegram` as a parallel side-channel. Fan-out iterates THIS constant — never object-key / `Map` / config order. Add a unit test asserting the order is the fixed tuple.
  - [x] `packages/channels/src/dispatch.ts`: `dispatch(alert)` — deep-freeze → iterate the canonical channel order → per-channel category-eligibility gate (Telegram announcements-only) → `render` → `provider.send`. Keep it **policy-agnostic** (no cost-opt, no degraded bridge — those wrap it in 5.7/5.8).
  - [x] Audit: one dispatch line (payload digest via `canonicalJsonStringify` from `@twt/domain` → sha256 hex for the `requestPayloadHash` slot; channels-attempted in `resourceLocator`/trace) + one per-channel send line (rendered-message **HMAC** hash + send status). Use `writeAuditEntry(servicePool, …)`; never put a raw payload/rendered message in an audit field.
  - [x] Lifecycle-suppression: the dispatcher is the **sole** suppression boundary (architecture §3.4 — single source of truth for what gets dispatched to whom). Story 5.1 ships only the **extension point** — a typed hook + a comment naming the deferral — because the required member-state read model is not yet part of this primitive. Do NOT stub it silently, and do NOT implement suppression anywhere else: **no caller, renderer, provider, or downstream story (5.2–5.9, Epic 6/8) may reimplement suppression independently.** State this exclusivity in a comment at the hook site.

- [x] **Task 6 — Determinism-replay CI gate for channels (AC5).**
  - [x] `packages/channels/tests/determinism.test.ts` (+ worker `.mjs` if mirroring the threaded harness): render a fixed `alert_id` payload N× and assert exactly one distinct rendered output **per channel** (byte-identical). The gate exercises **`render` only — never `send`** (delivery is non-deterministic, AC5). Copy the structure of `packages/validity-service/tests/determinism.test.ts` + `determinism.worker.mjs`.
  - [x] Wire the gate: add a job to `.github/workflows/ci.yml` (mirror the `determinism-replay` job — static, no DB/network) + a `run "channels-determinism" …` line to `scripts/ci-local.sh` via `@twt/channels test:determinism`. (No `turbo.json` task added — matches the existing `determinism-replay` wiring, which invokes the package script directly; the unit `test` job also runs it as it matches `*.test.ts`.)

- [x] **Task 7 — Escaping + unit tests (AC6) and audit tests (AC7).**
  - [x] `packages/channels/tests/escaping.test.ts`: name-with-markdown/template-syntax/injection fixture → inert text in each channel.
  - [x] Audit tests: dispatch writes one dispatch line + one per channel; rendered-message hash is HMAC (not raw sha256 of PII); P0-violation line on mutation attempt. DB-touching assertions go in `tests/integration/**/*.spec.ts` guarded by `describe.skipIf(!hasDatabase)`.

- [x] **Task 8 — AI-4-3 access-wrapper checklist walk (REQUIRED before PR).**
  - [x] Walk `docs/access-wrapper-invariants.md` items (a)–(e) for the dispatch audit path and name the covering test for each (or mark N/A with reason). The live items for 5.1: **(c)** HMAC-not-raw-PII rendered-message audit hash; **(d)** any best-effort write on an isolated `servicePool` connection, never a caller tx. Record the walk in the Dev Agent Record.

- [x] **Task 9 — Green the merge gate.**
  - [x] `pnpm ci:local` is the merge gate (GitHub Actions suspended). Run it; the new `channels-determinism` job + `contracts:check-openapi-determinism` (byte-identical) + typecheck + lint must be green. Integration `.spec.ts` need `DATABASE_URL` on `:5433` — run those serially.

### Review Findings

Code review 2026-07-05 (adversarial 3-layer: Blind Hunter, Edge Case Hunter, Acceptance Auditor; 2 findings dismissed as noise). **All 16 patch findings applied same day** (decisions D2 parse-at-entry + D3 `deadline_display` resolved to patches; D1 per-channel escaping deferred to 5.2–5.6 — see deferred-work.md). Post-patch gates: contracts 204 tests green, channels 42 tests green (incl. live-DB spec + determinism gate), typecheck/lint clean, `openapi/v1.yaml` byte-identical.

- [x] [Review][Defer] Per-channel escaping (blanket `escapeText` garbles plaintext channels; Telegram MarkdownV2 `! . - + = |` unescaped) [packages/channels/src/render.ts:31] — deferred by decision 2026-07-05: escaping syntax is channel-specific and belongs in 5.2–5.6 where each real provider's parse mode is known; 5.1's uniform escaping keeps injection payloads inert and avoids churning determinism fixtures twice. Each provider story (5.2–5.6) MUST own its channel's escaping semantics.
- [x] [Review][Patch] Validate at dispatch entry (decision 2026-07-05) — `AlertSchema.parse(alert)` as the first line of `dispatch`, failing fast before any send; closes the schema-invalid-alert → delivered-with-zero-audit-trail hole (audit writes ZodError inside the swallowing port). Freeze then applies to the validated copy. [packages/channels/src/dispatch.ts:150]
- [x] [Review][Patch] Add pre-formatted `deadline_display` to the `deadline_reminder` payload_data variant (decision 2026-07-05) — renderer uses it instead of the raw ISO-8601 UTC timestamp; producer (Epic 8) owns formatting, render stays deterministic (AC5). [packages/contracts/src/alerts/alert.ts]
- [x] [Review][Patch] Uncaught `provider.send`/`hashRendered` rejection aborts dispatch mid-ladder and loses ALL audit lines (critical; found by all 3 layers) — try/catch wraps only `renderFn`; a rejection from send (real transports, 5.2+) or the KMS blind-index call propagates out of `dispatch`, remaining channels are never attempted, and neither the per-channel line nor the AC7 dispatch line is written — worst case a message IS delivered with no audit trace, defeating AI-4-3(d). Catch per-channel, assign `outcome: 'error'`. Also makes the Telegram side-channel unable to reject the whole dispatch (AC3). [packages/channels/src/dispatch.ts:247]
- [x] [Review][Patch] `outcome: 'sent'` is unconditional and the AC7 dispatch line records channels *sent*, not *attempted* — a provider returning `rejected`/`not_implemented` still yields `outcome: 'sent'` (5.1 stubs make the audit trail claim 4 channels delivered when zero were), and the dispatch line filters `outcome === 'sent'` though AC7 mandates "channels attempted". Derive outcome from `result.status`; record all attempts with outcomes in the dispatch line. [packages/channels/src/dispatch.ts:261]
- [x] [Review][Patch] `deepFreeze` skips descent through an already-frozen root — `!Object.isFrozen(value)` gates BOTH the freeze and the recursion, so a shallow-frozen alert (`Object.freeze(alert)` by any caller) passes through with fully mutable `payload_data`: nested mutation succeeds silently, no TypeError, no P0 audit line (AC4 hole; found by all 3 layers). Always recurse; use isFrozen only to skip the redundant freeze call. [packages/channels/src/freeze.ts:32]
- [x] [Review][Patch] `isFrozenMutationError` misses `delete` ("Cannot delete property") and `Object.defineProperty` ("Cannot redefine property") mutation vectors — those genuine P0 violations are rethrown and crash dispatch instead of writing `alert.immutability_violation`; conversely unrelated TypeErrors containing "read only" false-positive as P0. Add the two missing substrings; note the string-matching brittleness. [packages/channels/src/freeze.ts:47]
- [x] [Review][Patch] Telegram side-channel is serial-awaited, not "parallel fire-and-forget" (AC3) — it sits in the same serial `await` loop as the ladder, blocking `dispatch` return and (pre-patch) able to reject the whole dispatch. Start it concurrently with the ladder, isolate its errors, and pin the property with a test. [packages/channels/src/dispatch.ts:175]
- [x] [Review][Patch] Suppression `reason` is discarded and suppressed channels leave no audit trace — for the system's SOLE suppression boundary, "why did this member get nothing" is unanswerable; a suppressed time-critical alert is indistinguishable from no-targets. Carry `reason` on `ChannelAttempt` and include suppressed channels in the dispatch-line record. [packages/channels/src/dispatch.ts:215]
- [x] [Review][Patch] iOS push silently falls back to FCM — `?? candidates[0]` sends an APNs token to the wrong transport when a custom registry lacks `apns` (and `platform` is optional on `SendTarget`). Fail explicitly (error outcome) instead of silent fallback. [packages/channels/src/dispatch.ts:140]
- [x] [Review][Patch] `amount_paise` fields have no upper bound — Zod `.int()` accepts any integer-valued double (`1e21`), rendering `₹1e+19` to members. Add a `.max()` safe-integer bound to all paise fields. [packages/contracts/src/alerts/alert.ts:110]
- [x] [Review][Patch] Audit-write failures are silent by default — `createAuditPort`'s `onError` is optional and unwired; a degraded audit DB produces an invisible compliance-trail gap while dispatch reports success. Add a default stderr/logger fallback. [packages/channels/src/audit.ts:155]
- [x] [Review][Patch] `pg` is in the public API (`createAuditPort(servicePool: pg.Pool)`) but only a devDependency — works under workspace hoisting, breaks on pruned/production install. Move `pg`/`@types/pg` to dependencies (or peer). [packages/channels/package.json:11]
- [x] [Review][Patch] `escapeText` comment claims "idempotent-safe" but double-escaping yields `&amp;amp;`/`\\\*` — fix the false contract comment (it invites 5.2 to re-escape). [packages/channels/src/render.ts:29]
- [x] [Review][Patch] Freeze-lifetime wording contradiction — freeze.ts says "immutable for that dispatch cycle" but the freeze is permanent (correct per AC4 "immutability-after-dispatch"); align the comments so 5.6 retry wrappers don't code to the wrong contract. [packages/channels/src/freeze.ts:4]
- [x] [Review][Patch] Stale test pointer — comment cites `tests/dispatch-order.test.ts`; the AC3 order test lives in `tests/dispatch.test.ts`. [packages/channels/src/dispatch.ts:32]
- [x] [Review][Patch] Unrecorded spec deviation — AC2/Task 4 specify per-channel `render(alert)` functions; shipped is one `render(alert, channel)` switch (purity and `Readonly` input hold). Add it to the Dev Agent Record deviation list. [packages/channels/src/render.ts:959]

## Dev Notes

### What this story is (and is NOT)
- **IS:** the `alert` schema, the `ChannelProvider` seam + stubs, pure renderers, the dispatcher, immutability + byte-identical replay + escaping + the two audit lines, and the CI determinism gate.
- **IS NOT:** any real provider SDK (5.2 FCM/APNs · 5.3 WA Business · 5.5 Telegram · 5.6 SMS-DLT), cost-optimization (5.7), degraded-mode SMS bridge (5.8), WA opt-in webhook (5.4), step-up-OTP delivery (5.9), pg-boss retry ladder wiring (5.6), lifecycle-suppression implementation (needs member-state read).

### Three ownership boundaries the dev must not blur
1. **Channel iteration order is dispatcher-owned and fixed** — one canonical `const` tuple (push → WA → SMS ladder; Telegram parallel side-channel). NOT derived from `Map`/object-key/config order. Providers plug *into* the order; they never re-sequence it. Downstream stories (5.2–5.6) add real providers at their fixed positions. (AC3)
2. **Determinism covers the RENDER phase only** — `alert → RenderedMessage` is byte-identical and CI-gated; provider `send`/delivery is deliberately non-deterministic and outside the guarantee. Never assert determinism over `SendResult`/`SendStatus`. (AC5)
3. **Lifecycle suppression lives ONLY at the dispatcher boundary** — the dispatcher owns suppression, but 5.1 ships only the extension point (typed hook), because the required member-state read model is not yet part of this primitive. No caller, renderer, provider, or downstream story may reimplement suppression independently. (AC3, Task 5)

### The load-bearing invariant = Epic 4's determinism muscle, transferred
Story 5.1's "immutability after dispatch + byte-identical replay" is *exactly* the "pure function of immutable input, byte-identical replay, CI-asserted" discipline Epic 4 just built (epic-4-retro §6 signal 1). Reuse the pattern, don't reinvent:
- **`canonicalJsonStringify` from `@twt/domain`** is the SINGLE canonicalizer in the repo (architecture §1.5 build-time invariant; do not add a second). Use it for any payload digest. [Source: packages/domain/src/canonical-json.ts]
- **Renderers must be pure** — no `Date.now()`, no `Math.random()`, no reads. The determinism gate (`packages/validity-service/tests/determinism.test.ts`) is the exact template: 100 total runs distributed across 8 real worker threads (`node:worker_threads`), assert exactly one distinct output hash across all of them. [Source: packages/validity-service/tests/determinism.test.ts, determinism.worker.mjs]

### Epic 5 is wall-to-wall the I-3 access/consent/audit family — AI-4-3 is MANDATORY
Every real Epic 4 defect landed in the *access wrapper*, not the compute core (retro I-3, "the access wrapper is the new TOCTOU"). The checklist walk (`docs/access-wrapper-invariants.md`) is a **required gate for every new access/webhook/consent path in Epic 5**, starting here.
- **(c) HMAC-not-raw-PII:** the per-channel audit line records a rendered-message hash. Rendered messages carry PII (name, etc.), so the audit hash MUST be an HMAC / blind index with a server-held key — NOT `sha256(rendered)`. Use the domain HMAC seam (`blindIndex` / `kms.computeHmac` in `packages/domain/src/encryption/`). Note: the byte-identical *determinism* assertion (AC5) can compare raw rendered bytes directly in the CI test — it does not need the audit hash — so use raw-bytes equality for AC5 and HMAC for the audit row. [Source: docs/access-wrapper-invariants.md; packages/domain/src/encryption/blind-index.ts]
- **(d) isolated best-effort writes:** if any write is best-effort/non-blocking, run it on a dedicated `servicePool` connection, never the caller's tx (the 4.8 poisoning defect).
- **AST gate scope:** the mechanized `access-wrapper:check` currently scans only `packages/validity-service` entrypoints. It will NOT scan `packages/channels` yet — so 5.1's access-path correctness is carried by the **checklist + required tests**, not the gate (`docs/access-wrapper-invariants.md` "Relationship to the AST gate"). Walk it deliberately.

### `writeAuditEntry` — the exact audit primitive (do not hand-roll audit rows)
`writeAuditEntry(servicePool: pg.Pool, input: AuditEntryInput): Promise<AuditLogEntryRow>` in `@twt/domain`. `AuditEntryInput` = `{ pariwarId, actorId|null, actorRole|null, action (dotted lowercase `resource.action`), resourceLocator, requestPayloadHash (SHA-256 hex — NEVER the payload), responseStatus (100–599), traceId? }`. It owns `auditId/seq/recordedAt/prevAuditHash/auditHash` (global hash chain, advisory-lock serialized). It **throws** on error — the caller must wrap in try/catch so audit failure never poisons the request path. Suggested actions: `alert.dispatch` (dispatch line), `alert.channel_send` (per-channel), `alert.immutability_violation` (P0). [Source: packages/domain/src/audit/write.ts:71-200]

### Reuse map (anti-reinvention)
| Need | Reuse this | Location |
|------|-----------|----------|
| Byte-identical hashing | `canonicalJsonStringify` (the ONLY canonicalizer) | `@twt/domain` (`packages/domain/src/canonical-json.ts`) |
| Audit lines | `writeAuditEntry` | `@twt/domain` (`packages/domain/src/audit/write.ts`) |
| PII-safe audit hash | `blindIndex` / `kms.computeHmac` | `packages/domain/src/encryption/blind-index.ts` |
| Determinism gate shape | `determinism.test.ts` + `.worker.mjs` | `packages/validity-service/tests/` |
| Leaf package scaffold | package.json / tsconfig / eslint / vitest configs | `packages/validity-service/` |
| Contract module posture (no `.openapi()`) | `notifications/`, `consent/` modules | `packages/contracts/src/` |
| FR-23 producing seam the dispatcher will consume later | `RenewalReminderNudge` | `packages/contracts/src/notifications/renewal-reminder.ts` |

### The FR-23 nudge seam (why the dispatcher lives in a package, not an app)
Epic 5 owns the *channel primitive*; Epic 6 (claim) and Epic 8 (contribution) *consume* the dispatcher to fire their triggers. Trigger contracts live in `packages/contracts/`; Epic 5 publishes them; Epic 6/8 subscribe (epics.md §Epic 5 "Note on the FR-23 nudge seam"). The producing half already exists for renewal reminders (`RenewalReminderNudge`, Story 3.8) — it publishes to a reserved pg-boss queue consumed by a no-op sink until Epic 5's worker lands. **5.1 does not wire that consumer** (that's later), but the `Alert` schema is the eventual target shape those nudges map into — keep the schema general enough to carry them. Epic 3's member lock-in reminder cadence (+30/+60/+75/+89 days past `valid_through`, epics.md line ~1767) is a **third** dispatcher consumer beyond Epic 6/8 — the Epic 5 intro text only names two, but the dispatcher's public `dispatch(alert)` contract must remain stable for all three.

### Properties architecture commits now, mechanism deferred (do not silently ignore)
Architecture §3.4 commits these as properties of the channel-provider layer even though their *mechanism* is deferred to Category 5 Observability — a `[PRIMITIVE]` should acknowledge the seam exists rather than omit it entirely:
- **Provider auth-lifecycle refresh** (FCM service-account JWT, APNs auth token, WA partner JWT, telephony tokens) must be automatically refreshed + verified. Not implemented in 5.1's stubs; note in the provider stub files where refresh/verification will plug in later.
- **Provider-quota self-regulation** (token bucket / queue pacing / batching to stay within provider quotas, degrading by extending the dispatch window rather than dropping members). Not implemented in 5.1; the dispatcher's fan-out loop should be structured so a rate/queue-aware send path can wrap `provider.send` later without changing `dispatch(alert)`'s signature.
- **Per-Pariwar provider scope declaration** (architecture §3.13 Integration Capability Registry — each channel/provider interface should declare `scope: 'global' | 'per-pariwar'`). `ChannelProvider` in 5.1 does not carry this field yet; add it (or a comment naming the deferral) so 5.3/5.6's per-Pariwar credential wiring has a declared seam to attach to instead of inventing its own.
- **Telegram enforcement mechanism**: architecture says the announcements-only privacy posture's "enforcement mechanism [is] committed in an implementation ADR." Story 5.1 enforces this directly via the per-channel category-eligibility gate (AC3) rather than authoring a separate ADR — this satisfies the architectural property; no additional ADR is required since the enforcement is a code-level gate, not a cloud/infra control.

### Testing standards
- **Vitest.** `.test.ts` = DB-free unit (schema, freeze guard, renderers pure, escaping, determinism gate). `tests/integration/**/*.spec.ts` = live-DB (audit-line writes) guarded by `describe.skipIf(!hasDatabase)` so a `pnpm test` without Docker still passes. `pool: 'forks'`. [Source: packages/validity-service/vitest.config.ts]
- **Merge gate = `pnpm ci:local`** (mirrors all ci.yml jobs; GitHub Actions is suspended — reconcile green locally). Integration suites need `DATABASE_URL` on `:5433` (Docker `twt-test-pg`) and should be run serially per-runner to avoid concurrency-flaky live-DB failures. [Source: memory — CI Actions suspension + local mirror; Live-DB test gotchas]

### Project Structure Notes

- **Location divergence (resolved in favor of epics):** architecture §3.4 places per-channel renderers in `apps/api/modules/channels/<channel>/` (more precisely, nested under the alert module: `apps/api/src/modules/alert/channels/<channel>/`). Story 5.1 (epics.md, story-level and more recent) places the abstraction in **`packages/channels`** and providers in `packages/channels/src/providers/`. **Follow epics** — a `[PRIMITIVE]` consumed by Epic 6 and Epic 8 (separate domains/apps) must be an importable package; ground this in architecture's own **second-consumer promotion rule** (architecture.md line ~3776: a workspace-local module graduates to `packages/` once a second workspace needs to import it) — `packages/channels` is justified once `apps/api` and `apps/jobs` both need channel-send access. `packages/contracts/src/alerts/` is currently a scaffolded directory (`.gitkeep` + README, named in an `index.ts` comment) — **not yet an active barrel export.** The renderers' *purity* is the invariant regardless of location.
- **Schema-location divergence (resolved in favor of epics — previously undocumented, now explicit):** architecture §3.4 (line 1919) places the canonical `Alert` object in `packages/events/`, not `packages/contracts/`. Epics.md's Story 5.1 text says `packages/contracts/alerts` explicitly. **Follow epics** for the same reason as above (external, cross-epic-consumed contract belongs in `packages/contracts`, matching the existing `notifications/`/`consent/` posture) — but this divergence must be named, not silently overridden, so a future reviewer doesn't "fix" it back to `packages/events`.
- **Interface-signature divergence (resolved in favor of epics):** architecture writes `Channel.send(alert, recipient): Promise<SendResult>`; epics writes `send(rendered_message, target)` + `getStatus(message_id)`. **Follow epics** — it correctly separates the pure `render(alert)` step from `send(renderedMessage, target)`, which is what makes the renderer a pure function of the payload (AC5). Note the divergence in the Dev Agent Record.
- **Category count (9 vs 7):** the Story 5.1 enum has **9** values; FR-71 / Story 5.2 name **7** push categories. The extra two (`step_up_otp`, `niyamavali_amended`) are not push-primary — `step_up_otp` delivers via SMS (5.9), `niyamavali_amended` is a broadcast. Keep the **9-value superset** in the schema; document that the push channel (5.2) renders its 7-category subset. Note also FR-71's prose uses hyphenated names (`alert-published`, `alert-deadline-reminder`, ...) while the binding schema enum is snake_case (`alert_published`, `deadline_reminder`, ...) — this is a pre-existing epics.md prose/schema naming mismatch, not a Story 5.1 error; the schema's snake_case spelling is authoritative.
- **Dispatch execution vs. delivery policy (the boundary 5.6 must slot into, not undo).** Story 5.1 provides the **execution primitive only**: it dispatches to the set of channels selected by the caller/eligibility gate, in canonical order, and intentionally does **not** implement retry, backoff, or cascade policy — those are out of scope here, not "unconditional broadcast" as a de facto contract. Story 5.6 introduces the push → WhatsApp → SMS **cascade-on-failure policy** (epics.md: SMS triggers only after push fails 3× with backoff, OR WA fails, OR the member has no opted-in higher-tier channel) by supplying the dispatch plan and retry/escalation logic **at this seam**, without changing the dispatcher's core execution responsibilities. Concretely: **5.1 owns** rendering, provider abstraction, audit, immutability, and deterministic execution of a given dispatch plan; **5.6 owns** retry policy, fallback policy, backoff, escalation, and channel-selection-over-time. Task 5's fan-out loop must expose a seam (e.g., the per-channel send step) that 5.6 can wrap with retry/escalation logic, WITHOUT restructuring the canonical-order constant or the dispatcher's public `dispatch(alert)` signature.
- **Idempotency key / attempt counter — flagged, unresolved, needs confirmation before Story 5.6.** Architecture §3.4 "Replayable outbound dispatch" (line ~2003) requires message-intent storage (target/payload/channel/timestamp/**attempt counter**) with an idempotency key so replay after a provider outage never double-sends. None of AC1's 9 fields cover this, and AC4 freezes the payload immutable-after-dispatch, making a later field addition costly. **This story does NOT add such a field** — recording the gap openly rather than silently deciding it. Before Story 5.6 (which needs retry/replay semantics), confirm with BigDev whether an idempotency key belongs on the `Alert` payload itself (schema change, pre-freeze) or on a separate message-intent record the dispatcher creates per send-attempt (keeping `Alert` unchanged). Do not backfill this decision without an explicit call.
- **New workspace package** `packages/channels` (`@twt/channels`) — picked up by the `packages/*` glob in `pnpm-workspace.yaml`; no workspace-manifest edit needed.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.1] — user story, ACs, field list, enum, immutability invariant, audit lines.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5] — FR-23 nudge seam note; anchoring ARs (AR-15/AR-40 dispatcher, AR-18 time-critical override, AR-53 provider abstraction); dependencies (Epic 1 substrate/audit/RBAC, Epic 3 identity).
- [Source: _bmad-output/planning-artifacts/architecture.md#3.4 Channel-provider abstraction — templated alert + central dispatcher] — canonical Alert shape; dispatcher; per-channel renderer/send; `Channel.send(alert, recipient)`; escaping discipline; provider auth lifecycle; quota self-regulation; replayable-outbound-dispatch (message-intent storage ≠ audit durability); Telegram announcements-only privacy posture; lifecycle-driven dispatch suppression; per-Pariwar provider selection.
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication channels — three-tier hierarchy (line 123)] — in-app push universal; WA dual-gated (admin toggle AND member opt-in), UTILITY templates only; SMS 3 preserved surfaces; Telegram mirror.
- [Source: docs/access-wrapper-invariants.md] — AI-4-3 checklist (a)–(e); the required walk for every Epic 5 access/webhook/consent path; AST gate scope (validity-service only, not channels yet).
- [Source: _bmad-output/implementation-artifacts/epic-4-retro-2026-07-05.md#6 Next Epic Preview — Epic 5] — determinism muscle transfers directly; Epic 5 = wall-to-wall I-3 family; Epic 5 does NOT call the validity engine; epics.md Epic 5 stands as written (no epic-update).
- [Source: packages/domain/src/canonical-json.ts] — `canonicalJsonStringify`, the single repo canonicalizer.
- [Source: packages/domain/src/audit/write.ts] — `writeAuditEntry` + `AuditEntryInput`.
- [Source: packages/domain/src/encryption/blind-index.ts] — HMAC/blind-index for PII-safe audit hashes.
- [Source: packages/validity-service/tests/determinism.test.ts] — the byte-identical-replay CI gate template.
- [Source: packages/contracts/src/notifications/renewal-reminder.ts] — the existing FR-23 producing seam.
- [Source: memory] — CI Actions suspension + local mirror (`pnpm ci:local` = merge gate); Live-DB test gotchas (serial runs, `:5433`); Architecture vs PRD/ADR boundary (epics carries story-level policy).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (BMad Dev Story workflow).

### Debug Log References

- `pnpm --filter @twt/contracts exec vitest run tests/alerts.test.ts` → 7 passed.
- `pnpm turbo run contracts:check-openapi-determinism` → deterministic; `git status openapi/v1.yaml` empty (byte-identical, AC1).
- `pnpm --filter @twt/channels typecheck` / `lint` → clean.
- `pnpm --filter @twt/channels exec vitest run` (unit) → 27 passed (freeze/render/escaping/dispatch).
- `pnpm --filter @twt/channels test:determinism` → 1 passed (per-channel byte-identical, 100× across 8 real OS threads; AC5).
- `DATABASE_URL=…:5433 pnpm --filter @twt/channels exec vitest run tests/integration/dispatch-audit.spec.ts` → 1 passed (real `writeAuditEntry` + HMAC path).
- `DATABASE_URL=…:5433 pnpm ci:local` → all 19 static/gate jobs + both determinism gates + `integration-tests` GREEN. The lone `test (unit)` red was the documented pre-existing concurrency-flaky live-DB pair (p95-bench / jobs chunk-boundary), surfaced only because `DATABASE_URL` was exported for the whole script so integration specs ran concurrently in the DB-free unit job; re-running `pnpm turbo run test` both DB-free and with `DATABASE_URL` returned 31/31 successful (channels 5 passed | 1 skipped), and both determinism gates stayed green under concurrent load — code confirmed innocent. [[project_known_livedb_test_failures]] [[project_ci_actions_suspension_local_mirror]]

### Completion Notes List

**What shipped (the substrate only):** the `Alert` discriminated-union schema in `@twt/contracts/alerts`; the new `@twt/channels` package with the `ChannelProvider` seam + 5 provider **stubs**; per-channel pure renderers with escaping; the deep-freeze immutability guard; the policy-agnostic central `dispatch(alert, deps)`; the two audit lines; and the CI per-channel determinism gate. Explicitly **NOT** shipped (scope fences held): no real provider SDKs (5.2–5.6), no cost-opt (5.7), no degraded bridge (5.8), no WA opt-in webhook (5.4), no lifecycle-suppression implementation (member-state read model absent — only the extension point ships).

**AC coverage:** AC1 alerts.test.ts + byte-identical openapi; AC2 provider.ts + providers/*; AC3 dispatch.test.ts (fixed `CANONICAL_CHANNEL_LADDER` tuple, Telegram announcements-only eligibility, sole suppression boundary); AC4 freeze.test.ts + dispatch P0-violation path; AC5 determinism.test.ts (RENDER only — never `send`); AC6 escaping.test.ts (all 4 channels); AC7 dispatch.test.ts + dispatch-audit.spec.ts (one dispatch line + one per channel; HMAC-not-raw hash).

**AI-4-3 access-wrapper checklist walk (Task 8; `docs/access-wrapper-invariants.md`).** The dispatch audit path is the Epic 5 access surface:
- **(a) caller-auth verified independently** — N/A for 5.1: `dispatch` publishes an alert to channels; it is not a per-caller redaction/read entrypoint (no caller-supplied authz boolean exists). The producing callers (Epic 6/8) enforce their own authorization before publishing. Recorded so 5.2+'s webhook/opt-in entrypoints (which ARE caller-facing) walk (a)/(b) deliberately — the AST gate does not yet scan `packages/channels`.
- **(b) omitted-caller fails closed** — N/A for the same reason (no caller/omitted-caller branch in `dispatch`).
- **(c) HMAC-not-raw-PII audit hash** — ✅ **live + covered.** Per-channel audit line uses `createRenderedMessageHash` → domain `blindIndex` (server-held per-Pariwar HMAC key), never `sha256(rendered)`. Tests: `dispatch.test.ts` "per-channel hash is the HMAC (not sha256 of the rendered PII)" (unit) + `dispatch-audit.spec.ts` (recomputes the HMAC against the persisted row and asserts `!== sha256(rendered)`). The dispatch line hashes the alert *payload* (ids + admin strings, no raw member PII — same posture as the FR-23 seam) so a plain canonical-JSON sha256 is correct there.
- **(d) best-effort write on an isolated connection** — ✅ **covered.** `writeAuditEntry` connects its OWN `servicePool` client + commits its OWN tx (never a caller tx); the dispatcher holds no request transaction; `createAuditPort` wraps the write in try/catch so an audit failure never poisons dispatch. Test: `dispatch.test.ts` "createAuditPort swallows a write failure and never throws into dispatch".
- **(e) new permission key scope matches route** — N/A: 5.1 adds no RBAC permission key or route.

**Structure divergences (resolved in favor of epics — flagged, not silently overridden):**
1. **Package location** — `packages/channels` (importable primitive), NOT `apps/api/src/modules/alert/channels/` per architecture §3.4. Justified by architecture's own second-consumer promotion rule (apps/api + apps/jobs both need channel-send). Noted in `src/index.ts` header.
2. **Schema location** — `Alert` lives in `@twt/contracts/alerts`, NOT `packages/events/` per architecture §3.4 line 1919. Follows epics (cross-epic-consumed contract, matches notifications/consent posture).
3. **Interface signature** — `send(rendered, target)` + `getStatus(message_id)`, NOT architecture's `Channel.send(alert, recipient)`. Follows epics — separates the pure `render(alert)` step from `send`, which is what makes the renderer a pure function (AC5).
4. **Category count 9 vs 7** — kept the 9-value superset; push (5.2) renders its 7-category subset. FR-71's hyphenated prose names are a pre-existing epics.md mismatch; the snake_case schema spelling is authoritative.
5. **`Channel` (logical: push/whatsapp/sms/telegram) vs `ProviderId` (concrete: fcm/apns/whatsapp-business/sms-dlt/telegram)** — the canonical ladder tuple is over logical channels; `push` is one channel served by two transport providers (`fcm` Android / `apns` iOS), selected by `SendTarget.platform`. This reconciles the AC3 `[push, whatsapp, sms]` tuple with the AC2 5-provider list.
6. **Single `render(alert, channel)` switch, NOT per-channel `render(alert)` functions** (AC2/Task 4 letter) — one pure function with a channel switch; purity and the `Readonly<Alert>` input hold, and the AC5 gate covers all four channels through it. 5.2's per-channel copy refinement plugs in via the `DispatchDeps.render` seam. (Recorded per 2026-07-05 review — was an unrecorded deviation.)

**Substitutions / notes:** `deepFreeze` + `DeepReadonly<T>` created here (none existed — the reuse-map "create it" entry). The `render` seam is injectable in `DispatchDeps` (defaults to the gated pure renderer) — this is how the AC4 P0 mutation-violation path is exercised in tests and how 5.2 refines per-channel copy; an override carries its own determinism obligation.

**Open item carried forward (unchanged — needs BigDev before Story 5.6):** the idempotency-key / attempt-counter question (architecture §3.4 "Replayable outbound dispatch"). 5.1 did NOT add such a field to the now-frozen `Alert` payload — recording the gap openly rather than backfilling the decision. Before 5.6, confirm whether it belongs on `Alert` (schema change, pre-freeze) or on a separate per-attempt message-intent record.

### File List

**Added — contracts (AC1):**
- `packages/contracts/src/alerts/alert.ts`
- `packages/contracts/src/alerts/index.ts`
- `packages/contracts/tests/alerts.test.ts`

**Added — `@twt/channels` package:**
- `packages/channels/package.json`
- `packages/channels/tsconfig.json`
- `packages/channels/eslint.config.js`
- `packages/channels/vitest.config.ts`
- `packages/channels/src/index.ts`
- `packages/channels/src/provider.ts`
- `packages/channels/src/providers/_stub.ts`
- `packages/channels/src/providers/fcm.ts`
- `packages/channels/src/providers/apns.ts`
- `packages/channels/src/providers/whatsapp-business.ts`
- `packages/channels/src/providers/sms-dlt.ts`
- `packages/channels/src/providers/telegram.ts`
- `packages/channels/src/providers/index.ts`
- `packages/channels/src/freeze.ts`
- `packages/channels/src/render.ts`
- `packages/channels/src/audit.ts`
- `packages/channels/src/dispatch.ts`
- `packages/channels/tests/fixtures.ts`
- `packages/channels/tests/freeze.test.ts`
- `packages/channels/tests/render.test.ts`
- `packages/channels/tests/escaping.test.ts`
- `packages/channels/tests/dispatch.test.ts`
- `packages/channels/tests/determinism-runner.ts`
- `packages/channels/tests/determinism.worker.mjs`
- `packages/channels/tests/determinism.test.ts`
- `packages/channels/tests/integration/dispatch-audit.spec.ts`

**Modified:**
- `packages/contracts/src/index.ts` (alerts barrel export)
- `scripts/ci-local.sh` (`channels-determinism` job + `@twt/channels` in integration filter)
- `.github/workflows/ci.yml` (`channels-determinism` job + `@twt/channels` in integration filter)
- `pnpm-lock.yaml` (new `@twt/channels` workspace package)
- `openapi/v1.yaml` — **unchanged / byte-identical** (verified; AC1).

### Change Log

- 2026-07-05 — Adversarial code review (3-layer) + all 16 patches applied: per-channel failure isolation in `attemptChannel` (a rejecting send/KMS-hash can no longer abort the ladder or lose the AC7 dispatch line — the critical finding); honest send outcomes (`SendResult.status` → `sent`/`rejected`/`not_implemented`, dispatch line records EVERY channel with its outcome, never a sent-only filter); `deepFreeze` descends through shallow-frozen roots (AC4 bypass closed) + cycle-safe; `isFrozenMutationError` catches `delete`/`defineProperty`; Telegram side-channel now genuinely concurrent (AC3 fire-and-forget); `Alert.parse` at dispatch entry (D2); `deadline_display` producer-formatted field on `deadline_reminder` (D3); suppression `reason` carried on attempts; explicit iOS-no-apns failure; `Paise` bounded to safe integer; audit-port stderr default `onError`; `pg` → dependencies; comment/contract fixes (escapeText non-idempotence, permanent freeze lifetime, stale test pointer); deviation 6 recorded. D1 per-channel escaping deferred to 5.2–5.6 (deferred-work.md). Status → done.
- 2026-07-05 — Story 5.1 implemented (`[PRIMITIVE]`, first story of Epic 5): `Alert` schema in `@twt/contracts/alerts`; new `@twt/channels` package (provider seam + 5 stubs + pure renderers + deep-freeze guard + policy-agnostic dispatcher + two audit lines); per-channel byte-identical determinism CI gate; AI-4-3 checklist walk recorded. All ACs satisfied; `pnpm ci:local` gates green (the single `test (unit)` red = documented flaky live-DB pair, confirmed innocent).
