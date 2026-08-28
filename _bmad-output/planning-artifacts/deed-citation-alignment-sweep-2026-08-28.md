# Deed-citation alignment sweep — 2026-08-28

**Author:** BigDev, Solo Builder · **Authorised by:** `.decision-log.md#decision-2026-08-28-165` Q7,
answered 2026-08-28.
**Status:** ⏳ **INVENTORY ONLY.** ⛔ **NOTHING REWRITTEN. NOTHING RATIFIED. NOTHING AMENDED.**

> ⛔⛔ **THE INSTRUCTION THIS SWEEP RUNS UNDER, VERBATIM (BigDev, 2026-08-28):**
> *"Do the 29-citation Deed sweep now as a separate alignment work item. **Identify and classify all
> references, but do not silently rewrite them.** Any required change to the Deed draft should be
> routed as a **drafting decision**. The sweep is **not itself a ratification or amendment**."*
>
> ⇒ every finding below is **observational**. ⛔ No file is edited by this sweep. ⛔ No citation is
> corrected in place. ⛔ No Deed text is changed.

---

## 1. What prompted it

`2026-08-28-164` cl.5 recorded that the Trust Deed — **agent-drafted, unratified**, and headed on its
own face *"⚠️ DRAFT — NOT YET EXECUTED. NOT LEGAL ADVICE"* (`docs/legal/trust-deed.md:7`) — is cited
across the project, in places **as the operative constraint on a ratified decision** rather than as a
design reference. ⚠ **And it had already changed an outcome**: the 2026-08-24 routing note reversed
its own advice with *"⛔ That route is NOT AVAILABLE, and the Trust Deed is why."*

## 2. ⚠ The estimate was wrong — the real number is an order of magnitude larger

| | Estimated at `-164` | **Found by this sweep** |
|---|---|---|
| Instances | 29 | ⛔ **348** |
| Files | *(decision log only)* | ⛔ **54** |
| Reaches shipped code? | not considered | ⚠ **YES — 6 sites** |

⭐ **The 29 was a count of `.decision-log.md` only** and was never a repo-wide figure. ⛔ Recorded so
the earlier number is not quoted as if it had been.
⚠ **Method:** `grep` for `Trust Deed` · `trust-deed` · `Deed Clause` · `Deed Cl.` across `*.md`,
`*.yaml`, `*.ts`, `*.tsx`, excluding `node_modules` and `docs/legal/` itself (the corpus is the
subject, not a citation of it).

**Concentration** — top files by instance count:

| Count | File |
|---|---|
| 39 | `.decision-log.md` |
| 32 | `_bmad-output/implementation-artifacts/sprint-status.yaml` |
| 20 | `…/7-11-fixed-amount-notice-period-and-fixed-period-reconciliation.md` |
| 15 | `…/trustee-panel-routing-note-2026-08-28-11b3-publication-basis-and-matrix.md` |
| 15 | `…/trustee-panel-routing-note-2026-08-15-story-10-22.md` |
| 14 | `…/trustee-panel-routing-note-2026-08-24-drive-record-publication-basis.md` |
| 14 | `…/10-13-fixed-amount-setter-admin-ui.md` |

## 3. Which clauses are actually relied on

⭐ **Every clause cited below EXISTS in `trust-deed.md` and matches its cited subject.** ⛔ No
mis-citation of the `Clause 27(b)` kind (a prior correction found that one) was detected at
clause-subject level.

| Clause | Deed subject (verified) | Cites | What it is relied on for |
|---|---|---|---|
| **26** | Consumer and Grievance Posture (`:297`) | **25** | natural justice; internal review not exclusive of external recourse |
| **15(c)** | Data Protection — DPDPA (`:185`) | **15** | ⛔ consent must be explicit/revocable/purpose-specific, never default opt-in |
| **10(b)** | Sahyog Pools and Contributions (`:143`) | **11** | the per-Pool amount is *"determined by the Board"* |
| **19(c)** | Meetings, Quorum, Resolutions (`:223`) | **10** | the casting-vote rule |
| **19 / 19(b)** | as above | **15** | Board quorum = half of trustees in office, or two, whichever higher |
| **18 / 18(a)** | Constitution of the Board (`:209`) | **13** | Board size — not fewer than three, not more than nine |
| **20(a)/(b)** | Powers of the Trustees (`:233`) | **5** | power to frame/amend the *Niyamavali*; non-delegability |
| **7** | Objects of the Trust (`:95`) | 1 | charitable-character basis |
| **28** | Interpretation (`:305`) | 1 | ⚠ Deed prevails over the ***Niyamavali*** — ⛔ it does **not** name the T&C |

## 4. Classification

**Scheme.** The question is ⛔ not *"is the Deed mentioned"* but *"is it relied on **as binding**, and
does the citation carry the unratified-draft qualifier?"*

| Class | Meaning | Disposition |
|---|---|---|
| **A** | Cited as **binding authority**, ⛔ **no** draft qualifier | ⚠ **the defect** — needs the qualifier, ⛔ not deletion |
| **B** | Cited as binding, **with** the qualifier | ✅ correct as-is |
| **C** | Design reference / descriptive (*"the Deed contemplates…"*) | ✅ legitimate |
| **D** | Pointer, path, or cross-reference only | ✅ inert |
| **E** | ⛔ **Stale** — falsified by a later ruling, independently of the Deed's status | ⛔ **owed an edit**, routed |

