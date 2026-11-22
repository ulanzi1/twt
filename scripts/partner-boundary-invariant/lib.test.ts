// The partner-boundary fence's teeth (Story 12.5, AC10): every rule has a PLANTED violation that fails and a clean source that passes.

import { describe, expect, it } from 'vitest';

import {
  authorityReadAllowlistPairs,
  authorityReadsImported,
  scanAuthorityUse,
  scanBodyParsing,
  scanFile,
  scanReferenceNames,
  scanSeamCalls,
} from './lib.js';

const SWEEP = 'apps/jobs/src/scheduler/module-lead-handoff.ts';
const CLIENT = 'apps/jobs/src/scheduler/partner-lead-client.ts';
const DOMAIN = 'packages/domain/src/marketplace/lead-handoff.ts';
const ENVELOPE = 'packages/domain/src/marketplace/lead-envelope.ts';
const ELSEWHERE_API = 'apps/api/src/modules/marketplace/routes.ts';
const ELSEWHERE_DOMAIN = 'packages/domain/src/member/anonymize.ts';
/** The member-facing read rule (b) requires `lead-handoff.ts` to hold — the smallest clean one. */
const STATUS_READ = `export async function getLeadHandoffStatus(q) { return (await q.query('SELECT status FROM t')).rows[0]; }\n`;

describe('rule (b) — the advisory reference stays in its four files', () => {
  it('FAILS an identifier, a property and a SQL string naming it outside the four files', () => {
    expect(scanReferenceNames(ELSEWHERE_API, `const partnerReference = row.x;`)).toHaveLength(1);
    expect(scanReferenceNames(ELSEWHERE_API, `return { partner_reference: 'x' };`)).toHaveLength(1);
    expect(scanReferenceNames(ELSEWHERE_DOMAIN, 'await q.query(`SELECT partner_reference FROM marketplace_lead_handoffs`);')).toHaveLength(1);
    expect(scanReferenceNames(ELSEWHERE_DOMAIN, 'await q.query(`UPDATE t SET a = ${v}, partner_reference = NULL`);')).toHaveLength(1);
  });

  it('FAILS a mention inside getLeadHandoffStatus, even in the allowed domain file', () => {
    const src = `export async function getLeadHandoffStatus(q) { const r = await q.query('SELECT status, partner_reference FROM t'); return r; }`;
    expect(scanReferenceNames(DOMAIN, src)).toHaveLength(1);
  });

  it('PASSES the four files, a comment, and a longer identifier elsewhere', () => {
    for (const f of [DOMAIN, SWEEP, CLIENT, 'packages/domain/src/schema/marketplace_lead_handoffs.ts']) {
      expect(scanReferenceNames(f, `${STATUS_READ}const partnerReference = 1; const s = 'partner_reference';`)).toHaveLength(0);
    }
    expect(scanReferenceNames(ELSEWHERE_API, `// partner_reference is advisory\nconst PARTNER_REFERENCE_HEADER = 1; const partnerReferences = [];`)).toHaveLength(0);
  });
});

