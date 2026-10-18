# Sprint Change Proposal — Architecture §3.4 Amendment: WhatsApp contact about a claim, for the claimant (the nominee half withdrawn — `-356`)

- **Date:** 2026-10-17
- **Author:** BigDev (Solo Builder), from Story 6.37b
- **Input artifacts:** Decisions `2026-10-17-350`, `2026-10-17-351` and `2026-10-17-352` (Trustee-ratified — the delivery ladder and its
  consent rulings); `2026-10-17-353` (the row that builds it, `6-37c-undelivered-reminder-ladder`; its WhatsApp step and the agreement's new wording now row
  `6-37d-claim-contact-whatsapp-step` — `2026-10-18-355` decision 1); architecture §3.4 *"Member WA
  opt-in flow"* (`architecture.md:2218-2245`); `docs/adr/ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md` (`ratified`,
  2026-07-08)
- **Trigger:** the Panel ruled that a correction or certificate reminder that is not delivered is followed up over WhatsApp, and that
  WhatsApp and calls reach the claimant AND the nominee — the claimant on their filing agreement, the nominee on a basis the Panel
  states the DPDP Act permits. Architecture §3.4's ratified *"Opt-in origination requirement"* allows WhatsApp only to a person who opted
  in by sending a message themselves or by an explicit, unbundled in-app consent — so the ruling departs from ratified architecture text.
- **Change scope classification:** **Minor edit, Major gate** — one new bullet in §3.4 and a dated note on ADR-0029; landing it needs
  Trustee Panel sign-off because it changes ratified architecture text and a ratified ADR.
- **Mode:** Incremental
- **Status:** **REVISED 2026-10-18, before presentation — NARROWED TO THE CLAIMANT** ([Decision 2026-10-18-356](../../.decision-log.md#decision-2026-10-18-356), Trustee-ratified: *"drop WhatsApp
  only notification for nominee"*). The nominee half is withdrawn: no WhatsApp to a nominee (BigDev's scope: in future only a nominee
  who has opted to receive it, or one who is also the claimant). The amendment still matters for the claimant: §3.4's channel model sends
  to members (recipients `member_ids`, a per-member opt-in through the member onboarding flow), and a claimant is often not a member — this
  bullet is the claimant's home in the architecture. G1 and G2 leave this amendment (G1 stays, outside it, as the condition for calls to a
  nominee — roster Row 34); G3 stays. Earlier status: **DRAFTED 2026-10-17 — not yet presented to the Panel.** Revised the same day (BigDev): the claimant's WhatsApp consent
  already meets §3.4; the amendment is needed for the nominee; the *"any other means"* clause is counsel's wording call, not a gate.

---

## Section 1 — Issue Summary

### 1.1 The conflict

Architecture §3.4 (ratified with ADR-0029) says:

> *"WA opt-in state may only transition to ACTIVE via a **user-initiated interaction** (the user-sent WhatsApp message above) or an
> **explicit affirmative consent capture** in-app (recorded with timestamp + the UI context). Passive defaults, pre-checked boxes,
> bundled consent, or inference from other settings are not valid opt-in origins. This protects against compliance drift under Meta
> policy and DPDPA consent semantics."*

The Panel has ruled (`-351` answer 2, `-352` Q1 and Q2) that:
- the **claimant** is contacted by WhatsApp on their filing agreement, which names *"text message, WhatsApp, phone call, post or any
  other means of communication that may appear in future"* — one agreement covering several channels, some not yet named;
- the **nominee** is contacted by WhatsApp and calls although they never opted in — the claimant's agreement does not cover them; the
  Panel's stated basis is that the DPDP Act permits contacting a nominee where it is necessary for the claim.

The **claimant** already fits §3.4's second origin: the filing agreement is an explicit affirmative capture that names WhatsApp, recorded
per claim and never pre-ticked. The words *"or any other means of communication that may appear in future"* are a wording detail for
counsel — if counsel advises against them, the production wording names the listed channels only, and the claimant's WhatsApp consent
is unaffected. The **nominee** does not fit §3.4 at all: they never opted in, and the claimant's agreement does not cover them. The
amendment is therefore needed for the nominee — and is written to cover contact about a claim as a whole, so §3.4 states the full rule.
*(2026-10-18, `-356`: the nominee half is withdrawn — the Panel dropped WhatsApp to a nominee. The bullet now covers the claimant only;
the claimant fits §3.4's origin rule but, often not a member, sits outside §3.4's member-only channel model — so the bullet is still
needed.)*

> ⚠ **Stated per Decision `2026-10-18-354` decision 2 (BigDev, D1 b — 2026-10-18):** the reading above — that the claimant already
> fits §3.4 — rests on `-352` Consequence 3's last clause, *"the claimant's WhatsApp step goes live on the new agreement"*, and it
> NARROWS `-351`'s not-covered item (b), *"Whether a single agreement covering SMS, WhatsApp, calls and 'any other means …' is
> explicit rather than bundled consent … is for counsel"*: this proposal treats that question as answered for the claimant. The Panel
> is told so when this proposal is presented. (The agreement is also captured staff-assisted — read aloud by helpline staff.)

