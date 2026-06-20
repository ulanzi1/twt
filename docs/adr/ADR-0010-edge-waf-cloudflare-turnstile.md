# ADR-0010: Edge / WAF — Cloudflare as v1 default, Turnstile server-verify, `packages/edge` pivot abstraction, edge-only ingress mechanism

> **Status:** drafted
> **Date:** 2026-06-15 (date entered current status)
> **Author:** Solo Builder (BigDev), at Story 1.13 closure
> **Ratifying trustees:** <pending; populated at `ratified` status>
> **Supersedes:** —
> **Superseded by:** —

## Context

Story 1.13 is the control mechanism for architecture **§5.8a** — the *Edge / WAF capability bar* (vendor-neutral, outcome-oriented). The architecture commits the *properties* (all public traffic proxied; bot management + CAPTCHA-style challenge; ingress signature verification; edge-only ingress; observable edge metrics; a DPDPA-compatible posture) and explicitly *defers the vendor + mechanism selection to an ADR* contingent on edge selection (§5.8 L3235-3277, §5.8a L3279-3316). This ADR records the controls chosen. Per [[feedback_architecture_vs_adr_boundary]], the architecture commits the property; the ADR commits the cloud/vendor control.

The forcing conditions:

- **AR-52 (the load-bearing constraint).** "Cloudflare-specific features sit behind a `packages/edge` provider-interface abstraction so a pivot to a different edge vendor is a single-module change" (epics.md L1246-1248, L4364; Sprint Change Proposal Item 6). The four §5.8a substitution points that must stay clean (L3308-3313): **§2.1** (scraper threat → bot management), **§2.11** (rate-limit Layer 1), **§3.11** (ingress signature), **§5.8** (edge-only ingress).
- **AR-33.** Edge-only ingress: the backend is not directly reachable from the public internet; the break-glass bypass is time-bounded + audit-logged (§5.8 L3251-3266).
- **FR-88.** CAPTCHA-style challenge on signup, claim filing, and helpdesk forms; the auth entry points (Story 1.9) are the additional real wiring target.
- **Story 1.9 pre-built the seam.** A no-op `TurnstileVerifier` was already called (but its result discarded) at the login + password-reset entry points; deferred-work D3-1.9 handed the real integration to Story 1.13.
- **Residency / regulatory constraint — OPEN.** Cloudflare-DPDPA compatibility is a [P0] surface pending legal review (architecture L247-254). Target region is GCP `asia-south1`. The decision deadline for the *live apply* is the legal-review clearance, not Story 1.13 closure.

## Decision

**Cloudflare is the v1 edge / WAF default.** The vendor-specific integration lives entirely behind the `packages/edge` (`@twt/edge`) provider abstraction (server side) + `infra/cloudflare/` (infrastructure) + a single admin-side widget component — so a pivot to a different edge vendor is a single-module change (AR-52). Live `terraform apply` + zone onboarding is **deferred** (D1-1.13), gated on the DPDPA legal review.

### 1. `packages/edge` (`@twt/edge`) — the vendor-neutral seam (AR-52)

A new package owns the edge seam: the neutral `TurnstileVerifier` interface + `TurnstileVerification` type, the `noopTurnstileVerifier` default, and the single sanctioned `createCloudflareTurnstileVerifier(...)` factory (mirrors `createQueueClient` / `createSimpleWebAuthnProvider`). It carries **no dependency on `@twt/domain`** (mirrors `@twt/queue`). Every `cloudflare`-named string — the siteverify URL, the widget script URL, the documented testing keys, the siteverify wire-protocol — lives inside this package and nowhere else. Consumers (`apps/api`) import only the neutral interface; the **composition root (`deps.ts`) is the one place** that names the vendor factory, selecting real-vs-noop from config — exactly as it already names `createSimpleWebAuthnProvider`.

**`packages/edge` is a deliberate, recorded variance from the architecture source tree.** Architecture §Project Structure (L4140-4419) does NOT list `packages/edge` — its §4.13 security mapping (L4529) points only to `infra/cloudflare/` + `apps/api/src/plugins/rate-limit/`. The **epics layer overrides** (AR-52, epics.md L1248 + L4364, Sprint Change Proposal Item 6) explicitly require the `packages/edge` provider-interface. Per [[feedback_architecture_vs_adr_boundary]], the epic/ADR layer commits the control mechanism; this is an intentional addition, not a freelance structure invention. (`packages/platform-adapters/` is the sibling substrate-agnostic home but is UI-oriented; `packages/edge` is the right home for the edge seam.)

### 2. The four §5.8a substitution points stay clean

