---
baseline_commit: 34b9bab6
---

<!--
⭐⭐ MERGED 2026-10-12 as PR #275 (REBASE-merge, branch `story/6-34-sms-templates-typed-variables` → `main` at `64fdb74b`) — THE SHA MAP
for every commit of Story 6.34. GitHub's rebase-merge rewrote the 17 branch commits (on `main` `09321738`; PR head = branch tip
`6aeca43b`) ONCE. The citations — in THIS file (the header's `-313` / `-314` / `-322` / `-323` SHAs, the Change Log's re-validate SHAs, the File
List's `25e7bba5`, the review records' `548c5a1d` / `ba08558f`), in `sprint-status.yaml`'s ledger (`25e7bba5`) and in `.decision-log.md`'s `-323` Occasion (`79d9d440`)
(grepped on `main` 2026-10-12; ⛔ other file cites one) — each cites the ORIGINAL branch SHA and is kept AS WRITTEN (the record); this maps
every commit to its `main` twin, PROVED ⛔ never assumed:
  · every pair has an identical subject AND an identical `git patch-id --stable` (17 / 17 — ⛔ ledger conflict: ⛔ re-application stopped);
  · the merged tree is byte-identical to the PR head — tree `e36cd413` both — which passed `ci:local` 36/36 and CI 36/36 (the `test` job
    re-run once after a 10-minute `timeout-minutes` cancel, ⛔ a failure).
