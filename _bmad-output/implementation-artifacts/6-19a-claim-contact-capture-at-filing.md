---
baseline_commit: c136b03c
---

<!--
SPLIT FROM Story 6.19 v0.9 on 2026-09-27 (BigDev: "split it three ways") — D13. The set: 6.19a (this file) → 6.19b → 6.19c, and
6.19d (CC1, `backlog`, fenced on its routing note). The AC numbers are KEPT from 6.19 v0.9 so every decision and note that cites "6.19
AC n" still resolves; AC8/AC9/AC11 are restated per slice.
⭐ THE SHARED SPEC IS PART OF THIS STORY: `6-19-correction-return-reminders-and-closure.md` — its rulings table, invariants, *What already
EXISTS* (re-verified on `c136b03c`), traps T1–T14 and author decisions D1–D24. ⛔ Do not start without reading it end to end.
GLYPH REGISTER: `⛔` only on a negation word; `⭐` key fact; `⚠` hazard. ⛔ No `file:NNN` into `.decision-log.md`, `deferred-work.md` or
`sprint-status.yaml`.
-->

# Story 6.19a: The Family's Contact Details, Their Agreement and the Claimant's Relationship Are Captured at Filing — and the Nominee List Grows to Twenty `[SURFACE]`

Status: ready-for-dev

