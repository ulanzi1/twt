# Epic 11b Consent Model + DPDPA Clearance — Trustee / Counsel Consent Sheet (2026-08-28)

**Status:** ✅ **SESSION ATTESTED 2026-08-28 — quorate; counsel signed Part A; the Panel ruled all
eight Part B rows and confirmed the transcription faithful.** ⭐ Part A's boxes are counsel's own and
Part B's are the Panel's; ⛔ **nothing was overwritten.** ⚠ **ONE ROW DIVERGED from the transcription
and the divergence is the point: Row 1 was ruled (b) *supersede wholly*, ⛔ not the (a) BigDev had
transcribed** — caught on review, put back to the Panel, and **clarified in an appended annotation**
rather than resolved by the author. Two post-session annotations **appended** — Row 1 (clarified) and
the Session Resolution table (**derived**, ⛔ not separately attested). Logged as Decision
`2026-08-28-160`.

> ⭐ **The sheet did its job.** It was raised specifically because a sitting had produced rulings with
> no attestation — and on the way to closing that gap it caught a **material mis-transcription** of a
> supersession's scope. ⛔ Had `2026-08-28-160` been committed on the transcription alone, the
> permanent record would have said **narrowly** where the Panel ruled **wholly**.

**Purpose:** capture, over signature, the attestations for a sitting that **lifted a counsel hold
across three public surfaces**, **superseded a ratified decision**, and **de-authorised a consent
gate in merged code** — none of which currently carries a single initial.

**Counsel:** Adv. Mohit Agrawal (`lc-1`, `counsel-roster.md` § Reconstructed engagement record)
**Trustee Panel (≥2-trustee quorum required to rule Part B):** Dhiraj Rahul (Trustee 1) · Kalpana Bharti (Trustee 2)
**Prepared by:** BigDev (Solo Builder)
**Authority:** Decisions `2026-08-23-154` (C-5) · `2026-08-24-155` · `2026-08-24-156` cl.2 ·
`2026-08-24-157` cl.2 + cl.3 · `2026-08-24-159` D1/D4(b) · `engagement-letter-template.md` §14 step 5 ·
`review-scope-charter.md` §1(a) + §1(b).

> ### ⛔ What this sheet is NOT
>
> **It is not a record of consent — yet.** The Session Resolution is **blank** and stays blank until
> real initials and a real signature land. This project has already filed one correction — Decision
> `2026-08-12-101` — because an entry claimed *"CONFIRMED by the Trustee Panel"* with no session in
> the record. ⛔ **Do not fill any box on anyone's behalf**, least of all counsel's
> ([[feedback_record_unattested_no_backfill]]).
>
> **It is not a re-opening of the rulings.** The sitting happened and the rulings were given. This
> sheet asks the Panel and counsel to **confirm the transcription is faithful** — and to **correct it
> where it is not**. ⚠ A correction here is expected and cheap; a silent divergence between this
> sheet and `2026-08-28-160` is the failure mode to avoid.
>
> **It is not a re-litigation of `2026-08-24-157` cl.3.** Counsel's 2026-08-24 basis (*"Member Consent
> of Term of service of TWT"*) was **rejected on three objections** and ⛔ stays rejected. The
> clearance below rests on a **different instrument**. ⛔ Nobody may later cite this sheet as evidence
> that the original basis was accepted after all ([[feedback_supersede_never_reinterpret]]).
>
> **It does not touch launch-gate Rows 8 / 9 / 10.** Those remain `open` and wait on counsel returns
> that have not happened.

---

## ⚠ Read-first — three things that change how you read every row

### 1. ⛔ This sheet is being raised BACKWARDS, and that is the defect it exists to close

The normal order is: raise the sheet → hold the session → record what was ruled. **This sitting
inverted it.** Rulings were given across nine subjects — including a DPDPA clearance and a
supersession — with **no sheet, no initials and no signature captured at any point.**

