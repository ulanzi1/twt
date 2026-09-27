---
baseline_commit: c136b03c
---

<!--
SPLIT FROM Story 6.19 v0.9 on 2026-09-27 (BigDev: "split it three ways") — D13. The set: 6.19a → 6.19b → 6.19c (this file); 6.19d (CC1)
`backlog`. AC numbers KEPT from 6.19 v0.9; AC8/AC9/AC11 restated per slice.
⭐ THE SHARED SPEC IS PART OF THIS STORY: `6-19-correction-return-reminders-and-closure.md` — rulings, invariants, *What already EXISTS*
(re-verified on `c136b03c`), traps T1–T14, author decisions D1–D24. ⛔ Do not start without reading it end to end.
GLYPH REGISTER: `⛔` only on a negation word; `⭐` key fact; `⚠` hazard. ⛔ No `file:NNN` into `.decision-log.md`, `deferred-work.md` or
`sprint-status.yaml`.
-->

# Story 6.19c: The Closure for No Response, the Super Admin's Review and Decision, and Filing Again Through a Person `[SURFACE]`

Status: ready-for-dev

> ⛔ **Start only when 6.19b is `done`** — the closure precondition ("each person reached", D22) reads 6.19b's reminder and letter records,
> and the closure notice uses 6.19b's SMS path.
> ⭐ **With this slice done, 6.18's go-live fence ("not without 6.19") is discharged BY THE BUILD** — record that in 6.18's file and
> `epics.md` §6.18, ⛔ never on the record alone. ⭐ Counsel's M and S still gate the family SMS's go-live (6.19b).
> ⭐ **V is RULED — `-258`, option B** (a return says who must act): this slice gains **AC17** — only a family-must-act return can be closed
> "for no response", the "no correction needed" path, and the staff case's day-90 escalation to the Super Admin — who may decide it (`-260` G1). 6.19b carries the mark (AC16).

## Read first — the parts of the shared spec this slice depends on

- **Rulings:** ⭐ **`-258`, `-260` G1–G3 (AC17)**, `-229`, `-230` 5, `-231` A/B, `-232` H/I, `-250` #6, `-251`, `-252` cl.1, `-254`, `-255` F2–F4, `-256`; and `-226` cl.1/cl.5/cl.6, `-227` cl.2 (what `-251` narrows).
- **Invariants:** 1, 2, 5, 6, 7, 8, 10 — every one of them binds this slice.
- **What already EXISTS:** *The return*, *Helpers*, *What supersedes a return*, *States*, *The approval gate*, *Reason codes*, *The closure vocabulary*, *Appeals (6.16)*, *Re-filing*, *Permissions*, *The human-actor gate*, *Audit*.
- **Traps:** T2, T3, T4, T9, T10, T11.
- **Decisions:** D1, D8 (keys **2–6 and 8** are minted here), D17, D18, D19, D22, D23, D24, ⭐ **D26, D27, D29**.

## Story

As the **District Admin**, the **Pariwar Admin** and — when they disagree — the **Super Admin**, we want a claim whose family has not answered
a correction request for 90 days, **though each person was reached**, to end only by **our** decisions: the District Admin asks, the Pariwar
Admin approves or declines with a note, and a declined closure goes to the Super Admin, who may **hold it under review, direct us**, and then
close it, refuse it or approve it despite the name — so that a claim **never waits forever**, is **never closed by a timer**, and a family whose
claim was closed can **file again through a person**.

## 📜 Policy meaning (AI-10-1)

⭐ This slice introduces **six predicates that gate a member's claim** — the six of the shared spec's *Policy meaning* (⭐ the sixth, `-258`: a closure for no response only when the family must act, and an approval without a correction once "no correction needed" is recorded and agreed): the closure's 90-day +
reached + two-humans gate; the closure's non-appealability; the Super Admin refusal's one appeal; the Super Admin's approval despite the name;
and the re-file that needs a person's confirmation.

