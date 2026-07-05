# ADR-0027: In-app push provider selection (FCM HTTP v1 + APNs via the Firebase Admin SDK — single SDK, no native APNs path)

> **Status:** drafted
> **Date:** 2026-07-05
> **Author:** BigDev (Solo Builder)
> **Ratifying trustees:** — (un-attested-pending; a reviewer convenes the Trustee Panel — no fabricated session, [[feedback_record_unattested_no_backfill]])
> **Supersedes:** —
> **Superseded by:** —

## Context

This ADR records a **vendor / cloud-control decision** the architecture deliberately left as an
*implementation choice* and pointed at an ADR to close (per [[feedback_architecture_vs_adr_boundary]] —
architecture commits the *property* "in-app push is the primary channel"; the concrete provider wiring is
a cloud control that belongs in an ADR, not only in a story's Dev Notes):

- [architecture.md §2 L2436] and [architecture.md §5 L3580] catalogue the open decision explicitly:
  **"FCM-only vs FCM + native APNs vs Firebase Cloud Messaging for both"** — an unresolved
  implementation choice.
- [architecture.md §3.4 L1935] already commits the SHAPE as **"In-app push (FCM HTTP v1 + APNs via
  Firebase Admin SDK)"** — i.e. the architecture's own §3.4 wording anticipates a *single* Firebase Admin
  SDK reaching both platforms.

Story 5.2 (the first `[CONSUMER]` of Epic 5) is the story that turns the 5.1 `fcm`/`apns` provider stubs
into real transports, so it is the natural home for closing this decision.

## Decision

**A single `firebase-admin` SDK sends to BOTH Android (FCM HTTP v1) and iOS (APNs) device tokens.** The
Apple Push auth key is configured **inside each per-Pariwar Firebase project** (tied to the TWT app bundle
id); firebase-admin forwards iOS-token sends to APNs on TWT's behalf. There is **no** native-APNs
(token-key `.p8`) credential path, and no second auth-refresh mechanism.

- **BigDev CONFIRMED 2026-07-05.**
- The 5.1 two-provider split (`fcm` for Android, `apns` for iOS) is preserved: each provider builds its
  platform-specific message block (`android` vs `apns`/`aps`), but both share the same per-Pariwar
  firebase-admin messaging handle. The dispatcher's `selectProvider` still routes iOS targets → `apns` by
  `SendTarget.platform` (unchanged from 5.1).
- Per-Pariwar FCM **service-account** credentials load via `resolveSecretValue` (a Secret-Manager NAME per
  Pariwar, never the value; a local-dev env fallback mirrors argon2/turnstile/digilocker). An absent
  secret NAME resolves push to a log-only fixture provider, so the stack boots with zero Firebase config
  in dev/CI (AR-17; the repo's opt-in-real convention).
- Per-Pariwar Firebase `App` instances are initialized lazily and cached by `pariwar_id`
  (`packages/channels/src/providers/firebase-app.ts`); never re-initialized per send.

## Rationale

- **One SDK, one credential path, one auth-refresh mechanism.** firebase-admin manages the
  service-account JWT → OAuth2 access-token exchange and refresh internally, so there is no manual
  token-refresh lifecycle to build or a second `.p8` APNs auth-token path to rotate.
- **Matches the already-committed §3.4 L1935 wording** — this ADR ratifies the shape the architecture
  already anticipated, rather than diverging from it.
- **Keeps the 5.1 port + dispatcher frozen** — the choice plugs into the fixed `ChannelProvider`
  interface and `CANONICAL_CHANNEL_LADDER` without changing either.

## Consequences

- **Closed:** the "FCM-only vs FCM + native APNs vs FCM-for-both" decision is resolved in favour of
  FCM-for-both via firebase-admin. A native APNs `.p8` path is explicitly **out of scope** and must not be
  reintroduced without superseding this ADR.
- **Operational (restart-required-on-rotation):** the in-process per-Pariwar `App` cache has no TTL /
  eviction. Rotating a Pariwar's FCM service-account credential requires a process restart to take
  effect. Documented in `firebase-app.ts` and the Story 5.2 Dev Agent Record as a known v1 gap, not a
  silent hazard.
- **Delivery receipts:** FCM/APNs give no post-accept delivery receipt for a v1 single-token send, so
  `getStatus` returns an honest `unknown` — the dispatcher never fabricates `delivered`.

## Alternatives considered

- **FCM-only (Android push; no iOS push transport).** Rejected — architecture §3.4 L1935 already commits
  push as the primary channel for BOTH platforms; shipping Android-only would leave iOS members without
  the primary time-critical channel, falling back to WhatsApp/SMS for normal-priority traffic they should
  get for free.
- **FCM (Android) + native APNs via a separate `.p8` token-key credential (iOS).** Rejected — a second
  credential type (Apple's token-based APNs auth key) means a second auth-refresh mechanism, a second
  credential-rotation runbook, and a second SDK surface (`apn`/`node-apn` or hand-rolled HTTP/2) to keep
  patched. Architecture §3.4 L1935's own wording ("APNs via Firebase Admin SDK") already anticipated
  avoiding this path.
- **Firebase Cloud Messaging for both Android and iOS (this ADR's choice).** Accepted — one SDK, one
  credential (the per-Pariwar Firebase service-account JSON), one auth-refresh mechanism (managed
  internally by firebase-admin). The 5.1 two-provider split (`fcm`/`apns`) is preserved at the
  `ChannelProvider` level purely to keep the platform-specific message-block construction (`android` vs
  `apns`/`aps`) separate — both share the same underlying messaging handle.

## References

- [Source: architecture.md §2, line 2436] — the open "FCM-only vs FCM + native APNs vs Firebase Cloud
  Messaging for both" implementation decision this ADR resolves.
- [Source: architecture.md §5, line 3580] — the same open decision catalogued in the deferred-decisions
  index.
- [Source: architecture.md §3.4, line 1935] — "In-app push (FCM HTTP v1 + APNs via Firebase Admin SDK)",
  the shape this ADR ratifies.
- [Source: architecture.md §3.4, line 1937] — device tokens are Tier-1 PII; commits the encryption
  requirement `packages/domain/src/schema/member_device_tokens.ts` implements.
- [Source: epics.md, Story 5.2] — the owning story (AC1/AC2, this ADR's write-trigger).
- [Source: `packages/channels/src/providers/firebase-app.ts`] — the per-Pariwar `App` cache this ADR's
  credential-path decision is implemented by.
- [Source: `packages/channels/src/providers/{fcm,apns}.ts`] — the two `ChannelProvider` factories sharing
  the single firebase-admin messaging handle this ADR commits.
- Memory: [[feedback_architecture_vs_adr_boundary]] — discipline anchor (architecture commits the
  property; this ADR commits the cloud control).
- Memory: [[feedback_record_unattested_no_backfill]] — authoring-source-of-truth vs back-fill distinction
  (this ADR is the former; ratification is a later Trustee-Panel event).

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-07-05 | (initial draft) | BigDev (Solo Builder) | Authored at Story 5.2 (Epic 5's first `[CONSUMER]`). Commits single-SDK (firebase-admin) push for both Android + iOS, closing architecture's open §2 L2436 / §5 L3580 decision in favour of the shape already anticipated at §3.4 L1935. No native APNs `.p8` path. Ratification is a later Trustee-Panel event — lands `drafted`, un-attested-pending. |
