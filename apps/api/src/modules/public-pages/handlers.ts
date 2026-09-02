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

import { createHash } from 'node:crypto';

import {
  NOMINEE_BANK_DECRYPT_FAILED_SENTINEL,
  PUBLIC_DIRECTORY_PAGE_HORIZON,
  PUBLIC_SURFACE_PAGE_SIZE_DEFAULT,
  type PublicDirectoryEntry,
  type PublicDirectoryQuery,
  type PublicDirectoryResponse,
  type PublicSahyogDriveEntry,
  type PublicSahyogDriveQuery,
  type PublicSahyogDriveResponse,
  type PublicSahyogVivranNomineeAccount,
  type PublicSahyogVivranParams,
  type PublicSahyogVivranResponse,
} from '@twt/contracts';
import {
  audit,
  claim as claimDomain,
  encryption,
  ids,
  kyc,
  member as memberDomain,
  pool as poolDomain,
} from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { decryptNomineeBankFieldSoft } from '../claims/nominee-bank-crypto.js';
import { DIRECTORY_DECRYPT_CONCURRENCY, mapWithConcurrency } from '../kyc/bounded-decrypt.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { evaluateDirectoryAbuse, loadDirectoryAbuseRules } from './abuse-rules.js';

/** Rows served when the caller asks for no page size. Mirrors `apps/public`'s own default. */
// ⭐ IMPORTED, ⛔ not a third bare `25`. See the constant's own doc-block in @twt/contracts.
export const PUBLIC_DIRECTORY_PAGE_SIZE_DEFAULT = PUBLIC_SURFACE_PAGE_SIZE_DEFAULT;

export interface PublicPagesHandlers {
  memberDirectory(request: FastifyRequest): Promise<PublicDirectoryResponse>;
  sahyogDrive(request: FastifyRequest): Promise<PublicSahyogDriveResponse>;
  /**
   * ⚠ THE ONLY HANDLER IN THIS MODULE THAT TAKES `reply`, and it is not a style drift: this is the
   * first SINGLE-ITEM route here, so it is the first that can legitimately answer 404. The two
   * collection GETs above cannot — an empty collection is `{items:[],total:0}`, ⛔ never a 404.
   */
  sahyogVivran(request: FastifyRequest, reply: FastifyReply): Promise<PublicSahyogVivranResponse | void>;
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

