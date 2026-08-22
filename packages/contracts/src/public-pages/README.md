# `public-pages/` — the FR-74 Public-vs-Private matrix + PII scrape gate

The consumed contract + verification engine for the **FR-74 PII scrape CI gate**
(Story 1.16b). The matrix declares, per public-page surface and per renderable
field, exactly one of four visibility tiers; the gate asserts no field renders
above its tier on a surface a given viewer may see, and that no naked PII leaks
into a public HTML render.

Authority: PRD FR-74 (L1030-1040) · Architecture Principle #7 (L292-293) · §2.7
(L1522-1524, the matrix is the canonical tier-classification authority) · Story
11a.1 AC (epics L3586-3620, the 4-tier model + the leak rules). ADR:
`docs/adr/ADR-0013-pii-scrape-ci-gate.md`.

## Why a tier model at all — the transparency this project means

Load-bearing for Epic 11a **and** 11b, and easy to get backwards.

TWT's transparency commitment is **operational and governance visibility**:
auditability, published rules, contribution transparency, accountable governance.
Anyone may read the Niyamavali, read the Terms, and see how the institution
conducts itself. That is the point of the `public` tier, and it is why the
Niyamavali and T&C surfaces classify every field they render as `public` without
apology.

⛔ **It is NOT mass exposure of member identities.** A trust that publishes its
rules is transparent; a trust that publishes its members is something else. The
four tiers exist to hold that line — to let institutional conduct be fully public
while member data stays behind the tier its sensitivity earns.

⚠ The Member Directory sits exactly on that line, and this file does not pretend
otherwise. The Trustee Panel ruled (`2026-08-19-135` cl.7(c), `-136`) that members'
full legal names are published on an unauthenticated page. The matrix records that
as an **attributed exception**, bounded to one field on one surface class, ⛔ not
as a general relaxation — and it carries the ruling's own open findings with it:
DPDPA exposure with legal counsel not engaged (`-136` cl.5), and the finding that
the Niyamavali — the rulebook a member actually reads — does not record this
publication anywhere (`2026-08-20-140` cl.7). ⛔ Neither is closed.

## ⚠ What this gate does NOT prove — read this first

**Per-Pariwar directory attributes are database rows, authored at runtime by tenant
admins** (`pariwar_custom_field_definitions`). This gate cannot read them and does
not pretend to. It proves nothing about which attributes any tenant has defined,
what tier they declared, or whether one of them renders somewhere it should not.

A CI gate that needed a live tenant database would not be a CI gate. So this one
asserts only what is provable from committed source, and the matrix carries a
**rule** for those attributes rather than a row per attribute — a default tier, a
ceiling, and a pointer to where the real declaration lives. ⛔ Do not widen any leg
here to reach a tenant database.

**Five more things it does not prove**, each worth naming because each is a real
gap and not a technicality:

1. **A field rendered from a variable that never enters the render model is not
   seen.** Snapshot field sets are derived from the render model's own keys
   (ruling D3(a)), so a value computed inline in `.astro` frontmatter and
   interpolated straight into the template is invisible to the tier-leak leg. This
   is the accepted cost of D3(a) over an AST scan of the templates. It is bounded
   by the convention these pages already follow — all display logic lives in the
   pure `.ts` module, the `.astro` file is a thin wrapper — so a field bypassing
   the model is a convention violation before it is a gate evasion.
2. **A field id names what RENDERS, which is a claim about the template.** The
   clearest case is `/terms`: `pinnedClauseIds` maps to `tc_pinned_clause_count`
   because the HTML emits the count, not the UUIDs. If `renderTcHtml` ever started
   emitting the ids, this mapping would not notice — the naked-PII leg would, since
   it scans real HTML.
3. **`clause_payload_display_fields` is ONE id for a DYNAMIC key set.** Niyamavali
   clause payloads differ per clause and per Pariwar, so no committed file can
   enumerate their keys. What protects the contents is the renderer's opaqueness
   (freeze row 14 — display rendering, never rule interpretation) plus the
   naked-PII leg.
