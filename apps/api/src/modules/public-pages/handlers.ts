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

      // ── Anti-enumeration detection, BEFORE the read ────────────────────────────────────────────
      // ⚠ Runs first deliberately: a deep-crawl signal is worth recording even when the page below
      // turns out empty. ⛔ It does NOT block — the rate limit is the enforcement, this is the
      // signal (`2026-08-20-143` cl.10). And ⛔ the line it emits is a COUNTER, not a forensic
      // record: no column stores query context, so the rule id and a coarse, non-PII query shape go
      // in `action` + `resource_locator`. ⛔ Never describe it as carrying the query.
      evaluateDirectoryAbuse(deps, abuseRules, {
        key: request.ip,
        page,
        limit,
        at: deps.clock(),
      });

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        // ⭐ THE PRESENTATION MODE IS RESOLVED ONCE PER REQUEST, ⛔ NEVER PER ROW. It is a config
        // value that cannot vary within a page, so a per-row read would be an N+1 on a constant.
        const mode = await kyc.resolvePublicNamePresentationMode(scopeTx.tx, pariwarId);

        const rows = await memberDomain.listPublicDirectoryMembers(scopeTx.tx, pariwarId, {
          limit,
          offset,
        });
        const total = await memberDomain.countPublicDirectoryMembers(scopeTx.tx, pariwarId);

        const items: PublicDirectoryEntry[] = [];
        for (const row of rows) {
          // ⭐ THE TIER-1 DECRYPT — the existing helper, the existing field class, the member's real
          // pariwarId. The decrypted value NEVER leaves this loop except through
          // `resolvePublicMemberName`, and is never logged.
          const storedName = await encryption.decryptKycField(
            row.nameCiphertext,
            pariwarId,
            deps.encryption,
          );

          // ⭐ THE POLICY RENDER — `resolvePublicMemberName`'s FIRST production call site.
          // ⛔ NEVER a literal `full_name`, ⛔ never a local re-implementation of
          // `splitFirstNameLastInitial`, ⛔ never a second copy of the mode default.
          // `2026-08-19-136` cl.1: *"a build in which the public name form cannot be changed
          // without a code change FAILS this clause"* — the mode above is what satisfies it.
          const name = kyc.resolvePublicMemberName(mode, storedName);

          // ⛔ AN UNRESOLVABLE NAME OMITS THE ROW — never a blank cell where a person's name
          // belongs (the `pool-identity.ts` fail-soft precedent). A shorter page is strictly better
          // than a public page with an empty name on it.
          if (name === '') continue;

          items.push({
            name,
            district: row.district,
            // ⚠ `active-in-grace` PRESENTS AS `active`. A grace period is an internal billing
            // state; ⛔ publishing it would tell a stranger a member is late on a payment. The
            // ruled pill is two labels, and this is where the third state is folded away.
            status: row.state === 'lock-in' ? 'lock-in' : 'active',
          });
        }

        ok = true;
        return { items, page, limit, total };
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}

/** Re-exported so the route schema and the tests share ONE horizon, never two literals. */
export { PUBLIC_DIRECTORY_PAGE_HORIZON };