            // ⭐⛔ THE BASIS IS EVALUATED *BEFORE* THE DECRYPT, ⛔ NEVER AFTER. A row with no basis
            // must cost ZERO KMS calls. Decrypting a name the gate is about to discard is both a
            // wasted round-trip on a quota-limited service AND a decrypt with no authorising basis
            // — and the second half is the one that matters (11b.9 AC6).
            // ⚠ A MISSING `tc_acceptance`, a REVOKED one, and one against a T&C version that does
            // ⛔ not pin the publication clause all reach this branch identically. That is intended:
            // ⛔ none of them authorises a render, and the gate is FAIL-CLOSED in every direction.
            if (!row.namePublicationAuthorised || row.deceasedNameCiphertext === null) {
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

        // ⭐⭐ THE INERT-STATE DIAGNOSTIC (11b.9 AC8) — so the fail-closed day-one posture is
        // ⛔ NEVER debugged as a bug, and so a first responder is not sent to the wrong half of the
        // system. ⛔ It changes ⛔ NOTHING about what was rendered; every decision above is already
        // made. Best-effort and ⛔ never able to fail the request.
        await logNamePublicationBasisAbsence(scopeTx.tx, pariwarId, rows);

        ok = true;
        return { items, page, limit, total };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
    /**
     * `GET /api/v1/p/:pariwarId/public-pages/sahyog-vivran/:poolCanonicalIdentifier` — ONE drive's
     * Sahyog Vivran. Story 11b.3 (AC1, AC3, AC5, AC6).
     *
     * ⛔ DELIBERATELY UNAUTHENTICATED, and — ⭐ unlike the two routes above — it is ⛔ NOT defended by
     * their five controls. `routes.ts:52-55` reserved that as a RULING: *"a third route that CANNOT
     * reuse them unchanged is a third route that needs its own ruling, ⛔ not its own bullet list."*
     * **D11(a)** (`2026-09-02-176`) ruled it states its APPLICABLE set — **THREE** — and names the two
     * that are structurally N/A. ⚠ `routes.ts` and `login-wall.spec.ts` are the two places that count
     * is written and they must state the SAME number; this doc-block deliberately does not restate the
     * list, so there is no third copy to drift.
     *
     * ⭐⭐ AND THERE IS ⛔ NOTHING TO DECRYPT — WHICH IS THE WHOLE POINT OF THE D6(b) SPLIT.
     * The two handlers above exist where they do because the read needs KMS. This one does ⛔ not:
     * it selects ⛔ no Tier-1 column, so it costs ⛔ ZERO KMS round-trips and holds ⛔ no plaintext.
     * ⚠ ⛔ THAT IS ⛔ NOT A REASON TO MOVE IT TO `apps/public`. The other two justifications stand
     * unchanged — the anti-enumeration ceiling (a rate-limit store) and the audit line (the BYPASSRLS
     * service pool), neither of which `apps/public` has — and on a route fronted by a SEQUENTIAL
     * identifier the ceiling is the load-bearing one. ⛔ Do not add a `withPublicScope` read there.
     *
     * ⭐⛔ 404 COLLAPSES THREE CASES ON PURPOSE — *"no such drive"*, *"exists but is not visible here"*
     * (a `spawned` pool) and *"this Pariwar's public surfaces are switched off"*. ⛔ A response that
     * distinguishes them is an ENUMERATION ORACLE, and `P-YYYY-MM-###` is SEQUENTIAL, which is exactly
     * when that matters. ⛔ Never a 403, ⛔ never a distinct error code, ⛔ never a different body shape.
     */
    async sahyogVivran(
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<PublicSahyogVivranResponse | void> {
      const { pariwarId: pariwarIdStr, poolCanonicalIdentifier } =
        request.params as PublicSahyogVivranParams;
      const pariwarId = ids.pariwarId(pariwarIdStr);

      // ⭐ ONE INSTANT FOR THE WHOLE REQUEST, ⛔ never `new Date()` per read — the same rule the two
      // handlers above state at length. Here it binds THREE as-of reads inside the domain accessor:
      // the drive's close instant, the confirmed-contribution count, and the appeal-reversal lineage.
      // A second clock would let a confirmation land between them so the page and its lineage
      // described different instants. From `deps.clock()` so tests can pin it.
      const now = deps.clock();

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        // ⭐ THE PER-PARIWAR KILL SWITCH — CHECKED FIRST, before any read (D3(a) at 11b.1): a Pariwar
        // whose public surfaces are disabled must cost nothing beyond this one read.
        // ⚠ THE SAME SWITCH the other two use, its documented meaning generalised to "this Pariwar's
        // public member-data surfaces" — ⛔ NOT a new column and ⛔ not a new launch-gate roster row.
        // ⚠⛔ AND HERE IT ANSWERS **404**, ⛔ not an empty shape, because this route has no empty shape
        // to answer with. That is the SAME answer an unknown identifier gets, which is the property
        // that matters: a disabled Pariwar must be indistinguishable from a drive that is not there.
        // ⚠ AND THE LEVER IS ⛔ NOT IMMEDIATE: at `s-maxage=300` a pulled Pariwar keeps being served
        // from every warm PoP for up to five minutes. ⛔ Direct SQL is NOT the operational fallback.
        const publicationEnabled = await memberDomain.resolveDirectoryPublicationEnabled(
          scopeTx.tx,
          pariwarId,
        );
        if (!publicationEnabled) {
          ok = true;
          void reply.status(404).send();
          return;
        }

        // ⭐⛔ THE ANTI-ENUMERATION COUNTER IS DELIBERATELY **NOT** CALLED HERE, and the omission is a
        // decision rather than an oversight. `evaluateDirectoryAbuse` keys on `(page, limit)` — a
        // COLLECTION-walk shape — and this route has neither. ⚠ Feeding it synthetic values would put
        // fabricated query shapes into a governance counter, which is worse than not counting.
        // ⛔ WHAT BOUNDS THIS ROUTE IS `limits.search` (control 1), and that is stated as the bound in
        // both written defences rather than implied. ⚠ `D4-linkage` records the residual openly: the
        // identifier is SEQUENTIAL, nothing else bounds a walk of it, and **11b.3a** — which puts four
        // DECRYPTED Tier-1 fields behind this same identifier — owns closing that at its AC2.

        const drive = await poolDomain.readPublicSahyogVivran(
          scopeTx.tx,
          pariwarId,
          poolCanonicalIdentifier,
          { now },
        );
        if (drive === null) {
          ok = true;
          void reply.status(404).send();
          return;
        }

        // ⭐⭐ AC5's AUDIT LINE (Story 1.10) — ⛔ AND IT LOGS THE **DISCLOSURE**, ⛔ not a "routing".
        // Under **D12(a)** there is ⛔ no routing act to log: the reversed-denial hook is a RENDER-TIME
        // DERIVATION, ⛔ no queue and ⛔ no consumer. ⇒ the accountable act is that this request
        // DISCLOSED an appeal reversal publicly, and that is what is written.
        // ⚠ FIRES ⛔ ONLY WHEN A LINEAGE IS ACTUALLY DISCLOSED. A drive with no reversal writes
        // NOTHING — ⛔ never a "no reversal" line, which would publish a fact about claims that were
        // not appealed into the audit chain.
        // ⚠⛔ AND THE AMPLIFICATION IS BOUNDED BY CONTROL 1, STATED RATHER THAN ASSUMED:
        // `writeAuditEntry` takes a GLOBAL advisory lock, so an unauthenticated route that wrote one
        // per request would be a serialization amplifier. What bounds it is `limits.search` — the same
        // named tier that bounds the route itself — plus the fact that a reversal is rare. ⛔ Do not
        // widen this to log every request.
        // ⛔ ACTOR IS `null`: the caller is an anonymous visitor, and there is ⛔ no member session on
        // this surface to attribute to. ⛔ No IP, ⛔ no user agent, ⛔ no free text — the recorded IP
        // is not evidence (`2026-08-21-145` RD2) and this line is about WHAT was disclosed.
        if (drive.appealReversal !== null) {
          await writeAppealReversalDisclosureAudit(
            deps,
            pariwarIdStr,
            poolCanonicalIdentifier,
            drive.appealReversal.reversedAtStage,
            request.requestContext.traceId ?? null,
          );
        }

        // ⭐⭐ STORY 11b.3a — THE TIER-1 DECRYPT, AND EVERY BOUND ON IT, STATED HERE.
        //
        // ⚠⛔ THIS IS WHERE THE ROUTE BECOMES **PII-BEARING**. `routes.ts`'s header and the
        // `login-wall.spec.ts` allowlist entry are updated in the SAME commit to state the control
        // set that applies now — ⛔ both with the SAME count, because *"two authoritative documents
        // disagreeing on how many controls exist is the defect this file records having already had
        // once"*.
        //
        // ⭐ THE AMPLIFICATION, BOUNDED AND SAID IN WRITING RATHER THAN LEFT TO BE RE-DERIVED:
        // a Sahyog Vivran page decrypts **AT MOST EIGHT** values — four fields × at most two EQUAL
        // accounts — against the directory's FIFTY per page, which is why
        // `DIRECTORY_DECRYPT_CONCURRENCY = 8` was introduced at 11a.3. ⭐ A **MASKED** projection
        // costs only **TWO per account**: cl.10(e)'s retention list names the account number and the
        // IFSC, so the holder name and the VPA are ⛔ never decrypted when masked. ⛔ Do not "simplify"
        // that into decrypting all four and discarding two — it would spend KMS quota on plaintext
        // this surface has been ruled not to show.
        //
        // ⭐⛔ AND THE ROUTE'S ONLY ENUMERATION BOUND IS `limits.search`, STATED BESIDE THE DECRYPT
        // BECAUSE THIS IS WHERE IT BECOMES EXPENSIVE. `P-YYYY-MM-###` is **SEQUENTIAL**, this is a
        // single-item GET on a path parameter, and **D11(a)** recorded controls 2 and 3 structurally
        // N/A *precisely because there is no `page` and no `limit` for them to bind to*. ⇒ with four
        // DECRYPTED Tier-1 fields behind a walkable identifier, and `D8-default` ruled **FAIL-OPEN**
        // for every Pariwar until the Trust sets a window (`2026-09-02-179` cl.1), `limits.search` is
        // the ONLY thing bounding a walk. ⚠⛔ IF THAT IS JUDGED INSUFFICIENT, THAT IS **A DECISION**
        // (`2026-09-02-183` cl.5) — ⛔ do ⛔ not quietly tighten or loosen the tier on this line.
        //
        // ⚠⭐ AND THE INVERSION THIS PUBLISHES, RECORDED HERE RATHER THAN LEFT FOR A REVIEWER
        // (`D5-subject`): the value below is guarded by a real multi-stage human approval chain —
        // verifier → state trustee → freeze — that ⛔ **CANNOT SEE IT**. The verifier console has ⛔ no
        // bank surface, ⛔ no verification handler reads the field, and even a tier-2 admin making a
        // correction reads back only `NomineeBankStatusResponse`, a PRESENCE view
        // (`holderNamePresent: boolean`). ⇒ ⛔ **this route publishes to the internet a value no
        // approver in that chain can read.** ⚠ `ifsc_validated` is ⛔ NOT corroboration — it is a
        // format + branch lookup, proving the BRANCH exists, ⛔ not that the PERSON does. ⭐ Closing
        // it is a **verifier-console** act (Story 6.10's family), ROUTED at `deferred-work.md` and
        // ⛔ not built here.
        //
        // ⚠⛔ AND `accountHolderName` IS ⛔ NOT LABELLED "NOMINEE" ANYWHERE DOWNSTREAM. 6.8's D1
        // removed the linkage deliberately — ⛔ no FK to `member_nominees`, ⛔ no rank, ⛔ no match
        // rule ([[project_nominee_bank_disbursement_channel]]). It is the ACCOUNT HOLDER.
        const nomineeBankAccounts = await mapWithConcurrency(
          drive.nomineeBank.accounts,
          DIRECTORY_DECRYPT_CONCURRENCY,
          async (account): Promise<PublicSahyogVivranNomineeAccount> => {
            // ⚠ FAIL-SOFT PER FIELD, ⛔ never per page: a corrupted envelope on one account must not
            // 500 a whole public transparency page. The sentinel is mapped to `null` immediately
            // below — ⛔ an operator-facing placeholder string must never reach a public page.
            const fieldLog = (field: string) => (err: unknown) =>
              request.log.error(
                { err, account_rank: account.accountRank, field },
                'sahyog-vivran nominee-bank field decrypt failed — rendering nothing',
              );
            const soft = async (
              ciphertext: string | null,
              field: string,
            ): Promise<string | null> => {
              if (ciphertext === null) return null;
              const value = await decryptNomineeBankFieldSoft(
                ciphertext,
                pariwarIdStr,
                deps.encryption,
                fieldLog(field),
              );
              // ⛔ THE SENTINEL IS AN OPERATOR STRING AND ⛔ MUST NOT BE PUBLISHED. On a public page
              // the honest answer to "we could not decrypt this" is to render NOTHING — the same
              // posture every other absent value on this surface takes.
              return value === NOMINEE_BANK_DECRYPT_FAILED_SENTINEL || value.length === 0
                ? null
                : value;
            };

            if (drive.nomineeBank.masked) {
              // ⭐ cl.10(e)'s DEFINED projection. ⛔ TWO decrypts, ⛔ not four: the holder name and the
              // VPA are absent from the retention list, so they are never decrypted, never held in
              // memory here, and — because the masked arm has ⛔ no key for either — structurally
              // unrepresentable on the wire (AC4).
              const [accountNumber, ifsc] = await Promise.all([
                soft(account.accountNumberCiphertext, 'accountNumber'),
                soft(account.ifscCiphertext, 'ifsc'),
              ]);
              return {
                masked: true,
                accountRank: account.accountRank,
                bankName: account.bankName,
                branch: account.branch,
                // ⭐ THE FULL VALUE DIES ON THIS LINE. `null` for four or fewer digits — at exactly
                // four, "the last four" IS the complete number, which cl.10(e) forbids exposing.
                accountNumberLast4:
                  accountNumber === null
                    ? null
                    : claimDomain.maskAccountNumberLast4(accountNumber),
                ifsc,
              };
            }

            const [accountHolderName, accountNumber, ifsc, vpa] = await Promise.all([
              soft(account.accountHolderNameCiphertext, 'accountHolderName'),
              soft(account.accountNumberCiphertext, 'accountNumber'),
              soft(account.ifscCiphertext, 'ifsc'),
              // ⚠ NULL for every nominee today — Story 8.4 shipped the VPA resolver seam ABSENT.
              // ⛔ Not an error, ⛔ not a gap, ⛔ not a reason to hold the render.
              soft(account.vpaCiphertext, 'vpa'),
            ]);
            return {
              masked: false,
              accountRank: account.accountRank,
              bankName: account.bankName,
              branch: account.branch,
              accountHolderName,
              accountNumber,
              ifsc,
              vpa,
            };
          },
        );

        ok = true;
        return {
          drive: {
            // ⚠ `poolLetterCode`, ⛔ not the curated registry name: `resolveCuratedPoolName` re-derives
            // it via `reserveNames`, which RESERVES rows — ⛔ a write path an unauthenticated GET may
            // not trigger. Mirrors `/sahyog` exactly.
            poolLetterCode: poolDomain.poolLetterCode(drive.poolIndex),
            poolCanonicalIdentifier: drive.poolCanonicalIdentifier,
            // ⚠ `driveStatus`, ⛔ NOT `status` — see `SAHYOG_VIVRAN_PROHIBITED_KEYS`. A key called
            // `status` on a contribution-bearing surface reads as a contribution pill, which is the
            // yellow/attested door 8.3 and 9.5 closed structurally.
            driveStatus: drive.status,
            closedAt: drive.driveClosedAt === null ? null : drive.driveClosedAt.toISOString(),
            // ⚠ `.trim() || null`, ⛔ not `=== ''`. A whitespace-only district passes the schema's
            // `.min(1)`, arrives TRUTHY so the page's fallback never fires, and renders a visually
            // BLANK cell where the design says "Not recorded" (the 11a.3 finding).
            // ⚠ Zero-width/invisible Unicode (U+200B–U+200F, U+FEFF) is stripped BEFORE the truthy
            // check for the same reason — an invisible-only value survives `.trim()` and `.min(1)`
            // and would render the identical blank cell (review finding).
            district: drive.district?.trim().replace(/[\u200b-\u200f\ufeff]/g, '') || null,
            confirmedContributionCount: drive.confirmedContributionCount,
            fundingOutcome: drive.fundingOutcome,
            appealReversal:
              drive.appealReversal === null
                ? null
                : {
                    reversedAtStage: drive.appealReversal.reversedAtStage,
                    // ⛔ THE BOUNDED TAG AND THE INSTANT, AND ⛔ NOTHING ELSE. The rationale text and
                    // the reviewer identity live on the `claim.appeal_stageN_reviewed` DECISION
                    // event's Tier-1 metadata row and are ⛔ NEVER public.
                    dispositionCategory: drive.appealReversal.dispositionCategory,
                    reversedAt: drive.appealReversal.reversedAt.toISOString(),
                  },
            // ⭐ STORY 11b.3a. ⛔ The two accounts are EQUAL payment destinations — `accountRank` is
            // row IDENTITY, ⛔ not a priority and ⛔ not a nominee rank (Story 9.9's re-scope). The
            // order is `#1` then `#2` because that is the substrate's order, ⛔ not a preference.
            nomineeBankAccounts,
          },
        };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}

/**
 * ⭐⭐ AC5's AUDIT LINE (Story 1.10) — the PUBLIC DISCLOSURE of an appeal reversal.
 *
 * ⛔ IT IS ⛔ NOT A "ROUTING" LINE, AND THAT WORDING CHANGE IS A RULING, ⛔ not a paraphrase. The epic
 * AC said the consumer *"routes the claim to the Sahyog Vivran publication queue"* and that the routing
 * is audit-logged. **D12(a)** (`2026-09-02-176`) ruled there is ⛔ no queue, ⛔ no consumer and ⛔ no
 * publication record — the hook is a RENDER-TIME DERIVATION — so there is ⛔ no routing act left to
 * log. ⭐ The accountable act that DOES occur is this one: a public, unauthenticated request caused an
 * appeal reversal to be disclosed. That is what this writes.
 *
 * ⚠ FIRES ⛔ ONLY WHEN A LINEAGE IS ACTUALLY DISCLOSED. A drive with no reversal writes NOTHING —
 * ⛔ never a "no reversal" line, which would put a fact about claims that were NOT appealed into the
 * audit chain, on every request, forever.
 *
 * ⚠⛔ WHAT BOUNDS IT, STATED RATHER THAN ASSUMED: `writeAuditEntry` serializes every writer on ONE
 * global advisory lock (DD-2 / W8-CR1.6), so an unauthenticated route writing one line per request
 * would be a serialization amplifier. The bound is control 1 — the named `limits.search` tier that
 * bounds the route itself — plus the rarity of a reversal. ⛔ Do not widen this to log every request,
 * and ⛔ do not "improve observability" by logging the non-reversal case.
 *
 * ⛔ THE PAYLOAD IS IDS AND A BOUNDED STAGE, AND ⛔ NOTHING ELSE. ⛔ No actor (the caller is an
 * anonymous visitor and there is ⛔ no member session on this surface to attribute to), ⛔ no IP (the
 * recorded IP is not evidence — `2026-08-21-145` RD2), ⛔ no disposition rationale, ⛔ no reviewer
 * identity, ⛔ no `claim_case_id` and ⛔ no `deceased_member_id`. ⚠ The RESOURCE LOCATOR is the public
 * route, which is already public by construction.
 *
 * ⛔ BEST-EFFORT, AND THE ORDER MATTERS: the disclosure has already been decided by the time this runs.
 * ⚠ ⛔ It is ⛔ NOT awaited-and-thrown: an audit-chain hiccup must not 500 a public transparency page,
 * which would turn a logging fault into an availability fault on the surface whose whole purpose is
 * being checkable. ⭐ The failure is logged loudly so a gap in the chain is never silent.
 */
async function writeAppealReversalDisclosureAudit(
  deps: AppDeps,
  pariwarId: string,
  poolCanonicalIdentifier: string,
  reversedAtStage: 1 | 2 | 3,
  traceId: string | null,
): Promise<void> {
  try {
    await audit.writeAuditEntry(deps.servicePool, {
      pariwarId,
      // ⛔ An anonymous public visitor. There is ⛔ no member session on this surface, by design
      // (`2026-08-23-154` disposition (c) — the authenticated tier has no viewer).
      actorId: null,
      actorRole: null,
      action: 'public_pages.sahyog_vivran.appeal_reversal_disclosed',
      resourceLocator: `pariwar/${pariwarId}/public-pages/sahyog-vivran/${poolCanonicalIdentifier}`,
      // ⚠ The BOUNDED stage only — ⛔ never the disposition tag's meaning, ⛔ never rationale.
      requestPayloadHash: createHash('sha256')
        .update(JSON.stringify({ poolCanonicalIdentifier, reversedAtStage }))
        .digest('hex'),
      responseStatus: 200,
      traceId,
    });
  } catch (err) {
    // ⛔ NEVER let the audit write break the page it describes — but ⛔ never swallow it silently
    // either: a gap in the §1.5 chain is exactly the thing that must be visible.
    console.error(
      '[public-pages] sahyog-vivran: appeal-reversal disclosure audit FAILED — the page rendered, the audit line did not',
      err,
    );
  }
}

/**
 * ⭐⭐ AC8 — MAKE THE INERT STATE OBSERVABLE, AND SEPARATE ITS TWO CAUSES.
 *
 * Story 11b.9 ships FAIL-CLOSED: until counsel's post-death clause is minted and pinned into an
 * effective T&C version, ⛔ NO name renders anywhere. ⚠ The surface is INERT, ⛔ not broken — but
 * from the outside "every row unnamed" looks identical to a bug, so it is said out loud here.
 *
 * ⛔⛔ THE CONTRAST PAIR IS ⛔ NOT "EVERYONE DECLINED" — ⛔ NOBODY CAN DECLINE ANY MORE. The family's
 * decline path was removed by ruling (`2026-08-28-160` cl.6) and the member's clause is a CONDITION
 * OF MEMBERSHIP, so that state is UNREACHABLE BY CONSTRUCTION. The two states that must be
 * separated are:
 *   (i)  PROVISIONING-INERT — ⛔ no effective T&C version in this Pariwar pins the clause, so ⛔ NO
 *        member in it can be named at all. A WHOLE-PARIWAR condition with a PROVISIONING answer.
 *   (ii) PER-MEMBER — the clause IS pinned, but THIS member has no valid `tc_acceptance`, has
 *        revoked it, or accepted a version that does not pin it. A MEMBER-RECORD answer.
 * ⛔ A diagnostic that cannot tell (i) from (ii) sends the first responder to the wrong half.
 *
 * ⚠ MEMBER-ATTRIBUTED, and the signal is the ACTION NAME
 * ([[project_anonymous_diagnostic_log_convention]]): the (ii) line carries the deceased member's id
 * so the record can actually be looked up, and (i) carries only the Pariwar because it is ⛔ not a
 * per-member fact at all. ⛔ NO free text, ⛔ no ciphertext, ⛔ no name, ⛔ no district — the payload
 * is ids and counts only. ⚠ A server log is ⛔ not the public wire: `deceasedMemberId` is
 * INTERNAL-ONLY and is still ⛔ never serialized onto a response (11a.3 control 5).
 *
 * ⚠⭐ AT MOST ONE EXTRA QUERY PER REQUEST, and ⛔ ONLY when a row actually came back unnamed — the
 * D7(a) N+1 must not return through this door either. A fully-named page costs ⛔ nothing.
 *
 * ⛔ BEST-EFFORT: this is telemetry about a page that has already been resolved. A diagnostic that
 * could 500 the public page it is describing would be strictly worse than no diagnostic.
 */
async function logNamePublicationBasisAbsence(
  tx: Parameters<typeof poolDomain.isSahyogDrivePublicationClausePinned>[0],
  pariwarId: ids.PariwarId,
  rows: readonly { namePublicationAuthorised: boolean; deceasedMemberId: string }[],
): Promise<void> {
  const unauthorised = rows.filter((r) => !r.namePublicationAuthorised);
  if (unauthorised.length === 0) return;

  try {
    const clausePinned = await poolDomain.isSahyogDrivePublicationClausePinned(tx, pariwarId);

    if (!clausePinned) {
      // (i) WHOLE-PARIWAR. ⛔ Deliberately NOT emitted per member: attributing a provisioning gap to
      // each individual member is the thing that would send the responder to the wrong half.
      // ⚠ `console.info`, ⛔ NOT warn/error (review 2026-08-29): this is expected, ⛔ not a bug — it
      // fires on close to every request in this Pariwar for the whole fail-closed period.
      console.info(
        '[public-pages] sahyog-drive: name-publication-basis PROVISIONING-INERT — no effective T&C version in this Pariwar pins the publication clause, so no member can be named (11b.9 AC8; expected until the clause is minted and pinned)',
        { pariwarId, unnamedRowsOnThisPage: unauthorised.length },
      );
      return;
    }

    // (ii) PER-MEMBER. The clause IS pinned for this Pariwar ⇒ the gap is in the member's own
    // record: no valid `tc_acceptance`, a revoked one, or one against a version that does not pin.
    // ⚠ Deduped by `deceasedMemberId` (review 2026-08-29): a member with more than one Sahyog Drive
    // pool on the same page must log once, ⛔ not once per pool.
    for (const memberId of new Set(unauthorised.map((r) => r.deceasedMemberId))) {
      // ⚠ `console.debug`, ⛔ NOT warn/error (review 2026-08-29) — see (i) above.
      console.debug(
        '[public-pages] sahyog-drive: name-publication-basis ABSENT-PER-MEMBER — the publication clause IS pinned for this Pariwar, so this member has no valid tc_acceptance, has revoked it, or accepted a version that does not pin it (11b.9 AC8)',
        { pariwarId, deceasedMemberId: memberId },
      );
    }
  } catch (err) {
    // ⛔ NEVER let telemetry break the page it describes.
    console.error(
      '[public-pages] sahyog-drive: name-publication-basis diagnostic failed — rendering is unaffected',
      err,
    );
  }
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