4. **⛔ IT PROVES NOTHING ABOUT CLOUDFLARE, OR ANY EDGE.** (Story 11a.2.) The
   cache-policy leg reconciles a surface's declared `cache_policy` against the
   `Cache-Control` its page source actually sets — that is, **what the origin
   emits**. The edge is not in this repo, and edge/WAF selection is contingent on
   DPDPA legal review (architecture §5.8a). A green cache leg means the origin's
   instructions are correct and declared; it does **not** mean any CDN honoured
   them, and ⛔ it must never be cited as if it did.
5. **The pagination leg proves BINDING, not BEHAVIOUR.** (Story 11a.2.) It asserts
   that a surface declaring `paginated: true` has a page which calls
   `parsePageParams()`. ⛔ It does not prove the page honours the rejection — a page
   could call the parser and ignore the result. That residual is covered by the
   page's own tests, and it is named here because a leg whose limit goes unstated
   is a leg that gets over-cited.

   ⚠ **And the reason this leg exists at all is worth stating plainly: FR-91 was
   NOT enforced on `apps/public` before Story 11a.2.** The Story 1.14
   forced-pagination guard has two halves and both are scoped to `apps/api` — the
   structural half *"walk[s] the committed OpenAPI surface"*, which Astro routes do
   not emit. ⛔ **Do not cite Story 1.14 as coverage for this surface.** It is not.
   Verified at `66ae30d`, not inherited.

## The layers — where the runtime prohibition actually lives

The gate is one layer of several, and it is the one that protects the others from
being quietly de-scoped. It is not the one that stops a leak at runtime.

| # | Layer | Where | What it catches |
|---|---|---|---|
| 1 | **The render models** | `apps/public/src/lib/*-render.ts` | The narrowest layer and the strongest: a field that is not in the model cannot be rendered. `blog-render.ts` + the narrowed `PublicPostRow` mean authoring metadata is not merely unrendered, it is never fetched. |
| 2 | **The tier-leak engine, live** | `apps/public/tests/integration/public-pages/scrape-test.spec.ts` | A rendered field above its viewer's tier, or a rendered field nobody classified (fail-closed `unclassified`). Runs against REAL render HTML + real derived field sets, on every PR. |
| 3 | **The naked-PII detector** | same spec, `detectNakedPii` | A phone / email / Aadhaar pattern in public HTML, wherever it came from — including from places layers 1 and 2 cannot see. |
| 4 | **CI — this gate** | `scripts/check-pii-scrape.ts` | Route coverage drift (a new public page nobody classified), indexing conflicts, and an escalation citing a ruling that does not exist. |
| 5 | **RBAC + RLS** | `packages/domain/src/{rbac,policies}/` | Everything above concerns PUBLIC renders. Authenticated and operator surfaces are gated by permission keys and row-level security, not by this matrix. |

None is sufficient alone. Layer 1 protects one code path per surface; layer 2 sees
only what the model exposes; layer 3 catches patterns but not classification; layer
4 cannot see a render at all.

### The three-layer AUTHORITY model for directory attributes (architecture §2.13.2)

Distinct from the layers above, and load-bearing for anyone extending the matrix:

**CREATE** (Super Admin / Trustee Panel only) → **ENABLE** (per-Pariwar scope,
governed authority) → **GRANT** (Trustee, over a named node).

⛔ **NO LAYER IMPLIES THE NEXT.** An attribute that exists is not thereby enabled
for any Pariwar; one that is enabled is not thereby granted over any node.
Directory attributes are **display-only by default, enforced by signature** — ⛔ a
matrix value must never reach an eligibility path.

⛔ **There is no canonical directory schema** (`2026-08-19-132` R7). The attribute
set is extensible and Pariwar-selected. Enumerating member attributes in the matrix
re-commits SD-1, in which three attribute rows had no substrate at all and no story
owned them, unnoticed for seven epics.

## What ships now

Story 1.16b shipped the gate, the engine and an empty scaffold matrix. **Story
11a.1 populated the matrix and armed the tier-leak leg.** Both are live.

