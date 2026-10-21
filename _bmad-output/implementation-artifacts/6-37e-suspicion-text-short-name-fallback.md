---
baseline_commit: bac71abb
---

<!--
PINNED: `bac71abb` (2026-10-21 — `main` after `git fetch origin`; `origin/main` = `bac71abb`, 0 ahead / 0 behind; carries ALL of
6.37 / 6.37b / 6.37c / 6.37d / 6.31 / 6.27c and 5.12 / 5.10). Built in its OWN worktree `/Users/dev/Developer/projects/TWT-6-37e`,
branch `story/6-37e-suspicion-text-short-name-fallback` ([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]] —
a peer session holds the main checkout on `story/5-13-whatsapp-code-for-another-phone`). Two facts, stated separately: (1) the pin is
an ancestor of this branch (durable); (2) every `apps/` / `packages/` cite below was re-derived at `bac71abb` (perishable — re-check at
Task 0.1: `git diff --name-only bac71abb..origin/main -- apps/jobs packages/domain/src/notifications packages/domain/src/kyc`).
Re-locate by FUNCTION, ⛔ by line number ([[feedback_story_validate_footguns]] #19, #21, #24).
⚠ Branches that show as "ahead of main" on these files (`story/6-24b-…`, `story/6-29-…`, `story/6-34-…` and their `origin/` twins) are
LANDED stories' pre-rebase heads — ⛔ live work. Re-check at 0.1 anyway.

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`): the
BEHAVIOUR is the Panel's and is ALREADY RULED — `2026-10-18-359` (B, the three suspicion texts) and `2026-10-18-362` (B, the neighbours'
text). Both notes said, as the Panel read them, that *"how a fallback would be built"* / *"how a fallback is built (one function, shared
with the suspicion texts)"* is ENGINEERING — ⛔ asked. Every SN below is therefore the AUTHOR's. ⚠ ONE candidate question has a
person-facing half (PQ1 — a name whose first word is an initial or a title) and is FLAGGED for BigDev's own §0 check at Task 0.2.
⛔ No counsel question.

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md`, `sprint-status.yaml` or `inventory-roster.md` (newest-first or growing files — footgun #19) — cite the decision id,
the item's phrase, or the row key.

NUMBERS (`-366` decision 6: *"the number belongs to the first COMMIT that takes it on any branch"*): at creation the next free decision
id was `-376` and the next free roster row 39 — ⛔ claimed by this file; each is "the next free one" at the commit that takes it (Task
0.1 / 0.3). This story needs ⛔ migration and ⛔ roster row (SN6).

LETTERS: F = found facts (F1–F15); SN = build decisions (SN1–SN7 — PROPOSED, ⏳ BigDev at Task 0.2); PQ = candidate Panel question
(PQ1); I = invariants (I1–I6); T = traps (T1–T14). This story's OWN decision entry is called **"the 6.37e entry"** below.
-->

# Story 6.37e: When the member's full name is too long for a text, the family and the neighbours still get the text — with the first name and the surname's initial

Status: ready-for-dev

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Four SMS texts name the deceased member in a `{member}` slot of 40 code points: the three
> suspicion texts (the nominee's refusal notice — `-262` FQ7 B; the closed notice — `-291` Q2 B; the refused person's appeal notice —
> `-293` item 1 B) and the text to the five neighbours (`-303` Q1 A). Today a name over 40 means ⛔ text: the suspicion notice is claimed
> and then refused by the send core (`dlt_template_not_approved:value_too_long` + an alarm that reaches the logs only); the neighbours'
> text is never begun for that claim (`no_target:name_too_long`, claim-wide). The Panel ruled B twice: **send it with the shorter name
> form — first name and the surname's initial ("Ramesh S."), the form a Pariwar can already choose — ONLY when the full name does not
> fit**; a name that still does not fit keeps today's outcome. This story builds ONE pure function that makes that choice and calls it
> from the two senders. ⛔ Words change, ⛔ migration, ⛔ schema, ⛔ new outcome.

**What already ships and this story READS — rebuild ⛔ none of it:**
- `notifications.resolveMemberFacingDeceasedName(mode, storedName)` (`packages/domain/src/notifications/pool-identity.ts`) — the
  mode-resolved name; its `shielded_name` arm IS the short form (`${firstName} ${lastInitial}.`; a mononym is shown whole).
- `splitFirstNameLastInitial` (`packages/domain/src/kyc/name.ts`) — the implementation of `shielded_name` (`-136` cl.2); ⛔ reimplement.
- `fitsDltAlphanumeric(value)` (`apps/jobs/src/scheduler/peer-mesh-sms-templates.ts`) — R9's ONE fit predicate (code points ≤
  `DLT_TYPE_MAX_LENGTH.alphanumeric` = 40).
- The send core's MG3 check `checkedValues` (`apps/jobs/src/scheduler/claim-dlt-sms-send.ts`) — the refusal + alarm that stays for a
  name that still does not fit.

## Story

As **a family member or neighbour the Trust has promised to text about a member's death or claim**,
I want **the text to reach me even when the member's full name is too long for it — naming the member by first name and surname initial**,
so that **a long name never silently costs me the text the Panel promised — including the refused person's only notice of the last
date to appeal**.

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| `2026-10-18-359` | *"B — Send it with the shorter form of the name, only when the full name does not fit — first name and the initial of the surname (e.g. "Ramesh S."), the form a Pariwar can already choose."* Consequence 1: *"the three suspicion texts fall back to first name + surname initial when the full name exceeds the slot; the error and alarm stay for a name that still does not fit."* Not covered: *"a one-word name that is itself too long (B's own cost — still not sent, as built); how the operators count the length (roster Row 30 (d), unanswered)"* | Trustee-ratified |
| `2026-10-18-362` | *"B — … first name and the initial of the surname ("Ramesh S."), the same rule you chose for the suspicion texts."* Consequence 1: *"ONE fallback function for the four texts."* Not covered: *"a one-word name that is itself too long (still not sent — today's claim-wide `no_target:name_too_long`)"*. Supersedes `-311` PM3's "no text" reading | Trustee-ratified |
| `-262` FQ7 B · `-291` Q2 B · `-293` item 1 B | the three suspicion texts; `[member]` = *"the Pariwar's mode-resolved name form (`-181`)"* — NARROWED for an over-long name by `-359` | Trustee-ratified |
| `-303` Q1 A | the neighbours' text, naming `{member}` — NARROWED for an over-long name by `-362` | Trustee-ratified |
| `-181` cl.1 | *"MODE-RESOLVED"* — the member-facing form from the Pariwar's stored mode; *"share the MODE, ⛔ never the whole function"* (⛔ `resolvePublicMemberName`) | author-commit |
| `-136` cl.2 | `shielded_name` — *"Ramesh Kumar" → "Ramesh K."*; `splitFirstNameLastInitial()` *"becomes the implementation of the `shielded_name` mode"* | Trustee-ratified (cl.2) |
| `-345` MG3 · `-346` decision 1 | the send core refuses a value over its slot (`:value_too_long` + alarm); the helpline exempt | author-commit |
| `-311` PM3 / R9 (Story 6.27c) | `fitsDltAlphanumeric`; `no_target:name_too_long` claim-wide — kept ONLY for a name that still does not fit (`-362`) | author-commit, superseded in part by `-362` |
| `-365` (Story 6.31) | the neighbours' WhatsApp reminder carries the FULL name: *"`-362` narrows the name for the neighbours' TEXT only, and WhatsApp has ⛔ SMS name slot"* | author-commit |
| `-322` C7 · roster Row 30 (d) | the operators' count unit and Devanagari / spaces — OPEN; ⛔ changed here | open |

## ⭐ THE INVARIANTS

**I1 — The full name whenever it fits.** A mode-resolved name of ≤ 40 code points is sent byte-for-byte as today. The fallback never
fires "just in case". Every existing leg with a fitting name stays green UNCHANGED.

**I2 — The short form is the Pariwar's existing shielded form, never a new one.** It is exactly
`resolveMemberFacingDeceasedName('shielded_name', …)` — first token, space, the first grapheme of the LAST token, a period; a single
token shown whole. ⛔ Truncation, ⛔ middle-initials, ⛔ a new splitter, ⛔ `resolvePublicMemberName` (its mononym `''` would OMIT the text
— `-181`'s trap).

**I3 — A name that still does not fit keeps TODAY's outcome on each path.** Suspicion texts: the over-long value goes on to the send
core and ends `dlt_template_not_approved:value_too_long` + alarm (`-359` consequence 1: *"the error and alarm stay"*). Neighbours' text:
claim-wide `no_target:name_too_long`, ⛔ alarm, as today (`-362` not covered). ⛔ Truncated name ever.

**I4 — ONE function for the four texts** (`-362` consequence 1) — pure, no IO, no clock; both senders call it; ⛔ a second fit or
shorten anywhere.

**I5 — The WhatsApp reminder is untouched.** `readMemberFacingDeceasedName` (6.31's shared reader) is byte-unchanged; the WhatsApp
reminder keeps the FULL name (`-365`). Only the TEXT's step (`readDeceasedName`) changes — the routing comment on
`readMemberFacingDeceasedName` already says so.

**I6 — ⛔ A name in any alarm, log line, detail or payload** — the short form included (it is still a name). Ids only, as today.

## 📜 Policy meaning (AI-10-1)

**This story introduces ⛔ predicate and changes ⛔ predicate that gates a member's (or a family's) access to a benefit.** It changes
WHICH NAME FORM a text carries, and with it whether a promised text is sent at all for an over-long name — a notification outcome,
⛔ an eligibility, assignment, payment or claim-decision predicate. ⛔ Claim state, decision, event or money path is touched.

In the family's terms: ⭐ *"If the member's full name is too long to fit in a text, you still get the text — it names the member by
their first name and the first letter of their surname, like 'Ramesh S.'; only a single-word name that is itself too long still means
no text."*

Its cost to the family (the Panel's, as put): the shorter form may be less clear — and for the neighbours, who must RECOGNISE the
member to answer, a neighbour may not recognise "Ramesh S." or may answer about a different Ramesh (`-362`'s stated cost). See PQ1 for
names whose first word is an initial or a title.

**Niyamavali check:** ⛔ applicable — the Niyamavali (`packages/domain/seed/niyamavali-v1-clauses.sql`) has ⛔ clause on texts,
notices or name forms (grepped 2026-10-21: no match for "sms", "text message", "notif"), and it is ⛔ ratified
([[feedback_niyamavali_rulebook_not_spec]]).

⚠ Checked against `-359` and `-362` VERBATIM (the table above):
- the short form "only when the full name does not fit" — MATCHES both (I1);
- "first name and the initial of the surname … the form a Pariwar can already choose" — MATCHES: the built `shielded_name` form (I2);
- "a one-word name that is itself too long … still not sent" — MATCHES (I3); ⚠ ALSO not sent, by our reading: a multi-word name
  whose SHORT form is still over 40 (first word + space + initial + period > 40 — a first word of ≥ 38 code points for a one-code-point
  initial, fewer for a multi-code-point Devanagari initial such as `श्री`) — the same "still does not fit" (`-359` consequence 1:
  *"the error and alarm stay for a name that still does not fit"*) — MATCHES consequence 1's words; the ruling's example names only the
  one-word case. Recorded in the 6.37e entry, ⛔ routed (vanishingly rare; the same outcome the Panel accepted for the one-word case).
- the length "40 characters, counted as code points" (the answer the Panel was given before `-362`) — MATCHES (`fitsDltAlphanumeric`).

## ⭐ FOUND FACTS (at `bac71abb` — re-check at Task 0.1)

**F1 — The suspicion child resolves the name AFTER claiming.** `runSuspicionNoticeChild`
(`apps/jobs/src/scheduler/claim-suspicion-notices.ts`): mode read in its own scope tx → `beginSuspicionNotice` (claims the once-ever
row) → KYC decrypt → `ANONYMIZED_SENTINEL` ⇒ `no_target` → `const member = notifications.resolveMemberFacingDeceasedName(mode,
storedName)`; `''` ⇒ `no_target` (`name` / `unresolvable`) → number → hash → `sendClaimDltSms(… render: … { member, … }, values: … ({
member, … }) …)`. ⭐ The ONE edit point: between the `member === ''` check and the send; `render` and `values` must close over the SAME
chosen local (MG3 — T3).

**F2 — The suspicion slot.** `suspicion-notice-sms-templates.ts`: `const MEMBER: DltSlot = { name: 'member', type: 'alphanumeric',
maxLength: 40, label: 'deceased member name' }` — a LITERAL 40, while the neighbours' slot uses `DLT_TYPE_MAX_LENGTH.alphanumeric`
(also 40). Its header comment still reads *"⚠ a longer or Devanagari name is the open deferred `{member}` item and Row 30 (d)'s
question"* — the "longer name" half is answered by `-359` once this story lands (Task 3 updates the comment; ⛔ the code value).

**F3 — Today's suspicion outcome for a long name.** The send core `checkedValues` refuses any non-helpline value over its slot's
`maxLength` (code points) ⇒ final `error` `dlt_template_not_approved:value_too_long` + alarm (`result.alarm`), after the row was claimed
— the once-ever slot is spent. Pinned by `apps/jobs/tests/claim-suspicion-notices-live.test.ts` *"⭐ 6.37 review round 2 P2 — a FULL
name over the member slot's 40 code points ⇒ final `value_too_long` (MG3) STORED + alarm, ⛔ sent"* with `longName = 'Ramesh Kumar
Venkatanarayana Subramaniam Iyer'` (45) — under this story that name SENDS as `"Ramesh I."` ⇒ the leg must be FLIPPED (T5).

**F4 — The neighbours' child resolves the name ONCE, before any claim.** `claim-peer-mesh-requests.ts`:
`readMemberFacingDeceasedName(deps, pariwarId, deceasedMemberId, tag, label)` (EXPORTED — also called by
`claim-peer-mesh-wa-reminders.ts`, which sends the FULL name) returns `{ name }` or a fault; the TEXT's wrapper
`readDeceasedName` adds `if (!fitsDltAlphanumeric(read.name)) return { fault: 'name_too_long' };`. ⭐ The ONE edit point is
`readDeceasedName` — the routing comment on `readMemberFacingDeceasedName` says: *"⚠ Row 6-37e (`-362`'s short-name fallback) edits the
TEXT's step there — ⛔ this function."* The child then uses `(nameRead as { name: string }).name` as `member` for `render` and `values`.

**F5 — The neighbours' tests that pin "no text".** `claim-peer-mesh-requests-live.test.ts`: (i) *"R9 — a name longer than the slot ⇒
every ping `no_target:name_too_long`, ⛔ replaced, ⛔ texted, ⛔ alarmed"* with `name: 'A'.repeat(20) + ' ' + 'B'.repeat(20)` (41) —
under this story that SENDS as `"AAAAAAAAAAAAAAAAAAAA B."` ⇒ FLIP; (ii) *"AC5b — a re-claimed row with a NAME fault ⇒ `no_target:name_*`
(⛔ replaced) + the "a prior attempt may have sent" alarm"* uses the SAME two-word name ⇒ it would send and FAIL — change
its fixture to a ONE-word over-long name (`'A'.repeat(41)`), ⛔ its assertions.

**F6 — The WhatsApp reminder's full-name leg.** `claim-peer-mesh-wa-reminders-live.test.ts` *"WR13 / §0 edge (ii) — a name that FAILS
the SMS fit check is sent IN FULL"* — MUST stay green UNCHANGED (I5). It imports `fitsDltAlphanumeric` from
`peer-mesh-sms-templates.js` — ⛔ move or rename that export (T7).

**F7 — The short form is computable from the RESOLVED name.** `readMemberFacingDeceasedName` returns only the resolved name (⛔ the
stored name, ⛔ the mode). Applying `resolveMemberFacingDeceasedName('shielded_name', resolved)`:
- `full_name` mode: `resolved` = the stored name with whitespace collapsed; `splitFirstNameLastInitial` splits on the same `/\s+/`
  ⇒ the result EQUALS `shielded(stored)` exactly;
- `shielded_name` mode: `resolved` is already `"Ramesh S."` / a mononym; re-shielding is IDEMPOTENT (verified on Node 22.22.2 / ICU
  78.2: `"Ramesh S."`, `"रमेश श्री."`, `"K. S."` and a 41-letter mononym all map to themselves) — and a shielded name that is still
  over 40 stays over 40 ⇒ I3.
⇒ ONE input (the resolved name) serves both senders; ⛔ new parameter on `readMemberFacingDeceasedName`.

**F8 — Worked examples (Node 22.22.2, ICU 78.2, code points).** `"Venkata Satya Narayana Murthy Subrahmanyam"` 42 → `"Venkata S."` 10;
`"सत्यनारायण मूर्ति सुब्रह्मण्यम चतुर्वेदी शास्त्री"` 49 → `"सत्यनारायण शा."` 14 (the grapheme keeps the vowel sign);
`"K. Venkata Satya Narayana Murthy Subrahmanyam"` 45 → `"K. S."` 5 (PQ1); `'A'.repeat(41)` → itself (still 41 ⇒ I3);
`'A'.repeat(39) + ' B'` 41 → `'A'.repeat(39) + ' B.'` 42 (still too long ⇒ I3).

**F9 — `Intl.Segmenter` is ICU-dependent.** `firstGrapheme` prefers `Intl.Segmenter`; whether a Devanagari conjunct (`श्री`) is ONE
grapheme depends on the ICU's Unicode version (GB9c, Unicode 15.1+). On this machine (ICU 78.2, Unicode 17) it is one. ⚠ A test that
asserts a conjunct initial pins the runtime — assert Devanagari with a NON-conjunct initial (`शर्मा` → `श`) or compute the expected
value through `splitFirstNameLastInitial` itself ([[feedback_stub_must_call_not_transcribe]]).

**F10 — Every Pariwar is `full_name` in production.** `pariwar_public_name_presentation.mode` has ⛔ production writer (`-224` D3's
reachability line). The `shielded_name` path is reachable in tests only (`SHIELDED` Pariwar in the suspicion live suite).

**F11 — ⛔ Text is live.** No claim-text template id (1–14) is provisioned (roster Row 32 (i), Row 30 note (8)) — the change reaches
⛔ family until go-live ([[project_not_in_production_merge_is_not_golive]]). ⛔ A merge fence.

**F12 — No detail vocabulary changes.** `name_too_long` stays in `PEER_MESH_REQUEST_NAME_REASONS` and the 0166 CHECK regex (it still
names the one-word / still-too-long case); the suspicion path still writes `dlt_template_not_approved:value_too_long`. ⛔ Migration.

**F13 — The governance records already done by `-362` consequence 2** (the routing note's ruling block; the 6-37e sprint comment;
deferred-work's neighbours'-text item *"✅ Closed by Decision 2026-10-18-362"*; Story 6.27c's annotation row) — ⛔ redo. STILL OPEN and
owed by this story's records: deferred-work's 6.37 round-2 item *"A suspicion text whose deceased name exceeds the 40 code-point
`member` slot is ⛔ sent"* (no closure line — it even still says the note is *"⛔ yet sent"*); the 6.24b item *"`{member}` has ⛔ no
length guard against the operator's DLT per-variable limit"* (its trigger is DLT provisioning — PARTLY addressed only); roster Row 27's
evidence line (1) (still cites PM3's "no text"); `epics.md` has ⛔ `### Story 6.37e` entry.

**F15 — Two more "a long name is ⛔ texted" statements go stale.** `peer-mesh-sms-templates.ts`'s header: *"an erased /
unresolvable name, or one longer than the slot (`fitsDltAlphanumeric`), ⇒ `no_target`, ⛔ never a blank, ⛔ never a truncated name
(RB5, R9)"*; and the operator-facing registration sheet `docs/launch-gate-inventory/dlt-template-requests-6-19.md` (templates 13–14
prose): *"a name longer than 40 characters is ⛔ texted (`no_target:name_too_long`), ⛔ never truncated"*. Both get a correction (Task
2.4; records — SN6). ⚠ The sheet note must be PROSE: the DLT gate parses table rows matching `| <n> |` in that sheet
(`scripts/dlt-typed-variables/lib.ts` `SHEET_TEMPLATE_ROW`) — ⛔ a new numbered table row.

**F14 — The worktree has ⛔ `node_modules`.** Without them every `@twt/*` import resolves to the MAIN checkout's sources (6.37d Debug
Log (b)(1)) — `pnpm install --frozen-lockfile --prefer-offline` in this worktree FIRST.

## ⚖️ Build decisions SN1–SN7 (PROPOSED — ⏳ BigDev at Task 0.2)

- **SN1 — Where the ONE function lives.** ⭐ **(a) Recommended:** a new module `apps/jobs/src/scheduler/sms-member-name.ts` — both
  callers are in `apps/jobs`; it imports `fitsDltAlphanumeric` from `peer-mesh-sms-templates.ts` (R9's one predicate stays where it is)
  and `notifications` from `@twt/domain`. **Cost:** the suspicion path now depends (through this module) on the neighbours' registry
  file for its predicate. **(b)** In `@twt/domain` `notifications/` beside `resolveMemberFacingDeceasedName`. **Cost:** the 40 and the
  SMS-slot concept move into the domain (it owns no SMS slot today); a premature shared home ([[feedback_no_premature_package]]).
  **(c)** Inside `peer-mesh-sms-templates.ts`. **Cost:** the suspicion child imports a neighbours' registry by name — misleading.

- **SN2 — Its shape.** ⭐ **(a) Recommended:** `smsMemberName(resolvedName: string): SmsMemberName` where
  `SmsMemberName = { readonly kind: 'full'; readonly name: string } | { readonly kind: 'short'; readonly name: string } | { readonly kind: 'too_long' }`
  — `full` iff `fitsDltAlphanumeric(resolvedName)`; else `short` iff `fitsDltAlphanumeric(short)` where `short =
  notifications.resolveMemberFacingDeceasedName('shielded_name', resolvedName)`; else `too_long`. Input = the MODE-RESOLVED name (F7).
  ⛔ `''` input (the callers already turned `''` into `name_unresolvable` / `unresolvable` before calling — assert it with a guard that
  throws, so a future caller cannot silently pass `''`). **Cost:** both slots must be 40 for one predicate to serve both — pinned by a
  unit leg (SN3). **(b)** Take `(mode, storedName)`. **Cost:** the neighbours' reader would have to return the stored name (a change
  to 6.31's shared reader — I5).

- **SN3 — One limit, two slots.** ⭐ **(a) Recommended:** keep the suspicion slot's literal 40 (⛔ registry edit — the lockstep tests
  pin it) and add ONE unit leg asserting `SUSPICION_NOTICE_SMS_TEMPLATES[*][*].slots` member `maxLength` ===
  `PEER_MESH_REQUEST_SMS_TEMPLATES[*].slots` member `maxLength` === `DLT_TYPE_MAX_LENGTH.alphanumeric`, so Row 30 (d) changing the
  limit cannot split them silently. **Cost:** one more leg. **(b)** Change the suspicion `MEMBER` to `DLT_TYPE_MAX_LENGTH.alphanumeric`.
  **Cost:** a registry edit in a story that promises ⛔ registry change; the lockstep test's literal must follow.

- **SN4 — The suspicion "still too long" case.** ⭐ **(a) Recommended:** pass the over-long mode-resolved name on to the send core
  UNCHANGED, as today ⇒ `dlt_template_not_approved:value_too_long` + alarm (I3; `-359` consequence 1 *"the error and alarm stay"*).
  **Cost:** the once-ever row is still claimed before the refusal (as today). **(b)** Refuse before the send with a new
  `no_target` detail. **Cost:** a new detail value (vocabulary + its mirrors), and a different stored outcome than the one `-359`
  says stays.

- **SN5 — A record that the short form was used.** ⭐ **(a) Recommended:** ⛔ new record. The choice is a pure function of the stored
  name (re-derivable while the name exists); ⛔ name may go into a log (I6). **Cost:** after an erasure, nobody can tell that a past text
  carried the short form. **(b)** One ids-only info line per send (`console.info('[jobs] … sent with the shorter name form', ids)`).
  **Cost:** a log line per such send; ⛔ asserted by the harness's `alarms` (it is not an alarm). **(c)** A column. **Cost:** a migration
  on two send tables for a fact nobody reads.

- **SN6 — Records and gates.** ⭐ **(a) Recommended:** ⛔ new roster row (⛔ new go-live leg — the change rides the existing template
  gates, F11); the 6.37e entry (author-commit) records SN1–SN7 + the PQ1 disposition; the records commit: `epics.md` `### Story 6.37e`
  (after 6.37d), deferred-work's 6.37-round-2 suspicion item **"Closed by"** (effective when this row is `done` on `main` —
  [[feedback_closure_language_precision]]), the 6.24b `{member}` item a dated **"partly addressed"** note (the long multi-word name;
  the operator's limit / unit still open — its trigger unchanged), Row 27 evidence line (1) a dated note (`-362` supersedes PM3's "no
  text"; `name_too_long` now only for a name that still does not fit), Row 30 (d) a dated note (fewer names affected; the unit question
  unchanged), the registration sheet's templates 13–14 prose a dated note (F15 — `-362`: the short form when the full name does not
  fit; `name_too_long` only for a name that still does not fit), the 6-37e sprint comment + ledger. ⛔ Routing note edited. **Cost:** none beyond the writing.

- **SN7 — Hindi texts.** ⭐ **(a) Recommended:** ⛔ change — the Hindi registered texts carry `{member}` as a variable; the short form
  is substituted the same way in both locales. ⛔ New Hindi review (Rows 23 / 28 unchanged). **Cost:** none.

## 🏛️ Candidate Panel question (BigDev's §0 check FIRST at Task 0.2 — route, or record as the author's in the 6.37e entry)

**PQ1 — A long name whose FIRST word is an initial or a title.** The built form takes the first WORD as the first name. For
`"K. Venkata Satya Narayana Murthy Subrahmanyam"` (45 — a South-Indian initial-first name) the short form is `"K. S."`; a stored name
starting with a title (`"Shri …"`, `"श्री …"`) would give `"Shri X."`. The Panel ruled *"first name and the initial of the surname"* and
*"the form a Pariwar can already choose"* — the built form IS that form, but for these names its first word is not a first name, and
for the neighbours (who must recognise the member) `"K. S."` says almost nothing in the TEXT. ⚠ Weigh with: the neighbour's link
page shows the FULL mode-resolved name (`apps/api/src/modules/claims/peer-request-core.ts` `resolvePeerRequestMemberName` →
`resolveMemberFacingDeceasedName(mode, stored)`), and the WhatsApp reminder carries the full name (`-365`) — the short form is only the
SMS's; a neighbour who taps the link sees the whole name before answering.
- **(A) Our reading — build the existing form as ruled; record this edge in the 6.37e entry and `deferred-work.md` (trigger: any
  report of an unrecognised short name, or a writer for `shielded_name`).** Cost: some long initial-first names get a weak short form;
  the Panel is ⛔ told unless BigDev chooses to.
- **(B) Tell the Panel (a "told" item, ⛔ a question).** Cost: one more note for BigDev to send; nothing changes in code.
- **(C) Route it: skip leading initials / titles to find the first name.** Cost: a NEW name form no Pariwar can choose today — that
  departs from *"the form a Pariwar can already choose"* and from `-181`'s one form rule (the shielded directory would differ); needs a
  ruling first.
⚠ How reachable: only names over 40 code points whose first word is an initial or title; no production data exists to count them.
For the suspicion texts there is no link page — the short form is all the family sees (the helpline call carries the rest).
Our reading: **A** — the Panel chose the existing form knowing its stated cost (*"A family might find "Ramesh S." less clear"*); C is a
new form; but this edge is sharper than "less clear" for the neighbours, so BigDev may prefer B.

## Acceptance Criteria

Notation: unit legs are pure vitest (`env -u DATABASE_URL`); live legs run on :5433 with `DATABASE_URL` set EXPLICITLY; every send
through the existing fake gateway (⛔ network); "⛔ sent" asserted with the harness's `sent` array (a zero-length recorder).

1. **AC0 — Governance before code.** Task 0 is done before any `apps/` / `packages/` change: SN1–SN7 answered and recorded VERBATIM;
   PQ1 through BigDev's §0 (routed, told, or recorded as the author's); the 6.37e entry committed ALONE; the records commit after it.

2. **AC1 — The ONE function (SN1 / SN2).** `smsMemberName` exists in ONE place, is pure, and is called by exactly the two text senders
   (a source leg greps `apps/jobs/src` for its callers: `claim-suspicion-notices.ts` and `claim-peer-mesh-requests.ts` only). Unit legs (the source leg greps for the token `smsMemberName(` outside its own module):
   (a) a 40-code-point multi-word name ⇒ `full`, byte-identical; (b) a 41-code-point multi-word name ⇒ `short` equal to
   `notifications.resolveMemberFacingDeceasedName('shielded_name', name)` (computed, ⛔ transcribed); (c) a Devanagari name over 40 with
   a NON-conjunct surname initial (F9) ⇒ `short`; (d) a one-word name of 41 ⇒ `too_long`; (e) a multi-word name whose short form is
   still over 40 (`'A'.repeat(39) + ' B'`) ⇒ `too_long`; (f) an already-shielded input is returned as `full` (fits) — and, for an
   over-long one-word shielded input, `too_long` (idempotence, F7); (g) internal double spaces in a fitting name ⇒ the name as passed
   (the resolver already collapsed it — the function does ⛔ re-collapse a `full`); (h) `''` ⇒ throws; (i) an astral-plane name of 40
   code points (80 UTF-16 units) ⇒ `full` (code points, ⛔ UTF-16 — the only input that distinguishes the two units; 6.37 review P8's
   lesson: a leg must be able to fail). (j) SN3's one-limit leg.

3. **AC2 — The three suspicion texts send the short form when the full name does not fit.** Live legs in
   `claim-suspicion-notices-live.test.ts`, for EACH of `suspicion_refusal`, `closed_after_appeal` and `refusal_appeal_notice` (⛔ only
   the first — the harness already has a fixture for each: `refusedS`, `openAppeal`, `allowAppeal`, `contact`): a `full_name` Pariwar,
   a KYC name over 40 with ≥ 2 words and a DISTINCTIVE token (e.g. `Venkatanarayana`) ⇒ outcome `accepted`; the sent member value
   (`m.values.find((v) => v.name === 'member')?.value` — `values` is an ARRAY of `{ name, value }` in slot order) and the body
   carry the short form (expected value computed through `resolveMemberFacingDeceasedName('shielded_name', …)`); the body equals
   `renderSuspicionNoticeSms(message, locale, { member: short, … })`; the existing "values rebuild the body" oracle sees no miss; the
   appeal notice still carries its date. ⭐ The *"6.37 review round 2 P2"* leg is FLIPPED, ⛔ deleted: renamed to say `-359` B, its
   45-code-point name now SENDS as the short form. A one-word over-long name (`'A'.repeat(41)`) keeps TODAY's outcome — final `error`
   `dlt_template_not_approved:value_too_long` + the alarm naming the claim id, ⛔ sent (the old P2 assertions moved to this leg). A
   fitting name is byte-unchanged (every existing leg green UNCHANGED). The `SHIELDED` Pariwar's `"Ramesh S."` leg green UNCHANGED.

4. **AC3 — The neighbours' text sends the short form when the full name does not fit.** Live legs in
   `claim-peer-mesh-requests-live.test.ts`: the R9 leg FLIPPED — `name: 'A'.repeat(20) + ' ' + 'B'.repeat(20)` ⇒ every selected
   neighbour texted (`accepted`), the member value (`m.values.find((v) => v.name === 'member')?.value`) = the short form, body = `renderPeerMeshRequest(locale, { member: short, … })`, ⛔
   alarm; a NEW leg — a one-word name of 41 ⇒ every ping `no_target:name_too_long`, ⛔ replaced, ⛔ texted, ⛔ alarmed (today's R9
   assertions, moved); the *"AC5b — a re-claimed row with a NAME fault"* leg's fixture changed to `'A'.repeat(41)` with its assertions
   UNCHANGED.

5. **AC4 — The WhatsApp reminder is untouched (I5).** `readMemberFacingDeceasedName` — its JSDoc AND its body — is byte-identical to `bac71abb`
   (a `git diff` check in the Debug Log; leave the JSDoc: its *"Row 6-37e … edits the TEXT's step there — ⛔ this function"* stays true); *"WR13 / §0 edge (ii) — a name that FAILS the SMS fit check is sent IN FULL"* green UNCHANGED.

6. **AC5 — ⛔ A name anywhere but the text (I6).** Every new or flipped leg asserts EXPLICITLY `expect(JSON.stringify(h.alarms)).not.toContain(<the full name's
   distinctive token>)` AND `.not.toContain(<the short form>)`. ⚠ The peer-mesh suite's `expectIdsOnly` checks only `'Ramesh'` (its
   default `NAME`) plus numbers and link codes — on an `'A'…`/`'B'…` fixture it proves NOTHING about the name; it does ⛔ satisfy this
   AC alone. ⛔ New log line carries a name (SN5).

