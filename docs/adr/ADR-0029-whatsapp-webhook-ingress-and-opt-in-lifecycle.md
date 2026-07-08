# ADR-0029: WhatsApp inbound-webhook ingress design + member opt-in lifecycle (per-Pariwar signed webhook, persist-and-ack, async worker, state-table + consent-registry split)

> **Status:** ratified
> **Date:** 2026-07-08 (date entered current status)
> **Author:** BigDev (Solo Builder)
> **Ratifying trustees:** Dhiraj Rahul (Trustee 1) + Kalpana Bharti (Trustee 2) — ratified at the 2026-07-08 Trustee Panel session; consent sheet `docs/knowledge-transfer/adr-ratification-consent-sheet-2026-07-08.md` (flagged policy-adjacent for the AR-16 consent posture — read closely, no amendment recorded); logged in `.decision-log.md` Decision 2026-07-08-065
> **Supersedes:** —
> **Superseded by:** —

## Context

This ADR records a **cloud-control / external-dependency decision** the architecture committed as a
*property* and pointed at an ADR to close (per [[feedback_architecture_vs_adr_boundary]] — architecture
commits the property "webhook ingress verifies-persists-acks then a worker drains a queue"; the concrete
Meta-facing wiring — the URL topology, the signature-key resolution order, the opt-in state model — is a
cloud control that belongs in an ADR, not only a story's Dev Notes):

- [architecture.md §3.11] commits the **webhook-ingress pattern**: verify signature → persist to a dedicated
  webhook-queue table → ack (200 + minimal body) → return; NO business logic / synchronous downstream /
  external call in the handler; workers drain the queue per pg-boss job classes.
- [architecture.md §3.4, AR-16] commits the **member WA opt-in flow**: user-initiated ONLY (no passive
  defaults / pre-checked / bundled / inferred consent), inbound-message matching, ACTIVE + a 24h window on
  match, STOP/withdrawal handling.
- [architecture.md §3.4, L126-127 / 1938-1940] commits the **dual gate**: WA fires only when the admin toggle
  is ON (Story 5.3) AND the member opt-in is ACTIVE (Story 5.4), enforced at the DeliveryResolver composition
  seam.
- [AR-44] commits that the webhook handler must ack inside Meta's ~5s retry window.

Story 5.4 (Epic 5's first `[SURFACE]`) builds the live ingress + the opt-in lifecycle, so it is the natural
home for closing these decisions.

## Decision

### 1. Per-Pariwar signed webhook URL — `/api/v1/webhooks/whatsapp/:pariwarId`

Meta's `X-Hub-Signature-256` is an HMAC keyed by the Pariwar's **app secret**; the verification key must be
known BEFORE the body can be trusted (the body carries `phone_number_id`, but trusting un-verified body
content to select the verification key is a signature-bypass smell). So the webhook URL is **per-Pariwar** —
the `:pariwarId` path segment resolves the Pariwar (→ its `app_secret_secret_name` +
`webhook_verify_token_secret_name` NAME pointers) from the path, before the body is parsed. Each Pariwar
registers this URL with its Meta App out-of-band (a runbook step, like template registration).

- Two additive Secret-Manager **NAME** columns on `pariwar_wa_config` (`app_secret_secret_name`,
  `webhook_verify_token_secret_name`) — pointers, never the secret values (the AI-4-3(c) discipline
  `access_token_secret_name` already uses). NULL ⇒ that webhook path fails closed.
- `GET` answers Meta's subscription-verification challenge (`hub.mode` / `hub.verify_token` / `hub.challenge`
  → the bare challenge echoed on a token match; 403 otherwise). NO session guard — Meta is unauthenticated;
  the verify-token IS the auth.
- `POST` captures the **raw request body** (a route-scoped content-type parser — the HMAC must be over the
  exact bytes Meta sent), verifies `X-Hub-Signature-256 = sha256=` + HMAC-SHA256(rawBody, appSecret) with a
  **timing-safe compare**, persists the raw payload to the webhook-queue table, and acks **200**. NO matching,
  consent write, audit, or external call in the handler (§3.11 / AR-44). An invalid/absent signature fails
  **closed** (403, minimal body) and persists nothing.

### 2. Persist-and-ack + an async worker (§3.11)

The `POST` handler only VERIFIES + PERSISTS + ACKS. A dedicated `wa_inbound_webhook_events` queue table holds
the raw verified payloads. An apps/jobs worker (`wa-webhook-processor`, a scheduled pg-boss cron) drains
un-processed rows cross-tenant on the BYPASSRLS service pool and does the business logic: inbound-phrase match
→ ACTIVE, STOP → REVOKED, Meta block/opt-out status → BLOCKED_BY_META, and message-status callbacks →
Story 5.3's exported `mapMetaStatus` + `upsertWaSendStatus` (the Q2 ownership split). A separate sweep expires
stale PENDINGs / past-window ACTIVEs → EXPIRED_24H_WINDOW.

### 3. Opt-in lifecycle: a state table + the consent registry (the split)

The consent registry (Story 2.7) records only grant/revoke — a two-state row. But AR-16 requires a **five-state
operational lifecycle** (`PENDING | ACTIVE | REVOKED | BLOCKED_BY_META | EXPIRED_24H_WINDOW`) plus a
verification phrase, the pending-match key, and the 24h-window expiry. So:

- **`member_wa_opt_in`** (this story) owns the operational **state machine** — the five states, the
  verification phrase, the mobile blind index (the inbound-match key), the 24h window. Verification-phrase
  uniqueness among concurrently-outstanding PENDINGs is **DB-enforced** by a partial unique index
  `UNIQUE (pariwar_id, verification_phrase) WHERE state = 'PENDING'` (the wrong-member-match backstop);
  `createPendingOptIn` retries-on-`23505`.
- **`consent_records`** stays the canonical `consentExists('whatsapp_opt_in')` surface — `recordConsent` on
  ACTIVE, `revokeConsent` on REVOKED/BLOCKED. The two are kept consistent by **audit-or-throw**: the Story
  1.10 audit line is written FIRST, then the consent + state transition run in one scoped tx threading the
  audit id — a rollback leaves NO ACTIVE consent AND no ACTIVE state.

Every opt-in/opt-out transition writes ONE five-field audit line (`timestamp`, `originating_channel` ∈
`member_app | meta_webhook_inbound | meta_webhook_block | admin_action | system_expiry`,
`matched_member_identity`, before/after `current_consent_state_snapshot`, `audit_id`) — committed into the
tamper-evident hash (the `waOptInAuditPayloadHash` shared encoder, identical across the api routes + the
worker).

## Rationale

- **Per-Pariwar URL keeps the verification key on the trust-establishing path.** The signature key is resolved
  from the URL, never from un-verified body content — no signature-bypass foot-gun. It is consistent with
  per-Pariwar WA credentials (AR-17) and keeps the AR-53 single-module-swap surface small. If the ops model
  turns out to be a shared Meta App, the same NAME simply resolves to a shared secret — no code change.
- **Persist-and-ack keeps the handler far inside Meta's 5s window (AR-44).** All matching/consent/audit is
  the worker's job; the handler does a signature verify + one insert. Replays are safe (the drain filters
  `processed_at IS NULL`; the transition guards are idempotent).