⚠ **This section previously described a scaffold, and two of its claims aged into
falsehoods.** They are recorded here rather than quietly deleted, because the
failure mode is the point: the README asserted that the leak rules would acquire
teeth *"without a code change to the gate"* while `loadSnapshots()` was literally
`return []` — the code change the sentence promised was unnecessary. And the gate
printed *"apps/public is a tsc stub until Story 2.5"* long after `apps/public`
became a real Astro app with seven pages. A green check was certifying an
invariant nobody was enforcing, under a description that said otherwise. Both are
corrected; the vacuous snapshot loader is **deleted**, not repaired.

## Files

| File                                               | Role                                                                                                                                                                                                |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `matrix.ts`                                        | Zod schema + `TIER_RANK` (**the one copy of the tier ordering**) + the Tier-1 exception, escalation-ledger and per-Pariwar-rule constructs + `parsePublicVsPrivateMatrix` (loud throw on malformed). |
| `scrape.ts`                                        | **Pure, importable** engine: the 4 tier-leak rules (`evaluateSurfaceRender`), `getVisibility` (the canonical lookup), the naked-PII detector (`detectNakedPii`), `RenderSnapshot`, `evaluateSnapshot`. |
| `gate.ts`                                          | **Pure** source-provable legs (Story 11a.1): `checkRouteCoverage`, `checkIndexingReconciliation`, `checkEscalationAttestation`, plus `pageRouteFromPath` / `astroTemplate` / `detectIndexingSignal`. |
| `../../scripts/check-pii-scrape.ts`                | The impure gate entrypoint (parses the matrix, enumerates `apps/public` pages, runs the legs, exits). Run via `pnpm pii:check`. ⛔ Owns NO tier-leak check — see "Which leg lives where" below.       |
| `../../public-pages/public-vs-private-matrix.yaml` | The consumed contract — **populated** at v2: 8 surfaces, 23 tier-classified fields, 1 attested escalation.                                                                                          |
| `../../tests/public-pages.test.ts`                 | Fixture unit tests (ride `pnpm turbo run test` — contracts is a workspace).                                                                                                                         |

The pure-core (`scrape.ts`) / impure-entry (`check-pii-scrape.ts`) split mirrors
`scripts/friction-budget/{lib.ts,check.ts}` (Story 1.16a). The engine is exported
from `@twt/contracts` so the deferred live-render integration spec
(`tests/integration/public-pages/scrape-test.spec.ts`, D13-1.2) imports it.

## The 4 tiers + the leak rules (Story 11a.1 AC, epics L3596-3620)

| Tier                   | Meaning                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `public`               | Internet-visible without auth — renderable everywhere.                               |
| `authenticated_member` | Logged-in members only — **not** on public renders.                                  |
| `operator_restricted`  | Staff/trustees/admins with RBAC scope — **not** on member or public renders.         |
| `never_exposed`        | Never rendered on **any** surface (Aadhaar, bank details; Tier-1 PII per Story 1.5). |

