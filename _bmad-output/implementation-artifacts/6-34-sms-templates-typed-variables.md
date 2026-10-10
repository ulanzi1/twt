---
baseline_commit: 34b9bab6
---

<!--
⭐ PINNED 2026-10-10 (`bmad-create-story 6.34`) to `main` at `34b9bab6` (the PR #268 SHA-map commit). Every `file:NNN` below is AS OF
`34b9bab6`, derived by three read-only research passes (the code inventory of every SMS template and its send path; TRAI's typed-variable
rule — the Direction, the regulations and the operators' manuals, fetched 2026-10-10; the governance and planning trail) and spot-checked
by hand (F14 / F15 / F17 / F18 re-read directly).
⭐ v1.1 (2026-10-10, BigDev in session): *"We will use STPL, and [STPL] uses {#var#} for variable"* — the PE registers on **STPL**
(Satzilio Telecom Pvt Ltd, ex-V-Con / Videocon — the **SmartPing** DLT portal, `smartping.live`). On SmartPing the template TEXT keeps
`{#var#}` and each variable's TYPE is chosen in a separate tagging section (MSG91's carrier guide; F3). ⇒ the texts in code and in the
sheet are ⛔ retagged; each `{#var#}` gains a DECLARED TYPE. TV1–TV4, TV7, TV8, TV10 (a), TV11 rewritten; the rest stands.

STATUS: `ready-for-dev` — ✅ BUILDABLE: TV1–TV12 answered by BigDev (all as recommended) and committed ALONE as `2026-10-10-313`
(`97e2c3bb`) ([[feedback_governance_commits_precede_implementation]]); TV13 + the gateway (MSG91 "for now") committed as
`2026-10-10-314` (`e2d57ed9`). Build from Task 0.1 / 0.4 on. ⭐ Row `6-37-msg91-sms-gateway-adapter` builds the MSG91 adapter AFTER this story.
⭐ §0 gate (template `trustee-panel-routing-note-TEMPLATE.md`): every TV strips to "the code / the registration sheet should do X". ⛔ No
word of any Panel-ratified text changes — a variable's TYPE is registration metadata the member ⛔ never sees, and every rendered body stays
byte-identical (Invariant 1). TV5 HOLDS a text while a helpline number is malformed — it reuses 6.29's hold (`-302` RN2), so ⛔ no text is
spent, ⛔ none is dropped, and ⛔ who / what / when is unchanged. TV6 keeps the SMS alert fallback dark; it was ⛔ never live (⛔ no id was
ever provisioned). TV9 fixes a FACTUAL error in an OTP text that no Panel ruled. ⇒ ⛔ no routing note owed. ⚠ It BECOMES the Panel's if
a TV is widened to (i) change any WORD of templates 1–14, (ii) change who receives a text or when, or (iii) turn the alert SMS fallback ON
with new wording for members. Trap 1 fences all three.

GLYPH REGISTER, ADDRESSING RULE: as 6.29 / 6.30 — `⛔` negates the word it precedes · `⭐` = emphasis / action · `⚠` = hazard.
⛔ No `file:NNN` into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (newest-first files — cite the entry id / item / row).
LETTERS: `TV` = this story's build decisions (the author's); `F` = FOUND facts; `AL` = 6.30's (`-312`); `PM` = 6.27's (`-311`);
`RN` = 6.29's (`-302`); `RB` = 6.24b's (`-295`).
-->

# Story 6.34: Every SMS Template's Variables Are Typed for TRAI — One Vocabulary, a Gate, the Login OTP First `[GOVERNANCE]`

Status: ready-for-dev

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
| **`2026-10-10-305`** §2 item 5 | *"`6-34-sms-templates-typed-variables` — every SMS template (the login and step-up OTP …; the alert registry …; 6.19's and 6.24b's twelve drafted templates; 6.27c's two) retagged with TRAI's typed variables … BEFORE any is submitted — ⚠ an untyped login OTP template blocks every login"* | author-commit (BigDev) — THIS ROW |
| `2026-10-10-305` §4 | roster Rows 27 / 28 / 29 RESERVED (6.27 / 6.27 / 6.30) | author-commit ⇒ this story's row is **30** |
| **`2026-10-10-313`** · **`2026-10-10-314`** | TV1–TV12 as recommended; the SMS gateway is MSG91 *"for now"*; NEW row `6-37-msg91-sms-gateway-adapter`; TV13 (slot names) | author-commit (BigDev) — THIS STORY's |
| BigDev 2026-10-10 (in session, on v1.0) | *"We will use STPL, and [STPL] uses {#var#} for variable"* — the PE's DLT portal is STPL's SmartPing | BigDev's fact — recorded in the Task 0.3 author-commit |
| `2026-10-10-312` AL15 | the typed-variable rule is a POINTER to this row; Row 29 (e)'s logged-out leg waits for the OTP retag | author-commit (6.30) |
| `2026-10-10-311` PM3 | 6.27c's two templates are registered TYPED from the start: `{member}` = `{#alphanumeric#}` (≤ 40), `{link}` = `{#url#}`, `{helpline}` = `{#cbn#}` | author-commit (6.27) |
| `2026-10-08-295` RB1 / RB11 / RB12 | templates 7–12 byte-match the DLT content; *"⛔ do not provision the ids of 7–12 until Row 22 closes"*; a config gap ⛔ spends no notice | author-commit (6.24b) |
| `2026-10-10-302` RN2 / RN5 | a config gap HOLDS per (purpose, Pariwar) — 0151 `detail` is a FIXED grammar CHECKed by the DB | author-commit (6.29) — ⛔ moved |
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
   registry test; a file under `apps/*/src` / `packages/*/src` that holds `{#var#}` but is ⛔ a known, shape-tested registry fails the gate
   (TV7); and ⛔ any OTHER `{#…#}` tag (`{#numeric#}`, `{#number#}`, …) appears in registrable text — on SmartPing a typed tag IN the text
   would be registered as literal text and never match.
