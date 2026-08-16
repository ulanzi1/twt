> **⚠ PENDING LEGAL REVIEW PER STORY 0.13 ⚠**
>
> **This moderation-appeal procedural-fairness specification is authored and Panel-ratified, but has
> NOT been reviewed by counsel.** The items in §4 are routed into the Story 0.13 engagement roster.
>
> ⛔ **UNLIKE its claim-side sibling, this mechanism is NOT gated off pending that review.** There is
> no `pending_legal_review` config on the moderation appeal, and the absence is a **ruled decision**
> (Decision `2026-08-15-121` clause 16), not an oversight. §3 states the reasoning in full.
> Using [[feedback_closure_language_precision]]'s verbs: the mechanism is **authored and
> Panel-ratified**; **counsel review remains outstanding**; the go-live gate is **deliberately absent**.

# Moderation-Appeal Procedural-Fairness Specification (Niyamavali §8.8 / Story 10.22)

The internal appeal against a **moderation act** — a suspension under §8.2 or a termination under
§8.4 — heard by the Trustee Panel, by a member of it who took no part in the act appealed against.

This is the **sibling** of `README.md`, not an extension of it. It is the counsel-facing narrative for
a **different journey**, and §5 states in terms where the two diverge and why.

---

## 0. ⛔ THIS IS NOT THE CLAIM APPEAL

`epics.md:4071`: *"the moderation appeal is a **distinct journey** — Epic 6's machinery is a pattern
reference, not a reusable path."*

| | Claim appeal (Part 9, FR-43A) | Moderation appeal (Part 8, §8.8) |
|---|---|---|
| **Subject** | A denied **claim** | A **moderation act** against a member |
| **Instrument** | Niyamavali Part 9 | Niyamavali Part 8, §8.8 |
| **Stages** | Three (District Admin → State Trustee panel → Trustee) | **One** — a single internal review |
| **Exhaustion** | Exactly one journey per claim, **ever** | One **open** appeal per act at a time; **re-filing after a determination is permitted** |
| **Deadline** | — | **None.** No time limit runs |
| **Publication** | A reversed denial publishes to *Sahyog Vivran* | **None.** Member-private + audit |
| **Go-live gate** | `pariwar_appeal_config.legal_review_status`, fail-closed | ⛔ **None** — see §3 |
| **Table / id** | `claim_appeals` / `AppealId` | `member_moderation_appeals` / `MemberModerationAppealId` |

⚠ **Part 8 does not reference Part 9**, and §8.8 states expressly that it does not incorporate it.
No shared table, no shared identifier, no shared route, and no import from `claim/appeal*.ts` — a
source-level test asserts the last of those.

---

## 1. The mechanism (ratified — Decision `2026-08-15-121`)

**Who may appeal.** A member under **suspension** or **termination**. Both, because §8.4a makes them
distinct acts and each is separately appealable.

**Against what.** A **moderation act**, identified by its record under §8.6. Uniqueness is keyed to
the ACT, never the member: keying to the member would make a later termination unappealable because
an earlier suspension had been appealed.

**To whom.** The **Trustee Panel** (§8.7), which is the Board of Trustees acting in a moderation
capacity — its composition and tenure governed by **Deed Clause 18**, its quorum by **Deed Clause 19**.

**By whom, within the Panel.** ⭐ A Panel member who **did not take part in the act appealed against**
— neither as an authority who imposed it, nor by contributing a ground on which it rests. This is the
natural-justice requirement **Deed Clause 26** binds every Board discretion to, and it follows the
discipline Part 9 applies at its own Stage 1.

*Enforcement:* the exclusion set is the union of the act's `member_moderation_actions.actor_id` and
every `member_moderation_grounds.added_by` attached to it. It is derived by a pure DB read in
`@twt/domain` and enforced **at the API layer, inside the scope transaction, before any write**, as a
typed **409** — ⛔ never a 403. The actor holds the key and may determine other appeals; what is
refused is their relationship to **this case**.

*Where no Panel member is eligible:* the appeal **remains filed and open**. It is neither determined
nor dismissed for want of an eligible hearer, and constituting an eligible bench is a matter for the
Board under Deed Clause 18.

**Notice, a fair hearing, a reasoned outcome.** The reasoned outcome is **mandatory** and is enforced
by a DB CHECK, not by convention: a decided row without prose cannot exist.

**Outcomes.** `upheld` | `allowed`, and nothing else. ⛔ There is deliberately **no third `varied`
outcome**: a lesser sanction is a **fresh moderation act**, taken on its own ground with its own §8.6
record and its own right of appeal. An appeal outcome that varied the sanction would be a moderation
act with no moderation record.

**What `allowed` does.** It **DIRECTS** that the act be undone; it does **not** undo it. The
restoration is a subsequent, separately-attributed act through the ordinary moderation write path,
carrying its own reason code, its own Decision Note and — from `terminated` — the Panel-exclusive
`member.restore_terminated` check.

