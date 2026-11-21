---
baseline_commit: b7b43c47
---

<!--
PINNED: `b7b43c47` = `origin/main` (2026-11-02 — Story 6.22 landed by fast-forward, PR #321, `91ea2c81..fc559b9b`, then the ledger
`2026-11-02b`). `git ls-remote --heads origin` matched every local `origin/*` ref at authoring. Authored in its OWN worktree
`/Users/dev/Developer/projects/TWT/.claude/worktrees/6-22b-fraud-register-identifier-set-and-filer-bans`, branch
`story/6-22b-fraud-register-identifier-set-and-filer-bans` (upstream UNSET — push with an explicit refspec; the main checkout was not
switched — [[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]]). Traced by five read-only research passes at
`b7b43c47` (governance + records; claim filing + identity substrate; closure / deletion / retention substrate; the 6.22 investigation +
post-death substrate; web research on PAN / Aadhaar / DPDP), each load-bearing claim re-read by hand. Re-locate every code claim by
FUNCTION, not by line number — line numbers rot.

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`): what the
Trust KEEPS about people and what it may lawfully collect is RULED by the Panel (`-238`, `-240`, `-243`) and its LEGAL BASIS is COUNSEL'S
(`-238` "WHAT IS COUNSEL-GATED" — *"⛔ MUST NOT BE BUILT BEFORE IT CLEARS"*). Five edges the ruled words do not decide are the Panel's —
whether a family with no PAN may file, whether a claim waits when the PAN check cannot confirm, when "a claim closes" for the deletion,
who raises a post-death fraud and what it can find, and whether the Aadhaar half of `-238` cl. 6 is dropped if counsel finds no lawful
route (a NARROWING of a ratified clause — PQ5) (PQ1–PQ5, ONE note). WHAT is asked of counsel, WHAT design is put to counsel, and
the one counsel-free hardening built here are the AUTHOR's (DL — BigDev at Task 0.2). Nothing in this story is a go-live condition for
anything already built except roster Row 47 leg (f), whose WRITTEN half this story meets.

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. Where a negation decides what the dev builds,
the sentence is written in plain words. No `file:NNN` into `.decision-log.md`, `deferred-work.md`, `sprint-status.yaml` or
`inventory-roster.md` (newest-first / growing files): cite the decision id, the item's phrase or the row key. Bare `DLn` means THIS
story's; another story's is written `6.22 DL0`, `6.20 D8`.

NUMBERS: not claimed by this file — every number it takes is "the next free one" at the commit that takes it, READ LIVE across every
branch and worktree (TR4 holds the 2026-11-02 snapshot).

LETTERS: **G** = found facts (G1–G16); **W** = web-research facts, certainty marked on each, for counsel (W1–W8); **DL** = build
decisions (DL0–DL7, PROPOSED — BigDev answers at Task 0.2); **PQ** = Panel questions (PQ1–PQ5) + **TL** = lines the note TELLS (TL1–TL3); **C** = the
counsel questions (C1–C8); **E** = the gated build's open engineering points (E1–E10, carried to the new row); **TR** = traps; **AC1–AC8**.
⚠ The routing-note TEMPLATE also names its evidence sections E1–E4; this file always writes those as **template §E1–§E4**. A bare `En`
here is the gated-build point.
-->

# Story 6.22b: The Fraud Register's Identifier Set and Filer Bans — Counsel's Question Written First, the Panel's Four Questions Put, and a Death Certificate Made Undeletable; the PAN Collection, the Bar at Filing and the Deletion Wait for the Answers

Status: ready-for-dev

> ⭐ **RESUME HERE — Task 0 is DONE (2026-11-02); the build starts at Task 1.0.** What the dev needs: Tasks 1.0–1.5 and 2.1–2.3, AC4,
> AC5, AC7, AC8, DL5, G12, TR1–TR4 and TR8–TR10. The PQ, TL, C and W sections, DL1–DL4 and DL6's governance rows are finished governance
> (written, ⛔ sent) — read them for context only; ⛔ edit the counsel question or the Panel note, and ⛔ record either as sent (N2).

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** The Panel ruled on 2026-09-21 that the fraud register keeps **only the guilty**, that a ban
> reaches **only the people who filed**, and that **only an exact identifier** — PAN or an Aadhaar token — may bar someone automatically
> (`-240` cl. 1–3); that PAN and Aadhaar of the claimant and nominee are to be collected on the filing form as that identifier (`-238`
> cl. 6); and that a post-death nomination rewrite is refused now and banned only after an investigation (`-240` cl. 6). The same day it
> fenced the whole identifier set behind **counsel**: *"⛔ MUST NOT BE BUILT BEFORE IT CLEARS"* (`-238`). Counsel has **never been asked**
> — no question was ever written (6.22 G15), and the Panel has been told three times that the register *"waits on legal advice"*.
> This story's FIRST job is to **write that question** — and, because research done for this story suggests the ruled design may not be
> buildable as ruled (an Aadhaar token is not available to a body like the Trust; PAN's official check is not open to it; about half of
> Indians hold no PAN — W1–W4), to put the concrete design to counsel and the four policy edges to the Panel **before** anything is built.
> It also closes one trap a future deletion would fall into — today nothing stops a death certificate's record being deleted, which
> `-243` forbids — with a small database guard. **Everything else in the row** (the PAN collection and its check, the bar at filing, the
> bans on claimants and nominees, the post-death investigations, the `-240` cl. 1 deletion) is moved to a new counsel-gated row and
> waits for the answers (DL0).

**What already ships and this story REUSES — rebuild none of it:**
- The counsel-question format: `_bmad-output/planning-artifacts/counsel-question-2026-10-18-nominee-contact-basis.md` (header *From /
  Prepared / Status / Roster* — *"Status: WRITTEN, ⛔ not yet sent. Nothing here is recorded as asked until BigDev sends it."* — then
  *The situation, in brief* · *The questions* (numbered) · *What we need back*, and dated notes appended below, never edits). It is
  registered on the LAUNCH-GATE roster (`docs/launch-gate-inventory/inventory-roster.md` Rows 18 / 34), ⛔ in
  `docs/legal-counsel-engagement/` (whose §11a open-questions ledger is empty). Copy the SHAPE, not the text.
- The routing-note template (by path, never copied): `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`.
- The append-only guard pattern with a cascade exception (`IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN RETURN OLD;`) — migrations
  `0119`, `0122`, `0142`–`0144`, `0149`, `0160`, `0197` (e.g. `claim_fraud_investigation_steps_reject_mutation()` in `0197`). DL5's guard
  is this pattern, DELETE-only.
- The 6.22 records this story continues: decision `-438` (DL0's split — the row's scope is quoted from it), roster Row 47 leg (f), the
  `deferred-work.md` section *"Deferred from: story 6-22-… — Task 0.5"* (its bullet *"Row `6-22b`'s counsel question is OWED"*), the
  routing note `trustee-panel-routing-note-2026-11-01-6-22-fraud-register-first-half.md` (WRITTEN, ⛔ SENT — its **Q2** is this row's).

## Story

As **the Trust, which the Panel has told to keep a register of people found to have committed fraud on a death claim and to bar them
from filing again — and as the families who file those claims**,
I want **the legal question that gates the register written down and ready to send to counsel, the four choices the rulings leave open
put to the Panel, and the one certificate trap closed now**,
so that **nothing is collected from a grieving family, kept about a stranger, or used to bar anyone until the Trust knows it may lawfully
do so — and the build that follows is built on answers, not on a design that may not be possible**.

> ⚠ **What this story does NOT do — read this before anything else.** It collects nothing new from anyone, verifies nothing, bars no one,
> bans no one, deletes nothing and changes no member- or family-facing screen. After it lands a person found to have faked a death claim
> can still file again on the same or another phone number, exactly as today (6.22 PQ3's built side; roster Row 47). The identifier set
> stays unbuilt because a ratified decision forbids building it before counsel clears it — ⛔ because it was overlooked.

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| `2026-09-21-238` cl. 6 + COUNSEL GATE | *"PAN and Aadhaar of nominee and claimant are to be collected on the filing form and 'will be served as unique identifier'."* — *"⚠⚠ WHAT IS COUNSEL-GATED, AND ⛔ MUST NOT BE BUILT BEFORE IT CLEARS: The whole identifier set of cl.6. Counsel is engaged (Story 0.13) and must confirm **(a)** that the §17(1)(c) exemption supports **indefinite** retention of identity documents about **non-members**; **(b)** whether our identity provider can issue a **UID token** at all …; and **(c)** the Aadhaar Data Vault obligations."* · *"⚠ If no UID token is available, PAN is the only exact identifier"*. | Trustee-ratified (DR + KB); ⚠ counsel-gated — ⛔ asked (G1) |
| `-238` author-commits (⛔ Panel rulings) | the legal basis is *"the DPDPA's own exemption for the prevention, detection, investigation or prosecution of an offence"*; *"A full Aadhaar number is ⛔ NOT to be stored"* (a UID token in an Aadhaar Data Vault intended); composite identifiers *"Aadhaar last-4 + full PAN + bank account and IFSC + mobile + device/IP + demographics (full name, date of birth, father's name)"*. | author-commit (BigDev) |
| `-238` cl. 2 · cl. 4 · cl. 5 | blacklisting *"means **never joining or re-joining**. **Indefinite.** **⛔ Not appealable.** The **Super Admin may lift it.**"* · two outcomes only (*innocent* / *guilty* — of the MEMBER) · guilty ⇒ *"terminated and blacklisted … along with nominee and claimant (if nominee and claimant are different person)"*. | Trustee-ratified |
| `-238` NOT covered | (i) nominee banned automatically or only on their own finding; (ii) *"How a non-member is sanctioned … The blacklist must therefore key on an identifier, ⛔ not on `member_id`."*; (iii) *"Who may originate the flag. Clause 3 begins at 'operator'; in the post-death case the discovery is the **District Admin's**, reading the version timeline — ⛔ no operator is involved."* | not ruled — (i) = the 6.22 note's Q2 (unsent); (iii) = PQ4 (G9) |
| `2026-09-21-240` cl. 1–3 | *"RETENTION — only the guilty are kept. The claim form collects identity documents as it must in order to pay anyone; where a claim closes with ⛔ **no** finding of fraud they are **deleted**."* · *"REACH — filers only … Members are asked ⛔ **nothing** new: ⛔ no nominee PAN at declaration. A banned person named as someone's nominee is caught **at the moment they come forward to claim**"* · *"Only an **exact** identifier (PAN, Aadhaar token) may bar automatically. A match on **name / date of birth / father's name** raises a **review a human must confirm**"*. | Trustee-ratified |
| `-240` cl. 6 | *"THE POST-DEATH REWRITE — refusal now, a ban only on a finding. … a lifetime ban follows **only** after the same investigation required for a faked death."* | Trustee-ratified ⇒ PQ4 |
| `-240` "Our reading — ⛔ NOT RATIFIED" | *"we read the deletion trigger as falling **after the appeal path is exhausted or its window lapses**"*. | reading ⇒ PQ3 (G11: no window exists) |
| `-240` author-commit (PAN service) + Consequence 3 (the transcriber's analysis, ⛔ a ruling) | *"A PAN verification service will check PAN against name at collection … ⚠ Four consequences are owed before build: **(a)** the **fail mode** … **(b)** **fuzzy name matching** … **(c)** a **third-party processor** relationship … **(d)** **whose PAN** — scoped to **the person who files and the person who is paid**"* · *"Clause 3 depends on an exact identifier EXISTING."* | author-commit ⇒ (a) PQ2; (b) E-list; (c) C5; (d) DL2 |
| `2026-09-25-243` cl. 1–2 + Consequence 2 | *"A DEATH CERTIFICATE IS ⛔ NOT AN IDENTITY DOCUMENT within `-240` cl.1 … OPTION C — KEEP EVERY CERTIFICATE … for as long as claim records are kept. ⛔ Nothing is deleted at closure."* · *"⚠ A counsel item is OWED before go-live … the basis for retaining death certificates and their OCR data … including against an erasure request and about non-members."* | Trustee-ratified ⇒ DL5 (the guard); C8 |
| `2026-10-07-291` Q1 A | a `-239` refusal *"CAN BE APPEALED WITHIN 90 DAYS"* — it NARROWS 6.16 D-E (*"⛔ not a Panel ruling"*) for that one refusal. | Trustee-ratified ⇒ G11 (every OTHER denial has no window) |
| `2026-11-01-438` item 1 (DL0) · Consequence 1 | *"`6-22b-fraud-register-identifier-set-and-filer-bans` — ⚠ COUNSEL-GATED (`-238` (a)–(c)): PAN / Aadhaar-token collection, the PAN service, the bar at filing, bans on nominees and claimants (Q2), the post-death investigations whose guilty are filers (`-240` cl. 6), the `-240` cl. 1 deletion; its FIRST task writes the counsel question."* · go-live leg *"`6-22b`'s counsel question SENT"*. | author-commit ⇒ DL0, DL1 |
| `2026-09-08-210` (WHAT IS NOT DELEGATED) | *"the closure-language vocabulary"* stays outside the delegation — ONLY *"Closed by [edit]"* / *"Resolved via explicit deferral"* / *"Not addressed"*. | Trustee-ratified ⇒ DL6 |
| Niyamavali (§2.5, §6.1–6.3, §8.2, §8.4, §8.5, §8.8, Part 10) | §6 lists what a claim collects (certificate, bank / IFSC, consents) — ⛔ PAN; §8.5 grounds 1–3 (forged documents, identity fraud, financial fraud); §2.5 keys the re-join lock on an *"Aadhaar HMAC"* (the code uses a MOBILE blind index — G6); "blacklist" / "ban" / "father's name" / "succession" / "PAN" appear nowhere. A rulebook, ⛔ ratified apart from §8.8 and the 2026-08-07 interpretive ratification of "a skip" ([[feedback_niyamavali_rulebook_not_spec]]). | Policy-meaning check only |

## 📜 Policy meaning (AI-10-1)

**This story introduces and changes NO predicate that gates a member's or a family's access to a benefit.** The one thing it builds (DL5)
refuses a database DELETE that no code path performs; no claim, member or family sees any difference.

**Drafted now so it cannot go missing later — the predicate the GATED build will introduce (NOT built here; owed, re-checked and re-written
with that build in row `6-22e`):** *"If an investigation has found that you took part in a false death claim, you cannot file — or be paid
on — another death claim with the Trust, under any number, for as long as the ban stands; a claim from someone whose name, date of birth
and father's name only resemble yours is held for a person to check, never refused on the resemblance alone."* Its edges are PQ1 (a
family with no PAN), PQ2 (a PAN that cannot be confirmed) and the 6.22 note's Q2 (a nominee who never knew).

**Checked against the Niyamavali** (the git-ignored copy in the main checkout, `docs/legal/niyamavali.md`, 2026-11-02) — result: SILENT
on PAN, Aadhaar tokens, father's name and any ban on a NON-member; §6 lists what a claim collects without PAN (the gated build ADDS to
it); §8.5's grounds are consistent with a finding of fraud; §2.5's *"Aadhaar HMAC"* re-join key diverges from the code (G6 — recorded,
⛔ resolved here). The rulings (`-238`, `-240`) are the instrument, not the rulebook.

## ⭐ THE INVARIANTS

**N1 — Nothing of the identifier set is built, stubbed or seeded before counsel's recorded return.** No `pan`, `aadhaar_*`, `uid_token`,
`father_name` or identifier-blind-index column, contract field, i18n key, port, adapter or flag is added by this story ([[feedback_gate_scope_semantic_coverage]]
— a stub "reads as built"; 6.22 DL0 rejected it). AC7 is the grep that proves it.

**N2 — Nothing is recorded as asked until BigDev sends it.** The counsel question and the Panel note are WRITTEN, ⛔ SENT. No record —
story, ledger, roster, deferred-work, decision — says "asked", "put to counsel" or "shown to the Panel" before the send
([[feedback_shown_to_panel_means_sent]]).

**N3 — A death certificate's record is never deleted except with its claim.** After DL5 a direct DELETE of a `claim_documents` row whose
`document_type = 'death_certificate'` is refused for every role, superuser included; deleting the parent claim still removes everything
by cascade (`-243` cl. 2 enforced by the database, ⛔ only by the absence of a code path).

**N4 — Research is not law.** W1–W8 are web findings of 2026-11-02, labelled with their certainty, put to counsel AS QUESTIONS. No decision,
copy or code rests on them ([[feedback_provider_policy_is_found_not_counsel]] cuts the other way: a vendor's or regulator's WRITTEN rule
settles a fact about that vendor; what the Trust may lawfully do is counsel's).

## Found facts (traced at `b7b43c47`)

- **G1 — Counsel has never been asked.** No decision records an answer to `-238` (a) / (b) / (c); no counsel-question file exists for them
  (the only one is about contact — `counsel-question-2026-10-18-nominee-contact-basis.md`, itself WRITTEN, ⛔ sent);
  `docs/legal-counsel-engagement/review-artifact-roster.md` has 21 rows and none touches fraud or identifiers; `counsel-roster.md` records
  `lc-1` (DPDPA + Trust Act) with four acts, none on this. The Panel was told the register *"waits on legal advice"* in the note
  `2026-09-27-6-20-confirm-what-we-recorded`, the `2026-09-28-6-20-follow-ups` note's FQ4 (ruled at `-262` FQ4), and `-339` RF1 C's
  cost (three sites; the 6.22 note, `deferred-work.md` and Row 47 (f) say "twice" — they miss the 09-27 note; ⛔ rewritten here, the
  counsel question and Panel note say "three times"). Counsel IS engaged — write "counsel has not
  been asked about the identifier set", ⛔ "counsel is not engaged" ([[project_dpdpa_counsel_engaged_but_unrecorded]]).
- **G2 — The "provider check" the 2026-09-21 note promised was never recorded.**
  `trustee-panel-routing-note-2026-09-21-fraud-register-what-we-keep.md`,
  *How much to trust this note* ("Still uncertain"): *"whether our identity provider can issue an Aadhaar token at all … Being checked
  with the provider; ⛔ not a question for the
  Panel."* No outcome exists anywhere. The provider is **DigiLocker** (`apps/api/src/modules/kyc/providers/digilocker/`; ADR-0026):
  `mapEaadhaarToKycProfile` reads `Poi@name`, `Poi@dob`, `Pht` and the root `referenceId` / a `uid` attribute and passes it through
  `maskAadhaar` *"AT THIS BOUNDARY"* — only `aadhaarMaskedId` (last-4, `piiColumn(3,'member_kyc')` on `member_kyc_profiles`, NULL on the
  manual path) survives. No token or reference key is returned or stored; the care-of (father's) name is not read. W2 says why.
- **G3 — What a filer submits, and when.** Intake carries NO claimant identity: `ClaimIntakeInitiateRequest = { relationship }` and
  `HelplineClaimIntakeRequest = { deceasedMemberId, relationship, identityReadBackConfirmed: true, lookupMethod }` (both `.strict()`,
  `packages/contracts/src/claims/filing.ts` / `helpline.ts`; filing.ts: *"No nominee name/UPI/Aadhaar is ever carried on any claim-filing
  wire shape"*). `claimantActorId` is NULL on every path (app, helpline and the shepherd path — the v1 null-claimant policy). The
  claimant's name / mobile / address arrive AFTER the mint, through `writeClaimContact` (`claim/claim-contact-persist.ts`) into
  `claim_contacts` — Tier-1 `piiColumn(1, 'claim_contact')`; the table's schema header (`schema/claim_contacts.ts`) reads *"⛔ No
  mobile blind index"* and *"⛔ NO RTBF path reaches either table yet"*; or the claimant IS a declared
  nominee (`claimant_nominee_version_id`). ⇒ a "bar at filing" keyed on the filer cannot sit at the intake door (E1).
- **G4 — The filer is not authenticated as themselves.** In the app the session is the DECEASED member's (Ravi-mode); trust comes from
  the handover OTP sent to the primary nominee's declared mobile (`sendHandoverOtp` / `verifyHandoverOtp`, `claims.service.ts`; synthetic
  pool key `handover:<deceasedMemberId>`). On the helpline path trust is the operator's step-up plus a verbal read-back. What is proven is
  possession of the nominee's phone, ⛔ identity. The filer need not be a member.
- **G5 — The person who is paid is never identity-checked.** `claim_nominee_bank_accounts` (Tier-1 holder name, account, IFSC, VPA, a
  name-difference note; header *"NO holder-name-must-match-nominee linkage"*); the only check is the District Admin's recorded judgement
  (`claim/nominee-name-check.ts` — *"⛔⛔ TRAP 1 — THERE IS NO COMPARISON IN THIS FILE, AND THERE MUST NEVER BE ONE"*, `-226` cl. 5).
  There is no nominee self-authentication (`nominee-console/handlers.ts`: *"§2.3 has no nominee-self-auth primitive"*).
- **G6 — No exact identifier exists for anyone but members, and theirs is a phone number.** No PAN, father's name or full Aadhaar anywhere
  in schema or contracts ("PAN" appears only as a forbidden custom-field key `'pan'` and label `'पैन'` in
  `custom-fields/frozen-governance.ts`). The member's
  12-month re-join lock keys on `member_identities.mobile_blind_index` (`encryption/member-fields.ts` `mobileBlindIndex` →
  `encryption/blind-index.ts` `blindIndex`, HMAC-SHA-256 via `kms.computeHmac`, one audit line per call; `blindIndexMany` batches, ONE
  audit line, run OUTSIDE a transaction — [[project_kms_audit_per_hmac_global_lock]]). `member_withdrawals.aadhaar_hmac` is a NULLABLE
  seam nothing writes. Niyamavali §2.5 and the privacy policy describe an *"Aadhaar HMAC"* — the instrument and the code diverge
  (recorded at `-238`, ⛔ resolved).
- **G7 — The external-service house pattern** (for E4): a port in `packages/contracts` (`KycProvider` in `contracts/src/kyc/provider.ts`,
  `ClaimDocumentStorage` in `contracts/src/claims/documents.ts` — the usual home; `packages/platform-adapters/src/bank-ifsc-lookup/port.ts`
  is the ONE port under `platform-adapters`), an in-memory / fixture stub, a real adapter with `fetchWithTimeout` (timeout ⇒ a
  `provider_unavailable` code), selection in `apps/api/src/deps.ts` (`buildKycProviderRegistry`: secret names ABSENT ⇒ the fixture in
  EVERY environment, production included; names configured but resolving blank ⇒ a throw — a PAN adapter must decide whether
  production may run on a fixture), config in `apps/api/src/config.ts`, a
  boundary CI gate (`scripts/kyc-provider-boundary/check.ts`). Fail-mode precedents: Turnstile `TURNSTILE_FAIL_OPEN`; DigiLocker
  staleness fails CLOSED (`certificate_stale`); the KYC manual fallback is designed so a failure is never a lock-out.
- **G8 — The 6.22 investigation cannot record a FILER's guilt.** `claim_fraud_investigation_steps.step` CHECK is `flagged |
  found_innocent | found_guilty`; a finding REQUIRES `alive_confirmation` (`in_person | video_call | ground_inspection`, CHECK + the
  `missing_alive_confirmation` refusal in `recordFraudFinding`); a guilty finding writes `member_found_guilty` against
  `deceased_member_id` and triggers the STICKY account freeze (`member/overlay.ts` `ACCOUNT_STICKY_FREEZE_EVENT_TYPE`). Used on a real
  death it would brand the DEAD member. ⇒ a post-death investigation is a new subject, ⛔ a reuse (E6).
- **G9 — The post-death originator is NOT ruled — its only "ruling" is a summary line.** The 2026-09-21 *how-far-the-ban-reaches* note's
  transcription block reads *"⇒ the full chain is: **helpline operator or District Admin flags** → District Admin verifies → …"*. That is
  the note author's `⇒` synthesis: Q2 option C as put (*"Trust-wide, but imposed one level up after the Pariwar Admin refers it"*) names
  no flagger, and `-240` cl. 5 names none either. `-238` NOT covered (iii) stands ⇒ PQ4 (cite the summary line as what the note recording
  the ruling says, ⛔ as a ruling — [[feedback_panel_gate_read_ratified_verbatim]]).
- **G10 — What exists today about a post-death fraud.** The `-239` refusal is an ordinary verifier denial — `adjudicateClaim(outcome:
  'denied', reasonCode: 'post_death_nominee_change')` (`claim/verifier-decision-persist.ts`, guarded by `assertPostDeathRefusalGrounded`)
  — with a Pariwar Admin email (6.25) and texts (`claim-suspicion-notices.ts`); the nomination rewrite's actor is the member's OWN session
  (`member_nominee_versions` has no actor / device column; the `member.nominees_declared` event's `actorId` = the member) — no device or IP
  is stored anywhere but `member_trusted_devices` / `member_refresh_tokens`. A forged certificate has NO outcome: certificate review is
  `accepted | rejected` with three date-shaped reasons and *"A REJECTION IS NOT A DENIAL"*; the ground inspection's
  `does_not_match` and the register check's `does_not_match` raise approval WARNINGS only (`approval-warnings.ts`
  `deriveDeathFactWarningKeys`). No "suspected filer" record exists.
- **G11 — A FIRST plain denial never becomes final by time passing, so a deletion "when the claim closes" would never fire for it.**
  `closed` and `settled` are terminal (`state.ts` — *"⛔ Nothing leaves `closed`"*); `denied` is a resting state. `assertAppealInitiable`
  (`claim/appeal-eligibility.ts`) makes a denial final in exactly three cases: (a) any earlier appeal journey, open or finished
  (`AppealAlreadyExhaustedError` — 6.16 D-F); (b) a 6.19c no-response closure (`AppealClosedNoResponseError`, `-231` A — final the moment
  it is written); (c) a `-239` refusal older than 90 days (`AppealTimeLimitPassedError`; `-291` Q1 A; `SUSPICION_REFUSAL_APPEAL_DAYS`,
  computed at read time, ⛔ an event). `claim.denied_no_appeal` (which `state.ts` calls terminal) is emitted only by a stage-3 uphold
  (`appeal-persist.ts`) and two 6.19c paths (`correction-closure.ts`). Every OTHER denial — the first, with no appeal journey — has
  *"NO elapsed-time gate"* (6.16 D-E, a planning decision, ⛔ a Panel ruling; `initiateAppeal`'s guard comment) and stays appealable for
  ever; no event or job marks it final. ⇒ PQ3.
- **G12 — The 0122 cascade trap, exactly.** `claim_death_certificate_uploads_claim_document_id_fk` is `ON DELETE cascade` (migration
  `0122`; drizzle `onDelete: 'cascade'` in `schema/claim_death_certificate_uploads.ts`; `claims` is `claim_documents`' ONLY parent and has
  no FK parent itself, so `DELETE FROM claims` is the only cascade into it), and reviews cascade from uploads
  (`claim_death_certificate_reviews_upload_id_fk`). The `death_certificate` `claim_documents` row also holds the certificate's OCR
  ciphertexts (`deceased_name / dob / date_of_death / issuing_authority / certificate_number_ciphertext`), which `-243` Consequence 2
  keeps. Deleting it either CASCADES into every kept upload and review, or ABORTS when a ground inspection points at an upload
  (`claim_ground_inspections.compared_certificate_upload_id`, `0147`, and `claim_ground_inspection_photos.certificate_upload_id`, `0148`
  — both NO ACTION). `twt_app` has no DELETE grant on `claim_documents` (`0053`: *"a future story grants DELETE if the row itself must be
  purged"*), so today only a superuser / migration / owner-role job can do it. ⚠ ONE test relies on the cascade: `packages/domain/tests/
  integration/rls/claim-death-certificate-policy-regression.spec.ts` — *"⭐ D8 — the determination's review FK is ON DELETE SET NULL (a
  cascade from the certificate row)"* runs `DELETE FROM claim_documents WHERE claim_document_id = $1` as superuser (TR1).
  Every other direct delete runs under `session_replication_role = 'replica'` (user triggers OFF — unaffected):
  `nominee-history-concurrency.spec.ts` and ~15 specs whose cleanup loops delete every table with a `pariwar_id` column (domain
  `claim/correction-queue-late-*`, `fraud-investigation-concurrency`, `ground-inspection-*-concurrency`, `one-payment-per-death-*`,
  `peer-mesh-*-concurrency`, `suspicion-*-concurrency`; jobs `announcement-channel-post-live`, `claim-peer-mesh-*-live`,
  `degraded-bridge-live`). The 32 `DELETE FROM claims` sites are cascades (they pass the guard); no drizzle `.delete(claimDocuments)` or
  `.delete(claims)` exists; no production code deletes either table. `claim_documents` has ⛔ trigger today (0053: *"NO …
  write-rejection trigger"*), so DL5 is not redundant; TRUNCATE is already refused one step removed (the uploads FK forces CASCADE, and
  `claim_death_certificate_uploads_no_truncate` raises 23000). No `pg_trigger` inventory test covers `claim_documents`.
  ⭐ 2026-11-21 (re-traced at `origin/main` `90535934`): migration `0212_claim-membership-checks` (Story 6.39) adds
  `claim_membership_checks`, whose `claim_membership_checks_death_certificate_review_id_fk` is `ON DELETE cascade` into the REVIEW
  (and `…_claim_case_id_claims_claim_case_id_fk` cascades from `claims`), guarded by `claim_membership_checks_reject_mutation()` — the
  same depth > 1 cascade exception, 23000. A certificate-row delete now cascades upload → review → membership check; at depth ≥ 3 that
  guard passes. No new FK into `claim_documents`, its uploads or its reviews is NO ACTION; no new DELETE path or grant exists.
- **G13 — Nothing deletes or scrubs on a claim's close today.** No retention job (`apps/jobs/src` has `sms-delivery-prune.ts` and
  `device-token-cleanup.ts` only); every claim-side scrub lives inside the member erasure (`member/anonymize.ts`, keyed on the deceased).
  Not scrubbed by anything: `claim_contacts`, `claim_contact_nominees`, `claim_nominee_bank_accounts`, the OCR row. `events_log` is
  immutable and never scrubbed (claim payloads carry ids and codes only). The blob port `ClaimDocumentStorage.delete?` exists (GCS adapter
  `bucket.file(key).delete({ ignoreNotFound: true })`), used only as a write compensation; `anonymize.ts`'s memorial photos are the one
  post-COMMIT best-effort blob deletion. No audit type for a deletion exists; jobs run outside the API audit sink. The retention matrix
  is OUT OF REPO (architecture §2.12; roster Row 47 (h)).
- **G14 — 6.22 records that name this row** (each to be annotated, never deleted — DL6): `deferred-work.md` — *"Row `6-22b`'s counsel
  question is OWED and ⛔ WRITTEN"* (6.22 Task 0.5 section); *"Q2 (PQ2) — the nominee of a guilty member … Lands in row `6-22b`."*; the
  6.21 code-review item *"A future `-240` cl.1 closure-time deletion of `claim_documents` rows would CASCADE (… 0122) …"* with its 6.22
  append *"Resolved via explicit deferral to `6-22b`"*; roster Row 47 leg (f) *"row `6-22b`'s counsel question (`-238` (a)–(c)) WRITTEN
  and SENT"* and its discharge path *"(f) row `6-22b`'s FIRST task"*; leg (h) (the retention-matrix row for the steps table, *"kept with
  the claim until `6-22b` applies `-240` cl. 1"*). Code comments: `schema/claim_fraud_investigation_steps.ts` and `member/anonymize.ts`
  (*"whether innocent-outcome notes fall in row `6-22b`'s deletion is recorded there"*). `sprint-status.yaml` row `6-22b-…`'s comment block
  (DL0 verbatim, plus *"who may originate a flag on a claim about a member who DID die … to be put to the Panel"* and the 6.21 CASCADE
  item).
- **G15 — No processor register exists.** The DPDPA third-party list lives only in
  `docs/knowledge-transfer/third-party-dependency-inventory.md`
  (DigiLocker's row) and the git-ignored privacy policy §6 (*"KYC providers (e.g., DigiLocker)"*). A PAN-verification vendor would be the
  first new processor of identity data since DigiLocker (E4, C5).
- **G16 — Numbers at `b7b43c47`** (READ LIVE at each commit — TR4): decision top `-439`, migration top `0198` (journal idx 198, `when`
  `1796701200043`), `PERMISSION_CATALOG_VERSION = 58` (77 keys), roster top Row 47 (Row 46 reserved by 6.39, appended nowhere), ledger
  `2026-11-02b`. Sibling heads: `story/6-39-…` `-430` / `0192`; `story/13-2-…`, `story/14-3-…` `-430` / `0193`; `origin/story/12-2-…`
  `-437` / `0195` (landed). Next free: decision `-440`, migration `0199`, ledger: the letter after the newest `2026-11-02*` line on any
  ref (`02c` = this
  story's creation, `02d` = its validate), row key
  `6-22e` (unused on every ref).
  ⭐ 2026-11-21 re-read (`origin/main` `90535934`, this branch 270 commits behind): decision top `-476` (`-440` stays this branch's —
  every sibling since recorded it as taken; on main it sits between `-441` and `-439`); migration top `0212` (journal idx 212, `when`
  `1797998520000`) ⇒ next free `0213`; ledger top `2026-11-21o` on every ref; `ci:local` / GitHub CI 40 jobs. READ LIVE again at
  each commit.

## Web research — W1–W8 (2026-11-02, each re-checked against its source the same day; NOT legal advice; put to counsel as questions — N4)

- **W1 — PAN's official bulk check is probably closed to the Trust.** Protean (NSDL) Online PAN Verification lists ~37 regulated /
  government categories (banks, NBFCs, insurers, SEBI intermediaries, government…) plus AIR/SFT filers and TDS deductors with more than
  500 deductees a quarter; ⛔ category fits a trust (trusts are not excluded by name — they are absent); ₹12,000/yr + GST + DSC; ITD
  approves each applicant; use limited to the registered purpose (Protean OPV overview + FAQ, read 2026-11-02 — CONFIRMED). The Income
  Tax "Verify Your PAN" page is ⛔ a holder-only check: it takes PAN, full name, date of birth and *"Mobile Number (accessible to you)"*,
  sends the OTP to whatever number is entered, 5 PANs per mobile per day — anyone who knows a person's name and date of birth can check
  their PAN BY HAND (incometax.gov.in "how to verify PAN"). ⇒ realistic routes: a commercial aggregator (Cashfree's PAN API returns a
  name-match band DIRECT / GOOD_PARTIAL / MODERATE / POOR / NO_MATCH and the Aadhaar-seeding status — a DATA PROCESSOR; Setu ⛔
  checked), a consented DigiLocker pull, or a manual check on the ITD page — UNCERTAIN which is lawful (C5).
- **W2 — An Aadhaar "UID token" is issued only to an AUA / KUA / Sub-AUA, in an authentication response** (UIDAI 2018 circular on
  Virtual ID, UID token and Limited KYC). The Trust is none of these; DigiLocker's eAadhaar gives a masked reference (G2). The 2017 Aadhaar
  Data Vault circular is superseded by UIDAI Circular 14 of 2025; its FAQ (v10, 2025-11-03) is addressed to requesting entities (the
  Trust is ⛔ one — persuasive, ⛔ binding on us) and says, verbatim, *"Hash of Aadhaar No. should not be used as reference key"*
  (CONFIRMED from the PDFs). ⇒ `-238`'s "Aadhaar hash (UID token)" is likely unobtainable AND a plain hash is not
  acceptable — `-240` Consequence 3's *"PAN is the only exact identifier"* is the likely outcome.
- **W3 — Collecting an Aadhaar NUMBER at all binds any entity now** (Aadhaar (Sharing of Information) Regulations 2016, text to 2025-08-21:
  Reg 5 — lawful purpose, notice incl. alternatives, consent; Reg 6(5) — *"No entity … shall retain Aadhaar numbers … for longer than is
  necessary for the purpose specified … at the time of obtaining consent"*). Puttaswamy (2018) struck down s.57; private authentication
  needs a law or the 2025 "good governance" route (untested for a trust).
- **W4 — PAN coverage**: 78.44 crore PANs at 2025-03-31 (ITD, via search excerpts — the ITD PDF returned 403); *"almost 50%"* (Business
  Today, April 2024) divides 73.15 crore individual PANs by the WHOLE population, children included — ⛔ the right denominator for an
  adult filing a claim. Against ~99 crore electors (ECI, Jan 2025) individual PANs cover roughly **3 in 4 adults** — an UPPER bound
  (the count includes minors, the dead and duplicates). ⛔ official adult, rural or low-income PAN figure was found; that poorer and
  rural families fall below the average is an INFERENCE, ⛔ a sourced fact. A PAN-mandatory claim form will exclude some genuine
  families — UNCERTAIN in size, CERTAIN in direction. The tax regime's alternative for a person with no PAN is Form 60 (Rule 114B).
- **W5 — DPDP Act s.17(1)(c)** exempts processing *"in the interest of prevention, detection, investigation or prosecution of any offence
  or contravention of any law"* from Chapter II (except s.8(1), 8(5)), Chapter III and s.16. Whether a PRIVATE body may rest an INDEFINITE
  preventive blacklist on it is untested (commentary 2025). Commencement (G.S.R. 843(E), 2025-11-13): ss.3–17 incl. s.8 and s.17 from
  **2027-05-13** (CONFIRMED); a MeitY proposal (Jan 2026) to shorten 18 months to 12 (possibly for significant data fiduciaries only)
  had ⛔ notified amendment at a 2026-09-28 tracker (only corrigendum G.S.R. 892(E)) — CHECK LIVE. Rule 8's fixed erasure
  timelines bind only large platforms; s.8(7)'s purpose test governs a trust.
- **W6 — Indian fraud registries give notice and expire.** RBI's fraud-risk directions (2024, following *SBI v. Rajesh Agarwal*, SC
  2023-03-27): a show-cause notice, at least 21 days to reply, a reasoned order; debarment 5 years from repayment. IRDAI's IIB caution
  repository (guidelines 2025-10-09, in force 2026-04-01). ⇒ `-238` cl. 2's *"Indefinite. ⛔ Not appealable."* ban on a NON-member, on
  an internal finding, carries a natural-justice risk counsel should weigh (C6).
- **W7 — A regulator chose PAN over Aadhaar as a registry key**: IRDAI's 2020-06-30 circular moved IIB's salesperson database from
  Aadhaar to PAN *"considering the constraints in the sharing & storage of Aadhar number"* (circular IRDAI/INT/CIR/CDB/168/06/2020;
  secondary sources only, the quote ⛔ found in a primary text — UNCERTAIN).
- **W8 — How often PAN name checks "fail" a genuine person** (for PQ2): ⛔ regulator or ITD figure exists. One vendor claims name
  mismatches from initials, name order and spelling cause *"rejection rates of up to 18%"* (Cashfree name-match docs); HyperVerge makes
  the same argument without a number. A VENDOR CLAIM, ⛔ a measured rate.

## Build decisions — PROPOSED (BigDev answers at Task 0.2)

- **DL0 — SCOPE: the questions now; the build moves to a new counsel-gated row.**
  - **A (recommended)** — this story: Task 0 (the counsel question, the Panel note, the decision, the records) + DL5's guard. The gated
    build moves, VERBATIM, to a new row **`6-22e-fraud-register-identifier-collection-filer-bans-and-deletion`** (backlog, ⚠
    COUNSEL-GATED; gated also on PQ1–PQ5 and the 6.22 note's Q2), minted at Task 0.6 with E1–E10 as its trace list. This row's key is
    ⛔ renamed (`-438`, the ledger and two code comments cite it — `member/anonymize.ts` and `schema/claim_fraud_investigation_steps.ts`,
    both pointing the DELETION at `6-22b`; Task 1.2 re-points them, comment-only) — the slug keeps naming the identifier set, as 6.22's
    did. *Cost:* a
    fifth fraud-register row; this row closes without building its namesake.
  - **B** — one story: Task 0 now, then the build Tasks behind a STOP until counsel returns. *Cost:* the row sits `in-progress` for as
    long as counsel takes (weeks to months), and every build Task is written against answers not yet given — it would need a full
    re-validation at the gate anyway.
  - **C** — Task 0 only, ⛔ DL5; the row moves to a deferred state (the 10.14 `deferred-to-v2` precedent). *Cost:* the 0122 trap stays
    open; the row's status reads "deferred" while its first task is done.
  - *Rejected:* building any of the identifier set now (N1); building the post-death filer finding now (its originator, its subject and its
    outcomes are PQ4's; it cannot reuse 6.22's table — G8).
- **DL1 — The counsel question** — `_bmad-output/planning-artifacts/counsel-question-<date>-fraud-register-identifier-set.md`, the house
  format (G1's precedent), questions C1–C8 below (DL2's proposed design stated in *The situation*, so counsel answers a concrete shape),
  *What we need back* naming what each answer unblocks. Status WRITTEN, ⛔ sent; BigDev sends. Registered as roster Row 47 leg (f)'s
  WRITTEN half (a dated line) — ⛔ a new roster row (the SENT half stays open; the identifier set's own go-live row comes with its build).
  - **C1 (`-238` (a))** — May the Trust keep, **indefinitely**, the PAN, name, date of birth and father's name of a person — usually ⛔ a
    member — whom its own investigation found to have taken part in a false death claim, and the finding itself, under DPDP s.17(1)(c) or
    any other basis? If ⛔ indefinitely, for how long? And what governs it before DPDP's ss.3–17 commence (W5)?
  - **C2 (`-238` (b))** — Our understanding is that a UIDAI token is issued only to an authentication user agency and that our identity
    provider returns only the last four digits (G2, W2). Is that right, and is there ANY lawful route for a trust like ours to hold an
    exact,
    stable Aadhaar-based identifier (a Sub-AUA under the 2025 good-governance rules; offline verification)?
  - **C3 (`-238` (c))** — If the answer to C2 is no, we expect to propose to the Trust's Panel that no Aadhaar number is collected in any
    form (no number, no photocopy, no hash — W2, W3); the Panel's own ruling asks for Aadhaar, so dropping it is the Panel's decision, ⛔
    ours (PQ5). Would collecting it WITHOUT a token create duties we could not meet (Aadhaar Data Vault, the Sharing Regulations)? And
    is any such duty left on us, e.g. for the masked last-4 members already give?
  - **C4 — PAN at filing** — On what basis may the Trust ASK the person filing a death claim, and the person to be paid, for their PAN, to
    verify it and to keep it? May it be REQUIRED, given that many poorer families hold none (W4)? Is a signed declaration (a Form-60-like
    statement) an acceptable alternative? What must the person be told at collection (purpose, whether it is mandatory, alternatives)?
  - **C5 — The PAN check** — May the Trust check a PAN through a commercial aggregator (W1), and what must the contract with it say
    (processor duties, the vendor's own retention, where data is held)? Is a consented DigiLocker pull a better route?
  - **C6 — The ban itself** — The Trust's Panel ruled that a person found to have committed fraud is barred from ever filing again,
    indefinitely, with ⛔ appeal (only a senior administrator may lift it). For a NON-member found guilty by the Trust's own staff, is that
    lawful as ruled, or must the person first be told the allegation and given a chance to reply (W6)? May it be indefinite?
  - **C7 — Deleting at a clean close** — The Panel ruled that identity data collected on a claim is DELETED when the claim closes with no
    finding of fraud. Does any law require the Trust to KEEP a paid person's PAN or identity details (income-tax, trust accounts, audit)
    — and if so, for how long?
  - **C8 (owed by `-243` Consequence 2; asked here so one letter carries every retention question — BigDev may drop it)** — the basis for
    keeping every death certificate and its OCR data for the claim-record period, including against an erasure request and about
    non-members.
- **DL2 — The design put to counsel (⛔ built; the shape C1–C7 are asked against).** (i) **PAN only** — ⛔ Aadhaar number in any form
  unless C2 names a lawful route — ⚠ a NARROWING of Trustee-ratified `-238` cl. 6 (*"PAN and Aadhaar … collected on the filing form"*),
  so it is put to counsel as the design we EXPECT to propose and to the Panel as PQ5; ⛔ adopted by this decision; (ii) **whose PAN**:
  the person who files and each person to be paid (`-240` author-commit (d)) —
  members asked nothing new at declaration (`-240` cl. 2); (iii) **checked** against the name through a processor (C5); (iv) **kept**
  as Tier-1 ciphertext PLUS a Trust-wide keyed blind index (a NEW field class in a GLOBAL namespace — global like the login mobile
  index's `MEMBER_IDENTITY_NAMESPACE`, but its own class, ⛔ that one; ⛔ a per-Pariwar claim-side namespace like
  `CLAIM_CONTACT_MOBILE_FIELD_CLASS`'s, which would stop a ban crossing Pariwars) for EXACT matching only; (v) **name / date of birth /
  father's name** collected for `-240` cl. 3's human review — father's name is NEW
  data about a non-member (C1, C4); (vi) **deleted** at a clean close (PQ3, C7), **kept** only where a finding of fraud stands (C1).
- **DL3 — The Panel note** — ONE note from the template (by path):
  `_bmad-output/planning-artifacts/trustee-panel-routing-note-<date>-6-22b-identifier-set.md`, PQ1–PQ5 + TL1–TL3, plain-English question
  first, THE ONE FACT (each with its certainty stated — W-facts are research, N4), every option costed, evidence LAST, template §E4
  commands run. WRITTEN, ⛔ sent. ⭐ Send ORDER: the counsel question goes out FIRST or with the note — the note's TL lines say a
  question "is written for counsel", and the note must not be read as saying counsel was asked before the counsel letter is sent (N2).
  It names the 6.22 note's Q2 as this row's
  and asks BigDev to send the two together (⛔ re-asked here — one question, one note). Non-blocking for this story's build and merge.
- **DL4 — The decision entry** — AUTHOR-COMMIT, the next free number (`-440` at `b7b43c47`; READ LIVE): DL0–DL7 as answered; records G9
  (the post-death originator is not ruled — the `⇒` summary line is a reading) and G11 (a first plain denial never becomes final) as FACTS;
  records W1–W8 as research put to counsel (N4), ⛔ as grounds; records that the Aadhaar narrowing (DL2 (i)) is PQ5's, ⛔ adopted;
  records that `-240`'s four owed consequences are answered as (a) → PQ2, (b) → the gated row's E-list, (c) → C5, (d) → DL2 (ii);
  supersedes nothing. Committed ALONE, first.
- **DL5 — The certificate guard (counsel-free, built here).**
  - **A (recommended)** — a hand-written migration (the next free number): a `BEFORE DELETE` row trigger on `claim_documents` whose
    function refuses deleting a row with `document_type = 'death_certificate'` UNLESS `pg_trigger_depth() > 1` (the cascade from
    `claims` — the RI trigger runs the cascade, so depth > 1, exactly as `0122`'s own uploads guard relies on), raising `RAISE EXCEPTION
    … USING ERRCODE = 'integrity_constraint_violation'` (23000 — the `0122` / `0197` guards' code) with a DISTINCT message (the code
    alone does not identify this guard — AC4 asserts the message). FK `0122` is ⛔ changed. Covers the OCR row even with no upload.
    *Cost:* one more trigger; the D8 test fires its DELETE from a pg_temp trigger (TR1) — ⛔ via the claim, ⛔ by DDL on the shared table.
    *Rejected alternative:* refusing unless the parent claim is gone (`NOT EXISTS (SELECT 1 FROM claims WHERE claim_case_id =
    OLD.claim_case_id)` — exact, proven false inside a claims cascade) — ⛔ the house pattern (every guard in 0119–0197 uses depth > 1),
    and it would leave D8 with only a catalog check. The depth exception admits ANY trigger-issued delete; that is the house's accepted
    residual.
  - **B** — change `claim_death_certificate_uploads_claim_document_id_fk` to `ON DELETE NO ACTION` (end-of-statement check, so a claim's
    cascade still passes). *Cost:* protects only certificates that have an upload; the OCR row of a certificate with none stays deletable.
  - **C** — nothing here; re-defer the trap to `6-22e`. *Cost:* the trap waits for the story most likely to spring it.
- **DL6 — Records annotated — ONLY the three ratified labels**, each a dated line, ⛔ a deletion ([[feedback_closure_language_precision]]):
  | Item (cite by phrase) | Exact words |
  |---|---|
  | `deferred-work.md` — *"Row `6-22b`'s counsel question is OWED"* | *"WRITTEN <date> (`<path>`), ⛔ sent — owner BigDev (sends); trigger: the send. Not addressed: the answer."* |
  | 6.21 — *"A future `-240` cl.1 closure-time deletion of `claim_documents` rows would CASCADE"* | DL5 A/B: *"Closed by 6.22b DL5 — a guard refuses deleting a death certificate's row except with its claim."* · DL5 C: *"Resolved via explicit deferral to `6-22e`"*. |
  | *"Q2 (PQ2) — the nominee of a guilty member … Lands in row `6-22b`"* | *"Resolved via explicit deferral to `6-22e` (DL0); the question is the 6.22 note's Q2, ⛔ re-asked."* |
  | Roster Row 47 leg (f) | an inline `closure_evidence_link` entry in the existing shape (leg letter first, like *"(e) ✅ MET 2026-11-01 — …"*): *"(f) WRITTEN half met <date> — `<path>`; the SENT half open."* (⛔ the row's status changes). |
  | Row 47 leg (h) — the steps-table notes *"kept … until `6-22b` applies `-240` cl. 1"* | dated line: *"the deletion moved to `6-22e` (DL0); whether innocent-outcome notes fall in it is asked as part of PQ3."* |
  | Row 47 notes — *"Rows `6-22b` (counsel-gated), `6-22c` and `6-22d` carry their own go-live conditions when built"* | dated line: *"<date> — the identifier set's build moved to `6-22e` (6.22b DL0); `6-22e` carries its go-live conditions."* |
  | `epics.md` Story 6.22 blockquote — *"rows `6-22b` (the identifier set and filer bans — counsel-gated)"* | dated line under the blockquote: *"⭐ <date> — `6-22b` writes the questions and the certificate guard; the build moved to `6-22e` (6.22b DL0)."* (the new 6.22b entry is AC6's). |
  | `sprint-status.yaml` row `6-22b-…` comment block | a dated pointer line: *"⭐ <date> — story file `6-22b-….md` exists (the *"No story file yet"* line above is stale); questions written; the build moved to `6-22e` (DL0)."* |
  | Code comments — `member/anonymize.ts` (*"whether innocent-outcome notes fall in row `6-22b`'s deletion is recorded there"*) and `schema/claim_fraud_investigation_steps.ts` (*"`-240` cl. 1 applies at row `6-22b`"*) | Task 1.2: re-point to `6-22e` with *"(moved from `6-22b` — 6.22b DL0)"*; comment-only, in AC7's allow-list. Skip under DL0 B / C. |
- **DL7 — Scope fence.** ⛔ Here: any identifier column / contract / copy / port / flag (N1); the bar at filing; any ban table (shared
  design with `6-22d` — E9); the deletion or its trigger; the post-death investigation; a change to `claim_fraud_investigation_steps` or
  the leaf; a nominee ban; a new permission key (none is needed — DL5 is a migration); sending anything to counsel or the Panel; any
  member-, family- or staff-facing change.

## Panel questions — ONE note at Task 0.4 (WRITTEN; BigDev sends)

- **PQ1 — A family member who has no PAN: may they still file, and be paid?** (`-238` cl. 6 and `-240` cl. 3 assume an identifier exists;
  neither says what happens when the person has none.) ⭐ THE ONE FACT: by count, roughly 3 in 4 adults hold a PAN — an upper bound;
  no figure exists for poor or rural families, who are likely below it (W4 — research, ⛔ an official statistic). So some genuine
  families filing a claim will have none. Options: **A** PAN required to file and to be paid — cost: a genuine family with no PAN
  cannot claim at
  all; **B** PAN asked; with none, a signed declaration, and the claim goes to the human check (`-240` cl. 3's review) — cost: a fraudster
  can simply say "no PAN", and the register catches only those who give one; **C** PAN optional with no declaration — cost: as B, with less
  on record. *Suggest: B.* (Counsel's C4 may narrow what is lawful — the note says so.)
- **PQ2 — When the PAN cannot be confirmed — it does not match the name, or the checking service is down — does the claim wait?** (`-240`
  author-commit (a): *"fail-closed stops a grieving family, fail-open admits an unverified PAN"*.) ⭐ THE ONE FACT: commercial PAN
  checkers report that names on PAN records often differ from how people write them (initials, order, spelling) — one vendor claims up
  to 18% of checks are rejected on that alone (W8 — a vendor's claim, ⛔ a measured rate); so some "did not match" results will be
  wrong about a genuine family. Options: **A**
  the claim waits until a match — cost: a grieving family waits on a vendor or a spelling; **B** the claim goes on with a WARNING the
  approver must answer with a reason (the Panel's own `-264` FQ12 warning shape) — cost: an unconfirmed PAN can be paid; **C** the claim
  goes on silently — cost: the check protects nothing. *Suggest: B.*
- **PQ3 — When does a claim "close with no finding of fraud", so its identity data is deleted?** (`-240` cl. 1; its unratified reading:
  *"after the appeal path is exhausted or its window lapses"*.) ⭐ THE ONE FACT: a claim refused for the first time, and never appealed,
  can be appealed at ANY time — it never becomes final (G11; only a refusal after an appeal, a closure for no response, and a
  post-death refusal older than 90 days become final) — so under the reading the commonest refused claim's data would never be deleted;
  and a PAID claim may need its payee's details kept by
  other law (C7). Options: **A** delete only when a claim is `closed` (never for a refused or paid claim) — cost: refused families' and
  paid payees' PAN kept for ever, the opposite of "only the guilty are kept"; **B** give every refusal an appeal window (90 days, as the
  Panel set for post-death refusals in `-291`) and delete when it lapses, and delete a paid claim's data after any period counsel sets —
  cost: a family loses the right to appeal late, which today they have; **C** delete a closed claim's data at once and a paid claim's after
  counsel's period; for a refused claim delete after a fixed period counsel sets WITHOUT closing the appeal — cost: a family who appeals
  later and wins is asked for their documents again. *Suggest: C.* Also asked: do investigation NOTES written on a claim found innocent
  (6.22 TL1 (iv)) fall in the deletion?
- **PQ4 — When the member really died but the person who filed lied (a nomination changed after the death, or a forged certificate): who
  raises it, and what can the investigation find?** (`-238` NOT covered (iii); `-240` cl. 6.) ⭐ THE ONE FACT: the ruled chain starts
  *"operator flags"*, but in these cases it is the District Admin who sees the fraud — in the nomination history or the certificate check
  — and the only findings ever ruled are about the MEMBER ("innocent" / "guilty"), which here would brand a dead member (G8). The note
  that recorded the 2026-09-21 ruling summarises the chain as *"helpline operator or District Admin flags"* — but that line is the note
  author's summary: neither the option the Panel chose nor the decision says so (G9). Options: **A** the helpline operator raises it on
  the District Admin's word (the ruled words kept)
  — cost: a hand-off that adds nothing; **B** the helpline operator OR the District Admin raises it; a DIFFERENT person finds — cost: it
  widens the ruled words (the summary line is not a ruling); **C** only the District Admin raises it, and a person one level up finds —
  cost: a new actor chain. And the outcome: *"the person who filed took part / did not"* — is that a separate investigation, ⛔ a third
  outcome under `-238` cl. 4 (which is about the member)? *Suggest: B, and yes.*
- **PQ5 — If counsel confirms there is no lawful way for the Trust to hold an Aadhaar-based identifier, is Aadhaar dropped from the
  filing form altogether?** (`-238` cl. 6 rules *"PAN and Aadhaar of nominee and claimant are to be collected on the filing form"*;
  dropping Aadhaar NARROWS that clause, so it is the Panel's.) ⭐ THE ONE FACT: our identity provider gives only the last four digits of
  an Aadhaar number, and a UIDAI token is issued only to authentication agencies (G2, W2 — research, for counsel to confirm at C2);
  without a token, an Aadhaar number can serve as an identifier only by keeping the number itself, which UIDAI's rules tightly limit
  (W3). Options: **A** drop Aadhaar; PAN is the only exact identifier (the outcome `-240`'s analysis already anticipated) — cost: a
  fraudster with no PAN is caught only by the human name check; **B** collect the last four digits only, as a supporting detail, never
  to bar anyone — cost: more data kept about non-members for a weak signal; **C** keep the ruled words and wait for a lawful route —
  cost: the identifier set cannot be built until one exists. *Suggest: A, conditional on counsel's C2 / C3.* ⛔ Decided before counsel
  answers — the note says the question is conditional.
- **TL1 (told)** — *the Aadhaar half is probably impossible*: our identity provider gives only the last four digits, and a UIDAI token is
  issued only to authentication agencies (G2, W2); a question is written for counsel (C2). What follows if counsel confirms it is PQ5 —
  this line chooses nothing.
- **TL2 (told)** — *a question is written for counsel on whether a lifelong, unappealable ban on a non-member needs notice and a chance
  to reply first* (C6, W6). Nothing is chosen now; if counsel says yes, it comes back to the Panel as a question on the ruled words.
- **TL3 (told)** — *nothing is collected, checked, barred or deleted until counsel answers*; the one thing built is a database lock that
  stops a death certificate ever being deleted on its own — the Panel's `-243` made concrete.

## Acceptance Criteria

1. **AC1 — The counsel question (DL1).** The file exists at DL1's path in the house format; C1–C8 (as answered at Task 0.2) each a
   question a lawyer can answer without the repo — ⛔ clause ids, file paths or code identifiers in *The questions*; DL2's design stated in
   *The situation*; W-facts presented as "our understanding, to confirm", ⛔ as law; header *"Status: WRITTEN, ⛔ not yet sent. Nothing here
   is recorded as asked until BigDev sends it."* Nowhere in the repo does it read as sent (N2).
2. **AC2 — The Panel note (DL3).** Built from the template: §0 passed per question (PQ1–PQ5 — each names the ruled clause it leaves open
   or narrows); question first, THE ONE FACT with its certainty stated (W4 / W8 are research, ⛔ official figures), every option costed
   (the suggested one too), *What is at stake* (live: nothing; blocked: row `6-22e`), *How much to trust this note* (incl. G9's
   summary-line correction and G11's three final-denial cases), evidence LAST with template §E1 verbatim by decision id + clause;
   template §E4 commands RUN and recorded. No TL line says counsel "is asked" or credits a Consequence / summary line to the Panel.
   Status WRITTEN, ⛔ sent. The 6.22 note's Q2 referenced, ⛔ duplicated.
3. **AC3 — The decision (DL4)** committed ALONE, before any code, with a free number re-grepped on every ref and worktree at its commit;
   supersedes nothing; its Policy-meaning line says no predicate changes.
4. **AC4 — The guard (DL5 A; adapt to the option answered).** Live-DB, each on a seeded claim with a `death_certificate` document and an
   upload + review: (a) `DELETE FROM claim_documents` of that row as SUPERUSER, inside a SAVEPOINT ⇒ refused with SQLSTATE 23000 AND the
   guard's own message (23000 alone also matches the 0122 / 0197 / 0212 guards) — copy the SHAPE of `pgCode` (the D8 spec, file-local)
   and `expectPgError` (`peer-mesh-wa-reminder-record.spec.ts`, file-local) into the new spec; ⛔ export either
   ([[feedback_no_premature_package]]). ⛔ Assert "the rows are still present" after `ROLLBACK TO SAVEPOINT` as proof — it cannot
   fail ([[feedback_assertion_after_savepoint_rollback_is_vacuous]]); (c) and (d) are the controls that must succeed; (b) the same as
   `twt_app` ⇒ refused (42501 — no grant; the guard is the second wall); (c) deleting the
   CLAIM (superuser) ⇒ claim, document, upload and review all gone (the cascade passes) — and the membership check too whenever the
   fixture seeds one (`seedNomineeNameCheck` does by default since 6.39; `seedMembershipCheck` directly — G12's 2026-11-21 line); (d) a `hospital_record` document row is still
   deletable by the superuser (the guard is death-certificate-only); (e) UPDATE of the OCR columns still works, both a plain UPDATE and
   the OCR job's `insert … onConflictDoUpdate` shape (the trigger is DELETE-only — TR3). Mutation check: drop the depth exception ⇒ (c)
   fails; drop the type test ⇒ (d) fails.
5. **AC5 — Nothing regressed.** The D8 test still proves *ON DELETE SET NULL* reaches the determination, its DELETE fired from a
   pg_temp trigger inside its own transaction (TR1 — ⛔ any `ALTER TABLE` on a shared table, ⛔ the guard weakened); every suite green;
   `ci:local` 40 / 40 (the job count at `90535934` — re-read it live) on a FRESH container.
6. **AC6 — Records (DL0, DL6).** Under DL0 A: row `6-22e-…` minted `backlog` in `sprint-status.yaml` with this row's DL0 scope VERBATIM
   (from `-438` item 1), the gates (counsel C1–C7; PQ1–PQ5; the 6.22 note's Q2) and E1–E10 as its trace list; every DL6 line written with
   the exact words; an `epics.md` entry for Story 6.22b after 6.22 (the minted-header shape: `### Story 6.22b: …` heading, a *"⚠ Minted
   by …"* blockquote, As a / I want / so that, *"Acceptance Criteria (in brief…)"*). `sprint-status.yaml` parses (`yaml.safe_load` under
   plain `python3` — ⛔ `python3 -I`, which hides PyYAML) with the row count +1.
