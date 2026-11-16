// Registry coverage for the field-worker ENDING APPEAL vocabulary — Story 13.1f (AD7). DB-free. The sibling of
// `field-worker-registry-coverage.test.ts`, whose `field_worker.` prefix does not reach `field_worker_ending_appeal.`.
//
// SET EQUALITY IN BOTH DIRECTIONS (⛔ a count): a missing entry is a shipped event no consumer can resolve; an orphan is a registry
// row for an event the vocabulary no longer mints.

import { fieldWorker } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { EVENT_TYPE_REGISTRY } from '../src/registry';

const rows = EVENT_TYPE_REGISTRY as Record<string, { type: string; schema?: unknown; description: string } | undefined>;

describe('EVENT_TYPE_REGISTRY — field_worker_ending_appeal.* coverage (Story 13.1f)', () => {
  it('registers EVERY FIELD_WORKER_ENDING_APPEAL_EVENT_TYPES member (five), and carries no orphan field_worker_ending_appeal.* entry', () => {
    const registered = Object.keys(EVENT_TYPE_REGISTRY).filter((k) => k.startsWith('field_worker_ending_appeal.')).sort();
    expect(registered).toEqual([...fieldWorker.FIELD_WORKER_ENDING_APPEAL_EVENT_TYPES].sort());
    expect(registered).toHaveLength(5); // non-vacuity: the filter matched the whole vocabulary
  });

  it('binds each entry to the domain payload schema (the same object), with key === type, the stream template and its route', () => {
    for (const type of fieldWorker.FIELD_WORKER_ENDING_APPEAL_EVENT_TYPES) {
      const entry = rows[type];
      if (!entry) throw new Error(`no registry entry for ${type}`);
      expect(entry.type).toBe(type);
      expect(entry.schema).toBe(fieldWorker.FIELD_WORKER_ENDING_APPEAL_EVENT_PAYLOAD_SCHEMAS[type]);
      expect(entry.description).toContain('on the APPEAL stream (stream_id = appeal_id) (Story 13.1f)');
      expect(entry.description).toContain('NO PII (I6).');
      expect(entry.description, type).toMatch(/Emitted by the Story 13\.1f /);
    }
  });
});