**No suspensive effect.** Filing does **not** pause the act. A suspended member remains suspended and
a terminated member's access does not return while the appeal is pending. Stated in §8.8 rather than
left silent, and stated to the member on the filing surface before they commit.

**The route survives the end of authenticated access.** A terminated member files through the
identity-verified administrative process (the helpline arm). §8.8: *"the right to appeal does not
depend on the access that termination removes."*

---

## 2. Public accountability — deliberately NONE

⛔ **A moderation appeal and its outcome are member-private + audit.** Nothing publishes them.

⚠ **Recorded as a decided absence, not an omission** (Decision `2026-08-15-121` clause 15). Part 9's
reversed denial publishes a `disposition_category` to *Sahyog Vivran*; that publication is
**claim/memorial-scoped** and does not extend to Part 8. Publishing an allowed moderation appeal
would publish the fact of the original sanction to an audience that never saw it — which would harm
the member the appeal exists to protect.

---

## 3. ⭐ THE GO-LIVE GATE, AND WHY THERE ISN'T ONE

Story 6.16 built a `pending_legal_review` **fail-closed config gate** on the claim appeal, with
**initiate deliberately ungated**, on the stated principle (README §3) that *"a claimant's right to
FILE an appeal must not be blocked by a trust-side config."*

**The moderation appeal has NO such gate on either half.** Decision `2026-08-15-121` clause 16.

**The reasoning, recorded so a later reader finds it rather than inferring an oversight:**

The claim gate protects a ₹50L adjudication by refusing to **adjudicate** while the procedure is
unreviewed. The same gate here would refuse to **hear a member at all** on a sanction *already imposed
against them*, and the sanction would keep running while the refusal held. That inverts the gate's
purpose: it would use an unreviewed procedure as grounds to leave the member unheard. 6.16's own
initiate-is-not-gated principle points the same way, and this mechanism's entire subject matter is
being heard.

⚠ **The asymmetry with Story 6.16 is therefore INTENTIONAL and RULED.** ⛔ Do not "harmonise" the two
by adding a gate here; that would require superseding `2026-08-15-121` clause 16.

---

## 4. Counsel-review items (routed into the Story 0.13 engagement roster)

⛔ **These gate nothing.** They are owed, tracked, and do not block filing or determination.

1. **The single-tier design.** §8.8 provides ONE internal review with no tier above it, against a
   sanction the Trustee Panel may itself have imposed. Counsel to confirm this satisfies natural
   justice under Deed Clause 26, given that the reviewing body is the deciding body sitting with a
   different individual. ⚠ A three-tier ladder was proposed and is **NOT RATIFIED**
   (`2026-08-15-121` clause 8) — partly because it conflicted with **Deed Clause 18(a)** (the Board is
   three-to-nine Trustees, not three) and **Deed Clause 19(c)** (the Chairperson's casting vote is
   mandated and a Part 8 amendment cannot disapply it). Both constraints are recorded for counsel.

2. **The different-individual requirement's scope.** v1 excludes the act's actor and every author of
   a ground attached to it. Counsel to confirm whether participation in an *earlier* act against the
   same member should also exclude.

3. **The absence of a deadline.** No time limit runs against the right to appeal. Counsel to confirm
   there is no limitation-period consequence to an unbounded internal window.

4. **The external-recourse disclosure.** The outcome copy states that exhausting this appeal does not
   waive recourse to a court, consumer forum or other authority. ⚠ This is grounded on **Deed Clause
   26** and Niyamavali **R10(E)** directly. **AR-56**'s CPA-2019 internal-appeal obligation is stated
   in connection with the **claim** appeal (FR-43A), not Part 8 — the same statutory logic applies by
   **analogy**, but this is **not a direct Part-8 ratification** and must not be represented as one.
   Counsel confirms the exact wording, as they do for README §4 item 2.

5. **The absence of publication.** Counsel to confirm that keeping a moderation appeal and its
   outcome member-private raises no transparency obligation the Trust owes elsewhere.

---

## 5. Closure status (per [[feedback_closure_language_precision]])

- **Closed by edit:** Niyamavali §8.8 (both locales); the §8.6 *Recorded gap* clause, recorded as
  closed by §8.8 with its original wording preserved as superseded; the appeal record + its two
  overlay-inert events; the exclusion set and its server-side 409; both intake surfaces; the
  adjudication queue; the previously-dead CTA in both apps; the five untrue copy sites; and this spec.
- **Resolved via explicit deferral:** the §4 counsel-review items — tracked here, carrying the
  PENDING-LEGAL-REVIEW marker, routed into the Story 0.13 roster. ⛔ **NOT gating go-live**, and the
  reason for that asymmetry with Story 6.16 is stated in §3 rather than left to inference.
- **Not addressed:** the absence of publication (§2) — a **decided absence** under
  `2026-08-15-121` clause 15, recorded so a later reader does not read it as an omission.
