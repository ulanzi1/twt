// Registry coverage for the field-worker MOVE REQUEST vocabulary — Story 13.1d (AD2). DB-free. The sibling of
// `field-worker-registry-coverage.test.ts`, whose `field_worker.` prefix does not reach `field_worker_move_request.`.
//
// SET EQUALITY IN BOTH DIRECTIONS (⛔ a count): a missing entry is a shipped event no consumer can resolve; an orphan is a registry
// row for an event the vocabulary no longer mints.

import { fieldWorker } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { EVENT_TYPE_REGISTRY } from '../src/registry';

const rows = EVENT_TYPE_REGISTRY as Record<string, { type: string; schema?: unknown; description: string } | undefined>;

describe('EVENT_TYPE_REGISTRY — field_worker_move_request.* coverage (Story 13.1d)', () => {
  it('registers EVERY FIELD_WORKER_MOVE_REQUEST_EVENT_TYPES member (seven), and carries no orphan field_worker_move_request.* entry', () => {
    const registered = Object.keys(EVENT_TYPE_REGISTRY).filter((k) => k.startsWith('field_worker_move_request.')).sort();
    expect(registered).toEqual([...fieldWorker.FIELD_WORKER_MOVE_REQUEST_EVENT_TYPES].sort());
    expect(registered).toHaveLength(7); // non-vacuity: the filter matched the whole vocabulary
  });

  it('binds each entry to the domain payload schema (the same object), with key === type and the stream template', () => {
    for (const type of fieldWorker.FIELD_WORKER_MOVE_REQUEST_EVENT_TYPES) {
      const entry = rows[type];
      if (!entry) throw new Error(`no registry entry for ${type}`);
      expect(entry.type).toBe(type);
      expect(entry.schema).toBe(fieldWorker.FIELD_WORKER_MOVE_REQUEST_EVENT_PAYLOAD_SCHEMAS[type]);
      expect(entry.description).toContain('on the MOVE REQUEST stream (stream_id = move_request_id) (Story 13.1d)');
      expect(entry.description).toContain('NO PII (I6).');
      expect(entry.description).not.toContain('No production emitter');
    }
  });

  it('escalated is the one SYSTEM event; every other names its route', () => {
    for (const type of fieldWorker.FIELD_WORKER_MOVE_REQUEST_EVENT_TYPES) {
      const d = rows[type]!.description;
      if (type === 'field_worker_move_request.escalated') expect(d).toContain('SYSTEM actor only');
      else expect(d, type).toMatch(/Emitted by the Story 13\.1[cd] /);
    }
  });

  it('field_worker.posted names BOTH emitters now that the acceptance is built (no "unverified until built")', () => {
    const d = rows['field_worker.posted']!.description;
    expect(d).toContain('the Story 13.1d acceptance of a move request');
    expect(d).not.toContain('unverified until built');
  });
});