### 1.2 Why this is not a re-litigation

The Panel's rulings stand; this proposal does not ask the Panel to revisit them. It asks the Panel to make the architecture say what
it has already decided, so the next reader of §3.4 does not take the ruled behaviour for a violation — or, worse, take §3.4 as
licence to message anyone on WhatsApp on a bundled consent outside a claim. A ratified text is changed by an explicit amendment, never
by a later ruling silently overriding it ([[feedback_supersede_never_reinterpret]]).

### 1.3 Evidence

- `-352`, verbatim: *"WhatsApp and calls go to the claimant and nominee both but The claimant's agreement doesn't cover the nominees.
  Instead it's permissible under DPDPA."*
- The filing agreement as built (`packages/i18n/locales/en/claim.json`, `contact.agreement`): *"I agree that the Trust may contact the
  nominees and the claimant named here, by text message and by post, about this claim."* — row 6-37d changes it to `-352` Q1's wording.
- `-352` records three items as not covered: the quoted legal basis against the Act's text (our understanding: the DPDP Act 2023 has no
  general "legitimate interest" ground; Section 7 lists specific legitimate uses; Section 17(1)(a) exempts processing necessary for
  enforcing a legal right or claim — to be confirmed by counsel; not legal advice); Meta's own requirement that a person opt in before
  a business messages them on WhatsApp; and this amendment.

---

## Section 2 — Impact Analysis

- **Architecture §3.4.** One new bullet after *"Opt-in origination requirement"*: a narrow exception for contact about a claim. The
  member opt-in flow, its origination rule and its STOP handling are unchanged for member notifications.
