# Trustee Panel Routing Note — Row 17 leg two: may the directory-publication kill switch be treated as an **operational control**, and may the public Member Directory go live?

**Status:** ✅ **CLOSED 2026-08-24 — ALL QUESTIONS RULED. Dhiraj Rahul and Kalpana Bharti.** Q1·Q2·Q3 → `2026-08-24-155` cl.1–4 (Row 17 `closed`). Q4′·Q5′·Q6′ → `2026-08-24-156`. ⭐ **The public Member Directory is AUTHORISED to go live.**

> ### ⭐ ANNOTATION — the re-put questions ruled, 2026-08-24 (`2026-08-24-156`)
>
> ⛔ **Q4′/Q5′/Q6′ as put in §6 are left as put. Annotated, never edited.**
>
> | Q | Ruling | Where |
> |---|---|---|
> | **Q4′** — go live before requesting the review? | ⭐ **(a) — and ⛔ NOT as accepted risk.** The trustee **spoke with Adv. Mohit Agrawal**, who **CLEARED** full-name publication. ⇒ exposure **AUTHORISED**; `-155` cl.5 **SUPERSEDED** | `-156` cl.1–2 |
> | *scope* | ⚠ **All four public surfaces** (`/members` + 11b.1 + 11b.3 + 11b.6) | `-156` cl.1, cl.7(a) |
> | *form* | ⛔ **VERBAL, relayed by trustee. ⛔ NO written return.** Un-attested in writing; ⛔ may NOT be logged as a §7 Return-receipt | `-156` cl.1(a)–(c) |
> | **Q5′** — record the engagement? | ✅ **(1)** — `lc-1` Adv. Mohit Agrawal recorded, **reconstructed / un-attested**; ⛔ `<PENDING-TASK-8>` slots left unfilled | `-156` cl.4 |
> | **Q6′** — correct the retrospective? | ✅ **Annotate, ⛔ never rewrite** — `:365` + `:431`, **+2 lines, 0 removed** | `-156` cl.5 |
> | *roster row* | ⛔ **No new row minted** — discharged by the clearance; ⚠ consequence recorded: the clearance is auditable **only** through the decision entry | `-156` cl.6 |
>
> ⚠⛔ **THE STANDING RISK THIS NOTE HANDS FORWARD:** the clearance is the **thinnest attestation carrying the widest scope** in the log — verbal and unwritten, over four surfaces of which **three are ⛔ not built** and so ⛔ could not have been described to counsel. **11b.3's subject is nominee BANK DETAILS**; 11b.1/11b.6's are **deceased members**. ⭐ `-156` cl.7(a) adopts the `2026-06-21-057` fence by analogy — the clearance reaches the **posture as described**, and a surface shipping a new data class, subject population or recipient **re-opens** it. ⛔ **Not a standing waiver.** → open follow-up: **obtain it in writing.**
>
> ⚠ **TWO CORRECTIONS AGAINST THIS NOTE'S OWN §2/§5 FRAMING** (`-156` cl.3), recorded because this note is where the error was put to the Panel: **(a)** `2026-08-19-136` cl.5 is `[Author-committed]` and says *"this entry does ⛔ **not** make counsel engagement a precondition"* ⇒ ⛔ **DPDPA was never gating exposure** — §2 Q4, §3 and §5 all treated it as though it were. **(b)** ⛔ **No roster row has ever gated name publication** (all 17 verified); Row 3 is `closed` and is about the **edge design**. ⇒ the gate this note was written to walk around ⛔ **did not exist**.
**Raised by:** BigDev, Solo Builder — discharging retrospective action item **AI-11a-5**
**Date drafted:** 2026-08-23 · **Drafted at HEAD:** `cb95941` · **Panel sitting:** 2026-08-24
**Owner of the gate:** Trustee Panel · **Discharge path:** BigDev + John