7. **AC6 — Nothing else moves.** ⛔ Migration; ⛔ schema / detail-vocabulary change (`PEER_MESH_REQUEST_NAME_REASONS`, the 0166
   regex, `suspicionNoticeDetail`); ⛔ `claim.json` / registry TEXT change (the lockstep tests green UNCHANGED); ⛔ send-core change
   (`claim-dlt-sms-send.ts` byte-identical); ⛔ `packages/domain` source change (per SN1 (a) — re-derive this AC if BigDev picks (b)); ⛔ change to
   `claim-peer-mesh-wa-reminders.ts`. The `git diff --stat bac71abb..HEAD -- apps packages` lists only: the new module,
   `claim-suspicion-notices.ts`, `claim-peer-mesh-requests.ts`, `suspicion-notice-sms-templates.ts` and `peer-mesh-sms-templates.ts`
   (header comments only — F2, F15), and test files.

8. **AC7 — The proof.** Every flipped / new leg proven RED against the pre-change code (the function stubbed to always return `full` /
   the call removed, the leg run, restored) and recorded by name in the Debug Log — legs that are coverage only SAID so. `pnpm --filter
   @twt/jobs typecheck` clean; `pnpm dlt-typed-variables:test && pnpm dlt-typed-variables:check` pass (a new src file — `git add` it
   first); `pnpm ci:local` with `DATABASE_URL` at :5433 green 36/36 (a load timeout re-run ALONE and SAID so —
   [[project_known_livedb_test_failures]]).