| Substitution point | Architecture | Where the Cloudflare specifics are quarantined |
|---|---|---|
| **§2.1** scraper threat → bot management | bot mgmt + challenge | `infra/cloudflare/waf.tf` (`cf.bot_management.score` WAF rules) |
| **§2.11** rate-limit Layer 1 | Cloudflare front line | `infra/cloudflare/` (Layer 1); the server-side POLICY layer is **Story 1.14** — NOT built here |
| **§3.11** ingress signature | verify inbound origin before backend | `infra/cloudflare/origin-ingress.tf` edge-auth header + a vendor-neutral origin guard behind `@twt/edge` |
| **§5.8** edge-only ingress | backend not publicly reachable | `infra/cloudflare/origin-ingress.tf` + the mechanism below |

### 3. Turnstile — real server-side verification (Story 1.9 wiring)

`createCloudflareTurnstileVerifier` POSTs to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret` + `response` (+ optional `remoteip`, `idempotency_key`) and returns `true` only on `success: true`. The token is single-use (a replay returns `timeout-or-duplicate` → reject). **Fail-closed + safe-by-default:** a siteverify network error / timeout / non-2xx / `internal-error` fails **closed** in production (request rejected; `failOpen` defaults false). When **no secret is configured** (local / CI / not-yet-provisioned), the seam resolves to `noopTurnstileVerifier` (always pass) so the stack runs with zero Cloudflare config. Selection is config-driven in `deps.ts`, secret-NAME-not-value (mirrors the argon2 pepper; the secret resolves via `resolveSecretValue` from Secret Manager).

**Load-bearing regression fixed (AC-3).** `admin-auth.handlers.ts` previously `await`ed `deps.turnstile.verify(...)` but **discarded the boolean** at the login + password-reset entry points — a real verifier returning `false` would have been inert. The handlers now reject on `false` with the **generic** `UnauthorizedError('Invalid credentials', 'auth.invalid_credentials')` envelope (anti-enumeration — identical to a bad password / lockout, never "captcha failed") and audit it (`login.failure` reason=`turnstile`). The no-op default returns `true`, so the Story 1.9 suite stays green.

### 4. Edge-only ingress mechanism (AR-33, §5.8)

Architecture §5.8 commits the *property* (backend not publicly reachable) and defers the *mechanism* to this ADR. **Selected v1 default: `header_secret`** — Cloudflare injects a shared-secret header on every proxied request (a Transform Rule, `infra/cloudflare/origin-ingress.tf`); a vendor-neutral Fastify guard at the origin verifies it and rejects any request that did not transit Cloudflare. The header VALUE is a Secret-Manager secret, never committed. **End-state target: `tunnel`** — Cloudflare Tunnel (`cloudflared`), where the origin has *no* public ingress at all (cleanest for Cloud Run private ingress); selected when the GCP ingress side is wired (Story 1.15, D2-1.13). `aop_mtls` (Authenticated Origin Pulls) is the third option. The choice is a single tfvar (`edge_only_ingress_mechanism`) + a swappable origin guard. The break-glass bypass stays time-bounded + audit-logged (§5.8 L3257-3266).

### 5. Bot Management — capability committed, SKU is an ops decision

Full **Bot Management** (`cf.bot_management.score`, verified-bot list, managed challenge) is a Cloudflare **Enterprise** add-on; **Super Bot Fight Mode** is the Pro/Business equivalent. The architecture commits the *capability* ("bot management + challenge"), **not the SKU**. `infra/cloudflare/waf.tf` expresses per-surface sensitivity (the FR-88 surfaces get a stricter `cf.bot_management.score` threshold than read surfaces); `var.enable_bot_management` defaults **false** (no paid plan at dev). **The score-based rules require a plan that populates the score** — recorded here so the capability bar is not quietly assumed at a tier the trust has not bought (D5-1.13).

### 6. DPDPA compatibility — **OPEN** (do not assert compliance)

Cloudflare-DPDPA compatibility is a [P0] surface **pending legal review** (architecture L247-254). This ADR does **NOT** assert that Cloudflare is DPDPA-compliant. The live `terraform apply` is gated on the legal-review clearance (D1-1.13). If the review rejects Cloudflare's data-residency / sub-processor posture for the `asia-south1` target, the pivot path (§Alternatives) activates — and the `packages/edge` abstraction is precisely what keeps that pivot a single-module change.

## Alternatives considered

- **AWS WAF + CloudFront / Shield** — Deferred (not rejected). Comparable capability bar; heavier coupling to the AWS control plane and a separate residency analysis. Cross-link a future ADR slot if the DPDPA review rejects Cloudflare. The `packages/edge` seam keeps this reachable.
- **fastly + a separate CAPTCHA (hCaptcha / reCAPTCHA)** — Rejected for v1 because it splits the WAF and the challenge across two vendors (two trust dependencies, two integrations), against the §5.8a single-edge intent. hCaptcha remains the natural Turnstile substitute *within* a `packages/edge` pivot if needed.
- **Self-hosted WAF (ModSecurity / Coraza) + app-level challenge** — Rejected for v1: it moves the bot-management + edge-only-ingress burden onto the team (the exact undifferentiated work AR-52 wants outsourced) and forfeits a managed bot-score. Revisit only if vendor-trust or cost forces in-housing.
- **Dedicated `EdgeProvider` aggregate consumed app-wide (instead of injecting the narrow `TurnstileVerifier`)** — Deferred. v1 lands only the Turnstile verifier in code (bot-management / ingress are infra config); a `{ turnstile }` aggregate type is exported for documentation but consumers inject the narrow interface to avoid an unused abstraction. Graduate when a second programmatic edge capability lands in code.

## Consequences

- **Operational** — A new runbook obligation: the live zone-onboarding leg (D1-1.13) — `terraform apply`, push Turnstile secrets to Secret Manager, set `TURNSTILE_SECRET_NAME` + `VITE_TURNSTILE_SITE_KEY`. The break-glass edge-bypass path must be added to the on-call playbook (time-bounded + audited). Bot-Management enablement is a plan/contract decision (D5-1.13).
- **Security** — Cloudflare becomes a vendor-trust dependency on the request path (architecture §2.1 threat inventory). The fail-closed Turnstile posture means a Cloudflare siteverify outage rejects logins in prod (availability traded for safety) — `failOpen` is the explicit degraded-mode escape, an ops decision. The AC-3 regression fix closes a real abuse-gate-inert hole.
- **Performance** — Edge proxying adds a hop but offloads bot filtering before the origin (net positive under abuse). Turnstile siteverify adds one outbound call on the login/password-reset path (5s timeout ceiling, fail-closed). Layer-1 rate limiting at the edge protects the §2.11 budgets; the server-side policy layer is Story 1.14.
- **Cost** — Turnstile is free; full Bot Management requires Enterprise (or SBFM on Pro/Business). Per-environment edge cost is an ops envelope (Story 1.15).
- **Failure modes accepted** — siteverify unreachable → logins rejected in prod (fail-closed) until Cloudflare recovers or `failOpen` is toggled. Bot-score rules are inert until a qualifying plan is purchased (D5-1.13).
- **Migration / pivot path** — A vendor pivot changes `packages/edge` (swap the factory + constants), `infra/cloudflare/` (→ the new vendor's IaC), and the single admin widget component. Consumers (handlers, services, contracts) are untouched. Trigger conditions: DPDPA review rejects Cloudflare; a vendor-trust or cost signal; trustee judgment. Successor-ADR pattern: a new ADR supersedes this one and records the new vendor against the same §5.8a bar.

## References

- [Source: architecture.md §5.8 Network topology, lines 3235-3277] — edge-only ingress property + mechanism deferral
- [Source: architecture.md §5.8a Edge/WAF capability bar + pivot disposition, lines 3279-3316] — the capability bar + the four substitution points (L3308-3313)
- [Source: architecture.md §2.11 Rate limiting, lines 1700-1716] — Layer-1 vs server-side policy layer (Story 1.14)
- [Source: architecture.md §3.11 Webhook ingress, line 2372] — ingress signature (persist+ack assumes verified ingress)
- [Source: architecture.md lines 247-254] — P0 Cloudflare-DPDPA OPEN risk; lines 3482-3483 — rate budgets
- [Source: PRD/epics.md, Story 1.13 lines 1232-1248] — FR-88 + AR-33 + AR-52 + `packages/edge` single-module-change; L4364 (packages/edge per AR-52)
- [Source: epics.md, Sprint Change Proposal Item 6] — `packages/edge` provider-interface requirement
- [Source: deferred-work.md, D3-1.9] — Turnstile real-integration hand-off → Story 1.13; D1-1.13…D5-1.13 — this story's deferrals
- [Source: docs/adr/ADR-0009-admin-authentication.md §8] — the no-op Turnstile seam this ADR graduates to real
- [Source: `docs/knowledge-transfer/adr-index.md`] — the live index row for this ADR
- [Source: Cloudflare Turnstile server-side validation] — https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- Memory: [[feedback_architecture_vs_adr_boundary]] — discipline anchor (architecture commits the property; this ADR commits the Cloudflare control)
- Memory: [[feedback_closure_language_precision]] — DPDPA status recorded as OPEN, not closed

---

## Changelog

| Date | Status flip | Author | Notes |
|---|---|---|---|
| 2026-06-20 | (no status flip — DPDPA still OPEN) | BigDev | Epic 1 retro AI-6 posture gate: Epic 2 public-surface posture recorded as Decision 2026-06-20-051 — Cloudflare off Epic 2 critical path; Story 2.5 designed non-edge-capable (Dokploy precedent); D1-1.13 remains gated on legal-review clearance. |
| 2026-06-15 | (initial draft) | Solo Builder (BigDev) | Authored at Story 1.13 closure — Cloudflare v1 edge/WAF default, `packages/edge` abstraction, Turnstile server-verify + AC-3 regression fix, edge-only-ingress mechanism (`header_secret` default → `tunnel` end-state), Bot-Management plan-tier dependency, DPDPA-compatibility OPEN |
