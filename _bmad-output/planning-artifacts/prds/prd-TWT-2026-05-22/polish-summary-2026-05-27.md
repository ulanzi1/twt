# Polish Summary — 2026-05-27

Scoped editorial polish on the 5 regions identified by the PM. Structural review found no issues; numbering, headings, and FR-100 structure (description → Consequences → Out of Scope → NFRs → Notes) all conform to PRD conventions. Prose-level tightening only.

## Region 1: Anita persona §2.3 (prd.md, ~line 53–55)

**No edits.** Region was already tight. The "She is what keeps the trust trustworthy" line is a deliberate stylistic flourish and left intact.

## Region 2: Anita extended §6.2 (addendum.md, ~line 172–185)

**1 edit** — bullet list parallelism and tightening.

- Before: `One-screen claim signal panel (FR-42). Five seconds. Her queue is dense and her day is full of back-to-back claim and helpdesk work.` / `One-tap approve / escalate. With a forced rationale text box, because she's seen what happens when audit logs don't hold up.` / `Helpdesk inbox routed to her by scope. Not a cross-state firehose.`
- After: `One-screen claim signal panel (FR-42). Five seconds. Her queue is dense; her day is back-to-back claim and helpdesk work.` / `One-tap approve / escalate, with a forced rationale text box — she's seen what happens when audit logs don't hold up.` / `Helpdesk inbox routed to her by scope, not a cross-state firehose.`

## Region 3: FR-1 v1-posture + Consequences/Out-of-Scope (prd.md, ~line 219–240)

**1 edit** — minor noun phrase tightening.

- Before: `Vyawastha Shulk receipt persistence retains \`paid_at\`, \`valid_through\`, \`amount\`, \`utr\`, \`payment_method\` indefinitely`
- After: `Vyawastha Shulk receipts retain \`paid_at\`, \`valid_through\`, \`amount\`, \`utr\`, \`payment_method\` indefinitely`

Note: A proposed tightening of the v1-posture paragraph (re-ordering the last clause to "FR-1 owns only the fee, not the future products it enables; forward-compat hooks live in §4.15") was rejected; original retained.

## Region 4: §4.15 Future Benefit Hooks + FR-100 (prd.md, ~line 1234–1266)

**2 edits** — sentence-level tightening; no structural change.

- "Separate entity for future requests" bullet: re-cast the lead clause from "Durghatana Sahayata, when shipped, will use a separate request/case entity (not the `claim` entity defined in §4.6 for nominee-on-death claims). v1 does **not** introduce that entity. v1's `claim` entity remains scoped to death-support nominee claims." to "When shipped, Durghatana Sahayata will use a separate request/case entity, not the `claim` entity defined in §4.6 for nominee-on-death claims. v1 does **not** introduce that entity; v1's `claim` entity remains scoped to death-support nominee claims."
- Ground-inspection out-of-scope bullet: trimmed "existing claim-side ground-inspection in §4.6 is scoped to death" to "the §4.6 claim-side ground-inspection is scoped to death".

Note: A proposed re-cast of the FR-100 description paragraph (to remove "request trust-paid assistance" redundancy) was rejected; original retained.

## Region 5: Jivandan + Durghatana Sahayata Glossary entries (prd.md, ~line 180–181)

**No edits.** Both entries are dense by design, but the language is precise and the v1/v2/v3 boundaries plus the Jivandan-vs-Durghatana-Sahayata distinction land cleanly. No tightening possible without erasing the architectural distinction the PM iterated on.

## Structural issues flagged but not fixed

None. Section numbering (4.1 through 4.15) is contiguous. FR-100 conforms to the PRD's FR convention (description → Consequences → Out of Scope → NFRs → Notes). Cross-references (`per FR-1`, `§4.15`, `§4.6`, `FR-20`, `FR-7`, `FR-47`) all resolve.