describe('rule (b) — the member-facing read cannot go missing (not vacuous)', () => {
  it('FAILS lead-handoff.ts when getLeadHandoffStatus is absent, renamed, or no longer a function declaration', () => {
    expect(scanReferenceNames(DOMAIN, `const x = 1;`).map((f) => f.what)).toEqual([expect.stringContaining('no function declaration named')]);
    expect(scanReferenceNames(DOMAIN, `export async function readLeadStatus(q) { return q.query('SELECT partner_reference FROM t'); }`)).toHaveLength(1);
    expect(scanReferenceNames(DOMAIN, `export const getLeadHandoffStatus = async (q) => q.query('SELECT partner_reference FROM t');`)).toHaveLength(1);
  });
  it('FAILS a read of EVERY column inside getLeadHandoffStatus — it returns the reference without naming it (round 2)', () => {
    for (const body of [
      `return q.query('SELECT * FROM marketplace_lead_handoffs WHERE lead_id = $1');`,
      `return q.query('SELECT h.* FROM marketplace_lead_handoffs h');`,
      'return q.query(`UPDATE marketplace_lead_handoffs SET x = 1 RETURNING *`);',
      `return db.select().from(marketplaceLeadHandoffs);`,
    ]) {
      expect(scanReferenceNames(DOMAIN, `export async function getLeadHandoffStatus(q, db) { ${body} }`), body).toHaveLength(1);
    }
    // A count is not a read of every column.
    expect(scanReferenceNames(DOMAIN, `export async function getLeadHandoffStatus(q) { return q.query('SELECT count(*) FROM t'); }`)).toHaveLength(0);
  });
  it('round 3: every other whole-row shape fails too, any case — and a regex source with `.*` is not SQL', () => {
    for (const body of [
      `return q.query('select * from marketplace_lead_handoffs');`,
      `return q.query('SELECT "h".* FROM marketplace_lead_handoffs h');`,
      `return q.query('SELECT lead_id, * FROM marketplace_lead_handoffs');`,
      `return q.query('SELECT DISTINCT ON (lead_id) * FROM marketplace_lead_handoffs');`,
      `return q.query('SELECT to_jsonb(h) FROM marketplace_lead_handoffs h');`,
      `return q.query('SELECT row_to_json(h) FROM marketplace_lead_handoffs h');`,
      `return db.query.marketplaceLeadHandoffs.findFirst();`,
      `return db.select(getTableColumns(marketplaceLeadHandoffs)).from(marketplaceLeadHandoffs);`,
    ]) {
      expect(scanReferenceNames(DOMAIN, `export async function getLeadHandoffStatus(q, db) { ${body} }`), body).toHaveLength(1);
    }
    expect(scanReferenceNames(DOMAIN, `export async function getLeadHandoffStatus(q) { const re = new RegExp('^lead.*$'); return q.query('SELECT status FROM t'); }`)).toHaveLength(0);
  });
  it('asks it of lead-handoff.ts ONLY — the other three allowed files hold no member-facing read', () => {
    for (const f of [SWEEP, CLIENT, 'packages/domain/src/schema/marketplace_lead_handoffs.ts']) expect(scanReferenceNames(f, `const x = 1;`)).toHaveLength(0);
  });
});