A field whose tier exceeds the viewer context's ceiling is a leak, reported
naming the offending **surface + field**. A rendered field the matrix does not
declare is **fail-closed** (`unclassified` leak). On a `public` HTML render, a
naked phone / email / Aadhaar pattern is also a leak (FR-74 testable consequence;
Story 11a.4 obfuscation is the defense-in-depth layer — the gate detects leaks).
See **[FR-93 — obfuscation is defense-in-depth, ⛔ never primary](#fr-93--obfuscation-is-defense-in-depth--never-primary-story-11a4)**
below for the full layering order and what obfuscation may ⛔ never be used for.

Each surface also declares a `search_indexing_policy ∈ {index | noindex |
conditional}` (epics L3614).

## FR-93 — obfuscation is defense-in-depth, ⛔ never primary (Story 11a.4)

The one-line version, because everything below is a gloss on it: **protection comes
from the POLICY layer first.** Obfuscation is the layer you add on top of a field
that is already correctly classified and correctly gated. A field that is obfuscated
but unclassified is **less** protected than a plain one that is classified, because
the obfuscation invites everyone to stop looking.

### 1. The layering order (verbatim, epics L4658-4667)

1. `never_exposed` — hidden by the matrix. Nothing renders it, anywhere.
2. `operator_restricted` — requires **RBAC + audit + rate limits**.
3. `authenticated_member` — requires **auth + rate limits + audit**.
4. `public` — renders **visibly**, with obfuscation as defense-in-depth where
   applicable.

### 2. ⛔ The wrong-order warning

Obfuscating a field on an authenticated surface **while neglecting its matrix entry
or its RBAC enforcement** is ⛔ **explicitly wrong**. It is the failure this section
exists to prevent: it looks like protection, it satisfies a reviewer's glance, and it
leaves the actual control — the tier classification and the access check — unbuilt.

### 3. Plain-text phone/email **IS permitted** on authenticated + operator surfaces

For legitimate operator workflows, because **RBAC has already gated the access** and
obfuscating the value would add nothing an operator cannot trivially undo. A staff
member who is authorised to call a family should see the number and be able to tap it.
`apps/mobile`'s `CallHelplineCTA` and `ShepherdContactCard` are exactly this case.

### 4. ⚠ Clauses 2-3 are conditionals **awaiting a first subject**

⛔ **No contact field is classified at any tier on any surface today.** `mobile`,
`email` and `phone` appear in `public-vs-private-matrix.yaml` **only inside comments**
— zero rows, on zero surfaces. So the rules above are correctly-scoped conditionals
governing what *would* be true *if* a future escalation ever moved a contact field to
`authenticated_member`. ⛔ They are **not** descriptions of a shipped surface, and ⛔ do
not write a test asserting a matrix row that does not exist.

⚠ The Mobile ✗/✗/✓ row sometimes cited as "the matrix" is the **epic's** Story 11a.3
render-scope table (`epics.md` L4592-4593) — prose, ⛔ not the shipped contract, and
that table's own banner says in terms that it *"is NOT a schema"*.

### 5. ⭐⛔ MEMBER contact data and the TRUST'S OWN contact channel are OPPOSITE cases

**This is the load-bearing item, and this document is where it is written down.**

A **member's** phone/email is governed by the matrix and is ⛔ **never public**. That
is FR-74, and every tier rule above governs it.

The **trust's** helpline and email are a different thing entirely: they are
**deliberately public so that a person in need can reach the trust.** The committed
public **Contact page (with the Madad card)** carries them by design —
*"Madad on the Contact page is the front door, not a fallback"*
(`ux-design-specification.md:297`). ⇒ on that channel the governing property is
⭐ **REACHABILITY, bounded by accessibility** — ⛔ **not concealment.**

⇒ the three `epics.md` L4655 masking techniques are ⛔ **REJECTED for that channel, on
the merits**, and here are the reasons by name:

| Technique | Why it ⛔ fails on a reachability channel |
| --- | --- |
| **Image rendering** | ⛔ Not tappable, ⛔ not copyable, ⛔ not screen-readable. **NFR-A11y-1 (WCAG 2.1 AA) is a named LAUNCH BLOCKER for public-site primary nav** — an image of a phone number is a straight accessibility failure. |
| **JS-decoded display** | ⛔ Fails with JS off or broken. `apps/public` is Astro SSR *precisely* so it works without heavy JS; decoding the one number a person in crisis needs is the worst thing to make JS-conditional. |
| **Partial masking + helpdesk CTA** | ⛔ Circular — the number **is** the helpdesk. Masking the helpline behind a "contact the helpline" CTA is a dead end. |

⚠ **And indexing cuts the OTHER way.** `/niyamavali` is `search_indexing_policy:
index`; a Contact page would be too. You ⭐ *want* a search engine to surface the
trust's helpline to someone searching for help. Obfuscation defeats that on purpose.

✅ **The residual concern on that channel is real, and it is CHANNEL INTEGRITY, ⛔ NOT
privacy.** Harvesting the helpline invites spam that could degrade a channel grieving
families depend on. Its mitigations are **rate limiting, provider-side filtering, and
the honeypot bait paths** (`apps/api/src/plugins/security-headers/`) — ⛔ **never**
making the number unreadable to the people it exists for.
⛔ **Do not collapse *"not a privacy problem"* into *"not a problem"*.**

### 6. The public **Contact** and **About** pages are committed and ⛔ UNOWNED

Both are in the UX spec's committed public-website inventory
(`ux-design-specification.md:243`) — the same inventory as the three surfaces
11a.1-11a.3 built. And: ⛔ **no epic story owns either**, ⛔ no `apps/public` route,
⛔ no matrix surface.

⚠ **The gate is blind to this by construction.** Its route-coverage leg reconciles
**shipped pages ⇄ matrix surfaces** in both directions — so a surface that *should*
exist and **does not** is invisible to it. ⛔ **A green gate proves nothing about a
missing page.** Routed as a coverage gap (owner: John); ⛔ not built here.

The masking decision for that page is deferred to **the story that builds it** — and
it is deferred ⛔ **on the merits** (item 5), ⛔ **not** merely for want of a consumer.
⛔ A future reader must not "un-defer" it by building a masking component the moment a
page appears; the technique must be **re-decided against a real audience**.

⚠ It cannot render a real number yet regardless: ⛔ no provisioned helpline source
exists (`note-template.ts:122-127` — no `.env.example` entry, no deploy config, no
validation; the PDF prints `HELPLINE_PENDING_TOKEN` rather than fabricate one). That
waits on the **Epic 10 per-Pariwar helpline resolution**.

### 7. The real anti-enumeration coverage on `/members`

`limits.search` (the named SEARCH rate-limit tier) + the page-size cap (50) + the
deep-page horizon (200) + `X-Robots-Tag` + the absence of any export affordance +
`directory-abuse-rules.yaml` (four `active` rules emitting `directory.abuse_suspected`).
Five controls, defended in writing at `apps/api/src/modules/public-pages/routes.ts`
and `login-wall.spec.ts` — ⚠ the two counts must stay identical.

⛔ **Story 10.6 is NEVER coverage.** `epics.md` L4660 cites *"Story 10.6 query
throttling"*; Story 10.6 is the **Bulk Operations Framework**. Already recorded twice
(`directory-abuse-rules.yaml` note 7; `deferred-work.md:265`). ⛔ Do not cite it.

### 8. FR-93's `[v1-S — moot per policy]` tag does ⛔ NOT mean this was cut

`[v1-S]` marks Should-have **cadence priority** — a nameable cut candidate under
schedule pressure — ⛔ not *"skip"*. And the PRD's own gloss (`prd.md:1177`:
*"Per FR-74 policy these are never public; obfuscation patterns retained as
defense-in-depth for any leak"*) is the **source** of this section's invariant, ⛔ not
a contradiction of it.

⚠ And per item 5, ⛔ do not misread the matrix's *"member contact is never public"* as
meaning FR-93 has **no** subject at all. It has two subjects with opposite governing
properties, and conflating them is the error this section was written to correct.

## Mechanism — why a `packages/contracts/` turbo task (not a repo-root script)

The gate is a **`packages/contracts/` turbo task**
(`contracts:check-pii-scrape`, mirroring `check-openapi-determinism`) + a
dedicated `pii-scrape` CI job, with a root `pii:check` script. Unlike sibling
1.16a's `scripts/friction-budget/` (repo-global: root config + cross-app build
scan + PR git-diff → `fetch-depth: 0`), **1.16b's config is a contracts
artifact with no git-diff** — so the matching precedent is the contracts turbo
task, and the job uses the **default shallow checkout (no `fetch-depth: 0`)**.
The engine lives in `src/` so the future integration spec can import it, and its
unit tests ride `pnpm turbo run test` automatically (no separate `pii:test`
step). See ADR-0013 for the full repo-scope rationale.

