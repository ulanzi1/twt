# ADR Ratification — Trustee Consent Sheet (2026-08-01, bank-statement / reconciliation batch)

**Purpose:** collect Trustee Panel consent for the four remaining `drafted` Section A ADRs —
**ADR-0032** (bank-statement normalization schema), **ADR-0033** (bank-statement intake
pipeline), **ADR-0034** (object-storage tier + lifecycle policy — bank-statement portion only),
and **ADR-0035** (reconciliation UTR-matcher mechanism). All four were authored 2026-07-26 at
Story 9.2/9.3/9.4 closure and have not previously been presented to the Trustee Panel. Mark
**Ratify / Defer / Reject** and initial, per row.

**Trustee Panel (≥2-trustee quorum required to ratify):** Dhiraj Rahul (Trustee 1) · Kalpana Bharti (Trustee 2)
**Prepared by:** BigDev (Solo Builder)
**Authority for the flip:** `docs/adr/README.md` lifecycle (`drafted → under-trustee-review → ratified`); `docs/knowledge-transfer/adr-index.md` is the authoritative status ledger.

> **Pre-presentation revisions (2026-08-01), made before this sheet was finalized:** four changes
> were requested and applied directly to the ADR files ahead of presenting them, since the ADRs
> were still `drafted` (not yet ratified, so editing them is ordinary pre-ratification authoring,
> not an amendment to a ratified record):
> 1. **ADR-0035** gained a new **"## Governance principles"** section with two subsections:
>    - **"Decision-support scope"** — states the actual shipped posture precisely: automatic
>      confirmation is deterministic and limited to a mathematically-unambiguous exact match
>      (pool + UTR + amount); any anomaly exits the automatic path and requires human adjudication
>      via the Story 9.8 review queue; a stricter posture (a human step on every confirmation,
>      including exact matches) is named as a future, trustee-invocable operating-model change, not
>      a description of today's system. This was checked against the shipped code
>      (`apps/jobs/src/matcher/matcher-worker.ts`) before writing, because the first draft of the
>      request read as if no confirmation happens without a human click, which is not what ships.
>    - **"Recovery, not automatic reversal"** — makes explicit (citing the existing Story 7.6
>      pool-bound-payment CI gate + Story 9.8 facilitate-recovery outcome-inertness test as the
>      teeth) that TWT cannot automatically debit or recover funds, and that
>      `reconciliation.confirmation-reversed` is a ledger correction, never a financial transaction.
> 2. **ADR-0035** gained a **"Forward-looking (planned, not built): Donation Contribution
>    Statement"** section describing a planned per-member export — not yet scoped to any story.
>    Refined on a second pass: availability is now stated as explicit governance intent — the
>    statement **shall be available** to (a) the nominee, for transparency over contributions
>    received, and (b) authorized administrators responsible for reconciliation and contribution
>    confirmation, with trustee read-only access retained as an additional line. Contents: contributor
>    name, contribution amount, contribution date, UTR/reference, cycle, nominee, pool.
> 3. **ADR-0034** gained a **"Retention scope, stated precisely"** subsection clarifying that the
>    180-day window covers only the raw uploaded object + its storage metadata, and explicitly does
>    NOT cover reconciliation events, contribution history, audit history, or the normalized
>    `bank_statement_entries` rows. Refined on a second pass: the exclusion for those normalized
>    rows now reads "these records form part of the trust's reconciliation ledger and therefore
>    follow the trust's financial-record retention policy rather than the raw bank-statement
>    lifecycle this ADR defines" — trustee-legible language replacing the earlier vaguer "ordinary
>    data-retention posture" phrasing.
> 4. **ADR-0032** and **ADR-0033** each gained a one-line reference note distinguishing bank-recorded
>    "reversal" line items (input-data classification) from the TWT-side ledger-correction meaning
>    of "reversal" defined in ADR-0035.

