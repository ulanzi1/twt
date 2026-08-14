# Story 10.21 Escalations — Trustee Consent Sheet (2026-08-14, off-portal DPDPA access)

**Purpose:** collect Trustee Panel rulings on the **eight** open questions raised by Story 10.21
(off-portal DPDPA access) and left deliberately unanswered by Decisions `2026-08-14-106`,
`2026-08-14-107` and `2026-08-14-108`. Mark **Rule / Defer / Reject** and initial, per row.

**Trustee Panel (≥2-trustee quorum required to rule):** Dhiraj Rahul (Trustee 1) · Kalpana Bharti (Trustee 2)
**Prepared by:** BigDev (Solo Builder)
**Authority for these rulings:** Niyamavali **§8.7** (the Panel constituted as a Part 8 sanctioning
authority, Decision `2026-08-10-096`); **§8.4** (statutory rights survive termination, Decision
`2026-08-10-097` clauses 9–10); `.decision-log.md` as the durable record of trustee-ratified
operational decisions.

> ### ⛔ What this sheet is NOT
>
> **It is not a record of consent.** *(As prepared. ⚠ The session has since been held on 2026-08-14 —
> see the Session Resolution, which is now filled from what was ruled. This paragraph is retained as
> written because it states the discipline the sheet was built on; the initials block is **still**
> uncountersigned, so its central claim continues to hold.)* The Session Resolution below is **blank**
> and stays blank until a real session happens with real initials. This project has already had to file a correction —
> Decision `2026-08-12-101` — because a decision-log entry once claimed *"CONFIRMED by the Trustee
> Panel"* with no corresponding session anywhere in the record. ⛔ Nothing on this sheet may be
> treated as ruled, and no cascade runs, without initials from both trustees named above.
>
> **It does not put the `termination_access_block` flip to the Panel.** That flip is Panel-exclusive
> (Decision `2026-08-10-097` clause 12 bullet 4; `2026-08-10-098` clause 2) and is gated on Story
> 10.21 having landed. ⚠ **Whether the gate is discharged is itself Row 2's question**, so the flip
> cannot be ruled on the same sheet that decides what discharges it. It comes back on its own sheet,
> after Row 2.
>
> **It does not re-open what is already settled.** Three adjacent questions were recorded **closed on
> evidence** in Decision `2026-08-14-107` and are deliberately absent as rows: that *"Trustee"* does
> not mean `state_trustee`; that the Helpdesk Operator may intake/verify/route but may **not**
> execute; and that the routing mechanism itself needs no change. Asking a settled question invites a
> ruling that contradicts ratified §8.7 text.

**Status of the work these rulings gate:** Story 10.21 is **`in-progress`, not done**. Its un-blocked
scope has landed and is verified (`ci:local` 30/30; live-DB `@twt/domain` 2771 passed, `@twt/api` 956
passed). Five blocks remain open. **The release gate is OPEN.**

---

## ⚠ Read-first — the two things that change how you read every row

**1. Legal counsel is NOT engaged, and four of these rows are counsel-shaped.**
**Rows 3, 4, 5 and 6** are questions this project has recorded as *Trustee Panel **+ Legal Counsel***.
⚠ *Corrected 2026-08-14 (post-session):* this line originally read *"Rows 3, 5, 8 and 9"* — those are
the **escalation** numbers from `2026-08-14-106`, not this sheet's **row** numbers, and there is no
Row 9. The footnote at the foot of this sheet always said Rows 3/4/5/6 correctly, so the sheet
contradicted itself. ⛔ Corrected in place rather than overwritten, because the erroneous line named
**Row 8** (export-content ownership) as counsel-shaped when it is not — a Panel reading only the
read-first block could have deferred the wrong row waiting for counsel.
Counsel is not engaged: `counsel-roster.md` sits at `pending-trustee-selection`, and Story 0.13's
counsel shortlist / selection / engagement-letter tasks are unclosed. ⛔ **If the Panel rules these
rows today, the ruling arrives on Panel attestation alone and must be recorded as
`un-attested`** — the precedent is Decision `2026-08-06-080`, followed again at `2026-08-10-096`
clause 5. That is a legitimate route; it is not a substitute for counsel, and it must not be written
up as one.

