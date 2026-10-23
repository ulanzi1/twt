---
baseline_commit: b883dc15
---

<!--
PINNED: b883dc15 (`main` = `origin/main`, 2026-10-22, after `git fetch origin`). Worktree `.claude/worktrees/6-35-in-app-language-switch`,
branch `story/6-35-in-app-language-switch`. Two facts, kept apart (footgun #24): the pin is an ancestor of HEAD (durable); the CODE
claims below were derived at b883dc15 (perishable). Re-check before Task 1:
`git fetch origin && git diff --name-only b883dc15..origin/main -- packages apps scripts docs/launch-gate-inventory microcopy.yaml openapi friction-budget.md`.

STATUS: ready-for-dev (created 2026-10-22 via `bmad-create-story 6.35`; validated 2026-10-22, v1.1 + re-validated v1.2; v1.3 BigDev direction — §0 gate resolved;
v1.4 validated 2026-10-23 against `origin/main` `69e35f73` — the §0 gate RE-OPENED for ONE non-blocking Panel question, PQ1, the reminder's language
fallback; v1.5 2026-10-23 — PQ1 RULED A by the Panel, Decision `2026-10-23-385`: the reminder falls back to the Pariwar's language; built now;
v1.6 2026-10-23 — a fresh-context re-validate of v1.4 + v1.5 applied: the fallback's Pariwar-default source, the reminder alarm, the type pins).

START CONDITION — MET at the pin: rows 6-27 (a), 6-27b, 6-27c, 6-27d, 6-30, 6-31, 6-34, 6-37e and 5-12 / 5-13 are `done` on `main`.
6.35 changes ONE domain read that 6.27c and 6.31 both call (`resolvePeerRequestLocale`) and the two senders' config checks; it
changes ⛔ any other sender's CODE (⚠ the claim-contact family's BEHAVIOUR can move — LS15). Siblings (as of 2026-10-23, after
`git fetch`; `origin/main` = `69e35f73`, 25 commits past the pin): `3-3c-member-kyc-name-english-only` LANDED (`40420410` —
`common.json` ×2 (`kyc.*`), `microcopy.yaml`, `openapi/v1.yaml`, `kyc.tsx`) and `8-15-fixed-amount-transition-staged-card` LANDED
(`69e35f73` — a doc comment in `packages/api-client/src/index.ts` `:575-583`, `contribution.json` ×2, `ActiveContributionCard`):
rebase before Task 1; ⛔ peer-mesh, schema, migration, life-events, audit-sink or data-export file moved. `6-36d-exclude-nominees-from-the-five`
is COMMITTED on its branch (story, routing note, Decision `-384` — rebased onto `main` on 2026-10-23, so cite them by name: SHAs move) and plans its OWN migration (0179)
and edits `schema/claim_peer_mesh_pings.ts`, both begin inputs and both child call sites — see Sequencing (S2).

NUMBERS (footguns #19 / #42(e)): this file names ⛔ migration number, decision id, roster row number or ledger letter that is not
yet TAKEN. At the pin `main` held migrations to 0178, decisions to `-381`, roster Rows to 39, ledger `2026-10-22u`. As of
2026-10-23 (v1.4 validation): `-382` and `-383` are on `main` (3.3c, 8.15 LANDED); `-384` is COMMITTED on `story/6-36d-…`
(Trustee-ratified, nominees — ⛔ language) and `2026-10-23-385` (this story's PQ1 ruling, `73183745`) is on this branch ⇒ next free ≥ `-386`; ledger keys `2026-10-23a`–`f` on `main`, `23b` / `23f` / `23g`–`j`
on 6-36d (its `b` / `f` collide with `main`'s; it is ACTIVE — `h`–`j` were taken during this validation) ⇒ v1.4 took `2026-10-23k`, v1.5 `l`, 6-36d `m`, v1.6 `n` ⇒ the next free letter ≥ `o`; this branch already holds `2026-10-22ae` / `af`
(8.15's `eaecea6b` on `main` ALSO used `22ae` — told apart by story name; re-letter at landing per `-366` decision 6); migrations
still 0178 everywhere, 6-36d's story names 0179; roster Rows still to 39. Each is "the next free one" at the moment of ITS commit —
re-grep `main`, every branch and every worktree. This story's migration is named by its SLUG (`member-preferred-locale`), its roster
row by its KEY (`language-switch-hindi-reviewed`).

§0 GATE (the Panel template, `trustee-panel-routing-note-TEMPLATE.md`): the RULE is ratified — `-303` Q1 rider (Hindi to a member
whose preferred language is Hindi, English to English) and `-310` CF1 A (*"the Pariwar's language until the setting exists; then
each member's choice … The WhatsApp reminder at 48 hours follows the same rule"*, option A as put). HOW the choice is captured
and stored is the AUTHOR's (`-305` §2 item 2, author-commit: *"saved on the phone and recorded on the server when the member changes
it — ⛔ never on first launch"*). v1.3 recorded the gate RESOLVED; ⚠ v1.4 RE-OPENS it for ONE case — see the body section
"§0 GATE": a member who CHOSE a language whose WhatsApp reminder template is unusable (Meta refuses / unset) gets ⛔ reminder under
WR6, which narrows `-303` Q1 A's *"plus one WhatsApp reminder"*; sending the Pariwar's language instead narrows the rider ⇒ two
ratified clauses conflict ⇒ the Panel's. ⭐ ONE NON-BLOCKING question **PQ1** routed (`trustee-panel-routing-note-2026-10-23-6-35-reminder-language-fallback.md`)
and ⭐ **RULED A** (`2026-10-23-385`, Trustee-ratified, DR + KB, 2026-10-23): the reminder goes in the Pariwar's language when it
cannot go in the member's chosen one — built now (LS10 (b′) A). Every other item MATCHES
on BigDev's direction (LS4 (b), LS10 (b) for the TEXT with the T-states as DEFINED, LS15 (b) behind its render-test gate). A Task 0.2
answer that departs from those, a DLT-rejected text locale (S4), or a change to the T-states table re-opens the rest. ⛔ Kept OUT
whatever happens: LS10 (c) for the TEXT.

GLYPH REGISTER: `⛔` negates the word it precedes — before a word that is ALREADY negative (no / not / never / nothing / none) it is
emphasis only, ⛔ a double negative; `⭐` emphasis / action; `⚠` a hazard. ⛔ No `file:NNN` into `.decision-log.md`,
`deferred-work.md` or `sprint-status.yaml` (newest-first files) — cite the decision id + clause, the item's phrase, or the row key.
Line numbers into CODE files are as of the pin; re-grep the symbol if a line moved.

LETTERS: F = found facts (at the pin) · LS = build decisions (PROPOSED; answered at Task 0.2) · I = invariants · T = traps ·
S = Task 0.1 STOP conditions. Decision-entry letters (PM, WR, CF, R, W …) keep their own stories' meaning.
-->

# Story 6.35: The Member Chooses Hindi or English in the App — Saved on the Phone, Recorded on the Server Only When They Change It, and the Neighbours' Text and Its WhatsApp Reminder Then Follow Their Choice `[SURFACE]`

Status: review

> **WHAT THIS STORY IS, IN ONE PARAGRAPH.** The member app always shows Hindi: `LocaleProvider` is in-memory state mounted with ⛔
> initial locale, and ⛔ control anywhere calls `setLocale` (F1). The Panel ruled that the neighbours' text goes in each member's
> preferred language, Hindi or English (`-303` rider), and that until members can choose in the app it goes in the Pariwar's
> language — *"then each member's choice"* (`-310` CF1 A). 6.35 builds the choice: a language screen (and a small switch on the login
> screen) that changes the app at once and saves it on the phone (MMKV); when a signed-in member CHANGES it, the server records it
> on the member (`members.preferred_locale`); ⛔ nothing is recorded on first launch or by inference. Then the ONE domain read both
> peer-mesh senders call — `resolvePeerRequestLocale` — returns the member's recorded choice, else the Pariwar's default, per
> RECIPIENT (today it is per Pariwar), and every text / reminder records which (`locale_source = 'member_choice' | 'pariwar_default'`; the reminder also `'pariwar_fallback'` — `-385`).
>
> **Day-one output.** The app switch works for every member at once. The text/reminder half has ⛔ visible effect today: at the pin
> 6.27c HOLDS every Pariwar (`config:counsel_basis_pending`, Row 27) and ⛔ Pariwar has WhatsApp provisioned — it is built so the
> right language goes the day those lift (verify at Task 0.1, S1). ⚠ ONE behaviour moves with ⛔ code change: the claim-contact
> senders take the FILER's screen language (`(claim)/contact.tsx:184`), so an English-choosing filer makes `'en'` reachable there for
> the first time (F21, LS15).
>
> **What already ships and this story READS — rebuild ⛔ none of it:**
> - `LocaleProvider` / `useLocale().setLocale` / `useT` — `packages/i18n/src/react.ts:30-60` (⛔ change needed in the package);
> - `mmkvStorage` — `apps/mobile/lib/mmkv.ts:26-32` (synchronous; ⛔ AsyncStorage — [[project_mmkv_asyncstorage_equivalent]]);
> - the member API client `memberAuth` (`apps/mobile/lib/member-api.ts`) over `packages/api-client/src/index.ts` `call()`;
> - the settings-entry pattern — `apps/mobile/components/notifications/NotificationSettingsEntry.tsx` + `app/(settings)/`;
> - the locale enum `localeEnum = pgEnum('locale', ['hi','en'])` — `packages/domain/src/schema/pariwar_passport.ts:54`;
> - the one language read `resolvePeerRequestLocale` — `packages/domain/src/claim/peer-mesh-request.ts:634-646`
>   (its comment: *"THE ONE read row 6-35 will change (to "the member's choice, else the Pariwar's default")"*);
> - both senders' template tables — `PEER_MESH_REQUEST_SMS_LOCALES = ['hi','en']` (`apps/jobs/src/scheduler/peer-mesh-sms-templates.ts:33`)
>   and the reminder's per-locale `waTemplateConfigKey('peer_mesh.reminder', locale, pariwarId)`.

## Story

As **a member**,
I want **to choose whether the app speaks to me in Hindi or English, and to have the Trust remember that choice**,
so that **I can read every screen in my language, and the text the Trust sends me when I am asked about a neighbour's death (and
its WhatsApp reminder) comes in the language I chose** — while a member who never chooses keeps exactly what they have today.

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| `2026-10-10-303` ruling item 1 (Q1 A) | *"EACH OF THE FIVE IS TEXTED, NAMING THE MEMBER: … — plus one WhatsApp reminder after two days (48 hours), with the same words, to those of the five who have ⛔ not answered and have chosen WhatsApp messages from the Trust"* | ⭐ TRUSTEE-RATIFIED |
| `2026-10-10-303` ruling item 2 (Q1 rider) | *"The text is sent in Hindi to a member whose preferred language is Hindi, and in English to a member whose preferred language is English."* | ⭐ TRUSTEE-RATIFIED |
| `-303` Consequence 3 | *"Row `6-31-…` is RATIFIED as to substance (Q1 A as put) and follows the same language rule."* | consequence of the ratified Q1 A |
| `-303` "What this ruling does ⛔ NOT cover" | *"if Meta refuses, the reminder does ⛔ not go, and the text still does."* | author text in a ratified entry's not-covered list — ⛔ ruled; ⛔ in the note put to the Panel (the questions as put never mention a refusal; the ruling block, `…asking-the-neighbours.md:67`, lists Meta's approval without it); v1.4 PQ1 puts its member-choice case to the Panel; ⭐ RULED `-385` A — superseded for a member who chose |
| `2026-10-23-385` PQ1 A (this story) | *"go with option A"* — the reminder goes in the Pariwar's language when it cannot go in the member's chosen one; option B (no reminder) ⛔ chosen; its dated correction: for the reminder, `-310` CF1 A gives with the rider | ⭐ TRUSTEE-RATIFIED |
| 6.31 WR6 (committed by `-365`) | *"Meta refuses or files it as MARKETING ⇒ ⛔ reminder in that locale; the text still goes."* — per LOCALE | author-commit |
| Roster Row 35 (b) | *"the en + hi reminder templates approved by Meta as UTILITY … a locale Meta refuses or files as MARKETING is recorded as "Meta refuses" for that locale (`-303`)"* — Row 35 can close with ONE locale refused | go-live roster |
| `2026-10-08-295` §0 | *"An author-commit cannot narrow a ratified obligation on its own"* (applied by `-302` §0 and `-306`) | author-commit (the rule PQ1 follows) |
| `2026-10-17-349` decision 1 | *"no claim flow that sends a text — … the neighbours' request — may run in production while any template it sends is unapproved or its id unset."* (a go-live condition on roster Row 30) | author-commit — makes T1 (TEXT) unreachable in production |
| `-303` "Our reading" — preferred language | *"the language they chose in the app, recorded on the server when they choose it (and when they first use the app); for a member who has ⛔ never used the app, the Pariwar's default language"* — ⚠ never shown to the Panel (`-305` §1 (a)); its *"and when they first use the app"* is OVERTAKEN by `-305` §2 item 2 | ⛔ NOT RATIFIED — overtaken |
| `2026-10-10-305` §1 (b) | the app has ⛔ no language choice — `LocaleProvider` in-memory, ⛔ initial locale ⇒ always `hi` | author-commit (FOUND) |
| `-305` §2 item 2 | *"a NEW row builds the switch (saved on the phone and recorded on the server when the member changes it — ⛔ never on first launch), and from then the member's recorded choice is their preferred language"* | author-commit |
| `-305` §2 item 5 | mints `6-35-in-app-language-switch` | author-commit |
| `2026-10-10-310` CF1 A — option A AS PUT in `trustee-panel-routing-note-2026-10-10-6-27-confirms.md` | *"Yes — the Pariwar's language until the setting exists; then each member's choice (our suggestion). The WhatsApp reminder at 48 hours follows the same rule."* Relayed: *"App is not live, so CF1 may not be relevant."* | ⭐ TRUSTEE-RATIFIED |
| `-310` "Our reading" | *"CF1 governs only the interval between go-live and an in-app language switch (row `6-35`) … 6.27c sends by the Pariwar default until 6-35 replaces it with the member's choice."* | ⛔ not ratified (reading) |
| `2026-10-10-311` PM22 [c] (the 6.27 file) | *"row `6-35` … changes this ONE read to member's choice, else the Pariwar's default. Row 6-31's reminder reads the same. ⛔ No `member_language_preferences` table in 6.27. ⚠ RECORDED: the app always renders `hi` … a Pariwar whose default is `en` would send English texts that open Hindi screens … row 6-35 fixes both halves."* | author-commit |
| 6.27c R10 (the 6.27c file) | `resolvePeerRequestLocale(db, pariwarId) → { locale, source: 'pariwar_default' }` — *"the ONE read row 6-35 will change"* | story (built) |
| 6.31 story WR14 (committed by `2026-10-19-365`, "all as recommended") | `-365` reads *"The ONE language read the text uses (`resolvePeerRequestLocale`), read again at the reminder."*; the 6.31 STORY file adds *"⛔ The ping's `locale_source` copied … reading again is the ruled rule — `-310` CF1 A"* | author-commit |
| deferred-work **W8** — *"`locale_source` is a literal in the begin, ⛔ threaded from `resolvePeerRequestLocale().source`"* | *"⭐ Trigger: row 6-35 — thread the source into the begin AND widen 0156's `locale_source` CHECK in the same change."* | deferred — to be closed by this story (AC3) |
| epics **FR-68** (`epics.md:139`) | *"Hindi + English variants on every member-facing string. Language switcher in profile. Hindi default for Bihar v1."* — the PRD (`prds/prd-TWT-2026-05-22/prd.md:1039`) reads *"All member-facing strings: Hindi + English variants. Language switcher in profile. Default to Hindi for Bihar v1."* | PRD |
| UX spec §Platform Strategy | *"Hindi default for Bihar v1; language switcher in profile."* — ⚠ the app has ⛔ profile screen (F4) | UX |
| UX spec `:554` / `:718` / `:1126` | *"Hindi-as-translation-layer (transliterated Hindi, mixed scripts, …) → violates Hindi-first parity"*; *"Devanagari and Latin at the same hierarchy level must be visually balanced"*; *"the section headers can be bilingual"* | UX |
| `epics.md` freeze table row 10 (`:555` at the pin, `:560` on `main` — re-grep after the rebase; likewise `:540`, the UX `:1126` / `:2611` below) | *"every member-visible string carries Hindi parity; English never primary on member surfaces"*; its anchor column: *"AR-59 + FR-68/69/80. "Hindi-first posture" is PRD policy; the parity contract is architectural"* — and (`:540`) *"Any change to a Frozen item requires an ADR or trustee-ratified Sprint Change Proposal."* UX `:2611` reads it as *"Hindi-primary member surfaces"* | FROZEN |
| `2026-10-22-382` KB6 (3.3c, on `main`) | *"BigDev approves the three Hindi strings … ⛔ new roster row — the 6.18 / 3.3b precedent for a form label and validation messages, ⛔ the Rows 37 / 39 consent-flow precedent. Row `6-35-in-app-language-switch` will make the en strings member-facing too."* | author-commit |

⚠ **STALE LEDGER TEXT — do ⛔ build it.** The 6-35 sprint-row comment still reads *"(`-303` rider; CF1 confirm owed)"* — CF1 was
RULED by `-310` the same day. Annotated (dated) at story creation in the ledger entry; ⛔ rewritten, ⛔ annotated again.

## ⭐ BigDev's direction (2026-10-22, given after validation — before Task 0.2)

> *"resolve the governance gate and the LS4/I2 contradiction before implementation. LS10(b) should remain the preferred technical
> direction, subject to a complete definition of the unavailable-template states. LS15(b) is the safer interim behavior if the
> agreement-language render test proves it."*

Applied in v1.3: the gate below; LS4 (b) ⭐ (I2 holds as written); LS10 (b) ⭐ with the T-states table; LS15 (b) ⭐ gated by AC15's render
test (fails ⇒ STOP, ⛔ silent fallback). Task 0.2 CONFIRMS these with BigDev and asks the rest; it does ⛔ re-open them unprompted.

**⭐ And on 2026-10-23 (v1.4 validation, after the gate was found re-opened for the reminder).** Asked *"which is better no text or
text in English for Hindi Pariwar as fallback ?"*, BigDev was told the fallback can only be the Pariwar's language (the chosen
language's template is the unusable one), and that waiting means a short delay for the TEXT (T1 cannot reach production, `-349`
decision 1; T2 is transient) but NEVER for the REMINDER (Meta's refusal is permanent and Row 35 (b) allows go-live with it) — and
was proposed: the TEXT waits (LS10 (b), unchanged); the REMINDER's fallback is put to the Panel as a NON-BLOCKING question, our
reading A (the Pariwar's language), gating go-live; Task 3 builds the text wait and keeps the reminder fallback behind the ruling.
BigDev: *"yes, write it that way"*. ⇒ PQ1 (below), LS10 (b′) for the reminder, the routing note drafted.

**⭐⭐ The Panel's ruling (2026-10-23, relayed by BigDev): *"by DR and KB"* / *"go with option A"*** ⇒ Decision `2026-10-23-385`
(Trustee-ratified, committed alone `73183745`): PQ1 — A. LS10 (b′) is built as **A**; the interim B is ⛔ built.

## ⚖️ §0 GATE — ONE PANEL QUESTION (PQ1), RULED A BY `-385`; THE REST MATCH (the Panel template, `trustee-panel-routing-note-TEMPLATE.md`; each ratified text quoted verbatim)

> ⚠ **v1.4 (2026-10-23).** v1.3 headed this section "RESOLVED" with every row MATCH. A fresh-context check found G5 / G6 false for
> ONE group — a member who picks a language whose template is unusable while their Pariwar's is usable (e.g. English in a Hindi
> Pariwar): TODAY they get the Hindi text and reminder (CF1 A's interim; an `en` gap never touches a `hi` Pariwar — 6.37 AC9 (a),
> WR6 as built); under v1.3's LS10 (b) they would get ⛔ reminder if `en` is refused (Row 35 (b) — reachable in production), and ⛔
> text if the `en` pre-flight faults past the answer window. That narrows `-303` Q1 A; LS10 (c) narrows the rider instead ⇒ two
> ratified clauses conflict ⇒ the Panel's (template §0), and `-295` §0 forbids an author-commit doing it alone. Rows G5, G6, G10,
> G11 below are the corrected reading; G3, G9 gain qualifiers.

| # | Ratified / binding text | What 6.35 does (on the direction above) | Verdict |
|---|---|---|---|
| G1 | `-303` ruling item 2: *"The text is sent in Hindi to a member whose preferred language is Hindi, and in English to a member whose preferred language is English."* | Each recipient's text in their recorded choice (LS8, LS9); ⛔ the other language ever (I4) | MATCH — this story builds it |
| G2 | `-310` CF1 A (as put): *"the Pariwar's language until the setting exists; then each member's choice (our suggestion). The WhatsApp reminder at 48 hours follows the same rule."* | Member's choice once made; the reminder reads it again at its own begin (WR14) | MATCH — the reminder as narrowed by `-385` (a chooser whose language's template is unusable gets the Pariwar's) |
| G3 | (CF1 A is SILENT on a member who never chooses once the setting exists; so is `-305` §2 item 2) | A non-chooser keeps the Pariwar's language — exactly today's (I2) | MATCH — the AUTHOR'S READING (the note's own premise: the Pariwar's default is the best fact we have; a non-chooser has ⛔ recorded preference for G1 to honour), recorded as such in Task 0.3, ⛔ cited as CF1's words. ⚠ CF1 A's interim is *"until the setting exists"*; after that the only text giving a non-chooser the Pariwar default is `-303`'s NOT-ratified reading, never shown to the Panel (`-305` §1 (a)). Moot while every Pariwar's `locale_default` is `hi` — a Pariwar with `en` makes it live (S1). Under LS4 (b) such a Pariwar's non-chooser sees a Hindi app and gets English texts |
| G4 | `-305` §2 item 2 (author-commit): *"saved on the phone and recorded on the server when the member changes it — ⛔ never on first launch"* | PUT only on an explicit change; a login-screen choice from an earlier app process is dropped (I1, LS5) | MATCH |
| G5 | `-303` not-covered list (⛔ ruled; ⛔ in the note put to the Panel): *"if Meta refuses, the reminder does ⛔ not go, and the text still does."* — 6.31 WR6: *"⛔ reminder in that locale; the text still goes."* | A recipient whose language's reminder template is unusable (unset or refused — T-states) while their Pariwar's is usable: the reminder in the Pariwar's language (LS10 (b′) A, `-385`); a recipient with ⛔ usable template at all (their language IS the Pariwar's, or both unusable) gets ⛔ reminder / the Pariwar held, as today. Their text is unaffected; every other recipient's reminder goes | ⭐ **RULED — `-385` PQ1 A** (2026-10-23): the rider gives for the reminder in this case; MATCH. The analysis that routed it, kept: **RE-OPENED ⇒ PQ1.** MATCH with WR6 (author-commit) — but NEW in effect for a member who picks a language other than their Pariwar's: today the Pariwar-language reminder (CF1 A interim), after 6.35 ⛔ reminder if that language is refused (Row 35 (b) — reachable in production). It rests on `-303`'s not-covered line (never put to the Panel), against Q1 A's reminder (G10). ⇒ the non-blocking PQ1, gating Row 35 |
| G6 | 6.27c / 6.31 config holds as BUILT (author-commit): a held text past the answer window stays `not_sent`; a held reminder past +72 h gets ⛔ row | TEXT: the same consequences, now scoped to the ONE recipient whose OWN language's template is unusable (T-states); a non-template gap still holds the Pariwar exactly as today | MATCH for the DELAY. The past-window DROP is today's class (`-349` FOUND (a): *"the neighbours' request — held; the neighbours are never asked"*) with a NEW reach: a member of a Pariwar whose own locale is usable. T1 cannot reach production (`-349` decision 1, G11); T2 (a pre-flight fault) can — TOLD in the PQ1 note, ⛔ asked (a fault, ⛔ a policy choice). The REMINDER half is PQ1 (G5) |
| G7 | `-263` FQ10 A: *"The neighbours can ⛔ never block a claim on their own."* | A waiting text delays a SIGNAL; ⛔ claim state, ⛔ payment path touched | MATCH |
| G8 | `epics.md` freeze row 10: *"every member-visible string carries Hindi parity; English never primary on member surfaces"* (+ `:540` ADR / SCP rule) | English is shown ONLY to a member who explicitly picked it (LS4 (b)); every string keeps Hindi parity; FR-68 itself requires *"Language switcher in profile"* | MATCH — ⛔ ADR / SCP |
| G9 | (⛔ ruling sets the claimant's language for the claim-contact family) | LS15 (b): the contact screen stays Hindi and records `'hi'` — exactly today's behaviour | MATCH — ⛔ new behaviour. ⚠ `-293`'s "Our reading — ⛔ NOT RATIFIED" calls `contact_locale` *"the filer's own choice for their own claim"*; under LS15 (b) a filer who picked English still records `'hi'` — recorded in Task 0.3 and the LS11 item |
| G10 | `-303` ruling item 1 (Q1 A): *"EACH OF THE FIVE IS TEXTED, NAMING THE MEMBER … plus one WhatsApp reminder after two days (48 hours), with the same words, to those of the five who have ⛔ not answered and have chosen WhatsApp messages from the Trust"* | TEXT: each of the five is texted, a waiting one once its language is usable (LS10 (b)); REMINDER: per PQ1 | MATCH for the text (the delay; the T2 past-window edge told, G6); the REMINDER is the clause PQ1 B narrows (PQ1 A narrows G1 instead) — RULED A (`-385`): Q1 A's reminder is kept; the language rule (G1 / G2) gives for it |
| G11 | `-349` decision 1: *"no claim flow that sends a text — … the neighbours' request — may run in production while any template it sends is unapproved or its id unset"* | T1 (TEXT, id unset) is a dev / pre-go-live state only | MATCH — it is WHY the text can wait without the Panel |

⇒ **⛔ BLOCKING routing note owed; ONE non-blocking question routed — PQ1** (`_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-23-6-35-reminder-language-fallback.md`):
*when a member has chosen a language and the reminder cannot go in it, A — the Pariwar's language, or B — ⛔ reminder?* Our reading
**A** — ⭐ **RULED A** (`2026-10-23-385`, Trustee-ratified, 2026-10-23). Task 3 builds A (LS10 (b′)); Row 35 (b)'s leg records it
ruled. The rest re-opens (a blocking note from the template; Task 3 waits) ONLY if: Task 0.2 departs from LS4 (b) / LS10 (b) for
the TEXT / LS15 (b); the T-states table changes; or S4 fires (a text template is DLT-REJECTED — ⛔ ruling covers a language whose
neighbour text can never be sent; `-349` is the SMS analogue: a wording change is the Panel's). ⛔ KEPT OUT whatever happens: **LS10 (c)
for the TEXT** — sending a member who chose English the Hindi TEXT because the English template is unusable — it narrows G1 with ⛔
need (the text waits only briefly — G6 / G11).

## ⭐ THE INVARIANTS

- **I1 — ⛔ Nothing is recorded that the member did not choose.** The server value changes ONLY by `PUT /api/v1/member/language`,
  and the app calls it ONLY after an explicit selection of a language DIFFERENT from the one shown (in the screen or the login
  switch). ⛔ First-launch write, ⛔ device-language inference, ⛔ "adopt the Pariwar default as a choice", ⛔ backfill.
  *Proof:* AC9 — a fresh install that signs in and uses the app with ⛔ switch ⇒ ZERO `PUT` calls; `preferred_locale` stays NULL.
- **I2 — A member who never chose is unchanged.** `preferred_locale IS NULL` ⇒ the resolver returns exactly today's answer
  (`pariwar_default`, the passport's language) and the app shows exactly today's screen language — HINDI, before AND after sign-in,
  whatever the Pariwar's default (LS4 (b)). The one qualifier is the PHONE's own setting: on a phone where someone already picked a
  language (`app-language.v1`), the app opens in it, as a phone's OS language would — the member's server record stays NULL. With
  the Pariwar's default ⛔ displayed, an `en` Pariwar's non-chooser still gets English texts that open Hindi screens — today's state,
  PM22's display half, left open (LS11) and fixed by the member choosing. *Proof:* the resolver leg with a NULL member; AC8's
  "server null + `pariwarDefaultLocale: 'en'` ⇒ stays Hindi" leg; the existing 6.27c / 6.31 suites stay green with only the type/CHECK
  edits of AC3.
- **I3 — The text's language is its RECIPIENT's.** Resolved per ping from the recipient member (⛔ the deceased, ⛔ the Pariwar
  alone), recorded on the row with WHY (`locale`, `locale_source`).
- **I4 — ⛔ Wrong-language TEXT.** A recipient whose language's TEXT template is unusable (T1–T3) is ⛔ sent the other language's
  text (LS10 (c) — that would narrow `-303`'s rider); they WAIT (LS10 (b)). *Proof:* AC4 (ii)–(iv) legs: an `en` template unusable ⇒
  the English-chooser waits, ⛔ a Hindi text to them. ⚠ The REMINDER is ⛔ under I4: by `-385` (PQ1 A) it goes in the Pariwar's
  language and records why (LS10 (b′), AC5).
- **I5 — One attempt, one language.** A re-claimed ping (a prior attempt may have sent) re-uses the `locale` recorded at its first
  begin — ⛔ re-resolved — so a possible second text carries the same words; a row begun by pre-6.35 code (`locale IS NULL`) was
  sent in the Pariwar's default, so its re-claim writes THAT (LS9). Backstopped in the database: once written, `locale` cannot
  change (the guard's written-once arm), and a finished row's `locale` is frozen with its other delivery columns. (The reminder
  re-claims only while `send_started_at IS NULL` — nothing sent — so it re-reads, per WR14.)
- **I6 — ⛔ Other sender's CODE moves.** OTP, suspicion texts, claim-contact ladder / reminders, alerts, moderation, cycle-open, the
  WhatsApp opt-in code, push — byte-unchanged except named comment lines (AC12). ⚠ Code-unchanged ≠ behaviour-unchanged: the
  claim-contact family and suspicion (c) read `contact_locale`, the FILER's screen language — LS15 decides it. They are listed in
  ONE deferred item (LS11).
- **I7 — Ids only.** ⛔ Mobile, name or link code in a log, alarm or audit context; the audit context carries the locale code only.

## 📜 Policy meaning (AI-10-1)

**6.35 introduces ⛔ no predicate that gates a member's access to a benefit, and changes ⛔ none.** It adds a stored preference and
changes ONE read that decides the LANGUAGE of a text — and, through LS10 (b), whether a neighbour whose language's template is
unusable is texted before the window closes; ⛔ whom the Trust picks, or what anyone is owed (a neighbour's text is a REQUEST to
them, ⛔ a benefit; the family's claim is untouched — `-263` FQ10 A). In the member's terms: *"the language you pick in the app is
the language the app speaks to you, and the language the Trust texts you in when it asks whether you knew a member who has died —
picking a language never changes whether, when, or how much any family is paid, or whether you are chosen to be asked. If the Trust
cannot yet text you in the language you picked, the text waits until it can — it is never sent to you in the other language — but
if the time to answer has passed by then, it is not sent at all. If the WhatsApp reminder cannot come in your language, it comes in
your Pariwar's language, if that one can be sent."* (LS10 (b) / (b′), G5 / G6; the reminder half ruled by the Trustees, `-385` PQ1 A.) Checked against the Niyamavali: ⛔ clause governs the language of the app or of these texts (⛔ a benefit predicate;
the Niyamavali is a rulebook, ⛔ binding — [[feedback_niyamavali_rulebook_not_spec]]). ⚠ LS10's template gate can DELAY — and, past
the window or +72 h, DROP — neighbour texts / reminders; that is a provisioning gate on a SIGNAL (`-263` FQ10 A: *"The neighbours can ⛔
never block a claim on their own."*), ⛔ a predicate on a member's benefit. By `-385`, a member who picked English whose English
reminder template is unusable gets the reminder in their Pariwar's language — the member sentence above says so.

## ⭐ FOUND FACTS (at b883dc15 — each re-run at Task 0.1)

- **F1 — The app has ⛔ language state that outlives a render tree.** `LocaleProvider` (`packages/i18n/src/react.ts:30-40`) is
  `useState(props.initialLocale ?? DEFAULT_LOCALE)`; `initialLocale` is read on MOUNT only. `apps/mobile/app/_layout.tsx:88-99` mounts
  `<LocaleProvider>` (`:93`) with ⛔ `initialLocale` ⇒ always `'hi'`. ⛔ `setLocale` call, ⛔ language control, ⛔ stored locale in
  `apps/mobile` (grep `setLocale`, `भाषा`, `expo-localization` ⇒ comments only). `DEFAULT_LOCALE = 'hi'` (`packages/i18n/src/locale.ts:36`).
- **F2 — Provider order** `LocaleProvider > SessionProvider (lib/session-context.tsx) > Provider (components/Provider.tsx)` ⇒ the session
  layer CAN call `useLocale().setLocale` (it is inside the provider). `_layout.tsx` returns `null` until fonts load (`:77-79`).
- **F3 — MMKV.** `mmkv = createMMKV({ id: 'twt-p0-5' })` (`lib/mmkv.ts:14-16`); `mmkvStorage` get/set/remove, synchronous (`:26-32`).
  Newer keys are dotted with a `.vN` suffix (`pool-onboarding.completed.v1`, `known-people.saved-names.v1`). ⛔ `clearAll` anywhere;
  sign-out (`lib/session-context.tsx:114-137`) clears named member data only — its ONLY caller is `app/(withdrawal)/index.tsx`.
  Session tokens live in SecureStore (`lib/session.ts:16-21`), ⛔ MMKV.
- **F4 — ⛔ Profile or settings screen.** `NotificationSettingsEntry.tsx:3-4`: *"the app has no dedicated profile/settings screen
  yet."* Settings are understated entry buttons stacked on the home tab (`app/(tabs)/index.tsx:80-102`); `app/(settings)/` holds
  `_layout.tsx` (a `<Stack />`), `notifications.tsx`, `telegram-notifications.tsx`; the root layout registers the group (`_layout.tsx:196-202`).
- **F5 — Logged-out screens.** `app/(auth)/login.tsx` (70 lines, one `YStack`, `useT()` keys `auth.*`), `otp.tsx`, `rejoin-locked.tsx`,
  `terminated.tsx`. ⛔ welcome screen. The SIGNUP WIZARD (`(signup)` tc → kyc → workplace → nominees → medical → whatsapp → payment)
  runs AFTER `signIn` and BEFORE the home tab is usable ⇒ without a login-screen switch a member reads login + the whole wizard in Hindi.
- **F6 — The app already sends the SHOWN locale to the server at six sites**, each a record of what the member SAW:
  `(signup)/tc.tsx:95,126` (T&C — the handler echoes the locale; ONE body per version, `member-terms.handlers.ts:52-56`, so English
  causes ⛔ 404), `(claim)/consent.tsx:169-172`, `(claim)/contact.tsx:184` (a claim's `contact_locale` default),
  `(life-events)/address.tsx:44`, `life-events/MedicalForm.tsx:112`; `lib/public-site.ts` passes `?lang=`. These become CORRECT
  (they record the real shown language) — ⛔ change them. (T&C's `locale` records the SCREEN language, ⛔ the body's — one body per
  version.) ⚠ `contact.tsx:184` is ⛔ only a record: it becomes the claim's `contact_locale`, which DRIVES other senders (F21, LS15).
- **F7 — ⛔ Locale header.** `packages/api-client/src/index.ts` `call()` (`:257-300`) sets only `content-type`, `authorization`,
  `extraHeaders`; ⛔ `Accept-Language` anywhere. ⛔ add one (out of scope).
- **F8 — The server stores ⛔ member language.** `members` (`packages/domain/src/schema/members.ts`): `member_id, pariwar_id, state,
  state_event_version, lock_in_days_at_join, custom_fields, created_at, updated_at`. `:4` *"lifecycle ANCHOR — NOT the member's
  profile"*; `:126-127` *"⚠ `members` IS A CERTIFIED PII-FREE TABLE"* (a locale code is ⛔ PII). A non-`state` column is written by
  a plain scoped UPDATE (the 0018 trigger fires only on `state`, `:117-124`; precedents `member/lock-in.ts:82`,
  `custom-fields/member-write.ts:119`). RLS `members_tenant_isolation_*` on `app.pariwar_id`; `GRANT SELECT, INSERT, UPDATE ON members
  TO twt_app` (0018, table-wide). Add-column precedent: `0096_members-custom-fields.sql:10-14` (*"a HOT table … Add-defaulted only;
  NO blocking backfill"*).
- **F9 — ⛔ `/me` endpoint.** `MemberFullSession` (`packages/contracts/src/members/auth.ts:40-52`) carries ⛔ locale; ⛔ member route
  returns the Pariwar's `locale_default`. Member routes take ⛔ RBAC key (`packages/domain/src/rbac/permissions.ts:374-376`) — they
  are `requireMemberSession`-gated ⇒ ⛔ catalog bump.
- **F10 — The simple self-service write precedent** is Life Events address: `POST /api/v1/member/life-events/address`
  (`apps/api/src/modules/life-events/routes.ts:91-101`, `preHandler: [memberSession]`, ⚠ ⛔ rate limit on THIS route — `memberWrite`
  (`:108-113`, a LOCAL const with `perMemberKey` from `plugins/rate-limit/index.js`) is used by the posting route `:115-127`
  (`config: { rateLimit: memberWrite }`)); handler `handlers.ts:205-251` — `openScopeTx` → write → `emitAuthAudit(deps, request,
  'member_life_events.address_updated', { … context: { locale } })` (`:242`, ⚠ INSIDE the `try`, BEFORE `closeScopeTx` at `:249` in
  the `finally` — the precedent audits before commit). `emitAuthAudit`'s fields take `actorId`, `pariwarId`, `context`; `context` is
  SHA-256 hashed (`auth/shared/audit.ts:22-31`; `audit_log_entries` has ⛔ context column). The audit action set is a CLOSED union
  (`apps/api/src/audit/audit-sink.ts`, e.g. `:173`) — the ONLY list (⛔ DB CHECK, ⛔ catalog test). PUT is supported end to end (a
  member PUT route `claims.peer-request.member.routes.ts:89`; `call()` `:262`; 8 `method: 'put'` OpenAPI registrations); a
  `memberSession` preHandler is all the login-wall spec needs. Contracts are camelCase `.strict()` (`packages/contracts/src/life-events/address.ts:29-34`;
  ⛔ import `@twt/domain`); OpenAPI paths hand-registered in `packages/contracts/scripts/emit-openapi.ts` → `openapi/v1.yaml`
  (CI `contracts:check-openapi-determinism`). Login wall: `apps/api/tests/integration/login-wall.spec.ts` (every route tagged).
- **F11 — The one read is per PARIWAR.** `resolvePeerRequestLocale(db, pariwarId)` (`peer-mesh-request.ts:640-646`) reads
  `pariwar_passport.locale_default`; `PeerRequestLocale = { locale: 'hi'|'en'; source: 'pariwar_default' }` (`:617-621`);
  `PeerRequestLocaleMissingError` ⇒ a HOLD (`config:locale_unavailable`), any other throw ⇒ a retry.
- **F12 — 6.27c resolves ONE language per Pariwar and holds per Pariwar.** `claim-peer-mesh-requests.ts` header `:4` *"a hold per
  PARIWAR (every config gap here is per Pariwar or global)"*; `pariwarConfig()` (`:208-237`) resolves the locale (`:218`), checks THAT
  locale's DLT id (`:224-227` ⇒ `config:dlt_template_id_missing:${locale}`) and preflight (`:228-232`), returns `{ config: { locale } }`;
  the sweep memoises it per Pariwar (`:315-337`) and parks a held Pariwar's in-flight pings, keeping it out of the three-day give-up
  (`:362-375`); the child reads it once (`:592`) and renders every ping with it (`:715-721`). `beginFresh` writes the LITERAL
  `locale_source = 'pariwar_default'` (`peer-mesh-request.ts:472` — W8). ⛔ `locale` column on `claim_peer_mesh_pings` (only
  `locale_source`, `schema/claim_peer_mesh_pings.ts:139`). ⚠ The DLT template id is GLOBAL per locale, ⛔ per Pariwar:
  `sms.dlt.template_id.peer_mesh.request.${locale}` (`peer-mesh-sms-templates.ts:71-72`); 6.37 AC9 (a) deliberately checks only the
  Pariwar's OWN locale in `pariwarConfig` (`:228-229`: *"⛔ in `globalConfigGap` (a broken `en` template would otherwise hold every
  Hindi Pariwar)"*), pinned by `apps/jobs/tests/claim-peer-mesh-requests-live.test.ts:954` (whose second half — *"and holds the English
  one"* — pins that an `en` Pariwar holds on its own template). A ping held past the claim's answer window is ⛔ begun at all:
  `listDuePeerMeshRequestClaims` lists only NULL pings inside the window, and such a ping stays NULL — the console's `'not_sent'`
  (`peer-mesh-request.ts:710-711`, R16). A claim whose only due ping cannot be begun is still enqueued each sweep, counts against
  `maxClaims` (the starvation warned of at `claim-peer-mesh-requests.ts:386-389`) and decrypts the deceased's name each run (R9). `begun` returns
  `recipientMemberId = ping.member_id` (the recipient); the re-claim (`:425-445`) resolves nothing today.
- **F13 — 6.31 resolves per Pariwar too.** `peerMeshWaReminderConfig` (`claim-peer-mesh-wa-reminders.ts:173-206`): the locale
  (`:188-190`), then that locale's template NAME (`:201`; key `wa.template.<purpose>.<locale>.<pariwarId>` — PER Pariwar) ⇒
  `config:wa_template_missing:${locale}` (`:205`); the row records `template_name, locale, locale_source`
  (`packages/domain/src/claim/peer-mesh-wa-reminder.ts:294,356-375`). ⚠ The child does ⛔ know the recipient before the begin:
  `listClaimDuePeerMeshWaReminderPings` returns ping ids only (`:586-610`); `ping.member_id` is first read under the lock
  (`lockClaimPingReminder`, `:213`); the begin takes ONE pre-resolved `template: { name, locale, localeSource }` (`:294`) from
  `config.*` (`claim-peer-mesh-wa-reminders.ts:577`), and the send uses `config.templateName` / `config.locale` (`:672-673`). A
  reminder re-claim happens only while `send_started_at IS NULL` (`:373`) and already rewrites the locale. A reminder ⛔ begun before
  +72 h gets ⛔ row at all (`dueConjunctsSql`: a ping whose window passed while held *"was NEVER due and gets ⛔ row"*); an existing
  un-marked row past +72 h is finished `skipped_late` (`markLatePeerMeshWaReminders`, `:774-797`). "Meta refuses" is recorded in a
  Decision (Row 35 (b)); the code only ever sees an UNSET key (`:205`) — ⛔ config value means "refused". The config's other gaps:
  a read fault ⇒ `config:wa_template_unreadable` (`:203`, ⛔ `config:secret_manager`); a set name failing `TEMPLATE_NAME_FORM` ⇒
  `config:wa_template_invalid:${locale}` (`:206`).
- **F14 — The CHECKs and the type pins that admit only `'pariwar_default'`** (all MUST move together — W8):
  `0156_claim-peer-mesh-replies.sql:61` (pings), `0171_peer-mesh-wa-reminders.sql:75` (reminders; `:74` `locale IN ('en','hi')`);
  `PEER_MESH_LOCALE_SOURCES = ['pariwar_default']` (`schema/claim_peer_mesh_pings.ts:53-54`, *"⚠ LOCKSTEP with 0156's CHECK"*);
  `apps/jobs/tests/claim-peer-mesh-wa-reminders.test.ts:73-77` (`toEqualTypeOf<'pariwar_default'>()` — *"A wider … (row 6-35) FAILS here
  … widen the CHECK in the same row, then this leg."*); two RLS/record specs assert `'member_choice'` ⇒ 23514
  (`packages/domain/tests/integration/rls/claim-peer-mesh-replies-policy-regression.spec.ts:169` — by error code only;
  `packages/domain/tests/integration/claim/peer-mesh-wa-reminder-record.spec.ts:216` — by constraint NAME) — these FLIP (they now
  insert it successfully). Also broken by the signature change (⛔ deliberate pins, just callers): `packages/domain/tests/integration/claim/peer-mesh-request.spec.ts:558-559`
  (`resolvePeerRequestLocale(db, pid)`), the reminder begin callers in `peer-mesh-wa-reminder.spec.ts` / `…-concurrency.spec.ts`; and
  the 6.37 live leg `claim-peer-mesh-requests-live.test.ts:954` (F12) — its English-Pariwar half flips under LS10 (b) (wholly, were
  (a) chosen instead). Precisely: today `world({ locale: 'en', selected: 1 })` with `en` broken ⇒ `{ enqueued: 0, heldForConfig: 1 }`,
  row NULL; under LS10 (b) ⇒ `heldForConfig: 0`, `enqueued: 0`, the row stays NULL (it WAITS, ⛔ held) and the waiting alarm names `en`.
- **F15 — The finished-row freeze.** `claim_peer_mesh_pings_guard_delivery()` (`0166_peer-mesh-request-sending.sql:78-128`) freezes the
  `delivery_cols` array (incl. `locale_source`) once a send finished — ONLY when `OLD.send_outcome <> 'attempting'` (`:88`); its
  attempting-row checks (6.27c R15, `:105-125`) and link_code's written-once arm (`:101-104`) do ⛔ cover a locale ⇒ today a re-claim
  could rewrite one. Only 0156 (`:68-93`, the SHORTER body) and 0166 define the function; ⛔ 0167–0178 replaces it ⇒ copy 0166's FULL
  body. A NEW `locale` column must join that array (CREATE OR REPLACE in the new migration) and the column GRANT UPDATE list (0156:65 —
  UPDATE-only; INSERT is table-wide from 0054:78 ⇒ `GRANT UPDATE ("locale")` only).
- **F16 — Migrations.** Hand-authored `packages/domain/migrations/NNNN_slug.sql`, highest `0178_member-wa-opt-in-codes.sql`; journal
  `meta/_journal.json` `when` = previous + 86400001 (0178 = `1794886800022`); ⛔ `db:generate` (diffs a frozen 0020 snapshot); statements
  split by `--> statement-breakpoint`; ⛔ edit an applied migration ([[project_live_db_test_gotchas]]).
- **F17 — Copy.** Flat dotted keys in `packages/i18n/locales/{en,hi}/common.json`; the parity gate (`pnpm i18n:check`, root
  `package.json:25`) checks en→hi only — ⚠ but the English catalog IS complete (equal keys and `{param}` tokens both ways in every
  namespace; `t()` THROWS on a missing key, `resolver.ts:62-65`); `common` IS in `microcopy.yaml` `scope.copy_globs` (`:388-389` at the
  pin, +4 on `main` after 3.3c — read the LIST, ⛔ the header — footgun #22 (a)) ⇒ the microcopy gate runs on new keys, `$comment`
  VALUES included (footgun #27; `common.test.ts` scans `Object.values`; `report` is an always-on vocabulary term, `microcopy.yaml:36`).
  Stories enrol their new / edited mobile files in `code_globs` (6.18, 6.21b, 6.27a, 3.3c KB8). The language-names precedent: `niyamavali.json` `switch_to_hindi: "हिन्दी"`, `switch_to_english: "English"` (BOTH catalogs —
  endonyms), used by `apps/public/src/layouts/PublicShell.astro:147-152`. `$comment.<topic>` keys document a block in both catalogs;
  the `hi` one records *"agent-authored and NOT YET HUMAN-REVIEWED — go-live Row …"*.
- **F18 — Mobile tests.** `apps/mobile/vitest.config.ts`: `include: ['tests/unit/**/*.test.ts']`, env `node`, ⛔ setup file ⇒ `.test.ts`
  only (render with `createElement`), `// @vitest-environment jsdom` per file, RTL `cleanup` in `afterEach`, mock `react-native-mmkv`
  (in-memory Map — `tests/unit/pool-onboarding-gate.test.ts:10-23`) or `lib/mmkv`; render inside a REAL `LocaleProvider`
  (`tests/unit/wa-notifications-screen-render.test.ts:108-110`); copy-key test shape `tests/unit/wa-notifications-copy-keys.test.ts`.
- **F19 — Data export** reads the `members` row with a bare `.select()` — every column (`packages/domain/src/data-export/assemble.ts:176-180`) —
  but builds the `profile` object field by field (`:414-418`, `lockInDaysAtJoin` at `:417`), so a new column is ⛔ copied unless added there; contract `ProfileSection` (`packages/contracts/src/data-export/data-export.ts:124-239`,
  `.strict()`), strict-parsed at `apps/jobs/src/data-export.ts:68`; tests `packages/domain/tests/integration/data-export/data-export.spec.ts`,
  `apps/jobs/tests/data-export.test.ts` ([[project_data_export_sections_strict_parsed]]).
- **F20 — Stale "always Hindi" premises in code and records** that become false when this ships (comments/records only):
  CODE — `apps/api/src/modules/wa-opt-in/code-delivery.ts:40` (*"the app is always Hindi"*); `apps/jobs/src/scheduler/moderation-notify.ts:310`
  (*"Per-member locale preference is not yet on the member record"*); `contribution-notify-triggers.ts:236` (*"there is no member
  locale column today"*); (`(tabs)/_layout.tsx:24-26` ANTICIPATES the switch — ⛔ stale, keep). RECORDS — 5-10 F15 (*"the English is not
  member-visible today"*); 6.30 (*"The mobile app always renders Hindi until row 6-35"*); 6.27 PM22's RECORDED line; 6.27c `:35` and
  `:731-732` (*"the app always renders `hi`"*); 6.27c R11 (*"the template id of the Pariwar's locale"*, `:315-317`); 6.31 WR7 (the template
  name for the Pariwar's locale); 5-13 story `:491` (*"(the app is always Hindi — …)"*); `docs/launch-gate-inventory/dlt-template-requests-6-19.md`
  `:18-22` (*"the 6.27c sweep HOLDS every Pariwar whose language's id is unset"* — operative, changes with LS10) and `:218` (*"The LANGUAGE is
  the Pariwar's default until row 6-35 lets members choose"*); memory `project_mobile_app_no_language_switch` (also its stale *"Panel
  confirm CF1 owed"*). ⚠ Consequence: the app's ENGLISH strings become member-visible for the first time — `-382` KB6 already records it.
- **F21 — Every other sender** (I6) — none names 6-35: suspicion (a)/(b) hard-coded `hi` (`claim-suspicion-notices.ts:97-102`,
  `suspicion-notice.ts:776`); ⚠ the claim-contact family (certificate, correction, ladder SMS + the ladder WhatsApp step, closure —
  `claim-contact-ladder.ts:1121`, `claim-certificate-reminders.ts:672`, `claim-correction-closure.ts:373`, `claim-contact-ladder-whatsapp.ts:424`)
  and suspicion purpose (c) (`claim-suspicion-notices.ts:97`: *"BOTH for (c) (its `contact_locale`…)"*) by `claim_contacts.contact_locale` —
  which is the FILER's SCREEN language (`(claim)/contact.tsx:91` `useLocale()`, `:184`; stored `claim-contact-persist.ts:269,445`), ⛔ a
  claimant-language control. Today it is always `hi`; 6.35 makes `'en'` reachable: an English-choosing filer sends the claimant (maybe a
  non-member who reads Hindi) English texts, and an `en` agreement SKIPS the Hindi-review gate (`claim-contact-whatsapp-basis.ts:45-46`:
  `if (payload['locale'] !== 'en' && !version.hiReviewed) return … 'hindi_not_reviewed'`). Code unchanged; behaviour CHANGES — LS15. OTP English-only (`packages/channels/src/otp-sms-template.ts:67,73`;
  deferred *"OTP DLT templates are English-only"*); moderation `DEFAULT_LOCALE` (`apps/jobs/src/scheduler/moderation-notify.ts:310-312`
  *"Per-member locale preference is not yet on the member record"*); contribution / cycle-open (`contribution-notify-triggers.ts:234-238`);
  news / survey push teasers; the 5.13 code template (`code-delivery.ts:40-41`); `getLocale`'s `sessionLocale` rung (`packages/i18n/src/locale.ts:74-95`,
  ⛔ caller supplies it; its only callers are public Astro pages — ⛔ wiring needed).
- **F22 — What does ⛔ switch with `setLocale`.** Every `useT()` consumer re-renders (memo rows included), but: the tab titles
  `'My Pool'`, `'Shradhanjali'`, `'Panchayat'` are English literals in BOTH locales (`(tabs)/_layout.tsx:52,59,66`); the Shradhanjali tab
  is hard-coded Hindi (`ShradhanjaliSahyogVivran.tsx:170,216,225`, `MemoryInput.tsx:17,29`, `KinshipLattice.tsx:16`); strings already
  translated into STATE stay in the old language until reset (`login.tsx:32,41-45` `setError(t(…))`, `otp.tsx` `setNotice`).
- **F23 — The jobs worker bypasses RLS.** `withPariwarScope` sets `app.pariwar_id` but never `SET ROLE` (`db.ts:164-185`); the jobs pool
  is the BYPASSRLS service login (`apps/jobs/src/boot.ts:611-615`); CI's login is a superuser (`db.ts:103-108`). Only the API's
  `openScopeTx` sheds to `twt_app` (`scope-tx.ts:33-39`). ⇒ in the senders, a query's OWN predicates are the only tenant scope.
  `readPeerMeshRequestEligibility` filters `pr_m.pariwar_id = ${pariwarId}` and maps "no row" to `peer_not_eligible` (`peer-mesh-request.ts:193-196`).
  `pariwar_passport` is readable by `twt_app` across Pariwars (`USING (true)`), so the API's GET can read the default.
- **F24 — The session layer.** `StoredSession.memberId` is set at `signIn` (`session-context.tsx:107`) and on restore; a pending-signup
  member has a full session (`otp.tsx:62-63`) and `requireMemberSession` has ⛔ state gate (`member-session-guard.ts:25-40` checks only the
  JWT and `typ`) ⇒ GET / PUT work during the signup wizard. Member data is cleared on THREE paths: `signOut` (`:114-137`) and two in
  the refresh path (`:66-90` — a refused refresh, termination during refresh). ⛔ app-level `AppState` listener exists; four
  screen-scoped ones do (`pay.tsx:229`, `whatsapp.tsx:202`, `notifications.tsx:123`, `use-death-certificate-status.ts:92`).
- **F25 — The text park (v1.4).** `parkHeldPeerMeshRequests` (`peer-mesh-request.ts:787`) writes ONLY `claimed_by_job =
  PEER_MESH_REQUEST_PARKED_BY` and `parked_at` (⛔ `detail`), and ONLY for pings of HELD scopes (`:799` `p.pariwar_id = ANY($5)`).
  ⚠ A parked row is RE-CLAIMED at once by any begin: `:374-376` (`const parked = ping.claimed_by_job === PEER_MESH_REQUEST_PARKED_BY;
  if (!ownRetry && !parked && !leaseExpired) return held_by_other`), and `listDuePeerMeshRequestClaims` lists every claim with
  `pr_p.send_outcome = 'attempting' AND pr_p.claimed_at < ${lease}` (`:738`) — the park does ⛔ touch `claimed_at`. A held Pariwar's
  parked rows stay safe only because the HELD claim is never enqueued. The give-up credits parked time (`:837-839` — the anchor is
  `aging_since + (now − parked_at)` while parked). The send core's `config:*` result is scope-wide (P1, `:785-788`) and the pre-flight
  `break` (P13, `:751-754`) claim-wide. The text child has ⛔ catch-all on the begin result (`:624-650`) ⇒ tsc forces a new kind to be
  handled; its race-guard config is its OWN `pariwarConfig` (`:581`) — the child is a separate job.
- **F26 — The reminder sweep and its park (v1.4).** The SWEEP's listing is `listDuePeerMeshWaReminderPings` (`peer-mesh-wa-reminder.ts`
  `:673-706`; keyset on `(claim_case_id, ping_id)`, ids only, a DELIBERATE block); `listClaimDuePeerMeshWaReminderPings` (`:586-608`)
  is the CHILD's read; the sweep de-dupes claims in `seenClaims` (`claim-peer-mesh-wa-reminders.ts:387`, `:405-415`). `parkPeerMeshWaReminder`
  requires the in-flight marker SET by the holder (`peer-mesh-wa-reminder.ts:552-553`: `AND claimed_by_job = ${jobId} AND
  send_started_at IS NOT NULL`) — it CANNOT run inside a re-claim (`send_started_at IS NULL`). The detail grammar
  `PEER_MESH_WA_REMINDER_DETAIL_PATTERN` (`schema/claim_peer_mesh_wa_reminders.ts:53-54`; 0171:77-78 CHECKs the same) admits ⛔
  `config:*` — *"the `config:<gap>` codes are ALARM-only"*. The reminder child counts an unknown begin kind under `passed` (`:588`,
  catch-all). A sibling ping's child can list a waiting ping (⛔ locale filter in the child read) and its begin finishes it
  `skipped_late` past +72 h (`:327`).

## ⚖️ Build decisions LS1–LS15 (PROPOSED — answered by BigDev at Task 0.2; ⭐ = recommended; LS4 / LS10 / LS15 ⭐ per BigDev's direction; LS10 (b′) = PQ1, the Panel's)

- **LS1 — Where the server keeps the choice.** ⭐ **(a)** two nullable columns on `members`: `preferred_locale locale` (the existing
  enum) and `preferred_locale_set_at timestamptz` — both NULL until the first explicit change; ⛔ default, ⛔ backfill (F8: a non-PII
  code; a plain scoped UPDATE; RLS and grant already cover it; a nullable add on a hot table needs ⛔ rewrite). **(b)** a new
  one-row-per-member table `member_language_choices` (+ RLS policy file, per-command policies, column GRANT, its own RLS spec).
  *Cost (a):* bends the *"anchor, ⛔ profile"* comment (`members.ts:4`) — record a dated line there. *Cost (b):* ~4 more artefacts
  for one value; the resolver gains a second join.
- **LS2 — The API.** ⭐ `GET /api/v1/member/language` and `PUT /api/v1/member/language` (body `{ locale: 'hi'|'en' }`), both ⇒
  `MemberLanguageResponse { chosenLocale: 'hi'|'en'|null, pariwarDefaultLocale: 'hi'|'en' }` (camelCase, `.strict()`, in a new
  `packages/contracts/src/member-language/language.ts`, re-exported from `src/index.ts`). `preHandler: [memberSession]`; PUT rate-limited
  by the module's OWN `memberWrite`-shaped const with `perMemberKey` AND `hook: 'preHandler'` (`config: { rateLimit: … }` — the Life
  Events POSTING route, F10; `memberWrite` there is module-local; ⚠ without `hook: 'preHandler'` the key runs before the session and
  `perMemberKey` falls back to the IP, `life-events/routes.ts:105-113`); the module registered beside `registerLifeEventsModule(app,
  deps)` (`apps/api/src/server.ts:301`); ⛔ Idempotency-Key (setting an absolute value — a repeat is the same state); ⛔ events_log
  event (⛔ a lifecycle fact; ⛔ `MEMBER_EVENT_TYPES` change); the audit AFTER COMMIT, and ONLY when the value CHANGED — ⚠ UNLIKE the
  precedent (which audits inside the `try`): `ok = true` → `await closeScopeTx(scopeTx, true)` → then `if (changed) emitAuthAudit(deps,
  request, 'member.language_changed', { actorId, pariwarId, context: { locale } })` (add to the closed union — its only list). A missing
  passport ⇒ 503 (`ServiceUnavailableError`, `http-errors.ts`); a missing member row ⇒ 409. ⛔ terminal-state guard — a locale code is
  harmless (the session guard does ⛔ check state, F24; termination is enforced at login / refresh; five other modules carry a
  `TERMINAL_STATES` guard, e.g. `data-export/handlers.ts:38-46`, ⛔ needed here).
- **LS3 — The phone store.** ⭐ `apps/mobile/lib/app-language.ts`: MMKV key `app-language.v1` (`'hi'|'en'` — the language last
  CHOSEN or ADOPTED on this phone) and `app-language.pending.v1` (JSON `{ locale, memberId: string | null, processId: string | null }` —
  an explicit change ⛔ yet recorded; `memberId: null` = made before sign-in, and then `processId` is REQUIRED (the app-process boot id,
  a module-level value minted once per JS process) so a LATER process drops it — LS5; a stored null pending with ⛔ `processId` is
  dropped as if from an earlier process). Read synchronously in `_layout.tsx` ⇒ `<LocaleProvider initialLocale={readStoredLanguage() ?? undefined}>`.
  Both KEPT on sign-out (a phone setting, like the OS language). Inject a `SyncStorage` for tests (the `known-people-saved-names.ts:19-38`
  shape). ⛔ AsyncStorage, ⛔ `expo-localization`, ⛔ device language (I1).
- **LS4 — What the app shows when nothing is stored.** ⭐ **(b)** Hindi until the member picks a language — before AND after sign-in:
  after sign-in, from `GET`: `chosenLocale ?? stored phone language ?? 'hi'` — DISPLAYED via `setLocale` (a server choice is also
  stored in `app-language.v1`, ⛔ PUT); the Pariwar's default is ⛔ displayed. This is what makes I2 TRUE as written (a non-chooser is
  unchanged) and keeps freeze row 10 untouched (G8: English is shown only to a member who picked it — FR-68 requires the switcher;
  row 10's anchor *"AR-59 + FR-68/69/80. "Hindi-first posture" is PRD policy; the parity contract is architectural"*; UX `:2611`'s
  *"Hindi-primary member surfaces"* holds). *Cost (b):* PM22's display half stays OPEN — an `en` Pariwar's non-chooser gets English
  texts that open Hindi screens (today's state; the LS11 deferred item; the member fixes it by choosing). The GET still returns
  `pariwarDefaultLocale` (it reads the passport anyway; a 503 when it is missing) — informational; the app does ⛔ display it.
  *Alternative (a):* display `chosenLocale ?? stored phone language ?? pariwarDefaultLocale` — closes PM22's half, but BREAKS I2 (an `en`
  Pariwar's non-chooser would see English with ⛔ choice made — I2 must then be restated), puts freeze row 10 in question (if
  "primary" means "shown", an English DEFAULT display may need an ADR / SCP, `epics.md:540`), and a cold start shows Hindi then flips
  after the GET (the adopted default is ⛔ stored; offline it stays Hindi).
- **LS5 — Reconciling at sign-in and app start (with a session).** ⭐ ONE function `syncAppLanguage(memberId)` in `lib/app-language.ts`,
  called from `SessionProvider` in ONE effect keyed on `session?.memberId` (covers sign-in AND start with a stored session), and from
  ONE new app-level `AppState` → `active` listener (⛔ app-level one exists today — F24; the four screen-scoped ones are untouched):
  (1) a pending change for THIS member, or made before sign-in (`memberId: null`) in THIS app process ⇒ `PUT` it (⭐ a null pending
  from an EARLIER process is dropped, ⛔ PUT — else a login-screen choice would be recorded for whoever signs in next, however much
  later, who did ⛔ choose it — I1; the screen language it set stays via `app-language.v1`); on 2xx clear pending and adopt the
  response; on failure keep pending (retried next start/foreground) — ⛔ banner outside the screen; a pending change tagged with
  ANOTHER member ⇒ dropped (a shared phone); (2) else `GET` ⇒ LS4. Network failure ⇒ silent, ⛔ retry loop. Every call bounded by
  `withTimeout`. ⚠ RACES, both closed: (i) after EVERY await, re-read a choice counter that `chooseLanguage` bumps (or `pending`) and
  DROP the result if it moved — else a slow GET resolving after the member switched puts the old language back; and each sync carries
  its `memberId` — DROP the result if the current session's differs (an account switch mid-sync); (ii) ONE in-flight PUT
  (single-flight in `lib/app-language.ts`) shared by the screen and the sync — else a foreground sync during the screen's PUT sends a
  second one. ⚠ Single-flight is SERIAL, ⛔ deduping: a choice made during an in-flight PUT is sent AFTER it (en then hi mid-PUT ⇒ two
  PUTs, in that order); on 2xx clear `pending` ONLY if it still equals the PUT's locale (compare-and-clear), and adopt the response only
  if the choice counter is unchanged — else the en PUT's 2xx would clear the hi pending and flip the screen back to English.
  *Cost:* a change made on phone A and another on phone B — the server keeps the LATEST `PUT`; each phone adopts the server's
  value at its next sync (last-writer-wins, recorded). ⚠ Recorded edges: a server choice adopted for member A is written to
  `app-language.v1`, so member B (who never chose) then sees A's language on that phone — the phone-setting qualifier of I2; B's server
  record stays NULL and B's texts stay in B's Pariwar default; and B cannot record the language already shown without switching away
  and back (I1: a PUT only on a change from the shown language) — recorded, ⛔ fixed. ⚠ Ravi-mode: the `(claim)` flow runs in the
  DECEASED's session on the deceased's phone (`(claim)/index.tsx:3` *"Ravi is on the deceased's phone"*; `claims.contact.handlers.ts:218`
  `requireDeceasedMemberId`; the Nominee Console `app/(nominee)/` is ALSO in the member app) ⇒ the claim flow opens in the deceased's
  language (their phone / server choice), and a switch made from the home tab in that session PUTs onto the deceased's row — a record
  the member did ⛔ make (I1 in letter). ⭐ Accepted and recorded: ⛔ sender reads a deceased member's choice (the resolver is per
  RECIPIENT; confirm at Task 0.1 that `peerMeshEligibleMemberSql` / the reminder never select the deceased); ⛔ client-side suppression
  (the app has ⛔ deceased signal).
- **LS6 — Where the control lives.** ⭐ **(a)** BOTH: a new screen `app/(settings)/language.tsx` reached by a new
  `components/settings/LanguageSettingsEntry.tsx` on the home tab (placed directly above `<NotificationSettingsEntry />`, same
  understated button shape), AND a one-line switch at the foot of `app/(auth)/login.tsx`. **(b)** the screen only. *Cost (b):* F5 — an
  English-reading member gets login and the whole signup wizard in Hindi; FR-68's "profile" does ⛔ exist (F4) either way.
- **LS7 — The words that let someone FIND the switch.** ⭐ The two option names are endonyms in BOTH catalogs — `"हिन्दी"` and
  `"English"` (F17's public-site precedent); the login switch shows only the OTHER language's endonym (`English` on a Hindi screen,
  `हिन्दी` on an English one); the home entry label is the bilingual `"भाषा / Language"` in BOTH catalogs — ⚠ a DEPARTURE from UX
  `:554` (which lists *"mixed scripts"* as an anti-pattern outright), argued under `:1126` (bilingual section headers on *"mixed-register
  surfaces … where the surface genuinely hosts both registers"* — the entry is the one place a reader of EITHER language must find),
  both scripts visually balanced (`:718`); recorded in the author-commit. ⚠ `:1126` sits under "Numeral handling" — the argument is
  by ANALOGY, and the next line `:1127` reads *"Never mixed at the same hierarchy level within a single element — a single row, a
  single label, a single stat-value uses one numeral system, not both"* (for numerals) — the author-commit records both. (UX Pattern 12's *"never both at once, never a toggle"*
  (`:2611`) governs per-Pariwar custom-field labels only.) The endonyms are names, ⛔ labels.
  *Alternative:* the entry label in the current language only (a member who cannot read Hindi cannot find it).
- **LS8 — The one read.** ⭐ `resolvePeerRequestLocale(db, { pariwarId, memberId })` ⇒ `{ locale, source: 'member_choice' | 'pariwar_default', pariwarDefaultLocale }`
  (v1.6: the default too — the same query; the reminder begin needs it for `-385`'s fallback rule)
  — ONE query: the passport row LEFT JOIN the member's `preferred_locale` ON `m.pariwar_id = ${pariwarId} AND m.member_id = ${memberId}`
  EXPLICITLY (the jobs pool is BYPASSRLS — RLS does ⛔ protect it, F23); a non-NULL choice ⇒ `member_choice`; a NULL choice ⇒ the passport
  ⇒ `pariwar_default`; a passport row with ⛔ member row THROWS (a data fault — ⛔ a silent `pariwar_default`); ⛔ passport ⇒
  `PeerRequestLocaleMissingError`. `PeerRequestLocale['source']` widens; `PEER_MESH_LOCALE_SOURCES = ['pariwar_default', 'member_choice']`.
  Still the ONE function (6.27c Dev Notes `:731`: *"keep it a single function"*; R10 / 6.31 WR14 name it the one read). A Pariwar-only helper for the config checks
  (`resolvePariwarDefaultLocale(db, pariwarId)`, the old body) is ALLOWED. In the text sender it is called in `beginPeerMeshRequest`
  AFTER step ③ (`readPeerMeshRequestEligibility` proves the member row is in this Pariwar) and passed into `beginFresh`. ⚠ A
  `PeerRequestLocaleMissingError` thrown INSIDE a begin is ⛔ a hold (the child catches it only at config, `:217-222`) — a retried
  throw; unreachable in practice (the config check reads the passport first; the passport has ⛔ DELETE grant).
- **LS9 — When the language of a text / reminder is fixed.** ⭐ TEXT: resolved at the FRESH begin (`beginFresh`, inside the claiming
  transaction, for `ping.member_id`), written to the row as `locale` + `locale_source` (W8 — the literal goes); a RE-CLAIM reuses the
  row's recorded `locale` (I5) — `beginPeerMeshRequest` returns `locale` in its `begun` result for BOTH paths and the child renders each
  ping with ITS locale (⛔ the Pariwar's). REMINDER: resolved per recipient INSIDE the reminder's begin, after the lock reads
  `ping.member_id` (F13 — the child does ⛔ know the recipient earlier): the config carries BOTH template names, the begin picks THAT
  locale's name — or, per (b′), the Pariwar default's — and records `template_name` / `locale` / `locale_source`, and returns them in `begun` for the send (WR14 — unchanged
  rule, now per member). ⇒ a NEW migration (slug `member-preferred-locale`): the two `members` columns (LS1 (a)); `ALTER TABLE
  claim_peer_mesh_pings ADD COLUMN locale text` + CHECK `claim_peer_mesh_pings_locale_check` (`locale IS NULL OR locale IN ('hi','en')`,
  mirroring 0171:74) ONLY. ⚠ ⛔ a `(send_outcome IS NULL) = (locale IS NULL)` CHECK: `skipFresh` finishes a ping `skipped_superseded` /
  `no_target` WITHOUT a begin, so a finished row legitimately has ⛔ locale. A re-claimed row with `locale IS NULL` was begun by
  pre-6.35 code, which SENT the Pariwar's default ⇒ the re-claim writes `locale = resolvePariwarDefaultLocale(…)` and keeps
  `locale_source = 'pariwar_default'` — ⛔ the member's choice (I5; dev/test data only — ⛔ production, S1). Add `locale` to the column
  GRANT (`GRANT UPDATE ("locale")`) and to `claim_peer_mesh_pings_guard_delivery()`'s `delivery_cols`, plus a written-once arm
  (`IF OLD.locale IS NOT NULL AND NEW.locale IS DISTINCT FROM OLD.locale THEN RAISE …` — link_code's shape, 0166 `:101-104`) — `CREATE OR
  REPLACE` from 0166's FULL body (F15); DROP + re-ADD both `locale_source` CHECKs under their SAME names — pings `IN
  ('pariwar_default','member_choice')`, reminders `IN ('pariwar_default','member_choice','pariwar_fallback')` (the third value is
  `-385`'s fallback, LS10 (b′) — reminders only).
- **LS10 — A recipient whose language's template is unavailable. ⭐ (b) for the TEXT, with the T-states below as its COMPLETE definition
  (BigDev's direction; §0 G6 MATCH on exactly this definition — a change to the table re-opens the gate); the REMINDER's fallback is
  (b′) — PQ1, the Panel's: ⭐ RULED A (`-385`) — the Pariwar's language.** The facts every option rests on: (1) 6.27c's DLT id and pre-flight are GLOBAL per locale
  (F12), and 6.37 AC9 (a) deliberately checks only the Pariwar's OWN locale; (2) 6.31's template names are PER Pariwar (F13); (3) a
  hold DROPS as well as delays — past the claim's answer window an unsent text stays unsent (`not_sent`, F12), past +72 h an un-begun
  reminder gets ⛔ row (F13); (4) `-303`'s not-covered list: *"if Meta refuses, the reminder does ⛔ not go, and the text still does"*,
  which WR6 applies per locale — BUILT as a hold of a Pariwar ON the refused locale (6.31 `:384-386`) — and Row 35 (b) lets ONE locale
  close as "Meta refuses", a fact the code cannot see (only an unset key, F13); the DLT sheet lists templates 13 (hi) and 14 (en) — the neighbours'
  texts (`docs/launch-gate-inventory/dlt-template-requests-6-19.md`).
  *Alternative* **(a)** both senders' Pariwar config requires BOTH locales — 6.27c: each of `PEER_MESH_REQUEST_SMS_LOCALES` has its DLT id and passes
  pre-flight, else `config:dlt_template_id_missing:<locale>` (first missing, `['hi','en']` order); 6.31: both names, else
  `config:wa_template_missing:<locale>`; the config result carries ⛔ locale. *Cost:* TEXT — ONE missing or pre-flight-failing `en` DLT
  template holds EVERY Pariwar's neighbour texts, all-Hindi Pariwars and Hindi recipients included; a hold past the window ⇒ those
  five are ⛔ texted; REVERSES 6.37 AC9 (a) (flip the live leg `:954` and a dated note on 6.37 AC9 (a)). REMINDER — a Pariwar whose
  `en` template is refused or unset ⇒ ⛔ reminder to ANY recipient, Hindi ones included (beyond WR6 as built, which holds only a
  Pariwar ON the refused locale) ⇒ narrows `-303` Q1 A for Hindi recipients ⇒ the Panel's (§0 G10) — a routing note is owed before Task 3.
  ⭐ **(b)** per RECIPIENT. A recipient's EFFECTIVE locale is LS8's (choice, else the Pariwar's default). Each (channel, locale) — and
  for the reminder (channel, Pariwar, locale) — is in exactly ONE of these states, computed ONCE per sweep run:

  | State | TEXT (DLT id + pre-flight; GLOBAL per locale, F12) | REMINDER (template name; PER Pariwar per locale, F13) | What happens |
  |---|---|---|---|
  | **T0 usable** | id set AND pre-flight passes (the existing memo) | name set | sent as today, in that locale |
  | **T1 unset** | `sms.dlt.template_id.peer_mesh.request.<l>` missing ⇒ gap `config:dlt_template_id_missing:<l>` (unreachable in production — `-349` decision 1) | `wa.template.peer_mesh.reminder.<l>.<pariwarId>` missing ⇒ gap `config:wa_template_missing:<l>` | that locale's recipients WAIT (below) — the REMINDER per (b′) |
  | **T1′ invalid name** | — | a name set but failing `TEMPLATE_NAME_FORM` ⇒ `config:wa_template_invalid:<l>` (`:206`) | as T1 |
  | **T2 pre-flight failed** | id set, the pre-flight returns its existing gap (a fault, or a transient with ⛔ usable pass — today's rule, `:228-232`) | — (⛔ pre-flight for WhatsApp) | that locale's recipients WAIT |
  | **T3 refused** | DLT-REJECTED: ⛔ representable in code (the id is simply never provisioned ⇒ looks like T1) — ⚠ ⛔ allowed to persist: S4 STOPS the story / go-live if one is recorded (G-gate re-opens) | Meta refuses (Row 35 (b)): ⭐ MERGED with T1 — the name stays UNSET; ⛔ sentinel value, ⛔ new config key, ⛔ new outcome | as T1 — the REMINDER per (b′) A (`-385`): a chooser whose Pariwar's language is T0 ⇒ the Pariwar's language (`pariwar_fallback`); ⛔ usable template at all ⇒ wait; past +72 h ⛔ row (or `skipped_late`, F26) — ⛔ reminder, their text unaffected. The REASON lives in the Row 35 (b) Decision, ⛔ a row |
  | **TX read fault** | TEXT: the DLT keys are GLOBAL, so a fault on locale l's key ⇒ l is treated as UNUSABLE (WAIT; alarm `config:secret_manager`); a Pariwar is HELD on TX only when its OWN default locale's key faults — else a fault on the `en` key would hold every all-Hindi Pariwar, what 6.37 AC9 (a) avoided (`:224-229`) | REMINDER: `config:wa_template_unreadable` (`:203`) on the Pariwar DEFAULT's key ⇒ that Pariwar HELD exactly as today; on the OTHER locale's key ⇒ that locale is treated as T1 (its choosers fall back by `-385`; its alarm names `config:wa_template_unreadable`) — BigDev 2026-10-23 *"Treat it as unset"*, the author's reading, recorded in Task 0.3 (today the config reads only the default's key, `:199-203`, so a fault on the other key never held anyone) | the TEXT and REMINDER rows as stated; a fault on the DEFAULT's key a NON-template gap ⇒ the Pariwar is HELD exactly as today (park, ⛔ give-up, alarm) |

  Other NON-template gaps (`config:counsel_basis_pending`, `config:locale_unavailable`, the helpline, …) hold the Pariwar exactly as
  today. **Both locales unusable (T1–T3) for a channel** ⇒ that channel holds the Pariwar as today (gap = the Pariwar default's locale's
  gap — today's alarm text).
  **WAIT, defined** — ⛔ a new outcome, ⛔ a new detail value, ⛔ a new column write (the text park's EXISTING marker — `claimed_by_job`,
  `parked_at`, F25 — is the only write; so ⛔ collision with 6-36d's detail vocabulary):
  - TEXT, un-begun ping: the due-claims listing (`listDuePeerMeshRequestClaims`) gains an input `unusableLocales` (the global T1/T2/TX-per-locale
    set, `sql.param`) and EXCLUDES a NULL ping whose effective locale is in it — written NULL-SAFE: `LEFT JOIN members m ON m.pariwar_id =
    pr_p.pariwar_id AND m.member_id = pr_p.member_id` + `LEFT JOIN pariwar_passport pp ON pp.pariwar_id = pr_p.pariwar_id` (explicit
    predicates — F23) and `(COALESCE(m.preferred_locale, pp.locale_default) = ANY(${sql.param(unusable)}::text[])) IS NOT TRUE` — else a
    ping with ⛔ passport and ⛔ choice (NULL) silently drops out and its claim never reaches the `config:locale_unavailable` hold or its
    alarm ⇒ a claim whose only due pings wait is ⛔ listed, ⛔ enqueued, ⛔ counted against `maxClaims`, ⛔ decrypted (closes the
    starvation of `:386-389`). The ping stays NULL; past the window it is `not_sent` (F12, G6).
  - TEXT, the begin (race: a state changed after the listing): the child computes its OWN `unusableLocales` from its race-guard
    `pariwarConfig` (`:581` — the child is a separate job, F25); `beginPeerMeshRequest` checks BOTH paths AFTER ①–③ (6-36d's nominee
    re-check sits in ③) and BEFORE ④: fresh, the resolved locale (LS8); re-claim, the row's `locale` (SELECT it in `lockClaimThenPing`)
    or the Pariwar default if NULL — unusable ⇒ `{ kind: 'waiting_template', locale }` with ⛔ write (a parked row stays parked).
    `PeerMeshRequestChildCounts` gains `waiting`; the child has ⛔ catch-all (`:624-650`), so tsc forces the branch.
  - TEXT, an `attempting` ping whose RECORDED locale (`COALESCE(p.locale, pp.locale_default)` — a pre-6.35 row was sent in the default)
    is unusable: (1) the sweep's park step parks it in ANY stalled scope, held or not — `parkHeldPeerMeshRequests` gains `unusableLocales`
    and parks `p.pariwar_id = ANY(held) OR COALESCE(p.locale, pp.locale_default) = ANY(unusable)` (explicit `pp.pariwar_id = p.pariwar_id`;
    amend its DELIBERATE block); the give-up already credits parked time (`:837-839`); (2) `listDuePeerMeshRequestClaims`' `attempting`
    arm excludes it while the claim is IN the window (`… AND ((COALESCE(…) = ANY(unusable)) IS NOT TRUE OR NOT ${answerWindowSql('pr_c')})`)
    — a parked row is re-claimed at once by any begin (F25), so the park ALONE does ⛔ stop a re-send; past the window it is listed and ①
    finishes it `error` / `recheck:claim_decided` exactly as a held Pariwar's parked row is today; (3) the begin check above. ⛔ Re-sent
    in another language (I5), ⛔ given up while parked.
  - REMINDER — first the fallback (`-385`, (b′) A): a recipient whose effective locale is unusable for ITS Pariwar but who CHOSE it
    (`member_choice`) while the Pariwar default's template is T0 is ⛔ waiting — they are sent with the default's template
    (`pariwar_fallback`). A reminder WAITS only when it has ⛔ usable template at all: its effective locale IS the Pariwar default's (a
    non-chooser, or a chooser of the default) and that one is unusable while the other is usable (both unusable ⇒ the Pariwar held).
  - REMINDER, un-begun: the SWEEP's listing `listDuePeerMeshWaReminderPings` (F26) gains `LEFT JOIN members m ON m.pariwar_id =
    wr_p.pariwar_id AND m.member_id = wr_p.member_id` + `LEFT JOIN pariwar_passport pp ON pp.pariwar_id = wr_p.pariwar_id` and returns
    `effectiveLocale`, `localeSource` and `pariwarDefaultLocale` (`pp.locale_default` — NULL ⇒ the ping still reaches the
    `config:locale_unavailable` hold; amend its "ids only" DELIBERATE block); the rule, per ping — ⭐ FALLBACK ⇔ effective ≠ default AND
    the default's template is T0; WAIT ⇔ effective = default AND its template is unusable AND the other's is T0; both unusable ⇒ the
    Pariwar held (`member_choice` alone cannot tell a chooser OF the default, who waits, from a chooser of the other, who falls back); for a ping with ⛔ usable template (above) the sweep does
    `resumeAt = dueCursor; continue` and ⛔ adds the claim to `seenClaims` — else a sendable sibling ping of the same claim is skipped;
    the child's begin re-checks and returns `waiting_template` with ⛔ row (the child counts it explicitly — its catch-all would file it
    under `passed`, `:588`). Past +72 h it is never due again ⇒ ⛔ row, or `skipped_late` if a sibling's child begins it first (F26).
  - REMINDER, a re-claim (marker NULL — nothing sent) whose newly resolved locale has ⛔ usable template (a chooser falls back, as above): the begin returns
    `waiting_template` with ⛔ write — the row keeps its holder (`sweep:held` or a lapsed lease), the sweep skips it by its effective
    locale each tick, and past +72 h `markLatePeerMeshWaReminders` (`:774-797`, every un-marked `attempting` row) finishes it
    `skipped_late`. ⛔ `parkPeerMeshWaReminder` (it needs the marker SET, F26) and ⛔ a `config:*` detail (the grammar rejects it).
  - A member who changes their choice while waiting: the next sweep resolves afresh (the text's locale is fixed only at its FRESH begin
    — LS9), so a switch to a usable locale sends.
  - ALARM (I7 — ids only): ONE end-of-run alarm per channel listing each unusable locale with its state code — the existing end-of-run
    alarm's shape (`claim-peer-mesh-requests.ts:431-437`); the REMINDER's carries the count of waiting pings per Pariwar (evaluated per ping BEFORE the `seenClaims` short-circuit,
    `claim-peer-mesh-wa-reminders.ts:405` — a count of pings; the child's `waiting` / `fallback` counts are its pg-boss output only) in a
    NEW alarm line beside the sweep's HELD loop (`:445-451` — the reminder sweep has ⛔ per-locale end-of-run alarm today); the TEXT's count needs its own read — `countWaitingPeerMeshRequestPings(q, { now, unusableLocales, allow })` (ids and
    counts only, a DELIBERATE block), because the listing excludes waiting pings.
  ⇒ 6.37 AC9 (a)'s property is KEPT and EXTENDED: a broken `en` template holds ⛔ Hindi recipient, and a broken `hi` template holds ⛔
  English-chooser — the `:954` leg's second half (*"and holds the English one"*) FLIPS from HELD to WAITING (F14, precisely); that an
  `en` Pariwar's Hindi-chooser is then sent is a NEW leg (AC4 (iv′)).
  *Residual, recorded ⛔ built:* P1's scope-wide STOP (`:785-788`) and P13's pre-flight `break` (`:751-754`) stay claim-wide, so a
  SEND-time `dlt_template_not_approved` on `en` stops that run's Hindi pings of the same claim too.
  *Cost (b):* the listing filters (text SQL, reminder sweep-side), a `waiting_template` begin result in both domains, the park's locale
  arm and the listing's `attempting` arm, the count read, the alarm; S6 STOPS the story if the park or a listing cannot take the locale
  filter without a new column or detail value.
  **(b′) — the REMINDER, PQ1 — ⭐ RULED A (`2026-10-23-385`, Trustee-ratified).** A recipient whose OWN chosen locale's reminder
  template is T1 / T1′ / T3 while the PARIWAR's default locale's is T0: the begin picks the Pariwar default locale's template name and
  records `template_name` / `locale` of THAT locale and `locale_source = 'pariwar_fallback'` (a third value on the REMINDERS'
  `locale_source` CHECK only — the pings' CHECK stays two values; minted in this story's migration, the ruling being in before Task
  1.1); the end-of-run alarm counts the fallbacks per Pariwar and locale (ids only). Both locales unusable ⇒ the Pariwar held as today.
  A non-chooser is untouched (their locale IS the default — `-385` not-covered). (Option B — ⛔ reminder — was ⛔ chosen; ⛔ built.) ⚠ Under A the reminder (Hindi) and the text (English) differ in language — `-303` Q1 A's *"with the same
  words"* then holds in substance only (`-380` decision 8 already reads it so — the reminder's name and substance, ⛔ every character)
  — the PQ1 note's option A says so.
  **(c) ⛔ OFFERED for the TEXT — the Panel's:** send the Pariwar's language when the chosen one has ⛔ template (narrows `-303`'s rider,
  I4) — ⛔ needed: the text's wait is brief (T1 unreachable in production, T2 transient).
- **LS11 — Scope.** ⭐ ONLY: the app's own language, the server record, and the two ratified consumers (the neighbours' text and its
  reminder). Every F21 sender keeps its language; ONE deferred-work item *"Senders that ignore the member's chosen language (row 6-35)"*
  lists them with ⭐ Trigger: *"a story or ruling that sets a language rule for that message"* (⚠ suspicion (a)/(b) and the claim-contact
  family may text a non-member — a member choice may ⛔ apply; the claim-contact family is LS15's). The same item lists F22's
  non-switching surfaces (tab titles, the hard-coded Hindi Shradhanjali tab) and PM22's display half (an `en` Pariwar's non-chooser
  gets English texts that open Hindi screens — LS4 (b)). Stale *"always Hindi"* comments in CODE (F20 — three
  lines) are corrected in place (comments only).
- **LS12 — The data export.** ⭐ **(a)** the profile section gains `preferredLanguage: 'hi'|'en'|null` — `ProfileSection`
  (`data-export.ts:124-239`), the `.select()` + `profile` object (`assemble.ts:176-180`, `:414-418`), the jobs strict parse
  (`apps/jobs/src/data-export.ts:68`), tests `data-export.spec.ts` + `apps/jobs/tests/data-export.test.ts` (F19) — a choice the Trust keeps
  about the member is the member's data. **(b)** leave the export unchanged (safe — the `.select()` reads every column, but the
  hand-built `profile` object never copies it); a deferred item.
- **LS13 — What the screen tells the member.** ⭐ Title *"Language / भाषा"*-style per locale (`language.title`), one line:
  *"Choose the language for this app. Some messages from the Trust (SMS and WhatsApp) will also come in this language."* (true, with one exception the screen does ⛔
  name — `-385`'s reminder fallback sends a WhatsApp reminder in the Pariwar's language when the chosen one cannot be sent; mostly true: the
  neighbours' text and its WhatsApp reminder; *"some"* stays true as more follow). ⛔ list of which messages; ⛔ promise about OTP.
  *Alternative:* say nothing about messages (then the member is ⛔ told why the Trust records it).
- **LS14 — Go-live.** ⭐ **(a)** A new roster row keyed `language-switch-hindi-reviewed` (the new Hindi strings: entry, title, intro,
  error; the endonyms need ⛔ review) — a go-live gate, ⛔ a merge fence ([[project_not_in_production_merge_is_not_golive]]). **(b)**
  BigDev approves the four Hindi strings at Task 0.2, ⛔ roster row — the `-382` KB6 / 6.18 / 3.3b precedent (labels and messages,
  ⛔ a consent flow). Either way ⛔ new row for the English strings (English is the authoring language; the existing English catalog
  becomes visible — F20, as `-382` KB6 already records — ⛔ gated).
- **LS15 — The claim-contact family's language (C-family, F21).** The filer's screen language becomes the claim's `contact_locale`
  (`(claim)/contact.tsx:184`), which drives the ladder SMS + WhatsApp step, the certificate / correction reminders, closure and suspicion
  (c), and an `en` agreement skips the `hindi_not_reviewed` WhatsApp-basis gate. ⚠ The SAME body `locale` is the agreement evidence:
  `claims.contact.handlers.ts:132-133` (`checkboxTextShown: resolveClaimContactAgreementCopy(ctx.locale), locale: ctx.locale`), and the
  Hindi check reads *"the AGREEMENT's locale (the words the claimant saw)"* (`claim-contact-whatsapp-basis.ts:13-14`) ⇒ ⛔ pin the
  submitted `locale` alone — that would record an agreement to Hindi words the member never saw.
  ⭐ **(b) — the INTERIM behaviour, CONDITIONAL on AC15's agreement-language render test passing.** Render `(claim)/contact.tsx` in
  Hindi regardless of the app language — the submitted `locale` stays the SHOWN one (`'hi'`) — until a claimant-language rule exists
  (the route's default export wraps the screen in `<LocaleProvider initialLocale="hi">`, so the screen's own `useLocale()` (`:91`) and
  `useClaimT()` (`lib/claim-i18n.ts:11-13`, `useT()` + the `claim` namespace) both read the NESTED provider; a dated comment; the claimant
  is often a non-member who reads Hindi, and the Hindi-review gate keeps its reach) — exactly today's behaviour (G9); the LS11 deferred
  item names the trigger. `(claim)/consent.tsx` is ⛔ pinned: its evidence is resolved from the SHOWN locale in both languages
  (`claims.dpdpa-consent.handlers.ts:210-211` — `checkboxTextShown: resolveDpdpaConsentCopy(consentType, body.locale)`) and it drives ⛔
  sender. ⚠ Cost: the claim flow becomes mixed-language — consent and the other steps in the app's (in Ravi-mode the deceased's, LS5)
  language, contact in Hindi. The proof that the recorded agreement is the one SHOWN: AC15's render leg (screen text = the `hi`
  `claim.json` `contact.agreement`, request `locale: 'hi'`) + the EXISTING lockstep `apps/api/tests/unit/claim-contact-copy.test.ts:23-26`
  (`claim.json` `contact.agreement` ≡ `resolveClaimContactAgreementCopy(locale)` for both locales). ⚠ If the render leg CANNOT prove it
  (the nested provider does ⛔ reach every string of the screen, the header, or the submit) ⇒ STOP and tell BigDev — ⛔ silent fall
  back to (b′) or (a). **(b′)** split the body into `agreementLocale` (shown) and `contactLocale` (pinned
  `'hi'`) — a contract + handler change. **(a)** accept and record it (correct in one sense: the filer saw English) — ⚠ then the
  `hindi_not_reviewed` skip for `en` agreements and English texts to a Hindi-reading claimant become live with ⛔ ruling; recorded in
  the Task 0.3 entry. ⚠ None is a language rule for the claimant — that is a later story's or the Panel's.

## Acceptance Criteria

1. **AC1 — The server record (LS1).** A forward migration (slug `member-preferred-locale`, next free number, journal `when` = previous
   + 86400001) adds `members.preferred_locale locale NULL` and `members.preferred_locale_set_at timestamptz NULL`, ⛔ default, ⛔ backfill;
   idempotent (`psql -f` twice succeeds); `db:migrate` + `db:check` green on :5433. The Drizzle schema (`schema/members.ts`) gains both
   columns with a dated comment under the *"anchor"* note. ⛔ Writer other than AC2's PUT (grep `preferred_locale` / `preferredLocale`
   writes ⇒ the domain setter only).
2. **AC2 — The API (LS2).** `GET` / `PUT /api/v1/member/language` as LS2, both tagged member-session (the login-wall spec walks them),
   contracts lockstep-tested (`packages/contracts/tests/member-language.test.ts`: `.strict()` rejects an extra key; `locale` rejects
   `'fr'`), OpenAPI emitted and committed. Integration legs on :5433: GET with ⛔ choice ⇒ `{ chosenLocale: null, pariwarDefaultLocale: 'hi' }`;
   PUT `en` ⇒ `{ chosenLocale: 'en', … }`, the row's `preferred_locale = 'en'` and `preferred_locale_set_at` set; a second identical PUT
   ⇒ 200, ⛔ second audit line and `set_at` unchanged; PUT `hi` after ⇒ changes and audits once; ⛔ token ⇒ 401; a member of Pariwar B
   ⛔ reaches Pariwar A's row (RLS); a body `{ locale: 'fr' }` or an extra key ⇒ 400; the audit context carries ONLY `{ locale }` (I7 —
   `t.auditSink.ofType('member.language_changed').at(-1).context` toEqual `{ locale: 'en' }`; the in-memory sink stores the context RAW,
   `life-events/workplace.spec.ts:282` — the hash happens in `audit-log-sink.ts:119`); the audit is emitted AFTER the commit (a forced
   commit failure ⇒ ⛔ audit line — the `apps/api/tests/integration/channel-webhooks-msg91.spec.ts:346-354` precedent wraps the client so
   `COMMIT` rejects; `closeScopeTx` COMMITs, rethrows a failed COMMIT and makes a second close a no-op, `scope-tx.ts:68-80`, so the
   explicit close then the `finally` close is safe).
3. **AC3 — The one read + the record of why (LS8, LS9; closes W8).** `resolvePeerRequestLocale(db, { pariwarId, memberId })` per LS8;
   legs: NULL choice ⇒ the passport + `pariwar_default`; `en` choice in an `hi` Pariwar ⇒ `en` + `member_choice`; a member of ANOTHER
   Pariwar id (an `en` choice there) ⇒ throws — ⛔ their choice, ⛔ a silent `pariwar_default` (scoped; this leg runs on the superuser /
   jobs handle, ⛔ under `SET LOCAL ROLE twt_app`, where RLS would mask a missing predicate); ⛔ passport ⇒ `PeerRequestLocaleMissingError`. The
   migration widens both `locale_source` CHECKs (same names) and adds the pings `locale` column per LS9 (incl. the freeze array, the
   written-once arm and GRANT). `beginFresh` writes `locale` + `locale_source` FROM the read (⛔ literal); a re-claim keeps them (leg:
   change the member's choice between attempt 1 and the re-claim ⇒ the re-claim renders the FIRST locale; a re-claim of a row with
   `locale IS NULL` writes the PARIWAR DEFAULT and `pariwar_default` even when the member has since chosen `en`; a `skipped_superseded`
   row with ⛔ locale is accepted by the CHECK). F14's four pins FLIP deliberately, each with a dated comment (the type pin at
   `claim-peer-mesh-wa-reminders.test.ts:73-77` pins `PeerRequestLocale['source']` — now `'pariwar_default' | 'member_choice'`, the
   resolver never returns the fallback — PLUS a new leg pinning `PeerMeshWaReminderLocaleSource` / `PEER_MESH_WA_REMINDER_LOCALE_SOURCES`
   to all three, LOCKSTEP with the reminders' CHECK; the two specs now ACCEPT `'member_choice'` — the reminders spec also
   `'pariwar_fallback'`, the pings spec still REJECTS it — and both still reject `'device'`); F14's broken callers
   (`peer-mesh-request.spec.ts:558-559`) move to the new signature. DB legs: a finished row's `locale` cannot be rewritten (the freeze),
   and an `attempting` row's non-NULL `locale` cannot be changed (the written-once arm — I5's backstop); the R15 attempting-row checks
   of 0166 still fire (the full body was copied).
4. **AC4 — The neighbours' text per recipient (6.27c; LS9, LS10 (b)).** `pariwarConfig` resolves both locales' T-state; ⛔ `locale` in
   `PariwarSendConfig`; the child renders each ping with its begun `locale`. Legs in `apps/jobs/tests/` (the existing 6.27c suite's
   fixtures): (i) two neighbours in one claim, one with `en` chosen and one with ⛔ choice in an `hi` Pariwar ⇒ two sends, the
   template/words of `en` and of `hi` respectively, rows `member_choice`/`en` and `pariwar_default`/`hi` — RED against today's code
   (which sends Hindi to both); (ii) T1 `en` (id unset) ⇒ the English-chooser's ping stays NULL (⛔ begun, ⛔ Hindi text — I4) while the
   Hindi neighbour's is sent, and an all-Hindi Pariwar is ⛔ held; (iii) T2 `en` (pre-flight fault) ⇒ the same as (ii); (iv) T1 `hi` in an
   `en` Pariwar ⇒ its English recipients are texted, its Hindi recipients wait; (iv′) `en` broken in an `en` Pariwar (`:954`'s scenario)
   ⇒ `heldForConfig: 0`, `enqueued: 0` for an all-default Pariwar (the row WAITS, ⛔ held — the leg's second half flips, dated), and with
   one Hindi-chooser added that one is sent; (v) BOTH locales unusable ⇒ the Pariwar HELD exactly as today (park, alarm; the gap of its
   default locale); (vi) TX on the Pariwar's OWN default locale's key ⇒ held as today; TX on the OTHER locale's key ⇒ that locale waits,
   the Pariwar is ⛔ held; (vii) a claim whose ONLY due pings wait is ⛔ listed (⛔ enqueued, ⛔ decrypted) — the listing leg on :5433,
   plus a ping with ⛔ passport and ⛔ choice still listed (NULL-safe); (viii) the begin race — the child's own `unusableLocales` contains
   the recipient's locale ⇒ `waiting_template`, ⛔ write, counted `waiting`; (ix) an `attempting` ping past lease whose recorded `locale`
   is unusable, in an UN-held Pariwar ⇒ PARKED, ⛔ listed while in the window, ⛔ re-claimed while unusable, ⛔ re-sent in the other
   language, ⛔ given up; past the window it is listed and finished `error` (`recheck:claim_decided`); (x) the waiting member switches to a
   usable locale ⇒ the next sweep sends in it; (xi) the end-of-run alarm carries the locale, state code and the waiting count (the count
   read) — ids only.
5. **AC5 — The reminder per recipient (6.31; LS9, LS10 (b)).** `peerMeshWaReminderConfig` carries both template names (`string | null`);
   the locale is resolved per reminder recipient INSIDE the begin (from `ping.member_id`) and recorded (`locale`, `locale_source`,
   `template_name` of THAT locale); the send uses `begun.*`. Legs: an `en`-choosing neighbour gets the `en` template and `member_choice`;
   the member changes their choice after the text ⇒ the reminder goes in the NEW choice (WR14's "read again" — ⛔ copied from the ping);
   T1 / T1′ / T3 `en` (name unset or invalid — Meta refuses is the same state) in an `hi` Pariwar (`-385`, (b′) A) ⇒ the English-chooser's
   reminder goes with the `hi` template, `locale = 'hi'`, `locale_source = 'pariwar_fallback'`, and the alarm counts the fallback — RED
   against a build that waits; T1 `hi` in an `hi` Pariwar with `en` usable ⇒ the English-chooser is sent in `en` (`member_choice`) while
   a non-chooser's reminder is ⛔ enqueued and ⛔ begun (⛔ usable template — WAIT), and a sendable SIBLING ping of the same claim is still
   enqueued (`seenClaims` ⛔ marked by the waiting one); past +72 h the waiting one has ⛔ row, or `skipped_late`; BOTH names unset ⇒ the
   Pariwar held as today; TX `config:wa_template_unreadable` ⇒ held as today; a re-claim (`send_started_at IS NULL`) whose new locale is
   unusable ⇒ a chooser of a language other than the Pariwar's falls back (`pariwar_fallback`); a chooser of the default or a
   non-chooser ⇒ `waiting_template`, ⛔ write, and past +72 h
   `markLatePeerMeshWaReminders` finishes it `skipped_late`; the pings' CHECK still REJECTS `'pariwar_fallback'`.
6. **AC6 — The phone remembers (LS3).** `lib/app-language.ts` exports `readStoredLanguage`, `chooseLanguage(locale, memberId|null)`,
   `syncAppLanguage(memberId, { setLocale, client?, storage? })` (the setter passed in — the module cannot call the hook; `client`
   defaults to `memberAuth`, `storage` to `mmkvStorage`); `_layout.tsx` mounts `LocaleProvider` with the stored language. Unit legs (in-memory storage): ⛔ stored
   ⇒ `undefined` (Hindi); a stored `en` ⇒ the provider starts `en`; a choice survives a simulated restart. ALL THREE member-data clear
   paths (`signOut` and the two refresh paths, F24) leave both keys — a source-scan leg (the `known-people-session.test.ts:34-63` shape;
   `signOut` cannot be unit-called); the existing session-context source-pin tests (`link-target.test.ts:177`) re-run green.
7. **AC7 — The controls (LS6, LS7, LS13).** `app/(settings)/language.tsx` (two options `accessibilityRole="radio"` +
   `accessibilityState={{ checked }}` inside an `accessibilityRole="radiogroup"` container — `(claim)/contact.tsx`'s `ChoiceRow`
   `:45-64`, `:262` — the current one checked; selecting the OTHER re-renders every `useT()` consumer at once (F22's exceptions stay)
   and calls `chooseLanguage`; selecting the current one is a no-op; header title `<Stack.Screen options={{ title: t('language.title') }} />`
   — the `notifications.tsx:208` precedent — so the header ⛔ shows the route name), `LanguageSettingsEntry` on the home tab above
   `NotificationSettingsEntry`, the login-screen switch. Render legs (real `LocaleProvider`, jsdom, the `wa-notifications-screen-render`
   scaffold — ⚠ its tamagui / RN mocks forward only `testID` and `selectable` (`:76-91`), have ⛔ `XStack`, and the container ignores
   `onPress`: add `XStack` to the mock and forward `onPress` → `onClick`, `accessibilityRole` → `role`, `accessibilityState.checked` →
   `aria-checked` (the 5.10 `selectable` precedent), proven RED by dropping each prop, or a `ChoiceRow`-shaped option is neither
   clickable nor checkable in the test): switching re-renders a `useT()` string in the other language; the PUT is called ONCE per change; a failed PUT
   keeps the new language on screen, leaves `pending`, and shows ONE `accessibilityRole="alert"` + `accessibilityLiveRegion="assertive"`
   line (`language.error_not_recorded`; + `AccessibilityInfo.announceForAccessibility` on iOS only when the line MOUNTS on the failure —
   TalkBack would speak it twice, `contact.tsx:154-157`; if it can already be showing when a second PUT fails, announce on BOTH platforms
   — 3.3c `kyc.tsx:180-186` on `main`, *"Announced on BOTH platforms: the inline alert mounted … and does ⛔ re-fire"*); the login switch writes `pending` with `memberId: null` and calls
   ⛔ API. ⛔ `[t]` dependency in any file this story adds or edits ([[project_uset_fresh_closure_memo_trap]]; existing `[t]` deps
   elsewhere are ⛔ touched).
8. **AC8 — Reconciliation (LS4, LS5).** Unit legs for `syncAppLanguage` with a mocked `memberAuth`: pending (own / null) ⇒ ONE PUT then
   cleared; pending for another member ⇒ dropped, ⛔ PUT; a `memberId: null` pending from an EARLIER app process ⇒ dropped, ⛔ PUT
   (I1); ⛔ pending + server `en` ⇒ `setLocale('en')` + stored, ⛔ PUT; ⛔ pending +
   server null + ⛔ phone choice + `pariwarDefaultLocale: 'en'` ⇒ STAYS Hindi, stores nothing, ⛔ PUT (LS4 (b) — I2's proof); GET fails ⇒
   ⛔ change, ⛔ throw;
   the member switches while a GET is pending ⇒ the GET's later result is DROPPED and the chosen language stays; a sync while the
   screen's PUT is in flight ⇒ still ONE PUT (single-flight); en then hi during the first PUT ⇒ two PUTs in that order, `pending` cleared
   after the second, the screen stays `hi` (serial, compare-and-clear); ⛔ pending + server null + phone `en` ⇒ stays `en`, stores
   nothing, ⛔ PUT (T8); server `hi` + phone `en` ⇒ `setLocale('hi')` + stored; a GET for member A resolving after the session changed
   to B ⇒ dropped.
9. **AC9 — ⛔ Never on first launch (I1).** A leg drives a fresh install (empty storage) through sign-in and one `syncAppLanguage` with
   server `chosenLocale: null` ⇒ ZERO PUT calls and ⛔ `app-language.v1` written; an API leg confirms a member who only GETs has
   `preferred_locale IS NULL`.
10. **AC10 — Copy (LS7, LS13).** New `common.json` keys (en + hi, hand-edited — ⛔ `prettier --write`, [[project_prettier_not_enforced]]):
    `language.entry`, `language.title`, `language.intro`, `language.option_hi`, `language.option_en`, `language.error_not_recorded`,
    `language.switch_hint` (+ a `$comment.language` in both, the `hi` one naming the LS14 row (or the LS14 (b) approval) — ⚠ the
    `$comment` VALUES are scanned: ⛔ microcopy vocabulary terms such as `report`, `user`; F17). Add the `language.*` keys AWAY from 3.3c's
    `kyc.*` block (rebase conflicts). A copy-key test (the `wa-notifications-copy-keys` shape) resolves every literal key of the new/edited
    files in BOTH locales through the real `t()` (pass params for any `{param}` key — `t(key, undefined)` throws on one; keys from
    `useClaimT()` resolve with `namespace: 'claim'`); the new / edited mobile files (`language.tsx`, `LanguageSettingsEntry.tsx`,
    `lib/app-language.ts`, `login.tsx`, `(claim)/contact.tsx`) enrolled in `microcopy.yaml` `code_globs` (3.3c KB8 — `login.tsx`'s
    `#C0392B` at `:64` and `contact.tsx`'s at `:361` each need a scoped `#C0392B\b` allow entry (`file:` / `pattern:` / `reason:`, the
    `relationship.tsx` shape), teeth proven); `(tabs)/index.tsx`, `_layout.tsx`, `session-context.tsx` ⛔ enrolled (mount / plumbing only
    — `(tabs)/index.tsx:91`'s comment *"contribution passbook"* would need a vocabulary allow); comments in enrolled code files are
    scanned for `report` / `passbook` / `receipt` / `invoice`. ⛔ `language.entry_hint` — the entry carries ⛔ `accessibilityHint`, by
    choice (`NotificationSettingsEntry.tsx:23` has one; the bilingual label is self-describing). The bilingual label and the endonyms
    trip ⛔ rule (⛔ script-mixing rule in microcopy; the i18n parity check flags only missing / empty values,
    `packages/i18n/scripts/lib.ts:49-54`). `pnpm i18n:check`, `pnpm microcopy:test && pnpm microcopy:check` green.
11. **AC11 — The export (LS12).** Per the LS12 answer: (a) `preferredLanguage` in `ProfileSection` + `assemble.ts` + the jobs strict
    parse, with legs in both export tests (F19); or (b) the deferred item written.
12. **AC12 — Nothing else's CODE moves (I6, LS11).** `git diff b883dc15 --stat` shows ⛔ change in `otp-sms-template.ts`,
    `claim-suspicion-notices.ts`, `suspicion-notice.ts`, `claim-contact-ladder*.ts`, `claim-certificate-reminders.ts`,
    `claim-correction-*.ts`, `news-publish.ts`, `survey-publish.ts`, `packages/i18n/src/**` (except comments, if any),
    `packages/api-client/src/index.ts` beyond the two new methods — state the diff in the Debug Log. `code-delivery.ts` (`:40`),
    `moderation-notify.ts` (`:310`) and `contribution-notify-triggers.ts` (`:236`) may change those COMMENT lines only. ⚠ Code-unchanged
    ≠ behaviour-unchanged: the claim-contact family's language is AC15's.
13. **AC13 — Governance before code.** Task 0's author-commit decision (LS1–LS15 answers + the §0 GATE table G1–G11 and its verdict +
    the T-states table + I4's kept-out Panel option) is committed ALONE before any code; records (epics entry, roster row if LS14 (a),
    deferred items, dated notes) in their own commit. If a re-open condition of the §0 GATE fires (a departing Task 0.2 answer, a
    changed T-states table, S4), the routing note is written from the template and Task 3 waits for the ruling; Tasks 1, 2, 4, 5 may proceed.
    ⭐ PQ1 (the reminder's fallback language) — RULED A by `2026-10-23-385` (committed alone `73183745`, before Task 0); the
    author-commit cites it for LS10 (b′), and Row 35 (b) gains the leg Task 0.4 words.
14. **AC14 — The gate.** `DATABASE_URL=<:5433> pnpm ci:local` green ([[project_prepush_hook_inherits_5432]],
    [[project_ci_local_double_run_pollution]]); the job count and commit recorded.
15. **AC15 — The claim-contact language (LS15 (b)) — the AGREEMENT-LANGUAGE RENDER TEST is the gate.** With the app's provider in
    `en` (a real outer `LocaleProvider initialLocale="en"`), render the `(claim)/contact.tsx` route's default export and assert, on the
    SAME render: (1) the `contact-agreement` checkbox label text equals `t('contact.agreement', undefined, { locale: 'hi', namespace:
    'claim' })` and is ⛔ the `en` one; (2) the in-screen title `contact.title` (`contact.tsx:229-231` — the group has ⛔ native header,
    `(claim)/_layout.tsx:43` `headerShown: false`; its `N / M` label carries ⛔ words), a nominee heading's relationship label (`common`
    `nominees.relationship_*`), the shell's strings and `contact.continue` are the `hi` ones; (3) the body passed to the mocked
    `claimApi.recordClaimContact` (`lib/claim-api`, `contact.tsx:193` — ⛔ `memberAuth`, which only supplies `nomineesStatus()`) carries
    `locale: 'hi'`. Harness: the `wa-notifications-screen-render` scaffold EXTENDED — tamagui adds `XStack` (forwarding `onPress`→`onClick`,
    `accessibilityRole`→`role`, `accessibilityState.checked`→`aria-checked`, `testID`), `Input` (`value`, `onChange: (e) => onChangeText?.(e.target.value)` — a straight forward would pass the event and `.trim()` throws,
    `testID`), `H3`, `Separator`; react-native adds `Platform: { OS: 'android' }` (else `announce()` `:157` throws after the POST); expo-router
    adds `useRouter`; mock `expo-linking` (`CallHelplineCTA`), `lib/session-context` (`useSession` → `{ session: { memberId } }`),
    `lib/claim-draft` (`loadClaimDraft` → `{ claimCaseId }`, `saveClaimDraft` no-op), `lib/member-api` (`nomineesStatus` → one nominee)
    and `lib/claim-api`. The leg fills the address, picks the claimant, ticks `contact-agreement`, presses `contact-save`
    (`buildMemberContactBody`, `lib/claim-contact.ts:22-43`, needs every field). Together with the EXISTING lockstep `apps/api/tests/unit/claim-contact-copy.test.ts:23-26`, this
    proves the server's recorded `checkboxTextShown` is the text the member saw. RED against the pre-change file (with the outer
    provider in `en` it renders English and submits `'en'`); the leg is named in the Debug Log. A dated comment names LS15 and the LS11
    deferred item. ⚠ If ANY of (1)–(3) cannot be made to pass with the nested provider ⇒ STOP and tell BigDev — ⛔ silent switch to (b′)
    (`agreementLocale` / `contactLocale` split) or (a).

## Tasks / Subtasks

- [x] **Task 0 — Preflight, decisions, governance (AC13)**
  - [x] 0.1 `git fetch origin`; rebase onto `origin/main` (3.3c and 8.15 landed — `common.json`, `microcopy.yaml`, `openapi/v1.yaml`,
    `api-client/src/index.ts`; ⚠ the ledger's newest-first blocks conflict — keep both, branch on top, byte-diff the entries); re-run the
    header's baseline diff; re-derive F1–F26 (re-grep each symbol). **STOP** and tell BigDev if:
    **S1** any production database or real member exists, or a Pariwar is no longer held by `config:counsel_basis_pending`
    (LS10's costs change from "planned" to "live"), or any Pariwar's `locale_default` is `en` (G3 becomes live); **S2** another branch / worktree edits `peer-mesh-request.ts`,
    `claim-peer-mesh-requests.ts`, `claim-peer-mesh-wa-reminders.ts`, `peer-mesh-wa-reminder.ts`, `schema/claim_peer_mesh_pings.ts`,
    `_layout.tsx`, `login.tsx`, `(tabs)/index.tsx`, `session-context.tsx`, `(claim)/contact.tsx`, `schema/members.ts`,
    `packages/api-client/src/index.ts` or `common.json` (`git branch -a`, `git worktree list`, ListAgents — 6-36d DOES (Sequencing), 8-15
    landed the api-client doc comment; [[feedback_shared_tree_branch_switch]]); **S3** a decision after `-385` (this story's PQ1
    ruling; `-384` is 6-36d's — nominees, ⛔ language: checked at v1.4) touches language, `-303`'s rider, CF1 or `-385`;
    **S4** either template set is NOT both-locale on the DLT sheet / Row 35 (b) any more, or a TEXT locale is recorded DLT-rejected (a
    reminder locale recorded "Meta refuses" is PQ1's case, ⛔ a STOP); **S5** `beginFresh` / `skipFresh` / `finishAttempting` / the
    reminder begin no longer match F12 / F13 / LS9 (the CHECK and re-claim rules rest on it); **S6** the text park, the text listing's
    `attempting` arm or the reminder sweep listing cannot take the locale filter without a new column or detail value (F25, F26).
  - [x] 0.2 CONFIRM with BigDev the direction already given (LS4 (b), LS10 (b) with the T-states table, LS15 (b) behind AC15) and put
    the REST (LS1–LS3, LS5–LS9, LS11–LS14) in plain language (recommended first, each with its cost); record the answers verbatim. If
    any answer departs from the direction, or the T-states table changes, re-run the §0 GATE table: a narrowing ⇒ the routing note
    (template) and Task 3 waits; still MATCH ⇒ ⛔ note. PQ1 is RULED (`-385`) — ⛔ re-asked; LS10 (b′) is A.
  - [x] 0.3 The author-commit decision (next free id ≥ `-386` — `-384` is 6-36d's, `-385` this story's PQ1 ruling; "cites `-385` for
    LS10 (b′) A; AMENDS `-365` WR7 and `-345` MG5's peer-mesh half (a
    Pariwar hold → a per-recipient wait, per the T-states); NARROWS `-311` PM22's *"row 6-35 fixes both halves"* (the display half stays
    open — LS4 (b)); supersedes ⛔ ratified text; realises `-305` §2 item 2 and `-310` CF1 A's *"then each member's choice"*; overtakes
    `-303`'s not-ratified *"and when they first use the app"* as `-305` already did; records the §0 GATE table G1–G11 with its verdict (⛔
    blocking note; PQ1 routed and RULED A by `-385`) and its re-open conditions — G3 as the
    AUTHOR'S READING (CF1 A is silent on a non-chooser; moot while every Pariwar is `hi`), G5 / G6 as corrected at v1.4, G8 with both
    sides of the freeze-row-10 reading, G9 with `-293`'s not-ratified *"the filer's own choice"*; the T-states table as LS10 (b)'s
    definition; the LS7 bilingual label (a departure from UX `:554`, argued by analogy under `:1126`, `:1127` recorded); LS15 (b)'s
    render-test condition and its mixed-language cost; the LS5 Ravi-mode edge; and LS10 (c) for the TEXT as the Panel's, ⛔ taken");
    stage in the scratchpad, try the insert
    ([[project_decision_log_writes_user_inserted]]); commit it ALONE (`governance:` prefix); write its SHA only AFTER the commit.
  - [x] 0.4 Records commit: the `epics.md` Story 6.35 entry (Epic 6, after 6.34 (`:3480` at the pin, `:3514` on `main` — re-grep) — the
    post-hoc *"> **Added 2026-10-… (Story 6.35, Task 0.4)** —"* format); the LS14 roster row if (a); a dated leg on Row 35 (b) (*"PQ1 —
    the reminder's language when a member's chosen one is refused — RULED A by `-385` (the Pariwar's language); live once Story 6.35 is
    `done` on `main`"*, naming the note);
    deferred-work: W8 marked *"Closed by 6.35 (AC3)"* at EVERY site that cites
    it (deferred-work *"W8 — `locale_source` is a literal…"* and 6.27c Review Defer W8 `:692` — grep *"locale_source. is a literal"*;
    6.27c's totals lines only count it), the LS11 item, LS12 (b) if chosen; dated notes on 6.27 PM22, 6.27c R10 and R11, 6.31 WR14 and
    WR7 (*"built per recipient by 6.35"*), the DLT sheet `dlt-template-requests-6-19.md:18-22` (the hold rule becomes LS10 (b)'s
    per-recipient wait) and `:218`, and 6.37 AC9 (a) (its property kept and extended; `:954`'s English-Pariwar half flipped); the 3-3c
    story `:176-179` (*"The mobile app always renders `hi`"*) and its TR8 `:704` (*"The en strings are unreachable on mobile until row
    6-35's language switch lands"*); the ledger (the next free letter at the commit — ≥ `2026-10-23o` (v1.4 `k`, v1.5 `l`, 6-36d `m`, v1.6 `n`), or the day's own key; re-grep `main`, every
    branch and worktree). (The 6-35 sprint-row comment was already annotated at creation — ⛔ again.)
- [x] **Task 1 — Schema + the one read (AC1, AC3; LS1, LS8, LS9)**
  - [x] 1.1 The migration (F16; T1) + journal; `schema/members.ts` (+ dated comment), `schema/claim_peer_mesh_pings.ts` (`locale`
    column; `PEER_MESH_LOCALE_SOURCES` widened), `schema/claim_peer_mesh_wa_reminders.ts` (its type imports `PeerMeshLocaleSource`,
    which widens to two values automatically — ⚠ the reminder needs its OWN `PEER_MESH_WA_REMINDER_LOCALE_SOURCES = [...PEER_MESH_LOCALE_SOURCES,
    'pariwar_fallback']` + type, LOCKSTEP with its CHECK, `-385`; the column's `$type<PeerMeshLocaleSource>()` at
    `schema/claim_peer_mesh_wa_reminders.ts:89` moves to the new type). `db:migrate` on :5433; `psql -f` twice.
  - [x] 1.2 Domain setter/reader for the member choice — `packages/domain/src/member/preferred-locale.ts`
    (`getMemberLanguage(db, { pariwarId, memberId })` ⇒ `{ chosenLocale, pariwarDefaultLocale }`, `setMemberLanguage(db, {…, locale })`
    ⇒ `{ changed: boolean, … }` — `UPDATE … SET preferred_locale = $l, preferred_locale_set_at = now(), updated_at = now() WHERE
    member_id = $m AND pariwar_id = $p AND preferred_locale IS DISTINCT FROM $l RETURNING` (the `custom-fields/member-write.ts:117-121`
    precedent); ⛔ opens a transaction — the caller's scoped `Db`); export via the `member` barrel (`member/index.ts`).
  - [x] 1.3 `resolvePeerRequestLocale` per LS8 (explicit predicates; called after step ③); `resolvePariwarDefaultLocale`; `beginFresh` /
    the re-claim per LS9 (thread `locale` + `source`; a `locale IS NULL` re-claim writes the Pariwar default; return `locale` in `begun`);
    keep `PeerRequestLocaleMissingError`.
  - [x] 1.4 Legs (:5433): AC3's resolver (cross-tenant on the jobs handle) and re-claim legs; the freeze, written-once and R15 guard
    legs; FLIP F14's two specs (dated comments); move `peer-mesh-request.spec.ts:558-559` to the new signature; the setter's `changed` legs.
- [x] **Task 2 — The API (AC2; LS2)**
  - [x] 2.1 Contracts `member-language/language.ts` + index export + lockstep test (T6).
  - [x] 2.2 `apps/api/src/modules/member-language/{routes,handlers}.ts` (the Life Events shape, F10 — with the module's own rate-limit
    const and the audit AFTER commit, LS2) registered where the other member modules are; `'member.language_changed'` added to
    `audit-sink.ts`'s union; domain errors mapped (or a 500 — T7).
  - [x] 2.3 `emit-openapi.ts` paths → `pnpm contracts:emit-openapi`; commit `openapi/v1.yaml` (after the rebase — 3.3c changed it).
  - [x] 2.4 `packages/api-client`: `memberLanguage()`, `memberLanguageSet(locale)` on the member client (the `member*` naming
    convention); 8-15 edits a doc comment in the same file (`:575-583`).
  - [x] 2.5 AC2's integration legs (`apps/api/tests/integration/member-language/member-language.spec.ts`).
- [x] **Task 3 — The senders (AC4, AC5; LS9, LS10)**
  - [x] 3.1 TEXT per LS10 (b)'s T-states: compute the run's global `unusableLocales` once (T1 / T2 / TX per locale; TX on the Pariwar's
    OWN default locale's key and both-unusable ⇒ hold as today); `listDuePeerMeshRequestClaims` gains `unusableLocales` and excludes
    waiting NULL pings (NULL-safe, explicit `pariwar_id` predicates) AND, in its `attempting` arm, unusable-locale rows while the claim is
    in the window; the park gains its locale arm over EVERY stalled scope, held or not (F25); `beginPeerMeshRequest` returns
    `waiting_template` with ⛔ write for an unusable locale on BOTH paths (after ③, before ④; the re-claim reads the row's `locale`);
    `PeerMeshRequestChildCounts.waiting`; the child computes its own set from its race-guard config; `countWaitingPeerMeshRequestPings`
    for the alarm, which lists waiting locales with counts. `claim-peer-mesh-requests.ts`: ⛔ `locale` in `PariwarSendConfig`; the child
    takes `locale` from each `begun` result (`:715-721`); update the header lines `:4`, `:10-11`, `:14`, `:39-42` (the sweep's "(1)/(2)")
    that say "the Pariwar's language" (dated).
  - [x] 3.2 `peer-mesh-wa-reminder.ts` + `claim-peer-mesh-wa-reminders.ts` (F13): `peerMeshWaReminderConfig` resolves BOTH template
    names (`templates: Record<'hi'|'en', { name: string } | { gap: string }>` — the gap keeps missing / invalid / unreadable apart for
    the alarm's state code; both gaps ⇒ hold as today; a TX on the DEFAULT's key ⇒ hold as today, on the OTHER key ⇒ that locale a gap
    (LS10 TX row); ⛔ recipient `locale` / `localeSource` in the config — the config carries `pariwarDefaultLocale`
    (`resolvePariwarDefaultLocale`), used ONLY for the (b′) fallback and the both-unusable gap); the sweep's `gapOf` memo
    (`:365-382`) keeps each Pariwar's ready `templates` + `pariwarDefaultLocale` (⛔ only the gap), and the wait / fallback check runs
    after the held check and before the `maxClaims` bound; the SWEEP's listing `listDuePeerMeshWaReminderPings` returns each ping's
    effective locale, source and Pariwar default (LS10's rule) and the sweep ⛔ enqueues a waiting one (`resumeAt = dueCursor;
    continue`, ⛔ `seenClaims`); the begin, for a CHOOSER whose locale is unusable while the Pariwar default's is usable, takes the
    default's name and records `locale_source = 'pariwar_fallback'` (`-385`, LS10 (b′) A — its CHECK value per LS9), and returns
    `waiting_template` with ⛔ row (fresh) / ⛔ write (re-claim) only for a ping with ⛔ usable template; ⛔ `parkPeerMeshWaReminder`, ⛔
    `config:*` detail (F26); the child counts `waiting` and `fallback` explicitly; `beginPeerMeshWaReminder`'s input `template` → `templates`; the begin calls `resolvePeerRequestLocale(db, { pariwarId,
    memberId: ping.member_id })` after the eligibility read, writes `template_name` / `locale` / `locale_source` of THAT locale (INSERT
    `:354-360`, re-claim `:368-375`), and returns `locale`, `localeSource`, `templateName` in `begun`; the send (`:669-675`) uses `begun.*`.
  - [x] 3.3 FLIP `apps/jobs/tests/claim-peer-mesh-wa-reminders.test.ts:73-77` (dated); FLIP the English-Pariwar half of
    `claim-peer-mesh-requests-live.test.ts:954` (dated — an `en` Pariwar's Hindi-chooser is now sent); update the reminder begin callers in
    `packages/domain/tests/integration/claim/peer-mesh-wa-reminder.spec.ts` and `…-concurrency.spec.ts`; AC4 / AC5 legs; every existing
    6.27c / 6.31 leg green with fixtures provisioning BOTH locales (T3).
- [x] **Task 4 — The app (AC6–AC9, AC15; LS3–LS7, LS13, LS15)**
  - [x] 4.1 `lib/app-language.ts` (LS3, LS5) with injectable storage + client; `_layout.tsx` `initialLocale` (+ its `:88-92` comment).
  - [x] 4.2 `session-context.tsx`: ONE effect keyed on `session?.memberId` calls `syncAppLanguage` (sign-in and start); ⛔ touch any of
    the three clear paths (LS3 keeps the keys) — a dated comment saying so. ONE new app-level `AppState` → `active` listener for the
    resync (the four screen-scoped listeners stay as they are), reading the current `memberId` from a ref (⛔ a stale closure); the
    serial single-flight PUT and the choice counter live in `lib/app-language.ts` (LS5).
  - [x] 4.3 `app/(settings)/language.tsx` (with its `Stack.Screen` title), `components/settings/LanguageSettingsEntry.tsx`, the home-tab
    mount, the login switch; `(settings)/_layout.tsx` comment; enrol the new / edited files in `microcopy.yaml` `code_globs` (AC10).
  - [x] 4.4 Copy (AC10); the three F20 CODE comments corrected (`code-delivery.ts:40`, `moderation-notify.ts:310`,
    `contribution-notify-triggers.ts:236`); `(tabs)/_layout.tsx:24-26` KEPT (it anticipates the switch).
  - [x] 4.5 Legs: AC6–AC9 (`tests/unit/app-language.test.ts`, `language-screen-render.test.ts`, `language-copy-keys.test.ts`, a login
    render leg, the three-clear-paths source scan); a route source test — `LanguageSettingsEntry` holds `'/(settings)/language'` and
    `app/(settings)/language.tsx` exists (the `wa-signup-step-render` PREV/NEXT shape; `tsc` accepts any two-segment `Href` —
    [[project_mobile_typed_routes_worktree]]), proven RED.
  - [x] 4.6 LS15 per the answer (AC15).
- [x] **Task 5 — The export (AC11; LS12)** per the answer.
- [x] **Task 6 — Close (AC12, AC14)**
  - [x] 6.1 AC12's diff statement in the Debug Log.
  - [x] 6.2 `ci:local` on :5433 (AC14); every new leg shown RED against the pre-change code (AC3 re-claim, AC4 split, AC5 per-recipient,
    AC7 switch, AC9) — say so in the Debug Log.
  - [x] 6.3 Records that become stale on `done`: 5-10 F15, 6.30's *"always renders Hindi"*, 6.27 PM22 RECORDED line, 6.27c `:35` and
    `:731-732`, 5-13 `:491`, `-310`'s reading — dated notes, ⛔ edits; the memory `project_mobile_app_no_language_switch` updated (it will
    be FALSE — incl. its *"The server has no member language preference either"*; also drop its stale *"Panel confirm CF1 owed"* — ruled
    by `-310`) AND its `MEMORY.md` index line (*"always Hindi; row 6-35 adds one"*).
  - [x] 6.4 Story Status → `review`; sprint row → `review`; ledger.

## Dev Notes

### ⚠ TRAPS

- **T1 — Migration.** Hand-authored; journal `when` = previous + 86400001; ⛔ `db:generate`; idempotent (`ADD COLUMN IF NOT EXISTS`,
  `DROP CONSTRAINT IF EXISTS` before each re-ADD, `CREATE OR REPLACE FUNCTION`). The CHECK names are `claim_peer_mesh_pings_locale_source_check`
  (0156:61) and `claim_peer_mesh_wa_reminders_locale_source_check` (0171:75) — re-ADD under the SAME names (the reminders spec asserts
  its name, `peer-mesh-wa-reminder-record.spec.ts:216`; the pings spec asserts the code 23514 only). The new pings CHECK is
  `claim_peer_mesh_pings_locale_check`. The guard function: `CREATE OR REPLACE` from 0166's FULL body (`:78-128`) — copying 0156's shorter
  body (`:68-93`) silently DELETES 6.27c's R15 attempting-row checks. ⛔ edit 0156 / 0166 / 0171 (applied).
- **T2 — The freeze trigger is a column LIST, and it only freezes FINISHED rows.** A new pings column ⛔ in `delivery_cols` is silently
  rewritable after a finished send; and on an `attempting` row nothing stops a re-claim rewriting `locale` (F15) — AC3's freeze and
  written-once legs prove both.
- **T3 — Both-locale fixtures.** A fixture that provisions only one template: under LS10 (b) only a leg with a recipient of the
  missing language waits (a fixture with neither provisioned HOLDS the Pariwar, as today). Fix the shared fixture helpers ONCE (provision both); ⛔ weaken the check. A leg that wants
  the hold / wait unsets ONE.
- **T4 — `initialLocale` is read on mount only** (F1). The stored language must be read SYNCHRONOUSLY before the provider mounts
  (`_layout.tsx` already waits for fonts — read it at module or component top, ⛔ in an effect). A later change goes through `setLocale`.
- **T5 — `useT()` is a fresh closure** — depend on `locale` from `useLocale()`, ⛔ `[t]` in files this story adds or edits
  ([[project_uset_fresh_closure_memo_trap]]; `notifications.tsx` had the loop). ⛔ call `syncAppLanguage` from a render path. A string
  stored in STATE via `t()` (`login.tsx`'s `setError`) does ⛔ re-translate on a switch (F22) — on the login screen, clear the error on
  switch or store the KEY.
- **T6 — Contracts tests are outside tsc** ([[project_contracts_tests_outside_tsc]]) — run `vitest` in `packages/contracts`.
- **T7 — Map every new domain error** in the API error mapping or it surfaces as a 500 (5.4's lesson).
- **T8 — ⛔ The "first launch" trap in disguise.** `syncAppLanguage` must ⛔ PUT what it DISPLAYS (the stored phone language for a
  member with ⛔ server value, or the Hindi default), and must ⛔ display the Pariwar's default (LS4 (b) — I2). Only a `pending` record
  — written ONLY by `chooseLanguage` — may be PUT.
- **T9 — JSDoc** — bold markdown like `**cl.3**` inside `/** */` can close it ([[project_markdown_emphasis_closes_jsdoc]]).
- **T10 — Pre-push** hits :5432 — push with `DATABASE_URL=…:5433` ([[project_prepush_hook_inherits_5432]]); live-DB known failures
  ([[project_known_livedb_test_failures]]); a `deadlock detected` is lock order ([[project_fk_truncate_cascade_deadlock]]).
- **T11 — Same-tx `now()`.** The `set_at` "unchanged on a repeat PUT" leg needs two transactions ([[project_db_clock_ordering_tests_tie]]).
- **T12 — Fabric lists.** If the screen grows a list, render empty/error OUTSIDE it ([[project_fabric_flatlist_empty_populated_crash]]);
  two options need ⛔ list.
- **T13 — RLS does ⛔ guard the senders** (F23). The jobs handle is BYPASSRLS: every new read in `peer-mesh-request.ts` /
  `peer-mesh-wa-reminder.ts` carries its own `pariwar_id` predicate, and its cross-tenant leg runs on that handle — ⛔ under
  `SET LOCAL ROLE twt_app`, which would pass even with the predicate missing.
- **T14 — Accessibility assertions under mocks.** The render scaffold's tamagui / RN mocks drop a11y props (AC7) — forward them and prove
  the assertion RED by dropping the prop, or the radio / alert legs test nothing. Also: the scaffold mocks `Stack: { Screen: () => null }`
  (`:59`), so AC7's header-title assertion sees nothing — mock `Stack.Screen: ({ options }) => createElement('div', { 'data-testid':
  'stack-title' }, options?.title)`; add `Platform: { OS }` (switchable) to the react-native mock and run the announce leg under both.

### Reuse map

| Need | Use | ⛔ Rebuild |
|---|---|---|
| locale state | `useLocale().setLocale` (`@twt/i18n/react`) | a second context |
| phone store | `mmkvStorage` + an injected `SyncStorage` (`lib/known-people-saved-names.ts:19-38`) | AsyncStorage, a new MMKV instance |
| member write route | Life Events (`life-events/routes.ts:91-127` — the posting route's `config: { rateLimit }`; `handlers.ts:205-251`) | an RBAC key |
| audit | `emitAuthAudit` + the closed union — AFTER `closeScopeTx(…, true)` (LS2) | `writeAuditEntry` directly (access-wrapper gate) |
| tenant-scoped member read in jobs | `readPeerMeshRequestEligibility`'s explicit `pariwar_id` predicate (`peer-mesh-request.ts:193-196`) | relying on RLS (F23) |
| locale enum | `localeEnum` (`schema/pariwar_passport.ts:54`) | a new pg enum |
| settings entry | `NotificationSettingsEntry.tsx` | a settings menu |
| choice control | `accessibilityRole="radio"` + `accessibilityState={{ checked }}` in an `accessibilityRole="radiogroup"` container (`(claim)/contact.tsx` `ChoiceRow` `:45-64`, `:262`, `:267,276`) | a new primitive |
| inline error line | `accessibilityRole="alert"` + `accessibilityLiveRegion="assertive"` (+ iOS `announceForAccessibility`) — 3.3c `kyc.tsx`, `contact.tsx:154-157` | `role="alert"` |
| screen title | `<Stack.Screen options={{ title: t(…) }} />` (`notifications.tsx:208`) | a custom header |
| render-test scaffold | `tests/unit/wa-notifications-screen-render.test.ts` | a mocked `useT` |
| copy-key test | `tests/unit/wa-notifications-copy-keys.test.ts` | — |
| timeouts | `withTimeout` (`lib/with-timeout.ts`, `CALL_TIMEOUT_MS`) | a hung fetch ([[project_tanstack_refetch_rejoins_hung_fetch]]) |

### Testing standards

Domain / jobs / API integration on :5433 with `DATABASE_URL` set explicitly; `ci:local` the same. Mobile: vitest, `.test.ts`,
`// @vitest-environment jsdom`, mock `react-native-mmkv` or `lib/mmkv` and `lib/member-api`, RTL `cleanup` in `afterEach`
([[project_mobile_vitest_and_expo_install_traps]]). Every new leg RED against the pre-change code (Task 6.2).

### Project structure notes

New: `packages/contracts/src/member-language/`, `apps/api/src/modules/member-language/`, `packages/domain/src/member/preferred-locale.ts`,
`apps/mobile/lib/app-language.ts`, `apps/mobile/app/(settings)/language.tsx`, `apps/mobile/components/settings/LanguageSettingsEntry.tsx`,
one migration. Edited: the two schedulers, `peer-mesh-request.ts`, `peer-mesh-wa-reminder.ts` (begin input and result change),
three schema files, `_layout.tsx`, `session-context.tsx`, `login.tsx`, `(tabs)/index.tsx`, `(claim)/contact.tsx` (LS15 (b) only),
`common.json` ×2, `microcopy.yaml`, `audit-sink.ts`, `emit-openapi.ts` + `openapi/v1.yaml`, `packages/api-client/src/index.ts`, three
comment lines (F20), the data-export trio (LS12 (a)). ⛔ New package ([[feedback_no_premature_package]]);
⛔ edit to `packages/i18n/src`.

### Sequencing

- 6-36d (nominee exclusion at selection) — S2 FIRES. ⛔ shared CHECK or function: 6-36d widens
  `claim_peer_mesh_pings_detail_vocabulary_check` / `…first_detail_vocabulary_check` and the IN-list in
  `claim_peer_mesh_pings_replacement_guard()`; 6.35 touches the `*_locale_source_check` pair, the new `*_locale_check` and
  `claim_peer_mesh_pings_guard_delivery()`. Real collisions: both name "the next free" migration (0179, journal idx 179, `when`
  `1794973200023`); both edit `schema/claim_peer_mesh_pings.ts`; both change the INPUT types of `beginPeerMeshRequest` and
  `beginPeerMeshWaReminder` (6-36d adds `nomineeMobileIndexes`, its ND4) and the two child call sites (`claim-peer-mesh-requests.ts:620-623`,
  `claim-peer-mesh-wa-reminders.ts:569-578`) and the same domain spec callers; 6-36d ALSO changes the inputs of
  `readPeerMeshRequestEligibility`, `insertPeerMeshReplacementPing` and `finalisePeerMeshNoSendableNumber` and its call site
  `claim-peer-mesh-requests.ts:674-676`. 6.35 ALONE changes `listDuePeerMeshRequestClaims`, the park, the reminder sweep listing and both
  begin RESULT unions (`waiting_template`); 6-36d's begin re-check (③) sits before 6.35's waiting check, so the begin order is ① ②
  ③(+nominee) → waiting → ④. LS10 (b) as defined adds ⛔ detail-vocabulary value (6-36d's ND5 adds `no_target:peer_is_nominee` to the
  pings' detail CHECKs and `replacement_guard()` only). Whichever COMMITS its migration second (`-366` decision 6: *"the number belongs
  to the first COMMIT that takes it on any branch"*) renumbers it + journal `when`, and re-runs both stories' legs.
- 3-3c (`40420410`) and 8-15 (`69e35f73`) LANDED — rebase before Task 1; 8-15 touched `packages/api-client/src/index.ts` (a doc comment only).
- Rows 5-11 (SMS fallback) and the F21 senders read whatever this leaves; LS11's deferred item is their pointer.
- Go-live: the LS14 row; Row 35 (b)'s PQ1 leg (ruled A, `-385`); ⛔ merge fence.
- Log order: if 6.35 lands before 6-36d, `-385` reaches `main` first and 6-36d's rebase puts `-384` ABOVE `-385` in the newest-first
  `.decision-log.md` — expected (ids belong to the first commit, `-366` decision 6); ⛔ re-number either; keep the `---` separators
  ([[project_rebase_ledger_conflict_separator]]).

### Previous story intelligence (6.27c, 6.31, 5.12)

- 6.27c: *"keep it a single function"* (Dev Notes `:731`; R10 names the one read); W8 names this story; holds are per Pariwar by design (header `:4`).
- 6.31: WR14 reads the language AGAIN at the reminder (⛔ copied) — keep that; its round-2 P6 pinned the source type on purpose;
  WR6 records a refused locale as "Meta refuses"; as built, a Pariwar ON that locale HOLDS (6.31 `:384-386`) — 6.35 makes it per
  recipient only under LS10 (b).
- 6.37: AC9 (a) moved the DLT pre-flight into `pariwarConfig` for the Pariwar's OWN locale precisely so a broken `en` template would
  ⛔ hold Hindi Pariwars (F12) — LS10 (a) would reverse it.
- 3.3c (landed): the freshest mobile precedent — the inline alert shape (announced on BOTH platforms, `kyc.tsx:180-186`, because its
  alert can already be showing), `code_globs` enrolment (KB8), and `-382` KB6 on Hindi string approval without a roster row.
- 8.15 (landed) and 6-36d (committed, `-384` ruled): 6-36d is the precedent for a NON-blocking routing note written before Task 0.2 and
  ruled while the story was still `ready-for-dev`.
- 5.12: the screen re-fetch loop from `[t]` (T10 there); render tests under a REAL `LocaleProvider`; copy-key tests per screen; the
  governance-first commit order (decision alone → records → code).

### Git intelligence

At the pin the last five commits on `main` (`b883dc15` … `651ffc53`) were 6.37e's review rounds and ledger: author-commit decisions
committed ALONE, then records, then code; fences updated with dated comments, ⛔ deleted; ledger letters per commit. Since then `main`
took 3.3c (`73ad0ad2` `-382` alone → records → `bf7781d1` code → review → landed `40420410`) and 8.15 (`8d4fe08c` `-383` alone → records →
code in four commits → three review rounds → landed `69e35f73`) — the same order; neither touched a peer-mesh, schema, migration,
life-events, audit-sink or data-export file.

### Latest tech information

⛔ library change. `react-native-mmkv` v4 (`createMMKV`) is already pinned; `useLocale`/`setLocale` are the repo's own. ⛔ add
`expo-localization` or an i18n framework (I1 forbids device inference; the repo's `@twt/i18n` is the system).

### References

- `.decision-log.md` — `2026-10-10-303` (Q1 rider, Consequence 3, Our reading), `2026-10-10-305` §1 (a)(b), §2 items 2 and 5,
  `2026-10-10-310` CF1 A + Our reading, `2026-10-10-311` PM22, `2026-10-19-365` WR14 / WR6, `2026-09-28-263` FQ10 A,
  `2026-10-22-382` KB6; `epics.md` freeze table row 10 (`:555`); 6.37 AC9 (a)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-10-6-27-confirms.md` (CF1 option A as put)
- `_bmad-output/planning-artifacts/trustee-panel-routing-note-2026-10-23-6-35-reminder-language-fallback.md` (PQ1 — RULED A, `2026-10-23-385`)
- `.decision-log.md` — `2026-10-08-295` §0, `2026-10-17-349` decision 1 + FOUND (a), `2026-10-22-380` decision 8, `-293`'s reading
- `_bmad-output/implementation-artifacts/6-27-peer-mesh-sending-replies-and-date-of-death.md` (PM22, F26, F32),
  `6-27c-peer-mesh-sending-texts-and-links.md` (R10, BF14, Review Defer W8), `6-31-peer-mesh-whatsapp-reminder-at-48-hours.md` (WR14, P6),
  `5-12-whatsapp-yes-lasts-until-withdrawn.md` (T10, the screen tests)
- `deferred-work.md` — *"`locale_source` is a literal in the begin"* (W8); *"OTP DLT templates are English-only"* (context, ⛔ closed)
- `_bmad-output/planning-artifacts/epics.md` FR-68; PRD §4.10 FR-68; `ux-design-specification.md` §Platform Strategy, Pattern 12
- `docs/launch-gate-inventory/dlt-template-requests-6-19.md` (templates 13 / 14), `inventory-roster.md` Rows 27, 28, 35 (b)
- Code: as cited in F1–F24

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (`claude-opus-5-5`), `bmad-dev-story 6.35`, 2026-10-23.

### Debug Log References

**(a) Task 0 (2026-10-23).**
- **0.1 — rebase.** `git fetch origin`; `story/6-35-in-app-language-switch` rebased onto `origin/main` `69e35f73` (3.3c + 8.15 landed).
  Conflicts only in the two newest-first ledgers (`sprint-status.yaml` header + `last_updated` block; `.decision-log.md` at `-385`), both
  sides kept, branch on top; the keep-both dropped `-385`'s closing `---` — restored INSIDE `-385`'s own commit
  ([[project_rebase_ledger_conflict_separator]]); the branch's ledger lines and `-385`'s entry byte-identical to before the rebase
  (diffed). The header's baseline diff `b883dc15..origin/main` lists only 3.3c / 8.15 files — ⛔ peer-mesh, schema, migration,
  life-events, audit-sink or data-export file. **SHA map** (the rebase rewrote every branch SHA; records written before it keep the old ones):
  `02c3c9ad`→`25549f59` (v1.0–1.2), `d9fafc71`→`af686936` (v1.3), `14f55e6a`→`d368d3e6` (v1.4), `73183745`→`915158a6` (`-385`),
  `52f1d2c4`→`84268da0` (v1.5), `89961ab3`→`53ce3f99` (`-385` correction), `a3ff1356`→`f387e177` (v1.6).
  F1–F26 re-derived by two read-only passes (server; mobile / client / copy): ALL hold; line drift only, and four path corrections —
  the job files live under `apps/jobs/src/scheduler/`; the audit helper is `apps/api/src/modules/auth/shared/audit.ts`; the settings entry
  is `components/notifications/NotificationSettingsEntry.tsx`; `call()` is `packages/api-client/src/index.ts:257-302`. Also found: the
  hi `common.json` `$comment` reads *"AGENT-AUTHORED — a person reviews it before go-live (roster Row 28 …)"* (⛔ the literal *"NOT YET
  HUMAN-REVIEWED"*); `H3` / `Separator` reach AC15's render through `components/claim/ClaimProxyFlowShell.tsx:10`, ⛔ `contact.tsx`;
  `createMemberAuthClient` has ⛔ PUT method yet (the only `'PUT'` is the peer-request client's `saveAnswer`); `member-terms.handlers.ts:52-56`
  is `resolveLocale`, ⛔ the one-body code.
  **STOP checks:** S1 clear (⛔ production; Row 27 `open`; ⛔ Pariwar seeded `en`). S2 FIRES — `story/6-36d-…` (worktree active; `-386`
  committed, ⛔ code yet, ⛔ migration taken — 0179 still free) — put to BigDev. S3 clear — `-386` (6-36d, nominees) touches ⛔ language,
  rider, CF1 or `-385`. S4 clear — DLT 13 (hi) / 14 (en) both listed, ⛔ rejection recorded. S5 clear — `beginFresh` (`:464-485`, the literal
  `:472`), `skipFresh` (`:316-325`, ⛔ `locale_source`), `finishAttempting`, the reminder begin (re-claim only while `send_started_at IS
  NULL`, `:373`, rewrites the locale) as F12 / F13 / LS9. S6 clear — the text listing and the reminder sweep listing take a LEFT JOIN +
  `= ANY(param)`; ⚠ the PARK is an `UPDATE … FROM` (a LEFT JOIN onto the target is not allowed), so its locale arm is a correlated
  subquery — ⛔ new column or detail value.
- **0.2 — BigDev's answers (verbatim, 2026-10-23):** the direction (LS4 (b), LS10 (b) with the T-states table, LS15 (b) behind AC15) —
  *"Confirm all three (Recommended)"*; S2 / 6-36d — *"Proceed in parallel (Recommended)"*; LS1–LS3, LS5–LS9, LS11–LS13 — *"All as
  recommended"*; LS14 — *"(b) I approve the drafts now"* (the five Hindi strings put: entry *"भाषा / Language"*, title *"भाषा"*, intro
  *"इस ऐप की भाषा चुनें। ट्रस्ट के कुछ संदेश (SMS और WhatsApp) भी इसी भाषा में आएँगे।"*, error *"आपकी पसंद इस फ़ोन पर सहेज ली गई है, पर अभी
  आपके खाते में दर्ज नहीं हो सकी। हम फिर कोशिश करेंगे।"*, login hint *"ऐप की भाषा बदलें"*). ⇒ every §0 row MATCH; ⛔ routing note.
- **0.3 —** Decision `2026-10-23-387` (author-commit), committed ALONE: `def04547`. (`-386` is 6-36d's.)
- **0.4 —** the records commit (this one): `epics.md` `### Story 6.35`; roster Row 35 (b) dated PQ1 leg; deferred-work — W8 dated
  (being built, ⛔ Closed) and the LS11 item *"Senders that ignore the member's chosen language (row 6-35)"*; dated notes on 6.27 PM22,
  6.27c R10 / R11 / Review Defer W8, 6.31 WR7 / WR14, 6.37 AC9, 3-3c G7 (*"always renders `hi`"*) and TR8, the DLT sheet's hold rule and
  language line; the sprint row → `in-progress`; ledger `2026-10-23p` (`o` was taken by 6-36d during this pass). LS12 (a) taken ⇒ ⛔ LS12 (b) item; LS14 (b) ⇒ ⛔ roster row.

**(b) Task 1 — schema + the one read (`c07f64ae`).** Migration `0179_member-preferred-locale` (0179 was free on every branch and
worktree at its commit; 6-36d later renumbered its own to 0180 — `-366` decision 6); `psql -f` twice green on :5433; `db:migrate` +
`db:check` green. One addition beyond LS1's text, recorded: a `members_preferred_locale_set_at_check` (the two columns set together or
neither — the setter's one UPDATE writes both). The guard function's body diffed against 0166's: ONLY `'locale'` added to
`delivery_cols` and the written-once arm. Legs: the resolver (incl. AC3's cross-Pariwar leg on the superuser handle — T13), fresh /
re-claim (I5) / pre-6.35 NULL re-claim / `skipped_superseded` legs, the freeze + written-once + R15 + CHECK legs; F14's pins FLIPPED
with dated comments; the setter's changed / no-write (a BACKDATED `set_at` — T11 inside one transaction) / missing / cross-tenant /
CHECK legs.

**(c) Task 2 — the API (`0cb287d0`).** RED: the audit moved BEFORE the commit ⇒ exactly the forced-COMMIT-failure leg fails (5 / 6
pass). `openapi/v1.yaml` re-emitted: the diff beyond the two paths is YAML anchor renumbering (the shared `hi`/`en` enum adds one
anchor) — deterministic (`contracts:check-openapi-determinism` green).

**(d) Task 3 — the senders (`1c64d4f5`).** S6 as found: the text park is an `UPDATE … FROM` (the target cannot be LEFT JOINed) ⇒ its
locale arm is a correlated passport read keyed by the row's own `pariwar_id` — ⛔ new column or detail value. With BOTH text locales
unusable the listing's filter is OFF (`waitUnusable = []`) so every Pariwar holds on its default's gap exactly as before (AC4 (v)).
Pins flipped (dated): the AC4 hold table now unsets BOTH locales; 6.37 AC9 (a)'s English-Pariwar half HELD → WAITING
(`heldForConfig: 0`, `waitingForTemplate: 1`); AC9 (d) one pre-flight read PER locale (2); the scripted call indices (the race guard
reads both locales); the 6.31 hold table unsets BOTH reminder names; 6.37d's AC11 fence re-pins `peer-mesh-wa-reminder.ts` only.
RED (each mutant reverted, files compared byte-for-byte): the resolver ignoring the member's choice ⇒ 7 text legs (AC4 (i), (ii)×3,
(iv), (viii), (x)); the begin ignoring `unusableLocales` ⇒ 5; the reminder fallback removed (option B) ⇒ the 3 `-385` legs; a waiting
reminder marking its claim seen ⇒ the sibling leg. The AC4 (ix) leg first failed with `finalisedStuck: 1` — the fixture's
`aging_since` was four days old and a park credits only the parked time (existing semantics); re-seeded recent and the clock moved
four days while parked ⇒ ⛔ given up.

**(e) Task 4 — the app (`aae29012`), built by a delegated agent in this worktree under this session's direction and reviewed here
before the commit.** AC15's gate HELD: with an outer `LocaleProvider initialLocale="en"`, the contact route renders the `hi`
`contact.agreement`, the `hi` title / relationship / shell / continue strings, and posts `locale: 'hi'` — leg *"⭐ (1) the agreement
label, (2) every other string, (3) the request locale — all `hi`, on the SAME render"*; RED against `git show HEAD:…/contact.tsx`
(the label is the English agreement; a trimmed (3)-only copy ⇒ `"locale": "en"`). AC9's mobile leg: *"a fresh install (empty storage)
signs in and syncs with server null ⇒ ZERO PUT calls"*. 30 mutant runs RED — `app-language.ts` ×10 (compare-and-clear, the counter
after the GET, the process id, the Pariwar default displayed, the displayed language PUT (T8), single-flight, the member check,
another member's pending, storing on a null server value, a stale PUT response adopted — the last first SURVIVED and gained the leg
"race (i) on the PUT"); screen / login ×12 (each a11y prop, `Stack.Screen`, the announce rule both ways, the no-op guard, the login
error clear, the endonym); source pins / copy keys ×8; microcopy teeth (each new `#C0392B` allow removed ⇒ exactly that file flagged).
Interpretations recorded: `syncAppLanguage` takes an optional `currentMemberId` getter (the account-switch drop); `chooseLanguage`
returns `'saved_on_phone' | 'recorded' | 'not_recorded'`; the alert line stays until a later successful PUT; ⚠ a foreground sync that
later records the pending choice does ⛔ hide an alert already showing on the language screen (minor — recorded, ⛔ fixed).
`setLocale` is a `useState` setter (stable), so the session effects do ⛔ re-run per render.

**(f) Task 5 — the export (`0f8bc720`)** and the friction declaration (`bfe5ff0a`): ONE new ledger row — a member who chose English
reads the claim-contact step in Hindi (LS15 (b)'s accepted cost, `forced`) — and the disposition (the switch itself is optional);
`friction:check` green.

**(g) Task 6.1 — AC12's diff (vs `69e35f73`, the rebase base).** ⛔ change in `otp-sms-template.ts`, `claim-suspicion-notices.ts`,
`suspicion-notice.ts`, `claim-contact-ladder*.ts`, `claim-certificate-reminders.ts`, `claim-correction-*.ts`, `news-publish.ts`,
`survey-publish.ts`, `packages/i18n/src/**`. `code-delivery.ts`, `moderation-notify.ts`, `contribution-notify-triggers.ts`: comment /
JSDoc lines only (⛔ a code token). `packages/api-client/src/index.ts`: the two methods + their imports only.

**(h) Task 6.2 — AC14, the gate.** ⚠ NOT on :5433, and why: the shared :5433 database carried (1) 6-36d's UNCOMMITTED migration
0180 (`peer_is_nominee` in the pings' detail CHECKs — this branch's 0166 LOCKSTEP legs then see a vocabulary this branch does ⛔
have) and (2) an 89.5k-row global audit chain the integrity-check chunk-boundary leg (`chunkSize: 1`) cannot walk inside 20 s; the
first :5433 run also hit concurrent-load timeouts (admin 14, while another session ran its own `ci:local`). BigDev: *"you can run
against :5434 as well"* ⇒ the stopped `twt-test-pg-b` container started; its old `twt_dev` would ⛔ migrate (stale rows fail 0165's
`workplaces_staff_actor_check`), so a FRESH database `twt_6_35` was created there (⛔ the old one touched) and migrated to 0179.
`DATABASE_URL=…:5434/twt_6_35 pnpm ci:local` at `bfe5ff0a`: a first run under another session's load ⇒ 142 timeouts (admin 81, ⛔
an admin file on this branch); BigDev: *"other session job is no longer running ci:local so whole resource is for you"* ⇒ re-run:
EVERY job green (unit included — mobile 1370/1370, contracts 1444, domain unit, jobs unit, api unit) EXCEPT `integration-tests`, whose
ONLY failure was the 10.23 spec's own safety guard — it refuses any database not named `twt_dev` (`DISPOSABLE_DATABASES`), and turbo
2's strict env mode does ⛔ pass its `TWT_ALLOW_DESTRUCTIVE_LIVE_TESTS` override through; turbo then stopped before `@twt/api`. Run
directly on the same database: that spec with the override (`twt_6_35` is a throwaway this session created) 3/3, and
`pnpm turbo run test --force --concurrency=1 --filter=@twt/api` 177 files / 2079 passed + 1 skipped. Integration totals: domain
6139 + 1 skipped, jobs 1396 + 3 skipped (+ the 10.23 spec 3/3), api 2079 + 1 skipped. Every new leg RED against the pre-change code
or a mutant — (c), (d), (e). ⚠ For the reviewer: the :5433 LOCKSTEP and integrity-check failures are environmental, ⛔ hidden; they
recur on :5433 until 6-36d's 0180 lands (or is rolled back there) and the chain is pruned.

### Completion Notes List

- ✅ AC1 / AC3 — migration 0179 (two `members` columns, the pings' `locale` with its freeze + written-once arm, both `locale_source`
  CHECKs widened — reminders also `pariwar_fallback`); `resolvePeerRequestLocale` per RECIPIENT; W8's literal gone (W8 is "being
  built" until `done` on `main`).
- ✅ AC2 / AC9 — `GET` / `PUT /api/v1/member/language`, audited after commit and only on a change; a GET-only member stays NULL.
- ✅ AC4 — the text per recipient; a language whose TEXT template is unusable WAITS (⛔ the other language); the Pariwar held only on a
  non-template gap, its own default's read fault, or both unusable.
- ✅ AC5 — the reminder per recipient; `-385`'s fallback for a chooser; a reminder with ⛔ usable template at all waits.
- ✅ AC6–AC8, AC10 — the phone store, the sync (races closed), the screen, the home entry, the login switch, the copy (BigDev's Hindi).
- ✅ AC11 — `preferredLanguage` in the export. ✅ AC12 — (g). ✅ AC13 — `-387` alone (`def04547`) before records (`d671aba7`) and code.
- ✅ AC14 — (h): green on a fresh :5434 database, with the one guard-refused spec and the unreached API suite run directly.
- ✅ AC15 — the claim-contact step pinned to Hindi; the render gate HELD.
- Open, ⛔ closed by this row: PM22's display half (LS4 (b)) and every other sender's language — the deferred item; the minor
  alert-line edge in (e); the :5433 environment notes in (h).

### File List

**New:** `packages/domain/migrations/0179_member-preferred-locale.sql`, `packages/domain/src/member/preferred-locale.ts`,
`packages/domain/tests/integration/member/preferred-locale.spec.ts`, `packages/contracts/src/member-language/{index,language}.ts`,
`packages/contracts/tests/member-language.test.ts`, `apps/api/src/modules/member-language/{index,routes,handlers}.ts`,
`apps/api/tests/integration/member-language/member-language.spec.ts`, `apps/mobile/lib/app-language.ts`,
`apps/mobile/app/(settings)/language.tsx`, `apps/mobile/components/settings/LanguageSettingsEntry.tsx`,
`apps/mobile/tests/unit/{app-language,language-screen-render,language-copy-keys,language-source-pins,contact-language-pin-render}.test.ts`.

**Modified (code / tests):** `packages/domain/migrations/meta/_journal.json`, `packages/domain/src/schema/{members,claim_peer_mesh_pings,claim_peer_mesh_wa_reminders}.ts`,
`packages/domain/src/member/index.ts`, `packages/domain/src/claim/{peer-mesh-request,peer-mesh-wa-reminder}.ts`,
`packages/domain/src/data-export/assemble.ts`, `packages/domain/tests/integration/claim/{peer-mesh-request,peer-mesh-request-concurrency,peer-mesh-wa-reminder,peer-mesh-wa-reminder-concurrency,peer-mesh-wa-reminder-record}.spec.ts`,
`packages/domain/tests/integration/rls/claim-peer-mesh-replies-policy-regression.spec.ts`, `packages/domain/tests/integration/data-export/data-export.spec.ts`,
`packages/contracts/src/{index,data-export/data-export}.ts`, `packages/contracts/scripts/emit-openapi.ts`, `openapi/v1.yaml`,
`packages/api-client/src/index.ts`, `apps/api/src/{server,audit/audit-sink}.ts`, `apps/api/src/modules/wa-opt-in/code-delivery.ts` (comment),
`apps/api/tests/integration/claims/peer-request-after-send.spec.ts`, `apps/jobs/src/scheduler/{claim-peer-mesh-requests,claim-peer-mesh-wa-reminders}.ts`,
`apps/jobs/src/scheduler/{moderation-notify,contribution-notify-triggers}.ts` (comments), `apps/jobs/tests/{claim-peer-mesh-requests-live,claim-peer-mesh-wa-reminders-live,claim-peer-mesh-wa-reminders,claim-contact-ladder-whatsapp,data-export}.test.ts`,
`apps/mobile/app/{_layout,(auth)/login,(claim)/contact,(tabs)/index,(settings)/_layout}.tsx`, `apps/mobile/lib/session-context.tsx`,
`packages/i18n/locales/{en,hi}/common.json`, `microcopy.yaml`, `friction-budget.md`.

**Modified (governance / records):** `.decision-log.md` (`-387`; `-385`'s separator restored at the rebase), `_bmad-output/planning-artifacts/epics.md`,
`_bmad-output/implementation-artifacts/{deferred-work,sprint-status.yaml,6-35-in-app-language-switch,6-27-peer-mesh-sending-replies-and-date-of-death,6-27c-peer-mesh-sending-texts-and-links,6-31-peer-mesh-whatsapp-reminder-at-48-hours,6-37-msg91-sms-gateway-adapter,3-3c-member-kyc-name-english-only,5-10-signup-whatsapp-opt-in-checkbox,5-13-whatsapp-code-for-another-phone,6-30-app-links-open-the-app-from-a-text}.md`,
`docs/launch-gate-inventory/{inventory-roster,dlt-template-requests-6-19}.md`. Outside the repo: the memory `project_mobile_app_no_language_switch` and its `MEMORY.md` line.

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-22 | 1.0 | Created via `bmad-create-story 6.35` at `b883dc15` — three read-only research passes (governance trace; mobile i18n; server language reads + precedents). LS1–LS14 PROPOSED; ⛔ Panel routing owed (§0). Status ready-for-dev. |
| 2026-10-22 | 1.1 | Validated (`bmad-create-story validate 6.35`; three read-only verifiers — governance / server-domain-jobs / mobile-client; BigDev "all"). Critical: LS10 rewritten with ⛔ ⭐ — the DLT id is GLOBAL (6.37 AC9 (a) reversal under (a)), a hold drops as well as delays, `-303` / WR6 per-locale refusal ⇒ §0 edge (ii) decided at Task 0.2 with LS10; the reminder resolves per recipient INSIDE the begin (both template names in config); LS15 / AC15 added — `contact_locale` is the filer's screen language (claim-contact family + `hindi_not_reviewed`); numbers re-stated (≥ `-384`, ledger ≥ `ae`, 6-36d's 0179 race). Also: freeze row 10 + UX `:554/:718/:1126` (Pattern 12 mis-cite), edge (i) as the author's reading, `-382` KB6 as LS14 (b), stale records (DLT sheet, R11, WR7, 5-13, two code comments), F22–F24, explicit tenant predicates (jobs BYPASSRLS), pre-6.35 re-claim writes the Pariwar default, guard full body + written-once arm, LS2 audit-after-commit / rate-limit precedent, the export paths, a11y shapes and mock forwarding, sync races, `pnpm i18n:check`, route / clear-path source tests. ⛔ Code. |
| 2026-10-22 | 1.2 | Re-validated (a fresh-context read-only verifier on the v1.1 edits; BigDev "re-validate once then commit"). Critical: LS10 (b) rewritten so it IS the MATCH §0 (ii) says — both locales resolved, the Pariwar held only on a non-template gap or both unusable, a recipient waits only on their OWN language's gap (`:954`'s English-Pariwar half flips; the refused-vs-unset split needs a config value or merges; the starving-claim cost and a skip / back-off); LS15 (b) no longer pins the submitted `locale` alone (it is also the agreement evidence, `claims.contact.handlers.ts:132-133`) — the contact screen renders in Hindi instead, with (b′) a body split. Also: the hold mechanism corrected (an unsent text stays `not_sent`; an un-begun reminder gets ⛔ row); WR6 "as built" is a Pariwar hold on the refused locale; `-303`'s not-covered clause labelled ⛔ ruled; I1 kept by dropping a null pending from an earlier app process (⭐); freeze row 10 both sides; LS7 a departure from UX `:554` argued under `:1126`; F19 bare `.select()`; the render mock gains `XStack` / `onPress`; six line pointers; W8 closure wording; AC3 cross-Pariwar leg throws; T3; Task 4 header. ⛔ Code. |
| 2026-10-22 | 1.3 | BigDev's direction (verbatim in the story): the §0 GATE RESOLVED as a G1–G9 table (each ratified text quoted verbatim, each MATCH on the direction) ⇒ ⛔ routing note owed, with named re-open conditions; the LS4 / I2 contradiction resolved by LS4 (b) ⭐ — Hindi until the member picks, the Pariwar default ⛔ displayed — so I2 holds as written (one phone-setting qualifier; PM22's display half recorded open); LS10 (b) ⭐ with the unavailable-template states DEFINED (T0 usable / T1 unset / T2 pre-flight failed / T3 refused — DLT-rejected ⇒ S4 STOP, Meta-refuses merged with unset / TX read fault = a non-template hold), WAIT defined with ⛔ DB write (listing exclusion, `waiting_template` begin result, the park's locale filter, the alarm), AC4 (i)–(xi) / AC5 rewritten; LS15 (b) ⭐ as the interim behaviour behind AC15's agreement-language render test (label = `hi` `contact.agreement`, other strings `hi`, request `locale: 'hi'`, + the existing `claim-contact-copy.test.ts` lockstep) — a failing test STOPS, ⛔ silent fallback; the Policy-meaning member sentence settled; Task 0.2 confirms rather than re-opens. ⛔ Code. |
| 2026-10-23 | 1.4 | Validated (`bmad-create-story validate 6.35`) against `origin/main` `69e35f73` (3.3c + 8.15 landed; 6-36d's `-384` committed): three fresh-context read-only verifiers (governance / server-domain-jobs / mobile-client), 40 findings, BigDev "All 40", the CRITICALs re-checked against code and the log before editing. Critical: (1) the §0 gate's G5 / G6 were false for a member who picks a language other than their Pariwar's — LS10 (b) would take away their reminder (Meta refuses — Row 35 (b)) and, past the window, their text (T2), narrowing `-303` Q1 A; LS10 (c) narrows the rider ⇒ the Panel's (`-295` §0). BigDev, told the fallback can only be the Pariwar's language and that a wait is brief for the text but permanent for the reminder: *"yes, write it that way"* ⇒ PQ1 routed NON-BLOCKING (note drafted, ⛔ sent; our reading A), the reminder built B until ruled, LS10 (b′), G10 / G11 added, Row 35 (b) gains the leg; (2) the text WAIT for an `attempting` ping rewritten — the park alone does ⛔ stop a re-send (a parked row is re-claimed at once; the park covers held scopes only): park over every scope + the listing's `attempting` arm + the begin check on both paths (F25); (3) the reminder re-claim — `parkPeerMeshWaReminder` needs the marker set and `config:*` is ⛔ a detail ⇒ `waiting_template`, ⛔ write, `skipped_late` past +72 h (F26); (4) AC15 (3) asserts on `claimApi.recordClaimContact`, with the harness spelled out; (5) numbers (≥ `-385`, ledger ≥ `2026-10-23k` — 6-36d took `h`–`j` during the pass; 6-36d committed and rebased onto `main`). Also: TX per locale for the global DLT keys; `wa_template_unreadable` / `wa_template_invalid` (T1′); NULL-safe listing; the text alarm's count read; the reminder SWEEP listing named and `seenClaims`; `:954` precisely + AC4 (iv′); serial single-flight with compare-and-clear; AC8 legs (T8, account switch); `syncAppLanguage` takes `setLocale`; Ravi-mode (the claim flow is the deceased's session; the Nominee Console IS the member app); `consent.tsx` ⛔ pinned + the mixed-language cost; `processId` required; AC2's raw audit sink + the forced-COMMIT precedent; `hook: 'preHandler'`; both-platform announce precedent; T14 `Stack.Screen` / `Platform`; `contact.tsx` enrolment + allow entry; Task 0.3 AMENDS WR7 / MG5 and NARROWS PM22; Policy meaning; G3 / G9 qualifiers; UX `:1127`; stale records (3-3c, MEMORY.md); line refs that moved on `main`; quote attributions. ⛔ Code. |
| 2026-10-23 | 1.5 | The Panel RULED PQ1 — A (relayed by BigDev: *"by DR and KB"* / *"go with option A"*) ⇒ Decision `2026-10-23-385` (Trustee-ratified, committed alone `73183745`): when the reminder cannot go in the member's chosen language it goes in the Pariwar's. LS10 (b′) built as A now (the interim B ⛔ built): the reminder begin falls back for a CHOOSER whose Pariwar's template is usable, `locale_source = 'pariwar_fallback'` on the REMINDERS' CHECK only (LS9 — its own `PEER_MESH_WA_REMINDER_LOCALE_SOURCES`); a reminder waits only when it has ⛔ usable template at all; AC5, Task 3.2, I4, G5, the §0 verdict, the Policy-meaning sentence (bracket settled), Task 0.1 S3 / 0.2 / 0.3 (cites `-385`; next free ≥ `-386`) / 0.4 (Row 35 (b) leg — ruled) and AC13 follow. The note's ruling block filled; everything below it kept as put. ⛔ Code. |
| 2026-10-23 | 1.6 | A fresh-context re-validate of the v1.4 + v1.5 edits (one read-only verifier, top-down and bottom-up; BigDev "run one more fresh-context check"): 1 CRITICAL / 8 SHOULD / NITs, BigDev "All". Critical: the reminder fallback had ⛔ source for the Pariwar's default — `member_choice` cannot tell a chooser OF the default (waits) from a chooser of the other (falls back) ⇒ the sweep listing, the config and LS8's resolver carry `pariwarDefaultLocale`, and LS10 states the rule in one line. Also: the sweep's `gapOf` memo keeps the template set; the reminder's waiting count is taken before the `seenClaims` short-circuit and gets a NEW alarm line (the sweep has ⛔ per-locale alarm); AC3's type pin split (the resolver two values, a new reminder pin three; `$type` at `:89` moves); a TX on the OTHER reminder key is treated as T1 (BigDev "Treat it as unset"); G2 / G10 / the rulings table carry `-385`; AC13 G1–G11; ledger letters (6-36d took `m` during the pass; v1.6 `n`, next ≥ `o`); `-385` gained a dated correction line (BigDev "Dated correction line" — `-310` CF1 A gives with the rider for the reminder; committed alone `89961ab3`); NITs (policy sentence, LS9, AC5 chooser wording, `LEFT JOIN`, the templates' gap kept, AC15 `onChange`, the `-384`/`-385` log order, LS13). ⛔ Code. |
| 2026-10-23 | 1.7 | `bmad-dev-story 6.35` — Task 0: rebased onto `origin/main` `69e35f73` (SHA map in Debug Log (a)); F1–F26 re-derived (all hold); S2 fired (6-36d) — BigDev *"Proceed in parallel"*; Task 0.2 answered (direction confirmed, all as recommended, LS14 (b) Hindi approved); Decision `2026-10-23-387` committed alone (`def04547`); records committed. Status → in-progress. |
| 2026-10-23 | 1.8 | `bmad-dev-story 6.35` — Tasks 1–6 done: code `c07f64ae` (schema + the one read), `0cb287d0` (API), `1c64d4f5` (senders), `aae29012` (app), `0f8bc720` (export), `bfe5ff0a` (friction row); Debug Log (b)–(h) (RED proofs, the :5434 gate and why ⛔ :5433); Task 6.3 dated notes (5-10, 6.30, 6.27c ×2, 5-13; `-310`'s reading ⛔ annotated — a decision entry is ⛔ edited, `-387` §2 records it); memory updated. Status → review. |
