# friction-budget.md — named-payer declaration ledger (UX-DR3, declaration facet)

> **UX Stance #2 — friction is a budgeted resource.** Every unit of friction in
> the member-facing loop is **paid by a named persona** to **protect a named
> subsystem**. The default state is **zero friction**; a row is added here _only_
> with declared attribution. Without this ledger + its CI gate, the stance
> becomes philosophy theater "and Reena pays the silent tax" (UX spec lines
> 81-83). Authority: Architecture Principle #8 (line 294) · AR-60 (epics line 348) · UX-DR3 (epics line 373) · UX Stance #2 (UX spec lines 81-83 / 269 /
> 291). Story 1.16a.

This file is the **declaration** half of UX-DR3. Its sibling `friction-budget.yaml`
is the **metric** half (bundle-byte + page-weight ceilings). One CI job —
`scripts/friction-budget/check.ts`, run via `pnpm friction:check` and the
`friction-budget` job in `.github/workflows/ci.yml` — enforces both.

## The ledger

Each row declares a **deliberately non-effortless** member-facing surface: who
pays the friction (`payer`), what subsystem the friction protects (`protects`),
and whether the friction is `forced` (unavoidable for the flow) or `optional`
(`event_type`). Seeded from the four friction surfaces already named in the UX
spec (lines 81-83 / 269 / 291) — these are the friction the design has _already_
deliberately accepted.

| payer                                            | protects                                   | event_type |
| ------------------------------------------------ | ------------------------------------------ | ---------- |
| Sushil (member, UTR-mismatch screenshot upload)  | Reconciliation integrity                   | forced     |
| relative (manual-KYC fallback)                   | "facilitator" posture                      | forced     |
| Anita (verifier, over-payment recovery judgment) | Pool Engine                                | forced     |
| Sunita (nominee bank-statement upload)           | facilitator-not-intermediary trust posture | forced     |
| member (mobile + OTP at login; fresh OTP at step-up) | Account & session security (DLT-OTP auth + step-up gate) | forced |

**Story 2.5 disposition (declaration affirmed, no new row):** the `apps/public`
Astro SSR shell + the public Niyamavali list/version/diff render are
**read-only** — no forms, no upload, no member-initiated action — so they
introduce **zero deliberate friction**. AC-4 still fires on the path touch
(conservative by design); this affirms the ledger was reviewed and no row is
warranted. The lang-toggle is a plain `<a>` server roundtrip, not a friction
surface.

**Story 2.6 disposition (declaration affirmed, no new row):** the public `/terms`
render (`apps/public/src/pages/terms.astro`, `lib/tc-render.ts`) is **read-only**
— the T&C body is precomputed and edge-cached; the page has no forms, no upload,
no member-initiated action. The provisional banner and the lang-toggle are
informational / server-roundtrip respectively, not friction surfaces. Zero
deliberate friction introduced; ledger reviewed, no row warranted.

**Story 3.2 disposition (NEW row — forced auth friction):** the member mobile
login (`apps/mobile/app/(auth)/login.tsx` + `otp.tsx`, with the session wiring in
`apps/mobile/lib/*` and the root-layout auth guard) and the member step-up gate are
**deliberate forced friction** — the member enters a mobile number + a
DLT-transactional OTP to establish a session, and a fresh OTP on high-trust actions
(mobile/nominee change, withdrawal, account-deletion ack, DigiLocker re-link, claim
filing — §2.2). This protects **account & session security** (the §2.2
OTP-security-floor + the step-up set), so it is declared as the `forced` row above.
Phone+OTP is transferable-by-design (Ravi-mode, UX line 263) — no identity gating
beyond phone+OTP+device — so no friction beyond the OTP itself is imposed.

## How to declare (attribution-on-change — AC-4)

When a PR's diff touches a **member-facing form/interaction surface**
(`apps/mobile/**`, or `apps/public/**` once it renders member-facing forms at
Story 2.5+ — admin / api / jobs / infra / docs are excluded), the gate requires
this file to be touched too: add a row (or affirm an existing one) declaring the
friction's `payer` + `protects` + `event_type`. A member-facing diff with **no**
change to this ledger fails with the "declare payer + protects + event_type"
message.

Structural rules the gate enforces on every row: all three keys present;
`event_type ∈ {forced, optional}`.

## Bootstrapping / no-op semantics (AC-2, AC-6)

The gate ships **before** the surfaces it ultimately governs — the
"no-op until populated" pattern shared with sibling Stories 1.16b/c/d.

- **Metric facet (`friction-budget.yaml`)** — there is no member-facing JS build
  output in `pnpm turbo run build` yet: `apps/public` is a `tsc` stub (the Astro
  SSR shell lands at Story 2.5, AR-48) and `apps/mobile`'s `build` is an
  intentional EAS no-op. So each surface is a **graceful no-op (passes) until its
  `manifest` path exists**, then enforces surface-by-surface as build outputs
  land. `baseline` values stay `null` until a surface is first measured.
- **Declaration facet (this file)** — **path-triggered** and therefore naturally
  **dormant** until a member-facing app path changes. It is live the moment such
  a path is touched; the seed rows above keep the ledger structurally valid so
  the gate is green by construction on the PR that introduces it.
- **Live critical-render-path timing — explicitly deferred (AC-6).** The
  canonical device is a **3GB Android** (architecture line 34). Live / emulated
  CRP timing needs a device farm or CPU-throttled-Lighthouse harness, none of
  which exists in CI. The statically measurable proxies (bundle bytes +
  page-weight) ship now; live-device timing is recorded as _"Resolved via
  explicit deferral"_ with a trigger in `deferred-work.md` — **not** silently
  dropped.

See `scripts/friction-budget/README.md` for the gate's mechanism and the
baseline-of-record model.