> ⚠ *Correction to a repeated claim, so the Panel is not misled by our own paperwork:* Story 10.21
> states that *"every field in `docs/legal-counsel-engagement/` is `<PENDING>`."* That literal
> phrasing is **stale** — there are no `<PENDING>` tokens left in those files. **The substance is
> unchanged and was verified for this sheet:** counsel is genuinely unselected and unengaged. Only
> the wording was wrong.

**2. Deferring costs nothing today, and the Panel should know that before feeling time pressure.**
`termination_access_block` ships **DEFAULT OFF** and its flip is gated on Story 10.21. **No member
can be terminated-with-access-ended while these questions are open**, so there is no interval in
which a member needs a route and has none. ⛔ There is no urgency argument for ruling any row
quickly, and none is being made. Rows 1 and 2 are the two that *block* further engineering; the rest
block narrower things or nothing at all.

---

## Decision rows

Each row is one escalation, quoted from its source and stated as options. ⛔ The options are
genuinely open — none is pre-selected, and where an earlier draft of Story 10.21 presumed an answer
that presumption was removed and is noted.

### Row 1 — Delivery of the built export artifact `[blocks AC-R1]`

**The question.** Story 10.21 **builds** a terminated member's data export off-session but delivers
it to no one. `data_exports.artifact_ciphertext` is the member's whole assembled dossier as one
Tier-1 envelope ciphertext. How may it reach the member?

⚠ Posed as **three** questions, because the binary form is what let an earlier draft assume its own
answer:

| | Question | Options |
|---|---|---|
| **1(i)** | Is **staff-mediated delivery** — a staff actor obtaining a member's assembled, **decrypted** Tier-1 export — permitted **at all**? | (a) Yes · (b) No, never |
| **1(ii)** | If an **OTP-verified member grant** is the primary route, is staff-mediated permitted as a **fallback** for a member who no longer controls the registered mobile — and under what conditions? | (a) Not permitted · (b) Permitted with step-up alone · (c) Permitted with a recorded justification · (d) Permitted with a second-actor authorisation |
| **1(iii)** | If staff-mediated is permitted at all, is it permitted as the **v1 primary**? | (a) Yes · (b) No — member grant is primary |

⛔ **Nothing in the shipped code presumes any of these.** An earlier draft asserted that staff-mediated
delivery *"is required as the fallback under either ruling"* and built it; that assertion was
unfounded and the code was removed. If 1(i) is **(b) No**, staff-mediated is not a fallback — it is
**forbidden**, and a story that had built it would have decided this by implementation.

**Decision:** ☐ Ruled as: __________ **Conditions:** ______________________

---

### Row 2 — Correction, and what discharges the release gate `[blocks AC-R2]`

**The question.** The **correction** right has **no mechanism anywhere, on any surface, for any
member** — not only for terminated ones. Niyamavali §8.4 names four rights (access, correction,
portability, erasure); three now have a route and correction does not.

**What discharges the `termination_access_block` release gate?**

| Option | Meaning |
|---|---|
| **(a)** | Three mechanized rights **plus a recorded, staff-executed correction process** discharge the gate |
| **(b)** | **All four** must be mechanized before the gate is discharged |
| **(c)** | Something else the Panel specifies |

⚠ This question is **prior to** any acceptance criterion, which is why Story 10.21's AC6 is
deliberately empty. ⛔ Building a general admin member-profile editor is a **much larger act** than
Story 10.21 owns — its own RBAC surface, its own PII write-audit posture, and its own
correction-vs-falsification governance question, none of which has been analysed. A ruling of (a)
should say what "recorded process" means; a ruling of (b) should name the owner.

**Decision:** ☐ Ruled as: __________ **Conditions:** ______________________

---

