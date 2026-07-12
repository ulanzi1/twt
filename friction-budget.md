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
| member/nominee (claim-time dual bank-account entry — a SECOND full account, not just one) | Disbursement resilience (Epic 9 RBI per-payee-per-day-cap failover) | forced |

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
