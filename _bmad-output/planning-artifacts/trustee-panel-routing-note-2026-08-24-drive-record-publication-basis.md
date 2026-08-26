# Trustee Panel routing note — 2026-08-24
## On what basis is a deceased member's name published on a public drive record?

**Author:** BigDev, Solo Builder — 2026-08-24
**Occasion:** Story 11b.1 (Sahyog Drive) authoring pass. Decision **D1(b)** ruled that the deceased
member's name renders on the public drive index, on the ground that an **unnamed beneficiary reads as
the Trust diverting funds to its own account**.
**Routed to:** Trustee Panel · **Adv. Mohit Agrawal** (engaged counsel since 2026-06-21; T&C return
due **2026-09-07**, and his `2026-08-24-157` cl.3 revisit of the three Epic 11b surfaces is **HELD**).
**Status:** ⏳ **ROUTED, ⛔ NOTHING RATIFIED AND NOTHING APPLIED.**

> ⭐⛔ **THE HEADLINE, AND IT REVERSES THIS AUTHOR'S OWN ADVICE GIVEN EARLIER THE SAME DAY.**
> BigDev's position — *"consent is no longer a choice; the Trust cannot explain to lakhs of
> contributing members that the claimant does not want the name public"* — was initially routed by
> this author as a **Niyamavali amendment**, on the reasoning that the member could accept publication
> as a **term of membership** rather than the family consenting under grief.
>
> ⛔ **That route is NOT AVAILABLE, and the Trust Deed is why.** It was checked after the advice was
> given, and the advice was wrong. Recorded ⛔ not silently corrected
> ([[feedback_closure_language_precision]]).

---

## 1. The Deed already answers the question, and it answers **consent**

**Deed Clause 15(c)**, verbatim:

> *"Public rendering of any **member, contributor, nominee, or verifier** information (including
> memorial or contributor-list surfaces) shall be effected **only with explicit, revocable,
> purpose-specific consent and never on a default opt-in basis**."*

Four adjectives, all mandatory: **explicit · revocable · purpose-specific · never default opt-in.**
The clause names memorial and contributor-list surfaces **expressly**, so it ⛔ cannot be read as
aimed at something else.

## 2. A Niyamavali amendment cannot change it

**Deed Clause 20(a)** — the Board may *"frame, publish, and amend the Niyamavali … **provided that no
amendment to the Niyamavali shall be inconsistent with this Deed** or with the facilitator posture in
Clause 4(c)."*
**Niyamavali Part 11** repeats the constraint, and its own header states: *"Where this document and
the Deed conflict, **the Deed prevails** (Deed Clause 28)."*

⇒ ⛔ **Amending §4.4 to authorise publication on membership terms — or to make the consent mandatory —
would be an amendment inconsistent with the Deed, and therefore beyond the Board's power to make.**
⇒ ⭐ **The instrument is the TRUST DEED, ⛔ not the Niyamavali.**

### ⭐⭐ AND THE DEED IS NOT FINAL — SO THIS IS A DRAFTING DECISION, ⛔ NOT AN AMENDMENT

**Confirmed by BigDev, 2026-08-24, and verified in the tree:**

- ⛔ **`trust-deed.md` is UNEXECUTED** — `:25` carries `[[City]], [[State]]` and `[[___]] day of
  [[Month]], [[Year]]`. There is no executed instrument to amend.
- ⭐ **The Deed is in ACTIVE REDRAFT** — `trust-deed-objects-v3-redline.md` and
  `trust-deed-objects-v4.md` sit beside it; v4 is headed *"working draft for counsel"* and rewrites
  the objects (Part A) and the ancillary provisions (Part B).
- ⚠ ⛔ **BUT v4 DOES NOT REACH CLAUSE 15(c), AND THE NUMBERING IS A TRAP:** v4's *"15"* is **Object 15
  — General Public Utility (Residuary)**, a different instrument section entirely. Clause 15(c) lives
  in `trust-deed.md` and is ⛔ **untouched** by the redraft. ⇒ ⭐ **nobody has revisited it against this
  scenario**, and its survival into v4 is an **omission**, ⛔ not a re-affirmation.