Negative control: a WRONG pair (the 1st branch commit vs the 2nd `main` commit) DIFFERS on the patch-id.
  · `6cd40412` → `35c5a39d`  story(6.34): created for dev — every SMS template carries TRAI's typed
  · `07be6307` → `9031689a`  story(6.34 v1.1): the PE registers on STPL (SmartPing) — the text keep
  · `9b22e69d` → `d290cadf`  governance(6.34): 2026-10-10-313 — author-commit of 6.34's TV1–TV12, a
  · `5c2fca05` → `326a3756`  story(6.34 v1.2): -313 applied — Tasks 0.2 / 0.3 done, buildable; spri
  · `b7ebf48f` → `835280a5`  governance(6.34): 2026-10-10-314 — author-commit: the SMS gateway is M
  · `ad057f50` → `1d1ccdab`  story(6.34 v1.3): -314 applied — the gateway is MSG91 "for now"; TV13
  · `31fe84d8` → `5cd611ba`  governance(6.34): 2026-10-12-322 — author-commit after the first valid
  · `79d9d440` → `4be543d7`  story(6.34 v1.4): first validate — rebased onto main 09321738; -322 ap
  · `2b938bc6` → `1f4de077`  governance(6.34): 2026-10-12-323 — author-commit: a reading on -322 af
  · `df5bcce9` → `7c2c0edb`  story(6.34 v1.5): round-1 re-validate applied with -323 — barrel expor
  · `f28061e0` → `c74a3962`  story(6.34 v1.6): round-2 re-validate applied — the Policy meaning and
  · `4b847818` → `1b30867e`  story(6.34 v1.7): round-3 re-validate — 0 BLOCKER / 0 HIGH, the rounds
  · `25e7bba5` → `119d7d46`  governance(6.34): Task 0.4 records — epics.md Story 6.34; roster Row 3
  · `548c5a1d` → `97808e99`  story(6.34): build — one typed-variable vocabulary (dlt-variables.ts);
  · `ba08558f` → `7a488a12`  story(6.34): code review, two passes — review → done. Pass 1 (3 patche
  · `cccd469f` → `914a6252`  story(6.34): code review, third pass (the review-fix commit ba08558f)
  · `6aeca43b` → `64fdb74b`  chore: keep the decision-flow presentation artefacts local — ignore .c
Re-verify (bash): `diff <(git show <orig> | git patch-id --stable | cut -d' ' -f1) <(git show <main> | git patch-id --stable | cut -d' ' -f1)`.
⚠ The ORIGINAL SHAs survive only while `origin/story/6-34-sms-templates-typed-variables` does (head `6aeca43b`). The PRE-REBASE SHAs this
file and the sprint ledger cite (`97e2c3bb`, `e2d57ed9` — v1.4's rebase onto `09321738`) survive only while `origin/backup/6-34-pre-rebase` does (pushed
2026-10-12 from the local tag of that name, head `d6e8d622`).
-->

<!--
⭐ PINNED 2026-10-10 (`bmad-create-story 6.34`) to `main` at `34b9bab6` (the PR #268 SHA-map commit). Every `file:NNN` below is AS OF
`34b9bab6`, derived by three read-only research passes (the code inventory of every SMS template and its send path; TRAI's typed-variable
rule — the Direction, the regulations and the operators' manuals, fetched 2026-10-10; the governance and planning trail) and spot-checked
by hand (F14 / F15 / F17 / F18 re-read directly).
⭐ v1.1 (2026-10-10, BigDev in session): *"We will use STPL, and [STPL] uses {#var#} for variable"* — the PE registers on **STPL**
(Satzilio Telecom Pvt Ltd, ex-V-Con / Videocon — the **SmartPing** DLT portal, `smartping.live`). On SmartPing the template TEXT keeps
`{#var#}` and each variable's TYPE is chosen in a separate tagging section (MSG91's carrier guide; F3). ⇒ the texts in code and in the
sheet are ⛔ retagged; each `{#var#}` gains a DECLARED TYPE. TV1–TV4, TV7, TV8, TV10 (a), TV11 rewritten; the rest stands.

⭐ v1.4 (2026-10-12, `bmad-create-story validate 6.34` — the story's FIRST validate): the branch was REBASED onto `main` `09321738`
(6.30 and 6.28 had shipped; the six story commits' +/- lines byte-identical; the old tip kept as tag `backup/6-34-pre-rebase`) ⇒ every
`file:NNN` below is re-derived AS OF `09321738` (`34b9bab6` is still an ancestor; the code files this story cites are ⛔ moved since it,
except `ci.yml` / `ci-local.sh` — F18). Four fresh-context read-only verifiers (code claims; governance staleness; the TRAI / MSG91
premise + the shape rule over every real text; design). FOUND: TV5's premise false (one of four send paths has a hold) ⇒ BigDev chose
"alarm only" ⇒ `2026-10-12-322` C1–C9 (alone) — see the Change Log.

STATUS: `done` (built `548c5a1d`; code-reviewed twice 2026-10-12 — see Review Findings; roster Row 30 stays `open` for the external evidence). Was BUILDABLE because: TV1–TV12 answered by BigDev (all as recommended) and committed ALONE as `2026-10-10-313`
([[feedback_governance_commits_precede_implementation]]); TV13 + the gateway (MSG91 "for now") committed as `2026-10-10-314`;
corrections C1–C9 (TV5 SUPERSEDED) committed as `2026-10-12-322`; its reading R1–R2 as `2026-10-12-323`. (Rebased SHAs: `-313`
`9b22e69d`, `-314` `b7ebf48f`, `-322` `31fe84d8`, `-323` `2b938bc6`; the pre-rebase `97e2c3bb` / `e2d57ed9` survive only under the backup tag — cite the decision ids.) Build from Task 0.1 / 0.4
on (done). ⭐ Row `6-37-msg91-sms-gateway-adapter` builds the MSG91 adapter AFTER this story.
⭐ §0 gate (template `trustee-panel-routing-note-TEMPLATE.md`): every TV strips to "the code / the registration sheet should do X". ⛔ No
word of any Panel-ratified text changes — a variable's TYPE is registration metadata the member ⛔ never sees, and every rendered body stays
byte-identical (Invariant 1). TV5 (as `-322` C1) SENDS a text whose helpline is malformed exactly as today and raises a WARNING — ⛔ no
text is held, refused, spent or dropped, and ⛔ who / what / when is unchanged (⚠ one accepted residual, once operators enforce tags:
a malformed number's texts are rejected by the operator, and a rejection seen only in a delivery report is recorded `accepted` — `-323`
R2; Row 30 (c) is the control). (`-313`'s original TV5 — "treated exactly as unset" — would
have dropped the correction, closure and certificate texts, and changed D22's `reachedBySms` under the Trustee-ratified `-252`: that is
why it was superseded.) TV6 keeps the SMS alert fallback dark; it was ⛔ never live (⛔ no id was ever provisioned). TV9 fixes a FACTUAL
error in an OTP text that no Panel ruled. ⇒ ⛔ no routing note owed. ⚠ It BECOMES the Panel's if a TV is widened to (i) change any WORD
of templates 1–14, (ii) change who receives a text or when (incl. holding or refusing a send over the helpline's format), or (iii) turn
the alert SMS fallback ON with new wording for members. Trap 1 fences all three. ⚠ One Panel promise is carried: a provider refusal of
Hindi names goes BACK to the Panel (`-310`'s confirms note; TV10 (d)).

GLYPH REGISTER, ADDRESSING RULE: as 6.29 / 6.30 — `⛔` negates the word it precedes · `⭐` = emphasis / action · `⚠` = hazard.
⛔ No `file:NNN` into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files — cite the entry id / item / row).
TYPE SPELLING RULE (`-322` C2): outside REGISTERED TEXT (prose, doc comments, this file's own instructions to write prose) a TRAI type is
written WITHOUT braces — `#numeric#` or "numeric"; the braced form `{#numeric#}` appears only where it is quoted as a FOREIGN portal's
notation in this story file (which no gate scans).
LETTERS: `TV` = this story's build decisions (the author's); `C` = `-322`'s corrections; `F` = FOUND facts; `AL` = 6.30's (`-312`);
`PM` = 6.27's (`-311`); `RN` = 6.29's (`-302`); `RB` = 6.24b's (`-295`).
-->

# Story 6.34: Every SMS Template's Variables Are Typed for TRAI — One Vocabulary, a Gate, the Login OTP First `[GOVERNANCE]`

Status: done

> ⭐⭐ **WHAT THIS STORY IS, IN ONE PARAGRAPH.** TRAI's Direction of 18 Nov 2025 requires every variable in every SMS content template to
> be TAGGED with its type (`#numeric#`, `#alphanumeric#`, `#url#`, `#urlott#`, `#cbn#`, `#email#` — Annexure-I); a new template with
> the old untyped `{#var#}` is refused at registration, and once scrubbing has run 60 days a message failing the tag check is
> *"rejected outright and not delivered"*. Every SMS template in this repo uses the untyped `{#var#}` — **19 of them**: the login and
> step-up OTP (2), the alert registry's five whole-body entries (5), and 6.19 / 6.24b's twelve claim texts (12). ⛔ None has been
> submitted, so ⛔ nothing has to be migrated — they must be registered TYPED the first time. ⭐ The PE registers on **STPL's SmartPing
> portal** (BigDev, 2026-10-10), where the text KEEPS `{#var#}` and each variable's type is picked in a separate tagging section — so the
> work is ⛔ to rewrite texts but to give EVERY `{#var#}` a declared, checked TYPE that BigDev copies into that section. ⚠ The login OTP
> is the urgent one: an untyped OTP template means ⛔ nobody can log in (6.30 AL15 — Row 29 (e)'s logged-out leg waits for it). This
> story builds ONE typed-variable vocabulary in `@twt/channels`, declares the type of every variable of every template, checks each
> template against TRAI's shape rules, adds a CI gate so a variable can ⛔ never ship untyped, makes the registration sheet cover EVERY
> template (with the type to select for each `{#var#}`), and records the go-live row (Row 30) that only BigDev can close (only BigDev
> can submit on the DLT portal). ⭐ **⛔ No member sees any difference** — every rendered SMS body stays byte-identical, with one
> deliberate exception: TV9's handover OTP text, which today says *"Valid 5 min"* for a code that lives 3.

> ⭐ **What already ships and this story READS — rebuild ⛔ none of it:** the OTP registry `packages/channels/src/otp-sms-template.ts`;
> the alert registry `packages/channels/src/sms-dlt-registry.ts`; the composition seam `packages/channels/src/composition/provider-composition.ts`;
> the gateway client `packages/channels/src/providers/sms-app.ts`; the OTP adapter `apps/api/src/modules/auth/shared/sms-step-up-delivery.ts`;
> the claim registries `apps/jobs/src/scheduler/claim-correction-sms-templates.ts` and `suspicion-notice-sms-templates.ts`; the shared send
> core `apps/jobs/src/scheduler/claim-dlt-sms-send.ts`; the sweep `claim-suspicion-notices.ts`; the sheet
> `docs/launch-gate-inventory/dlt-template-requests-6-19.md`; the gate pattern `scripts/kyc-provider-boundary/`.

## Story

As **the Trust**,
I want **every SMS template we will register with the telecom operators to carry TRAI's typed variables — the login code first — and a
check that keeps it that way**,
so that **⛔ no member is locked out of the app, and ⛔ no notice the Trust owes a family is silently dropped, because an operator refused
a template or a message the day the rule began to bite.**

## The rulings and records this story builds on

| Source | Key (verbatim, abridged) | Status |
|---|---|---|
| **`2026-10-10-305`** §2 item 5 | *"`6-34-sms-templates-typed-variables` — every SMS template (the login and step-up OTP …; the alert registry …; 6.19's and 6.24b's twelve drafted templates; 6.27c's two) retagged with TRAI's typed variables (Direction of 18 Nov 2025 — `{#numeric#}` …; to be confirmed with the provider) BEFORE any is submitted — ⚠ an untyped login OTP template blocks every login"* — the notation is the in-text (Jio / Vi) form; on SmartPing it is a per-variable type (`-313` FOUND (a)), which the ruling's own *"to be confirmed with the provider"* allows | author-commit (BigDev) — THIS ROW |
| `2026-10-10-305` §4 | roster Rows 27 / 28 / 29 RESERVED (6.27 / 6.27 / 6.30) — Row 29 since WRITTEN by 6.30 (`app-links-live`); 27 / 28 still reserved | author-commit ⇒ this story's row is **30** |
| **`2026-10-10-313`** · **`2026-10-10-314`** | TV1–TV12 as recommended; the SMS gateway is MSG91 *"for now"*; NEW row `6-37-msg91-sms-gateway-adapter`; TV13 (slot names) | author-commit (BigDev) — THIS STORY's |
| **`2026-10-12-322`** | C1 TV5 SUPERSEDED (sent + alarmed, ⛔ held / refused); C2 the gate's rules (i)–(iii); C3 6.30's sheet bullet answered; C4 TV9 one-way; C5 `otp`; C6 6.27c waits for 6.34; C7 the `-310` promise; C8 TV6's proof; C9 facts re-read | author-commit (BigDev) — THIS STORY's |
| **`2026-10-12-323`** | R1 C1's warning: the core FLAGS, each caller LOGS; R2 C1's cost widened — a delivery-report-only tag rejection is recorded `accepted` (on the correction chase, D22 counts the family reached) — a pre-existing gap for every DLT rejection, RECORDED, accepted | author-commit (BigDev) — THIS STORY's |
| `2026-10-10-310` (+ `trustee-panel-routing-note-2026-10-10-6-27-confirms.md`) | the note told the Panel: *"We will confirm with the provider before go-live; if it refuses Hindi names, we will come back to you"* | a promise made to the Panel in that note's FYI section (⛔ itself what `-310` ratified — `-310` ruled CF1–CF5); this story carries it (TV10 (d), `-322` C7) |
| `2026-09-27-252` · 6.19c D22 | before a claim is closed for silence, "reached" means the network ACCEPTED a reminder (`reachedBySms`) | ⭐ Trustee-ratified — ⛔ moved (why `-322` C1 never holds or refuses) |
| BigDev 2026-10-10 (in session, on v1.0) | *"We will use STPL, and [STPL] uses {#var#} for variable"* — the PE's DLT portal is STPL's SmartPing | BigDev's fact — recorded in the Task 0.3 author-commit |
| `2026-10-10-312` AL15 | the typed-variable rule is a POINTER to this row; Row 29 (e)'s logged-out leg waits for the OTP retag | author-commit (6.30) |
| `2026-10-10-311` PM3 | 6.27c's two templates are registered TYPED from the start: `{member}` = `{#alphanumeric#}` (≤ 40), `{link}` = `{#url#}`, `{helpline}` = `{#cbn#}` | author-commit (6.27) |
| `2026-10-08-295` RB1 / RB11 / RB12 | templates 7–12 byte-match the DLT content; *"⛔ do not provision the ids of 7–12 until Row 22 closes"*; a config gap ⛔ spends no notice (RB12's POLICY; its mechanism superseded in part by `-302` RN2) | author-commit (6.24b) |
| `2026-10-10-302` §1 (c) / RN2 / RN5 | on the SUSPICION sweep only, a config gap HOLDS per (purpose, Pariwar); the `detail` vocabulary is a FIXED grammar CHECKed by the DB (0155 + `suspicion-notice.ts`) | author-commit (6.29) — ⛔ moved |
| `-262` FQ7 B · `-291` Q2 B · `-293` item 1 B · `-255` · `-259` | WHO is texted, WHAT the claim texts say, WHEN | ⭐ Trustee-ratified — ⛔ moved (Invariant 1) |
| Story 5.9 (BigDev 2026-07-07) | TWO OTP templates keyed by intent, each with its own TTL wording (login 5 min, step-up 3 min); prod FAILS STARTUP without either id | recorded in the 5.9 file — ⛔ moved |
| Story 5.6 (BigDev 2026-07-06) | the alert registry's v1 category set (the five per-member transactional categories) | recorded in the 5.6 file — TV6 keeps the set, makes it truthful |
| Architecture §2.2 / §3.4 · AR-21 · AR-56 · PRD `prd.md` §TRAI | OTP by DLT-transactional SMS; SMS's three preserved surfaces (OTP, step-up OTP, per-member fallback) | binding — F10 records that (iii) is unregistrable as built |

## ⭐ THE INVARIANTS

1. **⛔ No member-visible change** — every rendered SMS body (OTP, claim correction, certificate, suspicion) is byte-identical before and
   after, EXCEPT TV9's handover selection (it then reads the step-up wording, which already exists). The existing `toBe` pins prove it.
2. **⛔ No registered text changes at all** — on SmartPing the text keeps `{#var#}` (v1.1); the TYPE is declared beside it. ⇒ ⛔ no
   Hindi re-review (Rows 20 / 21 / 23 untouched), ⛔ no i18n key or copy change (`packages/i18n/locales/*/claim.json` is ⛔ edited).
3. **ONE vocabulary** — the six TRAI Annexure-I types live in ONE module (`packages/channels/src/dlt-variables.ts`); every template and
   the gate import / mirror it; ⛔ a second list anywhere ([[feedback_stub_must_call_not_transcribe]]).
4. **Every `{#var#}` has exactly one declared type, in order** — a template whose `{#var#}` count ≠ its declared `slots` fails its
   registry test; a file under `apps/*/src/**` / `packages/*/src/**` that holds `{#var#}`, the identifier `DLT_VAR` or the literal
   `sms.dlt.template_id.` but is ⛔ a known, shape-tested registry fails the gate (TV7 rules (ii) / (iii)); and ⛔ any OTHER braced tag
   (the Jio / Vi in-text forms) appears in REGISTERED text — on SmartPing a typed tag IN the text would, by inference (⛔ a source says
   so), be registered as literal text and never match.
5. **⛔ No new `detail` code, ⛔ no migration, ⛔ no CHECK change** — the `detail` grammar (migration 0155's CHECKs mirroring
   `packages/domain/src/claim/suspicion-notice.ts`'s `suspicionNoticeDetail`; 0138 / 0151 carry ⛔ CHECK on `detail`) stays as 6.29 left
   it. TV5 (`-322` C1) adds ⛔ outcome at all — only a log line.
6. **⛔ No template id, helpline or secret is set** — provisioning stays behind each template's own roster row (Rows 18–23, 27, 30).

## 📜 Policy meaning (AI-10-1)

**This story introduces ⛔ no predicate and changes ⛔ none that gates a member's access to a benefit.** It changes how templates are
labelled for the operators, in TV9 sends the claim-handover code with the step-up wording (*"Valid 3 min"* — the code's real life), and,
in TV5 (`-322` C1), LOGS a warning when a Pariwar's helpline is not in callback-number form — the text
is still sent, to the same person, at the same time, with the same words. In TV6, the five alert categories' per-member SMS fallback (architecture §3.4 (iii)) is kept OFF in code — `resolveDltTemplate` returns `null` for them even if an id were provisioned, and composition falls to the fixture exactly as today (⛔ id was ever provisioned, F10) ⇒ ⛔ alert a member receives changes. ⚠ This is deliberate: `-313`'s original TV5 (treat a malformed
number as unset) would have held or refused claim notices and changed the input of D22's `reachedBySms` — the "reached" test the
Trustee-ratified `-252` closure-for-silence reads — which IS a predicate on a family's claim; `-322` C1 was chosen so that ⛔ none
moves through this story's code. ⚠ (`-323` R2 — RECORDED, accepted) once operators enforce tags, a Pariwar whose helpline is not in
callback-number form has its texts REJECTED by the operator until staff fix the number; if that rejection is reported only in a delivery
report (this repo reads ⛔ delivery report), the send is recorded `accepted` and, on the correction chase (templates 1–2), D22 counts the
family reached — a PRE-EXISTING gap for every DLT rejection cause, ⛔ created here; Row 30 (c) (every helpline checked and whitelisted
before any id is provisioned) is the control. In the member's terms: *"the texts the Trust sends you say exactly what they said before (except the
claim-handover code's text, which now says it is valid 3 minutes — as it is), and are sent exactly when they were before (and the SMS fallback for alerts stays off, as it has always been); they reach you once the operator accepts them (Row 30)."* Niyamavali check: ⛔ not applicable (the Niyamavali does not speak to SMS
templates) — and it is ⛔ not ratified ([[feedback_niyamavali_rulebook_not_spec]]).

## ⭐ FOUND FACTS (each ⇒ the TV it feeds)

**The rule (fetched 2026-10-10, re-fetched 2026-10-12 by the v1.4 validate — re-check at Task 0.1):**
- **F1 — the Direction** (TRAI, F.No. D-27/1/(2)/2024-QoS, 18 Nov 2025, to all Access Providers; PR No. 133): para 8 (a) every variable
  *"pre-tagged … as per Annexure-I"*; (b) scrubbing *"within thirty (30) days from the issuance"* (~18 Dec 2025); (c) new templates
  registered only if compliant *"after ten (10) days"* (~28 Nov 2025; operators cut new-template registration over on ~14 Jan 2026 —
  SECONDARY sources only); (d) existing templates modified within 60 days of scrubbing starting; (e) *"During the initial sixty (60) days
  … logger mode … After expiry … any message failing variable tag validation shall be rejected outright and not delivered"*. ⚠ Vi's
  manual (PDF dated 2026-09-28): *"As of now, nothing will be dropped … logger mode … will be enabled as per a timeline that will be
  communicated separately"*; ⛔ source gives a SmartPing / Tata rejection date ⇒ the date it bites is ⛔ known — do ⛔ plan on it being
  late. ⇒ TV10 (e).
- **F2 — the six types (Annexure-I):** `#number#/#numeric#` digits only; `#alphanumeric#` letters + digits, *"Special chars … will be
  allowed in scrubbing … Not more than 40 Characters"* (TRAI's purpose: *"ticket IDs, booking IDs"*); Vi's example value is *"11B Worli
  Mumbai"* — WITH spaces; Jio: *"Special characters are permitted"*; only MSG91's help page paraphrases *"no special characters"*
  (secondary, one row for every operator); SmartPing's manual is silent; ⛔ source addresses Devanagari. `#url#` and `#urlott#` validated
  against registered CTAs; `#cbn#` validated against a registered callback NUMBER; `#email#` email regex. ⛔ No date type. Length
  ceilings: alphanumeric 40 = TRAI; numeric / email 40, url / urlott 120, cbn 3–14 = Vi's manual ONLY (Jio: "Not Applicable" for
  cbn / email / url / urlott). ⇒ TV1, TV4.
- **F3 — the SPELLING differs per DLT portal:** TRAI writes `#number# / #numeric#`; Jio's portal inserts `{#number#}`
  (`{#alphanumeric#}`, `{#url#}`, `{#urlott#}`, `{#cbn#}`, `{#email#}`); Vi uses `{#num#} {#alp#} {#urg#} {#uro#} {#cbn#} {#eml#}`;
  SmartPing / Tata: *"Variable tags are **not appended in the template text** … variables must be tagged in the designated variable
  tagging section provided on the DLT portal during template registration"* (MSG91, `msg91.com/help/dlt-registration-in-india/
  variable-tagging-on-dlt-sms-templates`, re-fetched 2026-10-10). ⭐ **BigDev (2026-10-10): the PE uses STPL** — Satzilio Telecom Pvt Ltd
  (ex-V-Con / Videocon), operator of the SmartPing DLT portal `smartping.live` (authkey.io's *"Smartping DLT Registration (STPL
  Videocon)"*; STPL's consumer charter on `smartping.live`) — *"and [STPL] uses {#var#} for variable"*. ⇒ the text keeps `{#var#}`; the
  type is a per-variable SELECTION. ⭐ PRIMARY (v1.4): STPL's own manual (`https://smartping.live/entity/assets/img/newHelpImg/pdf/
  Content%20Template.pdf`): *"click on Add variable … The Entity has to pre-tag the each variable from given options, and enter the sample
  value"* — confirms per-variable tagging; that the text keeps the literal `{#var#}` is SECONDARY (MSG91: *"each Variable should be
  written as {#var#}"*) + BigDev. ⚠ The exact labels in SmartPing's tagging section (e.g. "Numeric" vs `#numeric#`) are only in the
  manual's images, ⛔ seen in the repo — Row 30 (a) records them with a screenshot. ⇒ TV1, TV8, TV10 (a).
- **F4 — shape rules:** ≥ 30 % of a template FIXED — TCCCPR 2nd Amendment, 12 Feb 2025, Sch.-I item 4(3) (j)(iii); ⚠ on its face a
  CONDITION of (j) (*"more than three variables"*), generalised by the explanatory memorandum ¶25 (*"a minimum of 30% of each template's
  content must remain fixed"*) ⇒ applying it to every template is the CONSERVATIVE reading. A whole-body variable is ⛔ registrable on
  the 40-character ceiling alone. ≤ 2 variables, a THIRD *"in case of exigency"* (Feb 2023 Direction, quoted in the 2025 one ¶4; Vi:
  *"more than 3 variables require justification"*); variables *"non-contiguous and not separated with space, comma and/or any other
  special characters"* (TRAI) — consecutive only when alphanumeric (Vi, Jio); per-variable limit 40 (Annexure) vs 30 (regulation (k)) —
  a conflict. ⚠ MSG91's FAQ (secondary, undated): *"a Variable cannot be the last word of the Content Template"* — templates 8, 10, 12
  and 6.27c's English end `… helpline {#var#}.` (a trailing full stop) ⇒ asked at Row 30 (d). ⇒ TV1, TV6, TV8.
- **F5 — `#cbn#`:** Vi: 3–14 characters, *"No special characters"*, *"If a country code is used (for example +91), the country code must be
  part of the fixed / static text"*; the CTA is whitelisted (mobile `91` + 10 digits; landline `0…`; toll-free `1800` / `1860`, 8–13). ⇒ TV5.
- **F6 — OTP:** numeric; category **Transactional** (2025 regulation: *"OTP from … apps login"*) — resolves 6.30's open *"Transactional vs
  Service Implicit"*. Leading zeros (`048213`) are ⛔ addressed by a primary source (digits-only implies they pass). ⇒ TV3, TV10 (d).
- **F7 — the wire:** senders submit the template id + the FULLY RENDERED body; the operator scrubs the body against the template (Exotel,
  Jio). This repo does exactly that — `sms-app.ts:136-144` (`buildRequestBody`) builds `{ sender, to, template_id, message }`,
  `:200-208` posts it ⇒ **the tag is ⛔ on the wire**;
  retagging changes ⛔ nothing a gateway receives. ⇒ Invariant 1.

**The code (as of `34b9bab6`):**
- **F8 — the OTP marker is read at runtime in exactly ONE place:** `renderOtpBody` (`otp-sms-template.ts:80-82`) —
  `template.contentTemplate.replace(OTP_VAR_SLOT, code)` (first occurrence). ⚠ Change the marker in the texts without `OTP_VAR_SLOT` (or
  vice versa) and the code is ⛔ inserted — the SMS goes out with NO CODE. Since v1.1 the marker STAYS `{#var#}` ⇒ ⛔ this edit is
  needed; the hazard is recorded so ⛔ one "tidies" the marker into a typed tag (Trap 2). `:35` / `:42`'s `toBe` and
  `apps/api/tests/unit/sms-step-up-delivery.test.ts:100,130` pin the rendered bodies. ⇒ TV3.
- **F9 — the claim registries' `registeredText` and `DLT_VAR` are read ONLY by tests** — the runtime renders through the real `t()` with
  named params (`claim-correction-sms-templates.ts:93-100`, `suspicion-notice-sms-templates.ts:89-101`; the interpolator
  `packages/i18n/src/resolver.ts:33-43` matches `\{(\w+)\}` — `#` is ⛔ `\w`, so a typed tag could never be interpolated by accident).
  The lockstep tests use ONE shared token for every slot: `claim-correction-sms-templates.test.ts:71,73` (`replace(REF, DLT_VAR)
  .replace(HELP, DLT_VAR)`, `split(DLT_VAR)` length 3) and `:137-142` (two en literals); `suspicion-notice-sms-templates.test.ts:56-61`
  (`PANEL_EN` literals), `:84,86,101`. Since v1.1 (SmartPing keeps `{#var#}`) that single token is CORRECT and stays; what is missing is
  the TYPE of each slot — declared nowhere in code or sheet (the sheet's column says only *"Variable slots (`{#var#}`) — to confirm with
  the wording"*). ⇒ TV2, TV4.
- **F10 — the five alert-registry entries are WHOLE-BODY variables** (`sms-dlt-registry.ts:58-82`, `contentTemplate: '{#var#}'`). The body
  is `` `${heading}: ${line}` `` (`render.ts:152-153`): an English heading + an escaped, UNBOUNDED line (en day-14 subject > 110
  characters before `{pool}` / `{family}`; Hindi mixed with the English heading; `(` arrives as `\(`). ⛔ Registrable (F4's 30 % rule),
  and ⛔ typable (`#alphanumeric#` ≤ 40). `contentTemplate` is read by ⛔ nothing at runtime. The SMS rung IS reachable in code
  (`contribution-notify.ts:227-322`, `apps/jobs/src/boot.ts:572-602`; producers for four categories — `claim_status_change` has ⛔ none), but
  composition falls to the log fixture unless `sms.dlt.template_id.<category>` resolves (`provider-composition.ts:193-212`) — ⛔ none is
  provisioned ⇒ ⛔ no alert SMS has ever been sendable. Architecture §3.4 fire condition (iii) is therefore ⛔ deliverable as built.
  Tests that drive the REAL sms-dlt path through these categories: `packages/channels/tests/provider-composition.test.ts:194-204`,
  `contribution-provider-resolver.test.ts:35,114-115`, `apps/api/tests/unit/sms-composition.test.ts:70-80`; `sms.test.ts:252-276`
  pins the registry (size 5 at `:257`, key prefix `:269`). ⭐ v1.4: `resolveDltTemplate` → `null` returns BEFORE `resolveConfig`
  (`provider-composition.ts:203-208`) ⇒ SIX more test sites move: three go RED — the outage legs `provider-composition.test.ts:228-232`,
  `apps/api/tests/unit/sms-composition.test.ts:106-111`, `contribution-provider-resolver.test.ts:183-194` — plus
  `contribution-provider-resolver.test.ts:250` (`resolveConfig` called once ⇒ 0); and two stay green VACUOUSLY ("template id NOT
  provisioned → fixture": `provider-composition.test.ts:221-226`, `sms-composition.test.ts:99-104`). The fixture and the real provider
  share `id: 'sms-dlt'` (`fixture-sms.ts:26`, `sms-dlt.ts:55`) ⇒ a provider-id assertion cannot tell them apart (use
  `providerMessageId === 'fixture-sms'` or "`resolveConfig` ⛔ called"). `provider-composition.ts:43` imports the registry RELATIVELY
  (`'../sms-dlt-registry.js'`) ⇒ a `vi.mock('@twt/channels')` in `apps/api` does ⛔ intercept it. ⇒ TV6.
- **F11 — the twelve claim texts and their slots** (sheet `dlt-template-requests-6-19.md:20-33,49-54,65-68,89-96`; code as F9):
  templates 1–6 = `{reference}` (exactly 8 upper-case hex — `claimShortReference`, `packages/domain/src/claim/correction-chase.ts:869-871`)
  + `{helpline}`; 7–10 = `{member}` + `{helpline}`; **11–12 (appeal_notice) = `{member}` + `{date}` (`DD-MM-YYYY`, `formatAppealUntil`) +
  `{helpline}` — THREE variables** (F4's exigency limit ⇒ a justification line). `{member}` = the mode-resolved deceased name
  (`packages/domain/src/notifications/pool-identity.ts:141-162`) — full legal name (≤ 200 stored, `packages/contracts/src/kyc/signup.ts:92`)
  or "First L."; may be Devanagari with spaces. ⇒ TV4.
- **F12 — the helpline is free text, only trimmed** (`claim-dlt-sms-send.ts:84-105`). Every jobs TEST fixture uses `+911800123456`
  (13 characters, WITH a `+` — ⛔ a valid `#cbn#` value, F5): `HELPLINE` in `apps/jobs/tests/claim-suspicion-notices-live.test.ts:40`,
  `claim-correction-reminders-live.test.ts:46`, `claim-correction-closure-live.test.ts:31`, `claim-certificate-reminders-live.test.ts:28`;
  `claim-correction-send.test.ts:39,67` (`'+911800999999'`), `:150`. (v1.0 called it "the sheet's own example" — ⛔ true: the sheet has
  ⛔ number, only *"a 13-character helpline number"* in its cost lines, `dlt-template-requests-6-19.md:111,119,125`.) The per-Pariwar key
  `sms.claim_correction.helpline_number.<pariwarId>` has exactly **TWO** src readers (re-verified at `09321738` — 6.28's closure code reads
  ⛔ helpline value): the send core (`claim-dlt-sms-send.ts:85`, blank ⇒ FINAL `config:helpline_number_missing` + alarm at `:99-100`)
  and the suspicion sweep's hold pre-check `helplineGap` (`claim-suspicion-notices.ts:134-139`, via `configSet` `:111-120` — PRESENCE
  only; `configSet` also serves `purposeConfigGap`'s template-id reads, `:126`). ⭐⭐ v1.4: the send core has **FOUR** callers and ONLY
  ONE has the hold — the correction reminder (templates 1–2: `claim-correction-reminders.ts:415`, via the wrapper `:209-221`), the closure
  notice (3–4, *"at most once per person"*: `claim-correction-closure.ts:369`), the certificate reminder (5–6:
  `claim-certificate-reminders.ts:656`) call it with ⛔ pre-check; only the suspicion notices (7–12: `claim-suspicion-notices.ts:437`)
  pass `helplineGap` first (sweep `:187`, child re-check `:340`). On the first three a "missing" helpline is a FINAL `error` that spends
  the slot (`claim-correction-reminders-live.test.ts:525-533` pins it); on the correction chase (templates 1–2 — D22 reads only the
  `family_sms` rows of family / direction runs, `packages/domain/src/claim/correction-reminder-record.ts:604-641` (`:634`, `:636`); the
  closure notice's rows are `closure_notice`) D22's `reachedBySms`
  (`packages/domain/src/claim/correction-closure.ts:372-374`) — read by the Trustee-ratified `-252` closure-for-silence — then records
  that family as ⛔ reached. ⇒ `-313` TV5 ("treated exactly as unset … ⛔ none is dropped") was FALSE on three paths ⇒ `-322` C1.
- **F13 — 6.27c's two templates exist only as drafts** (6.27a `…:418-427`; 6.27c `…:95-96,127-128` says *"registered typed from the start
  by 6.27c and VERIFIED by 6-34 with every other"*); 6.27c is `backlog`. ⚠ If 6.34 lands first it has ⛔ nothing to verify; if it waits,
  6.27c and 6.34 defer to EACH OTHER ([[feedback_circular_deferral_between_sibling_stories]]). ⚠ And the drafts write the TYPED TAG IN THE
  TEXT (`{member}` = `{#alphanumeric#}`, `{link}` = `{#url#}`, `{helpline}` = `{#cbn#}` — `-311` PM3), as does 6.30's SIX FACTS #3
  (at `09321738`: *"requires TYPED template variables (`{#numeric#}`, `{#url#}`, `{#cbn#}`, …)"*; v1.0 quoted an earlier *"should be
  `{#numeric#}`"*, since re-worded) — the Airtel / Jio / Vi form. ⭐ v1.4: 6.30 then wrote the same choice into the SHEET — its
  URL-whitelisting bullet (`dlt-template-requests-6-19.md:142`) leaves *"a typed `{#url#}` or the fixed URL with a typed code variable"*
  OPEN and hands it to *"row `6-34`"* ⇒ answered by `-322` C3 (TV8). On STPL's SmartPing the text keeps `{#var#}` and those are the slots' TYPES.
  The TYPES in `-311` PM3 stand; only the NOTATION is portal-specific ⇒ the Task 0.3 author-commit records this as a FOUND correction
  beside `-311` / `-312` (⛔ edited — [[feedback_supersede_never_reinterpret]]). ⇒ TV11.
- **F14 — two OTP texts state the WRONG validity** (verified by hand): the claim HANDOVER OTP is minted in the `step_up` pool (3 min —
  `claims.service.ts:56`, TTL `apps/api/src/config.ts:383`) but delivered with `intent: 'login'` (`:178-179`) ⇒ the LOGIN template —
  *"Valid 5 min"*; a nominee who types it in minute 4 is refused. The DATA-EXPORT delivery OTP lives 60 min (`config.ts:386`,
  `member-otp.service.ts:38-43`) but is delivered with `intent: 'step_up'` (`member-data-rights/handlers.ts:659-663`) — *"Valid 3 min"*
  (understates — ⛔ causes a refusal). The adapter's `intent` selects BOTH the recipient path (login = caller-supplied E.164; step_up =
  decrypt the session member's mobile — `sms-step-up-delivery.ts:124-141`) AND the template (`:150`) ⇒ the handover cannot just switch
  intent (the step_up path would text the WRONG person). The payload type is `apps/api/src/modules/auth/shared/step-up-delivery.ts:40-61`. ⇒ TV9.
- **F15 — the OTP texts carry the brand "TWT"** — the PRD's working title (OQ-1); the Trust's legal name is under registration. A
  registered OTP text with a later-changed brand = a re-registration. And the OTP texts are English-only (deferred-work: *"OTP DLT templates
  are English-only"*). ⇒ recorded (TV12), ⛔ changed.
- **F16 — the OTP id keys are DOTTED** (`sms.dlt.template_id.otp_login` / `…otp_step_up`); deferred-work *"Dotted Secret Manager names
  (UNVERIFIED)"* — GCP secret ids allow only `[A-Za-z0-9_-]`; `apps/api/src/deps.ts:289-292`'s env fallback upper-cases and swaps dots for
  underscores; prod REFUSES TO START with either id blank (`deps.ts:229-239`). ⇒ TV10 (b)'s device proof, ⛔ fixed here.
- **F17 — ⛔ no row tracks DLT registration** — the roster's newest block is Row 29 (`app-links-live`, written by 6.30 — the Row-block
  format: `## Row N — Story …`, a `> ⭐ Appended …` line, `### Row N — \`key\``, eleven fields); 27 / 28 stay RESERVED for 6.27 (`-305`
  §4); deferred-work *"DLT registration untracked with no ledger row"* (OPEN); ⛔ no DLT runbook exists (the "Story 0.1 runbook" cited by `epics.md`, `otp-sms-template.ts:19`
  and `sms-dlt-registry.ts:30` was never written). ⇒ TV10.
- **F18 — the gate pattern:** `scripts/kyc-provider-boundary/{check.ts,lib.ts,lib.test.ts,README.md}`; `package.json:46-47`
  (`kyc-provider:check` / `:test`); `scripts/ci-local.sh:78`; `.github/workflows/ci.yml:852-875` (both MOVED since `34b9bab6` — 6.30's
  `expo-config` job; v1.0 said `:77` / `:828-851`) — an INVARIANT SCAN (⛔ git diff, ⛔ fetch-depth). ⚠ The kyc walker keeps only `.ts`
  (`scripts/kyc-provider-boundary/check.ts:51-61`), and a git pathspec `apps/*/src` matches ⛔ file — it needs `apps/*/src/**`.
  ⚠ `ci.yml` ↔ `ci-local.sh` drift is invisible — add the job to BOTH. ⚠ `.githooks/pre-push` (`09321738`) SKIPS `ci:local` for a
  docs-only push unless a path matches `GATE_INPUTS` (`.decision-log.md`, `friction-budget.md`); its header: *"When a new gate starts
  reading a doc, add that file to GATE_INPUTS"*. ⇒ TV7.
- **F19 — the sheet** (`dlt-template-requests-6-19.md`, 154 lines at `09321738`) is titled *"the Story 6.19 set"*, cited by path from the
  decision log, six story files, roster Rows 18–23 AND Row 29 (f) + the 6.30 file ⇒ ⛔ rename it. It now ALSO carries 6.30's
  `## URL whitelisting` section (`:128-145`) and a 2026-10-10 Record row — TV8 keeps both. It holds ⛔ the OTP; 6.27c will add 13 (hi) /
  14 (en). The jobs lockstep tests already READ it ⇒ it is a `ci:local` input today. ⇒ TV8.
- **F20 — out of scope, recorded:** `docs/degradation-policy/comms-templates/sms-channel.md:62-72` — a Hinglish degraded-mode SMS draft
  (`{expected_return_date_short}` style, ⛔ wired, a *"registration candidate"*); WhatsApp (`{{1}}`, per-Pariwar) and Telegram templates
  are ⛔ DLT. ⇒ TV12.
- **F21 — the gateway is MSG91 "for now"** (BigDev, 2026-10-10; `-314`). Its recommended APIs — Flow v5 (`POST
  https://control.msg91.com/api/v5/flow`) and SendOTP v5 (`…/api/v5/otp`) — take an `authkey` header, MSG91's OWN template id (the DLT
  TE id and sender live on the template in MSG91's panel) and NAMED VARIABLE VALUES (`recipients: [{ mobiles: "91XXXXXXXXXX", <name>:
  value }]`), ⛔ the finished text; the id comes back in `message` / `request_id`. MSG91 templates write variables as `##name##`
  (case-sensitive) and must equal the DLT-approved content. ⇒ `sms-app.ts`'s contract (F7) matches ⛔ MSG91 API — row 6-37 builds the
  adapter; THIS story gives every slot the NAME it will send (TV13). ⚠ MSG91 states `#alphanumeric#` as *"Letters & numbers only; no
  special characters; max 40"* ⇒ the hyphenated date and spaced names are at risk — Row 30 (d). ⇒ TV10, TV13.

## ⚖️ Build decisions TV1–TV13 (✅ COMMITTED — TV1–TV12 `2026-10-10-313`, TV13 `2026-10-10-314`, all as recommended; CORRECTED by `2026-10-12-322` C1–C9 — TV5 SUPERSEDED; read by `2026-10-12-323` R1–R2; each corrected TV says so)

- **TV1 — ONE vocabulary in `@twt/channels`; the text keeps `{#var#}` (STPL / SmartPing — BigDev, v1.1).** New
  `packages/channels/src/dlt-variables.ts` (barrel-exported): `DLT_VAR = '{#var#}'` (the ONE marker — SmartPing's, F3);
  `DltVariableType = 'numeric' | 'alphanumeric' | 'url' | 'urlott' | 'cbn' | 'email'` (TRAI Annexure-I's six; the names are TRAI's, the
  same words the sheet tells BigDev to select); `DltSlot = { name, type, maxLength, label }` (`name` = TV13; `label` = what the slot holds, for the
  sheet — e.g. *"claim reference"*; `maxLength` ≤ the type's ceiling: alphanumeric 40 (TRAI), numeric / email 40, cbn 14, url / urlott
  120 (Vi's manual only — F2; ONE constant each, so Row 30 (a)'s portal answer can move them));
  `checkDltTemplateShape(text, slots)` → a list of problems (the count of `{#var#}` equals `slots.length`; ⛔ any other `{#…#}` tag; ≤ 3
  variables; ⛔ two ADJACENT `{#var#}` unless both slots are alphanumeric — adjacent = the fixed text between them matches
  `/^[\s\p{P}\p{S}]*$/u` (empty, whitespace or punctuation only — TRAI's *"not separated with space, comma and/or any other special
  characters"*); fixed characters ≥ 30 % of (fixed + Σ `maxLength`), counted as JS string length (UTF-16) — the conservative reading of
  F4); `isDltNumeric` / `isDltCallbackNumber` (digits only, 3–14) value predicates. ✅ v1.4 ran this rule over EVERY real text: all 14
  (OTP ×2, claim ×12, en + hi) and 6.27c's drafted English PASS (lowest: 6.27c at 39.6 % with url 120; templates 7–12 at 52–62 %); the
  five whole-body alert entries FAIL (0 %), as TV6 expects. *Alternative:* typed tags in
  the text (the Airtel / Jio / Vi form) — ⛔ on SmartPing they would be registered as literal text and ⛔ match a single send.
- **TV2 — every registered template declares its slots.** `OtpDltTemplate`, `DltTemplate`, the claim-correction and suspicion entries gain
  `slots: readonly DltSlot[]` (in text order). The two local `DLT_VAR` constants (`claim-correction-sms-templates.ts:37`,
  `suspicion-notice-sms-templates.ts:49`) and `OTP_VAR_SLOT` (`otp-sms-template.ts:47`) become imports of TV1's `DLT_VAR` (same value —
  ⛔ a second copy), RE-EXPORTED by the two claim registries (both lockstep tests import `DLT_VAR` from them —
  `claim-correction-sms-templates.test.ts:15`, `suspicion-notice-sms-templates.test.ts:15`). Each registry's test runs `checkDltTemplateShape` over EVERY entry; the lockstep tests keep their single-token
  replacement (F9 — correct on SmartPing) and ADD: the sheet's row for the template lists the same types in the same order (TV8).
- **TV3 — the OTP first.** Texts, marker and wording ⛔ changed (F8 — Trap 2); `slots: [{ name: 'otp', type: 'numeric', maxLength: 6,
  label: 'OTP code' }]` (`name` per TV13 / `-322` C5); `version` STAYS 1 (the registered text is unchanged); a test that each OTP template passes `checkDltTemplateShape` and that the
  rendered body CONTAINS the code and ⛔ `{#` (F8's no-code failure). Category **Transactional** (F6) and the slot type recorded in the
  sheet as templates 15 / 16 (TV8).
- **TV4 — the twelve claim texts:** `{reference}` = `alphanumeric` (maxLength 8); `{member}` = `alphanumeric` (40); `{date}` =
  `alphanumeric` (10 — TRAI allows the hyphens, F2; only MSG91's paraphrase disagrees ⇒ Row 30 (d)); `{helpline}` = `cbn` (14). ⛔ No
  other type is available for `{member}` / `{date}` (⛔ date type; numeric refuses the hyphen) without a §0 text change — the sheet says so. Templates 11 / 12 carry THREE
  variables — the sheet records the justification (*"the last date to appeal is the substance of the notice — `-293` item 1 B"*).
  ⛔ Any text changes; ⛔ `claim.json` is edited. ⚠ `{member}` > 40 characters (or Devanagari, if the operator refuses it) stays the open
  deferred-work item *"`{member}` has ⛔ no length guard …"* — its trigger (provisioning 7–12, Row 22) is unchanged; this story updates
  the item with F2 / F4's figures (40 vs 30) and ⛔ adds a guard (a guard changes WHO is texted ⇒ §0).
- **TV5 — ⛔ SUPERSEDED by `2026-10-12-322` C1: the helpline is CHECKED as a callback number, then SENT and ALARMED — ⛔ held,
  ⛔ refused.** ONE predicate (`isDltCallbackNumber`, TV1) — digits only, 3–14 characters (⛔ `+`, ⛔ spaces; 14 is Vi's ceiling — Jio
  admits landlines up to 18 digits, so Row 30 (a)'s portal answer may WIDEN the ceiling in TV1 — one constant). It is applied in ONE
  place: the shared send core `sendClaimDltSms` (`claim-dlt-sms-send.ts`), to the trimmed, non-blank helpline it has just resolved —
  so it covers all FOUR callers (F12). The core *"never alarms and ⛔ never logs — callers add the ids"* (`claim-dlt-sms-send.ts:9`) ⇒
  on a failure it SENDS exactly as today (same body, same outcome) and returns the result with ONE added optional flag
  (`helplineNotCallbackNumber: true`) — set ONLY on a `kind: 'final'` result whose body was handed to the provider (`accepted`,
  `rejected_*`, or a provider-classified `error`); ⛔ on `transient` (a pg-boss retry would warn on every attempt), ⛔ on the config
  finals that send nothing (`config:sms_gateway_unconfigured`, `config:sms_messaging_unavailable`). Each of the four callers, AFTER its
  transient branch, on that flag raises ONE warning through its EXISTING `alarm` sink (`alarmOf(deps)` — reminders `:260`, closure
  `:300`, certificate `:531`, suspicion child `:327`) — naming the Pariwar, the purpose and the rule
  (*"helpline set, but not a callback number: digits only, 3–14 — no '+' or spaces"*; ⛔ the number itself is needed). The warning
  changes ⛔ outcome, row or `detail`. (`-323` R1: this is how `-322` C1's *"the core … logs one warning"* is realised — the core
  FLAGS, the caller LOGS; the core never logs and does ⛔ know the purpose.) ⚠ Jobs boot wires ⛔ `onAlarm` today
  (the claim deps `apps/jobs/src/boot.ts:594-604` carry ⛔ `onAlarm` — deferred-work's 8.14 item) ⇒ the warning reaches `console.warn` / the logs only. `helplineGap`,
  `configSet`, every outcome, `detail` code,
  hold and alarm that exists today are UNCHANGED (Invariant 5). The CONTROL is provisioning: Row 30 (c) closes only when every Pariwar's
  number passes the predicate and is whitelisted as a CBN CTA (toll-free `1800` / `1860`, 8–13 digits; landline `0` + STD; mobile
  `91` + 10 digits — ⛔ `+`; ⛔ "+91 in the fixed text" — templates 1–12's words are ratified, Invariant 2). ⚠ Cost, accepted by BigDev:
  once operators enforce tags, a malformed number's texts are REJECTED by the operator until staff fix the number. ⚠ (`-323` R2 —
  RECORDED, accepted) HOW the rejection comes back is UNVERIFIED: a synchronous provider error ⇒ a final `error` (the case C1
  assumed); a delivery report only ⇒ the send is recorded `accepted` (this repo consumes ⛔ delivery report — `sms-dlt.ts:82`) and, on
  the correction chase, D22's `reachedBySms` counts the family REACHED; a carrier block ⇒ `rejected_unreachable` (`sms-errors.ts:42`),
  which feeds D22's dead-number arm (`numberKnownDead`) on the same chase. That gap is
  PRE-EXISTING for every DLT rejection cause, ⛔ created here; Row 30 (d) asks; until answered Row 30 (c) is the only control. ⚠ (second
  code review, 2026-10-12 — RECORDED, accepted) the warning rides on FINALS only, so a row whose EVERY attempt is `transient` (incl. a
  `withTimeout` timeout, which the gateway may still have delivered) and that is then closed by a give-up path is recorded `error` with
  ⛔ flag ⇒ ⛔ warning for THAT row. The give-up paths (paths corrected by the third code review): THE EXHAUSTED-ROW FINALISER,
  `exhausted:attempting_past_day` — `claim-correction-reminders.ts:697-714` (an untenanted `UPDATE claim_correction_reminders`, so it
  also closes a stuck CLOSURE notice — `claim-correction-closure.ts` has ⛔ give-up path of its own) and `claim-certificate-reminders.ts:176-183`;
  the stale-child and re-check paths `exhausted:crossed_midnight` / `exhausted:recheck_<reason>` (`claim-correction-reminders.ts:276` /
  `:354`, and the certificate twins `:553` / `:644`); and the suspicion give-up `exhausted:attempting_three_days`
  (`claim-suspicion-notices.ts:220-231`). This narrowing is the story's reading of `-322` C1's *"logs one warning"* — one per SEND,
  ⛔ one per pg-boss retry (TV5 v1.5). ⛔ Widened to the finaliser: the helpline is a per-Pariwar
  secret, so any other final send for the same Pariwar raises the warning, and Row 30 (c) — ⛔ the warning — is the control.
  *Record of the superseded text* (`-313`): *"a value that fails it is
  treated EXACTLY as unset: `helplineGap` … HOLDS … and the send core returns its existing `config:helpline_number_missing`"* — FALSE in
  effect on three of four paths (F12), where "unset" is a FINAL `error` that drops the text; on the correction chase (templates 1–2) it
  also moves D22's `reachedBySms` (D22 reads only the `family_sms` rows of family / direction runs). *Rejected
  (`-322`):* (a) fail closed like unset (drops the closure notice for good — §0 (ii)); (c) a hold on all four paths (three sweeps; the
  held reminder still moves D22 — likely the Panel's).
- **TV6 — the five whole-body alert entries go DARK, truthfully.** Each keeps its key and config-key name (the 5.6 set stays visible) but
  `contentTemplate` becomes `null` with `unregistrableReason: 'whole_body_variable'`; `resolveDltTemplate` returns `null` for an entry
  with ⛔ registrable text ⇒ composition falls to the fixture (TODAY's behaviour — ⛔ id is provisioned, F10). EVERY SMS test that
  drives the real path — the three real-path tests AND the six sites F10's v1.4 note lists (outage legs, the `toHaveBeenCalledTimes(1)`
  pin, the two vacuous "NOT provisioned" legs) — runs against a mocked registry with ONE registrable fake entry; in `apps/api` the mock
  targets the registry's FILE path (`provider-composition.ts` imports it relatively — F10), or the registry becomes an injectable dep
  (the author's choice; say which in the Debug Log). `sms.test.ts`'s pins updated (registry size 5 kept; `resolveDltTemplate` ⇒ `null`
  for all five). ⚠ (`-322` C8) the dark proof must be OBSERVABLE: `resolveSmsProviderDeps(…)` returns `null` AND `resolveConfig` was ⛔
  called (the fixture and the real provider share `id: 'sms-dlt'`). Provisioning `sms.dlt.template_id.<category>` for the five does
  NOTHING — recorded in Row 30 and the deferred item, ⛔ built as a warning. A deferred-work item records that architecture §3.4 (iii) has ⛔ registrable template —
  trigger: *"before any `sms.dlt.template_id.<category>` is provisioned, or the per-member SMS fallback is claimed at go-live"* — and that
  turning it ON needs per-category FIXED wording (en + hi) = a later story (⚠ new member-facing wording ⇒ its own §0). *Alternatives:*
  (a) delete the five entries — the same tests churn and the 5.6 set disappears from view; (c) write the five fixed-text templates now —
  new member-facing copy, Hindi review, a story of its own. **Recommended: as written.**
- **TV7 — the gate `scripts/dlt-typed-variables/`** (mirror `kyc-provider-boundary`, F18; rules per `-322` C2): `lib.ts` —
  `scanDltText(path, text)` → findings for:
  (i) a braced `{#…#}` tag other than `{#var#}` INSIDE REGISTERED TEXT — in `docs/launch-gate-inventory/*.md`, the template table rows
  (lines matching `^\|\s*\d+\s*\|`, which include the MSG91 column); in source, the CODE lines of the `REGISTRY_FILES` only (`-322`
  C2's "string literals of the registry files" — a code line = first non-blank characters ⛔ `//`, `/*` or `*`; a cheap stand-in, ⛔ a
  TS parse; write any detector regex with an escaped `#\}` so it does ⛔ match itself). ⛔ Prose, headings,
  bullets or comment lines — those spell types WITHOUT braces by convention (TYPE SPELLING RULE, header; Trap 10), unscanned;
  (ii) a source file holding the literal `{#var#}` that is ⛔ on `REGISTRY_FILES`;
  (iii) a source file using the identifier `DLT_VAR` or the literal `sms.dlt.template_id.` that is ⛔ on `REGISTRY_FILES` (allowlist:
  `apps/api/src/deps.ts`, for its startup error string) — so a new template that imports the marker, or a new DLT send keyed on a new
  id, cannot ship outside a shape-tested registry.
  `REGISTRY_FILES` = the registry modules whose unit tests run `checkDltTemplateShape` over every entry (the alert registry's test,
  whose five entries are dark after TV6, asserts `null` + `unregistrableReason` + empty `slots` instead) (today:
  `packages/channels/src/{otp-sms-template.ts,sms-dlt-registry.ts,dlt-variables.ts}`, `apps/jobs/src/scheduler/{claim-correction-sms-templates.ts,
  suspicion-notice-sms-templates.ts}`; 6.27c ADDS its file — TV11). `check.ts` scans tracked `.ts` / `.tsx` files under `apps/*/src/**`,
  `packages/*/src/**` (rules i–iii) and `docs/launch-gate-inventory/*.md` (rule i), exit 1 naming file + line, and FAILS if it scanned
  zero source files or if any `REGISTRY_FILES` path is ⛔ in the scanned set (a renamed registry, or a glob that matches nothing, ⛔
  silently drops out). `lib.test.ts` — the negative controls ([[feedback_gate_scope_semantic_coverage]]): a braced typed tag in a
  docs table row FAILS, the same tag in backticked prose PASSES; a braced typed tag on a CODE line of a registry file FAILS, on a comment
  line of it PASSES, and the real `dlt-variables.ts` (its `#\}`-escaped detector) PASSES; a `{#var#}` in an unlisted file FAILS; an unlisted file using
  `` `${DLT_VAR}` `` FAILS; an unlisted file holding `'sms.dlt.template_id.x'` FAILS; a listed file passes. `README.md`; `package.json`
  `dlt-typed-variables:check` / `:test`; `scripts/ci-local.sh` + `.github/workflows/ci.yml` (BOTH — F18); and
  `docs/launch-gate-inventory/` joins `.githooks/pre-push`'s `GATE_INPUTS` (F18). The sheet's `:142` (6.30's *"a typed `{#url#}`"*) is
  a BULLET ⇒ unscanned by rule (i) (v1.4 wrongly called it RED); Task 8 still rewrites it (`-322` C3). "Tracked" ⇒ a NEW registry
  file must be `git add`-ed before `check.ts` sees it (else the in-scanned-set check fails) — the README says so. ⚠ `index.ts`: the
  barrel exports `dlt-variables.ts` with `export * from './dlt-variables.js'` (Task 1) so the identifier `DLT_VAR` never appears in it —
  a named re-export would trip rule (iii). SHAPE (30 %, ≤ 3, adjacency, slot
  count) is checked by each registry's unit test (TV2), ⛔ from the sheet; the sheet is parsed only for each row's TYPES (TV2 / AC3).
- **TV8 — the sheet covers EVERY template.** Keep the path `docs/launch-gate-inventory/dlt-template-requests-6-19.md` (F19); retitle to
  *"DLT Template Registration Requests — every SMS template (first opened for Story 6.19)"*; replace the column *"Variable slots
  (`{#var#}`) — to confirm with the wording"* with *"Variable types — select in SmartPing's tagging section, in order"* (e.g. *"1
  alphanumeric (claim reference, ≤ 8) · 2 cbn (helpline)"*) and a column *"MSG91 template"* (the same text with `##<name>##` per
  `{#var#}` — TV13); texts 1–12 ⛔ changed; ADD **15 (OTP login, en)** and **16 (OTP step-up,
  en)** with their config keys, Transactional category, TTL wording and `numeric` slot named `otp` (13 / 14 stay 6.27c's — ⛔ written
  here; 6.27c's rows carry their OWN three-variable justification — TV11); list the five alert categories as *"⛔ not registrable —
  whole-body (TV6); provisioning their ids does nothing"*; NEW sections: *"Where and how we register"* (STPL / SmartPing; the text keeps
  `{#var#}`; the type is chosen per variable in the tagging section; never type a typed tag such as `#numeric#` — with braces — into
  the text — this prose itself spells it WITHOUT braces (TYPE SPELLING RULE; a reader copies what the sheet shows),
  *"The variable types"* (the six, their limits, each with its SOURCE — F2; brace-less), *"Shape rules"* (F4 + the 11 / 12
  justification; ⛔ other type for `{member}` / `{date}` without a §0 text change — TV4), the corrected helpline section (F5 / TV5:
  digits only per kind — toll-free / landline / mobile `91…`; a malformed value is still SENT and warned about; Row 30 (c) is the
  control); the cost lines' *"13-character helpline number"* (`:111,119,125`) re-derived for a digits-only number (e.g. 10 characters)
  or annotated; a Record line (*"variable types declared — ⛔ still not submitted"*). ⭐ KEEP 6.30's `## URL whitelisting` section and its
  Record row; REWRITE its bullet at `:142` (`-322` C3): *"The template that carries the link has a `{#var#}` slot typed `url` (`-311`
  PM3), validated against the whitelisted `https://<domain>/peer-request?` — row 6-34 (`-322` C3)"* (a fixed URL with a code variable
  would change PM3's slots — its own author-commit). ⚠ Templates 1–12 keep their numbers.
- **TV9 — the OTP texts tell the truth about their validity.** The delivery payload's `login` arm gains an optional `template?: 'step_up'`
  (`-322` C4 — ⛔ on the common payload, ⛔ any other value) that selects the TEMPLATE only — the recipient path still follows `intent`
  (F14); default = `intent`. `assertPayloadShape` rejects `template` on a `step_up` payload and any value other than `'step_up'` as
  `invalid_payload` ⇒ a 3-minute code can ⛔ never carry the 5-minute text, and a step_up code ⛔ can be switched at all. (The type file
  `apps/api/src/modules/auth/shared/step-up-delivery.ts` has its own `StepUpOtpIntent` (`:23`) and ⛔ imports — use its member, ⛔
  `@twt/channels`' `OtpIntent`.) The handover passes `template: 'step_up'` (its code lives 3 min — the step-up wording says 3 min). The data-export OTP (60 min, told *"3 min"*) is RECORDED in deferred-work
  (understates; ⛔ refuses anyone; a third template = a third registration). *Alternatives:* (b) record both — the handover keeps
  misleading a bereaved nominee into a refusal; (c) a third template now for data export. **Recommended: as written.**
- **TV10 — roster Row 30 `sms-dlt-templates-typed-and-registered`** (owner BigDev — only BigDev submits; support: STPL / SmartPing (the
  DLT portal) and MSG91 (the gateway)).
  Closure: (a) the PE's DLT portal — ✅ STPL / SmartPing (BigDev, 2026-10-10) — and the SMS GATEWAY that will send (the API behind
  `sms-app.ts`'s `apiUrl`, F7) NAMED — ✅ MSG91 "for now" (`-314`); a screenshot of SmartPing's tagging section recorded, and the sheet's type words matched to its
  labels; (b) templates 15 / 16
  registered TYPED as Transactional and APPROVED, both ids set in the deployed environment, and a real login OTP AND a step-up OTP
  received on a device — ⚠ ALSO waits for row 6-37's MSG91 adapter (F21) (proves F16's key resolution; discharges 6.30 AL15's dependency for Row 29 (e)); (c) EVERY Pariwar's
  helpline passes `isDltCallbackNumber` (digits only per kind — TV5) AND is whitelisted as a CBN CTA — ⭐ this is the control `-322` C1
  rests on (the code only warns, to the logs only — ⛔ `onAlarm` wired); (d) the providers' written answers, asked of STPL AND MSG91:
  whether a TAG rejection is synchronous (a send error), delivery-report-only, or a carrier block (`-323` R2); Devanagari and spaces in
  `#alphanumeric#`, the hyphen in a `DD-MM-YYYY` `#alphanumeric#` (TRAI allows special characters; ⚠ MSG91 says *"no special characters"*
  — F2, F21), the per-variable limit (40 vs 30) AND the unit it counts (UTF-16 / code points vs graphemes — decides 6.27c's
  `name_too_long`), a leading-zero `#numeric#`, a variable as the LAST word before the final full stop (F4); ⭐⭐ (`-322` C7) a refusal
  of Devanagari or spaces in names goes BACK to the Panel — the 6.27 confirms note behind `-310` promised *"if it refuses Hindi names, we
  will come back to you"* (a promise in the note's FYI section, ⛔ itself ratified by `-310`; C7 applies it to EVERY name slot,
  templates 7–12 as well as 6.27c's — widened, conservatively) — and Row 30 (d) does ⛔ close on a refusal; the answer is recorded
  ONCE, here, and Row 27's evidence line points to it (6.27a / 6.27c, which say the answer IS a Row 27 line, get that annotation —
  Task 0.4); (e) the enforcement state recorded with a date (logger mode started? rejection date?). Notes: the five dark alert
  categories — provisioning their ids does nothing (TV6); 6-37's create-story owes an SMS-provider ADR (`-322`); a record line: `-323`'s
  Consequences 1–2 are that entry's own wording — Consequence 2 was added by the author, ⛔ put to BigDev (the story's v1.6 Change Log). Templates 1–14 keep
  their OWN provisioning gates (Rows 18–23, 27) — Row 30 ⛔ licenses their ids. ⭐ Row 30 is ⛔ a merge fence
  ([[project_not_in_production_merge_is_not_golive]]).
- **TV11 — 6.27c, ⛔ a circular deferral; the notation corrected.** 6.34 does ⛔ hand-verify 6.27c's texts: 6.27c USES TV1's vocabulary,
  writes its two texts with `{#var#}` + `slots` (`member` alphanumeric ≤ 40, `link` url, `helpline` cbn — `-311` PM3's TYPES, unchanged),
  runs `checkDltTemplateShape` in its own registry test and ADDS its file to TV7's `REGISTRY_FILES` (rule (iii) makes forgetting it RED).
  Its templates 13 / 14 carry THREE variables ⇒ their sheet rows carry their OWN justification line (e.g. *"the link is the request; the
  helpline is the Panel's alternative"* — 6.27c words it). The pointer lines in 6.27a (`…:423-427`, `…:615`) and 6.27c (`…:85`, Task 1
  at `…:101-102`, `…:96`, `…:127-128`) and 6.30's SIX FACTS #3 / AL15 get an annotation at Task 0.4 (*"⚠ on STPL / SmartPing the text
  keeps `{#var#}`; the tag names here are the slot TYPES — 6.34 TV1 / TV11"*; 6.27c's Task 1 annotation adds *"`{#var#}` + `slots` from
  `@twt/channels` `dlt-variables.ts`; add the file to `REGISTRY_FILES`; raise the `helplineNotCallbackNumber` warning like the four
  callers (`-322` C1 / `-323` R1)"*; every site that places the provider's Devanagari answer AT Row 27 — 6.27a `…:423-427`,
  `…:610-611` (Row 27's own evidence line), `…:813-814`; 6.27c `…:86` (AC5), `…:96`, `…:120` (Task 5, which ORDERS it) — adds *"the
  answer is recorded ONCE at Row 30 (d) (`-322` C7); Row 27's evidence line POINTS to it"*; a Change-Log line in each; ⛔ a PM or AL moved). ⭐ (`-322`
  C6) the deferral is made MECHANICAL: 6.27c's STATUS line and its sprint-row comment gain *"AND row 6-34 is done"*; 6.30 AL15, roster
  Row 29 note (4) and the AL15 annotation under the `6-34` sprint row gain *"+ row 6-37's MSG91 adapter (`-314` Consequence 2)"*.
  ⚠ If 6.27c lands FIRST anyway, it STOPS and asks rather than re-creating TV1.
- **TV12 — recorded, ⛔ changed:** the brand "TWT" and English-only OTP (F15 — a re-registration when the name is fixed / a Hindi OTP is
  added; row 6-35 is the language switch); the dotted key names (F16 — Row 30 (b) proves them); `sms-channel.md`'s degraded-mode draft
  (F20 — when registered it must be typed; a deferred-work line); the missing DLT runbook (F17 — the sheet + Row 30 are the record).

- **TV13 — every slot carries a stable `name`** (`-314`): equal to the i18n param the render already uses (`reference`, `helpline`,
  `member`, `date`; `otp` for templates 15 / 16); unique within a template; `^[a-z][a-z0-9_]*$` — both checked by
  `checkDltTemplateShape`. The MSG91 template is the DLT text with `##<name>##` for each `{#var#}`, in order (F21); the sheet shows both
  forms (TV8). Row 6-37's adapter sends `{ <name>: value }` from these slots — ⛔ re-deriving them. ⚠ The OTP's i18n param does ⛔ exist
  (`renderOtpBody` takes a bare code) — `otp` is its name by this decision.

## Acceptance Criteria

### AC0 — Governance before code (Task 0)
TV1–TV12 put to BigDev and committed ALONE as one author-commit before any code (✅ `-313`); TV13 (✅ `-314`); the v1.4 corrections
(✅ `-322`, alone) and its reading (✅ `-323`, alone); `epics.md` `### Story 6.34`; roster Row 30; the annotations (TV11 / `-322` C6, C7 /
`-323` R1); the sprint ledger.

### AC1 — One vocabulary (TV1)
**Given** `packages/channels/src/dlt-variables.ts` **then** it exports `DLT_VAR`, the six types and their ceilings, `DltSlot`,
`checkDltTemplateShape` and the two value predicates, barrel-exported from `@twt/channels`; unit tests cover each shape rule with a
passing and a failing case (incl. a whole-body template, a 4-variable template, two adjacent cbn slots — separated by nothing, by a space,
and by `, ` — beside two cbn slots separated by a word (PASSES), a 29 %-fixed template, a slot count ≠ the `{#var#}` count, a braced
typed tag in the text, a duplicate slot name, a name with an upper-case letter); `isDltCallbackNumber` refuses `+911800123456`,
`1800 123456`, `12` and a 15-digit value, and accepts `1800123456` and `919876543210`.

### AC2 — The OTP is typed and still carries the code (TV3)
**Given** either OTP template **then** its text is UNCHANGED (still `{#var#}`), it declares one `numeric` slot named `otp` (≤ 6),
`checkDltTemplateShape` returns ⛔ problems, `version` is still 1, and `renderOtpBody(template, '048213')` is byte-identical to today's
(`otp-sms-template.test.ts:35,42`; `sms-step-up-delivery.test.ts:100,130` unchanged and green), contains `048213` and ⛔ `{#`.

### AC3 — The twelve claim texts are typed, text unchanged (TV2, TV4, TV13)
**Given** every claim-correction and suspicion entry **then** its `registeredText` is unchanged, it declares `slots` per TV4, passes
`checkDltTemplateShape`; its slot names, in order, EQUAL the `{param}` names extracted (`/\{(\w+)\}/g`) from its i18n value in BOTH
locales' `claim.json`, and a render through the real `t()` with a distinct marker per slot name places the markers in slot order (a
wrong name makes `t()` throw); its rendered body (through the real `t()`) is byte-identical to today's; the lockstep reproduces
`registeredText`; and the sheet row found by its config key lists the same types in the same order. The local `DLT_VAR` /
`OTP_VAR_SLOT` constants are imports of TV1's (re-exported by the two claim registries); `claim.json` is ⛔ in the diff.

### AC4 — A malformed helpline is SENT and WARNED about, ⛔ held, ⛔ refused (TV5 as `-322` C1)
**Given** a Pariwar's helpline set to `+911800123456` (or `1800 123456`) **when** ANY of the four send paths sends (correction reminder,
closure notice, certificate reminder, suspicion notice) **then** the text is sent exactly as today (same body, same outcome, same row
state) **and** the core's FINAL result carries `helplineNotCallbackNumber: true` **and** that path's caller raises exactly ONE warning naming
the Pariwar, the purpose and the callback-number rule through its existing `alarm` sink; **and** with `1800123456` ⛔ flag and ⛔
warning; **and** an UNSET helpline behaves exactly as today on every path (the existing fail-closed and hold legs unchanged and green).
Proven by a send-core unit leg (`claim-correction-send.test.ts` — flag set / unset, body and outcome unchanged), ONE warning leg per
caller with a `+911800123456` helpline (the four live suites' harnesses already capture `alarms`), and the existing legs staying green
after the suites' DEFAULT `HELPLINE` fixtures (F12's list) move to digits-only `1800123456` / `1800999999` — the body pins interpolate
`${HELPLINE}`, `claim-correction-send.test.ts:150`'s `toContain` moves with it, and the per-claim empty-alarm assertions stay true
(reminders-live `:807`, `:1039`, `:1057`, `:1096`; suspicion-live has ⛔ such assertion on a leg that sends); `claim-correction-send.test.ts`'s whole-result
`toEqual`s (`:134` transient, `:143` accepted) stay exact for a digits-only helpline (the flag is absent). A TRANSIENT send with a
malformed helpline carries ⛔ flag (TV5) — proven by send-core legs with `+911800123456`: a timeout ⇒ exactly `{ kind: 'transient',
detail: 'api_unavailable:timeout' }`; a rate limit ⇒ transient, ⛔ flag; an unconfigured gateway ⇒ `config:sms_gateway_unconfigured`,
⛔ flag; `accepted` / a carrier reject / `DLT_TEMPLATE_NOT_APPROVED` ⇒ flag `true`.

### AC5 — The alert entries are dark and say why (TV6)
**Given** each of the five categories **then** `resolveDltTemplate` returns `null` and its entry carries `contentTemplate: null` +
`unregistrableReason`; **and** with an id provisioned for that category `resolveSmsProviderDeps(…)` returns `null` AND `resolveConfig`
was ⛔ called (⛔ a provider-id assertion — the fixture shares `id: 'sms-dlt'`); every SMS real-path composition test — incl. the outage
and call-count legs (F10) — passes against a mocked registrable entry, ⛔ vacuously.

### AC6 — The gate (TV7)
`pnpm dlt-typed-variables:test && pnpm dlt-typed-variables:check` pass on the tree AFTER Task 8 and run in `ci-local.sh` AND `ci.yml`;
`lib.test.ts` holds the negative controls (a braced typed tag in a docs table row FAILS while the same tag in prose PASSES; one on a code
line of a registry file FAILS while one on its comment line PASSES; the real `dlt-variables.ts` PASSES; a `{#var#}`
in an unlisted source file FAILS; an unlisted file using `` `${DLT_VAR}` `` FAILS; an unlisted file holding `'sms.dlt.template_id.x'`
FAILS; a listed file passes); `check.ts` fails on zero scanned source files and on any `REGISTRY_FILES` path ⛔ in the scanned set;
`docs/launch-gate-inventory/` is in `.githooks/pre-push`'s `GATE_INPUTS`.

### AC7 — The sheet (TV8)
Every template 1–12, 15, 16 appears with its config key, its variable types in order and its MSG91 form (`##name##`); the where-and-how
(STPL / SmartPing), variable-types (with sources), shape-rules and helpline sections exist; the five alert categories are listed as not
registrable; 6.30's URL-whitelisting section is kept and its bullet answers the link's type (`-322` C3); the cost lines' helpline length
re-derived or annotated; a Record line dated at the change; ⛔ braced typed tag appears in any template row (the gate proves it); a jobs
or channels test asserts rows 15 / 16 list `numeric` (the OTP's sheet leg).

### AC8 — The handover OTP says 3 minutes (TV9)
**Given** a claim handover OTP **then** it is sent to the SAME number as today (the caller-supplied E.164) with the step-up text
(*"… verification code. Valid 3 min. …"*) — proven through the REAL adapter (`apps/api/tests/unit/sms-step-up-delivery.test.ts`), and
the handover's captured payload carries `template: 'step_up'` with `intent` still `'login'` (beside `claims-intake.spec.ts:122`);
**and** `assertPayloadShape` rejects `template` on a `step_up` payload and any value other than `'step_up'` (`invalid_payload`);
**and** every other OTP send (member login, member step-up, data export, admin step-up) selects the same template as today.

### AC9 — The records (TV10–TV12)
Roster Row 30 and the story-file annotations VERIFIED present (written at Task 0.4 — AC0); deferred-work items (TV6 §3.4 (iii) +
"provisioning the five ids does nothing"; TV9 data export; TV12 lines; the `{member}` item updated — TV4; the item *"DLT registration
untracked with no ledger row"* annotated *"⭐ ADDRESSED IN PART by 6.34 Row 30 — registration tracked, each helpline checked and
whitelisted at (c); per-Pariwar posture gating ⛔ addressed"*, ⛔ "closed"); a NEW item (`-323` Consequence 2): *"⛔ DLT send consumes
a delivery report — a rejection seen only there is recorded `accepted`, and on the correction chase D22 counts the family reached"* (trigger: before any
claim-text template id is provisioned; likely closer: row 6-37's adapter, whose row names delivery reports; ⚠ the staff chase views
show such a send as `accepted` too — `correction-chase-read.ts:229`, `certificate-reminder-read.ts:201`); the annotations of TV11 / `-322` C6 / C7 (6.27a, 6.27c incl. its STATUS line, Task 1 and
sprint row, the Row 27 → Row 30 (d) pointer, 6.30 AL15, Row 29 note (4), the `6-34` sprint annotation); this file's Change Log + File
List.

### AC10 — Nothing else moves; the proof
⛔ Migration, ⛔ `detail` code, ⛔ outcome change, ⛔ i18n change, ⛔ template id / secret / helpline set; `pnpm ci:local` green WITH
`DATABASE_URL` set to the :5433 test DB (the live-DB job runs — AC4's live suites are in it) — run it, paste the summary incl. the
live-DB job's line.

## Tasks / Subtasks

- [x] **Task 0 — governance FIRST (AC0).** ⛔ No code.
  - [x] 0.1 Re-check `git diff --name-only 09321738..HEAD -- packages/channels apps/jobs/src/scheduler apps/jobs/tests apps/api/src/modules/auth
        apps/api/src/modules/claims apps/api/src/modules/member-data-rights apps/api/tests docs/launch-gate-inventory scripts .github
        .githooks package.json` (v1.4 re-derived every cite at `09321738`); re-read any cited file that moved. Re-fetch F1–F6 (the
        Direction PDF; Vi's `Entity_Content_template_registration.pdf` and `CTA_Whitelisting.pdf`; Jio's TrueConnect guide), STPL's
        SmartPing manual and MSG91's variable-tagging / FAQ / Flow v5 pages — record the fetch date. The portal (STPL / SmartPing) and the
        gateway (MSG91 "for now" — `-314`) are ANSWERED; ⛔ ask again.
  - [x] 0.2 Put TV1–TV12 to BigDev — ✅ answered in session 2026-10-10: the mechanical ones (TV1–TV4, TV7, TV8, TV10–TV12) *"All as
        written"*; TV5 *"Hold like unset"* (⚠ SUPERSEDED 2026-10-12 by `-322` C1 — *"(b) Alarm only, never refuse"*); TV6 *"Switch off,
        keep listed"*; TV9 *"Fix handover, record export"* — all as recommended.
  - [x] 0.3 ✅ `2026-10-10-313`, committed ALONE. ONE author-commit recording the answers AND BigDev's portal fact (STPL / SmartPing; the
        text keeps `{#var#}`) with the FOUND notation correction to `-311` PM3 / `-312` AL15 (F13 — ⛔ editing either). ✅ `-314` (TV13,
        the gateway), ✅ `-322` (the v1.4 corrections) and ✅ `-323` (its reading) likewise, each alone.
  - [x] 0.4 `epics.md` `### Story 6.34` after the last Epic 6 entry (at `09321738`: **Story 6.30**, just before the `---` preceding
        `## Epic 7`) in 6.30's format — a blockquote citing `-313`, `-314`, `-322`, `-323` (incl. R2's accepted residual) and naming go-live Row 30; ⛔ a merge fence. Roster
        **Row 30** (TV10, the Row 29 block format — `## Row 30 — Story 6.34: …`, the `> ⭐ Appended …` line, `### Row 30 —
        \`sms-dlt-templates-typed-and-registered\``, the eleven fields; note the 27–28 gap is 6.27's RESERVED rows). The annotations of
        TV11 / `-322` C6, C7 / `-323` R1 (the exact wording is TV11's; 6.27a `…:610-611` / `…:813-814` get BOTH the notation and the
        pointer notes): 6.27a (`…:423-427`, `…:610-611`, `…:615`, `…:813-814`); 6.27c
        (`…:85`, `…:86`, `…:96`, Task 1 `…:101-102` incl. the helpline-warning clause, Task 5 `…:120`, `…:127-128`, AND its STATUS line +
        the `6-27c` sprint-row comment: *"AND row 6-34 is done"*); 6.30 SIX FACTS #3 / AL15 (+ *"row 6-37's MSG91 adapter (`-314`
        Consequence 2)"*); roster Row 29 note (4) (the same 6-37 clause); the AL15 annotation under the `6-34` sprint row (the same clause;
        and *"retags … with typed variables"* → *"declares a TRAI type for every `{#var#}` (SmartPing)"*). A dated Change-Log / annotation
        line in each; ⛔ a PM or AL moved. Sprint ledger line ([[project_sprint_status_safe_prepend]]).
- [x] **Task 1 — the vocabulary (AC1).** `packages/channels/src/dlt-variables.ts` + barrel export in `packages/channels/src/index.ts`
      as `export * from './dlt-variables.js'` (near `resolveOtpTemplate` / `resolveDltTemplate`, `:101-110`; ⛔ a named re-export — it
      would put `DLT_VAR` in `index.ts` and trip TV7 rule (iii); `export *` is house-legal — `packages/contracts/src/index.ts`,
      `packages/ui/src/index.ts`); `packages/channels/tests/dlt-variables.test.ts`. Doc comments
      spell types WITHOUT braces (Trap 10).
- [x] **Task 2 — the OTP (AC2).** `otp-sms-template.ts` (TV3: `OTP_VAR_SLOT` = TV1's `DLT_VAR`, `slots` with `name: 'otp'`, `version`
      unchanged, the header comment's *"single variable slot"* paragraph names the `numeric` type); `otp-sms-template.test.ts` (shape,
      contains-the-code, ⛔ `{#` in the body).
- [x] **Task 3 — the claim texts (AC3).** `claim-correction-sms-templates.ts`, `suspicion-notice-sms-templates.ts` (`slots` per TV4; the
      local `DLT_VAR` → TV1's import, RE-EXPORTED — both tests import it from the registry; texts ⛔ changed; header comments); the two
      jobs tests (shape over every entry; slot names = the i18n `{param}`s in order, both locales; the marker-order render leg; the sheet
      row, found by config key, carries the same types in order; the `PANEL_EN` literals ⛔ changed — they are the Panel's EN wording).
- [x] **Task 4 — the helpline warning (AC4; TV5 as `-322` C1).** `claim-dlt-sms-send.ts`: after the existing blank check, apply
      `isDltCallbackNumber` to the trimmed helpline; on a failure set `helplineNotCallbackNumber: true` on the FINAL results that follow a
      provider send (TV5 — ⛔ transient, ⛔ the no-send config finals) — ⛔ change to any outcome, `detail`, return path or the body (the
      result type gains the optional field; the wrapper re-exports it, `claim-correction-reminders.ts:110,219`). The four callers
      (`claim-correction-reminders.ts`, `claim-correction-closure.ts`, `claim-certificate-reminders.ts`, `claim-suspicion-notices.ts`)
      raise ONE warning on the flag, AFTER their transient branch, through their existing `alarmOf(deps)` sink. Update the wrapper's doc
      comment (`claim-correction-reminders.ts:205-206` says `claim-correction-send.test.ts` is *"UNEDITED"* — it is edited now). ⛔ Touch `helplineGap`, `configSet` or `purposeConfigGap`. Tests: the
      send-core legs (AC4's list, incl. the ⛔-flag transient and config legs); one `+911800123456` warning leg per caller; move the default `HELPLINE` fixtures (F12's list) to `1800123456` /
      `1800999999` — run the live suites against :5433 per the house live-DB gotchas.
- [x] **Task 5 — the alert registry (AC5).** `sms-dlt-registry.ts` (TV6 shape; `DltTemplate.contentTemplate: string | null`,
      `unregistrableReason`, `slots`); `resolveDltTemplate`; EVERY SMS real-path test F10 names — `provider-composition.test.ts`
      (`:194-204`, `:221-226`, `:228-232`), `contribution-provider-resolver.test.ts` (`:35`, `:114-115`, `:183-194`, `:250`),
      `apps/api/tests/unit/sms-composition.test.ts` (`:70-80`, `:99-104`, `:106-111`) — against a mocked registrable entry (the FILE-path
      mock in `apps/api`, or an injectable registry — say which); `sms.test.ts` (`:252-276`); AC5's observable dark proof.
- [x] **Task 6 — the handover OTP (AC8).** `step-up-delivery.ts` (`readonly template?: 'step_up'` on the `login` arm; the `step_up` arm
      gains `readonly template?: never` — the file's own FORBIDDEN pattern, `:49` / `:60` — so `payload.template` type-checks on the
      union; use the file's own `StepUpOtpIntent` member); `assertPayloadShape`'s `bag` cast (`sms-step-up-delivery.ts:100`, today `{ resolvedMobile?: unknown; pariwarId?: unknown }`) gains `template?: unknown`; `sms-step-up-delivery.ts:150` (`resolveOtpTemplate(payload.template ?? payload.intent)`);
      `assertPayloadShape` (`:99-115` — it checks only `resolvedMobile` / `pariwarId` today) rejects `template` on a `step_up` payload and
      any value other than `'step_up'` as `invalid_payload`; `claims.service.ts:178` passes `template: 'step_up'`; `createLogStepUpDelivery`
      (`step-up-delivery.ts:110`) and the test fake `CapturingStepUpDelivery` (`apps/api/tests/integration/_setup.ts:162`) accept it (the
      fake records it). Tests: the real adapter (`sms-step-up-delivery.test.ts` — handover → step-up text, the caller's E.164; the
      rejections); `claims-intake.spec.ts` (beside `:122` — `template: 'step_up'`, `intent` still `'login'`); the four other callers
      unchanged (member login `member-auth.handlers.ts:236/244`, member step-up `:524/533`, data export
      `member-data-rights/handlers.ts:659`, admin step-up `step-up/step-up.handlers.ts:43/50`).
- [x] **Task 7 — the gate (AC6).** (⛔ ordered after Task 8 — `:142` is prose, unscanned; v1.4 said otherwise.)
      `scripts/dlt-typed-variables/{lib.ts,check.ts,lib.test.ts,README.md}` per TV7 (rules i–iii; the zero-scan and in-scanned-set
      checks; the negative controls); `package.json` scripts; `scripts/ci-local.sh` (after `kyc-provider-boundary`, `:78`);
      `.github/workflows/ci.yml` (a job mirroring `:852-875`); `.githooks/pre-push` — `GATE_INPUTS` is an anchored filename regex (`:26`, `'^(\.decision-log\.md|friction-budget\.md)$'`): add the
      alternative `docs/launch-gate-inventory/.*` inside the group.
- [x] **Task 8 — the sheet (AC7).** `docs/launch-gate-inventory/dlt-template-requests-6-19.md` per TV8 — incl. the `:142` bullet
      rewrite (`-322` C3), 6.30's section and Record row KEPT, the cost lines' helpline length, prose types brace-less; a test asserting
      rows 15 / 16 list `numeric`.
- [x] **Task 9 — records and close (AC9, AC10).** Deferred-work: a NEW `## Deferred from: dev of 6-34-sms-templates-typed-variables
      (2026-MM-DD)` section at the END of `deferred-work.md` (as 6.29 / 6.30 / 6.28 did), items cited by phrase; plus the annotations
      AC9 lists on EXISTING items (in place). This file's Change Log + File List; `pnpm ci:local` green WITH `DATABASE_URL` (:5433) — run
      it, paste the summary incl. the live-DB job.

### Review Findings

Code review 2026-10-12 — `09321738..548c5a1d`, full review: Blind Hunter, Edge Case Hunter and Acceptance Auditor.
**0 decision-needed / 3 patch / 0 defer / 8 dismissed.** All three layers completed. These are engineering fixes; no Panel decision is needed.

- [x] [Review][Patch] **MEDIUM — Reject whitespace-bearing foreign braced tags** [packages/channels/src/dlt-variables.ts:66; scripts/dlt-typed-variables/lib.ts:30] — both `BRACED_TAG` detectors excluded whitespace, so `checkDltTemplateShape` over the OTP login text with its marker replaced by a numeric tag carrying a space inside its braces returned `[]`, and a sheet template row carrying that text also passed `scanDltText`. This violated Invariant 4 / TV1 / TV7(i): any braced hash tag other than the exact marker must fail. **FIXED:** both detectors now include whitespace; four negative cases per suite cover leading/trailing spaces, a tab and a malformed `var` tag, with valid-marker and prose/comment controls passing. Sources: blind + edge + auditor.
- [x] [Review][Patch] **MEDIUM — Reject callback slots whose maximum is below the callback minimum** [packages/channels/src/dlt-variables.ts:163] — a `cbn` slot with `maxLength: 1` or `2` passed shape validation despite `DLT_CBN_MIN_LENGTH = 3`, so no valid callback number could fill the approved slot. Load-bearing checklist family 10: REAL GAP in the helper's claim that an empty result means registrable as declared. **FIXED:** callback slots use the shared minimum, diagnostics report `3 to 14`, and a boundary test rejects lengths 1/2, accepts 3 and preserves one-character numeric/alphanumeric slots. Sources: blind + edge + auditor.
- [x] [Review][Patch] **LOW — Separate Row 30's pre-submission milestone from its completion target** [docs/launch-gate-inventory/inventory-roster.md:497] — the target preceded the first DLT template submission, while closure criterion (b) requires approved registrations, deployed ids and device receipt, which depend on submission. **FIXED:** the row targets completion before production OTP go-live, with the typed sheet and SmartPing label match as its pre-submission preparation milestone. All five closure criteria remain required. This is a scheduling correction, not a submission or merge fence. Source: auditor.

Verification: **309 / 309 focused tests passed** (channels 90, jobs 175, API 29, gate controls 15), **108 / 108 live tests passed** in the four claim SMS suites against the :5433 test DB, and the gate passed across **1,500 source files / 8 sheets**. Both validator gaps were reproduced directly. The full `ci:local` run was not repeated during this review; the build's recorded AC10 run remains its evidence. No implementation patches applied during review.

**Patch completion 2026-10-12 — BigDev chose Apply every patch.** All three fixes applied. The nine new regression cases failed before the fixes and passed afterward. Post-patch verification: **289 / 289 tests passed** (channels 95, jobs 175, gate controls 19); the tree gate passed (1,500 sources / 8 sheets); channels typecheck and ESLint on the touched channels files passed; `git diff --check` passed. No unresolved review findings. Story and sprint row → `done`; Row 30 remains `open` for the external evidence.

Triage dismissed eight candidates: unknown runtime slot types (registries are typed declarations, not externally loaded metadata); block-comment and trailing-comment scanner cases (the specified line heuristic, with registry shape tests as the second control); templates added to the vocabulary module and concatenated literals (speculative future uses outside the scanner's specified lexical boundary); additional sheet ordinal/length parity checks (current cells agree, specified parity is types/order/MSG91 text); throwing warning sinks (no concrete throwing sink established); and hypothetical future ceiling changes (current bounds agree and registry tests expose a narrowed ceiling).

Touched load-bearing families: 1 and 11 covered by construction (the new flag changes no state, outcome, recipient or benefit guard); 2 covered by existing live retry/redelivery/race tests *(⚠ corrected by the second pass, below: those live legs run with the digits-only `HELPLINE` default — family 2 is covered by construction, the warning after each caller's transient branch, plus the send-core unit legs proving ⛔ flag on timeout / rate limit)*; 6 covered by each new live warning leg's no-number-in-alarm assertion; 10 now covered by the callback-slot boundary test in `dlt-variables.test.ts`. External provider registration and device evidence remain openly pending in Row 30.

#### Second pass — 2026-10-12 (`bmad-code-review 6.34`, branch vs `main` `09321738` incl. the uncommitted first-pass patches)

Three layers (Blind Hunter on the 2,355-line code + test diff; Edge Case Hunter with repo access; Acceptance Auditor with the spec, the
docs diff, `-313` / `-314` / `-322` / `-323` verbatim and the load-bearing checklist). **0 decision-needed / 10 patch / 0 defer / 18
dismissed.** ⛔ No HIGH / MEDIUM. §0: every finding strips to "the code / the record should do X" — ⛔ no Panel question. Re-run read-only
by the layers: gate check green (1,500 sources / 8 sheets), gate tests 19/19, channels 95/95, jobs 175/175, API unit 29/29.

- [x] [Review][Patch] **LOW — The review patch edited the FROZEN `last_updated:` YAML key** [_bmad-output/implementation-artifacts/sprint-status.yaml — the `last_updated:` key (⛔ a line number: a newest-first file)] — the first pass prepended *"2026-10-12 (Story 6.34 code review complete …). Previous updates:"* to the folded scalar frozen since 2026-09-02r; the active ledger is the top comment block (which it also wrote, correctly, as `2026-10-12f`). Revert the two-line hunk; keep the comment entry. **FIXED:** the two-line hunk reverted; the `2026-10-12f` comment entry kept; a plain `yaml.safe_load` parses (277 rows, `6-34` = `done`).
- [x] [Review][Patch] **LOW — The header STATUS comment still says `ready-for-dev` — ✅ BUILDABLE** [_bmad-output/implementation-artifacts/6-34-sms-templates-typed-variables.md:22] — against `Status: done` at `:51` (family 10); and the v1.9 Change Log row sits above v1.0 (`:890`) where every other row ascends. Update the STATUS line; move v1.9 to the end. **FIXED:** the STATUS line reads `done` (built `548c5a1d`; reviewed twice) and keeps its BUILDABLE record; v1.9 moved to the end.
- [x] [Review][Patch] **LOW — The sheet's where-and-how points at the type columns "above"; they are BELOW** [docs/launch-gate-inventory/dlt-template-requests-6-19.md:29] — `:29` *"The column "Variable types" above"* and `:35` *"(the column above)"*; the table is § "The templates owed" at `:72`. BigDev copies from this section (AC7 / TV8). **FIXED:** both now name the *"Variable types"* / *"MSG91 template"* columns of *The templates owed* below.
- [x] [Review][Patch] **LOW — The pre-push header comment still says "the two files a ci:local gate READS"** [.githooks/pre-push:13] — `GATE_INPUTS` (`:26`) now carries a third alternative, `docs/launch-gate-inventory/.*` (the sheet this gate reads). **FIXED:** the comment names all three gate inputs (`bash -n` clean).
- [x] [Review][Patch] **LOW — The first pass's family-2 verdict is wider than its evidence** [_bmad-output/implementation-artifacts/6-34-sms-templates-typed-variables.md:644] — the live retry / redelivery / race suites run with the digits-only `HELPLINE` default, so ⛔ no such leg uses a malformed helpline; "⛔ warning on transient" is proven by the send-core unit legs (timeout, rate limit) plus each caller's structure (the warning after its transient branch). Restate the verdict as covered-by-construction + those unit legs. **FIXED:** the first-pass sentence annotated in place (⛔ rewritten — it is that pass's record) with the corrected verdict.
- [x] [Review][Patch] **LOW — An all-transient row that exhausts its retries is never warned, and the residual is unrecorded** [apps/jobs/src/scheduler/claim-correction-reminders.ts:276] — `-322` C1: *"on a failure it sends exactly as today and logs one warning"*; TV5 (v1.5) narrows the warning to provider-handed FINALS (⛔ one per pg-boss retry — sound). Residual: a row whose every attempt is `transient` (incl. a `withTimeout` timeout, which may have been delivered) ends at the `exhausted:*` finaliser's `error` with ⛔ flag ⇒ ⛔ warning for that row. Any other final send for the same Pariwar still warns, and Row 30 (c) is the control — record the residual in TV5's cost line (Source: edge + auditor). **FIXED:** recorded in TV5's cost line as accepted, with why ⛔ widened to the finaliser.
- [x] [Review][Patch] **LOW — The Policy meaning does not name TV6** [_bmad-output/implementation-artifacts/6-34-sms-templates-typed-variables.md:124] — `resolveDltTemplate` now returns `null` for all five alert categories whether or not an id is provisioned (the §3.4 (iii) SMS fallback). Behaviour is unchanged (⛔ id was ever provisioned) and the §0 header says so; the AI-10-1 section should say it in member terms (family 11, documentation only). **FIXED:** the Policy meaning and its member-terms sentence name TV6.
- [x] [Review][Patch] **LOW — Sheet "Registered text" rows 1–12 are only substring-matched** [apps/jobs/tests/claim-correction-sms-templates.test.ts:77; apps/jobs/tests/suspicion-notice-sms-templates.test.ts:98] — `expect(SHEET).toContain(registeredText)` passes `| 8 | A claim for {#var#} could not go ahead. Please call the helpline {#var#}. Thank you. |`; the OTP leg added here uses the exact row form `| ${n} | ${text} |` (`dlt-template-sheet.test.ts:28`). Pre-existing (6.19b / 6.24b), but this story makes the sheet the SmartPing copy source for 1–12 (TV8) — pin the exact row, number from `sheetRowByConfigKey` (Source: edge). **FIXED:** both tests pin `| ${number} | ${registeredText} |`, the number from `sheetRowByConfigKey`. Red-before proven: a row padded with *"Thank you."* (row 8) and a prefixed row 2 failed 2 tests; restored ⇒ green.
- [x] [Review][Patch] **LOW — Gate rule (i) sees a sheet row only at column 0 with an integer ordinal, and misses an escaped tag** [scripts/dlt-typed-variables/lib.ts:39] — `SHEET_TEMPLATE_ROW = /^\|\s*\d+\s*\|/`: a row indented 1–3 spaces (GFM still renders a table), an ordinal like `10a`, and a markdown-escaped alphanumeric tag (a backslash before each brace — it renders braced) return 0 findings (Edge's tsx probe). Defence-in-depth — existing rows have lockstep tests; it matters for the next new row (6.27c's 13 / 14, TV11). Accept leading whitespace and an alphanumeric ordinal, strip `\` before braces on sheet rows; mirror in `apps/jobs/tests/_dlt-template-sheet.ts:52` (Source: blind + edge). **FIXED:** `SHEET_TEMPLATE_ROW` = `/^ {0,3}\|?\s*\d+[A-Za-z]?\s*\|/` and sheet rows are read with markdown escapes of `{` `}` `#` undone (`MD_ESCAPE`); the jobs helper accepts the indentation and the letter ordinal. Six negative controls (red on the old regex — 6 failed — green after) + three look-alike controls (a 4-space code block, a numbered list item, the escaped marker) in `lib.test.ts`.
- [x] [Review][Patch] **LOW — AC10's `ci:local` evidence predates the final tree** [_bmad-output/implementation-artifacts/6-34-sms-templates-typed-variables.md:638] — the 36/36 run is against `548c5a1d`; the first-pass patches (`dlt-variables.ts`, `lib.ts`, both tests, Row 30) and these are UNCOMMITTED. Disclosed honestly at `:638`; owed: one `pnpm ci:local` WITH `DATABASE_URL` (:5433) on the committed final tree, its summary recorded here (family 10). **FIXED:** `DATABASE_URL=…:5433 pnpm ci:local` on the final tree (every first- and second-pass patch in place — the tree this review's commit records; only the unrelated `.gitignore` edit left out) ⇒ **`ci:local PASSED — 36 job(s) green`**, incl. `dlt-typed-variables` and `integration-tests`, exit 0.

**Patch completion (second pass) — BigDev chose Apply every patch.** All ten applied. New regression cases proved red before / green after (gate: 6 failed on the old row regex; sheet: 2 failed on a padded / prefixed row). Post-patch: gate tests 26/26, gate scan green, jobs focused 175/175, channels 63/63, jobs typecheck + touched-file ESLint clean, `git diff --check` clean; full `ci:local` WITH :5433 — 36/36 green. ⚠ Root ESLint cannot lint `scripts/` (`@twt/eslint-config-twt` unresolvable from the root — pre-existing, ⛔ this change). ⛔ No unresolved finding; Status stays `done`; Row 30 stays `open` for the external evidence.

Dismissed (18): rule (i) only on registry files (by design — `-322` C2 *"the gate reads only registered text"*; rules (ii) / (iii) fence the rest); `.js` / `apps/*/app` outside the scan (Edge verified ⛔ such file holds the marker or prefix); `isCodeLine` block / trailing comments, unknown slot types, templates in the vocabulary module (first-pass dismissals, ⛔ new evidence); half-tags (an opening brace-hash with ⛔ closing hash) / a doubly-braced marker (every registered text is `toBe`-pinned); `DLT_MARKER` gate-local copy (documented — `scripts/` cannot import package TS; SmartPing's syntax); REGISTRY_FILES comment (it discloses the dark alert registry's test); a registrable alert entry's text unused at send (TV6 dark + `sms.test.ts` + the AC9 deferred-work item); send-time `maxLength` / name checks (Row 30 (d) / 6.27c `name_too_long`); a warning per send per sweep (`-322` C1's design); a non-`SmsSendError` throw after hand-off (provider `send` never rejects — `sms-dlt.ts`); README "missing" (it is in the docs diff); the suspicion test's own `SHEET` read (6.24b, noise); adjacency enforced only by registry tests (the specified second control); sheet `≤ N` ceilings vs slots (first-pass dismissal — parity is types / order / MSG91 text); the coverage check ⛔ pinning the sheet by name (the lockstep tests read it by path — the second control); `.decision-log.md` missing from the File List (its entries are cited by id + SHA in the header; the File List is the build's).

Checklist verdicts (Auditor): 1 covered-by-construction (⛔ new event / state / outcome / `detail`; the flag never reaches `finalise`; four live legs assert `accepted`, `detail` null) · 2 covered-by-construction (+ the send-core unit legs; first-pass wording corrected above) · 6 covered-by-test (four live legs assert ⛔ `+911800123456` in the alarm) · 10 covered, two LOW notes above (STATUS header; AC10 on the final tree) · 11 covered-by-construction for the claim texts and TV9; TV6 documentation gap above.

#### Third pass — 2026-10-12 (`bmad-code-review 6.34`, the review-fix commit `ba08558f` only)

Three layers on the fixes themselves (Blind Hunter on the 214-line code diff; Edge Case Hunter with repo access + probes over all 8
scanned sheets; Acceptance Auditor with the spec, `-322` / `-323` verbatim and the checklist). **0 decision-needed / 6 patch / 0 defer /
11 dismissed.** ⛔ HIGH / MEDIUM; ⛔ Panel question (§0 — a gate's regex, a test's anchoring and a record's accuracy). Re-run read-only:
gate tests 26/26, gate scan green, jobs 175/175, channels 63/63; the frozen `last_updated:` key identical to `main`; Change Log 1.0 → 1.10
in order. The Edge probe: the widened row regex selects ⛔ new row in today's 8 sheets (28 rows in the 6.19 sheet, 0 elsewhere, both regexes).

- [x] [Review][Patch] **LOW — TV5's residual names the wrong finalisers (family 10 — REAL GAP)** [_bmad-output/implementation-artifacts/6-34-sms-templates-typed-variables.md:346] — the second pass cites `exhausted:crossed_midnight` / `exhausted:recheck_<reason>` (the stale-child and K4 re-check paths) as "its job's exhausted-row finaliser" and says "the closure and certificate twins alike". The code: THE EXHAUSTED-ROW FINALISER writes `exhausted:attempting_past_day` (`claim-correction-reminders.ts:697-714`, `claim-certificate-reminders.ts:176-183`); `claim-correction-closure.ts` has ⛔ `exhausted:*` path (a stuck closure row is re-claimed by the next closure sweep or closed by the reminders module's finaliser); and the suspicion give-up `exhausted:attempting_three_days` (`claim-suspicion-notices.ts:220-231`) is omitted. The conclusion stands (⛔ warning for such a row; Row 30 (c) is the control) and the residual is slightly WIDER than recorded — correct the paths (Source: auditor). **FIXED:** TV5's cost line now names every give-up path — THE EXHAUSTED-ROW FINALISER (`exhausted:attempting_past_day`, reminders — incl. stuck closure notices — and certificate), the stale-child / re-check paths, and the suspicion give-up (`exhausted:attempting_three_days`) — and says the finals-only narrowing is the story's reading of C1's *"one warning"*.
- [x] [Review][Patch] **LOW — The pipe-less row branch lifts the indentation limit and pulls prose in** [scripts/dlt-typed-variables/lib.ts:43] — `/^ {0,3}\|?\s*\d+[A-Za-z]?\s*\|/`: with ⛔ leading pipe, `\s*` swallows any indentation, so an 8-space or tab-indented code-block line and a prose line like `2024 | revenue |` are read as template rows — contradicting its own "up to three leading spaces" and WIDENING `-322` C2(i)'s *"ONLY … the template table rows (`^\|\s*\d+\s*\|`)"* past rows. And the doc comment's "every look-alike GFM still renders as one" over-claims (a blockquoted, list-nested or bold-ordinal row is ⛔ read). Fail-closed and ⛔ such line exists today. Fix: REQUIRE the leading pipe (the sheet's convention, C2's pattern) — `/^ {0,3}\|[ \t]*\d+[A-Za-z]?[ \t]*\|/`; the "no leading pipe" control becomes a look-alike (clean) control; the comment names exactly what is read and that the lockstep pins are the second control (Source: blind + edge + auditor). **FIXED:** `SHEET_TEMPLATE_ROW = /^ {0,3}\|[ \t]*\d+[A-Za-z]?[ \t]*\|/` — the leading pipe required; the doc comment names what is read and what is ⛔ (the lockstep pins the second control). Controls: the pipe-less, 8-space, tab, `2024 |` prose and tab-indented-row lines are clean (red on the pass-2 regex — 1 failed test — green after); the indented / lettered / escaped rows still fail.
- [x] [Review][Patch] **LOW — `sheetRowByConfigKey` selects a lettered ordinal it cannot return** [apps/jobs/tests/_dlt-template-sheet.ts:54] — the second pass widened its regex to `[A-Za-z]?` but `number: Number(cells[1])` makes `13a` → `NaN` (a `| NaN | … |` pin, a misleading `toBe(15)`); and its comment calls it "the gate's SHEET_TEMPLATE_ROW" while differing. Main-table ordinals are config-keyed integers — drop the letter from the helper, keep the indentation, say how it differs (Source: blind + edge). **FIXED:** the helper selects `^ {0,3}\|[ \t]*\d+[ \t]*\|` (whole-number ordinals, indentation kept) and its comment says how it differs from the gate.
- [x] [Review][Patch] **LOW — The "WHOLE row" pin is neither line-anchored nor unique** [apps/jobs/tests/claim-correction-sms-templates.test.ts:81; apps/jobs/tests/suspicion-notice-sms-templates.test.ts:102; apps/jobs/tests/dlt-template-sheet.test.ts:28] — `toContain('| n | text |')` passes a stale second row with the same ordinal beside the exact one, a mid-line occurrence, or an extra trailing cell. Assert exactly ONE non-main-table line with that ordinal, and that it EQUALS `| n | text |` (trimmed) — the OTP pin too (Source: blind + edge + auditor). **FIXED:** ONE helper, `expectRegisteredTextRow(number, text)` in `_dlt-template-sheet.ts` — exactly one non-main-table line with that ordinal, and it EQUALS `| n | text |` — used by the claim-correction, suspicion and OTP pins. Red-before: a stale duplicate row 8 and an extra cell on row 16 (both passed the old `toContain`) failed 2 tests; restored ⇒ green.
- [x] [Review][Patch] **LOW — A `file:NNN` into `sprint-status.yaml` in the second pass's own finding** [_bmad-output/implementation-artifacts/6-34-sms-templates-typed-variables.md:659] — the GLYPH rule forbids it (newest-first file), and it had already drifted (`:19489` → `:19495`). Cite "the `last_updated:` key" (Source: auditor). **FIXED:** cites the `last_updated:` key.
- [x] [Review][Patch] **LOW — Braced type forms in review prose** [_bmad-output/implementation-artifacts/6-34-sms-templates-typed-variables.md:640] — the TYPE SPELLING RULE (`-322` C2): braced forms only where quoting a FOREIGN portal's notation. `:640` (a probe input with a space inside the braces), `:667` (a backslash-escaped alphanumeric tag) and `:672` (a half-tag) are defect examples, ⛔ portal notation — re-word them without braces (Source: auditor). **FIXED:** all three re-worded without braces.

**Patch completion (third pass) — BigDev chose Apply every patch.** All six applied. Red before / green after: the gate's new clean controls (1 test failed on the pass-2 regex); the exact-row pin (a stale duplicate row and an extra cell — 2 tests failed, both had passed the old substring check). Post-patch: gate tests 25/25 (one case moved from "fails" to "clean"), gate scan green, jobs focused 175/175, jobs typecheck + touched-file ESLint clean, `git diff --check` clean; full `ci:local` WITH :5433 — 36/36 green. ⛔ No unresolved finding; Status stays `done`; Row 30 stays `open` for the external evidence.

Dismissed (11): blockquote / list-nested / bold-ordinal / HTML-entity look-alikes (⛔ the sheet's convention; the lockstep pins are the second control — the comment now says so); the escape-undo over-reporting inside a code span (fail-safe; a template row is registered text, where a braced type is forbidden anyway); hash-bearing malformed tags and single-brace typos (the half-tag class, dismissed twice; registries `toBe`-pinned, sheet rows now exact-pinned); JS-escaped / concatenated tags in registry code (dismissed twice; the shape test sees the runtime value — Edge verified); the whitespace-tolerant `BRACED_TAG` spanning two literals on one code line (fail-safe; ⛔ such line); fenced code and numbered notes rows scanned (pre-existing, fail-safe); the cbn message wording (nit — the boundary is right); `GATE_INPUTS` "unverified" (it carries `docs/launch-gate-inventory/.*` — `:26`); the escaped marker passing the gate but failing the pin (fail-closed); the channels count 95 vs 63 (two different file sets — 3 files vs the first pass's wider set); `-322` C1's narrowing to finals living in the story only (an engineering reading of "one warning" — ⛔ per retry; recorded at TV5 v1.5 and kept; ⛔ Panel, ⛔ a new decision entry).

Checklist verdicts (Auditor): 2 covered-by-construction (⛔ code path changed; the family-2 annotation verified true) · 5 not-constructible (code-resident registries, ⛔ DB rows) · 10 REAL GAP (LOW) — the TV5 residual paths, patched above · 11 covered (the TV6 sentence verified against `resolveDltTemplate` / `resolveSmsProviderDeps`; still one member-terms sentence).

## Dev Notes

### ⚠ TRAPS
1. **⛔ Change a WORD of a registered text** — templates 1–12 are Panel-ratified wording (and 1–4's Hindi is human-reviewed — Row 20);
   ⛔ a character of any text changes — only each slot's TYPE is declared beside it (v1.1; v1.0's "`{#var#}` → a tag" is retired). A
   text that "reads better" is a §0 event. ⛔ Turn the alert SMS fallback ON (TV6). ⛔ Change who is texted, or when — incl. holding or
   refusing a send over the helpline's FORMAT (`-322` C1).
2. **⛔ "Tidy" `{#var#}` into a typed tag** — on STPL / SmartPing the text KEEPS `{#var#}` (v1.1); a `{#numeric#}` in the OTP text would
   be registered as literal text, AND `renderOtpBody` would stop inserting the code (F8) — the SMS would go out with ⛔ code. The
   rendered-body `toBe` pins and TV7's gate are the proof.
3. **The helpline check WARNS, ⛔ gates** (`-322` C1; F12) — ⛔ return `config:helpline_number_missing`, ⛔ hold, ⛔ skip a send over the
   format: on three of the four paths that drops a family's notice; on the correction chase it also moves D22's `reachedBySms` (the
   Trustee-ratified `-252`). ⛔
   Normalise the value either (stripping `+` / spaces changes the rendered body — Invariant 1); the fix is staff correcting the secret.
4. **`helplineGap` / `configSet` / `purposeConfigGap` stay as they are** — `configSet` also reads template ids; ⛔ the callback-number
   predicate goes anywhere but the send core's resolved helpline.
5. **⛔ A second copy of the vocabulary** — `DLT_VAR` and the six types live in `dlt-variables.ts` only
   ([[feedback_stub_must_call_not_transcribe]]); the gate needs only the literals `{#var#}`, `DLT_VAR`, `sms.dlt.template_id.` and a
   "⛔ any other braced tag" regex — if it imports anything from the package, use a relative path (a `scripts/` gate cannot import a
   workspace package's TS by bare name).
6. **`ci.yml` AND `ci-local.sh`** — drift between them is invisible ([[project_ci_actions_suspension_local_mirror]]).
7. **⛔ Provision anything** — ⛔ template id, ⛔ helpline, ⛔ secret (Invariant 6). Row 30 is BigDev's.
8. **Contracts / jobs tests are outside tsc in places** — run vitest for every touched package ([[project_contracts_tests_outside_tsc]]).
9. **Markdown in a doc block** — `**…**/` closes a JSDoc ([[project_markdown_emphasis_closes_jsdoc]]); grep `\*\*/` after editing a
   header comment. ⛔ `prettier --write` ([[project_prettier_not_enforced]]) — hand-format.
10. **Types WITHOUT braces outside registered text** (TYPE SPELLING RULE; TV7) — in doc comments, the sheet's prose, README, Row 30:
    `#numeric#` or "numeric", ⛔ the braced form. And ⛔ `{#var#}` (rule (ii)), `DLT_VAR` or `sms.dlt.template_id.` (rule (iii) — a
    whole-word / literal match, comments included) in ANY line of a non-registry src file — e.g. the wrapper doc comment Task 4 edits,
    `claim-dlt-sms-send.ts`, a comment in `index.ts`.
11. **⛔ A send-time length / type guard on `{member}` / `{date}`** — it changes WHO is texted (§0); the `{member}` > 40 case stays the
    open deferred item (TV4).
12. **⛔ Apply `isDltCallbackNumber` to the app's `EXPO_PUBLIC_HELPLINE_TEL`** (`apps/mobile/components/common/CallHelplineCTA.tsx:27`,
    default `'+911800000000'`) — a different, global, tap-to-call number that is ⛔ DLT; out of scope.
13. **Dark ≠ broken** (TV6) — the five alert categories' ids, if provisioned, do nothing; ⛔ "fix" that by registering text (new
    member-facing wording ⇒ §0).
### Reuse map
- Gate skeleton → `scripts/kyc-provider-boundary/`. Registry style → `otp-sms-template.ts` (TOTAL map) / `sms-dlt-registry.ts` (partial).
- Helpline warning → the send core's result type + ONE optional field, and each caller's existing `alarmOf(deps)` sink — ⛔ a new sink; 6.29's
  `helplineGap` / `configSet` (`claim-suspicion-notices.ts:111-139`) are ⛔ touched (`-322` C1).
- Real `t()` render → the existing `renderClaimCorrectionSms` / `renderSuspicionNoticeSms` — ⛔ edited beyond comments.

### Testing standards
Vitest per package (`packages/channels`, `apps/jobs`, `apps/api`, `scripts/dlt-typed-variables`); jobs live-DB tests on :5433
([[project_live_db_test_gotchas]]); the merge gate is `pnpm ci:local`.

### Project structure notes
- NEW: `packages/channels/src/dlt-variables.ts`, `packages/channels/tests/dlt-variables.test.ts`, `scripts/dlt-typed-variables/*`.
- UPDATE: `packages/channels/src/{otp-sms-template.ts,sms-dlt-registry.ts,index.ts}`; `apps/jobs/src/scheduler/{claim-correction-sms-templates.ts,
  suspicion-notice-sms-templates.ts,claim-dlt-sms-send.ts,claim-correction-reminders.ts,claim-correction-closure.ts,
  claim-certificate-reminders.ts,claim-suspicion-notices.ts}` (the last four: the warning on the flag only); `apps/api/src/modules/auth/shared/
  {step-up-delivery.ts,sms-step-up-delivery.ts}`; `apps/api/src/modules/claims/claims.service.ts`; tests as above (incl. the jobs
  `HELPLINE` fixtures, the F10 composition sites, `apps/api/tests/integration/_setup.ts`); `package.json`; `scripts/ci-local.sh`;
  `.github/workflows/ci.yml`; `.githooks/pre-push`; `docs/launch-gate-inventory/{dlt-template-requests-6-19.md,inventory-roster.md}`;
  `epics.md`; `deferred-work.md`; `sprint-status.yaml` (annotations + ledger); 6.27a / 6.27c / 6.30 story files (annotation lines only).
- ⛔ Touched: `packages/i18n/locales/**`, any migration, `packages/domain/src/claim/suspicion-notice.ts`'s `detail` grammar,
  `helplineGap` / `configSet` / `purposeConfigGap`.

### Sequencing
⭐ 6.34 is ⛔ blocked by any Panel question or sibling. It UNBLOCKS 6.30's Row 29 (e) (only once Row 30 (b) closes — an operator step)
and gives 6.27c its vocabulary (TV11). ⭐ Row `6-37-msg91-sms-gateway-adapter` (`-314`) comes AFTER this story and consumes its named,
typed slots — ⛔ the other way round; if 6-37 is started first it STOPS and asks. 6-37's create-story owes an SMS-provider ADR
(ADR-0027 / -0028 / -0040 precedent — `-322`); 6.34 builds ⛔ provider code. 6.27c WAITS for 6.34 (`-322` C6 — its STATUS line says so
from Task 0.4). Rows 6-31 (WhatsApp — ⛔ DLT) and 6-35 (language switch) are independent.

### Previous story intelligence
- **6.30** (AL15) recorded the typed-variable facts and handed them here; its Latest-tech section is the first fetch of F1–F6.
- **6.29** made the suspicion notices' `detail` a CHECKed grammar (0155) and added the per-(purpose, Pariwar) hold — on the SUSPICION
  path only; `-313` TV5 assumed it covered every claim text and was superseded (`-322` C1) — TV5 now touches ⛔ hold.
- **6.28** (shipped on `main` after the pin) changed only en `claim.json`'s `$comment.closed` — ⛔ an SMS body; its closure code reads
  ⛔ helpline value.
- **6.24b** extracted the shared send core and wrote templates 7–12; **6.19b / 6.19d** wrote 1–6 and the sheet.
- **5.9** built the two OTP templates and the prod fail-startup; **5.6** the alert registry and composition seam.

### Git intelligence
`34b9bab6` the PR #268 SHA map (the original pin) · `09321738` `main` at the v1.4 rebase (6.30 PR #270 and 6.28 PR #272 merged) ·
`9b22e69d` `-313` · `b7ebf48f` `-314` · `31fe84d8` `-322` · `2b938bc6` `-323` — house order: decision entry → records → build → review; REBASE-merge
([[project_story_automator_ops]]). This story's branch `story/6-34-sms-templates-typed-variables` was cut from `main` at `34b9bab6` and
REBASED onto `09321738` on 2026-10-12 (old tip: tag `backup/6-34-pre-rebase`).

### Latest tech information (fetched 2026-10-10, re-fetched 2026-10-12 — re-check at Task 0.1)
- TRAI Direction 18 Nov 2025: `https://www.trai.gov.in/sites/default/files/2025-11/Directions_18112025_0.PDF` (PR No. 133).
- TCCCPR 2nd Amendment 12 Feb 2025 (30 % fixed; ≤ 3 variables; adjacency; CTA scrubbing; Transactional = OTP incl. app login):
  `https://www.trai.gov.in/sites/default/files/2025-02/Regulation_12022025.pdf`. 3rd Amendment 2026 (PR No. 119/2026) — ⛔ about tags.
- Vi: `https://www.vilpower.in/static/link_documents/usermanuals/Entity_Content_template_registration.pdf` (tags `{#num#}` …; logger mode
  ⛔ yet started, Sep 2026); `…/CTA_Whitelisting.pdf` (CBN formats).
- Jio: `https://trueconnect.jio.com/assets/Trai_module/SampleFileDownloads/Content%20template%20registration%20user%20guide.pdf` (`{#number#}`;
  internally inconsistent on number length / special characters); `…/CTA%20Whitelisting%20USER%20GUIDE.pdf`.
- MSG91 variable-tagging help (SmartPing / Tata: *"Variable tags are not appended in the template text"* — tagged in the portal's
  tagging section): `https://msg91.com/help/dlt-registration-in-india/variable-tagging-on-dlt-sms-templates` (re-fetched 2026-10-10).
- ⭐ STPL = Satzilio Telecom Pvt Ltd (ex-V-Con / Videocon), the SmartPing DLT portal `https://smartping.live/entity/home`
  (`https://help.authkey.io/dlt-registration/smartping-dlt-registration-stpl-videocon/`); PingConnect profiles migrated to SmartPing from
  8 Oct 2025 (MSG91). The PE's portal per BigDev, 2026-10-10.
- STPL's own SmartPing manual: `https://smartping.live/entity/assets/img/newHelpImg/pdf/Content%20Template.pdf` (per-variable
  pre-tagging; the option labels are images only). MSG91 DLT FAQ: `https://msg91.com/help/dlt-registration-in-india/dlt-content-template-faqs`
  (*"each Variable should be written as {#var#}"*; *"a Variable cannot be the last word"* — legacy, undated). MSG91 Flow:
  `https://api.msg91.com/apidoc/textsms/send-sms-flow.php`; *"On DLT, the standard format of a VARIABLE is {#var#} and not ##var##"*:
  `https://msg91.com/help/dlt-registration-in-india/error-description-sms-not-matched-with-dlt-template`.
- UNVERIFIED (secondary / single source): the ~14 Jan 2026 cut-over; leading zeros; Devanagari in `#alphanumeric#`; the unit of the 40
  limit; a variable as the last word; template-id behaviour outside Vi; `{#var#}` kept literally in SmartPing's text (MSG91 + BigDev).

### References
- `2026-10-12-322` C1–C9 · `2026-10-12-323` R1–R2 · `2026-10-10-313` · `2026-10-10-314` · `2026-10-10-310` (+ the 6.27 confirms note) · `2026-09-27-252` ·
  `2026-10-10-305` §2 item 5, §4 · `2026-10-10-312` AL15 · `2026-10-10-311` PM3 · `2026-10-10-302` §1 (c) / RN2 / RN5 · `2026-10-08-295`
  RB1 / RB11 / RB12 · Story 5.6 / 5.9 files · architecture §2.2, §3.4 · `epics.md` AR-21, AR-56 · PRD §TRAI compliance.
- `_bmad-output/implementation-artifacts/6-30-app-links-open-the-app-from-a-text.md` (SIX FACTS #3, AL15); 6.27a / 6.27c files.
- `docs/launch-gate-inventory/dlt-template-requests-6-19.md` (incl. 6.30's `## URL whitelisting`), `inventory-roster.md` (Rows 18–26, 29).

## Dev Agent Record

### Agent Model Used

Claude Opus 5.5 (1M context) — `bmad-dev-story 6.34`, 2026-10-12.

### Debug Log References

- **Task 0.1 (2026-10-12):** `git fetch` — `origin/main` = `09321738`; `git diff --name-only 09321738..HEAD` over every cited code path is
  EMPTY ⇒ ⛔ cite moved. F1–F6 + STPL / MSG91 re-fetched 2026-10-12 (a read-only research agent; the PDFs read via fallback): all hold.
  New, ⛔ changing a TV: (a) STPL's own SmartPing manual lists a PRE-Nov-2025 tag set (Name / Date / Address / Phone / URL / NUMBER) —
  Row 30 (a)'s screenshot-and-match stands as written; (b) the agent read Vi's alphanumeric as ⛔ allowing special characters while
  v1.4 read Vi's example value *"11B Worli Mumbai"* as allowing spaces — a cross-operator inconsistency, already Row 30 (d)'s question;
  (c) MSG91's Flow v5 calls its id `flow_id` (6-37's concern); (d) ⛔ calendar date for rejection — 60 days from scrubbing start (F1).
- **Sequence:** Task 8 (the sheet) was built right after Task 3 — Task 3's sheet-row legs (AC3) need the new columns — and before
  Task 7; the gate then ran over the finished sheet (green). ⛔ Other reordering.
- **TV6 — the mock, ⛔ an injectable registry (the author's choice):** `vi.mock` of the registry FILE with ONE registrable fake entry
  (`deadline_reminder` → `sms.dlt.template_id.test_registrable`, a fixed-text template) in `packages/channels/tests/
  provider-composition.test.ts`, `contribution-provider-resolver.test.ts` and `apps/api/tests/unit/sms-composition.test.ts` (path
  `../../../../packages/channels/src/sms-dlt-registry.js`) — ⛔ a production seam added for tests. Proof the api mock intercepts:
  its outage leg rejects (the real dark registry would return `null` first). ⚠ `importActual<typeof import(<that path>)>()` in
  apps/api pulled a channels source file into apps/api's tsc program (TS6059 rootDir) ⇒ typed as `Record<string, unknown>`.
- **TV6 — the vacuous legs made non-vacuous:** the "NOT provisioned" legs now also assert `resolveConfig` WAS called with the fake
  key; the real-path legs assert `providerMessageId === 'gw-id'` (⛔ the shared `id: 'sms-dlt'`). AC5's dark proof runs UNMOCKED in
  `sms.test.ts` (each v1 category, an id provisioned ⇒ `null` deps, `resolveConfig` ⛔ called, `messaging` ⛔ called).
- **TV5 — the warning text:** ONE builder, `helplineNotCallbackNumberWarning(pariwarId, purpose)` in `claim-dlt-sms-send.ts` (a pure
  string — the core still never logs); each caller logs it through `alarmOf(deps)` after its transient branch; purposes: `correction
  reminder`, `closure notice`, `certificate reminder`, `suspicion notice (<purpose>)`. ⛔ the number in the text (each live leg asserts it).
- **TV7 — the gate's coverage check fired live** on the first run: `dlt-variables.ts` was untracked ⇒ *"⛔ in the scanned set"* ⇒
  `git add -N` ⇒ green (1500 tracked source files, 8 sheets). `:(glob)` pathspecs.
- **TV9:** `template?: Extract<StepUpOtpIntent, 'step_up'>` on the `login` arm, `template?: never` on `step_up`; `assertPayloadShape`
  rejects any present `template` on `step_up` and any value but `'step_up'` (incl. `null`) on `login`. The admin path's captured
  payload is pinned template-free in `moderation-grounds.spec.ts`.
- **AC10 — `pnpm ci:local` WITH `DATABASE_URL` (:5433), 2026-10-12:** run 1 — 35 / 36 green, `lint` RED on this story's own test
  (`_label` unused in `sms-step-up-delivery.test.ts`) — fixed; run 2 — **`ci:local PASSED — 36 job(s) green`**, incl.
  `dlt-typed-variables` and `integration-tests` (turbo `23 successful, 23 total`: domain 4948 passed / 1 skipped, jobs 797, api 1628 /
  1 skipped, channels 226, validity-service 284, niyamavali-engine 144, events 36, queue 4). ⚠ `scripts/` is ⛔ linted by `ci:local`
  (the root ESLint config errors on `scripts/kyc-provider-boundary/` too) — the gate's scripts follow that house practice.
- **Live suites (:5433, 2026-10-12):** the four claim live suites + `claim-correction-send.test.ts` — 169 / 169; the TV9 integration
  specs (`member-auth`, `claims-intake`, `delivery-and-correction`, `moderation-grounds`) + the adapter unit — 93 / 93.

### Completion Notes List

- **Task 0:** governance FIRST — `25e7bba5` (alone, before any code): `epics.md` `### Story 6.34`; roster **Row 30**
  `sms-dlt-templates-typed-and-registered` (a)–(e) + notes; the TV11 / `-322` C6, C7 / `-323` R1 annotations on 6.27a (PM3, Row 27's
  evidence line, `:615`, Task 0.4 — both notes), 6.27c (STATUS *"AND row 6-34 is done"*, AC5, AC8, Task 1 incl. the helpline-warning
  clause, Task 5, Dev Notes), 6.30 (SIX FACTS #3, AL15 + the 6-37 clause), Row 29 note (4), the `6-27c` and `6-34` sprint rows; each
  with a dated Change-Log / annotation line; ⛔ a PM or AL moved. Sprint ledger 2026-10-12d.
- **Task 1 (AC1):** `packages/channels/src/dlt-variables.ts` — `DLT_VAR`, the six types + ceilings (one constant each), `DltSlot`,
  `checkDltTemplateShape` (slot count, foreign tag, ≤ 3, adjacency, ≥ 30 % fixed, name shape, duplicate name, maxLength range) →
  `{ rule, message }[]`, `isDltNumeric`, `isDltCallbackNumber`; `export *` from the barrel. 13 unit legs (each rule pass + fail).
- **Task 2 (AC2):** the OTP marker is TV1's; `slots: [{ otp, numeric, 6, 'OTP code' }]`; texts and `version` unchanged; legs: text
  pinned, shape clean, body byte-identical, contains `048213`, ⛔ `{#`.
- **Task 3 (AC3):** both claim registries declare `slots` per TV4 and re-export TV1's `DLT_VAR`; ⛔ a text or `claim.json` changed.
  Legs per entry × locale: shape; slot names = the i18n `{param}`s in order (both locales); the real `t()` keyed by slot name places the
  markers in order and reproduces `registeredText`; the sheet row (by config key) lists the same types in order and the MSG91 form.
- **Task 4 (AC4):** the send core flags `helplineNotCallbackNumber` on provider-handed finals only; four callers warn once. Send-core
  legs (accepted ×2 forms, three rejects, timeout exact, rate limit, unconfigured gateway, half-configured client, digits-only ⛔ flag,
  unset unchanged); one live warning leg per caller; the default `HELPLINE` fixtures moved to `1800123456` / `1800999999`.
- **Task 5 (AC5):** the five entries DARK (`contentTemplate: null`, `unregistrableReason: 'whole_body_variable'`, `slots: []`);
  `resolveDltTemplate` returns `RegistrableDltTemplate | null`; every F10 test site moved to the mocked registrable entry.
- **Task 6 (AC8):** the handover sends the step-up text to the same caller-supplied number; one-way switch; the other four callers pinned.
- **Task 7 (AC6):** `scripts/dlt-typed-variables/{lib.ts,check.ts,lib.test.ts,README.md}`; 15 negative-control legs; `package.json`,
  `ci-local.sh`, `ci.yml` (a job mirroring kyc-provider-boundary), `.githooks/pre-push` `GATE_INPUTS` += `docs/launch-gate-inventory/.*`.
- **Task 8 (AC7):** the sheet retitled; main table → types + MSG91 columns for 1–12, 15, 16; where-and-how / types / shape rules /
  not-registrable / templates 15–16 / helpline sections; cost lines re-derived (10-digit helpline: 178 / 168 / 209 / 217 / 194 / 182 /
  101 / 88 / 96 / 145 / 127 — segment counts unchanged); 6.30's section kept, its bullet answered (C3); a Record row. OTP rows proved by
  `apps/jobs/tests/dlt-template-sheet.test.ts`.
- **Task 9 (AC9):** deferred-work — a new section at the END (six items, incl. `-323` Consequence 2) + four in-place annotations
  (`{member}` 40 vs 30; dotted keys; *"DLT registration untracked …"* ⭐ ADDRESSED IN PART; OTP English-only + the brand).
- ⚠ **Not done here, by design:** ⛔ any template id, helpline or secret set (Invariant 6); ⛔ any submission (Row 30 is BigDev's).

### File List

**Governance (`25e7bba5`, before code):** `_bmad-output/planning-artifacts/epics.md` · `docs/launch-gate-inventory/inventory-roster.md` ·
`_bmad-output/implementation-artifacts/6-27-peer-mesh-sending-replies-and-date-of-death.md` ·
`_bmad-output/implementation-artifacts/6-27c-peer-mesh-sending-texts-and-links.md` ·
`_bmad-output/implementation-artifacts/6-30-app-links-open-the-app-from-a-text.md` · `_bmad-output/implementation-artifacts/sprint-status.yaml`

**New:**
- `packages/channels/src/dlt-variables.ts`
- `packages/channels/tests/dlt-variables.test.ts`
- `apps/jobs/tests/_dlt-template-sheet.ts`
- `apps/jobs/tests/dlt-template-sheet.test.ts`
- `scripts/dlt-typed-variables/lib.ts`
- `scripts/dlt-typed-variables/check.ts`
- `scripts/dlt-typed-variables/lib.test.ts`
- `scripts/dlt-typed-variables/README.md`

**Modified — code:**
- `packages/channels/src/index.ts`
- `packages/channels/src/otp-sms-template.ts`
- `packages/channels/src/sms-dlt-registry.ts`
- `apps/jobs/src/scheduler/claim-correction-sms-templates.ts`
- `apps/jobs/src/scheduler/suspicion-notice-sms-templates.ts`
- `apps/jobs/src/scheduler/claim-dlt-sms-send.ts`
- `apps/jobs/src/scheduler/claim-correction-reminders.ts`
- `apps/jobs/src/scheduler/claim-correction-closure.ts`
- `apps/jobs/src/scheduler/claim-certificate-reminders.ts`
- `apps/jobs/src/scheduler/claim-suspicion-notices.ts`
- `apps/api/src/modules/auth/shared/step-up-delivery.ts`
- `apps/api/src/modules/auth/shared/sms-step-up-delivery.ts`
- `apps/api/src/modules/claims/claims.service.ts`

**Modified — tests:**
- `packages/channels/tests/otp-sms-template.test.ts`
- `packages/channels/tests/sms.test.ts`
- `packages/channels/tests/provider-composition.test.ts`
- `packages/channels/tests/contribution-provider-resolver.test.ts`
- `apps/jobs/tests/claim-correction-sms-templates.test.ts`
- `apps/jobs/tests/suspicion-notice-sms-templates.test.ts`
- `apps/jobs/tests/claim-correction-send.test.ts`
- `apps/jobs/tests/claim-correction-reminders-live.test.ts`
- `apps/jobs/tests/claim-correction-closure-live.test.ts`
- `apps/jobs/tests/claim-certificate-reminders-live.test.ts`
- `apps/jobs/tests/claim-suspicion-notices-live.test.ts`
- `apps/api/tests/unit/sms-composition.test.ts`
- `apps/api/tests/unit/sms-step-up-delivery.test.ts`
- `apps/api/tests/integration/claims/claims-intake.spec.ts`
- `apps/api/tests/integration/member-auth.spec.ts`
- `apps/api/tests/integration/member-data-rights/delivery-and-correction.spec.ts`
- `apps/api/tests/integration/member-moderation/moderation-grounds.spec.ts`

**Modified — CI / docs / records:**
- `package.json` · `scripts/ci-local.sh` · `.github/workflows/ci.yml` · `.githooks/pre-push`
- `docs/launch-gate-inventory/dlt-template-requests-6-19.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (the row flips + ledger)
- `_bmad-output/implementation-artifacts/6-34-sms-templates-typed-variables.md` (this file)

⛔ In the diff: `packages/i18n/locales/**`, any migration, `packages/domain/src/claim/suspicion-notice.ts`, `helplineGap` / `configSet` /
`purposeConfigGap` (AC10). ⚠ `.gitignore`'s working-tree change is BigDev's (2026-10-10, decision-flow artefacts) — ⛔ this story's, ⛔ committed.

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-10 | 1.0 | Created via `bmad-create-story 6.34` (pinned `34b9bab6`): three research passes (code inventory; TRAI / operator rules; governance). FOUND F1–F20 — incl. 19 untyped templates; per-portal tag spelling; whole-body alert templates unregistrable; the helpline's `+` invalid as `#cbn#` with TWO readers; the handover OTP's *"Valid 5 min"* for a 3-minute code; ⛔ DLT row or runbook. TV1–TV12 PROPOSED (author-commit owed at Task 0.3); ⛔ no Panel question (§0). Status `ready-for-dev`. |
| 2026-10-10 | 1.1 | BigDev, in session: *"We will use STPL, and [STPL] uses {#var#} for variable"* — the PE registers on STPL's SmartPing portal, where the text KEEPS `{#var#}` and each variable's type is picked in a separate tagging section (confirmed against MSG91's carrier guide). ⇒ ⛔ text is retagged: TV1 (one `DLT_VAR` + the six types as slot metadata), TV2 (slots declared; single-token lockstep kept), TV3 (OTP text and `version` unchanged), TV4 (types, ⛔ tags), TV7 (gate: ⛔ typed tag in text; `{#var#}` only in shape-tested registry files), TV8 (sheet: the type to select per `{#var#}`; a where-and-how section), TV10 (a) (portal answered; the gateway still owed), TV11 (6.27c writes `{#var#}` + slots; annotations on 6.27a / 6.27c / 6.30); Invariants 2 / 4, F3 / F8 / F9 / F13, AC1–AC3 / AC6 / AC7 / AC9, Tasks 0.1 / 0.3 / 0.4 / 2 / 3, Traps 2 / 5 aligned. TV5 / TV6 / TV9 / TV10 (b)–(e) / TV12 unchanged. |
| 2026-10-10 | 1.2 | `-313` applied — TV1–TV12 committed as recommended (`97e2c3bb`, alone); Tasks 0.2 / 0.3 done; buildable. |
| 2026-10-10 | 1.3 | BigDev: the gateway is *"msg91 for now"*. MSG91's docs read (F21): Flow / OTP v5 take `authkey`, MSG91's own template id and NAMED variable values — ⛔ our client's contract ⇒ NEW row `6-37-msg91-sms-gateway-adapter` (after 6.34) and **TV13** (every slot carries a `name` = the i18n param; the MSG91 template uses `##name##`) — both `2026-10-10-314` (`e2d57ed9`, alone; `-313` ⛔ edited). TV1 / TV8 / TV10 (a) (b) (d), AC1 / AC3 / AC7 and the sequencing aligned. |
| 2026-10-12 | 1.4 | `bmad-create-story validate 6.34` — the story's FIRST validate. Branch REBASED onto `main` `09321738` (55 commits: 6.30 and 6.28 shipped; +/- lines byte-identical; `-313` / `-314` interleaved between `-315` and `-312`; old tip tag `backup/6-34-pre-rebase`). Four fresh-context read-only verifiers (code claims · governance staleness · TRAI / MSG91 premise + the shape rule over every real text · design). ⭐ HIGH, needed BigDev: `-313` TV5's premise was FALSE — 6.29's hold covers only the suspicion path; on the correction / closure / certificate paths "treat as unset" is a FINAL error that drops the notice and moves D22's `reachedBySms` (`-252`). BigDev: *"(b) Alarm only, never refuse"* ⇒ `2026-10-12-322` (alone, text shown first) C1–C9. Author fixes applied: the gate's rule (i) was RED at birth on 6.30's sheet line and on TV8's own sentence ⇒ rule (i) reads only registered text + the TYPE SPELLING RULE; rule (ii) was evadable via `${DLT_VAR}` ⇒ rule (iii) + a non-empty-scan check; six more composition test sites (three RED, two vacuous) + the file-path mock; the jobs `HELPLINE` fixtures; TV9's switch made one-way (`'step_up'` on the login arm only); TV3's `otp` name; the 6.27c start condition and the 6-37 clause on AL15 / Row 29 / the sprint row; the `-310` promise on Hindi names carried into Row 30 (d); 6.30's sheet bullet answered (C3); F1 / F2 / F3 / F4 / TV1 sourcing corrected (TRAI ALLOWS special characters in alphanumeric; 30 % is formally a > 3-variable condition; ceilings attributed; STPL's manual cited); F12's "sheet example" was a test fixture; moved anchors (`ci-local.sh:78`, `ci.yml:852-875`, `sms-app.ts:136-144`, `apps/jobs/src/boot.ts`); Row 29 written ⇒ the 27–28 gap; the `detail` CHECK is 0155; Task 0.1's stale gateway question; deferred-work at the END of the file; AC4 rewritten (sent + warned); AC10 needs `DATABASE_URL`. ✅ Held: Row 30 free; claim.json's SMS bodies unchanged by 6.28; the 19-template count complete; every real text passes TV1's shape rule; F12's two-reader claim; the code cites the code verifier listed as holding (⛔ a blanket "all pointers verified" claim). |
| 2026-10-12 | 1.5 | Round-1 fresh-context re-validate of v1.4 + `-322` (at `79d9d440`): 0 BLOCKER / 1 HIGH / 7 MEDIUM / 8 LOW — all but one LOW the v1.4 pass's OWN. BigDev: *"Yes: -323 reading, accept"* ⇒ `2026-10-12-323` (alone): R1 the core flags, the caller logs; R2 the delivery-report residual (pre-existing for every DLT rejection) recorded and accepted, asked at Row 30 (d). Story fixes: Task 1's barrel is `export *` (a named re-export would put `DLT_VAR` in `index.ts` and turn rule (iii) RED — the HIGH); the flag only on final sends, the warning after the transient branch; TV7 rule (i)'s source half narrowed back to `-322` C2 (registry files); `:142` is prose, ⛔ RED (v1.4's claim and Task 7's ordering withdrawn); TV9's `step_up` arm gets `template?: never` so the union compiles; the 6.27a / 6.27c Row 27 → Row 30 (d) pointer and 6.27c's warning; the `-310` promise described as the note's FYI, widened to every name slot; D22 only on the correction chase; the real empty-alarm assertions cited; the wrapper's "UNEDITED" doc comment; `onAlarm` unwired (logs only); new-file `git add` note. |
| 2026-10-12 | 1.6 | Round-2 fresh-context re-validate of v1.5 + `-323` (at `df5bcce9`): 0 BLOCKER / 1 HIGH / 5 MEDIUM / 6 LOW. HIGH: `-323` Consequence 1 said v1.5 carried R2 into the Policy meaning — it had ⛔ ⇒ the Policy meaning and the header now state the accepted residual, and the member-terms sentence reads *"they reach you once the operator accepts them (Row 30)"*. Also: the ⛔-flag transient / config legs added to AC4 / Task 4; the Row 27 → Row 30 (d) pointer swept to all six sibling sites (incl. 6.27c Task 5, which ORDERS the Row 27 line); `-323` threaded into AC0, Task 0.3 / 0.4 (incl. the epics.md blockquote), Git intelligence, References and the TV title; the source half of TV7 rule (i) given negative controls; "D22" qualified to the correction chase everywhere it was unqualified; the `onAlarm` cite moved to `boot.ts:594-604`; the inert suspicion-live cites dropped; the `bag` cast named; AC9 VERIFIES what Task 0.4 writes. ⚠ RECORD on `-323` (⛔ edited — [[feedback_supersede_never_reinterpret]]): (1) its Consequences 1–2 are the ENTRY's own wording — Consequence 2 (the delivery-report deferred item) was added by the author and was ⛔ put to BigDev, although the Status line lists only the header, the Occasion and the References as the entry's own; (2) its "D22 counts the family REACHED" holds on the correction chase only (D22 reads reminder rows). |
| 2026-10-12 | 1.7 | Round-3 fresh-context re-validate of v1.6 (at `f28061e0`): **0 BLOCKER / 0 HIGH — the rounds END** (`-322` Consequence 1 discharged); 1 MEDIUM + 7 LOW applied: the Policy meaning now names TV9's one member-visible change (the handover code says "Valid 3 min"); D22's chase-only reason corrected (it filters `family_sms` of family / direction runs — closure notices are reminder rows too); Trap 10 covers rule (iii) in comments; the dark alert registry's test asserts `null` instead of a shape; `GATE_INPUTS` is an anchored regex; 6.27a `:610-611` / `:813-814` get both notes; the delivery-report item names its likely closer (6-37) and the staff views; the `-323` record line also goes into Row 30's notes. Status stays `ready-for-dev`. |
| 2026-10-12 | 1.8 | `bmad-dev-story 6.34` — BUILT. Task 0 records committed FIRST (`25e7bba5`: epics.md, roster Row 30, the TV11 / `-322` C6, C7 / `-323` R1 annotations, sprint ledger 2026-10-12d). Tasks 1–9: the ONE vocabulary `dlt-variables.ts` (shape check + predicates); the OTP typed numeric `otp`; the twelve claim texts typed per TV4 (⛔ a character changed); the helpline flagged + warned on all four send paths (⛔ held, ⛔ refused); the five alert entries DARK; the handover OTP sends the step-up text; the `dlt-typed-variables` gate (ci-local + ci.yml + pre-push); the sheet covers 1–12, 15, 16 with types + MSG91 forms; deferred-work. Task 8 built before Task 7 (Task 3's sheet legs need it). Status → `review`. |
| 2026-10-12 | 1.9 | `bmad-code-review 6.34` — three layers, 0 decision-needed / 3 patch / 0 defer / 8 dismissed. BigDev chose Apply every patch: whitespace-bearing foreign tags rejected by shape and gate; callback slot maximum respects the shared three-digit minimum; Row 30's preparation and go-live milestones separated. Nine regression cases proved red before / green after. Post-patch 289 tests, tree gate, channels typecheck and touched-file ESLint green. Status → `done`; sprint row synced; external Row 30 evidence still open. |
| 2026-10-12 | 1.10 | `bmad-code-review 6.34` — SECOND pass (branch vs `main` `09321738`, incl. the uncommitted first-pass patches): three layers, 0 decision-needed / 10 patch / 0 defer / 18 dismissed, ⛔ HIGH / MEDIUM. BigDev chose Apply every patch: the frozen `last_updated:` key edit reverted; the STATUS header and Change Log order; the sheet's "above" → the table below; the pre-push comment's gate inputs; the first pass's family-2 verdict corrected; TV5 records the all-transient exhausted-row residual; the Policy meaning names TV6; sheet rows 1–12 pinned exactly; gate rule (i) reads GFM look-alike rows and markdown escapes. Red-before / green-after proven; full `ci:local` WITH :5433 36/36 green. Status stays `done`. |
| 2026-10-12 | 1.11 | `bmad-code-review 6.34` — THIRD pass (the review-fix commit `ba08558f` only): 0 decision-needed / 6 patch / 0 defer / 11 dismissed, ⛔ HIGH / MEDIUM. BigDev chose Apply every patch: TV5's residual names every give-up path (family 10 REAL GAP closed); the gate's sheet row requires the leading pipe (`-322` C2's pattern, widened only by indentation and a lettered ordinal); the jobs helper selects whole-number ordinals; ONE `expectRegisteredTextRow` pins each Registered-text row exactly and uniquely (claim + OTP); the ledger cite and three braced examples re-worded. Red-before / green-after proven; full `ci:local` WITH :5433 36/36 green. Status stays `done`. |
