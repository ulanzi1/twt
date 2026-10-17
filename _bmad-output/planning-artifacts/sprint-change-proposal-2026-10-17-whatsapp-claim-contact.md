# Sprint Change Proposal — Architecture §3.4 Amendment: WhatsApp contact about a claim, for the claimant and the nominee

- **Date:** 2026-10-17
- **Author:** BigDev (Solo Builder), from Story 6.37b
- **Input artifacts:** Decisions `2026-10-17-350`, `2026-10-17-351` and `2026-10-17-352` (Trustee-ratified — the delivery ladder and its
  consent rulings); `2026-10-17-353` (the row that builds it, `6-37c-undelivered-reminder-ladder`); architecture §3.4 *"Member WA
  opt-in flow"* (`architecture.md:2218-2245`); `docs/adr/ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md` (`ratified`,
  2026-07-08)
- **Trigger:** the Panel ruled that a correction or certificate reminder that is not delivered is followed up over WhatsApp, and that
  WhatsApp and calls reach the claimant AND the nominee — the claimant on their filing agreement, the nominee on a basis the Panel
  states the DPDP Act permits. Architecture §3.4's ratified *"Opt-in origination requirement"* allows WhatsApp only to a person who opted
  in by sending a message themselves or by an explicit, unbundled in-app consent — so the ruling departs from ratified architecture text.
- **Change scope classification:** **Minor edit, Major gate** — one new bullet in §3.4 and a dated note on ADR-0029; landing it needs
  Trustee Panel sign-off because it changes ratified architecture text and a ratified ADR.
- **Mode:** Incremental
- **Status:** **DRAFTED 2026-10-17 — not yet presented to the Panel.** Revised the same day (BigDev): the claimant's WhatsApp consent
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

### 1.2 Why this is not a re-litigation

The Panel's rulings stand; this proposal does not ask the Panel to revisit them. It asks the Panel to make the architecture say what
it has already decided, so the next reader of §3.4 does not take the ruled behaviour for a violation — or, worse, take §3.4 as
licence to message anyone on WhatsApp on a bundled consent outside a claim. A ratified text is changed by an explicit amendment, never
by a later ruling silently overriding it ([[feedback_supersede_never_reinterpret]]).

### 1.3 Evidence

- `-352`, verbatim: *"WhatsApp and calls go to the claimant and nominee both but The claimant's agreement doesn't cover the nominees.
  Instead it's permissible under DPDPA."*
- The filing agreement as built (`packages/i18n/locales/en/claim.json`, `contact.agreement`): *"I agree that the Trust may contact the
  nominees and the claimant named here, by text message and by post, about this claim."* — row 6-37c changes it to `-352` Q1's wording.
- `-352` records three items as not covered: the quoted legal basis against the Act's text (our understanding: the DPDP Act 2023 has no
  general "legitimate interest" ground; Section 7 lists specific legitimate uses; Section 17(1)(a) exempts processing necessary for
  enforcing a legal right or claim — to be confirmed by counsel; not legal advice); Meta's own requirement that a person opt in before
  a business messages them on WhatsApp; and this amendment.

---

## Section 2 — Impact Analysis

- **Architecture §3.4.** One new bullet after *"Opt-in origination requirement"*: a narrow exception for contact about a claim. The
  member opt-in flow, its origination rule and its STOP handling are unchanged for member notifications.
- **ADR-0029** (`ratified`). A dated amendment note pointing to the new §3.4 bullet; its decisions are unchanged.
- **Row 6-37c** builds the exception: the claimant's new agreement wording, the WhatsApp templates for the two reminders (Meta approval,
  English and Hindi), the nominee's WhatsApp step behind the go-live conditions in §3, the STOP handling for claim contact.
- **No other surface** gains WhatsApp by this amendment: member notifications still need the member's own opt-in.
- **Risk if not amended:** the built behaviour contradicts ratified architecture; a later change could cite §3.4 to remove it, or cite
  the claim exception to message people on WhatsApp outside a claim.

---

## Section 3 — Recommended Approach

Amend §3.4 with a **claim-contact exception** that is narrow by design:

1. **Who and what.** Only the claimant and the nominee of a claim, and only messages about that claim: the correction and certificate
   reminders' delivery ladder (`-350`, `-351`) and calls about the claim.
2. **The claimant's basis.** The filing agreement in `-352` Q1's wording — an explicit affirmative capture that names WhatsApp,
   recorded per claim with timestamp and the UI context, never pre-ticked. If counsel advises removing *"or any other means of
   communication that may appear in future"*, the production wording omits it (the agreement then names the listed channels only) and
   the Panel is told; no further ruling is needed for that narrowing. Withdrawing the agreement, or sending STOP, ends WhatsApp contact
   for that claim.
3. **The nominee's basis.** The processing the DPDP Act permits for contacting a nominee about a claim — the Panel's ruling — once
   counsel has confirmed in writing which provision applies.
4. **Unchanged safeguards.** The Pariwar's WhatsApp toggle and number are still required; STOP is honoured and audit-logged; every
   claim-contact WhatsApp message uses a Meta-approved template.
