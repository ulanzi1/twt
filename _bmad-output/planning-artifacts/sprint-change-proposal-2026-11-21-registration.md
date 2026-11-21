# Sprint Change Proposal — 2026-11-21 — How a person registers

**Status:** APPROVED 2026-11-21 (BigDev: "Approve"; batch review). Applied on `governance/registration-change-2026-11-21`; build decisions recorded as author-commit `2026-11-21-482`. **Author:** BigDev's session (`bmad-correct-course`), on
`story/3-13-trustee-validation-of-manually-entered-identity`; code traced at `origin/main` `90535934`.
**Scope classification (proposed):** **Moderate** — new stories in Epics 3 and 13, one reshaped story (3.13), and three questions for the
Trustee Panel that replace ratified text. ⛔ Code changes in this proposal.

---

## 1. Issue summary

**Trigger:** a new requirement from BigDev in session, 2026-11-21 (category: *new requirement from stakeholders*), after tracing how a
person registers today (one route only — self-signup in the mobile app; typed-in identity when DigiLocker is unavailable; ₹110 paid at
the last step; no staff, helpline or field-worker signup; the payment step's optional "Reference Code" saved but never linked to a worker).

**The four changes, in BigDev's words and answers:**

1. **Upload instead of typing when DigiLocker is unavailable.** *"If Digilocker is not available, person should upload PAN and Aadhaar,
   take the selfie to proceed."* Answered: **PAN + a masked Aadhaar (last 4 digits only) + a selfie** — Aadhaar Act s.8A(4)(b) bars storing
   *"an Aadhaar number … for any purpose"*.
2. **A field worker can start a registration but cannot submit it.** *"What actually happens worker would fill the form and details, upload
   person PAN, Aadhaar and take photo from phone and upload. Then ask the member to login to app, review the details and accept terms,
   declaration, whatsapp message … make the payment, click submit."* Answered: the member **ticks terms, declaration and health declaration
   themselves** (DPDP Act s.6(1): consent needs *"a clear affirmative action"*); WhatsApp stays optional and unticked.
3. **"Have you been assisted?"** *"when self registration a form should ask have you been assisted? If yes enter the code shared."*
4. **The fee becomes optional until the Panel makes it mandatory.** *"Payment to Trust is going to optional until decided by Panel to make it
   mandatory until then exception will be made to claim. It's because we don't want users to discourage over fee."* Answered: **joining
   AND renewal** optional; the **15-day joining lock-in starts at final submission**, paid or not; **ask the Panel, and build a per-Pariwar
   switch that stays "fee required" until the ruling.**

**Evidence (traced at `90535934`):**
- Only one creator of a member: `POST /api/v1/member/auth/signup/create` (`apps/api/src/modules/auth/member/signup.handlers.ts`), into the
  one configured Pariwar (`defaultSignupPariwarId`).
- Typed-in identity: `POST /api/v1/member/kyc/manual`; ⛔ document upload; `trustee_verified` never set true.
- Field workers have ⛔ login (13.1 C1: `users.identity_type` has one value, `admin`; the field-worker app is Story 13.3, backlog).
- The payment step's Reference Code is stored raw in `member_attribution` (`apps/api/src/modules/vyawastha-shulk/handlers.ts`); resolving
  it to a worker is Story 13.8's C2/C4 (backlog). The code registry exists (13.2, done; `field-worker/attribution-code-access.ts`).
- The fee is load-bearing everywhere: the reducer's only `pending-fee → lock-in` arm is `member.vyawastha_shulk_paid`; the claim door
  refuses `pending-fee` (`claim/intake-door.ts`, reason `not_paid`); the renewal scheduler selects by receipt `valid_through`; Story 6.39's
  membership check stores a NOT NULL `fee_receipt_id` (`claim_membership_checks`, migration `0212`) — a member with no receipt can never
  have a check recorded, so their claim could never be approved.
- Upload storage exists per purpose (`packages/platform-adapters/src/*-storage/gcs.ts`: claim documents, helpdesk attachments, self-verify
  screenshots, bank statements) — a KYC-document store follows that pattern.

---

## 2. Impact analysis

### 2.1 Rulings this would replace (the Panel's to replace — ⛔ ours)

| Ruling | Verbatim (as relayed / as put) | Affected by |
|---|---|---|
| `2026-10-31-424` Q1 (b) B (Trustee-ratified) | A claim for someone who gave their identity details but *"never paid the joining fee is refused at the door"* | change 4 |
| `2026-10-31-430` Q1 B (Trustee-ratified) | *"staff compare the date of death on the certificate with the date the fee was paid, and ⛔ drive opens if the fee was paid after the death"* | change 4 (no fee ⇒ no fee date) |
| `2026-11-21-473` Q1 B (Trustee-ratified) | *"The same day counts as after — ⛔ drive"* | change 4 |
| Routing note `2026-11-21-3-13-checking-a-typed-in-identity` (SENT today, ⏳ unruled) | Q1's options all say *"Nothing is copied or kept"* | change 1 — the Panel must see the upload option BEFORE it rules |
| Niyamavali §2.1 (c), §2.2 (rulebook, ⛔ ratified; framed by the Board under Deed Clause 20(a)) | membership needs *"payment of the Vyawastha Shulk"*; *"₹[[110]] per year"*; lock-in *"after fee payment"*; renews *"annually on payment"* | change 4 — the Board's to amend; ⛔ edited here |

### 2.2 Epic impact

- **Epic 3 (membership):** can still complete, with three new stories (3.15, 3.16, 3.17) and 3.13 reshaped. 3.14 (lock-in producer) is
  unchanged in shape; under the switch, `lock_in_entered` comes from submission, ⛔ payment.
- **Epic 6 (claims):** 6.38's door and 6.39's membership check need a switch-aware fee half (inside 3.17 — ⛔ a new Epic-6 story), and the
  door's `not_paid` words become wrong for a free member (they are never in `pending-fee` once submitted — see 3.17).
- **Epic 13 (field workers):** 13.3 (worker app + login) becomes a hard prerequisite of change 2; 13.8 is NARROWED (the field-worker code
  at signup moves to 3.15; 13.8 keeps the member-invite deep link and adopter chain); new 13.9 (assisted draft); 13.5's "qualified
  acquisition" (PRD FR-84: KYC + ₹110 paid + first contribution) needs a rule when the fee is optional — a question inside the fee note.
- **No epic becomes obsolete; no new epic.** Order changes: governance first, then 3.15 (independent), then 3.16 → 3.13 → 3.14, then 3.17,
  then 13.3 → 13.9.

### 2.3 Artifact conflicts

- **PRD:** FR-1 (*"mandatory ₹110"*), FR-1A (*"First-time signup is mandatory-upfront"*), FR-2 (*"KYC fields are entered manually"*), the
  FR-1 consequence *"Reference Code field accepts …"*, FR-53 / FR-84 (field-worker app; commission gated on ₹110 paid). Edits in §4.3.
- **Architecture:** a new KYC-document storage adapter (Tier-1 handling, signed reads, deletion); field-worker identity and login
  (ARCH §2.3 — email + password + passkey for "Vikram-class" dispatch, per 13.1 C1); a new member event + reducer arm for "submitted
  without payment" (under the switch) — a member-state change, so the `member-state-invariant` gate and the AI-10-1 Policy-meaning note
  apply.
- **UX:** signup wizard order (`apps/mobile/lib/wizard-steps.ts`: `tc → kyc → workplace → nominees → medical → whatsapp → payment`) gains
  an "assisted?" step, the upload screens (camera for PAN / Aadhaar / selfie), a review-a-draft entry, and — switch on — "Continue without
  paying". The field-worker app is new (13.3).
- **Legal / counsel (⛔ the Panel's):** DPDP s.6(1) (consent — settled by BigDev: member ticks); Aadhaar Act s.8A(4)(b) and the 2021
  regulations (masking before storing; reg 16A(3) storage *with consent*) — how a masked copy is guaranteed; the field worker as a data
  processor (DPDP s.8(2) needs a valid contract); erasure of an abandoned draft (DPDP s.8(7)). Counsel is engaged but ⛔ asked these.
- **Other:** a feature-flag / switch registry entry (the `kyc_manual_fallback` precedent, `manual-fallback-seam.ts`); retention job for
  documents and drafts; CI fences that enumerate member events and reach-fence for `attributionCode` (3.15 calls the 13.2 door — the fence
  allow-lists callers).

### 2.4 Technical risk

- **Masking a photographed Aadhaar is hard to guarantee.** Blanking the first 8 digits on the phone needs the digits found in the image
  (on-device text recognition); accepting only UIDAI's masked download relies on the member choosing it. If an unmasked copy is uploaded,
  the Trust has already stored a full number. ⇒ 3.16 opens with a spike, and staff review must be able to reject and destroy an unmasked
  copy at once. Recorded as the top risk.
- **The fee switch changes the member state machine** (a second way into `lock-in`) and four existing behaviours (door, 6.39 fee half,
  renewal, commission). Behind a switch that stays off, nothing changes until the ruling.

---

## 3. Recommended approach

**Option 1 — Direct adjustment, governance first** (selected). New stories inside Epics 3 and 13, 3.13 reshaped, three Panel notes and one
counsel list BEFORE any code; each story built on the side the Panel has already ruled (or behind a switch that stays off).
- *Option 2 (rollback):* ⛔ viable / ⛔ needed — nothing is live and nothing built conflicts that cannot be extended.
- *Option 3 (MVP review):* ⛔ needed — the MVP is not reduced; the fee change is a launch-policy switch.

**Effort:** Medium-High overall (3.15 Low; 3.16 Medium-High incl. the masking spike; 3.17 Medium; 13.3 High; 13.9 Medium).
**Risk:** Medium (masking; state-machine change) — mitigated by the switch and by building nothing the Panel has not ruled.
**Timeline:** 3.15 can start at once; 3.16 / 3.13 wait on the follow-up note's ruling for go-live only (build may proceed on the upload
route with storage behind a switch); 3.17 builds now and turns on after its ruling; 13.9 waits on 13.3.

---

## 4. Detailed change proposals

### 4.1 `sprint-status.yaml` — new rows (all `backlog`) and dated comments

```yaml
  # 2026-11-21 (sprint-change-proposal-2026-11-21-registration, BigDev): three rows for how a person registers.
  3-15-assisted-signup-field-worker-code: backlog
  # "Have you been assisted?" Yes -> the field worker's 6-digit code, resolved to the worker through the 13.2 door; replaces the
  # payment step's free-text Reference Code for field-worker codes. FR-85 (acceptsNewAttributions) + -454 Q6 C (held credit) apply.
  # Never blocks a signup. Takes 13.8's C2/C4 for 6-digit codes only. ⛔ Panel question.
  3-16-document-upload-identity-when-digilocker-unavailable: backlog
  # Replaces the typed-in route: PAN + masked Aadhaar (last 4) + a selfie, uploaded to a KYC-document store; consent to storage;
  # retention; staff can view for 3.13. Opens with a masking spike. Go-live waits on the 3.13 follow-up note's ruling.
  3-17-joining-and-renewal-fee-optional-switch: backlog
  # A per-Pariwar switch, default "fee required" (today's ruled state). When ON: payment skippable; final submission enters lock-in
  # (15 days); renewal never graces; the door lets a submitted non-payer's claim in; 6.39's fee half becomes a submission-date check.
  # Replaces -424 Q1 (b), -430 Q1, -473 Q1 => the switch is turned on ONLY after the Panel rules. AI-10-1 Policy meaning owed.
  13-9-field-worker-assisted-registration-draft: backlog
  # The worker fills a DRAFT (details, PAN, masked Aadhaar, selfie in-app); the person logs in on their own phone, reviews, ticks
  # terms / declaration / health declaration themselves, pays (or not, 3.17), submits. Needs 13.3. Panel + counsel questions.
```
Dated comments (⛔ edits) on rows `3-13-…` (*"reshaped by the 2026-11-21 registration proposal: staff check uploaded documents + selfie;
follow-up Panel note owed before the ruling"*), `13-3-…` (*"prerequisite of 13-9"*), `13-8-…` (*"6-digit field-worker codes at signup
moved to 3-15; this row keeps the invite deep link and adopter chain"*), `13-5-…` (*"qualified acquisition when the fee is optional — the
3-17 Panel note asks"*).

### 4.2 `epics.md` — new story blocks (brief; each story's create-story writes the full file)

**Story 3.15: "Have You Been Assisted?" — A Field Worker's Code at Signup** `[SURFACE]`
As a person signing up whom a field worker helped, I want to say so and enter their code, so that the worker is credited.
- A wizard step after `tc`: *"Did someone help you register?"* Yes → a 6-digit code box; No → continue. ⛔ blocks signup; a code that
  does not resolve is refused with a retry and a "continue without" choice.
- The code resolves through `readAttributionCode…` / `resolveAttributionForRequest` (13.2's door — the Pariwar from the session, ⛔ body);
  FR-85 `acceptsNewAttributions`; `-454` Q6 C held credit for a worker `under_review`.
- The payment step's free-text Reference Code box is removed for 6-digit codes (adopter usernames stay 13.8's).
- ⛔ worker's name or number shown to the person (a disclosure — out of scope).

**Story 3.16: Upload PAN, a Masked Aadhaar and a Selfie When DigiLocker Is Unavailable** `[PRIMITIVE]` `[SURFACE]`
- Replaces `POST /member/kyc/manual`: PAN photo, masked-Aadhaar photo (last 4 visible), a selfie — in-app camera, ⛔ gallery copy.
- A new `kyc-document-storage` adapter (the GCS per-purpose pattern), Tier-1 object references, signed short-lived reads, audited.
- Storage consent shown and recorded before upload (Aadhaar regs 2021 reg 16A(3)); retention and deletion per the Panel's ruling.
- Task 0 spike: can the app reliably blank the first 8 digits? If not, accept only the UIDAI masked download and let staff reject +
  destroy an unmasked copy immediately (a recorded act).
- `verification_strength` gains a value for document-checked identities (enum mint delegated — `-210` cl.2).

**Story 3.17: The Joining and Renewal Fee Can Be Made Optional — a Switch That Stays Off Until the Panel Rules** `[PRIMITIVE]`
- A per-Pariwar switch (flag registry), default OFF = today's behaviour exactly.
- ON: payment step offers "Continue without paying"; final submission emits a new event that moves `pending-fee → lock-in` (the 15-day
  clock from submission); the 5-condition lock-in gate (`member/lock-in-gate.ts`) still requires terms, nominees, medical, KYC.
- ON: renewal scheduler emits ⛔ grace for non-renewal; the door admits a submitted member; 6.39's fee half for a member with no receipt
  becomes "submitted before the date of death" (keeps `-430`'s purpose); `claim_membership_checks.fee_receipt_id` made nullable with a
  CHECK tying it to the outcome.
- Paying voluntarily stays possible at any time.
- Policy-meaning note (AI-10-1) mandatory: it changes who is covered.

**Story 13.9: A Field Worker Starts a Registration; the Person Reviews and Submits It** `[SURFACE]`
- Needs 13.3 (worker login + app). The worker enters the person's mobile, details, workplace, nominees and health answers, and captures
  PAN / masked Aadhaar / selfie in-app; saved as a DRAFT keyed to the mobile and Pariwar, with the worker's code attached.
- The person logs in with the one-time code on their own phone, sees *who* started it, reviews and edits every section, ticks terms,
  declaration and health declaration themselves (⛔ pre-ticked), WhatsApp optional and unticked, pays (or not, 3.17), presses Submit.
- The worker can ⛔ submit, and after submission sees only the qualification status (FR-53).
- An unsubmitted draft and its documents are deleted after a fixed period (the Panel's question; proposed 30 days).

Annotations (⛔ rewrites) on 3.13, 13.3, 13.5, 13.8 as in §4.1.

### 4.3 PRD (`prds/prd-TWT-2026-05-22/prd.md`)

**FR-2 — OLD:** *"When unavailable (provider down, member chooses to defer), KYC fields are entered manually and the member becomes
`pending-valid` until trustee validation."*
**NEW:** *"When unavailable (provider down, member chooses to defer), the member uploads a photo of their PAN card, a masked Aadhaar (last
four digits only — the Trust never stores a full Aadhaar number) and a selfie; staff check them, and the member becomes `pending-valid`
until that check (Story 3.13). [2026-11-21 registration proposal.]"*
*Rationale:* change 1; the "trustee-action queue" consequence stands.

**FR-1 consequence — OLD:** *"Reference Code field accepts: 6-digit numeric (field-worker), or member username/eHRMS (adopter), or empty
(organic)."* **NEW:** *"Signup asks 'Did someone help you register?' — Yes takes a 6-digit field-worker code (Story 3.15); a member-invite
username/eHRMS is captured by Story 13.8; neither → `organic`. A registration a field worker started carries their code automatically
(Story 13.9)."*

**FR-1 / FR-1A — ⛔ text edit; a NOTE added:** *"⏳ 2026-11-21: BigDev proposes the joining and renewal fee be OPTIONAL until the Panel
makes it mandatory (Story 3.17, a switch that stays off). Until the Panel rules, the fee stays mandatory as written."* (⛔ rewriting a
mandatory rule into an optional one before the ruling — [[feedback_supersede_never_reinterpret]].)

**FR-53 — add:** *"A field worker can start a member's registration as a draft (Story 13.9) but can never submit it; the person reviews,
consents and submits on their own phone."* **FR-84:** a note that qualification with an optional fee is put to the Panel.

### 4.4 Story 3.13 (in-flight, v1.3)

- Its Panel note was SENT today; the upload option changes Q1 ⇒ a short **follow-up note** (§4.5 N1), sent before the Panel rules.
- After that ruling: DL7 gains `evidence_kind = uploaded_documents`; N5 ("⛔ document image is stored") is replaced by 3.16's storage
  rules; DL8 shows the uploaded images (audited); Q3 (the phone number) may become moot if documents are checked remotely. Recorded by a
  re-validate of 3.13 — ⛔ edited before the ruling.

### 4.5 Governance to write (after this proposal is approved — each from the routing-note TEMPLATE, committed alone)

- **N1 — Follow-up to the 3.13 note (URGENT, before it is ruled):** "We have one more option for Q1: the member uploads a PAN, a masked
  Aadhaar and a selfie, and staff check them without a meeting. And: how long are those copies kept?" — honest costs: the Trust then holds
  copies of ID documents (a breach exposure); a masked copy cannot always be guaranteed.
- **N2 — The fee:** "May the joining and renewal fee be optional for now?" — replaces `-424` Q1 (b), `-430` Q1, `-473` Q1; with: lock-in
  from submission; the submission-date check replacing the fee-date check; what happens to members who joined free if the fee later
  becomes mandatory; field-worker commission when the fee is not paid (FR-84). Cost: the fee funds Trust operations (PRD: *"it funds trust
  operations"*); a free member who never contributes; the Niyamavali's §2.1 (c) / §2.2 need the Board's amendment.
- **N3 — Field-worker drafts:** "May a field worker collect a person's ID documents, nominees and health answers before that person has
  agreed to anything? How long is an unsubmitted draft kept? Is the person told who started it?"
- **Counsel list (BigDev sends):** the field worker as a data processor (contract); guaranteeing an Aadhaar copy is masked and reg 16A
  storage consent; erasing an abandoned draft; whether a fee-free membership changes anything in the Trust's legal footing.
- **Decision-log:** one author-commit recording this proposal's build decisions (BigDev's answers above), committed alone.

### 4.6 Niyamavali

⛔ edited. A dated line in `deferred-work.md`: §2.1 (c) and §2.2 conflict with an optional fee; amendment is the Board's (Deed Clause
20(a)) and follows the Panel's ruling on N2.

---

## 5. Implementation handoff

**Scope:** Moderate — backlog reorganisation + Panel routing; ⛔ fundamental replan.

| Who | Does |
|---|---|
| BigDev | Approves this proposal; sends N1 (first), N2, N3 to the Panel and the counsel list; relays rulings. |
| Session (correct-course, on approval) | Writes §4.1 rows + comments, §4.2 epic blocks, §4.3 PRD edits, §4.6 deferred-work line, the author-commit; then N1–N3 from the template, each committed alone. |
| `bmad-create-story` per row | 3.15 first (no Panel question); then 3.16, 3.17, 13.9 (13.9 after 13.3). Each applies the §0 gate and the AI-10-1 note. |
| `bmad-create-story validate 3.13` | After N1 is ruled. |
| `bmad-dev-story` | Builds each on the ruled side; the fee switch ships OFF. |

**Success criteria:** the four rows and the epic blocks exist; N1 reaches the Panel before it rules on the sent note; ⛔ code reads an
optional fee until the Panel rules; the first build (3.15) lands with the field-worker code resolved and credited; nothing stores a full
Aadhaar number; every consent box is ticked by the member.

**Checklist status:** 1.1–1.3 ✅ · 2.1–2.5 ✅ · 3.1–3.4 ✅ (counsel ⚠ action-needed) · 4.1 ✅ viable · 4.2 ⛔ viable · 4.3 ⛔ needed · 4.4 ✅
Option 1 · 5.1–5.5 ✅ · 6.1–6.2 ✅ · 6.3 ⏳ approval · 6.4 ⏳ on approval · 6.5 ⏳.