describe('rule (c) — the transport uses only the allow-listed authority READS', () => {
  it('PASSES the allow-listed reads, both shapes', () => {
    const jobs = `import { member, claim, consent, marketplace } from '@twt/domain';\nawait member.memberExists(db, p, m);\nawait member.moderation.getCurrentMemberModerationOverlay(db, m);\nawait claim.isDeathReportStanding(db, p, m);\nawait consent.listConsentsForArtifact(db, p, m, t, l);`;
    expect(scanAuthorityUse(SWEEP, jobs)).toHaveLength(0);
    const domain = `import { memberExists, getCurrentMemberState } from '../member/read.js';\nimport { isDeathReportStanding } from '../claim/death-report.js';\nimport type { Anything } from '../member/write.js';\nimport { listConsentsForArtifact, resolveConsentById } from '../consent/read.js';`;
    expect(scanAuthorityUse(DOMAIN, domain)).toHaveLength(0);
  });

  it('FAILS a write entry point through the barrel namespace (jobs file)', () => {
    const f = scanAuthorityUse(SWEEP, `import { member, consent } from '@twt/domain';\nawait consent.revokeConsent(db, x);\nawait member.projectMemberEvent(db, e);`);
    expect(f.map((x) => x.what)).toEqual([expect.stringContaining('consent.revokeConsent'), expect.stringContaining('member.projectMemberEvent')]);
  });

  it('FAILS a namespace passed whole, an aliased import, and a namespace import of the barrel', () => {
    expect(scanAuthorityUse(SWEEP, `import { claim } from '@twt/domain';\nhelper(claim);`)).toHaveLength(1);
    expect(scanAuthorityUse(SWEEP, `import { pool as p } from '@twt/domain';\nawait p.spawnPool(x);`)).toHaveLength(1);
    expect(scanAuthorityUse(CLIENT, `import * as domain from '@twt/domain';`)).toHaveLength(1);
  });

  it('FAILS a value import of a write from an authority module (domain file), and a namespace import of one', () => {
    expect(scanAuthorityUse(DOMAIN, `import { recordConsent } from '../consent/write.js';`)).toHaveLength(1);
    expect(scanAuthorityUse(ENVELOPE, `import { appendContribution } from '../contribution/commands.js';`)).toHaveLength(1);
    expect(scanAuthorityUse(DOMAIN, `import * as m from '../member/index.js';`)).toHaveLength(1);
    expect(scanAuthorityUse(DOMAIN, `import { invalidate } from '../validity-cache/index.js';`)).toHaveLength(1);
  });

  it('is applied only to the four transport files (scanFile)', () => {
    expect(scanFile(ELSEWHERE_DOMAIN, `import { recordConsent } from '../consent/write.js';`)).toHaveLength(0);
    expect(scanFile(DOMAIN, `${STATUS_READ}import { recordConsent } from '../consent/write.js';`)).toHaveLength(1);
  });

  it('FAILS the ways AROUND an import scan: the barrel, a detoured path, a deep path, an authority package', () => {
    expect(scanAuthorityUse(DOMAIN, `import { consent } from '../index.js';`).map((f) => f.what)).toEqual([expect.stringContaining('domain barrel')]);
    expect(scanAuthorityUse(ENVELOPE, `import { member } from '..';`)).toHaveLength(1);
    expect(scanAuthorityUse(DOMAIN, `import { recordConsent } from './../consent/write.js';`)).toHaveLength(1);
    expect(scanAuthorityUse(DOMAIN, `import { recordConsent } from '../marketplace/../consent/write.js';`)).toHaveLength(1);
    expect(scanAuthorityUse(SWEEP, `import { revokeConsent } from '@twt/domain/src/consent/write.js';`).map((f) => f.what)).toEqual([expect.stringContaining('deep import')]);
    expect(scanAuthorityUse(SWEEP, `import { invalidateValidity } from '@twt/validity-service';`).map((f) => f.what)).toEqual([expect.stringContaining('authority package')]);
  });

  it('RESOLVES a relative path against the file, so a climb out and back in is the same module (round 2)', () => {
    // `../../src/consent/write.js` from `packages/domain/src/marketplace/` IS `../consent/write.js`.
    expect(scanAuthorityUse(DOMAIN, `import { recordConsent } from '../../src/consent/write.js';`).map((f) => f.what)).toEqual([expect.stringContaining('../consent/write.js')]);
    expect(scanAuthorityUse(DOMAIN, `import { consent } from '../../src/index.js';`).map((f) => f.what)).toEqual([expect.stringContaining('domain barrel')]);
    // The directory itself (Bundler resolution reads its index).
    expect(scanAuthorityUse(DOMAIN, `import { recordConsent } from '../consent';`)).toHaveLength(1);
    // An allow-listed read reached by a detour is still that read.
    expect(scanAuthorityUse(DOMAIN, `import { listConsentsForArtifact } from '../../src/consent/read.js';`)).toHaveLength(0);
    expect(authorityReadsImported(DOMAIN, `import { listConsentsForArtifact } from '../../src/consent/read.js';`)).toEqual(['../consent/read.js#listConsentsForArtifact']);
  });

  it('round 3: a SIDE-EFFECT import fails when it leaves the root or names an authority module; a type-only one never', () => {
    expect(scanAuthorityUse(SWEEP, `import '../../../../packages/domain/src/consent/write.js';`).map((f) => f.what)).toEqual([expect.stringContaining('out of apps/jobs/src')]);
    expect(scanAuthorityUse(DOMAIN, `import '../consent/write.js';`).map((f) => f.what)).toEqual([expect.stringContaining('side-effect import')]);
    expect(scanAuthorityUse(SWEEP, `import '@twt/domain';`).map((f) => f.what)).toEqual([expect.stringContaining('side-effect import')]);
    expect(scanAuthorityUse(SWEEP, `import type { X } from '../../../../packages/domain/src/consent/write.js';`)).toHaveLength(0);
    expect(scanAuthorityUse(SWEEP, `import './partner-lead-client.js';`)).toHaveLength(0);
  });

  it('FAILS a relative import that LEAVES the file\'s own source root (round 2)', () => {
    expect(scanAuthorityUse(SWEEP, `import { revokeConsent } from '../../../../packages/domain/src/consent/write.js';`).map((f) => f.what)).toEqual([expect.stringContaining('out of apps/jobs/src')]);
    expect(scanAuthorityUse(DOMAIN, `import { x } from '../../../../apps/jobs/src/boot.js';`).map((f) => f.what)).toEqual([expect.stringContaining('out of packages/domain/src')]);
    expect(scanAuthorityUse(SWEEP, `import { checkLeadUrl } from './partner-lead-client.js';\nimport { y } from '../boot.js';`)).toHaveLength(0);
  });

  it('FAILS what an import scan cannot see: a dynamic import, a require, a re-export', () => {
    expect(scanAuthorityUse(SWEEP, `const d = await import('@twt/domain');`)).toHaveLength(1);
    expect(scanAuthorityUse(CLIENT, `const d = require('@twt/domain');`)).toHaveLength(1);
    expect(scanAuthorityUse(DOMAIN, `export { recordConsent } from '../consent/write.js';`)).toHaveLength(1);
    expect(scanAuthorityUse(DOMAIN, `export type { ConsentId } from '../ids/index.js';`)).toHaveLength(0);
  });

  it('FAILS a raw-SQL WRITE to any table but the transport\'s own — and PASSES its own writes, reads, and row locks', () => {
    expect(scanAuthorityUse(DOMAIN, 'await q.query(`UPDATE members SET state = $1 WHERE member_id = $2`);').map((f) => f.what)).toEqual([expect.stringContaining('`members`')]);
    expect(scanAuthorityUse(DOMAIN, `await q.query('INSERT INTO events_log (id) VALUES ($1)');`)).toHaveLength(1);
    expect(scanAuthorityUse(SWEEP, 'await pool.query(`DELETE FROM consent_records WHERE consent_id = ${id}`);')).toHaveLength(1);
    expect(scanAuthorityUse(SWEEP, `await pool.query('UPDATE "consent_records" SET revoked_at = now()');`)).toHaveLength(1);
    expect(scanAuthorityUse(DOMAIN, 'await q.query(`MERGE INTO members m USING x ON true WHEN MATCHED THEN UPDATE SET state = 1`);').map((f) => f.what)).toEqual([expect.stringContaining('`members`')]);
    const own =
      'await q.query(`UPDATE marketplace_lead_handoffs s SET status = $1 FROM next WHERE s.lead_id = next.lead_id`);\n' +
      'await q.query(`INSERT INTO marketplace_lead_handoffs (lead_id) VALUES ($1)`);\n' +
      'await q.query(`SELECT 1 FROM members m JOIN consent_records c ON true FOR UPDATE OF m SKIP LOCKED`);\n' +
      'await q.query(`SELECT 1 FROM marketplace_lead_handoffs FOR UPDATE SKIP LOCKED`);\n' +
      `say('we update the row later, and delete from nothing');`;
    expect(scanAuthorityUse(DOMAIN, own)).toHaveLength(0);
  });

  it('is not vacuous: the reads a file imports are counted against the whole allow-list', () => {
    const all = authorityReadAllowlistPairs();
    expect(all).toHaveLength(7);
    const src =
      `import { memberExists, getCurrentMemberState as state } from '../member/read.js';\n` +
      `import type { Whatever } from '../consent/read.js';\n` +
      `import { listConsentsForArtifact } from './../consent/read.js';`;
    expect(authorityReadsImported(DOMAIN, src)).toEqual(['../consent/read.js#listConsentsForArtifact', '../member/read.js#getCurrentMemberState', '../member/read.js#memberExists']);
    // A file that imports none of them (the predicates moved away) reads as empty — check.ts fails the tree on that.
    expect(authorityReadsImported(DOMAIN, `import { clampLimit } from '../pagination.js';`)).toEqual([]);
  });
});