- ⚠ Relatedly: v4's change log records that **the DPDP Act citation was REMOVED** from the objects in
  favour of *"Applicable Law"*. ⇒ the Trust's DPDPA posture is presently carried by Clause 15 **alone**.

⇒ ⭐⭐ **THIS IS THEREFORE A CHEAP DECISION TAKEN AT THE RIGHT MOMENT, ⛔ NOT AN EXPENSIVE REVERSAL.**
Deciding what Clause 15(c) should say **before execution** costs a redraft round with counsel — who is
already holding the T&C and returns **2026-09-07**. Deciding it **after** execution costs a formal
Deed amendment. ⚠ **This is the same pre-launch window that governs the consent type and the
membership-version pinning raised today, and it closes once.**

⚠ ⛔ **WHAT DOES NOT CHANGE:** while Clause 15(c) stands as drafted it **governs**, and the Niyamavali
⛔ cannot be amended into conflict with it (Clause 20(a)). ⇒ ⛔ the pending directory amendment's
problem at §4 below is **live today**, ⛔ not deferred until execution.

## 3. ✅ What was actually BUILT is Deed-compliant, and ⛔ nothing is blocked

Story 11b.1 as ruled and as authored publishes the name **consent-gated**:

| Deed 15(c) requires | Story 11b.1 (AC2 + AC12) |
|---|---|
| **explicit** | A fourth claim-time box, **unchecked by default** (UX-DR2), ⛔ outside the `.refine()` that forces the processing consent |
| **revocable** | Added to `DpdpaRevocableConsentType`; 6.9's revoke path is open at **any** claim state |
| **purpose-specific** | Its own type, `sahyog_drive_publication` — ⛔ not a reuse of `sahyog_vivran_publication` |
| **never default opt-in** | Unchecked by default; a missing consent and a revoked consent are the **same verdict** |

⇒ ⭐ **D1(b) stands and needs nothing from the Panel to proceed.** What is routed here is only whether
the Trust wishes to go **further** than consent — which is BigDev's stated position, and which the
Deed presently forbids.

⚠ **And the surface degrades gracefully either way:** consent decides whether a row is **named**,
⛔ never whether it **exists**. An unconsented pool still publishes letter code, canonical identifier,
district, close date, confirmed contribution count and close-of-cycle framing. ⇒ **the index degrades
per-pool, ⛔ never per-page** — it remains a complete and truthful record of every drive the Trust has
run, which is a material part of the answer to BigDev's fund-diversion concern.

## 4. ⛔⛔ A SEPARATE AND MORE URGENT FINDING — the PENDING directory amendment contradicts the Deed

⚠ **This is not about Story 11b.1 and it was found incidentally. It is raised because it is
load-bearing and unrecorded.**

`niyamavali-amendment-draft-2026-08-21-directory-publication.md` (⏳ drafted, **⛔ not ratified**)
proposes amending §4.4 to read that public rendering is consent-gated *"**save for the public member
directory** published under Part 10, which is **rendered on the authority of the Trustee Panel and not
on consent**."*

⛔ **That is precisely what Deed Clause 15(c) forbids**, and Clause 20(a) forbids the Niyamavali from
being amended into inconsistency with the Deed. ⇒ ⚠ **if ratified as drafted, that amendment would be
beyond the Board's power**, and the rulebook would assert something the Deed overrides.

⭐ **The cost today is ZERO — it is unratified.** ⛔ Do not ratify it in its present form.

⚠ **AND THE UNDERLYING QUESTION IS BIGGER THAN THE DRAFT.** The public Member Directory is authorised
(`2026-08-24-156` cl.2) to publish members' **full legal names** by **default**, with ⛔ **no member
opt-out**. Deed 15(c) requires explicit, revocable, purpose-specific consent for exactly that. ⇒ the
conflict is ⛔ **not** created by the amendment; the amendment **discloses** it.
⭐ **The exposure is PROSPECTIVE, ⛔ not actual:** `/members` is ⛔ **not live** — Row 17's posture and
the per-Pariwar publication switch both stand, and no Pariwar is publishing. ⛔ Nothing has been
rendered in breach. ⚠ But the gate cannot be opened until this is answered.

