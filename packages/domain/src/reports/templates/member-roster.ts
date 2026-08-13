// Reports library — the member-roster template (Story 10.7, Task 3; AC1(a), AC3, AC4).
//
// A Tier-3-clear + masked-derivation roster: member handle + lifecycle state + current posting district
// + masked Aadhaar (last-4). PII-MASKED (Decision 2) — it NEVER projects a Tier-1 ciphertext column
// (name/dob/photo stay encrypted at rest; `aadhaar_masked_id` is Tier-3, already masked at the provider
// boundary). Scope-respecting (Decision 3): the query narrows to the actor's district when they are
// district-scoped; a pariwar-scoped actor sees the whole tenant (RLS-isolated).
//
// permissionKey = `member.export_roster` (Decision 6, a NEW district-capable key — a roster EXPORT is a
// distinct read authority from the single-member `member.view_validity` view, and being district-capable
// is what makes the district-narrowing demonstrable). Granted to district_admin + pariwar_admin.

import { sql } from 'drizzle-orm';

import type { Db } from '../../db.js';
import type { ReportColumn, ReportScopeCtx, ReportTemplate } from '../types.js';
import { resolveDistrictNarrowing, reportRowLimit } from './_shared.js';

export const MEMBER_ROSTER_REPORT_TYPE = 'member_roster';
/** The NEW district-capable roster-export key (Decision 6; catalog v26). */
export const MEMBER_ROSTER_PERMISSION_KEY = 'member.export_roster';

// A `type` (not `interface`) so it satisfies drizzle's `execute<T extends Record<string, unknown>>`
// constraint (an object-literal type carries the implicit index signature an interface lacks).
type MemberRosterRow = {
  member_id: string;
  state: string;
  district: string;
  aadhaar_masked_id: string | null;
};

const columns: readonly ReportColumn[] = [
  { key: 'member_id', header: 'Member ID', piiTier: 3 },
  { key: 'state', header: 'Lifecycle State', piiTier: 3 },
  { key: 'district', header: 'Posting District', piiTier: 3 },
  // Tier-3: already masked to last-4 at the KYC-provider boundary (member_kyc_profiles.aadhaar_masked_id
  // is `piiColumn(3, …)`). NEVER the full Aadhaar. `decryptIfPermitted` is deliberately absent (there is
  // no Tier-1 field on this template to gate — the masking guarantee is structural here).
  { key: 'aadhaar_masked_id', header: 'Aadhaar (masked)', piiTier: 3 },
];

async function query(scopeCtx: ReportScopeCtx, client: Db): Promise<MemberRosterRow[]> {
  const narrowing = resolveDistrictNarrowing(scopeCtx.resolvedScope);
  // deny-deeper geo. ⛔ NOT pending a resolver and NOT pending a type — Story 1.18 shipped the
  // resolver and Story 10.28 made the narrowing multi-valued; this branch deliberately did not change
  // through either. See `_shared.ts`'s per-dimension re-examination (state → no actor holds a
  // district-narrowable report key at a `state` ceiling, "Closed by [edit]" with no successor;
  // block → rank order; self → not a tree node).
  // ⛔ This also catches an EMPTY district set, which `resolveDistrictNarrowing` collapses to `deny`
  // at the source (D5) — never an un-narrowed query, which would export the FULL TENANT.
  if (narrowing.kind === 'deny') return [];

  // Tenant isolation is the EXPLICIT `m.pariwar_id` predicate — the build worker runs on the BYPASSRLS
  // service pool (RLS is bypassed there; the 3.11 explicit-predicate convention), so a cross-Pariwar
  // actor sees zero because of THIS predicate (RLS is only a backstop when run under a twt_app client).
  // The district narrowing (Decision 3) composes on top.
  // ⭐ `IN (…)` since Story 10.28 (AC2) — a multi-district admin gets EVERY district they hold.
  // ⛔ `sql.join` over PARAMETERIZED values, never string concatenation: a district value is free
  // `text` and can be hostile (`templates.test.ts` pins `=SUM(A1:A9)`).
  const scopeFilter =
    narrowing.kind === 'districts'
      ? sql`WHERE m.pariwar_id = ${scopeCtx.pariwarId} AND cp.district IN (${sql.join(
          narrowing.districts.map((d) => sql`${d}`),
          sql`, `,
        )})`
      : sql`WHERE m.pariwar_id = ${scopeCtx.pariwarId}`;

  // `current_posting` = the newest posting district per member. The CTE is TENANT-SCOPED via its own
  // `pariwar_id` predicate (review finding): the build worker runs on the BYPASSRLS service pool, so
  // WITHOUT this filter the DISTINCT ON would scan+sort EVERY tenant's member_postings on every build
  // (the outer LIMIT bounds only the final projection, not the CTE work). A member whose CURRENT district
  // is out of a district-scoped actor's scope is still filtered by the `cp.district IN (…)` predicate below.
  //
  // LEFT JOIN current_posting (review decision): a member with NO posting row has no district, but for a
  // PARIWAR-scoped actor the roster must still list them (the "full roster" was silently dropping
  // never-posted members under the old INNER JOIN). Their district falls back to '—'. For a DISTRICT-
  // scoped actor the `cp.district IN (…)` predicate excludes NULL districts — correct, a member with
  // no posting is not in that district.
  const result = await client.execute<MemberRosterRow>(sql`
    WITH current_posting AS (
      SELECT DISTINCT ON (member_id) member_id, district
      FROM member_postings
      WHERE pariwar_id = ${scopeCtx.pariwarId}
      ORDER BY member_id, created_at DESC
    )
    SELECT m.member_id::text AS member_id,
           m.state::text AS state,
           COALESCE(cp.district, '—') AS district,
           k.aadhaar_masked_id AS aadhaar_masked_id
    FROM members m
    LEFT JOIN current_posting cp ON cp.member_id = m.member_id
    LEFT JOIN member_kyc_profiles k ON k.member_id = m.member_id
    ${scopeFilter}
    ORDER BY COALESCE(cp.district, '—'), m.member_id
    LIMIT ${reportRowLimit()}
  `);
  return result.rows;
}

export const memberRosterTemplate: ReportTemplate<MemberRosterRow> = {
  reportType: MEMBER_ROSTER_REPORT_TYPE,
  permissionKey: MEMBER_ROSTER_PERMISSION_KEY,
  scopeDimension: 'district',
  auditAction: 'report.generated',
  columns,
  query,
  csvRow: (row) => ({
    member_id: row.member_id,
    state: row.state,
    district: row.district,
    aadhaar_masked_id: row.aadhaar_masked_id ?? '',
  }),
  jsonRow: (row) => ({
    member_id: row.member_id,
    state: row.state,
    district: row.district,
    aadhaar_masked_id: row.aadhaar_masked_id,
  }),
};
