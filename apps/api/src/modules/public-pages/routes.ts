// Story 11a.3 — the PUBLIC-PAGES routes (Task 3; AC1, AC6).
//
// ⛔ THIS MODULE IS DELIBERATELY UNAUTHENTICATED, AND THIS FILE IS ONE OF THE TWO PLACES THAT
// DECISION IS DEFENDED IN WRITING (the other is the `login-wall.spec.ts` allowlist entry, in the
// Story 10.21 AC-R1 style). The surface is `public` tier by Panel ruling (`2026-08-19-135`,
// affirmed by `-136`): the Member Directory is meant to be readable by anyone on the internet with
// no login, so there is no session to require. ⛔ Do not "fix" this by adding a session guard —
// that deletes the route's purpose, and there is no member session on this surface to add anyway
// (`2026-08-20-143` cl.7: members are token-bearer, there is no `apps/member-web`, and
// `apps/mobile` has no directory screen).
//
// ⭐ WHAT BOUNDS IT INSTEAD — FIVE independent controls, each mechanized and each tested.
// ⚠ FIVE, matching `login-wall.spec.ts`'s allowlist entry exactly. This list used to say FOUR (it
// folded the page-size cap and the page horizon into one bullet) while that entry said FIVE — two
// files both nominated as the authoritative written defence of a deliberately-unauthenticated PII
// route, disagreeing on how many controls exist. ⛔ Keep the two counts identical.
//   1. `config: { rateLimit: limits.search }` — the named SEARCH tier, UNMODIFIED. ⛔ Not
//      `limits.read` (the looser tier, and backwards for an enumeration surface), ⛔ not an inline
//      ad-hoc ceiling, and ⛔ NOT a hand-rolled `keyGenerator`: `limits.search` already keys on
//      `perSessionKey`, which falls through to `request.ip` for an unauthenticated caller, and
//      `trustProxy: true` makes `request.ip` read the forwarded chain. ⚠ The work of making that
//      key the VISITOR's rather than the SSR proxy's is `apps/public`'s forwarding — ⛔ not a
//      re-keying here. A `keyGenerator` override is exactly the ad-hoc deviation this clause
//      forbids, and it is asserted by test that two forwarded addresses land in DIFFERENT buckets.
//      ⭐ AND `apps/public` FORWARDS ONLY `Astro.clientAddress` (`2026-08-21-145` cl.2). It used to
//      APPEND that to the browser's inbound `X-Forwarded-For`, and since `trustProxy` reads the
//      LEFTMOST entry, the caller was choosing this key. ⛔ Never restore the inbound chain.
//   2. A bounded `limit` in the `.strict()` request schema — the page-size cap
//      (`PUBLIC_SURFACE_PAGE_SIZE_CAP` = 50), which is also what makes Story 1.14's
//      forced-pagination guard COVER this route.
//   3. A bounded `page` — the deep-pagination HORIZON (`PUBLIC_DIRECTORY_PAGE_HORIZON` = 200),
//      the ceiling that actually bounds a full walk, since offset paging was KEPT (D2(a)).
//      ⚠ A separate control from the cap: the cap bounds ONE request, the horizon bounds the WALK.
//      An unknown query parameter is a 400, which is what makes `?format=csv` a refusal rather
//      than an ignored no-op.
//   4. `X-Robots-Tag: noindex, nofollow` — ⚠ already stamped on EVERY response by the existing
//      global `onSend` hook. VERIFIED, ⛔ not rebuilt here.
//   5. The absence of a member-detail route and of any export affordance. ⛔ FR-91 forbids bulk
//      export from the public side; a per-member permalink is an enumeration primitive in its own
//      right and is in no AC.
//
// ── ⭐ THE TWO-ROUTE RULE (Story 11b.1) — ⛔ THIS CLAUSE IS UPDATED, ⛔ NOT DELETED ─────────────
// This header used to read *"⛔ NO SECOND ROUTE. One collection-returning GET. If a follow-up needs
// another, it needs its own allowlist entry, its own defence, and its own rate-limit choice —
// ⛔ never a quiet addition here."*
//
// ⭐ THAT CLAUSE DID EXACTLY WHAT IT WAS WRITTEN TO DO. Story 11b.1 needed a second route, and the
// clause named its price: an allowlist entry, a written defence, a deliberate rate-limit choice.
// All three were paid. ⇒ the rule is now TWO collection-returning GETs, and the SAME price stands
// for a third — ⛔ still never a quiet addition here.
//
// ⚠ BOTH ROUTES ARE DEFENDED BY THE SAME FIVE CONTROLS ABOVE, and that is a finding rather than a
// convenience: the controls are properties of "an unauthenticated, paginated, PII-bearing public
// collection", ⛔ not of the Member Directory specifically. A third route that CANNOT reuse them
// unchanged is a third route that needs its own ruling, ⛔ not its own bullet list.
//
// ── ⭐⭐ THE THIRD ROUTE (Story 11b.3) — AND THE CLAUSE ABOVE FIRED EXACTLY AS WRITTEN ──────────
// ⛔ THE FIVE ARE ⛔ NOT REUSED HERE, AND STATING FIVE WOULD BE THE DEFECT THIS FILE ALREADY HAD ONCE,
// INVERTED. `GET …/public-pages/sahyog-vivran/:driveToken` (⚠ `:poolCanonicalIdentifier` until
// Story 11b.10 closed the walk) is a SINGLE-ITEM GET on a
// path parameter (⛔ not a collection) and declares `paginated: false` in the matrix (⛔ not
// paginated). ⇒ controls 2 (`PUBLIC_SURFACE_PAGE_SIZE_CAP`) and 3 (`PUBLIC_DIRECTORY_PAGE_HORIZON`)
// have ⛔ NO QUERY PARAMETER TO BIND TO and cannot be reused.
//
// ⚠⛔⛔ **AMENDED BY STORY 11b.3a — THE THIRD PROPERTY NO LONGER HOLDS, AND THAT IS THE POINT.**
// This clause used to close with *"and it carries ZERO Tier-1 fields (⛔ not PII-bearing)"*. ⭐ TRUE
// AT 11b.3; ⛔ **FALSE NOW**: 11b.3a declares **FOUR** ruled Tier-1 nominee-bank fields on this
// surface (`2026-08-28-165` cl.1/cl.3, under `2026-08-28-160` cl.10) and the handler **DECRYPTS**
// them. ⇒ **THIS ROUTE IS PII-BEARING.** ⛔ Amended, ⛔ not deleted — the previous claim is named so
// nobody restores it. ⚠ The `login-wall.spec.ts` allowlist entry is amended in the SAME commit and
// states the SAME count: *"two authoritative documents disagreeing on how many controls exist is the
// defect this file records having already had once."*
//
// ⭐ **D11(a)** (`2026-09-02-176`) RULED IT STATES ITS **APPLICABLE** SET. ⚠ 11b.3a changed which
// controls apply, ⛔ not the rule — and ⭐ **11b.10 added control 7** (the unguessable address; see
// THE ENUMERATION BOUND below). ⇒ the applicable set is now **FIVE** of the numbered items — 1, 4, 5,
// 6 and 7 — with 2 and 3 still structurally N/A and their restoration still owed by 11b.3b.
// ⚠ The `login-wall.spec.ts` allowlist entry states the SAME set: ⛔ two authoritative documents
// disagreeing about how many controls exist is the defect this file records having already had once.
//   1. `config: { rateLimit: limits.search }` — the named SEARCH tier, UNMODIFIED. ⛔ Not
//      `limits.read` (looser, and backwards for an enumeration surface), ⛔ not an inline ceiling,
//      ⛔ not a hand-rolled `keyGenerator`. Same reasoning as control 1 above, unchanged.
//      ⭐⭐ ON THIS ROUTE IT NOW CARRIES MORE WEIGHT THAN ANYWHERE ELSE IN THIS MODULE — see the
//      ENUMERATION BOUND clause below, which is 11b.3a's addition.
//   4. `X-Robots-Tag: noindex, nofollow` — the existing GLOBAL `onSend` hook. VERIFIED, ⛔ not rebuilt.
//   5. The absence of any DETAIL or EXPORT affordance. ⭐ Note what this means HERE, because it reads
//      differently on a single-item route: this route IS the detail view, so what "absence" names is
//      that it exposes ⛔ no onward affordance — ⛔ no list, ⛔ no sibling links, ⛔ no `format`/`csv`,
//      and the `.strict()` EMPTY query schema makes every query parameter a 400.
//   6. ⭐ **NEW AT 11b.3a — THE BOUNDED, PROJECTED TIER-1 READ.** The four fields are decrypted
//      SERVER-SIDE here and ⛔ never by `apps/public`, which must ⛔ not gain KMS capability for ONE
//      field class when the KEK is shared across EVERY Tier-1 field class (`2026-08-20-143` cl.1,
//      D6(a)). The fan-out is bounded by `DIRECTORY_DECRYPT_CONCURRENCY` and is **AT MOST EIGHT**
//      values per page (four fields × at most two EQUAL accounts) against the directory's fifty —
//      and only **TWO per account** when the Pariwar's masking window has elapsed, because
//      `2026-08-28-160` cl.10(e)'s retention list excludes the holder name and the VPA. The masked
//      projection is applied HERE, at the boundary: the wire's masked arm carries ⛔ no
//      `accountNumber` key at all, so the full value cannot cross once masked (AC4).
//   7. ⭐ **NEW AT 11b.10 — THE UNGUESSABLE PUBLIC ADDRESS.** The path parameter is a 128-bit CSPRNG
//      token (`pools.public_token`, global unique index), ⛔ not the sequential `P-YYYY-MM-###`, and
//      there is EXACTLY ONE address form — the bare identifier is ⛔ not independently addressable.
//      A wrong or absent token answers a **byte-identical 404**. ⛔ It bounds DISCOVERY, ⛔ NOT
//      AUTHORISATION (D1): presenting a valid address is enough, with ⛔ no session and ⛔ no branch
//      on the reader's membership standing. See THE ENUMERATION BOUND below for the full ground.
//      ⚠⛔ **AND ⛔ NOT FOR EVERY STATE** (2026-09-04): it is a real bound for `live` drives, which are
//      ⛔ not listed — for `closed`/`settled` the index publishes the address as a LINK by ruling, so
//      control 7 does ⛔ not bound their discovery. OPEN with the Panel; see below.
//
// ⛔ CONTROLS **2** AND **3**: ⛔ STILL NOT APPLICABLE — NO COLLECTION, NO `limit`, NO `page`.
// ⚠⛔ THE N/A STILL HAS AN EXPIRY, ⛔ it is not a permanent exemption: **Story 11b.3b adds the
// contributor list, which makes this route PAGINATED and RESTORES BOTH CONTROLS.** ⇒ 11b.3b owes this
// header and the `login-wall.spec.ts` allowlist entry an update IN ITS OWN COMMIT — a bare "not
// applicable" with no expiry is how two controls quietly never come back.
// ⚠⛔⛔ **AND 11b.3b MUST EXTEND WHAT 11b.3a WROTE, ⛔ NEVER OVERWRITE IT.** The two stories are
// declared INDEPENDENT AND PARALLEL and they restore DIFFERENT properties on these SAME two
// documents: 11b.3a restored **PII-BEARING** (control 6 above), 11b.3b restores **PAGINATED**
// (controls 2 and 3). ⛔ Replacing this set with a pagination-only one would DROP a control both
// documents must state identically — which is the two-documents-disagreeing defect, arrived at from
// the other side. ⇒ 11b.3b's count is **SIX**, ⛔ not five.
// ⚠ 11b.3a's `nomineeBankAccounts` is ⛔ NOT a collection affordance and restores ⛔ neither control:
// its `.max(2)` is the shape of a substrate whose composite PK admits exactly `{1, 2}` — there is
// nothing to page, nothing to filter and nothing to walk.
//
// ⚠⛔⛔ **THE ENUMERATION BOUND — ⭐⭐ AMENDED BY STORY 11b.10, AND ⛔ NOT DELETED.**
// This clause used to read, in terms: *"`P-YYYY-MM-###` is SEQUENTIAL and therefore ENUMERABLE; with
// controls 2/3 structurally absent, `limits.search` is the ONLY thing bounding a walk of it"* — and
// after 11b.3a that walk reached FOUR DECRYPTED TIER-1 FIELDS under `D8-default` FAIL-OPEN.
// ⭐⭐ **THAT WAS TRUE, AND IT IS THE REASON THIS STORY EXISTS.** `2026-09-03-184` **(B)**
// (Trustee-ratified) ruled the public address must be UNGUESSABLE, and `2026-09-04-185` corrected the
// premise the routing note carried: the identifier's `sequence` is a MONOTONIC per-(pariwar, month)
// counter, so counting really did address every drive.
// ⇒ **CONTROL 7 — ⭐ NEW AT 11b.10 — THE UNGUESSABLE ADDRESS.** The route parameter is a **128-bit
// CSPRNG token** carried on the pool row under a global unique index, so a drive URL can ⛔ no longer
// be CONSTRUCTED from the sequence, and *"real drive, wrong token"* answers a **BYTE-IDENTICAL 404**
// to *"no such drive"* — ⛔ a different answer there would itself be the enumeration oracle. ⇒ the
// count is now **SEVEN**.
// ⚠⛔⛔ **AND ITS REACH IS BOUNDED — RE-AMENDED 2026-09-04 (`#decision-2026-09-04-186`).** This clause
// once said flatly *"there is ⛔ no sequence left to walk"*. ⭐ TRUE for `live` drives (⛔ NOT LISTED)
// and for archived drives past the page horizon. ⛔ **FALSE for `closed`/`settled`:** `/sahyog`
// publishes a per-row LINK to each of them (D3 — the necessary consequence of `-184` (A)), and a
// published link CONTAINS the address; its pre-existing `poolCode` search box then turns the
// SEQUENTIAL code into that link in ONE request. ⭐ Proven by execution, ⛔ not inferred.
// ⛔ THERE IS NO CODE FIX — a page you publish a link to is a page whose address you published. ⏳ What
// follows is **OPEN WITH THE PANEL**
// (`trustee-panel-routing-note-2026-09-04-11b10-listed-drive-discoverability.md`). ⛔ Do ⛔ not resolve
// it here, and ⛔ do not restore the stronger sentence.
// ⚠⛔ **THE ADDRESS BOUNDS DISCOVERY, ⛔ NOT AUTHORISATION** (D1, 2026-09-04): the page answers 200 to
// ANYONE presenting a valid address — ⛔ no session, and ⛔ never a branch on the reader's membership
// standing (⛔ no `members.state`, ⛔ no `is_valid`, ⛔ no moderation overlay).
// ⚠ D11(a) recorded controls 2 and 3 structurally N/A *precisely because there is no `page` and no
// `limit` to bind them to*; it was option **(c)** — ⛔ NOT ruled — that would have obliged this route
// to name what bounds identifier enumeration. ⇒ this clause names it, and 11b.10 closed it ⭐ FOR
// UNLISTED DRIVES. ⚠ For listed ones it is ⛔ not closed and ⛔ not closable in code — routed.
// ⚠⛔ **`limits.search` IS STILL ⛔ NOT A TUNING KNOB** (`2026-09-02-183` cl.5; 11b.3a AC2). The Panel
// directed option **(c)**, ⛔ not option (b) (`-184` cl.5) ⇒ the tier is UNCHANGED by 11b.10 in BOTH
// directions. ⛔ Do not tighten it on the registration below because the token "makes it safe", and
// ⛔ do not loosen it either.
// ⭐⭐ **AND `D4-linkage` IS CLOSED, ⛔ not still open.** `2026-09-04-185` cl.3–4 widened the ratified
// answer to ALL THREE visible states: `closed`/`settled` gain a per-row link on `/sahyog`, and a
// `live` drive gains a **member-app entry on the My Pool tab** (D4). ⚠ `live` drives are STILL ⛔ NOT
// LISTED on `/sahyog` — `public-read.ts` excludes them deliberately (*"an open solicitation"*), and
// (A) says a live drive should be **reachable**, ⛔ never **listed**.
//
// ⚠⭐ **AND THE INVERSION THIS ROUTE PUBLISHES, RECORDED HERE RATHER THAN LEFT FOR A REVIEWER**
// (`D5-subject`): `account_holder_name` is guarded by a real multi-stage human approval chain —
// verifier → state trustee → freeze — that ⛔ **CANNOT SEE IT**. The verifier console has ⛔ no bank
// surface, ⛔ no verification handler reads the field, and even a tier-2 admin making a correction
// reads back only a PRESENCE view (`holderNamePresent: boolean`). ⇒ this route publishes to the
// internet a value ⛔ no approver in that chain can read. ⚠ `ifsc_validated` is ⛔ NOT corroboration —
// a format + branch lookup proves the BRANCH exists, ⛔ not that the PERSON does. ⭐ Closing it is a
// **verifier-console** act (Story 6.10's family), ROUTED at `deferred-work.md`, ⛔ not built here.
//
// ⚠⛔ **AND A MASKING FLIP IS ⛔ NOT IMMEDIATE.** This surface is `edge_cacheable` at `s-maxage=300`,
// so the PREVIOUS projection keeps being served from **every warm PoP for up to five minutes** — and
// here what is served stale is a **FULL ACCOUNT NUMBER**. ⛔ **Direct SQL is NOT the operational
// fallback.** ⚠ This statement is one of THREE (the schema file and the admin console carry the
// others), because it is the property most likely to be discovered during an incident rather than
// before one.
//
// ⭐ WHAT THE SECOND ROUTE ADDS THAT THE FIRST DOES NOT HAVE — a PUBLICATION-BASIS gate on the
// deceased member's name, evaluated BEFORE the Tier-1 decrypt so a row with no basis costs zero KMS
// calls. ⚠ It gates the NAME, ⛔ never the ROW: an unnamed drive still renders in full, so the index
// degrades PER-POOL, ⛔ never per-page. ⛔ The Member Directory has no such gate and is ⛔ not made
// to have one by this addition.
//
// ⚠⛔ AND THE BASIS IS ⛔ NOT A PER-SUBJECT CONSENT ANY MORE — it was until Story 11b.9. This header
// used to name `sahyog_drive_publication`, the tick-box the FAMILY ticked at claim time (11b.1
// AC12 / D4(b)). `2026-08-28-160` cl.3-5 DE-AUTHORISED that: the authority is the MEMBER'S OWN
// accepted versioned T&C, carrying the post-death publication clause — the member already answered,
// so the family is ⛔ not asked. The predicate is `pool/public-read.ts`'s
// `NAME_PUBLICATION_AUTHORISED`; the retired type is PRESERVED by ruling and ⛔ not consulted.
//
// ⛔⛔ AND BUILT IS ⛔ NOT PUBLISHED. ⭐ THAT SENTENCE IS STILL TRUE — but ⛔ NOT for the three
// reasons this block used to give, and ⛔ all three were falsified on 2026-08-28. Rewritten by
// Story 11b.9 rather than deleted, because THIS FILE is where the next reader looks for the launch
// posture. The retired claims, named so nobody restores one:
//   ⛔ (1) *"counsel's HELD DPDPA review of this exact subject (`2026-08-24-157` cl.3(a), returning
//          2026-09-07)"* — ⛔ LIFTED. `2026-08-28-160` cl.7 cleared all three 11b surfaces.
//   ⛔ (2) *"Row 17's ≥2-trustee publication posture extended by C-5"* — ⛔ C-5 FELL WHOLLY as a
//          governance mechanism (`2026-08-23-154` C-5, superseded by `-160`).
//   ⛔ (3) *"the per-subject consent gate"* — ⛔ DE-AUTHORISED by Story 11b.9 itself.
//   ⛔ (4) *"Counsel HAS NOT REVIEWED this subject"* — ⛔ FALSE since `-160`, which records counsel
//          as FULLY VERIFIED and delivering the clause text on 2026-08-28. ⚠ The half of that
//          sentence which STANDS: ⛔ never write that counsel is not engaged — false since
//          2026-06-21 (`2026-08-24-158`).
//
// ⭐⭐ THE ACTUAL POSTURE, AND IT IS ⛔ NOT A CODE MECHANISM: what keeps `/sahyog` dark is
// DEPLOYMENT plus the counsel/Panel process (`2026-08-24-159` D1, `-160` cl.4(e)). ⛔ Registering
// this route closes nothing, and ⛔ nothing here may be read as enabling the surface for any Pariwar.
//
// ⛔⛔ AND THE PUBLICATION KILL SWITCH MAY ⛔ NOT BE CITED AS THIS SURFACE'S TECHNICAL LAUNCH GATE.
// It is an EMERGENCY OPERATIONAL control: a missing row resolves to ENABLED BY DESIGN (RULED
// `2026-08-27`), and it is ⛔ not a consent mechanism
// ([[project_directory_launch_gated_on_killswitch_ui]]). ⛔ Do not write it in here as one.
//
// ⚠⭐ AND THE SURFACE IS INERT ON DAY ONE BY DESIGN, ⛔ not broken: until a `clause_versions` row
// for the post-death publication clause exists AND is pinned into a T&C version, the basis is false
// for every member and ⛔ no name renders. Fail-closed, expected, and made observable by the
// diagnostic in `handlers.ts` (11b.9 AC8). ⛔ Do ⛔ not debug it as a bug.

