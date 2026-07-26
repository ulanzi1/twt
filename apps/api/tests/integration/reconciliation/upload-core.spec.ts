// Bank-statement upload CORE — live-DB integration (Story 9.3, Tasks 2/3/4; AC1–AC4).
//
// Exercises the shared upload core (`uploadBankStatement`) directly over a real scope tx + the in-memory
// BankStatementStorage / no-op StatementScanner fakes — the guard→scan→store→parse→emit pipeline, the
// CSV-parses-inline vs everything-else-falls-back routing (Decision D1), the reconciliation.* event shapes
// (statement-uploaded provenance/heartbeat + the manual_transcription_requested fallback task), the
// quarantine reject, and the AR-45 storage-outage → dignified 503. Driving the core directly (not the full
// HTTP auth stack) keeps the test focused on the transport logic; the route wiring + authz are asserted by
// typecheck + the login-wall CI gate. Rolls back each tx (no persistence — assertions read within the tx).

import { randomUUID } from 'node:crypto';

import type { BankStatementStorage, StatementScanner } from '@twt/contracts';
import { ids } from '@twt/domain';
import { loadEvents } from '@twt/events';
import { createRejectingStatementScanner } from '@twt/platform-adapters';
import { afterEach, describe, expect, it } from 'vitest';

import type { AppDeps } from '../../../src/context.js';
import {
  createReconciliationHandlers,
  type UploadTarget,
} from '../../../src/modules/reconciliation/handlers.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { buildTestDeps, hasDatabase, type TestDeps } from '../_setup.js';

const PARIWAR = '11111111-1111-1111-1111-111111111111';

/** A real SBI CSV the `bihar/sbi` golden parser normalizes (header + one UPI credit row). */
const SBI_CSV = [
  'Txn Date,Value Date,Description,Ref No./Cheque No.,Debit,Credit,Balance',
  '03/10/2026,03/10/2026,UPI/CR/800000000030/PAYER/fmt@oksbi/Contribution,800000000030,,Rs. 2000.50,99999.00',
].join('\n');

/** A minimal fake multipart FastifyRequest carrying `bytes` at `mimetype`. */
function fakeRequest(bytes: Buffer, mimetype: string, actorId: string) {
  return {
    file: async () => ({
      mimetype,
      toBuffer: async () => bytes,
      file: { truncated: false },
    }),
    requestContext: { actorId, pariwarId: PARIWAR, traceId: randomUUID() },
    log: { warn: () => undefined, error: () => undefined, info: () => undefined },
  } as unknown as import('fastify').FastifyRequest;
}

function makeTarget(poolId: string, actorId: string): UploadTarget {
  return {
    pariwarId: ids.pariwarId(PARIWAR),
    poolId: ids.poolId(poolId),
    claimCaseId: ids.claimId(randomUUID()),
    bankCode: 'sbi',
    actorId,
    role: 'nominee',
  };
}

