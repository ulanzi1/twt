// Story 11a.3 — the PUBLIC-PAGES data handlers (Task 3 + Task 4; AC1, AC3, AC6).
//
// The server side of the unauthenticated Member Directory. `apps/public` SSR calls this route
// server-side and renders its result; ⛔ no browser reaches it directly.
//
// ── ⭐ WHY THE READ LIVES HERE AND NOT ON `apps/public` (`2026-08-20-143` cl.1, D1(a)) ──────────
// Not preference — CAPABILITY. Verified against the tree: `apps/public` cannot decrypt Tier-1 (no
// KMS wiring, no `deps` module), cannot write a §1.5 audit line (`writeAuditEntry` needs the
// BYPASSRLS service pool; `twt_app` holds no INSERT grant), and cannot rate-limit (no Fastify, no
// store). `apps/api` already has all three, plus the login-wall allowlist — the precedented place a
// deliberately-unauthenticated route is DEFENDED IN WRITING. ⛔ Do not move this read to the page
// layer: that means giving the internet-facing SSR process decrypt capability over a KEK shared by
// EVERY Tier-1 field class (mobile, device tokens, KYC), which is why option (b) was rejected.
//
// ── ⭐ THE TIER-1 DECRYPT, AND WHAT BOUNDS IT ───────────────────────────────────────────────────
// The name is decrypted with the EXISTING `decryptKycField` under the EXISTING
// `MEMBER_KYC_FIELD_CLASS` and the member's REAL `pariwarId` — ⛔ no new field class, ⛔ no new
// namespace, ⛔ no second crypto helper. `2026-08-19-136` cl.6: this is a DECRYPT AT A NAMED
// SURFACE, ⛔ NOT a reclassification. The PII tier does not move; the name stays Tier-1 ciphertext
// plus a Tier-2 blind index everywhere it is stored.
//
// ── ⛔ THE RESPONSE CARRIES ONLY THE CLASSIFIED FIELDS ──────────────────────────────────────────
// Three: `name`, `district`, `status`. ⛔ No `member_id`, ⛔ no ciphertext, ⛔ no mobile or email,
// ⛔ no raw lifecycle value. A public JSON route that over-returns is a leak the HTML tier-leak gate
// structurally CANNOT see — it scans rendered HTML, not this payload — so the discipline has to be
// held here, by construction and by test.

import {
  PUBLIC_DIRECTORY_PAGE_HORIZON,
  PUBLIC_SURFACE_PAGE_SIZE_DEFAULT,
  type PublicDirectoryEntry,
  type PublicDirectoryQuery,
  type PublicDirectoryResponse,
  type PublicSahyogDriveEntry,
  type PublicSahyogDriveQuery,
  type PublicSahyogDriveResponse,
} from '@twt/contracts';
import { encryption, ids, kyc, member as memberDomain, pool as poolDomain } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { evaluateDirectoryAbuse, loadDirectoryAbuseRules } from './abuse-rules.js';

/** Rows served when the caller asks for no page size. Mirrors `apps/public`'s own default. */
// ⭐ IMPORTED, ⛔ not a third bare `25`. See the constant's own doc-block in @twt/contracts.
export const PUBLIC_DIRECTORY_PAGE_SIZE_DEFAULT = PUBLIC_SURFACE_PAGE_SIZE_DEFAULT;

/**
 * Max KMS `decryptDek` round-trips in flight for ONE directory page render.
 *
 * ⚠ A REAL bound, ⛔ not the page size wearing the word "bounded". At 8, a full 50-row page costs
 * ceil(50/8) = 7 sequential waves instead of 50 round-trips, while capping what a single
 * unauthenticated request can put in flight against a quota-limited external service.
 * ⛔ Raising this trades KMS quota safety for page latency on an anonymous surface — it is a
 * capacity decision, not a tuning knob.
 */
const DIRECTORY_DECRYPT_CONCURRENCY = 8;

/**
 * Map `items` through `fn` with at most `concurrency` promises in flight, preserving INPUT ORDER.
 *
 * ⭐ Results are written into a pre-sized array at the item's own index, ⛔ never pushed in
 * completion order — the deterministic roster order is what makes "page N is the same page N on
 * every request" true, and a completion-ordered result would silently shuffle a public page.
 */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return out;
}