describe('rule (d) — the response body is never parsed', () => {
  it('FAILS JSON.parse( and .json( in the client', () => {
    expect(scanBodyParsing(CLIENT, `const b = JSON.parse(text);`)).toHaveLength(1);
    expect(scanBodyParsing(CLIENT, `const b = await res.json();`)).toHaveLength(1);
  });
  it('PASSES the words in a comment or a string, and is applied only to the client file', () => {
    expect(scanBodyParsing(CLIENT, `// ⛔ JSON.parse( here\nconst s = 'res.json()';`)).toHaveLength(0);
    expect(scanFile(SWEEP, `const b = JSON.parse(text);`)).toHaveLength(0);
  });
});

describe('rule (e) — production passes no test seam', () => {
  it('FAILS a createPartnerLeadClient( call with an argument under apps/jobs/src', () => {
    expect(scanSeamCalls(SWEEP, `const c = createPartnerLeadClient({ testSeam: { connectPort: 1 } });`)).toHaveLength(1);
    expect(scanFile('apps/jobs/src/boot.ts', `const c = clients.createPartnerLeadClient(opts);`)).toHaveLength(1);
  });
  it('FAILS the call under an import ALIAS, and an indirect call', () => {
    expect(scanSeamCalls(SWEEP, `import { createPartnerLeadClient as mk } from './partner-lead-client.js';\nconst c = mk({ testSeam: {} });`)).toHaveLength(1);
    expect(scanSeamCalls(SWEEP, `const c = createPartnerLeadClient.call(null, { testSeam: {} });`)).toHaveLength(1);
    expect(scanSeamCalls(SWEEP, `const mk = createPartnerLeadClient.bind(null, { testSeam: {} });`)).toHaveLength(1);
    expect(scanSeamCalls(SWEEP, `import { createPartnerLeadClient as mk } from './partner-lead-client.js';\nconst c = mk();`)).toHaveLength(0);
  });
  it('FAILS every reference that is not a direct zero-argument call: a const alias, a pass, a paren call, a re-export (round 2)', () => {
    for (const src of [
      `const mk = createPartnerLeadClient;\nconst c = mk({ testSeam: {} });`,
      `const c = Reflect.apply(createPartnerLeadClient, null, [{ testSeam: {} }]);`,
      `const c = (createPartnerLeadClient)({ testSeam: {} });`,
      `export { createPartnerLeadClient as x } from './partner-lead-client.js';`,
      `const deps = { createPartnerLeadClient };`,
    ]) {
      expect(scanSeamCalls(SWEEP, src), src).toHaveLength(1);
    }
    // Round 3: a STRING-keyed access, a namespace import of the client module, and `export *` of it.
    for (const src of [
      `import { createPartnerLeadClient } from './partner-lead-client.js';\nconst c = clients['createPartnerLeadClient']({ testSeam: {} });`,
      `import * as plc from './partner-lead-client.js';\nconst c = plc.checkLeadUrl('x');`,
      `export * from './partner-lead-client.js';`,
    ]) {
      expect(scanSeamCalls(SWEEP, src), src).toHaveLength(1);
    }
    // Round 3: what is NOT a reference — an interface member, a non-null direct call, an import type.
    expect(
      scanSeamCalls(
        SWEEP,
        `interface D { createPartnerLeadClient?: () => void; m(): void }\ninterface E { createPartnerLeadClient(): void }\nconst c = createPartnerLeadClient!();\ntype T = typeof import('./partner-lead-client.js').createPartnerLeadClient;`,
      ),
    ).toHaveLength(0);
    // Its own definition, a type position and a property key are not references.
    expect(scanSeamCalls(CLIENT, `export function createPartnerLeadClient(options = {}) { return options; }\ntype C = ReturnType<typeof createPartnerLeadClient>;\nconst o = { createPartnerLeadClient: 1 };`)).toHaveLength(0);
  });
  it('PASSES the zero-argument call, and ignores a test file outside apps/jobs/src', () => {
    expect(scanSeamCalls(SWEEP, `sharedClient ??= createPartnerLeadClient();`)).toHaveLength(0);
    expect(scanFile('apps/jobs/tests/x.test.ts', `createPartnerLeadClient({ testSeam: {} });`)).toHaveLength(0);
  });
});
