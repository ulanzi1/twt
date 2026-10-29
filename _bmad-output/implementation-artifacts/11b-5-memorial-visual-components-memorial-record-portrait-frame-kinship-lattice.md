---
baseline_commit: 282bdd33
---

<!--
⭐ BASELINE: `282bdd33` — `records: ledger 2026-10-29 — Story 5.8b LANDED on main by fast-forward (PR #308 …)` = `origin/main`
at creation (2026-10-29). Two facts, stated separately:
  - the pin is an ancestor of HEAD (durable);
  - every code claim below was read at `282bdd33` (perishable). Re-diff `packages apps scripts` at Task 0.1.
⚠ No `file:NNN` pointer in this file points into `.decision-log.md`, `deferred-work.md` or `sprint-status.yaml` (all
newest-first). Cite those by decision id / clause / item / row key only.
⭐ NUMBERS — re-taken 2026-10-29 at `origin/main` = `8dd3e623` (52 commits past the pin; ⛔ no change under `apps/public`,
`packages/tokens` or `scripts/sahyog-vivran-financial-truth` in that range). Re-check ALL of them at Task 0.1 across every branch
AND every worktree, and again at Task 1.1 immediately before writing (`-366` decision 6: the number belongs to the first COMMIT):
  next decision id **`-420`** (main's HEAD is `-419`; `-413` = 6.32, LANDED PR #309; `-416`…`-419` = 5.14, LANDED PR #310 —
  `-416` is Trustee-ratified and bears on MV1, see Rulings) — ⭐ this file writes `-NNN` for this story's decision wherever the
  id is not yet taken; Task 1.1 substitutes the id actually committed · migration: ⛔ none needed (main's newest is `0191`, 5.14's)
  · `PERMISSION_CATALOG_VERSION`: ⛔ no change · ADR: ⛔ none · launch-gate roster: ⛔ no new row (Row 41 is untouched; Rows 42 =
  6.32, 43 = 5.8b, 44 = 5.14) · ledger: main holds the bare `2026-10-29` and `-29a`…`-29q`; this branch's creation entry was written
  as `2026-10-29b`, which COLLIDES with 6.32's on main (`deferred-work.md` item G4-W1) ⇒ relabel it to the next free letter
  (`-29r` at `8dd3e623`) at the Task 0.1 rebase, in BOTH ledgers ([[project_rebase_ledger_conflict_separator]]) — ⛔ never
  renumber another story's entry.
⭐ WORKTREE: `.claude/worktrees/11b-5-memorial-visual-components`, branch
`story/11b-5-memorial-visual-components-memorial-record-portrait-frame-kinship-lattice` (created from `282bdd33`). Two peer
interactive sessions shared the main checkout at creation, which is why this is a worktree. Push with `-u origin <branch>` the
first time, ⛔ never a bare `git push`.
⭐ LETTERS: `MV1–MV6` = this story's build decisions (no prior `MV` exists in `.decision-log.md`). Other stories' letters are
cited qualified (`11b.4a MP1`, `11b.4 MA2`, `-154 cl.6`) per `-168` cl.9.
⚠ GLYPH INVERSIONS UPSTREAM: the 11b.4 section of `deferred-work.md` (its items (2), (7) at least) carries ⛔ markers with the
negator MISSING (e.g. "Kinship capture … ⛔ collected" means it is NOT collected). ⛔ Never copy text from that section; quote
the 11b.4 / 11b.4a story files, the decision log, or the code's behaviour instead.
-->

# Story 11b.5: Memorial Visual Components — MemorialRecord + PortraitFrame + KinshipLattice `[PRIMITIVE]`

Status: ready-for-dev

## ⭐ GLYPH REGISTER — read this before any clause below

⭐ = do this / the load-bearing fact · ⚠ = a hazard or a cost · ⛔ = a prohibition, and in THIS file it is always followed by
its own negator word (*not*, *no*, *never*, *none*). ⚠ Upstream text (the decision log, `deferred-work.md`) does ⛔ not follow
this rule — there a ⛔ often stands in for the negator itself (`-416`'s *"`-160` and `-173` are ⛔ superseded"* means *are NOT superseded*). ⇒ A ⛔
with no negator is a defect: infer the sense from context and the cited source, ⛔ never by deleting the glyph, and note it.

## ✅ PREFLIGHT — STARTABLE after Task 0.2 (BigDev answers MV1–MV6). ⛔ No Panel question. ⛔ Nothing goes live.

⭐ **What this story is, in one paragraph.** The epic asks for three components. At the pin, **exactly one of them has its
inputs**: the funeral frame around the family's approved photo, which Story 11b.4a already draws as plain markup inside
`apps/public/src/components/FamilyMemorial.astro` and which `-412` MP1 said this story would lift into a component. The second,
`<MemorialRecord>`, is specified around a deceased member's **name, dates and district** — the name is `null` on every drive by
ruled design (`-173`), there is **no birth or death date anywhere public and no ruling to publish one**, and its only named
consumer (Story 11b.6, In Memoriam) is barred by the matrix from showing the family's words or photo at all. The third,
`<KinshipLattice>`, has **no data** — kinship is not collected (`-398` MA2) — and collecting the names of a dead teacher's living
relatives, children among them, waits on a **Panel question about its purpose** that `deferred-work.md` routes to this story.
⇒ ⭐ This story builds the frame, fixes the memorial section's styling (which is inert today — Trap 4), and **places** the other
two components where their data and rulings will exist, recording each move. It discloses nothing new.

### Routing-template §0 gate (the template is referenced by path, never copied: `_bmad-output/planning-artifacts/trustee-panel-routing-note-TEMPLATE.md`)

| # | Question | §0 verdict | Where it goes |
|---|---|---|---|
| G1 | Should `<PortraitFrame>` be a `@twt/ui` presenter or an Astro component? | **Ours** (implementation shape) | MV3 |
| G2 | The frame's border width / inset / aspect ratio | **Ours** (visual; ⚠ Story 0.9 un-attested, carried) | MV4 |
| G3 | The memorial section's inert utility classes | **Ours** (a defect in how a page is styled — MV5 changes **presentation** — spacing — ⛔ never what is disclosed or owed) | MV5 |
| G4 | Frame the photo on the family's own preview screen in the app | **Ours** (no disclosure moves — the family sees its own photo) | MV6 |
| G5 | Where `<MemorialRecord>` is built, and with which slots | **Ours** for the *where* (MV1). ⚠ The *slots* hide two **Panel's** questions — a deceased member's **dates** on a public page (no ruling exists; the sources are Tier-1 KYC / claim fields) and In Memoriam's **name** (`-173` (d), the entry's recorded limit: *"IT DOES ⛔ NOT REACH 11b.6 … In Memoriam owes its own when it is authored"*; confirmed by `-416` §2, Trustee-ratified 2026-10-29: the web pages' `-160` / `-173` basis is not moved — *"the drive page, the pool index and In Memoriam keep their rules"*). ⛔ Not asked here: they belong to the story that renders them (11b.6). | MV1 |
| G6 | Kinship: should the public memorial name the deceased's relatives, by relation? | **Panel's** — what the Trust **discloses** about living people, children among them. The closest ratified sentence is `-391` item 2 (Q2 A): *"the reviewer leaves out any child's name, and the photo if it shows a child, before approval. Living adults named by the family appear as written."* — it governs names inside the family's **words**, ⛔ not a structured list of relatives by relation. ⚠ `-391`'s Not-covered line told the Panel kinship waits on Q2, *"now answered"* — the Panel expects it to follow. ⚠ The question cannot be costed honestly without a capture design (who enters it, how it is reviewed, whether a child is listed). | MV2 — routed to the row that designs the capture, which **writes the routing note at its own Task 0**; ⛔ not asked by this story |
| G7 | Does anything this story renders change what the public is **told** — any field, value or person disclosed, or anything owed? | **Ours to verify, and the answer must be NO** — the wire, the matrix and the three ruled fields are untouched (AC6). ⚠ The page's **presentation** does change (MV5's spacing, the frame now token-sourced) — that is ⛔ not a disclosure | AC6 |

⇒ ⭐ **No routing note is written by this story.** If BigDev answers MV2 with (b), the note is written from the template and
⛔ not sent by the agent.

### STOP conditions — check at Task 0.1 (any one ⇒ stop and ask BigDev before Task 1)

1. `apps/public/src/components/FamilyMemorial.astro`, `apps/public/src/lib/family-memorial.ts`, or the `sahyog-vivran`
   memorial tests changed since `282bdd33` (a sibling touched the markup this story refactors).
2. `apps/public/package.json` gained `@twt/ui` or any Tailwind package, or `astro.config.mjs` gained an integration (MV3 / MV5's
   premise moved).