⇒ ⭐ **For the moment, `2026-08-28-160` is the sole record of that sitting, and it is un-attested by
its own admission.** ⛔ That is not a bookkeeping nicety: `2026-08-24-157` cl.3 **held** a clearance
precisely because its basis could not be evidenced, and this sitting **lifts** that hold. A lift with
weaker attestation than the hold is a record that will not survive scrutiny later.

### 2. What the lift actually authorises — and ⛔ one surface is already merged

| Surface | Story | State | What the clearance reaches |
|---|---|---|---|
| **Sahyog Drive** | 11b.1 | ⭐ **`done`, merged to `origin/main` 2026-08-27** (`efefa55`) | The **deceased member's name** on an unauthenticated public page |
| **Sahyog Vivran** | 11b.3 | `backlog` | **Nominee bank details** on a public page (Part B Row 5) |
| **In Memoriam** | 11b.6 | `backlog` | Deceased members and their families |

⚠⛔ **`2026-08-24-157` cl.3's stated justification had already lapsed when this sitting opened.** It
read: *"Held costs nothing today: all three surfaces are unbuilt and Epic 11b is `backlog`."* ⛔ **11b.1
shipped the day before.** The hold was being carried on a premise that was no longer true.

⭐ **Nothing is publicly exposed today** — the code is **not in production**, and per `2026-08-24-159`
D1 what keeps `/sahyog` dark is **deployment plus this process**, ⛔ **not** a code mechanism. ⛔ The
kill switch may ⛔ not be cited as this surface's technical launch gate.

### 3. The consent gate being de-authorised is **live, merged code** — not a design sketch

`sahyog_drive_publication` is not a spare part. It is **the mechanism that currently decides whether
a deceased member's name renders at all**: captured as **box (d)** on the claim consent screen
(`apps/mobile/app/(claim)/consent.tsx`), read by the render gate
(`packages/domain/src/pool/public-read.ts:116`), and shipped by `2026-08-24-159` D4(b) as
**"declinable and revocable."**

⇒ Part B Rows 3 and 4 **remove the family's tick-box as the authority** and **remove the family's
decline path for the member's own name.** ⚠ That is a **deliberate reversal** of a shipped behaviour,
and it is put on this sheet expressly so it is ruled rather than absorbed.

---

# PART A — for **COUNSEL** to attest

> ⛔ **To be completed by Adv. Mohit Agrawal, in his own hand or over his own signature.** ⛔ These are
> facts and positions only counsel can supply; a trustee ⛔ may not attest them on his behalf.
> ⚠ Counsel identity fields are **need-to-know per NDA** (`counsel-roster.md` header note).

## A1 — Lifting the `2026-08-24-157` cl.3 hold

| # | Question | Attestation |
|---|---|---|
| **A1.1** | Do you **lift the hold** on A3.2 / A3.3 and clear the DPDPA posture for **all three** Epic 11b surfaces — **11b.1**, **11b.3**, **11b.6**? | Lifted, all three |
| **A1.2** | Do you confirm the basis is the **member's own acceptance of a versioned T&C containing an express post-death-publication clause** — and ⛔ **not** the ToS basis rejected at `-157` cl.3? | Confirmed — new basis |
| **A1.3** | Do you confirm that basis reaches **publication of the member's own name after death**, the member's acceptance surviving their death as a matter of contract? | Confirmed |
| **A1.4** | Do you confirm that **nominee-owned** information (11b.3 bank details) rests on the **nominee's own Claim Terms acceptance**, ⛔ separately from A1.3? | Confirmed |
| **A1.5** | Do you adopt the `2026-06-21-057` cl.5 **scope fence** for this clearance — it covers the **posture as described**, and a new **data class / subject population / recipient** re-opens the review? | Adopted |

> ⚠ **A1.1 is the row that matters.** It is the only place counsel can lift his own hold. ⛔ A Panel
> ruling cannot lift it, and ⛔ this sheet's Part B does not attempt to.

