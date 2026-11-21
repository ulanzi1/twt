// The partner-boundary fence's teeth (Story 12.5, AC10): every rule has a PLANTED violation that fails and a clean source that passes.

import { describe, expect, it } from 'vitest';

import { scanAuthorityUse, scanBodyParsing, scanFile, scanReferenceNames, scanSeamCalls } from './lib.js';

const SWEEP = 'apps/jobs/src/scheduler/module-lead-handoff.ts';
const CLIENT = 'apps/jobs/src/scheduler/partner-lead-client.ts';
const DOMAIN = 'packages/domain/src/marketplace/lead-handoff.ts';
const ENVELOPE = 'packages/domain/src/marketplace/lead-envelope.ts';
const ELSEWHERE_API = 'apps/api/src/modules/marketplace/routes.ts';
const ELSEWHERE_DOMAIN = 'packages/domain/src/member/anonymize.ts';

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
      expect(scanReferenceNames(f, `const partnerReference = 1; const s = 'partner_reference';`)).toHaveLength(0);
    }
    expect(scanReferenceNames(ELSEWHERE_API, `// partner_reference is advisory\nconst PARTNER_REFERENCE_HEADER = 1; const partnerReferences = [];`)).toHaveLength(0);
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
    expect(scanFile(DOMAIN, `import { recordConsent } from '../consent/write.js';`)).toHaveLength(1);
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
  it('PASSES the zero-argument call, and ignores a test file outside apps/jobs/src', () => {
    expect(scanSeamCalls(SWEEP, `sharedClient ??= createPartnerLeadClient();`)).toHaveLength(0);
    expect(scanFile('apps/jobs/tests/x.test.ts', `createPartnerLeadClient({ testSeam: {} });`)).toHaveLength(0);
  });
});