### Row 3 — Moderation-record disclosure to the data principal `[counsel-shaped; blocks nothing today]`

**The question.** Is the **decision note** — and 10.20's three further Tier-1 moderation columns
(`escalation_inadequacy`, `escalation_proportionality`, `immediate_termination_reason`), and
`actor_display` — **owed to the data principal** under the DPDPA access right?

This is **admin-authored deliberative text about the member**, written by a trustee under governance
authority. Exporting it discloses internal moderation reasoning verbatim; withholding it withholds
reasoning about the member from the member. ⚠ It is consequential either way — **it changes what a
trustee can safely write in that field.** The member already learns the moderation **outcome** and
its **reason-code label** through the status panel and the notification.

| Option | Meaning |
|---|---|
| **(a)** | Owed — the fields ride the export |
| **(b)** | Exempt as deliberative material — withheld, and the exemption recorded |
| **(c)** | Split — some fields owed, others exempt (Panel specifies which) |

⚠ Whoever answers should also decide whether **`actor_display`** rides along: naming the acting
trustee to a terminated member is its own decision.

**Decision:** ☐ Ruled as: __________ **Conditions:** ______________________

---

### Row 4 — The statutory response horizon `[counsel-shaped; blocks nothing today]`

**The question.** A data-rights request currently inherits the helpdesk `other` desk's SLA: **24h
first response / 5 business days resolution**. Does that satisfy the DPDPA's statutory response
window?

⛔ Story 10.21 **did not invent a number to look compliant**, and says so in its own acceptance
criteria: the SLA is *"carried knowingly, pending the ruling."* This is a legal question the
engineering team is not competent to answer.

| Option | Meaning |
|---|---|
| **(a)** | 24h / 5 business days is adequate — carried as-is |
| **(b)** | A shorter horizon is required (Panel specifies) |
| **(c)** | Deferred to counsel once engaged |

⭐ **If a shorter horizon is ruled, the fix costs no code**: a Pariwar publishes a routing-policy
**override**, which is exactly what the versioned registry exists for.

**Decision:** ☐ Ruled as: __________ **Conditions:** ______________________

---

### Row 5 — `claim_history.json`'s subject predicate `[counsel-shaped; blocks AC5's claim arm]`

**The question.** What is a member owed about a **claim they participated in**, and in which role?

Claims are about a **deceased** member. The requesting member can appear across seven tables in at
least six roles — claimant, nominee, verifier, R9 voter, shepherd, ground inspector, assigned donor.
⛔ **The obvious joins leak a third party's PII**: an unqualified "give them their claim history"
would export **another member's** identity, nominee bank details, or medical disclosure into a
decrypted ZIP.

⚠ **FR-95 does not name claim history at all.** So its scope is unspecified from *every* direction —
not by FR-95, not by the epic, not by the data contract, and not by Story 10.21.

| Option | Meaning |
|---|---|
| **(a)** | Claim history is **not** owed — the section is dropped |
| **(b)** | Owed only where the member is the **claimant** |
| **(c)** | Owed across named roles the Panel specifies, with third-party fields masked |

**Decision:** ☐ Ruled as: __________ **Conditions:** ______________________

---

### Row 6 — Does DPDPA erasure reach a **fulfilled** access request? `[counsel-shaped; blocks AC11's `consumed` arm only]`

**The question.** When a member is erased, their export rows are zeroed. For a row marked
**`consumed`** — meaning the member **actually downloaded** their export — should the **status** also
be overwritten to `expired`?

⛔ **The zeroing is uncontroversial and already ships** (the TTL vacuum has always done it). Only the
**status change** is contested: overwriting `consumed` destroys the record that a statutory-access
request was **fulfilled**.

| Option | Meaning |
|---|---|
| **(a)** | Retain `consumed` — the fulfilment record is audit history the Trust must keep |
| **(b)** | Overwrite to `expired` — erasure reaches the metadata of a fulfilled request too |

⚠ The `pending` and `ready` arms are **settled and already shipped** — they are not on this sheet.
(The `pending` flip is load-bearing: it stops an in-flight build resurrecting the dossier after the
erasure commits.)

