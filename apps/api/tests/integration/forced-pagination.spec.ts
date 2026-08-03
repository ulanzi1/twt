// Forced-pagination enforcement (Story 1.14, AC-3 — FR-91, §3.2) — hermetic, no DB.
//
// Two halves:
//   1. Behavioural: `?limit=all` / `?page=all` / over-cap limit are REJECTED with
//      400 BEFORE any handler runs (querystring validation precedes the preHandler in
//      the Fastify lifecycle, so the rejection is hermetic — no session, no DB). A
//      valid in-range limit passes validation and then hits the login-wall (401),
//      proving the bound rejects only out-of-range values, not all of them.
//   2. The GUARD (the "no unbounded result set, by construction" invariant): walk the
//      committed OpenAPI surface and assert every collection-returning GET declares a
//      bounded `limit` query param. A future list endpoint that forgets the bound
//      fails CI. (The guard asserts it examined ≥1 collection endpoint so it can never
//      pass vacuously — the 1.13 "inert guard" lesson.)

import { describe, expect, it } from 'vitest';

import { createTestApp, teardown } from './_setup.js';

const AUDIT_LIST = '/api/v1/audit/integrity-checks';

// Single-object GETs that legitimately embed an array but are NOT list endpoints
// (e.g. a future /me with a grants[]). The detector flags top-level arrays and
// paginatedResponse `{ items[] }` shapes, so anything here needs a stated reason.
const NON_LIST_GET_ALLOWLIST = new Set<string>([
  // Story 10.10 — the frozen moderation reason-code registry. It returns `{ items }`, so the
  // detector sees a collection, but it is NOT a DB-backed list: the registry is a code-level
  // `as const` tuple of exactly 10 governance codes (Decision 3 — deliberately NOT a per-Pariwar
  // table, so a tenant cannot invent its own grounds for terminating a member). Its size is fixed
  // at compile time and cannot grow with tenant data, which is the entire hazard this gate exists
  // to prevent — an unbounded read that drains a connection as a table fills up.
  //
  // Paginating it would be actively worse: the admin dropdown needs every code that could apply to
  // an action, and a paged registry could silently omit one, producing a reason the operator can
  // see the server accept but cannot select.
  //
  // ⚠ Re-examine if the registry ever becomes data-driven. The moment these codes come from a
  // table, this entry is wrong and the route needs a real bounded `limit`.
  '/api/v1/p/{pariwarId}/moderation/reason-codes',
]);

interface OpenApiParam {
  readonly name?: string;
  readonly in?: string;
  readonly schema?: { readonly maximum?: number };
}
interface OpenApiGet {
  readonly parameters?: readonly OpenApiParam[];
  readonly responses?: Record<string, { content?: Record<string, { schema?: OpenApiSchema }> }>;
}
interface OpenApiSchema {
  readonly type?: string;
  readonly items?: unknown;
  readonly properties?: { readonly items?: { readonly type?: string } };
}

/** A GET whose 200 body is a top-level array OR a paginatedResponse `{ items: [] }`. */
function isCollectionResponse(get: OpenApiGet): boolean {
  const schema = get.responses?.['200']?.content?.['application/json']?.schema;
  if (!schema) return false;
  if (schema.type === 'array') return true;
  return schema.type === 'object' && schema.properties?.items?.type === 'array';
}

/** A GET that declares a `limit` query param with a finite numeric `maximum`. */
function declaresBoundedLimit(get: OpenApiGet): boolean {
  const limit = (get.parameters ?? []).find((p) => p.in === 'query' && p.name === 'limit');
  const max = limit?.schema?.maximum;
  return typeof max === 'number' && Number.isFinite(max);
}

describe('Forced-pagination rejection (AC-3, hermetic — no DB)', () => {
  it('rejects ?limit=all with 400 before any handler runs', async () => {
    const t = await createTestApp();
    try {
      const res = await t.app.inject({ method: 'GET', url: `${AUDIT_LIST}?limit=all` });
      // Per the schema-type note: assert the STATUS only (the error detail body
      // differs between z.coerce.number and z.number schemas — fragile to assert).
      expect(res.statusCode).toBe(400);
    } finally {
      await teardown(t);
    }
  });

  it('rejects ?page=all with 400 (strict schema → unknown key)', async () => {
    const t = await createTestApp();
    try {
      const res = await t.app.inject({ method: 'GET', url: `${AUDIT_LIST}?page=all` });
      expect(res.statusCode).toBe(400);
    } finally {
      await teardown(t);
    }
  });

  it('rejects an over-cap limit (>200 admin-tier bound) with 400', async () => {
    const t = await createTestApp();
    try {
      const res = await t.app.inject({ method: 'GET', url: `${AUDIT_LIST}?limit=99999` });
      expect(res.statusCode).toBe(400);
    } finally {
      await teardown(t);
    }
  });

  it('accepts a valid in-range limit through validation, then the login-wall fires (401)', async () => {
    const t = await createTestApp();
    try {
      const res = await t.app.inject({ method: 'GET', url: `${AUDIT_LIST}?limit=5` });
      // 401 (not 400) proves validation PASSED and the bound rejects only out-of-range.
      expect(res.statusCode).toBe(401);
    } finally {
      await teardown(t);
    }
  });
});

describe('Forced-pagination guard (AC-3 — every collection GET is bounded, by construction)', () => {
  it('every collection-returning GET in the OpenAPI surface declares a bounded limit', async () => {
    const t = await createTestApp();
    try {
      const doc = t.app.swagger() as { paths: Record<string, { get?: OpenApiGet }> };
      let examined = 0;
      const offenders: string[] = [];

      for (const [path, ops] of Object.entries(doc.paths)) {
        const get = ops.get;
        if (!get || NON_LIST_GET_ALLOWLIST.has(path)) continue;
        if (!isCollectionResponse(get)) continue;
        examined += 1;
        if (!declaresBoundedLimit(get)) offenders.push(path);
      }

      // Guard must not pass vacuously — the audit-list endpoint must be examined.
      expect(examined).toBeGreaterThanOrEqual(1);
      expect(offenders).toEqual([]);
    } finally {
      await teardown(t);
    }
  });

  it('the one existing list endpoint (audit history) is the collection it examines', async () => {
    const t = await createTestApp();
    try {
      const doc = t.app.swagger() as { paths: Record<string, { get?: OpenApiGet }> };
      const get = doc.paths[AUDIT_LIST]?.get;
      expect(get).toBeDefined();
      expect(isCollectionResponse(get!)).toBe(true);
      expect(declaresBoundedLimit(get!)).toBe(true);
    } finally {
      await teardown(t);
    }
  });
});
