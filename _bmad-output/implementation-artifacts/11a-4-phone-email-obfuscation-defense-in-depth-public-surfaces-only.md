---
baseline_commit: 075827b5bebaaaa4e615bf508b841dd3f67c9d05
---

# Story 11a.4: Phone/Email Obfuscation Defense-in-Depth — Public Surfaces Only `[GOVERNANCE]`

Status: in-progress

> ⛔ **THIS FILE SUPERSEDES AN EARLIER AUTHORING PASS THAT LIVES ON A SIDE BRANCH.** A prior
> `bmad-create-story` run for 11a.4 was un-bundled from `story/11a.3` and parked on
> `story/11a.4-phone-email-obfuscation` (`656aaa5`, 2026-08-21), off a `main` that predates
> Story 11a.3 landing `done`, Decisions `2026-08-21-145`/`-146`/`-147`/`-148`, and Story 10.30.
> ⚠ **Three of that draft's load-bearing claims are now FALSE** — its Task 2 rests on a trigger
> naming a function that no longer exists, its Task 3 asks for coverage 11a.3 already shipped, and
> its Trap 2 cites a matrix row that does not exist. ⛔ **Do not `git checkout` that branch and do
> not merge it.** It is superseded, ⛔ not merged and ⛔ not reinterpreted
> ([[feedback_supersede_never_reinterpret]]). Delete it once this story lands.

> ✅ **BASELINE VERIFIED LIVE.** `git fetch origin` run at authoring time
> ([[feedback_git_fetch_before_remote_reasoning]]): `HEAD == origin/main == 075827b`, zero ahead /
> zero behind. Every claim in the table below was checked against that tree by reading source, ⛔ not
> inherited from the prior draft and ⛔ not inferred from a story record. Branch off `main`;
> re-`fetch` before you branch.

