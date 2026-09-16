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
  PUBLIC_SURFACE_PAGE_SIZE_CAP,
  type PublicSahyogVivranContributor,
  type PublicSahyogVivranNomineeAccount,
  type PublicSahyogVivranParams,
  type PublicSahyogVivranQuery,
  type PublicSahyogVivranResponse,
} from '@twt/contracts';
import {
  audit,
  // ⭐ Story 11b.3b (Task 3) — the SHARED confirmed-contributor producer and its RULED ordering.
  // ⛔ Never re-implemented here: that would fork *"earliest LIVE confirmation"*, the rule the member
  // surface and this one must agree on ([[project_confirmed_contributor_read_is_ordered]]).
  contribution as contributionDomain,
  // ⛔ `claim as claimDomain` WAS IMPORTED HERE for `claimDomain.maskAccountNumberLast4`, the ⛔ ONLY
  // use it had on this surface. Story 11b.11 withdrew the account number from `public`
  // (`2026-09-04-190` cl.1) ⇒ there is nothing to truncate and the import went with the call.
  // ⛔⛔ THE FUNCTION IS ⛔ NOT DELETED — `-190` **cl.4** RETAINS the masking machinery, including
  // `maskAccountNumberLast4`, which is still exported from `@twt/domain` and still tested there.
  // ⚠ It has ⛔ NO PUBLIC CONSUMER.
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
            // ⭐⭐ STORY 11b.14 (AC7) — THE NOMINEE'S NAME. Trustee-ratified 2026-09-05;
            // `2026-09-07-205` cl.1.
            //
            // ⚠⛔ IT RIDES THE **SAME** BOUNDED MAP, ⛔ never a second pass and ⛔ never
            // `Promise.all`. ⭐ ONE extra `decryptDek` round-trip per row that has an account —
            // ⛔ not two: the two accounts are EQUAL destinations for the SAME nominee (an RBI
            // per-account-cap workaround, ⛔ not one row per declared nominee), so the domain read
            // returns exactly ONE ciphertext and decrypting the second would be a Tier-1 decrypt
            // with ⛔ no authorising purpose.
            // ⭐ ⇒ the step is 50 → up to 100 per request, ⛔ not the "up to 150" an earlier framing
            // estimated — ⚠ and ⛔ neither is it the "1-2 → 100" a framing before THAT recorded:
            // this index ALREADY performed up to 50 Tier-1 decrypts (the deceased member's name).
            //
            // ⛔⛔ THERE IS ⛔ NO SECOND GATE ON IT, AND THAT IS RULED, ⛔ not an omission. The
            // deceased member's name is gated on the MEMBER'S OWN accepted T&C clause; the nominee
            // name has ⛔ no such basis and needs none — `2026-09-04-190` cl.2 published it, and
            // `-205` cl.9 records that narrowing it by claim OUTCOME would be a NEW suppression
            // rule ⛔ nobody has ruled. ⛔ Do ⛔ not invent one here.
            //
            // ⭐ OMIT THE NAME, ⛔ KEEP THE ROW — the list-shaped posture COPIED from the deceased
            // member's decrypt below, ⛔ not re-derived. Letting one bad envelope throw would 500
            // the ENTIRE page for the whole Pariwar.
            // ⛔ The decrypted value ⛔ NEVER leaves this closure except as `nomineeName`, and is
            // ⛔ never logged.
            let nomineeName: string | null = null;
            if (row.nomineeAccountHolderNameCiphertext !== null) {
              try {
                const decrypted = await encryption.decryptKycField(
                  row.nomineeAccountHolderNameCiphertext,
                  pariwarId,
                  deps.encryption,
                );
                // ⛔ An empty or whitespace-only value renders NOTHING — the contract's `.min(1)`
                // would 500 the whole page on `''`, and a blank name is not a name.
                nomineeName = decrypted.trim() || null;
              } catch (err) {
                console.error(
                  '[public-pages] sahyog-drive: nominee name decrypt failed — omitting the NAME, keeping the row',
                  err,
                );
              }
            }

            const base = {
              poolLetterCode: poolDomain.poolLetterCode(row.poolIndex),
              poolCanonicalIdentifier: row.poolCanonicalIdentifier,
              // ⭐ Story 11b.10 (AC3) — the drive's OPAQUE PUBLIC ADDRESS. Serialized so the index's
              // per-row link can be built from it; ⛔ the client never derives an address from
              // `poolCanonicalIdentifier`, which is no longer addressable.
              // ⚠⛔ SAY WHAT THIS DOES: every listed drive becomes ONE CLICK from four Tier-1 fields
              // under `D8-default` FAIL-OPEN. That is the NECESSARY CONSEQUENCE of `2026-09-03-184`
              // (A)+(B) (D3), ⛔ not a fresh exposure decision — and it is written here so a reviewer
              // meets it in prose rather than discovering it in a diff.
              publicToken: row.publicToken,
              status: row.status,
              closedAt: row.driveClosedAt === null ? null : row.driveClosedAt.toISOString(),
              // ⚠ `.trim() || null`, ⛔ not `=== ''`. A whitespace-only district passes the schema's
              // `.min(1)`, arrives TRUTHY so the page's fallback never fires, and renders a visually
              // BLANK cell where the design says "Not recorded" (the 11a.3 finding).
              district: row.district?.trim() || null,
              confirmedContributionCount: row.confirmedContributionCount,
              // ⭐ Story 11b.14 (AC2) — the meter's fill, computed in the domain read.
              confirmedPercentage: row.confirmedPercentage,
              // ⭐⭐ लक्ष्य — Story 11b.14 (`D4`). ⚠⛔ **SPREAD, ⛔ NOT ASSIGNED**: the key is
              // **ABSENT** when the Pariwar has not revealed the figure, ⛔ never `null` (the
              // 11b.11 shape). ⭐ `resolveDriveTargetVisibility`'s absent-row default is
              // FAIL-CLOSED ⇒ ⛔ absent for every Pariwar at launch.
              ...(row.driveTargetInr === null ? {} : { driveTargetInr: row.driveTargetInr }),
              // ⭐ Story 11b.14 (AC3) — the ruled public money figure, `-190` cl.6. ⛔ Returned from
              // the domain read's own `deliveredTotal`; ⛔ ⛔ no second `× fixedAmount` here.
              amountRaisedInr: row.amountRaisedInr,
              // ⭐ Story 11b.14 (AC7) — resolved ABOVE the base object (⚠ the prior text of this
              // comment said *"just below"*, which it never was); `null` when the claim
              // carried no bank details or the decrypt failed. ⛔ NULL NEVER OMITS THE ROW.
              nomineeName,
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
            // ⚠ `.trim() || null`, ⛔ not `=== ''` (Review finding, 2026-09-08) — a whitespace-only
            // name would otherwise survive as "present" into `zero_line.*` / `index_line.*` and
            // render "Late    's family awaits your support." This matches the `.trim() || null`
            // posture the `district` and `nomineeName` normalisations above already use.
            return { ...base, deceasedMemberName: name.trim() || null };
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
     * `GET /api/v1/p/:pariwarId/public-pages/sahyog-vivran/:driveToken` — ONE drive's Sahyog Vivran.
     * Story 11b.3 (AC1, AC3, AC5, AC6); ⭐ re-addressed by Story 11b.10 (AC1).
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
     * ⭐⛔ 404 COLLAPSES **FOUR** CASES ON PURPOSE — *"no such drive"*, *"exists but is not visible
     * here"* (a `spawned` pool), *"this Pariwar's public surfaces are switched off"* and — ⭐ Story
     * 11b.10's addition — *"a REAL drive addressed with a WRONG or ABSENT token"*. ⛔ A response that
     * distinguishes them is an ENUMERATION ORACLE. ⛔ Never a 403, ⛔ never a distinct error code,
     * ⛔ never a different body shape.
     * ⚠⭐ AMENDED: this used to ground the rule on *"`P-YYYY-MM-###` is SEQUENTIAL, which is exactly
     * when that matters"*. ⭐ The sequential identifier is ⛔ no longer the address (11b.10), so the
     * ground is now the fourth case above — the byte-identical refusal is what stops the token itself
     * becoming testable. ⛔ Amended rather than deleted: the next reader will look for the old claim.
     */
    async sahyogVivran(
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<PublicSahyogVivranResponse | void> {
      const { pariwarId: pariwarIdStr, driveToken } = request.params as PublicSahyogVivranParams;
      const pariwarId = ids.pariwarId(pariwarIdStr);
      // ⭐⭐ STORY 11b.3b (Task 3, AC4) — THIS ROUTE IS PAGINATED NOW, and controls 2 and 3 are
      // RESTORED with it (`sahyog-vivran-controls.ts` ordinals 2 and 3, and `login-wall.spec.ts`).
      // ⚠ Both bounds live on the `.strict()` query schema (`.max(PUBLIC_SURFACE_PAGE_SIZE_CAP)` /
      // `.max(PUBLIC_DIRECTORY_PAGE_HORIZON)`), so an out-of-range value is a **400** here and is
      // ALSO visible to Story 1.14's forced-pagination guard walking the live swagger document.
      // ⚠⛔ **THE DEFAULT IS THE CAP, AND THAT IS A CHOICE WORTH STATING:** a drive's confirmed
      // contributors are bounded by its own roster, so splitting ONE drive's record across pages by
      // default would make a transparency page under-report at a glance. ⭐ The CAP still bounds the
      // exposure and the decrypt fan-out (≤ 50 Tier-1 decrypts per request, the figure `-205` cl.5
      // measures this surface by); ⛔ raising the cap is an FR-91 ruling, ⛔ not a tuning knob.
      const query = request.query as PublicSahyogVivranQuery;
      const page = query.page ?? 1;
      const limit = query.limit ?? PUBLIC_SURFACE_PAGE_SIZE_CAP;
      const offset = (page - 1) * limit;

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
        //
        // ⚠⛔⛔ **THE PARAGRAPH ABOVE IS SPENT — ITS PREMISE EXPIRED WHEN STORY 11b.3b SHIPPED THE
        // CONTRIBUTOR LIST (2026-09-15). ⛔ IT IS KEPT AS THE RECORD AND ⛔ NOT REWRITTEN**
        // ([[feedback_supersede_never_reinterpret]]). ⛔ The counter is STILL not called — ⭐ but ⛔ no
        // longer for the reason given, and the real reason is a governance one, ⛔ not a shape one.
        //   · ⛔ *"this route has neither"* — **FALSE**: it now takes a bounded `page` and `limit`
        //     (controls 2 and 3, RESTORED). ⇒ ⭐ all four ACTIVE rules have a SUBJECT in the data the
        //     evaluator would receive; ⚠ `deep_crawl` / `deep_page_access` / `rapid_pagination` are
        //     reachable because `limit` goes down to **1**, so a 50-contributor drive is 50 pages.
        //   · ⛔ *"feeding it synthetic values"* — **FALSE**: the values are real now, ⛔ not fabricated.
        //   · ⭐ AND THE RULES FILE'S OWN SCOPE ALREADY REACHES THIS ROUTE — it describes
        //     *"an unauthenticated, paginated public collection"*, ⛔ **not** the Member Directory
        //     specifically (`directory-abuse-rules.yaml`, the TWO-SURFACES block).
        //
        // ⛔⛔ **SO WHY IT IS STILL NOT CALLED — AND THIS IS ROUTED, ⛔ NOT DECIDED HERE.**
        // ⭐ **(1) WIRING IT IS A REAL CHANGE, ⛔ NOT A CALL-SITE ADDITION — the file says so in its own
        //     words**, about the last rule whose applicability changed: activation needs *"a threshold
        //     chosen against real … shapes, and its own planted negative control"*, ⛔ *"not a status
        //     flip"* — and thresholds must be **per SURFACE**, *"because one shared threshold would
        //     either miss a crawl on the busier one or flag ordinary use on the quieter."*
        //     ⚠ Here that lands in the **MISS** direction and it is not close: `high_volume_lookups`
        //     is **60 requests / 60 s**, calibrated for a reader paging a roster. Legitimate use of a
        //     DRIVE page is one to three requests — and at 59 requests/minute a harvester pulling one
        //     drive per request takes up to **~2,950 full legal names a minute** and ⛔ never fires.
        //     ⇒ ⛔ calling the evaluator with the directory's thresholds would ship a counter that
        //     reports green through exactly the abuse it is named for — the vacuous-green defect this
        //     whole file exists to refuse.
        // ⭐ **(2) AND THE EXPOSURE JUDGEMENT IS THE PANEL'S, ON A PREMISE THIS STORY CHANGED.**
        //     `2026-09-02-183` is **Trustee-ratified** and its subject is *"a Tier-1-bearing
        //     **SINGLE-ITEM GET**"* — 11b.3a's AC2 reserves that judgement to the Panel, *"⛔ not a
        //     tuning knob — in either direction."* ⚠⛔ This route is ⛔ **no longer a single-item GET**:
        //     it serves up to **50 decrypted Tier-1 names per request**. ⇒ ⭐ the ratified judgement
        //     stands, ⛔ but the thing it was made about has changed shape, and re-posing it is a
        //     **Panel** act ([[feedback_gap_analysis_observational]]).
        // ⇒ ⭐ **ROUTED in `deferred-work.md` with its trigger. ⛔ Story 11b.3b does ⛔ NOT claim to have
        // discharged it, and ⛔ does ⛔ not wire the counter under cover of a render story.**

        // ⭐⭐ STORY 11b.10 — RESOLVED BY THE OPAQUE PUBLIC ADDRESS TOKEN, ⛔ never by the sequential
        // `P-YYYY-MM-###`. ⛔ There is no second lookup and no fallback arm: a route accepting either
        // form has ⛔ not closed the walk (Trap 3).
        const drive = await poolDomain.readPublicSahyogVivran(scopeTx.tx, pariwarId, driveToken, {
          now,
        });
        // ⭐⛔ THE **FOURTH** COLLAPSED CASE LANDS HERE — *"a REAL drive addressed with a WRONG or
        // ABSENT token"* (Story 11b.10, AC1). ⚠ It reuses the EXISTING control rather than adding
        // one: the token is part of the domain read's WHERE clause, so a wrong address produces the
        // same `null` a non-existent drive does and exits through this same line, BYTE-IDENTICALLY.
        // ⛔⛔ NEVER make it a 403, a distinct code, or a different body — a response that
        // distinguishes *"real drive, wrong token"* from *"no such drive"* confirms which addresses
        // name something, which is precisely the enumeration oracle the token was introduced to
        // remove. ⚠ ⛔ And it is ⛔ NOT the 503 arm either: that is the OUTAGE path.
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
            // ⭐⛔ THE AUDIT LINE KEEPS THE **CANONICAL IDENTIFIER**, ⛔ NOT THE TOKEN (Story 11b.10,
            // AC1 / `2026-09-03-184` cl.2). `P-YYYY-MM-###` is RETAINED as the operational/audit key
            // — it is what an operator, a trustee and every other audit line in this system name a
            // drive by — and swapping it for the address here would make this record unjoinable to
            // the rest of the audit trail and would additionally write a live public ADDRESS into
            // the durable audit chain. ⭐ It is read from the drive the token resolved to, so it
            // still describes exactly the row that was disclosed.
            drive.poolCanonicalIdentifier,
            drive.appealReversal.reversedAtStage,
            request.requestContext.traceId ?? null,
          );
        }

        // ⭐⭐ STORY 11b.3a — THE TIER-1 DECRYPT, AND EVERY BOUND ON IT, STATED HERE.
        // ⭐⭐ AMENDED BY STORY 11b.11 — **FIVE OF THE SIX NOMINEE-BANK VALUES ARE WITHDRAWN.**
        //
        // ⚠⛔ THIS IS WHERE THE ROUTE BECAME **PII-BEARING**. `routes.ts`'s header and the
        // `login-wall.spec.ts` allowlist entry are updated in the SAME commit to state the control
        // set that applies now — ⛔ both with the SAME count, because *"two authoritative documents
        // disagreeing on how many controls exist is the defect this file records having already had
        // once"*.
        // ⭐⛔ **THE PROPERTY IS NARROWED, ⛔ NOT REVOKED.** `2026-09-04-190` cl.1 (Trustee-ratified)
        // withdraws the account number, IFSC, bank name and branch; `2026-09-04-191` cl.1 withdraws
        // the VPA; `-190` cl.2 KEEPS the account-holder name, rendered under the public label
        // **"Nominee Name"**. ⇒ this route is ⛔ no longer PII-bearing IN THE NOMINEE-BANK SENSE,
        // ⚠ but it still decrypts ONE Tier-1 value and still carries 11b.3b's deceased-member
        // exposure. ⛔ Do ⛔ not restore the pre-11b.3a wording anywhere.
        //
        // ⭐ THE AMPLIFICATION, BOUNDED AND SAID IN WRITING RATHER THAN LEFT TO BE RE-DERIVED:
        // a Sahyog Vivran page decrypted **AT MOST EIGHT** values — four fields × at most two EQUAL
        // accounts — against the directory's FIFTY per page, which is why
        // `DIRECTORY_DECRYPT_CONCURRENCY = 8` was introduced at 11a.3. ⭐⛔ **IT IS NOW AT MOST
        // TWO** — one field × at most two EQUAL accounts. The concurrency bound is retained
        // unchanged: it is the boundary's shared discipline, ⛔ not a per-surface tuning knob.
        // ⚠⛔ **AND THE MASKED-PROJECTION ARM IS GONE FROM THIS HANDLER.** It read cl.10(e)'s
        // retention list and decrypted only the account number and the IFSC. With the coordinates
        // withdrawn both arms of the old `masked` union reduce to the holder name and become
        // IDENTICAL, so 11b.11's **D1(b)** collapsed the public wire to a single shape.
        // ⛔⛔ **MASKING WAS ⛔ NOT DELETED.** `-190` **cl.4** RETAINS `isNomineeBankMasked`, the
        // `pariwar_nominee_bank_masking_schedule` table, its permission key, its admin surface and
        // every one of its tests. ⚠ Its STATUS changed: it has ⛔ **NO PUBLIC CONSUMER**, the domain
        // read no longer resolves the schedule, and ⛔ nothing Trustee-facing may call it a live
        // safeguard until it has a consumer again. ⛔ `2026-09-04-191` cl.2 still binds the dormant
        // projection: it must ⛔ NOT drop the nominee name.
        //
        // ⭐⛔ AND THE ROUTE'S ENUMERATION BOUND. `P-YYYY-MM-###` is **SEQUENTIAL**, and it is no
        // longer the address: Story 11b.10 shipped the opaque `publicToken` on `2026-09-03-184` (B),
        // Trustee-ratified ⇒ ⛔ the walk this paragraph used to warn about is CLOSED, and `-190`
        // cl.1 additionally removed four of the five Tier-1 values it would have reached.
        // ⚠ `limits.search` is UNCHANGED and ⛔ must not be tightened or loosened on this line —
        // that is **A DECISION** (`2026-09-02-183` cl.5). ⚠ `D8-default` FAIL-OPEN
        // (`2026-09-02-179` cl.1) is likewise UNCHANGED; what changed is that this surface no longer
        // has a masking decision for it to govern.
        //
        // ⚠⭐ AND THE INVERSION THIS PUBLISHES, RECORDED HERE RATHER THAN LEFT FOR A REVIEWER
        // (`D5-subject`) — ⛔ **it SURVIVES the withdrawal and is now the ONLY thing published**:
        // the value below is guarded by a real multi-stage human approval chain — verifier → state
        // trustee → freeze — that ⛔ **CANNOT SEE IT**. The verifier console has ⛔ no bank surface,
        // ⛔ no verification handler reads the field, and even a tier-2 admin making a correction
        // reads back only `NomineeBankStatusResponse`, a PRESENCE view (`holderNamePresent:
        // boolean`). ⇒ ⛔ **this route publishes to the internet a value no approver in that chain
        // can read.** ⭐ Closing it is a **verifier-console** act (Story 6.10's family), ROUTED at
        // `deferred-work.md` and ⛔ not built here.
        //
        // ⚠⛔ AND THE NAME IS ⛔ NOT LINKED TO A DECLARED NOMINEE BY ANYTHING IN THE DATA. 6.8's D1
        // removed the linkage deliberately — ⛔ no FK to `member_nominees`, ⛔ no rank, ⛔ no match
        // rule ([[project_nominee_bank_disbursement_channel]]). It is the ACCOUNT HOLDER, and the
        // column, the field id and the wire key all still say so.
        // ⭐⛔ **THE PUBLIC LABEL IS NEVERTHELESS "Nominee Name" — `2026-09-04-190` cl.2,
        // Trustee-ratified, and it OVERRIDES THE PRESENTATION.** ⚠ The sentence above is about the
        // DATA and it STANDS; ⛔ do ⛔ not "reconcile" the two by adding a join or a match rule, and
        // ⛔ do ⛔ not resolve `deferred-work.md`'s `D5-subject(i)` that way.
        // ⚠⛔ **THE RESIDUAL, STATED PLAINLY BECAUSE THE PAGE NOW ASSERTS IT TO THE INTERNET:** the
        // account holder **may not be the nominee**, and per `D5-subject(ii)` ⛔ nobody in the
        // approval chain can read the value to notice. ⇒ the ⛔ one field that survives this
        // withdrawal is both UNVERIFIED and, today, UNVERIFIABLE.
        //
        // ⚠⛔ **AND THE DECRYPT FAN-OUT IS STILL UNCONDITIONAL ON THE DRIVE'S OUTCOME.** The map
        // below has ⛔ no outcome predicate, and until 11b.11 the ⛔ only suppressor on this path was
        // the time-since-close masking verdict ⇒ a **DENIED** claim, or one whose approval was
        // **REVERSED ON APPEAL**, still published the holder's name and full account number
        // indefinitely under FAIL-OPEN. `2026-08-28-160` cl.10(a) authorises publication *"during an
        // active campaign"*; ⛔ nothing checked the campaign was LEGITIMATE, only that it was RECENT.
        // ⭐ The COORDINATES half is closed by deletion above. ⚠⛔ The **NAME** is still published
        // unconditionally, and `-190` cl.2 keeps it there — ⛔ narrowing it by outcome would be a NEW
        // suppression rule ⛔ nobody has ruled, so it is ⛔ RECORDED here, ⛔ not invented.
        // ⛔ The member donor path is a DIFFERENT read and inherits ⛔ nothing from this deletion.
        // ⭐⭐ STORY 11b.3b (Task 2 unit 2) — THE DECEASED MEMBER'S NAME, `2026-09-02-173`
        // (Trustee Panel), **FULL NAME**, unconditional per `-175`.
        //
        // ⚠⛔⛔ **IT RENDERS ⛔ NOTHING ON THE DAY THIS SHIPS, AND THAT IS THE DESIGNED STATE.**
        // `namePublicationAuthorised` is FALSE for every member until counsel's clause exists and is
        // pinned — ⛔ no migration, ⛔ no seed, ⛔ no writer anywhere in the repo, OVERDUE since
        // 2026-09-07. ⇒ this block costs ZERO KMS calls today and returns `null`. ⭐ Fail-closed and
        // therefore CORRECT (`2026-09-08-209` cl.2); ⛔ ⛔ do ⛔ not "fix" it by seeding a placeholder
        // `clause_versions` row — *"a stand-in makes names render on an authority that does ⛔ not
        // exist"* (`public-read.ts`).
        //
        // ⭐⛔ **THE BASIS IS EVALUATED *BEFORE* THE DECRYPT, ⛔ NEVER AFTER** — the shipped rule on
        // the sibling index, copied rather than re-derived. A page with no basis must cost ZERO KMS
        // calls: decrypting a name the gate is about to discard is a wasted round-trip on a
        // quota-limited service AND a Tier-1 decrypt with ⛔ no authorising basis, and the second
        // half is the one that matters (11b.9 AC6).
        // ⚠ A MISSING `tc_acceptance`, a REVOKED one, one against a T&C version that does ⛔ not pin
        // the publication clause, and a deceased member with ⛔ no KYC profile row all reach this
        // `null` IDENTICALLY. ⛔ That is intended: ⛔ none of them authorises a render, and a
        // per-cause signal on the wire would be an enumeration oracle over T&C acceptance.
        //
        // ⚠⛔ **ONE DECRYPT FOR THE WHOLE PAGE, ⛔ not per row** — so it rides ⛔ NO bounded map and
        // needs none. ⭐ `mapWithConcurrency` exists for the LIST shapes (the index's 50 rows, and
        // this story's own contributor list at Task 3); ⛔ wrapping a single await in it would be
        // ceremony that asserts a bound nothing needs.
        // ⭐ THE PER-PARIWAR STORED NAME MODE — RESOLVED **ONCE PER REQUEST**, ⛔ never per row and
        // ⛔ never per subject. A config value that cannot vary within one response, so a second read
        // would be an N+1 on a constant (the sibling index states the same rule).
        // ⚠⛔ **HOISTED AT TASK 3** — it was resolved inside the deceased-name branch at Task 2, which
        // was correct while that was its only consumer. ⭐ The contributor list is the second, and
        // ⛔ BOTH SUBJECTS MUST RESOLVE UNDER THE SAME MODE: two reads could straddle a governed mode
        // change mid-request and render the deceased member and the contributors in DIFFERENT forms
        // on one page. ⛔ Do ⛔ not push it back down.
        // ⛔ ⛔ Never a literal `'full_name'`: `2026-08-19-136` cl.1 — *"a build in which the public
        // name form cannot be changed without a code change FAILS this clause"*.
        const mode = await kyc.resolvePublicNamePresentationMode(scopeTx.tx, pariwarId);

        let deceasedMemberName: string | null = null;
        if (drive.namePublicationAuthorised && drive.deceasedNameCiphertext !== null) {
          // ⭐ THE TIER-1 DECRYPT — the EXISTING helper, the EXISTING field class, the member's real
          // pariwarId. ⛔ No new field class, ⛔ no new namespace, ⛔ no second crypto helper. The
          // decrypted value ⛔ NEVER leaves this block except through `resolvePublicMemberName`, and
          // is ⛔ never logged.
          let storedName: string | null = null;
          try {
            storedName = await encryption.decryptKycField(
              drive.deceasedNameCiphertext,
              pariwarId,
              deps.encryption,
            );
          } catch (err) {
            // ⭐⭐ OMIT THE NAME, ⛔ KEEP THE **PAGE** — the deceased member's arm of AC3's
            // per-subject omission ruling, and the sibling's shipped rule (*"an unresolvable name
            // omits the NAME, ⛔ never the row"*). ⛔ Letting this throw would 503 an entire public
            // transparency page over one bad envelope, turning a crypto fault into an availability
            // fault on the surface whose whole purpose is being checkable.
            // ⚠⛔ The CONTRIBUTOR arm at Task 3 is the OPPOSITE (omit the ROW, which exists only to
            // carry the name) — ⛔ do ⛔ not collapse the two.
            request.log.error(
              { err },
              'sahyog-vivran: deceased-member name decrypt failed — omitting the NAME, keeping the page',
            );
          }

          // ⭐⭐ THE ERASURE BACKSTOP, mirrored from the contributor list at Task 3 (Trap 4, AC5;
          // `2026-08-30-169` / `2026-08-30-170`). `anonymizeMember` overwrites `name_ciphertext`
          // IN PLACE with an *encrypted* `[anonymized]` sentinel and RETAINS the row ⇒ the decrypt
          // above SUCCEEDS, and without this check the page would render **`[anonymized]`** where
          // the deceased member's name belongs, once `namePublicationAuthorised` goes live.
          // ⛔ An empty-name guard does ⛔ NOT catch it — the sentinel is a non-empty string.
          // ⛔ IMPORTED FROM `@twt/domain`, ⛔ never the re-typed literal.
          if (storedName === memberDomain.ANONYMIZED_SENTINEL) {
            request.log.warn(
              'sahyog-vivran: erasure sentinel reached the deceased-member decrypt — omitting the NAME, keeping the page',
            );
            storedName = null;
          }

          if (storedName !== null) {
            // ⭐⛔ `resolvePublicMemberName`, ⛔ NEVER `resolvePoolIdentity()` — the sharpest build
            // consequence of the ruling and *"the easiest thing to get wrong on a POOL surface"*:
            // `resolvePoolIdentity()` HARD-CODES `splitFirstNameLastInitial`, so it can ⛔ only ever
            // return the SHIELDED form on the one surface ruled FULL NAME, with every test green.
            // ⛔ And ⛔ never `splitFirstNameLastInitial` directly, for the same reason.
            // ⚠⛔ **THE RESOLVER IS INSIDE THE GUARD, ⛔ NOT AFTER IT** (Review finding, 2026-09-16
            // second pass). ⭐ The decrypt's own `catch` above commits to *"⛔ Letting this throw would
            // 503 an entire public transparency page"* — but only the DECRYPT was covered; this call
            // sat OUTSIDE it, while the CONTRIBUTOR arm puts the identical call INSIDE its `try`.
            // ⛔ The asymmetry was not defensible either way round.
            try {
              const name = kyc.resolvePublicMemberName(mode, storedName);
              // ⚠⛔ **`normalisePublicName`, ⛔ NEVER a bare `.trim()`** (Review finding 2026-09-08 for
              // the whitespace half; 2026-09-16 for the zero-width half) — a whitespace-only OR
              // invisible-only stored name survives `=== ''` and the contract's `.min(1)`, arrives
              // TRUTHY, and renders a BLANK where a person's name belongs.
              // ⚠ Under `shielded_name` a MONONYM resolves to `''` (`2026-08-21-145` cl.3) and lands
              // here as `null`. ⛔ Do ⛔ NOT "fix" that by falling through to `firstName`:
              // `public-name.ts` records that exact bug — for a mononym it returns the ENTIRE stored
              // legal name, byte-identical to `full_name`.
              deceasedMemberName = normalisePublicName(name);
            } catch (err) {
              request.log.error(
                { err },
                'sahyog-vivran: deceased-member name resolution failed — omitting the NAME, keeping the page',
              );
            }
          }
        }

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

            // ⭐⛔ ONE DECRYPT. ⛔ There is no `accountNumber`, no `accountNumberLast4`, no `ifsc`,
            // no `vpa`, no `bankName` and no `branch` key on this shape — ABSENT, ⛔ never `null` —
            // and `.strict()` on the contract makes adding one a parse error rather than a silent
            // extra field. ⛔ Do ⛔ not re-add a `soft(account.vpaCiphertext, 'vpa')` here.
            const accountHolderName = await soft(
              account.accountHolderNameCiphertext,
              'accountHolderName',
            );
            return { accountRank: account.accountRank, accountHolderName };
          },
        );

        // ═══════════════════════════════════════════════════════════════════════════════════════
        // ⭐⭐ STORY 11b.3b (Task 3, AC3/AC4) — THE CONFIRMED CONTRIBUTOR LIST, `2026-09-02-174`
        // (Trustee Panel), at the **FULL NAME**, unconditional per `2026-09-02-175`.
        // ═══════════════════════════════════════════════════════════════════════════════════════
        //
        // ⚠⛔⛔ **SAY WHAT THIS DOES, BECAUSE THE TITLE HIDES IT.** This publishes up to FIFTY LIVING
        // MEMBERS' FULL LEGAL NAMES on an UNAUTHENTICATED, EDGE-CACHED page — while the deceased
        // member the drive is named for renders NOTHING (the basis above is inert). ⭐ That asymmetry
        // is RULED AND INTENDED (`-174` + `-175` gate on the member's OWN accepted T&C, which has
        // ⛔ no clause dependency), ⛔ it is not a defect — ⛔ but ⛔ do ⛔ not ship or review this
        // believing the page is dark.
        //
        // ⭐ **THE PRODUCER IS THE SHARED ONE, ⛔ NEVER A SECOND READ.**
        // `listConfirmedContributorsForPool` sources EXCLUSIVELY from `contribution.confirmed` plus
        // its compensating `reconciliation.confirmation-reversed`, and returns them ordered by the
        // **EARLIEST LIVE CONFIRMATION's `event_version`** — ⛔ NEVER by `member_id`, which would leak
        // an arbitrary identifier ordering onto a public render. ⛔ Re-implementing that ordering here
        // would fork a rule the member surface and this one must agree on
        // ([[project_confirmed_contributor_read_is_ordered]]).
        // ⛔⛔ **AND ⛔ NO SORT PARAMETER, EVER** — the query schema is `.strict()` with exactly `page`
        // and `limit`. A caller-chosen ordering over a list of names is a leaderboard control in the
        // query string, and 11b.1 **AC5** forbids ranking outright.
        const confirmedContributors = await contributionDomain.listConfirmedContributorsForPool(
          scopeTx.tx,
          {
            pariwarId,
            // ⚠ `cycleId` rides the params for caller symmetry with the pool/alert reads; the read
            // itself keys on `poolId`, which is 1:1 with a cycle and alone scopes the query.
            cycleId: ids.cycleFreezeCommitId(drive.cycleId),
            poolId: ids.poolId(drive.poolId),
          },
        );

        // ⚠⛔ `total` IS THE CONFIRMED-CONTRIBUTOR SET SIZE, ⛔ NOT THE RENDERED ROW COUNT — the
        // omissions below happen AFTER paging, so a page can return FEWER rows than it claims. ⭐ That
        // is BY DESIGN (`2026-08-30-169`), and ⛔⛔ there is ⛔ NO omission count, ⛔ no "some names
        // withheld" line and ⛔ no per-row marker: a tally of omissions is an enumeration signal over
        // which members were erased.
        const total = confirmedContributors.length;

        // ⭐⭐ **PAGE FIRST, DECRYPT SECOND — ⛔ NEVER THE OTHER WAY ROUND.** This is the whole
        // anti-fan-out property: slicing here bounds the Tier-1 decrypts to `limit` (≤ 50) instead of
        // to the pool roster. ⛔ Decrypting the full set and paging the result would do the expensive,
        // quota-bearing work for rows nobody asked for, on an UNAUTHENTICATED route.
        const pageContributors = confirmedContributors.slice(offset, offset + limit);

        // ⭐ ONE KMS `decryptDek` ROUND-TRIP PER ROW — envelope encryption gives every stored name its
        // own DEK, so there is ⛔ no shared secret to decrypt once and reuse.
        //
        // ⚠ GENUINELY BOUNDED, ⛔ not "bounded" by the page size. `Promise.all` would place NO bound
        // at all: N concurrent visitors would put 50×N KMS calls in flight against a quota-limited
        // external service. That is the defect 11a.3 fixed, and it is ⛔ not optional here.
        // ⚠⛔⛔ **THE FULL `DIRECTORY_DECRYPT_CONCURRENCY`, ⛔ NOT THE HALVED BOUND.**
        // `member-pool/handlers.ts` halves it (`Math.max(1, Math.floor(… / 2))`) because THAT surface
        // decrypts TWO values per row. ⭐ A contributor row here is **ONE** decrypt ⇒ the full constant
        // is the right one, and copying the halved one would be cargo-culting a rationale that does
        // ⛔ not apply.
        // ⚠ Order is preserved because `mapWithConcurrency` writes each result at its own INPUT index,
        // ⛔ never by completion order — ⛔ nothing here may re-sort.
        const resolvedContributors = await mapWithConcurrency(
          pageContributors,
          DIRECTORY_DECRYPT_CONCURRENCY,
          async (contributor): Promise<PublicSahyogVivranContributor> => {
            // ⛔⛔ **THE CATCH BELONGS *INSIDE* `fn`, ⛔ NOT AROUND THE MAP.** `mapWithConcurrency`
            // PROPAGATES a rejection and stops every worker, so one bad row would take down the whole
            // surface — the helper's own doc-block says so in terms. ⭐ A single bad row must ⛔ never
            // collapse a public transparency page.
            //
            // ⭐⭐ **THE ROW IS KEPT AND THE *NAME* IS WHAT IS OMITTED — `#decision-2026-09-16-219`
            // cl.1 (Trustee-ratified), OPTION (E). ⛔ THIS IS THE INVERSE OF WHAT SHIPPED BEFORE
            // 2026-09-16, AND THE SUPERSEDED RULE IS QUOTED, ⛔ NOT DELETED.**
            // ⛔ IT READ: *"THE OMISSION UNIT HERE IS THE ROW, ⛔ NOT THE NAME … a nameless row carries
            // nothing and a marker row would announce an omission."* ⇒ ⭐ a marker row is now exactly
            // what is ruled: `-219` cl.2 supersedes `2026-08-30-169` cl.1 **for this PUBLIC surface
            // only**, and `packages/ui/src/contribution-list` keeps D5 whole and still drops the row.
            // ⚠⛔ **RATIFIED ON THE FAIRNESS GROUND, ⛔ NOT THE PRIVACY ONE** — cl.1 records that (E)
            // WIDENS disclosure, and takes it because today only a reader who does the arithmetic
            // learns the list is incomplete. ⛔ Do ⛔ not describe this as closing that leak.
            // ⇒ ⭐ **EVERY ARM BELOW RETURNS `{ name: null }`, ⛔ never `null`**, and the resolved array
            // is ⛔ no longer filtered. ⛔⛔ **AND ⛔ NO ARM MAY SIGNAL *WHICH* CAUSE IT WAS** (cl.3):
            // ⛔ not a second field, ⛔ not an attribute, ⛔ not a distinguishable ordering. The five
            // causes are indistinguishable ON THE WIRE, and that is what still carries `-169` cl.1's
            // ground that an erased contributor must ⛔ not be *"identifiable or correlatable"*.
            try {
              const profile = await kyc.getMemberKycProfile(
                scopeTx.tx,
                pariwarId,
                contributor.memberId,
              );
              if (!profile || profile.nameCiphertext === null) return { name: null };

              const storedName = await encryption.decryptKycField(
                profile.nameCiphertext,
                pariwarId,
                deps.encryption,
              );

              // ⭐⭐ **THE ERASURE BACKSTOP — AND THE ⛔ ONLY CHECK IN THIS PATH THAT IS
              // SNAPSHOT-INDEPENDENT** (Trap 4, AC5; `2026-08-30-169` / `2026-08-30-170`).
              // `anonymizeMember` overwrites `name_ciphertext` IN PLACE with an *encrypted*
              // `[anonymized]` sentinel and **RETAINS the row** ⇒ ⭐ the decrypt SUCCEEDS, and without
              // this the page renders **`[anonymized]`** where a person's name belongs, on an
              // unauthenticated edge-cached surface.
              // ⛔ An empty-name guard does ⛔ NOT catch it — the sentinel is a non-empty string.
              // ⛔ **IMPORTED FROM `@twt/domain`, ⛔ never the re-typed literal.**
              // ⚠⛔ AND ⛔ NO PER-ROW LIFECYCLE RE-CHECK — `-170` FORBIDS one as a TOCTOU mitigation:
              // under READ COMMITTED the state read and the ciphertext read take DIFFERENT snapshots,
              // so an RTBF landing between them is decrypted anyway. ⭐ The window is closed at the
              // PLAINTEXT instead, which is snapshot-independent and costs nothing.
              // ⚠⛔⛔ **AND THE GUARANTEE ENDS AT THE WIRE — `2026-08-30-172`, STATED HERE BECAUSE THIS
              // IS WHERE A READER WOULD CONCLUDE OTHERWISE.** Omitting the row stops the ORIGIN from
              // emitting it; it does ⛔ not reach into the edge. This surface is `edge_cacheable` at
              // `s-maxage=300`, so an erased contributor **keeps being served from every warm PoP for
              // up to five minutes** after this line starts dropping them.
              // ⭐ ACCEPTED, and it is the SAME cost `/sahyog` and the per-Pariwar kill switch already
              // carry — ⛔ not a new exposure and ⛔ not this story's to close (routed in
              // `deferred-work.md`). ⛔⛔ ⛔ Do ⛔ not "fix" it by making this surface
              // `private, no-store`: that discards the edge for a public transparency page and was
              // already REJECTED at 11a.3. ⛔ And ⛔ do ⛔ not re-derive it as a fresh finding.
              if (storedName === memberDomain.ANONYMIZED_SENTINEL) {
                request.log.warn(
                  'sahyog-vivran: erasure sentinel reached the decrypt — omitting the NAME, keeping the ROW',
                );
                return { name: null };
              }

              // ⭐⛔ `resolvePublicMemberName`, ⛔ NEVER `resolvePoolIdentity` and ⛔ never
              // `splitFirstNameLastInitial` — both hard-code the SHIELDED form, which is what the
              // MEMBER surface renders and is ⛔ NOT what `-174` ruled here.
              // ⚠⛔ **`.trim() || null`, ⛔ NEVER `=== ''`** (Review finding 2026-09-08) — a
              // whitespace-only stored name passes `=== ''` and the contract's `.min(1)` and renders
              // a BLANK row. ⚠ A MONONYM under `shielded_name` resolves to `''` (`-145` cl.3) and
              // lands here too; ⛔ ⛔ no fall-through to `firstName`, which for a mononym returns the
              // ENTIRE stored legal name.
              // ⚠⛔ **`normalisePublicName`, ⛔ NEVER a bare `.trim()`** — `.trim()` leaves
              // `U+200B`–`U+200F` standing, and an invisible-only name renders an EMPTY `<li>`
              // bullet: an omission that ANNOUNCES itself (Review finding, 2026-09-16 second pass).
              const name = normalisePublicName(kyc.resolvePublicMemberName(mode, storedName));
              return { name };
            } catch (err) {
              // ⚠⛔ **AN ABORTED TRANSACTION IS ⛔ NOT A BAD ROW — RE-THROW IT** (Review finding,
              // 2026-09-16). ⭐ Mirrors `member-pool/handlers.ts`'s guard of the same name, which AC3's
              // named precedent carries and this copy had dropped. ⛔ Without it one `25P02` becomes N
              // silent omissions served as a cached `200` beside the full `total`.
              if (isAbortedTransaction(err)) throw err;

              // ⚠⛔ **DELIBERATELY ⛔ NOT MEMBER-ATTRIBUTED.** The member-facing sibling logs the
              // `memberId` because there the log is what distinguishes a render failure from a lawful
              // erasure. ⛔ Here the row is already omitted either way, and naming a member in an
              // anonymous public request's logs buys nothing for the one thing it risks.
              request.log.warn(
                { err },
                'sahyog-vivran: contributor name unresolvable — omitting the NAME, keeping the ROW',
              );
              return { name: null };
            }
          },
        );

        // ⭐⭐ **⛔ NO FILTER — `-219` cl.1.** ⛔ A `.filter((row) => row !== null)` STOOD HERE and
        // collapsed the omitted rows out, under the comment *"⛔ No placeholder takes their place,
        // ⛔ no count of them is published, and the page is ⛔ never padded back to `limit`."*
        // ⇒ ⭐ option (E) reverses exactly that: every paged row survives, carrying `name: null` where
        // the name is withheld, in the producer's deterministic order.
        // ⚠ `items.length` therefore now equals `pageContributors.length`; what is fewer than `total`
        // is the count of rows whose `name` is ⛔ not `null`. ⛔ Do ⛔ not re-introduce a filter, and
        // ⛔ do ⛔ not publish a count of the nulls as its own field (cl.4(c)).
        const items = resolvedContributors;

        ok = true;
        return {
          items,
          page,
          limit,
          total,
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
            // ⭐ Story 11b.3b (Task 2 unit 2) — resolved above; `null` on every drive today because
            // the publication basis is fail-closed for every member (the DESIGNED inert state).
            // ⛔ `null` OMITS THE NAME, ⛔ never the page.
            deceasedMemberName,
            confirmedContributionCount: drive.confirmedContributionCount,
            // ⭐ Story 11b.3b (AC3b) — returned from the domain read's own clamped binding;
            // ⛔⛔ ⛔ no second `× fixedAmount` here, and ⛔ no target/expected-total companion
            // (`2026-09-15-218` cl.4).
            amountRaisedInr: drive.amountRaisedInr,
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
/**
 * ⭐ THE PUBLIC NAME NORMALISER — `.trim()` **PLUS** the zero-width strip, ⛔ never `.trim()` alone.
 *
 * ⚠⛔ **`String.prototype.trim()` DOES ⛔ NOT REMOVE `U+200B`–`U+200F`** (only `U+FEFF`), so an
 * invisible-only stored name survives `.trim()`, survives the contract's `.min(1)`, survives the
 * public app's `length === 0` validator, arrives TRUTHY, and renders a **BLANK** where a person's
 * name belongs — a visually empty `<dd>` for the deceased member and an empty `<li>` bullet for a
 * contributor. ⛔ The latter is an ANNOUNCED omission, which the row-omission rule forbids outright.
 *
 * ⭐ `district` on this very surface already carries this strip, with a comment naming this exact
 * class; ⛔ neither NAME did (Review finding, 2026-09-16 second pass). ⭐ Hoisted to ONE helper so the
 * two subjects can ⛔ never drift again.
 *
 * ⚠ Returns `null` for "nothing to render", ⛔ never `''` — every caller on this surface treats an
 * absent name as an omission, ⛔ not as an empty string.
 */
function normalisePublicName(value: string): string | null {
  return value.replace(/[\u200b-\u200f\ufeff]/g, '').trim() || null;
}

/**
 * ⭐ `25P02` — the transaction is ALREADY ABORTED, ⛔ not "this row is bad".
 *
 * ⚠⛔ **THIS IS THE SIBLING OF `member-pool/handlers.ts`'s GUARD OF THE SAME NAME, AND IT EXISTS FOR
 * THE SAME REASON** (Review finding, 2026-09-16 second pass): once ANY statement on the scope tx
 * fails, every later statement returns `25P02`. Without this re-throw a per-row `catch` converts ONE
 * fault into N silent omissions, and the caller returns `ok` with a TRUNCATED list beside the FULL
 * `total`.
 *
 * ⚠⛔ **AND THIS SURFACE IS THE WORST PLACE TO SWALLOW IT.** Its own contract normalises the symptom
 * — `sahyog-vivran.ts` rules that the page reads "N confirmed" beside FEWER than N named rows
 * **BY DESIGN** — so a transient DB fault is indistinguishable from a lawful RTBF omission, and the
 * result is edge-cached at `s-maxage=300`.
 *
 * ⚠ Drizzle wraps the driver error, so the code can sit on the error OR on its `cause`
 * ([[project_domain_limit_clamp_and_savepoint_retry]]) — ⛔ check both, ⛔ never one.
 * ⛔ This is ⛔ NOT a recovery mechanism and must ⛔ never grow into one.
 */
function isAbortedTransaction(err: unknown): boolean {
  const code = (e: unknown): unknown =>
    typeof e === 'object' && e !== null ? (e as { code?: unknown }).code : undefined;
  const cause = typeof err === 'object' && err !== null ? (err as { cause?: unknown }).cause : undefined;
  return code(err) === '25P02' || code(cause) === '25P02';
}

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
