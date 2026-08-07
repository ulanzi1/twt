# Sprint Change Proposal — Story 10.26 Escalation 5 (Missed-Cycle Member Surface)

- **Date:** 2026-08-07
- **Author:** BigDev (via `bmad-correct-course`)
- **Input artifact:** Decision `2026-08-06-081` (Story 10.26 implementation record, ESCALATION 5) · `deferred-work.md:23-112` (the six questions, verbatim, drafted by the story author at closure)
- **Trigger:** Story 10.26's R7(G) personal-event assertion carries an optional `cycle_ref` that ships unpopulated by any UI. No member surface shows a missed cycle at all — the Yogdaan Bahi lists attested contributions only. Six questions were recorded for the Trustee Panel, two blocking (Q1, Q4).
- **Change scope classification:** **Moderate** — a governance-text interpretive note + a code-comment clarification + governance-record closure land now; the actual member-facing story is deliberately NOT created until its dependency (Story 10.23) exists.
- **Mode:** Incremental
- **Status:** **Approved 2026-08-07 by the Trustee Panel** — all six questions answered; see Section 1.

---

## Section 1 — The Six Questions, Answered

### Q1 (BLOCKING) — May a member be shown their own missed cycles at all?

**YES — but sequenced after Story 10.23.** The transparency interest is real, but showing an obligation the member cannot yet act on (no catch-up mechanism exists) would be an incomplete, potentially more distressing disclosure than showing nothing. The story is commissioned in principle now; its creation is deferred until Story 10.23 (Restoration Discipline Lock-In, currently `backlog`) lands.

### Q2 — Is `missed-closed-cycle-v1` the Niyamavali's definition of a miss, or an implementation proxy?