import {
  PublicDirectoryQuery,
  PublicDirectoryResponse,
  PublicSahyogDriveQuery,
  PublicSahyogDriveResponse,
  PublicSahyogVivranParams,
  PublicSahyogVivranQuery,
  PublicSahyogVivranResponse,
} from '@twt/contracts';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { AppDeps } from '../../context.js';
import { namedRateLimits } from '../../plugins/rate-limit/index.js';
import { createPublicPagesHandlers } from './handlers.js';

const PUBLIC_PAGES_TAG = 'public-pages';

const PariwarParam = z.object({ pariwarId: z.string().uuid() }).strict();

export function registerPublicPagesRoutes(app: FastifyInstance, deps: AppDeps): void {
  const h = createPublicPagesHandlers(deps);
  const r = app.withTypeProvider<ZodTypeProvider>();
  const limits = namedRateLimits(deps);

  r.get(
    '/api/v1/p/:pariwarId/public-pages/member-directory',
    {
      schema: {
        params: PariwarParam,
        querystring: PublicDirectoryQuery,
        response: { 200: PublicDirectoryResponse },
        tags: [PUBLIC_PAGES_TAG],
      },
      // ⛔ UNMODIFIED. See control 1 in the header before changing anything on this line.
      config: { rateLimit: limits.search },
    },
    h.memberDirectory,
  );

  // ── Story 11b.1 — the SECOND collection-returning GET (D6(a)) ────────────────────────────────
  // ⭐ ITS OWN DEFENCE IS THE HEADER'S TWO-ROUTE CLAUSE + THE FIVE CONTROLS, reused UNCHANGED and
  // deliberately: see the header for why reusing them is a finding rather than a shortcut.
  // ⚠ Its own `login-wall.spec.ts` allowlist entry states the SAME control count — ⛔ two
  // authoritative documents disagreeing on how many controls exist is the defect this file records
  // having already had once.
  r.get(
    '/api/v1/p/:pariwarId/public-pages/sahyog-drive',
    {
      schema: {
        params: PariwarParam,
        querystring: PublicSahyogDriveQuery,
        response: { 200: PublicSahyogDriveResponse },
        tags: [PUBLIC_PAGES_TAG],
      },
      // ⛔ UNMODIFIED, and the SAME named tier as the directory. See control 1 in the header before
      // changing anything on this line. ⛔ Not `limits.read` (looser, and backwards for an
      // enumeration surface), ⛔ not an inline ceiling, ⛔ not a hand-rolled `keyGenerator`.
      config: { rateLimit: limits.search },
    },
    h.sahyogDrive,
  );

  // ── Story 11b.3 — the THIRD route, and the FIRST that is not a collection (D6(b), D11(a)) ────
  // ⭐ ITS DEFENCE IS THE HEADER'S THIRD-ROUTE CLAUSE — the **FOUR** applicable controls (⚠ THREE
  // until Story 11b.3a added the bounded, projected Tier-1 read), with 2 and 3 recorded as
  // structurally N/A and their RESTORATION named (11b.3b's pagination). ⛔ The five are NOT reused,
  // because this route is neither a collection nor paginated — ⚠ but it IS **PII-BEARING** now.
  // ⚠ Its own `login-wall.spec.ts` allowlist entry states the SAME control count — ⛔ two
  // authoritative documents disagreeing on how many controls exist is the defect this file records
  // having already had once.
  // ⛔ AND IT IS ⛔ NEVER AN AUTHENTICATED ROUTE. Adding one to this module needs its own ruling, its
  // own written defence and its own allowlist entry — and there is ⛔ no member session on this
  // surface to add anyway (`2026-08-23-154` disposition (c); SD-2 is RE-PURPOSED onto the
  // post-campaign masking state by `2026-08-28-164` A2, ⛔ not dissolved).
  r.get(
    // ⭐⭐ STORY 11b.10 — THE PATH PARAMETER IS THE DRIVE'S **OPAQUE PUBLIC TOKEN**, ⛔ no longer
    // `:poolCanonicalIdentifier`. `2026-09-03-184` **(B)** (Trustee-ratified): the public address
    // must be UNGUESSABLE, and `P-YYYY-MM-###` is a MONOTONIC per-(pariwar, month) counter ⇒ it was
    // WALKABLE BY COUNTING, and since 11b.3a that walk reached four DECRYPTED Tier-1 bank fields.
    // ⛔⛔ THERE IS EXACTLY ONE ADDRESS FORM. ⛔ Do ⛔ not add a second route, an alias, or an `OR`
    // arm accepting the bare identifier "for old links" — a route accepting either form has ⛔ not
    // closed the walk, it has added a lock beside an open door (Trap 3). The identifier is RETAINED
    // (`-184` cl.2) as the operational/audit key and is still RENDERED in the response.
    '/api/v1/p/:pariwarId/public-pages/sahyog-vivran/:driveToken',
    {
      schema: {
        params: PublicSahyogVivranParams,
        // ⛔ EMPTY AND `.strict()` — there is nothing to filter, page or export, so EVERY query
        // parameter is a 400. ⭐ That emptiness is precisely WHY controls 2 and 3 are N/A.
        querystring: PublicSahyogVivranQuery,
        // ⚠ ⛔ NO `404` ENTRY, deliberately: the handler sends an EMPTY 404 body, and declaring a
        // response schema for it would invite one — a distinguishable not-found body is an
        // enumeration oracle on a SEQUENTIAL identifier.
        response: { 200: PublicSahyogVivranResponse },
        tags: [PUBLIC_PAGES_TAG],
      },
      // ⛔ UNMODIFIED, and the SAME named tier as the two routes above.
      // ⚠⭐ AMENDED BY STORY 11b.10 — ⛔ AN AMENDMENT, ⛔ NOT A REWRITE. This note used to read that
      // control 1 was *"the ONLY thing bounding a walk of the sequential `P-YYYY-MM-###`"*. The
      // ADDRESS itself is now unguessable (`2026-09-03-184` (B) — a 128-bit token), so ⛔ nobody can
      // CONSTRUCT a drive URL from the sequence any more.
      // ⚠⛔⛔ RE-AMENDED 2026-09-04 (`#decision-2026-09-04-186`) — THIS NOTE ONCE SAID *"there is
      // ⛔ no sequence left to walk"*, AND THAT WAS ⛔ TOO STRONG. It holds for `live` drives, which
      // are ⛔ NOT LISTED, and for archived drives past the index page horizon. It does ⛔ NOT hold
      // for `closed`/`settled`: `/sahyog` publishes a per-row LINK to each of them (D3 — the
      // necessary consequence of (A)), and a published link CONTAINS the address. `/sahyog` also
      // carries a public search box on the sequential code (`sahyog.astro` `poolCode`, PRE-EXISTING
      // and legitimate) ⇒ identifier → token → this route, in two unauthenticated requests. ⭐ PROVEN
      // BY EXECUTION against a live DB, ⛔ not inferred.
      // ⛔ THERE IS NO CODE FIX: a page you publish a link to is a page whose address you published.
      // ⏳ WHAT FOLLOWS IS **OPEN WITH THE PANEL** —
      // `trustee-panel-routing-note-2026-09-04-11b10-listed-drive-discoverability.md`. ⛔ Do ⛔ not
      // resolve it here, and ⛔ do not restore the stronger sentence.
      // ⇒ Control 1 bounds the ordinary request rate on a PII-bearing public route, and for LISTED
      // drives it is once again the principal bound on collecting them in bulk.
      // ⚠⛔ AND THE TIER IS STILL ⛔ NOT THIS STORY'S TO TOUCH. The Panel directed option **(c)**,
      // ⛔ not option (b) (`-184` cl.5), and 11b.3a's **AC2** rules that tightening it as an
      // authoring act is exactly what may not happen — a rule that did ⛔ NOT expire when the note
      // was answered. ⛔ Do not tighten it here and ⛔ do not loosen it here; a different tier is a
      // NEW ROUTING NOTE (`2026-09-02-183` cl.5), ⛔ never an edit.
      // ⚠⛔ AND CHANGING THIS TIER IS **A DECISION** (`2026-09-02-183` cl.5), ⛔ not a tuning knob —
      // in EITHER direction. ⛔ Do not tighten it here and ⛔ do not loosen it here.
      config: { rateLimit: limits.search },
    },
    h.sahyogVivran,
  );
}
