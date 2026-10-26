// Migration 0185 ↔ the TypeScript constants lockstep — Story 5.11b, review 2026-10-26 (R4-P8). PURE.
//
// 0185's stored generated columns (`contribution_pool_id`, `contribution_member_id`,
// `contribution_reversed_event_id`) re-spell, as SQL literals, three event types and three payload keys
// that `contribution/read.ts` owns as constants. The bounded suppression read filters on those columns,
// so a renamed constant would leave them NULL for every new event: the read finds no acted member, and a
// member who already paid is reminded — and TEXTED — with every live test still green (they seed literal
// payloads too). This test holds the migration's literals equal to the constants.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  CONFIRMED_EVENT_TYPE,
  CONFIRMED_PAYLOAD_MEMBER_KEY,
  CONFIRMED_PAYLOAD_POOL_KEY,
  REVERSED_CONFIRMED_EVENT_ID_KEY,
} from '../../src/contribution/read.js';
import { ContributionConfirmedPayloadSchema, ContributionUtrAttestedPayloadSchema } from '../../src/contribution/events.js';
import { CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE } from '../../src/contribution/write.js';
import {
  RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE,
  ReconciliationConfirmationReversedPayloadSchema,
} from '../../src/reconciliation/events.js';

const migration = readFileSync(
  fileURLToPath(new URL('../../migrations/0185_contribution-suppression-batch-indexes.sql', import.meta.url)),
  'utf8',
);

/** The generated-column expression of one 0185 column (up to the next column or the statement's end). */
function generatedExpression(column: string): string {
  const start = migration.indexOf(`ADD COLUMN "${column}"`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = migration.indexOf('ADD COLUMN', start + 1);
  const end = migration.indexOf(';', start);
  return migration.slice(start, next === -1 || next > end ? end : next);
}

describe('R4-P8 — 0185 generated columns ↔ the read constants', () => {
  it('the pool column covers exactly the three event types and reads the pool key', () => {
    const expr = generatedExpression('contribution_pool_id');
    for (const type of [CONFIRMED_EVENT_TYPE, CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE, RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE]) {
      expect(expr).toContain(`'${type}'`);
    }
    expect(expr).toContain(`payload ->> '${CONFIRMED_PAYLOAD_POOL_KEY}'`);
  });

  it('the member column covers confirmed + attested and reads the member key', () => {
    const expr = generatedExpression('contribution_member_id');
    expect(expr).toContain(`'${CONFIRMED_EVENT_TYPE}'`);
    expect(expr).toContain(`'${CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE}'`);
    expect(expr).not.toContain(`'${RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE}'`);
    expect(expr).toContain(`payload ->> '${CONFIRMED_PAYLOAD_MEMBER_KEY}'`);
  });

  it('the reversal column covers the reversal type and reads the reversed-confirmation key', () => {
    const expr = generatedExpression('contribution_reversed_event_id');
    expect(expr).toContain(`'${RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE}'`);
    expect(expr).toContain(`payload ->> '${REVERSED_CONFIRMED_EVENT_ID_KEY}'`);
  });

  it('the confirmed and attested payload schemas carry the pool + member keys the columns read (their producer contracts)', () => {
    for (const schema of [ContributionConfirmedPayloadSchema, ContributionUtrAttestedPayloadSchema]) {
      const keys = Object.keys(schema.shape);
      expect(keys).toContain(CONFIRMED_PAYLOAD_POOL_KEY);
      expect(keys).toContain(CONFIRMED_PAYLOAD_MEMBER_KEY);
    }
  });

  it('the reversal payload schema carries the keys the columns read (its producer contract)', () => {
    const keys = Object.keys(ReconciliationConfirmationReversedPayloadSchema.shape);
    expect(keys).toContain(CONFIRMED_PAYLOAD_POOL_KEY);
    expect(keys).toContain(REVERSED_CONFIRMED_EVENT_ID_KEY);
  });

  it('both partial indexes are predicated on the same event types', () => {
    const memberStart = migration.indexOf('CREATE INDEX "contribution_acted_pool_member_idx"');
    const memberIndex = migration.slice(memberStart, migration.indexOf(';', memberStart));
    expect(memberIndex).toContain(`'${CONFIRMED_EVENT_TYPE}'`);
    expect(memberIndex).toContain(`'${CONTRIBUTION_UTR_ATTESTED_EVENT_TYPE}'`);
    const reversalStart = migration.indexOf('CREATE INDEX "contribution_reversed_pool_reference_idx"');
    const reversalIndex = migration.slice(reversalStart, migration.indexOf(';', reversalStart));
    expect(reversalIndex).toContain(`'${RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE}'`);
  });
});
