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

**Story 3.3b disposition (existing row REALIZED — no new row):** the manual-KYC
fallback (`apps/mobile/app/(signup)/kyc.tsx` manual path → `POST /api/v1/member/kyc/manual`)
is the SURFACE that realizes the already-declared **`relative (manual-KYC fallback)
→ "facilitator" posture → forced`** row above (seeded at Story 1.16a from UX line 269).
The relative/facilitator pays a small friction (typing name + DoB instead of the
one-tap DigiLocker pull) to protect the **facilitator-not-intermediary trust posture**
— the manual record is self-declared + trustee-verifiable later (R1), never an
intermediary acting on the member's behalf. No NEW row is warranted (the friction was
named at 1.16a); this affirms it is now implemented. The **page-weight baseline is
unchanged**: the KYC step is in the authenticated mobile app (`apps/mobile`, an EAS
build no-op → `member-app-native` stays a no-op); the page-weight ceilings the gate has
teeth on cover the PUBLIC `apps/public` Astro surface, which this story does not touch.

**Story 3.4 disposition (declaration affirmed, no new row):** the nominee-declaration
step (`apps/mobile/app/(signup)/nominees.tsx` → `POST /api/v1/member/nominees`) is
**necessary signup data entry**, not deliberate friction — the member names the 1–2
people who should receive support, the 75/25 split is **server-derived** (no decision
imposed on the member), and the form explicitly does **NOT** ask for nominee KYC/Aadhaar
(AC2) or nominee bank/IFSC (AC3) at signup, *removing* would-be friction by deferring
both to claim time (Epic 6). Zero deliberate friction introduced; ledger reviewed, no row
warranted. The **page-weight baseline is unchanged**: the screen is in the authenticated
mobile app (`apps/mobile`, an EAS build no-op → `member-app-native` stays a no-op); the
page-weight ceilings the gate has teeth on cover the PUBLIC `apps/public` Astro surface,
which this story does not touch. (The Life Events nominee-UPDATE + its step-up friction is
Story 3.9 — that gating, not this signup declaration, is where a `forced`-row review applies.)

**Story 3.5 disposition (declaration affirmed, no new row):** the medical-disclosure step
(`apps/mobile/app/(signup)/medical.tsx` → `POST /api/v1/member/medical-disclosure`) is
**necessary v1-M signup data entry plus a mandatory compliance acknowledgment**, not
deliberate friction. The IMA multi-select is **zero-or-more** (most members disclose nothing
— a single tap to continue), the free-text is **optional**, and the one required interaction
is the concealment-denial acknowledgment — a **legal/compliance gate (FR-11), not gratuitous
friction**: it gives R14 concealment-penalty enforcement (Epic 4) the consent + audit trail to
*flag for State Trustee review rather than auto-deny*, which is friction *removed* from the
nominee's future claim. Zero gratuitous friction introduced; ledger reviewed, no row warranted.
The **page-weight baseline is unchanged**: the screen is in the authenticated mobile app
(`apps/mobile`, an EAS build no-op → `member-app-native` stays a no-op); the page-weight
ceilings the gate has teeth on cover the PUBLIC `apps/public` Astro surface, which this story
does not touch. (The Life Events medical-UPDATE + its step-up friction is Story 3.9 — that
gating, not this signup disclosure, is where a `forced`-row review applies.)

**Story 3.6a disposition (declaration affirmed, no new row):** the signup-wizard chrome
(`apps/mobile/app/(signup)/_layout.tsx` progress indicator + ordered step flow) and the new T&C
step (`apps/mobile/app/(signup)/tc.tsx` → `GET`/`POST /api/v1/member/terms`) are **necessary v1
signup steps with zero gratuitous friction**. The wizard chrome *removes* friction — a progress
indicator and resumable navigation orient the member through the steps every prior Epic-3 story
shipped in isolation. The T&C step's single required interaction is **accepting the Terms &
Conditions** — a **mandatory legal acceptance (the second consent-registry consumer; the basis the
audit chain + DPDPA rely on), not deliberate friction**: a member must accept terms exactly once to
join, which is the minimum a regulated mutual-aid platform can ask. (The member-creation endpoint +
the OTP→wizard hand-off add **no** member-facing interaction — they make the existing OTP step
finally reach the wizard.) Zero gratuitous friction introduced; ledger reviewed, no row warranted.
The **page-weight baseline is unchanged**: the new screens are in the authenticated mobile app
(`apps/mobile`, an EAS build no-op → `member-app-native` stays a no-op), and the page-weight ceilings
the gate has teeth on cover the PUBLIC `apps/public` Astro surface, which this story does not touch
(the new screens stay **under** the ceiling; the best-ever baseline is left put — it only ever
decreases in-PR). (The ₹110 Vyawastha Shulk UPI payment + its lock-in gate is Story 3.6b — that
*payment* friction, not this T&C acceptance, is where a `forced`-row review applies.)