**Neither, exactly — reframed during this review.** Verified live: the underlying fact already re-evaluates AS-OF the assessment instant (`packages/domain/src/contribution/facts.ts:236-238`, ratified 2026-08-05) — a late, tail-reconciled confirmation clears the skip. And R7(D)/(E)/(F) (`niyamavali.md:78-81`) explicitly prescribe *"catch-up of the missed contribution"* / *"complete all missed contributions"* — the obligation is completable by Niyamavali's own text, not closed at cycle end. This is **not a proxy** in the `prd.md:346` sense (a proxy stands in for a fact it cannot directly observe; this producer computes the actual governance fact under an already-ratified policy). **Ruling:**
- The underlying semantics are **ratified now** — landed as an interpretive note in `niyamavali.md` §3.1 (Section 4.1), which resolves the conflict with Q1 (an unratified proxy could not be shown to a member; a ratified fact can, once the reason to withhold it — no catch-up path — no longer applies).
- The "proxy" characterization is **explicitly rejected**, not merely softened.
- The **identifier is NOT re-pinned now.** Not because renaming is expensive (though `producer.ts`'s own header warns it is — payload hashes, cache reshaping), but because its full semantic boundary is unknown until Story 10.23 defines the complete restoration lifecycle (payment, catch-up completion, obligation discharge, member-facing explanation, possibly cycle linkage). A rename today would describe only today's raw observation, not the lifecycle a reader will expect the name to cover once 10.23 ships.
- **Constraint carried forward (not into Niyamavali text — into the decision log and the future story's AC):** no member-facing copy may imply "missed" is permanent or irredeemable before Story 10.23 exists.

### Q3 — Causes the pool engine structurally cannot see

**A distinct state is required**, not a single neutral label. At least three cases exist where a raw "no contribution recorded" would misattribute cause: an out-of-band contribution (sent directly to a bereaved family, not treated as wrong by trust policy), a member assigned but never notified, and a member in grace or under a moderation overlay during the window. Conflating these with an ordinary unconfirmed cycle recreates exactly the false-accusation risk Q1/Q2 exist to avoid. **This shapes the future story's AC** — an `unattributed`/`disputed` state (or equivalent) is required, not optional.

### Q4 (BLOCKING) — Does the assertion's cycle anchor have constitutional meaning, or is it decoration?

**KEEP.** Strengthened by Q2's ruling: Story 10.23's future restoration lifecycle will need to track catch-up/discharge per specific missed cycle, making `cycle_ref` the seam connecting an assertion to a future per-cycle resolution record. **The governing principle, recorded for citation:**

> Where a governance assertion concerns a specific contribution opportunity, its provenance shall identify that opportunity even if the assertion has no direct consequence of its own. **`cycle_ref` is provenance, not causation** — the assertion still carries no consequence of its own (§3.1, unchanged), but the provenance is preserved because later governance decisions may legitimately need to understand what the assertion referred to.

### Q5 — Does a member-facing list change what a trustee may act on?

**No — explicitly excluded.** Consistent with Decision `081`'s D4 (a clause may influence trustee understanding without influencing trustee suspicion), the same boundary applies on the member side: a trustee may not cite a member's visibility into their own missed cycles as an aggravating *"they were on notice"* factor in a suspension decision. **This is a binding constraint on the future story and on the Trustee-Lite surface**, not merely a preference.

### Q6 — Obligation to notify, or only to display?

**Display-only**, the conservative default the original entry assumed. The tone guide's anti-pressure rules (no manufactured urgency, no "you're behind") bind hardest on a proactive push. Notification can be revisited once the surface exists and Story 10.23's catch-up path is real.

---

## Section 2 — Impact Analysis

**Epic impact:** A member-facing missed-cycle surface is commissioned in principle, in Epic 10, explicitly dependent on Story 10.23. **Its story file is not created now** — that happens via `bmad-create-story` once 10.23 lands, per your explicit sequencing instruction. No `epics.md` edit in this proposal.

**Governance-text impact:** `docs/legal/niyamavali.md` §3.1 gains an interpretive note (Section 4.1) recording the Trustee Panel's ratified operational interpretation of "a skip" for R7(D)–(F) — **it does not change R7(D)–(F)'s substantive text**, and stays scoped to rule interpretation; the member-presentation constraint lives in the decision log and the future story's AC, not in the legal text.

**Code impact:** `packages/validity-service/src/producer.ts` gains a comment addendum (Section 4.2) — no logic change, no payload-hash impact, no re-pin.

**Artifact conflicts:**
| Artifact | Disposition |
|---|---|
| `docs/legal/niyamavali.md` §3.1 | Interpretive note added (§4.1) — subject to the normal legal-counsel-review process per Part 11; **not verified live as reviewed, recorded as an open follow-up, not claimed done** [[feedback_verify_before_committing_governance_claims]] |
| `packages/validity-service/src/producer.ts` | Comment addendum (§4.2), no logic change |
| `deferred-work.md` Escalation 5 | Closes with all six answers, per the entry's own stated closure condition |
| `.decision-log.md` | New entry, Q1–Q6 + forward commitments |
| `epics.md` | **Not touched** — the new story is created later, after Story 10.23 |
| PRD | Checked — no FR-text conflict; FR-88/8.8 notify family (Q6) unaffected since the answer is display-only |

**Technical impact:** None from this ruling directly. The future story's technical impact is assessed at its own creation.

---

## Section 3 — Recommended Approach

**Direct adjustment across four artifacts now; the fifth (the new story) deliberately deferred.** Rollback and MVP-review are both inapplicable. **Scope classification: Moderate** — a governance interpretation is ratified and a story is committed to in principle, but no architecture, PRD, or epic text changes, and the heaviest piece (the new story) is explicitly not started yet.

**Sequencing, stated plainly per your approval:**
1. Trustee Panel ratifies the governance interpretation (this proposal).
2. Record the decision (`.decision-log.md`).
3. Add the interpretive Niyamavali note, subject to the normal legal-review process.
4. Update governance records (`deferred-work.md`) and the explanatory code comment (`producer.ts`).
5. **Only after Story 10.23 lands**, create the member-facing missed-cycle story.

**Effort:** Low for what lands now. **Risk:** Low — no logic changes, Niyamavali change is interpretive not substantive.

---

## Section 4 — Detailed Change Proposals

### 4.1 `docs/legal/niyamavali.md` — interpretive note under §3.1

```diff
 > R7(C) and R7(F) form a two-rung gap ladder: a **6–11 month** gap restores under R7(F); a gap of
 **12 months or more** restores under R7(C), treated as a new registration. This preserves the
 intended escalation of consequences as inactivity increases.

+> **Operational definition of "a skip" (Trustee Panel interpretive ratification, 2026-08-07).** A
+> contribution cycle counts as a skip under R7(D)–(F) when the member was assigned to it and it
+> closed with no live, unreversed confirmation — assessed AS OF THE TIME OF EVALUATION, not frozen
+> at the moment the cycle closed. A contribution confirmed after cycle closure (whether through
+> later reconciliation or an authorized catch-up process) clears the skip once that confirmation
+> forms part of the record being evaluated. This note interprets what "a skip" means for R7(D)–(F)'s
+> application; it does not alter their substantive consequences.
```

### 4.2 `packages/validity-service/src/producer.ts` — comment addendum (no logic change)

```diff
  * radius is unchanged and remains migration-shaped: every payload hash moves, every cached row is
  * re-shaped, and every recorded flag's onset can shift.
+ *
+ * ── ⚖ CLARIFIED 2026-08-07 (Decision 2026-08-07-086). Not a proxy — a ratified fact, held back from
+ * member presentation only pending its restoration workflow. ─────────────────────────────────────
+ * `missed-closed-cycle-v1` is NOT standing in for another fact the way R7(A)'s `total_count < 10`
+ * proxy does (`prd.md:346`) — it IS the Trustee-Panel-ratified operational definition of "a skip"
+ * (see `niyamavali.md` §3.1's interpretive note). It stays un-rendered to members today only because
+ * the corresponding restoration workflow (Story 10.23, catch-up/complete-all) does not exist yet —
+ * showing this fact to a member today would be an INCOMPLETE explanation, since there would be no
+ * path to describe for resolving it. The identifier is NOT re-pinned now: its full semantic boundary
+ * (payment, catch-up completion, obligation discharge, member-facing explanation, possibly cycle
+ * linkage) is only known once Story 10.23 defines the complete restoration lifecycle. A future
+ * rename must describe that whole lifecycle, not merely the observation made at cycle close.
  */
```

### 4.3 `deferred-work.md` — close Escalation 5

Replaces `:23-112` with all six answers recorded verbatim (Section 1 above), the forward commitment to Story 10.23, and the closure condition the entry itself specified: *"Closed by Trustee Panel decision [id]"* with Q1 and Q4 answered.

### 4.4 `.decision-log.md` — new entry

Full Q1–Q6 ruling, drafted in Section 5's implementation.

---

## Section 5 — Implementation Handoff

**Scope classification: Moderate.**

- **Lands now (BigDev, Developer role):** `niyamavali.md` interpretive note, `producer.ts` comment, `deferred-work.md` closure, `.decision-log.md` entry.
- **Deferred, explicit dependency:** the member-facing missed-cycle story — NOT created until Story 10.23 (Restoration Discipline Lock-In) lands. When it is created, its AC must carry forward: the `unattributed`/`disputed` state requirement (Q3), the no-trustee-suspicion-inference constraint (Q5), display-only with no push notification (Q6), and the never-imply-permanence copy constraint (Q2).
- **Open follow-up, not claimed done:** legal-counsel review of the Niyamavali interpretive note, per Part 11's standing requirement — flagged, not verified live in this session.
- **Success criteria:** Escalation 5 shows closed in `.decision-log.md` with Q1 and Q4 explicitly answered (never "deferred pending review"); the `missed-closed-cycle-v1` "proxy" characterization is retired everywhere it appears; the future story has a recorded, citable dependency on Story 10.23 rather than an implicit one.

**All nine original escalations from this session are now closed or ruled:** 10.12 Escalations 1–4 (closed), 10.26 Escalation 5 (ruled here). **Remaining: 10.12 Escalation 5** (UX grammar gap — needs `bmad-ux`, a different skill).