## A2 — The T&C clause counsel is to draft

| # | Question | Attestation |
|---|---|---|
| **A2.1** | Will the **post-death-publication clause** be drafted into your **T&C return** (priority-1, `review-scope-charter.md` §1(a); return due **2026-09-07**, earliest 2026-08-31)? | Yes — in the T&C return |
| **A2.2** | Do you accept development proceeding on the wording *"as deemed necessary by the Trust for smooth functioning"*, with **DPDPA alignment of the final pre-launch T&C version**? | Accepted, alignment pre-launch |
| **A2.3** | Do you confirm you **prepare the physical T&C document** that each member signs **within 90 days of joining**? | Confirmed |

> ⛔ **A2.2 is ⛔ not an opinion that the present wording is DPDPA-compliant** — it is agreement to
> proceed and align later. ⚠ Nobody has assessed the present wording, and this box does ⛔ not record
> that anyone has ([[feedback_closure_language_precision]]).

## A3 — Engagement instruments — closing `2026-08-24-157` cl.2

| # | Item | Attestation |
|---|---|---|
| **A3.1** | The **engagement letter** is held in a **bank locker**, and the **locator is deliberately withheld** from the repository. |  Confirmed — custody attested, locator withheld |
| **A3.2** | **NDA** (`engagement-letter-template.md` §7) — executed 2026-06-21. ⚠ *The box on the 2026-08-24 sheet (`:137`) was left unticked; only a date was written.* | Signed — date _2026-06-21__ |
| **A3.3** | **COI disclosure filed** (§6) — executed 2026-06-21. ⚠ *Same: `:139` unticked, date only.* | Filed — date _2026-06-21_ |

> ⭐ **A3.2 / A3.3 exist only to close a two-line loose end.** They were attested by date on
> 2026-08-24 but their checkboxes were never marked, so the record reads *asserted, ⛔ not as marked*
> (`:149–150`). ⛔ Ticking them here is ⛔ not a new attestation — it is completing an old one.
>
> ⚠ **A3.1 has a consequence for the framework, not for counsel:** `engagement-letter-template.md`
> **§14 step 5** requires a storage **reference path**. If the Panel rules the locator withheld
> (Part B Row 7), **§14 step 5 owes an amendment** to accept *"custody attested, locator withheld"*
> as a complete state — otherwise this row is re-raised as outstanding at every future
> reconciliation ([[feedback_niyamavali_rulebook_not_spec]]).

> ✅ **⛔ NOT ASKED AGAIN — already discharged.** Professional-indemnity insurance
> (**New India Assurance · ₹50 lakh · expiry 2027-08-01**) was supplied **2026-08-24** and recorded at
> `trustee-consent-sheet-2026-08-24-counsel-engagement-verification.md` **:115–116**; `-157` cl.1(e)
> is **DISCHARGED** and counsel is **FULLY VERIFIED**. ⚠ `-157`'s own *Open follow-ups* list is
> **stale** on this point and was wrongly raised as open at the 2026-08-28 sitting; the correction is
> recorded at `2026-08-28-160` cl.1. ⚠ **Renewal note only:** cover expires **2027-08-01**; a
> 12-month term from 2026-06-21 closes 2027-06-21, so cover spans the term — ⛔ any extension crosses
> the expiry.

**Counsel signature (Part A):** ___Mohit__  **Date:** __2026-08-28__

---

# PART B — for the **TRUSTEE PANEL** to rule

> ⛔ **≥2-trustee quorum required.** ⚠ Part B Rows 1–4 depend on Part A: if A1.1 is **held**, they are
> ⛔ not ruled.

### Row 1 — Supersede `2026-08-23-154` C-5, narrowly?

**The question.** C-5 held **two levers, neither discharging the other**: the publication kill switch
**plus** each surface's own per-subject consent gate. The new model makes the member's T&C acceptance
the basis for their own name — which C-5 forbids.