⇒ **This is the same defect class as `2026-08-20-140` cl.7** (the Niyamavali did not record that
members' names go public) — ⭐ one layer deeper: it is now the **Deed**, ⛔ not the rulebook.

## 4b. ⚠ **RATIFICATION SOUGHT — D10: the deceased member's FULL NAME, ⛔ not a shielded form**

**Ruled by BigDev 2026-08-24 as Story 11b.1 D10, and recorded *authorised, ⛔ not made*.** ⭐ **Two
committed records reserve a public name-form change to this Panel**, in terms — the matrix exception's
`scope:` (*"changing those requires its own Panel ruling"*) and the 2026-08-19 `RECONCILED` block on
Story 11b.1 (*"Changing them requires its own Panel ruling"*). ⇒ **the Panel's ratification is sought
here.** ⛔ Until it is given, D10 is ⛔ **not** to be recorded as Panel-ratified.

**The three grounds, each checkable:**

1. ⭐ **A shielded form defeats the ruling that admitted the name.** D1(b) admitted it because an
   unnamed beneficiary reads as fund diversion. *"Sushil K."* on a **district-level** index barely
   improves on that — and the UX spec's own **Real Data Test** (`ux-design-specification.md:1252`) is
   built around *"duplicate surnames within the same district, duplicate **full names** disambiguated
   only by Member ID + HRMS lookup."* ⇒ if duplicate **full** names already need a second identifier,
   first-name + last-initial is useless for the verification the name exists to serve.
2. ⭐⭐ **It is strictly MORE protective than what this Panel has already authorised.** `/members`
   publishes the **full legal names of LIVING members**, **by default**, with ⛔ **no member opt-out**
   (`2026-08-19-135` cl.7(c) / `-136`). This surface publishes a **deceased** member's full name **only
   where the family explicitly consented**, **revocably**. ⇒ shielding here while the directory
   publishes living members unconsented would be incoherent in the **less** protective direction.
3. ⭐ **The shield is not even safe.** `resolvePublicMemberName` returns `''` — omit — for **every
   single-token name** under `shielded_name` (`2026-08-21-145` cl.3), because a mononym cannot be
   shielded. ⚠ **Mononyms are common in India.** ⇒ under the shielded form an entire class of deceased
   members would appear on the public record **unnamed**, ⛔ with no signal — reproducing the exact
   appearance D1(b) exists to prevent, for the people least able to object.

⛔ **WHAT D10 DOES NOT DO:** ⛔ it does **not** reach **11b.3** (Sahyog Vivran) or **11b.6** (In
Memoriam) — the matrix exception's `scope:` keeps those at first-name + last-initial, and they are their
own stories' rulings to seek · ⛔ it does **not** move **contributor or donor** name forms, which remain
**unruled** · ⛔ it does **not** reach the **nominee/family identifier**, which renders nowhere ·
⛔ it does **not** relax the consent gate: full name **with consent** remains Deed 15(c)-compliant on all
four adjectives.

⚠ **AND ONE OBSERVATION, ⛔ not a request:** `resolvePoolIdentity` shields the same deceased family's
name on the **member-facing** My Pool card, passbook and notifications (Stories 8.6/8.7/8.8). ⇒ after
D10 the **public** page shows **more** than the **member app** does for the same pool. ⛔ Not resolved
here; it binds **11b.2** and **11b.3**.

## 5. The three questions put to the Panel and to counsel

**Q1 — To the Panel.** Does the Trust wish to publish a deceased member's name on the public drive
record on a basis **other than the family's consent**? ⭐ **If yes, the change is to Deed Clause 15(c),
and because the Deed is UNEXECUTED and already in redraft, it is a DRAFTING instruction to counsel —
⛔ not an amendment to an executed instrument.** ⚠ Clause 15(c) was ⛔ not revisited by the v4 objects
redraft; its survival is an omission, ⛔ not a re-affirmation, so the Panel is ⛔ not overturning a
considered position.

**Q2 — To counsel (Adv. Mohit Agrawal), and ⭐ this is the question worth his time.** BigDev's ground
is institutional, not administrative: *"the Trust cannot explain to lakhs of contributing members that
the beneficiary declined to be named — an unnamed beneficiary reads as the Trust diverting funds to
its own account."* ⇒ **Is there a lawful basis under the DPDPA — other than consent — on which a
mutual-aid trust may publish the name of a deceased member for whom its members have collectively
contributed?** ⚠ Sub-questions: (a) how the DPDPA treats a **deceased** person's personal data;
(b) whether a term accepted by the member **in life** can authorise publication **after death**;
(c) whether the Trust's public-charitable character and Deed Clause 7 objects supply any basis
independent of consent.
⛔ **Not** *"can consent be made mandatory"* — that question answers itself, and putting it would waste
his return.

**Q3 — To counsel.** ⛔ The **nominee family identifier** and **nominee bank details** (11b.3) are
⛔ **outside any answer to Q2**: a nominee never joined the Trust, so no membership term reaches them,
and Deed 15(c) names *"nominee"* expressly. ⇒ his `-157` cl.3(b) third-party objection **stands
intact**, and Story 11b.1 renders ⛔ **no** nominee identifier (AC11(a)).

## 6. ⚠ A precondition neither draft can proceed without

⛔ **`docs/legal/` is STILL UNTRACKED** — `git ls-files docs/legal` returns **empty** at `a231ca7`,
listing ten files including `trust-deed.md`, `niyamavali.md` and both Hindi counterparts.
⚠ **Decision `2026-08-21-144` cl.7(a) required them under version control BEFORE the directory
amendment is applied.** That has ⛔ **not** been done, and it now blocks **two** pending amendments.
⇒ ⭐ **The Trust's entire legal corpus is currently outside version control**, so a change to it leaves
⛔ no diff, ⛔ no history and ⛔ no attribution.

## 7. What this note does ⛔ NOT do

⛔ Does **not** ratify, amend or apply anything · ⛔ does **not** block Story 11b.1, which is
Deed-compliant as built · ⛔ does **not** lift counsel's `-157` cl.3 hold · ⛔ does **not** advance
Row 17 · ⛔ does **not** re-open `2026-08-24-156` cl.2's authorisation, which stands until the Panel
says otherwise · ⛔ mints **no** launch-gate roster row.

⚠ **And the phrasing rule binds every line above:** *"counsel has not reviewed X"* — ⛔ **never**
*"counsel is not engaged"*, which is **false and has been since 2026-06-21** (`2026-08-24-158`).

---

## Sources — every one read at `a231ca7`

- `docs/legal/trust-deed.md:191` (Clause 15(c)) · `:237` (Clause 20(a)) · `:25` (unexecuted placeholders) · `:305` (Clause 28)
- `docs/legal/trust-deed-objects-v4.md` (active redraft; ⚠ its *"15"* is **Object 15**, ⛔ not Clause 15) · `trust-deed-objects-v3-redline.md`
- `docs/legal/niyamavali.md:110` (§4.4) · `:331` (Part 10) · `:339` (Part 11 version-pinning) · `:9-12` (Deed prevails)
- `_bmad-output/planning-artifacts/niyamavali-amendment-draft-2026-08-21-directory-publication.md` (Amendment 1)
- `.decision-log.md#decision-2026-08-24-157` cl.3 (the hold) · `#decision-2026-08-24-156` cl.2 (the authorisation) · `#decision-2026-08-24-158` (the phrasing rule) · `#decision-2026-08-20-140` cl.7 (the same defect class, one layer up)
- `apps/api/src/modules/claims/dpdpa-consent-copy.ts` (the evidence copy) · `packages/domain/src/schema/consent_records.ts:102-127` (the enum)
- `_bmad-output/implementation-artifacts/11b-1-sahyog-drive-active-archive.md` (D1(b), D4(b), AC2, AC12)