**In the family's terms (ours, for the Panel to correct):** *"If after 90 days we have still not heard from you, and we have reached each of you
by text or by post, the District Admin may ask for your claim to be closed and the Pariwar Admin decides; if the Pariwar Admin disagrees, the
Super Admin looks into it and decides — and may pay to the account you gave even though the name does not match. A claim closed for no response
cannot be appealed, but you can file again through the helpline or the District Admin. A refusal by the Super Admin for any other reason can be
appealed once."*

**Checked against the Niyamavali? ⛔ NO** — absent from the public repo by design and ⛔ not ratified
([[feedback_niyamavali_rulebook_not_spec]]). Checked clause by clause against `-229` → `-232` and `-250` → `-256`. ⚠ It **tensions with the
PRD** (FR-43A: internal appeal is the primary grievance path, only Stage 3 non-appealable) and 6.16 D-G's counsel review — **S**, a go-live gate.

## Acceptance Criteria

### AC6 — The closure: the system asks, humans decide (`-231` A/B, `-232` H/I, `-252`, `-250` #6)
**Given** day ≥ 90 of the live run **Then** the system reminds the District Admin **daily for 7 days**, then escalates to the Pariwar Admin
(`-232` I) — ⛔ **no job ever calls a decision writer**
**And** the District Admin **requests** the closure (key (2)): ⛔ before day 90 → **409 `closure.too_early`**; not every person reached (D22) →
**409 `closure.not_reached`**; **corrected** (re-checked under the trustee lock) → **409 `closure.claim_corrected`**; no contact record →
**409 `claim_contact.required`**; a live routing row → **409 `closure.claim_routed_to_r9`** (defensive — the exclusion already holds); a
certificate wait alone ⛔ never qualifies (invariant 10)
**And** the Pariwar Admin (key (3)) **approves** (re-checking "corrected" under the lock → **409 `closure.claim_corrected`**) — running D1 in one
scope-tx — **or declines with a REQUIRED note**, which escalates the claim to the Super Admin (AC14)
**And** the closure is the **second refusal**: terminal, ⛔ not appealable, `denied_no_appeal` emitted (T4); the family gets the closure notice
(D23); the member app shows `closed_no_response` (en + hi) through the new field, ⛔ never `appeal_exhausted`
**And** `voteOnFrozenClaim` refuses exactly as today.

### AC7 — Appealability, at every site (`-231` A, `-255` F2, 6.16 D-F)
**Then** `assertAppealInitiable`, the handler's `can_initiate` and the mobile card (through the contract) **all** refuse a claim with a `closed`
closure row, with their own 409 code (⛔ not `appeal.not_denied`); **and** ⛔ ordinary refusals keep their one appeal — a test proves an ordinary
`denied` claim is still appealable **through the operator's on-behalf initiate** (the production path; the member route 404s for every
production claim — record it, ⛔ not this story's to fix); **and** a Super Admin refusal is appealable once and final after a used appeal (D17).

### AC10 — Nothing else moves
**Then** ⛔ no new lifecycle state, ⛔ no new claim event type, ⛔ no new `AlertCategory`, ⛔ no `SMS_DLT_TEMPLATE_REGISTRY` entry;
`voteOnFrozenClaim` and `assertClaimApprovable` behave exactly as today for their existing callers; 6.16's one-journey rule is unchanged;
`-226` cl.1/cl.6 and `-227` cl.2 are unchanged **everywhere except the one Super Admin approve path** (invariant 7); ⛔ nothing is automatic.

### AC14 — The Super Admin's review and decision (`-232` H, `-251`, `-255` F2–F4, `-256`)
**Given** a closure the Pariwar Admin declined **Then** the claim appears on the Super Admin's queue with both admins' notes, the reminder and
letter record, and the name-differs highlight
**And** the Super Admin (key (5)) may place it **under review** with a note, and record **directions** to the named Pariwar Admin or District
Admin (D18), who is reminded and **records a response**; a `restart_family_reminders` direction opens a new run; the Super Admin is reminded
every **30 days** while under review; ⛔ no deadline
**And** the Super Admin (key (4)) decides — **close**, **refuse for another reason**, or **approve despite the name** — each with a **required
note and reason** (D17), each re-checking "corrected" under the lock; approve gates per invariant 7 and T10
**And** ⛔ nothing is paid, closed or refused while the claim is escalated or under review; a direction or hold on a claim that is ⛔ not escalated
→ 409.