| | Option |
|---|---|
| **(a)** | **Supersede narrowly** — for **publication of the deceased member's own name only**. ⛔ C-5 stands for every other data class, including family- and nominee-owned information. |
| **(b)** | **Supersede wholly** — ToS/T&C acceptance suffices across all data classes on all three surfaces. |
| **(c)** | **Do not supersede** — keep both levers; the T&C clause becomes an additional basis, ⛔ not a replacement. |

⚠ **Bearing on this:** (b) would reach **nominee bank details** and **family-owned information**,
neither of which the member's own T&C can speak for. ⛔ *BigDev transcribed the sitting as ruling (a).*

**Decision:** Ruled as: __(b) Supersede Wholly__ **Conditions:** ___None_______

> ⭐⭐ **POST-SESSION ANNOTATION APPENDED 2026-08-28 — ⛔ the ruling above is left exactly as marked.**
> ⚠ *(b)* as drafted read *"ToS/T&C acceptance suffices across all data classes"*, which on its face
> conflicted with **A1.4** (counsel-attested: nominee bank details rest on the nominee's own Claim
> Terms, **separately**), with **Row 4(a)** (*"family/nominee consent remains fully applicable to
> family/nominee-owned information"*) and with **Row 5**. ⛔ Put back to the Panel rather than resolved
> by the author.
>
> ⭐ **THE PANEL'S CLARIFICATION, AS GIVEN:** *"C-5 is superseded wholly. This removes the requirement
> for a separate per-subject consent gate as a second lever across the three 11b surfaces. This does
> not mean that the member's T&C acceptance authorises every person's data. The applicable
> legal/consent basis remains **data-class specific**: member's own name/PII → member's T&C
> acceptance; nominee information and bank details → nominee's own Claim Terms acceptance;
> family-owned information → family's own consent. **A1.4, Row 4(a), and Row 5 therefore remain in
> force and are not superseded.** C-5's two-lever requirement is superseded **only as a governance
> mechanism**; the separate basis for nominee/family-owned information remains unchanged."*
>
> ⇒ ⭐ **What is superseded is the MECHANISM, ⛔ not the per-data-class BASIS.** ⛔ Nobody may cite
> Row 1(b) as authority that a member's T&C reaches nominee or family data — the sheet says the
> opposite in three places, and the Panel confirmed it in terms
> ([[feedback_supersede_never_reinterpret]]).

| Data class | Basis after this ruling | Per-subject consent gate required? |
|---|---|---|
| Member's own name / PII | **Member's T&C acceptance** (with the express post-death clause) | ⛔ No |
| Nominee information + bank details | **Nominee's own Claim Terms acceptance** | ⛔ No |
| Family-owned information | **The family's own consent** | ⛔ No |

---

### Row 2 — Adopt the six-element consent model?

| | Element |
|---|---|
| (a) | **T&C acceptance is sufficient** as the member's basis for post-death publication of their own name. |
| (b) | The membership T&C **must expressly state** post-death publication is permitted. ⛔ Absent the clause in the accepted version, the basis does ⛔ not exist. |
| (c) | Acceptance is **formal**: review/scroll-through → accept with **digital signature** → **T&C version + date/time recorded against the member**. |
| (d) | ⛔ **No separate `sahyog_drive_publication` gate is required** for the member's own name where the accepted T&C version carries the clause. |
| (e) | The **kill switch remains** — an **emergency operational control**, ⛔ **not** a consent mechanism; it turns publication off irrespective of member authorisation. |
| (f) | A **physical document** prepared by counsel is signed by the member **within 90 days of joining**. |

**Decision:** Adopted as a unit
---

### Row 3 — `sahyog_drive_publication`: preserve or delete?

**The question.** C-5's supersession makes the gate non-authoritative for the member's own name. It
does ⛔ not follow that the type, the migration or the existing rows should be destroyed.

| | Option |
|---|---|
| **(a)** | **Preserve records + infrastructure; remove the authority.** The family tick-box leaves the active publication decision; existing rows become **historical / unused**. Deletion requires a **separate** decision finding no remaining purpose. |
| **(b)** | **Delete** the consent type, migration 0112 and the existing rows as dead weight. |
| **(c)** | **Preserve and keep it authoritative** as a second lever alongside the T&C basis. |

⛔ **"Keep the code" does ⛔ not mean "keep the old behaviour."** Under (a) the old behaviour —
*family tick-box → name visible/hidden* — **stops being authoritative** and becomes
*member's accepted T&C → name publication*. ⛔ *BigDev transcribed the sitting as ruling (a).*

**Decision:** Ruled as: ___(a)___ **Conditions:** ___None___

---

### Row 4 — Does the family keep a veto over the member's own name?

**The question.** Story 11b.1 shipped the gate as **"declinable and revocable"** (`-159` D4(b)). Under
the new model the member consented in their own lifetime.

| | Option |
|---|---|
| **(a)** | ⛔ **No family veto.** The member's own prior T&C acceptance is the basis; the family does ⛔ not get a separate veto over the member's own name. Family/nominee consent remains fully applicable to **family/nominee-owned** information. |
| **(b)** | **Family veto retained** as an override on the member's own name. |

⚠ **This is a deliberate reversal of shipped behaviour, ⛔ not an omission.** Under (a) a later reader
must ⛔ not restore the decline path as a "missing feature." ⛔ *BigDev transcribed the sitting as
ruling (a).*

**Decision:** Ruled as: __(a)__ **Conditions:** ___None________

---

### Row 5 — Story 11b.3 public bank-detail presentation policy

> ⚠⛔ **FRAMING, AS THE PANEL GAVE IT.** The Panel does ⛔ **not** treat public bank details as an
> automatic reason to prohibit publication, and the transparency benefit during an active Sahyog
> Drive is **accepted**. ⛔ This must ⛔ not be written up as *"consent makes it lawful but not safe"*,
> ⛔ nor as a claim that a name plus bank details by itself enables banking fraud. ⭐ The concern is
> the **broader public exposure / security posture** and the **ability to reduce it as TWT grows**.

| | Element | Ruling |
|---|---|---|
| (a) | **During an active campaign:** complete nominee bank details **may** be publicly displayed under the Trustee-approved presentation mode. | Yes |
| (b) | **After closure:** ⛔ **no hard-coded immediate masking.** Trust Admin holds fine control. | Yes |
| (c) | **The knob:** Trust-Admin controlled, **per Pariwar**, from campaign **closure/settlement** — **0 days** / **N days** / **permanent**; **reversible and re-configurable**. | Yes |
| (d) | **Masked public projection, defined in the story ⛔ not left to implementation:** **last 4 digits** + **bank / branch / IFSC** for verification. ⛔ The complete account number is **NOT** exposed after masking. | Yes |
| (e) | ⛔ **Public-presentation control, ⛔ NOT member-access control** — it must ⛔ not prevent a **suspended** member from accessing what is needed to contribute and regain active status. | Yes |
| (f) | **Complete bank details remain in the protected internal record.** | Yes |
| (g) | ⭐ **Future-proofing is load-bearing:** full disclosure → shorter exposure → immediate masking → permanent masked, ⛔ **without redesigning the bank-detail record** and ⛔ without a schema change. | Yes |

⚠ **On (g):** this makes the policy **configuration over one record** — ⛔ never a second record,
⛔ never a boolean. A later "simplification" to a boolean is a **defect, not a cleanup**, and the
story must say so.

**Decision:** Adopted in full 

---

### Row 6 — The 90-day physical document: what happens at day 91?

| | Option |
|---|---|
| **(a)** | **Track and chase, ⛔ no punitive effect.** The **digital acceptance remains operative**. Mark outstanding, raise a follow-up. ⛔ Do **not** auto-suspend membership, ⛔ do **not** invalidate the T&C acceptance, ⛔ do **not** stop publication solely for a missing physical copy. |
| **(b)** | Publication stops until the physical copy is returned. |
| **(c)** | Membership state changes (suspension or equivalent). |

⛔ *BigDev transcribed the sitting as ruling (a).*

**Decision:** Ruled as: __(a)__ **Conditions:** ____None___

---

### Row 7 — The §14 step 5 locator: withheld by ruling?

**The question.** Counsel holds the engagement letter in a bank locker (A3.1). The Panel and counsel
have decided the actual location stays out of the agent-accessible repository.

| | Option |
|---|---|
| **(a)** | **Withheld by ruling.** Custody is **attested**, the locator is **deliberately withheld**; `-157` cl.2 is **discharged by declination** and ⛔ must ⛔ not be re-raised as outstanding. **`engagement-letter-template.md` §14 step 5 is amended** to accept *"custody attested, locator withheld"* as a complete state. |
| **(b)** | The locator remains **owed**; the row stays open. |

⚠ Under (a) the amendment is **required, not optional** — an unamended §14 step 5 keeps demanding
what the Panel has ruled it will not supply, and the row regenerates forever.

**Decision:** Ruled as: ____(a)______ **Amendment authorised:** Yes

---

### Row 8 — Development routing: does the new model ship now or go to v2?

**The question.** The Panel offered to postpone the new model to v2 *"if it requires too much
effort."* ⭐ Sized against the substrate, most of it **already exists**: the T&C accept route
(`apps/api/src/modules/terms/member-terms.routes.ts:43`) already records a `tc_acceptance` consent
carrying the `tcVersionId`; `lock-in-gate.ts` already makes it a signup requirement; and
`terms_and_conditions_pinned_clauses` already maps a T&C version to its pinned clauses behind a real
FK. ⇒ *"did this member accept a T&C version containing the clause?"* is an **existing join over
existing tables** — ⛔ no new substrate, ⛔ no migration.

| | Option |
|---|---|
| **(a)** | **Split.** Ship the **authority switch now** (small; merged code currently reads the **wrong** authority). Defer **scroll-through**, **digital signature** and **90-day tracking** to **v2 / pre-launch**. |
| **(b)** | **All to v2** — leave the shipped gate authoritative in the interim. |
| **(c)** | **All now**, including the ceremony. |

⚠⛔ **THE TRAP, STATED SO NOBODY DEBUGS IT AS A BUG:** if the authority switch ships **before** the
clause is pinned into an **effective** T&C version, the predicate reads **false for every member** and
⛔ **no names render at all**. ⭐ Fail-closed and therefore safe — but the surface is **inert** until
counsel's clause lands **and is pinned**.

⭐ Deferral is safe **because the code is not in production and no members exist** — so there is ⛔ no
re-consent migration, provided every member who ever joins accepts a T&C version already carrying the
clause.

**Decision:** Ruled as: __(a)___ **Conditions:** __None__
---

## Session Resolution

> ⛔ **BLANK BY CONSTRUCTION.** Filled only from what is actually confirmed at a real, quorate
> session, and ⛔ never in advance. ⛔ Part B Rows 1–4 may ⛔ not be ruled before Part A returns.

Quorum met: Yes (≥2 trustees present) 

Part A returned by counsel:  Yes — date __2026-08-28________  
Transcription confirmed faithful: Yes, as written 

> ⚠ **THIS TABLE IS DERIVED, ⛔ NOT SEPARATELY ATTESTED.** Transcribed by BigDev 2026-08-28 from the
> **signed per-row boxes above**, which remain the authoritative record. ⛔ No ruling here originates
> in this table; where the two ever disagree, **the per-row box governs**.

| Row | Question | Decision | Conditions / amendments |
|---|---|---|---|
| 1 | C-5 supersession scope | ☑ **Ruled — (b) supersede WHOLLY** | ⭐ **Clarified post-session:** the **two-lever MECHANISM** is superseded across all three surfaces — ⛔ **not** the per-data-class basis. Member's own name/PII → member's T&C; nominee info + bank → **nominee's own Claim Terms**; family-owned info → **the family's own consent**. **A1.4, Row 4(a) and Row 5 remain in force.** ⛔ May ⛔ not be cited as authority that a member's T&C reaches another person's data. |
| 2 | Six-element consent model | ☑ **Adopted as a unit** | All six elements (a)–(f), including formal acceptance (scroll-through + digital signature + version/timestamp) and the counsel-prepared 90-day physical document. |
| 3 | `sahyog_drive_publication` disposition | ☑ **Ruled — (a) preserve, de-authorise** | Records, type and migration **0112 PRESERVED**; the family tick-box **leaves the active publication decision**; existing rows become **historical / unused**. ⛔ Deletion requires a **separate** decision. |
| 4 | Family veto over the member's own name | ☑ **Ruled — (a) no family veto** | ⚠ A **deliberate reversal** of 11b.1's shipped *"declinable and revocable"* gate (`-159` D4(b)). ⛔ Not to be restored later as a "missing feature." Family/nominee consent stays fully applicable to family/nominee-owned information. |
| 5 | 11b.3 presentation policy | ☑ **Adopted in full** | All seven elements (a)–(g) ruled **Yes**. Per-Pariwar Trust-Admin knob (0 / N days / permanent, reversible); masked projection = **last 4 + bank/branch/IFSC**; ⛔ public-presentation control **only**; complete details stay in the protected internal record. ⭐ (g) future-proofing is **load-bearing**. |
| 6 | 90-day physical document | ☑ **Ruled — (a) track and chase** | ⛔ No punitive effect. Digital acceptance remains **operative**. ⛔ No auto-suspension, ⛔ no invalidation of the T&C acceptance, ⛔ no publication stop. |
| 7 | §14 step 5 locator + amendment | ☑ **Ruled — (a) withheld by ruling** · **Amendment authorised: Yes** | `-157` cl.2 **discharged by declination**; ⛔ not to be re-raised as outstanding. `engagement-letter-template.md` **§14 step 5 to be amended** to accept *"custody attested, locator withheld"* as a complete state. |
| 8 | Development routing (now / v2) | ☑ **Ruled — (a) split** | Authority switch **ships now**; scroll-through + digital signature + 90-day tracking **deferred to v2 / pre-launch**. ⚠ Fail-closed until the clause is **pinned** into an effective T&C version. |

**Trustee initials:** ___dr_____ (DR)  __kb______ (KB)   **Date:** ___2026-08-28__
**Counsel signature (Part A):** ____Mohit__  **Date:** ____2026-08-28__

Logged in `.decision-log.md` as Decision **`2026-08-28-160`** — ✅ **the attestation gap `-160` recorded
against itself is DISCHARGED by this sheet:** quorum met, counsel signed Part A, both trustees
initialled, all eight Part B rows ruled, transcription confirmed faithful (with the Row 1 correction
appended above). ⚠ `-160` clause 3 was **corrected before commit** to match Row 1's actual ruling.

---

### Footnote — ruling weight (triage aid, ⛔ not a status; every Part B row needs the ≥2-trustee quorum)

- **Counsel-only** — ⛔ the Panel cannot supply these. **All of Part A.** ⭐ **A1.1 especially:** only
  counsel can lift counsel's own hold.
- **Light-touch** — procedural, reversible. **Row 6** (physical-document handling) · **Row 8**
  (development routing).
- **Trustee-judgment** — materially the Trust's call. **Rows 2, 3, 7.**
- **Trustee-judgment, consequential** — ⭐ **Rows 1, 4 and 5.** Row 1 supersedes a ratified decision;
  Row 4 reverses a **shipped, merged** behaviour; Row 5 sets the public exposure posture for
  **nominee bank details**. ⛔ Do not treat any of the three as a formality merely because the sitting
  already discussed them.
