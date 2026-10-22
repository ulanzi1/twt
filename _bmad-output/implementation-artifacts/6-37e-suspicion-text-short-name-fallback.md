---
baseline_commit: 1e22889e
---

<!--
PINNED: `bac71abb` (2026-10-21 — `main` after `git fetch origin`; `origin/main` = `bac71abb`, 0 ahead / 0 behind; carries ALL of
6.37 / 6.37b / 6.37c / 6.37d / 6.31 / 6.27c and 5.12 / 5.10). Built in its OWN worktree `/Users/dev/Developer/projects/TWT-6-37e`,
branch `story/6-37e-suspicion-text-short-name-fallback` ([[feedback_commit_on_story_branch]], [[feedback_shared_tree_branch_switch]] —
a peer session holds the main checkout on `story/5-13-whatsapp-code-for-another-phone`). Two facts, stated separately: (1) the pin is
an ancestor of this branch (durable); (2) every `apps/` / `packages/` cite below was re-derived at `bac71abb` (perishable — re-check at
Task 0.1: `git diff --name-only bac71abb..origin/main -- apps/jobs packages/domain/src/notifications packages/domain/src/kyc
packages/domain/src/claim/peer-mesh-wa-reminder.ts`).
Re-locate by FUNCTION, ⛔ by line number ([[feedback_story_validate_footguns]] #19, #21, #24).
⚠ Branches that show as "ahead of main" on these files (`story/6-24b-…`, `story/6-29-…`, `story/6-34-…` and their `origin/` twins) are
LANDED stories' pre-rebase heads — ⛔ live work. Re-check at 0.1 anyway.
⭐ RE-CHECKED 2026-10-22 at `origin/main` = `1e22889e` (12 commits past the pin — Story 5.13 LANDED by fast-forward; the main checkout
is back on `main`, ⛔ peer session). The re-check diff lists THREE files, all benign: `claim-peer-mesh-wa-reminders.ts`
(`TEMPLATE_NAME_FORM` now re-exported from `@twt/channels`), `wa-template-config-key.ts` (now a re-export) and
`claim-contact-ladder-whatsapp.test.ts` — ⛔ an F-fact's subject, ⛔ a file this story edits; `readMemberFacingDeceasedName` and the
four edited files are byte-unchanged. Every code claim below re-derived at `1e22889e`. The branch is ⛔ yet rebased — Task 0.1.

§0 GATE (the routing template's, applied FIRST — `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`): the
BEHAVIOUR is the Panel's and is ALREADY RULED — `2026-10-18-359` (B, the three suspicion texts) and `2026-10-18-362` (B, the neighbours'
text). Both notes said, as the Panel read them, that *"how a fallback would be built"* / *"how a fallback is built (one function, shared
with the suspicion texts)"* is ENGINEERING — ⛔ asked. Every SN below is therefore the AUTHOR's. ⚠ TWO questions have a
person-facing half: PQ1 (a long name whose first word is not a first name, or whose last word is not a surname) and PQ2 (a multi-word
name whose shorter form is STILL too long — a NARROWING of option B as put). ANSWERED at Task 0.2 (2026-10-21, Debug Log (a)): both
(B′) — built as ruled AND routed as ONE non-blocking confirm note (Task 0.3 / 0.4); the answer GATES GO-LIVE of the long-name texts
(BigDev 2026-10-22, Debug Log (a2)) — ⛔ the build or the merge. ⛔ No counsel question.