- **State-table + registry split mirrors the member-lifecycle "state machine + events" split**
  ([[project_member_lifecycle_domain_substrate]]) — the registry answers "valid consent at time Y?"; the
  state table adds the operational nuance the registry cannot express. The AC6 dual gate reads BOTH
  (`isOptInActive` AND the admin toggle) at the composition seam.
- **User-initiated ONLY (AR-16).** A PENDING is minted only by the member tapping the toggle; ACTIVE only by a
  matched inbound WhatsApp message. Re-opt-in after revoke requires a NEW inbound message (a new PENDING +
  phrase) — no inferred re-consent.

## Consequences

- **Closed:** the webhook-ingress topology (per-Pariwar signed URL), the signature-key resolution order
  (path-before-body), the persist-and-ack split, and the opt-in state-table-vs-registry model are resolved.
- **Runbook dependency:** each Pariwar must register its per-Pariwar webhook URL + verify-token + app-secret
  with its Meta App out-of-band (like template registration). Absent NAMEs fail the webhook closed.
- **Near-real-time, not synchronous:** opt-in confirmation is worker-driven (a 1-minute cron by default), so a
  member sees ACTIVE "on next read", not instantly at message-send. Cadence is operations policy.
- **Meta-fact coupling caveat:** the inbound payload shape, the opt-out error codes (BLOCKED_BY_META), and the
  STOP-keyword set are drawn from Meta's published Cloud API reference and flagged INDICATIVE — they must be
  re-verified against the current Meta reference (Meta versions the API + its codes change; the same caveat
  ADR-0028 applied to graph version + error codes).