5. **⛔ No new `detail` code, ⛔ no migration, ⛔ no CHECK change** — 0138 / 0151's grammars stay as 6.29 left them (TV5 reuses
   `config:helpline_number_missing`).
6. **⛔ No template id, helpline or secret is set** — provisioning stays behind each template's own roster row (Rows 18–23, 27, 30).

## 📜 Policy meaning (AI-10-1)

**This story introduces ⛔ no predicate and changes ⛔ none that gates a member's access to a benefit.** It changes how templates are
labelled for the operators and, in TV5, treats a malformed helpline number as not-yet-set (a text is HELD until staff fix the number,
then sent — the 6.29 hold). In the member's terms: *"the texts the Trust sends you say exactly what they said before; they now reach you
because the operator accepts them."* Niyamavali check: ⛔ not applicable (the Niyamavali does not speak to SMS templates) — and it is
⛔ not ratified ([[feedback_niyamavali_rulebook_not_spec]]).

## ⭐ FOUND FACTS (each ⇒ the TV it feeds)

**The rule (fetched 2026-10-10 — re-check at Task 0.1):**
- **F1 — the Direction** (TRAI, F.No. D-27/1/(2)/2024-QoS, 18 Nov 2025, to all Access Providers; PR No. 133): para 8 (a) every variable
  *"pre-tagged … as per Annexure-I"*; (c) new templates registered only if compliant (from ~28 Nov 2025; providers report 15 Jan 2026);
  (d) existing templates modified within 60 days of scrubbing starting; (e) 60 days of LOGGER mode, then *"any message failing variable
  tag validation shall be rejected outright"*. ⚠ Vi's manual (Sep 2026): *"As of now, nothing will be dropped … logger mode … will be
  enabled as per a timeline that will be communicated separately"* ⇒ the date it bites is ⛔ known; ⛔ plan on it being late. ⇒ TV10 (e).
- **F2 — the six types (Annexure-I):** `#number#/#numeric#` digits only; `#alphanumeric#` letters + digits, *"Not more than 40
  Characters"* (special characters AMBIGUOUS — MSG91: none; Jio: permitted); `#url#` and `#urlott#` validated against registered CTAs;
  `#cbn#` validated against a registered callback NUMBER; `#email#` email regex. ⛔ No date type. ⇒ TV1.