GLYPH REGISTER: `⛔` negates the word it precedes; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md`, `sprint-status.yaml` or `inventory-roster.md` (newest-first or growing files — footgun #19) — cite the decision id,
the item's phrase, or the row key.

NUMBERS (`-366` decision 6: *"the number belongs to the first COMMIT that takes it on any branch"*): ⛔ claimed by this file; each is
"the next free one" at the commit that takes it (Task 0.1 / 0.3). The contest with row 5-13 is OVER — 5.13 landed on `main`
(`1e22889e`) holding `-376`, roster Row 39, migration 0178 and the ledger lines `2026-10-21` r / u / v / w / y / z, a bare
`2026-10-21` (5.13's lettering slip — leave it) and `2026-10-22` / `2026-10-22b`. At 2026-10-22 the next free are: decision
`-377` (every ref and worktree tops out at `-376`; dated the day it is committed — `2026-10-22-377` if today), roster Row 40 and
migration 0179 (this story needs ⛔ either — SN6); ledger `2026-10-22c` is TAKEN by this story's v1.4 validate ⇒ next free `22d`
(⛔ `22a` — main went bare → `b`). LEDGER LETTERS follow the decision rule by analogy (it bit once: the creation
line was re-lettered `2026-10-21r` → `2026-10-21s`).

LETTERS: F = found facts (F1–F17); SN = build decisions (SN1–SN7 — ANSWERED 2026-10-21: each recommendation (a), Debug Log (a)); PQ = candidate Panel questions
(PQ1, PQ2); I = invariants (I1–I6); T = traps (T1–T14). This story's OWN decision entry is called **"the 6.37e entry"** below.
-->

# Story 6.37e: When the member's full name is too long for a text, the family and the neighbours still get the text — with the first name and the surname's initial

Status: done

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** Four SMS texts name the deceased member in a `{member}` slot of 40 code points: the three
> suspicion texts (the nominee's refusal notice — `-262` FQ7 B; the closed notice — `-291` Q2 B; the refused person's appeal notice —
> `-293` item 1 B) and the text to the five neighbours (`-303` Q1 A). Today a name over 40 means ⛔ text: the suspicion notice is claimed
> and then refused by the send core (`dlt_template_not_approved:value_too_long` + an alarm that reaches the logs only); the neighbours'
> text is never begun for that claim (`no_target:name_too_long`, claim-wide). The Panel ruled B twice: **send it with the shorter name
> form — first name and the surname's initial ("Ramesh S."), the form a Pariwar can already choose — ONLY when the full name does not
> fit**; a name that still does not fit keeps today's outcome (the one-word case is the Panel's stated cost; the multi-word case is
> PQ2). This story builds ONE pure function that makes that choice and calls it from the two senders. ⛔ Words change, ⛔ migration,
> ⛔ schema, ⛔ new outcome.

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
| `2026-10-18-359` | The Panel's answer was the bare letter (*"3. B"*) ⇒ the ruling is option B AS PUT (the 6.37 note's option table), action + outcome + cost: *"**Send it with the shorter form of the name, only when the full name does not fit** — first name and the initial of the surname (e.g. "Ramesh S."), the form a Pariwar can already choose."* For the family: *"The family gets the promised text; for that one text the name is shorter than the Pariwar's usual form."* Cost as put: *"The shorter form says *less* about the person, ⛔ more — but it overrides, for that one text, the form you ratified (the Pariwar's chosen form). A family might find "Ramesh S." less clear. A one-word name that is itself too long still could not be sent (rare). A small piece of work (one function and its tests)."* The entry's OWN consequence 1 (⛔ the Panel's words): *"the three suspicion texts fall back to first name + surname initial when the full name exceeds the slot; the error and alarm stay for a name that still does not fit."* Not covered: *"a one-word name that is itself too long (B's own cost — still not sent, as built); how the operators count the length (roster Row 30 (d), unanswered)"*; and the neighbours' text (OWED there — discharged by `-362`) | Trustee-ratified (option B as put); consequences author-written |
| `2026-10-18-362` | The Panel's answer was the bare letter (*"for name go with option B."*) ⇒ option B AS PUT (the 6.27c note): *"**Send it with the shorter form of the name, only when the full name does not fit** — first name and the initial of the surname ("Ramesh S."), the same rule you chose for the suspicion texts."* For a neighbour: *"The neighbours get the text with "Ramesh S." instead of the full name."* Cost as put: *"A neighbour may not recognise the member from the shorter name and may skip the questions — or answer about a different Ramesh. A one-word name that is itself too long still could not be sent (rare)."* The entry's consequence 1: *"ONE fallback function for the four texts."* Not covered: *"a one-word name that is itself too long (still not sent — today's claim-wide `no_target:name_too_long`)"* — ⚠ ⛔ consequence covers a multi-word name whose short form is still too long (PQ2). Supersedes `-311` PM3's "no text" reading | Trustee-ratified (option B as put); consequences author-written |
| `-262` FQ7 B · `-291` Q2 B · `-293` item 1 B | the three suspicion texts — Trustee-ratified. ⚠ `[member]` = *"the Pariwar's mode-resolved name form (`-181`)"* sits under *"Our reading — ⛔ NOT RATIFIED"* in `-293` item 1 and `-291` Q2, and `-262` FQ7 states ⛔ name form; `-359`'s Decision-type line and the 6.37 note's §0 describe the form as ratified — recorded, ⛔ re-read. NARROWED for an over-long name by `-359` | texts Trustee-ratified; the name form "Our reading" |
| `-303` Q1 A | the neighbours' text, naming `{member}` — NARROWED for an over-long name by `-362` | Trustee-ratified |
| `-181` cl.1 + Context | *"MODE-RESOLVED"* (cl.1) — the member-facing form from the Pariwar's stored mode; *"share the MODE, ⛔ never the whole function"* (its Context section) (⛔ `resolvePublicMemberName`) | author-commit |
| `-136` cl.2 | ruled in terms: *"Member's legal/KYC name ≠ public-directory presentation of that name."* The example *"Ramesh Kumar" → "Ramesh K."* and *"`splitFirstNameLastInitial()` becomes the implementation of the `shielded_name` mode"* are the entry's own elaboration inside the clause ("⭐ Consequence for the shipped shielding helper") | Trustee-ratified (cl.2's ruled words) |
| `-345` MG3 · `-346` decision 1 | the send core refuses a value over its slot (`:value_too_long` + alarm); the helpline exempt | author-commit |
| `-311` PM3 · R9 (Story 6.27c's build item) | `-311` PM3 records `no_target:name_too_long` claim-wide — kept ONLY for a name that still does not fit (`-362`); `fitsDltAlphanumeric` is R9, Story 6.27c's item (⛔ named by any decision entry) | author-commit, superseded in part by `-362` |
| `-365` (Story 6.31) | the neighbours' WhatsApp reminder carries the FULL name: *"`-362` narrows the name for the neighbours' TEXT only, and WhatsApp has ⛔ SMS name slot"* | author-commit |
| `-322` C7 · roster Row 30 (d) | the operators' count unit, Devanagari / spaces and special characters (the date's hyphen — and now the short form's full stop, F17) — ⛔ changed here | C7 author-commit; Row 30 (d) OPEN |

## ⭐ THE INVARIANTS

**I1 — The full name whenever it fits.** A mode-resolved name of ≤ 40 code points is sent byte-for-byte as today. The fallback never
fires "just in case". Every existing leg with a fitting name stays green UNCHANGED.

**I2 — The short form is the Pariwar's existing shielded form, never a new one.** It is exactly
`resolveMemberFacingDeceasedName('shielded_name', …)` — first token, space, the first grapheme of the LAST token, a period; a single
token shown whole. ⛔ Truncation, ⛔ middle-initials, ⛔ a new splitter, ⛔ `resolvePublicMemberName` (its mononym `''` would OMIT the text
— `-181`'s trap). ⚠ The member-facing arm applies ⛔ `publicNameTokens` (the directory's token cleaning) — so for a few names the
short form differs from the directory's (F16, PQ1); built AS IS, ⛔ cleaned here.

**I3 — A name that still does not fit keeps TODAY's outcome on each path.** Suspicion texts: the over-long value goes on to the send
core and ends `dlt_template_not_approved:value_too_long` + alarm (`-359` consequence 1: *"the error and alarm stay"*). Neighbours' text:
claim-wide `no_target:name_too_long`, ⛔ alarm, as today (`-362` not covered). ⛔ Truncated name ever. ⚠ For a ONE-word name this is
the Panel's stated cost; for a MULTI-word name whose short form is still over 40 it is our reading (PQ2) — the code is the same either
way unless PQ2 is routed and answered otherwise.

**I4 — ONE function for the four texts** (`-362` consequence 1) — pure, no IO, no clock; both senders call it; ⛔ a second fit or
shorten anywhere.

**I5 — The WhatsApp reminder is untouched.** `readMemberFacingDeceasedName` (6.31's shared reader) is byte-unchanged; the WhatsApp
reminder keeps the FULL name (`-365`). Only the TEXT's step (`readDeceasedName`) changes — the routing comment on
`readMemberFacingDeceasedName` already says so.

**I6 — ⛔ A name in any alarm, log line, detail or payload** — the short form included (it is still a name). Ids only, as today.

## 📜 Policy meaning (AI-10-1)

**This story introduces ⛔ predicate and changes ⛔ predicate that gates a member's (or a family's) access to a benefit.** It changes
WHICH NAME FORM a text carries, and with it whether a promised text is sent at all for an over-long name — a notification outcome,
⛔ an eligibility, assignment, payment or claim-decision predicate. ⛔ Claim state, decision, event or money path is touched. It does
decide whether a promised notice is sent — including the refused person's only notice of the last date to appeal — and it only ever
WIDENS sending: it withholds ⛔ text that is sent today.

In the family's terms: ⭐ *"If the member's full name is too long to fit in a text, you still get the text — it names the member by
their first name and the first letter of their surname, like 'Ramesh S.'; only a name that is still too long even in that shorter
form — in practice one very long name written without spaces, or a very long first word — still means no text."* (A "word" is a
run without spaces — a name joined only by hyphens or dots is one word; in Hindi each vowel sign and virama counts, so ~38 code
points can be ~20–25 visible letters.)

Its cost to the family (the Panel's, as put — verbatim in the table above): the shorter form says less and overrides, for that one
text, the Pariwar's chosen form; a family might find "Ramesh S." less clear; for the neighbours, who must RECOGNISE the member to
answer, a neighbour may not recognise the member and may skip the questions — or answer about a different Ramesh. See PQ1 for names
whose first or last word is not a first name / surname, and F6 for the WhatsApp reminder that now follows a short-form text.

**Niyamavali check:** ⛔ applicable — the Niyamavali (`packages/domain/seed/niyamavali-v1-clauses.sql`) has ⛔ clause on texts,
notices or name forms (grepped 2026-10-21: no match for "sms", "text message", "notif"), and it is ⛔ ratified
([[feedback_niyamavali_rulebook_not_spec]]).

⚠ Checked against `-359` and `-362` VERBATIM (the table above):
- the short form "only when the full name does not fit" — MATCHES both (I1);
- "first name and the initial of the surname … the form a Pariwar can already choose" — MATCHES the second half (the built
  `shielded_name` form, I2); ⚠ for a name whose first word is not a first name, or whose last word is not a surname, it NARROWS the
  first half (PQ1);
- "A one-word name that is itself too long still could not be sent (rare)" (both options' cost line) — MATCHES (I3);
- ⚠ a MULTI-word name whose SHORT form is still over 40 (first word + space + initial + period > 40 — a first word of ≥ 38 code
  points for a one-code-point initial, fewer for a multi-code-point Devanagari initial such as `श्री`; e.g.
  `'स'.repeat(36) + ' श्रीवास्तव'` 47 → 42 — on an ICU with Unicode ≥ 15.1 (F9); on an older ICU the virama still joins the letter
  before it (GB9, Extend) so the initial is `श्`, the short form 40, and that name SENDS) is ALSO not sent, by our reading. That MATCHES `-359` consequence 1's words (*"the error and alarm stay for a
  name that still does not fit"* — the ENTRY's consequence, ⛔ the Panel's words) but NARROWS option B as put: `-359`'s outcome line is
  *"The family gets the promised text"* and its cost names only *"A one-word name"*; `-362` has the same cost and ⛔ consequence
  covering it. Rarity does not change the classification ⇒ **PQ2**, at Task 0.2.
- the length: what the Panel was told (the 6.27c note) is *"40 characters, counting every letter, space and mark. In Hindi each vowel
  sign … counts as its own character"*; "counted as code points" is `-362`'s own Status-line wording — both MATCH
  `fitsDltAlphanumeric`'s `[...s].length`.

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
its fixture to a ONE-word over-long name (`'A'.repeat(41)`), ⛔ its assertions; (iii) the suite's HEADER comment says
*"`name_too_long` texts ⛔ one"* — true after this story only for a name that still does not fit (Task 2.3 updates it).

**F6 — The WhatsApp reminder's full-name leg.** `claim-peer-mesh-wa-reminders-live.test.ts` *"WR13 / §0 edge (ii) — a name that FAILS
the SMS fit check is sent IN FULL"* — MUST stay green UNCHANGED (I5). It imports `fitsDltAlphanumeric` from
`peer-mesh-sms-templates.js`, as does `apps/jobs/tests/peer-mesh-sms-templates.test.ts` (R9's 40 / 41 / astral unit legs) — ⛔ move
or rename that export (T7). Its pings are SEEDED `accepted` directly, so it never exercises
the text → reminder chain.
⚠ **Consequence (⛔ a code change — state it in the 6.37e entry and PQ1):** the reminder's begin returns `not_due` unless the ping was
accepted (`packages/domain/src/claim/peer-mesh-wa-reminder.ts`: `if (ping.send_outcome !== 'accepted' || ping.link_code === null)
return { kind: 'not_due' };`; WR2 = 48 h after the text was ACCEPTED). Today every ping of a long-name claim ends
`no_target:name_too_long` ⇒ ⛔ reminder ever. After this story those pings are `accepted` ⇒ an opted-in neighbour gets the SMS with
`"Ramesh S."` and, ~48 h later, the WhatsApp reminder with the FULL name (`-365` edge (ii)) — and the link page shows the full name
too. This is a NEW reach of an existing, ruled behaviour, ⛔ a new behaviour.

**F7 — The short form is computable from the RESOLVED name.** `readMemberFacingDeceasedName` returns only the resolved name (⛔ the
stored name, ⛔ the mode). Applying `resolveMemberFacingDeceasedName('shielded_name', resolved)`:
- `full_name` mode: `resolved` = the stored name with whitespace collapsed; `splitFirstNameLastInitial` splits on the same `/\s+/`
  ⇒ the result EQUALS `shielded(stored)` exactly;
- `shielded_name` mode: `resolved` is already `"Ramesh S."` / a mononym; re-shielding is idempotent for every input tried (Node
  22.22.2 / ICU 78.2: `"Ramesh S."`, `"रमेश श्री."`, `"K. S."`, a 41-letter mononym, NBSP / tab / U+3000 / ZWSP / emoji-ZWJ / virama
  cases) EXCEPT a lone Unicode Prepend character as the last token (`"Ramesh ؀."` → `"Ramesh ؀.."`, one code point longer — GB9b does
  not break before the period). Re-shielding never SHORTENS ⇒ a shielded name that is over 40 stays `too_long` ⇒ I3 holds.
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
deferred-work's neighbours'-text item *"The neighbours' text and an over-long name — the same question as `-359`, OWED to the Panel"*,
now closed by `-362` — the closure line is a markdown link split across lines, so find the item by its title; Story 6.27c's annotation row) — ⛔ redo. STILL OPEN and
owed by this story's records: deferred-work's 6.37 round-2 item *"A suspicion text whose deceased name exceeds the 40 code-point
`member` slot is ⛔ sent"* (no closure line — it even still says the note is *"⛔ yet sent"*); the 6.24b item *"`{member}` has ⛔ no
length guard against the operator's DLT per-variable limit"* (its trigger is DLT provisioning — PARTLY addressed only); roster Row 27's
evidence line (1) (still cites PM3's "no text"); `epics.md` has ⛔ `### Story 6.37e` entry.