describe.skipIf(!hasDatabase)('bank-statement upload core (PARIWAR scope)', { timeout: 20000 }, () => {
  let t: TestDeps;

  afterEach(async () => {
    await t?.pool.end().catch(() => undefined);
  });

  async function run(
    deps: AppDeps,
    req: import('fastify').FastifyRequest,
    target: UploadTarget,
  ): Promise<{ res: Awaited<ReturnType<ReturnType<typeof createReconciliationHandlers>['uploadBankStatement']>>; eventTypes: string[]; payloads: Record<string, unknown>[] }> {
    const h = createReconciliationHandlers(deps);
    const scopeTx = await openScopeTx(deps, PARIWAR);
    try {
      const res = await h.uploadBankStatement(req, scopeTx, target);
      const events = await loadEvents(scopeTx.tx, target.poolId);
      return {
        res,
        eventTypes: events.map((e) => e.eventType),
        payloads: events.map((e) => e.payload as Record<string, unknown>),
      };
    } finally {
      await closeScopeTx(scopeTx, false); // rollback — no persistence
    }
  }

  it('AC1: an allowlisted-bank CSV parses inline → {outcome:parsed} + summary + statement-uploaded event + stored blob', async () => {
    t = buildTestDeps({ env: { DATABASE_URL: process.env['DATABASE_URL'] } });
    const poolId = randomUUID();
    const actorId = randomUUID();
    const { res, eventTypes, payloads } = await run(
      t.deps,
      fakeRequest(Buffer.from(SBI_CSV, 'utf8'), 'text/csv', actorId),
      makeTarget(poolId, actorId),
    );

    expect(res.outcome).toBe('parsed');
    if (res.outcome === 'parsed') {
      expect(res.summary.bank_code).toBe('sbi');
      expect(res.summary.rows_parsed).toBeGreaterThanOrEqual(1);
      expect(res.summary.parser_version).toBe('sbi@1');
    }
    // The metadata/heartbeat event landed (parsed:true), NOT a fallback task.
    expect(eventTypes).toContain('reconciliation.statement-uploaded');
    expect(eventTypes).not.toContain('reconciliation.manual_transcription_requested');
    const uploaded = payloads.find((p) => p['parsed'] === true);
    expect(uploaded).toBeTruthy();
    expect(uploaded!['objectKey']).toMatch(new RegExp(`^pariwar/${PARIWAR}/pool/${poolId}/`));
    // The raw bytes were stored under that key.
    expect(t.bankStatementStorage.store.get(uploaded!['objectKey'] as string)).toBeTruthy();
  });

  it('AC1/AC2/D1: a PDF routes to the human fallback → {outcome:fallback} + statement-uploaded(parsed:false) + manual_transcription_requested', async () => {
    t = buildTestDeps({ env: { DATABASE_URL: process.env['DATABASE_URL'] } });
    const poolId = randomUUID();
    const actorId = randomUUID();
    const { res, eventTypes, payloads } = await run(
      t.deps,
      fakeRequest(Buffer.from('%PDF-1.7 not a csv', 'utf8'), 'application/pdf', actorId),
      makeTarget(poolId, actorId),
    );

    expect(res.outcome).toBe('fallback');
    if (res.outcome === 'fallback') {
      expect(res.fallback.reason).toBe('unsupported_file');
      expect(res.fallback.slaHours).toBe(48);
    }
    // Both events: the upload heartbeat (parsed:false — a stored blob, still an engagement) + the task.
    expect(eventTypes).toContain('reconciliation.statement-uploaded');
    expect(eventTypes).toContain('reconciliation.manual_transcription_requested');
    const uploaded = payloads.find((p) => p['parsed'] === false);
    expect(uploaded).toBeTruthy();
    const task = payloads.find((p) => p['reason'] === 'unsupported_file');
    expect(task).toBeTruthy();
    // The task points at the SAME stored blob so staff transcribe from it (the 9.4 feedback seam).
    expect(task!['objectKey']).toBe(uploaded!['objectKey']);
  });

  it('AC2/D1: an allowlisted-bank CSV the parser cannot normalize → parse_failed fallback (with the summary)', async () => {
    t = buildTestDeps({ env: { DATABASE_URL: process.env['DATABASE_URL'] } });
    const poolId = randomUUID();
    const actorId = randomUUID();
    // A CSV with the SBI header but a garbage row that yields zero entries.
    const badCsv = 'Txn Date,Value Date,Description,Ref No./Cheque No.,Debit,Credit,Balance\n,,,,,,';
    const { res, eventTypes } = await run(
      t.deps,
      fakeRequest(Buffer.from(badCsv, 'utf8'), 'text/csv', actorId),
      makeTarget(poolId, actorId),
    );
    expect(res.outcome).toBe('fallback');
    if (res.outcome === 'fallback') {
      expect(res.fallback.reason).toBe('parse_failed');
    }
    expect(eventTypes).toContain('reconciliation.manual_transcription_requested');
  });

  it('AC4: a virus-flagged file is QUARANTINED — rejected before store/parse, no events, nothing stored', async () => {
    const scanner: StatementScanner = createRejectingStatementScanner({ reason: 'eicar' });
    t = buildTestDeps({ statementScanner: scanner, env: { DATABASE_URL: process.env['DATABASE_URL'] } });
    const poolId = randomUUID();
    const actorId = randomUUID();
    const h = createReconciliationHandlers(t.deps);
    const scopeTx = await openScopeTx(t.deps, PARIWAR);
    try {
      await expect(
        h.uploadBankStatement(fakeRequest(Buffer.from(SBI_CSV), 'text/csv', actorId), scopeTx, makeTarget(poolId, actorId)),
      ).rejects.toMatchObject({ code: 'reconciliation.file_quarantined' });
      const events = await loadEvents(scopeTx.tx, poolId);
      expect(events).toHaveLength(0);
      expect(t.bankStatementStorage.store.size).toBe(0);
    } finally {
      await closeScopeTx(scopeTx, false);
    }
  });

  it('AC4: a storage outage degrades to a dignified 503 (never a 500), audit-logged', async () => {
    const flaky: BankStatementStorage = {
      async put() {
        throw new Error('gcs unavailable');
      },
      async getBytes() {
        throw new Error('n/a');
      },
      async signedReadUrl() {
        return 'n/a';
      },
    };
    t = buildTestDeps({ bankStatementStorage: flaky as never, env: { DATABASE_URL: process.env['DATABASE_URL'] } });
    const poolId = randomUUID();
    const actorId = randomUUID();
    const h = createReconciliationHandlers(t.deps);
    const scopeTx = await openScopeTx(t.deps, PARIWAR);
    try {
      await expect(
        h.uploadBankStatement(fakeRequest(Buffer.from(SBI_CSV), 'text/csv', actorId), scopeTx, makeTarget(poolId, actorId)),
      ).rejects.toMatchObject({ statusCode: 503, code: 'reconciliation.storage_unavailable' });
    } finally {
      await closeScopeTx(scopeTx, false);
    }
    expect(t.auditSink.events.some((e) => e.type === 'member_reconciliation.storage_unavailable')).toBe(true);
  });

  it('AC1: an empty upload is a dignified 400, never stored', async () => {
    t = buildTestDeps({ env: { DATABASE_URL: process.env['DATABASE_URL'] } });
    const poolId = randomUUID();
    const actorId = randomUUID();
    const h = createReconciliationHandlers(t.deps);
    const scopeTx = await openScopeTx(t.deps, PARIWAR);
    try {
      await expect(
        h.uploadBankStatement(fakeRequest(Buffer.alloc(0), 'text/csv', actorId), scopeTx, makeTarget(poolId, actorId)),
      ).rejects.toMatchObject({ code: 'reconciliation.empty' });
      expect(t.bankStatementStorage.store.size).toBe(0);
    } finally {
      await closeScopeTx(scopeTx, false);
    }
  });
});
