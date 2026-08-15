# Story 10.21 Escalation 11 — Trustee Consent Sheet (2026-08-15, the fallback's member-request fact)

**Purpose:** collect the Trustee Panel's ruling on the **one** open question raised by an adversarial
code review of Story 10.21's shipped implementation (2026-08-15) and recorded as **Decision
`2026-08-15-115`** / **Escalation 11**. Mark **Rule / Defer / Reject** and initial.

**Trustee Panel (≥2-trustee quorum required to rule):** Dhiraj Rahul (Trustee 1) · Kalpana Bharti (Trustee 2)
**Prepared by:** BigDev (Solo Builder)
**Authority for this ruling:** Niyamavali **§8.7** (the Panel constituted as a Part 8 sanctioning
authority, Decision `2026-08-10-096`); **§8.4** (statutory rights survive termination, Decision
`2026-08-10-097` clauses 9–10); the ratified three-part fallback gate itself (Decision
`2026-08-14-113` clause 1) and its precedent warning against collapsing member-authored and
staff-authored facts (Decision `2026-08-14-111` clause 3); `.decision-log.md` as the durable record of
trustee-ratified operational decisions.

> ### ⛔ What this sheet is NOT
>
> **It is not a record of consent.** The Session Resolution below is **blank** and stays blank until a
> real session happens with real initials. This project has already had to file a correction — Decision
> `2026-08-12-101` — because a decision-log entry once claimed *"CONFIRMED by the Trustee Panel"* with
> no corresponding session anywhere in the record. ⛔ Nothing on this sheet may be treated as ruled, and
> no cascade runs, without initials from both trustees named above.
>
> **It does not re-open the ratified delivery MODEL.** Decision `2026-08-14-113`'s ratification of
> **member-direct primary + narrow staff-mediated exception** stands and is not asked here. Elements
> **2** (`primary_delivery_not_completed`, server-observed) and **3** (the staff attestation, Tier-1 and
> withheld) of the three-part gate were separately confirmed correctly built by the same code review
> that raised this escalation. This sheet asks only about **element 1** — the member's own explicit
> request.
>
> **It does not block anything already shipped.** AC-R1 is built and delivering members' exports today,
> by both routes. No code is un-shipped pending this ruling, and none is proposed to be. The gap this
> sheet asks about is an **integrity gap in a ratified safeguard**, not a missing capability.
>
> **It does not re-open Story 10.21's other open item.** Escalation 10 (the trustee-authority recipient
> for AC-R3) is a **separate, prior** open block, covered by its own sheet
> (`trustee-consent-sheet-2026-08-14-story-10-21-escalations.md`, Row 7) and still unruled as of this
> writing. This sheet does not ask about it and does not change its status.

**Status of the work this ruling concerns:** Story 10.21 is **`in-progress`, not `done`**. AC-R1
(delivery) and AC-R2 (correction) are **built and verified** — an adversarial code review conducted
2026-08-15 (Blind Hunter + Edge Case Hunter + Acceptance Auditor, triaged with spot-verification
against the diff and the live tree) found 13 surviving findings; **12 were patched** (with tests; full
builds/lints/regression suites pass) and **this one was escalated** rather than fixed unilaterally,
because — like the eight questions on the prior sheet — it is a question about what the ratified
model **requires**, not a question engineering can answer alone.

---

## The question

### Row 1 — Mechanizing the fallback's member-request fact `[integrity gap; blocks nothing shipped]`

**The question.** Decision `2026-08-14-111` clause 3 established, **in advance of the build**, that
the three-part gate's element 1 (the member's own explicit request) and element 3 (the staff
attestation) are **TWO SEPARATE FACTS, DIFFERENT AUTHORS** — and warned explicitly:

> *"A single staff-authored 'reason' field would silently absorb the member's trigger into a staff
> assertion, which is exactly the substitution the trigger ruling forecloses."*

As **built**, element 1 (`member_requested_staff_mediation`) is a `z.literal(true)` the admin client
sends unconditionally — satisfied by the literal alone, with no captured fact distinguishing "the
member asked for this" from "staff decided to grant it." The staff-mediated route obtains a member's
assembled, **decrypted** Tier-1 export for hand-over — the one path in this system where a staff actor
sees that — so a gate around it that does not actually verify what it claims to verify is a real
integrity question, independent of whether it has been misused.