**Decision:** ☐ Ruled as: __________ **Conditions:** ______________________

---

### Row 7 — Who receives an off-portal DPDPA request requiring **Trustee** authority? `[blocks AC-R3]`

**The question.** Raised as Escalation 10 by Decision `2026-08-14-107` after a focused trace.

⭐ **The finding the Panel needs first: the Trustee Panel has governance authority and NO operational
queue.** `trustee_panel` is a real seeded role at a `pariwar` ceiling — so unlike `state_trustee` it
*could* satisfy the check — but it holds exactly `member.moderate` + `member.restore_terminated`
and **no helpdesk capability at all**. It cannot see the queue, open a ticket, reply, or resolve.

| | Question | Options |
|---|---|---|
| **7(i)** | Does **any** off-portal DPDPA action require **Trustee Panel** authority — specifically **erasure of a terminated member**, which sits adjacent to the Panel-exclusive `member.restore_terminated`? | (a) None does — disposition recorded, **no code changes** · (b) Erasure does · (c) Others the Panel names |
| **7(ii)** | If some action does, **who is the operational recipient**? | (a) Grant the `trustee_panel` role the fulfilment capability · (b) Keep execution with `pariwar_admin` as **Trustee-Lite**, requiring a recorded Panel authorisation as a precondition · (c) Trustee authority attaches to the **decision**, never the **execution** |

⛔ **A warning the Panel should have before naming a destination:** if the answer is expressed only as
*routing*, it carries **no enforcement**. `routed_to_role` is an advisory queue filter that **no
authorization path reads**, and the registry does not constrain a routing target to real roles — so a
Panel-named routed destination would be **silently inert**. Enforcement must land in a **permission
grant** and/or a **caller precondition**.

⚠ Today `member.data_rights` is granted to `pariwar_admin` **only**. `trustee_panel` is deliberately
**not** a holder pending this ruling, and the test suite records that exclusion as *pending-a-ruling*
so a future grant fails until a decision id exists.

**Decision:** ☐ Ruled as: __________ **Conditions:** ______________________

---

### Row 8 — Ownership only: who owns the export-content data contract? `[blocks AC5's content half]`

**The question.** This row asks the Panel for **an owner, not a design.**

The export's `contribution_history` and `claim_history` sections are structurally empty by contract —
they *reject* any record — and the record **shapes were never specified**. Defining them is a
data-contract decision with PII consequences (they land decrypted in a ZIP that Row 1 may hand to a
staff actor), and it interacts with Rows 3 and 5.

| Option | Meaning |
|---|---|
| **(a)** | A **named successor story** owns it — Story 10.21 ships without the content |
| **(b)** | Story 10.21 is **re-scoped by ruling** to carry it |

⚠ Recorded as *"ambiguous by construction"* in Story 10.21 — its owner is *"a named successor story
**or** this story re-scoped by ruling — the Panel/PO decides which."* It enters the standing Panel
queue **only if the Panel takes it**.

**Decision:** ☐ Ruled as: __________ **Conditions:** ______________________

---

## ⛔ Deliberately NOT on this sheet — so absence is not read as omission

- **Escalation 4** (the default-routing-policy versioning defect — the golden-hash guard prescribes a
  remedy that would misresolve every published override and make historical tickets un-replayable)
  and **Escalation 6** (the inert `ON DELETE CASCADE` class, wider than `data_exports`). ⛔ Both are
  owned by **a named successor story, not the Panel**. They are engineering defects with named
  re-triggers, recorded in `deferred-work.md`.
- **The `termination_access_block` flip** — downstream of Row 2, see the header.
- **The three sub-questions closed on evidence** in `2026-08-14-107` — see the header.

**Standing Panel obligation queue.** It stood at **nine** after Story 10.20. ⛔ State any new count by
**enumeration, not arithmetic on that number**, and state it as a count — **not as progress**.

---

## Points the panel may want to probe before signing