## Tasks / Subtasks

- [ ] **Task 0 — governance FIRST (AC0). ⛔ No code.**
  - [ ] 0.1 `git fetch origin`; re-pin if `main` moved (`git diff --name-only bac71abb..origin/main -- apps/jobs packages/domain/src/notifications packages/domain/src/kyc`;
        re-derive any F-fact that moved); `pnpm install --frozen-lockfile --prefer-offline` in this worktree (F14); re-grep `main`, EVERY
        branch (`git branch -a`) and every worktree (`git worktree list`) for the next free decision id and ledger letter.
  - [ ] 0.2 Put SN1–SN7 to BigDev, each with its recommendation and cost; then PQ1 — BigDev's §0 check FIRST (route / tell / record as
        the author's). Record every answer VERBATIM (Debug Log (a)).
  - [ ] 0.3 Write the 6.37e entry (AUTHOR-COMMIT; the `-375` entry's shape: Decision type / Status / Author / Ratifying trustees: None /
        §0 gate / Occasion / The decisions / Supersessions / Does NOT cover / Consequences / References — "Does NOT cover": a one-word
        or still-too-long name, Row 30 (d)'s unit and limit, the WhatsApp reminder). It BUILDS `-359` and `-362` (⛔ re-reads them); it records the
        "short form still too long" reading (Policy meaning) and PQ1's disposition. Stage in the scratchpad; re-grep every branch for the
        id right before inserting; prepend above the newest `### Decision` ([[project_decision_log_writes_user_inserted]] — try, verify
        additive-only, ask once if refused); commit ALONE on this branch; write its SHA after the commit, ⛔ before. If PQ1 is B or C,
        write the told item / routing note from the template (WRITTEN, ⛔ sent — [[feedback_shown_to_panel_means_sent]]).
  - [ ] 0.4 The records commit (one commit, after 0.3) — SN6 (a)'s list: `epics.md` `### Story 6.37e` after 6.37d's entry (the 6.37d
        entry's shape — "Added 2026-10-2x (`bmad-create-story 6.37e`)", the rulings, "Full ACs: …", "Not a merge fence.", the user
        story, "Acceptance Criteria (in brief)"); deferred-work: the 6.37-round-2 suspicion item a dated note *"built by row 6-37e —
        Closed by 6.37e when the row is `done` on `main`"* (⛔ "Closed" before then) and the stale *"⛔ yet sent"* corrected by a dated
        note (the note was SENT and RULED, `-359`), the 6.24b `{member}` item a dated "partly addressed" note; roster Row 27 evidence
        line (1) and Row 30 (d) dated notes (⛔ a word of either row rewritten); the registration sheet's dated PROSE note (F15 — ⛔ a
        `| <n> |` table row); the 6-37e sprint comment; row `ready-for-dev` →
        `in-progress`; ledger ([[project_sprint_status_safe_prepend]] — guard the size, verify the YAML).