**F14 — At creation the worktree had ⛔ `node_modules`** (installed since, during validation). Without them every `@twt/*` import
resolves to the MAIN checkout's sources (6.37d Debug Log (b)(1)) — re-check at 0.1 and `pnpm install --frozen-lockfile
--prefer-offline` in this worktree if absent.

**F15 — More "a long name is ⛔ texted" / "the mode-resolved name" statements go stale.**
- `peer-mesh-sms-templates.ts`'s header: *"an erased / unresolvable name, or one longer than the slot (`fitsDltAlphanumeric`), ⇒
  `no_target`, ⛔ never a blank, ⛔ never a truncated name (RB5, R9)"* (Task 2.4).
- The operator-facing registration sheet `docs/launch-gate-inventory/dlt-template-requests-6-19.md`: (a) templates 13–14 prose:
  *"a name longer than 40 characters is ⛔ texted (`no_target:name_too_long`), ⛔ never truncated"*; (b) templates 7–12 prose: *"The
  variables, in order: (1) the member's name in the Pariwar's mode-resolved form (`-181`)"* (the sheet bolds
  `**(1) the member's name**` — emphasis dropped here; grep the unbolded tail); (c) the Shape rules: *"⛔ Another type
  for `{member}` / `{date}` — … a type that needs a different text (a date type, a shorter name) is a text change and goes back
  through the §0 gate."* — each a dated PROSE note (SN6). ⚠ The DLT gate parses table rows matching `| <n> |` in that sheet
  (`scripts/dlt-typed-variables/lib.ts` `SHEET_TEMPLATE_ROW`; `apps/jobs/tests/_dlt-template-sheet.ts` `expectRegisteredTextRow`) —
  ⛔ a new numbered table row; the prose lines are pinned by ⛔ test.
- `packages/i18n/locales/{en,hi}/claim.json` `$comment.suspicion_sms` and `$comment.peer_mesh_sms`: *"{member} is the Pariwar's
  mode-resolved member name"* — a dated sentence APPENDED to each `$comment` (SN6; AC6 permits `$comment.*` keys only). ⚠ Two
  lockstep tests read these values by SUBSTRING: `suspicion-notice-sms-templates.test.ts` (`$comment.suspicion_sms` contains
  `'NOT YET HUMAN-REVIEWED'`) and `peer-mesh-sms-templates.test.ts` (`$comment.peer_mesh_sms` contains that marker, `'Row 28'` and
  `'must match the registered DLT content byte for byte'`) ⇒ an appended sentence is safe; ⛔ an edit that removes any of those
  substrings.
- `claim-peer-mesh-requests-live.test.ts`'s header line (F5 (iii)).

**F16 — The member-facing shielded arm does ⛔ token cleaning.** `resolveMemberFacingDeceasedName('shielded_name', …)` calls raw
`splitFirstNameLastInitial` (split on `/\s+/`); `resolvePublicMemberName` first runs `publicNameTokens` (11b.3's allowlist — a token
counts only if it holds a letter or digit; bidi controls / leading invisibles stripped). Manual KYC accepts
`z.string().trim().min(1).max(200)` (`packages/contracts/src/kyc/signup.ts`) with ⛔ character-class rule, and `.trim()` / `\s` do ⛔
strip U+200B–U+200F / U+2060 (Hindi keyboards emit ZWNJ / ZWJ). Probed (input over 40 → this story's short form | the directory's):
`"Venkata Satya Narayana Murthy Subrahmanyam -"` → `"Venkata -."` | `"Venkata S."`; `"… Subrahmanyam ."` → `"Venkata .."`;
`"… Subrahmanyam ​Iyer"` → `"Venkata ​."` (an invisible initial); `"… ‮"` → an RLO bidi override in the SMS;
`"… (Late)"` → `"Venkata (."` in both; a trailing honorific `"… जी"` → `"X जी."`; `"… Jr."` → `"Ramesh J."`. ⇒ built AS IS (I2 —
⛔ a new splitter; `-181` one member-facing form); it is PQ1's second half and is pinned by AC1 (k).