- **Blind-index reproduction:** the worker recomputes the sender's mobile blind index (from the inbound
  `from`) to match a PENDING; the normalization + constants are replicated from
  `apps/api/.../mobile-index.ts` (apps/jobs cannot import apps/api) and MUST be kept byte-identical — a drift
  would silently break matching.

## Alternatives considered

- **A single global webhook endpoint that reverse-looks-up the Pariwar from the payload `phone_number_id`.**
  Rejected — it forces trusting un-verified body content to select the verification key (a signature-bypass
  smell). `getWaConfigByPhoneNumberId` still exists for status-callback correlation, but is NOT on the
  trust-establishing path.
- **Synchronous processing in the webhook handler (match + consent + audit inline).** Rejected — it risks
  breaching Meta's ~5s ack window (AR-44) and couples the request path to DB/consent latency; §3.11 mandates
  persist-and-ack + an async worker.
- **A single two-state consent row (no separate state table).** Rejected — it cannot express the five-state
  operational lifecycle (PENDING, the 24h window, BLOCKED_BY_META, EXPIRED_24H_WINDOW), the verification
  phrase, or the pending-match key that AR-16 requires.
- **Application-only verification-phrase uniqueness (no DB constraint).** Rejected — a race between two
  concurrent PENDING mints could collide a phrase, letting one member's inbound message match another
  member's PENDING (a wrong-member ACTIVE, an AC3/AC4 integrity break). The partial unique index is the
  backstop; generation supplies the entropy.

## References

- [Source: architecture.md §3.11] — the webhook-ingress pattern (verify → persist → ack → worker-drain) this
  ADR implements.
- [Source: architecture.md §3.4, AR-16 (lines 2047-2075)] — the member WA opt-in flow (user-initiated only,
  inbound match, 24h window, STOP handling) this ADR realises.
- [Source: architecture.md §3.4, L126-127 / 1938-1940 / 2092-2098] — the dual gate (admin toggle AND member
  opt-in ACTIVE) the AC6 composition read enforces.
- [Source: epics.md, Story 5.4] — the owning story (this ADR's write-trigger).
- [Source: `apps/api/src/modules/channel-webhooks/`] — the ingress primitive (per-Pariwar path, signature
  verify, persist-and-ack) this ADR commits.
- [Source: `apps/jobs/src/wa-webhook-processor.ts`] — the async drain + opt-in transitions + expiry sweep.
- [Source: `packages/domain/src/schema/member_wa_opt_in.ts` + `wa_inbound_webhook_events.ts`] — the state
  machine + the webhook queue.
- [Ref: ADR-0028] — the sibling WhatsApp-provider-selection ADR whose structure this mirrors; 5.3 owns the
  send/status seam this story's worker consumes.
- [Ref: ADR-0024] — the consent-registry ADR whose grant/revoke surface this story records
  `whatsapp_opt_in` against.
- Memory: [[feedback_architecture_vs_adr_boundary]] — discipline anchor (architecture commits the property;
  this ADR commits the cloud control).
- Memory: [[project_member_lifecycle_domain_substrate]] — the state-machine-+-events split this opt-in model
  mirrors.

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-07-06 | (initial draft) | BigDev (Solo Builder) | Authored at Story 5.4 (Epic 5's first `[SURFACE]`). Commits the per-Pariwar signed webhook URL (signature key known from the path before the body is trusted; shared-Meta-App fallback = same NAME resolves to a shared secret), the §3.11 persist-and-ack + async-worker split, and the five-state `member_wa_opt_in` state machine kept consistent with the `consentExists('whatsapp_opt_in')` registry by audit-or-throw. Ratification is a later Trustee-Panel event — lands `drafted`, un-attested-pending. |
| 2026-07-08 | drafted → ratified | Dhiraj Rahul + Kalpana Bharti | Ratified at the 2026-07-08 Trustee Panel session (consent sheet `adr-ratification-consent-sheet-2026-07-08.md`, flagged policy-adjacent for the AR-16 user-initiated-only consent posture; no amendment recorded — ratified as drafted); Decision 2026-07-08-065. |
