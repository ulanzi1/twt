// Scope-tx + RBAC grant-load integration (Story 1.9, Task 3 / AC-6).
//
// Proves the scope-resolution substrate at the DB level: openScopeTx runs the
// request as `twt_app` (sheds the test superuser) + sets `app.pariwar_id` inside a
// tx + asserts it (W9-CR1.6 guard), and loadActorGrants returns ONLY the active
// Pariwar's grants (RLS scoping IS the membership gate — a grant in another Pariwar
// is invisible). The HTTP-level 404-on-non-member / 403-on-under-privileged flow
// lands in the full login→scoped-route integration (Task 8.2, after login exists).

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadActorGrants } from '../../src/modules/rbac/index.js';
import { closeScopeTx, openScopeTx } from '../../src/modules/multi-tenant/scope-tx.js';
import { buildTestDeps, hasDatabase, type TestDeps } from './_setup.js';

describe.skipIf(!hasDatabase)('scope-tx + RBAC grant load (Task 3)', () => {
  let td: TestDeps;
  const pariwarA = randomUUID();
  const pariwarB = randomUUID();
  const userA = randomUUID(); // auditor in A
  const userB = randomUUID(); // no grants
  const userC = randomUUID(); // block_admin in B only

  beforeAll(async () => {
    td = buildTestDeps();
    const c = await td.pool.connect();
    try {
      // Seed as the superuser test login (RLS bypassed) so both Pariwars' rows land.
      await c.query(`INSERT INTO users (id) VALUES ($1),($2),($3)`, [userA, userB, userC]);
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
           VALUES ($1, $2, 'auditor', 'pariwar', $2)`,
        [userA, pariwarA],
      );
      await c.query(
        `INSERT INTO role_grants (user_id, pariwar_id, role, scope_dimension, scope_value)
           VALUES ($1, $2, 'block_admin', 'block', 'BlockX')`,
        [userC, pariwarB],
      );
    } finally {
      c.release();
    }
  });

  afterAll(async () => {
    try {
      const c = await td.pool.connect();
      try {
        await c.query(`DELETE FROM role_grants WHERE user_id = ANY($1)`, [[userA, userB, userC]]);
        await c.query(`DELETE FROM users WHERE id = ANY($1)`, [[userA, userB, userC]]);
      } finally {
        c.release();
      }
    } finally {
      await td.pool.end();
    }
  });

  it('opens a scope tx and loads the member actor grants in the active Pariwar', async () => {
    const scopeTx = await openScopeTx(td.deps, pariwarA);
    try {
      expect(scopeTx.scopeSet).toBe(true);
      const grants = await loadActorGrants(scopeTx, userA);
      expect(grants).toHaveLength(1);
      expect(grants[0]?.role).toBe('auditor');
      expect(grants[0]?.pariwarId).toBe(pariwarA);
    } finally {
      await closeScopeTx(scopeTx, false);
    }
  });

  it('returns 0 grants for a non-member (RLS scoping is the membership gate)', async () => {
    const scopeTx = await openScopeTx(td.deps, pariwarA);
    try {
      expect(await loadActorGrants(scopeTx, userB)).toHaveLength(0);
      // userC's grant is in Pariwar B → invisible under scope A.
      expect(await loadActorGrants(scopeTx, userC)).toHaveLength(0);
    } finally {
      await closeScopeTx(scopeTx, false);
    }
  });

  it('a grant in another Pariwar is RLS-filtered out of the active scope', async () => {
    const scopeTx = await openScopeTx(td.deps, pariwarB);
    try {
      expect(await loadActorGrants(scopeTx, userC)).toHaveLength(1); // visible in B
      expect(await loadActorGrants(scopeTx, userA)).toHaveLength(0); // A-grant invisible in B
    } finally {
      await closeScopeTx(scopeTx, false);
    }
  });

  it('rejects a malformed Pariwar id at the boundary (strict UUID re-parse)', async () => {
    await expect(openScopeTx(td.deps, 'not-a-uuid')).rejects.toThrow();
  });

  it('the loadActorGrants W9-CR1.6 guard refuses when scope is not set', async () => {
    const scopeTx = await openScopeTx(td.deps, pariwarA);
    await closeScopeTx(scopeTx, false); // flips scopeSet=false
    await expect(loadActorGrants(scopeTx, userA)).rejects.toThrow(/W9-CR1.6/);
  });
});
