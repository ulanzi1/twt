---
baseline_commit: 1e22889e
---

<!--
PINNED: `1e22889e` = `origin/main` (`git fetch origin` 2026-10-22: the branch is `origin/main` + 14 story / governance commits, 0 behind). Built in its OWN
worktree `/Users/dev/Developer/projects/TWT-6-37e`, branch `story/6-37e-suspicion-text-short-name-fallback` ([[feedback_commit_on_story_branch]],
[[feedback_shared_tree_branch_switch]] — ⛔ switch the main checkout; the peer sessions `twt-27` / `twt-12` were idle at authoring and at the v2.1 validate). Two facts, stated
separately (footgun #24): (1) the pin is an ancestor of this branch (durable — `git merge-base --is-ancestor 1e22889e HEAD` true); (2) every
`apps/` / `packages/` claim below was re-derived at the branch tip `ede854dc` on 2026-10-22 (perishable — re-check at Task 0.1;
`git diff --name-only 1e22889e origin/main -- apps packages` was EMPTY). Re-locate by FUNCTION, ⛔ by line number (#19, #21).

v2.0 = A REWRITE, ⛔ A PATCH (footgun #20 meta-lesson). The v1.7 body — ACs, Tasks, SN1–SN7, PQ1–PQ2, F1–F17, T1–T14 — specified the "Ramesh S."
fallback that `2026-10-22-379` SUPERSEDED; it is replaced, ⛔ edited, and is recoverable at `ede854dc`
(`git show ede854dc:_bmad-output/implementation-artifacts/6-37e-suspicion-text-short-name-fallback.md`). What is KEPT, verbatim, at the end of
this file under "Record of the superseded build": the v1.6 code-review findings, the Debug Log (a)–(e), the Completion Notes, the v1.x File
List and every Change Log row. Those are history, ⛔ instructions.

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`): the BEHAVIOUR is the
Panel's and is RULED — `2026-10-22-379` (Q1 A the name rule, Q2 A the two helpline-free texts). `-378` §0 already put in terms what is the
AUTHOR's: *"HOW the name is split between the two variables, the DLT registration of templates 7–10's third variable, and the English-only
capture of member KYC names"*. Every NB below is therefore the AUTHOR's; ⛔ one needs a Panel note. The edges re-checked against the ruled words
are in "§0 re-run" — all MATCH, so this story WRITES ⛔ routing note and ⛔ told item. ⛔ Counsel question.

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md`, `sprint-status.yaml` or `inventory-roster.md` (newest-first / growing files — footgun #19): cite the decision id, the item's
phrase or the row key.

NUMBERS (`-366` decision 6: *"the number belongs to the first COMMIT that takes it on any branch"*): ⛔ claimed by this file; each is "the next
free one" at the commit that takes it (Task 0.1 / 0.3). At authoring, over EVERY ref and the three worktrees (`TWT`, `TWT-6-37e`, and `TWT/.claude/worktrees/3-3c-member-kyc-name-english-only` — a peer row, clean at `1e22889e`): decision `-380` (the highest anywhere
is `-379`, dated 2026-10-22 — so `2026-10-22-380` if committed today); ledger `2026-10-22j` (this create-story run), `2026-10-22k` (the v2.1 validate) and `2026-10-22l` (BigDev's Task 0.2 answers, v2.2) are TAKEN on this branch ⇒ Task 0.4's ledger line is `2026-10-22m`; roster Row 40 and a
migration — ⛔ either needed. LEDGER LETTERS follow the decision rule by analogy.

LETTERS (⛔ reused from v1.x — footgun #20(c): a bare letter must not mean two things in one file): **N** = invariants (N1–N9); **G** = found
facts (G1–G19); **NB** = build decisions (NB1–NB9 — PROPOSED, BigDev answers at Task 0.2); **TR** = traps; **AC0–AC8**. The v1.x letters (F, SN, PQ,
I, T, AC1–AC7 as v1.x defined them) survive ONLY inside the kept history and the 2026-10-22 decision entries (`-377` SN1–SN7). ⚠ The Debug Log letters
(a)–(e) are ALSO re-assigned: v2.0's (a)–(e) are defined in "Debug Log References" below; the kept history's (a)–(e) (where (e) was the RED proofs) are
v1.x's and are read there only. This story's OWN decision entry is called **"the 6.37e rework entry"** below (it takes `-380`).
-->

# Story 6.37e: The member's full name in the claim texts — across two name boxes, shortened only above 60 letters — and the helpline number leaves the appeal-date and neighbours' texts

Status: review

> ⭐ **REWRITTEN 2026-10-22 (v2.0, `bmad-create-story 6.37e`) against [`2026-10-22-379`](../../.decision-log.md#decision-2026-10-22-379)**
> (Trustee-ratified — Dhiraj Rahul + Kalpana Bharti, relayed by BigDev: *"by DR and KB — Q1 A, Q2 A"*). The row key keeps its original
> name `…-short-name-fallback` (renaming it would orphan every reference); the behaviour is no longer a "short name fallback" — the member's
> WHOLE name is sent whenever it fits 60 letters. The branch is ⛔ landed and ⛔ pushed; it holds the superseded build (G1 says what becomes
> of each file). **Next: Task 0 (governance FIRST, ⛔ code), then Tasks 1–7.**

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Four SMS texts name the deceased member: the three suspicion texts (the nominee's refusal notice,
> the closed notice, the refused person's appeal-date notice) and the text to the five neighbours — registered as DLT templates 7–14. Until
> `-379` the name sat in ONE `{member}` variable of 40 letters; a longer name meant no text (main) or "Ramesh S." (the superseded branch).
> The Panel replaced both: the name travels in TWO alphanumeric variables side by side, `{member1}{member2}`, 30 letters each — **60 in all**.
> A name of 60 or fewer is sent WHOLE. Above 60, in this order: the listed titles are dropped; then words become their first letter, from the
> FIRST word, one at a time, until it fits — ⛔ never the last word; if it still does not fit, ⛔ text, as today. To stay within the SMS rules'
> three variables, the appeal-date text and the neighbours' text LOSE their helpline variable (*"Please call the helpline."* /
> *"…[link], or call us."*); the two family texts (7–10) keep it. This story builds ONE pure function that makes the name choice and splits it
> into the two boxes, re-shapes the two template registries, the copy and the registration sheet to match, and keeps the WhatsApp reminder
> exactly as it is. ⛔ Migration, ⛔ schema, ⛔ new outcome vocabulary, ⛔ send-core change.

**What already ships and this story READS — rebuild none of it:**
- `packages/channels/src/dlt-variables.ts` — `DltSlot`, `checkDltTemplateShape` (zero-separator alphanumeric neighbours are ALLOWED — G3),
  `needsUnicode`, `toGatewayTemplate`, `substituteDltValues`. All slot-generic; ⛔ code edited (one JSDoc sentence — G4 (vi)).
- `apps/jobs/src/scheduler/claim-dlt-sms-send.ts` — `sendClaimDltSms` / `checkedValues` (MG3): proves the values are the slots' names, each
  ≤ its slot's `maxLength` (code points; only a slot NAMED `helpline` is exempt) and rebuild the body. Slot-generic; byte-unchanged (G2).
- `readMemberFacingDeceasedName` (`claim-peer-mesh-requests.ts`) — the mode-resolved name; ALSO read by the WhatsApp reminder. Body byte-unchanged; one JSDoc sentence re-worded (AC5).
- `notifications.resolveMemberFacingDeceasedName(mode, stored)` — the mode-resolved name (`full_name` ⇒ the stored name whitespace-collapsed;
  `shielded_name` ⇒ "Ramesh S." — test-only today, G15). Read, ⛔ edited.
- The AST caller fence in `apps/jobs/tests/sms-member-name.test.ts` (the v1.6 code review's P-7) — KEEP and re-aim (AC1).

## Story

As **a family member, a refused person or a neighbour the Trust has promised to text about a member's death or claim**,
I want **the text to carry the member's whole name — however long, within reason — and, only for a very long name, a shortened one that keeps the last word of the name (the family name people recognise, in the Panel's words)**,
so that **I recognise whom the text is about, and a long name never silently costs me the text — including the refused person's only notice of the last date to appeal**.

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| `2026-10-22-379` Q1 A | The rule as put: *(1) "Send the full name whenever it fits 60 letters." (2) "Only if it is longer: remove titles and suffixes — Shri / Sri, Smt, Shrimati, Sushri, Dr, Late, Mr / Mrs / Ms, Ji, श्री, श्रीमती, सुश्री, डॉ, स्व., स्वर्गीय, जी (whole words only; Kumari, Devi, Kumar and Bai are parts of names and stay)." (3) "If still longer: turn words into their first letter, starting from the FIRST word, one word at a time, until it fits — and ⛔ never the last word" — "Kumar Venkata Satya Narayana Murthy Subrahmanyam Swaminathan Iyer" → "K V Satya Narayana Murthy Subrahmanyam Swaminathan Iyer". (4) "If it still does not fit … ⛔ text, as today — the family's text raises an alarm."* Two name boxes: the note as put says *"TWO name boxes side by side, which together hold 60 letters"*; `-379`'s own (unquoted) prose reads them as two alphanumeric variables of 30 letters each, quoting the note's *"(if 40, the full name fits up to 80)"*. Cost as put: *"Each text needs two name boxes — so four texts must drop the helpline number to stay within the SMS rules (Question 2)."* | **Trustee-ratified** (the ruling block); the consequences are author-written |
| `-379` Q2 A | Appeal-date text (templates 11–12): *"The claim for [member] could not go ahead. It can be appealed until [date]. Please call the helpline."* Neighbours' text (13–14): *"We have been told that [member] has died. If you knew them, please answer a few short questions: [link], or call us."* — *"the dash a comma"*. Texts 7–10 KEEP the number (*"name ×2 + helpline = three variables"*). Cost as put: *"A refused person who does not use the app has no number in the text. The neighbours are members who use the app and know the helpline; those who chose WhatsApp also get the number in the WhatsApp reminder two days later."* | **Trustee-ratified** |
| `-379` *Not covered* | roster Row 30 (d) (30 or 40 per variable; **two alphanumeric variables side by side with ⛔ separator**; **an EMPTY second variable for a short name**; how Devanagari is counted — *"A refusal of the RULED form comes back to the Panel"*); the Hindi words of the changed texts (Rows 23 / 28); **the WhatsApp reminder (`-365`) — ⛔ changed: full name, with the helpline**; a shorter neighbours' link; English-only capture of member KYC names (row `3-3c-member-kyc-name-english-only`) | the Panel's own list |
| `-378` decisions 2, 3, 6, 7 | the author-commit that PROPOSED what `-379` ratified; its §0 names what stays the author's (above). Decision 2 (b) carries the matching words the note summarised as "(whole words only)": *"matched as whole words, in any letter case, with or without a trailing full stop"*; (c): *"replace words by their first letter (a whole letter — never half a Devanagari conjunct), from the FIRST word onward, one word at a time, ⛔ full stop, until it fits; ⛔ never the LAST word"* — ⚠ the case / full-stop matching and "a whole letter" are `-378`'s (the author's) readings; the NOTE as put and `-379` carry only *"whole words only"* and *"first letter"*. ⚠ Decision 3 as WRITTEN says 11–14 *"point to the app instead"*; the note as SENT (and so `-379` Q2 A) has ⛔ pointer to the app — roster Rows 22 / 27 already carry the dated note *"NQ2 as put has ⛔ pointer to the app"* | author-commit (BigDev); decisions 2 and 3 ratified AS SENT by `-379` |
| `-377` SN1–SN7 | the v1.x build decisions. **Kept:** SN1 as to HOME (the one function lives in `apps/jobs`, a module of its own) — ⚠ its two import clauses (*"it imports R9's ONE fit predicate `fitsDltAlphanumeric` … and `notifications` from `@twt/domain`"*) are SUPERSEDED by NB1 / Task 1.2; SN4 (a still-too-long suspicion name goes to the core and is refused as today); SN5 (no new record that a shortened form was used); SN6 in SUBSTANCE (⛔ new roster row, ⛔ new go-live leg — NB9 (a) restates it) — only its Consequence-1 records list is superseded by Task 0.4. **Replaced:** SN2 (shape), SN3 (one limit), SN7 ("Hindi texts ⛔ change" — they DO change). The "Ramesh S." fallback and `-377` decision 8 (PQ1 / PQ2) are SUPERSEDED (`-378`, `-379`) | author-commit; the record of what the branch built |
| `-359` / `-362` option B | the "Ramesh S." fallback — **SUPERSEDED by `-379` Q1 A**; stay true statements of the period 2026-10-18 → 2026-10-22 ([[feedback_supersede_never_reinterpret]]) | Trustee-ratified, superseded |
| `-262` FQ7 B · `-291` Q2 B · `-293` item 1 B · `-303` Q1 A (`-304` Q6 A) | the four ratified texts. `-379` Q2 returns 11–12 to `-293`'s own words (*"Please call the helpline."* — the number was a build addition) and narrows `-303` Q1 A's wording. ⚠ `[member]` = *"the Pariwar's mode-resolved name form (`-181`)"* sits under *"Our reading — ⛔ NOT RATIFIED"* in `-293` item 1 and `-291` Q2 — recorded, ⛔ re-read | Trustee-ratified; the name form "Our reading" |
| `-269` §5 | the helpline number is PER PARIWAR (`sms.claim_correction.helpline_number.<pariwarId>`) — so it cannot be fixed text | author-commit |
| `-365` WR6 / WR13 | the WhatsApp reminder's body is the text's words *"(the real `t('peer_mesh_sms.request')` output)"* with `{{1}}` the FULL name, `{{2}}` the link, `{{3}}` the helpline; *"(a) Full name always"* | author-commit; WR6's "same words" rests on `-303` Q1 A / Consequence 3 |
| `-181` cl.1 · `-136` cl.2 | the name is MODE-RESOLVED (`full_name` / `shielded_name`) | `-181` author-commit; `-136` cl.2 Trustee-ratified |
| `-345` MG3 · `-322` C7 · `-349` | the core refuses a value over its slot; a refusal of the RULED form by an operator goes BACK to the Panel; a rejected Panel-ruled wording *"goes back to the Panel before it is sent"* (`-349` header; (a): an unapproved template *"keeps its id unset"*) | author-commit; `-322` C7 / `-349` as recorded |
| `-227` cl.1 · row `3-3c-member-kyc-name-english-only` | *"Please use English Name everywhere"* — member names are English at capture (DigiLocker's `Poi@name`; the manual fallback becomes English-only in row 3-3c). ⛔ Transliteration here. A non-English name that still reaches a text gets the SAME rule in its own script | Trustee-ratified; row 3-3c is `backlog` |

## ⭐ THE INVARIANTS

**N1 — The full name whenever it fits 60.** A mode-resolved name of ≤ 60 code points is carried whole, ⛔ changed by a character: the two boxes
CONCATENATE to exactly the name as passed. The shortening never fires "just in case". (`-379` Q1 A (1).)

**N2 — Shortening only above 60, in the Panel's order, with the Panel's words.** (i) drop the listed titles (all at once); (ii) if still above
60, initials from the FIRST word, one word at a time, stopping the moment it fits; (iii) ⛔ the LAST word ever — the last word *after* the
titles are dropped; (iv) ⛔ truncation, ⛔ a middle initial, ⛔ a full stop on an initial, ⛔ a title not on the list, ⛔ `Kumari` / `Devi` /
`Kumar` / `Bai` dropped (they may still become an initial when they are an early word — "K" for "Kumar" in the Panel's own example); (v) if
nothing fits, `too_long`. The author's readings of the matching and of "word" / "first letter" are NB4's.

**N3 — A name that still does not fit keeps TODAY's outcome on each path.** Suspicion texts: the over-long name goes on to the send core and
ends `dlt_template_not_approved:value_too_long` + an alarm (the once-ever slot spent), as today. Neighbours' text: claim-wide
`no_target:name_too_long`, ⛔ alarm, as today. `-379` Q1 A (4): *"⛔ text, as today — the family's text raises an alarm."* ⛔ A truncated name.

**N4 — ONE function for the four texts.** Pure (⛔ IO, ⛔ clock, ⛔ a package import); both senders call it; ⛔ a second fit, a second title list,
a second first-letter or a second box split anywhere (AC1's fence). The 30 and the 60 exist ONCE (`sms-member-boxes.ts`, NB1).

**N5 — The two boxes carry the name and nothing else.** `box1 + box2` is the name; each box ≤ 30 code points; (NB3 (b), recommended) ⛔ an
empty box for any name of ≥ 2 code points; a box begins or ends with whitespace only when the NAME does or when no cut avoids it (a name of
59–60 code points with a space at every admissible offset — it is then still sent WHOLE: N1 outranks the cosmetic). ⚠ The same forced case
can cut INSIDE one grapheme cluster (a conjunct, a ZWJ sequence, combining marks straddling offset 30 — NB3 (b)): the SMS is unaffected (the
gateway concatenates), but a box value may then begin with a combining mark — recorded for Row 30 (d) (Task 0.3 / 0.4), ⛔ a reason to refuse the name.

**N6 — The WhatsApp reminder is untouched.** Its words, its three Meta variables, its FULL name and its helpline are byte-for-byte what 6.31 wrote for registration with Meta (nothing is registered yet — roster Row 35 is open); `readMemberFacingDeceasedName`'s body is byte-identical (one JSDoc sentence re-worded — AC5). It no longer shares the text's copy key (G5, NB8) — that is the point.

**N7 — ⛔ A name in any alarm, log line, detail or payload** — a box, a fragment or a shortened form included (each is still a name). Ids only.

**N8 — Registered text, copy, slots and the registration sheet move together.** The eight registered texts (AC2) are the Panel's words plus the
box variable (13 / 14 minus the word "short" — BigDev, Debug Log (a)); the real `t()` renders EXACTLY them; the shape check is clean; the sheet's rows, types and MSG91 forms are the same.

**N9 — The helpline stays in exactly the texts the Panel kept it in (7–10) and never enters 11–14.** A regression guard: a `helpline` value in
an 11–14 `values` is `values_mismatch` at the core; a missing one in 7–10 is the same.

## 📜 Policy meaning (AI-10-1)

**This story CHANGES a predicate that gates a promised notice:** "does this member's name fit the text, and in what form?" It decides whether
a text is sent at all for a long name — including the refused person's only notice of the last date to appeal — and which name the text
carries. It is a notification outcome, ⛔ an eligibility, assignment, payment or claim-decision predicate; ⛔ claim state, decision, event or
money path is touched. Compared with `main` (a name over 40 ⇒ no text) it only WIDENS sending; compared with the superseded branch it sends a
longer, truer name. ⚠ The widening reaches every reader of a ping's `accepted` outcome — the neighbours' WhatsApp reminder (`not_due` rule, AC5),
the open-request / reply readers and the answers assembler: a neighbour who is now TEXTED can now ANSWER — the intended effect, ⛔ a code change
(each is a reader of the outcome, ⛔ of the name). For a name above 60 that the rule CAN shorten, the SMS carries the SHORTENED form and the WhatsApp reminder two days
later the FULL name (`-379` *Not covered*) — two forms of one member, recorded in the rework entry, ⛔ a question.

In the family's terms: ⭐ *"If the member's full name is 60 letters or fewer, you get the text with their whole name. If it is longer, we first
leave out titles such as Shri or Late, and if it is still too long we turn the words at the front of the name into initials, one at a time, only
as far as needed — never the last word of the name. Only a name that still cannot fit means no text."*

Its cost to the family (the Panel's, as put — verbatim in the table above): each text needs two name boxes, so the appeal-date text and the
neighbours' text lose the helpline NUMBER — *"A refused person who does not use the app has no number in the text"*; the neighbours *"know the
helpline"*, and those on WhatsApp get the number two days later. ⚠ Length: the neighbours' English text is **2 SMS parts** — 170 letters for a
usual name, 211 for a 60-letter one (computed, G12, on the words as edited at Task 0.2; the Panel was told *"about 175 … up to about 220"* for the
ratified words) — and, with the dash gone, GSM-7: 2 parts where today's text is 3.

**Niyamavali check:** ⛔ applicable — grepped 2026-10-22 over `packages/domain/seed/niyamavali-v1-clauses.sql` for `sms`, `text message`,
`notif`, `name form`, `member name`, `helpline`, `title`: ⛔ match (the `title` hits are the `title_en` column name only; the five "name" hits are comment words — "named", "field-name"); and the
Niyamavali is ⛔ ratified ([[feedback_niyamavali_rulebook_not_spec]]).

⚠ Checked against `-379` VERBATIM (the table above): "send the full name whenever it fits 60 letters" — MATCHES N1; the title list and the
"whole words only" — MATCHES N2 (the case / full-stop matching is NB4's reading of it); "starting from the FIRST word … ⛔ never the last word"
— MATCHES; "if it still does not fit … ⛔ text, as today" — MATCHES N3; the appeal-date text — MATCHES word for word; the neighbours' text — MATCHES except
the word "short", dropped by BigDev at Task 0.2 (the §0 row below; Debug Log (a)).

## §0 re-run — every edge checked against the ruled words (all MATCH or the author's, except ONE: the dropped "short" — BigDev's, under an authorisation ⛔ found in the log ⇒ ⛔ routing note; ONE told item before registration, `-349` decision 2)

| Edge | Against the ruled words | Outcome |
|---|---|---|
| **"short" dropped from the neighbours' text** (13 hi *"कुछ प्रश्नों"*, 14 en *"a few questions"*) — BigDev's edit at Task 0.2 | `-304` Q6 A ratified *"a few short questions"*; `-379` Q2 A ratified the text AS PUT with it ⇒ a CHANGE of ratified words — the Panel's by the template's §0 | **BigDev's decision, reaffirmed** (*"Build with my words. Panel has already authorized me to make small changes."*); the authorisation's instrument is ⛔ in the decision log (`-210` is enums only; `-349` decision 4 left exactly this delegation un-routed) — BigDev to name it; the rework entry records the statement verbatim as the basis; the final 13 / 14 words are a TOLD item to the Panel before Row 27 registers them (`-349` decision 2: *"nothing is sent with words the Panel has not seen"*) |
| Titles matched in any letter case and with / without a trailing full stop (Aadhaar names are often UPPER-CASE; "Dr." / "Mr.") | the list is closed and *"whole words only"*; the same words, ⛔ new ones | MATCH — the author's reading of "whole words" (NB4); `-378` decision 2 (b) said it in terms |
| "first letter" = the first letter-or-digit grapheme (skips a leading "(" or invisible mark); a word with none is left as is | the ruled words say only *"turn words into their first letter"*; *"(a whole letter — never half a Devanagari conjunct)"* is `-378` 2 (c), the author's reading | MATCH — the author's reading of "letter" (NB4 (v)) |
| The name is the MODE-RESOLVED name (a `shielded_name` Pariwar's "Ramesh S." fits trivially) | `-379` Q1 A says *"the full name"* and is SILENT on the mode; the member-facing form reads the Pariwar's mode by `-181` cl.1 (AUTHOR-commit), which rests on `-136` cl.2's (Trustee-ratified) Pariwar-level public-name control — `-379` (ratified) composed with `-181` (author-commit), ⛔ one re-read | the author's — v1.x overrode the mode for a long name (`-377` SN2, superseded); UNREACHABLE in production (G15: no caller of the mode writer). Listed in the rework entry's *Does NOT cover* so it becomes a told item if a mode writer ever ships |
| The WhatsApp reminder keeps today's words while the text's words change (the "same words" of `-303` Q1 A / `-365` WR6 no longer literal — the helpline, the dash, and now "short") | `-379` *Not covered*: *"the WhatsApp reminder (`-365`) — ⛔ changed: full name, with the helpline"*; Q2 A's own cost line says the WhatsApp reminder carries the number | MATCH — the Panel's cost line ASSUMES this; recorded in the 6.37e rework entry (NB8) |
| The helpline-presence gate stays on all four texts although 11–14 no longer print the number | not a ratified clause (`-269` §5); the text still says "call the helpline" / "call us" | the author's (NB6) |
| The Hindi words of 11 and 13 (the helpline phrase removed; the dash a comma) | *"The Hindi texts change the same way; the Hindi reviewers check the words"* (the note) | the author's, flagged to Rows 23 / 28 (NB7) |
| How the name is cut between the boxes | `-378` §0: *"HOW the name is split … the author's"* | the author's (NB3) |

## ⭐ FOUND FACTS (G — at branch tip `ede854dc`, `origin/main` `1e22889e`; re-check at Task 0.1)

**G1 — What the branch holds now, and what becomes of it.** The superseded build (`55bf7477`, review `39a6a687`) plus governance
(`-377` / `-378` / `-379`) and records. For the dev:

| File | At `ede854dc` | In this rework |
|---|---|---|
| `apps/jobs/src/scheduler/sms-member-name.ts` | NEW, 50 lines: `smsMemberName(resolved)` → `full` / `short` ("Ramesh S.") / `too_long`; imports `fitsDltAlphanumeric` + `@twt/domain` | **REWRITTEN** (AC1) |
| `apps/jobs/src/scheduler/sms-member-boxes.ts` | — | **NEW** (NB1): the 30, the 60, the two box slots |
| `claim-suspicion-notices.ts` | `runSuspicionNoticeChild`: `chosen = smsMemberName(member)`; ONE local `memberValue` feeds `render` and `values`; header sentence on the guard's throw | **REWORKED** (AC3) |
| `claim-peer-mesh-requests.ts` | `readDeceasedName` → `{ name }` via `smsMemberName`; `fitsDltAlphanumeric` import dropped; `readMemberFacingDeceasedName` byte-identical to the pin | **REWORKED** (AC4); `readMemberFacingDeceasedName`'s body stays byte-identical, one JSDoc sentence re-worded (AC5) |
| `peer-mesh-sms-templates.ts` | header comment only; still the single `MEMBER` 40 slot, `fitsDltAlphanumeric`, three-variable text | **REAL EDITS** (AC2): slots, text, vars, render; `fitsDltAlphanumeric` removed (NB1) |
| `suspicion-notice-sms-templates.ts` | header comment only; single `MEMBER` slot literal 40 | **REAL EDITS** (AC2) |
| `peer-mesh-wa-templates.ts` | untouched; `PEER_MESH_WA_REMINDER_COPY_KEY = 'peer_mesh_sms.request'` | the constant → the reminder's OWN key (AC5, NB8) |
| `packages/i18n/locales/{en,hi}/claim.json` | only `$comment.suspicion_sms` / `$comment.peer_mesh_sms` sentences appended | the eight text values change; a NEW key pair; `$comment`s (AC2) |
| `docs/launch-gate-inventory/dlt-template-requests-6-19.md` | three dated PROSE notes ("Ramesh S.") | rows, rules, prose, costs and a Record row change (AC2) |
| `apps/jobs/tests/sms-member-name.test.ts` | 19 unit legs incl. the AST caller fence (P-7) | **REWRITTEN**, fence kept and re-aimed (AC1) |
| `claim-suspicion-notices-live.test.ts` · `claim-peer-mesh-requests-live.test.ts` | legs FLIPPED to the short form; one-word legs; fixtures sized for 40 / 41 | **REWORKED** (AC3, AC4, TR3) |
| `claim-suspicion-notice-no-decision.test.ts` | `NOTICE_MODULES` already lists `sms-member-name.ts` | stays; re-run — it fences decision-WRITER names and WRITE forms over the decision tables (comments stripped), which the module never had; it is green today WITH the `@twt/domain` import and stays green without it |
| `.decision-log.md` · `deferred-work.md` · roster · `epics.md` · both routing notes | carry `-377` / `-378` / `-379` and the "Ramesh S." records | append-only: dated notes SUPERSEDE (Task 0.4); ⛔ a ratified sentence is edited |

**G2 — The send core is slot-generic and stays byte-identical.** `checkedValues` requires `Object.keys(values)` to be EXACTLY the template's slot
names (count and membership), each non-`helpline` value ≤ its slot's `maxLength` in code points, and `substituteDltValues` to rebuild the body.
Two boxes are just two slots: nothing to change. ⚠ The core ALSO resolves the Pariwar's helpline for EVERY send and ends
`config:helpline_number_missing` (final `error`, alarm) when it is unset — for a text with ⛔ `helpline` slot too. Both SWEEPS (`helplineGap` in
`claim-suspicion-notices.ts`; the helpline `configSet` in `claim-peer-mesh-requests.ts`) HOLD on the same gap first, so a gap never spends a
once-ever slot (RB12). Under `-379` the appeal-date and neighbours' texts no longer print the number, but the gate stays (NB6 (a)).

**G3 — The shape checker already allows this design.** `checkDltTemplateShape`: `DLT_MAX_VARIABLES` 3; two markers separated by NOTHING
(`NON_SEPARATING` matches `''`) are fine when BOTH are alphanumeric; the fixed-share rule counts every slot at its `maxLength` (UTF-16 length of
the text). Run at authoring on the Panel's words with two 30-letter boxes: **all eight texts clear 30 %** — by the real function on
8 (en), 12 (en), 13 (hi), 14 (en) (`[]`), and by a re-implementation of its arithmetic on all eight: 7 hi 49.3 %, 8 en 44.3 %, 9 hi 47.5 %,
10 en 44.3 %, 11 hi 60.0 %, 12 en 55.4 %, **13 hi 40.0 %, 14 en 34.7 % (the lowest)** — floored to one decimal, as the checker's own message
prints them (`Math.floor(x * 1000) / 10`); 13 / 14 recomputed 2026-10-22 for BigDev's NB7 edit (the word "short" gone: 13 hi fixed 120 of 300, 14 en
fixed 96 of 276 — before the edit 40.9 % / 36.1 %). (At 40-letter boxes 14 en would be 32.4 % — still clear.) Re-run by the v2.1 validate with the real
function over all eight (pre-edit texts): every one `[]`. The registry tests re-run the real checker on all eight (AC2).

**G4 — Template 14 (en) stops being Unicode.** `needsUnicode` reads the TEXT: the em dash of the old English neighbours' text was its ONLY
non-GSM-7 character; with the comma, `needsUnicode(14 en)` is `false` (probed). Several places say otherwise today and must follow: (i)
`apps/jobs/tests/dlt-template-sheet.test.ts` — `UNICODE_ENGLISH = new Set(['sms.dlt.template_id.peer_mesh.request.en'])`, so its
*"needsUnicode agrees with the sheet's cost notes"* leg goes RED unless the set is EMPTIED (TR4); (ii) the sheet's *"Setting up each template in
MSG91"* step (3): *"Unicode for every Hindi template AND for template 14 (its English holds an em dash), Normal for the other English ones"*;
(iii) the sheet's cost lines (G12); (iv) roster Row 32 (d) (*"UNICODE for every Hindi template AND template 14"* — Task 0.4); (v) `docs/adr/ADR-0041-sms-gateway-msg91.md`, two sentences (*"template 14 (en) carries an em dash"*, *"template 14, are Unicode"*) — ADR-0041 is Trustee-ratified (`-358`), so a dated ANNOTATION in the records commit (the 5.13 / ADR-0029 precedent), ⛔ a rewritten sentence; (vi) the JSDoc of `needsUnicode` in `packages/channels/src/dlt-variables.ts` (*"template 14 is English yet holds an em dash"*) — a COMMENT-ONLY edit, AC7's ONE `packages/channels` exception (Task 2.4); (vii) `packages/channels/tests/sms-preflight.test.ts` — a fixture comment and a leg title (*"template 14's shape (English + an em dash) expects UNICODE"*) that use their OWN fixture text, so the leg stays GREEN and only the prose is stale — LEAVE it (⛔ an AC7 edit; it describes a fixture, ⛔ template 14); (viii) `deferred-work.md`'s BF24 item (the non-blocking Panel FYI on the texts' cost — *"≈ 198 characters rendered ⇒ 3 segments; the Hindi ≈ 219 ⇒ 4 — typical; at the registered ceilings (a 40-character name, a 120-character link) 5 segments each — so per text en 3–5, hi 3–5"*) — its English figures (14 en is GSM-7: 170 / 2, 276 / 2 at the ceilings), its typical Hindi figure (13 hi ≈ 194 ⇒ 3 — the helpline phrase and "छोटे" are gone) and its 40-letter ceiling (now 60) are superseded; the Hindi 3–5 RANGE stands (G12: 194 / 3, 235 / 4, 300 / 5): a dated note at Task 0.4. 13 (hi) stays Unicode (Hindi).

**G5 — ⭐⭐ The WhatsApp reminder is DERIVED from the neighbours' text's copy key.** `peer-mesh-wa-templates.ts`:
`PEER_MESH_WA_REMINDER_COPY_KEY = 'peer_mesh_sms.request'` and `PEER_MESH_WA_REMINDER_BODY` (the Meta body, *"to be registered with Meta exactly
as written"*); `peer-mesh-wa-templates.test.ts` renders `t(PEER_MESH_WA_REMINDER_COPY_KEY, { member: '{{1}}', link: '{{2}}', helpline: '{{3}}' })`
and requires it to EQUAL the body. Rewriting `peer_mesh_sms.request` for the SMS (`{member1}{member2}`, no `{helpline}`, a comma) therefore
(a) makes that test throw on a missing param and (b) tempts the dev to "fix" it by editing the Meta body to the new SMS words — which would
change the words written for registration with Meta (Row 35 is open — nothing is registered yet), drop the helpline the Panel's Q2 cost line relies on, and make the reminder's `{{1}}`..`{{3}}` wrong.
⇒ the reminder gets its OWN key holding today's words (NB8, AC5); the SMS key changes alone.

**G6 — The reminder's live leg sizes its premise on the OLD limit.** `claim-peer-mesh-wa-reminders-live.test.ts` *"WR13 / §0 edge (ii) — a name
that FAILS the SMS fit check is sent IN FULL …"*: `LONG_NAME = 'Ramesh Kumar Sharma Venkataraghavan Subramaniam Iyer'` is **52** code points
and `expect(fitsDltAlphanumeric(LONG_NAME)).toBe(false)` is its premise. After `-379` a 52-letter name FITS the SMS, and `fitsDltAlphanumeric`
is removed (NB1) — the import breaks and the leg would stop proving WR13. ⇒ a fixture the SMS rule WOULD change (the Panel's 65-letter example),
and a premise asserted through `smsMemberName` (AC5).

**G7 — The gateway side of two adjacent boxes.** `buildFlowBody` (`packages/channels/src/providers/sms-app.ts`) writes `recipient[name] = value`
for every value — an EMPTY string goes out as `""`; `toGatewayTemplate` renders the MSG91 text as `…##member1####member2##…`; the pre-flight
(`sms-preflight.ts`) compares MSG91's stored text to that form after canonicalisation (NFC, CRLF, trailing whitespace) and keys its memo on the
template id, the text AND the slot names. ⚠ Not settled, and not settle-able here: whether MSG91 accepts an empty variable, adjacent `##a####b##` placeholders, a value
with a leading / trailing space — and whether the operator's scrubber accepts two adjacent alphanumeric variables, an empty one, and Devanagari
(roster Row 30 (d), Row 32 (d); DLT scrubbing failures arrive ONLY in the delivery report — Row 30 note (6)(d)). ⇒ NB3 (b) removes the
empty-value question by construction; the rest are recorded (Task 0.4) and a refusal of the RULED form goes back to the Panel (`-322` C7).

**G8 — The callers today.** Suspicion: `runSuspicionNoticeChild` reads the MODE in its own scope tx BEFORE the claiming transaction, and resolves the NAME after `beginSuspicionNotice` claimed the once-ever row (KYC decrypt → sentinel ⇒ `no_target` → `resolveMemberFacingDeceasedName` → `''` ⇒ `no_target`), then `smsMemberName`, then
`sendClaimDltSms({ render: (helpline) => renderSuspicionNoticeSms(message, locale, { member, helpline, date? }), values: (helpline) => ({ member, date?, helpline }) })`;
after the send it logs ONE warning on `result.helplineNotCallbackNumber`. Neighbours: `readDeceasedName` (the TEXT's wrapper, the ONE edit
point; `readMemberFacingDeceasedName` is the WhatsApp reminder's too) runs ONCE per claim, before any ping is begun; a fault is CLAIM-WIDE;
`render: (helpline) => renderPeerMeshRequest(locale, { member, link, helpline })`, `values: (helpline) => ({ member, link, helpline })`, and a
once-per-child `helplineNotCallbackNumberWarning`.

**G9 — Two live legs assert the helpline warning.** `claim-peer-mesh-requests-live.test.ts` *"AC5b — a helpline that is ⛔ a callback number:
SENT, and ONE warning per child (`-322` C1)"* and `claim-suspicion-notices-live.test.ts` *"⭐ Story 6.34 (`-322` C1) — a helpline that is ⛔ a
callback number: every notice is SENT exactly as today, ONE warning per send"* (`warnings.length === h.sent.length`). The warning says the
operator will reject *"these texts"* because the number is not a callback number — FALSE for a text with ⛔ `helpline` slot (11–14). ⇒ NB6 (b).

**G10 — Value-name sites that read `member`.** Exactly three: `claim-peer-mesh-requests-live.test.ts` (`msg?.values.find((v) => v.name === 'member')`),
`claim-suspicion-notices-live.test.ts` (`memberValueOf`) and `sms-member-name.test.ts` (`s.name === 'member'`). Plus the RENDER-call sites that pass
`{ member: …, helpline }`: the registry tests (`suspicion-notice-sms-templates.test.ts`, `peer-mesh-sms-templates.test.ts`), the suspicion live suite's three
short-form legs (refusal / closed / appeal) and the peer-mesh live suite's three body oracles (the two pre-existing ones of the "each of the five texted ONCE"
and Hindi legs, and the flipped R9 leg) — and ONE LITERAL English appeal body in the suspicion live suite
(`The claim for ${NAME} could not go ahead. It can be appealed until ${ddmmyyyy}. Please call the helpline ${HELPLINE}.`) that must LOSE its helpline (Q2 A).
The refusal / closed bodies (`… कृपया हेल्पलाइन ${HELPLINE} पर कॉल करें।`, three literal assertions) are 7–10 and stay.

**G11 — The i18n catalogue and its gates.** `{member1}` is a valid placeholder (`TOKEN = /\{(\w+)\}/g`); the resolver THROWS on a missing param
and tolerates extras. `microcopy.yaml` lists BOTH `claim.json` files in `scope.copy_globs`, so `pnpm microcopy:check` (`scripts/microcopy/check.ts`: `readRepo` → `checkVocabulary` / `checkTone` / `checkNumerals`, line by line) scans the WHOLE text of both files — `$comment*` LINES INCLUDED (only `scripts/microcopy/claim.test.ts` skips them). So every new string AND every new `$comment` sentence must avoid the banned terms (`passbook`, `receipt`, `invoice`, `report`, `customer`, `donor`, `user`, `Late Teacher`) and the tone / numeral rules — `report` and `user` are easy to write into a comment ("the delivery report", "the user"; probed: both are flagged). None of the NB7 strings contains one. ⚠ `Late` is a TITLE in the code's list, ⛔ copy. `pnpm i18n:check` (parity)
needs the new key in BOTH locales. Two lockstep tests read `$comment.*` by substring: `suspicion-notice-sms-templates.test.ts`
(`'NOT YET HUMAN-REVIEWED'`) and `peer-mesh-sms-templates.test.ts` (that marker + `'Row 28'` + `'must match the registered DLT content byte
for byte'`) — an appended sentence is safe; ⛔ an edit that removes any of them.

**G12 — The registration sheet is code-adjacent.** `docs/launch-gate-inventory/dlt-template-requests-6-19.md` holds, per template 7–14: a
main-table row (config key, the `Variable types` cell, the MSG91 form) and a `| n | text |` row in a wording table. `scripts/dlt-typed-variables`
scans `| n |` rows for a foreign braced tag, and the jobs lockstep tests pin each row EXACTLY (`expectRegisteredTextRow`,
`sheetRowByConfigKey`: `types` parsed with `\b\d+ (alphanumeric|cbn|url|…)\b`, `msg91` = `msg91Form(text, slots)`). It also holds: the Shape rules
(the three-variable justification lines — today 11–12 and 13–14; the *"Two variables side by side"* bullet; the *"≥ 30 % fixed"* "lowest" line; the
*"A variable cannot be the last word"* line naming 8, 10, 12 and 14); the *"Setting up each template in MSG91"* SMS-type step; the wording
sections' *"The variables, in order"* prose; and the cost paragraphs (segments). **Expected new costs** (computed at authoring with the sheet's
own method — it reproduces the sheet's existing "198 characters / 3 segments" for old 14 en): a 19-letter name, a 10-digit helpline, a
10-character date, a 55-character link ⇒ **7 hi 101 / 2; 8 en 88 / 1; 9 hi 96 / 2; 10 en 88 / 1; 11 hi 134 / 2; 12 en 116 / 1; 13 hi 194 / 3;
14 en 170 / 2** (characters / segments; GSM-7 153 per part, Unicode 67); with a 60-letter name ⇒ 7 hi 142 / 3; 8 en 129 / 1; 9 hi 137 / 3;
10 en 129 / 1; 11 hi 175 / 3; 12 en 157 / 1; 13 hi 235 / 4; 14 en 211 / 2; at the registered ceilings (60-letter name, 120-character link) ⇒
13 hi 300 / 5 and 14 en 276 / 2 (run, 2026-10-22, on the NB7 texts as edited by BigDev — "short" gone: 13 hi and 14 en are 5 and 6 characters shorter than the
figures the Panel note was built on, 199 / 176; no segment count changes). The dev re-computes; a mismatch is a finding, ⛔ a number to copy.

**G13 — `Intl.Segmenter` is ICU-dependent.** The "first letter" and the cut's grapheme boundaries come from grapheme clusters. On Node 22.22.2
(ICU 78.2, Unicode 17.0): `श्रीवास्तव` → `["श्री","वा","स्त","व"]`, `शर्मा` → `["श","र्मा"]`; `(Late)` → first letter-bearing grapheme `L`; `​Iyer`
(a zero-width space first) → `I`; `-` has none. An older ICU splits conjuncts differently. ⇒ expected values are COMPUTED through the same
segmenter, ⛔ transcribed; literals are ASCII only ([[feedback_stub_must_call_not_transcribe]]). Counts are CODE POINTS (`[...s].length`) — ⛔
UTF-16, ⛔ graphemes (what the Panel was told about the 40-character slot on 2026-10-18, `…-6-27c-neighbours-text-long-name.md`: *"counting every letter, space and mark"*; the `-379` note says only "letters").

**G14 — The rule was run before it was written down.** A scratch reference of N1–N5 + NB3 (b) (⛔ committed) reproduced the Panel's own example
literally — `"Kumar Venkata Satya Narayana Murthy Subrahmanyam Swaminathan Iyer"` (65) → `"K V Satya Narayana Murthy Subrahmanyam Swaminathan Iyer"`
(55) — and held every invariant over 20,000 seeded names (a cut exists for every length 2..60; 0 violations). AC1's literals below were all run.

**G15 — Production is all `full_name`.** The domain WRITER of `pariwar_public_name_presentation.mode` exists (`setPublicNamePresentationMode`,
`packages/domain/src/kyc/presentation-policy.ts`) but has ⛔ production CALLER (none in `apps/api`, `apps/admin` or `apps/jobs` outside tests); the
`shielded_name` path is reachable in tests only (the `SHIELDED` Pariwar of the suspicion live suite) ⇒ in production the input is the stored name,
trimmed and whitespace-collapsed (`resolveMemberFacingDeceasedName`'s `full_name` arm: `trim().split(/\s+/)…join(' ')`).

**G16 — ⛔ Text is live.** No claim-text template id (1–14) is provisioned (roster Row 32 (i), Row 30 note (8)); the app is ⛔ in production. A
merge changes no family's phone ([[project_not_in_production_merge_is_not_golive]]). ⛔ A merge fence. Re-registration of a changed template
is therefore not owed — none was ever submitted.

**G17 — The AST fence's regex is anchored.** `MODULE_SPECIFIER = /\/sms-member-name(?:\.js)?$/` matches `./sms-member-name.js` but NOT
`./sms-member-boxes.js` — so the registries importing the boxes file do not turn into "callers" of the function (the reason NB1 puts the slots in
a SIBLING file, ⛔ in the function's module).

**G18 — No new dependency.** `fast-check` is a `devDependency` of `packages/domain` only; `apps/jobs` has none. The property legs use a seeded
deterministic generator (a 32-bit LCG, as in the scratch run) — ⛔ a lockfile change ([[feedback_no_premature_package]]).

**G19 — Other stories.** No rival story owns this work (every other story mentioning `name_too_long` / `smsMemberName` / `peer_mesh_sms.request`
is `done`; grepped 2026-10-22). Branches that show as "ahead of main" on the registries / `claim.json` (`story/6-24b-…`, `6-34-…`, `6-19*`,
`6-28-…`, `11b.*`, their `origin/` twins) are LANDED stories' pre-rebase heads — ⛔ live work; Task 0.1 re-checks anyway.

## ⚖️ Build decisions NB1–NB9 (PROPOSED — BigDev answers at Task 0.2; each ⭐ recommendation is what Tasks 1–7 build)

- **NB1 — Where the pieces live.** ⭐ **(a) Recommended:** two modules in `apps/jobs/src/scheduler/`. `sms-member-boxes.ts` (new, pure, ~25 lines):
  `MEMBER_BOX_MAX = 30`, `MEMBER_NAME_MAX = 2 * MEMBER_BOX_MAX` (60) and `MEMBER_BOX_SLOTS: readonly [DltSlot, DltSlot]` (`member1`, `member2`, both
  `alphanumeric`, `maxLength: MEMBER_BOX_MAX`, labels *"deceased member name — first part"* / *"— second part"*); both registries import the slots from it
  (so the 30 exists once, and the two registries cannot disagree). `sms-member-name.ts` (rewritten) holds the function and imports only the boxes
  file. `fitsDltAlphanumeric` LEAVES `peer-mesh-sms-templates.ts` (its meaning — "≤ 40" — is gone; `fitsDltUrl` stays). **Cost:** one more
  file; two importers of the old predicate change (G6, TR2). **(b)** One module holding the function AND the slots. **Cost:** the registries then
  IMPORT the function's module and the AST fence (G17) must be re-aimed to two facts (calls = the two senders; imports = senders + registries).
  **(c)** Keep `fitsDltAlphanumeric` as the box fit. **Cost:** a predicate named for the 40-ceiling now means 30 — a reinterpretation, and the WhatsApp
  leg's premise would silently change meaning ([[feedback_supersede_never_reinterpret]]).

- **NB2 — Its shape.** ⭐ **(a) Recommended:** `smsMemberName(resolvedName: string): SmsMemberName` with
  `SmsMemberName = { readonly kind: 'full' | 'shortened'; readonly name: string; readonly boxes: readonly [string, string] } | { readonly kind: 'too_long' }`
  — `name === boxes[0] + boxes[1]`; `full` iff the name AS PASSED is ≤ 60 code points (returned byte-for-byte). The input is the MODE-RESOLVED name
  (G15) — ⛔ the stored name, ⛔ the mode (the neighbours' shared reader returns only the resolved name). It THROWS a fixed, name-free message
  (`'[jobs] sms-member-name: an empty or whitespace-only name (a caller bug)'`, pg-boss keeps a failed job's error — N7) on `''` or a
  whitespace-only name — unreachable from both callers (each turns `''` into `unresolvable` first); returning `too_long` for it would let a blank
  `{member}` be SENT. **Cost:** a throw after the once-ever row is claimed (suspicion) or before any ping is begun (neighbours) — as accepted in `-377`
  SN2. **(b)** Take `(mode, storedName)`. **Cost:** the shared reader would have to return the stored name — a change to 6.31's reader (N6).

- **NB3 — How the name is divided between the two boxes** (`-378` §0: the author's). ⭐ **(b) Recommended — never an empty box, cut near the middle.**
  For a name of n ≥ 2 code points cut at an offset `c` with `max(1, n−30) ≤ c ≤ min(30, n−1)`, on a grapheme boundary, preferring an offset with
  ⛔ whitespace on either side of it, and among those the one nearest `n/2` (a tie ⇒ the smaller `c`). If no such offset exists — a name of 59–60
  code points whose only admissible offsets (`{30}` or `{29, 30}`) are whitespace-adjacent OR fall inside one grapheme cluster (a Devanagari
  conjunct, a ZWJ sequence, combining marks straddling offset 30 — REACHABLE: over synthetic 60-code-point Devanagari names about half have no
  cluster boundary at 30) — take the nearest grapheme boundary in range, then any offset in range (a cut inside the cluster — box 2 may then begin
  with a combining mark) — the name is STILL sent whole (N1). The alternative, `too_long` for such a name, contradicts N1 and is ⛔ taken; the
  box-value question is Row 30 (d)'s (Task 0.3 / 0.4).
  n = 1 is the one degenerate case (`[x, '']`; unreachable for a real name). The SMS is byte-identical either way — the gateway CONCATENATES the
  two values. Examples (run): `"Ramesh Kumar Sharma"` → `["Ramesh Ku", "mar Sharma"]`; the Panel's 55-letter shortened example →
  `["K V Satya Narayana Murthy S", "ubrahmanyam Swaminathan Iyer"]`; 29 `A` + space + 30 `B` (60) → `["A…A␠"(30), "B…B"(30)]`. **Why:** the Panel's own note lists
  three operator unknowns about this design — an EMPTY second box, two boxes with nothing between them, and the unit (30 vs 40). (b) removes the
  first by construction, and by keeping BOTH boxes as short as the name allows it is the least likely to trip a smaller-than-assumed limit; an
  operator or MSG91 that refuses an empty variable would otherwise turn nearly every text into a failure that arrives ONLY in the delivery report
  (Row 30 note (6)(d)), stored `accepted`. **Cost:** a short name goes to the gateway as two fragments — in MSG91's request body and dashboard, ⛔ in
  the SMS; one more rule and more legs. **(a)** Fill box 1 first; a name of ≤ 30 leaves box 2 EMPTY (`''`); a longer one cuts at the latest allowed
  offset (same whitespace / boundary preferences). **Cost:** depends on the operator AND MSG91 accepting an empty variable — which the Panel
  was told is unknown; if refused, the fix is (b) and a re-test. (If BigDev picks (a): N5's "never empty" is dropped, AC1 legs (c)/(d) change as
  AC1 says, and Row 30 (d) keeps the empty-value question OPEN instead of avoiding it.)

- **NB4 — The author's readings of the Panel's shortening words** (recorded in the rework entry; each MATCHES — §0 re-run). ⭐ **(a) Recommended:**
  (i) a **word** is a whitespace-separated run (`"Sri-Ram"` is one word); (ii) a word is a **title** when, after NFC normalisation, removing ONE
  trailing `.` and lower-casing, it equals a list entry (`shri sri smt shrimati sushri dr late mr mrs ms ji श्री श्रीमती सुश्री डॉ स्व स्वर्गीय जी`) —
  so `SHRI`, `Dr.`, `स्व.` are titles; `Shrikant`, `Drake`, `Jiya`, `Kumari`, `Devi`, `Kumar`, `Bai` are not; wrapping punctuation is ⛔ stripped —
  `(Late)` is a WORD, ⛔ a title, and initialises to `L` (AC1 (i)); `Dr..` (two stops) is ⛔ a title; (iii) the title step drops EVERY title
  at once, wherever it stands (including a trailing `Ji`), and ONLY when the name is above 60 (⛔ at ≤ 60 — N2 (i), AC1 (g), TR10); (iv) if nothing is left, `too_long`; (v) a word's
  **first letter** is the first grapheme cluster that holds a letter or a digit (a leading `(` or an invisible mark is skipped); a word with none (`-`)
  is left as is; the initial carries ⛔ a full stop (`K.` → `K`); (vi) the initials walk covers every word except the LAST word *after* the titles
  are gone, stops the moment the joined name is ≤ 60, and joins with single spaces — so the title step and the walk RE-JOIN with single spaces, and a
  name over 60 only through extra internal whitespace comes back `shortened` and single-spaced (unreachable from the callers: the resolver collapses);
  (vii) a one-word name above 60, or one that still does not fit with every earlier word THAT HAS a first letter replaced by it, is `too_long`.
  **Cost:** case-insensitive matching drops `LATE` — which is the point (Aadhaar names are often
  upper-case); a given name that IS a title word (`Dr`, `Ji`) would be dropped above 60 — the Panel's closed list, accepted; JOINED initials written
  as one word (`MS`, `MR`, `DR` — a South-Indian convention) are read as the title and dropped above 60, where initialising would have kept one
  letter (`"MS Venkata …"` → `"V …"` when the name is STILL above 60 after the drop — else `"Venkata …"`, the drop alone; `"M S Venkata …"` keeps `M S`) — a small cost, recorded in the rework entry. **(b)** Exact-case, no
  trailing stop. **Cost:** an upper-case Aadhaar name keeps `SHRI` and shortens by initials instead — a worse outcome for the same names.

- **NB5 — A still-too-long name in the suspicion path.** ⭐ **(a) Recommended:** pass the WHOLE over-long mode-resolved name as `member1` and `''` as
  `member2` to the send core, which refuses it (`value_too_long`, > 30 in `member1`) with the alarm, as today (`-379` Q1 A (4); `-377` SN4). The
  `''` is sent ⛔ — the core refuses BEFORE the network. **Cost:** the once-ever row is claimed before the refusal (as today); the choice of
  `member1` is coverage-only BY DESIGN (the core ends `value_too_long` either way — AC8). **(b)** Refuse before the send with a new `no_target`
  detail. **Cost:** a new detail value (vocabulary + mirrors) and a different stored outcome than "as today".

- **NB6 — The helpline in 11–14.** ⭐ **(a) Recommended — keep the presence gate:** the sweeps and the core still require the Pariwar's helpline for
  ALL four texts (G2); ⛔ send-core change. The texts still say "call the helpline" / "call us"; a Pariwar with no helpline provisioned has nobody
  to call, so HOLD stays the safe direction. **Cost:** a missing helpline delays two texts that no longer print the number. **(a′)** drop the gate
  for 11–14. **Cost:** a core change and a per-template branch for a small gain. ⭐ **(b) Recommended — suppress the not-a-callback-number warning
  where the template has no `helpline` slot** (G9): the two callers log it only when `entry.slots.some((s) => s.name === 'helpline')`.
  **Cost:** one conditional per caller; the two G9 legs change (the neighbours' leg now asserts ⛔ warning and still `accepted`; the suspicion leg
  counts warnings only for the sends whose template carries the helpline). **(b′)** keep the warning. **Cost:** a standing alarm about a number
  the text does not contain — and a false statement that operators "will reject these texts".

- **NB7 — The eight registered texts, and the Hindi.** ⭐ **(a) ACCEPTED by BigDev 2026-10-22 WITH ONE EDIT (Debug Log (a)):** exactly these (en = the Panel's
  words + the box variable — EXCEPT 13 / 14, where BigDev dropped the word *"short"* from the ratified *"a few short questions"* (en) / *"कुछ छोटे प्रश्नों"* (hi);
  the helpline addition of 7–10 is the build's, as before). Hindi is the author's (agent-authored, ⛔ human-reviewed — Rows 23 / 28):
  `7` hi `{#var#}{#var#} के लिए किया गया एक दावा आगे नहीं बढ़ सका। कृपया हेल्पलाइन {#var#} पर कॉल करें।` ·
  `8` en `A claim for {#var#}{#var#} could not go ahead. Please call the helpline {#var#}.` ·
  `9` hi `{#var#}{#var#} के लिए आपका दावा बंद कर दिया गया है। कृपया हेल्पलाइन {#var#} पर कॉल करें।` ·
  `10` en `Your claim for {#var#}{#var#} has been closed. Please call the helpline {#var#}.` ·
  `11` hi `{#var#}{#var#} के लिए किया गया दावा आगे नहीं बढ़ सका। इसके विरुद्ध {#var#} तक अपील की जा सकती है। कृपया हेल्पलाइन पर कॉल करें।` ·
  `12` en `The claim for {#var#}{#var#} could not go ahead. It can be appealed until {#var#}. Please call the helpline.` ·
  `13` hi `हमें बताया गया है कि {#var#}{#var#} का निधन हो गया है। यदि आप उन्हें जानते थे, तो कृपया कुछ प्रश्नों के उत्तर दें: {#var#}, या हमें कॉल करें।` ·
  `14` en `We have been told that {#var#}{#var#} has died. If you knew them, please answer a few questions: {#var#}, or call us.`
  Slots in order: 7–10 `member1`, `member2`, `helpline` (cbn, ≤ 14); 11–12 `member1`, `member2`, `date` (alphanumeric, ≤ 10); 13–14 `member1`, `member2`,
  `link` (url, ≤ 120). The Hindi changes are minimal: 7 / 9 gain only the second box; 11 loses only the `{helpline}` variable (*"कृपया हेल्पलाइन पर कॉल करें।"* — the postposition पर stays); 13 swaps *"— या हेल्पलाइन {helpline} पर कॉल करें"* for
  *", या हमें कॉल करें"* (the comma "the same way" as the English) AND drops *"छोटे"* (BigDev's edit, with the English). **Cost:** the Hindi reviewers (Rows 23 / 28) re-review three changed sentences; unreviewed
  Hindi is already a go-live gate (not a new one). **(b)** Keep the Hindi dash in 13. **Cost:** the English and Hindi differ in punctuation for no reason.
  ⚠ The dropped "short": the WhatsApp reminder (NB8) and the app chrome (`peer_request.title` / `peer_request.card_body`, `-311` PM11) still say *"a few short
  questions"* — ⛔ changed by this story (the reminder's words are the Panel's / `-365`; the chrome is agent copy, out of scope); the SMS alone says *"a few questions"*.

- **NB8 — The WhatsApp reminder keeps today's words under its OWN copy key.** ⭐ **(a) Recommended:** a NEW key pair `peer_mesh_wa.reminder`
  (en + hi) in `claim.json` holding, byte for byte, today's `peer_mesh_sms.request` values (`{member}`, `{link}`, `{helpline}`, the em dash);
  `PEER_MESH_WA_REMINDER_COPY_KEY` points to it; `PEER_MESH_WA_REMINDER_BODY` and the lockstep test are otherwise ⛔ edited (G5); a
  `$comment.peer_mesh_wa` (both locales) says why the reminder no longer shares the text's words (`-379` *Not covered*, Q2 A's cost line,
  `-365` WR6) and that a wording change is the Panel's. The 6.37e rework entry records the divergence from "the same words" of `-303` Q1 A as
  MATCHING the Panel's own cost line — in terms: *"`-303` Q1 A's 'same words' now holds for the NAME and the substance, ⛔ for the helpline, the
  dash and the word 'short' — the first two entailed by `-379` Q2 A's ratified cost line ('those who chose WhatsApp also get the number in the WhatsApp
  reminder') and `-379` Not covered; the third BigDev's Task 0.2 edit to the SMS alone (Debug Log (a))"*. The reminder keeps *"a few short questions"*.
  **Cost:** the reminder's words are duplicated in the catalogue (deliberately). **(b)** Keep
  `peer_mesh_sms.request` for the reminder and mint a new key for the SMS. **Cost:** the SMS registry's `copyKey`, `$comment.peer_mesh_sms` and
  every reference to the text's key move — a rename across the SMS side for the sake of the exception.

- **NB9 — Records and gates.** ⭐ **(a) Recommended:** ⛔ new roster row (the change rides the existing gates, G16 — `-377` SN6 in substance, kept); ⛔ a Panel note; the 6.37e
  rework entry (`-380`, author-commit) records NB1–NB9, the supersession of `-377` SN2 / SN3 / SN7 (and of SN1's two import clauses and SN6's Consequence-1 records list), and "Does NOT cover"; the records commit
  is Task 0.4. **Cost:** none beyond the writing. **(b)** A new roster row for the operator's answers on two boxes. **Cost:** a row that restates
  Row 30 (d), which already owns exactly those questions.

## 🏛️ Panel questions: NONE

`-379` answered both. The §0 re-run above found every edge a MATCH or the author's, so this story writes ⛔ routing note and ⛔ told item. If
the dev finds an edge that is NOT a match (an unlisted title the Panel meant, a name class the rule mishandles), STOP and apply the template's §0
GATE FIRST — most such edges are the author's; route only a ratified clause that must be superseded, narrowed or extended.

## Acceptance Criteria

Notation: unit legs are pure vitest (`env -u DATABASE_URL`); live legs run on :5433 with `DATABASE_URL` set EXPLICITLY; every send through the
existing fake gateway (⛔ network); "⛔ sent" asserted with the harness's `sent` array; expected strings COMPUTED through the real functions
(`smsMemberName`, `renderSuspicionNoticeSms`, `renderPeerMeshRequest`, `formatAppealUntil`, the real `t()`) — ⛔ transcribed, except the ASCII literals
named here, each of which was run (G14).

1. **AC0 — Governance before code.** Task 0 is done before any `apps/` / `packages/` change (the `claim.json` `$comment` sentences of Task 0.4
   excepted — documentation): NB1–NB9 answered and recorded VERBATIM; the 6.37e rework entry committed ALONE; the records commit after it.
   ⛔ A registered-text row of the sheet changes in the records commit (it would break the lockstep tests between commits — Task 2.5 carries it
   with the code).

2. **AC1 — The ONE function (NB1–NB4).** `smsMemberName` exists in ONE place (`apps/jobs/src/scheduler/sms-member-name.ts`), is pure, and is called
   by exactly the two text senders; the 30 / 60 and the two box slots exist in `sms-member-boxes.ts` only.
   ⭐ **The source leg** (kept from the v1.6 review's P-7 — the TypeScript AST, ⛔ a comment-stripping regex, which `'src/*.ts'` blinds): walk
   `apps/jobs/src` (skipping `node_modules` / `dist`, keyed by REPO-RELATIVE path); the set of files whose CODE imports from
   `./sms-member-name.js` OR calls `smsMemberName(…)` / `x.smsMemberName(…)` must EQUAL exactly
   `['apps/jobs/src/scheduler/claim-peer-mesh-requests.ts', 'apps/jobs/src/scheduler/claim-suspicion-notices.ts']` (`toEqual`; the module excluded by its
   full path and asserted present in the walk). The registries importing `./sms-member-boxes.js` are ⛔ callers (G17). Positive controls as v1.6:
   a plant in a third file IS caught; a commented plant and a naming-only string are ⛔ callers; a REAL call placed AFTER a glob string (`'src/*.ts'`) or a `' //'` string IS caught (the old regex strip's blind spot), as are a dynamic `import()`, a re-export and a member call. **Re-aimed I4 checks (N4):** `fitsDltAlphanumeric` is declared / called in ⛔ file
   of `apps/jobs/src` (the 40-limit predicate must not come back); the title-list literal (`'shrimati'`) appears in code only in `sms-member-name.ts`;
   `MEMBER_NAME_MAX` is referenced in code only in `sms-member-boxes.ts` and `sms-member-name.ts`; each with its own plant. ⚠ The existing fact
   matches an EXACT string-literal node (`n.text === 'shielded_name'`); NB4 writes the title list as ONE space-separated string, so the re-aimed
   fact must match a string literal whose text CONTAINS `shrimati` (`n.text.includes(…)`), and its plant likewise — else the leg is RED on a
   correct module.
   Unit legs (literals are ASCII and were run — the one exception is (d)'s cluster leg, whose INPUT is Devanagari and whose expectations are structural and computed; every other expectation is computed):
   (a) **boundary** — `'a'.repeat(60)` ⇒ `full`, `name` byte-identical; `'a'.repeat(61)` ⇒ `too_long`; a 60-code-point two-word name ⇒ `full`;
   (b) **concatenation** — for every `full` / `shortened` result `boxes[0] + boxes[1] === name`; for `full`, `name === ` the input AS PASSED (internal double spaces kept — the resolver
   already collapsed them);
   (c) **box bounds** — over EVERY length 2..60 (one word and two words) each box is ≤ 30 code points and (NB3 (b)) ⛔ empty; n = 1 ⇒ `[x, '']` (the one degenerate case);
   (d) **the cut** (NB3 (b)) — `"Ramesh Kumar Sharma"` ⇒ `["Ramesh Ku", "mar Sharma"]`; `'A'.repeat(20)` ⇒ 10 | 10; `'A'.repeat(60)` ⇒ 30 | 30; a cut is ⛔ beside whitespace
   when one exists — a leg with a space at the nearest-to-middle offset moves the cut to the next offset that is clean; **the forced cut** — `'A'.repeat(29) + ' ' + 'B'.repeat(30)`
   (60) ⇒ still `full`, `["A…A␠", "B…B"]` (the first box ends in the space: N1 outranks the cosmetic); **the forced cut inside a cluster** (COMPUTED, G13) —
   `'a'.repeat(29) + 'क्ष' + 'b'.repeat(28)` (60 code points; the conjunct straddles offset 30) ⇒ still `full`, both boxes exactly 30 code points,
   `boxes[0] + boxes[1] === name` (box 2 begins with the virama — N5's recorded case);
   (e) **the Panel's own example** — `"Kumar Venkata Satya Narayana Murthy Subrahmanyam Swaminathan Iyer"` (65) ⇒ `shortened`, `name === "K V Satya Narayana Murthy Subrahmanyam Swaminathan Iyer"` (55), and the
   result is `"K V …"` ⛔ with full stops;
   (f) **titles, case, stop** — above 60, `Shri ` / `SHRI ` / `Dr.` / `Late` / `Mr.` / `स्व.` / `श्री` are dropped (a 61-code-point name that is 56 without `Shri ` ⇒ `shortened`, ⛔ initials);
   `Kumari` `Devi` `Kumar` `Bai` are ⛔ dropped as titles (a name where they stand early becomes `K D Kumar Bai …` by INITIALS, not by the title step); `Shrikant`, `Drake`, `Jiya` are ⛔ titles;
   (g) **titles only above 60** — a ≤ 60 name carrying `Shri` is returned as passed; a trailing `Ji` is dropped only above 60, and then the new LAST word is protected;
   (h) **never the last word** — in every `shortened` result the final word equals the final word of the title-stripped input; `'B ' + 'A'.repeat(61)` ⇒ `too_long`; a titles-only name above 60 ⇒ `too_long`;
   (i) **first letter** — `"(Late) …"` initialises to `L`; `"K. …"` to `K` (⛔ a stop); a `-` word is left as is; an invisible first mark is skipped (computed through the same segmenter, G13);
   (j) **code points** — an ASTRAL one-word name of 60 code points (120 UTF-16 units) ⇒ `full`; 61 ⇒ `too_long` (the only input that tells code points from UTF-16 — a leg must be able to fail);
   (k) **the guard** — `''`, `'   '` and `' '.repeat(61)` ⇒ throw the fixed, name-free message;
   (l) **a seeded sweep** (32-bit LCG, ≥ 5,000 names mixing short / long Latin words, titles, initials and a few Devanagari words — generated TRIMMED and single-spaced, as the resolver delivers them) holding N1–N5: concatenation; bounds; `full` iff ≤ 60 as passed; `shortened` ⇒ ≤ 60 and last word preserved;
   `too_long` ⇒ the title-stripped name is empty OR the form with every earlier word THAT HAS a first letter replaced by it (the last word kept) is still > 60;
   **If BigDev picks NB3 (a)** (fill box 1 first): (c) allows an EMPTY box 2 for every name of ≤ 30 and asserts box 1 holds the whole name; (d)'s literals become `["Ramesh Kumar Sharma", ""]` and `['A'.repeat(20), '']`, and for n > 30 the cut is the LATEST allowed offset (same whitespace / boundary preferences); the AC8 mutants "an empty box 2" and "always cut at 30" are dropped. Everything else stands.
   (m) **the shared limit** — `MEMBER_BOX_SLOTS` are `alphanumeric`, both `maxLength === MEMBER_BOX_MAX`, `MEMBER_BOX_MAX ≤ DLT_TYPE_MAX_LENGTH.alphanumeric`, `MEMBER_NAME_MAX === 2 * MEMBER_BOX_MAX`; BOTH registries' name slots are those SAME objects (`toBe`) — with a positive control (a planted DIFFERENT slot object, whatever its `maxLength`, fails the reference check — the control proves the check runs, ⛔ that an unequal ceiling is detected; the ceiling itself is the `maxLength === MEMBER_BOX_MAX` assertion).

3. **AC2 — The registries, the copy and the sheet in lockstep (NB1, NB7, NB8).**
   (1) `SUSPICION_NOTICE_SMS_TEMPLATES` and `PEER_MESH_REQUEST_SMS_TEMPLATES` carry the eight registered texts of NB7 and the slots of NB7 (the two
   box slots first, from `sms-member-boxes.ts`); `SuspicionNoticeSmsVars` is `{ member1, member2, helpline?, date? }` and `PeerMeshRequestSmsVars`
   `{ member1, member2, link }`; the renderers THROW when a variable their message needs is absent (`appeal_notice` needs `date`; `refusal_notice` /
   `closed_notice` need `helpline`). That ⛔ `helpline` reaches 11–14 is proved at the `values` (TR7 — a stray name is `values_mismatch` at the core;
   AC3 / AC4's sent `values` carry exactly the slot names), ⛔ at the render: `t()` ignores an extra param, so a render-side assertion cannot fail.
   (2) `checkDltTemplateShape(text, slots)` is `[]` for ALL EIGHT (the real checker — ⛔ the scratch re-implementation); `needsUnicode(14 en)` is `false`, the Hindi ones `true`.
   (3) `claim.json` (en + hi): `suspicion_sms.{refusal_notice,closed_notice,appeal_notice}` and `peer_mesh_sms.request` hold the NB7 strings with `{member1}{member2}` / `{helpline}` /
   `{date}` / `{link}`; `i18nParamNames(value)` (`apps/jobs/tests/_dlt-template-sheet.ts`, beside `msg91Form` / `expectRegisteredTextRow` / `sheetRowByConfigKey`) equals `slots.map(s => s.name)` in order; the real `t()` renders EXACTLY the registered text with each slot as the marker. The en 12 and 14 are the Panel's words
   byte for byte (`-379` Q2 A) — EXCEPT that 14 (and 13) read *"a few questions"*, the ratified *"a few short questions"* minus "short" (BigDev's Task 0.2 edit, Debug Log (a); the only
   departure from the ratified words in the eight texts); 8 and 10 are the Panel's `-262` / `-291` words plus the helpline, with the box variable.
   (4) The sheet (Task 2.5): the main-table rows 7–14 (`Variable types`: `1 alphanumeric (… first part, ≤ 30) · 2 alphanumeric (… second part, ≤ 30) · 3 cbn / alphanumeric / url`;
   `MSG91 template`: `msg91Form` — `##member1####member2##`), the `| n |` registered-text rows 7–14, the wording sections' prose, the Shape rules, the MSG91 SMS-type step, the cost
   paragraphs (G12 — the dev's recomputed numbers) and a Record row; the three-variable justification lines now cover 7–10 (the helpline is the only action the text asks for),
   11–12 (the date is the substance of the notice — `-293`) and 13–14 (the link IS the request — `-303`), each also saying *"the name needs two boxes (`-379` Q1 A)"*. The THREE `-377` dated notes
   ("Ramesh S." — after the wording of 7–12, after 13–14, and in the Shape rules' *"Another type for `{member}` / `{date}`"* bullet) are ⛔ edited; a dated note under each says they are SUPERSEDED.
   (5) `dlt-template-sheet.test.ts`: `UNICODE_ENGLISH` is EMPTY and its comment says why (G4); the *"covers sixteen distinct sheet rows"* and the gateway-form legs stay green.
   (6) `$comment.suspicion_sms` / `$comment.peer_mesh_sms` (both locales) get a dated sentence APPENDED (the three lockstep substrings kept — G11); the NEW `peer_mesh_wa.reminder` pair and `$comment.peer_mesh_wa` exist in BOTH locales.
   (7) `pnpm microcopy:check`, `pnpm microcopy:test`, `pnpm i18n:check`, `pnpm dlt-typed-variables:test` and `pnpm dlt-typed-variables:check` pass (`git add` the new files first — the DLT gate scans TRACKED files only, so an untracked file is skipped SILENTLY).

4. **AC3 — The three suspicion texts carry the name across two boxes (NB5, NB6).** Live legs in `claim-suspicion-notices-live.test.ts`, for EACH of
   `suspicion_refusal`, `closed_after_appeal` and `refusal_appeal_notice` (the three slot shapes: `[member1, member2, helpline]` ×2 and `[member1, member2, date]`).
   The harness already builds each: `suspicion_refusal` ← `refusedS`; `closed_after_appeal` ← `refusedS(d)` (S) → `claimOf(d, 'documents_pending')` (R) → `allowAppeal(d, s)`, tick `[r, s]`;
   `refusal_appeal_notice` ← `refusedS` + `contact(d, s, { linked: null })` — ⛔ `openAppeal` (a filed appeal SUPPRESSES that notice). The v1.x legs proved the
   `isolated()` Pariwar + `harness({ allow: [own] })` + `allowAppeal` combination works. Four things the oracle needs (carried from v1.x, still true): **(1) the date** —
   `renderSuspicionNoticeSms` THROWS for `appeal_notice` without a date; pass a fixed `refusedS(d, { decidedAt })` and compute `formatAppealUntil(claim.suspicionRefusalAppealUntil(decidedAt))`
   with the REAL function; **(2) the locale** — `hi` for the refusal and closed notices, the claim's `contact_locale` for the appeal notice; **(3) which message** — select it by its expected
   computed BODY; **(4) imports** — the suite already imports `notifications`, `renderSuspicionNoticeSms` and `formatAppealUntil`; only `smsMemberName` is new.
   - the existing "(a) ONE row + ONE text to A … the FULL name" leg and the `SHIELDED` ("Ramesh S.") leg: body UNCHANGED (the boxes concatenate); where they read `values`, by the two box names (G10);
   - the **FLIPPED** *"6.37 review round 2 P2 — FLIPPED by 6.37e (`-359` B) …"* (RENAME it — its title says "the shorter form"): its 45-code-point name now SENDS WHOLE (`accepted`) across two boxes — for each of the three purposes: `member1 + member2` equals the name, the body equals
     `renderSuspicionNoticeSms(message, locale, { member1, member2, … })` with the boxes taken from `smsMemberName`, the appeal notice still carries its date; the "values rebuild the body" oracle sees no miss;
   - a NEW leg — the Panel's 65-letter example (a `full_name` Pariwar, `suspicion_refusal`) ⇒ `accepted`, the sent boxes concatenate to `"K V Satya Narayana Murthy Subrahmanyam Swaminathan Iyer"`;
   - a NEW leg — a name with titles above 60 (e.g. `Shri` + words) ⇒ `accepted`, titles gone, ⛔ initials;
   - the **one-word** leg (the v1.x "keeps TODAY's outcome" leg, RE-SIZED to > 60 — TR3): a DISTINCTIVE one-word name of 75 code points (`'Venkatanarayana'.repeat(5)`) ⇒ final `error` `dlt_template_not_approved:value_too_long` + the alarm naming the claim id, ⛔ sent (NB5);
   - the helpline-warning leg (G9, NB6 (b)): today it seeds only `refusedS(d)` — ONE send, the refusal text, which carries the helpline — so the suppression mutant would leave it GREEN. ADD `contact(d, s, { linked: null })` so the appeal-date text is sent too: every notice is SENT exactly as today; warnings are counted ONLY for the sends whose template carries the helpline (the refusal text) and ⛔ for the appeal-date text. Only then is the leg RED under AC8's "warning left unconditional".
   For a name that fits one box the BODY of the refusal and closed notices is byte-unchanged (the boxes concatenate) — their three literal body assertions stay green UNCHANGED. The
   APPEAL notice's body CHANGES by `-379` Q2 A (no helpline): its literal English assertion (`… Please call the helpline ${HELPLINE}.`) becomes `… Please call the helpline.`, and every
   `renderSuspicionNoticeSms(…, { member, helpline, … })` call in the suite takes `member1` / `member2` (the appeal notice's takes ⛔ `helpline`).

5. **AC4 — The neighbours' text carries the name across two boxes (NB6).** Live legs in `claim-peer-mesh-requests-live.test.ts`:
   - the **R9 leg FLIPPED** again — `'A'.repeat(20) + ' ' + 'B'.repeat(20)` (41) now ⇒ every selected neighbour texted WHOLE (`accepted`), `member1 + member2` the name, the body = `renderPeerMeshRequest(locale, { member1, member2, link })`, ⛔ alarm;
   - a NEW leg — the Panel's 65-letter example ⇒ every neighbour texted the 55-letter shortened form;
   - the **one-word** leg RE-SIZED (TR3): a DISTINCTIVE 75-code-point one-word name ⇒ every ping `no_target:name_too_long`, ⛔ replaced, ⛔ texted, ⛔ alarmed (today's R9 assertions);
   - *"AC5b — a re-claimed row with a NAME fault …"*: the fixture changes from `'A'.repeat(41)` to a name that STILL faults — `'A'.repeat(61)` — its assertions UNCHANGED;
   - *"AC5b — a helpline that is ⛔ a callback number …"* (G9): FLIPPED — the texts are SENT and ⛔ warning is raised (the template has no helpline slot);
   - the suite header line *"`name_too_long` texts ⛔ one"* is updated (true only for a name that cannot fit);
   - EVERY neighbours' body changes by `-379` Q2 A (the dash a comma, no helpline): the three `renderPeerMeshRequest(…, { member, link, helpline })` oracles (the two pre-existing "each of the five texted ONCE" / Hindi legs and the flipped R9 leg) take `{ member1, member2, link }` and stay COMPUTED, ⛔ transcribed.

6. **AC5 — The WhatsApp reminder is untouched (N6, NB8).** `readMemberFacingDeceasedName`'s BODY is byte-identical to `baseline_commit` (`git diff` check in the Debug Log); its JSDoc's
   last sentence (*"⚠ Row 6-37e (`-362`'s short-name fallback) edits the TEXT's step there — ⛔ this function."*) names the superseded fallback — re-word that ONE sentence (`-379`'s full-name
   rule; still "⛔ this function") as a COMMENT-ONLY edit (Task 4.1); ⛔ another character of the JSDoc.
   `PEER_MESH_WA_REMINDER_BODY` is byte-identical; `PEER_MESH_WA_REMINDER_COPY_KEY` is `peer_mesh_wa.reminder`; `peer-mesh-wa-templates.test.ts` is green with ⛔ edited assertion (its `t(KEY, { member: '{{1}}', link: '{{2}}', helpline: '{{3}}' })`
   still renders EXACTLY the body — THAT lockstep leg is what proves the new key carries the registered words). The byte-identity is a Debug Log check, ⛔ a test (a test reading git history would break in a shallow CI checkout):
   `git diff 1e22889e -- apps/jobs/src/scheduler/peer-mesh-wa-templates.ts` shows the one constant (and header prose) only, and `git show 1e22889e:packages/i18n/locales/<l>/claim.json` vs the new key shows the same string for `peer_mesh_wa.reminder` as
   the old `peer_mesh_sms.request` (a scripted compare, recorded). *"WR13 / §0 edge (ii)"* is RE-FIXTURED: `LONG_NAME` becomes the Panel's 65-letter example, its premise is `expect(smsMemberName(LONG_NAME).kind).toBe('shortened')`, and the reminder still sends the
   name IN FULL as `{{1}}` (the import of `fitsDltAlphanumeric` goes — TR2). The harness's `world()` seeds the pings `accepted` directly (an accepted ping is frozen) — unchanged.

7. **AC6 — ⛔ A name anywhere but the text (N7).** Every new or flipped live leg asserts EXPLICITLY, over the blob
   `JSON.stringify({ enqueued: h.enqueued, alarms: h.alarms, rows })` built AFTER the leg's last `tick` (the peer-mesh `tick()` empties `h.enqueued`; in the peer-mesh suite `rows` is a HELPER — write
   `rows: await rows(w)` inside the object), `.not.toContain(<a distinctive token of the name>)`; every leg that SENDS also `.not.toContain` the shortened form and each box value. ⚠ The peer-mesh
   suite's `expectIdsOnly` checks only `'Ramesh'`, phone digits and link codes — on an `'A'…` / `'B'…` fixture it proves NOTHING about the name; it does ⛔ satisfy this AC alone.
   ⛔ A new log line carries a name; there is ⛔ new record that a shortened form or a particular cut was used (`-377` SN5, kept).

8. **AC7 — Nothing else moves.** ⛔ Migration; ⛔ schema / detail-vocabulary change (`PEER_MESH_REQUEST_NAME_REASONS`, the 0166 regex, `suspicionNoticeDetail`); ⛔ send-core change (`claim-dlt-sms-send.ts`
   byte-identical); ⛔ `packages/domain` source change; ⛔ `packages/channels` CODE change (`dlt-variables.ts`: the one JSDoc sentence of G4 (vi), comment only; `packages/channels/tests/sms-preflight.test.ts`'s stale fixture prose is LEFT — G4 (vii)); the comment-only re-word of `readMemberFacingDeceasedName`'s last JSDoc sentence (AC5); ⛔ change to `claim-peer-mesh-wa-reminders.ts`; ⛔ a new dependency. `git diff --stat $(git merge-base origin/main HEAD)..HEAD -- apps packages`
   (⛔ a literal SHA — a rebase would pull in other stories' files) lists only: the two new/rewritten modules (`sms-member-boxes.ts`, `sms-member-name.ts`), `claim-suspicion-notices.ts`,
   `claim-peer-mesh-requests.ts`, `suspicion-notice-sms-templates.ts`, `peer-mesh-sms-templates.ts`, `peer-mesh-wa-templates.ts` (the one constant), `packages/channels/src/dlt-variables.ts` (one comment sentence), the two `claim.json`, and test files
   (`sms-member-name.test.ts`, the two live suites, `suspicion-notice-sms-templates.test.ts`, `peer-mesh-sms-templates.test.ts`, `dlt-template-sheet.test.ts`, `claim-peer-mesh-wa-reminders-live.test.ts`; `peer-mesh-wa-templates.test.ts` and `claim-suspicion-notice-no-decision.test.ts` ONLY if a header comment needs a word — Task 2 edits neither's assertions).

9. **AC8 — The proof.** Every flipped / new leg proven RED under the mutant named below (applied by a scratch runner that asserts the edit landed exactly once and ALWAYS restores the file; the run recorded
   by name in the Debug Log); a leg marked coverage-only is SAID so, ⛔ claimed RED:

   | Leg | Mutant that turns it RED |
   |---|---|
   | AC1 (a) boundary; AC3 / AC4 whole-name legs | `MEMBER_NAME_MAX` back to 40 (today's limit) |
   | AC1 (b) concatenation | a cut that drops or duplicates a code point (a cut at `n` keeps `boxes[0] + boxes[1] === name` TRUE — it is ⛔ (b)'s mutant) |
   | AC1 (c) bounds | a cut at `n` (an empty box 2 for n ≥ 2; box 1 > 30 for n > 30) |
   | AC1 (d) the cut | "always cut at 30"; "ignore whitespace-adjacency"; "ignore the forced-cut fallback (shorten instead)" |
   | AC1 (e) the Panel's example | an initial with a full stop; initials from the LAST word |
   | AC1 (f) titles | "no title step"; "case-sensitive match"; "no trailing-stop strip"; "drop `Kumar` too" |
   | AC1 (g) | the title step applied at ≤ 60 |
   | AC1 (h) never the last word | the walk includes the last word |
   | AC1 (i) first letter | "first code point" instead of "first letter-bearing grapheme" |
   | AC1 (j) | a UTF-16 `.length` mutant |
   | AC1 (k) | the guard removed |
   | AC1 (l) the sweep | any of the above (it must catch at least the cut, the last-word and the boundary mutants) |
   | AC1 (m) and the source leg | a planted unequal `maxLength`; its own plants (a third caller, a commented / string-only / glob-string / dynamic-import / re-export / member-call plant; a second title list; a second `MEMBER_NAME_MAX` reader; a resurrected `fitsDltAlphanumeric`) |
   | AC2 (1)–(3) | `{member1}{member2}` swapped; `helpline` left in 11 / 13; the dash left in 14 |
   | AC2 (5) | `UNICODE_ENGLISH` left holding 14 ⇒ the leg is RED on the new text (that run IS the proof the set must be emptied) |
   | AC3 / AC4 shortened legs | "no shortening" (every name above 60 refused) |
   | AC4 one-word leg; the AC4 re-claim leg | "truncate to 60" (they SEND); "always `full`" (the name reaches the core ⇒ `value_too_long`, ⛔ `no_target`) |
   | AC3 one-word leg | "truncate to 60" (it SENDS) ONLY — under "always `full`" the 75-code-point name reaches the core as boxes and ends `value_too_long` exactly as the leg expects, so that mutant is coverage-only for AC3 and is ⛔ claimed RED |
   | AC3 / AC4 warning legs | the warning left unconditional |
   | AC5 the reminder's key | `PEER_MESH_WA_REMINDER_COPY_KEY` back to `peer_mesh_sms.request` |
   | AC5 WR13 | the fit check applied to the reminder's name (it would be shortened) |
   | NB5 "`member1` = the whole name for `too_long`" | coverage-only BY DESIGN (the core ends `value_too_long` either way) |

   `pnpm --filter @twt/jobs typecheck` clean; `pnpm --filter @twt/jobs lint` clean; the gates of AC2 (7); `pnpm ci:local` with `DATABASE_URL` at :5433 green 36/36 (a load timeout re-run ALONE and SAID so —
   [[project_known_livedb_test_failures]]); `env -u DATABASE_URL pnpm --filter @twt/jobs test sms-member-name` — ⛔ `--` — and the output reads `Test Files 1 passed (1)` (`passWithNoTests` is ON, so a filter that matches
   nothing exits 0).

## Tasks / Subtasks

**Commit plan (the tree is green only at two kinds of boundary).** Task 0 is two commits (0.3 ALONE, then 0.4). **Tasks 1–5 are ONE commit**: in between the tree is RED by design — AC1 (m) and the "no `fitsDltAlphanumeric`" fence fail until Tasks 2.1 / 2.2; `tsc` fails between Tasks 2.1 / 2.2 and Tasks 3 / 4 (the senders still pass `{ member }`); the sheet rows and `claim.json` must move with the registries. Inside that commit, mint `peer_mesh_wa.reminder` and repoint the constant (2.3 / 2.4) BEFORE rewriting `peer_mesh_sms.request`, so `peer-mesh-wa-templates.test.ts` is never red (TR1). Task 6's proof and gates run on that commit; Task 7 is a records commit.


- [x] **Task 0 — governance FIRST (AC0). ⛔ No code.**
  - [x] 0.1 Preflight. `git fetch origin`; `git diff --name-only 1e22889e origin/main -- apps/jobs packages/channels packages/i18n packages/domain/src/notifications packages/domain/src/kyc` — ANY file ⇒ rebase onto
        `origin/main` (`main` lands by fast-forward only — [[feedback_land_prs_by_fast_forward]]), resolve the top-of-`sprint-status.yaml` ledger conflicts BY HAND ([[project_sprint_status_safe_prepend]] — keep every main
        line, put each branch line in its newest-first slot, YAML parses, line count = main's + the branch's added lines), re-derive the G-facts that moved, re-pin `baseline_commit`. **STOP conditions:** (S1) `git log 1e22889e..origin/main -- .decision-log.md`
        shows a ruling on these texts or on Row 30 (d) (the operator answered 40-per-box, or refused adjacency / an empty value / a leading space ⇒ NB3 and the constants change — read it first);
        (S2) `git log 1e22889e..origin/main --diff-filter=A -- _bmad-output/implementation-artifacts/` adds a story touching the registries or `claim.json`; (S3) another ref or worktree took `-380` or `2026-10-22k`
        (re-grep every ref: `for r in $(git for-each-ref --format='%(refname)' refs/heads refs/remotes); do git show "$r:.decision-log.md" | grep -o '^### Decision 2026-1[0-2]-[0-9]*-[0-9]*'; done | sort -t- -k4 -n | tail -2`);
        (S4) `ListAgents` shows a session on this worktree. `pnpm install --frozen-lockfile --prefer-offline` if `node_modules` is absent in the worktree (without it the `@twt/*` imports fail to resolve in this sibling worktree).
  - [x] 0.2 **ANSWERED 2026-10-22 (Debug Log (a)):** NB1–NB9 at their recommendations; NB7 with BigDev's edit — "short" dropped from 13 / 14 — reaffirmed after the §0 concern. ⚠ Still OPEN for BigDev: the INSTRUMENT of
        *"Panel has already authorized me to make small changes"* (⛔ in the decision log — Debug Log (a2)); name it at Task 0.3 so the rework entry can cite it, else the entry carries the statement verbatim as the basis.
  - [x] 0.3 Write the **6.37e rework entry** — an AUTHOR-COMMIT, next free id (`-380`, dated the day it is COMMITTED) — in `.decision-log.md`, the shape of `-378` / `-377`: Decision type / Status / Author / Ratifying trustees: None / §0 gate (the §0 re-run
        table — all MATCH or the author's EXCEPT the dropped "short": BigDev's decision, its stated authorisation quoted verbatim and its instrument named or recorded as ⛔ found; the final 13 / 14 words a TOLD item to the Panel before registration, `-349` decision 2 — written from the template, ⛔ a question; ⛔ counsel question) / Occasion (`-379`; BigDev's Task 0.2 answers) / The decisions (NB1–NB9 as answered — NB7 with the edit; NB4's readings in terms — the case / stop matching, `(Late)` a word, joined initials `MS` / `MR` / `DR` read as titles, the single-space re-join) / **PQ:** none (ONE told item) / Supersessions (`-377` SN2, SN3, SN7 replaced; SN1 kept as to HOME, its two import clauses (`fitsDltAlphanumeric`, `@twt/domain`) superseded; SN4, SN5 kept; SN6 kept in substance, its Consequence-1 records list superseded by the records commit; ⛔ a ratified sentence is edited;
        `-359` / `-362` already superseded by `-379`) / **Does NOT cover** (Row 30 (d): 30 vs 40 per box, two alphanumeric variables with nothing between them, an empty variable, a leading / trailing space in a value, a box value that BEGINS with a combining mark (the forced cut inside a cluster — NB3 (b)), a full stop INSIDE a stored name sent whole (N1), Devanagari counting, `##a####b##` in MSG91; a refusal
        of the RULED form returns to the Panel as `-322` C7; a `shielded_name` Pariwar's name under `-379` (`-379` composed with `-181` cl.1's author-commit reading of `-136` cl.2; no production caller of the mode writer — G15; a told item if one ships); the Hindi words — Rows 23 / 28; the WhatsApp reminder's words (`-303` Q1 A's "same words" now the NAME and the substance — NB8); a shorter neighbours' link; English-only capture — row 3-3c; an invisible-only name; NFC vs NFD counting — both already in `deferred-work.md`, re-anchored at Task 0.4) /
        Consequences / References. It BUILDS `-379`; it ⛔ re-reads it. Stage in the scratchpad, re-grep every ref for the id right before inserting, prepend above the newest `### Decision`
        ([[project_decision_log_writes_user_inserted]] — try, verify additive-only, ask once if refused); commit ALONE with `governance: …` ([[feedback_governance_commits_precede_implementation]]); write its SHA after the commit, ⛔ before.
  - [x] 0.4 The **records commit** (one commit, after 0.3), every edit append-only: `epics.md` `### Story 6.37e` — the title / user story / "(in brief)" rewritten and a dated *"REWORKED 2026-10-22 (`-379`)"* paragraph naming `-380`; `deferred-work.md` — the
        6.37-round-2 suspicion item and the 6.24b `{member}` item dated notes (*"Closed by 6.37e for every name that fits 60 or that the Panel's rule can shorten, when the row is `done` on `main`; still ⛔ sent: a name that cannot fit"* — ⛔ a bare "Closed"
        ([[feedback_closure_language_precision]]); the owed-Panel item's note that its BUILD is now owed by THIS story; the 6.37c-pack sitting item *"✅ Closed by `-362` (option B — built in row `6-37e`)"* — a dated note: option B SUPERSEDED by `-379`, the build is the full-name rule; the two code-review items (an invisible-only name; NFC vs NFD) — a one-line re-anchor from `fitsDltAlphanumeric` / "the 40" to `smsMemberName` / 60; the BF24 cost-FYI item — superseded in part (G4 (viii): the English figures, the typical Hindi figure and the 40-letter ceiling; the Hindi 3–5 range stands)); the two OLDER routing notes' ruling blocks (`…2026-10-17-6-37-name-too-long-for-the-text.md` *"Built by a NEW row 6-37e…"*, `…2026-10-18-6-27c-neighbours-text-long-name.md` *"Built with the suspicion texts in row 6-37e"*) — a dated note under each: option B SUPERSEDED by `-379` (⛔ a word of the ruling block edited); roster **Rows 22 / 27** (the registered words changed — two boxes; 11–14 lose the helpline; no id was ever provisioned, so ⛔ re-registration is owed; closure
        criteria unchanged; Row 27's evidence line (1): `name_too_long` now only for a name that cannot fit even shortened), **Rows 23 / 28** (the Hindi reviewers' packet: 7 / 9 gain a box; 11 loses only the `{helpline}` variable (पर stays); 13 ends *", या हमें कॉल करें"* and drops *"छोटे"*), **Row 27** also carries the told item on 13 / 14's final words (the dropped "short" — shown to the Panel before registration, `-349` decision 2), **Row 30 (d)** (the questions above, plus a box value beginning with a combining mark; the `-377` SHORT-FORM full-stop item is MOOT — initials carry ⛔ stop and a stopped title is dropped — but a full stop INSIDE a stored name of ≤ 60 is now sent WHOLE (N1) and stays (d)'s existing special-character question, reached by MORE names than before; a refusal of the ruled form returns
        to the Panel), **Row 32 (d)** (the MSG91 forms of 7–14 are `##member1####member2##…`; template 14 is created as Normal, ⛔ Unicode), **Row 35** (the reminder's words are deliberately NOT the text's — `-379` *Not covered*), and a dated annotation on `docs/adr/ADR-0041-sms-gateway-msg91.md` (G4 (v)) — each a dated note, ⛔ a word of any row
        rewritten; `claim.json` (en + hi) `$comment.suspicion_sms` / `$comment.peer_mesh_sms` a dated sentence APPENDED (the three lockstep substrings kept; ⚠ the sentence is scanned by `microcopy:check` — G11: no `report` / `user` / `receipt` …); the sheet's THREE `-377` prose notes (after the wording of 7–12, after 13–14, and in the Shape rules) get a dated *superseded* note under each (the table rows and rules change in Task 2.5, with the code);
        the 6-37e sprint comment (a NEW dated line) + row `ready-for-dev` → `in-progress` (this create-story run already moved it `in-progress` → `ready-for-dev`) + the `last_updated: >-` scalar + the ledger line ([[project_sprint_status_safe_prepend]] — read first, guard the size, verify the YAML parses and the row count is unchanged). ⚠ The sheet is in `GATE_INPUTS`
        (`docs/launch-gate-inventory/**`): a push touching it is ⛔ docs-only — the pre-push hook and `ci.yml` run.

- [x] **Task 1 — The function and its boxes (AC1).**
  - [x] 1.1 `apps/jobs/src/scheduler/sms-member-boxes.ts` (NB1): `MEMBER_BOX_MAX`, `MEMBER_NAME_MAX`, `MEMBER_BOX_SLOTS`. Imports only `type DltSlot` (and `DLT_TYPE_MAX_LENGTH` if the file asserts the ceiling) from `@twt/channels`.
  - [x] 1.2 Rewrite `apps/jobs/src/scheduler/sms-member-name.ts` (NB2–NB4): module header (the rulings, N1–N5, why the RESOLVED name is the input, the readings), `SmsMemberName`, `smsMemberName`, and the module-private helpers (the title set, `isTitle`, `firstLetter`, the cut). Imports ONLY `./sms-member-boxes.js` — ⛔ `@twt/domain`,
        ⛔ `./peer-mesh-sms-templates.js` (the dependency runs registries → boxes ← function; the shared pure function must not depend on one registry). ⚠ The header must ⛔ contain the DLT marker token, `DLT_VAR` or the template-id prefix — rules (ii) / (iii) scan COMMENT lines in a non-registry file; grep the headers of BOTH new files for `**/` too (TR14). Use `Intl.Segmenter` when present, the code-point iterator otherwise (as the domain's `firstGrapheme`).
  - [x] 1.3 Rewrite `apps/jobs/tests/sms-member-name.test.ts` — AC1 (a)–(m) and the source leg (KEEP the AST machinery — `callersOf`, `codeFacts`, the plants — and re-aim it as AC1 says; the title-list fact matches a literal whose text CONTAINS `shrimati`). Keep `sms-member-name.ts` in `NOTICE_MODULES` of `claim-suspicion-notice-no-decision.test.ts`; re-run it (it fences decision-writer names and table writes — the module has none, with or without the domain import). ⛔ Add `sms-member-boxes.ts` to that list (constants only).

- [x] **Task 2 — The registries, the copy, the reminder's key and the sheet (AC2, AC5).**
  - [x] 2.1 `suspicion-notice-sms-templates.ts`: slots from the boxes file (`[...MEMBER_BOX_SLOTS, HELPLINE]` / `[...MEMBER_BOX_SLOTS, APPEAL_DATE]`), the six registered texts, `SuspicionNoticeSmsVars`, `renderSuspicionNoticeSms`'s params and its throws; rewrite the header's `{member}` sentences (the literal 40 and "Ramesh S." go).
  - [x] 2.2 `peer-mesh-sms-templates.ts`: slots `[...MEMBER_BOX_SLOTS, LINK]`, the two registered texts, `PeerMeshRequestSmsVars`, `renderPeerMeshRequest`; REMOVE `fitsDltAlphanumeric` (keep `fitsDltUrl`); rewrite the header (the 40 / "Ramesh S." sentences; the helpline is gone from this text).
  - [x] 2.3 `claim.json` en + hi: the four values; FIRST the NEW `peer_mesh_wa.reminder` pair (= the pre-rework `peer_mesh_sms.request`, byte for byte — copy it from `git show 1e22889e:…`, ⛔ retype; do 2.4 next), THEN the four values; `$comment.peer_mesh_wa`; the `$comment` sentences of Task 0.4 if not already there.
  - [x] 2.4 `peer-mesh-wa-templates.ts`: `PEER_MESH_WA_REMINDER_COPY_KEY = 'peer_mesh_wa.reminder'` — ⛔ the body, ⛔ the param order, ⛔ the header's other claims (update the sentence "each body is EXACTLY the real `t('peer_mesh_sms.request')` output"). Also the one JSDoc sentence of `needsUnicode` in `packages/channels/src/dlt-variables.ts` (G4 (vi)) — comment only.
  - [x] 2.5 The sheet (current-state edits, with the code): the preamble MSG91 step (3) (SMS types); Shape rules (justification lines for 7–14, the side-by-side bullet, the lowest-share line recomputed with the REAL checker over all sixteen, the last-word line: 8 and 10 only); the main-table rows 7–14; the wording prose of 7–12 and 13–14 (*"The variables, in order"*; ⛔ the "longer than 40 characters is not texted" sentence); the `| n |` rows 7–14; the cost paragraphs (G12, recomputed); a Record row; the dated *superseded* notes if Task 0.4 did not place them.
  - [x] 2.6 Registry + sheet tests: `suspicion-notice-sms-templates.test.ts` and `peer-mesh-sms-templates.test.ts` — the `PANEL_EN` constants, the markers (`MEMBER1`/`MEMBER2` distinct), the render calls, the slot expectations, the variable-count legs (`split(DLT_VAR)` lengths 4), the "every variable filled" legs (the helpline assertion only where the template carries it), R9's 40 / 41 legs MOVE to AC1 (a)/(j); `dlt-template-sheet.test.ts` (`UNICODE_ENGLISH = new Set<string>()` — TR4); `peer-mesh-wa-templates.test.ts` stays green.
  - [x] 2.7 Gates: AC2 (7). `git add` the new file (`sms-member-boxes.ts`; `sms-member-name.ts` is already tracked) BEFORE `pnpm dlt-typed-variables:check`.

- [x] **Task 3 — The suspicion sender (AC3).**
  - [x] 3.1 `runSuspicionNoticeChild`: after `if (member === '') …`, `const chosen = smsMemberName(member)`; `const [member1, member2] = chosen.kind === 'too_long' ? [member, ''] : chosen.boxes` (NB5); ONE pair feeds BOTH `render` and `values` (TR6): `render: (helpline) => renderSuspicionNoticeSms(message, locale, { member1, member2, … })`, `values: (helpline) => …` with exactly the slot names of the template (TR7). Update the RB5 comment and the module header's child line and its `throws ONLY …` sentence.
  - [x] 3.2 The helpline warning (NB6 (b)): log it only when `entry.slots.some((s) => s.name === 'helpline')`; ⛔ `helplineGap` (NB6 (a)).
  - [x] 3.3 The AC3 legs; flip the P2 leg (TR5 — flipped, ⛔ deleted; keep its "⛔ the name in an alarm" assertion).

- [x] **Task 4 — The neighbours' sender (AC4).**
  - [x] 4.1 `readDeceasedName`: `smsMemberName(read.name)` — `too_long` ⇒ `{ fault: 'name_too_long' }`, else `{ boxes }`; the `NameRead` type; `fitsDltAlphanumeric` is gone from the imports. ⛔ Touch `readMemberFacingDeceasedName`'s body; re-word only its JSDoc's last sentence (AC5 — comment only).
  - [x] 4.2 The send: `member1` / `member2` from `nameRead.boxes`; `values: () => ({ member1, member2, link })` (⛔ `helpline`, TR7); `render` ignores its `helpline` argument; the once-per-child warning only if the template has a helpline slot (NB6 (b)) — i.e. the branch goes (delete it, with its `helplineWarned` flag, if nothing can set it).
  - [x] 4.3 The AC4 legs; update the suite header and the module header's step (4).

- [x] **Task 5 — The reminder stays (AC5).** `claim-peer-mesh-wa-reminders-live.test.ts` WR13 re-fixtured; the byte-identity checks (`readMemberFacingDeceasedName`, the body, the param order); the lockstep test green.

- [x] **Task 6 — Proof (AC6–AC8).** RED runs (Debug Log); the AC7 diff-stat; the gates; `ci:local` on :5433.

- [x] **Task 7 — Records and close.** Story Status, Dev Agent Record, File List, Change Log (newest-first); sprint row `ready-for-dev` → `in-progress` (at Task 0.4) → `review`; ledger. ⛔ "Closed by" until `done` on `main`.


### Review Findings — 2026-10-22 rework review

Reviewed the complete branch at `55a59859` against `baseline_commit: 1e22889e` (31 files; +3,183 / −261), with Blind Hunter,
Edge Case Hunter and Acceptance Auditor in parallel. Triaged: **0 decision-needed / 3 patch / 0 defer / 2 dismissed**.
BigDev chose **2 — Leave as action items**. All three patch findings remain unchecked; no implementation patches applied. Story and sprint row return to `in-progress`. The earlier v1.6 review below remains the record of the superseded build.

- [x] [Review][Patch] **P2 / R1 — Qualify Normal provisioning against Unicode name values.**
  [`docs/launch-gate-inventory/dlt-template-requests-6-19.md:43`; also roster Row 32 note (10), ADR-0041's rework annotation and the cost claims.]
  The changed setup step mandates Normal for template 14 because its fixed em dash disappeared. The supported name rule remains script-agnostic;
  `3-3c` is explicitly independent. A read-only probe through the REAL `smsMemberName`, `renderPeerMeshRequest` and `needsUnicode` with
  `रमेश कुमार शर्मा` returned `{kind:"full",fixedNeedsUnicode:false,renderedNeedsUnicode:true}`. Preflight checks the registered text with markers;
  the Flow request carries named values and no encoding override. Therefore GSM-7 fixed text alone does not establish safe Normal provisioning
  for all supported names. **Actual MSG91 rejection/corruption is unproven**: the gap is the mandatory provisioning rule without Unicode-variable
  evidence. Before prescribing Normal, obtain a provider/device proof for Unicode name values or retain Unicode-safe provisioning; qualify costs
  by the rendered character repertoire. Engineering-owned under §0: no wording or name-policy change is needed. Supporting primary provider
  guidance: [Textlocal's template guide](https://www.textlocal.in/assets/Textlocal_Templates_Guide.pdf) explicitly instructs Unicode DLT registration
  when English templates carry Unicode dynamic parameters; this supports the risk, not a claim about MSG91 auto-promotion.
  ✅ *Resolved 2026-10-22 (review continuation; BigDev, asked the scope: *"14 back to Unicode"*):* template 14 is PROVISIONED Unicode again (DLT
  sheet MSG91 setup step (3) + a Record row; roster Row 32 note (11) supersedes note (10)'s "Normal"; an ADR-0041 changelog row); the 13–14 cost
  line qualified (en 2–5 segments). MSG91's help pages (read 2026-10-22) state ⛔ rule for a Unicode value on a Normal template — ⛔ proof found.
  ⛔ Code change: the pre-flight passes a GSM-7 text on a UNICODE template (note `sms_type_unicode_for_gsm7`). OPEN, recorded ⛔ decided
  (`deferred-work.md`): templates 8 / 10 / 12 (Normal since 6.24b, same name variables); the `-379` note's "2 parts instead of 3–4" cost as
  told to the Panel is now conditional (a told-item correction is BigDev's call). Debug Log (f).

- [x] [Review][Patch] **P2 / R2 — Complete AC6's fixture-specific privacy assertions on every changed live leg.**
  [`apps/jobs/tests/claim-peer-mesh-requests-live.test.ts:756`; also its warning leg at 769,
  `claim-suspicion-notices-live.test.ts:364`, `claim-peer-mesh-wa-reminders-live.test.ts:414`.]
  The re-claim fixture is now `A` × 61, but its only privacy helper checks `Ramesh` in alarms, so it cannot detect this fixture leaking.
  The two changed warning legs and re-fixtured WR13 likewise omit AC6's post-run `{enqueued, alarms, rows}` blob assertion. Add checks for
  the actual distinctive name token and, for sends, the name/shortened form and relevant boxes, preserving the existing behavior assertions.
  These are acceptance gaps in regression coverage; no actual name leak was observed.
  ✅ *Resolved 2026-10-22 (review continuation):* the four legs now assert the post-run `{enqueued, alarms, rows}` blob holds ⛔ the fixture's
  distinctive token, its (shortened) form or any box value (the re-claim leg `'A'.repeat(20)`; the two warning legs `NAME`, `'Ramesh'` and both
  boxes; WR13 `'Subrahmanyam'`, the name, the SMS-shortened form and both boxes; WR13 also gains `expectIdsOnly`). Four leak mutants (one per leg)
  RED against the new assertions and GREEN against the pre-R2 tests — the gap was real. Debug Log (f).

- [x] [Review][Patch] **P3 / R3 — Append PQ1's actual discharge to the epic's current rework entry.**
  [`_bmad-output/planning-artifacts/epics.md:3755`.]
  The REWORKED block still says the note is written/not sent and blocks registering 13/14, with no later `-381` annotation in the epic.
  Append the SENT/ANSWERED outcome and discharge from `2026-10-22-381`; preserve the dated original block. The ruling and roster are correct,
  but a reader of the epic alone is currently directed to an obsolete registration hold.
  ✅ *Resolved 2026-10-22 (review continuation):* a dated ✅ block after the REWORKED block in `epics.md` — the note SENT and ANSWERED
  (`-381` PQ1 A), the `-380` registration hold DISCHARGED, Rows 27 / 28 on their own criteria; the REWORKED block kept as written.

**Independent validation:** targeted unit/registry/sheet/no-decision suites **6 files / 159 tests passed**; affected live suites on :5433
**3 files / 135 tests passed** (suspicion 59, neighbours 49, WhatsApp reminder 27). No production SMS or WhatsApp was sent. Full `ci:local`
was not repeated during this review. The runtime encoding probe was read-only; external provider behavior was not tested.

**Checklist verdicts, touched families only:** family 6 **REAL GAP** (R2, AC6 coverage); family 10 **covered-by-construction** for qualified
branch-only closure and recorded operator unknowns, with external operator acceptance **not-constructible-in-this-system** using fake gateways;
family 11 **covered-by-construction** by the family's policy sentence and the implemented `-379/-380` ordering. R1 adds an unverified encoding
assumption to the provisioning evidence discipline. Other families do not acquire new behavior in this diff.

**Dismissed:** (1) one-code-point names can use an empty second box, but the existing Row 30(d) gate explicitly still asks about an empty
variable and limits its avoidance statement to 2+ code points — no new uncovered path; (2) the sent PQ1 note's “other seven texts” phrasing
is an imprecise historical count, with the actual hold clearly identified as templates 13/14 and already discharged — no actionable current
scope defect. The story's stale “Panel questions: NONE” / §0 prose is explicitly superseded by Debug Log (a3)/(a4), so it is not another finding.

## Dev Notes

### ⚠ TRAPS

1. **TR1 — The WhatsApp reminder reads the SMS key (G5).** Do ⛔ rewrite `peer_mesh_sms.request` before `peer_mesh_wa.reminder` exists, and ⛔ "fix" `peer-mesh-wa-templates.test.ts` by editing `PEER_MESH_WA_REMINDER_BODY`.
2. **TR2 — `fitsDltAlphanumeric` still has two TEST importers** (the senders no longer import it; the module being rewritten does): `claim-peer-mesh-wa-reminders-live.test.ts` (G6) and `peer-mesh-sms-templates.test.ts` (R9's 40 / 41 legs). No CODE-line declaration or call of `fitsDltAlphanumeric` may remain in `apps/jobs/src` (AC1's AST leg asserts it). Three plain-text mentions WILL remain and are fine: the send core's comment (that file is frozen by AC7 — leave it), the re-aimed fence's own identifier and plants, and the `fitsDltUrl` JSDoc in `peer-mesh-sms-templates.ts` — reword that one.
3. **TR3 — Every fixture sized for 40 / 41 is now BELOW the boundary.** `'A'.repeat(41)` (the AC5b re-claim leg), `'A'.repeat(20) + ' ' + 'B'.repeat(20)` (R9), `'Venkatanarayana'.repeat(3)` (45, the one-word legs), the 45-letter `LONG_NAME` of the suspicion suite and the 52-letter WhatsApp `LONG_NAME` all FIT 60 now. Re-size the "cannot fit" fixtures to ≥ 61 (`'A'.repeat(61)`, `'Venkatanarayana'.repeat(5)` = 75) and the "must shorten" fixtures to a name that is > 60 with a shorter form ≤ 60 (the Panel's 65-letter example).
4. **TR4 — `UNICODE_ENGLISH` in `dlt-template-sheet.test.ts`** pins 14 (en) as Unicode (the em dash); after the comma that leg is RED — empty the set as `new Set<string>()` — ⛔ `new Set([])` is `Set<never>` and `.has(string)` fails `tsc`, because `apps/jobs/tsconfig.json` includes `tests/**/*` — and say why in its comment.
5. **TR5 — The superseded legs are FLIPPED, ⛔ deleted.** Keep each leg's "⛔ the name in an alarm" assertion; move refusal assertions to the one-word leg (the 6.37d T3 precedent).
6. **TR6 — `render` and `values` must close over the SAME boxes.** MG3 refuses a mismatch (`values_mismatch`); compute the pair once.
7. **TR7 — `values` has EXACTLY the slot names** — `member1`, `member2` and the template's third; a stray `helpline` in 11–14, or a missing one in 7–10, is `values_mismatch` at the core. The slot order of `values` need not match, the names must.
8. **TR8 — Only a slot NAMED `helpline` is exempt from the length check** (G2) — a name box of 31 is refused; do ⛔ rename a slot to dodge it.
9. **TR9 — Do ⛔ insert a separator between the boxes** to "fix" adjacency in MSG91: it changes the Panel's words (`-379`) and the registered text. The adjacency is the operator's question (Row 30 (d)).
10. **TR10 — The title step runs ONLY above 60, drops every title, and the initials walk protects the last word AFTER the drop.** `Kumar` is an initial in the Panel's example because it is the FIRST word, ⛔ because it is a title.
11. **TR11 — `Intl.Segmenter` varies with ICU (G13).** Assert Devanagari via the same segmenter (computed); literals ASCII.
12. **TR12 — Code points, not UTF-16, not graphemes** for the 30 / 60 (G13); only an astral leg tells code points from UTF-16 (AC1 (j)).
13. **TR13 — Live DB is :5433, explicitly.** The shell exports `DATABASE_URL=:5432`; the pre-push hook would migrate the dev DB ([[project_prepush_hook_inherits_5432]]) — push (when BigDev says) with `DATABASE_URL='postgresql://twt_dev_app:devpass@127.0.0.1:5433/twt_dev?sslmode=disable'`. Run live files one at a time when diagnosing ([[project_known_livedb_test_failures]]).
14. **TR14 — Prettier is not enforced** — hand-format; ⛔ `--write` a whole file ([[project_prettier_not_enforced]]); `**cl.N**` inside a JSDoc closes it ([[project_markdown_emphasis_closes_jsdoc]]) — grep the new headers for `**/`.
15. **TR15 — A markdown table row in the sheet is code.** A `| 11 |` line is pinned by tests AND scanned by the gate; the dated notes are prose, ⛔ table rows. Edit rows exactly (`| <n> | <registered text> |`).
16. **TR16 — The Hindi is the author's, ⛔ the Panel's.** Never describe the changed Hindi as ratified; the Rows 23 / 28 reviewers own it.
17. **TR17 — The branch's records are append-only.** The `-377` prose notes in the sheet, `deferred-work.md` and the roster still say "Ramesh S." — SUPERSEDE them with a dated note ([[feedback_supersede_never_reinterpret]]); ⛔ edit a ratified sentence, ⛔ rewrite a decision entry.

### Reuse map

| Need | Reuse | ⛔ Rebuild |
|---|---|---|
| Shape / type / SMS-type checks | `checkDltTemplateShape`, `needsUnicode` (`@twt/channels`) | a second checker |
| The MSG91 and sheet forms | `toGatewayTemplate`, `msg91Form`, `sheetRowByConfigKey`, `expectRegisteredTextRow`, `i18nParamNames` (`apps/jobs/tests/_dlt-template-sheet.ts`) | a hand-built form |
| The refusal of a still-too-long suspicion name | the send core's `checkedValues` (`value_too_long` + alarm) | a pre-send refusal |
| The neighbours' still-too-long fault | `{ fault: 'name_too_long' }` | a new reason |
| The callers' source leg | the AST machinery already in `sms-member-name.test.ts` (P-7) | a regex strip |
| Live harnesses | `claim-suspicion-notices-live.test.ts` `seedDeath({ kycName })`, `SHIELDED`, `isolated()`, `claimOf`, `refusedS`, `allowAppeal`, `contact`; `claim-peer-mesh-requests-live.test.ts` `world({ name })`, `expectIdsOnly` | new seeds |
| A property sweep | a seeded 32-bit LCG in the test file | `fast-check` (G18) |

### Testing standards

Vitest. Unit legs DB-free: `env -u DATABASE_URL pnpm --filter @twt/jobs test sms-member-name` — ⛔ `--` (with it pnpm passes the filter through and vitest runs every file); confirm `Test Files 1 passed (1)` and record that line. Live legs with `DATABASE_URL` at :5433. Every new leg must be able to fail (AC8). Expected strings computed through the real functions ([[feedback_stub_must_call_not_transcribe]]).

### Project structure notes

Two src files (one new, one rewritten) and edits to five others in `apps/jobs` (the two senders, the two registries, `peer-mesh-wa-templates.ts`); two `claim.json`; one docs sheet; tests. The DLT typed-variables gate scans tracked `apps/*/src/**`: the two new modules must not contain the marker token, `DLT_VAR` or the template-id prefix, even in a comment; the two registry edits are safe (rules (ii) / (iii) exempt registries; rule (i) reads registry CODE lines only).

### Sequencing

⛔ Dependency on an open row. Rows 22 / 23 / 27 / 28 / 30 / 32 / 35 gate GO-LIVE, ⛔ the build or the merge. Row `3-3c-member-kyc-name-english-only` (`backlog`) makes names English at capture — independent of this build (the rule is script-agnostic).

### Previous story intelligence (6.37e v1.x, 6.37, 6.27c, 6.31, 6.37d, 5.13)

- 6.37e v1.x: the AST caller fence (P-7) is worth keeping — the regex strip it replaced was blinded by `'src/*.ts'`; RED proofs by a scratch runner that asserts the edit landed once and always restores; the `isolated()` + `allowAppeal` combination works (no fallback to the default Pariwar needed); `expectIdsOnly` proves nothing about an `'A'…` name (AC6); the v1.6 review's Hindi examples were once transposed between Rows 23 / 28 (P-1) — check each row's example against `hi/claim.json` after editing.
- 6.31 WR13: `readMemberFacingDeceasedName` was split out precisely so the TEXT's step could change alone; WR6 tied the reminder's body to the text's key — this story breaks that tie on purpose (G5).
- 6.27c R9: `fitsDltAlphanumeric` was "the ONE predicate"; its promise — *"if Row 30 (d) answers a different limit or unit, this function and the ceiling change in ONE place"* — is kept by `sms-member-boxes.ts`.
- 6.37d: legs that cannot fail were found and rebuilt in review (P7, P8) — hence AC8; review the fix diff before commit ([[feedback_review_the_fix_diff_before_commit]]).
- 5.13: its landing took `-376`, Row 39 and migration 0178 — the numbers in "NUMBERS" are taken from the current refs, not from this file.

### Git intelligence

`origin/main` = `1e22889e` (5.13 landed). The branch's 14 commits: story v1.1–v1.4 (create `ebb45851`, validate `5917b2a1`, Task 0.2 answers `cc03000d`, second validate `d8a8c12b`), `-377` + its records (`7cd8a7a4`, `48a34913`), dev (`55bf7477`), review (`39a6a687`), `-378` + its records (`4b760054`, `a506639e`, `4bf1b390`), `-379` + its records (`a69d3e53`, `29386bd1`), the reopen (`ede854dc`). The last edits to the two schedulers on `main` are 6.37b (`claim-suspicion-notices.ts`) and 6.31 (`claim-peer-mesh-requests.ts`).

### Latest tech information

Node ≥ 22.12 (`package.json` engines; local 22.22.2, ICU 78.2, Unicode 17.0). `Intl.Segmenter` grapheme clusters follow the ICU's Unicode version (Unicode 15.1 GB9c clusters Devanagari conjuncts). No library change. SMS: GSM-7 153 characters per concatenated part, Unicode 67 (the sheet's own convention).

### References

- `.decision-log.md`: `2026-10-22-379`, `-378`, `-377`, `2026-10-18-359`, `-362`, `2026-10-10-303` / `-304` Q6, `2026-10-07-293` item 1, `2026-09-28-262` FQ7, `2026-10-07-291` Q2, `2026-09-29-269` §5, `2026-10-19-365`, `2026-10-17-345` MG3, `2026-10-12-322` C7, `2026-10-17-349`, `2026-09-20-227` cl.1, `2026-09-02-181`
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-22-6-37e-full-name-two-slots.md` (answered — the question as put, kept unedited); `…-6-37e-short-name-confirms.md` (WITHDRAWN, never sent); `trustee-panel-routing-note-TEMPLATE.md`
- `apps/jobs/src/scheduler/`: `claim-suspicion-notices.ts` `runSuspicionNoticeChild`; `suspicion-notice-sms-templates.ts`; `claim-peer-mesh-requests.ts` `readDeceasedName`, `readMemberFacingDeceasedName`; `peer-mesh-sms-templates.ts`; `peer-mesh-wa-templates.ts`; `claim-dlt-sms-send.ts` `checkedValues`; `sms-member-name.ts`
- `packages/channels/src/dlt-variables.ts`; `packages/channels/src/providers/sms-app.ts` `buildFlowBody`; `packages/channels/src/providers/sms-preflight.ts`
- `packages/i18n/src/resolver.ts` (`TOKEN`); `packages/i18n/locales/{en,hi}/claim.json`; `microcopy.yaml` (`scope.copy_globs`)
- `docs/launch-gate-inventory/dlt-template-requests-6-19.md`; `docs/launch-gate-inventory/inventory-roster.md` Rows 22, 23, 27, 28, 29 (b), 30 (d), 32 (d), 35
- `apps/jobs/tests/`: `sms-member-name.test.ts`, `claim-suspicion-notices-live.test.ts`, `claim-peer-mesh-requests-live.test.ts`, `claim-peer-mesh-wa-reminders-live.test.ts`, `suspicion-notice-sms-templates.test.ts`, `peer-mesh-sms-templates.test.ts`, `peer-mesh-wa-templates.test.ts`, `dlt-template-sheet.test.ts`, `_dlt-template-sheet.ts`, `claim-suspicion-notice-no-decision.test.ts`
- `scripts/dlt-typed-variables/lib.ts`; `scripts/microcopy/`
- `_bmad-output/implementation-artifacts/6-37-msg91-sms-gateway-adapter.md`, `6-27c-peer-mesh-sending-texts-and-links.md`, `6-31-peer-mesh-whatsapp-reminder-at-48-hours.md`, `6-37d-claim-contact-whatsapp-step.md`

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5.5 (`claude-sonnet-5-5`) — `bmad-create-story 6.37e` (the v2.0 rewrite), 2026-10-22. Dev: Claude Opus 5.5 (`claude-opus-5-5`) — `bmad-dev-story 6.37e`, 2026-10-22.

### Debug Log References

*Reserved letters ((b)–(e) to be filled by `bmad-dev-story`):*
**(a)** Task 0.2 — BigDev's answers to NB1–NB9, VERBATIM (and which Tasks an answer other than "recommended" changes).
  **(a1) Answered 2026-10-22** (to the create-story session, after v2.1 was committed as `5a8074d2`): *"NB1-NB9 approved. A small modification is done in NB7."*
  ⇒ NB1–NB9 each at the ⭐ recommendation ((a) for NB1, NB2, NB4–NB9; (b) for NB3), with ONE edit BigDev made directly in NB7's text (the working-tree diff against
  `5a8074d2`, 2 lines): template **13 (hi)** *"कुछ छोटे प्रश्नों"* → *"कुछ प्रश्नों"*, template **14 (en)** *"a few short questions"* → *"a few questions"* — the word
  **"short"** dropped from the neighbours' text.
  **(a2) §0, applied to that edit the same day:** *"a few short questions"* is a Trustee-ratified phrase twice over — `-304` Q6 A (*"The text says 'a few short
  questions' (amends `-303` Q1 A's 'two')"*) and `-379` Q2 A, which ratified the neighbours' text AS PUT with that word — so the edit CHANGES ratified words
  (the same class as the dash → comma, which WAS put to the Panel). Put to BigDev with three options (build as ratified + ask; build BigDev's words + the Panel
  gates registration; withdraw the edit). **BigDev, verbatim:** *"Build with my words. Panel has already authorized me to make small changes."* — a decision
  reaffirmed after the concern was raised; it is carried as BigDev's. **The record, checked the same day:** `.decision-log.md` holds ⛔ delegation of wording
  changes to BigDev — `-210` cl.2 delegates ENUM additions *"that change ⛔ no member-facing behaviour"*; `-349` decision 4 names *"a standing delegation —
  whether staff may register the nearest wording DLT accepts for templates 7–14, with the same meaning"* and says it is ⛔ routed yet. So the authorisation
  BigDev names is ⛔ found in the log; BigDev is asked to name its instrument (a sitting, a message) so the rework entry can cite it — until then the rework
  entry records the statement verbatim as the basis, ⛔ as a ruling ([[feedback_record_unattested_no_backfill]]). What the record DOES require either way:
  `-349` decision 2 — *"the English of templates 7–14 (the Panel's words): the change goes back to the Trustee Panel, through a routing note, BEFORE that
  template's id is set; nothing is sent with words the Panel has not seen"* ⇒ the final 13 / 14 words are SHOWN to the Panel (a told item, ⛔ a question — the
  build does not wait) before Row 27 registers them. Changes to this file: NB7 (a), N8, AC2 (3), §0 re-run (a new row and its heading), G3 / G12 / G4 (viii)
  figures, the Policy-meaning length line, NB8, Task 0.3 / 0.4 — all in v2.2.
  **(a3) Task 0.3, 2026-10-22 — the instrument question, put to BigDev** (*"What should the -380 rework entry cite as the basis for dropping "short"?"* — options: the
  statement verbatim (recommended) / name the instrument). **BigDev, verbatim:** *"you know what route to panel, prepare routing note, I won't waste time arguing"*.
  ⇒ the dropped "short" is a Panel QUESTION — `-380` decision 10 / **PQ1** — ⛔ the told item v2.2 planned. Built with BigDev's words (*"Build with my words"*, (a2)) meanwhile;
  the answer gates REGISTRATION of templates 13 / 14 (Row 27 condition note; `-349` decision 2), ⛔ the build or the merge. Changes from v2.2's plan: "🏛️ Panel questions:
  NONE" and the §0 re-run's "⛔ routing note" are superseded by PQ1 (those sections are ⛔ edited — this entry records it); Task 0.4 gains the note, a deferred-work item and
  the Row 27 condition; the note also carries the BF24 cost FYI (its trigger: *"the next `trustee-panel-routing-note-*` written for ANY story"*).
**(b)** Task 0 — **preflight (2026-10-22):** `git fetch origin` ⇒ `origin/main` = `1e22889e` (unmoved); the `apps/jobs packages/channels packages/i18n packages/domain/src/{notifications,kyc}`
  diff `1e22889e..origin/main` EMPTY ⇒ ⛔ rebase, `baseline_commit` stays `1e22889e`; **S1** `git log 1e22889e..origin/main -- .decision-log.md` empty; **S2** no story file added on
  `origin/main`; **S3** the highest decision on every ref is `-379` and the highest ledger letter `22l` (worktrees `TWT` and `…/3-3c-…` clean, at `-376`); **S4** `ListAgents`: no other
  session. `node_modules` present. **Numbers taken:** decision `2026-10-22-380` (commit `17242731`, ALONE, `governance(6.37e): …`; additive-only, 42 lines; every cited id re-grepped by
  bare number — `-210` corrected to `2026-09-08-210` before insert); ledger `2026-10-22m`. **Records commit:** `8e79a863` (`story(6.37e): records for -380`).
  **(a4) The Panel answered PQ1, 2026-10-22** — BigDev, verbatim: *"by DR and KB"* / *"go with option A. Bigdev words are fine."* ⇒ `2026-10-22-381` (Trustee-ratified,
  Dhiraj Rahul + Kalpana Bharti; PQ1 A — "a few questions" for the TEXT; the WhatsApp reminder and the app screen keep "short"), committed ALONE `654e1636`; its
  records `a11233be` (the note's ruling block; deferred-work PQ1 item "Closed by `-381`", BF24 FYI shown; Row 27 condition DISCHARGED; ledger `22n`). Both commits
  path-limited (`git commit -- <paths>`), so the staged code set stayed out of them. The code commit then re-worded the four current-state lines that said 13 / 14 wait
  for the answer (registry header + Hindi comment, the registry test's two comments, the sheet's 13–14 prose and Record row) and appended a dated `-381` sentence to
  `$comment.peer_mesh_sms` (en + hi). **Numbers taken:** `-381`, ledger `22n`; this close's ledger `22o`.
**(b′) Code commit:** `16b16f22` (Tasks 1–5, one commit — the commit plan). ⭐ Found while running the live suite: the suspicion harness's fake-gateway oracle matched a
  template by slot COUNT only; with every message now three slots, the appeal notice's values were tried against the refusal template and `substituteDltValues` THREW
  on the name mismatch ⇒ the core's `unknown:unknown` (6 legs red). Fixed in the HARNESS (match by slot names too) — ⛔ a code change; the sender was right.
**(c)** RED proofs (AC8) — a scratch runner (scratchpad `mutants.py`, ⛔ committed) applies each mutant (every edit asserted to land EXACTLY once), runs the named legs
  (`vitest run <file> -t <pattern>`; unit legs without `DATABASE_URL`, live legs on :5433), records RED / GREEN and ALWAYS restores; `git status` + `git diff` compared
  before / after — IDENTICAL (tree restored). 35 mutant runs (two re-run after a fix, below) — every one RED, by name:
  `MEMBER_NAME_MAX` 40 → AC1 (a), (m) RED; AC3 45-letter refusal leg RED; AC4 R9 41-letter leg RED · a cut dropping a code point → (b) · a cut at n → (c) · always cut at 30 →
  (d), (l) · ignore whitespace-adjacency → (d), (l) · ignore the forced-cut fallback → both (d) legs · an initial with a stop → (e) · initials from the LAST word → (e) · no
  title step / case-sensitive / no trailing-stop strip → (f) titles · drop Kumar too → (f) Kumari leg · title step at ≤ 60 → (g) · the walk includes the last word → (h), (l)
  ⚠ the FIRST form of this mutant (only the `break` removed) stayed GREEN: it initialises the last word but never re-checks the fit, so its output is identical — an
  EQUIVALENT mutant; the faithful form (also re-check after the loop) is RED · first code point → (i) · UTF-16 `.length` → (j) · guard removed → (k) · a registry building
  its own box slot → (m) · `{member1}{member2}` swapped (en refusal copy) → 3 registry legs · helpline left in 11 (hi copy) → 8 legs (the first anchor landed TWICE and was
  NOT run — re-anchored, then RED) · helpline left in 13 (hi copy) → 7 legs · the dash left in 14 → 2 legs · `UNICODE_ENGLISH` holding 14 → the needsUnicode leg ·
  no shortening → AC3 65-letter + titles legs, AC4 65-letter leg · truncate to 60 → AC3 one-word leg; AC4 one-word + re-claim legs · always `full` → AC4 one-word + re-claim
  legs · warning unconditional → AC3 warning leg; AC4 warning leg (the import and the call re-inserted) · reminder key back to `peer_mesh_sms.request` → both WR6 lockstep
  legs · the fit check applied to the reminder's name → WR13.
  ⚠ HONEST: "always `full`" turns the AC3 one-word leg RED ONLY through that leg's own premise assertion (`smsMemberName(oneWord)` is `too_long`) — the SENDER's outcome
  under it is unchanged (`value_too_long` + alarm), so as to the sender that mutant stays coverage-only, as AC8 said. Likewise the AC3 / AC4 "no shortening" legs fail on
  their computed premise as well as on the send. NB5's "`member1` = the whole name" is coverage-only BY DESIGN (⛔ claimed).
**(d)** Gates — `pnpm --filter @twt/jobs typecheck` clean; `lint` clean; `microcopy:check` passed; `microcopy:test` 14 files / 371 tests; `i18n:check` exit 0;
  `dlt-typed-variables:test` 25 / 25; `dlt-typed-variables:check` passed (after `git add`); `@twt/channels` tests 21 files / 446. Unit: `env -u DATABASE_URL pnpm --filter
  @twt/jobs test sms-member-name` ⇒ `Test Files  1 passed (1)`, 23 tests; the registry / sheet / reminder / no-decision suites 6 files / 159. Live on :5433:
  `claim-suspicion-notices-live` 59 / 59, `claim-peer-mesh-requests-live` 49 / 49, `claim-peer-mesh-wa-reminders-live` 27 / 27. **`ci:local` with `DATABASE_URL` at
  :5433: PASSED — 36 job(s) green** (run on the code BEFORE the `-381` follow-through, which changed comments / prose / a `$comment` only; after it the three affected
  suites (69 tests), `microcopy:check`, `i18n:check`, `dlt-typed-variables:check`, typecheck and lint were re-run green — ⛔ a second full `ci:local`).
  The sweep (l) reached every outcome > 100 times (6,000 names, seed `0x6375e`).
**(e)** AC5 byte-identity (scripted against `git show 1e22889e:…`): `readMemberFacingDeceasedName` body IDENTICAL (its JSDoc's last sentence re-worded: *"⚠ Row 6-37e
  (`-379`'s full-name rule — two name boxes, shortened only above 60) edits the TEXT's step there — ⛔ this function."*); `PEER_MESH_WA_REMINDER_BODY` IDENTICAL;
  `peer_mesh_wa.reminder` == the pre-rework `peer_mesh_sms.request` in en AND hi (True / True); `git diff 1e22889e -- peer-mesh-wa-templates.ts` = the one constant + header
  prose; `claim-dlt-sms-send.ts`, `claim-peer-mesh-wa-reminders.ts` and `packages/domain` — EMPTY diff. **Costs** recomputed through the REAL renderers (19-letter name, 10-digit
  helpline, 10-char date, 55-char link; GSM-7 160 / 153, Unicode 70 / 67): 7 hi 101/2 · 8 en 88/1 · 9 hi 96/2 · 10 en 88/1 · 11 hi 134/2 · 12 en 116/1 · 13 hi 194/3 · 14 en
  170/2; 60-letter name: 142/3 · 129/1 · 137/3 · 129/1 · 175/3 · 157/1 · 235/4 · 211/2; ceilings: 13 hi 300/5, 14 en 276/2 — EVERY figure equals G12. Fixed shares
  (the checker's arithmetic): 7 hi 49.3 · 8 en 44.3 · 9 hi 47.5 · 10 en 44.3 · 11 hi 60.0 · 12 en 55.4 · 13 hi 40.0 · 14 en 34.7 (= G3); 1–6 and 15–16 87.2–90.6.
  AC7: `git diff --stat $(git merge-base origin/main HEAD)..HEAD -- apps packages` lists only AC7's files (`claim-suspicion-notice-no-decision.test.ts` appears from the
  superseded v1.x build, which added the module to `NOTICE_MODULES` — this rework did not touch it).
**(f)** Review continuation (`bmad-dev-story 6.37e`, 2026-10-22; worktree `TWT-6-37e`, ⛔ other session's tree touched) — R1–R3 of the rework code review.
  **R2 RED proofs** — a scratch runner (scratchpad `r2-mutants.mjs`, ⛔ committed; each edit asserted to land EXACTLY once; the file ALWAYS restored) leaked a name
  into an alarm, one mutant per leg: M1 the re-claim name fault (`alarmOf(deps)(read.name)` in `readDeceasedName`'s too-long arm); M2 the peer-mesh send's box 2;
  M3 the suspicion send's box 2; M4 the WhatsApp reminder's last three words. Against the NEW legs (live, :5433): **4 / 4 RED** (`'AAAA…'`, `'mar Sharma'` ×2,
  `'Subrahmanyam'`). Against the PRE-R2 test files (`git checkout HEAD --` the three files, then restored from a scratch copy; `git diff --stat` 19 insertions
  after): **4 / 4 GREEN** — the gap was real. **R1** — MSG91's help pages (searched 2026-10-22) state ⛔ rule for a Unicode value on a Normal template;
  `packages/channels/src/providers/sms-preflight.ts` passes a GSM-7 text on a UNICODE template with the note `sms_type_unicode_for_gsm7` (⛔ code change).
  BigDev, asked the scope (14 only / 8–14 / keep Normal behind a proof): *"14 back to Unicode"*. Unicode segment figures for 14 (en) at 67 per part: 170 → 3,
  211 → 4, 276 → 5. The tests pin the fixed TEXT's encoding (still GSM-7) and are unchanged; one `dlt-template-sheet.test.ts` comment says so.
  **Gates:** the three live suites 135 / 135 on :5433; unit registry / sheet / name / reminder suites 5 files / 152; `@twt/jobs` `tsc --noEmit` and `eslint` on the
  touched tests exit 0; **`ci:local` with `DATABASE_URL` at :5433: PASSED — 36 job(s) green** (on the tree with every R1–R3 change).

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created (`bmad-create-story 6.37e`, v2.0 rewrite, 2026-10-22).
- Validated (`bmad-create-story validate 6.37e`, v2.1, 2026-10-22): three fresh-context read-only verifiers (code claims; rulings / records / numbers; edge cases / test feasibility) — 0 H / 9 M / 26 L, all applied; then one fresh-context re-validate of the patch diff (see the Change Log).
- ✅ Dev complete (`bmad-dev-story 6.37e`, 2026-10-22). Governance first: `-380` (author-commit, NB1–NB9; PQ1 routed at BigDev's word) `17242731` → records `8e79a863` →
  the Panel answered PQ1 A → `-381` (Trustee-ratified) `654e1636` → records `a11233be` → code `16b16f22` (Tasks 1–5) → this close.
- Built: `smsMemberName` + `sms-member-boxes.ts` (the name WHOLE up to 60 in two ≤ 30 boxes cut near the middle, ⛔ empty; above 60 titles, then initials from the front,
  ⛔ the last word; else today's outcome); both registries / the copy / the DLT sheet re-shaped (11–14 ⛔ helpline; 14 GSM-7; "a few questions"); the WhatsApp reminder
  keeps its words under `peer_mesh_wa.reminder`; the senders feed one box pair to render + values and warn about a non-callback helpline only where it is printed.
- Tests: 23 unit legs (incl. a 6,000-name seeded sweep and the re-aimed AST fence); registry / sheet legs re-shaped; live legs flipped (P2, R9, the helpline warnings) and
  added (Panel's example, titles, 75-letter one-word); all 35 AC8 mutant runs RED (one equivalent mutant found and replaced; the AC3 "always full" RED only via its premise — Debug Log (c)). `ci:local` 36 / 36 on :5433.
- ⚠ For the reviewer: (1) the harness oracle fix (Debug Log (b′)); (2) the AC3 "always full" leg is RED only via its premise (Debug Log (c)); (3) the two new forms of
  one member (SMS shortened above 60, WhatsApp full) are by design (`-380` decision 8 / `-379` Not covered). ⛔ "Closed by" anywhere until `done` on `main`. Not pushed.
- ✅ Review continuation (2026-10-22) — all three rework-review action items resolved:
  - ✅ Resolved review finding [P2]: R1 — template 14 PROVISIONED Unicode again (BigDev: *"14 back to Unicode"*); sheet step (3), cost line, Record row; roster Row 32 note (11);
    ADR-0041 changelog row. OPEN (`deferred-work.md`, ⛔ decided): 8 / 10 / 12 on Normal; the `-379` note's told "2 parts" cost now conditional — a told-item correction is BigDev's call.
  - ✅ Resolved review finding [P2]: R2 — AC6 blob assertions on the four legs; 4 leak mutants RED (GREEN against the pre-R2 tests).
  - ✅ Resolved review finding [P3]: R3 — `epics.md` dated ✅ block: PQ1 SENT + ANSWERED (`-381`), the registration hold discharged.
  - `ci:local` 36 / 36 on :5433. ⛔ Code change outside tests. Not committed, not pushed (BigDev's go-ahead).
  - The told-cost item (after `651ffc53`) — BigDev: *"go with option 1, wait for MSG91's answer"*: ⛔ told item now; the GSM-7-on-UNICODE question
    joins Row 32 (d)'s written question to MSG91; a told item to the Panel only if MSG91 says no (`deferred-work.md`; Row 32 note (11)).

### File List

- `apps/jobs/src/scheduler/sms-member-boxes.ts` (new)
- `apps/jobs/src/scheduler/sms-member-name.ts` (rewritten)
- `apps/jobs/src/scheduler/claim-suspicion-notices.ts`
- `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts`
- `apps/jobs/src/scheduler/suspicion-notice-sms-templates.ts`
- `apps/jobs/src/scheduler/peer-mesh-sms-templates.ts`
- `apps/jobs/src/scheduler/peer-mesh-wa-templates.ts` (the copy key + header prose)
- `packages/channels/src/dlt-variables.ts` (one JSDoc sentence)
- `packages/i18n/locales/en/claim.json`, `packages/i18n/locales/hi/claim.json`
- `apps/jobs/tests/sms-member-name.test.ts` (rewritten), `suspicion-notice-sms-templates.test.ts`, `peer-mesh-sms-templates.test.ts`, `dlt-template-sheet.test.ts`,
  `claim-suspicion-notices-live.test.ts`, `claim-peer-mesh-requests-live.test.ts`, `claim-peer-mesh-wa-reminders-live.test.ts`
- `docs/launch-gate-inventory/dlt-template-requests-6-19.md`, `docs/launch-gate-inventory/inventory-roster.md`, `docs/adr/ADR-0041-sms-gateway-msg91.md` (changelog row)
- `.decision-log.md` (`-380`, `-381`)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-22-6-37e-few-questions.md` (new; answered), the 2026-10-17 / 2026-10-18 notes (dated notes),
  `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml`, this story file
- Review continuation (R1–R3): `apps/jobs/tests/claim-peer-mesh-requests-live.test.ts`, `claim-suspicion-notices-live.test.ts`, `claim-peer-mesh-wa-reminders-live.test.ts`,
  `dlt-template-sheet.test.ts` (one comment); `docs/launch-gate-inventory/dlt-template-requests-6-19.md`, `docs/launch-gate-inventory/inventory-roster.md` (Row 32 note (11)),
  `docs/adr/ADR-0041-sms-gateway-msg91.md` (changelog row); `_bmad-output/planning-artifacts/epics.md`; `_bmad-output/implementation-artifacts/deferred-work.md` (a new R1 section)

---

## Record of the superseded build (v1.0–v1.7) — HISTORY, ⛔ INSTRUCTIONS

> ⛔⛔ Everything below this line describes the "Ramesh S." fallback that `2026-10-22-379` SUPERSEDED. It is kept VERBATIM (only the heading
> levels are demoted) as the record of what the branch built, was reviewed for, and was proven by — do ⛔ follow its Acceptance Criteria, Tasks,
> SN decisions or PQs. Several lessons in it carry into v2.0 (see "Previous story intelligence"). The code it describes is on this branch at
> `55bf7477` / `39a6a687`; G1 says what becomes of each file.

### v1.6 Review Findings (the superseded build)

Full code review, 2026-10-22, baseline `1e22889e` → `55bf7477` (the whole branch; 1094 diff lines without this spec — ⛔ chunked, under the
~3000-line limit): Blind Hunter (diff only), Edge Case Hunter and Acceptance Auditor, parallel and read-only, then triaged and deduplicated.
**0 decision-needed, 8 patch, 2 defer, 11 dismissed.** **Disposition:** BigDev's standing instruction at invocation — *"apply all the
patches found, if any decision, I will answer it at last"* — no decision arose, so all eight patches were applied in this review. §0 gate
(the Panel-routing template's): ⛔ nothing here changes what a person is told, owed or shown — the corrections are to records, to the
accuracy of a Panel note that is still ⛔ sent, and to one test's reach. The review's changes are committed on the story branch
(BigDev: *"commit"*); ⛔ pushed.

- [x] [Review][Patch] **P-1 MED — Roster Rows 23 and 28 had each been given the OTHER row's Hindi example sentence** [`docs/launch-gate-inventory/
  inventory-roster.md` Rows 23, 28] (blind + auditor). Row 23 (`suspicion-notice-hindi-human-review`) cited the neighbours' sentence;
  Row 28 (`peer-mesh-request-hindi-human-review`) the suspicion sentence — each reviewer's packet would have been built from the wrong
  text. Swapped, each checked against `hi/claim.json`; Row 28 gains the ICU qualifier; a dated *Corrected* line on both.
- [x] [Review][Patch] **P-2 MED — The confirm note told the Panel the text's shorter form is "the directory's" and that A "keeps one way of
  shortening a name across the app"; its own E3 says otherwise** [`trustee-panel-routing-note-2026-10-22-6-37e-short-name-confirms.md`]
  (blind). Traced: the directory's `publicNameTokens` drops tokens without a letter or digit and strips leading default-ignorables; the
  member-facing arm (`splitFirstNameLastInitial`) does neither — so for a stray mark or an invisible character the text already differs
  from the directory (`"Venkata -."` vs `"Venkata S."`), and option B's stray-mark half would make the text AGREE with the directory,
  not diverge. Fixed: the deciding-fact paragraph, the table (a stray mark and an invisible character now separate rows), A's and B's
  costs, "Our reading", E3/E4, and "How much to trust" (the corrections are disclosed). ⭐ Also traced and recorded: `setPublicNamePresentationMode` is
  called only from tests, so nothing in the app lets a Pariwar choose `shielded_name` yet — the ruling's phrase *"the form a Pariwar can
  already choose"* is true of the system, not (so far as found) of any screen.
- [x] [Review][Patch] **P-3 MED — The confirm note understated the go-live gate** (blind + auditor). It said *"the texts for long names
  cannot go live"*; Row 22's testable signal provisions templates 7–12 only when the row closes, Row 27's 13–14, and both condition notes
  say the row does ⛔ close while the confirm is unanswered — a text goes live for every name or for none, so the WHOLE of each of the four
  texts waits. The note's header, "Blocked", "If nothing is decided" and "In plain English" now say so; `deferred-work.md`'s owed-confirm
  item carries the same line. ⚠ The gate's PLACEMENT — condition notes on Rows 22 / 27, ⛔ a new row — is BigDev's ruling (Debug Log
  (a2)) and is unchanged.
- [x] [Review][Patch] **P-4 LOW — Confirm 1 option C offered "a recognisable first name and surname initial" with no rule for it** (auditor).
  Its cost now says so and promises a proposed rule before anything is built.
- [x] [Review][Patch] **P-5 LOW — The 6.24b `{member}` deferred item read as landed** [`deferred-work.md`] (auditor): *"PARTLY addressed … now
  falls back"* with no *on `main` only when `done`* qualifier its sibling carries. Scoped to the branch, ⛔ landed.
- [x] [Review][Patch] **P-6 LOW — The suspicion sweep's header still said the child *"throws ONLY on a transient failure"*** [`claim-suspicion-notices.ts`]
  (blind). `smsMemberName` adds a fixed-message, non-transient, unreachable-today throw (`-377` decision 2: accepted cost). Header
  sentence added; verified true against the code (`member === ''` sits directly before the call).
- [x] [Review][Patch] **P-7 LOW — The I4 source leg could be blinded by a string** [`apps/jobs/tests/sms-member-name.test.ts`] (blind +
  edge, reproduced): the comment-stripping regex (copied from the staff-email fence) took `'src/*.ts'` for a comment opener and `' //'` for
  a line comment, hiding a later `smsMemberName(` call. The leg now reads the TypeScript AST (as `scripts/*/lib.ts` do). Plants: glob
  string, `' //'`, dynamic `import()`, re-export, member call, and a string that only NAMES the function (⛔ a caller); the "second fit /
  shorten" check gains its own plant. 16 → 19 unit legs. Spec amended (AC1, AC7 table, Task 1.2, reuse map).
- [x] [Review][Patch] **P-8 LOW — The test header said every expected short form is COMPUTED; legs (b), (c), (k) also pin literals** (blind). Header
  now says the three literals are ICU-stable (no conjunct initial) and only guard the computed value.
- [x] [Review][Defer] **Invisible-only name ⇒ a blank `{member}` is sent** [`signup.ts` name rule; `resolveMemberFacingDeceasedName`; DigiLocker
  path `kyc.handlers.ts`] — deferred, pre-existing (blind + edge). `deferred-work.md`, 2026-10-22.
- [x] [Review][Defer] **The 40-code-point fit counts the name as stored: NFC vs NFD decide differently** [`fitsDltAlphanumeric`] — deferred,
  pre-existing; part of Row 30 (d)'s unit question (edge). `deferred-work.md`, 2026-10-22.

**Dismissed (11), with the reason:** (1) an invisible character at the FRONT of the last word gives an invisible initial (edge) — the PQ1 /
Confirm 1 class (`-377` *Does NOT cover*: "an invisible initial"), built AS RULED by BigDev's B′; the note's table now names it. (2) A refused
full stop would turn today's loud failures into a silent `accepted` (blind) — disclosed in `-377` and Row 30 (d); a refusal goes back to
the Panel. (3) The WhatsApp reminder is newly reachable for long-name claims, untested (blind) — disclosed in `-377`; WR13's live test
already uses a name that fails the SMS fit check. (4) The fit predicate's limit is not pinned to the DLT constant (blind) —
`MEMBER.maxLength` IS `DLT_TYPE_MAX_LENGTH.alphanumeric`, and leg (j) pins every slot. (5) Locale coverage is thin (blind) — the render is a
value substitution; the Hindi renders are the Rows 23 / 28 human reviewers'. (6) SN2's *"equals"* is wider than the module's comment
(blind) — `-377` is ratified text, the impact is negligible. (7) `⛔` as a negation in Panel-facing prose (blind) — house style; the
answered 2026-10-17 note reads the same and was ruled *"3. B"*. (8) "Dangling references to the story file" (blind) — a false
positive: the spec was excluded from the diff the Blind Hunter was given. (9) The go-live gate lives only in `notes:` on Rows 22 / 27
(blind + auditor) — BigDev's ruling, Debug Log (a2); the effect on the Panel note is P-3. (10) The "second shorten" fence is literal-only
(auditor) — AC1 made it *"Optionally"* and its title says what it checks; a plant was added anyway (P-7). (11) `ci:local 36/36`'s
mid-run comment edit is not in the commit message (auditor) — disclosed in Debug Log (d).

**Patch-diff pass** (a fresh-context reviewer of the eight patches, read-only): 0 high / 3 med / 5 low, **all applied** — the three
medium were this review's own: the note contradicted itself (it called the shorter form something a Pariwar "can switch on" and "already"
uses while also saying nothing in the app sets it), it claimed the form appears *"nowhere else in production"* (the app is ⛔ in
production, and a member's own Contribution Note builds the same pair), and "the shorter form is part of every send" was false for a short
name (the real reason: a text goes live for every name or for none). Low: the table's last row lumped different outcomes; the NFC/NFD item
said a Devanagari nukta letter counts the same either way (ऩ ऱ ऴ are 1 in NFC and 2 in NFD); the invisible-name item's reach omitted the
DigiLocker path; two `codeFacts` branches (`export … from`, a member call) had no plant (each now RED under a named mutant); AC1 still
prescribed the regex.

**Invariant lens (AI-6-5), the Auditor's verdicts:** families touched — 2 (idempotency: covered by construction, the function is pure),
6 (PII minimal: covered by test — the blob `.not.toContain` legs — and by construction, no new log / alarm / detail), 9 (deliberate
bypass: covered by construction — the override of the Pariwar's chosen form is documented with its `-359` / `-362` rationale), 10
(closure honesty: the findings above, all closed or carried), 11 (policy meaning: covered by construction, the family-terms sentence
matches the code, and by the behaviour legs). Untouched: 1, 3, 4, 5, 7, 8, 12, 13. ⛔ A REAL GAP on any touched family.


### v1.x Dev Agent Record (the superseded build)

#### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`) — `bmad-dev-story 6.37e`, 2026-10-22.

#### Debug Log References

**(a) Task 0.2 — BigDev's answers, VERBATIM (2026-10-21, in the `bmad-create-story validate 6.37e` session, after v1.2 `b04409ed`):**
*"recommendation accepted for  SN1–SN7 and PQ1 / PQ2"*

What that accepts — each the story's ⭐ recommendation as written at v1.2 (⛔ re-read here):
- SN1 (a) — the ONE function in a new module `apps/jobs/src/scheduler/sms-member-name.ts`.
- SN2 (a) — `smsMemberName(resolvedName): SmsMemberName` (`full` / `short` / `too_long`), input the MODE-RESOLVED name, throwing on
  `''` / whitespace-only input or an empty short form.
- SN3 (a) — keep the suspicion slot's literal 40; one unit leg pins the two slots' `maxLength` equal to
  `DLT_TYPE_MAX_LENGTH.alphanumeric`.
- SN4 (a) — a still-too-long suspicion name goes on to the send core UNCHANGED (`value_too_long` + alarm, as today).
- SN5 (a) — ⛔ new record that the short form was used.
- SN6 (a) — ⛔ new roster row; the 6.37e entry + the records commit as SN6 (a) lists them.
- SN7 (a) — ⛔ Hindi text change; the Rows 23 / 28 reviewer packets gain one short-form render per Hindi text.
- PQ1 (B′) and PQ2 (B′) — build the existing form as ruled AND route both edges to the Panel as ONE non-blocking confirm note
  (*"we will build the existing form; tell us if you want otherwise"* — the `-295` §8 / `-296` precedent). ⛔ Blocks the build. The note
  is WRITTEN at Task 0.3 from the template and is ⛔ shown to the Panel until BigDev sends it
  ([[feedback_shown_to_panel_means_sent]]); the 6.37e entry records the two edges as routed (non-blocking), ⛔ as the author's.
- Alongside (told to BigDev with the questions, ⛔ separately answered): F6 (the WhatsApp reminder becomes reachable for long-name
  claims, with the full name) and F17 (the full stop in `{member}` — Row 30 (d)'s special-character question) — both go into the
  6.37e entry's "Does NOT cover" / Consequences and SN6's records as written.

**(a2) BigDev's answer at the second validate, VERBATIM (2026-10-22, `bmad-create-story validate 6.37e`, after v1.3 `11162207`):**
asked *"Does the Trustee Panel's answer to the PQ1/PQ2 non-blocking confirm gate GO-LIVE of the long-name texts?"* — answered
*"Gates go-live (Recommended)"* (the option: *"Matches every earlier confirm (6.36, -295 §8). Add a dated condition note to roster
Row 22 (suspicion texts) and Row 27 (neighbours' text); no new row. The code still merges freely."*). ⇒ SN6 / Task 0.4 carry the two
condition notes; the confirm note says the build continues and go-live waits.

**(b) Task 0 — done 2026-10-22 (`bmad-dev-story 6.37e`).**
- 0.1: `git fetch origin` ⇒ `origin/main` = `1e22889e` (unchanged since v1.4). The re-check diff
  (`git diff --name-only bac71abb..origin/main -- apps/jobs packages/domain/src/notifications packages/domain/src/kyc
  packages/domain/src/claim/peer-mesh-wa-reminder.ts`) lists the same three benign files (header note); F1, F2, F4, F7 re-read in code
  at `1e22889e` — unchanged. `node_modules` present in the worktree (F14). REBASED onto `origin/main`: four steps, each conflicting only
  in the ledger block at the top of `sprint-status.yaml`, resolved by a scratchpad script that keeps every HEAD line and inserts the
  branch's lines at their slot (asserting every conflicted line is a `# last_updated:` line): `a85d712f` → `21r` 6.37e before 5.13's
  `21r` (two `21r` briefly); `b04409ed` → the 6.37e `21r` deleted, `21t` / `21s` before 5.13's `21r`; `11162207` → `21x` before `21w`;
  `cef06a81` → `22c` on top. Line counts 21783 → 21787 → 21788 → 21789 → 21790 (= main + the branch's net 7); YAML parsed after each
  step; ONE `21r` line (5.13's). New SHAs `ebb45851` / `5917b2a1` / `cc03000d` / `d8a8c12b`. `baseline_commit` re-pinned `bac71abb` →
  `1e22889e`. NUMBERS re-grepped over every ref and both worktrees: highest decision `-376` ⇒ `2026-10-22-377`; ledger `22c` taken ⇒ `22d`.
- 0.3: `2026-10-22-377` staged in the scratchpad, inserted above `-376` (additive only — `git diff --numstat` 39 / 0) and committed
  ALONE: `7cd8a7a4`. The confirm note `trustee-panel-routing-note-2026-10-22-6-37e-short-name-confirms.md` written from the template
  (Confirm 1 = PQ1, Confirm 2 = PQ2; the 6.36 confirms note's shape); its E4 commands RUN before commit — every grep hit; the `node`
  probe printed `45 → K. S.`, `44 → Venkata -.`, `44 → श्री श्री.`, `42 → Venkata S.` on Node v22.22.2 / ICU 78.2 / Unicode 17.0.
  ⛔ Sent — BigDev sends it.
- 0.4: the records commit — every edit append-only (roster: five `notes:` lines, each new line `startswith` its old line; deferred-work
  25 / 0; DLT sheet 10 / 0 and the `| <n> |` table-row count unchanged at 32; `claim.json` en + hi: only `$comment.suspicion_sms` /
  `$comment.peer_mesh_sms` changed, each new value `startswith` its old one, the three substrings the lockstep tests read kept);
  `sprint-status.yaml` 21790 → 21795, YAML parses, row 6-37e `in-progress`. Records commit `48a34913`.

**(c) RED proofs (AC7) — each mutant applied by a scratchpad runner that asserts the edit landed exactly once and ALWAYS restores
the file (the working-tree diff-stat was identical before and after every run).** Unit (`env -u DATABASE_URL pnpm --filter @twt/jobs
test sms-member-name` — ⛔ `--`; GREEN baseline `Test Files 1 passed (1)`, `Tests 16 passed (16)`):
- "always `full`" (the fit branch replaced by `return { kind: 'full', name: resolvedName }`) ⇒ RED: (b), (c), (d), (e), (f), (k).
- "always `short`" ⇒ RED: (a), (d), (e), (f) (first half — a fitting shielded input), (g), (i).
- a `< 40` boundary mutant (in `fitsDltAlphanumeric`) ⇒ RED: (a), (i).
- re-collapse a `full` (`resolvedName.split(/\s+/).join(' ')`) ⇒ RED: (g) only.
- BOTH guard checks removed ⇒ RED: (h), (h′). ONLY the `trim()` check removed ⇒ `Tests 16 passed (16)` — the second check (`short === ''`)
  carries both legs alone (SN2's belt and braces, proven).
- a UTF-16 `.length` mutant (in `fitsDltAlphanumeric`) ⇒ RED: (i) only.
- (j) — its own positive control: a planted `maxLength` 41 fed to the SAME `allEqualTo` comparison returns `false` (asserted in-test).
- the source leg — its own plants: an import from `../scheduler/sms-member-name.js` and a bare `smsMemberName (name)` call in third
  files ARE caught; a commented call / import is ⛔; the module itself must be in the walk. Before Tasks 2–3 wired the callers the
  three source legs were RED (`Tests 3 failed | 13 passed`) — the walk can fail.
Live (`DATABASE_URL` = :5433; both suites together, GREEN baseline `Tests 105 passed (105)` — 57 suspicion + 48 neighbours):
- the call removed (TODAY's code — the suspicion child sends `member` as is; the neighbours' step `[...name].length > 40 ⇒
  name_too_long`) ⇒ RED: the flipped P2, the CLOSED and the APPEAL short-form legs, the flipped R9 (`4 failed | 101 passed`).
- "always `full`" with ⛔ fit check ⇒ RED: the same four + the neighbours' new ONE-word leg + the AC5b re-claim leg (the name reaches
  the core ⇒ `value_too_long`, ⛔ `no_target:name_too_long`) (`6 failed | 99 passed`).
- TRUNCATION (`too_long` ⇒ `short` with `[...name].slice(0, 40)`) ⇒ RED: the suspicion ONE-word leg, the neighbours' ONE-word leg, the
  AC5b re-claim leg (`3 failed | 102 passed`).
- Task 3.1's "ORIGINAL `member` for `too_long`" — coverage-only BY DESIGN (the core ends `value_too_long` either way); ⛔ claimed RED.
- T5: the P2 leg FLIPPED, ⛔ deleted — renamed *"… FLIPPED by 6.37e (`-359` B) …"*; its refusal assertions moved to the new ONE-word
  leg; its "⛔ the name in an alarm" assertion kept (now over the AC5 blob). The `isolated()` + `allowAppeal` combination WORKED (the
  CLOSED leg) — ⛔ fallback to the default Pariwar was needed.

**(d) Gates (Task 4).** AC4: `readMemberFacingDeceasedName`'s JSDoc + body byte-identical to `1e22889e` (a scripted block compare:
`True`, 2363 chars; `git diff 1e22889e` shows hunks only in the module header, the import list and `readDeceasedName`); WR13 *"a name
that FAILS the SMS fit check is sent IN FULL"* run alone: `1 passed`; `claim-peer-mesh-wa-reminders-live` + `peer-mesh-sms-templates`
`58 passed`. AC6: `git diff --stat $(git merge-base origin/main HEAD) -- apps packages` = exactly the new module + its test, the two
schedulers, the two registry headers, the three edited test files and the two `claim.json` files (11 files); `claim-dlt-sms-send.ts`,
`claim-peer-mesh-wa-reminders.ts` and `packages/domain` untouched (`git diff --quiet`). `pnpm --filter @twt/jobs typecheck` clean;
`pnpm --filter @twt/jobs lint` clean; the new header has ⛔ `**/`, `{#var#}`, `DLT_VAR` or `sms.dlt.template_id.`; after `git add` of the
new files, `pnpm dlt-typed-variables:test` 25 passed and `pnpm dlt-typed-variables:check` passed.
`DATABASE_URL=…:5433 pnpm ci:local` — **PASSED, 36 job(s) green** (incl. `integration-tests`, `friction-budget`, `dlt-typed-variables`),
exit 0, first run (⛔ re-run). ⚠ During that run ONE comment-only edit was made (a 190-char line in `suspicion-notice-sms-templates.ts`'s
header rewrapped — the Task 3.2 edit had ended mid-line); after it, `lint` clean, `dlt-typed-variables:check` passed, and
`suspicion-notice-sms-templates` + `sms-member-name` `74 passed` — said here, ⛔ hidden.

**(e) Code review 2026-10-22 — the eight patches (Review Findings P-1…P-8).** RED proof of the NEW test legs (P-7) — each mutant applied to a
temporary COPY of `sms-member-name.test.ts` (`tests/zz-mutant-…`, deleted after each run; the real file untouched), asserting the edit landed
exactly once: M1 `callsModule` never true ⇒ 2 legs red (the third-caller / naming-only leg and the glob-string / `' //'` / dynamic-import
leg); M2 dynamic `import()` ignored ⇒ 1 red; M3 the `'shielded_name'` literal ignored ⇒ 2 red (the second-shorten leg and its plant);
M4 a string that merely names the function counted as a call ⇒ 1 red (the naming-only plant) — ⚠ the first M4 was mis-placed (inside the
call branch, so it could not see string nodes) and stayed green; it was redone at the right spot and went red; M5 `export … from` ignored ⇒
1 red; M6 a member-call callee ignored ⇒ 1 red. The two hole plants (`'src/*.ts'`, `' //'`) were separately reproduced against the OLD regex
strip by the Edge Case Hunter and the patch-diff reviewer. Old-vs-new regression check (the patch-diff reviewer, all 64 files of
`apps/jobs/src`): the caller set is identical; the only difference is the module's own declaration, which `callersOf` skips.
Gates on the final tree: `pnpm --filter @twt/jobs typecheck` and `lint` exit 0; `pnpm dlt-typed-variables:check` exit 0; the four related pure
unit files `115 passed` (`sms-member-name` 19, `claim-suspicion-notice-no-decision`, `suspicion-notice-sms-templates`,
`peer-mesh-sms-templates`); the static gates `access-wrapper`, `domain-invariants`, `claim-state`, `claim-canonical-id`,
`claim-adjudication-human-actor`, `governance-boundary`, `friction`, `kyc-provider`, `microcopy`, `pii` (`:check`) all exit 0.
⚠ NOT re-run: `ci:local` and the live-DB suites — the only change under `apps/*/src` is a header COMMENT (P-6), the live tests are untouched,
and (d)'s `36/36` was on the tree before these eight patches.

#### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created (`bmad-create-story 6-37e`, 2026-10-21).
- 2026-10-22 (`bmad-dev-story 6.37e`) — Task 0: branch rebased onto `1e22889e`; `2026-10-22-377` committed alone (`7cd8a7a4`); the
  records commit (`48a34913`) incl. the PQ1 / PQ2 confirm note — WRITTEN, ⛔ sent (BigDev sends it; its answer gates go-live, Rows 22 / 27).
- Task 1: `smsMemberName(resolvedName)` in `apps/jobs/src/scheduler/sms-member-name.ts` — `full` iff `fitsDltAlphanumeric`, else
  `short` = `notifications.resolveMemberFacingDeceasedName('shielded_name', …)` iff THAT fits, else `too_long`; both empty-name
  guards run BEFORE the fit (so the second guard alone carries (h) / (h′) — proven). 16 unit legs (AC1 (a)–(k), SN3's one-limit leg
  with a positive control, the callers' source leg with plants and the I4 "⛔ second fit / shorten" walk). `NOTICE_MODULES` gains the
  module (five modules; header updated).
- Task 2: `readDeceasedName` calls `smsMemberName` — `too_long` ⇒ `name_too_long`, else the chosen name; `fitsDltAlphanumeric` dropped
  from the import (export kept, T7). `readMemberFacingDeceasedName` byte-identical (AC4). Live: R9 FLIPPED (the two-word 41 now sends
  "AAAAAAAAAAAAAAAAAAAA B." to all five, body through the real `renderPeerMeshRequest`); a NEW one-word leg keeps `no_target:name_too_long`;
  the AC5b re-claim leg's FIXTURE → `'A'.repeat(41)` (assertions unchanged); the suite header and the registry header updated.
- Task 3: the suspicion child sends ONE local (`memberValue`) to both `render` and `values` — the chosen name, or the ORIGINAL
  `member` for `too_long` (the core refuses it as today, SN4). Live: P2 FLIPPED (sends "Ramesh I."), the CLOSED and APPEAL notices'
  short-form legs (date through the real `formatAppealUntil`), a NEW one-word leg keeping `value_too_long` + alarm. Every new / flipped
  leg asserts ⛔ distinctive name token (and ⛔ the short form where sent) over `{ enqueued, alarms, rows }`.
- Task 4: every leg RED under its AC7 mutant (Debug Log (c)); gates (Debug Log (d)).
- ⛔ Migration, schema, detail vocabulary, registered text, send-core or `packages/domain` source change. Nothing is live (F11).

#### File List

- `.decision-log.md` — `2026-10-22-377` (commit `7cd8a7a4`, alone)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-22-6-37e-short-name-confirms.md` — NEW (WRITTEN, ⛔ sent)
- `_bmad-output/planning-artifacts/epics.md` — `### Story 6.37e`
- `_bmad-output/implementation-artifacts/deferred-work.md` — two dated notes + a new owed-confirm item
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — row 6-37e, comment, ledgers `2026-10-22d` / `2026-10-22e`
- `_bmad-output/implementation-artifacts/6-37e-suspicion-text-short-name-fallback.md` — this file
- `docs/launch-gate-inventory/inventory-roster.md` — Rows 22, 23, 27, 28, 30 dated notes
- `docs/launch-gate-inventory/dlt-template-requests-6-19.md` — three dated prose notes
- `packages/i18n/locales/en/claim.json`, `packages/i18n/locales/hi/claim.json` — `$comment.suspicion_sms` / `$comment.peer_mesh_sms` appended
- `apps/jobs/src/scheduler/sms-member-name.ts` — NEW
- `apps/jobs/src/scheduler/claim-peer-mesh-requests.ts`
- `apps/jobs/src/scheduler/claim-suspicion-notices.ts`
- `apps/jobs/src/scheduler/peer-mesh-sms-templates.ts` — header comment only
- `apps/jobs/src/scheduler/suspicion-notice-sms-templates.ts` — header comment only
- `apps/jobs/tests/sms-member-name.test.ts` — NEW
- `apps/jobs/tests/claim-suspicion-notices-live.test.ts`
- `apps/jobs/tests/claim-peer-mesh-requests-live.test.ts`
- `apps/jobs/tests/claim-suspicion-notice-no-decision.test.ts`

## Change Log

- v2.5 (2026-10-22) — **Review continuation** (`bmad-dev-story 6.37e`, Claude Opus 5.5): addressed code review findings — 3 items resolved (R1 P2, R2 P2, R3 P3).
  R1: template 14 provisioned Unicode again (BigDev: *"14 back to Unicode"*), records qualified, 8 / 10 / 12 and the told cost recorded OPEN; R2: AC6 blob assertions on
  four live legs, 4 leak mutants RED (GREEN pre-R2); R3: the epic's PQ1 discharge. `ci:local` 36 / 36 on :5433. Status `in-progress` → `review`. Not committed, not pushed.
- v2.4 (2026-10-22) — **Rework code review recorded** (`bmad-code-review 6.37e`, `1e22889e` → `55a59859`): three review layers; 0 decision-needed / 3 patch / 0 defer / 2 dismissed. BigDev chose **2 — Leave as action items**. R1–R3 remain unchecked in Review Findings. Independent verification: 159 targeted unit/registry tests and 135 live tests passed; Unicode-name rendering probe confirms fixed/rendered encoding differs, provider delivery unverified. Story Status and sprint row `review` → `in-progress`. No implementation patches, commit or push.

- v2.3 (2026-10-22) — **Dev complete** (`bmad-dev-story 6.37e`, Claude Opus 5.5). Task 0: preflight clean; BigDev at Task 0.3: *"you know what route to panel,
  prepare routing note"* ⇒ the dropped "short" became `-380` PQ1 (routed) instead of a told item; `-380` (`17242731`) + records (`8e79a863`); the Panel answered —
  `-381` Trustee-ratified PQ1 A (`654e1636`) + records (`a11233be`). Tasks 1–5: code `16b16f22`. Task 6: 35 mutant runs RED (Debug Log (c)); gates and `ci:local` 36 / 36
  on :5433 (Debug Log (d)); AC5 byte-identity and the G3 / G12 figures confirmed (Debug Log (e)). Status → review; row 6-37e in-progress → review; ledger `22o`. Not pushed.
- v2.2 (2026-10-22) — **Task 0.2 ANSWERED by BigDev** (to the create-story session; recorded VERBATIM in Debug Log (a)): *"NB1-NB9 approved. A small
  modification is done in NB7."* — every NB at its recommendation; BigDev's own edit to NB7 drops the word "short" from templates 13 (hi *"कुछ प्रश्नों"*) and
  14 (en *"a few questions"*). §0 applied: the word is in a Trustee-ratified phrase (`-304` Q6 A; `-379` Q2 A as put) ⇒ raised to BigDev with options;
  BigDev: *"Build with my words. Panel has already authorized me to make small changes."* — carried as BigDev's reaffirmed decision. The decision log was
  grepped the same day for that authorisation: ⛔ found (`-210` cl.2 delegates enum additions only; `-349` decision 4 names exactly this "nearest wording"
  delegation for templates 7–14 and leaves it UN-routed) — BigDev is asked to name the instrument at Task 0.3; the rework entry otherwise records the statement
  verbatim as the basis, and the final 13 / 14 words become a TOLD item to the Panel before Row 27 registers them (`-349` decision 2's own rule). Sites
  updated: NB7 (a) (accepted-with-edit; the reminder and the app chrome keep "short"), N8, AC2 (3), the §0 re-run heading + a new first row, the WhatsApp row,
  the Policy-meaning verbatim check and length line (170 / 211), G3 (13 hi 40.0 %, 14 en 34.7 %, 32.4 % at 40-letter boxes), G12 (13 hi 194 / 235 / 300, 14 en
  170 / 211 / 276 — no segment count changes), G4 (viii), NB8, Task 0.2 (done), Task 0.3 (§0 section, told item), Task 0.4 (Row 28's "छोटे"; Row 27's told
  item), NUMBERS (`22l` taken here; Task 0.4's is `22m`). Row stays `ready-for-dev` (dev starts at Task 0.1 / 0.3). ⛔ Code; ⛔ number taken. Ledger `2026-10-22l`.
- v2.1 (2026-10-22) — **VALIDATED** by `bmad-create-story validate 6.37e` against the uncommitted v2.0 (branch tip `ede854dc`, `origin/main` `1e22889e`
  re-fetched — unmoved): three fresh-context read-only verifiers in parallel — code claims (17 mandatory probes, all run), rulings / records / numbers,
  edge cases / test feasibility (a faithful scratch implementation of N1–N5 / NB3 / NB4 run over every AC1 literal and adversarial inputs) — **0 H / 9 M / 26 L,
  all applied**; every finding FOUND in the record, ⛔ one DECIDED; ⛔ Panel question, ⛔ STOP. MEDIUM: the forced cut can land INSIDE a grapheme cluster for
  a 59–60-code-point name (reachable — about half of synthetic Devanagari names of 60 have no cluster boundary at 30; NB3 (b) had said "only … a space"):
  N5 / NB3 (b) reworded, a COMPUTED AC1 (d) leg added, the box-value question added to the rework entry's *Does NOT cover* and Row 30 (d)'s note; the
  AC8 "always `full`" mutant is coverage-only for the AC3 one-word leg (it ends `value_too_long` either way) — the row split; the §0 re-run attributed
  *"a whole letter"* to the ruled words (it is `-378` 2 (c), the author's) — re-attributed; `-377` SN1 listed "kept" though its two import clauses
  (`fitsDltAlphanumeric`, `@twt/domain`) are superseded, and SN6 listed "replaced" though NB9 (a) restates it — the table, Task 0.3 and NB9 say which
  half; Task 0.4 missed four stale "option B — built in row 6-37e" sites (the 6.37c-pack sitting item, the two older routing notes' ruling blocks, the
  BF24 cost FYI whose English figures `-379` supersedes) and the two code-review items anchored on the 40 — added; Row 30 (d)'s "full-stop item is MOOT"
  was half true (a stop INSIDE a stored name is now sent whole — more names reach the question) — reworded; one glyph inversion in NB4 (iii) (*"⛔ and
  only when above 60"* read as "not only") — fixed. LOW (26): the §0 `shielded_name` row re-labelled the author's (`-379` composed with `-181` cl.1's author-commit reading of `-136` cl.2;
  unreachable — G15 now names the uncalled domain writer) and listed in *Does NOT cover*; `-378` decision 3 "as SENT" (no app pointer); the `-379` box
  sentence quoted only where `-379` quotes; `-349` in its own words; the Debug Log letters exempted in LETTERS; `readMemberFacingDeceasedName`'s stale
  JSDoc sentence made a comment-only edit (AC5 / AC7 / Task 4.1 / Debug Log (e)); NB8's rework-entry sentence on `-303`'s "same words" in terms; the
  I4 title-list fact must match a literal that CONTAINS `shrimati` (NB4 writes one string); `sms-preflight.test.ts`'s fixture prose named and LEFT (G4
  (vii)); the no-decision fence's real predicate (writer names / table writes, ⛔ domain imports); G3's percentages floored as the checker prints;
  the pre-flight memo key includes the template id; `i18nParamNames`' file; the four v1.x commits named; joined initials `MS` / `MR` / `DR` read as
  titles (NB4 (a) cost); `(Late)` a WORD that initialises to `L` (NB4 (ii)); N5's whitespace clause ("when the NAME does"); NB4 (vii) / AC1 (l) "every
  earlier word THAT HAS a first letter"; the single-space re-join (NB4 (vi)); AC2 (1)'s render-side "⛔ helpline" moved to the `values` (a render
  assertion cannot fail); AC1 (m)'s positive control stated for what `toBe` proves; AC8 (b) / (c) split; the member-terms sentence and the user story say
  "the words at the front … never the last word" (⛔ "first names / family name"); the Policy meaning names the widening's readers (reminder, reply,
  assembler — intended) and the SMS-shortened / WhatsApp-full two-forms fact. Then **one fresh-context re-validate of the patch — 1 H / 3 M / 5 L,
  ALL the pass's own, all fixed before commit**: HIGH — the pass's `sprint-status.yaml` edit DUPLICATED the top-level `last_updated: >-` key (PyYAML's
  `safe_load` parses it silently, last key wins — the new scalar line was being discarded; strict parsers reject it) — the second key deleted and the file
  re-parsed with a duplicate-key-detecting loader (footgun: `safe_load` is ⛔ a YAML validity check); MEDIUM — "two ratified clauses composed" named the
  wrong instrument (`-181` cl.1 is an AUTHOR-commit resting on `-136` cl.2 — footgun 22) — reworded in §0 row 3 and Task 0.3; G4 (vi) still said "two
  `packages/channels` exceptions" after (vii) became LEAVE; "byte-identical" for `readMemberFacingDeceasedName` survived at three sites the comment-only
  JSDoc edit falsifies (What ships, G1, N6) — "body byte-identical; one JSDoc sentence re-worded" at each; LOW — `dlt-variables.ts` "⛔ edited" → "⛔ code
  edited"; the BF24 quote restored exactly ("rendered") and its superseded parts stated in full (the typical Hindi figure and the 40-letter ceiling too;
  the 3–5 Hindi range stands); the "61–120-letter" bound replaced by "a name above 60 that the rule CAN shorten"; the `MS` cost example made conditional;
  AC1's "literals are ASCII" header excepts the cluster leg's Devanagari input. Row stays `ready-for-dev`. ⛔ Code; ⛔ number taken. Ledger `2026-10-22k`
  (Task 0.4's is now `22l`).
- v2.0 (2026-10-22) — **REWRITTEN** by `bmad-create-story 6.37e` against `2026-10-22-379` (Trustee-ratified, Q1 A + Q2 A; the v1.7 reopen banner's
  "next: rewrite this story" discharged). The v1.7 body — the "Ramesh S." ACs, Tasks, SN1–SN7, PQ1–PQ2, F1–F17, T1–T14 — is REPLACED, ⛔ patched
  (footgun #20's meta-lesson: rewrite and record the supersession); recoverable at `ede854dc`; the v1.x review findings, Debug Log, Completion Notes,
  File List and every Change Log row below are kept verbatim. **What the story now orders:** ONE pure function, `smsMemberName` — the mode-resolved name
  WHOLE whenever it fits 60 code points, carried across TWO 30-letter alphanumeric variables `{member1}{member2}`; above 60 the listed titles dropped, then
  initials from the FIRST word one at a time, ⛔ never the last word; still too long ⇒ today's outcome; templates 7–14 re-shaped (7–10 keep the helpline,
  11–14 lose it); the WhatsApp reminder untouched. **Found at authoring (each traced to code, ⛔ decision text):** G5 — ⭐⭐ the WhatsApp reminder's body is
  DERIVED from `peer_mesh_sms.request` (rewriting the SMS key would break its lockstep test and tempt an edit of the Meta body — the reminder gets its own
  key, NB8); G4 — template 14 (en) stops being Unicode (the em dash was its only non-GSM-7 character: `UNICODE_ENGLISH` in `dlt-template-sheet.test.ts`, the
  sheet's SMS-type step, the cost lines); G6 — the reminder's WR13 leg is sized for the 40-letter limit (52 letters now FIT); G7 — an empty variable would
  reach MSG91 as `""` (NB3 (b) never sends one); G9 — the helpline "not a callback number" warning would be false for 11–14 (NB6 (b)); G17 — the slots live
  in a SIBLING file so the "one function, two callers" fence stays true (NB1); TR3 — every 40 / 41 fixture is now BELOW the boundary; the sheet's
  registered-text rows cannot ride the records commit (the lockstep tests would be RED between commits — AC0). The rule was RUN before it was written
  (G14: the Panel's own 65 → 55 example reproduced literally; 20,000 seeded names, 0 violations). Costs recomputed with the sheet's own method (G12).
  NB1–NB9 PROPOSED for BigDev at Task 0.2; PQ none (§0 re-run: every edge a MATCH or the author's). Row `in-progress` → `ready-for-dev`. ⛔ Code.
  Ledger 2026-10-22j. **Then ONE fresh-context read-only verifier** (about 190 claims checked against the repo, about 172 fully true): 0 H / 5 M / 13 L, all applied after the author re-checked the disputable ones against the repo. MEDIUM: `microcopy:check` scans the WHOLE claim.json text, `$comment` lines included (G11 — the new comment sentences must avoid `report` / `user` …); the helpline-warning live leg seeded only the refusal text, so the suppression mutant left it green (AC3 now adds `contact(d, s, { linked: null })`); TR2's "grep must be empty" could not be met (three plain-text mentions remain); N6 / G5 said "registered with Meta" when nothing is (Row 35 is open); Tasks 1–5 left the tree RED between steps (a commit plan now says they are ONE commit, and the WhatsApp key is minted before the SMS key is rewritten). LOW: ledger `22j` is this run's own, so Task 0.4's line is `22k`; a third worktree exists; G4 missed ADR-0041 and the `needsUnicode` JSDoc; the Hindi 11 keeps पर; two quoted names that do not exist; the source-leg plants (a real call AFTER a glob string IS caught); the mode is read BEFORE the claiming transaction; a mis-attributed Panel quote; `title` hits are `title_en`; a wrong cycle reason; `new Set<string>()`; one new file, not two. The verifier could not re-run G14's 20,000-name sweep (it re-derived the examples and cut literals); MSG91 / operator acceptance of empty or adjacent variables is open by design.

- v1.7 (2026-10-22) — **REOPENED** (BigDev: *"go ahead"* — reopen on this branch rather than a new row). The PQ1 / PQ2 confirm note was
  WITHDRAWN unsent (`-378`; BigDev rejected "K. S."); the replacement note was sent and answered — `-379` (Dhiraj Rahul + Kalpana
  Bharti: Q1 A, Q2 A) supersedes the "Ramesh S." fallback this story built. Status done → in-progress; row 6-37e done → in-progress.
  ⛔ Code changed in this version; the story is to be rewritten against `-379` before dev resumes.
- v1.6 (2026-10-22) — `bmad-code-review 6.37e` (whole branch, `1e22889e` → `55bf7477`): Blind Hunter, Edge Case Hunter and Acceptance
  Auditor in parallel, read-only. **0 decision-needed / 8 patch / 2 defer / 11 dismissed** (Review Findings). BigDev's standing instruction
  *"apply all the patches found, if any decision, I will answer it at last"* — no decision arose; all eight applied: the Hindi examples
  transposed between Rows 23 / 28; the PQ1 / PQ2 confirm note's accuracy (the directory's name form is not the text's — stray marks and
  invisible characters; the go-live hold covers the whole of each text; option C's missing rule; no screen sets `shielded_name` yet); the
  6.24b deferred item scoped to the branch; the suspicion header's `throws ONLY` sentence; the I4 source leg moved from a comment-stripping
  regex to the TypeScript AST (16 → 19 unit legs, six mutants RED — Debug Log (e)); the test header's wording. Then a fresh-context
  review of the patch diff: 0 H / 3 M / 5 L, all applied. Two items deferred to `deferred-work.md` (an invisible-only name; NFC vs NFD).
  Spec amended: AC1, AC7's table, Task 1.2, the reuse map. Status review → done; row 6-37e review → done. Ledger 2026-10-22f.
  Committed on the story branch (BigDev: *"commit"*); ⛔ pushed.
- v1.5 (2026-10-22) — `bmad-dev-story 6.37e`: DEV COMPLETE (Tasks 0–5). Rebased onto `1e22889e`; `2026-10-22-377` (`7cd8a7a4`);
  records + the PQ1 / PQ2 confirm note, WRITTEN, ⛔ sent (`48a34913`); `smsMemberName` and its two callers; AC1–AC3 legs, every new /
  flipped leg proven RED (Debug Log (c)); gates (Debug Log (d)). Status → review; row 6-37e in-progress → review. Ledgers
  2026-10-22d, 2026-10-22e.
- v1.4 (2026-10-22) — `bmad-create-story validate 6.37e` (second pass): three fresh-context verifiers (code claims · rulings,
  records and numbers · edge cases and test feasibility) against `origin/main` = `1e22889e`; 2 H / 9 M / 8 L, all applied (BigDev:
  "all"); go-live gate answered (Debug Log (a2)). HIGH: 5.13 LANDED — NUMBERS rewritten (`-376` / Row 39 / 0178 / its ledger letters
  taken; next free `2026-10-22-377`, `2026-10-22c`), the header's PQ / re-check lines, Sequencing and Git intelligence (the suspicion
  scheduler's last edit was 6.37b); Task 0.1 now orders the REBASE and the by-hand ledger-slot resolution. MEDIUM: the confirm note's
  file name, template shape and commit home (0.3 writes, 0.4 commits); the owed-confirm deferred item replaces the moot PQ1 (A) item,
  and the 6.37e entry gains §0 / PQ / Consequences lines (`-376`'s shape); Rows 22 / 27 go-live condition notes; the 6.37-round-2
  "Closed by" scoped to names whose short form fits; AC0 restated for B′; AC7's mutant-per-leg table (coverage-only legs named);
  SN2's throw — unreachable, its cost, why ⛔ `too_long`, a name-free message; Task 2.3 vs AC3 (the
  re-claim leg is fixture-only); AC5 over alarms + enqueued + rows, the short-form assertion only on short-form legs, distinctive
  one-word fixtures. LOW: AC2's oracle (date, locale, message by body, imports; fixture order; the `isolated()` + `allowAppeal`
  fallback); ICU qualifiers on the PQ1 / PQ2 Devanagari examples; the family sentence's "written without spaces"; T7 / F6's second
  importer; F13 / F15 (b) quotes made greppable; the new sprint-comment line; the `-284` E5 / `6-24b-two-confirms` precedents; the
  epics.md line; `GATE_INPUTS`. Every code claim re-derived at `1e22889e` held. Then ONE fresh-context re-validate of the patch
  diff (0 H / 6 M / 8 L — all the pass's own, applied before commit): AC5's blob per suite (`rows` is a helper in the peer-mesh
  suite; build after the last `tick`); SN2's two checks KEPT as accepted at v1.2 (a draft had made the second optional — a narrowing
  of the accepted SN2 (a), reverted) and AC7's (h) / (h′) two-step mutant; the `21r` rebase step (two `21r` lines briefly; delete
  only 6.37e's); the Rows 22 / 27 notes state in terms that the row does ⛔ close while the confirm is unanswered (the Row 22 (c) /
  Row 31 (g) precedents); the older-ICU Devanagari initial is `श्` (virama = Extend), ⛔ `श` (short form 40, still sends); AC7 (f)
  split; the appeal-date leg slices rather than calling `formatAppealUntil`; `22c` taken ⇒ next `22d`, `-377` dated by its commit;
  the entry's field order (PQ after The decisions); the deferred-work precedent cited by title; 5.13 touched three jobs files; the
  peer-mesh throw re-throws every sweep; the sprint-comment vs `>-` attribution; References gain Rows 22 / 23 / 28 / 31 (g).
  Row stays `ready-for-dev`. Ledger 2026-10-22c.
- v1.3 (2026-10-21) — Task 0.2 done: BigDev accepted every recommendation (SN1–SN7 (a); PQ1 / PQ2 (B′) — one non-blocking
  confirm note, WRITTEN at 0.3, ⛔ sent until BigDev sends it); recorded verbatim in Debug Log (a). Row stays `ready-for-dev` (Task 0.4
  flips it). ⚠ Since v1.2 the peer row 5-13 has announced it takes `-376`, roster Row 39, migration 0178 and ledger letters u / v / w —
  this story's entry takes the next free id at its own commit (Task 0.3 re-greps).
- v1.2 (2026-10-21) — `bmad-create-story validate 6.37e`: four fresh-context verifiers (code claims · rulings and records · edge
  cases · gates and tests), 2 H / 11 M / 12 L, all applied (BigDev: "all"). HIGH: the creation ledger line re-lettered
  `2026-10-21r` → `2026-10-21s` (`r` was taken first by 5.13's `618bda20` — `-366` d6; its "v1.0" → v1.1); the multi-word
  "short form still too long" case reclassified from MATCH to a NARROWING of option B as put ⇒ new PQ2, and the family-terms sentence
  corrected. MEDIUM: option B's outcome and cost lines transcribed verbatim (both rulings were bare letters); `[member]`'s mode-resolved
  form marked "Our reading" in `-291` / `-293`; PQ1 widened (last word not a surname, invisible characters, "श्री श्री.") with its
  match / narrow stated and the recommendation moved to B; F16 (⛔ token cleaning in the member-facing shielded arm) + AC1 (k); F17
  (the full stop in `{member}` — Row 30 (d)); F6's consequence (the WhatsApp reminder becomes reachable for long-name claims); AC2's
  fixtures (`claimOf` + `allowAppeal`; `openAppeal` suppresses the appeal notice; message ≠ purpose); the unit command (⛔ `--`;
  `passWithNoTests`); AC1's source leg on the staff-email fence's model; AC4 / AC6 / Task 4 off the literal pin; F15 widened (sheet
  7–12 + Shape rules, two `claim.json` `$comment`s, the peer-mesh suite header); Task 1.2's `NOTICE_MODULES` reason and header.
  LOW: SN2's whitespace guard + AC1 (h′); F7's one non-idempotent input; SN7's Hindi renders for Rows 23 / 28; AC1 (i) one word;
  Task 2.2 definite (lint); AC5 written by Tasks 2.3 / 3.3; the `git add` reason; DLT comment rules; cite precision (`-181` Context,
  `-136` cl.2's elaboration, R9 = 6.27c's item, `-322` C7 status, the length wording, `-359`'s third not-covered item); the 6.24b
  note names option C; NUMBERS contested by 5-13; F14, `expectIdsOnly`, SN3; the AI-10-1 "only widens" line. Then ONE fresh-context
  re-validate of the patch diff (0 H / 4 M / 8 L — all the pass's own, applied before commit): F17's cite is Row 30 note (6)(d), ⛔ Row
  32; the `$comment` check answered (two lockstep tests read those values by substring ⇒ append, keep the substrings); PQ1 / PQ2 gain
  (B′) a non-blocking confirm (`-295` §8 / `-296` precedent) and recommend it — a told item would leave the author deciding a
  narrowing §0 lists as the Panel's; AC1's source leg on full repo paths; SN3's reason (the split hurts the SUSPICION slot); Task 0.1
  (AC6 uses the merge-base) and the header's re-check paths; the no-decision fence header's module list; AC0 excepts the `$comment`
  sentences; NUMBERS (5-13 contests the decision id and the ledger letter only; letters by analogy to `-366` d6); `-359`'s *less*.
- v1.1 (2026-10-21) — one fresh-context checklist verifier (0 H / 3 M / 9 L, all applied): F15 (two more stale "no text" statements —
  the neighbours' registry header, the registration sheet); AC5's explicit name assertions (`expectIdsOnly` checks only "Ramesh");
  PQ1 weighs the full name on the link page; `-136` is Trustee-ratified; `values` is an array; AC4 / Task 2.1 reconciled; AC6 per SN1 (a);
  `NOTICE_MODULES`; the 6.37e entry's shape.
- v1.0 (2026-10-21) — created by `bmad-create-story 6-37e` at `bac71abb`; SN1–SN7 proposed, PQ1 candidate; status `ready-for-dev`.