### AC15 — Re-filing after a closure for silence (`-254`)
**Given** a death whose most recent claim was **closed for no response** **Then** a new claim for it is minted only after a District Admin or
helpline operator (key (6)) records a **confirmation with a note** — at **both** mint paths (T9); the mint consumes it in the same tx; ⛔ an
ordinary `denied` or a stage-3-upheld claim re-files exactly as today; the member app routes the family to the helpline (en + hi).

### AC17 — Only the family's silence can close a claim; "no correction needed"; the staff case at day 90 (`-258`; APPENDED 2026-09-27)
**Then** a closure request (AC6) is refused unless the return's **latest mark is `family`** — **409 `closure.not_family_action`** — and its 90
days count from the **family run's** day 0 (the return, or the latest switch to `family`); the Pariwar Admin's approval and a Super Admin close
re-check both under the trustee lock
**And** the District Admin may record **"no correction needed"** (key (8), district dimension) with a **required note**; it takes effect only
with a **current, passing name check recorded after it**; it sets the mark to `staff`; the Pariwar Admin then **approves** through a **NEW writer**
(D27 — the full `assertClaimApprovable`, ⛔ nothing waived; the conditional supersede of the return; the ordinary approval events; ⛔ never
`voteOnFrozenClaim`) **or keeps it sent back**, re-stating the mark with a note
**And** a **staff case still unresolved at day 90** is escalated to the **Super Admin** (`-256` widened by `-258`), who may **hold it under review
and direct** (AC14's machinery), incl. directing a switch to `family`, ⭐ **and DECIDE** (`-260` G1): **approve** through the **full**
approval gate (an accepted certificate, two accounts, the as-at-death nominee, a **current passing name check** — ⛔ nothing waived, unlike
the `-251` path) or **refuse for another reason** (appealable once; `denied_no_appeal` only after a used appeal), each with a **required note and
reason**; ⛔ **never close** — a close for no response on a staff case is barred by construction (**409 `closure.not_family_action`**)
**And** when the Pariwar Admin keeps a "no correction needed" claim sent back, **the Pariwar Admin states who must act** with a note
(`-260` G2) — a switch to `family` opens a new family run (day 0 = that day)
**And** ⛔ no text goes to the family after a Super Admin refusal or approval (`-260` G3 — the app status and the helpline carry it)
**And** the proof: a staff-marked return → `closure.not_family_action` at request, approval and Super Admin close; a switch to `family` on day 60
→ a request refused until day 90 **of the new run**; "no correction needed" refused without a fresh passing check; the approve writer racing a
family correction and a mark change (two connections); key (8) cross-Pariwar and non-human denial; ⭐ a Super Admin approve on a staff case
**refused** with a stale or failing name check and permitted with a current passing one; a Super Admin close on a staff case →
`closure.not_family_action`.

### AC8c — The surfaces (this slice)
**Then** the correction queue gains the closure state and the **closure request** action (with every refusal shown in plain words — "too
early", "not everyone reached yet", "the family has corrected it"); the **Pariwar Admin's** closure decision strip (UX-DR54: primary action
leftmost, numbered shortcuts, the decline note mandatory **before** submit, UX-DR44 `<AuditTrailEntry>` shown immediately); the **Super
Admin's** escalated-claim queue and decision surface (both admins' notes, the reminder and letter record, ⭐ the name-differs highlight — `-226`
cl.5), the hold and the directions; the **directed admin's** direction inbox with a response form; the helpline's **re-file confirmation** card;
the member app's `closed_no_response` status and the "please call the helpline" re-file state (**en + hi**); staff copy **English-only**
**And** semantic accessibility (family 13): every reachable state (`too early`, `not reached`, `declined`, `under review`, `directed`,
`closed`, `re-file needs confirmation`) is **announced**; a labelled container is `accessible={true}` (mobile); every interactive role has a real
handler; WCAG AA.