1. **Row 1 — does "permitted at all" need a standing condition rather than a yes/no?** If staff-mediated
   delivery is permitted, a staff actor obtains a member's decrypted Tier-1 dossier — the first path in
   this system on which that happens. The Panel may want to attach a condition (a second-actor
   authorisation, a recorded justification, a time limit on the artifact) rather than ruling a bare yes.
2. **Row 2 — is "a recorded, staff-executed correction process" auditable enough to discharge a
   statutory right?** A process that lives only in a runbook has no test and no evidence. If (a) is
   ruled, the Panel may want to say what recorded means — a ticket, an audit line, an event.
3. **Row 3 — ruling (a) "owed" changes trustee behaviour, not just the export.** If decision notes
   become disclosable to the member they describe, trustees will write them differently. That is a
   real consequence of the ruling and arguably the main one.
4. **Row 7 — (ii)(b) may be the least disruptive answer, and that is not the same as the right one.**
   Keeping execution with `pariwar_admin` and requiring a recorded Panel authorisation preserves
   today's operational shape. But it also means the Panel's authority over a statutory right is
   enforced by a recorded field rather than by who holds the key. The Panel should choose that
   knowingly if it chooses it.
5. **Rows 3, 5, 6 — is ruling without counsel the right call for these three?** All three are DPDPA
   interpretation. The Panel has the standing precedent to rule alone and record it un-attested. It
   also has the option of deferring precisely these three until counsel is engaged, and ruling the
   rest today. ⛔ That split is available and is not being recommended either way.

None of these block a ruling on their own — they are the questions' own edges, surfaced so the Panel
probes them deliberately rather than meeting them later.

---

## After the session — what I do per ruled row

⛔ **I will not perform any of this until an actual Trustee Panel session has happened.** This sheet
is prepared **for** that session and is not a stand-in for it. Per
[[feedback_record_unattested_no_backfill]] and [[feedback_verify_before_committing_governance_claims]],
nothing below the Session Resolution line gets marked ruled without real initials from Dhiraj Rahul
and Kalpana Bharti.

Per ruled row:

1. **`.decision-log.md`** — one entry for the session (next number after `2026-08-14-108`), recording
   each ruling **by row**, with per-clause provenance (mandatory under `2026-08-09-095`) separating
   trustee-ratified clauses from author-committed ones. Rows 3, 5 and 6 additionally recorded as
   **`un-attested`** if ruled without counsel.
2. **Story 10.21** (`_bmad-output/implementation-artifacts/10-21-off-portal-dpdpa-access.md`) — fill
   the corresponding `AC-R1` / `AC-R2` / `AC-R3` placeholder **citing the decision id**, un-block the
   matching task, and correct every scope statement, banner and block count in the same pass.
   ⛔ Story 10.21 has a recorded history of AC edits not propagating to its Tasks list; the
   propagation is part of the cascade, not a follow-up.
3. **`deferred-work.md`** — move any row the Panel assigns to a named successor story, with a
   non-epic re-trigger.
4. **Implementation** — only the model the ruling permits. ⛔ The model the ruling did **not** permit
   is not built "for later" and not left behind a flag: a dormant staff-decrypt path is the same
   capability, merely unlit.
5. **§8.4a** (`docs/legal/niyamavali{,.hi}.md`) — re-state the "Statutory rights (DPDPA)" disposition
   to match, in **both locales**, reproduced verbatim into the decision log because `docs/legal/` is
   untracked. ⛔ A stale disposition is the same defect the row had before `2026-08-14-108` fixed it.
6. **Sprint status** — Story 10.21 stays `in-progress` until every block is closed. ⛔ A partial
   ruling does not make it `done`.

---

## Session Resolution

Session held **2026-08-14**. All eight rows ruled; none deferred, none rejected.

