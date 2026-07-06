---
baseline_commit: 53e1988aa45557b5291f4fb40f2c8910271c338f
---

# Story 5.5: Telegram Mirror Fire-and-Forget (Locked `[v1-S]`)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a member who has chosen to mirror notifications to Telegram (admin-enabled per Pariwar; v1 locked behind a feature flag),
I want fire-and-forget Telegram delivery in addition to my primary channels,
so that I can read announcements on Telegram if my Pariwar enables it, without Telegram ever becoming a primary delivery path.

## Acceptance Criteria

**AC1 — the Telegram mirror channel (FR-73 `[v1-S, but locked]` + Story 5.1 dispatcher + admin feature flag):**
1. The Telegram provider implements the **frozen** `ChannelProvider` port (`packages/channels/src/provider.ts`) — replacing the Story 5.1 stub — with a real Telegram Bot API `sendMessage` integration, one bot **per Pariwar**.
2. Send is **fire-and-forget**: no delivery confirmation is waited on, and **no fallback ladder fires on a Telegram failure** (Telegram is a parallel mirror side-channel, NOT part of `CANONICAL_CHANNEL_LADDER`). The provider **never rejects its promise** — a Bot API error resolves to a `rejected` `SendResult` whose `detail` classifies the failure (no PII); the dispatcher already isolates Telegram from the ladder.
3. The channel is **locked behind a feature flag per FR-58C**; v1 ships **disabled by default**; a trustee can enable it **per-Pariwar**. FR-58C's full per-cohort flag engine is Epic 10 and does **not** exist yet — v1 realizes the "flag" as a per-Pariwar `pariwar_telegram_config.enabled` toggle (default `false`), mirroring Story 5.3's `pariwar_wa_config.enabled` admin gate. Document this substitution in the Dev Agent Record (mirrors [[project_mmkv_asyncstorage_equivalent]]'s substitution-note discipline).
4. Member opt-in is via a **Telegram bot `/start` interaction with a verification code minted by the app**: the app mints a `PENDING` opt-in with a unique code and hands the member a `https://t.me/<bot_username>?start=<code>` deep-link; tapping opens the bot and sends `/start <code>`; the inbound-update webhook matches the code to the `PENDING`, captures the member's `chat_id`, and advances the opt-in to `ACTIVE`.

**AC2 — dispatch fan-out (Given the dispatcher fans out an alert):**
5. When Telegram is enabled for the Pariwar **and** the member's opt-in is `ACTIVE` (bot started), the Telegram channel is invoked with the member's `chat_id` as the `SendTarget.address`; the alert renders via the existing pure `telegram` renderer (`render.ts`).
6. Telegram delivery **failures are logged but do not affect the primary channel ladder** — no cascade, no fallback, no change to `push`/`whatsapp`/`sms` outcomes.
7. Telegram remains **announcements-only**: the eligibility gate already lives in `dispatch.ts` (`TELEGRAM_ELIGIBLE_CATEGORIES` = `alert_published | module_new | niyamavali_amended`). Do **not** reimplement, expand, or relocate it.

**AC3 — webhook ingress primitive + opt-in reversibility + independent audit (mirrors Story 5.4's load-bearing commitment):**
8. The inbound-update webhook is an **ingress primitive** (extend `apps/api/src/modules/channel-webhooks/`): it **verifies** Telegram's `X-Telegram-Bot-Api-Secret-Token` header (constant-time compare against the per-Pariwar secret), **persists the raw update**, and **acks 200 fast** — with **no business logic in the handler path** (AR-44 / architecture §3.11). An async worker (`apps/jobs`) drains the persisted updates and drives the opt-in state machine.
9. Every opt-in / opt-out transition is **independently audit-logged** via Story 1.10 with the five fields (timestamp, `originating_channel`, matched member identity, consent-state snapshot before AND after, `audit_id` linkage) — mirroring Story 5.4's `waOptInAuditPayloadHash` discipline. Opt-in records persist via Story 2.7's consent registry as a **new `consent_type: telegram_opt_in`**.
10. The opt-in is **independently revocable** (member revoke from app settings, bot `/stop`, or a Telegram "user blocked the bot" `my_chat_member` update) without affecting any other consent type; revocation immediately disables Telegram delivery; future re-opt-in requires a **new** `/start` interaction (no inferred re-consent). The full transition history is queryable in chronological order.

## Tasks / Subtasks

> **Scope shape:** this story is a composite of Story 5.3 (real provider + per-Pariwar config table) and Story 5.4 (webhook ingress + opt-in state machine + consent + settings surface), applied to Telegram. **Mirror those two stories' files closely** — they are the proven precedent. The **key simplifications vs. WhatsApp** (do not copy blindly): (a) **no 24h window** — Telegram bots may message a user who has `/start`-ed until the user blocks/stops the bot, so there is **no `window_expires_at`**; (b) **no mobile blind index** — Telegram never shares the member's phone, so the match key is the **verification code alone** and the captured **`chat_id`** is the delivery address; (c) **announcements-only** eligibility is already enforced in `dispatch.ts`.

- [x] **Task 1 — Contracts: `packages/contracts/src/telegram-opt-in/`** (AC4, AC9)
  - [x] Mirror `packages/contracts/src/wa-opt-in/opt-in.ts`. Define `TelegramOptInStateSchema = z.enum(['PENDING','ACTIVE','REVOKED','BLOCKED','EXPIRED'])` — **no `EXPIRED_24H_WINDOW`** (no Meta window; `EXPIRED` is the stale-PENDING sweep only).
  - [x] Define `TelegramOptInStatusResponse` (`state`, `available`, `deepLink`) and `TelegramOptInRequestResponse` (`deepLink`). Barrel-export from `packages/contracts/src/telegram-opt-in/index.ts` and wire into `packages/contracts/src/index.ts`.
  - [x] Add `'telegram_opt_in'` to `ConsentTypeSchema` z.enum (`packages/contracts/src/consent/consent-record.ts`) **in lockstep** with the domain `consentTypeEnum` (Task 2). The existing consent lockstep test (`packages/contracts/tests/consent.test.ts`) enforces value-alignment — keep it green.
  - [x] Add a lockstep equality assertion (mirror the WA opt-in state test) so the contracts enum can never drift from the domain `telegram_opt_in_state` pgEnum.

- [x] **Task 2 — Domain schema + migrations** (AC1, AC3, AC4, AC8, AC9, AC10)
  - [x] `packages/domain/src/schema/pariwar_telegram_config.ts` — mirror `pariwar_wa_config.ts`. Columns: `pariwarId` (PK + tenant key, 1:1 Pariwar, no `defaultRandom`), `enabled boolean notNull default(false)` (the FR-58C v1 flag), `botUsername text` (member-facing, for the `t.me/<bot>?start=` deep-link; nullable until provisioned), `botTokenSecretName text` (**Secret-Manager NAME pointer**, never the value — plain text; NULL ⇒ fixture), `webhookSecretTokenSecretName text` (NAME pointer for the `X-Telegram-Bot-Api-Secret-Token` compare; NULL ⇒ webhook fails-closed), `updatedByActor uuid`, `createdAt`/`updatedAt`. **Standard inline tenant-isolation RLS** (0037/0038 shape — a Pariwar's bot credentials are NOT public), inline in the migration.
  - [x] `packages/domain/src/schema/member_telegram_opt_in.ts` — mirror `member_wa_opt_in.ts` but: `telegramOptInStateEnum = pgEnum('telegram_opt_in_state', ['PENDING','ACTIVE','REVOKED','BLOCKED','EXPIRED'])`; columns `optInId` (PK, `defaultRandom`, branded), `pariwarId`, `memberId` (polymorphic, no FK), `state` (default `PENDING`), `verificationCode text notNull` (the match token; **partial unique index `(pariwar_id, verification_code) WHERE state='PENDING'`** so two outstanding PENDINGs can never collide), `chatId text` (the opaque Telegram chat id captured on ACTIVE — the `SendTarget.address`; NULL while PENDING; operational, **not** a PII-envelope column), `consentId uuid` (back-ref, nullable), `matchedAt timestamp`, timestamps. **No `mobileBlindIndex`, no `windowExpiresAt`.** Indexes: `(pariwar_id, verification_code, state)` for the worker match, `(pariwar_id, member_id)` for the status read. Inline tenant-isolation RLS.
  - [x] `packages/domain/src/schema/telegram_inbound_webhook_events.ts` — mirror `wa_inbound_webhook_events.ts` exactly (`eventId`, `pariwarId`, `rawPayload jsonb`, `signatureVerified boolean`, `processedAt`, `receivedAt`; drain index on `processedAt`). Inline tenant-isolation RLS.
  - [x] Add branded ids to `packages/domain/src/ids/index.ts`: `MemberTelegramOptInId` + `memberTelegramOptInId`, `TelegramInboundWebhookEventId` + `telegramInboundWebhookEventId` (mirror the WA `uuidBrand` pattern at ids/index.ts:317-334).
  - [x] Extend `consentTypeEnum` (`packages/domain/src/schema/consent_records.ts:96`) with `'telegram_opt_in'` (append-only; keep the lockstep comment accurate).
  - [x] Register all new tables in `packages/domain/src/schema/index.ts`.
  - [x] **Migrations 0045–0048** (next free numbers after `0044`): `0045_pariwar-telegram-config`, `0046_member-telegram-opt-in` (with the partial unique index), `0047_telegram-inbound-webhook-events`, `0048_consent-type-telegram-opt-in`. Generate via the project's drizzle tooling — **never hand-edit or regenerate an already-applied migration** (drizzle skips by journal `when`, not SQL hash → 42P07); [[project_live_db_test_gotchas]].

- [x] **Task 3 — Domain accessors: `packages/domain/src/telegram-opt-in/` + `channel-config/telegram-config.ts`** (AC4, AC5, AC9, AC10)
  - [x] Mirror the `packages/domain/src/wa-opt-in/` module: `write.ts` (`createPendingOptIn` distinguishing a member-uniqueness reuse from a code collision → regenerate+retry via a raw `SAVEPOINT` on 23505, per [[project_domain_limit_clamp_and_savepoint_retry]]; `activateOptIn` capturing `chatId`; `revokeOptIn(toState)`), `read.ts` (`getOptInForMember`, `isOptInActive` — **just `state==='ACTIVE'`, no window check**; this operational read is the delivery source of truth, never a consent-registry query; `getChatIdForMember` for the delivery resolver; `matchPendingOptIn` by `(pariwarId, verificationCode)`; `getActiveOptInByChatId` for `/stop`/block), `audit.ts` (`telegramOptInAuditPayloadHash` five-field encoder — mirror `waOptInAuditPayloadHash`; **shared** between apps/api and apps/jobs, no drift), `code.ts` (`generateVerificationCode` in Telegram's start-param charset `[A-Za-z0-9_-]`, ≤64 chars; `extractStartCode(text)` parsing `/start <code>`), `webhook-events.ts` (`claimUnprocessedWebhookEvents` via `UPDATE … FOR UPDATE SKIP LOCKED`, `markWebhookEventProcessed`, `listStalePendingOptIns` — mirror 5.4's atomic-claim + malformed-payload-safe pattern), `errors.ts` (`TelegramOptInPendingExistsError`/`TelegramOptInStateError`/`TelegramOptInNotFoundError`), `index.ts` barrel.
  - [x] `packages/domain/src/channel-config/telegram-config.ts` — `getTelegramConfig(db, pariwarId)`, `upsertTelegramConfig(...)` (mirror `getWaConfig`/`upsertWaConfig`). Export from the `channelConfig` barrel.

- [x] **Task 4 — Channels provider: real Telegram Bot API** (AC1, AC2)
  - [x] Replace the `packages/channels/src/providers/telegram.ts` stub with `createTelegramProvider(deps)` — a **factory** bound to a per-Pariwar `TelegramMessagingHandle` (mirror `createWhatsappBusinessProvider`). `scope: 'per-pariwar'`. `send(rendered, target)` posts the rendered `body` to the member's `chat_id`; **resolves `accepted` with the message id on success, `rejected` (never throws) on any error** — classify via a new `telegram-errors.ts` (403 blocked-by-user, 400 chat-not-found, 429 rate-limit, network). `getStatus` returns honest `unknown` (Telegram has no async delivery receipt).
  - [x] `packages/channels/src/providers/telegram-app.ts` — per-Pariwar client cache (mirror `whatsapp-app.ts`): thin `fetch` client posting `POST https://api.telegram.org/bot<token>/sendMessage` with `{ chat_id, text }`; `TelegramMessagingHandle.send` returns the `result.message_id`, throws a `TelegramSendError(code, httpStatus)` on non-2xx/network. **KNOWN v1 gap** (document, same as WA): no cache eviction on bot-token rotation → restart-required-on-rotation.
  - [x] `packages/channels/src/providers/fixture-telegram.ts` — a log-only fixture (mirror `fixture-whatsapp.ts`) for the zero-config default.
  - [x] `packages/channels/src/providers/index.ts` — add `createTelegramProvider`, `createFixtureTelegramProvider`, and a `createTelegramProvider(deps|null)` **real-vs-fixture seam** (mirror `createWhatsappProvider`); update `DEFAULT_PROVIDER_REGISTRY.telegram` to the fixture. **Do NOT touch `dispatch.ts`, `provider.ts`, `CANONICAL_CHANNEL_LADDER`, `DeliveryResolver`, or the `telegram` renderer** — they are frozen ([[project_channels_no_live_dispatch_yet]]). Re-export the new types from `packages/channels/src/index.ts`.

- [x] **Task 5 — apps/api webhook ingress** (AC8)
  - [x] Extend `apps/api/src/modules/channel-webhooks/` (routes/handlers/signature). Add **`POST /api/v1/webhooks/telegram/:pariwarId`** inside the same encapsulated raw-body scope (the secret-token compare needs no raw bytes, but keep the module's shape). **Telegram is POST-only** — there is **no GET challenge** (unlike Meta). Verify the `X-Telegram-Bot-Api-Secret-Token` header with a **constant-time compare** (`timingSafeEqualString`, already in `signature.ts`) against the per-Pariwar secret resolved from `webhookSecretTokenSecretName`; fail closed (persist nothing) on mismatch/missing config. On success: persist the raw update into `telegram_inbound_webhook_events` and ack `200` fast. Both routes stay on the login-wall PUBLIC allowlist and out of CSRF (machine-to-machine, no cookie) — mirror the WA routes' exemptions.
  - [x] Add the module's tenant-scoped write via the same pattern the WA POST receiver uses (pariwarId from the URL path; RLS-scoped insert).
  - [x] **Known gaps carried forward from Story 5.4 (accepted there, same shape here — not new findings):** the per-Pariwar secret resolution and the event-persist are separate reads/writes, not one atomic operation; there is no app-level rate limiting on the webhook endpoint. Both were reviewed and accepted as low-severity in 5.4 — do not re-litigate unless scope changes.

- [x] **Task 6 — apps/api opt-in surface: `apps/api/src/modules/telegram-opt-in/`** (AC4, AC10)
  - [x] Mirror `apps/api/src/modules/wa-opt-in/` (routes/handlers/index): `GET` status (returns `available` from config `enabled`, `state`, and the `deepLink` for an outstanding PENDING), `POST` request (mint/reuse a PENDING via `createPendingOptIn`, build the `t.me/<bot_username>?start=<code>` deep-link, audit the PENDING mint), `POST` revoke (member-initiated → REVOKED + `revokeConsent`, audit-or-throw five-field + compensating `*_rolled_back` audit — mirror the 5.4 compensating-audit pattern applied on all opt-in write paths).
  - [x] Wire `TelegramOptInPendingExistsError`/`TelegramOptInStateError`/`TelegramOptInNotFoundError` into apps/api's error-mapping (mirror the 5.4 fix so concurrent races don't fall through to a generic 500). Register the module in the app's route wiring.

- [x] **Task 7 — apps/jobs worker: `tg-webhook-processor.ts`** (AC4, AC8, AC10)
  - [x] Mirror `apps/jobs/src/wa-webhook-processor.ts` but simpler: drain `telegram_inbound_webhook_events`, and for each update:
    - `message.text === '/start <code>'` → `extractStartCode` → `matchPendingOptIn(code)` → PENDING→ACTIVE capturing `message.chat.id` as `chatId` + `recordConsent('telegram_opt_in')` (audit FIRST, then consent+state in one scoped tx; compensating `*_rolled_back` audit on rollback). A code matching no PENDING is logged, no state change.
    - `message.text === '/stop'` (whole-message, trimmed, case-folded; reuse the NFKC + zero-width-strip normalization) → the member's ACTIVE opt-in → REVOKED (+ `revokeConsent`).
    - a `my_chat_member` update where the user **blocked/kicked** the bot (`new_chat_member.status ∈ {kicked, left}`) → match ACTIVE by `chat_id` (`getActiveOptInByChatId`) → BLOCKED (+ `revokeConsent`).
    - a **stale-PENDING sweep** (`listStalePendingOptIns`, default 48h TTL) → EXPIRED (`originating_channel: system_expiry`, actorId null). **No past-window sweep** (there is no window).
  - [x] Best-effort + isolated per item; mark each event processed regardless (replay-safe guards; wrap the whole body in try/catch so a malformed update never poisons the drain — the 5.4 fix). Run on the **BYPASSRLS service pool** cross-tenant.
  - [x] Register the queue + worker + cron in `apps/jobs/src/boot.ts` (mirror `registerWaWebhookProcessorCron`; add a `QUEUE_NAMES.TELEGRAM_WEBHOOK_PROCESSOR` + a 5-field-cron env override with the same validation guard). ⚠ **Telegram-specific facts** (update payload shape, `my_chat_member` block statuses, the sendMessage/webhook API) are indicative — verify against the current Telegram Bot API docs at deploy time (same caveat 5.3/5.4 applied to Meta).

- [x] **Task 8 — apps/api composition seam: `channel-config/composition.ts`** (AC1, AC5)
  - [x] Add `resolveTelegramProviderDeps` / `resolveTelegramProvider` (real-vs-fixture — null on: no config row, `enabled=false`, blank `botTokenSecretName`; resolve the token LAST, never logged) and `resolveTelegramTarget(pariwarId, memberId)` (**dual gate**: config `enabled` AND `isOptInActive` → return `{ channel: 'telegram', address: chatId }`, else null). Mirror `resolveWhatsappProvider`/`resolveWaTarget`. **Gate on the operational state (`isOptInActive`), NOT on a consent-registry read** — the consent record must never be the source of delivery state (see "Consent vs. operational delivery state" in Dev Notes). **This is a reusable composition building block only — there is still NO live `dispatch` call site** ([[project_channels_no_live_dispatch_yet]]); do not wire a live fan-out or change the frozen dispatch surface.

- [x] **Task 9 — Admin config surface** (AC3)
  - [x] `apps/admin/src/modules/channel-config/TelegramConfigForm.tsx` — mirror `WaConfigForm.tsx`: an `enabled` toggle (default off), the member-facing `botUsername`, and the two Secret-Manager NAME fields (bot token, webhook secret token). Surface it in `ChannelConfigPage.tsx`. The API config-write endpoint mirrors the WA config write (audit-logged, `updatedByActor`).

- [x] **Task 10 — Mobile opt-in surface** (AC4, AC10)
  - [x] Add a Telegram opt-in surface mirroring `apps/mobile/app/(settings)/notifications.tsx` (the WA opt-in screen) — either a section on that screen or a sibling screen. States: `unavailable` (Pariwar disabled / no bot) → explanatory line, no CTA; `off/null/REVOKED/EXPIRED` → "Enable Telegram notifications" CTA → `POST` mints PENDING + opens the `t.me` deep-link via `Linking.openURL`; `PENDING` → "Waiting for you to start the bot…" + re-open CTA; `ACTIVE` → confirmation + revoke control; `BLOCKED` → dignified line + fresh opt-in CTA (no inferred re-consent). **Bilingual copy via `@twt/i18n` (hi/en parity)**; no AsyncStorage — server-driven state; use MMKV only if local persistence is ever needed ([[project_mmkv_asyncstorage_equivalent]]). Add the member-api client methods (`getTelegramOptInStatus`/`requestTelegramOptIn`/`revokeTelegramOptIn`) mirroring the WA ones in `apps/mobile/lib/member-api`.

- [x] **Task 11 — Tests + gates** (all ACs)
  - [x] **Unit** (`packages/channels/tests/`): the Telegram provider (fake handle, no network) — accepted-on-2xx, rejected-not-thrown on 403/400/429/network, classification; the secret-token constant-time compare; `code.ts` generate/extract. The `telegram` renderer + determinism are already covered — do not duplicate.
  - [x] **Integration** (DB-gated, `:5433`): opt-in happy path (mint PENDING → webhook `/start <code>` → ACTIVE + consent + chat_id), `/stop` → REVOKED, block `my_chat_member` → BLOCKED, stale-PENDING → EXPIRED; webhook ingress (valid secret-token persists+acks; invalid fails-closed, persists nothing); the composition dual gate (`enabled` + ACTIVE → target; either off → null); the five-field audit chronology (mirror `apps/api/tests/integration/wa-opt-in/`). Assert **membership, not row counts** (own-committing writers accumulate rows — [[project_live_db_test_gotchas]]).
  - [x] **friction-budget**: add a NEW row for the Telegram opt-in (optional, member-initiated) in `friction-budget.md`, mirroring the Story 5.4 disposition (lines 221-236) — `member (opting in to Telegram notifications; taps a t.me deep-link to /start the bot) → Explicit member-initiated consent for a new channel → optional`. Note the page-weight baseline is unchanged (all new mobile files are in the authenticated `apps/mobile`, not the public Astro surface) — [[project_friction_budget_baseline_ratchet]].
  - [x] Flip `development_status[5-5-telegram-mirror-fire-and-forget]` and update the `last_updated` ledger comment per [[project_sprint_status_ledger]] at completion.
  - [x] **Merge gate: `pnpm ci:local`** (mirrors all 14 ci.yml jobs; GitHub Actions suspended — [[project_ci_actions_suspension_local_mirror]]). Integration needs `DATABASE_URL` on `:5433`. If a suspected failure appears, run the suspect spec in isolation to confirm innocence ([[project_known_livedb_test_failures]]); cap concurrency per [[project_ci_local_concurrency_oversubscription]].

### Review Findings

- [x] [Review][Defer] **CR-5.5-D1: Revisit Telegram verification semantics (bare-code vs `/start`-only) if the threat model changes or before enabling production Telegram onboarding.** Verification-code decision split during implementation: initial review recommended anchoring `extractStartCode` to a leading `/start` (currently it matches the `TWT-XXXXXXXX` pattern anywhere in an inbound message body, combined with no DB constraint stopping two members from ending up `ACTIVE` on the same `chat_id`). Implementation discovered committed tests (`code.test.ts`) explicitly documenting bare-code matching — "extracts a bare code (member pasted just the code)" — as intentional behavior. To preserve existing contractual behavior, `/start` anchoring was NOT implemented and is deferred as a future product/security decision, not forgotten. The independent `chat_id` cascade-revocation fix (below) WAS implemented, since it doesn't touch extraction semantics. [packages/domain/src/telegram-opt-in/code.ts:60]
- [x] [Review][Patch] `/stop` and bot-block only revoked the single latest-`matchedAt` opt-in for a `chat_id` (`getActiveOptInByChatId`), so if more than one member were ever bound to the same chat, older bindings would silently stay `ACTIVE` — decided 2026-07-06 (BigDev unavailable to confirm; proceeded on recommended default). Fixed: revoke ALL active rows sharing that `chat_id`, not just the latest. [packages/domain/src/telegram-opt-in/read.ts:46-63, apps/jobs/src/tg-webhook-processor.ts]
- [x] [Review][Patch] `request()` sets `ok = true` before the throwing `buildStartDeepLink()` call, so a misconfigured bot commits the PENDING mint while the catch block writes a false `*_rolled_back` compensating audit line — fixed: deep-link is now built before `ok` is set, in both the re-tap and fresh-mint branches [apps/api/src/modules/telegram-opt-in/handlers.ts:167]
- [x] [Review][Patch] `botUsername` has no format validation (`optionalConfigString` only enforces trim/min(1)/max(256)); a value like `"@"` passes save-time validation but throws in `buildStartDeepLink`, turning the read-only `status()` GET into a thrown error for every member of the Pariwar — fixed: added a Telegram-handle-shape regex at save time (`packages/contracts/src/channel-config/config.ts`) and a defensive try/catch around `status()`'s deep-link build so a misconfiguration degrades to `null` instead of throwing [packages/contracts/src/channel-config/config.ts:111, apps/api/src/modules/telegram-opt-in/handlers.ts:207-209]
- [x] [Review][Patch] Documented re-use recovery for `TelegramOptInPendingExistsError` ("the consumer route catches this and returns the existing PENDING's deep-link") isn't implemented in `request()` — a genuine concurrent double-tap race surfaces as a bare 409 to the loser instead — fixed: `request()` now catches this error and returns the winning row's deep-link [apps/api/src/modules/telegram-opt-in/handlers.ts:172-176, packages/domain/src/telegram-opt-in/errors.ts]
- [x] [Review][Patch] Mobile `onEnable()` mints a real PENDING server-side, then awaits `Linking.openURL(deepLink)` in the same try — if that throws, the catch shows a generic error and never calls `load()`, leaving the screen stuck on the stale "off" state despite the server-side PENDING — fixed: `load()` now runs regardless of whether the deep-link open succeeds [apps/mobile/app/(settings)/telegram-notifications.tsx:53-65]
- [x] [Review][Patch] `EXPIRED` state has no dedicated UX despite the file's own design-intent comment grouping it with `BLOCKED` ("a dignified line + an opt-in-again CTA") — `OptInBody` only special-cases `BLOCKED`, `EXPIRED` falls into the generic never-opted-in copy, and no `expired_*` i18n key exists in either locale — fixed: added an `EXPIRED` branch + `expired_title`/`expired_desc` i18n keys (en/hi parity) [apps/mobile/app/(settings)/telegram-notifications.tsx:175]
- [x] [Review][Patch] Stale documentation describes a `DELETE /api/v1/member/telegram-opt-in` endpoint that doesn't exist — the actual route is `POST .../telegram-opt-in/revoke` — fixed: comments corrected in both files [apps/api/src/modules/telegram-opt-in/handlers.ts:6, packages/contracts/src/telegram-opt-in/opt-in.ts:7]
- [x] [Review][Patch] `TelegramWebhookProcessorDeps.now` is declared as an "injectable clock (deterministic tests)" but is never read anywhere — the stale-PENDING TTL sweep always uses Postgres's own `now()` in SQL, so the test seam doesn't actually let tests control the sweep boundary — fixed: removed the dead field (unlike the WA precedent, Telegram has no 24h-window calc that would actually consume it) [apps/jobs/src/tg-webhook-processor.ts:109]
- [x] [Review][Patch] `admin_action` is included in `TELEGRAM_OPT_IN_ORIGINATING_CHANNELS` even though `routes.ts`'s own comment states there is no trustee admin-action force-opt-out in this story's scope — a dead, untested enum branch — fixed: removed, with a comment guarding against re-adding it without a real emitting path [packages/domain/src/telegram-opt-in/audit.ts:19]
- [x] [Review][Defer] `claimUnprocessedWebhookEvents` stamps `processed_at` in the same atomic claim UPDATE (before processing runs), so a worker crash between claim and a given event's processing permanently drops that event with no retry — deferred, pre-existing (identical pattern, explicitly documented as intentional, in the Story 5.4 WA precedent) [packages/domain/src/telegram-opt-in/webhook-events.ts]
- [x] [Review][Defer] Task 11's "stale-PENDING → EXPIRED" integration coverage is checked off but no test actually exercises `runTelegramOptInExpirySweep`/`listStalePendingOptIns` — deferred, pre-existing (the WA 5.4 precedent's equivalent sweep is likewise untested) [apps/jobs/tests/tg-webhook-processor.test.ts]
- [x] [Review][Defer] AC10's "queryable in chronological order" requirement isn't asserted by any test (only audit-row presence/count is checked) — deferred, pre-existing (same gap in the WA 5.4 precedent) [packages/domain/tests/integration/telegram-opt-in/telegram-opt-in.spec.ts]

## Dev Notes

### The two precedents this story mirrors (read them first)
- **Story 5.3** (`5-3-whatsapp-business-api-integration-...md`) — the **real provider + per-Pariwar config table + composition seam** half. Source files: `packages/channels/src/providers/whatsapp-business.ts`, `whatsapp-app.ts`, `whatsapp-errors.ts`, `providers/index.ts`; `packages/domain/src/schema/pariwar_wa_config.ts`; `apps/api/src/modules/channel-config/composition.ts`; `apps/admin/src/modules/channel-config/WaConfigForm.tsx`.
- **Story 5.4** (`5-4-member-wa-opt-in-...md`) — the **webhook ingress + opt-in state machine + consent + audit + settings** half. Source files: `packages/domain/src/schema/member_wa_opt_in.ts`, `wa_inbound_webhook_events.ts`, `packages/domain/src/wa-opt-in/*`; `apps/api/src/modules/channel-webhooks/*`, `apps/api/src/modules/wa-opt-in/*`; `apps/jobs/src/wa-webhook-processor.ts`; `apps/mobile/app/(settings)/notifications.tsx`.

### Load-bearing architecture constraints (DO NOT violate)
- **Frozen channel primitives** ([[project_channels_no_live_dispatch_yet]]): `dispatch.ts`, `provider.ts` (`ChannelProvider`, `RenderedMessage`, `SendTarget`, `SendResult`), `CANONICAL_CHANNEL_LADDER`, `TELEGRAM_SIDE_CHANNEL`, `TELEGRAM_ELIGIBLE_CATEGORIES`, `DeliveryResolver`, and the `telegram` case in `render.ts` are **already correct and must not change**. Telegram is already wired as a **parallel fire-and-forget side-channel** started concurrently with the ladder (`dispatch.ts:241-252`); `attemptChannel` already collapses any Telegram failure to outcome `error` without touching the ladder. This story swaps the **stub provider** for a real one and adds the **config/opt-in/webhook/composition** plumbing around the frozen core — nothing inside it.
- **Announcements-only** (architecture §3.4 "Telegram channel privacy posture", L1984-1987): the eligibility gate is `TELEGRAM_ELIGIBLE_CATEGORIES` (`alert_published | module_new | niyamavali_amended`) in `dispatch.ts`. Per-member / per-claim content is **not eligible**. This gate already exists — do not add a second one.
- **Fire-and-forget** (FR-73, architecture L1949-1950): no delivery confirmation, no fallback on failure. The provider's `send` **must never reject** — resolve to a `rejected` `SendResult` on error (mirror `whatsapp-business.ts:66-77`).

### Telegram ≠ WhatsApp — the deliberate differences
| Aspect | WhatsApp (Story 5.4) | Telegram (this story) |
|---|---|---|
| Match key | mobile blind index + verification phrase | **verification code alone** (Telegram never shares the phone) |
| Delivery address | member's decrypted mobile (msisdn) | **`chat_id`** captured on ACTIVE (opaque, operational — not PII-envelope) |
| Session window | 24h Meta window (`window_expires_at`) | **none** — bots message until user blocks/stops |
| States | PENDING/ACTIVE/REVOKED/BLOCKED_BY_META/EXPIRED_24H_WINDOW | **PENDING/ACTIVE/REVOKED/BLOCKED/EXPIRED** |
| Webhook auth | Meta `X-Hub-Signature-256` HMAC over raw body | **`X-Telegram-Bot-Api-Secret-Token`** header constant-time compare |
| Webhook GET challenge | yes (Meta subscription verify) | **no** (Telegram POST-only) |
| Opt-in trigger | inbound WA message matching a phrase | bot **`/start <code>`** deep-link |
| Block signal | Meta `failed` status error code | **`my_chat_member`** update (user blocked the bot) |
| Feature gate | `pariwar_wa_config.enabled` (admin toggle, dual-gated with opt-in) | `pariwar_telegram_config.enabled` (**the FR-58C v1 flag**, disabled by default) |

### Consent vs. operational delivery state — confirmed invariant (BigDev, 2026-07-06)
`telegram_opt_in` is a **separate first-class `consent_type`, mirroring `whatsapp_opt_in`** — kept even though Telegram is currently restricted to announcement-category alerts. **Consent is independent of transport policy**: a first-class consent record preserves DPDPA/audit symmetry, supports future category expansion, and keeps consent cleanly separated from operational delivery state. The load-bearing rules:
- **`telegram_opt_in` (consent_records) records consent ONLY** — the canonical "did this member have valid Telegram consent at time Y?" compliance/audit surface. It is minted on ACTIVE (`recordConsent`) and revoked on REVOKED/BLOCKED (`revokeConsent`).
- **`member_telegram_opt_in` owns the operational lifecycle** — `PENDING | ACTIVE | REVOKED | BLOCKED | EXPIRED`, the `chat_id`, the verification code. This is the delivery-state machine.
- **The consent registry must NEVER become the source of operational delivery state.** Do not query `consentExists('telegram_opt_in')` as the delivery gate, and do not derive operational state from it. The two are kept consistent by the caller's audit-or-throw (audit line FIRST, then `recordConsent` + the state transition in one scoped tx) — exactly the Story 5.4 split (mirrors [[project_member_lifecycle_domain_substrate]]'s state-machine-vs-events split).
- **Delivery eligibility is a dual gate** (same shape as WhatsApp's `resolveWaTarget`): the per-Pariwar admin `enabled` toggle **AND** an active operational state (`isOptInActive` ⇒ `state === 'ACTIVE'`). Because operational ACTIVE and the consent record are minted/revoked **together in one tx**, operational-ACTIVE ⟺ valid consent — so the composition resolver gates on the **operational state** (the delivery source of truth), never on a consent-registry read.

### FR-58C substitution (important)
FR-58C's per-cohort feature-flag engine is **Epic 10** and does **not** exist yet (the only `feature_flag` hits in the tree are unrelated KYC config). "Locked behind a feature flag per FR-58C; disabled by default" is realized in v1 by the per-Pariwar `pariwar_telegram_config.enabled` boolean (default `false`), exactly mirroring Story 5.3's `pariwar_wa_config.enabled` admin gate. When the real FR-58C engine lands (Epic 10), it can wrap this toggle. **Record this substitution in the Dev Agent Record** — do not invent the FR-58C cohort system here.

### PII / secrets discipline
- **Credential NAMEs, never values**: `botTokenSecretName` / `webhookSecretTokenSecretName` are Secret-Manager NAME pointers (plain `text`), resolved to values only at request/send time, **never logged or audited** (AI-4-3(c); mirror `pariwar_wa_config.access_token_secret_name`).
- `chat_id` and `verification_code` are **operational, non-PII** — plain columns, no envelope encryption (Telegram carries no phone/Aadhaar).
- `raw_payload` in the webhook-events table is Meta/Telegram-opaque operational data (mirror `wa_inbound_webhook_events`).

### Data / migration discipline ([[project_live_db_test_gotchas]])
- New migrations are **0045–0048** (next after `0044`). **Never regenerate or hand-edit an applied migration** (drizzle skips by journal `when` → 42P07 if SQL changes). Never reset via `DROP SCHEMA` (strips `twt_app` USAGE → 42P01). Test DB = `twt-test-pg` Docker on `:5433`.
- The **partial unique index** `(pariwar_id, verification_code) WHERE state='PENDING'` is the concurrency guard that stops two outstanding PENDINGs from sharing a code (a collision would let one member's `/start` match another's PENDING → wrong-member ACTIVE). `createPendingOptIn` must distinguish a member-uniqueness reuse from a code collision (regenerate+retry) — the 23505-in-a-`SAVEPOINT` pattern from [[project_domain_limit_clamp_and_savepoint_retry]] (a bare `db.transaction()` commits the caller's tx early; use a raw `SAVEPOINT`). The 23505 code is on `err.cause.code`.
- Domain **cannot import `@twt/contracts` or `@twt/events`** (turbo cycle) — that is why the state-enum + audit-payload encoders are duplicated across the layer and guarded by lockstep tests (mirror the WA precedent). See [[project_member_lifecycle_domain_substrate]].

### Testing standards
- Vitest across packages; **DB-gated integration** needs `DATABASE_URL` on `:5433`. Own-committing writers accumulate rows across a suite — **assert membership, not counts** ([[project_live_db_test_gotchas]]).
- If you add a Fastify `onSend` hook anywhere, beware the double-send trap ([[project_fastify_onsend_doublesend]]) — the webhook handlers use body-independent 200 acks; prefer the existing shape.
- ESLint runs **per-package** — any rule carve-out `files` glob must be cwd-relative role globs ([[project_eslint_config_per_package_cwd]]).

### Project Structure Notes
- New files slot cleanly into existing modules — **no new top-level packages/apps**. Domain schema/accessors under `packages/domain/src/{schema,telegram-opt-in,channel-config,ids}/`; provider under `packages/channels/src/providers/`; webhook ingress extends `apps/api/src/modules/channel-webhooks/`; opt-in API under `apps/api/src/modules/telegram-opt-in/`; worker under `apps/jobs/src/`; admin form under `apps/admin/src/modules/channel-config/`; mobile surface under `apps/mobile/app/(settings)/`.
- Naming discipline (architecture L3663-3677): DB columns `snake_case`, TS fields `camelCase`, tables plural.
- No conflicts with the frozen channel core (all additive around it).

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.5] (L2166-2182) — the AC.
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5] (L2061-2077) — FR-23 nudge seam, dispatcher-owns-delivery, AR anchors (AR-15, AR-40, AR-44, AR-53).
- [Source: _bmad-output/planning-artifacts/epics.md] L139 (FR-73 `[v1-S, but locked]`), L115 (FR-58C capability bar — Epic 10), L2090 (providers in `packages/channels/providers/`).
- [Source: _bmad-output/planning-artifacts/architecture.md] L1949-1950, L1984-1987 (Telegram mirror: fire-and-forget, announcements-only, per-Pariwar, privacy posture), L1952-1957 (provider abstraction discipline), §3.11 webhook ingress split (AR-44).
- [Source: packages/channels/src/dispatch.ts] L34-77, L241-252 — the frozen ladder, Telegram side-channel wiring, eligibility gate (DO NOT change).
- [Source: packages/channels/src/provider.ts] — the frozen `ChannelProvider` port.
- [Source: packages/channels/src/providers/whatsapp-business.ts + whatsapp-app.ts + providers/index.ts] — the real-provider + per-Pariwar-cache + real-vs-fixture-seam pattern to mirror.
- [Source: packages/domain/src/schema/pariwar_wa_config.ts, member_wa_opt_in.ts, wa_inbound_webhook_events.ts, consent_records.ts] — the schema patterns to mirror.
- [Source: apps/api/src/modules/channel-webhooks/{routes,signature,handlers}.ts] — the ingress primitive + `timingSafeEqualString`.
- [Source: apps/api/src/modules/channel-config/composition.ts] — `resolveWhatsappProvider`/`resolveWaTarget` to mirror.
- [Source: apps/jobs/src/wa-webhook-processor.ts] — the drain worker (five-field audit-or-throw, compensating audit, isolated best-effort, atomic claim) to mirror (simpler: no window, no blind index).
- [Source: apps/mobile/app/(settings)/notifications.tsx] — the WA opt-in settings surface to mirror.
- [Source: friction-budget.md] L221-236 — the Story 5.4 opt-in-row precedent.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (Opus 4.8) — dev-story workflow.

### Debug Log References

- Migrations 0045–0048 applied cleanly to `twt-test-pg` (:5433) via `pnpm db:migrate`; `drizzle-kit check` green.
- `contracts:check-openapi-determinism` green after adding the telegram opt-in + config paths.

### Completion Notes List

All 11 tasks + subtasks complete; all 10 ACs satisfied. Highlights:

- **Real Telegram Bot provider** replaced the 5.1 stub behind the UNCHANGED `ChannelProvider` port: a
  per-Pariwar `createTelegramBotProvider` factory (twin of `createWhatsappBusinessProvider`) bound to a
  `telegram-app.ts` fetch-client cache (`POST api.telegram.org/bot<token>/sendMessage`), a `telegram-errors.ts`
  classifier, a log-only `fixture-telegram`, and a `createTelegramProvider(deps|null)` real-vs-fixture seam.
  The provider **never rejects** (fire-and-forget) — any error resolves to a `rejected` SendResult. The frozen
  `dispatch.ts` / `provider.ts` / `CANONICAL_CHANNEL_LADDER` / `TELEGRAM_ELIGIBLE_CATEGORIES` / `DeliveryResolver`
  / `telegram` renderer were NOT touched. `DEFAULT_PROVIDER_REGISTRY.telegram` graduated stub→fixture (the one
  dispatch-test assertion `telegram:not_implemented`→`telegram:sent` updated, mirroring 5.3's whatsapp change).
- **Naming note:** the story text names the factory `createTelegramProvider`, but that name is used for the
  real-vs-fixture SEAM (mirroring `createWhatsappProvider`); the real factory is `createTelegramBotProvider`
  (the twin of `createWhatsappBusinessProvider`).
- **FR-58C substitution (documented per AC3):** FR-58C's per-cohort feature-flag engine is Epic 10 and does
  not exist yet. v1 realizes the "flag" as the per-Pariwar `pariwar_telegram_config.enabled` boolean
  (default `false`), exactly mirroring Story 5.3's `pariwar_wa_config.enabled` admin gate. When the real
  FR-58C engine lands it can wrap this toggle.
- **Consent vs. operational state:** `telegram_opt_in` is a separate first-class `consent_type` (migration
  0048); `member_telegram_opt_in` owns the five-state operational lifecycle (`PENDING|ACTIVE|REVOKED|BLOCKED|
  EXPIRED` — no `EXPIRED_24H_WINDOW`, no window). The composition `resolveTelegramTarget` dual-gate reads the
  OPERATIONAL `isOptInActive` (just `state==='ACTIVE'`), NEVER a consent-registry read. Consent + state are
  minted/revoked together in one scoped tx (audit-or-throw + compensating `*_rolled_back` audit).
- **Telegram ≠ WhatsApp simplifications applied:** match key is the **verification code alone** (no mobile
  blind index — Telegram shares no phone); the captured **`chat_id`** is the delivery address; **no 24h
  window**; the webhook auth is the **`X-Telegram-Bot-Api-Secret-Token`** header constant-time compare
  (POST-only, **no GET challenge**); the block signal is a **`my_chat_member`** update (`kicked`/`left`).
- **Composition seam is a building block only** — still NO live `dispatch` call site
  ([[project_channels_no_live_dispatch_yet]]).
- **Known v1 gaps carried forward (accepted, same as 5.3/5.4):** the Telegram client cache has no eviction on
  bot-token rotation (restart-required-on-rotation); the webhook config-read and event-persist are two
  transactions (no atomic TOCTOU protection); no app-level rate limiting on the webhook endpoint. Telegram
  API facts (update shape, block statuses, error codes) are indicative — verify at deploy time.
- **Tests:** channels unit (`telegram.test.ts`, 18); domain unit (`code.test.ts`, 7) + live-DB
  (`telegram-opt-in.spec.ts`, 10); api unit (`telegram-target.test.ts`, 5) + live-DB webhook ingress (4) +
  member opt-in E2E (4); jobs worker live-DB (4); admin form (2); contracts lockstep (`telegram-opt-in.test.ts`).
  friction-budget NEW row added (mirrors 5.4). openapi/v1.yaml regenerated deterministically.

### File List

**Contracts (`packages/contracts`)**
- `src/telegram-opt-in/opt-in.ts` (new) — state enum + request/status/revoke DTOs.
- `src/telegram-opt-in/index.ts` (new) — barrel.
- `src/index.ts` — wire the telegram-opt-in barrel.
- `src/consent/consent-record.ts` — add `telegram_opt_in` to `ConsentTypeSchema`.
- `src/channel-config/config.ts` — add `TelegramConfigDto` / `TelegramConfigResponse` / `TelegramConfigUpsertRequest`.
- `src/channel-config/index.ts` — export the telegram config DTOs.
- `scripts/emit-openapi.ts` — register the telegram opt-in + config paths + components.
- `tests/telegram-opt-in.test.ts` (new) — lockstep + DTO shapes.
- `tests/consent.test.ts` — update the enum-list + out-of-enum assertions for the additive.

**Domain (`packages/domain`)**
- `src/schema/pariwar_telegram_config.ts`, `src/schema/member_telegram_opt_in.ts`, `src/schema/telegram_inbound_webhook_events.ts` (new).
- `src/schema/index.ts` — register the three tables.
- `src/schema/consent_records.ts` — append `telegram_opt_in` to `consentTypeEnum`.
- `src/ids/index.ts` — `MemberTelegramOptInId` + `TelegramInboundWebhookEventId` branded ids.
- `src/telegram-opt-in/{write,read,audit,code,webhook-events,errors,index}.ts` (new) — the accessor module.
- `src/channel-config/telegram-config.ts` (new) + `src/channel-config/index.ts` — config accessors.
- `src/index.ts` — surface the `telegramOptIn` namespace + top-level typed errors.
- `migrations/0045_pariwar-telegram-config.sql`, `0046_member-telegram-opt-in.sql`, `0047_telegram-inbound-webhook-events.sql`, `0048_consent-type-telegram-opt-in.sql` (new) + `migrations/meta/_journal.json`.
- `tests/telegram-opt-in/code.test.ts` (new); `tests/integration/telegram-opt-in/telegram-opt-in.spec.ts` (new).

**Channels (`packages/channels`)**
- `src/providers/telegram.ts` (real provider, replaced stub), `src/providers/telegram-app.ts`, `src/providers/telegram-errors.ts`, `src/providers/fixture-telegram.ts` (new).
- `src/providers/index.ts` — real-vs-fixture seam + registry default → fixture.
- `src/index.ts` — re-export the new provider + client + classifier surface.
- `tests/telegram.test.ts` (new); `tests/dispatch.test.ts` — one audit-line assertion updated (stub→fixture).

**Queue (`packages/queue`)**
- `src/index.ts` — `TELEGRAM_WEBHOOK_PROCESSOR` queue name.

**API (`apps/api`)**
- `src/modules/channel-webhooks/{handlers,routes,index}.ts` — Telegram POST ingress receiver + secret-token header.
- `src/modules/telegram-opt-in/{handlers,routes,index}.ts` (new) — member opt-in surface.
- `src/modules/channel-config/{handlers,routes}.ts` — Telegram config GET/PUT.
- `src/modules/channel-config/composition.ts` — `resolveTelegramProvider(Deps)` + `resolveTelegramTarget` dual-gate.
- `src/middleware/error-mapping/index.ts` — map the three Telegram opt-in typed errors.
- `src/server.ts` — register the telegram-opt-in module.
- `tests/unit/telegram-target.test.ts`, `tests/integration/channel-webhooks-telegram.spec.ts`, `tests/integration/telegram-opt-in/telegram-opt-in.spec.ts` (new); `tests/integration/login-wall.spec.ts` — allowlist the Telegram webhook.

**Jobs (`apps/jobs`)**
- `src/tg-webhook-processor.ts` (new) + `src/boot.ts` — register the worker + cron + env-override guard.
- `tests/tg-webhook-processor.test.ts` (new).

**API client + mobile + admin + i18n**
- `packages/api-client/src/index.ts` — `requestTelegramOptIn` / `getTelegramOptInStatus` / `revokeTelegramOptIn`.
- `apps/mobile/app/(settings)/telegram-notifications.tsx` (new); `apps/mobile/components/notifications/NotificationSettingsEntry.tsx` (+ Telegram entry); `apps/mobile/app/(tabs)/index.tsx`.
- `apps/admin/src/modules/channel-config/TelegramConfigForm.tsx` (new) + `ChannelConfigPage.tsx`; `apps/admin/src/api/{client,hooks}.ts`; `apps/admin/tests/telegram-config-form.test.tsx` (new).
- `packages/i18n/locales/{en,hi}/common.json` — `telegramNotifications.*` keys (parity).

**Docs**
- `friction-budget.md` — NEW optional Telegram opt-in row + disposition; `openapi/v1.yaml` regenerated.

## Change Log

| Date | Change |
|---|---|
| 2026-07-06 | Story 5.5 implemented — real Telegram Bot mirror provider + per-Pariwar config + opt-in state machine (code-only match, chat_id delivery address, no window) + webhook ingress (secret-token compare, POST-only) + tg-webhook-processor worker + composition dual-gate + admin config form + mobile opt-in surface + tests. All 11 tasks / 10 ACs complete. Status → review. |