> **On the "Story 14.7" deferral, stated plainly.** All four ADRs currently read "Trustee
> ratification is Story 14.7's AR-69 backlog closure" in their header. Having now checked Story
> 14.7's actual acceptance criteria (`epics.md:4410-4431`): it names **five specific capability
> bars** — Edge/WAF, DigiLocker KYC provider, feature-flag vendor (ADR-0036, ratified earlier
> today), observability vendor, and virtualization library — all of them cases of a **deferred
> external vendor/library selection** with a pivot-readiness ADR. These four ADRs are not that
> shape: the decisions are already made and shipped (schema, allowlist, retention policy, matcher
> mechanism), not "vendor selection pending." AR-69's broader backlog list (`epics.md:363`) does
> separately name "Bank statement normalization schema" and "Reconciliation matcher mechanism" as
> AR-69 items, so the header's citation isn't wrong, but Story 14.7's own AC does not gate these
> four specifically — the "ratify at 14.7" framing was this project's own placeholder for "ratify
> later, in a batch," following the ADR-0026 author-drafted/ratify-later precedent, not a hard
> prerequisite. Presenting them now is the same move already made for ADR-0036 this session, not a
> departure from it.

---

## Read-first priority

Read each ADR's own flagged risk before signing its row — none of these are hidden, but a panel
reading only the Decision table would miss them.

**ADR-0032 (normalization schema) — the lower-stakes one of the four.** A pure data-shape
reconciliation: three existing schema statements (epics.md, architecture.md, FR-29) had to be
merged into one canonical `BankStatementEntry` union. Money is integer paise (not float) and
`entry_id` is a deterministic UUIDv5 over the raw row — both load-bearing for replay/audit
identity on a ₹50L-per-decision flow, both already tested. No accepted failure modes beyond
normal engineering; nothing here commits a policy the panel needs to weigh.

**ADR-0033 (intake pipeline) — read closely: the shipped parsers are UNVERIFIED against real bank
exports.** Two things the panel should register:
1. **The 5-bank allowlist is a real scope decision** — SBI, PNB, Bank of Baroda, Bank of India,
   and one named Bihar cooperative, all `pariwar = bihar`. A bank outside this list is rejected,
   helpdesk-routed, never silently parsed.
2. **The baseline-format assumption is STILL UN-ATTESTED.** No real sample statement existed for
   any of the 5 banks when the parsers were written — every parser is modeled on a *generic
   Indian bank e-statement export* shape, not a verified one. This was carried forward at Story
   9.3 rather than backfilled: no real per-bank export was obtainable in this build cycle. The
   named trigger is the first real statement upload per bank (the fallback path stores every
   unparseable upload for staff transcription, so a mis-read real export surfaces rather than
   silently failing) — that is when the assumption gets diffed against reality and golden files
   regenerated if needed. **The panel is ratifying a pipeline design whose real-world accuracy is
   not yet proven**, with an honest, named re-trigger — not a closed validation.