> ⚠ **RULINGS RECORDED AS REPORTED BY THE PREPARER. THE INITIALS BLOCK BELOW IS NOT YET
> COUNTERSIGNED.** The rulings are entered here because they were reported; the **attestation** is
> incomplete until both trustees initial. ⛔ Until then, no clause of Decision `2026-08-14-109` may
> be cited as counter-signed. This is recorded openly rather than backfilled
> ([[feedback_record_unattested_no_backfill]]) — Decision `2026-08-12-101` exists because a Panel
> confirmation was once asserted with no session record behind it, and this note is how that is
> avoided here. ⛔ Do not fill the initials on anyone's behalf.

Quorum met: ☑ Yes (≥2 trustees present) ☐ No — session not quorate, no rulings recorded

| Row | Escalation | Decision | Conditions / amendments |
|---|---|---|---|
| 1 | Delivery of the export artifact | ☑ **Ruled — A: member-direct delivery** | Settles **1(iii)** (member grant is primary); the staff-mediated model is not built. ⛔ **1(ii) — the lost-mobile fallback — was NOT separately answered** and is carried as an OPEN sub-question, not inferred either way. |
| 2 | Correction + gate discharge | ☑ **Ruled — A: three mechanized rights + a recorded helpdesk-ticket correction process are sufficient** | ⛔ No general member-profile editor. Makes the gate **dischargeable**, does **not** discharge it; the flip stays a separate Panel-exclusive act. |
| 3 | Moderation-record disclosure | ☑ **Ruled — B: internal deliberative material is withheld** | Covers the decision note, 10.20's three further Tier-1 columns, and `actor_display`. The member still learns the outcome + reason-code label. **Un-attested** (counsel unengaged). |
| 4 | Statutory response horizon | ☑ **Ruled — 48h first response / 5 business days** | ⭐ The shipped `other` desk is **24h/5** — stricter, therefore already compliant. ⛔ **No code change; `DEFAULT_ROUTING_POLICY` untouched.** Do not loosen 24h to 48h. **Un-attested.** |
| 5 | `claim_history` subject predicate | ☑ **Ruled — B: claimant only** | Closes the third-party-PII hole by construction. Nominee / verifier / R9 voter / shepherd / inspector / assigned-donor roles are out of scope. **Un-attested.** |
| 6 | `consumed`-row retention | ☑ **Ruled — A: retain `consumed` as the fulfilment/audit record** | ⭐ Already the shipped behaviour. Zeroing still applies. AC11's `consumed` arm un-blocks as **already-correct**; no code change. **Un-attested.** |
| 7 | Trustee-authority recipient | ☑ **Ruled — 7(i): No, no DPDPA action inherently requires Panel authority · 7(ii): Trustee decides, authorised administrator executes** | **AC-R3 closes with a disposition and NO code changes.** ⛔ `trustee_panel` is not granted `member.data_rights`; the exclusion's rationale changes from *pending a ruling* to *ruled: not required*. |
| 8 | Export-content ownership | ☑ **Ruled — A: a separate successor story owns the export-content contract** | AC5's content half **transfers out** of Story 10.21 — transferred, not abandoned. Successor story still **unnamed**. |

Counsel attestation status for Rows 3, 4, 5, 6: ☑ **un-attested (Panel alone)** ☐ counsel-attested

Trustee initials: ______ (DR)  ______ (KB)   Date: 2026-08-14 *(initials pending — see the caveat above)*

Logged in `.decision-log.md` as Decision **`2026-08-14-109`**. Cascade applied: **in progress — see below**

---

### Footnote — ruling weight (for triage, grounded in the decision log)

Consistent with prior sheets' distinction:

- **Light-touch** — engineering-substrate / reversible. **Row 8** (ownership only — it assigns work,
  it does not decide a design).
- **Trustee-judgment** — where the choice is materially the Trust's. **Rows 1, 2, 7** (a PII-disclosure
  posture, what discharges a release gate, and where authority over a statutory right sits).
- **Trustee-judgment, counsel-shaped** — DPDPA interpretation the Panel may rule alone but should
  record un-attested. **Rows 3, 4, 5, 6.**

The weight column is a triage aid, not a status — **every** row still requires the ≥2-trustee quorum.
