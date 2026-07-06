# ADR-0028: WhatsApp Business provider selection (direct Meta WhatsApp Business Cloud API for v1 — no BSP intermediary)

> **Status:** drafted
> **Date:** 2026-07-05
> **Author:** BigDev (Solo Builder)
> **Ratifying trustees:** — (un-attested-pending; a reviewer convenes the Trustee Panel — no fabricated session, [[feedback_record_unattested_no_backfill]])
> **Supersedes:** —
> **Superseded by:** —

## Context

This ADR records a **vendor / cloud-control decision** the architecture deliberately left as an
*implementation choice* behind an abstraction and pointed at an ADR to close (per
[[feedback_architecture_vs_adr_boundary]] — architecture commits the *property* "WhatsApp is a dual-gated
UTILITY-template channel behind a swappable provider abstraction"; the concrete provider wiring — direct
Meta vs. a Business Solution Provider intermediary — is a cloud control that belongs in an ADR, not only a
story's Dev Notes):

- [architecture.md §3.4, AR-53] commits that **"the abstraction allows future Meta API changes or alternate
  WA Business providers to be a single-module change"** — i.e. the architecture commits the *swap surface*,
  not the vendor.
- [architecture.md §3.4, L1935] catalogues WhatsApp as **"Meta Cloud API, UTILITY-templates-only,
  per-Pariwar admin-configurable number"** — anticipating a direct Meta Cloud API integration.

Story 5.3 (Epic 5's second `[CONSUMER]`) turns the 5.1 `whatsapp-business` stub into a real transport, so it
is the natural home for closing this decision.

## Decision

**The `whatsapp` channel integrates DIRECTLY with Meta's WhatsApp Business Cloud API for v1 — no BSP
(Business Solution Provider) intermediary (e.g. Gupshup, Twilio, WATI).** Sends are `POST
https://graph.facebook.com/<graph_api_version>/<phone_number_id>/messages` with a `type: "template"` body
(UTILITY category), authorized by a per-Pariwar Meta **system-user access token**.

- The provider is a thin `fetch`-based client (no heavy SDK) — Meta's Cloud API is plain REST, one endpoint,
  and the system-user token is long-lived, so there is no auth-refresh SDK to carry. This keeps the AR-53
  swap surface small and the bundle lean.
- Per-Pariwar WA credentials (the access token) load via `resolveSecretValue` (a Secret-Manager NAME stored
  in the `pariwar_wa_config` row, never the value; a local-dev env fallback mirrors argon2/turnstile/
  digilocker/FCM). An absent/blank NAME, an absent config row, `enabled=false`, or a category with no
  `approved` template resolves WA to a log-only fixture provider, so the stack boots with zero Meta config
  in dev/CI (AR-17; the repo's opt-in-real convention).
- Per-Pariwar WA clients are built lazily and cached by `pariwar_id`
  (`packages/channels/src/providers/whatsapp-app.ts`); never rebuilt per send.
- The single-body-parameter UTILITY-template shape is v1 (Q1=A, CONFIRMED); structured multi-parameter
  templates are the Epic-10 evolution.

## Rationale

- **The abstraction, not the vendor, is the architectural commitment (AR-53).** The `ChannelProvider` port
  is the swap boundary: a future BSP swap is a new `providers/<bsp>.ts` + a registry change, nothing else.
  Meta-specific facts (the graph version, the endpoint shape, the error codes, the template-param rules)
  live INSIDE `whatsapp-business.ts` + `whatsapp-app.ts` + `whatsapp-errors.ts`, never leaking into
  `dispatch` / `render` / contracts. The `pariwar_wa_config` table stores provider-agnostic intent (number,
  toggle, template names) + a credential NAME, so a BSP swap re-points the credential + client without a
  schema change.
- **Direct Meta = fewer moving parts + lower per-message cost for v1.** No BSP margin, no BSP-specific
  onboarding/rate-limit semantics, no third dependency to keep patched. The graph version is a per-Pariwar
  config field (`graph_api_version`, defaulted `v21.0`), so a Meta API version bump is a config change, not
  a redeploy.
- **Matches the already-committed §3.4 L1935 wording** ("Meta Cloud API") — this ADR ratifies the shape the
  architecture already anticipated.
- **Keeps the 5.1 port + dispatcher frozen** — the choice plugs into the fixed `ChannelProvider` interface
  and `CANONICAL_CHANNEL_LADDER` without changing either.

## Consequences

- **Closed:** the "direct Meta Cloud API vs. a BSP intermediary" decision is resolved in favour of direct
  Meta for v1. A BSP path is explicitly a **future single-module swap** (AR-53), not a v1 deliverable, and
  must not be reintroduced without superseding this ADR (or, more precisely, without adding a new provider
  module — the abstraction is designed to make that swap cheap).
- **Operational (restart-required-on-rotation):** the in-process per-Pariwar WA client cache has no TTL /
  eviction. Rotating a Pariwar's Meta access token requires a process restart to take effect. Documented in
  `whatsapp-app.ts` and this story's Dev Agent Record as a known v1 gap (the same call Story 5.2 made for
  the Firebase App cache), not a silent hazard.
- **Delivery receipts:** Meta gives no synchronous delivery receipt at accept time — delivered/read status
  arrives asynchronously via a webhook (Story 5.4). `getStatus` returns an honest `unknown`; the pure
  `mapMetaStatus` + the `whatsapp_send_status` persistence seam are 5.3's exported consumer contract, and
  5.4 owns the webhook receiver.
- **Error-code coupling caveat:** the Meta error-code → failure-class mapping (`whatsapp-errors.ts`) is
  drawn from Meta's published Cloud API error reference and flagged INDICATIVE — it must be re-verified
  against the current Meta reference, since Meta versions the API and its error codes change.

## Alternatives considered

- **A BSP intermediary (Gupshup / Twilio / WATI) as the v1 WA transport.** Rejected for v1 — a BSP adds a
  third dependency, a per-message margin, and BSP-specific onboarding/rate-limit/error semantics, for no v1
  benefit that the direct Meta Cloud API does not already provide. The AR-53 abstraction makes a future BSP
  swap a single new provider module, so choosing direct-Meta now forecloses nothing.
- **Direct Meta WhatsApp Business Cloud API with the official Node SDK.** Rejected in favour of a thin
  `fetch` client — the SDK's value is auth-refresh + convenience wrappers, but the WA system-user token is
  long-lived (no refresh) and the send is a single REST call, so the SDK is bundle weight + a patch surface
  for no gain. (Recorded per the Story 1.2 D12-1.2 / 1.5 dependency-pin discipline: zero new runtime deps
  added.)
- **Direct Meta WhatsApp Business Cloud API with a thin `fetch` client (this ADR's choice).** Accepted —
  one endpoint, one long-lived credential, no auth-refresh mechanism, the smallest possible AR-53 swap
  surface, and zero new dependencies.

## References

- [Source: architecture.md §3.4, AR-53] — "the abstraction allows future Meta API changes or alternate WA
  Business providers to be a single-module change", the swap surface this ADR's decision is measured against.
- [Source: architecture.md §3.4, line 1935] — WhatsApp = "Meta Cloud API, UTILITY-templates-only, per-Pariwar
  admin-configurable number", the shape this ADR ratifies.
- [Source: epics.md, Story 5.3] — the owning story (AC1/AC7, this ADR's write-trigger).
- [Source: `packages/channels/src/providers/whatsapp-business.ts`] — the real `ChannelProvider` factory this
  ADR commits.
- [Source: `packages/channels/src/providers/whatsapp-app.ts`] — the per-Pariwar Meta Cloud API client cache
  the credential-path + swap-surface decision is implemented by.
- [Source: `packages/channels/src/providers/whatsapp-errors.ts`] — the Meta-error → failure-class classifier
  whose code-coupling caveat this ADR records.
- [Source: `packages/domain/src/schema/pariwar_wa_config.ts`] — the provider-agnostic config table (number,
  toggle, template names, credential NAME) that makes a BSP swap schema-free.
- [Ref: ADR-0027] — the sibling push-provider-selection ADR whose structure this mirrors.
- Memory: [[feedback_architecture_vs_adr_boundary]] — discipline anchor (architecture commits the property;
  this ADR commits the cloud control).
- Memory: [[feedback_record_unattested_no_backfill]] — authoring-source-of-truth vs back-fill distinction
  (this ADR is the former; ratification is a later Trustee-Panel event).

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-07-05 | (initial draft) | BigDev (Solo Builder) | Authored at Story 5.3 (Epic 5's second `[CONSUMER]`). Commits direct Meta WhatsApp Business Cloud API (thin `fetch` client, zero new deps) for v1, closing the direct-vs-BSP decision in favour of the shape already anticipated at §3.4 L1935; the AR-53 abstraction keeps a future BSP swap a single-module change. Ratification is a later Trustee-Panel event — lands `drafted`, un-attested-pending. |