7. **AC7 — N1 holds (the negative is checkable).** At the story's last commit, after `git fetch origin`: `git diff --name-only
   origin/main...HEAD -- packages apps scripts` (THREE dots — the branch's own changes since the merge base; ⛔ `b7b43c47`, which after
   the rebase lists every file `main` changed) lists ONLY the DL5 migration, `migrations/meta/_journal.json`, `schema/claim_documents.ts`, `schema/claim_death_certificate_uploads.ts`
   (comment-only), `member/anonymize.ts` and `schema/claim_fraud_investigation_steps.ts` (comment-only, DL6 — DL0 A only), the D8 spec
   and the new guard spec; and `git grep -niP "\bpan_|_pan\b|aadhaar_(number|token|hash)|uid_token|father_?name" -- packages apps`
   (⚠ `-P`: this machine's `git grep -E` ignores `\b` and matches nothing — TR10) returns the FOUR baseline hits — the
   custom-field forbidden-label vocabulary: one comment in `custom-fields/frozen-governance.ts` (`pan_number`), two fixtures in
   `tests/custom-fields/frozen-governance.test.ts` (`aadhaar_number`, `member_pan`), one in
   `tests/integration/custom-fields/frozen-governance.spec.ts` (`aadhaar_number`) — still exactly four at `origin/main` `90535934`
   (2026-11-21). The criterion is that THIS branch adds none: `git diff origin/main...HEAD -- packages apps | perl -ne 'print if
   /^\+(?!\+\+)/ && /\bpan_|_pan\b|aadhaar_(number|token|hash)|uid_token|father_?name/i'` prints NOTHING (perl, ⛔ `grep -P` — macOS
   `/usr/bin/grep` has no `-P`; prove it can hit first by piping it `+x pan_y` — TR10). Any further hit of the whole-tree grep must be in a file `main` changed, ⛔ this
   branch (row `13-1h`, backlog, will add a field worker's PAN — if it lands first, its hits are main's, listed as such). Record both
   outputs.