> ✅ **ALL FIVE DECISIONS RULED BY BIGDEV, 2026-08-22 — each as recommended. ⛔ Nothing here is open.**
> **D1′ = (a)** · **D2 = (a)** · **D3 = (e)** · **D4 = (a)** · **D5 = (a)**. They are recorded in
> §Decisions with the full reasoning. ⛔ The dev agent must **not** re-open or re-interpret a ruling —
> a ruling is superseded, never re-read ([[feedback_supersede_never_reinterpret]]). If one looks wrong
> once the code is in front of you, **stop and raise it**, ⛔ never silently deviate.
>
> ⚠ **THIS RULING HAS NO INDEPENDENT RECORD YET.** ⛔ No `.decision-log.md` entry exists for it; this
> story file and the sprint-status ledger are the only trace, both written in the same pass.
> ⭐ **Task 1's `governance:` commit is what makes it durable governance-of-record** — treat it as a
> **non-optional precondition**, ⛔ not a formality
> ([[feedback_record_unattested_no_backfill]], [[feedback_governance_commits_precede_implementation]]).
>
> ⭐ **WHAT THE RULINGS TURN ON:** **D3 = (e)** makes **AC3a + Task 4a ACTIVE** — the publish-time
> payload scan ships, ⛔ sequenced strictly behind AC1+AC2. **D1′ = (a)** means ⛔ **no masking
> component**, the doctrine ships in AC5, and the unowned Contact/About surfaces are **routed**
> (Task 7). **D2 = (a)** scopes the regex fix to the **`phone` pattern only** — ⛔ the `aadhaar`
> pattern is **not** widened.
>
> ⭐⛔ **D1 IS WITHDRAWN AND RE-ASKED AS D1′ (BigDev correction, 2026-08-22).** The trust's contact
> phone/email are **deliberately public so people in need may contact the trust** — that is ⛔ **not**
> member PII and ⛔ **not** a hypothetical consumer; the public **Contact page (with Madad card)** is
> committed in `ux-design-specification.md:243`. ⇒ the governing property on that channel is
> ⭐ **REACHABILITY bounded by accessibility**, and all three `epics.md` L4655 masking techniques are
> now refused **on the merits** (Trap 1's table), ⛔ no longer merely "deferred for want of a call
> site". ⚠ **Root cause of the error: the first pass never opened the UX spec — a DECLARED INPUT of
> this workflow.** ⛔ A second finding fell out of it and is **routed, not built**: the Contact and
> About pages are committed and ⛔ **unowned by any epic story** (SD-1 shaped), and the PII-scrape
> gate is ⛔ **blind to a missing page by construction**.
>
> ⭐ **D3'S RECOMMENDATION MOVED (a) → (e) ON EVIDENCE. ⛔ READ §Q3 BEFORE RULING IT.** BigDev asked
> four questions about what the dynamic Niyamavali payload *is* and who governs it before approving
> further protection around it. The answers are recorded as the **§Q3 evidence block**, read out of
> the substrate at `075827b`. ⚠ They confirmed the Story 2.4 workflow is strong on **process** and
> ⛔ **near-absent on CONTENT** — `ClausePayloadSchema` is `z.record(z.unknown())` and ⛔ **no
> automated check of any kind** stands between an authored payload and the public page, while two
> committed artifacts claim otherwise. ⇒ D3 gains option **(e)** (a **publish-time** scan that fails
> loudly), AC3a and Task 4a are **conditional on it**, and two §Q3 findings are ⛔ **routed to the
> Panel, not built here**.

> ⚠ **THE SURFACE THIS EPIC BUILT IS STILL LAUNCH-GATED, AND THIS STORY DOES NOT CHANGE THAT.**
> `docs/launch-gate-inventory/inventory-roster.md` **Row 17** (`directory-kill-switch-admin-ui`) is
> **`open`**: Story 10.30 shipped the admin UI (Decision `2026-08-21-148`) which walks the FIRST of
> the row's two closure legs ⛔ only — the ≥2-trustee ratification leg has not landed, so the public
> Member Directory ⛔ **still may not go live**. ⛔ Nothing in this story closes, advances, or
> touches Row 17. ⛔ Do not write that it does.

> **Depends on (all `done` + merged):** **1.16b** (`detectNakedPii`, `piiPatterns`, the gate, the
> engine's unit suite) · **1.14** (`HONEYPOT_PATHS`, `registerHoneypot`, `X-Robots-Tag`,
> `namedRateLimits`, the login-wall allowlist) · **1.10** (the §1.5 hash-chain audit sink) ·
> **11a.1** (the populated matrix, the armed tier-leak leg, the deletion of `loadSnapshots()`) ·
> **11a.2** (`/members`, `<MatrixField>`, the `cache_policy` + `pagination_binding` gate legs) ·
> **11a.3** (`apps/api/src/modules/public-pages/`, `directory-abuse-rules.yaml`,
> `directory.abuse_suspected`, the `X-Forwarded-For` correction, the FR-93 negative control on
> `/members`).

---

## Story

As Solo Builder authoring contact-information protection,
I want phone/email obfuscation on public surfaces only, with the explicit invariant that
**obfuscation is defense-in-depth, never primary protection** — sensitive fields remain hidden by
matrix-governed visibility classification first, obfuscation second,
so that the architecture's protection layering is written down where it binds, the one naked-PII
engine this project owns stops being a detector the test corpus is authored *around*, and no future
reader mistakes a claimed protection for a running one.

---

## 📜 Policy meaning (AI-10-1, CONFIRMED BigDev 2026-08-18)

**This story introduces NO predicate that gates a member's access to a benefit, and changes none —
it adds no conjunct to any existing one.** Every change below is either (a) a regex precision
change inside a CI detector, (b) new synthetic bot-bait routes that serve no member data and read
no member state, (c) documentation, or (d) truth-corrections to comments. ⛔ No `is_valid`,
`is_assignable`, roster, eligibility, coverage or visibility predicate is touched. ⛔ The
`public-vs-private-matrix.yaml` **tier values are not edited** by this story, so no member becomes
more or less visible than they are today.

**Checked against the Niyamavali:** not applicable, and stated rather than skipped — there is no
member-facing sentence to check, because no member's experience of eligibility, visibility or
benefit changes. ⚠ The one member-facing consequence in this story's neighbourhood — that a
member's full legal name is published on the open internet — was ruled at `2026-08-19-135`/`-136`
and its rulebook gap is tracked as `2026-08-20-140` cl.7, **still open**. ⛔ This story neither
discharges nor widens it.

---

## 🎯 What is actually true today — verified, not inherited

Every claim checked against the tree at `075827b` by reading the named file.

| Claim | Verified state |
|---|---|
| A public surface renders a phone number or an email address **today** | ⛔ **NO — none, anywhere.** `apps/public/src/pages/` is exactly eight files (`404`, `500`, `blog`, `blog/[postId]`, `index`, `members`, `niyamavali`, `terms`). `PublicShell.astro`'s `<footer>` renders `{trustName}` and nothing else (L147-149). ⛔ No `/contact`, `/helpline`, `/grievance` route. ⚠ **This is a fact about the SHIPPED TREE ONLY — ⛔ do NOT infer from it that AC1(a) has no subject.** Read **Trap 1**. |
| The public **Contact page** is committed product | ⭐ ✅ **YES — and the first draft of this story missed it.** `ux-design-specification.md:243` lists the public-website inventory as *"Member Directory, Sahyog Drive …, In Memoriam, Niyamavali with version diff, About, **Contact (with Madad card)**"* — the same inventory as the three surfaces 11a.1-11a.3 built. `:297` — *"Madad on the Contact page is **the front door**, not a fallback"*; `:87` — the card sits *"above existing contact content"*. ⇒ the trust's contact details are **deliberately public**. |
| Any epic story owns the Contact or About page | ⛔ **NO — zero.** `grep -n "Contact page\|/contact\|About page" epics.md` → **no hits**. ⛔ No route, ⛔ no matrix surface (the matrix declares eight; neither is among them). ⭐ **SD-1 shaped** — a committed surface with no owning story. ⚠ And the gate's route-coverage leg reconciles **shipped pages ⇄ matrix surfaces**, so a page that *should* exist but does not is ⛔ **invisible to it by construction**. Routed at Task 7. |
| A helpline number can be rendered today | ⛔ **NO.** ⛔ No provisioned source exists — no `.env.example` entry, no deploy config, no validation (`note-template.ts:122-127`). The PDF prints `HELPLINE_PENDING_TOKEN` = *"[PENDING — Epic 10 per-Pariwar helpline resolution]"* rather than fabricate one; the mobile CTA falls back to placeholder `+911800000000`. |
| A `tel:` / `mailto:` render exists somewhere | ✅ but ⛔ **not on a public surface.** `apps/mobile/components/common/CallHelplineCTA.tsx:63` and `claim/ShepherdContactCard.tsx:137` — the **member app**, token-bearer authenticated. `apps/api/src/modules/member-pool/note-template.ts:356` prints a helpline into a **PDF** — and prints `HELPLINE_PENDING_TOKEN` when unprovisioned, ⛔ never a fabricated number. All out of scope by this story's own title. |
| The matrix declares a `mobile` or `email` field on any surface | ⛔ **NO — zero rows, on zero surfaces.** `grep -n "mobile\|email\|phone" public-vs-private-matrix.yaml` → **two hits, both comments**. ⚠ The prior draft cited *"the matrix as ruled at 11a.3"* for a Mobile ✗/✗/✓ row; that table is **`epics.md` L4592-4593**, i.e. the *epic's* Story 11a.3 render-scope table — ⛔ **not** the shipped contract. Nothing classifies a contact field anywhere. Read **Trap 2**. |
| `detectNakedPii()` exists and is wired to real renders | ✅ `packages/contracts/src/public-pages/scrape.ts:276`, three patterns (`email`, `aadhaar`, `phone`), fresh `RegExp` per scan. Consumed by `apps/public/tests/integration/public-pages/scrape-test.spec.ts` across five surfaces. Its own comments already cite this story by name (`scrape.ts:17`, `:253`, `:274`). |
| The `pii-scrape` CI job runs the naked-PII leg | ⛔ **NO — and the prior draft got this backwards.** `loadSnapshots()` was **DELETED at 11a.1**; `check-pii-scrape.ts`'s header now says in terms *"⛔ Do not re-add a snapshot loader here."* The naked-PII leg runs **only** inside `scrape-test.spec.ts`, on `pnpm turbo run test`. ⇒ CR-D1-1.16b's recorded trigger names a function that ⛔ **no longer exists**. Read **Trap 3**. |
| The naked-PII leg scans **live tenant data** | ⛔ **NO — it has never scanned a single row of tenant data.** Every snapshot in `scrape-test.spec.ts` is built from **in-file fixtures** through the production render helpers (the file's own header: *"REAL render HTML, built from fixture rows … NO live Astro server and NO DB"*). ⭐ **This is the finding of this authoring pass** — read **Trap 4**. |
| The engine's phone pattern false-positives | ✅ **VERIFIED BY RUNNING IT**, not by reading the caveat: `/blog/9876543210` → `phone`; `data-id="9123456789"` → `phone`; `0801234 5678` → `phone`; `987654321012` → `aadhaar`; `₹9876543210` → `phone`. ⛔ Recorded as CR-D1-1.16b (`deferred-work.md:3087`) and **still open**. |
| The test corpus was authored **around** that defect | ⭐ ✅ **YES, in writing.** `scrape-test.spec.ts:146-147`: *"Fixture clauses — structurally real Niyamavali content. **Deliberately NO accidental 10-digit runs** (the phone regex false-positives on those — engine caveat CR-D1-1.16b)."* ⇒ the corpus is shaped by the defect; the defect is not shaped by the corpus. |
| The three PII pattern types are independently covered | ✅ **ALREADY** — `packages/contracts/tests/public-pages.test.ts:195-219`, six cases, one planted violation each, plus a clean-HTML control. ⚠ The prior draft's Task 3 asked for this; it exists. ⛔ Do not rebuild it. |
| The FR-93 leg is named on the flagship surface | ✅ **ALREADY** — `scrape-test.spec.ts:643` *"⭐ NEGATIVE CONTROL — the FR-93 leg on THIS surface catches naked PII when it is there"*, planting `9876543210` into the real `DIRECTORY_HTML`. Shipped at 11a.3. ⛔ Do not duplicate it. |
| A **precision** (false-positive) test exists anywhere | ⛔ **NO — zero, in either suite.** Every one of the eleven PII assertions in the repo tests **recall** (a planted violation is caught). Nothing asserts a non-PII digit run is **not** flagged. ⇒ a precision fix has no regression net today, and this story must build one before touching the regex. |
| The honeypot exists and emits an audit signal | ✅ `apps/api/src/plugins/security-headers/index.ts` — `HONEYPOT_PATHS` = **six** CMS-scanner fingerprints (`/wp-login.php`, `/wp-admin`, `/xmlrpc.php`, `/.env`, `/admin.php`, `/phpmyadmin`), each `schema: { hide: true }`, GET-only, emitting `abuse.honeypot` with `{ip, path, method, userAgent}` via the Story 1.10 sink, returning a bare `{status: 'ok'}` (L84). |
| It serves fake **contact** data | ⛔ **NO.** The response body is `{status: 'ok'}` for all six. It is a generic-scanner trap, ⛔ not a contact-scraper trap. ⇒ **AC1(c) does not exist as described.** |
| The honeypot's recorded IP is trustworthy | ⛔ **NO — and this is new.** `honeypotHandler` reads `request.ip`; `apps/api` runs `trustProxy: true` (`server.ts:90`), under which `request.ip` is the **LEFTMOST** `X-Forwarded-For` entry. ⛔ `apps/public` does **not** proxy these paths — a scanner reaches them **directly** — so the recorded `ip` is **caller-chosen by one header**. This is the same defect class `2026-08-21-145` cl.2 fixed for `/members`. Read **Trap 5**. |
| The honeypot list is derived, not restated | ✅ **Both consumers derive it.** `login-wall.spec.ts:120` is `...HONEYPOT_PATHS.map((p) => \`GET ${p}\`)`; `security-headers.spec.ts:72` asserts `toHaveLength(HONEYPOT_PATHS.length)`. ⇒ adding a path needs ⛔ **no allowlist edit**. The forced-pagination guard never sees them at all — `hide: true` keeps them out of the OpenAPI surface it walks (⚠ `index.ts:36` calls that an "allowlist"; it is not, for that guard). |
| Story 10.6 is "query throttling" | ⛔ **FALSE**, and now **twice-recorded**: `directory-abuse-rules.yaml` note **7** and `deferred-work.md:265` both state it. 10.6 is the **Bulk Operations Framework** (`epics.md:3736`). ⛔ Do not cite it as coverage anywhere in this story. |
| The real anti-enumeration coverage on `/members` | ✅ `limits.search` (the named SEARCH rate-limit tier) + the page-size cap (50) + the deep-page horizon (200) + `X-Robots-Tag` + the absence of any export affordance + `directory-abuse-rules.yaml` (four `active` rules emitting `directory.abuse_suspected`). Five controls, defended in writing at `public-pages/routes.ts:12-40` **and** `login-wall.spec.ts:80-107` — ⚠ the two counts must stay identical. |
| The public-pages README documents FR-93 | ⚠ **ONE passing sentence** (`README.md:172`, inside the tier table's prose). ⛔ No section, ⛔ no layering order, ⛔ no resolution of the `[v1-S — moot per policy]` tag. |
| `.decision-log.md` head | `2026-08-21-148` (Story 10.30). ⛔ Do not hardcode the next number — read the head at implementation time. |
| Row 17 / launch gate | `open`. `closure_evidence_link` **empty**. One of two legs walked. ⛔ Untouched by this story. |

---

## ⛔ THE FIVE TRAPS — read these before anything else

### Trap 1 — ⭐⛔ AC1(a) IS ABOUT THE **TRUST'S OWN** CONTACT CHANNEL, WHOSE PURPOSE IS **REACHABILITY**. ⛔ Obfuscating it is contrary to what it is for.

> ⚠ **THIS TRAP WAS REWRITTEN AFTER A BIGDEV CORRECTION (2026-08-22), AND THE FIRST VERSION WAS
> WRONG IN A LOAD-BEARING WAY.** It read *"the epic's own example surface does not exist; AC1(a) has
> nothing to protect"* and concluded that building for it would be **scope invention**. ⛔ Both the
> conclusion and the reasoning are withdrawn. The shipped-tree FACT survives; the INFERENCE from it
> does not. ⛔ Do not restore the earlier framing from git history.

**⛔ THE CATEGORY ERROR — read this before anything else in this story.** FR-74, the matrix and every
tier rule in this epic govern **MEMBER** PII: data that must ⛔ **never** be public. `epics.md` L4655's
*"helpline contact, footer"* is ⛔ **not that**. It is the **TRUST'S OWN institutional contact
channel**, and it is **deliberately public so that a person in need can reach the trust.** ⭐ The two
are **opposite in intent**, and this story's first draft treated them as one topic.

⇒ On the trust's contact channel the governing property is ⛔ **not** concealment — it is
**REACHABILITY**, bounded by accessibility.

**The shipped-tree fact, unchanged and still true:** `apps/public/src/pages/` is eight files and none
is a contact route; `PublicShell.astro:147-149` renders `{trustName}` only; the only `tel:`-bearing
surfaces are the **member app** (authenticated) and a **PDF**.

⭐ **BUT THE CONSUMER IS COMMITTED PRODUCT, ⛔ NOT HYPOTHETICAL — and the first draft missed it by
never opening the UX spec** (a **declared input of this workflow**; that omission is the root cause
of the withdrawn framing, ⛔ not a detail):

- `ux-design-specification.md:243` — **"Public website** — responsive web. Member Directory, Sahyog
  Drive …, In Memoriam, Niyamavali with version diff, About, **Contact (with Madad card)**." ⇒ the
  Contact page sits in the **same committed inventory** as the three surfaces 11a.1-11a.3 already built.
- `:297` — *"Madad on the Contact page is **the front door, not a fallback** after software failure."*
- `:87` — *"Madad lives on the Contact page … (**Contact-page card visible above existing contact
  content**)"* ⇒ the page carries contact content **by design**.
- `:209` — Contact is in the member bottom bar.

**⛔ AND THE THREE AC1(a) TECHNIQUES ARE WRONG ON THE MERITS FOR THIS SURFACE, ⛔ not merely
unbuildable.** Against the actual audience — a grieving family, a cheap Android, Ravi-mode:

| AC1(a) technique | Why it ⛔ fails here |
|---|---|
| **Image rendering** | ⛔ Not tappable, ⛔ not copyable, ⛔ not screen-readable. **NFR-A11y-1 (WCAG 2.1 AA) is a named LAUNCH BLOCKER for public-site primary nav** — an image of a phone number is a straight a11y failure. |
| **JS-decoded display** | ⛔ Fails with JS off/broken. `apps/public` is **Astro SSR precisely so it works without heavy JS**; decoding the one number a person in crisis needs is the worst possible thing to make JS-conditional. |
| **Partial masking + helpdesk CTA** | ⛔ **Circular** — the number *is* the helpdesk. Masking the helpline behind a "contact the helpline" CTA is a dead end. |

⚠ **AND INDEXING CUTS THE OTHER WAY.** `/niyamavali` is `search_indexing_policy: index`. A Contact
page would be too — you ⭐ **want** a search engine to surface the trust's helpline to someone
searching for help. Obfuscation defeats that on purpose.

✅ **THE RESIDUAL CONCERN IS REAL — but it is CHANNEL INTEGRITY, ⛔ not privacy.** Harvesting the
helpline invites spam that could degrade a channel grieving families depend on. ⇒ its mitigations are
**rate limiting, provider-side filtering, and the AC4 honeypot (already in scope)** — ⛔ **never**
making the number unreadable to the people it exists for.

⚠ **AND IT CANNOT RENDER A NUMBER TODAY ANYWAY.** ⛔ No provisioned helpline source exists — no
`.env.example` entry, no deploy config, no validation (`note-template.ts:122-127`); the PDF prints
`HELPLINE_PENDING_TOKEN` = *"[PENDING — Epic 10 per-Pariwar helpline resolution]"* rather than
fabricate one, and the mobile CTA falls back to a placeholder `+911800000000`. ⇒ **doctrine now,
component when the page and its number exist.** See **D1**.

> ⭐⛔ **NEW FINDING, ROUTED — THE PUBLIC CONTACT PAGE IS COMMITTED AND ⛔ UNOWNED (SD-1 SHAPED).**
> It is in the UX spec's public-website inventory, and: ⛔ **no epic story owns it**
> (`grep -n "Contact page\|/contact\|About page" epics.md` → **zero**), ⛔ no `apps/public` route,
> ⛔ no matrix surface (the matrix declares eight; none is `contact` or `about`).
> ⚠ **AND THE PII-SCRAPE GATE IS BLIND TO THIS BY CONSTRUCTION** — its route-coverage leg reconciles
> **shipped pages ⇄ matrix surfaces** in both directions, so a surface that *should* exist but
> **does not** is invisible to both. ⛔ A green gate proves nothing about a missing page.
> ⇒ This is the **SD-1 shape** (`2026-08-19-132`): a committed surface with no owning story, which
> went unnoticed for seven epics last time. ⛔ **11a.4 does not build it** — it **routes** it
> (Task 7). ⚠ `About` is in the same inventory sentence and is equally unowned; ⛔ record both, ⛔ do
> not silently narrow to Contact.

### Trap 2 — ⛔ AC2's PREMISE HAS NO SUBJECT EITHER, AND THE PRIOR DRAFT CITED THE WRONG ARTIFACT FOR IT.

`epics.md` L4658-4664 governs what happens *"when authenticated-member or operator-restricted
surfaces render phone/email"*. ⛔ **No surface in the matrix classifies a contact field at any
tier** — `mobile` and `email` appear in `public-vs-private-matrix.yaml` **only inside comments**.
The Mobile ✗/✗/✓ row the prior draft cited as *"the matrix"* is the **epic's** Story 11a.3
render-scope table (`epics.md` L4592-4593) — prose, ⛔ not the shipped contract, and that table's
own reconciliation banner says in terms it *"is NOT a schema"*.

⚠ **This does not invalidate the clause.** It is a correctly-scoped **conditional** — it governs
what *would* be true *if* a future matrix escalation ever moved a contact field to
`authenticated_member`. ⛔ It means the clause documents a rule for a case that **has not arisen**,
and must be written that way. ⛔ Do not write a test that asserts a matrix row that does not exist.

⛔ **And its layer (e) is a verified-false citation.** `epics.md` L4660 names *"Story 10.6 query
throttling"*. Story 10.6 is the **Bulk Operations Framework**. Already recorded twice
(`directory-abuse-rules.yaml` note 7; `deferred-work.md:265`). ⛔ Never cite it as coverage; the
real coverage is `limits.search` + `directory-abuse-rules.yaml`.

### Trap 3 — ⚠ CR-D1-1.16b's RECORDED TRIGGER NAMES A FUNCTION THAT WAS DELETED. ⛔ Do not claim it "fired".

`deferred-work.md:3087` states the trigger as *"Story 2.5 / first real public HTML snapshot is wired
into `loadSnapshots()`"*. ⛔ **`loadSnapshots()` no longer exists** — Story 11a.1 deleted it, and
`check-pii-scrape.ts`'s header now forbids re-adding it (*"⛔ Do not re-add a snapshot loader
here"*). Its sibling CR-D2-1.16b, which was *about* `loadSnapshots()`, is closed by that same edit
and ⛔ was never marked closed.

⇒ The honest statement is **"the trigger is STALE and its wording must be corrected"**, ⛔ not
*"the trigger fired and was missed"* (the prior draft's framing, which reads as a decay finding and
is not one). Whether the item is *closed* here or *re-scoped with a corrected trigger* is **D2** —
⛔ a real decision, not a formality, per [[feedback_closure_language_precision]] and
[[feedback_trace_reachability_before_escalating]].

### Trap 4 — ⭐⛔ THE ONE PLACE THE REPO CLAIMS A NAKED-PII DEFENSE OVER **DYNAMIC TENANT DATA**, THE DEFENSE NEVER RUNS ON TENANT DATA.

⭐ **This is the finding of this authoring pass. Read it twice.**

The Niyamavali public render carries a **dynamic key→value payload block**
(`clause_payload_display_fields`) whose key set is **DATA** — clause payloads differ per clause and
per Pariwar, so no committed file can enumerate them. **Two artifacts name the naked-PII leg as what
protects its contents:**

- `public-vs-private-matrix.yaml:134-141` — *"What protects the contents is the renderer's
  opaqueness … plus the naked-PII leg, which scans the real HTML and does not care where a phone
  number came from."*
- `apps/public/src/lib/niyamavali-render.ts:222-227` — the same sentence, in the module doc.

⛔ **The naked-PII leg has never seen a byte of tenant payload data.** It runs in exactly one place
— `scrape-test.spec.ts` — over HTML built from **in-file fixtures** (the file's own header:
*"built from fixture rows … NO live Astro server and NO DB"*). The `pii-scrape` CI job does not run
it at all (Trap 3). ⇒ both sentences are **true of the test corpus** and **false of the live
surface**, and they are the only stated protection for a block whose contents are un-enumerable.

⚠ **The correction is Trap-5-shaped** (the 10.30 pattern): **one half moves, one half stays.** The
half that must be corrected is the implied *reach* — that the leg polices what a Pariwar actually
publishes. The half that **STAYS** is the renderer's opaqueness (freeze row 14: display rendering,
never rule interpretation), which is a **real** protection and is unaffected.

⚠ **And weigh the residual risk honestly before reaching for a runtime scrub.** Clause payloads are
**governed content**: they reach the public render only through the Story 2.4 Niyamavali amendment
workflow (audit-logged publish, versioned, trustee-authored). Publishing a phone number in a clause
payload would be a deliberate act by a trustee, ⛔ not user-generated content slipping through. A
render-time redactor over a **rulebook** could silently alter a published rule's stated value — a
worse failure than the one it prevents. See **D3**.

### Trap 5 — ⛔ "FLAG SCRAPING IPs" CANNOT BE BUILT AS WRITTEN: THE RECORDED IP IS ATTACKER-CHOSEN.

`epics.md` L4657 asks for *"honeypot scraper-detection routes [that] serve fake contact data + flag
scraping IPs for rate-limiting"*.

`honeypotHandler` records `request.ip`. `apps/api` runs `trustProxy: true` (`server.ts:90`), under
which `request.ip` resolves to the **LEFTMOST** `X-Forwarded-For` entry. ⛔ `apps/public` proxies
only the directory route — a scanner reaches `/wp-login.php` and any sibling **directly**, and can
therefore set that header itself. ⇒ the `ip` on an `abuse.honeypot` line is **caller-supplied**,
and rotating it defeats per-IP correlation *and* the per-IP rate-limit ceiling.

⚠ This is the **same defect class** `2026-08-21-145` cl.2 fixed for `/members` — and the fix there
(`apps/public` forwards only `Astro.clientAddress`, discarding the inbound chain) ⛔ **does not
reach these paths**, because nothing proxies them. ⛔ `trustProxy` is **not** re-tuned to fix it:
that would alter `request.ip` and origin checks for **every** route in the app, on a
`[GOVERNANCE]` story (`-143` cl.9's standing fence).

⇒ **A honeypot line is a SIGNAL, ⛔ not an enforcement, and its IP is ⛔ not evidence.** Say so in
the code, say so in the deferral, and ⛔ never write that this story "flags scraping IPs".

⚠ **AND A SECOND PRECONDITION, unresolved:** whether `apps/api` is internet-reachable at all is the
**open network-topology question** `deferred-work.md:205-213` already carries — which states in
terms: *"Story 11a.4 records the same open topology question independently — ⛔ the two must be
answered together, not twice."* ⛔ **Join that deferral. Do not open a second one.**

---

## 📋 §Q3 — The governance of dynamic Niyamavali content (evidence block)

> **Why this section exists.** Trap 4 says a claimed protection does not run. Before approving any
> *additional* protection around the dynamic payload block, BigDev put four questions about what
> that block is and who governs it. ⛔ The answers below are **read out of the substrate**, ⛔ not
> inferred from a story record — every claim names the file and line that establishes it, at
> `075827b`. ⭐ **This block is what moved D3's recommendation from (a) to (e).**

### Q3(a) — What is stored, and why must it be dynamic?

⛔ **The payload is not commentary alongside the governed text — it IS the rule, in machine form.**
From the committed seed (`packages/domain/seed/niyamavali-v1-clauses.sql`, the R8 clause):

```json
{"rule_code":"R8","title_en":"Ninety-percent contribution rule (illness-death eligibility gate)",
 "rule_kind":"conditional","family":"r8-ninety-percent","precedence":30,
 "on_pass":"ninety_percent_met","on_fail":"r8_not_applicable",
 "all_of":[{"op":"fact_equals","fact":"claim.death_classification","value":"illness"},
           {"op":"fact_gte","fact":"contribution.compliance_percent","min":90}],
 "threshold_percent":90,"min_contributions":10,
 "policy_review_required":true,"provisional":true}
```

That is the specification `@twt/niyamavali-engine` evaluates when a claim is decided. **Three
reasons it cannot be committed text:**

1. **Per-Pariwar.** `clause_versions` is tenant-scoped under RLS
   (`policies/clause-versions-rls.ts`). Each Pariwar's rulebook is its own data; a committed file
   would impose one rulebook on every tenant — the **SD-1 shape** (`2026-08-19-132` R7: *"the
   attribute set is extensible and Pariwar-selected … there is no canonical directory schema"*).
2. **Versioned with lineage.** `(pariwar_id, clause_id, version)` unique, plus `effective_date`,
   `predecessor_clause_ids`, `superseded_by_version` (`schema/clause_versions.ts:69-171`) — *"which
   rule was in force at instant X"* is an indexed query. Git history is ⛔ not an effective-date index.
3. **Architectural freeze row 14.** The registry stores, structurally diffs and resolves the payload
   and ⛔ **never interprets** it; Epic 4 interprets (`clause_versions.ts:6-9`: *"Engine logic leaking
   into this registry is a freeze violation"*). Committing rules to source means a **code deploy per
   amendment**, or two sources of truth for one rule.

⇒ The public page renders it so a member can read **the rule the engine actually applies**, ⛔ not a
prose paraphrase that could drift from it.

⚠ **THE CAVEAT THAT MATTERS.** The seeded payloads are disciplined; ⛔ **nothing makes them so.** The
transport contract is `ClausePayloadSchema = z.record(z.unknown())`
(`packages/contracts/src/rules/clause.ts:50`) — ⛔ **any key, any value, arbitrary strings.** The
discipline is **convention, ⛔ not constraint.**

### Q3(b) — Who is authorised to create or change these values?

| Key | Roles | Scope |
|---|---|---|
| `niyamavali.amend` — author / edit / publish | `pariwar_admin`; `super_admin` derives | per-Pariwar |
| `niyamavali.review` — non-author sign-off | `pariwar_admin`, `state_trustee` | `state_trustee` capped at `state` |

`rbac/roles.ts:370-371` (pariwar_admin), `:409` (state_trustee). Every route runs
`[requireAdminSession, scopeResolutionHook, requirePermissionHook]`; **reads** accept either key (the
non-author reviewer must load the content), **writes** require `niyamavali.amend`, **sign-off**
requires `niyamavali.review` (`apps/api/src/modules/rules/index.ts:11-12`). RLS enforces tenant
isolation on `clause_versions` and `niyamavali_amendments`.

### Q3(c) — What review is required before a change becomes public?

A real four-state machine with teeth (`packages/domain/src/niyamavali/drafts.ts:6-21`):

```
draft ──submit──▶ in_review ──signoff──▶ signed_off ──publish──▶ published
  ▲                                          │
  └────────────── edit (any change) ─────────┘
```

- **Non-author sign-off, FAIL-CLOSED** on three invariants — present, resource-bound,
  `reviewedBy !== authoredBy` (`tone-review/gate.ts:12-19`). ⛔ An author cannot approve their own change.
- **Content-bound.** The sign-off holds only while `sha256(canonicalJson(payload))` matches the
  reviewed hash; any edit clears it ⇒ edit-after-signoff **409s** until a fresh non-author sign-off
  (`drafts.ts:14-21`).
- **Audit-or-throw.** The audit line is written FIRST with a pre-generated `clause_version_id`; rows
  insert with `audit_id` NON-NULL. A throw rolls the scope tx back ⇒ ⛔ **no published clause without
  an audit line** (`rules/index.ts:14-20`).
- **Append-only amendment ledger** — `from → to` edge, structured `diff_document`, and a **mandatory
  `affected_member_scope`** declaration (architecture §1.10: *"Amendments cannot be committed without
  a scope declaration"*); BEFORE UPDATE/DELETE/TRUNCATE triggers RAISE.

⛔ **WHAT IS NOT IN THAT CHAIN:** ⛔ no legal-review gate (Story 0.13 is external and explicitly does
⛔ **not** gate — `niyamavali-v1-clauses.sql:14-16`); ⛔ no Trustee Panel ratification step in code;
⛔ no PII check; ⛔ no content schema.

### Q3(d) — Who is responsible if a change publishes an incorrect statement or introduces PII?

**RECORDED (so *who did it* is answerable, and the record cannot be erased):** `authored_by_actor` on
the version row · the hash-chained Story 1.10 audit line · the reviewer's actor id on the sign-off ·
the append-only amendment row. ⚠ Correction means publishing a **new version** — the erroneous one
⛔ stays in lineage, ⛔ never erased.

⛔ **NOT PROVIDED — and this is the finding.** Between an authored payload and the public page there
is ⛔ **NO automated check of any kind:**

| Claimed control | Verified reality |
|---|---|
| `ClausePayloadSchema` | `clause.ts:50` — `z.record(z.unknown())`, ⛔ zero content validation |
| *"No PII fields exist in a rule payload"* | `niyamavali-render.ts:114-116` — an **ASSUMPTION STATED AS FACT**; ⛔ nothing enforces it at write time |
| *"the naked-PII leg … scans the real HTML"* | matrix `:141` + render `:227` — runs ONLY in `scrape-test.spec.ts` over **in-file fixtures**; ⛔ never touches tenant data (**Trap 4**) |
| microcopy CI gate | `scripts/microcopy/check.ts:8-21` — scans **committed source globs**; ⛔ never reads a DB row |

⇒ The **only** controls are (i) **one non-author human** reading the draft, and (ii) the audit trail
identifying who to hold responsible **afterwards**. ⚠ And `/niyamavali` is `cache_policy:
edge_cacheable` (`public-vs-private-matrix.yaml:115`, `s-maxage=300`), so even an immediate
correction carries a **multi-minute propagation floor** — the same floor `2026-08-21-145` cl.5(e)
recorded for the kill switch.

⛔ **Whether one non-author reviewer is sufficient authority to publish a rule that governs claim
eligibility — and who answers for a wrong one — is a GOVERNANCE question the code cannot answer, and
it is ⛔ NOT RULED ANYWHERE.** ⛔ It is a Panel question, ⛔ not this story's to settle. Recorded here
so it is routed rather than absorbed.

---

## ⛔ SCOPE BOUNDARY — what this story is NOT

- ⛔ **No new public page, route, or UI component** — ⛔ not the committed **Contact** or **About**
  page, ⛔ not an `<ObfuscatedContact>` component (Trap 1, **D1′**). ⚠ **For two DIFFERENT reasons,
  and ⛔ do not merge them:** the Contact page is real, committed and **unowned** ⇒ it needs its own
  story with UX, bilingual copy, tone review, a11y validation and a provisioned helpline number
  (Task 7 **routes** it); the masking component is refused **on the merits** ⇒ obfuscating a
  reachability channel is contrary to its purpose, so it is ⛔ not "pending a page".
- ⛔ **No matrix tier edit, no new field row, no escalation entry, no `escalation_count` bump.** The
  tier values are untouched, so no member's visibility changes.
- ⛔ **No new permission key, no catalog-version bump, no migration, no npm dependency.**
- ⛔ **No `trustProxy` change** (Trap 5) and ⛔ **no `keyGenerator` override** on any route.
- ✅ **The Niyamavali publish path (`apps/api/src/modules/rules/index.ts`) IS IN SCOPE — D3(e) is
  RULED** — for **one added precondition check** on the existing publish handler, ⛔ never
  a new route, ⛔ never a new key, ⛔ never a change to the four-state draft machine, the non-author
  sign-off gate, the content-hash binding, or the audit-or-throw sequencing. ⛔ This story still does
  ⛔ **not** rule on the §Q3(d) authority question — that stays a Panel question.
- ⛔ **The two §Q3 findings routed for the Panel are NOT built here** — the inert `provisional` /
  `policy_review_required` flags, and whether one non-author reviewer suffices to publish an
  eligibility-governing clause. ⛔ Record and route; ⛔ do not absorb.
- ⛔ **No second `apps/api` public route** — `public-pages/routes.ts:42` fences that explicitly
  (*"⛔ NO SECOND ROUTE"*). Honeypot bait paths are additions to an existing registration loop, ⛔
  not a new subsystem and ⛔ not a public-pages route.
- ⛔ **No re-derivation of the recall tests** at `public-pages.test.ts:195-219` or the FR-93 negative
  control at `scrape-test.spec.ts:643`. Both shipped. ⛔ Do not duplicate; ⛔ do not restructure.
- ⛔ **Nothing touching Row 17**, the kill switch, `pariwar_directory_publication`, or Story 10.30's
  admin surface.
- ⛔ **No re-litigation** of Decisions `2026-08-19-135`/`-136`, `2026-08-20-140`/`-142`/`-143`,
  `2026-08-21-144`…`-148`. This story extends their reasoning to a new finding
  ([[feedback_supersede_never_reinterpret]]).
- ⛔ **`apps/mobile`'s `CallHelplineCTA` and `ShepherdContactCard` are out of scope** — authenticated
  surfaces, protected by RBAC/session, exactly as AC2's third clause says they should be.

---

## Acceptance Criteria

Sourced from `epics.md` §Story 11a.4 (L4644-4667). ⚠ Every original clause is carried with its
**as-shipped disposition** — none is silently narrowed, and where reality diverges the divergence
is **recorded**, ⛔ not hidden.

### AC1 — A precision regression net exists BEFORE the regex moves

**Given** eleven PII assertions exist and every one tests **recall** (a planted violation is caught),
with ⛔ zero testing **precision**
**When** the false-positive work begins
**Then** a `describe` block asserting the **non-PII** direction lands **first**, in
`packages/contracts/tests/public-pages.test.ts` (the pure-engine home — it needs synthetic HTML, ⛔
not a render), covering at minimum: a URL path segment (`<a href="/blog/9876543210">`), a quoted
numeric attribute (`data-id="9123456789"`), and a `0`-prefix landline shape
**And** each case is asserted **independently** — ⛔ one fixture must never carry several
expectations (`scrape-test.spec.ts:654`'s own doctrine: a shared fixture lets one detector silently
stop firing while its neighbours keep the suite green)
**And** ⛔ the block is RED before the AC2 change and GREEN after — proven by **running it**, ⛔ not
by reasoning about it

### AC2 — The phone/Aadhaar precision gap closes, and recall is PROVEN not to regress

**Given** CR-D1-1.16b (`deferred-work.md:3087`) and D2's ruling
**When** `piiPatterns()` (`packages/contracts/src/public-pages/scrape.ts:263-269`) is tightened
**Then** the `phone` pattern's negative lookbehind — currently
`(?<![a-zA-Z0-9._%+\-\d])` — additionally excludes URL-path and quoted-attribute contexts (`/`, `="`,
`'`), as a **pure regex change**: ⛔ no new dependency, ⛔ no HTML parser, ⛔ no change to the
`email` pattern
**And** every existing recall assertion still passes **unmodified** — `public-pages.test.ts:195-219`
(six cases), `scrape-test.spec.ts:209` (the Niyamavali planted control) and `:643` (the FR-93
directory control). ⛔ **A regex edit that silently stops catching a planted control is worse than
not touching the file at all** — precision may ⛔ never be bought with recall
**And** the `scrape-test.spec.ts:146-147` comment (*"Deliberately NO accidental 10-digit runs …
engine caveat CR-D1-1.16b"*) is updated to match whatever is true after this change — ⛔ a corpus
authored around a fixed defect is a stale warning, and a stale warning is what Trap 3 is about

> ✅⛔ **SETTLED BY D2 = (a): THE `aadhaar` PATTERN IS ⛔ NOT TOUCHED. Scope is the `phone` pattern
> ONLY.** `987654321012` matching `aadhaar` is the same class of false positive and D2(b) would have
> widened it — ⛔ **(b) was NOT ruled in.** A 12-digit run genuinely *is* an Aadhaar shape, and
> loosening it trades a real recall guarantee on a `never_exposed` field for a hypothetical precision
> gain. ⛔ Do not widen it; ⛔ do not "improve" it in passing.

### AC3 — The naked-PII leg's REACH is stated truthfully at both sites that claim it as protection

**Given** Trap 4 — two artifacts name the leg as what protects the dynamic clause-payload block, and
the leg has never scanned tenant data
**When** the record is corrected
**Then** `public-vs-private-matrix.yaml` (the `clause_payload_display_fields` description,
~L134-141) and `apps/public/src/lib/niyamavali-render.ts` (~L216-228) both state the boundary
explicitly: the leg scans **fixture-built render HTML in `scrape-test.spec.ts`**, on every PR — and
⛔ **does not** scan what a Pariwar actually publishes
**And** the **other half STAYS** (Trap 4): the renderer's opaqueness (freeze row 14 — display
rendering, never rule interpretation) is a real protection, is unaffected, and ⛔ must not be
softened by this edit
**And** the change is **comment/description text only** — ⛔ zero behavior change, ⛔ zero tier
change, ⛔ zero field added or removed. A `git diff` of `public-vs-private-matrix.yaml` must show
**no change to any `tier:`, `pii_tier:`, `escalations:` or `escalation_count` line**, and the
matrix's own parse tests (`public-pages.test.ts:342-440`) must run **unmodified** and green — which
is what *proves* the contract untouched rather than merely asserted to be

> ✅ **D3 = (e) IS RULED, SO THE CORRECTED SENTENCES TAKE THE AC3a SHAPE — read AC3a before writing them.** They
> stop being a bare boundary statement (*"the leg does not scan tenant data"*) and become a statement
> about a protection that **runs**: *"payload content is scanned at PUBLISH; the render-time leg
> scans fixture HTML only."* ⛔ Do not write the AC3 wording and then bolt AC3a on — the two are ⛔ one
> edit, or the artifacts end up carrying two half-true sentences instead of one true one.

### AC3a — ✅ **ACTIVE (D3(e) RULED)**: the payload is scanned at PUBLISH, and the publish FAILS LOUDLY

> ✅ **D3 = (e), so this AC SHIPS.** ⛔ It is ⛔ **not** optional and ⛔ not the dev agent's to skip.
> ⚠ **But it is SEQUENCED: AC1 + AC2 must be GREEN FIRST** — see the `Given` below. ⛔ Landing this
> before the precision fix blocks legitimate rule amendments.

**Given** D3(e) as ruled, and §Q3(d) — ⛔ no automated check of any kind stands between an authored
payload and the public page, and `ClausePayloadSchema` is `z.record(z.unknown())`
**And** ⛔ **AC1 + AC2 have LANDED** — the precision fix is a **precondition**, ⛔ not a neighbour: a
false positive here ⛔ blocks a legitimate rule amendment
**When** a clause is published on the `niyamavali.amend` path
(`apps/api/src/modules/rules/index.ts`)
**Then** `detectNakedPii` runs over the **canonical JSON** of the payload
(`canonicalJsonStringify` — the same canonicaliser the content hash and the audit chain already use,
⛔ not a second serialisation) **before the audit line is written**, and any match rejects the publish
with a typed 4xx
**And** ⛔ **the error names the matched pattern TYPE ONLY, ⛔ NEVER the matched VALUE** — echoing the
value back writes the leaked PII into the error body, the request log and the client. ⛔ A test must
assert the value is absent from the response
**And** the rejection is a **designed status** — a 4xx at the route's precondition, ⛔ never a 500
(the Story 10.30 finding: an unregistered domain error surfacing as a 500 is ⛔ not a designed
rejection). ⛔ No test may assert a 500
**And** ⛔ **nothing else on that path moves**: ⛔ not the four-state draft machine, ⛔ not the
non-author sign-off gate, ⛔ not the content-hash binding, ⛔ not the audit-or-throw sequencing, ⛔ not
the append-only ledger, ⛔ no new permission key, ⛔ no schema change. The existing Story 2.4 route
tests must run **unmodified** and green — which is what *proves* the workflow untouched
**And** the check is documented **where it lands** as a ⛔ **BACKSTOP, ⛔ not the primary control** —
the primary control stays the **non-author human sign-off** (§Q3(c)). ⛔ Omitting that sentence turns
AC3a into the next over-claim, which is the exact defect Trap 4 exists to remove
**And** a **negative control** proves teeth: a payload carrying a planted phone/email is **rejected**,
and a payload carrying a legitimate numeric threshold (`{"threshold_percent":90,
"min_contributions":10}` — the real R8 shape) **publishes cleanly**. ⛔ Both directions, ⛔ or the
check is either vacuous or a blocker

### AC4 — AC1(c): a contact-harvesting honeypot lands, with its limits recorded IN THE CODE

**Given** `epics.md` L4657 + Trap 5 + D4's ruling
**When** the honeypot is extended
**Then** contact-harvesting-shaped bait paths join `HONEYPOT_PATHS`
(`apps/api/src/plugins/security-headers/index.ts:38-45`) — paths a scraper hunting a contact or PII
export would probe (e.g. `/staff-directory.csv`, `/contacts.json`, `/member-contacts.xlsx`),
**distinct** from the existing six CMS-scanner fingerprints
**And** they use the **same** `schema: { hide: true }`, GET-only, `registerHoneypot()` shape — ⛔ no
new handler, ⛔ no new audit type (`abuse.honeypot` is reused *here* deliberately; ⛔ contrast
`directory.abuse_suspected`, which was minted precisely so it would **not** corrupt this signal —
`abuse-rules.ts:124`)
**And** `security-headers.spec.ts` and `login-wall.spec.ts` pass **without an allowlist edit**,
because both derive from `HONEYPOT_PATHS` — ⚠ verify this by **running** them, and if either turns
red, the fix is the derivation, ⛔ never a hardcoded list
**And** ⛔ **the module doc records what a hit does and does NOT prove**: it is a **signal**, ⛔ not
an enforcement; the recorded `ip` is **caller-supplied** under `trustProxy: true` and these paths
are reached **directly** (⛔ nothing proxies them), so it is ⛔ **not evidence** and ⛔ must never be
described as "flagging scraping IPs"
**And** ⚠ the module doc's existing claim that honeypots are *"exempt from the forced-pagination …
guard by allowlist"* (L36) is corrected in passing — that guard never sees them, because
`hide: true` keeps them out of the OpenAPI surface it walks

### AC5 — The FR-93 protection-layering doctrine is written where it BINDS

**Given** `epics.md` L4658-4667 (AC2 + AC3 of the epic) and Trap 2
**When** the doctrine is documented
**Then** `packages/contracts/src/public-pages/README.md` — the canonical FR-74/FR-93 authority doc,
which already names this story at L172 — gains a section
`## FR-93 — obfuscation is defense-in-depth, ⛔ never primary (Story 11a.4)` stating, in that
document's established voice:
  1. the **four-step layering order**, verbatim from the epic: (1) `never_exposed` hidden by matrix;
     (2) `operator_restricted` requires RBAC + audit + rate limits; (3) `authenticated_member`
     requires auth + rate limits + audit; (4) `public` renders visibly, with obfuscation as
     defense-in-depth where applicable;
  2. the **wrong-order warning**: obfuscating a field on an authenticated surface while neglecting
     its matrix entry or RBAC enforcement is ⛔ **explicitly wrong** — protection comes from policy
     first, and an obfuscated-but-unclassified field is *less* protected, not more;
  3. that plain-text phone/email **IS permitted** on authenticated/operator surfaces for legitimate
     operator workflows, because RBAC has already gated the access and obfuscation would add nothing;
  4. **Trap 2, stated plainly**: ⛔ no contact field is classified at any tier on any surface today,
     so clauses (2)-(3) are **conditionals awaiting a first subject**, ⛔ not descriptions of a
     shipped surface;
  5. ⭐⛔ **THE LOAD-BEARING ONE — MEMBER CONTACT DATA AND THE TRUST'S OWN CONTACT CHANNEL ARE
     OPPOSITE CASES, AND THIS DOC IS WHERE THAT IS WRITTEN DOWN** (Trap 1). A **member's** phone/email
     is governed by the matrix and is ⛔ never public. The **trust's** helpline/email is
     **deliberately public so a person in need can reach the trust** — its governing property is
     ⭐ **REACHABILITY, bounded by accessibility**, ⛔ not concealment. ⇒ on that channel the three
     `epics.md` L4655 techniques are ⛔ **REJECTED, with their reasons named**: image rendering (⛔ not
     tappable / copyable / screen-readable — **NFR-A11y-1 WCAG 2.1 AA is a launch blocker for
     public-site primary nav**), JS-decoded display (⛔ fails without JS, on a surface that is Astro
     SSR *precisely* so it works without it), partial masking + helpdesk CTA (⛔ circular — the number
     *is* the helpdesk). ⚠ And indexing cuts the **other** way: a Contact page would be
     `search_indexing_policy: index` — ⭐ you *want* the helpline findable.
     ⇒ **The residual concern on that channel is CHANNEL INTEGRITY (harvest → spam → a degraded
     helpline), ⛔ NOT privacy** — addressed by the AC4 honeypot, rate limiting and provider-side
     filtering, ⛔ never by making the number unreadable to the people it exists for. ⛔ Do not
     collapse *"not a privacy problem"* into *"not a problem"*;
  6. **the status of the public Contact page**: it is **committed** (`ux-design-specification.md:243`
     — the public-website inventory) and ⛔ **unowned by any epic story**, alongside `About`; ⛔ no
     route, ⛔ no matrix surface, and ⚠ the gate's route-coverage leg is **blind to a missing page by
     construction**. The masking decision is deferred to **the story that builds that page**, and is
     ⛔ deferred on the merits (item 5), ⛔ not merely for want of a consumer;
  7. the real coverage on `/members` — `limits.search` + the caps + `directory-abuse-rules.yaml` —
     and ⛔ **never** Story 10.6;
  8. a plain resolution of FR-93's `[v1-S — moot per policy]` tag (**D5**), so a future reader ⛔
     does not misread *"moot"* as *"this story was cut"* — ⚠ and, per item 5, ⛔ does not misread the
     matrix's *"member contact is never public"* as meaning FR-93 has **no** subject at all
**And** ⛔ **no second, competing doc is created** — this repo's convention across 11a.1-11a.3 is to
extend the one canonical file per topic ([[feedback_no_premature_package]])

### AC6 — Governance and records

**Given** [[feedback_governance_commits_precede_implementation]]
**When** the work is committed
**Then** the `.decision-log.md` entry recording D1-D5 **as ruled by BigDev** commits **FIRST and
ALONE**, in a `governance:` commit touching ⛔ zero `packages/` or `apps/` files — the discipline
`2026-08-21-145` cl.5 recorded as *skipped* the last time it mattered on this epic
**And** its number is the next free one after `2026-08-21-148` — ⛔ read the head of the file at
implementation time, ⛔ do not hardcode
**And** `deferred-work.md` gains a `## Deferred / recorded from: Story 11a.4 …` section recording:
the AC1(a) masking-pattern deferral with a **concrete named trigger** (⛔ never a bare epic
reference — [[feedback_closure_language_precision]]); CR-D1-1.16b's disposition **in D2's exact
language** (*"Closed by [edit]"* / *"Re-scoped with a corrected trigger"* / *"Not addressed"* — ⛔
never collapsed); CR-D2-1.16b recorded as **closed by 11a.1's deletion of `loadSnapshots()`**, which
⛔ was never recorded; the Trap 4 runtime-scrub disposition per D3; and the Trap 5 IP-provenance
limit **appended to `deferred-work.md`'s existing topology item (~L205-213)**, ⛔ **NOT as a second
entry** — that item says in terms the two must be answered together
**And** `sprint-status.yaml`: `development_status[11a-4-…]` `backlog` → `ready-for-dev`; `epic-11a`
stays `in-progress` (2 stories remain: 11a.5, 11a.6); ⛔ **no other row moves**, and ⛔ Row 17 is
untouched

### AC7 — Revert-sanity: run it, ⛔ do not reason about it

**Given** this epic's standing discipline (11a.3 AC10)
**When** the work is complete
**Then** each new assertion is proven to have teeth by **reverting the change it guards and watching
it go red**, then restoring: (a) revert the AC2 regex tightening → the AC1 precision block fails;
(b) delete one new bait path → `security-headers.spec.ts`'s derived count assertion fails
**And** the actual command output is pasted into the Dev Agent Record — ⛔ a claim that a test
"would fail" is ⛔ not evidence ([[feedback_record_unattested_no_backfill]])

---

## 🚨 Decisions — ✅ **ALL FIVE RULED BY BIGDEV, 2026-08-22. ⛔ Nothing here is open.**

> ✅ **D1′ = (a)** · **D2 = (a)** · **D3 = (e)** · **D4 = (a)** · **D5 = (a)** — each **as
> recommended**. ⛔ The dev agent must **not** rule, re-open, or re-interpret these. If one looks
> wrong once the code is in front of you, **stop and raise it** — ⛔ never silently deviate.
> ⚠ Durability is Task 1's `governance:` commit, ⛔ not this file.

### D1 — ⚠ **RE-ASKED. The original question rested on a WITHDRAWN premise.**

> ⛔ **THE ORIGINAL D1 IS WITHDRAWN, ⛔ not re-scoped.** It asked *"given AC1(a) has no call site,
> what does this story build?"* and offered *"defer, because building for a hypothetical consumer is
> scope invention."* ⚠ **BigDev's correction (2026-08-22): the trust's contact phone/email are
> DELIBERATELY PUBLIC so that people in need may contact the trust.** That is ⛔ not a hypothetical
> consumer and ⛔ not member PII — it is **committed product** (`ux-design-specification.md:243`,
> `:297`, `:87`, `:209`) serving the **opposite** property from the one this epic's matrix governs.
> ⇒ the real question is ⛔ **not** *"is there a call site?"* but *"what may obfuscation do to a
> channel whose purpose is reachability?"* — and the honest answer changes what this story owes.
> ⭐ **The root cause was procedural:** the first pass never opened the UX spec, a **declared input**
> of this workflow. Recorded so the miss is visible, ⛔ not smoothed over
> ([[feedback_record_unattested_no_backfill]]).

**D1′ — What does 11a.4 owe the committed-but-unbuilt public Contact page? — ✅ RULED (a) (BigDev, 2026-08-22)**

- **(a) ✅⭐ RULED (BigDev, 2026-08-22) — ship the DOCTRINE and ROUTE the gap; ⛔ build no masking component.**
  AC1-AC2 (precision net + regex), AC3 (Trap 4 correction), AC4 (honeypot), AC5 (the doctrine —
  **now carrying the institutional-vs-member distinction and the explicit REJECTION of the three
  AC1(a) techniques for a reachability channel, with reasons**), plus Task 7 routing the ⛔ unowned
  Contact/About surfaces. ⚠ **The deferral's trigger CHANGES**: ⛔ no longer *"if a public contact
  surface is ever built"* but ⭐ **"the story that builds the committed public Contact page"** — a
  named, existing commitment ([[feedback_closure_language_precision]]). ⚠ It also cannot render a
  number today: ⛔ no provisioned helpline source exists (`HELPLINE_PENDING_TOKEN`).
- (b) Build the Contact page here to give AC1(a) its consumer. ⛔ Out of scope for a `[GOVERNANCE]`
  story, and it needs UX + bilingual copy + tone review + a11y validation **and** the Epic 10
  per-Pariwar helpline resolution that does not exist. ⛔ Building it half-formed to satisfy an AC is
  worse than routing it.
- (c) Build an `<ObfuscatedContact>` masking component for the future page. ⛔ **Now wrong on the
  MERITS, ⛔ not merely premature**: all three techniques degrade reachability or accessibility on a
  channel whose entire purpose is to be reached (Trap 1's table). ⛔ Do not build it later either
  without re-deciding the technique against a real audience.
- (d) Treat FR-93 as fully satisfied by the matrix (member contact is never public) and close AC1(a)
  as moot. ⚠ Tempting, and half-right — ⛔ but it silently drops the **channel-integrity** concern
  (harvest → spam → a degraded helpline grieving families depend on) that AC4's honeypot and future
  rate limiting legitimately address. ⛔ Do not collapse "not a privacy problem" into "not a problem".

> ⭐ **WHAT SURVIVES FROM THE WITHDRAWN D1, and why (a) still refuses the component:** the
> `2026-08-20-142` caution against a primitive with no call site is **still sound** — ⛔ but it is now
> the *second* reason, not the first. **The first is that obfuscating this channel is contrary to its
> purpose.** ⛔ Do not let a future reader think the component was deferred merely for want of a
> consumer; it is refused on the merits, and the deferral is about the *page*, not the masking.

### D2 — CR-D1-1.16b: close it here, or re-scope it with a corrected trigger? — ✅ **RULED (a) (BigDev, 2026-08-22)**

⚠ **The framing matters more than the outcome** — Trap 3 shows the recorded trigger names a deleted
function, so *"the trigger fired and was missed"* would be a **false** decay finding.

- **(a) ✅⭐ RULED (BigDev, 2026-08-22) — close it here, on evidence, and correct the record in the same breath.**
  The justification is ⛔ **not** a fired trigger; it is that the test corpus is **provably authored
  around the defect** (`scrape-test.spec.ts:146-147`, in writing), which is a stronger and *honest*
  reason. Record the disposition as **"Closed by [edit]"** and record separately that the original
  trigger text was **stale**, ⛔ not fired. Scope: the `phone` pattern only.
- (b) Close it and widen the `aadhaar` pattern too (the `987654321012` case). ⚠ Trades a real recall
  guarantee on a `never_exposed` field for a hypothetical precision gain. ⛔ Not recommended.
- (c) Re-scope with a corrected trigger (*"the first surface that scans live tenant HTML"*) and do
  not touch the regex. ⚠ Honest, but a **third** pass over the same item — and D3 may make that
  trigger unreachable by design.

### D3 — Trap 4: does anything RUN, or is the correction documentation only? — ✅ **RULED (e) (BigDev, 2026-08-22)**

> ✅⭐ **RULED (e). The recommendation had moved (a) → (e) on evidence; the ruling followed it.**
> (a) rested on *"clause payloads are governed content"*. That premise **survives** — the Story 2.4
> workflow is genuinely strong on **process** (non-author sign-off, content-bound by hash,
> audit-or-throw, append-only ledger). ⛔ **But it is far weaker on CONTENT than (a) credited**, and
> the §Q3 investigation is what established that: `ClausePayloadSchema` is `z.record(z.unknown())` —
> ⛔ zero validation — and **no automated check of any kind** stands between an authored payload and
> the public page. ⚠ Two committed artifacts say otherwise. ⇒ the backstop lands at the **WRITE**
> path, ⛔ not the render.
>
> ⛔ **WHAT (e) DOES NOT SETTLE — ⛔ do not let the ruling be read wider than it is.** It adds a
> **machine backstop**; it ⛔ does **not** answer §Q3(d)'s authority question (is ONE non-author
> reviewer sufficient to publish a clause governing claim eligibility, and who answers for a wrong
> one). ⛔ That stays **open and routed to the Panel**, and Task 1 must record it as such — ⛔ a regex
> is not an answer to a governance question.

- **(e) ✅⭐ RULED (BigDev, 2026-08-22; supersedes the earlier (a) recommendation) — correct the two claims (AC3) AND add a PUBLISH-TIME
  payload scan that FAILS THE PUBLISH LOUDLY.** Run `detectNakedPii` over the canonical JSON of the
  payload on the `niyamavali.amend` **publish** path (`apps/api/src/modules/rules/index.ts`), before
  the audit line is written, rejecting with a typed 4xx that names the matched pattern **type** —
  ⛔ never the matched **value** (echoing it back would write the leaked PII into the error body and
  the request log).
  **Why here and not the render:** it fails **loudly at authoring time**, when a human with
  `niyamavali.amend` is present and can fix it, instead of silently mutating a **rulebook** on its
  way to a reader; it needs ⛔ no new route, ⛔ no new permission key, ⛔ no schema change; and the
  publish path **already** has the fail-closed shape to hang it on (audit-or-throw: a throw rolls the
  scope tx back ⇒ ⛔ no published clause). It also makes AC3's corrected sentences **true in a
  stronger sense** — the claim becomes *"payload content is scanned at publish"*, which is a
  protection that actually runs, rather than a boundary statement about one that does not.
  ⚠ **It inherits AC2's precision.** A false positive here ⛔ blocks a legitimate rule amendment
  (a numeric threshold that reads as a 10-digit run), so ⛔ **(e) may not be built before AC1+AC2
  land** — the precision fix is its precondition, not its neighbour. Sequencing is in Task 4a.
  ⛔ **And it is a BACKSTOP, ⛔ not the primary control.** The primary control stays the non-author
  human sign-off. Say so where it lands, or (e) becomes the next over-claim.
- (a) ⛔ **NOT RULED IN.** Correct the two claims (AC3) and ⛔ build nothing that runs. ⚠ It remains a
  **defensible** position and is recorded as such, ⛔ not as a straw man — it leaves
  the *process* controls intact and adds no false-positive surface to a governance write path. ⛔ But
  §Q3(d) is the cost: the only thing between an authored payload and the open internet stays **one
  human reading a draft**, with the propagation floor (`/niyamavali` is `edge_cacheable`,
  `s-maxage=300`) applying to any correction.
- (b) Add a render-time `detectNakedPii` scrub to the payload block that **redacts** a matching
  value. ⛔ Silent rulebook mutation; and per AC2 the detector still false-positives on legitimate
  numeric payload values.
- (c) Add the scrub in **log-only** mode (`apps/public` emits nothing today — Trap in 11a.3's table:
  `apps/public` cannot write an audit line) ⇒ ⛔ structurally unavailable without a second API route,
  which the scope boundary forbids.
- (d) Extend the fixture corpus with a payload carrying planted PII, proving the leg *would* catch it.
  ⚠ **Compatible with (a) AND (e)** — ⛔ but it must be described as proving the **leg**, never the
  **live surface**, or it becomes the very overstatement this trap is about.

> ⚠ **RAISED BY §Q3, ⛔ NOT RULED HERE AND ⛔ NOT IN THIS STORY'S SCOPE.** Two findings surfaced by
> the Q3 investigation are ⛔ **out of scope** and are recorded for routing, ⛔ not for building:
> (i) `provisional: true` and `policy_review_required: true` sit in every seeded R7/R8 payload as
> **inert data** — ⛔ nothing reads either flag (one comment, in
> `niyamavali-engine/src/retirement-coverage.ts:67`); (ii) whether **one** non-author reviewer is
> sufficient authority to publish a clause that governs **claim eligibility**, and who answers for a
> wrong one, is ⛔ **not ruled anywhere**. ⛔ Both are Panel questions, ⛔ not dev-agent work. Route
> them; ⛔ do not let this story absorb them.

### D4 — The contact-honeypot's response body, and where it lives — ✅ **RULED (a) (BigDev, 2026-08-22)**

- **(a) ✅⭐ RULED (BigDev, 2026-08-22) — bait paths on `apps/api` reusing `registerHoneypot`, response stays the bare
  `{status: 'ok'}`.** Consistency with the existing six; minimum surface; the value of a honeypot is
  the audit signal, ⛔ not the payload; and the existing doctrine (*"does not tip off the scanner"*)
  argues for a boring response. ⚠ Reachability is contingent on the **unresolved topology question**
  — join `deferred-work.md`'s existing item, ⛔ do not open a second one (Trap 5).
- (b) Same, but return a plausible fake contact payload, matching AC1(c)'s literal *"serve fake
  contact data"*. ⚠ More bait-realistic; more code to maintain for no added signal; and a fake
  phone/email in a response body would ⛔ trip the project's own naked-PII discipline if it ever
  reached a scanned render.
- (c) Put the bait path on `apps/public` (definitely terminates public traffic). ⛔ `apps/public`
  **cannot write an audit line** (verified at 11a.3: `writeAuditEntry` needs the BYPASSRLS service
  pool), so signalling would need a second `apps/api` route — which `public-pages/routes.ts:42`
  forbids.
- (d) Don't build AC1(c) until the topology question is answered. ⚠ Defensible; ⛔ but it leaves a
  clause of the epic AC with no disposition at all, and the mechanism is genuinely zero-cost to add.

### D5 — Does FR-93's `[v1-S — moot per policy]` tag mean this story is cut? — ✅ **RULED (a) (BigDev, 2026-08-22)**

- **(a) ✅⭐ RULED (BigDev, 2026-08-22) — no.** The PRD's own gloss (`prd.md:1177`: *"Per FR-74 policy these are never
  public; obfuscation patterns retained as defense-in-depth for any leak"*) is the **source** of this
  story's own defense-in-depth invariant — ⛔ not a contradiction and ⛔ not a scope-out. `[v1-S]`
  marks Should-have **cadence priority** (a nameable cut candidate under schedule pressure), ⛔ not
  *"skip"*. Document the resolution in AC5(7) so a future reader ⛔ cannot misread *"moot"* as
  license to skip.
- (b) Treat the story as documentation-only on the strength of the tag. ⚠ Equivalent to D1(c), and
  it would leave the FR-93 engine's one evidenced defect open.

---

## Tasks / Subtasks

### Coverage matrix — every AC → its task(s)

| AC | Task(s) |
|---|---|
| AC1 — precision regression net | Task 2 |
| AC2 — regex tightening, recall preserved | Task 3 |
| AC3 — Trap 4 truth-correction | Task 4 |
| AC3a — ✅ **ACTIVE**: publish-time payload scan | Task 4a (⛔ sequenced after Tasks 2+3) |
| AC4 — contact honeypot + recorded limits | Task 5 |
| AC5 — FR-93 doctrine in the README | Task 6 |
| AC6 — governance + records | Task 1, Task 7 |
| AC7 — revert-sanity | Task 8 |

### Task 0 — Branch, baseline, rulings (AC: all)

- [x] `git fetch origin`, then branch from `main`. ⚠ Confirm `HEAD == origin/main`; the recorded
      baseline is `075827b`. If `main` has moved, re-check the §What is actually true today table
      before trusting it — ⛔ it is a snapshot, not a standing fact.
- [x] ⛔ **Do not check out or merge `story/11a.4-phone-email-obfuscation`.** It is a superseded
      draft (see the top banner). Delete it once this story lands.
- [x] Read Decisions `2026-08-20-140`, `-142`, `-143` and `2026-08-21-144` … `-148` before touching
      code. D1-D5 extend their reasoning (a primitive with no real call site is not a delivered
      protection; a claimed protection that does not run is the vacuous-green defect; a
      cross-reference error is named, not absorbed).
- [x] ✅ **D1′-D5 ARE RULED** (a / a / e / a / a — BigDev, 2026-08-22). ⛔ Do not re-open or
      re-interpret one. If a ruling looks wrong once the code is in front of you, ⛔ **stop and
      raise it**, ⛔ never silently deviate.

### Task 1 — `governance:` — the decision-log entry (AC: 6) — ⭐ **COMMITS FIRST, ALONE**

- [x] Write the `.decision-log.md` entry recording D1′-D5 **as ruled by BigDev on 2026-08-22**
      (**D1′=(a) · D2=(a) · D3=(e) · D4=(a) · D5=(a)**, each as recommended), in the established
      house form (clause-numbered, each clause naming what it rules and what it explicitly does
      **not**).
- [x] Number it the next free entry after `2026-08-21-148` — ⛔ read the head of the file; ⛔ do not
      hardcode (it may drift if another story lands first).
- [x] The entry must state, in terms: ⛔ Row 17 is untouched; ⛔ no matrix tier moves; ⛔ no
      permission key, migration or catalog bump; and that CR-D1-1.16b's original trigger was
      **stale, ⛔ not fired** (Trap 3).
- [x] ⭐ **The entry must record the D1 WITHDRAWAL as its own clause, ⛔ not as a silent re-scope.**
      State: the original D1 rested on the premise that AC1(a) had no consumer; ⛔ that premise is
      **withdrawn**, because the trust's contact details are **deliberately public** and the Contact
      page is **committed product** (`ux-design-specification.md:243`); ⇒ the three masking
      techniques are refused **on the merits** for a reachability channel, ⛔ not deferred for want of
      a call site. ⚠ Record the **root cause** plainly — the authoring pass did not open the UX spec,
      a declared workflow input ([[feedback_record_unattested_no_backfill]]). ⛔ Do not write the
      entry as though D1′ were the question all along.
- [x] ⭐ **The entry must carry the unowned-surface finding as an OPEN clause routed to John** — the
      Contact and About pages are committed in the UX spec's public-website inventory with ⛔ no
      owning story, and the gate is ⛔ structurally blind to it. ⛔ Recorded as a **coverage gap for
      correct-course**, ⛔ not as work this story schedules or closes.
- [x] ⭐ **The entry must carry the §Q3 findings as their own clauses, ⛔ not as background to D3.**
      Two are **routed to the Panel, ⛔ not ruled by this entry**: (i) `provisional` /
      `policy_review_required` are **inert data** — ⛔ nothing reads either flag; (ii) whether **one**
      non-author reviewer is sufficient authority to publish a clause governing **claim eligibility**,
      and who answers for a wrong one, is ⛔ **not ruled anywhere**. ⛔ Record them as OPEN with the
      Panel named; ⛔ do not let a D3 ruling read as though it settled either
      ([[feedback_closure_language_precision]]).
- [x] ⭐ **D3=(e) is ruled, so the entry MUST state** that the publish-time scan is a ⛔ **BACKSTOP**
      and that the **non-author sign-off remains the primary control** — ⛔ so the decision-log cannot
      later be read as having replaced a human control with a regex.
- [x] Commit **alone**, ⛔ before any code, ⛔ zero `packages/` or `apps/` files
      ([[feedback_governance_commits_precede_implementation]]).

### Task 2 — The precision regression net (AC: 1) — `packages/contracts/tests/public-pages.test.ts`

- [x] Add `describe('naked-PII detector — PRECISION (FR-93 / Story 11a.4)', …)` beside the existing
      recall block at `:195`. ⛔ Do not modify the recall block.
- [x] One independently-planted case per shape, each asserting **no match of that type**:
      `<a href="/blog/9876543210">`, `<span data-id="9123456789">`, and the `0`-prefix landline
      shape. ⛔ One fixture must never carry several expectations.
- [x] ⭐ **Run it now, before Task 3.** It must be **RED**. Paste the output into the Dev Agent
      Record — the red run is the evidence that the net has teeth; ⛔ a net written after the fix is
      not a regression test.

### Task 3 — Tighten the phone pattern (AC: 2) — `packages/contracts/src/public-pages/scrape.ts`

- [x] Extend the `phone` pattern's negative lookbehind (`:267`) to exclude `/`, `="` and `'`
      contexts. ⛔ Pure regex change — ⛔ no new dependency, ⛔ no HTML parsing, ⛔ no change to
      `email`, and ⛔ **no change to `aadhaar`** — D2 = (a) scopes this to the `phone` pattern ONLY.
- [x] Update the `piiPatterns()` doc comment (`:253-262`) to describe what the pattern now excludes
      and why — the file's established "conservative pattern" voice.
- [x] Run **all** of: `pnpm --filter @twt/contracts test`, then
      `pnpm --filter @twt/public test`. ⛔ Every existing recall assertion must pass **unmodified**:
      `public-pages.test.ts:195-219`, `scrape-test.spec.ts:209`, `:643`.
- [x] Update `scrape-test.spec.ts:146-147`'s "Deliberately NO accidental 10-digit runs" comment to
      state what is true after the change. ⛔ Do **not** change the fixture payload values in the
      same edit — a corpus change and an engine change landing together makes it impossible to tell
      which one moved the result.

### Task 4 — Correct the two over-claims (AC: 3) — **Trap 4**

- [x] `packages/contracts/public-pages/public-vs-private-matrix.yaml`, the
      `clause_payload_display_fields` description (~L134-141): state that the naked-PII leg runs in
      `scrape-test.spec.ts` over **fixture-built** render HTML on every PR, and ⛔ does **not** scan
      what a Pariwar actually publishes.
- [x] `apps/public/src/lib/niyamavali-render.ts` (~L216-228): the same correction, in the module
      doc's voice.
- [x] ⛔ **The renderer-opaqueness half STAYS** in both (freeze row 14). ⛔ Correct one half only —
      the 10.30 AC9 pattern.
- [x] ⚠ **D3(d) was NOT ruled in** — (e) was. ⛔ Do not add the planted-payload fixture to
      `scrape-test.spec.ts` on your own judgement; AC3a's publish-path negative controls are where
      the planted PII belongs now. ⛔ Adding both would assert the same thing twice, in the weaker
      place.
- [x] ⭐ **Prove the contract is untouched, ⛔ do not assert it:** `git diff` on the matrix must show
      ⛔ zero changes to any `tier:` / `pii_tier:` / `escalations:` / `escalation_count` line, and
      `public-pages.test.ts:342-440` must run **unmodified** and green. Paste both.
- [x] ✅ **D3=(e) is ruled ⇒ write the two corrected sentences in their AC3a form** (a protection
      that RUNS at publish), ⛔ not the AC3 boundary form. ⛔ One edit, ⛔ never AC3's wording with
      AC3a bolted on afterwards.

### Task 4a — ✅ **ACTIVE (D3(e) RULED)** — the publish-time payload scan (AC: 3a) — `apps/api/src/modules/rules/index.ts`

> ✅ **D3 = (e), so this task SHIPS.** ⛔ It is ⛔ not optional.
> ⛔ **AND IT IS SEQUENCED, ⛔ NOT PARALLEL: Tasks 2 + 3 must be GREEN FIRST.** Landing this before
> the precision fix means a legitimate numeric threshold ⛔ blocks a rule amendment — a governance
> write path is ⛔ the worst possible place to discover a false positive.

- [x] Read the publish handler end-to-end **before** editing — the audit-or-throw sequencing
      (`index.ts:14-20`) is load-bearing: the audit line is written FIRST with a pre-generated
      `clause_version_id`, and a throw rolls the scope tx back. ⛔ The scan must run **before** the
      audit write, so a rejected publish leaves ⛔ no audit line and ⛔ no partial state.
- [x] Scan `detectNakedPii(canonicalJsonStringify(payload))` — ⛔ the **existing** canonicaliser
      (`packages/domain/src/canonical-json.ts`), the one the content hash and audit chain already
      use. ⛔ Do not introduce a second serialisation; two canonical forms of the same payload is a
      drift bug waiting to happen.
- [x] Reject with a **typed 4xx at the route precondition**, naming the matched pattern **type only**.
      ⛔ **NEVER the matched value** — it would write the leaked PII into the response body, the
      request log and the client. ⛔ Assert its absence by test.
- [x] ⛔ **No 500 is a permitted pass.** If the rejection surfaces as an unregistered domain error it
      becomes a 500 — the Story 10.30 finding. Pin the status at the contract/route boundary; ⛔ no
      test may assert a 500.
- [x] Document it **in the handler** as a ⛔ **BACKSTOP** — ⛔ the primary control is the **non-author
      human sign-off** (§Q3(c)). ⛔ Omitting that sentence recreates Trap 4 one layer down.
- [x] **Negative controls, both directions:** a planted phone/email payload is **REJECTED**; the real
      R8 shape (`{"threshold_percent":90,"min_contributions":10}`) **PUBLISHES CLEANLY**. ⛔ Without
      the second, the check is a blocker rather than a backstop.
- [x] ⭐ **Prove the workflow is untouched:** the existing Story 2.4 route tests must run
      **unmodified** and green. ⛔ Zero change to the draft state machine, the sign-off gate, the
      content-hash binding, the append-only ledger, or any permission key. Paste the run.

### Task 5 — The contact-harvesting honeypot (AC: 4) — `apps/api/src/plugins/security-headers/index.ts`

- [x] Add the contact-shaped bait paths to `HONEYPOT_PATHS` (`:38-45`), keeping the same
      `schema: { hide: true }` + GET-only + `registerHoneypot()` shape. ⛔ No new handler, ⛔ no new
      audit type.
- [x] Extend the module doc (`:18-23`) with the **two** limits, stated plainly:
      (1) a hit is a **SIGNAL**, ⛔ not an enforcement — nothing blocks;
      (2) the recorded `ip` is **caller-supplied** (`trustProxy: true` reads the leftmost
      `X-Forwarded-For`, and ⛔ nothing proxies these paths) ⇒ ⛔ **not evidence**, and ⛔ never
      describe this as "flagging scraping IPs". Cross-reference `2026-08-21-145` cl.2 as the same
      defect class, and state that ⛔ `trustProxy` is **not** re-tuned (`-143` cl.9).
- [x] Correct `:36`'s "exempt … from the forced-pagination guard by allowlist" — that guard walks
      the OpenAPI surface, which `hide: true` keeps these out of. ⛔ It is not an allowlist there.
- [x] Run `apps/api`'s `security-headers.spec.ts` and `login-wall.spec.ts`. ⛔ Both derive from
      `HONEYPOT_PATHS`, so ⛔ no allowlist edit should be needed — if either turns red, fix the
      **derivation**, ⛔ never hardcode a list.
- [x] ✅ **D4 = (a): the body stays the bare `{status: 'ok'}` for ALL paths, old and new.** ⛔ No
      fake contact payload — (b) was ⛔ not ruled in.

### Task 6 — The FR-93 doctrine section (AC: 5) — `packages/contracts/src/public-pages/README.md`

- [x] Add `## FR-93 — obfuscation is defense-in-depth, ⛔ never primary (Story 11a.4)` carrying all
      **seven** items enumerated in AC5, in the document's established voice.
- [x] Place it after `## The 4 tiers + the leak rules` (:159) and before
      `## Mechanism` (:177) — the layering doctrine belongs beside the tier model it layers on.
- [x] ⛔ Do not create a second doc; ⛔ do not restructure existing sections; ⛔ do not soften
      `## ⚠ What this gate does NOT prove` (:39) — this story **adds to** that posture, it does not
      dilute it.

### Task 7 — Records (AC: 6)

- [x] `deferred-work.md` — a new `## Deferred / recorded from: Story 11a.4 — phone/email
      obfuscation defense-in-depth (2026-08-…)` section carrying:
  - [x] **AC1(a) masking pattern — deferred ON THE MERITS, with a NAMED, EXISTING trigger.**
        ⭐ **Trigger: the story that builds the committed public Contact page** — ⛔ not *"if a contact
        surface is ever built"* (the withdrawn D1's wording, which implied it was hypothetical).
        ⛔ **Record WHY, not just that**: on the trust's own contact channel the governing property is
        **reachability bounded by accessibility**, so all three `epics.md` L4655 techniques are
        rejected with reasons (Trap 1's table) — ⛔ a future reader must not "un-defer" this by
        building the component the moment a page appears. Record where a component *would* live if
        one is ever justified (`apps/public/src/components/`, beside `MatrixField.astro`), and that
        the technique must be **re-decided against a real audience**, ⛔ never inherited from here.
  - [x] ⭐ **NEW — ROUTE THE UNOWNED PUBLIC SURFACES (SD-1 shaped).** The **Contact** page (with the
        Madad card) and **About** are in the UX spec's committed public-website inventory
        (`ux-design-specification.md:243`) and ⛔ **no epic story owns either** — ⛔ no route, ⛔ no
        matrix surface. ⚠ Record that the PII-scrape gate's route-coverage leg is **structurally
        blind** to a page that should exist and does not, so ⛔ no green check will ever surface this.
        ⛔ Record both surfaces, ⛔ do not narrow to Contact. **Owner: John** (authoring), as a
        correct-course/epic question — ⛔ not this story's to schedule.
  - [x] ⚠ **Dependency, named not assumed:** ⛔ no provisioned helpline-number source exists
        (`note-template.ts:122-127` — no `.env.example` entry, no deploy config, no validation; the
        PDF prints `HELPLINE_PENDING_TOKEN` rather than fabricate one). ⇒ the Contact page cannot
        render a real number until **Epic 10 per-Pariwar helpline resolution** lands. ⛔ Record it
        against the Contact-page routing above, ⛔ not as a separate orphan item.
  - [x] **CR-D1-1.16b** — disposition in D2's **exact** language. ⛔ Never collapse *"Closed by
        [edit]"* / *"Re-scoped"* / *"Not addressed"* ([[feedback_closure_language_precision]]).
  - [x] **CR-D2-1.16b** — record as **closed by [edit] at Story 11a.1** (`loadSnapshots()` deleted;
        `check-pii-scrape.ts` now forbids re-adding it). ⚠ It was closed and ⛔ never recorded —
        record it now rather than leaving a closed item reading open.
  - [x] **Trap 4 residual risk** per D3, with its named trigger.
  - [x] **Trap 5 IP provenance** — ⛔ **appended to the existing topology item (~L205-213)**, ⛔ NOT
        a new entry. That item states in terms that the two questions must be answered together.
- [x] `sprint-status.yaml` — flip `development_status[11a-4-phone-email-obfuscation-defense-in-depth-public-surfaces-only]`
      `backlog` → `ready-for-dev` (done by this authoring session), and add the `last_updated`
      ledger comment per [[project_sprint_status_ledger]]. ⛔ `epic-11a` stays `in-progress`;
      ⛔ no other row moves; ⛔ Row 17 untouched.
- [x] Story file Status → `ready-for-dev` (done by this session).

### Task 8 — Revert-sanity (AC: 7) — ⭐ **run it, ⛔ do not reason about it**

- [x] Revert the Task 3 regex change → the Task 2 precision block must go **RED**. Restore; green.
- [x] Delete one new bait path → `security-headers.spec.ts`'s derived count assertion must go
      **RED**. Restore; green.
- [x] ✅ **D3(e) is ruled ⇒ REQUIRED:** remove the Task 4a scan → the planted-PII publish test must go **RED**;
      restore. ⭐ **And run the OTHER direction too** — the legitimate-threshold publish must be
      **GREEN with the scan in place**. ⛔ A one-directional revert here proves the check fires, ⛔ not
      that it lets a real amendment through, and the second is the failure that would actually hurt.
- [x] Paste **actual command output** for both into the Dev Agent Record
      ([[feedback_record_unattested_no_backfill]]).

### Task 9 — Full verification before `review`

- [x] `pnpm --filter @twt/contracts test` · `pnpm --filter @twt/public test` ·
      `pnpm --filter @twt/api test` — record before/after counts, ⛔ not "all green".
- [x] `pnpm pii:check` (the gate — it must stay green; this story touches its matrix input).
- [x] `pnpm typecheck` + `pnpm lint` on `@twt/contracts`, `@twt/public`, `@twt/api`.
- [x] ⚠ `ci:local` runs the full suite; per [[project_ci_local_concurrency_oversubscription]] use
      `--concurrency=4`, and per [[project_ci_local_double_run_pollution]] pass `DATABASE_URL`
      **per-invocation**, ⛔ never exported globally.
- [x] ⚠ `git push` triggers full `ci:local` via a pre-push hook — that is the "hang", ⛔ not a
      failure ([[project_friction_budget_baseline_ratchet]]).

---

## Dev Notes

### Files this story touches, and what must be preserved

| File | Current state | This story changes | ⛔ Preserve |
|---|---|---|---|
| `packages/contracts/src/public-pages/scrape.ts` | `detectNakedPii` live; 3 conservative patterns; comments already cite this story (`:17`, `:253`, `:274`) | Tighten the `phone` lookbehind (Task 3) | The `email` + `aadhaar` patterns **untouched** (D2=(a): `phone` only); the fresh-`RegExp`-per-scan discipline; the priority order (email first) |
| `packages/contracts/tests/public-pages.test.ts` | 6 recall cases (`:195-219`) + the committed-matrix invariants (`:342-440`) | **Add** a precision block (Task 2) | Every existing block, verbatim — the matrix invariants must run **unmodified** to prove Task 4 changed nothing structural |
| `packages/contracts/public-pages/public-vs-private-matrix.yaml` | 8 surfaces, 23 fields, 1 attested escalation | **Description text only** on `clause_payload_display_fields` (Task 4) | ⛔ Every `tier:`, `pii_tier:`, `escalations:`, `escalation_count` line. ⛔ The `tier1_public_exception` block. A `git diff` proving this is an AC. |
| `apps/public/src/lib/niyamavali-render.ts` | Renders clauses; doc claims the PII leg protects payload contents (`:216-228`) | Correct the reach claim (Task 4) | `renderValue`'s opaqueness and every field-id mapping; the freeze-row-14 statement |
| `apps/public/tests/integration/public-pages/scrape-test.spec.ts` | 5 surfaces, both legs armed; FR-93 control at `:643`; corpus authored around CR-D1-1.16b (`:146-147`) | Update the stale caveat comment (Task 3); optionally a planted-payload fixture (D3(d)) | ⛔ Every `describe` block and assertion. ⛔ The `:643` FR-93 control. ⛔ The no-empty-matrix-fallback guard (`:104-116`). This story **adds**; it ⛔ does not restructure. |
| `apps/api/src/modules/rules/index.ts` | ✅ **IN SCOPE (D3(e) ruled)** — the Story 2.4 publish path: 4-state draft machine, non-author sign-off, content-hash binding, audit-or-throw (`:14-20`) | **One added precondition check** before the audit write (Task 4a) | ⛔ The draft state machine, the sign-off gate, the content-hash binding, the audit-or-throw ordering, the append-only ledger, every permission key. The existing 2.4 route tests must run **unmodified** — that is what proves it. |
| `apps/api/src/plugins/security-headers/index.ts` | 6 CMS-scanner bait paths; shared handler → `abuse.honeypot`; bare `{status:'ok'}` | Add contact-shaped paths + record the two limits (Task 5) | The existing 6 paths; the `hide: true` + GET-only shape; the audit-emit call shape; the `X-Robots-Tag` hook and its onRequest-not-onSend rationale |
| `packages/contracts/src/public-pages/README.md` | Canonical FR-74 authority doc; names this story at `:172` | **Add** the FR-93 section (Task 6) | Every existing section, especially `## ⚠ What this gate does NOT prove` |
| `.decision-log.md` | Newest-first; head is `2026-08-21-148` | Add the next entry (Task 1) | Every prior entry — superseded, ⛔ never reinterpreted |
| `_bmad-output/implementation-artifacts/deferred-work.md` | Per-story sections; established closure-language discipline | Add a 11a.4 section; **append** to the existing topology item | All prior sections. ⛔ The topology item stays **one** item. |

### Patterns to reuse — ⛔ do not reinvent

- **The pure-core / impure-entry split.** `scrape.ts` (pure) vs `check-pii-scrape.ts` (impure) —
  mirrored again at `contracts/public-pages/abuse-rules.ts` vs
  `api/modules/public-pages/abuse-rules.ts`. A precision test needs no render ⇒ it belongs in the
  **pure** suite (Task 2).
- **The derived-list discipline.** `login-wall.spec.ts:120` and `security-headers.spec.ts:72` both
  derive from `HONEYPOT_PATHS`. ⛔ Never introduce a hand-maintained parallel list — that is exactly
  the drift `scrape-test.spec.ts`'s header forbids.
- **The independently-planted control.** `scrape-test.spec.ts:654-740` — CONTROL 1-4, each with its
  own fixture. ⛔ One fixture must never trip several checks.
- **The one-half correction.** Story 10.30 AC9: two comments became false in **one half only**; that
  half was corrected and the other left standing. Task 4 is the same shape.
- **The "what this does NOT prove" posture.** `directory-abuse-rules.yaml`'s seven-note header and
  `README.md:39`. Task 5's and Task 6's new prose belong in that voice — ⛔ a surface that overstates
  its reach is worse than one that admits its gaps, because the overstatement is what stops anyone
  closing them.

### Project Structure Notes

- ⛔ No new module, route, package, migration, permission key or dependency. Every change extends an
  existing file at its existing location — consistent with the `[GOVERNANCE]` label.
- The honeypot plugin's home is a **deliberate, recorded source-tree variance** (`index.ts:3-8`,
  same class as `packages/edge` under ADR-0010). ⛔ Do not "fix" its location.
- `apps/public/src/components/` (beside `MatrixField.astro`, `AuthenticatedFragment.astro`) is where
  a masking component *would* live **if one is ever justified** — recorded in Task 7 so a future
  story does ⛔ not have to re-derive the location. ⚠ **⛔ Recording the location is ⛔ NOT an
  endorsement of building it**: on the trust's own contact channel all three `epics.md` L4655
  techniques are **refused on the merits** (Trap 1), and any future proposal must ⛔ re-decide the
  technique against a real audience rather than inherit one from here.
- ⭐ The committed-but-unowned public **Contact** page would live at `apps/public/src/pages/contact.astro`
  (and **About** at `about.astro`), each needing its own matrix surface entry — recorded so the
  story that finally owns them ⛔ does not re-derive it, and ⛔ does not ship a page with no matrix
  row (which the gate **would** catch, in that direction).

### References

- `_bmad-output/planning-artifacts/epics.md` §Story 11a.4 (L4644-4667) — the source ACs, unmodified;
  §Story 11a.3 render-scope table (L4592-4593) — the **prose** table Trap 2 corrects the citation of
- `_bmad-output/planning-artifacts/prds/prd-TWT-2026-05-22/prd.md:1175-1177` — FR-93 + the
  *"moot per policy"* gloss resolved at D5; `:1170` — FR-92 (honeypot family)
- `packages/contracts/src/public-pages/scrape.ts:253-282` — `piiPatterns` / `detectNakedPii`, the
  engine this story hardens and ⛔ does not rebuild
- `packages/contracts/tests/public-pages.test.ts:195-219` — the existing **recall** suite; `:342-440`
  — the committed-matrix invariants that must run unmodified
- `packages/contracts/scripts/check-pii-scrape.ts:33-38` — ⛔ `loadSnapshots()` deleted; *"do not
  re-add a snapshot loader here"* (Trap 3)
- `packages/contracts/public-pages/public-vs-private-matrix.yaml:134-141` — over-claim site #1
  (Trap 4); `:290-400` — the `member-directory` surface, the ruled Tier-1 exception, the escalation
  ledger (all ⛔ untouched)
- `apps/public/src/lib/niyamavali-render.ts:216-228` — over-claim site #2 (Trap 4); `:114-116` — the
  *"No PII fields exist in a rule payload"* assumption stated as fact (§Q3(d))

**§Q3 evidence sources — the substrate the governance answers were read out of:**

- `packages/domain/seed/niyamavali-v1-clauses.sql` — the real R7/R8 payloads (§Q3(a)); `:14-16` —
  legal-review copy lands via Story 0.13 and ⛔ does **not** gate (§Q3(c))
- `packages/domain/src/schema/clause_versions.ts:6-9` (freeze row 14 — stored/diffed, ⛔ never
  interpreted), `:69-171` (versioning + lineage columns) — §Q3(a)
- `packages/contracts/src/rules/clause.ts:50` — `ClausePayloadSchema = z.record(z.unknown())`, the
  ⛔ zero-validation finding (§Q3(a), §Q3(d))
- `packages/domain/src/rbac/roles.ts:370-371`, `:409` — who holds `niyamavali.amend` / `.review`
  (§Q3(b)); `rbac/permissions.ts:707-708` — the key declarations
- `packages/domain/src/niyamavali/drafts.ts:6-21` — the four-state draft machine + the content-hash
  binding (§Q3(c))
- `packages/domain/src/tone-review/gate.ts:12-19` — the three fail-closed sign-off invariants,
  including `reviewedBy !== authoredBy` (§Q3(c))
- `apps/api/src/modules/rules/index.ts:11-12` (per-route key split), `:14-20` (audit-or-throw
  sequencing) — §Q3(b), §Q3(c); the file Task 4a edits under D3(e)
- `packages/domain/src/schema/niyamavali_amendments.ts:1-12` (append-only ledger), `:40-53`
  (mandatory `affected_member_scope`) — §Q3(c)
- `scripts/microcopy/check.ts:8-21` — the gate scans **committed source globs**, ⛔ never DB rows
  (§Q3(d))
- `packages/contracts/public-pages/public-vs-private-matrix.yaml:115` — `/niyamavali` is
  `edge_cacheable, s-maxage=300` ⇒ the correction propagation floor (§Q3(d))
- `packages/niyamavali-engine/src/retirement-coverage.ts:67` — the ONLY **code-level read** of
  `policy_review_required` (a cross-referencing comment also exists at
  `packages/validity-service/src/producer.ts:58`, discussing the same open `[[CR-4.5-D2]]` question,
  ⛔ **not** a second access of the flag as data — verified by grep: zero `.provisional` /
  `.policy_review_required` property reads anywhere in the repo); ⇒ `provisional` /
  `policy_review_required` are **inert data** (routed to the Panel, ⛔ not built here)
- `apps/public/tests/integration/public-pages/scrape-test.spec.ts:1-30` (fixture-built, no DB),
  `:146-147` (the corpus authored around CR-D1-1.16b — the evidence D2(a) rests on), `:643` (the
  shipped FR-93 control)
- `apps/public/src/layouts/PublicShell.astro:147-149` + `apps/public/src/pages/` — the shipped-tree
  half of Trap 1 (⛔ **the fact only** — ⛔ not the withdrawn inference drawn from it)
- ⭐ `_bmad-output/planning-artifacts/ux-design-specification.md:243` — the **committed public-website
  inventory**, naming **About** and **Contact (with Madad card)**; `:297` (*"Madad on the Contact page
  is the front door, not a fallback"*); `:87` (the card sits *"above existing contact content"*);
  `:209` (Contact in the bottom bar) — **the evidence that withdrew D1's premise**, and the input this
  story's first pass failed to open
- `apps/api/src/modules/member-pool/note-template.ts:122-127` — ⛔ no provisioned helpline source
  exists; `HELPLINE_PENDING_TOKEN` rather than a fabricated number (the Contact-page dependency)
- `apps/mobile/components/common/CallHelplineCTA.tsx:20-27` — the member-app CTA and its placeholder
  `EXPO_PUBLIC_HELPLINE_TEL` fallback (⛔ authenticated surface, out of this story's scope)
- `apps/api/src/plugins/security-headers/index.ts` — `HONEYPOT_PATHS`, `honeypotHandler`,
  `registerHoneypot`; `apps/api/src/server.ts:90` (`trustProxy: true`) — Trap 5's evidence
- `apps/api/tests/integration/security-headers.spec.ts:68-82` + `login-wall.spec.ts:80-120` — the
  derived consumers that need ⛔ no edit
- `apps/api/src/modules/public-pages/routes.ts:12-41` — the five controls, and the ⛔ NO SECOND ROUTE
  fence
- `packages/contracts/public-pages/directory-abuse-rules.yaml` — notes 1-7 (note **7** is the Story
  10.6 correction; notes 2-3 are the edge-cache and IP-provenance limits this story's Trap 5 extends)
- `packages/contracts/src/public-pages/README.md:39` (`what this gate does NOT prove`), `:159`
  (tiers), `:172` (the single FR-93 sentence this story turns into a section)
- `_bmad-output/implementation-artifacts/deferred-work.md:3087` (CR-D1-1.16b), `:3089`
  (CR-D2-1.16b — closed at 11a.1, ⛔ never recorded), `:205-213` (the topology item Trap 5 **joins**),
  `:265` (the Story 10.6 correction)
- `docs/launch-gate-inventory/inventory-roster.md` Row 17 — `open`, ⛔ untouched by this story
- `.decision-log.md#decision-2026-08-21-148` · `#decision-2026-08-21-147` · `#decision-2026-08-21-146`
  · `#decision-2026-08-21-145` (cl.2 — the `X-Forwarded-For` defect class Trap 5 extends; cl.5 — the
  governance-commit discipline recorded as skipped) · `#2026-08-20-142` (the zero-call-site primitive
  D1 refuses to repeat) · `#2026-08-20-143` (cl.9 — the `trustProxy` fence; cl.11 — the edge-cache
  cost) · `#2026-08-19-132`…`-137` (the directory-attribute model AC5's layering references)

---

## Dev Agent Record

### Agent Model Used

`claude-opus-5` (Claude Opus 5) via `bmad-dev-story`, 2026-08-22.

### Debug Log References

**Branch:** `story/11a.4-phone-email-obfuscation-defense-in-depth`, off `main` at `075827b`
(`git fetch origin` run first; `HEAD == origin/main == 075827b`, zero ahead / zero behind).
⛔ `story/11a.4-phone-email-obfuscation` (`656aaa5`) was ⛔ never checked out and ⛔ never merged.

#### ⭐ AC1 case 3 — a VERIFIED-FALSE row in the §What-is-actually-true table (raised, ruled by BigDev)

The table (L128) claims `0801234 5678` → `phone`. ⛔ **Verified false by running the engine at
`075827b`.** Two of three claimed false positives reproduce; the third does not:

```
"<a href=\"/blog/9876543210\">post</a>"  => [{"type":"phone","value":"9876543210"}]   ✅ reproduces
"<span data-id=\"9123456789\">x</span>"  => [{"type":"phone","value":"9123456789"}]   ✅ reproduces
"0801234 5678"                           => []                                        ⛔ NO MATCH
"080-12345678"                           => []                                        ⛔ NO MATCH
```

The only `0`-prefix landline that *does* fire is the **contiguous** form, and it is **inseparable
from a legitimate 0-prefixed mobile**:

```
08012345678  => ["08012345678"]   Bangalore landline (STD 080 + 8-digit local)  = FALSE POSITIVE
07912345678  => ["07912345678"]   Ahmedabad landline (STD 079 + local)          = FALSE POSITIVE
09876543210  => ["09876543210"]   0-prefixed MOBILE                             = TRUE POSITIVE
01123456789  => []                Delhi (011) — second digit 1, no collision
```

All three matching cases are one token shape: `0` + `[6-9]` + 9 digits. STD codes whose second digit
falls in 6-9 (`079`, `080`, `066`) collide with the mobile pattern **BY CONSTRUCTION** ⇒ ⛔ no
context-free regex separates them, and excluding the landline would stop catching the mobile —
**precision bought with recall**, which AC2 forbids in terms. ⚠ Also: AC2's normative `Then` names
only `/`, `="` and `'`, so the ruled change would ⛔ not have turned that case green anyway — the test
would have landed RED and stayed RED.

⭐ **Raised to BigDev rather than silently deviated from** (the story's own standing instruction).
**RULED: invert case 3** — guard the shapes that must never *start* matching, and **pin the collision
by test**. Implemented as 3 guards + 1 recall pin; documented in `piiPatterns()` and in the test so
⛔ nobody "fixes" it in passing.

#### AC1 — the precision net is RED before the regex moves (Task 2, ⛔ run, not reasoned about)

```
 FAIL  tests/public-pages.test.ts > naked-PII detector — PRECISION (FR-93 / Story 11a.4)
   × does not flag a 10-digit URL path segment as a phone number
   × does not flag a double-quoted numeric attribute as a phone number
   × does not flag a single-quoted numeric attribute as a phone number
 Test Files  1 failed | 61 passed (62)
      Tests  3 failed | 1052 passed (1055)
```

The three standing guards and the recall pin were **green from the start**, by design.

#### AC2 — GREEN after, with every recall assertion UNMODIFIED (Task 3)

```
@twt/contracts   Test Files 62 passed (62)   Tests 1055 passed (1055)
@twt/public      Test Files 12 passed (12)   Tests  179 passed (179)
```

Regex-change impact table (12 cases, run before editing the source):

```
 ~ PRECISION url path       old=["9876543210"]     new=[]
 ~ PRECISION attr dquote    old=["9123456789"]     new=[]
 ~ PRECISION attr squote    old=["9123456789"]     new=[]
   GUARD spaced landline    old=[]                 new=[]
   GUARD hyphen landline    old=[]                 new=[]
   RECALL 0-prefix mobile   old=["09876543210"]    new=["09876543210"]
   RECALL bare mobile       old=["9876543210"]     new=["9876543210"]
   RECALL +91 mobile        old=["+91 9876543210"] new=["+91 9876543210"]
   RECALL tag-adjacent      old=["9876543210"]     new=["9876543210"]
   RECALL json value        old=["9876543210"]     new=["9876543210"]
   RECALL rupee prefix      old=["9876543210"]     new=["9876543210"]
   CLEAN r8 payload         old=[]                 new=[]
```

⭐ Exactly three cases move; ⛔ every recall case is byte-identical — **including the JSON
string-value shape**, which is what the AC3a publish backstop reads. `:"` is deliberately ⛔ **not**
excluded for that reason.

#### AC3 — the matrix contract PROVEN untouched (Task 4), ⛔ not asserted

```
$ git diff <matrix> | grep -E "tier:|pii_tier:|escalations:|escalation_count|tier1_public_exception"
(no matches — zero contract lines changed)
$ pnpm pii:check
  ▸ Escalation ledger: 1 entr(y/ies), attestation cross-checked
    · member-directory.member_name: authenticated_member → public  [2026-08-19-136]
    ✓ every escalation cites a decision that exists, and the count agrees
  ✓ pii-scrape gate passed
```

#### AC3a — the publish backstop, BOTH directions (Task 4a)

```
✓ tests/integration/niyamavali-workflow.spec.ts (13 tests)
      Tests  13 passed (13)
$ git diff <spec> | grep '^-'   →  EMPTY (⛔ zero deleted lines; additive only)
```

⇒ the **9 pre-existing Story 2.4 tests run UNMODIFIED**, which is what proves the four-state draft
machine, the non-author sign-off gate, the content-hash binding and audit-or-throw untouched.

#### AC4 — the derivation held with ⛔ ZERO allowlist edits (Task 5)

```
✓ tests/integration/login-wall.spec.ts       (4 tests)   ← derives via HONEYPOT_PATHS.map()
✓ tests/integration/security-headers.spec.ts (5 tests)   ← toHaveLength(HONEYPOT_PATHS.length)
      Tests  9 passed (9)
```

#### ⭐ AC7 — revert-sanity, and THE FINDING IT PRODUCED (Task 8)

**(a) revert the AC2 regex → the AC1 precision block goes RED**

```
   × does not flag a 10-digit URL path segment as a phone number
   × does not flag a double-quoted numeric attribute as a phone number
   × does not flag a single-quoted numeric attribute as a phone number
      Tests  3 failed | 1052 passed (1055)
restore → Tests 1055 passed (1055)
```

**(b) delete one new bait path → ⛔ THE ASSERTION HAD NO TEETH. This is the finding.**

```
BEFORE THE FIX:  Tests 5 passed (5)      ⛔ deleting '/contacts.json' left the suite GREEN
```

⭐ `security-headers.spec.ts` loops `HONEYPOT_PATHS` **and** asserts
`toHaveLength(HONEYPOT_PATHS.length)` — ⛔ **both sides read the same array**, so a deletion moves
both at once. The assertion is **VACUOUS AGAINST DELETION BY CONSTRUCTION**. It still catches
"declared but not registered"; it can ⛔ never catch a removal. ⚠ **The same defect class
`2026-08-21-145` recorded for the `/members` AC10 control** — a green check proving less than its
name suggests. ⛔ AC7(b) asserted this revert *would* fail; running it is what proved otherwise.

Fixed with an anti-regression **PIN by name** on the five contact-bait paths. ⛔ This is **not** the
hand-maintained parallel list the module doc forbids — that warning is about the login-wall
**allowlist**, which must keep deriving so *adding* a path needs no edit. Adding still needs ⛔ zero
edits; **deleting** one of these five is a deliberate scope reversal and ⭐ *should* force a red test.

```
AFTER THE FIX:
   × the Story 11a.4 contact-harvesting bait family is present and live (deletion-proof)
     → expected [ '/wp-login.php', '/wp-admin', …(8) ] to include '/contacts.json'
      Tests  1 failed | 5 passed (6)
restore → Tests 6 passed (6)
```

**(c) remove the Task 4a scan → the planted-PII publish tests go RED, ⛔ and the other direction too**

```
   × REJECTS a publish whose payload carries a naked phone number → 422  → expected 200 to be 422
   × REJECTS a publish whose payload carries a naked email → 422         → expected 200 to be 422
   × a rejected publish leaves NO audit line and NO published clause     → expected 200 to be 422
      Tests  3 failed | 10 passed (13)
restore → Tests 13 passed (13)
```

⭐ The legitimate-threshold publish (**the real R8 shape**) is GREEN **with the scan in place** — a
one-directional revert proves the check *fires*, ⛔ not that it lets a real amendment *through*, and
the second is the failure that would actually hurt.

#### Task 9 — full verification, before/after counts MEASURED against `075827b`

⚠ Baselines were **re-run in a clean worktree at `075827b`**, ⛔ not inferred by subtraction.

| Suite | Before (`075827b`) | After | Δ |
|---|---|---|---|
| `@twt/contracts` | 1049 passed (62 files) | **1055 passed** (62 files) | **+6** — the precision block |
| `@twt/public` | 179 passed (12 files) | **179 passed** (12 files) | **+0** — comment-only edits |
| `@twt/api` (live DB) | 1073 passed, 1 skipped (123 files) | **1078 passed, 1 skipped** (123 files) | **+5** — 4 publish controls + 1 bait pin |

```
typecheck  @twt/contracts · @twt/public · @twt/api · @twt/domain   → 0 errors
lint       @twt/contracts · @twt/public · @twt/api · @twt/domain   → clean
pnpm pii:check                                                     → ✓ gate passed
```

⛔ Zero regressions in any suite; ⛔ every pre-existing test passed unmodified.

#### ⚠ Two `ci:local` findings — one REAL and FIXED, one PRE-EXISTING and ⛔ NOT this story's

**(1) `friction-budget` — a REAL gate failure, ⛔ correctly fired, now FIXED.**

```
▸ Declaration attribution-on-change (AC-4)
  ✗ member-facing surface touched (apps/public/src/lib/niyamavali-render.ts,
    apps/public/tests/integration/public-pages/scrape-test.spec.ts)
    but friction-budget.md was not changed.
```

⚠ **It only fires once the touch is COMMITTED** — AC-4 diffs committed history
([[project_friction_budget_baseline_ratchet]]), so it passed vacuously until the code
commits landed, then failed. A `friction-budget.md` **disposition** was added (declaration
affirmed, ⛔ **NO new row**) and committed; both `apps/public` touches are **comment-only**, and
AC3a's 422 is an **operator write path**, ⛔ not member friction. ⇒ **`✓ friction-budget gate passed`.**

**(2) `test (unit)` + `integration-tests` — ⛔ NOT caused by this story. Proven, ⛔ not asserted.**

⚠ **`test (unit)` was MY invocation error, ⛔ not a defect.** I exported `DATABASE_URL` for the
whole `ci:local` run; the script supplies it **per-job** for the live-DB leg only
([[project_ci_local_double_run_pollution]]). Re-run correctly:

```
$ pnpm turbo run test --concurrency=4
  Tasks: 37 successful, 37 total       ⇒ ✓ (@twt/api: 365 passed | 714 skipped — unit-only, as designed)
```

**`integration-tests` fails under 8-package concurrency — and it fails at the BASELINE too.**
8 failures on this branch (all timeouts at 15-20s or `500`s consistent with pool exhaustion), in
⛔ **modules this story does not touch**: `banners.spec.ts` (2), `surveys.spec.ts` (2),
`moderation-grounds.spec.ts` (2), `moderation-escalation.spec.ts` (1),
`verifier-console-shape.spec.ts` (1), plus `@twt/jobs` `verifyAuditChain` (timeout).

Innocence established **two** ways:

```
(i)  ISOLATION (the project's documented innocence check):
     $ npx vitest run banners + surveys + moderation-grounds + moderation-escalation
                      + verifier-console-shape
       Test Files 5 passed (5)     Tests 76 passed (76)     Duration 6.52s
     ⇒ all 76 pass in 6.5s isolated, vs 15-20s TIMEOUTS under load.

(ii) BASELINE RE-RUN in a clean worktree at 075827b, same concurrent command:
       Tasks: 15 successful, 20 total     Failed: @twt/validity-service#test
     ⇒ ⭐ the baseline fails TOO — and on a DIFFERENT package. The victim wanders
       per run, exactly as [[project_ci_local_concurrency_oversubscription]] records.
```

⇒ **pre-existing CPU/connection contention, ⛔ not a regression.** `@twt/api` alone against the
live DB is **1078 passed | 1 skipped** (Task 9 table). ⛔ Recorded openly as an un-attested green
rather than reported as "all green" ([[feedback_record_unattested_no_backfill]]).

### Completion Notes List

- **AC1 — ✅ satisfied, with one case INVERTED under a BigDev ruling.** The repo's first precision
  coverage: 6 independently-planted cases (3 fixed by AC2, 2 standing guards, 1 recall pin). ⚠ The
  story's own evidence row for case 3 was **verified false**; the divergence was **raised, ruled, and
  recorded**, ⛔ not taken silently. See the Debug Log.
- **AC2 — ✅ satisfied.** `phone` lookbehind gains `(?<!\/)`, `(?<!=")`, `(?<!')`. ⛔ Pure regex.
  ⛔ `email` untouched. ⛔ `aadhaar` ⛔ NOT widened (D2 = (a)). Every recall assertion passes
  unmodified. The stale `scrape-test.spec.ts:146-147` caveat is corrected — ⚠ the *constraint* stays
  for a narrower live reason (a bare 10-digit run in **text** is still flagged, correctly), and ⛔ zero
  fixture values were edited.
- **AC3 — ✅ satisfied.** Both over-claim sites corrected in their **AC3a form** (one edit, ⛔ not AC3
  wording with AC3a bolted on). ⚠ **One half moved, one half stayed**: renderer opaqueness (freeze row
  14) is ⛔ not softened. Contract untouched, **proven by diff**.
- **AC3a — ✅ satisfied.** `ClausePayloadPiiError` → **422** (registered, so ⛔ never a 500 — the 10.30
  finding). Scan runs over `canonicalJsonStringify(draft.payload)` — the **existing** canonicaliser —
  **before** the audit write. ⛔ Pattern **types** only; the class documents why no `value`/`sample`
  field may ever be added, and a test asserts the planted value is absent **from the raw body**.
  Documented as a **BACKSTOP** in three places; the **non-author sign-off remains primary**.
- **AC4 — ✅ satisfied.** 5 contact-bait paths, same `registerHoneypot` shape, ⛔ same bare
  `{status:'ok'}` (⛔ D4(b) not ruled in). Both limits recorded in the module doc; the `:36`
  "allowlist" claim corrected. ⛔ Zero allowlist edits needed.
- **AC5 — ✅ satisfied.** All **seven** items in the canonical README, placed between the tier model
  and `## Mechanism`. ⛔ No second doc; ⛔ nothing restructured or softened.
- **AC6 — ✅ satisfied.** Decision `2026-08-22-149` committed **FIRST and ALONE** (`fa243d8`, ⛔ zero
  `packages/` or `apps/` files). Closures use D2's exact language; the Trap 5 limit **joins** the
  existing topology item (⛔ not a second entry); four findings **routed**, ⛔ not absorbed.
- **AC7 — ✅ satisfied, and it EARNED ITS KEEP.** Leg (b) **falsified its own prediction**: the
  honeypot count assertion was **vacuous by construction** against deletion. Found by *running* it.
  Fixed, then re-proven red-then-green.
- ⛔ **Row 17 untouched** — still `open`, `closure_evidence_link` still empty; the public Member
  Directory ⛔ still may not go live. ⛔ No matrix tier moved, ⛔ no permission key, ⛔ no
  `PERMISSION_CATALOG_VERSION` bump, ⛔ no migration, ⛔ no npm dependency, ⛔ no new route or page.
- ⚠ **Two Panel questions and one John question are OPEN and routed** — ⛔ this story settles none of
  them, and D3(e) ⛔ did not answer §Q3(d).

### File List

**Governance / records**

- `.decision-log.md` — Decision `2026-08-22-149` (Task 1; committed first and alone)
- `_bmad-output/implementation-artifacts/deferred-work.md` — the 11a.4 section; CR-D1-1.16b +
  CR-D2-1.16b annotated in place; the Trap 5 limit **appended** to the topology item
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — `11a-4-…` → `in-progress`; ledger comment
- `_bmad-output/implementation-artifacts/11a-4-phone-email-obfuscation-defense-in-depth-public-surfaces-only.md`
  — this file (Status, Tasks, Dev Agent Record, File List, Change Log)

**AC1 + AC2 — the precision net and the regex**

- `packages/contracts/src/public-pages/scrape.ts` — `phone` lookbehind + the "what is deliberately
  NOT fixed" note
- `packages/contracts/tests/public-pages.test.ts` — the PRECISION describe block (**added**)
- `apps/public/tests/integration/public-pages/scrape-test.spec.ts` — the stale caveat corrected
  (⛔ comment only; ⛔ zero fixture values changed)

**AC3 — the two over-claims**

- `packages/contracts/public-pages/public-vs-private-matrix.yaml` — `clause_payload_display_fields`
  description (⛔ description text only)
- `apps/public/src/lib/niyamavali-render.ts` — module doc (⛔ comment only)

**AC3a — the publish backstop**

- `packages/domain/src/niyamavali/errors.ts` — `ClausePayloadPiiError` + `CLAUSE_PAYLOAD_PII_CODE`
- `packages/domain/src/index.ts` — the export
- `apps/api/src/middleware/error-mapping/index.ts` — → 422
- `apps/api/src/modules/rules/index.ts` — the scan at the publish precondition + the header
- `apps/api/tests/integration/niyamavali-workflow.spec.ts` — 4 controls (**appended**; ⛔ zero
  existing lines changed)

**AC4 — the honeypot**

- `apps/api/src/plugins/security-headers/index.ts` — 5 bait paths, the two limits, the `:36` correction
- `apps/api/tests/integration/security-headers.spec.ts` — the deletion-proof bait pin (**added**, AC7(b))

**AC5 — the doctrine**

- `packages/contracts/src/public-pages/README.md` — the FR-93 section + a cross-reference

### Change Log

| Date | Change |
|---|---|
| 2026-08-22 | Decision `2026-08-22-149` recorded and committed **first and alone** (`governance:`, ⛔ zero code files) — D1′=(a) · D2=(a) · D3=(e) · D4=(a) · D5=(a), plus four findings routed as OPEN. |
| 2026-08-22 | AC1 + AC2 — the repo's first **precision** regression net (RED first, ⛔ proven by running), then the `phone` lookbehind tightened. CR-D1-1.16b **Closed by [edit]**. |
| 2026-08-22 | ⭐ AC1 case 3 **inverted under a BigDev ruling** after the story's evidence row was verified false and the only real subject proved inseparable from a legitimate 0-prefixed mobile. |
| 2026-08-22 | AC3 — both naked-PII over-claims corrected; ⚠ one half moved, one half stayed; matrix contract proven untouched by diff. |
| 2026-08-22 | AC3a — publish-time naked-PII **backstop** on the Niyamavali amendment path (422, pattern **types** only, before the audit write, both-direction controls). |
| 2026-08-22 | AC4 — 5 contact-harvesting bait paths + the two limits recorded **in the code**; the "allowlist" claim corrected. |
| 2026-08-22 | AC5 — the seven-item FR-93 doctrine section lands in the canonical README. |
| 2026-08-22 | AC6 — `deferred-work.md`: closures in exact language, CR-D2-1.16b's **unrecorded** 11a.1 closure captured, the Trap 5 limit **appended** to the topology item, Contact/About routed to John, two §Q3 findings routed to the Panel. |
| 2026-08-22 | ⭐ AC7 — revert-sanity **found the honeypot count assertion vacuous by construction**; a deletion-proof pin was added and the leg re-proven red-then-green. |
