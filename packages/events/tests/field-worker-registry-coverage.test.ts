// Registry coverage for the field-worker vocabulary — Story 13.1 (AC3). DB-free. Cloned from
// `module-registry-coverage.test.ts`, with this stream's OWN description template.
//
// The compile-time `satisfies Record<FieldWorkerEventType, z.ZodTypeAny>` on `FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS` binds the
// domain's OWN map and says nothing about this package, so an event could ship with no registry entry and every check
// would pass. SET EQUALITY IN BOTH DIRECTIONS:
//   · missing entry  ⇒ a shipped event no consumer can resolve;
//   · orphan entry   ⇒ a `field_worker.*` registry row for an event the vocabulary no longer mints.
//
// ⚠ It asserts SET EQUALITY, ⛔ not a count.

import { fieldWorker } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { EVENT_TYPE_REGISTRY } from '../src/registry';

/** The `field_worker.*` keys the registry actually carries. */
const registryFieldWorkerTypes = Object.keys(EVENT_TYPE_REGISTRY)
  .filter((k) => k.startsWith('field_worker.'))
  .sort();

describe('EVENT_TYPE_REGISTRY — field_worker.* coverage', () => {
  it('registers EVERY FIELD_WORKER_EVENT_TYPES member (seven), and carries no orphan field_worker.* entry', () => {
    expect(registryFieldWorkerTypes).toEqual([...fieldWorker.FIELD_WORKER_EVENT_TYPES].sort());
  });

  it('binds every field_worker.* entry to its payload schema, with key === type and the stream template', () => {
    const rows = EVENT_TYPE_REGISTRY as Record<string, { type: string; schema?: unknown; description: string } | undefined>;
    for (const type of fieldWorker.FIELD_WORKER_EVENT_TYPES) {
      const entry = rows[type];
      if (!entry) throw new Error(`no registry entry for ${type}`);
      expect(entry.type).toBe(type);
      expect(entry.schema, `no payload schema bound for ${type}`).toBeDefined();
      expect(entry.description).toContain('on the FIELD WORKER stream (stream_id = field_worker_id) (Story 13.1)');
      expect(entry.description).toContain('Human actor only (operator / trustee — QE7); NO PII (I8).');
    }
  });

  it('only field_worker.registered names a 13.1 production emitter; the other six say they have none yet', () => {
    const rows = EVENT_TYPE_REGISTRY as Record<string, { description: string } | undefined>;
    for (const type of fieldWorker.FIELD_WORKER_EVENT_TYPES) {
      const d = rows[type]!.description;
      if (type === 'field_worker.registered') expect(d).toContain('Emitted by the Story 13.1 registration route');
      else expect(d).toContain('No production emitter in 13.1');
    }
  });

  it('the registry schema for a field-worker event IS the domain payload schema (same object, not a copy)', () => {
    const rows = EVENT_TYPE_REGISTRY as Record<string, { schema?: unknown } | undefined>;
    for (const type of fieldWorker.FIELD_WORKER_EVENT_TYPES) {
      expect(rows[type]?.schema).toBe(fieldWorker.FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS[type]);
    }
  });
});
