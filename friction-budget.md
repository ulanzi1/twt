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
| member (opting in to WhatsApp notifications; sends a pre-filled "Send Hello" WhatsApp message to confirm) | Explicit, member-initiated consent provenance (AC4 — no inferred/passive consent for a new communication channel) | optional |
| member (opting in to Telegram notifications; taps a t.me deep-link to /start the bot) | Explicit member-initiated consent for a new channel | optional |
| member/nominee (claim-time dual bank-account entry — a SECOND full account, not just one) | Multi-channel payment resilience (a second bank channel if one fails or the donor prefers it — Story 9.9 reframed this row's rationale from an RBI per-payee-cap failover to donor CHOICE; the friction itself is unchanged) | forced |
| trustee / reconciliation reviewer (step-up OTP + reason-code on every confirm/reject/facilitate-recovery/reverse) | Canonical financial truth (`contribution.confirmed`) + reconciliation integrity (no silent remap) | forced |
| member/donor (choosing which nominee bank account to pay, when the claim has two) | Paying-to-the-correct-nominee confidence — no opaque server-side default; the donor actively confirms via the bank-name choice + the nominee-name-match banking-info panel (Story 9.9) | forced |
| member (filing a helpdesk support request — category + subject + body, optional attachments) | Structured triage/routing to the correct role with a visible SLA, instead of an unstructured WhatsApp message or phone call (FR-52) | optional |
| member (asserting a personal event affected a contribution — a bounded 6-value picker, no free text) | Honest expectation-setting for the ratified Niyamavali §3.1 "carries no consequence of its own" invariant — the member cannot record without first being shown, before they act, that asserting changes nothing (AC1/AC7, Story 10.26) | optional |
| terminated member (obtaining their own records and exercising data rights by PHONING THE HELPLINE, because authenticated self-serve export has ended) | The Niyamavali §8.4 boundary — termination ends authenticated access while statutory rights survive, exercised through an identity-verified administrative process. ⚠ INERT AS SHIPPED: payable only once `termination_access_block` is enabled, which is gated on Story 10.21 + a Trustee Panel decision (Story 10.19) | forced |
| member (filing a DPDPA data-rights ticket — an EXTRA checkbox, shown only under that subcategory, asking whether they want staff to hand over their off-portal export because they cannot receive the delivery code themselves) | Genuine member authorship of element 1 of the ratified three-part gate on staff-mediated Tier-1 export delivery (Decision `2026-08-14-113` cl.1 / `2026-08-15-116` cl.3 / `2026-08-15-120` D1 — replaces a caller-hardcoded `z.literal(true)` that made a staff assertion wear the member's name, Story 10.29) | optional |
| member (answering a poll — a whole questionnaire in one pass, with NO save-and-resume and NO way to change an answer once sent) | The MEANING of the aggregate an admin reads (Story 10.15 LBD-6): one response per member, enforced by the composite PK, is what makes a count a count. An editable answer would make the aggregate a moving target, and a resumable draft would let a member submit against a poll that has since closed. ⚠ The finality is stated BEFORE the member commits, not after — a member who answers by mistake raises a helpdesk ticket (Story 10.2), a human path that already exists and leaves a record | optional |
| trustee (emergency fixed-amount override — the attesting panel must now be CHOSEN from the eligible-attestor directory, and a named actor who does not hold `pool.fixed_amount_emergency` at this Pariwar is refused server-side) | The immutable Emergency Adjustment Record's authority — before Story 10.13 any global user id with a display name could be written onto it, including an admin of a different Pariwar, so the record named an authority the governing instruments do not confer (Deed Cl. 10(b) / Niyamavali §4.2 vest amount-fixing in the Board; Decision `2026-08-16-123` cl.2) | forced |
| member under suspension or termination (stating, in their own words, WHY the moderation decision against them is wrong — a free-text grounds field, minimum length enforced, before the appeal can be sent) | The Niyamavali §8.8 right to be heard. ⭐ The friction IS the mechanism: §8.8 promises "notice, a fair hearing and a reasoned outcome", and an appeal with no stated grounds gives the Trustee Panel nothing to hear — the member would have exercised the right and gained nothing. ⚠ The screen deliberately pays MORE friction than the write requires: before the field it states that the review is by a trustee who took no part in the decision, that filing does NOT pause the sanction (§8.8 has no suspensive effect), and that using the appeal waives no external recourse (Deed Clause 26 / R10(E)) — so a member commits knowing what they get. ⛔ NOT payable off-portal: a terminated member states the same grounds to a helpline operator, who records them, so the friction does not depend on the access termination removes (Story 10.22) | forced |

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

**Story 3.9 disposition (existing step-up row REALIZED for Life Events updates; no new row):** the Life Events panel (`apps/mobile/app/(life-events)/` + `apps/mobile/components/life-events/`) adds four self-service member-update flows. Friction analysis by sub-type:

(1) **Nominee + medical updates — step-up OTP gate (forced, pre-declared):** both routes require `requireMemberStepUp` (Story 3.9's `useStepUpGate` hook), which drives the member through the OTP request → verify → retry loop. This is identical step-up friction to the Story 3.2 login OTP and is already captured in the existing **"member (mobile + OTP at login; fresh OTP at step-up) → Account & session security → forced"** row. The Story 3.2 disposition (`apps/mobile/app/(auth)/login.tsx` + step-up gate) explicitly scoped step-up to "high-trust actions (mobile/nominee change, withdrawal, account-deletion ack, DigiLocker re-link, claim filing — §2.2)". Life Events nominee + medical updates are exactly those high-trust actions. No new row warranted — the existing forced row covers it.

(2) **Address + posting updates — zero forced friction:** both routes require only `requireMemberSession` (no step-up). The forms are user-initiated self-service data entry with calm register (UX-DR55 Pattern 4 dignified-validation copy — "Take your time — there's no rush", "Please enter your address when you're ready"). No upload, no gate, no urgency theater; the prior value is preserved as append-only history so no destructive decision is required of the member. Zero deliberate friction introduced.

(3) **Signup form refactor (signup nominees + medical shared components):** `apps/mobile/app/(signup)/nominees.tsx` and `apps/mobile/app/(signup)/medical.tsx` are refactored to consume the new shared `NomineeForm` / `MedicalForm` components. The signup **behavior is unchanged** — no step-up added, no new fields, no additional interactions. The refactor removes code rather than adding friction.

(4) **Session-context signOut purge + home-tab entry point:** `apps/mobile/lib/session-context.tsx` gains a draft-purge call on logout (invisible to the member) and `apps/mobile/app/(tabs)/index.tsx` gains a `<LifeEventsEntry>` below the renewal widget (an ambient, user-initiated navigation tile — no forced interaction). Neither introduces deliberate friction.

Zero gratuitous friction introduced; ledger reviewed, no new row warranted. The **page-weight baseline is unchanged**: all new and modified files are in the authenticated mobile app (`apps/mobile`, EAS build is a no-op → `member-app-native` stays a no-op); the page-weight ceilings the gate has teeth on cover the PUBLIC `apps/public` Astro surface, which this story does not touch.

**Story 3.10 disposition (existing step-up row REALIZED for withdrawal confirm; no new row):** the voluntary withdrawal flow touches eight mobile files across four categories:

(1) **Withdrawal confirm step-up OTP gate (forced, pre-declared):** `apps/mobile/app/(withdrawal)/index.tsx` confirms the withdrawal behind `useStepUpGate('withdrawal')`, which drives the member through the OTP request → verify → retry loop. This is identical step-up friction to the Story 3.2 login OTP and is already captured in the existing **"member (mobile + OTP at login; fresh OTP at step-up) → Account & session security → forced"** row. The Story 3.2 disposition explicitly scoped step-up to "high-trust actions (mobile/nominee change, **withdrawal**, account-deletion ack, DigiLocker re-link, claim filing — §2.2)". Voluntary withdrawal is one of those named high-trust actions. The `apps/mobile/app/(auth)/otp.tsx` modification extends the same OTP screen to the withdrawal step-up context — the same declared surface, no new friction. No new row warranted — the existing forced row covers it.

(2) **Pattern 4 dignified-withdrawal stages — zero forced friction:** the ack → reason → confirm → done staged flow (`apps/mobile/app/(withdrawal)/index.tsx`, `apps/mobile/app/(withdrawal)/_layout.tsx`) is **Pattern 4 dignified design** (UX spec "Calm register, no retention theater"): the ack screen is **read-only and optional** (the member may tap "Back" at any point); the reason capture is **fully optional** (both `reasonCode` and `reasonText` are optional in contracts — the member may continue with neither); the done screen is **read-only** (confirmation + rejoin date). None of these stages imposes a gate, upload, or coercive decision. Zero deliberate friction introduced beyond the step-up OTP already declared.

(3) **rejoin-locked.tsx — read-only enforcement gate, not friction:** `apps/mobile/app/(auth)/rejoin-locked.tsx` is shown only when a withdrawn member attempts re-signup within the 12-month rejoin-lock window (the API already returns a 403 `auth.rejoin_locked`; this is the member-friendly surface for that error). It is a read-only state display — no form, no upload, no decision. Analogous to any other read-only guard screen; zero friction introduced.

(4) **WithdrawalEntry nav tile + route registration — user-initiated, non-blocking:** `apps/mobile/components/withdrawal/WithdrawalEntry.tsx` (the home-tab navigation tile), `apps/mobile/app/(tabs)/index.tsx` (mount point), and `apps/mobile/app/_layout.tsx` (route registration) are identical in character to the Story 3.9 `<LifeEventsEntry>` already affirmed: the tile is user-initiated, non-blocking, and navigates to the withdrawal flow only when the member deliberately taps it. No forced step, no form, no gate. `apps/mobile/components/withdrawal/format-date.ts` is a display utility, not a friction surface.

Zero gratuitous friction introduced; ledger reviewed, no new row warranted. The **page-weight baseline is unchanged**: all new and modified files are in the authenticated mobile app (`apps/mobile`, EAS build is a no-op → `member-app-native` stays a no-op); the page-weight ceilings the gate has teeth on cover the PUBLIC `apps/public` Astro surface, which this story does not touch.

**Story 3.11 disposition (existing step-up row REALIZED for data-export download; no new row):** the data export flow touches six mobile files across three categories:

(1) **Data export download step-up OTP gate (forced, pre-declared):** `apps/mobile/app/(data-export)/index.tsx` gates the ZIP download behind `useStepUpGate('data_export')`, which drives the member through the OTP request → verify → retry loop before the one-time download is unlocked. This is identical step-up friction to the Story 3.2 login OTP and is already captured in the existing **"member (mobile + OTP at login; fresh OTP at step-up) → Account & session security → forced"** row. The Story 3.2 disposition explicitly scoped step-up to "high-trust actions (mobile/nominee change, withdrawal, account-deletion ack, DigiLocker re-link, claim filing — §2.2)"; DPDPA data-portability export is a one-time-download high-trust action in the same class. No new row warranted — the existing forced row covers it.

(2) **OS share sheet (optional, user-initiated):** after the ZIP is downloaded and written to the device cache via `apps/mobile/lib/save-export.ts`, the OS share sheet is presented via `expo-sharing` — the member may share, save, or dismiss it. The share sheet is **fully optional and user-initiated**: dismissed it carries no penalty; the ZIP is already written locally. No forced upload, no coercive decision, no urgency theater. Zero deliberate friction introduced beyond the step-up OTP already declared.

(3) **DataExportEntry nav tile + route registration — user-initiated, non-blocking:** `apps/mobile/components/data-export/DataExportEntry.tsx` (the home-tab navigation tile), `apps/mobile/app/(tabs)/index.tsx` (mount point), and `apps/mobile/app/_layout.tsx` (route registration) are identical in character to the Story 3.9 `<LifeEventsEntry>` and Story 3.10 `<WithdrawalEntry>` already affirmed: the tile is user-initiated, non-blocking, and navigates to the export flow only when the member deliberately taps it. No forced step, no form, no gate.

Zero gratuitous friction introduced; ledger reviewed, no new row warranted. The **page-weight baseline is unchanged**: all new and modified files are in the authenticated mobile app (`apps/mobile`, EAS build is a no-op → `member-app-native` stays a no-op); the page-weight ceilings the gate has teeth on cover the PUBLIC `apps/public` Astro surface, which this story does not touch.

**Story 4.7 disposition (declaration affirmed, no new row):** the member-facing `<MemberStatusPanel>` (Story 4.7, Task 6) touches six mobile files:

(1) **Membership status screen — read-only, no forced friction:** `apps/mobile/app/(membership)/index.tsx` (+ `_layout.tsx`) renders the member's OWN validity payload (`variant: 'member'`) via the shared `@twt/ui` presenter — identity/Aadhaar/KYC suppressed, provenance simplified to "what applies to you" (AC2). This is a pure GET (`useMemberValidityQuery` → `GET /api/v1/member/validity`, the member-self read, redacted + NOT audited per PRD FR-12A) with no form, no upload, no step-up gate, and no coercive decision — same category as the read-only guard/confirmation screens already affirmed (e.g. Story 3.10's `rejoin-locked.tsx`). The appeal CTA is a navigation affordance, not friction itself. Zero deliberate friction introduced.

(2) **MembershipStatusEntry nav tile + home-tab mount — user-initiated, non-blocking:** `apps/mobile/components/member-status/MembershipStatusEntry.tsx` (the home-tab entry point) and `apps/mobile/app/(tabs)/index.tsx` (mount point) are identical in character to the Story 3.9 `<LifeEventsEntry>`, Story 3.10 `<WithdrawalEntry>`, and Story 3.11 `<DataExportEntry>` already affirmed: a chromeless, always-available tile that navigates to the status screen only when the member deliberately taps it. No forced step, no form, no gate. `apps/mobile/components/member-status/useMemberValidityQuery.ts` is a data-fetch hook, not a friction surface.

Zero gratuitous friction introduced; ledger reviewed, no new row warranted. The **page-weight baseline is unchanged**: all new and modified files are in the authenticated mobile app (`apps/mobile`, EAS build is a no-op → `member-app-native` stays a no-op); the page-weight ceilings the gate has teeth on cover the PUBLIC `apps/public` Astro surface, which this story does not touch.

**Story 5.4 disposition (NEW row — optional opt-in friction):** the WhatsApp notification
opt-in surface (`apps/mobile/app/(settings)/notifications.tsx` + `_layout.tsx`,
`apps/mobile/components/notifications/NotificationSettingsEntry.tsx`, the home-tab entry
in `apps/mobile/app/(tabs)/index.tsx`) introduces one deliberate, member-initiated friction:
after tapping "Receive notifications via WhatsApp," the member is handed off to WhatsApp via
a pre-filled Send-Hello deep-link (`Linking.openURL`) and must actively send that message to
confirm. This is **not gratuitous** — it is the explicit, non-inferred consent mechanism AC4
requires (no passive/pre-checked/bundled consent is permitted for a new communication
channel) and doubles as the phone-number-ownership proof the inbound-webhook match relies on.
The toggle itself is entirely **optional** — a member who never taps it experiences zero
friction; the settings entry point and screen are ordinary, ambient settings navigation, not
a gate. Declared as the NEW row above (`member (opting in to WhatsApp notifications) →
explicit consent provenance (AC4) → optional`). The **page-weight baseline is unchanged**:
all new files are in the authenticated mobile app (`apps/mobile`, EAS build is a no-op →
`member-app-native` stays a no-op); the page-weight ceilings the gate has teeth on cover the
PUBLIC `apps/public` Astro surface, which this story does not touch.

**Story 5.5 disposition (NEW row — optional opt-in friction):** the Telegram notification
opt-in surface (`apps/mobile/app/(settings)/telegram-notifications.tsx`, the second entry in
`apps/mobile/components/notifications/NotificationSettingsEntry.tsx`, the home-tab entry in
`apps/mobile/app/(tabs)/index.tsx`) introduces one deliberate, member-initiated friction that
mirrors Story 5.4's WhatsApp opt-in: after tapping "Enable Telegram notifications," the member
is handed off to Telegram via a `https://t.me/<bot>?start=<code>` deep-link (`Linking.openURL`)
and must actively start the bot to confirm. This is **not gratuitous** — it is the explicit,
non-inferred consent AC4/AC10 require (no passive/pre-checked/bundled consent for a new
communication channel) and the `/start <code>` is the match token the inbound-webhook worker
uses to advance PENDING→ACTIVE. The toggle is entirely **optional** — a member who never taps it
experiences zero friction; Telegram is a fire-and-forget mirror side-channel, never a primary
delivery path. Declared as the NEW row above (`member (opting in to Telegram notifications) →
explicit member-initiated consent for a new channel → optional`). The **page-weight baseline is
unchanged**: all new files are in the authenticated mobile app (`apps/mobile`, EAS build is a
no-op → `member-app-native` stays a no-op); the page-weight ceilings the gate has teeth on cover
the PUBLIC `apps/public` Astro surface, which this story does not touch
([[project_friction_budget_baseline_ratchet]]).

**Story 6.2 disposition (existing step-up row REALIZED for claim filing; no new row):** the Ravi-mode claim-filing proxy flow (`apps/mobile/app/(claim)/` + `apps/mobile/components/claim/` + `apps/mobile/lib/claim-*.ts`) touches twenty mobile files. Friction analysis by sub-type:

(1) **Handover-trust OTP — step-up friction (forced, pre-declared):** `(claim)/handover-otp.tsx` drives the member (Ravi, on the deceased's session) through an OTP send → verify → resend loop before the flow can proceed to relationship-confirm. This is identical step-up friction to the Story 3.2 login OTP and is already captured in the existing **"member (mobile + OTP at login; fresh OTP at step-up) → Account & session security → forced"** row — the Story 3.2 disposition explicitly named **"claim filing — §2.2"** among the high-trust actions the step-up row was declared to cover. No new row warranted — the existing forced row covers it.

(2) **Entry gate + relationship-confirm — necessary flow steps, not gratuitous friction:** `(claim)/index.tsx`'s "Are you family of [name]?" question and `(claim)/relationship.tsx`'s relationship pick are the minimum confirmation a proxy-filing flow can ask before minting a claim and freezing an account (AC3) — both have an explicit escape ("No — continue as [member]"; the "confirm" tap itself). This is necessary data entry, not deliberate friction, and mirrors the Story 3.4/3.5 signup-data-entry dispositions above.

(3) **Death-certificate upload — deliberately LOW friction, defer-7-days escape (not gratuitous):** `(claim)/document.tsx` offers "Take a photo" / "Choose a PDF" / "I'll upload later (within 7 days)" — the defer option means the step imposes **zero forced friction** on a grieving family; no countdown, no penalty (UX §7 grief register, AC6). The real OCR/storage backend is Story 6.5 — 6.2 ships only the seam.

(4) **Nominee review + `<CallHelplineCTA>` + `<SaveAndResumeAffordance>` — read-only / friction-REMOVING:** `(claim)/nominee-review.tsx` is a read-only pre-populated view (AC4); `<CallHelplineCTA>` (present at every node, AR-61) and `<SaveAndResumeAffordance>` (AC6) both *remove* friction — they are one-tap escapes to live help and a persistent no-time-pressure save point, not friction imposed on the member. `(claim)/acknowledgement.tsx` is read-only.

(5) **`<ClaimProxyFlowEntry>` home-tab entry point — user-initiated, non-blocking:** `apps/mobile/components/claim/ClaimProxyFlowEntry.tsx` (mounted in `apps/mobile/app/(tabs)/index.tsx`) is identical in character to the Story 3.9/3.10/3.11/4.7 nav-tile entries already affirmed: an ambient, session-gated tile that navigates to the claim flow only when the member deliberately taps it. No forced step, no form, no gate.

(6) **`claim-steps.ts` / `claim-draft.ts` / `claim-i18n.ts` / `claim-api.ts` / test + config files:** pure logic, storage, i18n wiring, and test scaffolding — not member-facing friction surfaces themselves.

Zero gratuitous friction introduced beyond the pre-declared step-up row; ledger reviewed, no new row warranted. The **page-weight baseline is unchanged**: all new and modified files are in the authenticated mobile app (`apps/mobile`, EAS build is a no-op → `member-app-native` stays a no-op); the page-weight ceilings the gate has teeth on cover the PUBLIC `apps/public` Astro surface, which this story does not touch.

**Story 6.5 disposition (existing low-friction row REALIZED — no new row):** the death-certificate upload step (`apps/mobile/app/(claim)/document.tsx`, `apps/mobile/package.json` +`expo-image-picker`/`expo-document-picker`) is the SURFACE that realizes the friction already declared **not gratuitous** at Story 6.2 disposition item (3): *"Death-certificate upload — deliberately LOW friction, defer-7-days escape (not gratuitous) ... The real OCR/storage backend is Story 6.5 — 6.2 ships only the seam."* 6.5 wires the REAL native camera/file picker + multipart upload + OCR-parity trigger BEHIND that seam, but preserves every friction-reducing property already affirmed: the **"I'll upload later (within 7 days)"** defer escape stays present and un-enforced client-side (no countdown, no penalty — UX §7 grief register, AC6), save-and-resume survives app restarts (`documentStage` in the draft), and an upload failure is a dignified retry/defer (never a hard error or forced re-entry). Picking a photo or a PDF and uploading it is the minimum interaction the already-accepted AC1 upload step requires — no NEW gate, no NEW required field, no urgency theater. Zero gratuitous friction introduced beyond what Story 6.2 already declared; ledger reviewed, no new row warranted. The **page-weight baseline is unchanged**: the screen is in the authenticated mobile app (`apps/mobile`, EAS build is a no-op → `member-app-native` stays a no-op); the page-weight ceilings the gate has teeth on cover the PUBLIC `apps/public` Astro surface, which this story does not touch.

**Story 6.8 disposition (NEW row — forced dual-account friction):** the claim-time nominee
bank-collection form (`apps/mobile/app/(claim)/nominee-review.tsx` — Story 6.2 declared this
screen **read-only**; 6.8 extends it with the `<NomineeDetailEditor>` dual-bank form — +
`apps/mobile/lib/nominee-bank-ifsc.ts` + its test) introduces one deliberate friction: the
filer must provide **TWO complete bank accounts** (holder name + account number + IFSC each),
not one. A single account would functionally suffice to file the payout destination — the
second is imposed specifically to give Epic 9's disbursement a **pre-validated failover**
against the RBI UPI per-payee-per-day cap (D1/AC1, FR-37), the exact "payer pays extra effort
to protect a named downstream subsystem" shape the ledger already models (mirrors the
Sushil/Sunita rows). Declared as the NEW row above (`member/nominee (claim-time dual
bank-account entry) → Disbursement resilience (Epic 9 RBI per-payee-cap failover) → forced`).
Everything else on this surface **removes or avoids** friction rather than adding it: IFSC
pre-validation resolves the bank name on blur (no separate lookup step); a malformed/unknown
IFSC is a dignified Pattern-4 message, never a raw error; the account-holder name is captured
verbatim with **no penny-drop verification** (FR-37 `[v1-S]` explicitly deferred, D4); the
member-side step-up is the SAME handover-trust OTP already declared under the Story 6.2
disposition item (1) (`requireMemberStepUp('claim_handover')`, reused per D5 — not a new
step-up context); and the review-follow-up "bank details already on file (…)" notice added to
this screen is **read-only, informational, and self-suppresses** when nothing is on file — it
*reduces* re-entry friction on a correction/re-edit rather than adding any. The **page-weight
baseline is unchanged**: all touched files are in the authenticated mobile app (`apps/mobile`,
EAS build is a no-op → `member-app-native` stays a no-op); the page-weight ceilings the gate
has teeth on cover the PUBLIC `apps/public` Astro surface, which this story does not touch.

**Story 6.9 disposition (declaration affirmed, no new row):** the claim-time DPDPA consent step
(`apps/mobile/app/(claim)/consent.tsx`, activated via the reserved slot in `apps/mobile/lib/claim-steps.ts`,
with `apps/mobile/app/(claim)/relationship.tsx` updated to point its next-route literal at it) introduces
three checkboxes. Friction analysis by sub-type:

(1) **Trust-processing consent (a) — mandatory legal/compliance acknowledgment, not gratuitous friction:**
requiring the filer to affirmatively consent to the trust processing the deceased/claimant/nominee PII
needed to adjudicate the claim is the **same category as the Story 3.5 medical-disclosure concealment-denial
acknowledgment and the Story 3.6a T&C acceptance** already affirmed above — a mandatory legal/compliance
gate (DPDPA, UX-DR2), not a deliberate friction imposed for its own sake. A claim genuinely cannot be
processed while forbidding processing of its own data; one tap to affirm is the minimum a regulated
mutual-aid platform can ask.

(2) **Sahyog Vivran publication (b) + In Memoriam listing (c) — fully optional, zero forced friction:**
both boxes render UNCHECKED by default and declining either or both **never blocks** claim progression,
verification, approval, or disbursement (D3, UX-DR2 "private processing must not compromise disbursement" —
the same shape as the Story 5.4/5.5 optional channel opt-ins already declared above, except here declining
carries no re-consent step at all — a member who leaves both unchecked experiences zero friction beyond
reading the reassurance copy).

(3) **`claim-steps.ts` reserved-slot activation + `relationship.tsx` next-route repoint:** pure wizard
sequencing (identical in character to the Story 6.2 disposition item (6) treatment of `claim-steps.ts`) —
not a friction surface itself.

Zero gratuitous friction introduced; the one mandatory interaction is a legal/compliance acknowledgment
in the same class as Stories 3.5/3.6a, and the two optional opt-ins are strictly friction-free to decline.
Ledger reviewed, no new row warranted. The **page-weight baseline is unchanged**: the new screen is in the
authenticated mobile app (`apps/mobile`, EAS build is a no-op → `member-app-native` stays a no-op); the
page-weight ceilings the gate has teeth on cover the PUBLIC `apps/public` Astro surface, which this story
does not touch.

**Story 6.12 disposition (declaration affirmed, no new row):** the human-shepherd
member-facing surfaces (`apps/mobile/app/(claim)/shepherd.tsx`,
`apps/mobile/components/claim/ShepherdContactCard.tsx`,
`apps/mobile/components/claim/ClaimPointOfContactEntry.tsx`, the
`<ShepherdContactCard>` mount on `apps/mobile/app/(claim)/acknowledgement.tsx`, the
`<ClaimPointOfContactEntry>` mount on `apps/mobile/app/(tabs)/index.tsx`, and
`apps/mobile/lib/filed-claim.ts`) introduce **zero deliberate friction**:

(1) **`<ShepherdContactCard>` — read-only, no forced interaction:** the card is a
pure GET (`GET /api/v1/member/claims/:claimCaseId/shepherd`) rendering the live
shepherd's name + role + contact, or a typed not-yet-assigned/offline state. No
form, no upload, no step-up gate, no coercive decision — same category as the
Story 3.10 `rejoin-locked.tsx` / Story 4.7 `<MemberStatusPanel>` read-only
surfaces already affirmed. The `tel:`/`wa.me` deep-links are **optional,
user-initiated** — tapping to call/message the shepherd is the family's choice,
never a required step to progress the claim.

(2) **`<ClaimPointOfContactEntry>` home-tab entry point — user-initiated,
non-blocking:** identical in character to the Story 3.9/3.10/3.11/4.7/6.2 nav-tile
entries already affirmed (`<LifeEventsEntry>`, `<WithdrawalEntry>`,
`<DataExportEntry>`, `<MembershipStatusEntry>`, `<ClaimProxyFlowEntry>`): an
ambient tile, present only when the member has a filed claim (`filed-claim.ts`'s
persisted pointer), that navigates to the shepherd screen only when the member
deliberately taps it. No forced step, no form, no gate.

(3) **`filed-claim.ts` — pure storage logic, not a friction surface:** the
filed-claim-id pointer + the offline shepherd-read cache are invisible
plumbing (identical in character to the Story 6.2 disposition item (6) treatment
of `claim-steps.ts`/`claim-draft.ts`) — not a member-facing interaction
themselves.

(4) **`acknowledgement.tsx` mount — no NEW interaction on an already-read-only
screen:** Story 6.2's disposition already affirmed `(claim)/acknowledgement.tsx`
as read-only; mounting `<ShepherdContactCard>` there adds a read-only card to an
already-read-only screen, not a new interaction.

Zero gratuitous friction introduced; ledger reviewed, no new row warranted. The
**page-weight baseline is unchanged**: all new and modified files are in the
authenticated mobile app (`apps/mobile`, EAS build is a no-op →
`member-app-native` stays a no-op); the page-weight ceilings the gate has teeth
on cover the PUBLIC `apps/public` Astro surface, which this story does not touch.

**Story 6.13 disposition (declaration affirmed, no new row):** the State-Trustee
cycle-freeze (bulk-approval) surface is an **admin-only** surface — the new/modified
files are the `apps/admin` bulk-approval page + route
(`apps/admin/src/modules/cycle-freeze/*`, `apps/admin/src/routes/CycleFreezeRoute.tsx`,
`router.tsx`), the `apps/api` cycle-freeze routes/handlers, the `@twt/domain`
write-paths/read-model/schema, the `@twt/contracts` DTOs, and the `@twt/jobs`
pool-spawn trigger seam. **NONE touch `apps/mobile` or the public `apps/public`
Astro surface** — there is no member-facing form, interaction, or page-weight change.
The step-up gate on the commit is admin operator friction (a State Trustee attesting a
₹50L-cohort bulk approval — the exact class of high-trust admin action the Story 5.9 /
1.9 admin step-up was declared to cover), not member-facing friction, and mirrors the
6.11 verifier-revise step-up already affirmed as admin-side. Zero member-facing friction
introduced; ledger reviewed, no new row warranted. The **page-weight baseline is
unchanged**: `apps/admin` is not a page-weight-gated surface (the ceilings the gate has
teeth on cover the PUBLIC `apps/public` Astro surface, which this story does not touch).

**Story 6.14 disposition (declaration affirmed, no new row):** the R9 special-case
voting panel surface is an **admin-only** (State-Trustee) surface — the new/modified
files are the `apps/admin` R9 voting page + route
(`apps/admin/src/modules/r9-voting/*`, `apps/admin/src/routes/R9VotingRoute.tsx`,
`router.tsx`), the `apps/api` r9-voting routes/handlers/crypto, the `@twt/domain`
event/reducer/write-paths/read-models/schema (+ migrations 0063/0064), the
`@twt/contracts` DTOs, and the `claim.r9_vote` RBAC key. **NONE touch `apps/mobile`
or the public `apps/public` Astro surface** — there is no member-facing form,
interaction, or page-weight change. The step-up gate on FINALIZE is admin operator
friction (a State Trustee attesting a ₹50L-stakes R9 outcome — the exact class of
high-trust admin action the Story 5.9 / 1.9 admin step-up was declared to cover, and
the 6.13 cycle-commit step-up already affirmed as admin-side), not member-facing
friction. Zero member-facing friction introduced; ledger reviewed, no new row
warranted. The **page-weight baseline is unchanged**: `apps/admin` is not a
page-weight-gated surface (the ceilings the gate has teeth on cover the PUBLIC
`apps/public` Astro surface, which this story does not touch).

**AR-61 discharge-by-reference (AC12).** Story 6.14 IS on the epics.md:2280 AR-61
cross-cutting staff-fallback list (`6.2, 6.3, 6.5, 6.6, 6.7, 6.10, 6.11, 6.12, 6.14,
6.16`), and AR-61's own rule is that Story 0.7's fallback-handler ledger is
**referenced rather than re-implemented per-story**. R9 voting is a State-Trustee
PANEL action (not a member-facing intake node), so its R9-specific "staff-fallback"
is the CONCRETE panel/quorum model this story lands: an immutable panel roster
captured + authorized at open (AC2), a quorum (`⌊N/2⌋+1` of the panel) required to
finalize (AC4), the outcome computed against the panel size `N` from that fixed
roster, and the cancel/re-open correction path for a wrong-or-unavailable panel
(AC5). Trustee-unavailability is thus a panel-composition/quorum concern handled by
that model, NOT a member-facing intake fallback handler. The true multi-trustee panel
+ separation-of-duties (opener≠finalizer, a distinct minimum-panel-size rule) is an
Epic-3 geo-tree hardening, DEFERRED + noted. Discharged **by reference** to Story 0.7's
ledger — recorded here so the AR-61 line reads as discharged, not omitted (the
6.12/6.13 deferral-legibility lesson).

**Story 6.16 disposition (new member-facing "file appeal" affordance — declared LOW-friction, deliberately
NOT step-up-gated; no new forced row):** the internal 3-stage appeal (the LAST story of Epic 6) adds ONE
member-facing affordance — the "Ask for a review" / file-appeal button on the mobile claim-status surface
(`apps/mobile/components/claim/AppealStatusCard.tsx` + `apps/mobile/lib/appeal-status.ts`, rendered in the
`(claim)` flow). Friction analysis:

(1) **File-appeal affordance — LOW friction by deliberate design (NOT forced/step-up).** Unlike the Story 3.2
forced-OTP row (which scoped step-up to "mobile/nominee change, withdrawal, account-deletion ack, DigiLocker
re-link, **claim filing**"), appeal-FILING is deliberately **NOT** added to that forced-OTP set. Rationale: a
denied family's right to ask for a review must be as low-friction as possible (PRD "no formal time limit,
grief-aware" — D-E); gating it behind an OTP step-up would contradict that dignity posture. The claimant is
already an authenticated member (the `requireMemberSession` route gate is the real boundary), the action is
reversible/non-destructive (it opens a review, it does not move money), and the AR-61 helpline fallback covers
anyone who cannot self-file. So the disposition is an **explicit LOW-friction declaration**, not a forced-row
realization — recorded here so the choice reads as deliberate (the 6.12/6.13 legibility lesson), NOT an
omitted step-up. No new forced row warranted; the existing forced-OTP row is deliberately NOT extended to
appeal-filing.

(2) **Admin appeal surfaces — admin operator friction only.** The Stage-2 finalize + Stage-3 decide step-ups
(`apps/admin` + `apps/api`) are admin operator friction (a trustee attesting a ₹50L-stakes reversal/uphold —
the exact class the 6.13/6.14 admin step-up already affirmed), not member-facing. Zero member page-weight
change (`apps/admin` is not page-weight-gated; the public Astro surface is untouched).

**AR-61 discharge-by-reference.** Story 6.16 IS on the epics.md:2280 AR-61 list; the member-facing initiate
route accepts an operator-on-behalf path (the `claim.file` helpline capability, `initiated_on_behalf`) so a
grieving family unable to self-file is covered. Discharged **by reference** to Story 0.7's fallback-handler
ledger — recorded so the AR-61 line reads as discharged, not omitted.

**Story 7.10 disposition (declaration affirmed, no new row):** the pool-engine
onboarding tutorial (`apps/mobile/components/pool-onboarding/PoolOnboardingTutorial.tsx`,
`PoolOnboardingSettingsEntry.tsx`, `pool-onboarding-gate.ts`, `usePoolOnboardingGate.ts`,
the `apps/mobile/app/(pool-onboarding)/` route group, the home-tab mount in
`apps/mobile/app/(tabs)/index.tsx`, and the route registration in `apps/mobile/app/_layout.tsx`)
introduces **zero deliberate friction**:

(1) **The 3-screen tutorial itself — skippable, re-viewable, never gating.** Unlike the
Story 3.2 forced-OTP row or the 6.8 forced-dual-account row, the tutorial imposes no
requirement to proceed with anything — it explains pool-bound semantics, the letter
code, and the out-of-band policy, and a member may tap **Skip** at any point (AC4: "skipping
is permitted"). It never blocks access to any other feature or flow; it is purely
educational and calm-register (UX-DR79), the same *ambient, read-only-leaning* character
as the Story 3.7 lock-in clock widget and Story 4.7 `<MemberStatusPanel>` already affirmed.

(2) **The Skip-confirm dialog — friction-REDUCING, not imposed.** The "Skip for now? You
can view this anytime from settings" confirm is a single tap-through that exists to prevent
an *accidental* skip, not to make skipping harder — it is the same class as the
`<SaveAndResumeAffordance>` (Story 6.2) and `<CallHelplineCTA>` friction-removing affordances
already affirmed: it reassures the member the tutorial isn't a one-shot gate, lowering the
perceived cost of skipping rather than raising it. No step-up, no OTP, no payment, no upload.

(3) **`PoolOnboardingSettingsEntry` home-tab entry point — user-initiated, non-blocking.**
Identical in character to the Story 3.9/3.10/3.11/4.7/6.2/6.12 nav-tile entries already
affirmed (`<LifeEventsEntry>`, `<WithdrawalEntry>`, `<DataExportEntry>`,
`<MembershipStatusEntry>`, `<ClaimProxyFlowEntry>`, `<ClaimPointOfContactEntry>`): an
ambient, chromeless tile that navigates to the tutorial only when the member deliberately
taps it. No forced step, no form, no gate.

(4) **`pool-onboarding-gate.ts` / `usePoolOnboardingGate.ts` — invisible plumbing, not a
friction surface.** The MMKV first-entry seen-flag and the forward-compat hook (Epic 8 will
call it; **not** a live auto-launch call site this story wires — see Dev Notes) are pure
storage/state logic, the same category as the Story 6.2/6.12 treatment of
`claim-steps.ts`/`claim-draft.ts`/`filed-claim.ts` — not a member-facing interaction
themselves.

(5) **Route group + test scaffolding:** `apps/mobile/app/(pool-onboarding)/_layout.tsx` +
`index.tsx` are plain routing/hosting chrome for item (1); `apps/mobile/tests/unit/pool-onboarding-gate.test.ts`
is test scaffolding. Neither is a friction surface.

Zero gratuitous friction introduced; ledger reviewed, no new row warranted. The
**page-weight baseline is unchanged**: all new and modified files are in the authenticated
mobile app (`apps/mobile`, EAS build is a no-op → `member-app-native` stays a no-op); the
page-weight ceilings the gate has teeth on cover the PUBLIC `apps/public` Astro surface,
which this story does not touch.

**Story 8.2 disposition (declaration affirmed, no new row):** the My Pool card
(`apps/mobile/components/active-contribution/ActiveContributionCard.tsx`,
`useActiveContributionQuery.ts`, `toneGradient.ts`, and its home-tab mount in
`apps/mobile/app/(tabs)/index.tsx`) is a **read-only, conditionally-rendered, ambient-status**
home element — identical in character to the Story 3.7 lock-in clock and Story 3.8 renewal
widgets already affirmed. It displays a pool shortform + the deceased member's family + the
snapshotted fixed amount + a day-granular days-remaining countdown + a confirmed-only progress
meter + a 15-day tone-gradient nudge; for a member who is not `active`-and-assigned-to-a-`live`-pool
it renders `null` with no visible change (self-suppression), and a loading/error/absent read
renders nothing (fail-soft). The **one interactive element** is the **contribute CTA** — it is
**user-initiated, non-blocking**, and navigates to the (Story 8.4) contribution payment flow;
it adds no forced step, no form, and no gate. The tone gradient is explicitly *calm → factual →
gently-urgent-never-panicked*: **no urgency theater, no scarcity language, no red countdown, no
per-second tick** (UX-DR25; enforced by the `microcopy` scarcity/panic gate now scanning the
`contribution` namespace). Zero gratuitous friction introduced; ledger reviewed, no new row
warranted. The **page-weight baseline is unchanged**: all new files are in the authenticated
mobile app (`apps/mobile`, EAS build is a no-op → `member-app-native` stays a no-op); the
page-weight ceilings the gate has teeth on cover the PUBLIC `apps/public` Astro surface, which
this story does not touch.

**Story 8.3 disposition (declaration affirmed, no new row):** the Live Contributor List
(`apps/mobile/components/contributor-list/PoolContributorList.tsx`, `usePoolContributorsQuery.ts`,
`ViewContributorsEntry.tsx`, the `apps/mobile/app/(contribution)/contributors.tsx` route, and the
home-tab affordance mount in `apps/mobile/app/(tabs)/index.tsx`) is a **read-only,
conditionally-rendered, virtualized** member surface — the sibling of the 8.2 My Pool card, extended
from the aggregate meter to the named confirmed-contributor rows. It displays the pool identity + the
reconciliation-**confirmed** contributor rows (first-name + last-initial; legitimately empty today,
Epic 9's producer is unbuilt) + an **aggregate** pending count/percentage strip (no per-member
identity — a deliberate privacy hardening over the PRD's "see who hasn't paid" framing, so **no shame
list, no coercion signal**). The **one interactive element** is the **"View contributors" affordance**
— **user-initiated, non-blocking**, ≥44pt; it navigates to a read-only view and self-suppresses in
lock-step with the card. No forced step, no form, no gate, **no urgency theater / scarcity / panic**
(the empty-state copy *reports state* — "No confirmed contributions yet." — it never attributes
responsibility; enforced by the `microcopy` gate on the `contribution` namespace). The list is
virtualized (`@shopify/flash-list`, UX-DR80) — **no full-set render into the native view**. Zero
gratuitous friction introduced; ledger reviewed, no new row warranted. The **page-weight baseline is
unchanged**: all new and modified files are in the authenticated mobile app (`apps/mobile`, EAS build
is a no-op → `member-app-native` stays a no-op); the public Sahyog Vivran render that would reuse this
read model is **Epic 11b's** consumer, not this story — the page-weight ceilings the gate has teeth on
cover the PUBLIC `apps/public` Astro surface, which this story does not touch.

**Story 8.4 disposition (declaration affirmed, no new row):** the UPI Intent + UTR self-attestation
flow (`apps/mobile/app/(contribution)/pay.tsx`, `apps/mobile/components/active-contribution/UPIIntentButton.tsx`,
the `myContribution` yellow-pill on `ActiveContributionCard.tsx`) is the **first Epic-8 WRITE surface**,
but the interaction is the PRD's **friction-as-resource happy path** (`prd.md:566`): the 90-second loop is
a single **user-initiated, non-blocking** tap ("Pay via UPI" → the OS UPI app) + **one** UTR-paste field on
return — **no screenshot upload, no form, no forced step, no gate**. Everything the member sees is
server-authoritative (amount + VPA + `tr` are never client-named; R4); the client just launches the intent
and pastes back a reference. The **absence paths are calm, not coercive**: no VPA collected yet → the
first-class *"UPI contribution isn't available for this pool yet — tap Get help"* fail-soft (D1), and
no-UPI-app / invalid-UTR → per-app guidance + the Story 8.5 helpline seam — **no urgency theater, no
scarcity, no panic** (the yellow-pill copy *reports state honestly* — "we're still checking it against our
bank records" — it never claims "confirmed/success/paid ✓"; enforced by the `microcopy` gate on the
`contribution` namespace). The single new payment endpoint pair is member-session-gated and non-blocking.
Zero gratuitous friction introduced; ledger reviewed, no new row warranted. The **page-weight baseline is
unchanged**: all new and modified files are in the authenticated mobile app (`apps/mobile`, EAS build is a
no-op → `member-app-native` stays a no-op) + `apps/api` (excluded from the ledger) — the page-weight
ceilings the gate has teeth on cover the PUBLIC `apps/public` Astro surface, which this story does not touch.

**Story 8.5 disposition (declaration affirmed, no new row):** the UPI Failure Coach
(`apps/mobile/components/active-contribution/UpiFailureCoach.tsx`, wired into the same authenticated
`(contribution)/pay.tsx`) is a **diagnostic aid on the FAILURE path** — it *reduces* friction, it does not
add it. When a UPI payment doesn't go through, the coach offers a member-initiated, non-blocking
self-classification chooser (5 tap options) + calm next-step guidance (retry / switch app / call helpline /
contact bank); every option is optional and the member can ignore it entirely and still paste a UTR or leave.
There is **no forced step, no gate, no upload, no urgency/scarcity theater** — the copy is dignified and
never blames the member ("No problem — this happens"; enforced by the `microcopy` gate on the `contribution`
namespace). The anonymous failure-report is fire-and-forget telemetry the member never waits on. Zero
deliberate friction introduced; ledger reviewed, no new row warranted. The **page-weight baseline is
unchanged**: the coach lives **behind the member session** in the mobile app (`apps/mobile`, EAS build a
no-op) + one member-session-gated `apps/api` endpoint (excluded from the ledger) — it is **NOT a public
`apps/public` surface**, so it does not enter the public page-weight budget the gate has teeth on. Do NOT
ratchet (`[[project_friction_budget_baseline_ratchet]]`).

**Story 8.13 disposition (declaration affirmed, no new row):** the nominee-VPA
claim-time collection + FR-27 switch-account affordance
(`apps/mobile/app/(claim)/nominee-review.tsx`, `apps/mobile/app/(contribution)/pay.tsx`,
`apps/mobile/lib/nominee-bank-vpa.ts` + its test) introduce **zero new deliberate
friction**:

(1) **The optional VPA field — never a NEW forced step, unlike the Story 6.8 dual-account row.**
Story 6.8's disposition above declared the TWO-account requirement itself as the
forced-friction row (a filer must supply a second full account to protect Epic 9's
disbursement failover). The VPA this story adds is an **additional optional field on
that already-declared form** — AC1 makes it explicit that a nominee without a VPA is a
first-class state and the field **never gates `accountComplete`/submit** (a blank VPA
is always valid). A non-blank-but-malformed VPA blocks submit (a review-finding fix),
but that is ordinary client-side input validation on a voluntarily-entered field, not a
NEW friction the design imposes — identical in category to the Story 3.4/6.9-item-(2)
precedent of an optional field that adds no forced step when left blank.

(2) **The "Switch account" affordance — user-initiated, non-blocking, self-suppressing.**
`pay.tsx`'s switch button (FR-27) only renders when a second nominee account already
carries a VPA (`canSwitchAccount`); it is identical in character to the nav-tile/CTA
affordances already affirmed across Stories 3.9–8.3 (`<LifeEventsEntry>`,
`<WithdrawalEntry>`, the 8.2 contribute CTA, etc.) — a deliberate, optional, one-tap
action the member may simply never use. No form, no gate, no forced step.

Zero gratuitous friction introduced; ledger reviewed, no new row warranted. The
**page-weight baseline is unchanged**: all new and modified files are in the
authenticated mobile app (`apps/mobile`, EAS build is a no-op → `member-app-native`
stays a no-op) + `apps/api`/`packages/contracts`/`packages/domain` (excluded from the
ledger) — the page-weight ceilings the gate has teeth on cover the PUBLIC
`apps/public` Astro surface, which this story does not touch.

**Story 8.6 disposition (declaration affirmed, no new row):** the Yogdaan Bahi
contribution passbook (`apps/mobile/components/yogdaan-bahi/*`, its dedicated screen
`apps/mobile/app/(contribution)/yogdaan.tsx`, and the home-stack `<YogdaanBahiEntry>`)
is a **read-only member self-view** (FR-12A) — it lists the member's own attested
contributions with a derived status. It introduces **zero deliberate friction**: no
form, no upload, no gate, no forced step, no member-initiated action that the member
must complete. The two interactive affordances are both optional and non-blocking —
the home entry that navigates into the passbook (a nav-tile identical in character to
`<ViewContributorsEntry>`/`<LifeEventsEntry>` already affirmed across Stories 3.9–8.5)
and the per-row Contribution-Note link (an inert seam until Story 8.7 — it renders but
does not gate or force anything). The copy is dignified and never frames contributions
as dues/obligations (enforced by the `microcopy` gate on the `contribution` namespace;
the empty state is "आपका पहला योगदान यहाँ दिखेगा", never "no dues"). Zero deliberate
friction introduced; ledger reviewed, no new row warranted. The **page-weight baseline
is unchanged**: every new/modified file is in the authenticated mobile app (`apps/mobile`,
EAS build a no-op → `member-app-native` stays a no-op) + one member-session-gated
`apps/api` read endpoint + `packages/contracts`/`packages/domain`/`packages/api-client`
(all excluded from the ledger) — it is **NOT a public `apps/public` surface**, so it
does not enter the public page-weight budget the gate has teeth on. Do NOT ratchet
(`[[project_friction_budget_baseline_ratchet]]`).

**Story 8.7 disposition (declaration affirmed, no new row):** the Yogdaan Pratigya
(Contribution Note) PDF — its `apps/mobile/app/(contribution)/note/[id].tsx` screen,
the `lib/save-note.ts` OS handoff, the member-session-gated render endpoint, and the
server-side template — introduces **zero deliberate friction**. The screen is a single
optional CTA that fetches an artifact ABOUT the member and hands it to the OS share
sheet: no form, no upload, no gate, no forced step, and nothing the member must complete
to proceed anywhere else. The Note is generated on demand and persisted nowhere, so
there is no waiting-for-preparation state to pay for either (contrast the Story 3.11
data-export prepare→poll→step-up flow, which IS a declared cost and is stepped-up
deliberately — this endpoint is session-only). The one deliberate constraint is a
per-member RATE LIMIT on the render, which is a cost bound on the server, not friction
on the member: it is unreachable in ordinary use (a member opens a handful of Notes,
not dozens a minute) and it forces nothing when it is not reached. Zero deliberate
friction introduced; ledger reviewed, no new row warranted.

The **page-weight baseline is unchanged**. Every new/modified file lands in the
authenticated mobile app (`apps/mobile`, EAS build a no-op → `member-app-native` stays
a no-op), in `apps/api` behind a member session, or in
`packages/contracts`/`packages/platform-adapters`/`packages/api-client` (all excluded
from the ledger). Note specifically that the ~440 KB of vendored Devanagari font faces
inlined into the rendered PDF are a SERVER-SIDE artifact asset (`apps/api/assets/fonts/`)
that never enters any client bundle or public page. This is **NOT a public `apps/public`
surface**, so it does not enter the public page-weight budget the gate has teeth on. Do
NOT ratchet (`[[project_friction_budget_baseline_ratchet]]`).

**Story 8.8 disposition (declaration affirmed, no new row):** the only `apps/mobile`
file this story touches is `apps/mobile/components/active-contribution/toneGradient.ts`,
and it is a **pure, byte-identical relocation** — the tone-gradient selector (Story
8.2) moved to `packages/contracts/src/alerts/contribution-loop-templates.ts` so the
server-side deadline-reminder sweep (`apps/jobs`) can share the SAME authority the
`<ActiveContributionCard>` uses, and this file became a thin re-export so every
existing mobile call site is unchanged. No new screen, no new form, no new gate, no
new interactive affordance, and no behavioral change to any surface a member sees —
the coherence-invariant test asserts the reminder push a member receives renders in
the identical tone band the card already shows on that day. The story's actual member-
facing deliverable (the cycle-open/deadline-reminder/contribution-confirmed push,
WhatsApp, SMS and Telegram notifications) is a **server-driven OS-level notification**,
not an in-app member-facing form/interaction surface this ledger governs — there is no
new screen, tap target, or step a member completes inside `apps/mobile`/`apps/public`.
Zero deliberate friction introduced; ledger reviewed, no new row warranted. The
**page-weight baseline is unchanged**: every other new/modified file lands in
`apps/jobs`, `apps/api`, `packages/domain`, `packages/contracts`, or `packages/i18n`
(all excluded from the ledger) — it is **NOT a public `apps/public` surface**, so it
does not enter the public page-weight budget the gate has teeth on. Do NOT ratchet
(`[[project_friction_budget_baseline_ratchet]]`).

**Story 8.10 disposition (declaration affirmed, no new row):** this is a `[GOVERNANCE]`
story — a committed policy document, re-authored locale strings, a microcopy tone rule,
and a fence test. It ships **no** migration, schema, endpoint, screen, or data model.
The `apps/mobile` diff is a **single header comment** in
`apps/mobile/components/pool-onboarding/PoolOnboardingTutorial.tsx`, updated because it
quoted the very Screen-3 title this story removed ("If you accidentally pay outside the
system") — a documentation correction with **zero** rendered or behavioural effect. The
member-facing change is entirely **values-only inside an already-affirmed surface**: the
Story 7.10 pool-onboarding tutorial is skippable, non-gating, and member-dismissed, and
its four `screen3.*` i18n **keys are unchanged**, so the tutorial renders the same three
screens with the same controls in the same order — no new step, form, gate, field,
upload, tap target, or interactive affordance, and nothing new a member must complete.
Re-authoring copy to REMOVE a blame frame does not add friction; it removes a cost the
member was already paying. Zero deliberate friction introduced; ledger reviewed, no new
row warranted. The **page-weight baseline is unchanged and must not be touched**: every
other new/modified file lands in `docs/`, `packages/i18n`, `packages/domain` tests,
`scripts/microcopy`, or `microcopy.yaml` (all excluded from the ledger), and
`apps/public` is **not** touched at all — there is no public surface in this diff, so it
does not enter the public page-weight budget the gate has teeth on. Do NOT ratchet
(`[[project_friction_budget_baseline_ratchet]]`).

**Story 8.11 disposition (declaration affirmed, no new row):** this is a `[SURFACE]`
story whose deliverable is *presence + a home + teeth*, not a new member step. It adds
an **escape-hatch** affordance — the already-shipped `<CallHelplineCTA>` — to three
existing `apps/mobile` surfaces (My Pool card, Yogdaan Bahi, Contribution Note screen)
and a printed bilingual helpline line to the Contribution Note **PDF footer**. A
one-tap-to-`tel:` fallback that a member may *ignore* is the definitional opposite of
imposed friction: it introduces **zero** new member step, form, gate, field, upload, or
required interaction — nothing new a member must complete to progress. The component was
also **relocated** (`components/claim/` → `components/common/`) behind a re-export shim,
a pure code-organisation move with zero rendered/behavioural effect (the default label is
byte-identical to the former `claim shell.call_help` string, verified). The **page-weight
baseline is unchanged and must not be touched**: every new/modified file lands in
`apps/mobile`, `apps/api` (the reserved PDF footer + its copy keys only), `packages/i18n`,
`scripts/microcopy`, `microcopy.yaml`, or the governance docs — all excluded from the
ledger — and `apps/public` is **not** touched at all, so nothing enters the public
page-weight budget the gate has teeth on. Zero deliberate friction introduced; ledger
reviewed, no new row warranted. Do NOT ratchet
(`[[project_friction_budget_baseline_ratchet]]`).

**Story 8.12 disposition (declaration affirmed, no new row):** the 90-second-loop
measurement instrument (`apps/mobile/lib/loop-timing.ts` + `loop-timing-session.ts` +
`loop-timing-store.ts` + the debug screen `(contribution)/loop-timing-debug.tsx` + the
four additive boundary marks in `_layout.tsx` / `ActiveContributionCard.tsx` /
`UPIIntentButton.tsx` / `(contribution)/pay.tsx`, plus the off-device aggregation in
`apps/jobs/tests/`) is a **`[GOVERNANCE]` debug-gated measurement instrument**. It
introduces **zero member-facing friction** — every mark is an additive `performance.now()`
read on an existing code path, gated behind `__DEV__` / `EXPO_PUBLIC_LOOP_TIMING` so a
production member build captures nothing and Sushil never sees a stopwatch; the loop's
behavior (intent construction, attest write, switch-account, failure coach, yellow pill) is
byte-for-byte unchanged — nothing new a member must complete to progress. It carries **zero
PII** (numeric durations only). The **page-weight baseline is unchanged and must not be
touched**: all new/modified files land in `apps/mobile` (EAS build is a no-op →
`member-app-native` stays a no-op), `apps/jobs` (tests only), the governance docs, or the
launch-gate roster — all excluded from the ledger — and `apps/public` is **not** touched at
all, so nothing enters the public page-weight budget the gate has teeth on. Zero deliberate
friction introduced; ledger reviewed, no new row warranted. Do NOT ratchet
(`[[project_friction_budget_baseline_ratchet]]`).

**Story 9.1 disposition (declaration affirmed, no new row):** the Nominee Console shell
(`apps/mobile/app/(nominee)/_layout.tsx` + `index.tsx`, `apps/mobile/components/nominee-console/*`,
and the route registration in `apps/mobile/app/_layout.tsx`) — the first Epic-9 surface —
introduces **zero deliberate friction**. It is a **read-only composition**: the console
self-suppresses to `null` unless the signed-in member is already a validated nominee with an
active pool (the 8.3 `ViewContributorsEntry` self-suppress discipline), then renders the
already-affirmed **Story 8.3** `<PoolContributorList>` and **Story 8.11** `<CallHelplineCTA>`
verbatim (no new interaction added to either), plus two `<ComingSoonCard>` placeholders (the
Story 9.3 upload-queue and Story 9.6 `<StatusPill>` seams) and a grey staff-takeover banner —
all three are **non-interactive, no-tap-target `accessibilityRole="summary"` regions**: no
form, no upload, no button, no gate, nothing a member completes. The staff-takeover state is a
server-computed, strictly-neutral "on record" notice (never a countdown or blame frame,
[[project_yogdaan_status_derivation_convention]]) — informational, not friction. The `fursat`
tone invariant (AC2) this story mechanizes exists specifically to keep future changes to this
surface from *acquiring* deliberate friction (gamification, urgency) without a declaration —
consistent with, not contrary to, this disposition. Zero deliberate friction introduced;
ledger reviewed, no new row warranted. The **page-weight baseline is unchanged**: every
new/modified file lands in the authenticated mobile app (`apps/mobile`, EAS build is a no-op →
`member-app-native` stays a no-op), `apps/api` (member-session-gated read only), or
`packages/domain`/`packages/contracts`/`packages/api-client`/`packages/i18n` (all excluded
from the ledger) — it is **NOT a public `apps/public` surface**, so it does not enter the
public page-weight budget the gate has teeth on. Do NOT ratchet
(`[[project_friction_budget_baseline_ratchet]]`).

**Story 9.3 disposition (existing row REALIZED — no new row):** `<BankStatementUpload>`
(`apps/mobile/components/nominee-console/BankStatementUpload.tsx` + `upload-view.ts`) fills
the Story 9.1 upload-queue `<ComingSoonCard>` seam named in the disposition above, plus
touches the sibling `NomineeConsole.tsx` (wiring the real surface in) and `console-resume.ts`
(extending the existing MMKV save-and-resume store with a paused-upload draft, UX-DR50). This
is the SURFACE that realizes the friction **already declared** at ledger row 30: *"Sunita
(nominee bank-statement upload) | facilitator-not-intermediary trust posture | forced"* —
seeded from the UX spec at Story 1.16a, before this surface was built. The upload flow (pick a
bank + a file → parse feedback) is the minimum interaction that row's forced friction already
covers; the "Hum aapke liye padh lenge" staff fallback and the retry path are the friction's
grief-paced *mitigation*, not additional friction (Pattern-4 dignified copy, never a hard
error). Save-and-resume across app restarts (extending the 9.1 `console-resume.ts` shape) is
also friction-*reducing*, not friction-adding: a paused upload survives a restart instead of
forcing the nominee to redo it. No NEW gate, no NEW required field, no urgency theater beyond
what row 30 already named. Zero gratuitous friction introduced; ledger reviewed, no new row
warranted. The **page-weight baseline is unchanged** for the same reason as Story 9.1's
disposition above (authenticated mobile app + `apps/api`/`packages/domain`/`packages/contracts`,
none of which enter the public page-weight budget). Do NOT ratchet
(`[[project_friction_budget_baseline_ratchet]]`).

**Story 9.5 disposition (declaration affirmed, no new row):** the touched surfaces
(`apps/mobile/components/yogdaan-bahi/YogdaanBahi.tsx` + `YogdaanBahiRow.tsx`) add a
**5th passive status tone** (`held` — a trustee-walked-back confirmation, Story 9.4 D1 /
Story 9.8 producer) to the existing 4-tone `STATUS_TONE` map so the exhaustive
`satisfies Record<...>` keeps compiling. This is a **read-only display change**: no new
form, no new required field, no new gate, no new tap/step the member must complete —
the row already renders; it can now additionally render `held` instead of failing to
compile. The polished 5-state `<StatusPill>` copy/icon/ARIA system is Story 9.6, also
not a friction surface (still read-only). Zero deliberate friction introduced; ledger
reviewed, no new row warranted. Page-weight baseline unchanged for the same reason as
Story 9.1/9.3's dispositions above (authenticated mobile app, not the public bundle).
Do NOT ratchet (`[[project_friction_budget_baseline_ratchet]]`).

**Story 9.6 disposition (declaration affirmed, no new row):** the `<StatusPill>` 5-state
design-system component (`packages/ui/src/status-pill/*` — pure presenter, no
`apps/mobile` friction of its own — plus its mobile render `apps/mobile/components/status-pill/StatusPill.tsx`
and the consumer refactors `apps/mobile/components/yogdaan-bahi/YogdaanBahiRow.tsx` +
`sample-data.ts`, `apps/mobile/components/active-contribution/ActiveContributionCard.tsx`,
and `apps/mobile/app/(contribution)/pay.tsx`) is a **pure visual/tone consolidation of
already-affirmed read-only surfaces — it introduces zero NEW interaction**. Every
consumer this story touches already carries its own zero-new-friction disposition above
(`YogdaanBahiRow` — Story 8.6/9.5; `ActiveContributionCard` — Story 8.2/8.4;
`pay.tsx`'s attested confirmation — Story 8.4): this story swaps each surface's
hand-rolled status pill for the one shared `<StatusPill>` component with **no change to
what the member must do to progress** — no new tap, no new field, no new gate, no new
step-up. The `live` announcement prop is a straight carry-forward of the pre-existing
`accessibilityLiveRegion="polite"` behavior on the two attested-confirmation call sites
(`ActiveContributionCard`, `pay.tsx`), not a new interaction. Zero deliberate friction
introduced; ledger reviewed, no new row warranted. The **page-weight baseline is
unchanged**: every new/modified file lands in `packages/ui` (a pure logic package, not
a page-weight-gated build target) or the authenticated mobile app (`apps/mobile`, EAS
build is a no-op → `member-app-native` stays a no-op); `apps/public` is **not** touched
at all, so nothing enters the public page-weight budget the gate has teeth on. Do NOT
ratchet (`[[project_friction_budget_baseline_ratchet]]`).

**Story 9.7 disposition (existing SEED row REALIZED — no new row):** the very FIRST seed
row of this ledger — **"Sushil (member, UTR-mismatch screenshot upload) → Reconciliation
integrity → forced"** — is EXACTLY the friction Story 9.7 now realizes with the real
transport (`<SelfVerifySurface>` + `POST /api/v1/member/self-verify/screenshot`). This is
the same "existing row REALIZED" pattern as Story 6.5 (death-cert upload) and Story 9.3
(bank-statement upload): the surface named at declaration time gets its real backing, and
every friction-earning-its-place property the seed row implies is preserved. The upload is
**mandatory ONLY on an unresolved mismatch** (or the explicit FR-32 "Trouble with UTR?"
fallback) — there is **no happy-path screenshot door** (the endpoint 4xxs a no-mismatch,
no-fallback upload), so the friction lands exactly where it protects Reconciliation
integrity and nowhere else. The `payer` (Sushil, the yellow/red-stuck member) and the
`protects` subsystem (Reconciliation integrity) match the seed row verbatim; the
`event_type` stays `forced` (a stuck member must act to recover). Everything else on the
surface **removes** friction: dignified Pattern-4 empathy copy (never "Error/Failed"), a
one-tap photo-or-PDF picker, an always-reachable helpline, and a fail-soft upload (a
storage outage is a dignified 503-retry, never a hard error). **PII discipline:** no PII in
the object key (opaque `pariwar/<id>/pool/<id>/<uuid>`), the event payload (ids + a machine
reason-code + contentType + a timestamp — never the bytes, a UTR, or free text), or the
audit context (a machine reason token only). Zero gratuitous friction introduced; ledger
reviewed, **the existing seed row covers it — no new row warranted**. The **page-weight
baseline is unchanged**: every new/modified file lands in the authenticated mobile app
(`apps/mobile`, EAS build is a no-op → `member-app-native` stays a no-op),
`apps/api`/`packages/*` (not page-weight-gated build targets); `apps/public` is **not**
touched at all. Do NOT ratchet (`[[project_friction_budget_baseline_ratchet]]`).

**Story 9.8 disposition (NEW row — the trustee reconciliation-review decision gate):** the
reconciliation review queue (`apps/admin/src/routes/ReconciliationReviewRoute.tsx` +
`apps/api/src/modules/reconciliation-review/*`) imposes **deliberate forced friction on the
TRUSTEE / reconciliation reviewer**: every confirm / reject / facilitate-recovery / reverse
requires a **step-up OTP** (bound to its own action context — an elevation for confirm never
satisfies reject) **plus a structured reason-code** (bounded machine tokens, rationale
required on `other` / reject / reverse). This protects the two load-bearing invariants —
**canonical financial truth** (`contribution.confirmed` stays the sole green authority; the
manual confirm names the reconciled deposit, so green = confirmed money, Story 9.5) and
**reconciliation integrity** (facilitate-recovery is outcome-inert — no silent remap, Story
7.6) — so it is declared as the new `forced` row above (distinct from row 29's over-payment
_judgment_: this is the per-case adjudication step-up gate). The friction earns its place: it
is the deliberate speed-bump before an irreversible-feeling financial verdict, mirroring the
6.11 verifier-decision + R9 step-up governance posture. **The page-weight baseline is
unchanged** — this is a **Tier-2 admin surface** (`apps/admin`, not a page-weight-gated build
target) + `apps/api`/`packages/*`; `apps/public`/`apps/mobile` are **not** touched. Do NOT
ratchet (`[[project_friction_budget_baseline_ratchet]]`). **PII discipline:** no PII in the
event payloads (ids + machine reason-code + attesting actor ids + a timestamp), the audit
context (case_key + pool_id + member_id + reason_code — never rationale/UTR-in-the-clear), or
the object keys.

**Story 9.9 disposition (NEW row — the equal-choice account-selection step; existing 6.8 row rationale REFRAMED):** the donor-facing nominee-accounts read + pay-screen rework (`apps/api/src/modules/payment/handlers.ts` `nomineeAccounts`; `apps/mobile/app/(contribution)/pay.tsx`) evolves Story 8.13's "default account #1 + optional Switch account" into "two EQUAL choices, no default." Friction analysis:

(1) **The account-choice list — NEW forced friction when a claim has two accounts.** Story 8.13 auto-picked account #1 and offered switching as a purely *optional*, self-suppressing affordance (already declared zero-new-friction in that story's disposition). Story 9.9 removes the default: when a claim has two nominee accounts, the donor now MUST tap a bank-name option before a payment intent is even built — there is no auto-selected happy path. This is genuinely new, deliberate friction, so it is declared as the NEW `forced` row above. It earns its place: an opaque server-side "#1" pick risked a donor paying an account they didn't consciously choose (with no correctness signal at stake — see item (2)); an explicit choice + a nominee-NAME-match confirmation panel closes that gap. When the claim has only ONE account, the choice is auto-selected and this friction is entirely absent (zero-friction happy path preserved for the common case).

(2) **The banking-info confirmation panel + choose-other/retry-same on failure — friction-REDUCING, not imposed.** Showing the chosen account's nominee name + bank + account#/IFSC before paying is a *correctness* affordance (name-match confidence), not an added step — the donor was always going to see SOME confirmation before the UPI hand-off (Story 8.4's amount display, unchanged). The choose-other/retry-same failure paths *replace* Story 8.13's "Switch account" button with equivalent affordances — no new interaction class, same one-tap character already affirmed.

(3) **The Story 6.8 row's rationale is REFRAMED, not the friction itself.** This story's own scope-lock explicitly DISCARDS the "RBI ₹1 lakh per-payee-per-day receiving cap" rationale that originally justified the claim-time SECOND bank account (Story 6.8's disposition above). The nominee still provides two accounts (that forced friction is unchanged) but the reason has moved from regulatory-cap-workaround to donor-choice/multi-channel-resilience — the existing ledger row's `protects` column is updated above so no ledger artifact contradicts the equal-choice framing (the same consistency-pass discipline this story applied to `packages/domain/src/schema/claim_nominee_bank_accounts.ts` / `nominee-bank-read.ts`).

The **page-weight baseline is unchanged**: all touched files are in the authenticated mobile app (`apps/mobile`, EAS build is a no-op → `member-app-native` stays a no-op) + `apps/api`/`packages/*` (excluded from the ledger); the page-weight ceilings the gate has teeth on cover the PUBLIC `apps/public` Astro surface, which this story does not touch.

**Story 9.11 disposition (existing Story 9.7 row REALIZED further — no new row):** `<SelfVerifySurface>` (`apps/mobile/components/self-verify/SelfVerifySurface.tsx`) gains an over-payment-specific empathy-copy variant (`amount_mismatch_over.*`) rendered when the member's mismatch direction is `over` — the surface (and the underlying Story 9.7 screenshot-upload friction it hosts) is otherwise unchanged: **no new tap, no new field, no new gate, no new step-up, no new mismatch reason, no new screen.** The member still sees exactly the same `<StatusPill status="red">` + explanation-copy + upload affordance the Story 9.7 row already declares (`payer` = Sushil, the red-stuck member; `protects` = Reconciliation integrity; `event_type` = `forced`) — 9.11 only swaps *which* dignified copy string renders, so an over-payment reads "you paid ₹X more…the trust will help recover the difference" instead of the generic amount-mismatch copy. Zero new interaction, zero new friction; ledger reviewed, the existing Story 9.7 row covers it — no new row warranted. The **page-weight baseline is unchanged**: the touched files (`apps/mobile/components/self-verify/SelfVerifySurface.tsx`, its test, + the i18n locale JSON) are in the authenticated mobile app (EAS build is a no-op) and `packages/i18n`/`packages/domain`/`packages/contracts`/`apps/api`/`apps/jobs` (not page-weight-gated build targets); `apps/public` is **not** touched. Do NOT ratchet (`[[project_friction_budget_baseline_ratchet]]`).

**Story 9.12 disposition (existing Story 8.2 row REALIZED further — no new row):** the My Pool card's confirmed-only progress meter (`apps/mobile/components/active-contribution/ActiveContributionCard.tsx`) is unchanged in character — still a **read-only, conditionally-rendered, ambient-status** element (the 8.2 disposition above). This story hoists the meter-percentage math and adds one **additive display line** (amount raised, `confirmedCount × fixedAmount`) by routing both through a new shared `packages/ui` presenter (`derivePoolProgressCardViewModel`) instead of the inline computation; the code-review pass also wired the presenter's meter-fill colour role and label i18n keys through the render layer and wrapped the presenter call in a fail-soft `try/catch` (self-suppress on a corrupt/impossible read, matching the 8.2 AC1 posture) — none of this changes what the member sees or does. **No new tap, no new field, no new gate, no new step-up, no new interaction.** The one interactive element remains the 8.2 contribute CTA, untouched. Zero new friction; ledger reviewed, no new row warranted. The **page-weight baseline is unchanged**: the touched files (`ActiveContributionCard.tsx`, its source-scan test, the new `packages/ui/src/pool-progress/*` presenter + tests, `packages/i18n` locale JSON) are in the authenticated mobile app (EAS build is a no-op) and `packages/ui`/`packages/i18n` (not page-weight-gated build targets); `apps/public` is **not** touched. Do NOT ratchet (`[[project_friction_budget_baseline_ratchet]]`).

**Story 10.2 disposition (NEW row — optional support-request friction):** the member-app helpdesk filing surface (`apps/mobile/app/(helpdesk)/{index,new,[ticketId],_layout}.tsx`, `apps/mobile/components/helpdesk/useHelpdeskQueries.ts`, `apps/mobile/lib/{helpdesk-api,helpdesk-draft,helpdesk-i18n,turnstile}.ts`) is a wholly new member surface: "Ask for help" → pick a category (+ an optional subcategory when the in-force policy defines one) → a short subject + description → optional photo/PDF attachments → send. Friction analysis:

(1) **The filing form itself — NEW, but `optional` not `forced`.** Nothing else in the app routes the member through this screen — they arrive only by deliberately tapping "Ask for help." The required fields (category, subject, body) are the minimum interaction inherent to "describe what you need help with"; attachments are fully optional. This is the same category as the WhatsApp/Telegram opt-in rows above (member-initiated, protects a stated goal, no other flow is gated behind it) — not a `forced` gate like the step-up-OTP or mandatory-upload rows, so it is declared `optional`.

(2) **Turnstile bot-gate — invisible to the member today, so no additional row.** The create route enforces `deps.turnstile.verify(...)` server-side (FR-88), but the mobile app has no Turnstile WIDGET yet (`lib/turnstile.ts` sends a placeholder token; the RN challenge screen is a documented forward commitment) — so today this imposes zero additional member-visible friction (no extra tap, no extra screen). When the real widget lands, it rides the SAME filing-form row declared here, not a new one — a captcha challenge is part of the cost of submitting the form, not a separate friction surface.

(3) **Dignified, no-time-pressure design — friction-reducing, not imposed.** UX-DR55 governs the copy (no jargon, no urgency theater); the draft auto-saves to MMKV so the member never loses typed text across app restarts; a failed submit is a dignified retry, never a hard error. None of this adds friction beyond the base form.

(4) **The inbox + detail screens (`index.tsx`, `[ticketId].tsx`) — read-only, zero forced friction.** Viewing existing tickets, their routing target/SLA, and the read-only reply thread is a pure GET with no gate, upload, or coercive decision — the same category as the read-only status screens already affirmed elsewhere in this ledger (e.g. Story 3.13's membership status).

The **page-weight baseline is unchanged**: every touched file is in the authenticated mobile app (`apps/mobile`, EAS build is a no-op → `member-app-native` stays a no-op) or `packages/i18n`/`packages/contracts`/`packages/domain`/`apps/api`/`packages/platform-adapters` (not page-weight-gated build targets); `apps/public` is **not** touched. Do NOT ratchet (`[[project_friction_budget_baseline_ratchet]]`).

**Story 10.3 disposition (existing Story 10.2 row REALIZED further — no new row):** the operator call-to-ticket surface adds an **admin-only** console (`apps/admin/src/modules/helpdesk/*`, `apps/admin/src/routes/HelpdeskOperatorRoute.tsx`) that is entirely out of this ledger's scope (admin is not a member-facing or page-weight-gated surface, per the Story 6.13/6.14 precedent above). The two `apps/mobile` files this story touches — `app/(helpdesk)/[ticketId].tsx` and `index.tsx` — add a **read-only** "We filed this for you — Operator [Name]" header (detail screen) and a matching inbox badge, rendered when `created_via === 'helpline_call'`. Same category as the Story 10.2 disposition item (4) already declared above ("the inbox + detail screens — read-only, zero forced friction... a pure GET with no gate, upload, or coercive decision"): there is no new tap, field, gate, or step-up — the member does nothing differently whether or not the header renders, and the tickets it decorates were filed by an operator on the member's behalf in the first place (the member never even reaches the create form for these). Zero new friction; ledger reviewed, no new row warranted — the existing Story 10.2 `optional` row (member-filed tickets) is untouched and the read-only reads it also covers extend naturally to operator-filed ones. The **page-weight baseline is unchanged**: the two touched `apps/mobile` files (EAS build is a no-op → `member-app-native` stays a no-op) plus `packages/contracts`/`packages/i18n`/`apps/api` (not page-weight-gated); `apps/public` is **not** touched. Do NOT ratchet (`[[project_friction_budget_baseline_ratchet]]`).

**Story 10.4 disposition (existing Story 10.2 row REALIZED further — no new row):** the admin responder console (`apps/admin/src/modules/helpdesk/*`, `apps/api/src/modules/helpdesk/*`, `@twt/domain`/`@twt/contracts`/`@twt/events`/`apps/jobs`) is entirely out of this ledger's scope, per the Story 10.3/6.13/6.14 precedent (admin is not a member-facing or page-weight-gated surface). The two touched `apps/mobile` surfaces are the member's half of the reply round-trip:

(1) **The reply composer (`app/(helpdesk)/[ticketId].tsx`) — a necessary continuation of the already-declared support-request conversation, not NEW gratuitous friction.** The `TextArea` + submit renders ONLY when `current_state === 'awaiting_member'` — i.e. only after the member has already filed a ticket (the Story 10.2 `optional` row) AND a responder has explicitly asked a follow-up question. Typing and sending that reply is the minimum interaction "continue the conversation you started" requires — the same category as the Story 10.2 filing form itself, not a separate imposed gate: there is no OTP/step-up, no upload requirement, no additional consent, and the message is simply length-bounded (`HELPDESK_REPLY_MAX`, dignified Pattern-4 copy). Declining to reply carries no forced penalty beyond the ticket remaining in `awaiting_member` (the member's own choice not to continue, same as leaving any support thread unanswered) — it does not block any other app flow. So this rides the EXISTING Story 10.2 `optional` row rather than warranting a new one.

(2) **`useHelpdeskQueries.ts` (the reply mutation hook) — invisible plumbing, not a friction surface itself.** Wiring `useHelpdeskReplyMutation` to `POST …/member/helpdesk/tickets/:ticketId/reply` is the same category as the Story 6.2/6.12 treatment of `claim-steps.ts`/`filed-claim.ts` — data-fetch/mutation wiring, not a member-facing interaction on its own.

(3) **`tests/unit/helpdesk-screens-render.test.ts` — test scaffolding, not a friction surface.**

Zero new gratuitous friction introduced; ledger reviewed, no new row warranted — the existing Story 10.2 `optional` row covers the reply composer as the natural continuation of the same member-initiated support conversation. The **page-weight baseline is unchanged**: the touched `apps/mobile` files (EAS build is a no-op → `member-app-native` stays a no-op) plus `packages/i18n`/`packages/contracts`/`packages/domain`/`apps/api`/`apps/jobs`/`packages/events` (not page-weight-gated build targets); `apps/public` is **not** touched. Do NOT ratchet (`[[project_friction_budget_baseline_ratchet]]`).

**Story 10.5 disposition (declaration affirmed, no new row):** the News/Blog admin authoring console
(`apps/admin/src/modules/news-blog/*`, `apps/admin/src/routes/NewsRoute.tsx`) is entirely out of this
ledger's scope, per the Story 6.13/6.14/10.3/10.4 precedent (admin is not a member-facing or
page-weight-gated surface). The one member-facing surface this story touches is the **public** blog
render (`apps/public/src/pages/blog.astro` + `apps/public/src/pages/blog/[postId].astro`) — a
bilingual, **unauthenticated, read-only** list + detail page reading `listPublishedPublicPosts` /
`getPublishedPublicPost` via the established `getDb`/`withPublicScope` RLS-scoped read pattern
(`apps/public/src/lib/db.server.ts`, Story 2.5) already used by `terms.astro`/`niyamavali.astro`. This
is the exact category the **Story 2.5 disposition** above already affirmed zero-friction for ("the
`apps/public` Astro SSR shell... is read-only — no forms, no upload, no member-initiated action... zero
deliberate friction"): there is no form, no upload, no login, no consent gate, and no member-initiated
action beyond ordinary page navigation (the "← News" back-link is a plain in-page anchor, the same
character as the Story 2.5 lang-toggle already affirmed as a non-friction server roundtrip). Zero
gratuitous friction introduced; ledger reviewed, no new row warranted. **Unlike most prior admin/mobile
dispositions above, this story DOES touch the page-weight-gated `apps/public` Astro surface** — but
adds two new, lightweight, server-rendered pages (no client JS bundle: `apps/public`'s build output
`page-weight.json` still reports `js_bundle_bytes: 0`) well under any existing ceiling, so the
**best-ever baseline is left put** (`[[project_friction_budget_baseline_ratchet]]`: an in-PR baseline
only ever *decreases*; a new surface that stays under the ceiling does not raise it).

**Story 10.9 disposition (declaration affirmed, no new row):** the Banner/Popup member surface
(`apps/mobile/components/banners/{BannerHost.tsx,copy.ts,useMemberBannersQuery.ts}`,
`apps/mobile/lib/banner-api.ts`, its mount in `apps/mobile/app/(tabs)/_layout.tsx`) introduces
**zero deliberate friction**:

(1) **The banner strip + popup content itself — admin-authored, read-only, self-suppressing.**
`<BannerHost>` renders on no session, a loading/failed read, or nothing visible (fail-soft, the
Story 8.2/8.3 posture); it never blocks navigation or any other feature. The "no member trapped"
invariant (AC4, enforced by BOTH a domain 422 and a DB CHECK) makes this structural, not just a
design intent: a popup is ALWAYS dismissible, and a non-dismissible `banner` strip never covers or
gates the rest of the surface underneath it (Pattern 9 — a blocking *system state* notice, not a
blocking *interaction*). The member is never asked to decide, upload, or pay anything.

(2) **The dismiss tap — friction-REDUCING, not imposed, the same class as the Story 7.10
Skip-confirm / `<SaveAndResumeAffordance>`/`<CallHelplineCTA>` affordances already affirmed.** A
single, optional, ≥44pt tap removes the banner/popup and durably suppresses it (server-side,
AC3) — it exists so the member need not see the same notice again, which *lowers* the friction of
subsequent app use rather than raising the cost of the current one. `display_once_per_member`'s
automatic `shown` report is invisible plumbing, not a member interaction at all.

Zero gratuitous friction introduced; ledger reviewed, no new row warranted. The **page-weight
baseline is unchanged**: all touched files are in the authenticated mobile app (`apps/mobile`, EAS
build is a no-op → `member-app-native` stays a no-op); the page-weight ceilings the gate has teeth
on cover the PUBLIC `apps/public` Astro surface, which this story does not touch (the
`<NoticeboardStrip>` public consumer of this same data is Story 11a.5's job, per the epic AC — not
built here).

**Story 10.10 second-review disposition (declaration affirmed, no new row):** the member
moderation-notice surface (`apps/mobile/app/(membership)/index.tsx`, plus its presenter carrier
`packages/ui/src/member-status/{presenter,view-model}.ts`) introduces **zero deliberate friction**
— and the change is friction-REDUCING in the sense that matters most on this surface.

(1) **The moderation notice is read-only prose, not an interaction.** The membership-status screen
gains one `<Text>` line rendering `vm.moderationNotice` — the reason a suspension or termination is
in force, in full prose, naming the reason-code LABEL (never the raw code, per
`ux-design-specification.md:1896`). The member is not asked to decide, confirm, upload, pay, or
acknowledge anything. Nothing is gated behind it and nothing blocks navigation. The appeal CTA
alongside it already existed and is unchanged.

(2) **This REMOVES friction rather than adding it — it is the fix for a surface that was
withholding the one fact the member needed.** Before this change the panel showed a bare "Under
review" / "Membership ended" headline plus an appeal button, and never said WHY: the explanation
was attached to a panel section both render layers filter out, so it reached nobody. A member who
must work out their own standing by contacting the helpline is paying the highest friction this
system can impose on them (UX Stance #5 — dignified, non-punitive, no soft misinformation). Telling
them plainly, in place, is the removal of that cost. This is the same class as the Story 10.9
dismiss tap and the Story 7.10 Skip-confirm affordance: member-serving, not member-taxing.

(3) **An empty red "Special flags" section was also removed.** A moderation-only flag set used to
open a titled, red, contentless box — a visible alarm with no information in it, which reads as
"something is wrong that we won't tell you about". `visible` now keys on whether there is a detail
line to show, so the box no longer appears. Strictly less noise for the member.

Zero gratuitous friction introduced; ledger reviewed, **no new row warranted**. The **page-weight
baseline is unchanged**: the touched member surface is in the authenticated mobile app
(`apps/mobile`, EAS build is a no-op → `member-app-native` stays a no-op), and the page-weight
ceilings the gate has teeth on cover the PUBLIC `apps/public` Astro surface, which this change does
not touch. The admin-side files in the same commit (`apps/admin/**`) are a STAFF surface and are
outside the member friction budget by construction.

**Story 10.16 disposition (declaration affirmed, no new row):** the
contribution-during-suspension disclosure (`apps/mobile/app/(contribution)/pay.tsx`,
`apps/mobile/components/active-contribution/SuspensionDisclosure.tsx`, the pure
`@twt/ui` derivation in `packages/ui/src/contribution-disclosure/`, and the
`apps/mobile/tests/unit/pay-screen-disclosure-render.test.ts` render fence)
introduces **zero deliberate friction** — and, like the Story 10.10 moderation
notice, the change is friction-REDUCING in the sense that matters most here.

(1) **The disclosure is read-only prose, not an interaction.** It renders above the
already-declared pay affordances (the Story 8.4 UPI Intent / manual-transfer flow)
on the account-choice and chosen-account branches, saying what the payment DOES
(counts toward restoring standing), what it does NOT buy (no beneficiary
entitlement for a death during the suspension period), and the honest state of the
restoration count (AC4's `package_unavailable`, never a fabricated number). The
member is not asked to decide, confirm, tap through, upload, or acknowledge
anything to proceed — the existing pay flow underneath is entirely unchanged and
un-gated by this read (fail-soft: a loading or errored validity read renders the
screen exactly as it does today, per Task 3). No new step, no new tap, no new form.

(2) **This is the fix for a surface that was about to withhold the one fact a
suspended member needs before paying** — the same class of correction as the Story
10.10 disposition: before this story, Story 10.17 would put a suspended member back
on the donor roster with no explanation of what their payment does and does not
buy. A member asked for money under a misapprehension about their own coverage is
paying the highest-cost, least-visible friction this system can impose (UX Stance
#5 — dignified, non-punitive, no soft misinformation). Telling them plainly, before
they act, is friction removed, not added — this is precisely why the story is a
`[GATE]` on 10.17 rather than an optional follow-up.

(3) **`<CallHelplineCTA>` on the honest-absence arm — reuse of an existing
friction-REMOVING affordance**, the same one-tap escape-to-live-help already
affirmed under the Story 6.2/6.12 dispositions, not a new friction surface.

Zero gratuitous friction introduced; ledger reviewed, no new row warranted. The
**page-weight baseline is unchanged**: all touched/new files are in the
authenticated mobile app (`apps/mobile`, EAS build is a no-op →
`member-app-native` stays a no-op); the page-weight ceilings the gate has teeth on
cover the PUBLIC `apps/public` Astro surface, which this story does not touch. This
story owns no state (no table, no migration, no event, no route, no contract
change, no OpenAPI regen, `PERMISSION_CATALOG_VERSION` stays 28) — the friction
budget's declaration facet is the only ledger this change touches.

**Story 10.25 disposition (declaration affirmed, no new row):** the R7(A)
restoration-accounting story touches the SAME disclosure surface the Story 10.16
disposition above already covers (`apps/mobile/components/active-contribution/SuspensionDisclosure.tsx`,
`apps/mobile/tests/unit/pay-screen-disclosure-render.test.ts`) — it introduces
**zero new friction**, only honest content within the arms that surface already
declared.

(1) **The `ok` arm goes from structurally unreachable to real** — Story 10.24 left
`restorationPackage` unable to reach `{status: 'ok', remaining, required}` because
nothing yet supplied `contribution.r7a_restorations_used` or the applied clause's
`consecutive_required`. Story 10.25 supplies both, so the arm now renders real
numbers instead of never firing. This is the SAME read-only prose position Story
10.16 declared (AC1(c)) — no new tap, form, or step, and the pay flow underneath
remains entirely un-gated by it (D5/fail-soft, unchanged).

(2) **The `no_consecutive_requirement` arm (D4) is a THIRD honest-absence state**,
added so a member whose applied R7 clause is NOT measured in consecutive
contributions (R7(D)/(E)/(F)) is told the true thing instead of being silently
folded into `package_unavailable`'s "we cannot yet tell you." Still prose, still
paired with the pre-existing `<CallHelplineCTA>` affordance (Story 6.2/6.12), still
zero interaction demanded of the member.

(3) **Code-review pass (2026-08-06):** the two-arm ternary selecting between
`no_consecutive_requirement` and `package_unavailable` copy keys was replaced with
an exhaustive `switch` (a `never`-typed default) for compile-time safety against a
future fourth arm — a type-level refactor with byte-identical rendered output; the
render-fence test (`pay-screen-disclosure-render.test.ts`) is unchanged in intent
and still green.

Zero gratuitous friction introduced; ledger reviewed, no new row warranted. Page-weight
baseline unchanged (mobile EAS build stays a no-op; the public Astro surface is
untouched). This story owns the sixth producer fact and no new state beyond it —
the declaration facet is the only friction ledger this change touches.

**Story 10.26 disposition (NEW row — optional personal-event-assertion friction; gate corrected 2026-08-06):**
the personal-event assertion surface (`apps/mobile/app/(membership)/index.tsx`,
`apps/mobile/components/member-status/{PersonalEventAssertion.tsx,usePersonalEventAssertion.ts}`,
`apps/mobile/lib/personal-event-api.ts`) is a wholly new member surface: an entry
button on the member's own status panel → a bounded 6-value picker (bereavement /
illness / caregiving / displacement / financial_hardship / other, no free text,
D3) → a mandatory pre-submit disclosure stating the Niyamavali's answer → submit.
⚠ This declaration was missing from the story's own commits and is added by the
code review as one of its patches — the gate's AC-4 check was not run to
completion during dev (it silently no-ops when `origin/main` isn't resolvable
locally, per the check's own "push event or no origin/main" branch), so the gap
went undetected until the pre-push hook ran `friction:check` for real. Friction
analysis:

(1) **The affordance itself — NEW, but `optional` not `forced`.** Nothing else in
the app routes the member through this flow — they arrive only by deliberately
tapping "record that a personal event affected my ability to contribute." Same
category as the Story 10.2 helpdesk-filing row and the WhatsApp/Telegram opt-in
rows: member-initiated, no other flow is gated behind it.

(2) **The pre-submit disclosure is the deliberate part.** Unlike Story 10.16's
read-only pay-screen prose (which sits ABOVE an already-existing flow and asks
nothing of the member), this disclosure sits INSIDE a flow the member chose to
enter and — per AC7 — is rendered unconditionally, not collapsible, specifically
so the member cannot complete the flow without having been told it changes
nothing. That is the deliberate non-effortless step this row declares: reading
the Niyamavali's answer is not optional once the member has opened the form,
even though opening the form in the first place is.

(3) **No free text, no upload, no file — the minimum interaction inherent to
"pick which kind of personal event."** D3 forecloses a text box entirely (Tier-1
PII in an append-only, unredactable `events_log` with nothing designed to read
it), so the friction here is bounded to one tap on one of six options plus one
confirm — smaller than the helpdesk row it is modeled on.

(4) **Dignified, no dark pattern.** The consequence is disclosed BEFORE the
member commits, not after (AC7) — naming it only in a post-submit confirmation
would be a dark pattern (the member has already spent the effort). A link to the
Helpdesk is offered for anything the member actually needs a human for, rather
than simulating a reviewer here (D3).

The **page-weight baseline is unchanged**: every touched file is in the
authenticated mobile app (`apps/mobile`, EAS build is a no-op →
`member-app-native` stays a no-op) or `packages/i18n`/`packages/contracts`
(not page-weight-gated build targets); `apps/public` is **not** touched. Do NOT
ratchet (`[[project_friction_budget_baseline_ratchet]]`).

**Story 10.12 disposition (declaration affirmed, no new row):** the per-Pariwar custom-fields
substrate (`packages/domain/src/custom-fields/`, `packages/contracts/src/custom-fields/`,
`apps/api/src/modules/custom-fields/`, `apps/admin/src/modules/custom-fields/`, migrations 0095/0096)
introduces **zero member-facing friction**, for a reason stronger than "the change is small": **there
is no member surface at all.**

(1) **Nothing member-facing was built, deliberately.** AC8 refuses to ship a member-facing dynamic
form renderer: the UX specification has no form-builder, field-definition or per-Pariwar settings
grammar anywhere, and §11 confines per-Pariwar variation to the token / surface-label / copy layers
while calling component grammar "tenant-invariant" (`ux-design-specification.md:2254-2262`, `:2465`).
Building one here would mean inventing UX inside an implementation story. Custom-field VALUES are
written through the API only in v1 (a gated deferral + ESCALATION 5). No member ever sees a
custom-field input in this story — so there is no interaction to tax.

(2) **The one UI that ships is a STAFF surface, outside the member friction budget by construction.**
`/p/$pariwarId/custom-fields` is an admin console page behind `requireAdminSession` +
`pariwar.manage_custom_fields`. It is English-primary per `ux-design-specification.md:2379`, and the
admin-side files in this commit (`apps/admin/**`) are staff-facing, exactly as the Story 10.10
disposition records for its own admin half.

(3) **The page-weight baseline is unchanged.** The page-weight ceilings the gate has teeth on cover
the PUBLIC `apps/public` Astro surface; this story does not touch it. `apps/mobile` is untouched
entirely (EAS build is a no-op → `member-app-native` stays a no-op).

(4) ⚠ **One forward-looking friction commitment, made now while it is free.** Both `label_en` and
`label_hi` are REQUIRED on every definition, enforced at the validator, at the contract and at the DB
CHECK — even though **no member surface renders them today**. That is deliberate rather than
zealous: freeze-table row 10 (`epics.md:526`) requires every member-visible string to carry Hindi
parity; `packages/i18n/per-pariwar/` is a BUILD-TIME strings directory a runtime-authored label can
never reach; and a label authored English-only today becomes an **un-backfillable** parity violation
the moment a renderer lands [[feedback_record_unattested_no_backfill]]. Requiring both now costs a
Pariwar admin one extra field; requiring it later costs a member a screen they cannot read. The
admin form states the reason in the tone-guide register rather than as a validation scold (AC9).

Zero gratuitous friction introduced; ledger reviewed, **no new row warranted**.

⚠ **Declared deliberately, not read off a vacuous pass** [[project_friction_budget_baseline_ratchet]]:
AC-4 diffs COMMITTED history, so `pnpm friction:check` passes trivially until this work is committed.
The green result at authoring time is not evidence of anything, and this disposition is the actual
assessment.

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

**Story 10.27 disposition (declaration affirmed — NO new row):** the member
missed-cycle section (`apps/mobile/components/yogdaan-bahi/{MissedCycleSection.tsx,YogdaanBahi.tsx,missed-cycles.ts}`,
plus the two `apps/mobile/components/member-status/*` files this story widens) is
**read-only**. It lists assigned-and-closed cycles for which the record holds no
matched contribution, and it asks the member for **nothing**: no form, no upload,
no gate, no step-up, no decision, no confirmation. Nothing else in the app is
gated behind it and no existing flow gains a step. Friction analysis:

(1) **The section itself introduces ZERO deliberate friction.** Same category as
the Story 10.3 disposition's read-only inbox/detail reads and the Story 10.16
read-only pay-screen prose: the member does nothing differently whether or not
the section renders. It is information about their own record, shown on a screen
they already opened. Indeed the section is **absent** — not empty — when there is
nothing to show, so a member with no missed cycles sees no change at all.

(2) **The one affordance inside it is ALREADY DECLARED, and is not widened.** Each
entry mounts the shipped Story 10.26 `<PersonalEventAssertion>` — the row above
("member (asserting a personal event affected a contribution — a bounded 6-value
picker, no free text)", `optional`) covers it exactly, including its mandatory
pre-submit disclosure. This story **populates** the assertion's already-optional
`cycleRef` provenance field; it adds no field the member fills, no step, and no
new decision. Per-row instantiation changes WHERE the same affordance is
reachable, not WHAT it costs the member — and reaching it from the cycle it
concerns is strictly *less* effort than the prior route (find the cycle, then
find the assertion on a different screen). ⚠ A friction row declares a cost the
member pays; a second row for the same picker would double-count it.

(3) **Nothing is pushed.** Q6 is DISPLAY-ONLY: this story emits no notification of
any kind, so the member is never interrupted, never summoned, and never given a
task. The section waits to be looked at.

Ledger reviewed against a member-facing path touch (AC-4 fires conservatively on
the path, by design); **no new row warranted**. The **page-weight baseline is
unchanged**: only `apps/mobile` (EAS build is a no-op → `member-app-native` stays
a no-op) plus `packages/{contracts,i18n,domain,api-client}` and `apps/api`, none
of which are page-weight-gated; `apps/public` is **not** touched. Do NOT ratchet
([[project_friction_budget_baseline_ratchet]] — the baseline is a best-ever
ratchet and this story measured nothing new).

See `scripts/friction-budget/README.md` for the gate's mechanism and the
baseline-of-record model.

---

## Story 10.19 — Termination Ends Membership Privileges

**ONE new row, and it is for a cost that is not yet payable.** The member-facing
surfaces this story touches (`apps/mobile/app/(auth)/terminated.tsx`,
`.../otp.tsx`, `apps/mobile/lib/public-site.ts`) are **read-only**: the
termination surface states what happened, when, and on what ground, and asks the
member for **nothing** — no form, no upload, no gate, no step-up, no decision, no
confirmation. On its own it would warrant no row at all. It in fact *removes* a
cost: before this story the OTP screen told a terminated member their **correct**
code was wrong, so the only route forward was to retype it, request a new one, and
eventually phone someone to find out why nothing worked.

**The row exists for the one real cost this story moves onto the member.** Once
`termination_access_block` is enabled, a terminated member's route to their own
records changes from Story 3.11's authenticated self-serve export to **calling the
helpline**. That is a genuine, `forced` friction — they have no alternative — and
it is paid by the member with the least standing to object.

⚠ **It is declared now precisely because it is NOT yet payable.** The flag ships
DEFAULT OFF and its flip is gated on Story 10.21 landing plus a Trustee Panel
decision (Decision `2026-08-10-097` clause 6, sub-choice (b-i)). A row added only
at flip time is a row nobody would remember to add — the flip is a config act, not
a code change, so it would never touch a member-facing path and would never fire
this gate. Declaring it here, with its trigger stated in the row, is the same
anti-decay posture the rest of this story takes toward deferred work.

⭐ **Story 10.21 is what RETIRES this friction**, not merely what unblocks the
flip: it builds the off-portal DPDPA route, which is the whole reason the helpline
is the interim answer. When it lands, this row should be re-examined rather than
inherited.

**No row for the block itself.** Denying session issuance is an access decision,
not friction: friction is a cost a member pays to obtain something, and a
terminated member is not being asked to pay anything to get back in — §8.4 says
they cannot, absent a Trustee Panel act. Recording it as friction would mis-file a
governance boundary as a UX cost.

**The page-weight baseline is UNCHANGED — do NOT ratchet.** Only `apps/mobile`
(EAS build is a no-op → `member-app-native` stays a no-op), plus `apps/api`,
`apps/jobs`, `packages/{domain,i18n,ui}`; `apps/public` is **not** touched
([[project_friction_budget_baseline_ratchet]] — the baseline is a best-ever
ratchet and this story measured nothing new).

## Story 10.15 — the poll-answering row

**`optional`, and the classification is the honest one.** Nothing in the member loop
requires answering a poll: a member who never opens the polls surface loses no
coverage, pays no penalty, and misses no obligation. A survey **gathers views and
decides nothing** (LBD-1), so the friction cannot be `forced` — there is no flow it
is unavoidable for.

**What the member actually pays** is completeness plus finality: the whole
questionnaire in one pass, and no edit afterwards. Both are deliberate, and both
protect the same thing — *what the aggregate means*. One response per member is
enforced structurally by `PRIMARY KEY (pariwar_id, survey_id, member_id)`, and the
migration additionally withholds `UPDATE` on `survey_responses` from `twt_app`, so
the "convenience upsert" that would quietly dissolve this invariant is not merely
discouraged but unavailable.

**No row for the Turnstile check or the rate limit.** Those are bot/abuse controls a
member does not perceive and does not pay — the same reason the login-wall itself
has no row.

**No row for the notification.** Being told a poll opened is not friction; it is the
notification the epic AC asks for, and it costs the member nothing to ignore.

**The page-weight baseline is UNCHANGED — do NOT ratchet.** `apps/mobile` measures as
a no-op (EAS build), and `apps/public` is **not touched** by this story
([[project_friction_budget_baseline_ratchet]] — the baseline is a best-ever ratchet
and this story measured nothing new).

**Story 11a.1 disposition (declaration affirmed — ⛔ NO new row):** the FR-74
4-tier visibility matrix populated per surface, the tier-leak CI leg armed, and
the per-Pariwar public-name presentation policy. AC-4 fires on the `apps/public`
path touch (conservative by design — it cannot tell a refactor from a form), and
the ledger was reviewed. **No row is warranted, for three separate reasons:**

1. **Nothing new renders, and nothing renders differently.** The blog pages were
   rewired through a pure render model (`lib/blog-render.ts`) and the two public
   blog reads were narrowed to an explicit six-column list. That is a **narrowing
   of the model, not a change to the page** — every value the two pages rendered
   before they render after, byte-identical, `fmtDate`'s `null → ''` included.
   The render models for `/niyamavali` and `/terms` gained only a field-id
   derivation used by CI; the pages themselves are untouched.
2. **No form, no upload, no member-initiated action anywhere in this story.** All
   seven declared surfaces are read-only, exactly as the Story 2.5 and 2.6
   dispositions record for the same paths.
3. **The presentation policy is not member-facing at all.** Flipping
   `full_name` ⇄ `shielded_name` is a governed act carrying a permission key held
   by Super Admin / the Trustee Panel, ⛔ with no admin UI and no member-visible
   control. A member pays nothing — the mode changes how their name *appears*,
   which is a governance decision made about them, not friction paid by them.
   ⚠ That is a DPDPA and transparency question, and it is carried openly as one
   (Decision `2026-08-20-140` cl.7 — the Niyamavali does not record this
   publication; `2026-08-19-136` cl.5 — legal counsel not engaged). It is simply
   not a *friction-budget* question, and recording it here would file a real
   finding under the wrong heading.

**The page-weight baseline is UNCHANGED — ⛔ do NOT ratchet.** Measured
`member-public-web.page_weight_bytes: 5219` against baseline `3942`. ⚠ Verified,
not assumed: `friction-budget.yaml:55` already records 5219 as the measurement
`/terms` produced at Story 2.6, so the delta predates this story and is not its
to claim. Well under the 512000 ceiling, and the baseline stays at its best-ever
3942 ([[project_friction_budget_baseline_ratchet]] — the ratchet only ever
DECREASES in-PR).

**Story 11a.2 disposition (declaration affirmed — ⛔ NO new row, and the FR-91
refusal was CONSIDERED for one):** the public shell extension — `<MatrixField>`,
`<AuthenticatedFragment>`, the FR-91 pagination helper, the cache-policy gate leg,
and the new `/members` route. AC-4 fires on the `apps/public` path touch
(conservative by design), and the ledger was reviewed. **No row is warranted:**

1. **`/members` is read-only, like every public surface before it.** No form, no
   upload, no member-initiated action — the same finding the Story 2.5, 2.6 and
   11a.1 dispositions record for these paths. It renders the shell, the pagination
   controls and a not-yet-published empty state, and reads ⛔ no member data at all.
2. **⭐ THE FR-91 REFUSAL WAS WEIGHED AS A CANDIDATE ROW AND REJECTED, deliberately.**
   A rejected `?page=all` / over-cap `?limit` / malformed page number renders a
   400-shaped state the visitor must recover from, which *looks* like forced friction
   protecting a named subsystem (the directory, against bulk extraction). It is **not
   a ledger row**, because the ledger declares **deliberately non-effortless
   MEMBER-FACING SURFACES** — friction a member pays while doing something they came
   to do. This is an **error state for a malformed request**: a member following the
   directory's own links never encounters it, since every link the page emits is in
   range. ⛔ Declaring it would inflate the ledger with a row nobody pays, and a
   ledger that counts error states stops meaning what UX Stance #2 says it means.
   ⚠ Recorded here rather than silently omitted, so a later reader can see the
   question was asked and how it was answered.
3. **The pagination controls themselves cost nothing beyond a page load.** They are
   plain `<a>` server roundtrips (⛔ not JS-dependent buttons), keyboard-reachable,
   with visible focus — the same posture as the lang-toggle, which prior dispositions
   already record as not-a-friction-surface.

⚠ **Metric facet, stated plainly:** `js_bundle_bytes` stays **0** — `/members` ships
⛔ not one client island, so the first-island question in Trap 5 never arises.
`page_weight_bytes` measured **6327** (was 5219 after `/terms`; the `/members` CSS
chunk is 1108 bytes). That is a **RISE**, well under the 512000 ceiling, so it PASSES
with the delta reported — and the baseline stays at its best-ever **3942**. ⛔ A rise
is NEVER ratcheted ([[project_friction_budget_baseline_ratchet]] — the ratchet only
ever DECREASES in-PR, and `detectRaisedBaselines` forbids an in-PR raise).

---

**Story 11a.3 disposition (declaration affirmed — ⛔ NO new row; and ⭐ the DYNAMIC-HTML
metric facet is PARTIALLY DISCHARGED, ⛔ not passed over a fourth time):** the public
Member Directory now renders real member rows — the presentation-resolved name, the raw
latest-posting district, and a two-label status pill — behind the anti-enumeration
safeguards. AC-4 fires on the `apps/public` path touch, and the ledger was reviewed.
**No row is warranted:**

1. **`/members` is still read-only.** No form, no upload, no member-initiated action —
   the same finding the 2.5 / 2.6 / 11a.1 / 11a.2 dispositions record for these paths.
   Rendering member data does not make a page a friction surface; it makes it a
   *content* surface.
2. **The FR-91 refusal is unchanged as a candidate, and unchanged as a rejection.** The
   11a.2 disposition weighed it and declined it, for a reason this story does not alter:
   a member following the directory's own links never meets it, because every link the
   page emits is in range. ⭐ Story 11a.3 ADDS a second refusal — the deep-pagination
   horizon (`?page=` above 200) — and it is rejected as a row for the SAME reason and
   ⛔ not re-argued from scratch.
3. **⭐ THE ANTI-ENUMERATION RATE LIMIT WAS WEIGHED AS A NEW CANDIDATE ROW, AND REJECTED.**
   A visitor throttled to `429` pays a real cost while doing something they came to do,
   which is closer to a ledger row than the FR-91 refusal is. It is still **not** one:
   the named `search` ceiling is sized for scraping, ⛔ not for reading — a person
   browsing a directory does not approach it, and the ledger declares friction a member
   **pays**, not friction an abuser meets. ⚠ Recorded here rather than silently omitted,
   so a later reader can see the question was asked and how it was answered. ⚠ Re-examine
   if the ceiling is ever tightened toward human-reading rates.

⭐ **METRIC FACET — THE DYNAMIC SSR HTML IS NOW MEASURED (D6(a), `2026-08-20-143` cl.6).**
⚠ **THIS IS A DIFFERENT QUANTITY FROM EVERY NUMBER ABOVE, AND THE TWO MUST NEVER BE
SUMMED OR COMPARED.** `page_weight_bytes` and the per-route block in
`dist/page-weight.json` attribute **STATIC CLIENT ASSETS** (CSS/JS a browser caches
across navigations). `dist/dynamic-html-weight.json` measures the **PER-REQUEST HTML
RESPONSE BODY** — re-sent every time, and the only figure that grows with the roster.
Adding them would produce a number describing nothing.

Measured against the REAL built standalone server (`pnpm --filter @twt/public weight:dynamic`),
with the upstream stubbed at a full page at the FR-91 cap:

| `/members` dynamic HTML | bytes |
| --- | --- |
| a full page at the cap (50 rows) | **19 234** |
| a single-row page | **4 220** |
| marginal cost per directory row | **306** |

⚠ For scale: the STATIC attribution for the same route is **3 116** bytes. The dynamic
HTML at the cap is roughly **six times** that — which is precisely the gap D6(a) existed
to close, and precisely why `page-weight.mjs`'s own header says the dynamic part
*"remains unmeasured here"*. ⛔ It is **emitted for review, NOT gated**: no ceiling is
declared for it in `friction-budget.yaml`, and pretending otherwise would be the
vacuous-green defect this epic keeps finding.

⛔ **SAY WHICH ONE WAS BUILT** ([[feedback_closure_language_precision]]): the
dynamic-HTML measurement is **CLOSED BY EDIT**. The **device-throttled Lighthouse-CI
timing harness is RE-DEFERRED**, with a **genuinely new reason** — ⛔ not a restatement
of 11a.2's "separate CI infrastructure on a surface story's critical path". The new
reason: *this story has now established that the dominant, roster-scaling quantity on
this surface is HTML BYTES, and it is measured. A timing harness would answer a
different question — how long a 2G device takes to paint those bytes — which is a
DEVICE-and-NETWORK question, not a code-shape one, and it cannot be answered
meaningfully until there is a real deployed origin with a real edge decision behind it
(that decision is itself blocked on DPDPA legal review, `architecture.md` §5.8a).*
⭐ **New written trigger:** the first deployment to a real origin with a CDN/edge
configured — the same event that re-triggers the abuse-rules edge dependency. ⛔ NOT
"the next public surface story", which is the open-ended trigger shape that let this
metric slip at 2.6, 10.5, 11a.2 and 11a.3.

⚠ **Metric facet (static), for completeness:** `js_bundle_bytes` stays **0** — `/members`
still ships ⛔ not one client island. `page_weight_bytes` measured **6938** (was 6327).
That is a **RISE**, far under the 512000 ceiling, so it PASSES with the delta reported —
and the baseline stays at its best-ever **3942**. ⛔ A rise is NEVER ratcheted
([[project_friction_budget_baseline_ratchet]]).

---

**Story 11a.4 disposition (declaration affirmed — ⛔ NO new row; ⭐ and the AC-4 trigger
fired on a COMMENT-ONLY diff):** AC-4 fires on two `apps/public` path touches —
`src/lib/niyamavali-render.ts` and `tests/integration/public-pages/scrape-test.spec.ts`.
The ledger was reviewed. **No row is warranted, and this one is not a close call:**

1. ⭐ **BOTH TOUCHES ARE COMMENT-ONLY. ⛔ Not one executable line changed in `apps/public`.**
   `niyamavali-render.ts` gains a corrected module-doc paragraph (the naked-PII leg scans
   **fixture-built** HTML in `scrape-test.spec.ts`, and ⛔ does **not** scan what a Pariwar
   actually publishes — Trap 4 / Decision `2026-08-22-149` cl.4); `scrape-test.spec.ts`
   gains a corrected caveat comment. ⛔ Zero render logic, ⛔ zero fixture values, ⛔ zero
   field-id mappings, ⛔ zero markup. ⇒ a member's experience of `/niyamavali` and
   `/members` is **byte-identical** to before this story.
2. **No new tap, no new field, no new gate, no new step-up, no new interaction, on any
   surface.** `/members` and `/niyamavali` remain **read-only content** surfaces — the same
   finding the 2.5 / 2.6 / 11a.1 / 11a.2 / 11a.3 dispositions record for these paths.
3. ⭐ **THE ONE NEW REJECTION THAT COULD LOOK LIKE FRICTION IS ⛔ NOT MEMBER-FACING AT ALL.**
   Story 11a.4 adds a publish-time naked-PII backstop that can reject a clause publish with
   a **422** (AC3a). That is an **operator/trustee write path** (`niyamavali.amend`, behind
   the admin session + RBAC + a non-author sign-off), ⛔ not a member surface. The ledger
   declares friction a **member pays**; a `pariwar_admin` being told to remove a phone number
   from a rulebook payload before publishing it is a **governance control**, ⛔ not member
   friction. ⚠ Recorded here rather than silently omitted, so a later reader can see the
   question was asked and how it was answered.
4. **The honeypot bait paths are ⛔ not a friction surface either** — synthetic routes a
   legitimate client never requests, serving no data, blocking nothing, and reachable by
   ⛔ no member flow.

⚠ **Metric facet (static):** ⛔ unchanged and ⛔ not re-measured as a delta claim — `apps/public`
gained ⛔ no executable line, so there is nothing new for the bundler to emit. The gate's own
run reports `js_bundle_bytes: 0` and `page_weight_bytes: 6938 ≤ 512000 (Δ +2996 vs baseline
3942)` — **the same 6938 Story 11a.3 recorded**, i.e. ⛔ no movement attributable to this
story. The baseline stays at its best-ever **3942**; ⛔ a rise is NEVER ratcheted
([[project_friction_budget_baseline_ratchet]]).

⚠ **The device-throttled Lighthouse-CI timing harness stays RE-DEFERRED on 11a.3's trigger** —
the first deployment to a real origin with a CDN/edge configured. ⛔ This story does **not**
re-argue it, ⛔ does not re-trigger it, and ⛔ does not reset it to the open-ended "next public
surface story" shape that let the metric slip at 2.6, 10.5, 11a.2 and 11a.3.

---

**Story 11a.5 disposition (declaration affirmed — ⛔ NO new row; ⭐ and the net movement is
friction REMOVED, not added):** AC-4 fires on fourteen `apps/mobile` path touches — the
Panchayat Noticeboard's promotion from a Story-0.14 P0-5 fixture-backed prototype into a real
surface driven by the `@twt/ui` `<NoticeboardStrip>` presenter (Decision `2026-08-22-152`).
The ledger was reviewed. **No row is warranted:**

1. **No new tap, no new field, no new gate, no new step-up, no new interaction.** The
   Panchayat Noticeboard is a **read-only content surface** and stays one. Nothing on it asks
   a member to do anything; the one interactive affordance it has (`<PollsEntry>`, Story
   10.15) is **unchanged in position and behaviour** and already sits in the ledger under its
   own row.
2. ⭐ **The net movement is friction REMOVED.** Three sections that rendered fabricated
   content — an invented operational stat line, five **invented deceased-member names**, and
   an invented meeting date — now render **nothing** (D3(a) / AC4). ⚠ Fabricated content a
   member must read and mentally discount **is** a tax on attention, even though it is not a
   tap; removing it is the opposite of adding a row. And the `<BannerHost>` fifth
   self-suppression condition (D7(a)) removes a **duplicate banner** from this screen — the
   member reads the same notice **once** instead of twice.
3. **The tier filter is a VISIBILITY rule, ⛔ not friction, and this is worth stating because
   the two are easy to conflate.** AC5's predicate decides **what a viewer SEES**; it asks a
   member for ⛔ no effort, ⛔ no input and ⛔ no extra step. A member is never told to sign in
   to reveal a notice — there is no unlock affordance and no prompt. ⚠ It is also not
   member-facing **today**: the member app has no signed-out render, so the predicate ships in
   the presenter ahead of any surface that could exercise it (D5(a)).
4. ⛔ **Nothing here touches a benefit, an eligibility check or a coverage decision.** D4(a)
   makes that structural rather than incidental: **no coverage-bearing deadline ever rides the
   noticeboard, by construction** — those stay in the Story 8.8 notification family. ⇒ there is
   no path by which not seeing a notice costs a member anything they must then pay friction to
   recover.

⚠ **Metric facet — an HONEST no-op, ⛔ not a pass to be read as coverage.**
`member-public-web.page_weight_bytes` measures **6938**, ⛔ byte-identical to Story 11a.4's
reading, because this story touches ⛔ **zero `apps/public` files**; the baseline stays at its
best-ever **3942** and ⛔ a rise is never ratcheted
([[project_friction_budget_baseline_ratchet]]).

⭐ **But the surface this story ACTUALLY changed is `member-app-native`, and both of its facets
are `no-op — no measurable build output`.** So the gate can see ⛔ **nothing** about a change
that removes a diagnostic panel, four components and a fixture module from the RN bundle and
adds a pure presenter to it. ⚠ Recorded openly as **un-measured**, ⛔ not reported as a pass
and ⛔ not reconstructed from an estimate ([[feedback_record_unattested_no_backfill]]). ⛔ This
story does **not** stand up an EAS/Metro bundle-measurement harness — that is its own piece of
work, and inventing a number here would be worse than the silence. ⭐ **Re-trigger: the first
story that needs a mobile bundle-size claim, or the first EAS build wired into CI.**