- [ ] **Task 1 — The function (AC1).**
  - [ ] 1.1 `apps/jobs/src/scheduler/sms-member-name.ts` (SN1 / SN2): module header (the rulings, I1–I4, the F7 equivalence — why the
        RESOLVED name is the input), `SmsMemberName`, `smsMemberName`. Call `notifications.resolveMemberFacingDeceasedName('shielded_name',
        …)` — ⛔ import `splitFirstNameLastInitial` directly, ⛔ reimplement it.
  - [ ] 1.2 `apps/jobs/tests/sms-member-name.test.ts` — AC1 (a)–(j), incl. SN3's one-limit leg and the callers' source leg. Add
        `apps/jobs/src/scheduler/sms-member-name.ts` to `NOTICE_MODULES` in `apps/jobs/tests/claim-suspicion-notice-no-decision.test.ts`
        (it joins the suspicion child's import graph).

- [ ] **Task 2 — The neighbours' text (AC3).**
  - [ ] 2.1 `readDeceasedName` in `claim-peer-mesh-requests.ts`: replace the `fitsDltAlphanumeric` check with `smsMemberName(read.name)`
        — `too_long` ⇒ `{ fault: 'name_too_long' }`; `full` / `short` ⇒ `{ name }`. Update the module header's step (4) and the R9
        comment (`-362`). ⛔ Touch `readMemberFacingDeceasedName` (I5) — its JSDoc included (AC4).
  - [ ] 2.2 Remove `fitsDltAlphanumeric` from this file's import list only if it is now unused HERE — the export stays (F6).
  - [ ] 2.3 The AC3 legs (flip R9; the new one-word leg; the re-claim leg's fixture).
  - [ ] 2.4 `peer-mesh-sms-templates.ts`'s header (F15): a name longer than the slot is sent in the short form (`-362`); `no_target`
        only for one that still does not fit. ⛔ Code change.

- [ ] **Task 3 — The suspicion texts (AC2).**
  - [ ] 3.1 `runSuspicionNoticeChild`: after `if (member === '') …`, `const chosen = smsMemberName(member)`; send `chosen.name` for
        `full` / `short` and the ORIGINAL `member` for `too_long` (SN4 (a) — the core refuses it as today). ONE local feeds BOTH `render`
        and `values` (T3). Update the RB5 comment and the module header's child line.
  - [ ] 3.2 `suspicion-notice-sms-templates.ts`: the header's `{member}` comment (F2) — the long-name half answered by `-359` / this row;
        Row 30 (d)'s unit / Devanagari half still open. ⛔ Code change.
  - [ ] 3.3 The AC2 legs — all three purposes; flip *"6.37 review round 2 P2"*; the one-word leg.

- [ ] **Task 4 — Proof (AC4–AC7).** RED runs (Debug Log); `git diff bac71abb -- apps/jobs/src/scheduler/claim-peer-mesh-requests.ts`
      shows `readMemberFacingDeceasedName`'s body unchanged; the AC6 diff-stat; typecheck; DLT gate; `ci:local` on :5433.

- [ ] **Task 5 — Records and close.** Story Status, Dev Agent Record, File List, Change Log (newest-first); sprint row `in-progress` →
      `review`; ledger. ⛔ "Closed by" until `done` on `main`.

## Dev Notes

### ⚠ TRAPS

1. **T1 — Never truncate.** `name.slice(0, 40)` is option C the Panel rejected (it can cut a Devanagari letter in half). The ONLY
   shorter form is the shielded one.
2. **T2 — ⛔ `resolvePublicMemberName`.** In `shielded_name` it returns `''` for a mononym — its callers read `''` as OMIT (`-145`
   cl.3). Here that would turn a sendable one-word name into ⛔ text. Use `resolveMemberFacingDeceasedName` (`-181`'s trap).
3. **T3 — `render` and `values` must close over the SAME chosen name.** MG3's check refuses a values/body mismatch
   (`values_mismatch`) — computing the short form in one closure and not the other turns every long-name text into an error.
4. **T4 — Feed the RESOLVED name, not the stored one** (SN2 (a)); in the suspicion child `member` is already resolved — pass `member`,
   ⛔ `storedName`.
5. **T5 — The P2 pin must be FLIPPED, ⛔ deleted** — keep its "⛔ the name in an alarm" assertion and move its refusal assertions to the
   one-word leg; say so in the Debug Log (the 6.37d T3 precedent).
6. **T6 — The neighbours' R9 fixture is two words.** `'A'.repeat(20) + ' ' + 'B'.repeat(20)` now SENDS; the re-claim name-fault leg
   using it would FAIL (it would send) — change its fixture, ⛔ its assertions (F5 (ii)).
7. **T7 — ⛔ Move or rename `fitsDltAlphanumeric`.** The WhatsApp reminder's test imports it from `peer-mesh-sms-templates.js` (F6).
8. **T8 — ⛔ Touch `readMemberFacingDeceasedName`.** It feeds the WhatsApp reminder, which must stay FULL (`-365`).
9. **T9 — Code points, not UTF-16, not graphemes.** `[...s].length` (as `fitsDltAlphanumeric`). Devanagari is BMP (units = code points),
   so only an ASTRAL leg distinguishes them (AC1 (i)); a grapheme count would undercount Hindi (vowel signs and virama count separately
   — what the Panel was told).
10. **T10 — `Intl.Segmenter` varies with ICU** (F9). Compute expected short forms through the domain function, ⛔ a hard-coded conjunct.
11. **T11 — ⛔ A name in an alarm** — the short form is still a name (I6).
12. **T12 — Live DB is :5433, explicitly.** The shell exports `DATABASE_URL=:5432`; the pre-push hook would migrate the dev DB
    ([[project_prepush_hook_inherits_5432]]) — push (when BigDev says) with `DATABASE_URL='postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable'`.
    Run live files one at a time when diagnosing (cross-file lock contention — [[project_known_livedb_test_failures]]).
13. **T13 — Prettier is not enforced** — hand-format; ⛔ `--write` a whole file ([[project_prettier_not_enforced]]).
14. **T14 — `**cl.N**` inside a JSDoc closes it** ([[project_markdown_emphasis_closes_jsdoc]]) — grep the new header for `**/`.

### Reuse map

| Need | Reuse | ⛔ Rebuild |
|---|---|---|
| The short form | `notifications.resolveMemberFacingDeceasedName('shielded_name', name)` | a splitter / initialiser |
| The fit | `fitsDltAlphanumeric` (`peer-mesh-sms-templates.ts`) | a second `[...s].length <= 40` |
| The refusal of a still-too-long suspicion name | the send core's `checkedValues` (`value_too_long` + alarm) | a pre-send refusal |
| The neighbours' still-too-long fault | `{ fault: 'name_too_long' }` (existing vocabulary) | a new reason |
| Live harnesses | `claim-suspicion-notices-live.test.ts` `seedDeath({ kycName })`, `SHIELDED`; `claim-peer-mesh-requests-live.test.ts` `world({ name })`, `expectIdsOnly` | new seeds |

### Testing standards

Vitest. Unit legs DB-free (`env -u DATABASE_URL pnpm --filter @twt/jobs test -- sms-member-name`). Live legs with `DATABASE_URL` at
:5433. Expected strings computed through the real functions (`resolveMemberFacingDeceasedName`, `renderSuspicionNoticeSms`,
`renderPeerMeshRequest`) — ⛔ transcribed ([[feedback_stub_must_call_not_transcribe]]). Every new leg must be able to fail (RED run).

### Project structure notes

One new src file + one new test file in `apps/jobs`; edits to two schedulers and one registry comment. ⛔ `packages/*` source change
(SN1 (a)). The DLT typed-variables gate scans `apps/*/src/**` — the new file must not contain `DLT_VAR`, `{#var#}` or
`sms.dlt.template_id.` (it needs none).

### Sequencing

⛔ Dependency on an open row. Row 5-13 (peer session, main checkout) touches WhatsApp opt-in — ⛔ overlap with these files.

### Previous story intelligence (6.37, 6.27c, 6.31, 6.37d)

- 6.37 round 2 P2 / Debug Log (o): the refusal this story replaces, and why it was recorded rather than fixed (it narrowed ratified
  texts — routed, then ruled `-359`).
- 6.27c R9: `fitsDltAlphanumeric` is the ONE predicate — "If Row 30 (d) answers a different limit or unit, this function and the
  ceiling change in ONE place". This story keeps that true.
- 6.31 WR13: split `readMemberFacingDeceasedName` out precisely so this story could change the TEXT's step only.
- 6.37d: RED proofs by hand-disabling the fix; legs that cannot fail were found and rebuilt in review (P7, P8); review the fix diff
  before commit ([[feedback_review_the_fix_diff_before_commit]]).

### Git intelligence

Recent commits are 5.10 / 5.12 (mobile + WhatsApp opt-in) — ⛔ touch on these files. The last edits to the two schedulers were 6.37d
(claim-contact) and 6.31 (the WR13 split).

### Latest tech information

Node ≥ 22.12 (`package.json` engines; local 22.22.2, ICU 78.2, Unicode 17). `Intl.Segmenter` grapheme clusters follow the ICU's
Unicode version — since Unicode 15.1 (GB9c) Devanagari conjuncts cluster as one grapheme; older ICUs split them. No library change.

### References

- `.decision-log.md` `2026-10-18-359`, `2026-10-18-362`, `-181`, `-136`, `-345` MG3, `-346` d1, `-311` PM3, `-365`, `-322` C7
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-17-6-37-name-too-long-for-the-text.md` (E3)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-18-6-27c-neighbours-text-long-name.md` (the Panel's length question)
- `packages/domain/src/notifications/pool-identity.ts` `resolveMemberFacingDeceasedName`; `packages/domain/src/kyc/name.ts`
- `apps/jobs/src/scheduler/claim-suspicion-notices.ts` `runSuspicionNoticeChild`; `suspicion-notice-sms-templates.ts`
- `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts` `readMemberFacingDeceasedName`, `readDeceasedName`; `peer-mesh-sms-templates.ts`
- `apps/jobs/src/scheduler/claim-dlt-sms-send.ts` `checkedValues`
- `_bmad-output/implementation-artifacts/6-37-msg91-sms-gateway-adapter.md` (P2, Debug Log (o)); `6-27c-peer-mesh-sending-texts-and-links.md` (R9)
- `docs/launch-gate-inventory/inventory-roster.md` Rows 27, 30 (d), 32 (h) / (i)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created (`bmad-create-story 6-37e`, 2026-10-21).

### File List

## Change Log

- v1.1 (2026-10-21) — one fresh-context checklist verifier (0 H / 3 M / 9 L, all applied): F15 (two more stale "no text" statements —
  the neighbours' registry header, the registration sheet); AC5's explicit name assertions (`expectIdsOnly` checks only "Ramesh");
  PQ1 weighs the full name on the link page; `-136` is Trustee-ratified; `values` is an array; AC4 / Task 2.1 reconciled; AC6 per SN1 (a);
  `NOTICE_MODULES`; the 6.37e entry's shape.
- v1.0 (2026-10-21) — created by `bmad-create-story 6-37e` at `bac71abb`; SN1–SN7 proposed, PQ1 candidate; status `ready-for-dev`.