⭐ **Class A is not "wrong".** A draft encoding the Trust's intended operating model is a **legitimate
design reference**. What is not legitimate is citing it **as though it binds**, with no qualifier —
which is the same defect class as the *"counsel is not engaged"* sweep (`2026-08-24-158`): **a false
premise, repeated, that changed rulings.**

### 4.1 ⚠ Class E — stale, and these are the only ones needing an edit regardless of the Deed question

| Site | Text | Why stale |
|---|---|---|
| `packages/contracts/src/claims/dpdpa-consent.ts:110` | *"…publication consent compulsory, which Niyamavali §4.4, Part 10 and **Trust Deed cl.15(c)** each…"* | ⛔ `-160` cl.3 superseded the per-subject gate; `-162` **retired** boxes (b)/(c)/(d) |
| `apps/api/src/modules/claims/dpdpa-consent-copy.ts:39` | *"…Niyamavali §4.4 + Part 10 + **Trust Deed cl.15(c)** forbid default opt-in, so the box…"* | same — **and the box it explains no longer exists** |

⇒ ⭐ **Both fall inside Story 11b.9 Task 4's blast radius already** (it retires those boxes). ⛔ They
are ⛔ **not** edited here; they are **routed** there, with the Deed qualifier as a second reason.

### 4.2 Class A/B — the shipped-code citations, individually classified

| Site | Clause | Class | Note |
|---|---|---|---|
| `apps/mobile/app/(membership)/appeal.tsx:9 · :12 · :273` | 26 | **A** | comments; asserts external recourse is preserved. ⚠ user-facing *behaviour* rests on it |
| `apps/api/src/middleware/error-mapping/index.ts:466` | 26 | **A** | comment justifying a 403 shape |
| `apps/admin/src/modules/surveys/i18n-en.ts:13` | 19 | **A** | comment; cites `trust-deed.md:227` for quorum + *"members hold no governance vote"* |

⭐ **All six code sites are COMMENTS, ⛔ not user-facing strings.** ⚠ That is materially milder than a
copy string asserting Deed authority to a member — ⛔ but comments are what the next engineer reasons
from, and three of them justify **shipped behaviour**.

### 4.3 ⛔ What this sweep has NOT classified

⚠ **Instance-by-instance classification of all 348 is ⛔ NOT DONE**, and is ⛔ not claimed. What is
done: the **file-level inventory** (§2), the **clause-level reliance map** (§3), and **individual
classification of the six code sites and the Class-E staleness** (§4.1–4.2).
⇒ ⛔ **The ~342 prose citations in governance documents are UNCLASSIFIED.** They are the bulk, and
they are also the lowest-risk — ⛔ but *lowest-risk* is not *classified*, and this section exists so
the gap is not read as a clean bill ([[feedback_record_unattested_no_backfill]]).

## 5. Routed as drafting decisions — ⛔ none made here

Per the instruction, any change to the Deed draft is a **drafting decision**, ⛔ not a sweep action:

- **D-a — Clause 15(c).** Redraft to match the 28 August consent model before `docs/legal/` goes to
  counsel (`-164` cl.1). ⭐ Hygiene, ⛔ not compliance.
- **D-b — Clause 26.** The **most-cited clause in the project (25×)** and the basis for shipped appeal
  behaviour. ⇒ it should be **settled by counsel early**, ⛔ not left to the end of the redraft.
- **D-c — Clauses 18(a) / 19(b) / 19(c).** Board size, quorum and casting vote — cited as operative in
  ratified governance decisions. ⇒ these are the clauses where an **unratified draft is doing
  constitutional work**, and they should be **counsel-settled and Panel-ratified before any further
  decision relies on them**.
- **D-d — Clause 28.** ⚠ Names only *"this Deed and the ***Niyamavali***"*. ⛔ It does **not** address
  the **T&C**, which is now the basis of the whole 28 August consent model. ⇒ if a precedence order
  between Deed and T&C is intended, it must be **drafted**, ⛔ not inferred.

## 6. Owed follow-up work

- ⛔ **Classify the ~342 unclassified prose citations** (§4.3) — or rule that file-level + clause-level
  classification suffices, which is a legitimate answer but should be a **stated** one.
- ⛔ **Apply the qualifier to Class-A citations.** ⚠ ⛔ **Not a rewrite of the claims** — the addition
  of *"(unratified draft)"* or equivalent. Needs its own vehicle and its own ruling on wording.
- ✅ **Class E** → routed into Story 11b.9 Task 4.
- ⛔ **Precondition, unchanged and now blocking a fourth thing:** `docs/legal/` is **still untracked**
  (`git ls-files docs/legal` → empty). ⇒ every drafting decision in §5 would land in a corpus with
  ⛔ no diff, ⛔ no history and ⛔ no attribution.

## 7. What this sweep does ⛔ NOT do

⛔ Does **not** rewrite, correct or annotate any citation · ⛔ does **not** edit the Deed or anything in
`docs/legal/` · ⛔ does **not** ratify or amend anything · ⛔ does **not** assert that any decision
citing the Deed is **wrong** — only that some cite an unratified draft **without saying so** · ⛔ does
**not** block any story.

---

## Sources — read 2026-08-28

- `docs/legal/trust-deed.md` **:7** (the draft header) · **:95 · :143 · :185 · :209 · :223 · :233 · :297 · :305** (clause structure verified in §3)
- `.decision-log.md#decision-2026-08-28-165` (Q7, the authorisation) · `#decision-2026-08-28-164` **cl.5** (the finding) · `#decision-2026-08-24-158` (the comparable sweep and its defect class)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-08-24-drive-record-publication-basis.md` (the reversal)
- Code sites as listed at §4.1–4.2, each read at the cited line