> ### ⭐ ANNOTATION — the ruling, 2026-08-24
>
> **Ratifying trustees:** Dhiraj Rahul, Kalpana Bharti (≥2 — the row's threshold is met).
> ⛔ **The questions below are left as put. They are annotated, never edited.**
>
> | Q | Ruling | Standing |
> |---|---|---|
> | **Q1** — operational control? | ✅ **YES** — `2026-08-21-146` cl.5 superseded | ✅ **Stands** |
> | **Q2** — accept the latency? | ✅ **Ratify WITH the latency, stated explicitly in the entry** | ✅ **Stands** |
> | **Q3** — widened scope? | ✅ **Ratify the POSTURE** (all four surfaces) | ✅ **Stands** |
> | **Q4** — go live with counsel unengaged? | **(a) — go live on the existing `-135`/`-136` authority** | ⛔⚠ **HELD — ruled on a premise verified FALSE after the sitting. Re-put as Q4′ (§6 below, after the correction in §5).** |
> | **Q5** — open the counsel shortlist? | **Open it here, ratify separately** | ⛔⚠ **MOOT AS PUT — there is no shortlist to open. Re-put as Q5′ (§6 below, after the correction in §5).** |
>
> ⭐ **Q1–Q3 are sufficient to close Row 17 on its own criteria** — the row's two legs are the admin
> UI and the ≥2-trustee "operational control" ratification. ⛔ Neither leg touches DPDPA. ⚠ **Q4 is the
> EXPOSURE question, which `-147` and this note both record as binding the same event but
> ⛔ discharging nothing of Row 17.** ⇒ Row 17 may close while Q4′ is open.

> ⚠ **WHY THIS IS A ROUTING NOTE AND ⛔ NOT A DECISION ENTRY.** Row 17's second leg *is* a
> ≥2-trustee ratification. ⛔ No trustee has sat. Authoring the entry with a `Trustee-ratified`
> status or named ratifying trustees would **fabricate the very attestation the row is asking
> for** ([[feedback_record_unattested_no_backfill]]). The draft entry in §4 below carries its
> attestation slots **empty**, by construction. ⛔ It is committed only after the Panel answers §2.

---

## 1. What is actually being asked

`docs/launch-gate-inventory/inventory-roster.md` **Row 17** (`directory-kill-switch-admin-ui`) has
**two closure legs**. Both were verified live at `cb95941` for this note.

| Leg | State | Evidence (verified live, ⛔ not read off story prose) |
|---|---|---|
| **1 — an admin UI ships and is operable by a human without database access** | ✅ **Walked** | `apps/admin/src/modules/directory-publication/{DirectoryPublicationPage,PublicationForm}.tsx` + `apps/admin/src/routes/DirectoryPublicationRoute.tsx` + `apps/admin/src/api/hooks.ts`; API at `apps/api/src/modules/directory-publication/{routes,handlers}.ts`. The `PUT` is a **governed flip in both directions** with a rationale rejected empty at the contract boundary (`.trim().min(1)`), an actor/display snapshot, and a §1.5 audit line written on the same path under a compensating audit (ADR-0030). Story `10-30-directory-publication-kill-switch-admin-ui` is `done`. |
| **2 — a Decision supersession entry records ≥2-trustee ratification that the switch may be treated as an operational control** | ⛔ **Open** | Row 17 `current_status: open`; `closure_evidence_link: (empty)`. **This note exists to walk it.** |

⭐ **The row's own discipline, quoted so it is not softened here:** *"⛔ A `done` story alone does
NOT close this row."* Leg 1 being walked is ⛔ **not** closure, and ⛔ this note does not claim it is.

---

## 2. The questions put to the Panel

⛔ **Left as put. Annotated on ruling, ⛔ never edited in place** — the `2026-08-19` routing-note
convention.

### **Q1 — Is the kill switch now an operational control?**

`2026-08-21-146` cl.5 ruled the switch is **NOT an operational control until a dedicated
administrative UI ships**, and forbade describing direct database manipulation as normal manual
operation. That UI has shipped (leg 1 above). ⇒ **Does the Panel ratify that the switch may now be
treated as an operational control, superseding `-146` cl.5?**

> **Author's recommendation: YES.** The condition `-146` cl.5 named has been met on its own terms.
> ⚠ **But see Q2 — "operational" ⛔ does not mean "immediate", and the ratification must say so in
> its own words rather than leaving the qualification to this note.**

### **Q2 — Does the Panel accept the control's latency, on the record?**

⛔ The control is **not immediate**, and this is a property of the surface, ⛔ not a defect to fix
before ratifying. Verified live at `apps/public/src/pages/members.astro:172`:

```
Cache-Control: public, max-age=60, s-maxage=300
```

⚠ **That is TWO caches, ⛔ not one.** `2026-08-21-145` cl.5(e) and Row 17's notes both cite only the
`s-maxage=300` shared-cache leg. The header also carries `max-age=60` — a **browser** cache. So after
a Pariwar is pulled:

- every **warm PoP** keeps serving real member names for up to **300s**, **per page number**; and
- every **browser** that already loaded a page keeps its copy for up to **60s**.

⭐ **The `max-age=60` leg is a correction to the prior characterisation, surfaced by this note's live
verification and recorded rather than quietly folded in.** It does not change the posture; it makes
the ceiling **~5 minutes per cached page**, ⛔ not one instant.

⇒ **Does the Panel ratify "operational control" WITH this latency, or does it require the cache
posture changed first?**

> **Author's recommendation: ratify WITH the latency, stated explicitly in the entry.** ⛔ The word
> *"immediate"* may not be used about this control in any artifact, per `-147` cl.1(d), and the
> draft entry carries that prohibition forward.

### **Q3 — Does the ratification cover the WIDENED scope?**

⚠ **Row 17's scope grew on 2026-08-23, after the retrospective that raised AI-11a-5 was written.**
Decision `2026-08-23-154` (AI-11a-2) ruled that Row 17's publication posture **extends to every Epic
11b public surface** — Stories **11b.1 · 11b.3 · 11b.6** — with ⛔ **no new roster rows minted**,
because *"a per-surface roster turns a posture into a checklist, and the posture is what binds"*
(`epics.md:4817`).

⇒ **Does the Panel ratify the POSTURE (covering all four surfaces), or ratify `/members` alone and
require a fresh sitting per 11b surface?**

> **Author's recommendation: ratify the POSTURE.** Ratifying `/members` alone would re-introduce as
> a sitting schedule exactly the per-surface checklist `-154` declined to mint as roster rows.
> ⚠ **This ⛔ does not authorise any 11b surface to launch** — see Q3(a).

#### **Q3(a) — acknowledgement, ⛔ not a question: the second lever is untouched**

`-154` ruled C-5 as **two levers, and ⛔ NEITHER discharges the other**: Row 17's kill switch **plus**
each surface's **own per-subject consent gate**. ⛔ Ratifying Row 17 leaves every 11b surface's
consent gate **entirely open**. ⭐ A story may reach `done` with it open; a **surface may not go
live** with it open.

### **Q4 — ⛔ THE HARD ONE. Does the directory go live with DPDPA counsel NOT engaged?**

**Row 3 / `2026-08-19-136` cl.5.** The directory publishes **full legal names on an unauthenticated
page** — the posture the Panel itself authorised at `2026-08-19-135` Q1/Q2, recorded as the
**initial** posture and explicitly ⛔ **not permanent**. DPDPA counsel is **not engaged**. Verified
live for this note:

- `docs/legal-counsel-engagement/counsel-roster.md` — a **single template row** at
  `pending-trustee-selection`; ⛔ no named counsel.
- `docs/legal-counsel-engagement/engagement-ledger.md` §4 Counsel-selection log — **empty**, carrying
  its `<PENDING-TASK-8>` placeholder row.

⚠ **Row 17 and Row 3 bind the SAME event — going live — and ⛔ neither discharges the other.**
⇒ **Closing Row 17 does ⛔ NOT authorise exposure.** Three dispositions are available, and each is a
ruling:

| | Disposition | What it means |
|---|---|---|
| **(a)** | **Go live on the existing `-135`/`-136` authority** | The Panel treats its own 2026-08-19 full-name authorisation as sufficient for exposure, with counsel review following. ⚠ Recorded as **accepted risk**, ⛔ never as "counsel was consulted". |
| **(b)** | **Hold exposure until counsel is engaged** | `/members` and all three 11b surfaces stay dark pending **Story 0.13 Task 8**. Row 17 may still close on its own terms; the directory simply does not go live. |
| **(c)** | **Go live NARROWED** | Expose the directory under the **shielded** name presentation (`pariwar.manage_public_name_presentation`, super_admin-held) rather than full legal names, reverting to full names on counsel clearance. ⭐ `2026-08-19-135` Q5 required exactly this separability *"so a future Trustee decision toggles public full-name display without redesign"* — ⚠ **that separability was built for this moment and has never been exercised.** |

> **Author's recommendation: (c), then (a) on counsel clearance.** ⛔ Not a strong recommendation —
> this is squarely a Panel judgement and the author has no standing to weigh DPDPA exposure. ⭐ What
> the author *can* say on the evidence: **(c) is the only option that costs nothing to reverse**, and
> the mechanism it needs already ships.

### **Q5 — Does Story 0.13 Task 8 (counsel selection) move in the same sitting?**

⭐ Counsel selection is the **single upstream act behind four of the ten** standing Trustee Panel
obligations, none of which is discharged. It needs ≥2 shortlist candidates, interview-driven
selection, COI disclosure at interview, and a `counsel-roster.md` status flip.

⇒ **Does the Panel open the shortlist in this sitting, or schedule it separately?**

> **Author's recommendation: open it here, ratify separately.** AI-11a-5 was confirmed by BigDev on
> 2026-08-23 as *"drive now, jointly, separately tracked"* — ⭐ **jointly** because Q4 is unanswerable
> without a counsel path, ⛔ **separately tracked** because a counsel engagement is ⛔ not a
> launch-gate closure and must ⛔ not be folded into this entry.

---

## 3. What ⛔ does not move, whatever the Panel rules

Stated so nothing is inferred from the entry's existence:

- ⛔ **Story 11a.3 stays `done`.** *"A story being `done` and the surface it built being LIVE are
  different facts"* (`-147` cl.1(a)). ⛔ No story row flips. ⛔ No `development_status` key changes.
- ⛔ **Epic 11a stays `in-progress`; Epic 11b stays `backlog`;** all eight 11b story rows stay
  `backlog`. ⭐ *"Authorable" is ⛔ not "ready-for-dev"* — `bmad-create-story` is what moves a row.
- ⛔ **The kill-switch mechanism is neither suspended nor removed** (`-146` cl.5(a) stands).
- ⛔ **C-2** (no accessibility CI gate), **C-3** (no aggregate-stat producer), **C-4** (no FR-19
  producer), and **`2026-08-20-140` cl.7** are untouched and stay open.
- ⚠ **H-2 / death-blindness.** `/members` was remediated at `-146` — a member whose account is frozen
  following a reported death is excluded, and `packages/domain/src/member/directory-read.ts` carries
  the account-frozen overlay. ⛔ **This does not generalise for free.** Death is an **overlay, not a
  lifecycle label**, so **every predicate over `members.state` is blind to death by construction**
  ([[project_death_is_an_overlay_not_a_state]]) — and Epic 11b's entire subject is deceased members.
  ⇒ each 11b surface owes its **own** exclusion, ⛔ inherits nothing.

---

## 4. DRAFT decision entry — for `.decision-log.md`

> ⚠ **SUPERSEDED IN PART BY §5.** Clauses 1–4 below are ruled and stand. ⛔ **Clause 5 (exposure /
> DPDPA) and clause 6 (counsel) are HELD** — they were drafted, and answered, on the false premise
> §5 corrects. ⭐ The committable entry is **clauses 1–4 plus a clause 5 that records the correction
> and routes exposure to Q4′**, ⛔ not the clause 5 drafted below.

> ⛔ **DO NOT COMMIT AS-IS.** Every `<…>` slot is deliberately unfilled. ⚠ **Re-verify the entry
> number at commit time** — `2026-08-23-155` is the next number as of `cb95941` (last entry
> `2026-08-23-154`), but another entry may land first. ⚠ **Clause bodies below are drafted to the
> author's recommendations; if the Panel rules otherwise, the clause is rewritten to the ruling
> BEFORE commit — ⛔ the ruling is never bent to the draft.**

```markdown
### Decision 2026-08-23-155: **Trustee Panel — Row 17 leg two** — ⭐ the directory-publication kill switch is ratified an **OPERATIONAL CONTROL**, superseding `2026-08-21-146` cl.5; ⚠ the control is ⛔ **NOT immediate** and the ratification says so; ⭐ the posture binds **all four** public surfaces, ⛔ not `/members` alone; ⛔ **closing Row 17 does NOT authorise exposure** — Row 3 / DPDPA binds the same event and is ruled separately at clause 5

**Decision type:** Trustee-ratified — **launch-gate closure** (Row 17 leg two) plus a supersession of `2026-08-21-146` cl.5.
**Status:** <Trustee-ratified | Author-committed; awaiting trustee sign-off>
**Author:** BigDev, Solo Builder
**Ratifying trustees:** <≥2 names — ⛔ the row does not close on fewer>
**Panel sitting:** <date>

**Context:**

`2026-08-21-146` cl.5 ruled the per-Pariwar directory-publication kill switch **NOT an operational
control until a dedicated administrative UI ships**, and forbade describing direct database
manipulation as normal manual operation. `2026-08-21-147` cl.1 escalated that into a **launch gate
for the public Member Directory**, recorded as Row 17 of the launch-gate inventory with **two**
closure legs.

Leg one is walked: Story `10-30-directory-publication-kill-switch-admin-ui` is `done` and the UI is
**operable by a human without database access** — a governed flip in both directions, carrying a
rationale rejected empty at the contract boundary, an actor/display snapshot, and a §1.5 audit line
written on the same path. This entry is **leg two**, and ⛔ nothing else. It is raised by
retrospective action item **AI-11a-5**.

⚠ **The scope this entry ratifies is WIDER than Row 17 was when it was written.** Decision
`2026-08-23-154` extended the posture to Epic 11b's three public surfaces with ⛔ no new roster rows.

**Decision:**

1. ⭐ **THE KILL SWITCH IS AN OPERATIONAL CONTROL.** The condition `2026-08-21-146` cl.5 named has
   been met on its own terms. ⇒ **`-146` cl.5 is SUPERSEDED by this clause.** ⛔ It is not
   reinterpreted, and ⛔ the earlier entry is not edited — it stands as the record of the posture that
   applied until this sitting ([[feedback_supersede_never_reinterpret]]).
   ⛔ **What this does not do:** it does ⛔ not suspend or remove the mechanism (`-146` cl.5(a)
   stands); it does ⛔ not reopen Story 11a.3 or move it off `done`; and it does ⛔ **not authorise
   the directory to go live** — see clause 5.

2. ⚠ **THE CONTROL IS ⛔ NOT IMMEDIATE, AND THIS ENTRY RATIFIES IT WITH THAT LATENCY.** `/members`
   is served `Cache-Control: public, max-age=60, s-maxage=300`
   (`apps/public/src/pages/members.astro:172`). ⇒ after a Pariwar is pulled, **warm PoPs keep serving
   real member names for up to 300s, per page number**, and **browsers holding a loaded page keep it
   for up to 60s**. The practical ceiling is **~5 minutes per cached page**.
   ⚠ **The `max-age=60` browser leg is recorded here as a correction on the evidence:** `-145` cl.5(e)
   and Row 17's notes both cite the `s-maxage=300` shared-cache leg alone. ⛔ Not propagated silently,
   ⛔ not back-filled into the earlier entries.
   ⛔ **The word *"immediate"* may not be used about this control in any artifact** (`-147` cl.1(d),
   carried forward unchanged).

3. ⭐ **THE POSTURE BINDS ALL FOUR PUBLIC SURFACES, ⛔ NOT `/members` ALONE.** Per `2026-08-23-154`,
   Row 17 extends to Stories **11b.1 · 11b.3 · 11b.6**. This ratification is of the **posture**;
   ⛔ **no new launch-gate roster rows are minted** and ⛔ no per-surface Panel sitting is required to
   re-ratify the same posture.
   ⚠ ⛔ **AND IT AUTHORISES NO 11b LAUNCH.** `-154` ruled C-5 as **two levers, ⛔ neither discharging
   the other**: this kill switch **plus** each surface's **own per-subject consent gate**. Every such
   consent gate remains **open and untouched**.
   ⚠ **Each 11b surface also owes its OWN death exclusion.** `/members` was remediated at `-146`, but
   death is an **overlay, not a lifecycle label** — every predicate over `members.state` is blind to
   death by construction, on an epic whose subject is deceased members. ⛔ Nothing is inherited.

4. **Row 17 disposition.** <`closed`, with `closure_evidence_link` resolving to this entry | `open`
   with a named narrowing per clause 5>. ⛔ The roster row is edited by the commit that carries this
   entry, ⛔ never ahead of it.

5. ⛔⚠ **EXPOSURE IS RULED SEPARATELY, AND ROW 17 CLOSING DOES ⛔ NOT DISCHARGE IT.** The directory
   publishes **full legal names on an unauthenticated page** (`2026-08-19-135` Q1/Q2; `-136` cl.5
   reading (A), recorded as the **initial** posture and explicitly ⛔ not permanent) while **DPDPA
   counsel is ⛔ NOT ENGAGED** — verified at this sitting: `counsel-roster.md` holds a single template
   row at `pending-trustee-selection` and the engagement ledger's §4 counsel-selection log is
   **empty**. **Row 3 and Row 17 bind the same event.**
   ⇒ **The Panel rules:** <(a) go live on the existing `-135`/`-136` authority, recorded as
   **accepted risk** and ⛔ never as "counsel was consulted" | (b) hold exposure until counsel is
   engaged | (c) go live NARROWED to the **shielded** name presentation via
   `pariwar.manage_public_name_presentation`, reverting to full names on counsel clearance —
   ⭐ exercising for the first time the separability `2026-08-19-135` Q5 required be built>.

6. **Counsel selection (Story 0.13 Task 8).** <The shortlist is opened at this sitting, ratified in a
   separate entry | Scheduled for <date>>. ⭐ It is the single upstream act behind **four of the ten**
   standing Panel obligations. ⛔ Tracked separately — a counsel engagement is ⛔ not a launch-gate
   closure and is ⛔ not folded into this entry.

**Open follow-ups:**
- ⛔ **Row 3 / DPDPA** — <per clause 5> — remains the Panel's, and is ⛔ not discharged by this entry.
- ⛔ **Each 11b surface's per-subject consent gate** — open, one per surface, ⛔ none discharged.
- ⛔ **Each 11b surface's own death/overlay exclusion** — ⛔ not inherited from `/members`.
- ⛔ **C-2** (no accessibility CI gate) · **C-3** (no aggregate-stat producer) · **C-4** (no FR-19
  producer) · **`2026-08-20-140` cl.7** — untouched, all open.
- ⚠ The **cache-latency** posture is ratified, ⛔ not remediated. Any future claim of a faster pull
  needs a purge mechanism that does ⛔ not exist today.
- ⚠ **AI-11a-1(b)** is ⛔ not discharged — it fires at Epic 11b's first authoring pass.

**References:**
- `docs/launch-gate-inventory/inventory-roster.md` — Row 17 (`directory-kill-switch-admin-ui`)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-23-row-17-directory-publication-ratification.md` — the note that put these questions
- `_bmad-output/implementation-artifacts/epic-11a-retro-2026-08-23.md` — action item **AI-11a-5**
- `_bmad-output/implementation-artifacts/10-30-directory-publication-kill-switch-admin-ui.md` — leg-one story
- `.decision-log.md#decision-2026-08-23-154` (Row 17 extended to 11b.1/11b.3/11b.6; C-5's two levers)
- `.decision-log.md#decision-2026-08-21-147` (cl.1 — the launch-gate designation; cl.1(d) — the non-immediacy prohibition this entry carries forward)
- `.decision-log.md#decision-2026-08-21-146` (cl.5 — **SUPERSEDED by clause 1**; cl.5(a) — the mechanism, which stands)
- `.decision-log.md#decision-2026-08-21-145` (cl.5(e) — the `s-maxage=300` disclosure clause 2 corrects and widens)
- `.decision-log.md#decision-2026-08-19-136` (cl.5 — DPDPA open) · `#decision-2026-08-19-135` (Q1/Q2 full-name authority; **Q5 — the separability clause 5(c) would exercise**)
- `apps/public/src/pages/members.astro:172` — the cache header verified for clause 2
- `docs/legal-counsel-engagement/counsel-roster.md` · `docs/legal-counsel-engagement/engagement-ledger.md` §4 — the counsel state verified for clause 5

---
```


---

## 5. ⛔⚠ CORRECTION DISCOVERED AFTER THE SITTING — Q4 and Q5 were put on a FALSE PREMISE

> ⭐ **Recorded openly, ⛔ not quietly folded into the entry, and ⛔ not back-filled into the questions
> as put.** Found by verifying **Row 3** before drafting the ratified entry — the check
> [[feedback_verify_before_committing_governance_claims]] exists for, and the class of error
> [[feedback_negative_claims_checkable_in_repo]] names: *a negative claim was repeated without
> grepping for its subject.*

### 5.1 The false claim

§2 Q4 of this note asserted, and the Epic 11a retrospective (C-5, and the Launch-Readiness table's
*"Legal counsel / DPDPA — 🔺 Not engaged"* row) asserts:

> **"DPDPA counsel is ⛔ NOT ENGAGED."**

⛔ **This is FALSE, and has been false since 2026-06-21.**

### 5.2 What is actually true, verified live at `cb95941`

**Counsel IS engaged, and is NAMED: Adv. Mohit Agrawal, "Story 0.13 engaged counsel."** Recorded in
**six** places:

| Artifact | Record |
|---|---|
| `.decision-log.md` **Decision 2026-06-21-057** | `**Legal counsel (DPDPA clearance):** Adv. Mohit Agrawal (Story 0.13 engaged counsel)` — a first-class entry field, cl.1 records the return |
| `docs/launch-gate-inventory/inventory-roster.md` **Row 3** | `current_status: closed` — closed **on that counsel return**, cited in `closure_evidence_link` |
| `docs/adr/ADR-0010-edge-waf-cloudflare-turnstile.md` | Header, §6 (`OPEN → CLEARED`), and two changelog rows |
| `_bmad-output/planning-artifacts/architecture.md:249` | The [P0] surface marked CLEARED on the return |
| `docs/knowledge-transfer/adr-index.md:17,134` | ADR-0010 `drafted → ratified` on the clearance |
| `_bmad-output/implementation-artifacts/deferred-work.md:2456` | D1-1.13 legal half CLEARED |

⇒ ⭐ **Row 3 is `closed`, and it is closed BY A COUNSEL RETURN.** The retro's Launch-Readiness table
and this note both said the opposite of a `closed` launch-gate row's own evidence link.

### 5.3 ⚠ THE GAP THAT MADE THE FALSE CLAIM LOOK TRUE — and it is a real finding

`grep -rn "Mohit" docs/legal-counsel-engagement/` returns **ZERO hits.** The Story 0.13 framework —
the artifacts whose entire purpose is to be the record of counsel engagement — **never captured the
engagement that demonstrably happened**:

- `counsel-roster.md` — a **single template row** at `pending-trustee-selection`; ⛔ no named counsel.
- `engagement-ledger.md` **§4 Counsel-selection log** — **empty**, holding its `<PENDING-TASK-8>`
  placeholder row.
- **§5 Engagement-signature log · §6 First-artifact-submission log · §7 Return-receipt log** — the
  2026-06-21 return is ⛔ recorded in none of them.

⭐ **So both readings were available in the repo, and the note took the one the ledger implied.**
⚠ **The ledger is wrong, ⛔ not the decision log** — a counsel return that six artifacts cite is not
undone by a placeholder row. ⛔ **This is un-attested history, ⛔ NOT a backfill opportunity**
([[feedback_record_unattested_no_backfill]]): the engagement is recorded **as it actually occurred and
where it was actually found**, ⛔ never reconstructed into the ledger's `<PENDING-TASK-8>` slots as
though the framework had captured it at the time.

### 5.4 ⭐ What the correction does ⛔ NOT do — the clearance does not reach the directory

⛔ **Counsel being engaged is ⛔ NOT counsel having cleared this.** `2026-06-21-057` cl.1 and cl.5
scope the clearance with unusual care, and the scope is **narrow**:

> cl.1 — *"the clearance is scoped to **the edge design as recorded in ADR-0010**"*
> cl.5 — *"⛔ **Do NOT extend the assertion to data-flows beyond that recorded design**, nor to
> surfaces not yet Cloudflare-proxied."*

⇒ ⭐ **The directory's full-legal-name publication posture has ⛔ NEVER been reviewed by counsel.** It
is a **different** review-scope-charter item — `review-scope-charter.md` **§1(b)** (DPDPA consent flow
design review) and **§1(a)** (public surface copy), ⛔ neither of which has a return.

⚠ **So the SUBSTANCE of Q4's risk is unchanged: the directory would go live un-reviewed.** ⛔ What
changed is the **reason**, and the reason is what the Panel is being asked to accept:

| | Q4 as put (FALSE) | Q4′ as it actually stands |
|---|---|---|
| Why is it un-reviewed? | **No counsel exists to ask** | ⛔ **Counsel exists, is engaged, has returned an artifact before — and was ⛔ not asked** |
| Accepted-risk framing | *"We could not obtain review"* | ⚠ *"We chose to expose before requesting a review we were in a position to request"* |
| Cost to obtain | Unknown — a whole selection process | ⭐ **A next-artifact instruction under a live engagement** |

⭐⛔ **THAT IS A MATERIALLY DIFFERENT THING TO ACCEPT, AND IT IS THE PANEL'S TO ACCEPT — ⛔ NOT THE
AUTHOR'S TO RE-READ ON THEIR BEHALF** ([[feedback_supersede_never_reinterpret]]). ⇒ Q4 is **held and
re-put**, ⛔ not silently re-based onto the corrected facts and ⛔ not recorded as ruled.

### 5.5 And Q5 is ⛔ MOOT AS PUT

Q5 asked whether to **open the counsel shortlist**. ⛔ **There is nothing to open** — selection
already happened and counsel is engaged. The Panel's answer (*"open it here, ratify separately"*)
answers a question that does ⛔ not obtain.

⚠ ⭐ **AND THE "FOUR OF TEN STANDING OBLIGATIONS BEHIND ONE UPSTREAM ACT" FIGURE IS NOW SUSPECT.**
That figure is carried by the retro, the sprint-status ledger and this note, and it counts **counsel
selection** as the blocking upstream act. ⛔ If selection is already done, the four obligations are
blocked on something else — or on nothing. ⛔ **Not re-counted here**, and ⛔ **not asserted either
way**: recorded as an open finding for the next retrospective.

---

## 6. The re-put questions

⛔ **New questions, ⛔ not edits to Q4/Q5.** The originals stand above with their rulings annotated.

### **Q4′ — Does the directory go live BEFORE requesting the name-publication review, from counsel who is already engaged?**

The three dispositions from Q4 are unchanged in shape. ⚠ What changes is that **(b) is now cheap** —
it is a next-artifact instruction under a live engagement, ⛔ not a selection process — and **(a) now
means declining an available review rather than proceeding without an obtainable one.**

| | Disposition | Restated on the corrected facts |
|---|---|---|
| **(a)** | Go live on the existing `-135`/`-136` authority | ⚠ Recorded as **accepted risk, with the corrected reason on the record**: counsel was engaged and available and ⛔ was not asked. ⛔ Never as *"counsel was consulted"*, and ⛔ never as *"no counsel was available"*. |
| **(b)** | Hold exposure until the name-publication review returns | ⭐ **Now a next-artifact instruction to Adv. Mohit Agrawal** under charter §1(b)+§1(a), ⛔ not a selection process. The 0.13 framework carries a per-artifact **5–10 business day SLA**. |
| **(c)** | Go live NARROWED to the **shielded** name presentation, reverting on clearance | Unchanged — and `2026-08-19-135` **Q5** required this separability be built precisely so a Trustee decision can toggle it **without redesign**. ⛔ Still never exercised. |

> **Author's recommendation — CHANGED by the correction, and the change is disclosed rather than
> quiet.** The 2026-08-23 draft recommended **(c) then (a)**, reasoning that (b) was expensive.
> ⛔ **That reasoning was wrong on the facts.** ⇒ **(b), or (c)-then-(b)** — a 5–10 business day
> request against a live engagement is a **small** price for the one review that would settle
> whether full legal names may sit on an unauthenticated page, and (a) now asks the Panel to accept
> a risk it is ⛔ in a position to simply retire.

### **Q5′ — How is the un-recorded engagement brought onto the Story 0.13 framework?**

⛔ **Two separable acts, and ⛔ neither is a backfill.**

1. **Record the engagement where it actually is** — `counsel-roster.md` gains a real row for Adv.
   Mohit Agrawal at its true lifecycle status, and `engagement-ledger.md` §4/§6/§7 gain rows
   **dated to this correction and citing `2026-06-21-057` as the source**, ⛔ explicitly marked as
   *reconstructed-from-the-decision-log, un-attested at the time* — ⛔ **NOT** written into the
   `<PENDING-TASK-8>` slots as though captured contemporaneously.
2. **Instruct the next artifact** — per Q4′.

> **Author's recommendation:** do **1** regardless of how Q4′ rules; do **2** if Q4′ is (b) or (c).

### **Q6′ — Does the retrospective's Launch-Readiness row get corrected?**

`epic-11a-retro-2026-08-23.md:431` records *"Legal counsel / DPDPA — 🔺 **Not engaged**"*, and C-5
(`:365`) repeats it. ⛔ Both are false.

> **Author's recommendation: annotate, ⛔ never rewrite** — a dated correction block appended beside
> the original rows, matching the `24b19d5` / `99b4a46` reconciliation discipline (**lines ADDED,
> 0 REMOVED**). ⭐ And the **process** finding is the one worth keeping: *a launch-readiness table
> asserted a negative that a `closed` launch-gate row in the same repo contradicted* — ⛔ neither the
> retrospective, nor AI-11a-1(a)'s reconciliation, nor this note's first draft caught it.

---

## 7. Commit sequence

⭐ Governance commits precede implementation and land **first**, `governance:` prefixed
([[feedback_governance_commits_precede_implementation]]).

1. `governance(decision): 2026-08-23-<NNN> — Row 17 leg two ratified; -146 cl.5 SUPERSEDED` —
   the entry, with §2's answers written in and every `<…>` slot resolved.
2. `governance(launch-gate): Row 17 — <closed|narrowed> on ≥2-trustee ratification` —
   `inventory-roster.md` `current_status` + `closure_evidence_link`, and this note annotated with
   the ruling ⛔ rather than edited.
3. `governance(sprint-status): Row 17 ledger entry 2026-08-23f` — the top-of-file reverse-chron
   **comment** ledger only. ⛔ **ZERO rows flip.** ⛔ No `development_status` key
   ([[project_sprint_status_ledger]]).
4. Any narrowing under clause 5(c) is **implementation** and follows in its own non-`governance:`
   commit, ⛔ never bundled with the above.