### AC9c — PII and audit posture (this slice)
**Then** `AuthAuditEventType` entries for the closure request, the Pariwar Admin's decision, the Super Admin's hold / direction / decision, a
direction response and a re-file confirmation — each with `resourceLocator: 'claim:<lower-case uuid>'`; the notes are Tier-2 at most and ⛔ never
echoed to a member; a live-DB test finds a planted note sentinel in ⛔ no log or error body; the member appeal route's production 404
(`claimantActorId` null) is recorded in `deferred-work.md`, ⛔ not fixed.

### AC11c — The proof (this slice)
**Then** live-DB specs on `twt-test-pg :5433`, **executed**: the closures / directions / re-file-confirmations migration-level policy specs;
**two-connection** races — two closure decisions, a return racing a closure, a declined closure racing an approval, a closure request racing a
family correction, a Super Admin decision racing a family correction (each → exactly one outcome, the loser a typed 409); the D1 and each D17
chain in **one** tx (a forced failure mid-chain leaves nothing); every AC6 409 (`too_early`, `not_reached`, `claim_corrected` at request **and**
approval **and** Super Admin close, `claim_contact.required`, `claim_routed_to_r9`); a reminder set whose every slot was `no_target` cannot
support a request without a delivered letter; the day-90 reminder job **never** calls a writer (a spy); `denied_no_appeal` emitted on a closure
and on a final Super Admin refusal, ⛔ not on an appealable one; the three appeal sites + the operator's on-behalf initiate refuse a closed claim
with their own code, and an ordinary `denied` claim is still appealable through the on-behalf path; the Super Admin approve **refused** without an
accepted certificate / two accounts / an effective determination and **permitted** with a `does_not_match` check, and
`assertNomineeNameCheckForApproval`'s behaviour for P1/P3/P4 byte-identical (the refactor is proved neutral); the highlight shows on a Super
Admin–approved claim; a hold or direction on a claim that is ⛔ not escalated → 409; a `restart_family_reminders` direction opens a new run; the
Super Admin's 30-day and the directee's reminders; **both** mint paths guarded and a mint consuming its confirmation, a stage-3-upheld claim's
re-file still free; ⛔ no closure request on a claim with only a certificate wait (no live return → 409); keys 2–6 **cross-Pariwar** and
**non-human/system-actor** denial; every new route file classified in the human-actor gate and its methods listed; a `*-shape.spec.ts` per
compound read model; the real-`t()` leg for the member copy; `{ timeout: 20000 }` on each new domain live spec.

## Tasks / Subtasks

- [ ] **Task 0 — Preflight** — confirm 6.19b is `done`; re-verify the shared spec's cited code against HEAD; V is ruled (`-258`) — confirm D25–D29 and key (8) are in 6.19a's author-commit before Task 8.
- [ ] **Task 1 — Migrations (next free number after 6.19b's)** (AC6, AC14, AC15) — the closures table (request / decision / escalation / review), the directions table, the re-file confirmations table; RLS files, journal entries, migration-level policy specs (family 5).
- [ ] **Task 2 — Keys** (D8) — mint **keys 2–6** in one catalog bump from HEAD's value (counts, `roles.ts` for 2, 3, 6; ⛔ no const for the super-admin-only 4 and 5; `permissions.test.ts`, `roles.test.ts`).
- [ ] **Task 3 — The closure** (AC6, AC7) — the day-90 reminder job (daily 7 days, then escalate; ⛔ it calls no writer); the request route (every 409, the re-check under the trustee lock, D22's reached predicate); the Pariwar Admin's decision (approve → the D1 writer in one scope-tx; decline + note → escalate); the three appeal sites + their own 409 code; the closure notice through 6.19b's SMS path; the NEW `closed_no_response` contract field + the mobile status (⛔ not `appeal_exhausted`).
- [ ] **Task 4 — The Super Admin** (AC14) — the hold (+ note) and the 30-day reminder; the directions table's routes (create; the directee's response — identity-checked) and the directee's reminders (7 days, then weekly); `restart_family_reminders` opening a new 6.19b run; the three D17 decisions — close (D1 chain), refuse (+ `denied_no_appeal` only after a used appeal), approve (T10: the approval-gate split proved behaviour-neutral, the certificate + accounts + determination still required) — each with a required note + reason and the re-check under the lock.
- [ ] **Task 5 — The re-file guard** (AC15) — the confirmation routes (district + helpline, key 6); the guard at `tryConverge` **and** `overrideIntakeAttempt`, keyed on the closure record (⛔ not on `denied_no_appeal`); consumption in the mint's tx; the member-app helpline state.
- [ ] **Task 6 — Surfaces** (AC8c) — the queue's closure column + request action; the Pariwar Admin strip; the Super Admin queue + decision surface; the direction inbox; the helpline re-file card; the member states; family-13 assertions.
- [ ] **Task 7 — Gates, tests, discharge** (AC9c, AC11c) — audit types; human-actor gate entries; **execute** on `twt-test-pg :5433`; record the member-appeal-route gap in `deferred-work.md`; annotate 6.18's go-live fence as discharged by this build (6.18's file + `epics.md` §6.18 — ⛔ never a rewrite).
- [ ] **Task 8 — `-258` in the closure** (AC17) — the `closure.not_family_action` refusal and the family-run day 0 in AC6's request / approval / Super Admin close; the "no correction needed" record (**key (8)**) + its NEW approve writer (D27) and the Pariwar Admin's keep (re-stating the mark); the day-90 staff-case escalation onto the Super Admin queue — review, directions **and the two decisions** (`-260` G1: approve with the full gate, refuse; ⛔ never close) — and the Pariwar Admin's keep stating the mark (G2); the tests in AC17. ⭐ Also mark `deferred-work.md`'s 6.18 chunk-1 item *"A return clears ONLY through a bank rewrite"* **built** (its path was DISCHARGED by `-258`).