**ADR-0034 (object-storage tier policy) — scope is PARTIAL, read the boundary carefully.** This
ADR's slot originally reserved tier + lifecycle policy for KYC docs, death certificates,
Contribution Note PDFs, **and** bank statements. Only the **bank-statement portion** is authored
and wired here (Tier-1 PII, envelope-encrypted, the Story 6.5 `ClaimDocumentStorage`-pattern port
reused as a new `BankStatementStorage` instance, **180-day retention** — a DPDPA-relevant policy
number the panel is being asked to affirm, not just an engineering default). **Ratifying this row
ratifies the bank-statement portion only** — KYC docs / death certificates / Contribution Note
PDFs remain open, governed by this same ADR slot under their own future stories, and are NOT
closed by this session. `signedReadUrl` is implemented and unit-tested on the port but has no live
caller yet (the staff-transcription surface that would call it doesn't exist) — an honest reserved
seam, corrected from an earlier overclaim at code review.

**ADR-0035 (matcher mechanism) — the highest-stakes ADR of the four: this is the mechanism that
turns a member's contribution green.** It is the first live producer of `contribution.confirmed`
across the whole `TWT` system. Worth the panel's attention:
1. **The initial draft had three real bugs, caught and fixed at code review before this
   presentation** — a duplicate/forwarded UTR could have confirmed TWO members off one deposit
   (fixed: `entry_already_claimed` exclusivity); the timestamp-window check was wired but never
   actually invoked in production (fixed: wired from the alert's own lifecycle); and the
   enqueue-primary fired before its own transaction committed on one of two routes (fixed: moved
   to a post-`onSend` hook on both). None of these shipped to production unfixed — they were
   caught in this same story's review — but the panel should know the mechanism it is ratifying
   had defects in its first draft, not just in hindsight-obvious edge cases.
2. **A structural "no reversal" guarantee**: the matcher has NO code path that can un-confirm a
   member — only the Story 9.8 review queue (**shipped, status `done`** — corrected here from an
   earlier draft of this sheet that called it "future") can reverse a confirmation, via a
   step-up-OTP-gated, trustee-attested action, proved by a source-scan test. This is the
   canonical-financial-truth invariant the panel is affirming.
3. **Accepted scope limits, not gaps**: sender-VPA is `{available:false}` everywhere (no member/
   sender VPA is collected in this system at all); a mismatch is only emitted for a
   found-and-rejected deposit, never for "no deposit yet" (that determination is left to a future
   reconciliation-tail story, so a member who attests before the bank statement arrives is not
   prematurely flagged red).
4. **The ADR now states the automation boundary as an explicit governance principle** (see
   "Governance principles" in the ADR): automatic confirmation is limited to a deterministic exact
   match on pool + UTR + amount; every anomaly is routed to the shipped Story 9.8 human review
   queue (confirm/reject/facilitate-recovery/review-and-reverse); and TWT structurally cannot move
   funds or auto-recover money — any real recovery is a human action outside the system. A
   stricter posture (human sign-off on every confirmation, including exact matches) is named as a
   future, trustee-invocable change to the operating model, not something already built.

None of these block ratification on their own — they are each ADR's own stated scope boundaries
and accepted risks, surfaced here so the panel probes them deliberately.

---

## Consent table

| # | ADR | Decision (one line) | Owning story | Status | Recorded gate / caveat | Weight | Trustee decision |
|---|---|---|---|---|---|---|---|
| 1 | **ADR-0032** bank-statement-normalization-schema | Canonical `BankStatementEntry` Zod `.strict()` union reconciling three prior schema statements; integer-paise money; deterministic UUIDv5 `entry_id`. | Story 9.2 | `drafted` (2026-07-26) | No accepted failure modes beyond normal engineering. | **Light-touch** (data-shape reconciliation, no policy commitment, though P0 correctness-critical for the matcher) | Ratify / Defer / Reject : _______  init: _______ (KP) _______ (DR) |
| 2 | **ADR-0033** bank-statement-intake-pipeline | Closed 5-bank CSV-first parser allowlist (SBI/PNB/BoB/BoI/1 Bihar cooperative), `csv-parse` 5.6.0 pinned, 50 golden files/bank, package-local (not repo-global) conformance gate, PDF/OCR deferred to Phase 2. | Story 9.2 (+ 9.3 AR-45 wiring) | `drafted` (2026-07-26) | **Baseline-format assumption STILL UN-ATTESTED** — no real bank export was available at authoring time; named re-trigger is the first real statement upload per bank. | **Trustee-judgment** (real-money reconciliation pipeline whose real-world accuracy is unverified) | Ratify / Defer / Reject : _______  init: _______ (KP) _______ (DR) |
| 3 | **ADR-0034** object-storage-tier-policy (bank-statement portion) | Bank statements are Tier-1 PII, envelope-encrypted, stored via a new `BankStatementStorage` port (Story 6.5 pattern reused, own bucket); **180-day retention window** set explicitly, now with a precise scope statement (covers only the raw object + its storage metadata; does NOT cover reconciliation/contribution/audit history or the normalized `bank_statement_entries` rows). **Scope: bank-statement portion ONLY** — KYC docs/death certs/Contribution Note PDFs remain open under their own future stories. | Story 9.2 (policy) + Story 9.3 (wiring, CLOSED) | `drafted` (2026-07-26, revised 2026-08-01) | `signedReadUrl` implemented + tested, no live caller yet (honest reserved seam). | **Trustee-judgment** (DPDPA retention-window is a policy call materially the trust's to affirm) | Ratify / Defer / Reject : _______  init: _______ (KP) _______ (DR) |
| 4 | **ADR-0035** reconciliation-matcher-mechanism | The `matchPool` engine: primary UTR + destination-first secondary match, monotonic three-layer confirmation invariant (structurally no un-confirm path), `contribution.reconciliation-mismatch` emission policy, standalone schema keeping the Story 8.10 vocabulary fence green, AR-45 resilience port. First live producer of `contribution.confirmed`. Now includes a "Governance principles" section (decision-support scope: exact-match-only automation, every anomaly human-adjudicated; recovery-not-reversal: TWT cannot auto-debit or auto-recover funds) and a "Forward-looking: Donation Contribution Statement" (planned, not built) section. | Story 9.4 | `drafted` (2026-07-26, revised 2026-08-01) | Three real bugs found + fixed at code review before this session (entry-exclusivity, inert timestamp window, pre-commit enqueue ordering) — see Read-first. | **Trustee-judgment** (the core money-confirmation mechanism; highest stakes of the four) | Ratify / Defer / Reject : _______  init: _______ (KP) _______ (DR) |

---

## Points the panel may want to probe before signing

1. **ADR-0033 — is shipping v1 against an unverified baseline format acceptable, or should
   real-file reconciliation be a hard gate before go-live for at least one bank?** The ADR's
   position is that the fallback path (every unparseable upload lands in a staff-transcription
   queue with its raw blob, never silently dropped) makes an unverified assumption safe to ship
   *behind* — a wrong parse degrades to a human, not a wrong confirmation. The panel may want a
   commitment on when (not just "the first real upload," but a date or a launch-gate condition)
   the assumption gets attested, rather than an open-ended trigger.
2. **ADR-0034 — is 180 days the right retention window for Tier-1 PII bank statements?** The
   ADR's rationale is one 15-day contribution cycle plus its audit/appeal tail, an order of
   magnitude below the multi-year fee-receipt retention. The panel is the right body to affirm
   this DPDPA-relevant number, not just the engineering team.
3. **ADR-0035 — does the "no live emission for `no_statement_entry`" policy need a launch-gate
   companion?** A member who attests before the bank statement arrives is correctly left pending
   rather than flagged red, but the ADR is explicit that the FINAL "still no deposit after close"
   determination has no owner yet (deferred to a future reconciliation-tail story). The panel may
   want that story named as a pre-launch or near-launch dependency rather than an open-ended
   deferral, given money is on the line at cycle close.

None of these block ratification on their own — they are the ADRs' own stated scope boundaries,
surfaced so the panel probes them deliberately rather than missing them.

---

## After the session — what I do per ratified row

Same 3-surface cascade per ADR (a status flip in one place without the others is a framework gap
per `adr-index.md`), run once per ratified row:

1. **ADR file** — `Status: drafted → ratified`, `Date` → `<ratification date> (date entered
   current status)`, `Ratifying trustees` filled in, `## Ratification (<date>)` section +
   changelog row appended, any amendments applied to the body.
2. **`adr-index.md`** — flip the row `drafted → ratified`; update the status-count breakdown
   (`drafted` 4→N, `ratified` 30→N, Total unchanged at 148); refresh the ledger note. ADR-0034's
   row description keeps its "bank-statement portion" scope qualifier — ratification does not
   remove it, since the KYC/death-cert/Note-PDF portions stay open.
3. **`.decision-log.md`** — one entry per session (or one combined batch entry if all four are
   ratified together in the same session, following the 2026-07-08 five-ADR batch precedent), next
   number after `2026-08-01-070`.

**I will not perform this cascade until an actual Trustee Panel session has happened** — this
sheet is prepared for that session, not a stand-in for it. Per [[feedback_record_unattested_no_backfill]]
and [[feedback_verify_before_committing_governance_claims]], nothing below the line gets marked
ratified without real initials from Dhiraj Rahul and Kalpana Bharti.

---

## Session Resolution

The Trustee Panel (DR, KP) reviewed all four ADRs as presented on this sheet, following the
pre-presentation revisions requested and reviewed on 2026-08-01. Quorum met (≥2 trustees). All
four ratified with no further objection.

| ADR | Decision | Amendments / conditions |
|---|---|---|
| ADR-0032 | ☑ Ratified | None — ratified as authored. |
| ADR-0033 | ☑ Ratified | None beyond the pre-presentation cross-reference note. Baseline-format-assumption risk explicitly carried, not resolved — named re-trigger (first real per-bank statement upload) stands. |
| ADR-0034 | ☑ Ratified, **bank-statement portion only** | None beyond the pre-presentation "Retention scope, stated precisely" revision. KYC-document/death-certificate/Contribution-Note-PDF portions of this ADR slot remain unauthored and unratified. |
| ADR-0035 | ☑ Ratified | None beyond the two pre-presentation revision passes (Governance principles section; Donation Contribution Statement forward-look). Eight accepted failure modes from Story 9.4 remain accepted, not resolved. |

Trustee initials: __dr__ (DR)  __kp__ (KP)   Date: 2026-08-01

Logged in `.decision-log.md` as Decision `2026-08-01-071`. Cascade applied 2026-08-01 (below).

---

## Cascade applied — 2026-08-01

All four ADRs ratified; quorum met (DR + KP). The cascade was run per Decision **`2026-08-01-071`**:

- **`ADR-0032-bank-statement-normalization-schema.md`**, **`ADR-0033-bank-statement-intake-pipeline.md`**,
  **`ADR-0034-object-storage-tier-policy.md`**, **`ADR-0035-reconciliation-matcher-mechanism.md`** —
  each flipped `Status: drafted → ratified` (`ADR-0034` explicitly `ratified (bank-statement
  portion ONLY)`); `Date` → `2026-08-01 (date entered current status)`; `Ratifying trustees` filled
  in; `## Ratification (2026-08-01)` section + changelog row appended per file.
- **`adr-index.md`** — all four Section A rows flipped `drafted` → `ratified` (ADR-0034's row keeps
  its "bank-statement portion ONLY" scope qualifier); status-count breakdown updated (`drafted`
  4→0, `ratified` 30→34; Total unchanged at 148); ledger note added. No `drafted` Section A rows
  remain.
- **`.decision-log.md`** — Decision `2026-08-01-071` appended.

**Open follow-ups carried forward (NOT closed by this ratification):** ADR-0033's baseline-format
assumption stays open and un-attested, named re-trigger intact; ADR-0034's KYC-document /
death-certificate / Contribution-Note-PDF tier policy remains unauthored, owned by its own future
story or stories; ADR-0035's Donation Contribution Statement is a planned direction only, no story
scoped; ADR-0035's eight accepted failure modes remain accepted, not resolved.

---

### Footnote — ratification weight (for triage, grounded in the decision log)

Consistent with prior sheets' distinction:
- **Light-touch** — engineering-substrate / reversible-tooling ADRs. ADR-0032 sits here.
- **Trustee-judgment** — security / data-model / policy ADRs where the choice is materially the
  trust's. ADR-0033 (unverified real-money pipeline), ADR-0034 (DPDPA retention policy), and
  ADR-0035 (the money-confirmation mechanism itself) all sit here.

The weight column is a triage aid, not a status — each row still requires the ≥2-trustee quorum to
flip to `ratified`.