5. **Go-live conditions (proposed for the Panel's approval with this amendment):**
   - **G1** — counsel's written confirmation of the nominee's basis (which provision of the DPDP Act) is recorded before any WhatsApp
     message or call reaches a nominee;
   - **G2** — a check of Meta's WhatsApp Business policy for messaging a nominee who never opted in is recorded before the nominee's
     WhatsApp step goes live; if Meta does not allow it, the nominee's WhatsApp step is skipped (the ladder goes on to the next SMS) and
     the Panel is told;
   - **G3** — the claimant's new agreement wording is live (English and reviewed Hindi, as counsel settles its last clause) before any
     WhatsApp message reaches a claimant on it; a claim filed under the old wording keeps SMS, calls and post only.
   G1 gates the NOMINEE's WhatsApp step and calls to the nominee; G2 gates the nominee's WhatsApp step; the claimant's WhatsApp step
   needs G3 alone. *(corrected 2026-10-18, code review round 2 — internal consistency with G1 above; ⛔ a change of substance. It
   read: "G1 and G2 gate the NOMINEE's WhatsApp step only". ⚠ `-352` Consequence 3 gates nominee CALLS on the Meta check (b) too —
   *"WhatsApp and calls to a nominee do not go live until counsel confirms the legal basis in writing (a) and the Meta policy check
   (b) is recorded"* — which G2 as written does not: pending Story 6.37b review D5, ⛔ decided here.)*

---

## Section 4 — Detailed Change Proposals

### 4.1 `architecture.md` §3.4 "Member WA opt-in flow" — a new bullet after "Opt-in origination requirement" (after line 2244)

```diff
   bundled consent, or inference from other settings are not valid opt-in origins. This
   protects against compliance drift under Meta policy and DPDPA consent
   semantics.
+- **Claim-contact exception (Trustee Panel, Decisions 2026-10-17-350 / -351 / -352).**
+  Outside the member opt-in flow, WhatsApp may carry messages about a claim — the
+  correction and certificate reminders' delivery ladder — to two people only:
+  - the **claimant**, on the claim's filing agreement, which names WhatsApp among the
+    channels the Trust may use about this claim — an explicit affirmative capture
+    recorded per claim with timestamp + the UI context, never pre-ticked; withdrawing
+    it, or STOP, ends WhatsApp contact for that claim;
+  - the **nominee**, on the processing the DPDP Act permits for contacting a nominee
+    about a claim, as confirmed in writing by counsel before it goes live.
+  The exception does not change any member's opt-in state and opens WhatsApp to no
+  other surface; the Pariwar's WA toggle and number, Meta-approved templates, and STOP
+  handling apply unchanged. Go-live conditions G1–G3 (counsel's written basis for the
+  nominee; the Meta-policy check; the claimant's new agreement live) are recorded in
+  sprint row `6-37c-undelivered-reminder-ladder`'s comment (⛔ a roster row yet — that comment NAMES them; their text is §3 of this
  proposal).
 - **Fallback driven by WA-Cloud-API undelivered status,** not pre-send presence
   detection.
```

*(corrected 2026-10-18, code review round 2 — the last line of the new bullet read "roster row `6-37c-undelivered-reminder-ladder`'s
gate": the roster has no such row — `6-37c-undelivered-reminder-ladder` is a sprint-status row; ⛔ a change of substance.)*

**Rationale:** states the Panel's rulings in the architecture, limits them to contact about a claim, and keeps §3.4's origination rule
intact for every member notification.

### 4.2 `docs/adr/ADR-0029-whatsapp-webhook-ingress-and-opt-in-lifecycle.md` — a dated Changelog row (no decision text edited)

```diff
+| 2026-10-?? | (ratified — amended) | Trustee Panel | Architecture §3.4 gains the claim-contact exception (Decisions 2026-10-17-350 / -351 / -352; sprint-change-proposal-2026-10-17-whatsapp-claim-contact.md): WhatsApp about a claim to the claimant on the filing agreement and to the nominee on the DPDP basis counsel confirms; member opt-in unchanged |
```

### 4.3 Downstream pointers (applied only after 4.1 and 4.2 land)

- Roster: row 6-37c's gate carries G1–G3.
- `deferred-work.md`: none.

---

## Section 5 — Implementation Handoff

- **On approval:** a Trustee-ratified decision entry records the approval (and any conditions); §4.1 and §4.2 are applied in one commit;
  row 6-37c's create-story picks up the exception and G1–G3.
- **Before G1:** BigDev asks counsel (Adv. Mohit Agrawal) for a written view on the nominee's basis — which provision of the DPDP Act,
  and any conditions — and, in the same request, whether the claimant agreement should keep *"any other means … in future"*.
- **If not approved:** §3.4 stands. The claimant's WhatsApp step is unaffected (it already meets §3.4's explicit-capture origin); the
  nominee's WhatsApp step is not built, and the Panel is told the difference from `-352`.