- **ADR-0029** (`ratified`). A dated amendment note pointing to the new §3.4 bullet; its decisions are unchanged.
- **Row 6-37d** builds the exception: the claimant's new agreement wording, the WhatsApp templates for the two reminders (Meta approval,
  English and Hindi), the STOP handling for claim contact (the nominee's WhatsApp step: withdrawn — `-356`).
- **No other surface** gains WhatsApp by this amendment: member notifications still need the member's own opt-in.
- **Risk if not amended:** the built behaviour contradicts ratified architecture; a later change could cite §3.4 to remove it, or cite
  the claim exception to message people on WhatsApp outside a claim.

---

## Section 3 — Recommended Approach

Amend §3.4 with a **claim-contact exception** that is narrow by design:

1. **Who and what.** Only the claimant of a claim (the nominee half withdrawn — `-356`), and only messages about that claim: the correction and certificate
   reminders' delivery ladder (`-350`, `-351`) and calls about the claim.
2. **The claimant's basis.** The filing agreement in `-352` Q1's wording — an explicit affirmative capture that names WhatsApp,
   recorded per claim with timestamp and the UI context, never pre-ticked. If counsel advises removing *"or any other means of
   communication that may appear in future"*, the production wording omits it (the agreement then names the listed channels only) and
   the Panel is told; no further ruling is needed for that narrowing. Withdrawing the agreement, or sending STOP, ends WhatsApp contact
   for that claim.
3. **The nominee — withdrawn (`-356`).** No WhatsApp goes to a nominee under this exception. (It read: the nominee's basis, the
   processing the DPDP Act permits, once counsel confirms in writing which provision applies.)
4. **Unchanged safeguards.** The Pariwar's WhatsApp toggle and number are still required; STOP is honoured and audit-logged; every
   claim-contact WhatsApp message uses a Meta-approved template.
5. **Go-live conditions (proposed for the Panel's approval with this amendment):**
   - ~~**G1**~~ and ~~**G2**~~ — withdrawn from this amendment with the nominee half (`-356`). (G1 read: counsel's written confirmation
     of the nominee's basis before any WhatsApp message or call reaches a nominee — it stays, OUTSIDE this amendment, as the condition for
     calls to a nominee, roster Row 34. G2 read: a check of Meta's policy for messaging a nominee who never opted in.)
   - **G3** — the claimant's new agreement wording is live (English and reviewed Hindi, as counsel settles its last clause) before any
     WhatsApp message reaches a claimant on it; a claim filed under the old wording keeps SMS, calls and post only.
   G1 gates the NOMINEE's WhatsApp step and calls to the nominee; G2 gates the nominee's WhatsApp step; the claimant's WhatsApp step
   needs G3 alone. *(2026-10-18, `-356`: there is no nominee WhatsApp step; the claimant's step needs G3.)* *(corrected 2026-10-18, code review round 2 — internal consistency with G1 above; ⛔ a change of substance. It
   read: "G1 and G2 gate the NOMINEE's WhatsApp step only". ⚠ `-352` Consequence 3 gates nominee CALLS on the Meta check (b) too —
   *"WhatsApp and calls to a nominee do not go live until counsel confirms the legal basis in writing (a) and the Meta policy check
   (b) is recorded"* — which G2 as written does not. ⭐ DECIDED by `2026-10-18-354` decision 5 (BigDev, D5 a): a nominee's WhatsApp
   waits for G1 AND G2, a call to a nominee for G1 — the Meta check governs WhatsApp, ⛔ calls; this line now states that rule.)*

---

## Section 4 — Detailed Change Proposals

### 4.1 `architecture.md` §3.4 "Member WA opt-in flow" — a new bullet after "Opt-in origination requirement" (after line 2244)

```diff
   bundled consent, or inference from other settings are not valid opt-in origins. This
   protects against compliance drift under Meta policy and DPDPA consent
   semantics.
+- **Claim-contact exception (Trustee Panel, Decisions 2026-10-17-350 / -351 / -352).**
+  Outside the member opt-in flow, WhatsApp may carry messages about a claim — the
+  correction and certificate reminders' delivery ladder — to ONE person only: the
+  **claimant**, on the claim's filing agreement, which names WhatsApp among the
+  channels the Trust may use about this claim — an explicit affirmative capture
+  recorded per claim with timestamp + the UI context, never pre-ticked; withdrawing
+  it, or STOP, ends WhatsApp contact for that claim. ⛔ WhatsApp goes to a nominee
+  under this exception (Decision 2026-10-18-356).
+  The exception does not change any member's opt-in state and opens WhatsApp to no
+  other surface; the Pariwar's WA toggle and number, Meta-approved templates, and STOP
+  handling apply unchanged. Go-live condition G3 (the claimant's new agreement live;
+  a claim filed under the old wording keeps SMS, calls and post only) is recorded in
+  §3 of this proposal and carried by sprint row `6-37d-claim-contact-whatsapp-step`.
 - **Fallback driven by WA-Cloud-API undelivered status,** not pre-send presence
   detection.
```

*(corrected 2026-10-18, code review round 2 — the last line of the new bullet read "roster row `6-37c-undelivered-reminder-ladder`'s
gate": the roster has no such row — `6-37c-undelivered-reminder-ladder` is a sprint-status row; ⛔ a change of substance.)*

**Rationale:** states the Panel's rulings in the architecture, limits them to contact about a claim, and keeps §3.4's origination rule
intact for every member notification.

### 4.2 `docs/adr/ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md` — a dated Changelog row (no decision text edited)

```diff
+| 2026-10-?? | (ratified — amended) | Trustee Panel | Architecture §3.4 gains the claim-contact exception (Decisions 2026-10-17-350 / -351 / -352; sprint-change-proposal-2026-10-17-whatsapp-claim-contact.md): WhatsApp about a claim to the claimant on the filing agreement (⛔ to a nominee — Decision 2026-10-18-356); member opt-in unchanged |
```

### 4.3 Downstream pointers (applied only after 4.1 and 4.2 land)

- Roster: row 6-37d's roster row carries G3; calls to a nominee wait for G1 at roster Row 34 (row 6-37c — outside this amendment).
- `deferred-work.md`: none.

---

## Section 5 — Implementation Handoff

- **On approval:** a Trustee-ratified decision entry records the approval (and any conditions); §4.1 and §4.2 are applied in one commit;
  row 6-37d's create-story picks up the exception and G3.
- **Counsel:** the written question (`counsel-question-2026-10-18-nominee-contact-basis.md`) asks about calls to a nominee (G1, Row 34 —
  outside this amendment) and whether the claimant agreement should keep *"any other means … in future"*.
- **If not approved:** §3.4 stands — WhatsApp only to a member who opted in; a claimant outside that flow gets no WhatsApp about the
  claim, and the Panel is told the difference from `-352` Q1. (It read: "The claimant's WhatsApp step is unaffected (it already meets
  §3.4's explicit-capture origin)" — corrected: the origin rule is met, the member-only channel model is not.)

*(corrected 2026-10-18, Story 6.37c Task 0.4, before presentation — [Decision 2026-10-18-355](../../.decision-log.md#decision-2026-10-18-355) decision 1 moved the WhatsApp step and the agreement's new wording from row 6-37c to row `6-37d-claim-contact-whatsapp-step`; five sentences that named row 6-37c for that work now name 6-37d (the input-artifacts line, the agreement line, "Row 6-37d builds the exception", the roster line, the on-approval line). ⛔ A change of what the Panel is asked to approve.)*
*(corrected 2026-10-18, Story 6.37c Task 0.4, before presentation — the §4.1 new bullet's last line pointed at sprint row
`6-37c-undelivered-reminder-ladder`'s comment; after `2026-10-18-355` G1's WhatsApp half, G2 and G3 belong to row 6-37d and G1's call half
to roster Row 34, so the line now names those. ⛔ A change of what the Panel is asked to approve.)*

*(revised 2026-10-18, before presentation — [Decision 2026-10-18-356](../../.decision-log.md#decision-2026-10-18-356) (Trustee-ratified): the nominee half withdrawn — the title, the Status, §1.1 (a note), §2's 6-37d line, §3 items 1, 3 and 5 (G1, G2 struck and kept as record), the §4.1 bullet (now the claimant only, with G3's definition), §4.2's changelog row, §4.3, §5. This DOES change what the Panel is asked to approve: the nominee half is no longer asked; the CLAIMANT's exception, unchanged in substance, still is.)*