## Which leg lives where (ruling D2)

The tier-leak check needs a RENDER. The gate script has none, and pretending
otherwise is exactly how the leg went vacuous. So the work is split, and the split
is documented here because implementing it silently is what produced the
misleading README this replaces.

| Leg | Lives in | Why there |
|---|---|---|
| Matrix structure, the Tier-1 exception bound, escalation count ⇄ entries, orphan + direction checks | `matrix.ts` (parse time) | Pure and structural — decidable from the file alone, so it belongs at admission. |
| Route coverage (both directions), indexing reconciliation, escalation **attestation** | `scripts/check-pii-scrape.ts` + `gate.ts` | Provable from committed source. Attestation is the one leg that must LEAVE the file — a `decision:` string is well-formed whether or not the ruling exists. |
| **Cache-policy reconciliation** (Story 11a.2, ruling D3(a)) | `scripts/check-pii-scrape.ts` + `gate.ts` | Provable from committed source, reading the **same** `.astro` files the indexing leg already reads. ⚠ Opposite scope though: `noindex` is a TEMPLATE prop, `Cache-Control` is set in the FRONTMATTER — so this leg must not strip it, and matches the CALL rather than the words so prose cannot fool it. **Fail-closed on absence**: a rendering surface that sets no header FAILS, because absence reading as "the default is fine" is exactly how `/blog` shipped uncached for a whole epic. |
| **Pagination binding, FR-91** (Story 11a.2) | `scripts/check-pii-scrape.ts` + `gate.ts` | Same source scan. It is a leg and not a convention because FR-91 is genuinely unenforced here otherwise — see gap 5 above. |
| **Tier leak, live render** | `apps/public/tests/integration/public-pages/scrape-test.spec.ts` | The architecture-committed D13-1.2 slot. It already holds real render HTML, already runs on every PR via `pnpm turbo run test`, and needs no new CI wiring. |
| **Naked PII, live render** | same spec | Same reason; this leg was already active before Story 11a.1 and was left untouched. |