⚠ **One reading under which the current build may already be adequate, stated so the Panel can weigh
it rather than have it presumed:** the originating helpdesk ticket (AC2 intake) is itself ordinarily
member-initiated — a member (or someone relaying on their behalf) contacts the helpline and the ticket
records their subject and body. Under that reading, `z.literal(true)` is staff **confirming** a request
already established at intake, not **inventing** one, and the caller-side rejection of `false` is
meaningful precisely because a staff actor who does not believe the member asked can decline to send
`true`. ⛔ **Nothing in the shipped code actually tests this reading** — the ticket's `body` is free
text, never parsed or referenced by the gate, so the "confirmation, not invention" story rests on
staff conduct rather than a verifiable link.

| Option | Meaning |
|---|---|
| **(a)** | The current mechanization is **sufficient as designed** — the reading above is adopted by ruling; `z.literal(true)` plus member-initiated intake together satisfy element 1; **no code change** |
| **(b)** | A **minimum bar**: add a distinct staff-recorded confirmation control in the admin UI (a checkbox analogous to the erasure flow's `erasureConfirmed`), separate from the attestation textarea — still staff-authored, but at least a DISTINCT recorded fact from element 3 |
| **(c)** | A **genuinely member-authored artifact**: capture the member's request as a structured field at ticket intake (AC2), and have the fallback route **read** it rather than accept a caller-supplied boolean — the strongest reading, consistent with Decision `2026-08-14-113` clause 1's own words, *"the member's explicit request… author: the member, at intake"* |
| **(d)** | Something else the Panel specifies |

⚠ **What each option costs, so the choice is made knowingly, not by default:** (a) costs nothing and
ships as-is; (b) is a small, contained UI change (one checkbox + one boolean column) with no data-model
implications beyond what already exists; (c) is a real feature — a new intake-time capture surface,
contract changes to `CreateTicketRequest` or a sibling, and a read path from the fallback route into it
— comparable in size to a small story of its own, not a patch.

⚠ **The asymmetry, stated for whoever rules:** ruling (a) when the answer should have been (b) or (c)
leaves a PII-disclosure-adjacent gate weaker than its own ratified text claims — a claimed protection
that does not fully exist, the same class of defect this story has already had to correct three times
during authoring (the inert `23505` catch, the inert `ON DELETE CASCADE` comment, the vacuous
`pii-scrape` gate — see Decision `2026-08-14-113`'s own header). Ruling (c) when (a) would have been
enough spends real engineering effort on a fact that is already reasonably evidenced by ordinary
intake practice.

**Decision:** ☐ Ruled as: ____option (c)______ **Conditions:** ______none________________

---

## ⛔ Deliberately NOT on this sheet — so absence is not read as omission

- **Escalation 10** (the trustee-authority recipient for AC-R3) — a separate, prior, still-open block
  on its own sheet (`trustee-consent-sheet-2026-08-14-story-10-21-escalations.md`, Row 7). Not
  re-asked, not affected by this sheet.
- **Elements 2 and 3 of the three-part gate** — both confirmed correctly built by the code review that
  raised this escalation; not in question here.
- **The delivery MODEL itself** (member-direct primary + narrow staff-mediated exception) — ratified by
  Decision `2026-08-14-113` and not re-opened.
- **The other 11 code-review findings from the same review** — all patched in code (with tests) and
  recorded in the story file's Review Findings section; none required a Panel ruling.

**Standing Panel obligation queue.** Stood at **nine** after Story 10.20 (`deferred-work.md:168`).
Story 10.21's own Panel-owned set is now **eight**, of which **seven are ruled** (Escalations 1, 2, 3,
5, 8, 9, 10 per Decision `2026-08-14-109`/`110`) and **Escalation 11 (this sheet) is the one open
item**. ⛔ State any new total by **enumeration**, not by arithmetic on the standing nine.

---

## Points the Panel may want to probe before signing

1. **Is the "confirmation, not invention" reading in option (a) actually how staff will use it in
   practice, or how a reviewer would need to trust it was used?** The code does not distinguish the two
   — a staff actor could send `true` regardless of what the ticket says. Ruling (a) means trusting
   operator conduct for a fact the gate's own text claims to verify.
2. **Does option (b)'s checkbox meaningfully improve on (a), or does it just add a click that proves
   nothing more than the click happened?** A checkbox staff can tick regardless of the member's actual
   words is still not evidence — it is a slightly more deliberate staff assertion, not a member fact.
   The Panel may want to weigh whether (b) is a genuine improvement or a cosmetic one.
3. **Is (c) worth building for a fallback path that is, by design, the narrow exception rather than the
   common case?** Member-direct delivery is primary; staff-mediated exists for members who no longer
   control their registered mobile. If that population is small, a full intake-capture feature may be
   disproportionate to the risk — or the Panel may judge that a PII-disclosure-adjacent gate should be
   built to the strongest standard regardless of expected volume.
4. **Should this rule alone, or wait for the same session that rules Escalation 10?** Both are Story
   10.21 governance items currently open; the Panel may prefer one session covering both, or may want
   to rule this narrower, faster question separately since it requires no counsel and touches no other
   open item.

None of these block a ruling on their own — they are the question's own edges, surfaced so the Panel
probes them deliberately rather than meeting them later.

---

## After the session — what I do once ruled

⛔ **I will not perform any of this until an actual Trustee Panel session has happened.** This sheet is
prepared **for** that session and is not a stand-in for it. Per
[[feedback_record_unattested_no_backfill]] and [[feedback_verify_before_committing_governance_claims]],
nothing below the Session Resolution line gets marked ruled without real initials from Dhiraj Rahul and
Kalpana Bharti.

Once ruled:

1. **`.decision-log.md`** — one entry for the session (next number after the last committed entry),
   recording the ruling with per-clause provenance (mandatory under `2026-08-09-095`) separating the
   trustee-ratified clause from any author-committed framing.
2. **Story 10.21** (`_bmad-output/implementation-artifacts/10-21-off-portal-dpdpa-access.md`) — close
   Escalation 11 in the "Escalations owed" section citing the decision id; update the deferred Review
   Findings bullet from `[Review][Defer]` to reflect the ruling.
3. **`deferred-work.md`** — close the "Deferred from: code review of 10-21-off-portal-dpdpa-access
   (2026-08-15)" entry, recording the ruling and, if (b) or (c), the follow-up work item.
4. **Implementation** — only the option the ruling permits. If (a): no change, and the story file
   records the reading as ratified rather than merely author-stated. If (b) or (c): a scoped follow-up
   (a new story if (c) — sized like a small feature, not a patch) implements it; ⛔ not built ahead of
   the ruling and not left behind a flag.
5. **Sprint status** — Story 10.21 stays `in-progress` regardless of this ruling (Escalation 10 remains
   open independently). ⛔ Ruling Escalation 11 alone does not make the story `done`.

---

## Session Resolution

Session held **2026-08-15**. Row 1 ruled; not deferred, not rejected.

> ⚠ **Two transcription notes, recorded rather than silently corrected:** the quorum checkbox below was
> left unticked on the originally-filled sheet even though both trustees' initials and a date were
> present; read as **Yes** given that evidence (confirmed with the preparer before logging). The second
> trustee's initials were entered as "kp"; normalized to **KB** to match the abbreviation used
> throughout this story's governance trail (confirmed as a transcription slip, not a distinct identity).

Quorum met: ☑ Yes (≥2 trustees present) ☐ No — session not quorate, no ruling recorded

| Row | Escalation | Decision | Conditions / amendments |
|---|---|---|---|
| 1 | Fallback member-request fact | ☑ **Ruled — option (c): a genuinely member-authored artifact, captured at ticket intake and read by the route** | None — ruled as posed, no amendment |

Trustee initials: **DR** (Dhiraj Rahul)  **KB** (Kalpana Bharti)   Date: **2026-08-15**

Logged in `.decision-log.md` as Decision **`2026-08-15-116`**. Cascade applied: **Escalation 11 closed
in Story 10.21's "Escalations owed"; `deferred-work.md`'s code-review deferral closed and replaced with
an owed successor-story mint (option (c) is a real feature, not a patch — not built inside this
ruling); current `z.literal(true)` mechanization stays in production unchanged until the successor
story lands.**

---

### Footnote — ruling weight (for triage, grounded in the decision log)

Consistent with prior sheets' distinction: this is **trustee-judgment**, not counsel-shaped — it is a
question about what the Panel's own already-ratified safeguard requires in implementation, not a DPDPA
interpretation question. No counsel engagement is needed to rule it, and it need not be recorded
un-attested on that ground (though it remains un-countersigned until the initials block above is
filled).