**F17 — The short form puts a FULL STOP into the alphanumeric `{member}` variable.** Full names normally carry none; the shielded
form has never travelled in an SMS variable (production is all `full_name`, F10). Row 30 (d) already asks about *"the hyphen in a
`DD-MM-YYYY` alphanumeric variable (TRAI allows special characters; MSG91 says "no special characters")"* — the full stop is the same
question. MG3 does ⛔ character-class check, and DLT scrubbing failures arrive ONLY in the delivery report (Row 30 note (6)(d) —
MSG91's docs, read 2026-10-17; the written answer is still owed). If
MSG91 rejects it: these names get ⛔ text either way, BUT today's recorded refusal + alarm (suspicion) / recorded
`no_target:name_too_long` (neighbours) would become a silent non-delivery stored `accepted`, and five neighbours' once-only slots
spent. A refusal of the RULED form goes BACK to the Panel (as `-322` C7). ⇒ recorded in Row 30 (d)'s note and the 6.37e entry's
"Does NOT cover" (SN6); ⛔ a code change.

## ⚖️ Build decisions SN1–SN7 (ANSWERED 2026-10-21 — BigDev accepted each ⭐ recommendation (a); Debug Log (a))

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
  throws when `resolvedName.trim() === ''` OR the computed short form is `''`, so a future caller cannot silently pass `''` or a
  whitespace-only name — `' '.repeat(41)` would otherwise give `{ kind: 'short', name: '' }`, a blank `{member}`). Both checks stay
  (as accepted at v1.2): the second is reached only if the first is removed (`splitFirstNameLastInitial` yields an empty first name
  only when `trim() === ''`; JS `trim()` and `/\s+/` share one whitespace set) — belt and braces, proven by AC7's two-step mutant.
  ⚠ **The guard is a programmer-error assertion, unreachable from both callers today:** `full_name` returns non-empty `\s+`-split
  tokens joined, `shielded_name` returns `''` only for an empty first name, and both callers' `=== ''` checks run first. **What a
  throw costs if a future caller reaches it:** in the suspicion child the call is AFTER `beginSuspicionNotice` has claimed the
  once-ever row and nothing catches a plain `Error` ⇒ pg-boss retries (`CHILD_RETRY_LIMIT`), each retry re-claims and throws, and the
  row ends `exhausted:attempting_three_days` with ⛔ alarm naming the cause — the slot spent; in the peer-mesh child it is before any
  ping is begun ⇒ ⛔ ping spent, but every retry and every later sweep re-throws — the pings are ⛔ texted, with ⛔ recorded outcome,
  until fixed. **Why throw, ⛔ return `too_long`:** Task 3.1 sends the ORIGINAL `member` for `too_long`, and `''`
  (0 code points) passes `checkedValues` ⇒ a blank-name text would be SENT. ⭐ The thrown message is FIXED and name-free (pg-boss keeps
  a failed job's error — I6), e.g. `'[jobs] sms-member-name: an empty or whitespace-only name (a caller bug)'`. **Cost:** both
  slots must be 40 for one predicate to serve both — pinned by a unit leg (SN3). **(b)** Take `(mode, storedName)`. **Cost:** the neighbours' reader would have to return the stored name (a change
  to 6.31's shared reader — I5).

- **SN3 — One limit, two slots.** ⭐ **(a) Recommended:** keep the suspicion slot's literal 40 (⛔ registry edit — the lockstep tests
  pin it) and add ONE unit leg asserting `SUSPICION_NOTICE_SMS_TEMPLATES[*][*].slots` member `maxLength` ===
  `PEER_MESH_REQUEST_SMS_TEMPLATES[*].slots` member `maxLength` === `DLT_TYPE_MAX_LENGTH.alphanumeric`, so Row 30 (d) changing the
  limit cannot split them silently. It complements the two lockstep tests that already pin the literal 40
  (`suspicion-notice-sms-templates.test.ts`, `peer-mesh-sms-templates.test.ts`) by pinning their EQUALITY — which matters for the
  SUSPICION texts: `fitsDltAlphanumeric` reads the neighbours' `MEMBER.maxLength` (= `DLT_TYPE_MAX_LENGTH.alphanumeric`), so if that
  constant rose above the suspicion slot's literal 40, a name would pass the shared fit as `full` and then be refused by the
  suspicion slot (`value_too_long` + alarm, the once-ever slot spent). **Cost:** one more leg. **(b)** Change the suspicion `MEMBER` to `DLT_TYPE_MAX_LENGTH.alphanumeric`.
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
  gates, F11); the 6.37e entry (author-commit) records SN1–SN7, the PQ1 / PQ2 dispositions, F6's WhatsApp-reminder consequence, F16's
  as-built form and F17 in "Does NOT cover"; the records commit:
  - `epics.md` `### Story 6.37e` (after 6.37d) — incl. one line *"PQ1 / PQ2 routed to the Panel as a non-blocking confirm; the answer
    gates go-live"*;
  - deferred-work's 6.37-round-2 suspicion item **"Closed by 6.37e for every name whose short form fits"** (effective when this row is
    `done` on `main`), with what stays: a one-word over-long name (`-359`'s accepted cost — still ⛔ sent) and a multi-word name whose
    short form is still too long (PQ2 — carried by the confirm item below) ([[feedback_closure_language_precision]] — ⛔ a bare
    "Closed");
  - the 6.24b `{member}` item a dated **"partly addressed"** note (the long multi-word name; truncation was option C, which the Panel
    did ⛔ choose (`-359`); the operator's limit / unit still open — its trigger unchanged);
  - a NEW deferred-work item for the OWED confirm (PQ1 + PQ2): *"Not addressed — the note WRITTEN, ⛔ sent"* (the `2026-10-06-284` E5
    item's shape — find it by its title *"A NON-blocking Panel confirm owed in the NEXT routing note (`2026-10-06-284` E5)"*; its
    "Not discharged … until the Panel answers" line is wrapped); it names the note file; folds in PQ1 (A)'s old trigger (any report of
    an unrecognised or garbled short name, or a writer for `shielded_name`); the Panel's answer is a NEW Trustee-ratified entry, and an
    answer other than "as built" means a later row; it gates go-live (Rows 22 / 27 below);
  - the confirm NOTE itself (Task 0.3 writes it; this commit carries it — the 5.13 `f4645c0c` precedent);
  - roster Row 22 (the suspicion texts) and Row 27 (the neighbours' text) a dated CONDITION note each: *"an ADDITIONAL go-live
    condition beyond this row's closure criteria ((a)–(d) / (a)–(h)): the long-name short form (`-359` / `-362` B, row 6-37e) goes
    live only once the Panel has answered the PQ1 / PQ2 confirm — this row does ⛔ close while that confirm is unanswered.
    Instrument: the 6.37e entry (BigDev 2026-10-22, Debug Log (a2))"* — the precedents put the confirm in the closure criteria
    (Row 22 (c) for `-295` §8 Confirm 2; Row 31 (g)); the note says so in terms, so the row cannot be closed past it. ⛔ A new row,
    ⛔ a word of either row rewritten;
  - Row 27 evidence line (1) a dated note (`-362` supersedes PM3's "no text"; `name_too_long` now only for a name that still does not
    fit);
  - Row 30 (d) a dated note: fewer names affected; the unit question unchanged; ⚠ AND *"the full stop of the shorter name form
    (`-359` / `-362` B — "Ramesh S.") in the alphanumeric `{member}` variable — the same 'special characters' question as the date's
    hyphen; a refusal of the full stop means the ruled short form cannot be texted and goes BACK to the Panel (as `-322` C7)"* (F17);
  - Rows 23 / 28 (the Hindi reviews) a dated note each: the reviewer's packet gains one short-form render per Hindi text (SN7);
  - the registration sheet: dated PROSE notes at templates 7–12, templates 13–14 and the Shape rules (F15 (a)–(c) — `-359` / `-362`:
    the short form when the full name does not fit, which went through §0 and needs ⛔ type or text change; `name_too_long` only for a
    name that still does not fit);
  - `claim.json` (both locales) `$comment.suspicion_sms` / `$comment.peer_mesh_sms` a dated sentence APPENDED (F15 — keep the three
    substrings the lockstep tests read);
  - the 6-37e sprint comment (a NEW dated line — PQ1 + PQ2 = B′, the note's file name, "WRITTEN, ⛔ sent", the go-live gate; the
    branch's older text stays as written — the row comment's *"PQ1 through §0"* and the YAML `last_updated: >-` value's *"SN1–SN7 +
    PQ1 await BigDev"*) + ledger.
  ⛔ Existing routing note edited. **Cost:** none beyond the writing.

- **SN7 — Hindi texts.** ⭐ **(a) Recommended:** ⛔ change — the Hindi registered texts carry `{member}` as a variable; the short form
  is substituted the same way in both locales. ⛔ New Hindi review — but the Rows 23 / 28 reviewer's packet gains one short-form
  render per Hindi text, because the Panel was shown only the Latin "Ramesh S." and the Hindi render puts a Latin full stop straight
  before a postposition (probed: *"हमें बताया गया है कि रमेश श्री. का निधन हो गया है।"*, *"Venkata S. के लिए किया गया एक दावा …"*);
  a dated note on each row (SN6). **Cost:** two notes.

## 🏛️ Candidate Panel questions (ANSWERED 2026-10-21 — BigDev accepted the recommendation for each: PQ1 (B′), PQ2 (B′); Debug Log (a))

**PQ1 — A long name whose FIRST word is not a first name, or whose LAST word is not a surname.** The built form takes the first
WORD as the first name and the first grapheme of the last WORD as the initial (F16 — ⛔ token cleaning). Probed:
- first word an initial or title: `"K. Venkata Satya Narayana Murthy Subrahmanyam"` (45 — a South-Indian initial-first name, where the
  leading initial is often the house or father's name) → `"K. S."`; `"Shri …"` → `"Shri X."`; ⭐ the class of name the Panel was
  shown in the 6.27c note (*"श्री राजेन्द्र प्रसाद श्रीवास्तव" = 32 (fits)*) — one just over 40, `"श्री राजेन्द्र प्रसाद नारायण सिंह
  श्रीवास्तव"` (44), shortens to `"श्री श्री."` (ICU with Unicode ≥ 15.1, F9 — `"श्री श्."` on an older ICU), which says nothing;
- last word not a surname: a trailing honorific `"… जी"` → `"X जी."`; `"… Jr."` → `"Ramesh J."`; a bracketed or punctuation-only token
  → `"Venkata (."` / `"Venkata -."` / `"Venkata .."`; an invisible character (ZWSP / ZWNJ / bidi mark / word joiner) as or at the start
  of the last token → a blank-looking or invisible initial, or an RLO bidi override inside the SMS (F16 — the directory's
  `publicNameTokens` would give `"Venkata S."` for several of these).
Match / narrow against the ruled sentence *"first name and the initial of the surname (e.g. "Ramesh S."), the form a Pariwar can
already choose"*: the built form MATCHES the second half and, for these names, NARROWS the first. ⚠ The template's §0 lists *"two
RATIFIED clauses that conflict, so one of them must give"* as the Panel's — so this edge leans to the Panel. ⚠ Weigh with: the
neighbour's link page shows the FULL mode-resolved name (`apps/api/src/modules/claims/peer-request-core.ts`
`resolvePeerRequestMemberName` → `resolveMemberFacingDeceasedName(mode, stored).trim()`), and an opted-in neighbour gets the WhatsApp
reminder with the full name ~48 h later (F6, `-365`) — the short form is only the SMS's. For the suspicion texts there is ⛔ link page —
the short form is all the family sees (the helpline call carries the rest).
- **(A) Build the existing form as ruled; record this edge in the 6.37e entry and `deferred-work.md` (trigger: any report of an
  unrecognised or garbled short name, or a writer for `shielded_name`).** Cost: some long names get a weak or meaningless short form;
  the Panel is ⛔ told — the weakest fit with §0's "two ratified clauses that conflict".
- **(B) Build the existing form AND tell the Panel (a "told" item, ⛔ a question).** Cost: one more note for BigDev to send; nothing
  changes in code; but the author still decides a narrowing that §0 lists as the Panel's (*"a ratified clause that must be
  SUPERSEDED, narrowed or extended"*).
- **(B′) Build the existing form AND route it as a NON-BLOCKING CONFIRM** — *"we will build the existing form; tell us if you want
  otherwise"* (the `-295` §8 / `-296` short-confirm-note precedent). Code as A; the edge is the Panel's once answered; ⛔ blocks the
  build (⛔ text is live — F11). Cost: one short question in a note for BigDev to send; if the Panel then wants C, a later row.
- **(C) Route it: skip leading initials / titles, trailing honorifics and non-letter tokens to find the first name and surname.**
  Cost: a NEW name form no Pariwar can choose today — it departs from *"the form a Pariwar can already choose"* and from `-181`'s one
  member-facing form rule; needs a ruling first.
⚠ How reachable: only names over 40 code points of these shapes; ⛔ production data exists to count them; ⛔ text is live (F11).
Our reading: **B′** — the code is the same as A (the existing form, as ruled); §0 makes a narrowing of a ratified clause the Panel's
to answer, ⛔ merely to hear, and a non-blocking confirm asks it without holding the build; C is a new form.

**PQ2 — A MULTI-word name whose shorter form is STILL over 40.** (Policy meaning, the fourth bullet.) Built: ⛔ text — the suspicion
texts end `value_too_long` + alarm, the neighbours' `no_target:name_too_long`, as today (I3). Match / narrow: MATCHES `-359`
consequence 1's words (the entry's own); NARROWS option B as put (*"The family gets the promised text"*; cost names only *"A one-word
name that is itself too long"*); `-362` has ⛔ consequence covering it.
- **(A) Record as the author's reading in the 6.37e entry.** Cost: a narrowing of a ratified option recorded without the Panel.
- **(B) Build as in (A) AND tell the Panel — in the same note as PQ1.** Cost: one more line in that note; ⛔ code difference; the
  author still decides a narrowing (§0).
- **(B′) Build as in (A) AND route it as a NON-BLOCKING CONFIRM — in the same note as PQ1 (B′).** Cost: one more question in that
  note; ⛔ code difference; ⛔ blocks the build.
- **(C) Route it: for such a name, send a further-shortened form.** Cost: a new form (the same objection as PQ1 (C)); needs a ruling.
⚠ How reachable: a first word of ≥ 38 code points (fewer with a Devanagari conjunct initial) — vanishingly rare. Our reading: **B′**
(share PQ1's note — the same §0 reason). ⭐ ANSWERED: (B′) for both (Debug Log (a)); the answer gates GO-LIVE of the long-name texts,
⛔ the build or the merge (Debug Log (a2)).

## Acceptance Criteria

Notation: unit legs are pure vitest (`env -u DATABASE_URL`); live legs run on :5433 with `DATABASE_URL` set EXPLICITLY; every send
through the existing fake gateway (⛔ network); "⛔ sent" asserted with the harness's `sent` array (a zero-length recorder).

1. **AC0 — Governance before code.** Task 0 is done before any `apps/` / `packages/` change (the `claim.json` `$comment` sentences
   of Task 0.4 excepted — documentation, part of the records commit): SN1–SN7 answered and recorded VERBATIM; PQ1 and PQ2 routed
   as ONE non-blocking confirm note (B′, BigDev 2026-10-21), WRITTEN in the records commit and ⛔ sent until BigDev sends it — it
   blocks ⛔ code and ⛔ merge, and its answer gates go-live (Rows 22 / 27 condition notes — BigDev 2026-10-22); the 6.37e entry
   committed ALONE; the records commit after it.

2. **AC1 — The ONE function (SN1 / SN2).** `smsMemberName` exists in ONE place, is pure, and is called by exactly the two text senders.
   ⭐ **The source leg** (modelled on `apps/jobs/tests/staff-email-identity-read-fence.test.ts` — ⛔ on the weaker
   `claim-peer-mesh-wa-reminders.test.ts` AC9 count, which does ⛔ strip comments): walk `apps/jobs/src` recursively (`readdirSync`,
   skipping `node_modules` / `dist`; keyed by REPO-RELATIVE path, as that fence's `walk()` is), strip comments as that fence does; the
   set of files whose CODE imports from `./sms-member-name.js` OR contains `\bsmsMemberName\s*\(` must EQUAL exactly
   `['apps/jobs/src/scheduler/claim-peer-mesh-requests.ts', 'apps/jobs/src/scheduler/claim-suspicion-notices.ts']` (`toEqual`, both
   present — ⛔ "only"; full paths, ⛔ basenames — a basename would hide a same-named file elsewhere);
   `apps/jobs/src/scheduler/sms-member-name.ts` is excluded BY that full path (its own `export function smsMemberName(` matches) and
   must be present in the walk (a rename fails); positive controls: a plant in a third file IS caught, a commented plant is ⛔.
   ⚠ **AMENDED 2026-10-22 (code review, P-7):** the walk reads the TypeScript AST (`ts.createSourceFile`, as `scripts/*/lib.ts` do),
   ⛔ strips comments — that fence's regex strip is blinded by a string such as `'src/*.ts'` (a fake comment that hides a LATER call;
   reproduced). "Imports from `./sms-member-name.js`" = an `import`, an `export … from` or a dynamic `import()`; "contains
   `\bsmsMemberName\s*\(`" = a call `smsMemberName(…)` or `x.smsMemberName(…)`; a string that only NAMES the function is ⛔ a caller.
   The plants gain a glob-string plant, a `' //'` plant, a dynamic import, a re-export, a member call and a naming-only string;
   the I4 "second fit / shorten" check gains its own plant. Optionally, the same
   walk gives I4 a check: `\bfitsDltAlphanumeric\s*\(` in code only in `peer-mesh-sms-templates.ts` (its definition) and
   `sms-member-name.ts`, and `'shielded_name'` only in `sms-member-name.ts` (at `bac71abb` and again at `1e22889e`:
   `fitsDltAlphanumeric(`'s only code use is `readDeceasedName`; `'shielded_name'` appears nowhere in `apps/jobs/src` — re-check at
   the Task 0.1 pin).
   Unit legs:
   (a) a 40-code-point multi-word name ⇒ `full`, byte-identical; (b) a 41-code-point multi-word name ⇒ `short` equal to
   `notifications.resolveMemberFacingDeceasedName('shielded_name', name)` (computed, ⛔ transcribed); (c) a Devanagari name over 40 with
   a NON-conjunct surname initial (F9) ⇒ `short`; (d) a one-word name of 41 ⇒ `too_long`; (e) a multi-word name whose short form is
   still over 40 (`'A'.repeat(39) + ' B'`) ⇒ `too_long`; (f) an already-shielded input is returned as `full` (fits) — and, for an
   over-long one-word shielded input, `too_long` (F7); (g) internal double spaces in a fitting name ⇒ the name as passed
   (the resolver already collapsed it — the function does ⛔ re-collapse a `full`); (h) `''` ⇒ throws; (h′) `' '.repeat(41)` ⇒ throws
   (SN2's whitespace guard); (i) an astral-plane ONE-WORD name of 40 code points (80 UTF-16 units) ⇒ `full` (code points, ⛔ UTF-16 —
   the only input that distinguishes the two units; 6.37 review P8's lesson: a leg must be able to fail); (j) SN3's one-limit leg;
   (k) a 44-code-point name ending in `' -'` (`"Venkata Satya Narayana Murthy Subrahmanyam -"`) ⇒ `short` equal to
   `resolveMemberFacingDeceasedName('shielded_name', name)` — pins the AS-BUILT form (F16, PQ1), computed, ⛔ transcribed.

3. **AC2 — The three suspicion texts send the short form when the full name does not fit.** Live legs in
   `claim-suspicion-notices-live.test.ts`, for EACH of `suspicion_refusal`, `closed_after_appeal` and `refusal_appeal_notice` (⛔ only
   the first). The harness already builds each: `suspicion_refusal` ← `refusedS`; `closed_after_appeal` ← in the source leg's
   ORDER `refusedS(d)` (S) → `claimOf(d, 'documents_pending')` (R) → `allowAppeal(d, s)`, tick `[r, s]` (as the leg *"⭐ (b) R closed
   BEFORE its own determination …"*); `refusal_appeal_notice` ← `refusedS` + `contact(d, s, { linked: null })` — ⛔ `openAppeal` (a filed appeal
   SUPPRESSES that notice — leg *"(c) an appeal FILED before the sweep ⇒ ⛔ text, ⛔ row …"*; it is only a building block of
   `allowAppeal`). Use an `isolated()` Pariwar + `harness({ allow: [own] })` as the P2 leg does (⚠ ⛔ existing leg combines
   `isolated()` with `allowAppeal` — if that fails, use the default `PARIWAR` + `harness()` and say so in the Debug Log).
   ⚠ Four things the oracle needs: **(1) the date** — `renderSuspicionNoticeSms` THROWS for `appeal_notice` without `vars.date`; pass a
   fixed `refusedS(d, { decidedAt })` and compute `formatAppealUntil(claim.suspicionRefusalAppealUntil(decidedAt))` — the leg *"⭐ (c)
   a NON-nominee filer …"* computes the date from `claim.suspicionRefusalAppealUntil` but reorders it by slicing; call the real
   `formatAppealUntil` instead ([[feedback_stub_must_call_not_transcribe]]); **(2) the locale** — `hi` for the refusal and closed notices (RF11), the claim's `contact_locale` for
   the appeal notice (`contact()` defaults to `'hi'`); **(3) which message** — select the message by its expected computed BODY,
   then read its `values` (⛔ by recipient: in the closed recipe whether S's refusal notice still goes to the same recipient after
   `allowAppeal` is UNVERIFIED — selecting by body is safe either way); **(4) imports** — the suite imports ⛔ `notifications`, `renderSuspicionNoticeSms` or `formatAppealUntil` today; add them.
   ⛔ Fixed clock needed. For each: a `full_name` Pariwar,
   a KYC name over 40 with ≥ 2 words and a DISTINCTIVE token (e.g. `Venkatanarayana`) ⇒ outcome `accepted`; the sent member value
   (`m.values.find((v) => v.name === 'member')?.value` — `values` is an ARRAY of `{ name, value }` in slot order) and the body
   carry the short form (expected value computed through `resolveMemberFacingDeceasedName('shielded_name', …)`); the body equals
   `renderSuspicionNoticeSms(message, locale, { member: short, … })` — `message` is the purpose's MESSAGE, ⛔ the purpose
   (`suspicion_refusal` → `refusal_notice`, `closed_after_appeal` → `closed_notice`, `refusal_appeal_notice` → `appeal_notice`; the
   child's `MESSAGE_OF` is ⛔ exported — the test maps it); the existing "values rebuild the body" oracle sees no miss; the
   appeal notice still carries its date. ⭐ The *"6.37 review round 2 P2"* leg is FLIPPED, ⛔ deleted: renamed to say `-359` B, its
   45-code-point name now SENDS as the short form. A one-word over-long name (a DISTINCTIVE one, e.g. `'Venkatanarayana'.repeat(3)`, 45
   — a distinctive token makes AC5's name assertion meaningful) keeps TODAY's outcome — final `error`
   `dlt_template_not_approved:value_too_long` + the alarm naming the claim id, ⛔ sent (the old P2 assertions moved to this leg). A
   fitting name is byte-unchanged (every existing leg green UNCHANGED). The `SHIELDED` Pariwar's `"Ramesh S."` leg green UNCHANGED.

4. **AC3 — The neighbours' text sends the short form when the full name does not fit.** Live legs in
   `claim-peer-mesh-requests-live.test.ts`: the R9 leg FLIPPED — `name: 'A'.repeat(20) + ' ' + 'B'.repeat(20)` ⇒ every selected
   neighbour texted (`accepted`), the member value (`m.values.find((v) => v.name === 'member')?.value`) = the short form, body = `renderPeerMeshRequest(locale, { member: short, … })`, ⛔
   alarm; a NEW leg — a DISTINCTIVE one-word name over 40 (e.g. `'Venkatanarayana'.repeat(3)`, 45) ⇒ every ping
   `no_target:name_too_long`, ⛔ replaced, ⛔ texted, ⛔ alarmed (today's R9 assertions, moved); the *"AC5b — a re-claimed row with a
   NAME fault"* leg's fixture changed to `'A'.repeat(41)` with its assertions UNCHANGED (fixture only — ⛔ AC5's assertions: it is
   neither new nor flipped).

5. **AC4 — The WhatsApp reminder is untouched (I5).** `readMemberFacingDeceasedName` — its JSDoc AND its body — is byte-identical to
   the front-matter `baseline_commit` (re-pinned at Task 0.1 if `main` moved; a `git diff` check in the Debug Log; leave the JSDoc: its
   *"Row 6-37e … edits the TEXT's step there — ⛔ this function"* stays true); *"WR13 / §0 edge (ii) — a name that FAILS the SMS fit
   check is sent IN FULL"* green UNCHANGED.

6. **AC5 — ⛔ A name anywhere but the text (I6).** Every new or flipped leg asserts EXPLICITLY, over the blob
   `JSON.stringify({ enqueued: h.enqueued, alarms: h.alarms, rows })` (the shape suspicion leg (a) already uses — I6 covers alarms,
   payloads and details, ⛔ alarms only), built AFTER the leg's last `tick` (the peer-mesh `tick()` empties `h.enqueued`) — in the
   suspicion suite `const rows = await rowsOf(<cid>)` first, as leg (a) does; in the peer-mesh suite `rows` is a HELPER, so write
   `rows: await rows(w)` inside the object (⛔ `const rows = await rows(w)` — a TDZ error; ⛔ `{ rows }` — `JSON.stringify` drops a
   function silently) — `.not.toContain(<the full name's distinctive token>)`; and every leg that SENDS the short
   form also `.not.toContain(<the short form>)` (a `too_long` leg has ⛔ short form — the full-name assertion alone, on a distinctive
   fixture). ⚠ The peer-mesh suite's `expectIdsOnly` checks only the substring
   `'Ramesh'` (the first word of its default `NAME = 'Ramesh Kumar Sharma'`) plus phone digits and link codes — on an `'A'…`/`'B'…`
   fixture it proves NOTHING about the name; it does ⛔ satisfy this AC alone. ⛔ New log line carries a name (SN5).

7. **AC6 — Nothing else moves.** ⛔ Migration; ⛔ schema / detail-vocabulary change (`PEER_MESH_REQUEST_NAME_REASONS`, the 0166
   regex, `suspicionNoticeDetail`); ⛔ `claim.json` copy-key VALUE / registry TEXT change (the lockstep tests green UNCHANGED; the
   `$comment.*` keys excepted — F15, SN6); ⛔ send-core change (`claim-dlt-sms-send.ts` byte-identical); ⛔ `packages/domain` source
   change (per SN1 (a) — re-derive this AC if BigDev picks (b)); ⛔ change to `claim-peer-mesh-wa-reminders.ts`. The
   `git diff --stat $(git merge-base origin/main HEAD)..HEAD -- apps packages` (⛔ a literal SHA — a rebase at Task 0.1 would pull in
   other stories' files) lists only: the new module, `claim-suspicion-notices.ts`, `claim-peer-mesh-requests.ts`,
   `suspicion-notice-sms-templates.ts` and `peer-mesh-sms-templates.ts` (header comments only — F2, F15), the two `claim.json`
   files (an appended `$comment` sentence each, Task 0.4), and test files (incl. `claim-suspicion-notice-no-decision.test.ts`'s
   `NOTICE_MODULES` entry and header — Task 1.2).

8. **AC7 — The proof.** Every flipped / new leg proven RED under the mutant named below (applied, the leg run, restored) and recorded
   by name in the Debug Log; a leg marked coverage-only is SAID so, ⛔ claimed RED:

   | Leg | Mutant that turns it RED |
   |---|---|
   | AC2 flipped P2 + the closed / appeal short-form legs; AC3 flipped R9 | the call removed (today's code) OR "always `full`" |
   | AC2 suspicion one-word leg | ⛔ either of those (both still end `value_too_long`) — a TRUNCATION mutant (`too_long` ⇒ `resolved.slice(0, 40)`) |
   | AC3 new one-word leg; the AC5b re-claim leg (fixture change) | "always `full`" with ⛔ fit check left (the name reaches the core ⇒ `value_too_long`, ⛔ `no_target:name_too_long`); green on today's code by design |
   | AC1 (a) | a `< 40` boundary mutant |
   | AC1 (b) / (c) / (k) | "always `full`" |
   | AC1 (d) / (e) | "always `full`" |
   | AC1 (f) first half (a fitting shielded input ⇒ `full`) | "always `short`" |
   | AC1 (f) second half (an over-long one-word shielded input ⇒ `too_long`) | "always `full`" |
   | AC1 (g) | a mutant that re-collapses spaces in a `full` |
   | AC1 (h) / (h′) | BOTH checks removed (RED); with ONLY the `trim()` check removed both must stay GREEN — that run proves the second check |
   | AC1 (i) | a UTF-16 `.length` mutant |
   | AC1 (j) | a planted unequal `maxLength` fed to the same comparison — else coverage-only |
   | AC1 source leg | its own plants (a third file caught, a commented plant ⛔) — and, since the 2026-10-22 review (P-7), a glob-string / `' //'` / dynamic-import / re-export / member-call plant and a naming-only string ⛔ |
   | Task 3.1's "ORIGINAL `member` for `too_long`" | coverage-only BY DESIGN (unobservable — the core ends `value_too_long` either way) |

   `pnpm --filter
   @twt/jobs typecheck` clean; `pnpm --filter @twt/jobs lint` clean; `pnpm dlt-typed-variables:test && pnpm dlt-typed-variables:check`
   pass (`git add` the new src file first — the gate scans TRACKED files only, so an untracked file is skipped SILENTLY, ⛔ an error);
   `pnpm ci:local` with `DATABASE_URL` at :5433 green 36/36 (a load timeout re-run ALONE and SAID so —
   [[project_known_livedb_test_failures]]).

## Tasks / Subtasks

- [x] **Task 0 — governance FIRST (AC0). ⛔ No code.**
  - [x] 0.1 `git fetch origin`; re-pin if `main` moved (`git diff --name-only bac71abb..origin/main -- apps/jobs packages/domain/src/notifications packages/domain/src/kyc packages/domain/src/claim/peer-mesh-wa-reminder.ts`;
        re-derive any F-fact that moved; update the front-matter `baseline_commit` — AC4 / Task 4 read it; AC6 uses the merge-base); `pnpm install
        --frozen-lockfile --prefer-offline` in this worktree if `node_modules` is absent (F14); re-grep `main`, EVERY branch (`git branch
        -a`) and every worktree (`git worktree list`) for the next free decision id and ledger letter (NUMBERS — at 2026-10-22
        `-377`, dated the day it is COMMITTED; ledger `2026-10-22c` is taken by this story's v1.4 validate ⇒ the next free is `22d`
        on that day).
        ⭐ **REBASE this branch onto `origin/main`** (`main` lands by fast-forward only — [[feedback_land_prs_by_fast_forward]]); it
        moved 12 commits (5.13) since `bac71abb`, and the re-check diff's three files are benign (header note). Each of the branch's
        story commits (`a85d712f`, `b04409ed`, `11162207`, and this validate's) conflicts at the TOP of `sprint-status.yaml` (main
        prepended nine ledger lines; the branch three-plus). Resolve each BY HAND ([[project_sprint_status_safe_prepend]] — ⛔ take
        ours or theirs wholesale): keep EVERY main line and put each branch line in its newest-first slot — `2026-10-22c` (this
        validate) on top; `2026-10-21x` between `21y` and `21w`; `21t` and `21s` between `21u` and `21r`; main's bare `2026-10-21` stays
        where it is, un-re-lettered (5.13's slip). The branch's other two hunks (the YAML `last_updated: >-` value and the 6-37e row)
        do ⛔ conflict. After each step: line count = main's + the branch's added lines; the YAML parses
        (`python3 -c 'import yaml,sys; yaml.safe_load(open(sys.argv[1]))' …`). ⚠ THE `21r` STEP: at `a85d712f` the 6.37e creation line
        still reads `2026-10-21r` — put it between `21u` and main's 5.13 `2026-10-21r (STORY 5.13 — CREATED …` (two `21r` lines,
        briefly); at `b04409ed` (which re-letters it to `21s`) delete ONLY the `21r … STORY 6.37e` line. End state: exactly ONE `21r`
        line, and it is 5.13's. Precedent: 6.31 v1.5 (*"ledger `2026-10-17k` re-placed in
        its slot"*). Then re-pin the front-matter `baseline_commit` to the new base.
  - [x] 0.2 Put SN1–SN7 to BigDev, each with its recommendation and cost; then PQ1 and PQ2 — BigDev's §0 check FIRST (route / tell /
        record as the author's); say F6's WhatsApp-reminder consequence and F17's full-stop question alongside. Record every answer
        VERBATIM (Debug Log (a)).
  - [x] 0.3 Write the 6.37e entry (AUTHOR-COMMIT; the shape of `-376`, the newest precedent (`-375` the same, minus PQ): Decision
        type / Status / Author / Ratifying trustees: None / §0 gate / Occasion / The decisions / **PQ:** / Supersessions / Does NOT
        cover / Consequences / References). **§0 gate:** SN1–SN7 are the author's (engineering — the notes said so); PQ1 / PQ2 are the
        Panel's (narrowings of a ratified option), routed as a non-blocking confirm. **PQ:** *"PQ1 + PQ2 — routed as ONE non-blocking
        confirm, `trustee-panel-routing-note-2026-10-2x-6-37e-short-name-confirms.md`, WRITTEN, ⛔ sent; built as ruled meanwhile; the
        answer gates go-live (Rows 22 / 27)"*. **"Does NOT cover":** a one-word over-long name (`-359`'s cost) and a multi-word
        still-too-long name (PQ2 — routed), Row 30 (d)'s unit, limit and special characters — incl. the short form's full stop (F17: a
        refusal of it goes BACK to the Panel), the WhatsApp reminder (F6: now reachable for a long-name claim, carrying the full name),
        F16's as-built form for names with a non-letter or invisible last token. **Consequences:** the records commit (Task 0.4) incl.
        the note and the owed-confirm deferred item. It BUILDS `-359` and `-362` (⛔ re-reads them). Stage in the scratchpad; re-grep
        every branch for the id right before inserting; prepend above the newest `### Decision`
        ([[project_decision_log_writes_user_inserted]] — try, verify additive-only, ask once if refused); commit ALONE on this branch;
        write its SHA after the commit, ⛔ before.
        ⭐ **Then write the confirm note** (it is COMMITTED in 0.4, ⛔ here): `_bmad-output/planning-artifacts/trustee-panel-routing-note-
        2026-10-2x-6-37e-short-name-confirms.md` from the template (by path — ⛔ a second shape), as the earlier confirm notes did
        (`trustee-panel-routing-note-2026-10-09-6-24b-two-confirms.md` for `-296`; `…-2026-10-14-6-36-confirms.md`; the `-284` E5 /
        `-295` §8 precedent): the §0 block FIRST — BigDev's verbatim *"recommendation accepted for  SN1–SN7 and PQ1 / PQ2"*, *"⭐
        Confirms, ⛔ not blockers"* (the build continues; the answers are needed before the long-name texts go live), and *"WRITTEN
        2026-10-2x — ⛔ sent"* (routing notes carry the sent state in §0, ⛔ a `trustee-panel-told-*` Status line); the `⏳ AWAITING`
        block; **Confirm 1 = PQ1, Confirm 2 = PQ2**, each in the template's order — the plain-English question, THE ONE FACT, options
        with an honest cost on EVERY option (A = "as built", C = PQ1 (C) / PQ2 (C)), What is at stake (*"Blocked: nothing — go-live
        waits for the answer"*), How much to trust this note, In plain English, Evidence E1–E4 LAST (E4 run before BigDev sends it).
        ⛔ Shown to the Panel until BigDev sends it ([[feedback_shown_to_panel_means_sent]]).
  - [x] 0.4 The records commit (one commit, after 0.3) — SN6 (a)'s list: `epics.md` `### Story 6.37e` after 6.37d's entry (the 6.37d
        entry's shape — "Added 2026-10-2x (`bmad-create-story 6.37e`)", the rulings, "Full ACs: …", "Not a merge fence.", the user
        story, "Acceptance Criteria (in brief)", and the line *"PQ1 / PQ2 routed to the Panel as a non-blocking confirm; the answer
        gates go-live"*); the confirm NOTE written at 0.3; deferred-work: the 6.37-round-2 suspicion item a dated note *"built by row
        6-37e — Closed by 6.37e for every name whose short form fits, when the row is `done` on `main`; still ⛔ sent: a one-word
        over-long name (`-359`'s cost) and a multi-word name whose short form is still too long (PQ2 — the owed-confirm item)"* (⛔
        "Closed" before then, ⛔ a bare "Closed") and the stale *"⛔ yet sent"* corrected by a dated note (the note was SENT and RULED,
        `-359`), the 6.24b `{member}` item a dated "partly addressed" note (incl. *"truncation was option C — ⛔ chosen (`-359`)"*), a
        NEW owed-confirm item (SN6 — *"Not addressed — the note WRITTEN, ⛔ sent"*, names the note, PQ1 (A)'s old trigger folded in,
        gates go-live); roster Row 22 and Row 27 a dated go-live CONDITION note each (SN6 — BigDev 2026-10-22), Row 27 evidence line (1),
        Row 30 (d) (incl. F17's full stop) and Rows 23 / 28 (SN7's short-form renders) dated notes (⛔ a word of any row rewritten); the registration sheet's dated PROSE notes
        at templates 7–12, 13–14 and the Shape rules (F15 — ⛔ a `| <n> |` table row); `claim.json` (en + hi) `$comment.suspicion_sms` /
        `$comment.peer_mesh_sms` a dated sentence APPENDED — they are read only by substring (`suspicion-notice-sms-templates.test.ts`
        `'NOT YET HUMAN-REVIEWED'`; `peer-mesh-sms-templates.test.ts` that marker + `'Row 28'` + `'must match the registered DLT
        content byte for byte'`) ⇒ keep those three substrings intact, ⛔ an edit that removes any of them (`packages/i18n/tests/*`
        and `scripts/microcopy/claim.test.ts` skip or do not read these keys); the 6-37e sprint comment (SN6 — a NEW dated line); row `ready-for-dev` → `in-progress`; ledger
        ([[project_sprint_status_safe_prepend]] — guard the size, verify the YAML). ⚠ The sheet edit is in `GATE_INPUTS`
        (`docs/launch-gate-inventory/**`) — this is ⛔ a docs-only push: the pre-push hook and `ci.yml` run.

- [x] **Task 1 — The function (AC1).**
  - [x] 1.1 `apps/jobs/src/scheduler/sms-member-name.ts` (SN1 / SN2): module header (the rulings, I1–I4, the F7 equivalence — why the
        RESOLVED name is the input; F16's as-built form), `SmsMemberName`, `smsMemberName` (with SN2's `''` / whitespace guard). Call
        `notifications.resolveMemberFacingDeceasedName('shielded_name', …)` — ⛔ import `splitFirstNameLastInitial` directly, ⛔
        reimplement it. ⚠ The header must ⛔ contain `{#var#}`, `DLT_VAR` or `sms.dlt.template_id.` — DLT rules (ii) / (iii) scan
        COMMENT lines in a non-registry file (only registry rule (i) is code-only).
  - [x] 1.2 `apps/jobs/tests/sms-member-name.test.ts` — AC1 (a)–(k), incl. SN3's one-limit leg and the callers' source leg (an AST
        read since the 2026-10-22 code review — AC1's amendment, P-7). Add
        `apps/jobs/src/scheduler/sms-member-name.ts` to `NOTICE_MODULES` in `apps/jobs/tests/claim-suspicion-notice-no-decision.test.ts`
        as this story's OWN module (the list is FIXED, ⛔ an import walk — its header: *"it reads these four modules only — ⛔ the helpers
        they call"*; `peer-mesh-sms-templates.ts` stays off, as the suspicion child's other helpers do), and in that file's header
        change "these four modules" → "these five modules" AND add 6.37e's name fallback (`sms-member-name.ts`) to the opening list
        (*"the jobs sweep + child, the shared send core, the sibling registry and the domain's notice module"*) — it is listed as a
        module of the notice path that 6.37e owns, ⛔ as a called helper (AC6).

- [x] **Task 2 — The neighbours' text (AC3).**
  - [x] 2.1 `readDeceasedName` in `claim-peer-mesh-requests.ts`: replace the `fitsDltAlphanumeric` check with `smsMemberName(read.name)`
        — `too_long` ⇒ `{ fault: 'name_too_long' }`; `full` / `short` ⇒ `{ name }`. Update the module header's step (4) and the R9
        comment — `readDeceasedName`'s JSDoc *"R9 — the TEXT's name: …, then the SMS `{member}` slot's length
        (`fitsDltAlphanumeric`)"* (`-362`). ⛔ Touch `readMemberFacingDeceasedName` (I5) — its JSDoc included (AC4).
  - [x] 2.2 Remove `fitsDltAlphanumeric` from this file's import list — after 2.1 it is unused here (its only code use was
        `readDeceasedName`), and `@typescript-eslint/no-unused-vars` is an error (lint fails otherwise); `fitsDltUrl` stays imported;
        the export stays (F6).
  - [x] 2.3 The AC3 legs (flip R9; the new one-word leg — each with AC5's assertions as AC5 assigns them; the re-claim leg's
        FIXTURE only, its assertions unchanged);
        update the suite's header line *"`name_too_long` texts ⛔ one"* (F5 (iii) — `-362`: only for a name that still does not fit).
  - [x] 2.4 `peer-mesh-sms-templates.ts`'s header (F15): a name longer than the slot is sent in the short form (`-362`); `no_target`
        only for one that still does not fit. ⛔ Code change.

- [x] **Task 3 — The suspicion texts (AC2).**
  - [x] 3.1 `runSuspicionNoticeChild`: after `if (member === '') …`, `const chosen = smsMemberName(member)`; send `chosen.name` for
        `full` / `short` and the ORIGINAL `member` for `too_long` (SN4 (a) — the core refuses it as today; ⚠ ⛔ test can tell the
        original from the over-long short form — both end `value_too_long` — so this choice is coverage-only BY DESIGN, AC7). ONE local feeds BOTH `render`
        and `values` (T3). Update the RB5 comment and the module header's child line.
  - [x] 3.2 `suspicion-notice-sms-templates.ts`: the header's `{member}` comment (F2) — the long-name half answered by `-359` / this row;
        Row 30 (d)'s unit / Devanagari half still open. ⛔ Code change.
  - [x] 3.3 The AC2 legs — all three purposes (AC2's fixtures and its four oracle points: date, locale, message by body, imports);
        flip *"6.37 review round 2 P2"*; the distinctive one-word leg; each with AC5's assertions as AC5 assigns them.

- [x] **Task 4 — Proof (AC4–AC7).** RED runs (Debug Log); `git diff <baseline_commit> -- apps/jobs/src/scheduler/claim-peer-mesh-requests.ts`
      (the front-matter pin, after any 0.1 re-pin) shows `readMemberFacingDeceasedName`'s body and JSDoc unchanged; the AC6
      diff-stat; typecheck; lint; DLT gate; `ci:local` on :5433.

- [x] **Task 5 — Records and close.** Story Status, Dev Agent Record, File List, Change Log (newest-first); sprint row `in-progress` →
      `review`; ledger. ⛔ "Closed by" until `done` on `main`.

### Review Findings

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
7. **T7 — ⛔ Move or rename `fitsDltAlphanumeric`.** The WhatsApp reminder's test and `peer-mesh-sms-templates.test.ts` import it from
   `peer-mesh-sms-templates.js` (F6).
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
| Live harnesses | `claim-suspicion-notices-live.test.ts` `seedDeath({ kycName })`, `SHIELDED`, `isolated()`, `claimOf`, `refusedS`, `allowAppeal`, `contact`; `claim-peer-mesh-requests-live.test.ts` `world({ name })`, `expectIdsOnly` | new seeds |
| The callers' source leg | `apps/jobs/tests/staff-email-identity-read-fence.test.ts` (repo walk, comment strip, exact allowlist, plants — ⚠ this story's copy reads the AST instead of stripping comments, AC1 amended P-7) | a raw grep / a count |

### Testing standards

Vitest. Unit legs DB-free: `env -u DATABASE_URL pnpm --filter @twt/jobs test sms-member-name` — ⛔ `--` (with it pnpm passes the
filter through and vitest runs all 73 files). ⚠ `passWithNoTests` is on (`package.json` and `vitest.config.ts`) ⇒ a filter that
matches nothing exits 0 — confirm the output reads `Test Files 1 passed (1)` and record that line in the Debug Log. Live legs with
`DATABASE_URL` at :5433. Expected strings computed through the real functions (`resolveMemberFacingDeceasedName`,
`renderSuspicionNoticeSms`, `renderPeerMeshRequest`) — ⛔ transcribed ([[feedback_stub_must_call_not_transcribe]]). Every new leg must
be able to fail (RED run).

### Project structure notes

One new src file + one new test file in `apps/jobs`; edits to two schedulers and two registry header comments. ⛔ `packages/*` source
change (SN1 (a)) — the `claim.json` `$comment` sentences are documentation (SN6). The DLT typed-variables gate scans tracked
`apps/*/src/**` — the new file must not contain `DLT_VAR`, `{#var#}` or `sms.dlt.template_id.` ⚠ not even in its header comment
(rules (ii) / (iii) scan comment lines of a non-registry file); the two registry header edits are safe (rules (ii) / (iii) exempt
registries; rule (i) reads registry CODE lines only).

### Sequencing

⛔ Dependency on an open row. Row 5-13 is `done` and on `main` (`1e22889e`) — ⛔ overlap with the files this story edits (Task 0.1
rebases over it). The PQ1 / PQ2 confirm blocks ⛔ code or merge; it gates go-live only (Rows 22 / 27 condition notes).

### Previous story intelligence (6.37, 6.27c, 6.31, 6.37d)

- 6.37 round 2 P2 / Debug Log (o): the refusal this story replaces, and why it was recorded rather than fixed (it narrowed ratified
  texts — routed, then ruled `-359`).
- 6.27c R9: `fitsDltAlphanumeric` is the ONE predicate — "If Row 30 (d) answers a different limit or unit, this function and the
  ceiling change in ONE place". This story keeps that true.
- 6.31 WR13: split `readMemberFacingDeceasedName` out precisely so this story could change the TEXT's step only.
- 6.37d: RED proofs by hand-disabling the fix; legs that cannot fail were found and rebuilt in review (P7, P8); review the fix diff
  before commit ([[feedback_review_the_fix_diff_before_commit]]).

### Git intelligence

Recent commits on `main` are 5.13 (the WhatsApp code — landed 2026-10-22) after 5.10 / 5.12. 5.13 touched three jobs files this
story does ⛔ edit — `claim-contact-ladder-whatsapp.test.ts` and two src files: `claim-peer-mesh-wa-reminders.ts` (`TEMPLATE_NAME_FORM` re-exported from `@twt/channels`) and
`wa-template-config-key.ts` (now a re-export). The last edits to the two schedulers were 6.37b (`f7e695b7` —
`claim-suspicion-notices.ts`) and 6.31 (`ce850dd2` — `claim-peer-mesh-requests.ts`, the WR13 split).

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
- `packages/domain/src/claim/peer-mesh-wa-reminder.ts` (the reminder's `accepted` precondition — F6)
- `packages/domain/src/kyc/public-name.ts` `resolvePublicMemberName` / `publicNameTokens` (the directory's token cleaning — F16, for contrast only)
- `apps/jobs/tests/staff-email-identity-read-fence.test.ts` (AC1's source-leg model); `apps/jobs/tests/claim-suspicion-notice-no-decision.test.ts`
- `packages/i18n/locales/{en,hi}/claim.json` `$comment.suspicion_sms`, `$comment.peer_mesh_sms` (F15)
- `_bmad-output/implementation-artifacts/6-37-msg91-sms-gateway-adapter.md` (P2, Debug Log (o)); `6-27c-peer-mesh-sending-texts-and-links.md` (R9)
- `docs/launch-gate-inventory/inventory-roster.md` Rows 22, 23, 27, 28, 30 (d), 31 (g) (the confirm precedent), 32 (h) / (i)

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`) — `bmad-dev-story 6.37e`, 2026-10-22.

### Debug Log References

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

### Completion Notes List

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

### File List

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