export interface PublicPagesHandlers {
  memberDirectory(request: FastifyRequest): Promise<PublicDirectoryResponse>;
  sahyogDrive(request: FastifyRequest): Promise<PublicSahyogDriveResponse>;
}

export function createPublicPagesHandlers(deps: AppDeps): PublicPagesHandlers {
  // ⭐ Parsed ONCE at construction, ⛔ not per request. The rules file is a committed governance
  // artifact — a malformed one must fail the process at wiring time, loudly, rather than degrade to
  // "no rules" on the request path where nobody would notice (the `parseCapabilityBar` doctrine).
  const abuseRules = loadDirectoryAbuseRules();

  return {
    /**
     * `GET /api/v1/p/:pariwarId/public-pages/member-directory` — one page of the public directory.
     *
     * ⛔ DELIBERATELY UNAUTHENTICATED. The surface is `public` tier by Panel ruling
     * (`2026-08-19-135` / `-136`), so there is no session to require and ⛔ adding one would delete
     * the route's purpose. What bounds it instead is FIVE controls, enumerated in `routes.ts` and
     * in `login-wall.spec.ts`'s allowlist entry — the two places that decision is defended in
     * writing. ⚠ Those two must state the SAME COUNT; this doc-block deliberately does not restate
     * the list, so there is no third copy to drift.
     */
    async memberDirectory(request: FastifyRequest): Promise<PublicDirectoryResponse> {
      const { pariwarId: pariwarIdStr } = request.params as { pariwarId: string };
      const query = request.query as PublicDirectoryQuery;
      const page = query.page ?? 1;
      const limit = query.limit ?? PUBLIC_DIRECTORY_PAGE_SIZE_DEFAULT;
      const offset = (page - 1) * limit;
      const pariwarId = ids.pariwarId(pariwarIdStr);

      // ⭐ ONE INSTANT FOR THE WHOLE REQUEST, ⛔ never `new Date()` at each read. The roster
      // predicate's `account-frozen` half and the district read are both AS-OF reads, and the count
      // must describe the roster the page rows were drawn from. `openScopeTx` issues a bare `BEGIN`
      // (READ COMMITTED), so each statement takes a FRESH snapshot — two `new Date()` calls would
      // let a member joining or being suspended between the two statements make `hasNext` advertise
      // an empty page, or silently drop a row from the last page. ⚠ It comes from `deps.clock()`,
      // not `new Date()`, so tests can pin it.
      const now = deps.clock();

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        // ⭐ THE PER-PARIWAR KILL SWITCH — `2026-08-21-145` cl.5, ratified at `2026-08-21-146` cl.5.
        // ⚠ Cite THOSE entries, ⛔ not a bare "D3": this story has its OWN ruled D3 (the roster
        // predicate) and the two collide. ⛔ Never resolve a bare `D<n>` by proximity.
        // ⛔⛔ THE READ PATH BELOW IS LIVE AND ENFORCED, but the SWITCH IS NOT AN OPERATIONAL
        // CONTROL: `2026-08-21-146` cl.5 requires a dedicated admin UI before it may be treated as
        // one, and ⛔ hand-run SQL must not be described as the way it is operated. ⚠ So this gate
        // is correct and load-bearing, and ⛔ nothing may be planned around someone flipping it
        // today. Checked FIRST, before any
        // KYC decrypt: a Pariwar whose directory is disabled must cost nothing beyond this read.
        // ⚠ A disabled directory returns the IDENTICAL SHAPE as a genuinely empty roster
        // (`{items:[],total:0}`), ⛔ NOT a distinct error/404 — a differently-shaped response would
        // itself be a new oracle (this route already treats a nonexistent Pariwar and a real,
        // zero-member Pariwar identically for the same reason; see the code-review record on the
        // withdrawn "gate on Pariwar existence" finding for why that asymmetry is deliberate here).
        const directoryEnabled = await memberDomain.resolveDirectoryPublicationEnabled(
          scopeTx.tx,
          pariwarId,
        );
        if (!directoryEnabled) {
          ok = true;
          return { items: [], page, limit, total: 0 };
        }

        // ── Anti-enumeration detection, BEFORE the roster read ─────────────────────────────────
        // ⚠ Runs before the read deliberately: a deep-crawl signal is worth recording even when the
        // page below turns out empty. ⛔ It does NOT block — the rate limit is the enforcement, this
        // is the signal (`2026-08-20-143` cl.10). And ⛔ the line it emits is a COUNTER, not a
        // forensic record: no column stores query context, so the rule id and a coarse, non-PII
        // query shape go in `action` + `resource_locator`. ⛔ Never describe it as carrying the query.
        //
        // ⚠ IT RUNS AFTER THE KILL SWITCH, ⛔ NOT BEFORE IT. A Pariwar pulled under a DPDPA hold
        // publishes nothing, so crawl signals about it describe enumeration of `{items:[],total:0}`
        // — audit noise that would also evict genuine visitors' counters against `MAX_TRACKED_KEYS`.
        // ⛔ The rate limit still applies to a disabled directory; it runs at `onRequest`, upstream
        // of this handler entirely.
        //
        // ⭐ `pariwarId` AND `traceId` ARE PASSED. Omitting them wrote every abuse line under the nil
        // GLOBAL pariwar (`00000000-…`) with a null trace, so a Pariwar-scoped audit reader (Story
        // 1.10) never saw them and two Pariwars crawled at once were indistinguishable. Both values
        // are in hand right here — ⛔ there was never a reason to discard them.
        evaluateDirectoryAbuse(deps, abuseRules, {
          key: request.ip,
          surface: 'member-directory',
          pariwarId: pariwarIdStr,
          traceId: request.requestContext.traceId ?? null,
          page,
          limit,
          at: now,
        });

        // ⭐ THE PRESENTATION MODE IS RESOLVED ONCE PER REQUEST, ⛔ NEVER PER ROW. It is a config
        // value that cannot vary within a page, so a per-row read would be an N+1 on a constant.
        const mode = await kyc.resolvePublicNamePresentationMode(scopeTx.tx, pariwarId);

        const rows = await memberDomain.listPublicDirectoryMembers(scopeTx.tx, pariwarId, {
          limit,
          offset,
          now,
        });
        // ⚠ `total` IS ROSTER SIZE, ⛔ NOT a count of rendered `items` — RESOLVED (BigDev,
        // 2026-08-21, code-review D1). An unresolvable name (decrypt failure, or the presentation
        // policy resolving to `''`) suppresses that member's rendered row below, but does NOT
        // change the underlying eligible-directory count: the member is still real, still visible
        // by the ruled roster predicate, just not nameable on THIS request. Do not describe `total`
        // as "the number of rendered entries" anywhere it is surfaced, and do not add an omission
        // count unless a future story requires one.
        const total = await memberDomain.countPublicDirectoryMembers(scopeTx.tx, pariwarId, {
          now,
        });

        // ⭐ ONE KMS `decryptDek` ROUND-TRIP PER ROW — envelope encryption gives every stored name
        // its own DEK, so there is no shared secret to decrypt once and reuse.
        //
        // ⚠ GENUINELY BOUNDED, ⛔ not "bounded" by the page size. The previous form was
        // `Promise.all(rows.map(...))`, whose comment CLAIMED bounded concurrency while placing no
        // bound at all: the only ceiling was `limit` (50), so N concurrent visitors put 50×N KMS
        // calls in flight — a cheap amplification lever on an UNAUTHENTICATED route, against a
        // quota-limited external service. ⛔ A comment asserting a bound that the code does not
        // impose is worse than no comment: it stops the next reader from looking.
        //
        // ⭐ Order is preserved by writing into a pre-sized slot array indexed by the row's position,
        // ⛔ never by relying on completion order — the deterministic roster order is what makes
        // "page N is the same page N" true, and nothing here may re-sort.
        const resolved = await mapWithConcurrency(
          rows,
          DIRECTORY_DECRYPT_CONCURRENCY,
          async (row): Promise<PublicDirectoryEntry | null> => {
            // ⭐ THE TIER-1 DECRYPT — the existing helper, the existing field class, the member's
            // real pariwarId. The decrypted value NEVER leaves this closure except through
            // `resolvePublicMemberName`, and is never logged.
            //
            // ⚠ A decrypt failure (bad ciphertext, transient KMS error) degrades the SAME way as an
            // unresolvable name below — omit THIS row, never propagate out. Letting it throw would
            // 500 the ENTIRE page for the whole Pariwar over one bad row, mirroring the fail-soft
            // precedent at `resolvePoolIdentity` (`packages/domain/src/notifications/pool-identity.ts`).
            let storedName: string;
            try {
              storedName = await encryption.decryptKycField(row.nameCiphertext, pariwarId, deps.encryption);
            } catch (err) {
              console.error('[public-pages] member-directory: KYC name decrypt failed — omitting row', err);
              return null;
            }

            // ⭐ THE POLICY RENDER — `resolvePublicMemberName`'s FIRST production call site.
            // ⛔ NEVER a literal `full_name`, ⛔ never a local re-implementation of
            // `splitFirstNameLastInitial`, ⛔ never a second copy of the mode default.
            // `2026-08-19-136` cl.1: *"a build in which the public name form cannot be changed
            // without a code change FAILS this clause"* — the mode above is what satisfies it.
            const name = kyc.resolvePublicMemberName(mode, storedName);

            // ⛔ AN UNRESOLVABLE NAME OMITS THE ROW — never a blank cell where a person's name
            // belongs (the `pool-identity.ts` fail-soft precedent). A shorter page is strictly
            // better than a public page with an empty name on it.
            if (name === '') return null;

            return {
              name,
              // ⚠ Normalized, not passed through raw: the response schema's `district` is
              // `.min(1).nullable()` — `null` means "no posting row" and is valid, but a blank
              // string would fail that check, 500ing the page. The governed life-events write path
              // already rejects an empty district at the contract boundary (`z.string().trim().min(1)`),
              // but the domain accessor that appends a posting row does not re-enforce it, so this
              // stays a defensive normalization, not dead code.
              // ⚠ `.trim() || null`, ⛔ not `=== ''`. A whitespace-only district (`'  '`) is not the
              // empty string: it passes the schema's `.min(1)`, arrives TRUTHY so the page's
              // `?? districtUnknown` fallback never fires, and `outputForVerdict` only nulls the
              // empty string — emitting a visually BLANK cell where the design says "Not recorded".
              district: row.district?.trim() || null,
              // ⚠ `active-in-grace` PRESENTS AS `active`. A grace period is an internal billing
              // state; ⛔ publishing it would tell a stranger a member is late on a payment. The
              // ruled pill is two labels, and this is where the third state is folded away.
              //
              // ⭐ AND THIS LINE IS THE INTERNAL→PUBLIC VOCABULARY BOUNDARY (`2026-08-21-144` cl.4,
              // cl.8). `row.state` is the INTERNAL lifecycle value; the wire carries the PUBLIC
              // token. ⛔ The internal word `lock-in` STOPS HERE and must never appear on the right
              // of this expression.
              status: row.state === 'lock-in' ? 'waiting-period' : 'active',
            };
          },
        );
        const items: PublicDirectoryEntry[] = resolved.filter(
          (entry): entry is PublicDirectoryEntry => entry !== null,
        );

        ok = true;
        return { items, page, limit, total };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * `GET /api/v1/p/:pariwarId/public-pages/sahyog-drive` — one page of the public Sahyog Drive.
     *
     * ⛔ DELIBERATELY UNAUTHENTICATED, on the same reasoning as the directory above and with the
     * SAME FIVE controls, enumerated in `routes.ts` and in `login-wall.spec.ts`'s allowlist entry —
     * the two places that decision is defended in writing. ⚠ Those two must state the SAME COUNT;
     * this doc-block deliberately does not restate the list, so there is no third copy to drift.
     *
     * ⭐⛔ THE TIER-1 DECRYPT LIVES HERE AND NOWHERE ELSE, AND IT IS EASY TO LEAVE UNOWNED:
     * `pool/public-read.ts` is decrypt-free BY RULE, and no module in `apps/public` ASKS for
     * encryption — `no-kms-in-public.test.ts` scans that app for the import, the symbol and the
     * config key. ⇒ if this handler does not do it, ⛔ NOTHING does, and the surface silently
     * ships nameless.
     *
     * ⚠ ⛔ DO NOT WRITE *"`apps/public` PROVABLY CANNOT DECRYPT"* — that overstates what the gate
     * proves, and the gate's own header says so in terms: it *"says nothing about what
     * `@twt/domain`'s OTHER namespaces transitively contain. What it proves is that no module in
     * this app ASKS for encryption."* `sahyog.astro` imports `passport` from the `@twt/domain`
     * barrel, which re-exports `encryption`; a source-text scan for named symbols cannot see
     * through a barrel. ⭐ The real protection is that no KMS client is wired into `apps/public`'s
     * dependencies — a CONFIGURATION fact, ⛔ not a structural proof. Stating it as a proof is how
     * a future author stops checking (Review finding, 2026-08-27).
     */
    async sahyogDrive(request: FastifyRequest): Promise<PublicSahyogDriveResponse> {
      const { pariwarId: pariwarIdStr } = request.params as { pariwarId: string };
      const query = request.query as PublicSahyogDriveQuery;
      const page = query.page ?? 1;
      // ⚠ THIS SURFACE'S OWN DEFAULT, ⛔ NOT THE DIRECTORY'S (Review finding, 2026-08-27). The
      // domain declares `SAHYOG_DRIVE_PAGE_SIZE_DEFAULT` and this handler was reaching past it for
      // `PUBLIC_DIRECTORY_PAGE_SIZE_DEFAULT` — so the domain constant was DEAD (the accessor never
      // sees an undefined `limit`) while the integration test asserted against it. Both passed only
      // because the two numbers coincide today; tuning the directory's would have silently moved
      // this surface's page size and failed a test pointing at an unrelated constant. ⭐ Same
      // discipline the file already applies to `PUBLIC_SAHYOG_DRIVE_PAGE_HORIZON`.
      const limit = query.limit ?? poolDomain.SAHYOG_DRIVE_PAGE_SIZE_DEFAULT;
      const offset = (page - 1) * limit;
      const pariwarId = ids.pariwarId(pariwarIdStr);

      // ⭐ ONE INSTANT FOR THE WHOLE REQUEST, ⛔ never `new Date()` at each read — the same rule the
      // directory handler above states at length. Here it binds THREE as-of reads: the drive's
      // close instant, the confirmed-contribution count, and the consent validity window. A second
      // clock would let a family's revocation land between the page read and the count, so the two
      // would describe different indexes. From `deps.clock()` so tests can pin it.
      const now = deps.clock();

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        // ⭐ THE PER-PARIWAR KILL SWITCH — CHECKED FIRST, before any read and before the abuse
        // counter (D3(a)): a Pariwar whose public surfaces are disabled must cost nothing beyond
        // this one read.
        // ⚠ THE SAME SWITCH THE DIRECTORY USES, its documented meaning generalised to "this
        // Pariwar's public member-data surfaces" — ⛔ NOT a new column and ⛔ not a new launch-gate
        // roster row. A per-surface flag would let a Pariwar be pulled from `/members` while still
        // publishing its drives, which is the opposite of what the posture means.
        // ⚠ A disabled Pariwar returns the IDENTICAL SHAPE as a genuinely empty index
        // (`{items:[],total:0}`), ⛔ NEVER a distinct error, 403 or 404 — a differently-shaped
        // response is itself a NEW ORACLE, which is precisely what the kill switch exists to avoid
        // creating. The page renders the empty state disclosing ⛔ NO reason (`2026-08-21-144` cl.5).
        // ⚠ AND THE LEVER IS ⛔ NOT IMMEDIATE: at `s-maxage=300` a pulled Pariwar keeps being served
        // from every warm PoP, per page number, for up to five minutes. ⛔ Direct SQL is NOT the
        // operational fallback.
        const publicationEnabled = await memberDomain.resolveDirectoryPublicationEnabled(
          scopeTx.tx,
          pariwarId,
        );
        if (!publicationEnabled) {
          ok = true;
          return { items: [], page, limit, total: 0 };
        }

        // ── Anti-enumeration detection, AFTER the switch and BEFORE the read ───────────────────
        // ⚠ Inherited as a FLOOR, ⛔ not a ceiling. It emits a COUNTER, ⛔ not a forensic record: no
        // column stores query context, so the rule id + a coarse non-PII query shape ride `action`
        // + `resource_locator`. ⛔ Never describe it as carrying the query, and ⛔ the recorded IP
        // is NOT evidence (`2026-08-21-145` RD2). It does ⛔ not block — the rate limit is the
        // enforcement, this is the signal.
        // ⚠ AND IT IS BLIND TO A WARM EDGE, which is RECORDED rather than discovered: a cached hit
        // never reaches the origin, so this counter sees only cache MISSES and a scraper walking
        // pages 1..N through an edge is invisible to it. Inert today (no edge configured) but a
        // NAMED DEPENDENCY — see the abuse-rules README. ⛔ Do not write that the origin sees
        // everything, and ⛔ do not "fix" it by making the surface `private_no_store` (rejected at
        // 11a.3: that discards the edge for a public surface).
        evaluateDirectoryAbuse(deps, abuseRules, {
          key: request.ip,
          surface: 'sahyog-drive',
          pariwarId: pariwarIdStr,
          traceId: request.requestContext.traceId ?? null,
          page,
          limit,
          at: now,
        });

        // ⭐ RESOLVED ONCE PER REQUEST, ⛔ NEVER PER ROW — a config value that cannot vary within a
        // page, so a per-row read would be an N+1 on a constant.
        const mode = await kyc.resolvePublicNamePresentationMode(scopeTx.tx, pariwarId);

        const filters = {
          district: query.district,
          poolCode: query.poolCode,
          closedFrom: query.closedFrom === undefined ? undefined : new Date(query.closedFrom),
          closedTo: query.closedTo === undefined ? undefined : new Date(query.closedTo),
          now,
        };

        const rows = await poolDomain.listPublicSahyogDrivePools(scopeTx.tx, pariwarId, {
          ...filters,
          limit,
          offset,
        });
        // ⚠ `total` is INDEX SIZE. ⭐ Note the reason it can differ from the rendered count is NOT
        // the directory's reason: there an unresolvable name drops the ROW. Here it drops only the
        // NAME, so these agree except for pagination and the publication switch — a nameless row
        // still counts. ⛔ Never add an omission count: a per-row "name withheld" tally is exactly
        // the enumeration signal AC2 forbids announcing.
        const total = await poolDomain.countPublicSahyogDrivePools(scopeTx.tx, pariwarId, filters);

        // ⭐ ONE KMS `decryptDek` ROUND-TRIP PER *CONSENTED* ROW — envelope encryption gives every
        // stored name its own DEK, so there is no shared secret to decrypt once and reuse.
        //
        // ⚠ GENUINELY BOUNDED, ⛔ not "bounded" by the page size. `Promise.all` would place NO bound
        // at all — its only ceiling is `limit` (50), so N concurrent visitors put 50×N KMS calls in
        // flight against a quota-limited external service, on an UNAUTHENTICATED route. That is the
        // defect 11a.3 fixed, and ⛔ it is not optional here just because this page is smaller.
        // ⛔ A comment asserting a bound the code does not impose is worse than no comment: it stops
        // the next reader from looking.
        //
        // ⭐ Order is preserved by writing into a pre-sized slot array indexed by the row's own
        // position, ⛔ never by completion order — nothing here may re-sort, or "page N is the same
        // page N on every request" stops being true.
        const items = await mapWithConcurrency(
          rows,
          DIRECTORY_DECRYPT_CONCURRENCY,
          async (row): Promise<PublicSahyogDriveEntry> => {
            const base = {
              poolLetterCode: poolDomain.poolLetterCode(row.poolIndex),
              poolCanonicalIdentifier: row.poolCanonicalIdentifier,
              status: row.status,
              closedAt: row.driveClosedAt === null ? null : row.driveClosedAt.toISOString(),
              // ⚠ `.trim() || null`, ⛔ not `=== ''`. A whitespace-only district passes the schema's
              // `.min(1)`, arrives TRUTHY so the page's fallback never fires, and renders a visually
              // BLANK cell where the design says "Not recorded" (the 11a.3 finding).
              district: row.district?.trim() || null,
              confirmedContributionCount: row.confirmedContributionCount,
              fundingOutcome: row.fundingOutcome,
            };

            // ⭐⛔ CONSENT IS EVALUATED *BEFORE* THE DECRYPT, ⛔ NEVER AFTER. An unconsented row must
            // cost ZERO KMS calls. Decrypting a name the gate is about to discard is both a wasted
            // round-trip on a quota-limited service AND a decrypt with no authorising basis — and
            // the second half is the one that matters. ⚠ A MISSING consent and a REVOKED one reach
            // this branch identically, which is intended: neither authorises a render.
            if (!row.nameConsentGranted || row.deceasedNameCiphertext === null) {
              return { ...base, deceasedMemberName: null };
            }

            // ⭐ THE TIER-1 DECRYPT — the EXISTING helper, the EXISTING field class, the member's
            // real pariwarId. ⛔ No new field class, ⛔ no new namespace, ⛔ no second crypto helper.
            // The decrypted value ⛔ NEVER leaves this closure except through
            // `resolvePublicMemberName`, and is ⛔ never logged.
            let storedName: string;
            try {
              storedName = await encryption.decryptKycField(
                row.deceasedNameCiphertext,
                pariwarId,
                deps.encryption,
              );
            } catch (err) {
              // ⭐ OMIT THE NAME, ⛔ KEEP THE ROW — the DELIBERATE INVERSE of the directory above,
              // which omits the row. There a row with no name has no purpose; here it still carries
              // the drive, and a shorter index is ⛔ not acceptable while a nameless row is.
              // ⛔ Letting this throw would 500 the ENTIRE page for the whole Pariwar over one bad
              // row (the `resolvePoolIdentity` fail-soft precedent).
              console.error(
                '[public-pages] sahyog-drive: KYC name decrypt failed — omitting the NAME, keeping the row',
                err,
              );
              return { ...base, deceasedMemberName: null };
            }

            // ⭐⛔ `resolvePublicMemberName`, ⛔ NEVER `resolvePoolIdentity()`. This is the sharpest
            // build consequence of D10 and the easiest thing to get wrong on a POOL surface:
            // `resolvePoolIdentity()` — the resolver 8.6/8.7/8.8 share, and the obvious thing to
            // reach for here — HARD-CODES `splitFirstNameLastInitial`, so it can ⛔ only ever return
            // the shielded form D10 rejected. Reaching for it because it is "the pool identity
            // resolver" would silently ship the wrong name form with every test still green.
            // ⛔ And ⛔ never a literal `full_name`: `2026-08-19-136` cl.1 — a build in which the
            // public name form cannot be changed without a code change FAILS that clause.
            // ⚠ Under `full_name` a MONONYM resolves normally, whereas `shielded_name` returns `''`
            // for every single-token name (`2026-08-21-145` cl.3). ⛔ Do not re-implement that branch.
            const name = kyc.resolvePublicMemberName(mode, storedName);

            // An unresolvable name omits the NAME, ⛔ never the row — same rule as the decrypt
            // failure above, and the same inverse of the directory.
            return { ...base, deceasedMemberName: name === '' ? null : name };
          },
        );

        ok = true;
        return { items, page, limit, total };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}

/**
 * Re-exported so the tests assert against the SAME horizon the contract enforces.
 *
 * ⚠ The previous comment here claimed this kept "the route schema and the tests" on one constant.
 * ⛔ It did not: `routes.ts` gets the bound via `PublicDirectoryQuery` from `@twt/contracts` and
 * never touches this symbol, and the specs compared against hardcoded `201` / `200` literals — so
 * the re-export had NO importer and the comment described a coupling that did not exist. That is
 * the exact defect 11a.2's review found ("the comment named a constant that did not exist and the
 * guarding test compared against a second hardcoded literal"), reproduced one story later.
 * ⭐ The specs now import THIS symbol, which is what makes the sentence above true.
 */
export { PUBLIC_DIRECTORY_PAGE_HORIZON };
