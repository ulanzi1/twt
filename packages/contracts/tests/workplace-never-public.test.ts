// Story 6.36a (AC8; `2026-10-14-330` SW2, I1) — a member's workplace is ⛔ NEVER PUBLIC. No public-pages, directory or
// Sahyog contract carries a key matching `workplace` / `school` / `udise` — at any depth (objects, arrays, unions,
// optionals, effects, records).
// ⭐ The walker's TEETH are proven first: on the 6.36a member contracts it FINDS those keys.

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import * as directoryPublication from '../src/directory-publication/index.js';
import { PostingHistoryItemWire, WorkplaceSearchResponse, WorkplaceSummaryWire } from '../src/members/workplace.js';
import * as publicPages from '../src/public-pages/index.js';

const FORBIDDEN = /workplace|school|udise/i;

/** Every object key reachable inside a Zod schema (zod 3). */
function keysOf(schema: unknown, seen = new Set<unknown>()): string[] {
  if (!(schema instanceof z.ZodType) || seen.has(schema)) return [];
  seen.add(schema);
  const def = (schema as z.ZodTypeAny)._def as Record<string, unknown> & { typeName?: string };
  const out: string[] = [];
  const walk = (s: unknown) => out.push(...keysOf(s, seen));
  switch (def.typeName) {
    case 'ZodObject': {
      const shape = (schema as z.AnyZodObject).shape as Record<string, unknown>;
      for (const [k, v] of Object.entries(shape)) {
        out.push(k);
        walk(v);
      }
      walk(def['catchall']);
      break;
    }
    case 'ZodArray':
      walk(def['type']);
      break;
    case 'ZodOptional':
    case 'ZodNullable':
    case 'ZodDefault':
    case 'ZodCatch':
    case 'ZodReadonly':
    case 'ZodBranded':
      walk(def['innerType'] ?? def['type']);
      break;
    case 'ZodEffects':
      walk(def['schema']);
      break;
    case 'ZodLazy':
      walk((def['getter'] as () => unknown)());
      break;
    case 'ZodPipeline':
      walk(def['in']);
      walk(def['out']);
      break;
    case 'ZodUnion':
    case 'ZodDiscriminatedUnion':
      for (const o of def['options'] as unknown[]) walk(o);
      break;
    case 'ZodIntersection':
      walk(def['left']);
      walk(def['right']);
      break;
    case 'ZodRecord':
    case 'ZodMap':
      walk(def['keyType']);
      walk(def['valueType']);
      break;
    case 'ZodTuple':
      for (const o of def['items'] as unknown[]) walk(o);
      break;
    default:
      break;
  }
  return out;
}

function forbiddenKeysIn(mod: Record<string, unknown>): string[] {
  const hits: string[] = [];
  for (const [name, value] of Object.entries(mod)) {
    for (const k of keysOf(value)) if (FORBIDDEN.test(k)) hits.push(`${name}.${k}`);
  }
  return hits;
}

describe('AC8 — a workplace is ⛔ never public', () => {
  it('the walker has TEETH: it finds the workplace keys in the 6.36a member contracts', () => {
    expect(keysOf(WorkplaceSummaryWire)).toContain('workplaceId');
    expect(keysOf(WorkplaceSearchResponse)).toContain('workplaceId');
    expect(keysOf(PostingHistoryItemWire).filter((k) => FORBIDDEN.test(k))).toEqual(expect.arrayContaining(['workplace', 'workplaceId']));
  });

  it('it walks the public modules for real (⛔ vacuous): each holds schemas with keys', () => {
    const count = (mod: Record<string, unknown>) => Object.values(mod).reduce<number>((n, v) => n + keysOf(v).length, 0);
    expect(count(publicPages as Record<string, unknown>)).toBeGreaterThan(20);
    expect(count(directoryPublication as Record<string, unknown>)).toBeGreaterThan(0);
  });

  it('⛔ a public-pages contract (the directory, Sahyog, the gate, the matrix) carries a workplace / school / udise key', () => {
    expect(forbiddenKeysIn(publicPages as Record<string, unknown>)).toEqual([]);
  });

  it('⛔ a directory-publication contract carries one either', () => {
    expect(forbiddenKeysIn(directoryPublication as Record<string, unknown>)).toEqual([]);
  });
});