⛔ **Do not add a snapshot loader to the gate script.** A loader there could only
read committed fixtures, and a fixture is a restatement of the render that drifts
silently — the defect class this story exists to close (D2(b), rejected).

## Failure semantics — ⛔ the no-op posture is RETIRED

Story 1.16b's gate was self-green by construction: an empty matrix and no
snapshots meant the engine evaluated nothing and the job passed. That posture was
correct for the story that shipped the scaffold and is **wrong now**. What was a
graceful no-op is now a loud failure:

- **Absent matrix file** → **FAILS**. The matrix is populated; a missing file is a
  deletion, not a no-op.
- **Empty matrix document** → **FAILS**. An empty matrix would make every check
  below it vacuous.
- **Malformed matrix** → **FAILS** loudly (`parsePublicVsPrivateMatrix` throws;
  ⛔ never degrades to "no entries" — the `parseCapabilityBar` doctrine).
- **An undeclared public route** → **FAILS**, which is also what makes it safe not
  to pre-declare Epic 11b's surfaces: when 11b ships a route, the gate fails until
  it is classified.
- **A surface declared with `renders: false`** → exempt from route coverage, and
  ⛔ that is the ONLY exemption, and it must be explicit.

## Teeth

Every detection route carries an **independently planted** negative control — not
one fixture tripping several checks, which would let a route stop firing while its
neighbours keep the suite green. Controls live in
`tests/public-pages-gate.test.ts` (source-provable routes),
`tests/public-pages-matrix-schema.test.ts` (parse-time routes) and the integration
spec (render-time routes).

Three legs were additionally proven **live** during Story 11a.1, against real
files: a real undeclared `members.astro` page, a real `noindex` prop added to
`terms.astro`, and a real bogus decision ref in the matrix — each exiting 1, each
reverted. A gate that cannot be made to fail has no teeth, and a governance gate
that silently stopped detecting anything would be worse than no gate: the green
check would actively certify an invariant nobody is enforcing.

## Running locally

```sh
pnpm pii:check                     # the gate: matrix + route coverage + indexing + cache + pagination + attestation
pnpm --filter @twt/contracts test  # the engine, schema, gate legs + their negative controls
pnpm --filter @twt/public test     # the LIVE-RENDER tier-leak + naked-PII legs (ruling D2)
```

⚠ `pnpm pii:check` alone does **not** exercise the tier-leak rules. Run the
`@twt/public` suite for those — the split is deliberate and is tabulated above.