3. Row `11b-6-in-memoriam-roll-consent-governed-revocable-invariant` moved off `backlog`, or a kinship capture appeared anywhere
   (MV1 / MV2's premise moved).
4. `packages/tokens` `border-funeral-frame` gained a reader outside `packages/tokens` (MV4 changes its value).
5. Decision id `-420` is taken on any branch or worktree (then take the next free id, ⛔ never renumber another story's).
   ⚠ This STOP already fired once: the pin's `-416` went to 5.14 before this story committed.
6. The `-173` clause row (`niy.public-disclosure.member-information`) was pinned — the deceased's name would start rendering;
   nothing here depends on it, but MV1's reasoning cites its absence.
7. `friction-budget.md` gained a disposition that names `FamilyMemorial.astro` or the Sahyog Vivran memorial section (5.14 added
   a block for its own surface; a rebase conflict in that file is expected — resolve keep-both, ⛔ never drop another story's
   block).

## Story

As **a visitor reading a Sahyog Vivran page** where a family's approved memorial appears,
I want the photo shown inside the Trust's one funeral frame — drawn from the design tokens, the same way every time, with the
section around it actually styled,
so that the memorial reads as a dignified column rather than unstyled markup.

As **the authors of Story 11b.6 and of the future kinship row**,
we want `<MemorialRecord>` and `<KinshipLattice>` placed where their data and their rulings will exist,
so that ⛔ no component is built against fixtures, ⛔ no slot is shipped for a field nobody may publish, and the kinship question
reaches the Panel with a real design behind it.

## 📜 Policy meaning (AI-10-1 — read before the ACs)

⭐ **This story introduces no predicate that gates a member's access to a benefit, and changes none.** It re-draws an
already-approved photo's frame on a public page, spaces the section around it, and decides where two components will be built;
nothing a member, a family or a nominee may do or receive moves, and nothing new about anyone is disclosed (AC6 proves the
public **data** payload is unchanged; only the HTML's presentation changes). ⇒ Not
checked against the Niyamavali — there is no member-facing sentence to check. ⚠ The two places a predicate *would* arise —
which deceased members' dates a roll may show, and whose relatives a memorial may name — are routed to the stories that render
them (MV1, MV2), and each of those stories owes its own Policy meaning note.

## 🎯 What already EXISTS — read at `282bdd33` (re-verify at Task 0.1)

| Need | What exists | Reuse? |
|---|---|---|
| The family memorial section on the public page | `apps/public/src/components/FamilyMemorial.astro` (56 lines). Props `{ memorial: SahyogVivranFamilyMemorialView; heading: string; photoSrc: string }`. Gating: `planFamilyMemorial(memorial, { words, photo, altText })` fed by three `visibilityOf('sahyog-vivran', <id>, 'public').visible` calls. Order: `<section aria-labelledby="sv-family-memorial-heading" class="mt-6 rounded border border-gray-300 p-4" data-field="family_memorial_words">` (:35) → `<h2 id="sv-family-memorial-heading" class="text-lg font-semibold">` → `<figure class="mt-3" data-field="family_memorial_photo">` (frame) → one `<p dir="auto" class="mt-3 text-sm" style="white-space: pre-wrap;">{paragraph}</p>` per paragraph (:53) | ⭐ **Keep it as the section.** Only the frame leaves it (into `<PortraitFrame>`); the gating, the order, the heading and the paragraphs stay in this file |
| The frame | Inline in `FamilyMemorial.astro` :39–49: `<div style="border: 2px solid var(--color-ink-primary); padding: 6pt; max-width: 20rem;">` → `<div style="aspect-ratio: 4 / 5; width: 100%;">` → `<img src={photoSrc} alt={plan.alt} loading="lazy" decoding="async" style="width: 100%; height: 100%; object-fit: contain;" />` | ⭐ **Lift verbatim in geometry** into `<PortraitFrame>` — the exact target markup is in Dev Notes § *The exact markup* (MV4: refactor, ⛔ not redesign) |
| The render decision | `apps/public/src/lib/family-memorial.ts` `planFamilyMemorial` → `{ section, photo, alt }` (`alt` is `''` when the description is hidden) | ⭐ Reuse unchanged |
| The view model | `apps/public/src/lib/surface-fields.ts` `SahyogVivranFamilyMemorialView` `{ familyMemorialWords: readonly string[]; familyMemorialPhoto: boolean; familyMemorialPhotoAltText: string \| null }`; ids map `SAHYOG_VIVRAN_FAMILY_MEMORIAL_FIELD_IDS` | ⭐ Reuse unchanged — ⛔ no new field |
| The page | `apps/public/src/pages/sahyog-vivran/[driveToken].astro` — imports `FamilyMemorial`, renders it after the drive-facts `<dl>` and before the stage explainer; `heading = tr('family_memorial.heading')`; `photoSrc = /sahyog-vivran/${encodeURIComponent(driveToken)}/memorial-photo` | ⭐ Untouched except a dated doc-block line (AC10) |
| Tokens | `packages/tokens/src/tokens.ts`: `color['ink-primary'] = '#1a1a1a'`; `color['rule-hairline'] = '#d8d4c8'`; `border['border-hairline'] = '1px'`; `border['border-funeral-frame'] = '4px'` (*"Shradhanjali memorial frame (placeholder)"*; the group header :99–100: *"Border widths are PLACEHOLDER until P0-2"*) — ⚠ **no reader anywhere** outside `packages/tokens` (README / ADR-0016 prose only; `ClaimProxyFlowShell`'s `FUNERAL_FRAME_BORDER` is an unrelated constant); `apps/admin` imports `theme.css` but uses no funeral-frame class; `space` has `space-hairline` / `space-row` / `space-block` / `space-page-gutter` and ⛔ no inset token. `theme.css` is generated from it; `apps/public` emits the same values as `:root` vars through `src/lib/theme.server.ts` `rootTokenCss()` | ⭐ MV4 corrects the border value; ⛔ no token is added (the 6 pt inset stays a component constant — MV4, Trap 7) |
| `@twt/ui` memorial module | `packages/ui/src/memorial/{presenter.ts, bidi.ts, index.ts}` — `memorialParagraphs`, `reconstructMemorial`, `memorialOmittedReasons`, `isolateMemorialBidi`, `MEMORIAL_OMITTED_KEY`. Consumed by `apps/api` (the public join), `apps/mobile` (preview / outcome), `apps/admin` (review) | ⛔ Not touched. The public page never sees it: the API joins the words before the wire (`-412` MP3 put the join in `apps/api`, under `-411` item 3's no-marker rule) |
| Mobile photo display | `apps/mobile/app/(memorial)/preview.tsx` and `components/memorial-authorship/MemorialKeptPhoto.tsx`: plain RN `<Image style={{ width: '100%', height: 240 }} resizeMode="contain">`, unframed | ⛔ Not touched under MV6 (b) |
| Prototype | `apps/mobile/components/shradhanjali/` (`KinshipLattice.tsx`, `MemorialPortrait.tsx`, `ShradhanjaliSahyogVivran.tsx`, `ContributorRow.tsx`, `MemoryInput.tsx`, `sample-data.ts`) — Story 0.x native-stack validation, **fixture-backed** (`SAMPLE_MEMORIAL`: name, birthDate, deathDate, village, school, kinship…), mounted at `app/(tabs)/shradhanjali.tsx` | ⛔ **Not production, ⛔ not extended, ⛔ not deleted** (11b.4 / 11b.4a both recorded this) |
| A third frame | `apps/mobile/components/claim/ClaimProxyFlowShell.tsx` — `FUNERAL_FRAME_BORDER = '#1A1A1A'`, `borderWidth={2}` around the Ravi-mode banner (not a portrait) | ⛔ Not touched; named in Dev Notes so nobody "unifies" it here |

**What does NOT exist (each checked by grep at the pin):** any `MemorialRecord` / `PortraitFrame` / `KinshipLattice` outside the
prototype and one comment; any kinship column, contract, i18n key or matrix field; any public birth or death date (the only
sources are Tier-1: `member_kyc_profiles.dob_ciphertext`, `claim_documents.{dob,date_of_death}_ciphertext`,
`claim_ground_inspections.death_date_ciphertext`, and the peer-mesh questionnaire's `death_date` answers (`packages/domain/src/questionnaires/keys.ts`); the contract's `closedAt` is *"a date about a COLLECTION, ⛔ never a date about a
person"*); a `@twt/ui` dependency in `apps/public`; **any Tailwind pipeline in `apps/public`** (Trap 4).

### The epic's AC, clause by clause, against the pin (footgun 12 — the premise against the live data)

| Epic clause | State at the pin | Disposition |
|---|---|---|
| *"authored as extensions of `packages/ui`"* (and `-154` cl.6: *"presenters + Astro render layers"*) | `apps/public` has no `@twt/ui`; the frame computes nothing; the words are joined in `apps/api` | MV3 |
| `<MemorialRecord>`: *"deceased member name + tier-appropriate identity"* | `deceasedMemberName` is `null` on every drive (`-173`; `sahyog-vivran.ts` *"`null` ON EVERY DRIVE TODAY, BY DESIGN"*). In Memoriam's name form (first name + last initial) owes its own ruling (`-173` (d)) | MV1 → 11b.6 |
| *"dates (birth-death)"* | No field, no producer, no ruling; Tier-1 sources only; OCR death date is empty in v1 | MV1 → 11b.6 (a Panel question there) |
| *"district"* | `district` (pii 3, public) **already renders** in the page's drive facts via `<MatrixField>` | MV1 — ⛔ not duplicated into the memorial section |
| *"family-authored narrative excerpt (Story 11b.4), photo"* | Rendered today by `FamilyMemorial.astro`; ⚠ the three fields are **`sahyog-vivran` only** in the matrix (*"⛔ not In Memoriam (11b.6)"*) — so 11b.6's entry can never carry them | MV1 |
| `<PortraitFrame>`: *"the deceased member's photo (consent-gated; family-uploaded per Story 11b.4) in a dignified frame"* | The photo is authorised at submission (`-162` cl.3) and approved by the Trust (`-391` item 2) — ⛔ no consent gate exists or is owed; the frame exists as markup | ⭐ **Built here** (AC1–AC3) |
| *"culturally-appropriate Hindi-context visual treatment (validated against Story 0.9)"* | Story 0.9 findings were never gathered (`p0-2b-bereaved-spouse.md` holds placeholders) | ⚠ Carried **un-attested** (AC12) |
| `<KinshipLattice>`: *"when family provides them in Story 11b.4"* | Not provided — `-398` MA2 deferred the capture; ⛔ no data | MV2 |
| *"matrix-tier respecting + Hindi-first per Story 2.1; accessibility per Story 0.10"* | The frame renders no text of its own; the `alt` is the family's approved description (`-411` item 6) or `""` | AC1, AC3 |

## ⚠ THE NINE TRAPS

### Trap 1 — ⚠ "Refactor" means the PUBLIC OUTPUT stays the same, save the two named differences
`-412` MP1 says only that 11b.5 *"later lifts the markup into its components"*; ⭐ this story READS that as a lift, ⛔ not a redesign (MV4). The page's words, their order, the heading, the `alt`, the photo URL and every
`data-field` attribute stay byte-identical. The **only** permitted differences are (i) MV4's token-driven border (which renders
the same 2 px frame) and (ii) MV5's styles replacing inert classes. ⛔ No 1:1 aspect, ⛔ no new size, ⛔ no
new copy, ⛔ no top rule (the UX's heavy 4 pt one; MV5 (a′)'s hairline `border-top` is the sole exception, only if BigDev picks it), ⛔ no *Bhavpurna shraddhanjali* line — each is UX-spec furniture that nobody has validated (Story 0.9)
and that `-412` did not authorise. **→ Task 3, AC3.**

### Trap 2 — ⚠ The matrix gating stays in `FamilyMemorial.astro`, and its source pins prove it
`apps/public/tests/family-memorial-source.test.ts` pins, **in `FamilyMemorial.astro`**: the three `visibilityOf` calls each
feeding its own key of the object passed to `planFamilyMemorial(memorial, {…})` (review RR6), `{plan.section && (<section`,
`{plan.photo && (<figure`, and `alt={plan.alt}`. ⛔ Do not move the gating into `<PortraitFrame>` — the frame is a dumb primitive
that takes `src` and `alt` and asks nothing. The `<figure data-field="family_memorial_photo">` stays in `FamilyMemorial.astro`
(it carries the matrix field id); `<PortraitFrame>` renders **inside** it. ⇒ the `alt={plan.alt}` pin still matches
(`<PortraitFrame src={photoSrc} alt={plan.alt} />` contains it) and stays as it is. ⚠ The pin that DOES break is the paragraph
regex, which requires `style="white-space: pre-wrap;"` **exactly**: MV5's paragraph spacing goes into that same `style`
attribute ⇒ re-pin it to `style="white-space: pre-wrap;[^"]*"` (the render spec's own `toContain('white-space: pre-wrap')` is
unaffected). ⚠ Both regexes are **order-dependent**: the existing one needs `<p dir="auto"` first, the loosened one needs
`white-space: pre-wrap;` first inside `style` ⇒ keep `dir="auto"` as the first attribute and append the margin AFTER
`white-space: pre-wrap;` (the exact markup is in Dev Notes). **→ Task 3.2, Task 3.3.**

### Trap 3 — ⚠ The no-`set:html` scan's file list is SELF-CHECKING — a new component must join it
The same test asserts its `TOUCHED` list is complete: every `src/**/*.{astro,ts}` whose code names
`familyMemorial|FamilyMemorial|family_memorial|memorial-photo` must be on it. `PortraitFrame.astro` will ⛔ not match that regex
(it names no memorial) — ⇒ add it to `TOUCHED` **by hand** anyway: it renders the family's approved description into `alt`, so
the no-`set:html` / no-`innerHTML` property must cover it. **→ Task 3.3.**

### Trap 4 — ⚠⚠ THE MEMORIAL SECTION'S STYLING IS INERT TODAY — `apps/public` HAS NO TAILWIND PIPELINE
`FamilyMemorial.astro` styles the section with `class="mt-6 rounded border border-gray-300 p-4"`, the heading with
`class="text-lg font-semibold"`, the figure with `class="mt-3"` and each paragraph with `class="mt-3 text-sm"`. ⛔ None of those
classes has a rule: `apps/public/package.json` carries no Tailwind package, `astro.config.mjs` has no integration, and no CSS
under `apps/public/src` defines them (grep for `.mt-`, `.rounded`, `.text-sm`, `.list-none` returns nothing at the pin).
`src/lib/theme.server.ts`'s header says so in terms: *"`apps/public` is an intentionally minimal-JS SSR surface with NO Tailwind
pipeline"*; `sahyog.astro`'s style comment: *"there is NO Tailwind pipeline on this surface — ⛔ do not introduce one"*. ⇒ Only the
frame's **inline** styles render today; the section has no border, no padding, no spacing. ⚠ **The same is true of the whole
`[driveToken].astro` page (75 `class=` attributes on 74 lines at the pin)**, including Story 11b.12's stage explainer, whose comment states
that its marker reset and focus ring are *"BOTH REQUIRED, ⛔ neither is decoration … so they ride Tailwind utilities"* — the
explicit ring 11b.12 called required is not applied, so any visible focus there is the browser's default only, and the marker
reset does not happen (since `a35330bf`, 2026-09-06). ⭐ **This story fixes the memorial section only** (MV5); the page-wide
defect is recorded with a Trigger, ⛔ not fixed here (its surface is 11b.12's and the page's). Task 0.1 re-verifies by building and inspecting the emitted CSS, ⛔ not by grep alone. **→ Task 0.1 (h), Task 3, AC4,
AC12.**

### Trap 5 — ⚠ Inline styles, ⛔ not a scoped `<style>` block (MV5)
`astro.config.mjs` sets `build.inlineStylesheets: 'never'`: a component `<style>` becomes an external `/_astro/*.css` file and
Astro adds `data-astro-cid-*` attributes to the markup. That would (i) change every memorial element's attributes (Trap 1), (ii)
make the render spec unable to see the frame's geometry in the page HTML (it asserts it there today), (iii) differ from the
page's own convention (*"this page has ⛔ no `<style>` block"*), and (iv) give `/sahyog-vivran/[driveToken]` non-zero `own_bytes`
in `dist/page-weight.json`, which the friction-budget `page_weight_bytes` ratchet measures (0 today). ⇒ MV5 (a) uses **static**
inline `style` strings holding `var(--…)` token references — what the frame already does, and what `PublicShell.astro`'s global
style does for its hairlines. ⚠ ⛔ Never the object form `style={{…}}`: Astro's `toStyleString` emits `border:var(…)` with ⛔ no
spaces, which breaks AC3's regex. **→ Task 3.**

### Trap 6 — ⚠ The `@twt/ui` fence NAMES 11b.5 as a consumer — ⛔ never cite it as a bar on this story
`apps/public/src/pages/sahyog.astro:917-919` (a **CSS comment** inside that page's `<style>`) says *"⛔ do not add @twt/ui here: its
11b consumers are 11b.2 / 11b.5 / 11b.7"*. `-219` cl.5 (Trustee-ratified), verbatim: *"Option (C) — ordering `@twt/ui` into
`apps/public` — is DECLINED. A shared package for one number is the premature-coupling this project refuses …; the standing in-code
fence at `apps/public/src/pages/sahyog.astro:917-919` (its 11b consumers are 11b.2 / 11b.5 / 11b.7) **STANDS**."* ⇒ The ruling
declined `@twt/ui` for **11b.3b's** case and kept a fence that **reserves** the dependency for 11b.5 — it does ⛔ not forbid it
here. MV3 (a) declines that reserved slot as **our** choice (author-commit), on the second-consumer rule and on `-219` cl.5's own
ground *by analogy* (a package for a component with no logic). Story 11b.4a's Trap 16 adds the mechanical hazard: `@twt/ui`'s
`main` is TypeScript source, so adding it also needs `vite.ssr.noExternal`, or only the **built** image crashes. ⇒ Under MV3 (a)
this story adds ⛔ no `@twt/ui` dependency; the fence comment is **appended to**, INSIDE its `/* … */` (a line outside it is CSS),
with a dated line: *"11b.5 was a named consumer and did ⛔ not take `@twt/ui` (`-NNN` MV3); the remaining named consumers are
11b.2 / 11b.7"* — ⛔ never edited or removed. **→ Task 4.1, AC10.**

### Trap 7 — ⚠ Changing a token value is a change to `theme.css` and `rootTokenCss()` — and ⛔ never a new `space` token
`packages/tokens/tests/tokens.test.ts` pins the border token names as an **identity array** and checks that `renderThemeCss()`'s
output contains `--border-funeral-frame:`; the committed `theme.css` is checked by the determinism job (`tokens-theme-check`).
`theme.css` is **generated** — regenerate it with `pnpm --filter @twt/tokens tokens:generate-theme` (⛔ never hand-edit). Changing
a VALUE leaves every identity array as it is. ⚠ A NEW `space` token would ⛔ not be a small change: `space` is documented as
*"the four UX-DR9 named tokens … a discrete named set"* in `packages/tokens/README.md`, the `tokens.ts` header, ADR-0016 and
`epics.md` UX-DR9, and a test title says *"EXACTLY the four UX-DR9 named spacing tokens"* — which is why MV4 keeps the 6 pt inset
as a component constant. `apps/admin` consumes `theme.css` through Tailwind v4 `@theme`: a changed `--border-funeral-frame` is
harmless there only because nothing reads it (STOP 4). **→ Task 2.**

### Trap 8 — ⚠ The frame is a PATTERN in the UX, and it must stay nested wrappers, ⛔ never `box-shadow`
UX spec §FuneralFrame: *"rendered as nested wrappers (… div → div → img on web). … The pattern, not a typed atom"*; and the
visual grammar: *"black border with a white inset … rendered as nested borders — not box-shadow"*. `@twt/tokens` has no shadow
tokens by design (FM-3). ⛔ No `outline`, ⛔ no `box-shadow`, ⛔ no `::before` ring. **→ Task 3.1, AC1.**

### Trap 9 — ⚠ Nothing the frame renders may reach `<head>`, Open Graph or a share card
11b.4a Trap 12 / the matrix scope for `family_memorial_photo`: *"⛔ Never in `og:image` or any link preview"*. `<PortraitFrame>`
is a body-only component; the render spec's existing `<head>` leg (title, description, Open Graph, `og:image` — spec :178–188)
must stay green unchanged. **→ AC6.**

## ⚖️ Build decisions MV1–MV6 (PROPOSED — for BigDev at Task 0.2; to be recorded as `-NNN` — `-420` at `8dd3e623` — at Task 1.1)

### MV1 — Where `<MemorialRecord>` is built
⭐ **(a) Not in this story — Story 11b.6 builds it, with its first real consumer.** `FamilyMemorial.astro` stays the Sahyog
Vivran memorial section (it is ⛔ not renamed).
**Why:** every input that distinguishes a "memorial record" from the section that exists — the deceased's name in a tier form,
the dates, the district — has either no producer or no ruling, and the only named consumer (11b.6's roll) may ⛔ not carry the
words or the photo (matrix scope: *"⛔ not In Memoriam (11b.6)"*). A `<MemorialRecord>` built here would be either a renamed
`FamilyMemorial` that 11b.6 cannot use, or a component with slots typed for fields nobody may publish (the shape Story 10.10's
`is_valid` taught this project to fear — code that silently assumes a ruling). 11b.6 owes the name-form ruling (`-173` (d)) and,
if it wants dates, a Panel question on publishing a deceased member's birth and death years from Tier-1 sources — that story is
where those rulings and that component meet. `-416` §2 (Trustee-ratified 2026-10-29, Story 5.14) confirms the web pages' naming
basis is not moved: *"the drive page, the pool index and In Memoriam keep their rules"* (its *"⛔ superseded, narrowed or
widened"* is an upstream glyph standing for **not** — see the Glyph Register). Second-consumer rule (architecture :4780–4781 at the pin, :4796–4797 at `8dd3e623`,
*"Promotion to `packages/ui/` follows the second-consumer rule"*; [[feedback_no_premature_package]]).
⚠ **Cost:** the epic's component list is not delivered as written; 11b.6 grows by one component. Three sources disagree on
what `<MemorialRecord>` is: **UX-DR17** (`epics.md` :414 — *"Per-claim memorial page composing bordered portrait, parichay,
kinship lattice, contributor scroll"*), **UX §11 `<MemorialRecord>`** (`ux-design-specification.md` :1947 — the anatomy: top rule
(heavy 4pt) · portrait frame · name · dates · parichay · kinship lattice · shraddhanjali line · contribution summary), and **the
epic** (a **single entry** in a roll). 11b.6 must pick one reading and say so.
Rejected — **(b)** rename `FamilyMemorial.astro` to `MemorialRecord.astro` (a name that tells 11b.6 a reusable entry exists when
it cannot use it). **(c)** build `<MemorialRecord>` now with `name` / `dates` / `district` props that are always `null` (props for
fields with no producer and no ruling; the first story to fill them would inherit an unruled shape).

### MV2 — Where `<KinshipLattice>` is built, and who asks the Panel
⭐ **(a) A new row, `11b-5a-kinship-capture-and-lattice` (`backlog`), owns kinship end to end** — the capture in the family's
authoring flow, the Trust's review of it, the public render, and the **Panel question on its purpose**, written from the
template **at that row's own Task 0** (its create-story must carry this as a Task, ⛔ not a note). This story mints the row
(sprint-status + an `epics.md` annotation, the 11b-2a / 11b-4a precedent), re-points the two `deferred-work.md` kinship items to
it, and builds ⛔ no lattice. ⭐ **The row's scheduling trigger is written where it will be read:** as a **STOP** inside the
`### Story 11b.6` dated note in `epics.md` (which 11b.6's create-story reads) — *"STOP: row `11b-5a-kinship-capture-and-lattice`
must be created (bmad-create-story) before this story's create-story proceeds, or BigDev records why not"* — and repeated in the
row's `sprint-status.yaml` comment block (AC0). ⚠ The row inherits a design disagreement to resolve, ⛔ not resolved here: the
epic (`epics.md` :6613 at the pin, :6662 at `8dd3e623`) asks for a *"respectful structural diagram, NOT social-network-style graph"*; the UX §11
`<KinshipLattice>` (:1962–1968) is a label/value `<dl>`, and the visual grammar (:475) says *"a simple two-column key-value list
(NOT a family-tree diagram)"*.
**Why:** the lattice renders the names of a dead teacher's living relatives — spouse, sons, daughters — on an open page. That is
what the Trust **discloses**, so it is the Panel's (§0). But the honest options cannot be written without the capture design:
who types the names (the nominee, under `-391` Q1 A?), whether the reviewer may leave a name out and on which of `-391` item 7's
four grounds, and how a listed **child** squares with `-391` item 2 (*"the reviewer leaves out any child's name … Living adults
named by the family appear as written"*) — the lattice's own example rows are `पुत्र` / `पुत्री`. A question asked before that
design gets a ruling nobody can build to. `-398` MA2's ground stands: ⛔ no names of living relatives are collected for a purpose
not yet ruled.
⚠ **Cost:** this is kinship's **fourth** hop (11b.4 → 11b.4a → 11b.5 → 11b-5a) — `-391`'s Not-covered line told the Panel kinship
waits on Q2, *"now answered"*, so the Panel expects it to follow, and each hop is a delay they have ⛔ not been told of. The STOP in
11b.6's note is the only thing that stops a fifth hop. The epic's third component is ⛔ not delivered in Epic 11b's current plan
unless 11b-5a is scheduled; one more row on the board.
Rejected — **(b)** write the Panel note in this story now (not sent) and build nothing (a question without the capture design —
the costs it must state are unknown). **(c)** build `<KinshipLattice>` against fixtures now (a component for data that may never
be ruled publishable; the prototype already shows the look). **(d)** drop kinship from the product (a scope cut BigDev may make,
but ⛔ not by default in a component story).

### MV3 — The shape: an Astro component, ⛔ no `@twt/ui` presenter, ⛔ no `@twt/ui` dependency in `apps/public`
⭐ **(a) `<PortraitFrame>` is an Astro render layer at `apps/public/src/components/PortraitFrame.astro`**, taking `{ src: string;
alt: string }`. The shared layer across stacks is the **token** (MV4), ⛔ not a presenter. ⚠ This **supersedes in part `-154`
cl.6** (author-commit, *"Stories 11b.2 / 11b.5 / 11b.7 author as presenters + Astro render layers"*) **for 11b.5 only**; its
core — `@twt/ui` stays React-free with exactly `@twt/contracts` as a dependency — is untouched. ⚠ cl.6 has a second half,
*"`apps/public` **adds `@twt/ui`**"*; that half is ⛔ not exercised for 11b.5 either — **our** choice, ⛔ not a ruling's (the
`sahyog.astro` fence `-219` cl.5 keeps standing **names** 11b.5 as a consumer — Trap 6) — and the pointer names both halves. `-154`
is author-committed (*"⛔ Not Trustee-routed"*, cl.6 tagged `[Author-committed]`), so an author-commit may supersede it. A dated
pointer is added under `-154` (AC0).
**Why:** a headless presenter needs something to compute. The frame computes nothing (border, inset, ratio are tokens and CSS),
and the memorial's only logic — joining the kept words — already runs in `apps/api` through `@twt/ui` (`-412` MP3 put it there,
under `-411` item 3's no-marker rule, so the public page never needs the presenter). Adding `@twt/ui` to `apps/public` for a
component with no logic is the coupling `-219` cl.5 declined for 11b.3b *"for one number"* — the same ground, by analogy — plus
11b.4a Trap 16's `noExternal` crash hazard.
⚠ **Cost:** the epic's *"extensions of `packages/ui`"* and `-154` cl.6's presenter shape are not followed for this story; when a
second stack needs the frame, it re-implements three CSS facts from the same tokens rather than sharing code. The UX already
names two: the family's preview in the app (MV6, RN) and the **admin claim verification view** (UX §11 `<PortraitFrame>` :1960,
*"Surfaces: Inside `<MemorialRecord>`; admin claim verification view"* — React; planned, ⛔ not built).
Rejected — **(b)** a `@twt/ui` `portrait-frame` module exporting a geometry spec + `apps/public` adds `@twt/ui` (a presenter that
re-exports token names; a fenced dependency for no logic). **(c)** put the frame in `packages/platform-adapters` (architecture's
home for *"stateless visual … units; no TWT-specific data-shape knowledge"* — the right home **once a second stack consumes it**;
premature with one built consumer).

### MV4 — The frame's geometry: refactor, ⛔ not redesign
⭐ **(a) Keep exactly what renders today — a 2 px `ink-primary` border, a 6 pt inset, a 4:5 box, `max-width: 20rem`, the image
`object-fit: contain` — and source the BORDER from its token:** `border['border-funeral-frame']` corrected from its placeholder
`4px` to `2px` (UX spec :1174: *"`border-funeral-frame` — composition: 2px outer ink-primary + 6pt cream inset + image"*; §11:
*"Portrait frame primitive with 2px ink border + 6pt inner pad"*). The **6 pt inset, the 4:5 box and the 20 rem cap stay
component constants**, named in the component's header: ⛔ no new `space` token — `space` is a documented set of exactly four
UX-DR9 tokens (Trap 7), and the UX itself defines the frame as a *composition* of the border token with a pad, ⛔ not as a set of
tokens. The photo variant is `fit: 'inside'` within 960 × 1200 without enlargement (`-412` MP5;
`apps/api/src/modules/public-pages/memorial-photo-variant.ts`) — a 4:5 **bound** on a photo of **any** aspect — so the 4:5 box
with `object-fit: contain` already letterboxes a landscape photo; that is today's behaviour, kept.
**Why:** the token was a placeholder with no reader; 11b.4a drew the UX's 2 px directly, so the token and the page disagree. One
source for the border makes the next stack's frame (MV6) match by construction. ⚠ The value becomes the **UX's**, ⛔ not a
validated one: the border group's header (`tokens.ts` :99–100) says *"Border widths are PLACEHOLDER until P0-2"* and Story 0.9 is
un-attested ⇒ the comment keeps the word — `// Shradhanjali portrait frame — UX §PortraitFrame "2px ink border + 6pt inner pad"; placeholder until P0-2, like its group`.
⚠ **Cost:** ⛔ no visual change — and so ⛔ no step toward the UX's 1:1 default or its 120 / 180 / 240 pt sizes; the frame stays
un-attested against Story 0.9 (`-412` MP1's cost, carried); the inset is a literal a second stack must copy. The UX's *"cream
inset"* is ⛔ not drawn (today's inset shows the page background) — kept.
Rejected — **(b)** adopt the UX's 1:1 default (the pipeline makes no square crop; the box would letterbox more photos, not fewer).
**(c)** leave the token at `4px` and keep the 2 px literal (two sources that already disagree). **(d)** add
`space-funeral-frame-inset` (extends UX-DR9's four-token set and ADR-0016's taxonomy for one value — README, ADR note and a test
title would all move).

### MV5 — The memorial section's inert classes (Trap 4)
⭐ **(a) Replace every utility class in `FamilyMemorial.astro` with SPACING ONLY, as static inline `style` strings holding token
variables — ⛔ no box border, ⛔ no radius, ⛔ no padding.** The section `margin: var(--space-block) 0 0`; the figure and each
paragraph `margin: var(--space-row) 0 0` (the exact strings are in Dev Notes § *The exact markup*). ⛔ **Not the card 11b.4a's
inert classes describe** (`rounded border border-gray-300 p-4`): the UX rules it out — *"Ruled rhythm over cards. Content
separated by hairlines, not card boundaries"* (:505), *"Explicitly absent: … rounded corners"* (:462), the memorial page *"a
Hindi newspaper obituary column"* (:466) — and every sibling `<section>` on `[driveToken].astro` carries the same inert classes
and renders with ⛔ no border (`[driveToken].astro` :473, :502, :651, :664, :714, :807, :890, :950), so a bordered memorial would be the page's only box.
⚠ Write **full `margin` shorthands**: the classes assumed Tailwind's preflight, which zeroes `figure` / `p` / `h2` margins —
setting only `margin-top` would keep the browser's `figure { margin: 1em 40px }`. ⭐ **What is dropped, with ⛔ no replacement:**
`rounded` (⛔ no radius token, and the UX forbids it), `border border-gray-300 p-4` (the card), the paragraphs' `text-sm` (⛔ no
type-size token — body text stays the browser default, as on the rest of the page), and the `<h2>`'s `text-lg font-semibold`
⇒ ⚠ **the `<h2>` carries ⛔ no `style` at all** — browser-default size, weight and margins (`0.83em`), exactly like every
sibling `<h2>` on the page (their `text-lg` is inert too); a styled memorial heading would be the odd one out. ⛔ No `<style>`
block (Trap 5). The page-wide defect — 75 inert classes on `[driveToken].astro`, including 11b.12's required focus ring — is
**recorded in `deferred-work.md` with a Trigger** (*"Story 11b.8's accessibility audit, or the next story that edits
`[driveToken].astro`"*), ⛔ not fixed here.
**Why:** this story owns the memorial section; refactoring it while leaving the browser's `figure` side margins and flush
paragraphs in place would preserve a defect it has found. Spacing alone matches what the page's other sections actually render
and what the UX asks for; the page-wide fix touches 11b.12's and 11b.3's markup and a keyboard-focus behaviour that needs its own
test.
⚠ **Cost:** this is the story's one **visible** change (spacing; the figure loses its 40 px side indent); the section is ⛔ not
visually separated from its neighbours beyond spacing (as none of them is); the page-wide focus-ring defect stays live until its
Trigger. ⚠ The inert classes show every section on the page was **meant** as that card ⇒ the page-wide Trigger must choose cards
or ruled rhythm for ALL sections at once (against UX :505) — the `deferred-work.md` item says so. ⚠ BigDev may prefer **(c)** given the focus ring is an a11y defect on a public page.
Rejected — **(a′)** (a) plus one hairline rule above the section, `border-top: var(--border-hairline) solid
var(--color-rule-hairline)` (the UX's *ruled rhythm*, and `PublicShell.astro`'s own hairline idiom — ⚠ but the only rule on a page
whose other sections have none; a reasonable pick if BigDev wants the memorial set apart — it adds the two hairline
tokens to AC4's token-resolution check — `solid` is already on the allow-list, for the frame). **(a″)** the card 11b.4a's classes describe (a hairline box + padding — breaks UX §5's ruled rhythm and is
the page's only box). **(b)** keep the classes (a refactor that preserves a defect it has found). **(c)** fix the whole page here
too (⚠ a reasonable choice if BigDev wants the focus ring now — it widens the diff to two other stories' markup and needs a keyboard
test; if chosen, Task 3.4 runs and AC4 widens to the page).

### MV6 — The family's own preview screen in the app
⭐ **(b) Not in this story.** The app's preview (`preview.tsx`) and kept-photo view (`MemorialKeptPhoto.tsx`) keep their plain
`<Image>`; the RN frame waits for its own trigger.
**Why:** an RN frame needs `ink-primary` in the mobile theme, and `apps/mobile` does not depend on `@twt/tokens` —
`components/panchayat/tokens.ts` records that bridging `@twt/tokens` into `tamagui.config.ts` was **routed with an explicit
re-trigger: *"the next story that needs a `@twt/tokens` colour role on RN"*** (11a.5 D6(c), declined then on blast radius:
*"it re-themes EVERY mobile surface"*). Framing two `<Image>`s would fire that trigger and owe its disposition — out of
proportion here. And the preview is pre-review: it already differs from the public page (words before photo; the family's
screen keeps the omitted-part marks the public page drops, `-411` item 3).
⚠ **Cost:** the family does not see the frame before sending; UX §MemorialAuthorshipSurface's *"preview matches public output
exactly"* (:2156) stays unmet (it already was). `deferred-work.md` 11b.4 item (12) — six UX departures under one Trigger
*"Story 11b.5 / a Story 0.9 conversation"* — is disposed in full (AC9), ⛔ not closed.
Rejected — **(a)** an RN `PortraitFrame` aligned to (⛔ not derived from) `ink-primary` through a local map, the panchayat
precedent (fires the D6(c) trigger; a fourth drawing of the frame).

## Acceptance Criteria

### AC0 — Governance before code
**Given** BigDev's answers to MV1–MV6 (Task 0.2)
**When** the story starts
**Then** decision `<commit-date>-NNN` (`-420` at `8dd3e623`; the next free id at time of use — STOP 5) is committed **alone**, as
an **author-commit** recording MV1–MV6 as answered, with the `-154` cl.6 supersession named (MV3 (a)), MV3's declining of the
fence's reserved slot stated as **our** choice (Trap 6 — ⛔ never as `-219` cl.5's), and ⛔ no Panel question
**And** `-NNN` also records that it **re-homes** `-391`'s Not-covered line *"relationships (kinship rows) … their collection is
still Story 11b.4a/11b.5's to plan"* to row `11b-5a` (MV2 (a)) — a pointer, ⛔ not an edit of `-391`
**And** a separate records commit adds, each as a dated line, with ⛔ no word above it edited:
  (i) under `-154`: *"cl.6 superseded in part for 11b.5 by `-NNN` MV3 — both the presenter shape and `apps/public` adding `@twt/ui`"*;
  (ii) under `-391`: its kinship Not-covered line re-homed to row `11b-5a` by `-NNN`;
  (iii) `epics.md` `### Story 11b.5`: frame built here; `<MemorialRecord>` → 11b.6 (MV1); `<KinshipLattice>` → 11b-5a (MV2), with
  the annotation that 11b-5a is ⛔ not in the epic's story list (the 11b-2a precedent);
  (iv) `epics.md` `### Story 11b.6`: the AC7 content — and, if MV2 (a), the **STOP** line of MV2 (row 11b-5a created first);
  (v) if MV2 (a), the row `11b-5a-kinship-capture-and-lattice: backlog` in `sprint-status.yaml` beside `11b-5` with a comment block
  carrying its **scheduling trigger** — *"created (bmad-create-story) before Story 11b.6's create-story, or at the Epic 11b
  retrospective, whichever is first; its Task 0 writes the Panel routing note on kinship's purpose from the template"*;
  (vi) the `deferred-work.md` lines of AC8, AC9 and AC12 — except AC12's 11b.4a item (9) discharge line, which names the Task 3
  commit (Task 4.2)
**And** ⛔ no code lands before both commits.

### AC1 — `<PortraitFrame>` exists and is a dumb, nested-wrapper primitive
**Given** MV3 (a) and MV4 (a)
**When** `apps/public/src/components/PortraitFrame.astro` is written
**Then** its props are exactly `{ src: string; alt: string }` and its markup is **exactly** the `PortraitFrame.astro` block in Dev
Notes § *The exact markup* (div → div → img; static style strings)
**And** the `alt` attribute is always present — `alt={alt}`, ⛔ never `alt={alt || undefined}` (Astro drops a `null` / `undefined`
attribute entirely, `runtime/server/render/util.js` :44–45). For `''` Astro 6.4.8 emits a **bare** `alt` (`addAttribute`
:79–81: an empty string renders as the key alone), which HTML treats as `alt=""`; the built-HTML assertion (AC11 (6)) matches
`/\salt(?:=""|[\s>\/])/` against the extracted `<img …>` tag, ⛔ never the literal `alt=""`. ⚠ `alt=""` marks the portrait as
**decorative**, so a screen-reader user is ⛔ not told a photo is there at all; the UX (:1959) says *"`alt` text on inner image
required"*. That is today's behaviour when the family's description was left out, kept — ⛔ no copy is invented here; the gap is
recorded (AC12 (5))
**And** it carries ⛔ no `class` attribute, ⛔ no `<style>` block, ⛔ no `box-shadow` / `outline` / `border-radius`, ⛔ no
`set:html`, ⛔ no `visibilityOf` call, ⛔ no copy, ⛔ no `lang` attribute, and imports nothing.

### AC2 — The tokens tell the truth
**Given** MV4 (a)
**When** `packages/tokens` is updated
**Then** `border['border-funeral-frame']` is `'2px'` with the comment of MV4 (it names the UX source and **keeps** *"placeholder
until P0-2"*, like its group — the value is the UX's, ⛔ not a validated one), and ⛔ no token is added or renamed
**And** `theme.css` is regenerated by `pnpm --filter @twt/tokens tokens:generate-theme` (⛔ never hand-edited) and
`tokens-theme-check` passes; the identity arrays in `tokens.test.ts` are unchanged
**And** `apps/public`'s `rootTokenCss()` emits `--border-funeral-frame: 2px;` (it iterates the groups — ⛔ no edit to
`theme.server.ts` is expected; AC11 (3) asserts the output).

### AC3 — `FamilyMemorial.astro` composes the frame; the public output is unchanged in substance
**Given** Trap 1 and Trap 2
**When** `FamilyMemorial.astro` renders `<PortraitFrame src={photoSrc} alt={plan.alt} />` inside its own
`<figure data-field="family_memorial_photo">`
**Then** the three `visibilityOf` calls, the `planFamilyMemorial(memorial, {…})` object and its RR6 key-to-id feeds,
`{plan.section && (<section`, `{plan.photo && (<figure` are unchanged in the file, and `alt={plan.alt}` becomes the prop
**And** on the built server (`family-memorial-render.spec.ts`) the section keeps its text content, `alt` value, `src`,
`loading` / `decoding`, `data-field`s and `aria-labelledby` pair. ⭐ **The proof is the spec's assertions, ⛔ not a claim:** its
existing assertions (aria-labelledby presence :139; facts < memorial < contributors :146–149; paragraph text ∈ `WORDS`
:152–159; `img` `src` / `alt` / `loading` / `decoding` :162–166) stay unchanged, and AC11 (5) **adds** the three the spec lacks
today — `data-field="family_memorial_words"` on the `<section>`, `data-field="family_memorial_photo"` on the `<figure>`, and
index(`<h2`) < index(`<figure`) < index(first `<p`) inside the section
**And** the frame is still asserted in the page HTML as nested wrappers — the spec's frame regex (:161) is rewritten to the token
form (`border: var\(--border-funeral-frame\) solid var\(--color-ink-primary\)`, `padding: 6pt`, `aspect-ratio: 4 \/ 5`) and
shown RED against a mutant that drops a wrapper.

### AC4 — The memorial section is actually styled (MV5)
**Given** Trap 4 and MV5 (a)
**When** the built page is rendered
**Then** `FamilyMemorial.astro` and `PortraitFrame.astro` contain ⛔ no `class=` attribute (a source test), the `style` strings
are **exactly** those of Dev Notes § *The exact markup*, and every **colour and border-width** value in them, and every spacing value other than the listed constants, is a
`var(--…)`
(⛔ no hex, ⛔ no `rgb(`, ⛔ no named colour — the microcopy FM-14 gate does ⛔ not scan `apps/public` `.astro`, so this source test is
the only guard); the only literals are the named constants the test lists — `solid`, `6pt`, `20rem`, `4 / 5`, `100%`, `contain`,
`pre-wrap`, `0` — and ⛔ no `border-radius`, ⛔ no `font-size` / `font-weight`, ⛔ no `style` on the `<h2>`
**And** every token they reference exists in `rootTokenCss()`'s output (a test resolves each `var(--name)` against it — ⚠ a typo'd
variable silently renders nothing)
**And** ⛔ no other element of `[driveToken].astro` changes (MV5 (a)); under MV5 (c) this AC widens to the page and gains a
keyboard-focus assertion on the stage explainer's `<summary>`.

### AC5 — The take-down still leaves no trace
**Given** `-393` M1 and 11b.4a AC5
**When** the existing byte-identical take-down leg (`apps/api/tests/integration/public-pages/sahyog-vivran-memorial.spec.ts` and
the built-server leg of `family-memorial-render.spec.ts`) runs
**Then** it passes with its assertions ⛔ not changed (the inline styles live inside the section that disappears, so the
before-anything-was-written render and the after-take-down render remain byte-identical). ⚠ The API spec compares **JSON** wire
bodies (`after.body` toBe `before.body`, :187) — ⛔ no `.astro` change can reach it; ⛔ do not look for HTML there. The HTML leg is
the render spec's.

### AC6 — Nothing new is disclosed
**Given** G7
**When** the diff is reviewed
**Then** ⛔ none of these change: `packages/contracts/src/public-pages/sahyog-vivran.ts`, the matrix YAML, `matrix.ts`
`RULED_TIER1_PUBLIC_EXCEPTIONS`, `surface-fields.ts`, `family-memorial.ts`, `sahyog-vivran-render.ts` (code — a dated comment line
is allowed, AC10), the API, the photo route, any i18n catalogue, `openapi/v1.yaml`
**And** the render spec's existing `<head>` leg (title, description, Open Graph, `og:image`) passes unchanged (Trap 9).

### AC7 — `<MemorialRecord>` is placed, ⛔ not built (MV1)
**Given** MV1 (a)
**When** the story closes
**Then** ⛔ no `MemorialRecord` file exists; the `epics.md` dated notes (AC0 (iii), (iv)) say 11b.6 builds it with its first
consumer and name the three rulings it meets there (the name form, `-173` (d), with `-416` §2 confirming In Memoriam keeps its
rules; dates — no ruling, a Panel question; the matrix scope that keeps the family's words and photo off In Memoriam) and the
three-way disagreement on what the component is (UX-DR17 `epics.md` :414 · UX §11 :1947 · the epic's single roll entry — MV1)
**And** the 11b.6 note records that its own epic AC's *"first-name + last-initial + dates + district"* goes beyond PRD FR-78
(`prds/prd-TWT-2026-05-22/prd.md` :1131: *"First-name + last-initial + school + district + designation. Respectful framing."* —
⛔ no dates). It also records that `school` / `designation` are **Pariwar-selected directory attributes** (the 11b.6 RECONCILED
2026-08-19 block; `-132` R1/R7) that are ineligible **as RBAC scope** (`-133` cl.1, `-132` cl.3) — ⛔ not a bar on display — a
planning-text gap for 11b.6 to resolve, ⛔ not resolved here.

### AC8 — `<KinshipLattice>` is placed, ⛔ not built (MV2)
**Given** MV2 (a)
**When** the story closes
**Then** ⛔ no kinship column, contract, i18n key, matrix field or component exists; row `11b-5a-kinship-capture-and-lattice` is
`backlog` (AC0); `deferred-work.md` 11b.4a item (6) and 11b.4 item (2) each gain a dated line re-pointing their Trigger to row
`11b-5a`'s create-story — ⛔ neither is closed, ⛔ neither is deleted
**And** the prototype under `apps/mobile/components/shradhanjali/` is byte-unchanged.

### AC9 — The app is untouched (MV6)
**Given** MV6 (b)
**When** the diff is reviewed
**Then** ⛔ no file under `apps/mobile` or `apps/admin` changes; `deferred-work.md` 11b.4 item (12) gains ONE dated line
disposing of **all six** departures under its Trigger *"Story 11b.5 / a Story 0.9 conversation"*: (i) *"`<PortraitFrame>` in upload
mode"* — re-deferred to a new Trigger (*"the story that bridges `@twt/tokens` into the mobile theme (11a.5 D6(c)), or a Story 0.9
conversation"*), MV6; (ii)–(vi) the HOME entry, the reason copy, the absent SMS / email resume link, the rate-limit case and the
*"Saved"* hint — 11b.5 does ⛔ not touch them ⇒ their Trigger narrows to *"a Story 0.9 conversation"* alone. The item is ⛔ not
closed.

### AC10 — The four doc-blocks that name this story are re-pointed by APPENDED dated lines
**Given** footgun 9 (sibling stories leave notes for this one in code)
**When** the story closes
**Then** each file gains one dated line — `FamilyMemorial.astro` two (:3, :14); five lines in four files — and ⛔ none loses a line: `FamilyMemorial.astro` :3 (*"Story 11b.5 later lifts this markup…"*
— now: the frame is `<PortraitFrame>`; `<MemorialRecord>` is 11b.6's, MV1) **and** :14 (*"THE PHOTO: the UX FuneralFrame as nested
wrappers …"* — now: the frame's markup lives in `PortraitFrame.astro`; this file keeps the `<figure>` and the gating);
`apps/public/src/lib/sahyog-vivran-render.ts` :30 (*"the memorial visual components (Story 11b.5) — `backlog`"*);
`apps/public/src/pages/sahyog-vivran/[driveToken].astro`'s header :29 (*"the memorial components (11b.5, `backlog`)"*);
`apps/public/src/pages/sahyog.astro`'s `@twt/ui` fence :917–919 — the line goes **inside** the CSS comment's `/* … */` and reads
as Trap 6 gives it (the fence **stands**, `-219` cl.5; 11b.5 was a named consumer and did ⛔ not take `@twt/ui`, MV3)
**And** `deferred-work.md`'s *"FOUR PRODUCERS THE EPIC AC NAMES THAT DO NOT EXIST"* item gains a dated line for the memorial
components (frame built; record → 11b.6; lattice → 11b-5a), ⛔ not closed.

### AC11 — Tests, each shown RED against a mutant first
**Given** the project's testing standard (Dev Notes)
**When** the tests are written
**Then** there are: (1) `apps/public/tests/portrait-frame-source.test.ts` — the nested wrappers in order, the exact style strings,
`alt={alt}` always present, `loading="lazy"` + `decoding="async"`, ⛔ no `class=`, ⛔ no `<style`, ⛔ no `box-shadow` / `outline` /
`border-radius`, ⛔ no `set:html` / `innerHTML`, ⛔ no `visibilityOf`, ⛔ no `import`; (2) `family-memorial-source.test.ts` re-pinned
(Trap 2 — the paragraph regex loosened to `style="white-space: pre-wrap;[^"]*"`; the `alt={plan.alt}` pin unchanged) with
`PortraitFrame.astro` on `TOUCHED` (Trap 3), a **no-`class=`** assertion for both files and the AC4 literal allow-list;
(3) `apps/public/tests/memorial-token-references.test.ts` — every `var(--x)` in the two components exists in `rootTokenCss()`'s
output, **and** that output contains `--border-funeral-frame: 2px;` (Task 2.3); (4) `packages/tokens` tests (AC2); (5) the
built-server render spec: the frame regex rewritten (AC3), the three added assertions of AC3 (the two `data-field`s; h2 < figure
< first p), its other assertions untouched; (6) a new render-spec leg with `memorialState = { words: WORDS, photo: { altText: '' } }`
(the page's response guard `isFamilyMemorial` accepts it — `sahyog-vivran.server.ts` :221) asserting a bare / empty `alt` on the extracted `<img …>` (AC1)
**And** each new or rewritten assertion is shown RED against a named mutant — a dropped wrapper (AC3 regex); `class="mt-3"`
re-added (no-`class=`); `var(--border-funeral-frme)` (token resolution); `alt={alt || undefined}` (leg (6)); a `#1a1a1a` literal
(allow-list); `data-field` removed from the `<figure>`, and from the `<section>`, and the `<h2>` moved below the `<figure>` (AC3's three added
assertions) — and the mutant is recorded in the Debug Log.

### AC12 — Recorded, ⛔ not resolved
**Given** the gaps this story does not close
**When** it closes
**Then** `deferred-work.md` gains a section *"Deferred from: story 11b-5 …"* with, each with a Trigger: (1) the page-wide inert
utility classes on `[driveToken].astro` incl. 11b.12's focus ring (unless MV5 (c)) — noting that the classes describe a card on
every section, so the fix must choose cards or the UX's ruled rhythm (:505) for the whole page at once; (2) Story 0.9 — the
frame's look and the section's spacing un-attested (carries 11b.4a item (10)), and ⚠ any Row 41 record that observes the rendered
memorial section — leg (o)'s TalkBack / VoiceOver check of the public page, leg (d)'s Story 0.9 conversation — must be taken on the
page as 11b.5 renders it; (3) the UX's 1:1 default and 120 / 180 / 240 pt sizes ⛔ not built (MV4); (4) the third frame drawing
in `ClaimProxyFlowShell.tsx` (a hex literal) — Trigger: the mobile tokens bridge; (5) the decorative empty `alt` (AC1): when the
family's description was left out the portrait is ⛔ not announced at all, against UX :1959 — Trigger: Story 11b.8's
accessibility audit or Story 0.10; ⛔ no copy invented here
**And** a dated line under the Story 0.9 section's `grief-grammar-black-bordered-portrait` item, which names this story: the
`<PortraitFrame>` built here is the frame that verdict would re-scope; `<KinshipLattice>` moved to 11b-5a
**And** 11b.4a item (9) (*"Story 11b.5 refactors this markup … into `<MemorialRecord>` / `<PortraitFrame>`"*) gains a dated line:
**discharged IN PART** — `<PortraitFrame>` built (this story's commit); `<MemorialRecord>` re-pointed to 11b.6 (MV1) — ⛔ not
closed whole, ⛔ not deleted.

### AC13 — Nothing else moves
**Then** `git diff --name-only $(git merge-base HEAD origin/main)..HEAD` lists only: the story file, `sprint-status.yaml`,
`.decision-log.md`, `epics.md`, `deferred-work.md`, `friction-budget.md` (Task 4.3),
`packages/tokens/{src/tokens.ts, src/theme.css, tests/tokens.test.ts}`, `apps/public/src/components/{PortraitFrame,FamilyMemorial}.astro`,
the other three doc-block files of AC10 (`sahyog-vivran-render.ts`, `[driveToken].astro`, `sahyog.astro`),
`scripts/sahyog-vivran-financial-truth/check.ts` (Task 3.5), and the `apps/public` tests of AC11
(`portrait-frame-source.test.ts`, `family-memorial-source.test.ts`, `memorial-token-references.test.ts`,
`integration/public-pages/family-memorial-render.spec.ts`) — plus anything an MV answer other than the recommended one adds, named
in the Completion Notes.

### AC14 — Verified on a fresh database and a built server
**Then** `pnpm ci:local` passes on a fresh `twt_dev` database in its own container (memory: the DB must be NAMED `twt_dev`; set
`DATABASE_URL` on the command — the shell's `:5432` leaks into the pre-push hook) — 36 / 36, or every red named and shown
unrelated by a green re-run alone
**And** the built-server proof (11b.4a Trap 16, kept although no `@twt/ui` is added) is shown by `family-memorial-render.spec.ts`
running and **passing, ⛔ not skipped**. ⚠ That spec does ⛔ not run `pnpm build` / `dist/server/entry.mjs`: it calls Astro's
programmatic `build({ root, outDir })` into `apps/public/node_modules/.cache/render-proof-*` and spawns
`<outDir>/server/entry.mjs` (:90–103); it is DB-gated (`describe.skipIf(!hasDatabase)`, :57) and runs only in `ci:local`'s
`integration-tests` step ⇒ record in the Debug Log the spec's pass count from that step (or a direct run with
`DATABASE_URL=<story port>` on the command), showing it ran. Additionally run `pnpm --filter @twt/public build` once and record that
the production build succeeds.

## Tasks / Subtasks

Each code Task ends with **Done when** — the named test(s), each shown RED against a mutant first.

- [ ] **Task 0 — Re-verify and get answers (AC0)**
  - [ ] 0.1 `git fetch origin`; `git merge-base HEAD origin/main`; `git diff --stat 282bdd33..origin/main -- packages apps scripts friction-budget.md`;
    rebase onto `origin/main` (it HAS moved — 52 commits at `8dd3e623`) and re-pin `baseline_commit`; at the rebase relabel this
    branch's `2026-10-29b` ledger entry to the next free letter in BOTH ledgers (header NUMBERS; G4-W1). Re-take the NUMBERS across
    every branch and worktree. Check STOP 1–7. Lettered checks: (a) `FamilyMemorial.astro` matches the "What already EXISTS" row; (b) `border-funeral-frame` has
    no reader (`grep -rn "funeral-frame" packages apps scripts`, excluding `node_modules` / `dist`); (c) `apps/public/package.json`
    has no `@twt/ui` / Tailwind; (d) the `-219` cl.5 fence sentence in `sahyog.astro`; (e) `deferred-work.md` 11b.4a items (6),
    (9), (10) and 11b.4 items (2), (12) still read as quoted here; (f) `11b-6` still `backlog`; (g) the four AC10 doc-blocks; (h)
    ⭐ **Trap 4 by build, not grep:** `pnpm --filter @twt/public build`, open the emitted CSS under `apps/public/dist/client/_astro/`
    and confirm no rule matches `.mt-6`, `.rounded`, `.text-sm`, `.list-none` — record the file names and the result in the
    Debug Log (if a rule DOES exist, STOP: Trap 4 and MV5 are wrong). ⚠ A fresh worktree has no `node_modules`: `pnpm install`
    first. (i) `scripts/sahyog-vivran-financial-truth/check.ts` still registers `FamilyMemorial.astro` by hand (Task 3.5).
    (j) `scripts/friction-budget/lib.ts` `MEMBER_FACING_PREFIXES` still includes `'apps/public/'` (Task 4.3).
  - [ ] 0.2 Put MV1–MV6 to BigDev (Questions below); append BigDev's answers verbatim, dated, under each MV and in the Questions list.

- [ ] **Task 1 — Governance and records (AC0, AC7, AC8, AC10, AC12)**
  - [ ] 1.1 Re-take the next free id; commit decision `-NNN` (author-commit, MV1–MV6 as answered; §0: no Panel question — G5/G6
    routed, ⛔ not asked; MV3 supersedes `-154` cl.6 in part and declines the fence's reserved slot as **our** choice, Trap 6; the
    re-homing of `-391`'s kinship Not-covered line to row `11b-5a`, AC0) **alone**
    ([[feedback_governance_commits_precede_implementation]]). Substitute the committed id for every `-NNN` in this file.
  - [ ] 1.2 Records commit — every item of AC0 (i)–(vi), one by one:
    (i) dated pointer under `-154`; (ii) dated pointer under `-391`; (iii) `epics.md` `### Story 11b.5` dated note + the 11b-5a
    annotation (if MV2 (a)); (iv) `epics.md` `### Story 11b.6` dated note carrying AC7's content (the three rulings incl. `-416` §2,
    the three-way `<MemorialRecord>` disagreement, the FR-78 no-dates gap and the `school` / `designation` RBAC-not-display point) and
    MV2's STOP line (if MV2 (a)); (v) `sprint-status.yaml` row `11b-5a-kinship-capture-and-lattice: backlog` with its comment block
    (if MV2 (a)); (vi) `deferred-work.md`: the AC8 re-pointing lines, the AC9 item-(12) line, the new 11b.5 section's items (1)–(5)
    and the Story 0.9 grief-grammar dated line (AC12) — the discharge line for 11b.4a item (9) waits for Task 4.2. ⚠ Prepend nothing to
    `sprint-status.yaml` with a one-liner (memory: the naive rewrite truncates the 2.7 MB file).
  - **Done when:** both commits exist, alone and in order, before any code; `yaml.safe_load` of `sprint-status.yaml` parses.

- [ ] **Task 2 — Tokens (AC2)**
  - [ ] 2.1 `tokens.ts`: `border-funeral-frame` `'4px'` → `'2px'` with MV4's comment verbatim (the UX source; *"placeholder
    until P0-2, like its group"* kept). ⛔ No new token (Trap 7, MV4).
  - [ ] 2.2 `pnpm --filter @twt/tokens tokens:generate-theme`; the identity arrays in `tokens.test.ts` stay unchanged; assert the
    value (`'2px'`) in a token test.
  - [ ] 2.3 In `apps/public/tests/memorial-token-references.test.ts` (AC11 (3)): `rootTokenCss()` contains
    `--border-funeral-frame: 2px;`.
  - **Done when:** the token tests and `tokens-theme-check` pass; each new assertion was RED first.

- [ ] **Task 3 — `<PortraitFrame>` and the section (AC1, AC3, AC4, AC6)**
  - [ ] 3.1 Write `apps/public/src/components/PortraitFrame.astro` exactly as Dev Notes § *The exact markup* (AC1).
  - [ ] 3.2 `FamilyMemorial.astro`: exactly as Dev Notes § *The exact markup* — `import PortraitFrame from './PortraitFrame.astro';`;
    `<PortraitFrame src={photoSrc} alt={plan.alt} />` inside the kept `<figure data-field="family_memorial_photo">`; every class →
    the static style strings given (MV5 (a)); `dir="auto"` stays the first `<p>` attribute and `white-space: pre-wrap;` the first
    declaration (Trap 2); ⛔ nothing in the gating is touched.
  - [ ] 3.3 Tests — AC11 (1)–(3), (5), (6): `portrait-frame-source.test.ts` (new), `family-memorial-source.test.ts` (re-pin +
    `TOUCHED` + no-`class=` + allow-list), `memorial-token-references.test.ts` (new), `family-memorial-render.spec.ts` (frame regex,
    the three added assertions, the empty-`alt` leg) — each RED against its named mutant (AC11).
  - [ ] 3.4 Under MV5 (c) only: the page-wide classes → inline token styles, the `<summary>` focus ring as a real rule, and a
    keyboard-focus assertion. (Skip under (a).)
  - [ ] 3.5 Register `{ path: 'apps/public/src/components/PortraitFrame.astro', renderPath: true }` in
    `scripts/sahyog-vivran-financial-truth/check.ts` beside `FamilyMemorial.astro` (*"THE SCOPE TAX, PAID BY HAND"* — its safeguard
    does ⛔ not walk `src/components`, so an unregistered file on the render path is never scanned and the gate stays green
    regardless). Show the gate RED on a mutant it actually matches — its rule (3) fires only on `*` / `*=` with a COUNT_OPERAND on one
    side and a PER_MEMBER_AMOUNT name or a numeric literal on the other (`lib.ts` :311–342); rules (1) / (2) fire on event-type
    literals / prohibited imports; `.astro` is re-shaped into one TSX program, :190–210, e.g.
    `{confirmedContributionCount * fixedAmount}` in `PortraitFrame.astro` — ⚠ a mutant it does ⛔ not match proves nothing. Revert.
  - **Done when:** the four test files and the financial-truth gate pass; the mutants are in the Debug Log; `git diff` shows ⛔ no
    AC6 file.

- [ ] **Task 4 — Doc-blocks, discharge, friction declaration (AC10, AC12, AC13)**
  - [ ] 4.1 Append the dated lines of AC10 (five lines in four files — `FamilyMemorial.astro` gets two; the `sahyog.astro` line goes
    INSIDE its `/* … */`); the `FOUR PRODUCERS` item's dated line.
  - [ ] 4.2 `deferred-work.md` 11b.4a item (9): the discharge line naming the Task 3 commit.
  - [ ] 4.3 ⚠ **`friction-budget.md` — the AC-4 declaration gate is ⛔ not optional:** `scripts/friction-budget/lib.ts` :453 lists
    `'apps/public/'` in `MEMBER_FACING_PREFIXES`, and `evaluateDeclaration` (:525–600) FAILS with basis `unchanged` when an
    `apps/public/` path changes and `friction-budget.md` does not; `ci:local` runs it (`ci-local.sh` :69) against `git merge-base
    HEAD origin/main`. Append a block in the 11b.12 precedent's shape (`friction-budget.md`, *"Story 11b.12 disposition
    (declaration affirmed — ⛔ NO new row, ⛔ no row retired, and ⛔ no row amended)"*): **Story 11b.5 disposition** — the memorial
    frame becomes a component and the section is spaced; ⛔ no new step, wait, decision or data asked of anybody; ⛔ nothing gated;
    `page_weight_bytes` own-bytes unchanged (inline styles, Trap 5). ⚠ 5.14 appended to this file on main — rebase keep-both.

- [ ] **Task 5 — Verify and close (AC5, AC13, AC14)**
  - [ ] 5.1 `pnpm --filter @twt/public build` succeeds (recorded); the built-server spec runs and passes, ⛔ not skipped (AC14 —
    it builds and serves its own copy).
  - [ ] 5.2 `pnpm ci:local` on a fresh `twt_dev` (own container; `DATABASE_URL` on the command) — incl. `friction-budget` green.
  - [ ] 5.3 AC13's `git diff --name-only`; File List; Change Log; row `ready-for-dev` → `in-progress` → `review`; one combined
    ledger entry (both ledgers — the top comment lines and the `last_updated: >-` block).

## Dev Notes

### The shape of the change

```
packages/tokens  border-funeral-frame 4px → 2px (placeholder → the UX's value; ⛔ no new token)   (theme.css regenerated)
        │  rootTokenCss() — unchanged code, new output
        ▼
apps/public/src/components/
  FamilyMemorial.astro   (the section — gating, heading, order, paragraphs; utility classes → inline token styles)
     └─ <figure data-field="family_memorial_photo">
           └─ PortraitFrame.astro  NEW  { src, alt } → div → div → img      (dumb; asks the matrix nothing)

NOT BUILT HERE:  <MemorialRecord> → Story 11b.6 (MV1)   ·   <KinshipLattice> → row 11b-5a (MV2)   ·   RN frame (MV6)
UNCHANGED:       wire · matrix · API · photo route · i18n · @twt/ui · apps/mobile · apps/admin
```

### The exact markup (MV4 (a) + MV5 (a)) — ⭐ the ONE place the geometry and the style strings are stated
Static `style` strings only (⛔ never `style={{…}}` — Trap 5); literals in the markup (⛔ no interpolated frontmatter constants —
the source pins read the markup). Under MV5 (a′) the section's string becomes
`margin: var(--space-block) 0 0; border-top: var(--border-hairline) solid var(--color-rule-hairline);`; otherwise exactly:

```astro
---
// <PortraitFrame> — the Trust's one funeral frame around a family's approved photo (Story 11b.5; `-NNN` MV3 / MV4; `-412` MP1).
// ⭐ UX §FuneralFrame: nested wrappers div → div → img, "the pattern, not a typed atom"; ⛔ never box-shadow / outline (Trap 8).
// ⭐ The border is the `border-funeral-frame` token; the 6pt inset, the 4:5 box and the 20rem cap are component constants (MV4 —
// ⛔ no fifth `space` token). ⭐ Dumb: it asks the matrix ⛔ nothing — the caller gates and passes `alt` as approved ('' = left out).
// ⭐ Body-only: ⛔ nothing here reaches <head>, Open Graph or a link preview.
interface Props {
  src: string;
  alt: string;
}

const { src, alt } = Astro.props;
---
<div style="border: var(--border-funeral-frame) solid var(--color-ink-primary); padding: 6pt; max-width: 20rem;">
  <div style="aspect-ratio: 4 / 5; width: 100%;">
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      style="width: 100%; height: 100%; object-fit: contain;"
    />
  </div>
</div>
```

`FamilyMemorial.astro` after the change (frontmatter: add `import PortraitFrame from './PortraitFrame.astro';`; header comment gains
the AC10 dated lines; everything else in the frontmatter unchanged):

```astro
{plan.section && (
  <section aria-labelledby="sv-family-memorial-heading" style="margin: var(--space-block) 0 0;" data-field="family_memorial_words">
    <h2 id="sv-family-memorial-heading">{heading}</h2>
    {plan.photo && (
      <figure style="margin: var(--space-row) 0 0;" data-field="family_memorial_photo">
        <PortraitFrame src={photoSrc} alt={plan.alt} />
      </figure>
    )}
    {memorial.familyMemorialWords.map((paragraph) => (
      <p dir="auto" style="white-space: pre-wrap; margin: var(--space-row) 0 0;">{paragraph}</p>
    ))}
  </section>
)}
```
Token values at the pin (all emitted by `rootTokenCss()`): `--space-block` 16px · `--space-row` 8px · `--border-funeral-frame` 2px
(after Task 2) · `--color-ink-primary` #1a1a1a · (MV5 (a′) only) `--border-hairline` 1px, `--color-rule-hairline` #d8d4c8.

### Named identifiers (⛔ never invent a synonym — footgun 14)
`PortraitFrame` (component; UX public label *Funeral Frame* — ⛔ never `FuneralFrame` as an identifier, it is the pattern's name) ·
`FamilyMemorial` (the section — ⛔ not renamed) · `planFamilyMemorial` · `SahyogVivranFamilyMemorialView` ·
`SAHYOG_VIVRAN_FAMILY_MEMORIAL_FIELD_IDS` · `border-funeral-frame` · `rootTokenCss` · `tokens:generate-theme` ·
`family_memorial_words` / `family_memorial_photo` / `family_memorial_photo_alt_text` (matrix ids) · row
`11b-5a-kinship-capture-and-lattice` (new, MV2 (a)).

### Rulings index (the binding quotes sit where they are used — ⛔ not repeated here)
- **`-412`** (author-commit) MP1 (lift the markup; frame un-attested — Trap 1), MP3 (the join in `apps/api` — MV3), MP5 (the 4:5
  bound — MV4) · **`-411`** (Trustee-ratified) item 3 (no marker), item 6 (the description is the `alt`) · **`-391`**
  (Trustee-ratified) item 2 (child names; living adults as written — G6, MV2), item 7, Q1 A, Not-covered kinship line (AC0) ·
  **`-398`** MA2 (author-commit; kinship ⛔ not collected — MV2) · **`-173`** (Trustee-ratified; a transcription — *"⛔ Do ⛔ not
  seed a placeholder `clause_versions` row"* is a code doc-block it quotes, and (d) is the entry's recorded limit on its reach — G5)
  · **`-416`** §2 (Trustee-ratified 2026-10-29, 5.14 — web pages' `-160` / `-173` basis not moved; In Memoriam keeps its rules — MV1)
  · **`-154`** cl.6 (author-commit — superseded in part by MV3) · **`-219`** cl.5 (Trustee-ratified — the fence that NAMES 11b.5,
  Trap 6) · **`-162`** cl.3 (Trustee-ratified — family material authorised at submission ⇒ ⛔ no consent gate on the photo; the
  epic's *"consent-gated"* is superseded by it, ⛔ not re-introduced) · **`-133`** cl.1 / **`-132`** cl.3 (RBAC scope only — AC7).

### Testing standards
- `apps/public` Vitest **cannot render `.astro`** (Vitest 2 vs Astro 6 — 11b.4a Debug Log). Component properties are pinned by
  **source** tests (comments stripped — reuse `family-memorial-source.test.ts`'s `code()` helper, or copy it with attribution) and
  rendered behaviour by the **built-server** spec (`apps/public/tests/integration/public-pages/family-memorial-render.spec.ts`,
  DB-gated; it builds and serves its own copy — AC14). ⛔ Do not try to make Vitest render Astro. Astro is `6.4.8`; ⛔ no new
  library.
- Identity arrays, ⛔ never counts (11b.3b's lesson: *"update by +2"* was unexecutable).
- RED first, against a named mutant, recorded in the Debug Log ([[feedback_gate_scope_semantic_coverage]] — green proves nothing).
- `ci:local`: unit concurrency 4 flakes admin and mobile on this machine; a red that goes green alone is named, ⛔ not hidden
  (memory: ci:local oversubscription).

### Previous-story intelligence (11b.4a, `done`, PR #307)
- Built the section, the photo route (`sharp` 0.34.5, one 960 × 1200 JPEG variant), the take-down, ADR-0043. Five code-review
  passes; the RR6 lesson — pin each verdict to **its own** key, ⛔ not merely that the calls exist — is why Trap 2 exists.
- Its Trap 16 (`@twt/ui` needs `noExternal`, only the built image crashes) is why AC14 keeps the built-server run.
- Its residuals that stay residual here: RT1 (the photo outlives a bad envelope), RR20 (an undecodable photo leaves a broken
  slot), R29, R32, edge cache / Traefik (Row 41 (p), (q)). ⛔ None is this story's.
- Row 41 (`family-memorial-authorship-live`) stays **open**; the switch `MEMORIAL_AUTHORSHIP_ENABLED` stays OFF — this story
  changes no criterion. "Done" ≠ live ([[project_not_in_production_merge_is_not_golive]]).

### Project Structure Notes
- **NEW:** `apps/public/src/components/PortraitFrame.astro` · `apps/public/tests/portrait-frame-source.test.ts` ·
  `apps/public/tests/memorial-token-references.test.ts`.
- **UPDATE:** `apps/public/src/components/FamilyMemorial.astro` · `packages/tokens/src/{tokens.ts,theme.css}` ·
  `packages/tokens/tests/tokens.test.ts` · `apps/public/tests/family-memorial-source.test.ts` ·
  `apps/public/tests/integration/public-pages/family-memorial-render.spec.ts` · `scripts/sahyog-vivran-financial-truth/check.ts`
  (one `SCAN_FILES` entry) · dated lines in
  `apps/public/src/lib/sahyog-vivran-render.ts`, `apps/public/src/pages/sahyog-vivran/[driveToken].astro`,
  `apps/public/src/pages/sahyog.astro` · records (`.decision-log.md`, `epics.md`, `deferred-work.md`, `sprint-status.yaml`,
  `friction-budget.md`).
- **⛔ NOT CHANGED:** `packages/ui` · `packages/contracts` · `apps/api` · `apps/mobile` (incl. the `shradhanjali` prototype and
  `ClaimProxyFlowShell.tsx`) · `apps/admin` · `microcopy.yaml` (no new copy, no new mobile file) · any i18n catalogue.
- ⚠ Flat `src/components/` today (three files) — ⛔ no `memorial/` sub-folder for one new file.

### References
- `_bmad-output/planning-artifacts/epics.md` — `### Story 11b.5` (+ its 2026-10-27 dated note), `### Story 11b.6`, the Epic 11b
  RECONCILED / RULED blocks (C-1, C-4)
- `_bmad-output/planning-artifacts/ux-design-specification.md` — §FuneralFrame (*"nested wrappers … The pattern, not a typed
  atom"* :704, :635), the memorial visual grammar (:462–476 — *"not box-shadow"* :471; kinship :475), §5 ruled rhythm :505,
  `border-funeral-frame` composition :1174, §11 `<MemorialRecord>` :1947 / `<PortraitFrame>` :1955–1960 / `<KinshipLattice>`
  :1962–1968, preview parity :2156, Pattern 4
- `_bmad-output/planning-artifacts/architecture.md` — Component-layer boundary (second-consumer rule); §4.11.2 dated note (MP5)
- `_bmad-output/implementation-artifacts/11b-4a-family-memorial-public-render.md` (MP1, Traps 12/14/16, AC3, AC5, AC16)
- `_bmad-output/implementation-artifacts/11b-4-memorial-authorship-surface-family-writes-the-story.md` (MA1, MA2, MA8)
- `.decision-log.md` — `-416`, `-412`, `-411`, `-398`, `-391`, `-219`, `-173`, `-162`, `-154`, `-133`, `-132`
- `friction-budget.md` (the 11b.12 disposition — the shape for Task 4.3) · `scripts/friction-budget/lib.ts` :453, :525–600
- `deferred-work.md` — 11b.4a items (6), (9), (10); 11b.4 items (2), (12); the FOUR PRODUCERS item; Story 0.9 grief-grammar
- `apps/mobile/components/panchayat/tokens.ts` header (the D6(c) mobile-tokens re-trigger, MV6)
- `docs/launch-gate-inventory/inventory-roster.md` Row 41 (unchanged)

### ❓ Questions for BigDev (Task 0.2)
1. **MV1** — `<MemorialRecord>`: (a) built by 11b.6 with its first consumer *(recommended)* · (b) rename `FamilyMemorial` · (c) build
   with always-null identity props?
2. **MV2** — Kinship: (a) a new row `11b-5a-kinship-capture-and-lattice` owns capture + render + the Panel purpose question
   (written at its Task 0; a STOP in 11b.6's `epics.md` note forces its creation first) *(recommended)* · (b) this story writes the Panel note now and builds nothing · (c) build against fixtures · (d) drop kinship?
3. **MV3** — Shape: (a) an Astro `<PortraitFrame>`, the token as the shared layer, ⛔ no `@twt/ui` in `apps/public` — superseding
   `-154` cl.6 in part for 11b.5 *(recommended)* · (b) a `@twt/ui` geometry module + the dependency · (c) `platform-adapters`?
4. **MV4** — Geometry: (a) keep 2 px / 6 pt / 4:5 / 20 rem; the border from its token (`border-funeral-frame` 4 px → 2 px), the
   inset / ratio / cap as named constants *(recommended)* · (b) the UX's 1:1 · (c) leave the token, keep the literal · (d) a new
   `space-funeral-frame-inset` token (extends UX-DR9 / ADR-0016's four-token set)?
5. **MV5** — The inert classes: (a) the memorial section gets **spacing only** (⛔ no card — UX ruled rhythm), the page-wide defect
   (incl. 11b.12's focus ring) recorded with a Trigger *(recommended)* · (a′) (a) + one hairline rule above the section · (a″) the
   card the classes describe · (b) keep them · (c) fix the whole page here?
6. **MV6** — The app's preview: (b) not in this story; re-defer the upload-mode frame *(recommended)* · (a) an RN frame aligned to
   `ink-primary` through a local map (fires the 11a.5 D6(c) mobile-tokens trigger)?

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created (bmad-create-story, 2026-10-29).

### File List

## Change Log

| Date | Version | Change |
|---|---|---|
| 2026-10-29 | v1.0 | Created by `bmad-create-story 11b-5` at `282bdd33` (worktree `.claude/worktrees/11b-5-memorial-visual-components`). Three read-only traces (the 11b.4 / 11b.4a stories; the code; the UX spec + decision log). MV1–MV6 PROPOSED; ⛔ no decision entry, ⛔ no Panel note, ⛔ no code. Row `backlog` → `ready-for-dev`. |
| 2026-10-29 | v1.1 | Fresh-context fact-check (read-only; ~60 claims, 16 findings) applied — numbers, MV4's inset constant, Trap 2's real broken pin, the bare `alt`, MV5's full margins, Task 3.5, 11b.4a item (9) IN PART, 11b-5a's trigger, FR-78. |
| 2026-10-29 | v1.2 | `bmad-create-story validate 11b-5` against `origin/main` `8dd3e623` (three parallel read-only verifiers: code / governance / adversarial design; 30 findings — 7 critical, 15 should-add, 4 optimisations, 4 LLM — all applied on BigDev's "all"). Critical: NUMBERS re-taken (`-416`…`-419` = 5.14 ⇒ next `-420`, written `-NNN`; ledger `-29b` collides with 6.32 ⇒ relabel at rebase, G4-W1); Trap 6 / MV3 corrected — `-219` cl.5's fence NAMES 11b.5 as a consumer, MV3 declines it as our choice; MV5 (a) is spacing only, ⛔ no card (UX ruled rhythm :505, no rounded corners :462; options (a′) / (a″) added); Task 4.3 — the friction-budget AC-4 declaration `ci:local` enforces on `apps/public/`; AC14 / Task 5.1 — the render spec builds its own copy and is DB-gated; AC7 — `school` / `designation` are RBAC-ineligible, ⛔ not display-barred; inverted ⛔ glyphs fixed and the register's rule changed. Also: the exact markup stated once in Dev Notes; `solid` + no-radius in AC4; the empty-`alt` render leg and its decorative-`alt` gap (AC12 (5)); AC3's three added assertions; Tasks 1.1 / 1.2 name every AC0 record; `-416` §2, `-412` MP3, `-391` item 2's living-adults sentence cited; 11b-5a's STOP in 11b.6's note and its Task-0 routing note; AC9 disposes all six item-(12) departures; the token comment keeps "placeholder"; the `sahyog.astro` line inside its CSS comment; Row 41 (o) / (d) post-date note; Rulings cut to an index; Git intelligence / Latest tech dropped. |
