// Story 6.36 (AC11; SW24 — "⛔ never on the helpline's caller view (it is the neighbour's OWN request view), ⛔ never on any
// member surface") — `PeerRequestDetailResponse` is ⛔ `.strict()`, so a parse would STRIP an extra key rather than refuse
// it; the guard is the schema's SHAPE: ⛔ key named `source` or `recentChangeBeforeFiling` anywhere in it.

import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import { PeerRequestDetailResponse, PeerRequestListResponse } from '../src/claims/peer-request.js';

/** Every object key named anywhere in a zod schema (objects, arrays, unions, wrappers). */
function schemaKeysDeep(s: z.ZodTypeAny, out = new Set<string>(), seen = new Set<z.ZodTypeAny>()): Set<string> {
  if (seen.has(s)) return out;
  seen.add(s);
  if (s instanceof z.ZodObject) {
    for (const [k, v] of Object.entries(s.shape as Record<string, z.ZodTypeAny>)) {
      out.add(k);
      schemaKeysDeep(v, out, seen);
    }
  } else if (s instanceof z.ZodArray) schemaKeysDeep(s.element as z.ZodTypeAny, out, seen);
  else if (s instanceof z.ZodOptional || s instanceof z.ZodNullable || s instanceof z.ZodDefault) schemaKeysDeep(s._def.innerType as z.ZodTypeAny, out, seen);
  else if (s instanceof z.ZodEffects) schemaKeysDeep(s._def.schema as z.ZodTypeAny, out, seen);
  else if (s instanceof z.ZodUnion || s instanceof z.ZodDiscriminatedUnion) for (const o of s.options as z.ZodTypeAny[]) schemaKeysDeep(o, out, seen);
  else if (s instanceof z.ZodLazy) schemaKeysDeep(s.schema as z.ZodTypeAny, out, seen);
  else if (s instanceof z.ZodRecord) schemaKeysDeep(s._def.valueType as z.ZodTypeAny, out, seen);
  return out;
}

describe('Story 6.36 (AC11) — the neighbour\'s own request view carries ⛔ source and ⛔ staff line', () => {
  it('the walker sees the shape (a sanity pin — it finds keys that ARE there)', () => {
    const keys = schemaKeysDeep(PeerRequestDetailResponse);
    for (const k of ['pingId', 'memberName', 'questionnaire', 'answers', 'submitted']) expect(keys.has(k)).toBe(true);
  });

  it('⛔ `source`, ⛔ `recentChangeBeforeFiling` — in the detail (shared with the helpline) or the list', () => {
    for (const schema of [PeerRequestDetailResponse, PeerRequestListResponse]) {
      const keys = schemaKeysDeep(schema);
      expect(keys.has('source')).toBe(false);
      expect(keys.has('recentChangeBeforeFiling')).toBe(false);
    }
  });
});