## Dev Notes

### Dependency and sequencing
6.19b `done` first. Task 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7. ⚠ The approval-gate split (T10) touches the most load-bearing gate in the claim flow —
land it as its own commit with its behaviour-neutral test first.

### Files
**UPDATE:** `packages/domain/src/claim/{state-trustee-decision-persist,appeal-eligibility,icp,nominee-name-check}.ts`,
`apps/api/src/modules/claims/{claims.appeal.handlers,claims.service}.ts` + the override path, `packages/contracts/src/claims/appeal.ts` + the claim
status contract, `apps/mobile/lib/appeal-status.ts`, `apps/mobile/components/claim/AppealStatusCard.tsx`, the correction-queue read / view,
`CycleFreezeRoute.tsx` (or a sibling strip), `packages/domain/src/rbac/{permissions,roles}.ts` + tests, `apps/api/src/audit/audit-sink.ts`,
`packages/i18n/locales/{en,hi}/claim.json`, `scripts/claim-adjudication-human-actor-invariant/check.ts`, 6.18's story file + `epics.md` §6.18 (annotations).
**NEW:** the three tables + RLS files; the closure / Super Admin / direction / re-file handlers + routes; the admin modules (Pariwar Admin strip,
Super Admin queue, direction inbox, helpline re-file card).
**⛔ NEVER edit:** `voteOnFrozenClaim`'s guard; `assertClaimApprovable`'s behaviour for P1/P3/P4; the event registry's types (⛔ no new event).

### Testing standards
As the shared spec's. Two-connection exemplars: `apps/api/tests/integration/claims/cycle-freeze.spec.ts`,
`packages/domain/tests/integration/alert/alert-stream-concurrency.spec.ts`.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.2 | 2026-09-27 | ⭐ **`-260` recorded:** AC17's staff case — the Super Admin may approve (full gate) or refuse, ⛔ never close (G1); the Pariwar Admin's keep states the mark (G2); ⛔ no text after a Super Admin decision (G3). |
| v1.1 | 2026-09-27 | ⭐ **`-258` (V, option B) appended:** AC17 and Task 8; key (8) minted here; six predicates in the policy note. |
| v1.0 | 2026-09-27 | Split from Story 6.19 v0.9 (D13, BigDev: *"split it three ways"*). ACs AC6, AC7, AC10, AC14, AC15 carried verbatim; AC8c/AC9c/AC11c restated for this slice; Tasks re-cut. Status `ready-for-dev`, fenced on 6.19b `done`. |
