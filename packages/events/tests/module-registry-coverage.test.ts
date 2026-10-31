// Registry coverage for the module vocabulary — Story 12.1 (AC3). DB-free.
//
// The `claim-registry-coverage.test.ts` shape, for the same reason: the compile-time `satisfies
// Record<ModuleEventType, z.ZodTypeAny>` on `MODULE_EVENT_PAYLOAD_SCHEMAS` binds the domain's OWN map and
// says nothing about this package, so an event could ship with no registry entry and every check would
// pass. SET EQUALITY IN BOTH DIRECTIONS:
//   · missing entry  ⇒ a shipped event no consumer can resolve;
//   · orphan entry   ⇒ a `module.*` registry row for an event the vocabulary no longer mints.
//
// ⚠ It asserts SET EQUALITY, ⛔ not a count. A count assertion passes when one event is added and
// another deleted in the same change — the precise case a coverage test exists to catch.

import { marketplace } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { EVENT_TYPE_REGISTRY } from '../src/registry';

/** The `module.*` keys the registry actually carries. */
const registryModuleTypes = Object.keys(EVENT_TYPE_REGISTRY)
  .filter((k) => k.startsWith('module.'))
  .sort();

describe('EVENT_TYPE_REGISTRY — module.* coverage', () => {
  it('registers EVERY MODULE_EVENT_TYPES member, and carries no orphan module.* entry', () => {
    expect(registryModuleTypes).toEqual([...marketplace.MODULE_EVENT_TYPES].sort());
  });

  it('binds every module.* entry to its payload schema, with key === type', () => {
    const rows = EVENT_TYPE_REGISTRY as Record<
      string,
      { type: string; schema?: unknown; description: string } | undefined
    >;
    for (const type of marketplace.MODULE_EVENT_TYPES) {
      const entry = rows[type];
      if (!entry) throw new Error(`no registry entry for ${type}`);
      expect(entry.type).toBe(type);
      expect(entry.schema, `no payload schema bound for ${type}`).toBeDefined();
      // The AC3 description template: the stream, the story, and the honest "no production emitter" note.
      expect(entry.description).toContain('on the MODULE stream (stream_id = module_id) (Story 12.1)');
      expect(entry.description).toContain('No production emitter in 12.1 (I6)');
    }
  });

  it('the registry schema for a module event IS the domain payload schema (same object, not a copy)', () => {
    const rows = EVENT_TYPE_REGISTRY as Record<string, { schema?: unknown } | undefined>;
    for (const type of marketplace.MODULE_EVENT_TYPES) {
      const entry = rows[type];
      if (!entry) throw new Error(`no registry entry for ${type}`);
      expect(entry.schema).toBe(marketplace.MODULE_EVENT_PAYLOAD_SCHEMAS[type]);
    }
  });
});
