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
  it('PASSES the zero-argument call, and ignores a test file outside apps/jobs/src', () => {
    expect(scanSeamCalls(SWEEP, `sharedClient ??= createPartnerLeadClient();`)).toHaveLength(0);
    expect(scanFile('apps/jobs/tests/x.test.ts', `createPartnerLeadClient({ testSeam: {} });`)).toHaveLength(0);
  });
});