> ⭐ **First of the 6.19 set, and it carries the WHOLE SET's governance (Task 0)** — one author-commit for D1–D24 and all six keys, the
> `epics.md` entries for 6.19a–d, and the planning annotations. ⛔ No 6.19b/c code before that commit lands.
> ⭐ **Go-live gated on counsel** (M — the filer agreeing for others; S — the privacy policy's purpose). ⛔ Not a build blocker.

## Read first — the parts of the shared spec this slice depends on

- **Rulings:** `-232` G, `-233`, `-253` cl.1/cl.2/cl.4, `-255` F8, `-257`.
- **Invariants:** 9 (new PII is Tier-1, no erasure path yet — record the gap).
- **What already EXISTS:** *Filing (member app)*, *Filing (helpline)*, *Side-route pattern*, *Consent*, *Nominees*, *Relationship lists*, *PII*, *The approval gate*.
- **Traps:** T8 (new PII surface), T12 (the as-at-death declaration, ⛔ not current rows), T14 (migrations from 0124).
- **Decisions:** D5 (contact table), D9 (claimant name ⛔ not English-gated), D13 (the split), D14 (where "contact required" lives), D15 (the agreement as a consent type), D16 (the relationship per nominee).

## Story

As a **family member filing a claim** (in the app, or through the helpline operator), I want to give **each nominee's postal address**,
say whether the claimant is one of the nominees — and if not, the **claimant's name, mobile, address and relationship to each nominee** —
and **agree that these people may be contacted**, so that if the claim is ever sent back for a bank-name correction the Trust can reach us
by text message or by post (6.19b), and a claim is never closed without us having been reached (6.19c).

## 📜 Policy meaning (AI-10-1)

⭐ This slice introduces **one predicate that gates a member's claim**: D14's conjunct at every approving path — *a claim cannot be approved
until the family has given a postal address for each nominee (and the claimant's details when the claimant is not a nominee) and agreed to
be contacted.*

**In the family's terms (ours, for the Panel to correct):** *"Before we can approve your claim we need an address for each nominee and your
agreement that we may contact the people named — your claim is never refused for this; it waits until you give them."*

**Checked against the Niyamavali? ⛔ NO** — `docs/legal/` is absent from the public repo by design, and the Niyamavali is ⛔ not ratified
([[feedback_niyamavali_rulebook_not_spec]]). Checked against `-231` C (*"Address is mandatory in claim filing form"*), `-232` G and `-253`
cl.1 instead — the "waits, never refused" shape is `-226` cl.7's for the bank accounts. ⚠ Whether the filer may agree **for** a claimant or
nominee who is someone else is **counsel's (M)** — a go-live gate.

## Acceptance Criteria

### AC0 — Governance first (Task 0)
**Then** ONE author-commit decision (after `-257`) lands D1–D24 and the six keys (D8), with the split decided (D13)
([[feedback_governance_commits_precede_implementation]]); **and** `epics.md` gains the Story 6.19 entry under Epic 6 with the `> ⚠ Minted by…`
header (its stale "16 stories" / FR list / cross-cutting lines are recorded, ⛔ not silently fixed); **and** PRD §4.10 and architecture §3.4
each gain an **annotation** pointing at `-255` F7 (⛔ never a rewrite); **and** `epics.md`'s *"five to fifteen"* note, Story 3.4 / FR-4 gain
`-257` annotations; **and** the new loop nodes (letter record, closure request, Pariwar Admin decision, Super Admin review/decision, direction,
re-file confirmation) get `{primary_actor, fallback_actor, escalation_trigger}` rows in the fallback-handler ledger (AR-61); **and** M and S are
recorded as go-live gates (D24); **and** the CC1 routing note and (if BigDev agrees) V's are drafted from the template, §0 first; **and** the DLT
template registration request is started (T13 — external lead time).

### AC1 — The contact record, the agreement and the relationship are captured at filing (`-232` G, `-253`, `-255` F8; go-live gated on M, S)
**Given** the family files in the app or the helpline operator files **Then** a contact record (D5) holds one **postal address per declared
nominee** (the effective declaration, T12), `claimant_nominee_rank`, and — **only when the claimant is none of the nominees** — the claimant's
**name, mobile, address** (all mandatory then) and the claimant-to-nominee **relationship per nominee** from the **nineteen** values (D16)
**And** the filer's **agreement to be contacted** is recorded as `claim_contact_agreement` (D15), mandatory, with byte-identical en/hi copy
**And** each surface has its own route (member + helpline `recordHelpline`, step-up on the helpline write, as `claims.nominee-bank.handlers.ts`
does) — ⛔ not fields bolted onto the intake body, ⛔ not `claims`, ⛔ not `intake_attempts`
**And** the boundary is D14's: an incomplete body is a **400**; approval and the letter / closure writers refuse without a contact record (**409
`claim_contact.required`**); a claim that lacks it **waits, ⛔ never denied** ([[feedback_mechanization_split_commitment]])
**And** the member app gains a NEW **`contact`** step between `nominee-review` and `acknowledgement` (7 steps): `CLAIM_STEPS`, the hard-coded
next routes (`nominee-review.tsx` → `contact`, `contact` → `acknowledgement`), `claim-steps.test.ts` (list, `{1,7}`/`{7,7}`, the chain), and
`(claim)/index.tsx`'s resume — ⭐ fix the pre-existing resume gap while there (every `lastStep` resumes at `nextClaimStep`); ⛔ the draft stays
**PII-free** (the contact form is never cached in MMKV)
**And** the helpline gets a new card (a sibling after the shell, as 6.20/6.21b did) with the agreement read aloud from the same copy
**And** Tier-1 ciphertext, RLS + FORCE, encrypt-before-insert; a read DTO only behind a gated, audited admin route (⛔ echoed to no member or
public surface); ⛔ no log, event, audit line or error body carries a value; the claimant name ⛔ not English-gated (D9); ⛔ no backfill.

### AC10 — Nothing else moves
**Then** ⛔ no new lifecycle state, ⛔ no new claim event type, ⛔ no new `AlertCategory`, ⛔ no `SMS_DLT_TEMPLATE_REGISTRY` entry;
`voteOnFrozenClaim` and `assertClaimApprovable` behave exactly as today for their existing callers; 6.16's one-journey rule is unchanged;
`-226` cl.1/cl.6 and `-227` cl.2 are unchanged **everywhere except the one Super Admin approve path** (invariant 7); ⛔ nothing is automatic.

### AC13 — `-257` (N1): the nominee list is twenty, and the claimant list is derived from it
**Then** `NOMINEE_RELATIONSHIP_CODES` carries the **twenty** values of `-257` cl.1, the domain mirror matches (the lockstep test passes), and the
nominee picker offers all twenty with **en + hi** copy (reviewed Hindi kin terms; parity and microcopy green); **and** the claimant-to-nominee
enum is **derived** as the twenty minus `other` — an equality test proves it, ⛔ never a hand-typed second list; **and** `other` still forecloses
a correction (the 6.20 test stays green), `ClaimantRelationship` is unchanged, ⛔ no migration, ⛔ no backfill; **and** `declaration.ts`'s
*"Still OPEN"* note is marked DISCHARGED by `-257`, ⛔ not deleted; **and** `member_nominees.ts:62`'s stale five-value comment is corrected.

### AC8a — The surfaces (this slice)
**Then** the member app gains the `contact` step (AC1) and the resume fix; the helpline gains the contact card (a sibling after the shell)
with the agreement read aloud from the same copy; a **gated, audited admin read** of the contact record exists (key
`claim.view_nominee_name_check`; used by the helpline read-back now and by 6.19b's letter form later) — ⛔ never a member or public read;
staff copy **English-only** in the module's `i18n-en.ts`; member copy **en + hi**
**And** semantic accessibility (family 13): a labelled container is `accessible={true}` (mobile); every interactive role has a real handler;
every reachable state (`saved`, `incomplete`, `agreement required`, `step-up required`) is **announced**; WCAG AA (UX-DR67).

### AC9a — PII and audit posture (this slice)
**Then** new `AuthAuditEventType` entries for the contact record (member + helpline) and the agreement, each with `resourceLocator:
'claim:<lower-case uuid>'` (anything else is silently replaced); a live-DB test **plants** a claimant name, mobile, address and a nominee
address as real-plaintext sentinels and finds them in ⛔ no log, event, audit line or error body; the **RTBF gap** for the contact table is
recorded in Dev Notes and `deferred-work.md`, ⛔ not fixed.

### AC11a — The proof (this slice)
**Then** live-DB specs on `twt-test-pg :5433`, **executed**: the contact table's migration-level policy spec (RLS positive / negative /
fail-closed / FORCE, FKs, UNIQUE, CHECKs — incl. "claimant fields present ⇔ `claimant_nominee_rank` is null"); both routes (member + helpline),
**400** on every incomplete shape; **409 `claim_contact.required`** at P1, P3 and P4 with the claim left **waiting** (⛔ no state move, ⛔ no
denial); the nominee set = the **effective** declaration (a post-death change is ⛔ offered no address slot); the agreement's copy lockstep
(byte-identical en/hi ↔ the server constant) and the preserved-consent-types test still green; the claimant-to-nominee list = the twenty
minus `other` (equality test); **cross-Pariwar** and **non-human/system-actor** denial per new route; every new route file classified in the
human-actor gate (`unclassifiedRouteFiles()` fails otherwise); the i18n **real-`t()` leg** in both locales; `claim-steps.test.ts` pins seven
steps and the chain; `{ timeout: 20000 }` on each new domain live spec.

## Tasks / Subtasks

- [ ] **Task 0 — Governance first, for the WHOLE 6.19 set** (AC0) — ⛔ before any code in 6.19a, b or c
  - [ ] Re-verify the shared spec's *What already EXISTS* against HEAD (`git diff --name-only c136b03c..HEAD -- packages apps scripts`).
  - [ ] Write ONE author-commit decision: D1–D29 (the split, D13, recorded as **decided — BigDev 2026-09-27, "split it three ways"**; ⭐ D25–D29 for `-258`), the **eight** keys (D8 + keys 7, 8) and which slice mints each (6.19b: keys 1, 7; 6.19c: keys 2–6, 8).
  - [ ] `epics.md`: entries for 6.19a, 6.19b, 6.19c, 6.19d under Epic 6, each with the `> ⚠ Minted by…` header; the `-257` annotations (the *"five to fifteen"* note, Story 3.4 / FR-4); PRD §4.10 and architecture §3.4 annotations for `-255` F7 **and `-259`** (its extension to the certificate reminder) (⛔ never a rewrite).
  - [ ] AR-61 fallback-handler ledger rows for the set's new loop nodes; M and S in the launch-gate inventory (D24).
  - [x] ✅ The two routing notes were sent and **ruled 2026-09-27**: V → `-258`, CC1 → `-259`.
  - [ ] Start the DLT template registration (T13) — record the date; it gates 6.19b's real sends, ⛔ not any build. ⭐ Include 6.19d's certificate reminder (hi + en, `-259`).
- [ ] **Task 1 — Migrations from 0124** (AC1) — the contact table + its per-nominee child, RLS hand-supplement (`ENABLE` → `GRANT`/`POLICY` → `FORCE`), own policy file; `ADD VALUE 'claim_contact_agreement'` to `consent_type` in its **own** file (`IF NOT EXISTS`); journal entry each; ⛔ never regenerate an applied migration; the migration-level policy spec.
- [ ] **Task 2 — Capture at filing** (AC1, AC8a, AC9a) — contracts (⛔ no `@twt/domain` import); the writer (encrypt-before-insert); member + helpline routes (step-up on the helpline write) + the gated admin read; the consent type, versioned copy in `claim.json` en + hi, the byte-identical lockstep test, the `staff_assisted` helpline variant; D14's conjunct **beside** `assertClaimApprovable` at P1/P3/P4 (⛔ not inside `isReturnedClaimResubmitted`'s inner helper); the `(claim)/contact.tsx` step, `CLAIM_STEPS`, the hard-coded next routes, `claim-steps.test.ts`, the `(claim)/index.tsx` resume fix; the helpline card; audit types.
- [ ] **Task 3 — `-257` (N1)** (AC13) — (a) `NOMINEE_RELATIONSHIP_CODES` + the domain mirror to twenty; the *"Still OPEN"* note DISCHARGED; `member_nominees.ts:62`'s stale comment fixed. (b) The claimant-to-nominee enum derived (twenty minus `other`) + the equality test. (c) The picker + **en + hi** copy for the five new values (reviewed kin terms, as `sister_in_law`'s: e.g. `grandparent` — दादा / दादी / नाना / नानी). (d) Every site: `NomineeForm.tsx`, `nominee-history-copy.test.ts`, `NomineeDeclarationPanel.tsx` + its `i18n-en.ts` + test, `nominee-relationship-lockstep.test.ts`, `nominee-correction.spec.ts`, `common.json` ×2. ⭐ Independent — may land first (Task 2's relationship picker consumes it).
- [ ] **Task 4 — Tests** (AC9a, AC11a) — **execute** on `twt-test-pg :5433`; record the RTBF gap in `deferred-work.md`.
- [ ] **Task 5 — Friction budget** — one named-payer row for the `contact` step (addresses, maybe a claimant's details, the agreement) — `friction-budget.md`, best-ever ratchet ([[project_friction_budget_baseline_ratchet]]).

## Dev Notes

### Dependency and sequencing
Nothing upstream (6.18, 6.20, 6.21a/b are merged). Task 0 → Task 3 (any time) → Task 1 → Task 2 → Tasks 4–5. ⭐ 6.19b starts only when this
slice is `done` — its recipients and letter addresses come from this table.

### Files
**UPDATE:** `packages/contracts/src/nominee/declaration.ts`, `packages/domain/src/nominee/relationship.ts`, `packages/domain/src/schema/member_nominees.ts`
(comment only), `packages/contracts/src/claims/dpdpa-consent.ts`, `packages/domain/src/schema/consent_records.ts`, the approving call sites
(`verifier-decision-persist.ts` P1, `state-trustee-decision-persist.ts` P3, `r9-voting-persist.ts` P4), `apps/mobile/lib/claim-steps.ts`,
`apps/mobile/app/(claim)/{index,nominee-review}.tsx`, `apps/mobile/tests/unit/claim-steps.test.ts`, `apps/mobile/components/life-events/NomineeForm.tsx`,
`apps/admin/src/modules/helpline-claims/HelplineClaimPage.tsx`, `apps/admin/src/modules/claim-verification/{NomineeDeclarationPanel.tsx,i18n-en.ts}`,
`apps/api/src/audit/audit-sink.ts`, `packages/i18n/locales/{en,hi}/{claim,common}.json`, `scripts/claim-adjudication-human-actor-invariant/check.ts`,
`friction-budget.md`.
**NEW:** the contact tables + RLS policy file; `apps/api/src/modules/claims/claims.contact.{handlers,routes}.ts` (names are the developer's);
`apps/mobile/app/(claim)/contact.tsx`; the helpline contact card; the consent copy constant + its lockstep test.
**⛔ NEVER edit:** `ClaimantRelationship` or its comment; `assertClaimApprovable`'s behaviour; `lib/claim-draft.ts`'s PII-free shape.

### Testing standards
As the shared spec's *Testing standards*. The copy-lockstep exemplar is `apps/api/tests/unit/dpdpa-consent-copy.test.ts`.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-09-27 | Split from Story 6.19 v0.9 (D13, BigDev: *"split it three ways"*). ACs AC0, AC1, AC10, AC13 carried verbatim; AC8a/AC9a/AC11a restated for this slice; Tasks re-cut. Status `ready-for-dev`. |
