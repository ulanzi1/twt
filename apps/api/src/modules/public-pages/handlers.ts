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
  type PublicDirectoryEntry,
  type PublicDirectoryQuery,
  type PublicDirectoryResponse,
} from '@twt/contracts';
import { encryption, ids, kyc, member as memberDomain } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { evaluateDirectoryAbuse, loadDirectoryAbuseRules } from './abuse-rules.js';

/** Rows served when the caller asks for no page size. Mirrors `apps/public`'s own default. */
export const PUBLIC_DIRECTORY_PAGE_SIZE_DEFAULT = 25;

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
     * the route's purpose. What bounds it instead is written down in FOUR places that all have
     * teeth: the named `search` rate limit on the route, the page-size cap and page horizon in the
     * request schema, `noindex` on the page plus `X-Robots-Tag` on this response, and the absence
     * of any member-detail route or export affordance.
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
        // ⭐ THE PER-PARIWAR KILL SWITCH — `2026-08-21-145` cl.5. ⚠ Cite THAT entry, ⛔ not a bare
        // "D3": this story has its OWN ruled D3 (the roster predicate) and the two collide.
        // ⛔ Never resolve a bare `D<n>` by proximity. Checked FIRST, before any
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