- **F3 — the SPELLING differs per DLT portal:** TRAI writes `#number# / #numeric#`; Jio's portal inserts `{#number#}`
  (`{#alphanumeric#}`, `{#url#}`, `{#urlott#}`, `{#cbn#}`, `{#email#}`); Vi uses `{#num#} {#alp#} {#urg#} {#uro#} {#cbn#} {#eml#}`;
  SmartPing / Tata: *"Variable tags are **not appended in the template text** … variables must be tagged in the designated variable
  tagging section provided on the DLT portal during template registration"* (MSG91, `msg91.com/help/dlt-registration-in-india/
  variable-tagging-on-dlt-sms-templates`, re-fetched 2026-10-10). ⭐ **BigDev (2026-10-10): the PE uses STPL** — Satzilio Telecom Pvt Ltd
  (ex-V-Con / Videocon), operator of the SmartPing DLT portal `smartping.live` (authkey.io's *"Smartping DLT Registration (STPL
  Videocon)"*; STPL's consumer charter on `smartping.live`) — *"and [STPL] uses {#var#} for variable"*. ⇒ the text keeps `{#var#}`; the
  type is a per-variable SELECTION. ⚠ The exact labels in SmartPing's tagging section (e.g. "Numeric" vs `#numeric#`) are ⛔ seen in the
  repo — Row 30 (a) records them with a screenshot. ⇒ TV1, TV8, TV10 (a).
- **F4 — shape rules:** ≥ 30 % of a template must be FIXED content (TCCCPR 2nd Amendment, 12 Feb 2025, Sch.-I CTRF (j)(iii)) ⇒ a
  whole-body variable is ⛔ registrable; ≤ 2 variables, a THIRD *"in case of exigency"* (more with recorded justification); adjacent
  variables only when both are alphanumeric (Vi, Jio); per-variable limit 40 (Annexure) vs 30 (regulation (k)) — a conflict. ⇒ TV1, TV6, TV8.
- **F5 — `#cbn#`:** Vi: 3–14 characters, *"No special characters"*, *"If a country code is used (for example +91), the country code must be
  part of the fixed / static text"*; the CTA is whitelisted (mobile `91` + 10 digits; landline `0…`; toll-free `1800` / `1860`, 8–13). ⇒ TV5.
- **F6 — OTP:** numeric; category **Transactional** (2025 regulation: *"OTP from … apps login"*) — resolves 6.30's open *"Transactional vs
  Service Implicit"*. Leading zeros (`048213`) are ⛔ addressed by a primary source (digits-only implies they pass). ⇒ TV3, TV10 (d).
- **F7 — the wire:** senders submit the template id + the FULLY RENDERED body; the operator scrubs the body against the template (Exotel,
  Jio). This repo does exactly that — `sms-app.ts:200-208` posts `{ sender, to, template_id, message }` ⇒ **the tag is ⛔ on the wire**;
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
  (`contribution-notify.ts:227-322`, `boot.ts:572-602`; producers for four categories — `claim_status_change` has ⛔ none), but
  composition falls to the log fixture unless `sms.dlt.template_id.<category>` resolves (`provider-composition.ts:193-212`) — ⛔ none is
  provisioned ⇒ ⛔ no alert SMS has ever been sendable. Architecture §3.4 fire condition (iii) is therefore ⛔ deliverable as built.
  Tests that drive the REAL sms-dlt path through these categories: `packages/channels/tests/provider-composition.test.ts:194-204`,
  `contribution-provider-resolver.test.ts:35,114-115`, `apps/api/tests/unit/sms-composition.test.ts:70-80`; `sms.test.ts:252-276`
  pins the registry (size 5 at `:257`, key prefix `:269`). ⇒ TV6.
- **F11 — the twelve claim texts and their slots** (sheet `dlt-template-requests-6-19.md:20-33,49-54,65-68,89-96`; code as F9):
  templates 1–6 = `{reference}` (exactly 8 upper-case hex — `claimShortReference`, `packages/domain/src/claim/correction-chase.ts:869-871`)
  + `{helpline}`; 7–10 = `{member}` + `{helpline}`; **11–12 (appeal_notice) = `{member}` + `{date}` (`DD-MM-YYYY`, `formatAppealUntil`) +
  `{helpline}` — THREE variables** (F4's exigency limit ⇒ a justification line). `{member}` = the mode-resolved deceased name
  (`packages/domain/src/notifications/pool-identity.ts:141-162`) — full legal name (≤ 200 stored, `packages/contracts/src/kyc/signup.ts:92`)
  or "First L."; may be Devanagari with spaces. ⇒ TV4.
- **F12 — the helpline is free text, only trimmed** (`claim-dlt-sms-send.ts:84-105`); the sheet's own example is `+911800123456`
  (13 characters, WITH a `+`) — ⛔ a valid `#cbn#` value (F5). The per-Pariwar key `sms.claim_correction.helpline_number.<pariwarId>` has
  exactly **TWO** readers: the send core (`claim-dlt-sms-send.ts:85`, blank ⇒ `config:helpline_number_missing` at `:99-100`) and the
  suspicion sweep's hold pre-check `helplineGap` (`claim-suspicion-notices.ts:134-139`, via `configSet` `:111-120` — PRESENCE only).
  ⚠ A format check in ONE reader only ⇒ the pre-check says "set", the child then fails FINAL with an alarm and SPENDS the once-ever slot
  — exactly the class 6.29 closed. ⇒ TV5 (both readers, one predicate).
- **F13 — 6.27c's two templates exist only as drafts** (6.27a `…:418-427`; 6.27c `…:95-96,127-128` says *"registered typed from the start
  by 6.27c and VERIFIED by 6-34 with every other"*); 6.27c is `backlog`. ⚠ If 6.34 lands first it has ⛔ nothing to verify; if it waits,
  6.27c and 6.34 defer to EACH OTHER ([[feedback_circular_deferral_between_sibling_stories]]). ⚠ And the drafts write the TYPED TAG IN THE
  TEXT (`{member}` = `{#alphanumeric#}`, `{link}` = `{#url#}`, `{helpline}` = `{#cbn#}` — `-311` PM3), as does 6.30's SIX FACTS #3
  (*"should be `{#numeric#}`"*) — the Airtel / Jio / Vi form. On STPL's SmartPing the text keeps `{#var#}` and those are the slots' TYPES.
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
- **F17 — ⛔ no row tracks DLT registration** — the roster ends at Row 26; 27–29 are reserved (`-305` §4); deferred-work *"DLT
  registration untracked with no ledger row"*; ⛔ no DLT runbook exists (the "Story 0.1 runbook" cited by `epics.md`, `otp-sms-template.ts:19`
  and `sms-dlt-registry.ts:30` was never written). ⇒ TV10.
- **F18 — the gate pattern:** `scripts/kyc-provider-boundary/{check.ts,lib.ts,lib.test.ts,README.md}`; `package.json:46-47`
  (`kyc-provider:check` / `:test`); `scripts/ci-local.sh:77`; `.github/workflows/ci.yml:828-851` — an INVARIANT SCAN (⛔ git diff, ⛔
  fetch-depth). ⚠ `ci.yml` ↔ `ci-local.sh` drift is invisible — add the job to BOTH. ⇒ TV7.
- **F19 — the sheet** (`dlt-template-requests-6-19.md`, 135 lines) is titled *"the Story 6.19 set"*, cited by path from the decision log,
  six story files and roster Rows 18–23 ⇒ ⛔ rename it. It holds ⛔ the OTP; 6.27c will add 13 (hi) / 14 (en). ⇒ TV8.
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

## ⚖️ Build decisions TV1–TV13 (✅ COMMITTED — TV1–TV12 `2026-10-10-313`, TV13 `2026-10-10-314`, all as recommended)

- **TV1 — ONE vocabulary in `@twt/channels`; the text keeps `{#var#}` (STPL / SmartPing — BigDev, v1.1).** New
  `packages/channels/src/dlt-variables.ts` (barrel-exported): `DLT_VAR = '{#var#}'` (the ONE marker — SmartPing's, F3);
  `DltVariableType = 'numeric' | 'alphanumeric' | 'url' | 'urlott' | 'cbn' | 'email'` (TRAI Annexure-I's six; the names are TRAI's, the
  same words the sheet tells BigDev to select); `DltSlot = { name, type, maxLength, label }` (`name` = TV13; `label` = what the slot holds, for the
  sheet — e.g. *"claim reference"*; `maxLength` ≤ the type's ceiling: numeric / alphanumeric / email 40, cbn 14, url / urlott 120);
  `checkDltTemplateShape(text, slots)` → a list of problems (the count of `{#var#}` equals `slots.length`; ⛔ any other `{#…#}` tag; ≤ 3
  variables; ⛔ two adjacent `{#var#}` unless both slots are alphanumeric; fixed characters ≥ 30 % of (fixed + Σ `maxLength`) — the
  conservative reading of F4); `isDltNumeric` / `isDltCallbackNumber` (digits only, 3–14) value predicates. *Alternative:* typed tags in
  the text (the Airtel / Jio / Vi form) — ⛔ on SmartPing they would be registered as literal text and ⛔ match a single send.
- **TV2 — every registered template declares its slots.** `OtpDltTemplate`, `DltTemplate`, the claim-correction and suspicion entries gain
  `slots: readonly DltSlot[]` (in text order). The two local `DLT_VAR` constants (`claim-correction-sms-templates.ts:37`,
  `suspicion-notice-sms-templates.ts:49`) and `OTP_VAR_SLOT` (`otp-sms-template.ts:47`) become imports of TV1's `DLT_VAR` (same value —
  ⛔ a second copy). Each registry's test runs `checkDltTemplateShape` over EVERY entry; the lockstep tests keep their single-token
  replacement (F9 — correct on SmartPing) and ADD: the sheet's row for the template lists the same types in the same order (TV8).
- **TV3 — the OTP first.** Texts, marker and wording ⛔ changed (F8 — Trap 2); `slots: [{ type: 'numeric', maxLength: 6, label: 'OTP
  code' }]`; `version` STAYS 1 (the registered text is unchanged); a test that each OTP template passes `checkDltTemplateShape` and that the
  rendered body CONTAINS the code and ⛔ `{#` (F8's no-code failure). Category **Transactional** (F6) and the slot type recorded in the
  sheet as templates 15 / 16 (TV8).
- **TV4 — the twelve claim texts:** `{reference}` = `alphanumeric` (maxLength 8); `{member}` = `alphanumeric` (40); `{date}` =
  `alphanumeric` (10 — ⚠ the hyphens depend on F2's ambiguity ⇒ Row 30 (d)); `{helpline}` = `cbn` (14). Templates 11 / 12 carry THREE
  variables — the sheet records the justification (*"the last date to appeal is the substance of the notice — `-293` item 1 B"*).
  ⛔ Any text changes; ⛔ `claim.json` is edited. ⚠ `{member}` > 40 characters (or Devanagari, if the operator refuses it) stays the open
  deferred-work item *"`{member}` has ⛔ no length guard …"* — its trigger (provisioning 7–12, Row 22) is unchanged; this story updates
  the item with F2 / F4's figures (40 vs 30) and ⛔ adds a guard (a guard changes WHO is texted ⇒ §0).
- **TV5 — the helpline is a callback number, checked in BOTH readers.** ONE predicate (`isDltCallbackNumber`, TV1) — digits only, 3–14
  characters (⛔ `+`, ⛔ spaces; 14 is Vi's ceiling — Jio admits landlines up to 18 digits, so Row 30 (a)'s portal answer may WIDEN the
  ceiling in TV1 — one constant); a value that fails it is treated EXACTLY as unset: `helplineGap` (via `configSet`, which then returns
  `'missing'` for a set-but-malformed value) HOLDS the (purpose, Pariwar) — 6.29's park, ⛔ a slot spent — and the send core returns its
  existing `config:helpline_number_missing` (⛔ a new `detail` code, ⛔ a migration — Invariant 5). A test pins the two readers to the
  same predicate (a malformed value ⇒ the pre-check holds AND the core refuses). The sheet's example is corrected (`1800123456`; a
  `+91` belongs in the FIXED text, F5) and each Pariwar's number is whitelisted as a CBN CTA (Row 30 (c)). *Alternatives:* (b) docs only
  — a `+91…` value is then sent and, once enforcement starts, REJECTED (⛔ a held text — a spent one); (c) a new `helpline_number_invalid`
  code — a CHECK change on 0138 / 0151 for ⛔ benefit. **Recommended: as written.**
- **TV6 — the five whole-body alert entries go DARK, truthfully.** Each keeps its key and config-key name (the 5.6 set stays visible) but
  `contentTemplate` becomes `null` with `unregistrableReason: 'whole_body_variable'`; `resolveDltTemplate` returns `null` for an entry
  with ⛔ registrable text ⇒ composition falls to the fixture (TODAY's behaviour — ⛔ id is provisioned, F10). The three real-path tests
  (F10) move to a `vi.mock` of the registry with ONE registrable fake entry; `sms.test.ts`'s pins updated (registry size 5 kept;
  `resolveDltTemplate` ⇒ `null` for all five). A deferred-work item records that architecture §3.4 (iii) has ⛔ registrable template —
  trigger: *"before any `sms.dlt.template_id.<category>` is provisioned, or the per-member SMS fallback is claimed at go-live"* — and that
  turning it ON needs per-category FIXED wording (en + hi) = a later story (⚠ new member-facing wording ⇒ its own §0). *Alternatives:*
  (a) delete the five entries — the same tests churn and the 5.6 set disappears from view; (c) write the five fixed-text templates now —
  new member-facing copy, Hindi review, a story of its own. **Recommended: as written.**
- **TV7 — the gate `scripts/dlt-typed-variables/`** (mirror `kyc-provider-boundary`, F18): `lib.ts` — `scanDltText(path, text)` → findings
  for (i) ANY `{#…#}` tag other than `{#var#}` (a typed tag in registrable text — Invariant 4), and (ii) a source file holding `{#var#}`
  that is ⛔ on `REGISTRY_FILES` — the allowlist of registry modules whose unit tests run `checkDltTemplateShape` over every entry (today:
  `packages/channels/src/{otp-sms-template.ts,sms-dlt-registry.ts,dlt-variables.ts}`, `apps/jobs/src/scheduler/{claim-correction-sms-templates.ts,
  suspicion-notice-sms-templates.ts}`; 6.27c ADDS its file — TV11); `check.ts` scans tracked files under `apps/*/src`, `packages/*/src`
  (rule i + ii) and `docs/launch-gate-inventory/*.md` (rule i), exit 1 naming file + line; `lib.test.ts` — the negative controls (a seeded
  `{#numeric#}` FAILS; a seeded `{#var#}` in an unlisted file FAILS; a listed file passes —
  [[feedback_gate_scope_semantic_coverage]]) and a test that every `REGISTRY_FILES` path EXISTS (a renamed registry ⛔ silently drops out);
  `README.md`; `package.json` `dlt-typed-variables:check` / `:test`; `scripts/ci-local.sh` + `.github/workflows/ci.yml` (BOTH — F18).
  SHAPE (30 %, ≤ 3, adjacency, slot count) is checked by each registry's unit test (TV2), ⛔ by parsing the sheet's Markdown.
- **TV8 — the sheet covers EVERY template.** Keep the path `docs/launch-gate-inventory/dlt-template-requests-6-19.md` (F19); retitle to
  *"DLT Template Registration Requests — every SMS template (first opened for Story 6.19)"*; replace the column *"Variable slots
  (`{#var#}`) — to confirm with the wording"* with *"Variable types — select in SmartPing's tagging section, in order"* (e.g. *"1
  alphanumeric (claim reference, ≤ 8) · 2 cbn (helpline)"*) and a column *"MSG91 template"* (the same text with `##<name>##` per
  `{#var#}` — TV13); texts 1–12 ⛔ changed; ADD **15 (OTP login, en)** and **16 (OTP step-up,
  en)** with their config keys, Transactional category, TTL wording and `numeric` slot (13 / 14 stay 6.27c's — ⛔ written here); list the
  five alert categories as *"⛔ not registrable — whole-body (TV6)"*; NEW sections: *"Where and how we register"* (STPL / SmartPing; the
  text keeps `{#var#}`; the type is chosen per variable in the tagging section; ⛔ never type a tag like `{#numeric#}` into the text),
  *"The variable types"* (the six, their limits), *"Shape rules"* (F4 + the 11 / 12 justification), the corrected helpline section (F5 /
  TV5); a Record line (*"variable types declared — ⛔ still not submitted"*). ⚠ Templates 1–12 keep their numbers.
- **TV9 — the OTP texts tell the truth about their validity.** The delivery payload gains an optional `template?: OtpIntent` (default =
  `intent`) that selects the TEMPLATE only — the recipient path still follows `intent` (F14). The handover passes `template: 'step_up'`
  (its code lives 3 min — the step-up wording says 3 min). The data-export OTP (60 min, told *"3 min"*) is RECORDED in deferred-work
  (understates; ⛔ refuses anyone; a third template = a third registration). *Alternatives:* (b) record both — the handover keeps
  misleading a bereaved nominee into a refusal; (c) a third template now for data export. **Recommended: as written.**
- **TV10 — roster Row 30 `sms-dlt-templates-typed-and-registered`** (owner BigDev — only BigDev submits; support: the SMS provider).
  Closure: (a) the PE's DLT portal — ✅ STPL / SmartPing (BigDev, 2026-10-10) — and the SMS GATEWAY that will send (the API behind
  `sms-app.ts`'s `apiUrl`, F7) NAMED — ✅ MSG91 "for now" (`-314`); a screenshot of SmartPing's tagging section recorded, and the sheet's type words matched to its
  labels; (b) templates 15 / 16
  registered TYPED as Transactional and APPROVED, both ids set in the deployed environment, and a real login OTP AND a step-up OTP
  received on a device — ⚠ ALSO waits for row 6-37's MSG91 adapter (F21) (proves F16's key resolution; discharges 6.30 AL15's dependency for Row 29 (e)); (c) each Pariwar's helpline
  whitelisted as a CBN CTA in the TV5 form; (d) the provider's written answers: Devanagari and spaces in `#alphanumeric#`, the hyphen in
  a `DD-MM-YYYY` `#alphanumeric#` (⚠ MSG91 says *"no special characters"* — F21), the per-variable limit (40 vs 30), a leading-zero
  `#numeric#` — asked of STPL AND MSG91; (e) the enforcement state recorded with
  a date (logger mode started? rejection date?). Templates 1–14 keep their OWN provisioning gates (Rows 18–23, 27) — Row 30 ⛔ licenses
  their ids. ⭐ Row 30 is ⛔ a merge fence ([[project_not_in_production_merge_is_not_golive]]).
- **TV11 — 6.27c, ⛔ a circular deferral; the notation corrected.** 6.34 does ⛔ hand-verify 6.27c's texts: 6.27c USES TV1's vocabulary,
  writes its two texts with `{#var#}` + `slots` (`member` alphanumeric ≤ 40, `link` url, `helpline` cbn — `-311` PM3's TYPES, unchanged),
  runs `checkDltTemplateShape` in its own registry test and ADDS its file to TV7's `REGISTRY_FILES`. The pointer lines in 6.27a
  (`…:423-424`, `…:615`) and 6.27c (`…:96`, `…:127-128`) and 6.30's SIX FACTS #3 / AL15 get an annotation at Task 0.4 (*"⚠ on STPL /
  SmartPing the text keeps `{#var#}`; the tag names here are the slot TYPES — 6.34 TV1 / TV11"*; a Change-Log line in each; ⛔ a PM or AL
  moved). ⚠ If 6.27c lands FIRST, it STOPS and asks rather than re-creating TV1.
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
TV1–TV12 put to BigDev and committed ALONE as one author-commit before any code; `epics.md` `### Story 6.34`; roster Row 30; the sprint
ledger.

### AC1 — One vocabulary (TV1)
**Given** `packages/channels/src/dlt-variables.ts` **then** it exports `DLT_VAR`, the six types and their ceilings, `DltSlot`,
`checkDltTemplateShape` and the two value predicates, barrel-exported from `@twt/channels`; unit tests cover each shape rule with a
passing and a failing case (incl. a whole-body template, a 4-variable template, two adjacent cbn slots, a 29 %-fixed template, a slot
count ≠ the `{#var#}` count, a `{#numeric#}` tag in the text, a duplicate slot name, a name with an upper-case letter).

### AC2 — The OTP is typed and still carries the code (TV3)
**Given** either OTP template **then** its text is UNCHANGED (still `{#var#}`), it declares one `numeric` slot (≤ 6),
`checkDltTemplateShape` returns ⛔ problems, `version` is still 1, and `renderOtpBody(…, '048213')` is byte-identical to today's
(`otp-sms-template.test.ts:35,42`; `sms-step-up-delivery.test.ts:100,130` unchanged and green), contains `048213` and ⛔ `{#`.

### AC3 — The twelve claim texts are typed, text unchanged (TV2, TV4)
**Given** every claim-correction and suspicion entry **then** its `registeredText` is unchanged, it declares `slots` per TV4, passes
`checkDltTemplateShape`, its slot names equal the `t()` params its renderer passes, its rendered body (through the real `t()`) is
byte-identical to today's, the lockstep reproduces
`registeredText`, and the sheet contains it with the same types in the same order; the local `DLT_VAR` / `OTP_VAR_SLOT` constants are
imports of TV1's; `claim.json` is ⛔ in the diff.

### AC4 — A malformed helpline HOLDS, ⛔ burns (TV5)
**Given** a Pariwar's helpline set to `+911800123456` (or with a space) **when** the suspicion sweep runs **then** the (purpose, Pariwar)
is HELD exactly as for an unset number (⛔ row finalised, ⛔ slot spent); **and** the send core, reached directly, returns
`config:helpline_number_missing`; **and** `1800123456` sends as today. A test pins both readers to `isDltCallbackNumber`.

### AC5 — The alert entries are dark and say why (TV6)
**Given** each of the five categories **then** `resolveDltTemplate` returns `null` and its entry carries `contentTemplate: null` +
`unregistrableReason`; **and** a provisioned id for that category still yields the fixture; the real-path composition tests pass against a
mocked registrable entry.

### AC6 — The gate (TV7)
`pnpm dlt-typed-variables:test && pnpm dlt-typed-variables:check` pass on the tree and run in `ci-local.sh` AND `ci.yml`; the negative
controls (a `{#numeric#}` tag; a `{#var#}` in an unlisted source file) fail in `lib.test.ts`; every `REGISTRY_FILES` path exists.

### AC7 — The sheet (TV8)
Every template 1–12, 15, 16 appears with its config key, its variable types in order and its MSG91 form (`##name##`); the where-and-how (STPL / SmartPing),
variable-types, shape-rules and helpline sections exist; the five alert categories are listed as not registrable; a Record line dated at
the change; ⛔ typed tag appears in any registered text (the gate proves it).

### AC8 — The handover OTP says 3 minutes (TV9)
**Given** a claim handover OTP **then** it is sent to the SAME number as today (the caller-supplied E.164) with the step-up text
(*"… verification code. Valid 3 min. …"*); every other OTP send selects the same template as today (tests for login, step-up and data
export).

### AC9 — The records (TV10–TV12)
Roster Row 30 written at its number; deferred-work items (TV6 §3.4 (iii); TV9 data export; TV12 lines; the `{member}` item updated —
TV4); 6.27a / 6.27c / 6.30 annotations (TV11); this file's Change Log + File List.

### AC10 — Nothing else moves; the proof
⛔ Migration, ⛔ `detail` code, ⛔ i18n change, ⛔ template id / secret / helpline set; `pnpm ci:local` green — run it, paste the summary.

## Tasks / Subtasks

- [ ] **Task 0 — governance FIRST (AC0).** ⛔ No code.
  - [ ] 0.1 Re-check `git diff --name-only 34b9bab6..HEAD -- packages/channels apps/jobs/src/scheduler apps/api/src/modules/auth
        apps/api/src/modules/claims apps/api/src/modules/member-data-rights docs/launch-gate-inventory scripts`; re-read any cited file
        that moved. Re-fetch F1–F6 (the Direction PDF; Vi's `Entity_Content_template_registration.pdf` and `CTA_Whitelisting.pdf`; Jio's
        TrueConnect guide) and the SmartPing / STPL tagging guidance (MSG91's carrier guide; any STPL help page) — record the fetch
        date. The portal is ANSWERED (STPL / SmartPing — BigDev, 2026-10-10); ask which SMS GATEWAY will send (TV10 (a)) — ⛔ guess.
  - [x] 0.2 Put TV1–TV12 to BigDev — ✅ answered in session 2026-10-10: the mechanical ones (TV1–TV4, TV7, TV8, TV10–TV12) *"All as
        written"*; TV5 *"Hold like unset"*; TV6 *"Switch off, keep listed"*; TV9 *"Fix handover, record export"* — all as recommended.
  - [x] 0.3 ✅ `2026-10-10-313` (`97e2c3bb`), committed ALONE. ONE author-commit recording the answers AND BigDev's portal fact
        (STPL / SmartPing; the text keeps `{#var#}`) with the FOUND notation correction to `-311` PM3 / `-312` AL15 (F13 — ⛔ editing
        either), committed ALONE ([[project_decision_log_writes_user_inserted]] — stage in the scratchpad, try the insert first).
  - [ ] 0.4 `epics.md` `### Story 6.34` after the last Epic 6 entry (6.29's format — *"⚠ Added … (Story 6.34, Task 0.4)"*, ⛔ a merge
        fence); roster **Row 30** (TV10, the Row 26 block format — `## Row 30 — Story 6.34: …`, the `> ⭐ Appended …` line, the eleven
        fields; note the 27–29 gap is RESERVED); 6.27a / 6.27c / 6.30 annotations (TV11); sprint ledger line
        ([[project_sprint_status_safe_prepend]]).
- [ ] **Task 1 — the vocabulary (AC1).** `packages/channels/src/dlt-variables.ts` + barrel export in `packages/channels/src/index.ts`
      (beside `resolveOtpTemplate` / `resolveDltTemplate`, `:101-110`); `packages/channels/tests/dlt-variables.test.ts`.
- [ ] **Task 2 — the OTP (AC2).** `otp-sms-template.ts` (TV3: `OTP_VAR_SLOT` = TV1's `DLT_VAR`, `slots`, `version` unchanged, the
      header comment's *"single variable slot"* paragraph names the `numeric` type); `otp-sms-template.test.ts` (shape, contains-the-code,
      ⛔ `{#` in the body).
- [ ] **Task 3 — the claim texts (AC3).** `claim-correction-sms-templates.ts`, `suspicion-notice-sms-templates.ts` (`slots` per TV4; the
      local `DLT_VAR` → TV1's import, re-exported if the tests import it; texts ⛔ changed; header comments); the two jobs tests (shape over
      every entry; the sheet row carries the same types in order; the `PANEL_EN` literals ⛔ changed — they are the Panel's EN wording).
- [ ] **Task 4 — the helpline (AC4).** `claim-dlt-sms-send.ts:99` and `claim-suspicion-notices.ts` `configSet` / `helplineGap` → the ONE
      predicate; ⚠ `configSet` also checks TEMPLATE IDS — apply the predicate to the HELPLINE read only (a `helplineGap`-local check on the
      resolved value, or a `configSet` variant) — ⛔ to template ids; tests in `apps/jobs/tests/` (the sweep holds; the core refuses; a
      good value sends) — run against :5433 per the house live-DB gotchas.
- [ ] **Task 5 — the alert registry (AC5).** `sms-dlt-registry.ts` (TV6 shape; `DltTemplate.contentTemplate: string | null`,
      `unregistrableReason`, `slots`); `resolveDltTemplate`; `provider-composition.test.ts`, `contribution-provider-resolver.test.ts`,
      `apps/api/tests/unit/sms-composition.test.ts`, `sms.test.ts` (F10's lines).
- [ ] **Task 6 — the handover OTP (AC8).** `step-up-delivery.ts` (`template?: OtpIntent` on the common payload);
      `sms-step-up-delivery.ts:150` (`resolveOtpTemplate(payload.template ?? payload.intent)`); `assertPayloadShape` (`:99-115` — it
      checks only `resolvedMobile` / `pariwarId` today) rejects a `template` outside `'login' | 'step_up'` as `invalid_payload`;
      `claims.service.ts:178` passes
      `template: 'step_up'`; the dev / log stub accepts and ignores it; tests (handover → step-up text, same recipient; the other three
      callers unchanged).
- [ ] **Task 7 — the gate (AC6).** `scripts/dlt-typed-variables/{lib.ts,check.ts,lib.test.ts,README.md}`; `package.json` scripts;
      `scripts/ci-local.sh` (after `kyc-provider-boundary`, `:77`); `.github/workflows/ci.yml` (a job mirroring `:828-851`).
- [ ] **Task 8 — the sheet (AC7).** `docs/launch-gate-inventory/dlt-template-requests-6-19.md` per TV8.
- [ ] **Task 9 — records and close (AC9, AC10).** Deferred-work items (newest-first, house format); this file's Change Log + File List;
      `pnpm ci:local` green — run it, paste the summary.

## Dev Notes

### ⚠ TRAPS
1. **⛔ Change a WORD of a registered text** — templates 1–12 are Panel-ratified wording (and 1–4's Hindi is human-reviewed — Row 20);
   only `{#var#}` → a tag. A text that "reads better" is a §0 event. ⛔ Turn the alert SMS fallback ON (TV6). ⛔ Change who is texted.
2. **⛔ "Tidy" `{#var#}` into a typed tag** — on STPL / SmartPing the text KEEPS `{#var#}` (v1.1); a `{#numeric#}` in the OTP text would
   be registered as literal text, AND `renderOtpBody` would stop inserting the code (F8) — the SMS would go out with ⛔ code. The
   rendered-body `toBe` pins and TV7's gate are the proof.
3. **Both helpline readers or neither** (F12) — a check in the send core alone re-opens the slot-burning bug 6.29 closed.
4. **`configSet` reads template ids too** — the callback-number predicate is for the HELPLINE value only; applied to a template id it
   would hold every notice forever.
5. **⛔ A second copy of the vocabulary** — `DLT_VAR` and the six types live in `dlt-variables.ts` only
   ([[feedback_stub_must_call_not_transcribe]]); the gate needs only the literal `{#var#}` and a "⛔ any other `{#…#}`" regex — if it
   imports anything from the package, use a relative path (a `scripts/` gate cannot import a workspace package's TS by bare name).
6. **`ci.yml` AND `ci-local.sh`** — drift between them is invisible ([[project_ci_actions_suspension_local_mirror]]).
7. **⛔ Provision anything** — ⛔ template id, ⛔ helpline, ⛔ secret (Invariant 6). Row 30 is BigDev's.
8. **Contracts / jobs tests are outside tsc in places** — run vitest for every touched package ([[project_contracts_tests_outside_tsc]]).
9. **Markdown in a doc block** — `**…**/` closes a JSDoc ([[project_markdown_emphasis_closes_jsdoc]]); grep `\*\*/` after editing a
   header comment. ⛔ `prettier --write` ([[project_prettier_not_enforced]]) — hand-format.

### Reuse map
- Gate skeleton → `scripts/kyc-provider-boundary/`. Registry style → `otp-sms-template.ts` (TOTAL map) / `sms-dlt-registry.ts` (partial).
- Hold → 6.29's `helplineGap` / `configSet` (`claim-suspicion-notices.ts:111-139`) — extend, ⛔ duplicate.
- Real `t()` render → the existing `renderClaimCorrectionSms` / `renderSuspicionNoticeSms` — ⛔ edited beyond comments.

### Testing standards
Vitest per package (`packages/channels`, `apps/jobs`, `apps/api`, `scripts/dlt-typed-variables`); jobs live-DB tests on :5433
([[project_live_db_test_gotchas]]); the merge gate is `pnpm ci:local`.

### Project structure notes
- NEW: `packages/channels/src/dlt-variables.ts`, `packages/channels/tests/dlt-variables.test.ts`, `scripts/dlt-typed-variables/*`.
- UPDATE: `packages/channels/src/{otp-sms-template.ts,sms-dlt-registry.ts,index.ts}`; `apps/jobs/src/scheduler/{claim-correction-sms-templates.ts,
  suspicion-notice-sms-templates.ts,claim-dlt-sms-send.ts,claim-suspicion-notices.ts}`; `apps/api/src/modules/auth/shared/{step-up-delivery.ts,
  sms-step-up-delivery.ts}`; `apps/api/src/modules/claims/claims.service.ts`; tests as above; `package.json`; `scripts/ci-local.sh`;
  `.github/workflows/ci.yml`; `docs/launch-gate-inventory/{dlt-template-requests-6-19.md,inventory-roster.md}`; `epics.md`;
  `deferred-work.md`; 6.27a / 6.27c / 6.30 story files (annotation lines only).
- ⛔ Touched: `packages/i18n/locales/**`, any migration, `packages/domain/src/claim/suspicion-notice.ts`'s `detail` grammar.

### Sequencing
⭐ 6.34 is ⛔ blocked by any Panel question or sibling. It UNBLOCKS 6.30's Row 29 (e) (only once Row 30 (b) closes — an operator step)
and gives 6.27c its vocabulary (TV11). ⭐ Row `6-37-msg91-sms-gateway-adapter` (`-314`) comes AFTER this story and consumes its named,
typed slots — ⛔ the other way round; if 6-37 is started first it STOPS and asks. Rows 6-31 (WhatsApp — ⛔ DLT) and 6-35 (language switch) are independent.

### Previous story intelligence
- **6.30** (AL15) recorded the typed-variable facts and handed them here; its Latest-tech section is the first fetch of F1–F6.
- **6.29** made 0151's `detail` a CHECKed grammar and added the per-(purpose, Pariwar) hold — TV5 rides that hold and adds ⛔ code.
- **6.24b** extracted the shared send core and wrote templates 7–12; **6.19b / 6.19d** wrote 1–6 and the sheet.
- **5.9** built the two OTP templates and the prod fail-startup; **5.6** the alert registry and composition seam.

### Git intelligence
`34b9bab6` the PR #268 SHA map · `9990cffa` 6.30 v1.6 · `b3a9476b` `-312` · `56fcd235` / `3df45a54` 6.27 / `-311` — house order:
decision entry → records → build → review; REBASE-merge ([[project_story_automator_ops]]). This story's branch
`story/6-34-sms-templates-typed-variables` is cut from `main` at `34b9bab6`.

### Latest tech information (fetched 2026-10-10 — re-check at Task 0.1)
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
- UNVERIFIED (single source): the 15 Jan 2026 date; leading zeros; Devanagari in `#alphanumeric#`; template-id behaviour outside Vi.

### References
- `2026-10-10-305` §2 item 5, §4 · `2026-10-10-312` AL15 · `2026-10-10-311` PM3 · `2026-10-10-302` RN2 / RN5 · `2026-10-08-295`
  RB1 / RB11 / RB12 · Story 5.6 / 5.9 files · architecture §2.2, §3.4 · `epics.md` AR-21, AR-56 · PRD §TRAI compliance.
- `_bmad-output/implementation-artifacts/6-30-app-links-open-the-app-from-a-text.md` (SIX FACTS #3, AL15); 6.27a / 6.27c files.
- `docs/launch-gate-inventory/dlt-template-requests-6-19.md`, `inventory-roster.md` (Rows 18–26).

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-10 | 1.0 | Created via `bmad-create-story 6.34` (pinned `34b9bab6`): three research passes (code inventory; TRAI / operator rules; governance). FOUND F1–F20 — incl. 19 untyped templates; per-portal tag spelling; whole-body alert templates unregistrable; the helpline's `+` invalid as `#cbn#` with TWO readers; the handover OTP's *"Valid 5 min"* for a 3-minute code; ⛔ DLT row or runbook. TV1–TV12 PROPOSED (author-commit owed at Task 0.3); ⛔ no Panel question (§0). Status `ready-for-dev`. |
| 2026-10-10 | 1.1 | BigDev, in session: *"We will use STPL, and [STPL] uses {#var#} for variable"* — the PE registers on STPL's SmartPing portal, where the text KEEPS `{#var#}` and each variable's type is picked in a separate tagging section (confirmed against MSG91's carrier guide). ⇒ ⛔ text is retagged: TV1 (one `DLT_VAR` + the six types as slot metadata), TV2 (slots declared; single-token lockstep kept), TV3 (OTP text and `version` unchanged), TV4 (types, ⛔ tags), TV7 (gate: ⛔ typed tag in text; `{#var#}` only in shape-tested registry files), TV8 (sheet: the type to select per `{#var#}`; a where-and-how section), TV10 (a) (portal answered; the gateway still owed), TV11 (6.27c writes `{#var#}` + slots; annotations on 6.27a / 6.27c / 6.30); Invariants 2 / 4, F3 / F8 / F9 / F13, AC1–AC3 / AC6 / AC7 / AC9, Tasks 0.1 / 0.3 / 0.4 / 2 / 3, Traps 2 / 5 aligned. TV5 / TV6 / TV9 / TV10 (b)–(e) / TV12 unchanged. |
| 2026-10-10 | 1.2 | `-313` applied — TV1–TV12 committed as recommended (`97e2c3bb`, alone); Tasks 0.2 / 0.3 done; buildable. |
| 2026-10-10 | 1.3 | BigDev: the gateway is *"msg91 for now"*. MSG91's docs read (F21): Flow / OTP v5 take `authkey`, MSG91's own template id and NAMED variable values — ⛔ our client's contract ⇒ NEW row `6-37-msg91-sms-gateway-adapter` (after 6.34) and **TV13** (every slot carries a `name` = the i18n param; the MSG91 template uses `##name##`) — both `2026-10-10-314` (`e2d57ed9`, alone; `-313` ⛔ edited). TV1 / TV8 / TV10 (a) (b) (d), AC1 / AC3 / AC7 and the sequencing aligned. |
