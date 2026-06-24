# Empty / Skeleton / Error State Inventory

**Launch-gate:** P0-4 Empty/Skeleton/Error Inventory (`inventory-roster.md` Row 6,
architecture L4783) — re-homed to **Story 2.5** by Decision 2026-06-20-054 (AI-3).

> **PARTIAL at Story 2.5.** This inventory covers **every screen surface built in
> `apps/public/` at Story 2.5** — the public Niyamavali page (and its version/diff
> sub-views) + the shell's not-found / error routes. It is **extended at Epic 11a**
> (Member Directory) and **Epic 11b** (per-claim surfaces + In Memoriam). Row 6 flips
> `open` → `in-progress` at Story 2.5 and `closed` only when the full Phase-1 surface
> inventory is attested at Epic 11a completion. **No `<TBD>` cells for the 2.5 surfaces.**

> **≥2-trustee ratified 2026-06-23** (Dhiraj Rahul + Kalpana Bharti) — `.decision-log.md` Decision 2026-06-23-060. This attests the Story 2.5 `apps/public` surface set (supersedes the un-attested-pending leg of Decision 2026-06-21-058). Launch-gate **Row 6 stays `in-progress`** — the `closed` trigger remains the full Phase-1 surface inventory at Epic 11a; closure criteria NOT relaxed.

## Design register (applies to every state below)

- **Tone:** dignified, never blames the visitor; member-register vocabulary (no
  "user/customer"); Hindi-primary on this member surface (the copy lives in the
  `niyamavali` i18n namespace with Hindi parity).
- **Skeleton/loading is largely N/A on this surface — by design.** Every route is
  **fully server-rendered with no client fetch and no hydration** (`js_bundle_bytes: 0`).
  There is no client-side loading phase to skeleton: the visitor receives complete HTML
  in the first response. A "skeleton" state would be inventing a loading phase that does
  not exist. Where a state is genuinely N/A this is **recorded with its rationale** (not
  left `<TBD>`).
- **Error states are DB-independent** (graceful degradation, Story 0.4): the 404/500
  routes read no passport and no clauses, so they render even if the data layer is down.

## Surface inventory (Story 2.5 — `apps/public`)

### 1. `/niyamavali` — effective-clause list (the primary surface)

| State | Design | Source |
| --- | --- | --- |
| **Empty** | Dignified empty card: heading `empty_title` ("No rules published yet") + body `empty_body` ("…has not been published yet. Please check back soon."). Shown when `listEffectiveClauses` returns zero rows. The branded shell (header + language toggle + footer) still renders. | `niyamavali.astro` (`view.kind === 'list'`, `model.clauses.length === 0`); copy keys `empty_title` / `empty_body` |
| **Skeleton/loading** | **N/A — server-rendered, no client fetch.** The page is delivered as complete HTML; there is no loading phase. Rationale recorded here per the inventory rules. | — |
| **Error** | Delegated to the `/500` route (below): any failure in the frontmatter read surfaces as the SSR error fallback. A malformed `?clause=` slug degrades gracefully to the in-page "unknown clause" state (below), not an error. | `500.astro`; `view.kind === 'unknown-clause'` |

### 2. `/niyamavali?clause=…` — version-history sub-view

| State | Design | Source |
| --- | --- | --- |
| **Empty / unknown** | When the requested `clause` slug resolves to zero versions (or is malformed), the page shows the in-page **"unknown clause"** state: `not_found_title` + `not_found_body` + a link back to the rulebook (`back_link`). Not a hard 404 — the shell + navigation are preserved so the visitor can recover. | `niyamavali.astro` (`view.kind === 'unknown-clause'`) |
| **Skeleton/loading** | **N/A** — server-rendered (same rationale as above). | — |
| **Error** | Delegated to `/500`. | `500.astro` |

### 3. `/niyamavali?clause=…&from=…&to=…` — diff sub-view