8. **AC8 — The story's own Policy-meaning note stands** (no predicate here) and the DRAFTED predicate sentence is carried, verbatim, into
   row `6-22e`'s comment block so its build re-checks it.

## Tasks / Subtasks

- [ ] **Task 0 — Governance FIRST, no code** ([[feedback_governance_commits_precede_implementation]])
  - [x] 0.1 `git fetch origin`; confirm `b7b43c47` is an ancestor of HEAD (rebase onto a moved `origin/main` — ledger-only conflicts,
        branch on top, [[project_rebase_ledger_conflict_separator]]); `git diff --name-only b7b43c47 origin/main -- apps packages scripts`
        — re-derive G3, G8, G10–G13 if anything under `claim/`, `schema/claim_documents*`, `kyc/`, `anonymize.ts` or `migrations/` moved;
        `git log b7b43c47..origin/main -- .decision-log.md _bmad-output docs` — read any new entry (⚠ a counsel return or a Panel ruling
        on the 6.22 note changes PQ2's framing). Re-read TR4's numbers on EVERY branch and worktree. CHECK LIVE W5's commencement date (a
        notified change moves C1's "before commencement" half). `ListAgents` + `git branch --show-current` before every commit
        ([[feedback_concurrent_review_agents_mutate_tree]]).
        ⭐ 2026-11-02 — DONE: `origin/main` = `b7b43c47` (unmoved; ancestor of HEAD; ⛔ code or governance diff); decision `-440` free on
        every ref and all six worktrees; migration top `0198`; ledger letters to `02d` (this branch); W5's commencement re-checked
        (13 May 2027; ⛔ notified amendment at the 2026-09-28 tracker — re-check before SENDING the counsel question).
  - [x] 0.2 Put DL0–DL7 to BigDev, specifically: DL0's option; DL1's C1–C8 wording (C8 in or out); DL2's design (PAN only — the PQ5
        narrowing; father's name); DL5's option. Record the answers here verbatim.
        ⭐ 2026-11-02 — BigDev: *"DL0–DL7 accepted as written"* ⇒ DL0 **A** (the build moves to `6-22e`); DL1 C1–C8 as worded, **C8 in**;
        DL2 (i)–(vi) as written (PAN only, put to the Panel as PQ5; father's name collected for the human review); DL3 as written; DL4 as
        written; DL5 **A** (the BEFORE DELETE guard); DL6's labels and words as written; DL7's fence as written.
  - [x] 0.3 ⭐ **THE ROW'S FIRST TASK — WRITE the counsel question** (DL1) as answered. Re-run every W-fact's source once (a dead link or a
        changed rule is corrected in the file, with a dated line saying what moved — [[feedback_record_unattested_no_backfill]]); list
        the URLs. WRITTEN, ⛔ sent.
        ⭐ 2026-11-02 — WRITTEN: `_bmad-output/planning-artifacts/counsel-question-2026-11-02-fraud-register-identifier-set.md` —
        questions 1–8 (= C1–C8, C8 in), the DL2 design in *The situation*, the W-facts as "our own understanding", the sources with
        URLs (re-read 2026-11-02; the ITD statistics PDF, the RBI's own copy and post-September Gazette notices ⛔ reached — named in
        the file). ⛔ Sent.
  - [x] 0.4 WRITE the Panel note (DL3) from the template by path; run the template's §E4 commands; WRITTEN, ⛔ sent. Re-read
        [[feedback_told_line_must_not_carry_panel_choice]]: TL1–TL3 choose nothing, and none says counsel "is asked". Commit the counsel
        question and the note TOGETHER as `records(6.22b): counsel question + Panel note — WRITTEN, ⛔ sent` BEFORE Task 0.5 (the
        decision cites their paths).
        ⭐ 2026-11-02 — WRITTEN: `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-11-02-6-22b-identifier-set.md` — the
        note's Q1–Q5 = PQ1–PQ5, *Told* 1–3 = TL1–TL3, the 6.22 note's Q2 referenced with a send-together line, the send order (counsel
        question first or with it). Template §E4 RUN — two drafted results were WRONG before running (command 3 returns FOUR lines, ⛔
        two — which also corrected AC7's baseline) and are corrected from the real output. ⛔ Sent.
  - [x] 0.5 Decision entry (DL4) — the next free number READ LIVE; committed ALONE as `governance(6.22b): …`.
        ⭐ 2026-11-02 — DONE: Decision `2026-11-02-440` (author-commit) committed ALONE as `8c088b76` (`-440` re-grepped free on every
        ref and worktree; `origin/main` `b7b43c47`).
  - [x] 0.6 Records (DL0, DL6): the new row (DL0 A) with its comment block; every DL6 line except the code comments (Task 1.2);
        `epics.md` 6.22b; ⛔ a ledger entry here — the create wrote `2026-11-02c`, and the next one is written at the story's close
        (Task 2.3, [[project_sprint_status_ledger]]). Commit as `records(6.22b): …`.
        ⭐ 2026-11-02 — DONE: row `6-22e-fraud-register-identifier-collection-filer-bans-and-deletion` minted `backlog` (scope verbatim
        from `-438` item 1, the gates, the drafted predicate verbatim, E1–E10 verbatim; rows 306 → 307, plain `yaml.safe_load`); the
        `6-22b` block's dated pointer; `deferred-work.md` — the counsel-question item and the nominee-ban (Q2) item, each a dated
        line in DL6's words; roster Row 47 — (f)'s WRITTEN half in `closure_evidence_link`, one dated notes line covering leg (h) and
        the notes' *"carry their own go-live conditions"*; `epics.md` — the 6.22 blockquote's pointer and a Story 6.22b entry.
        ⚠ DL6's 6.21 CASCADE line (*"Closed by 6.22b DL5 …"*) is ⛔ written here — it names an edit that does not exist yet; Task 1.5
        writes it once the guard is built ([[feedback_closure_language_precision]]).
- [ ] **Task 1 — The certificate guard (DL5; AC4, AC5)** — skip with a banner if DL5 C ([[project_story_automator_ops]]: an unchecked
      box means "correctly not done").
  - [ ] 1.0 ⭐ **Re-sync before any code** — Task 0 ran on 2026-11-02 and `main` has moved since (270 commits at `90535934`).
        `ListAgents` + `git branch --show-current`; `git fetch origin`; `git rebase origin/main`. A trial merge at `90535934` conflicts
        in FOUR records files — resolve each by keeping BOTH sides:
        `.decision-log.md` — `-440` goes in its NUMBERED place (newest-first: BELOW `-441`, ABOVE `-439`), ⛔ left on top, its text
        unchanged; `sprint-status.yaml` — the ledger lines interleave by date and the rows keep both sides, `---` separators and
        journal-style duplicates checked ([[project_rebase_ledger_conflict_separator]]), then `yaml.safe_load` under plain `python3`;
        `epics.md` and `docs/launch-gate-inventory/inventory-roster.md` — both sides' added lines kept. Then re-run Task 0.1's diff
        checks from `b7b43c47` to the new `origin/main` (G12's 2026-11-21 line is the result at `90535934`) and re-read the numbers
        (G16's 2026-11-21 line: migration `0213` next, `when` later than `1797998520000`).
  - [ ] 1.1 Migration `<next free — 0213 at 90535934>_claim-documents-death-certificate-delete-guard.sql`, HAND-WRITTEN (⛔ `db:generate` — drizzle
        snapshots stop at `0020`; a trigger is invisible to it): `CREATE FUNCTION claim_documents_reject_death_certificate_delete()` +
        `CREATE TRIGGER … BEFORE DELETE ON claim_documents FOR EACH ROW`. Header comment cites `-243` cl. 2 and G12. Journal entry with
        a `when` LATER than every sibling's (TR4).
  - [ ] 1.2 `schema/claim_documents.ts` header + `schema/claim_death_certificate_uploads.ts` header: one line each naming the guard
        (the 0122 *"The ONLY rows that ever go are the `ON DELETE cascade` from `claims` OR `claim_documents`"* sentence is now half
        false — say so in the uploads header; ⛔ edit the applied migration file). Under DL0 A also re-point the two code comments
        DL6 names (`member/anonymize.ts`, `schema/claim_fraud_investigation_steps.ts`) from `6-22b` to `6-22e` — comment-only.
  - [ ] 1.3 New live-DB spec `packages/domain/tests/integration/claim/claim-documents-death-certificate-guard.spec.ts` — AC4 (a)–(e),
        seeded with the shared helpers `seedMember` / `seedClaim` / `seedDeathCertificate` (`packages/domain/tests/integration/_helpers.ts`
        — the composition `claim-death-certificate-policy-regression.spec.ts`'s file-local `seedClaimWithCertificate` uses; ⛔ export or
        copy that local). ⚠ `seedDeathCertificate` seeds the document + ONE upload but ⛔ review — add the review as the D8 spec's raw
        `review()` builder does (or use the exported `seedAcceptedDeathCertificate`, which runs the real review writer and needs the
        review window). A `hospital_record` row for (d) inserted directly (a valid `claim_document_type`; `UNIQUE(claim_case_id,
        document_type)`; NOT NULL with no default: `claim_document_id, claim_case_id, pariwar_id, document_type, storage_object_key,
        content_type, byte_size, parity_outcome, parity_flags, ocr_confidence, verifier_review_required`). The mutation checks run by
        hand and recorded in the Debug Log.
  - [ ] 1.4 TR1: keep the D8 test's assertion (the determination's review link becomes NULL); fire its DELETE from a pg_temp trigger
        (TR1's recipe) — ⛔ delete the claim instead (the determination cascades away with it), ⛔ `ALTER TABLE … DISABLE TRIGGER`.
  - [ ] 1.5 Once 1.1–1.4 are green: append DL6's line under `deferred-work.md`'s 6.21 item *"A future `-240` cl.1 closure-time
        deletion of `claim_documents` rows would CASCADE"* — *"Closed by 6.22b DL5 — a guard refuses deleting a death certificate's
        row except with its claim."* (dated, naming the migration).
- [ ] **Task 2 — Verification and close (AC5–AC8)**
  - [ ] 2.1 `pnpm typecheck` (turbo), the domain integration suite, then `ci:local` on a FRESH container with `DATABASE_URL` set to it
        ([[project_prepush_hook_inherits_5432]], [[project_known_livedb_test_failures]] #18).
  - [ ] 2.2 AC7's two commands, output recorded.
  - [ ] 2.3 The ledger entry, keyed by the date it is WRITTEN (`<that day><next letter>` READ LIVE on every ref and worktree — ⛔
        `2026-11-02…`) — the safe prepend ([[project_sprint_status_safe_prepend]]); row
        `6-22b` → `review`; File List; Change Log.

## Dev Notes

### Traps

- **TR1 — The D8 test is the trap's only user.** `claim-death-certificate-policy-regression.spec.ts`'s *"⭐ D8 — the determination's review
  FK is ON DELETE SET NULL (a cascade from the certificate row)"* deletes a `claim_documents` row as superuser. Under DL5 A it fails.
  ⚠ Deleting the CLAIM instead does NOT work: `nominee_determinations_claim_case_id_claims_claim_case_id_fk` is `ON DELETE cascade`
  (`0119`), so the determination disappears with the claim and SET NULL is never observed. ⛔ `ALTER TABLE claim_documents DISABLE
  TRIGGER` either: it holds ACCESS EXCLUSIVE until the harness rolls back, domain spec files run in parallel against ONE database
  (`pool: 'forks'`, default file parallelism; ~25 files touch `claim_documents`), and the test already holds RowExclusive from its seed,
  so the lock upgrade can deadlock — 6.22 PD11 rejected DDL on a shared table ([[project_test_only_ddl_use_pg_temp_clone]]); a
  `LIKE` clone does ⛔ work here (it drops the FKs D8 tests). ⭐ Fix (proven on a scratch cluster), as superuser inside the test's own
  transaction: `CREATE TEMP TABLE d8_fire(id uuid)`; `CREATE FUNCTION pg_temp.d8_fire_fn() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN DELETE FROM public.claim_documents WHERE claim_document_id = NEW.id; RETURN NULL; END $$`; `CREATE TRIGGER d8_fire_t AFTER
  INSERT ON pg_temp.d8_fire FOR EACH ROW EXECUTE FUNCTION pg_temp.d8_fire_fn()`; `INSERT INTO pg_temp.d8_fire VALUES ($1)`. The
  guard runs at depth 2 and passes; the cascade reaches the review and SET NULL is observed; every temp object goes with the
  rollback. Comment it: it exercises the FK through the guard's cascade exception, ⛔ the guard — AC4 proves the refusal. If the
  guard's exception is ever tightened past depth > 1, fall back to a catalog assertion (`pg_constraint.confdeltype = 'n'`). ⛔ Weaken
  the guard to keep the old test.
- **TR2 — Replica mode is not a test of the guard.** `nominee-history-concurrency.spec.ts` cleans up under `session_replication_role =
  'replica'`, which disables user triggers — it stays green and proves nothing about DL5. AC4's spec runs with triggers ON.
- **TR3 — The OCR job UPDATEs `claim_documents`** — through `insert(claimDocuments).onConflictDoUpdate(...)`, whose conflict path fires
  UPDATE triggers (`apps/jobs/src/claim-ocr-parity.ts`); `seedDeathCertificate` also plain-UPDATEs on a replaced certificate. A guard on
  UPDATE would break both. DELETE only.
- **TR4 — Numbers collide with siblings (the 2026-11-02 snapshot — READ LIVE at each commit).** `main` at `b7b43c47`: decision `-439`,
  migration `0198` (journal idx 198, `when` `1796701200043`), catalog v58 / 77 keys, roster Row 47 (46 reserved by 6.39), ledger
  `2026-11-02b`. Unlanded siblings: `story/6-39-…` plans `0196_claim-membership-checks` (now taken on `main` — it renumbers on rebase),
  the next catalog version and roster Row 46; `story/13-2-…`, `story/14-3-…` at `0193`. Whichever lands second renumbers; the journal's
  `when` order matters ([[project_sibling_migration_when_order_shared_db]]); never regenerate an applied migration (42P07 —
  [[project_live_db_test_gotchas]]).
  ⭐ 2026-11-21 — the snapshot above is stale: 6.39, 13.2, 14.3 and 12.2 have all landed; `main` `90535934` is at decision `-476`,
  migration `0212`, ledger `2026-11-21o`, 40 CI jobs (G16's 2026-11-21 line). Task 1.0 re-reads them.
- **TR5 — "Counsel is not engaged" is false.** Write "counsel has not been asked about the identifier set" ([[project_dpdpa_counsel_engaged_but_unrecorded]]).
- **TR6 — The legal corpus is private.** Cite Niyamavali / privacy-policy sections by NUMBER only; ⛔ paste their text into tracked files
  ([[project_legal_corpus_private_repo_split]]). The public repo is PUBLIC — the counsel question names no member, family or staff person.
- **TR7 — A summary line is not a ruling.** G9: quote the option AS PUT and the decision's clause; the `⇒` chain is the note author's
  ([[feedback_supersede_never_reinterpret]], [[feedback_panel_gate_read_ratified_verbatim]]).
- **TR8 — `**cl. 3**`-style emphasis inside a JSDoc block closes it** (`**/`) — the migration and schema comments use `--` / `//`
  ([[project_markdown_emphasis_closes_jsdoc]]). Scan new files for raw invisible characters after any Write with escapes
  ([[project_unicode_escapes_written_raw]]).
- **TR9 — Hand-format; Prettier is not enforced** ([[project_prettier_not_enforced]]).
- **TR10 — `git grep -E` ignores `\b` on this machine.** `git grep -lE '\bmaskAadhaar\b' -- apps` returns NOTHING while `git grep -lE
  'maskAadhaar'` returns two files — a word-boundary negative check run with `-E` passes vacuously. Use `-P` (AC7), and prove the
  pattern can hit by first running it at a commit or on a string that contains a match ([[feedback_gate_scope_semantic_coverage]]).

### The gated build — E1–E10 (carried VERBATIM into row `6-22e`'s block at Task 0.6; ⛔ built here)

- **E1 — Where the bar sits.** Intake carries no claimant identity and the filer is not authenticated as themselves (G3, G4); the door
  (`claim/intake-door.ts` `resolveClaimIntakeDoor`) keys on the DECEASED and runs once per death. A filer bar fits the CONTACT step
  (`writeClaimContact`, after the mint) or a new pre-intake step — and "refuse" vs "hold for review" is PQ2 / `-240` cl. 3's.
- **E2 — Every mint path.** `tryConverge` (first report, same-channel 3b, cross-channel 3c) and `overrideIntakeAttempt` both mint; a bar
  must cover all, and a merged attempt (`convergeIntakeAttempt`) brings a second filer onto one claim.
- **E3 — The index.** A Trust-wide keyed HMAC blind index (a NEW field class in a GLOBAL namespace — global like the login mobile index's
  `MEMBER_IDENTITY_NAMESPACE` (`encryption/field-classes.ts`), but ⛔ reusing it; ⛔ per-Pariwar like the claim-side
  `CLAIM_CONTACT_MOBILE_FIELD_CLASS` (run under the claim's `pariwarId` in `correction-crypto.ts`), whose comment explains why a
  claim-side index must never reuse the login hash — it would make rows joinable to a member's identity); batch-audit rules
  ([[project_kms_audit_per_hmac_global_lock]]); erasure keeps it only where `-240` cl. 1 keeps the record.
  ⭐ 2026-11-21 (a dated line, ⛔ part of the verbatim list): row `13-1h-field-worker-pan-and-aadhaar-last-four-match` (backlog,
  decision `2026-11-16-464`) will also collect a PAN, with a blind index, plus an Aadhaar last-4, from field workers; and
  `counsel-question-2026-11-03-field-worker-data-basis.md` (WRITTEN, ⛔ sent) touches PAN for the TDS on commission. Whichever builds
  first fixes the house shape of a PAN field class — design the two together (whether one PAN index or two, and which namespace), and
  ask whether one counsel answer on PAN can serve both ([[feedback_no_premature_package]] holds for any shared code).
- **E4 — The PAN port.** The port in `packages/contracts` (the usual home — G7) or `packages/platform-adapters/src/pan-verification/`
  (the `bank-ifsc-lookup` shape), an in-memory stub + vendor adapter, selection in
  `deps.ts`, a boundary gate like `scripts/kyc-provider-boundary/`; the vendor named in a recorded decision and the processor inventory
  (G15); fail mode per PQ2; decide whether production may ever run on the fixture (G7 — today an absent secret selects it).
- **E5 — Fuzzy-name copy** (`-240` author-commit (b)): a "did not match" result is member-facing at the worst moment — UX-DR55's three
  parts (what, what next, helpline), `pnpm microcopy:check` + `pnpm i18n:check`, en + hi in `packages/i18n/locales/*/claim.json`.
- **E6 — The post-death investigation** (PQ4): a NEW subject (the filer), ⛔ a reuse of `claim_fraud_investigation_steps`'
  `found_guilty` (G8 — it would freeze the dead member); its outcomes, originator and finder per PQ4; the `-239` denial and the forged-
  certificate warnings (G10) are where the discovery happens.
- **E7 — The deletion** (PQ3, C7): a SCRUB, ⛔ a row DELETE (every guard admits only cascades — G13): Tier-1 → sentinel / NULL, the blind
  index → NULL, column `GRANT UPDATE` + a per-command UPDATE policy + the guard function REPLACED whole ([[project_append_only_guard_names_erasure_columns]]);
  blobs deleted after COMMIT, best-effort (the `anonymize.ts` memorial-photo precedent); a new audit type, and an audit path for a JOB
  (none exists); a trigger event for "the claim closed with no finding" (none exists — G11); `claim_contacts`, `claim_contact_nominees`,
  `claim_nominee_bank_accounts` are in scope ONLY if the Panel / counsel read "identity documents" that wide — ⛔ assume it. Certificates
  never (`-243`; DL5's guard).
- **E8 — Erasure** for every new Tier-1 column (`member/anonymize.ts`; *"a Tier-1 column that is NOT in this file SURVIVES an erasure"*;
  `rtbf-anonymize.test.ts` counts tables) and a retention-matrix row (out of repo — a roster leg).
- **E9 — One ban table, shared with `6-22d`.** `-238` NOT covered (ii): the ban keys on an IDENTIFIER, ⛔ `member_id`; `6-22d` builds the
  MEMBER ban. Design them together or the Trust holds two registers.
- **E10 — The nominee** (the 6.22 note's Q2): a nominee is *"caught at the moment they come forward to claim"* (`-240` cl. 2) — but a
  nominee never authenticates (G5); "coming forward" today is the payee's bank details typed by the filer.

### What this story does not do

It does not collect, verify, store or match PAN, Aadhaar, date of birth or father's name; bar or ban anyone; investigate a post-death
fraud; delete or scrub anything; change `claim_fraud_investigation_steps`, the leaf, the intake door or any filing screen; add a permission
key, an audit type, a port or a flag; or send anything to counsel or the Panel.

### Project Structure Notes

- Governance: `_bmad-output/planning-artifacts/counsel-question-<date>-fraud-register-identifier-set.md` (NEW),
  `_bmad-output/planning-artifacts/trustee-panel-routing-note-<date>-6-22b-identifier-set.md` (NEW), `.decision-log.md` (prepend `-440`
  or the next free), `_bmad-output/implementation-artifacts/sprint-status.yaml` (new row + ledger), `deferred-work.md` (dated lines),
  `docs/launch-gate-inventory/inventory-roster.md` (Row 47 dated lines), `_bmad-output/planning-artifacts/epics.md` (6.22b entry).
- Code (DL5 only): `packages/domain/migrations/<next>_claim-documents-death-certificate-delete-guard.sql` + `migrations/meta/_journal.json`;
  `packages/domain/src/schema/claim_documents.ts`, `schema/claim_death_certificate_uploads.ts` (comments only);
  `packages/domain/src/member/anonymize.ts`, `schema/claim_fraud_investigation_steps.ts` (the `6-22b` → `6-22e` comment re-point, DL0 A
  only);
  `packages/domain/tests/integration/claim/claim-documents-death-certificate-guard.spec.ts` (NEW);
  `packages/domain/tests/integration/rls/claim-death-certificate-policy-regression.spec.ts` (D8).

### References

- `.decision-log.md` — `2026-09-21-238` (cl. 2, 4, 5, 6; the counsel gate; NOT covered (i)–(iii)), `2026-09-21-240` (cl. 1–3, 6; the
  PAN author-commit; Consequence 3; the unratified deletion reading), `2026-09-25-243` (cl. 1–2; Consequence 2), `2026-10-07-291` Q1 A,
  `2026-11-01-438` (item 1; Consequence 1), `2026-11-02-439`, `2026-09-08-210`.
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-09-21-fraud-register-what-we-keep.md` (*How much to trust this note*
  — the provider check),
  `…-2026-09-21-fraud-register-how-far-the-ban-reaches.md` (the `⇒` chain line), `…-2026-11-01-6-22-fraud-register-first-half.md` (Q2),
  `counsel-question-2026-10-18-nominee-contact-basis.md` (the format), `trustee-panel-routing-note-TEMPLATE.md`.
- `_bmad-output/implementation-artifacts/6-22-fraud-register-blacklist-instrument-and-identifier-set.md` (DL0, DL15, DL16, G14, G15, TL1).
- `docs/launch-gate-inventory/inventory-roster.md` Row 47 (legs (f), (h)); `docs/legal-counsel-engagement/` (roster, charter, ledger).
- W-sources: Protean OPV overview / FAQ; incometax.gov.in "how to verify PAN"; UIDAI UID-token circular (2018), ADV FAQ v10
  (2025-11-03), Circular 14 of 2025, Aadhaar (Sharing of Information) Regulations 2016; DPDP Act s.17, G.S.R. 843(E); RBI fraud-risk
  master directions (2024); IRDAI fraud-monitoring guidelines (2025) — URLs to be re-checked and listed in the counsel question (Task 0.3).

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- 2026-11-02 — Created by `bmad-create-story 6.22b`: ultimate context engine analysis completed — comprehensive developer guide created.

### File List

## Change Log

| Date | Version | Description |
|---|---|---|
| 2026-11-02 | 1.0 | Created by `bmad-create-story 6.22b` in its own worktree, pinned at `origin/main` `b7b43c47`: counsel's question first (C1–C8), the Panel's four questions (PQ1–PQ4 + TL1–TL3), the decision (DL0–DL7 PROPOSED), the certificate guard (DL5); the gated build moved to a proposed row `6-22e` with E1–E10. Row `backlog → ready-for-dev`. ⛔ Decision, ⛔ code. Nothing sent. |
| 2026-11-02 | 1.1 | Validated by `bmad-create-story validate 6.22b` (fresh context; four read-only verifiers — governance + records; the DL5 guard substrate, with the trigger logic run on a scratch Postgres; filing + identity; the W-facts against their sources — each critical re-checked by hand at `0bc1d6ba`, `origin/main` still `b7b43c47`). BigDev: "all". AC7's grep moved to `-P` (`git grep -E` ignores `\b` here — TR10) and its allow-list completed; TR1's D8 fix is a pg_temp trigger, ⛔ DDL on a shared table (DL5's contradictory cost line fixed); AC4 asserts the guard's message, ⛔ a post-savepoint presence check; dropping Aadhaar is a narrowing of `-238` cl. 6 ⇒ new PQ5 (TL1 chooses nothing; TL1 / TL2 say a question is WRITTEN for counsel; send order in DL3); PQ1's ONE FACT re-based on adults (~3 in 4, an upper bound), PQ2's on a vendor claim (W8, new), PQ3's on G11's three final-denial cases; W1 corrected (the ITD page is not holder-only); E3 / DL2 (iv) namespaces corrected; template §E1 / §E4 disambiguated; DL6 gains Row 47 notes, the `epics.md` 6.22 blockquote, the stale *"No story file yet"* line and the two code comments (two, ⛔ three); G1 / G2 / G3 / G6 / G7 / G12 / G13 / G16 / TR3 / Niyamavali-row citations corrected; Tasks 0.4 / 0.6 commit order and ledger. Status unchanged. |
| 2026-11-21 | 1.2 | Validated again by `bmad-create-story validate 6.22b` before the build resumes, re-traced at `origin/main` `90535934` (the branch 270 commits behind; Task 0 records unchanged — nothing sent, `-440` still this branch's, AC7's baseline still four hits). BigDev: "all". New Task 1.0 (rebase; the four conflicting records files; `-440` placed between `-441` and `-439`; migration `0213`); AC7 diffs `origin/main...HEAD` (⛔ `b7b43c47`) and requires no ADDED hit (perl, ⛔ `grep -P`); Task 2.3's ledger key is the day it is written; G12 + AC4 (c) gain 0212's membership-check cascade; AC4's `pgCode` / `expectPgError` are file-local — copied, ⛔ exported; AC5 40 jobs; G16 / TR4 dated re-reads; E3 dated line on row `13-1h`'s PAN index (also in row `6-22e`'s block); a RESUME HERE block. Status unchanged. |