**Story 3.6b disposition (necessary signup-completion steps, no new row):** the signup payment step
(`apps/mobile/app/(signup)/payment.tsx` — REPLACES the 3.6a placeholder — → `POST /api/v1/member/
vyawastha-shulk/intent` + `/confirm`) introduces three member interactions, all **necessary v1
signup-completion steps with zero gratuitous friction**: (1) the **Pay via UPI** hand-off — the
mandatory ₹110 Vyawastha Shulk is **FR-1**, the minimum a mutual-aid membership can ask, and the OS
UPI Intent is the *lowest-friction* payment surface (no card form, no gateway redirect chain — one tap
to the member's own UPI app); (2) the **UTR self-attest** — the minimum payment-confirmation surface
when there is no payment gateway (architecture L1568: UPI Intent is OS-level; the matcher/reconciliation
is Epic 8, deliberately *not* gating signup); (3) the **Reference Code** — explicitly **optional and
skippable** (D2 port seam), so it adds zero forced friction. No urgency theater, no dark patterns
(UX-DR55 "Agency without anxiety"). Zero gratuitous friction introduced; ledger reviewed, no row
warranted. The **page-weight baseline is unchanged**: the new screen is in the authenticated mobile app
(`apps/mobile`, an EAS build no-op → `member-app-native` stays a no-op), and the page-weight ceilings
the gate has teeth on cover the PUBLIC `apps/public` Astro surface, which this story does not touch (the
new screen stays **under** the ceiling; the best-ever baseline is left put — it only ever decreases
in-PR). This closes the signup loop: payment is the wizard's final step.

**Story 3.7 disposition (declaration affirmed, no new row):** the lock-in clock widget
(`apps/mobile/components/lock-in/LockInClockWidget.tsx`, `useLockInClockQuery.ts`,
`apps/mobile/lib/niyamavali-link.ts`) and its home-tab mount (`apps/mobile/app/(tabs)/index.tsx`)
are **read-only, conditionally-rendered, ambient-status elements** — they display a day-granular
countdown + unlock date + rationale + clause reference for members in `lock-in` state; for everyone
else the widget renders `null` with no visible change. The one interactive element is the
**optional deep-link tap-target** that opens the public Niyamavali clause page in the OS browser
(`Linking.openURL`). This is user-initiated, non-blocking, and leads to a read-only public page
already affirmed as zero-friction in the Story 2.5 disposition above; the tap adds no forced step,
no form, no upload, and no gate. The UX spec characterises the widget explicitly as *calm presence*
(lines 299/313/973/977-979): no urgency theater, no red countdown, no per-second tick. Zero
gratuitous friction introduced; ledger reviewed, no row warranted. The **page-weight baseline is
unchanged**: all new files are in the authenticated mobile app (`apps/mobile`, EAS build is a
no-op → `member-app-native` stays a no-op), and the page-weight ceilings the gate has teeth on
cover the PUBLIC `apps/public` Astro surface, which this story does not touch.

**Story 3.8 disposition (declaration affirmed, no new row):** the renewal surfaces span two categories:

(1) **Read-only ambient widget** (`apps/mobile/components/renewal/RenewalStatusWidget.tsx`,
`useRenewalStatusQuery.ts`, home-tab mount in `apps/mobile/app/(tabs)/index.tsx`): a calm
passbook strip that self-suppresses when the member is not yet at renewal-due (`days_until_lapse > 91`)
or has never paid. It displays the paid-through date + a grace-days countdown + a "Renew membership"
CTA. The CTA is **user-initiated, non-blocking, and navigates to a payment screen** — it adds no
forced step, no form, and no gate. The UX spec characterises the widget as *calm presence* (lines
973/977-979): no urgency theater, no red countdown, no per-second tick. Identical pattern to the
Story 3.7 lock-in clock widget.

(2) **Annual renewal payment screen** (`apps/mobile/app/(renewal)/_layout.tsx`,
`apps/mobile/app/(renewal)/payment.tsx`, `apps/mobile/app/_layout.tsx` registration): the member
navigates here voluntarily from the widget CTA. The screen introduces two interactions — both are
verbatim mirrors of the Story 3.6b signup payment disposition already affirmed: (a) **Pay via UPI**
hand-off — the ₹110 annual Vyawastha Shulk renewal is FR-1A, the minimum for continued mutual-aid
coverage, and the OS UPI Intent is the lowest-friction payment surface (one tap to the member's own
UPI app; no card form, no gateway redirect); (b) **UTR self-attest** — the minimum payment-
confirmation surface when there is no payment gateway (architecture L1568). No reference-code field
(renewal-only: that was a signup port seam). No lock-in gate. No urgency theater (UX-DR55 "Agency
without anxiety"; the 3-month grace exists precisely to avoid penalising a brief lapse, PRD line 256).
Zero gratuitous friction introduced — the payment is optional (a member may let their membership lapse)
and the screen is reached only by deliberate CTA tap. Ledger reviewed, no row warranted. The
**page-weight baseline is unchanged**: all new files are in the authenticated mobile app (`apps/mobile`,
EAS build is a no-op → `member-app-native` stays a no-op); the page-weight ceilings the gate has teeth
on cover the PUBLIC `apps/public` Astro surface, which this story does not touch.

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