| State | Design | Source |
| --- | --- | --- |
| **Empty (no differences)** | When two versions have no payload differences, the diff view shows a dignified `diff_none` line ("These two versions have no differences in their content.") rather than three empty buckets. | `niyamavali.astro` (`view.kind === 'diff'`, all buckets empty); key `diff_none` |
| **Skeleton/loading** | **N/A** — server-rendered. | — |
| **Error** | Invalid `from`/`to` versions fall back to the version-history list (no error). A read failure delegates to `/500`. | `niyamavali.astro` (falls through to `versions` view) |

### 4. `/404` — not-found route (shell utility surface)

| State | Design | Source |
| --- | --- | --- |
| **Not-found (the state itself)** | Dignified not-found page: `not_found_title` + `not_found_body` + a link to `/niyamavali`. `noindex`. DB-independent. | `404.astro` |
| **Skeleton/loading** | **N/A** — static server render. | — |
| **Error** | The 404 page is itself the terminal recovery surface; a render failure of the 404 falls through to `/500`. | `500.astro` |

### 5. `/500` — error route (shell utility surface)

| State | Design | Source |
| --- | --- | --- |
| **Error (the state itself)** | Dignified error page: `error_title` ("Something went wrong") + `error_body` (never blames the visitor; invites a retry) + a link to `/niyamavali`. `noindex`, `Cache-Control: no-store`. DB-independent (renders even if the data layer is the failure). | `500.astro` |
| **Empty** | **N/A** — an error page has no data-driven empty state. | — |
| **Skeleton/loading** | **N/A** — static server render. | — |

## Surface inventory (Story 2.6 — `apps/public` `/terms`)

### 6. `/terms` — effective T&C render

| State | Design | Source |
| --- | --- | --- |
| **Empty** | Dignified empty card: `empty_title` ("No Terms & Conditions published yet") + `empty_body` ("…have not been published yet. Please check back soon."). Shown when `getEffectiveTc` returns null (no effective T&C). The branded shell (header + language toggle + footer) still renders. The empty-state HTML is composed by the pure `lib/tc-render.ts` (`buildTcRenderModel(null, …)` → `renderTcHtml`), unit-tested. | `terms.astro`; `lib/tc-render.ts`; copy keys `empty_title` / `empty_body` |
| **Provisional (content present, pending review)** | When `legal_review_status ∈ {pending, under-review}` the page shows the AC5 banner (`provisional_banner`, exact copy + Hindi parity) above the rendered body. Not an error/empty state — a first-class content state for the demoable placeholder until Story 0.13 returns. | `terms.astro`; `lib/tc-render.ts` (`showProvisionalBanner`); key `provisional_banner` |
| **Skeleton/loading** | **N/A — server-rendered, no client fetch.** Delivered as complete HTML; no loading phase (same rationale as `/niyamavali`). | — |
| **Error** | Delegated to the `/500` route: any failure in the frontmatter read (or the `withPublicScope` read) surfaces as the SSR error fallback. | `500.astro` |

## Coverage attestation

- **Surfaces covered:** 6 (the Niyamavali list + version + diff sub-views + 404 + 500 at
  Story 2.5; the `/terms` render added at Story 2.6) — i.e. every screen surface `apps/public`
  builds through Story 2.6.
- **No `<TBD>` cells** for the 2.5/2.6 surfaces. Every `N/A` carries a recorded rationale.
- **Extended at:** Epic 11a (Member Directory empty/skeleton/error), Epic 11b (per-claim +
  In Memoriam). Row 6 `closed` only at Epic 11a full-Phase-1-surface completion.

## Ratification

- **Author-committed (Story 2.5):** BigDev (Solo Builder) — the original inventory artifact.
- **Author-committed (Story 2.6):** BigDev (Solo Builder) — the `/terms` surface row above.
- **≥2-trustee ratification:** RECORDED AS **un-attested / pending** per
  [[feedback_record_unattested_no_backfill]] — the Story 2.5 surface set was trustee-ratified
  2026-06-23 (Decision 2026-06-23-060); the Story 2.6 `/terms` extension is author-committed and
  its trustee ratification is **carried openly as a gated open follow-up**, NOT reconstructed
  or back-dated here (no Trustee-Panel session is fabricated for it). Row 6 stays `in-progress`
  (artifact produced; full ratification + full-surface coverage pending Epic 11a), never
  asserted as `closed`.
