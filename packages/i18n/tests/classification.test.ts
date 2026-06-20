import { describe, expect, it } from 'vitest';

import {
  classifyNamespace,
  declareSurface,
  getSurfaceClass,
  parseClassificationConfig,
  resolveClassification,
} from '../src/classification.js';

describe('parseClassificationConfig', () => {
  it('accepts a valid config (ignoring extra keys like $comment)', () => {
    const cfg = parseClassificationConfig({
      $comment: 'docs',
      default: 'member-facing',
      namespaces: { admin: 'admin-facing' },
    });
    expect(cfg).toEqual({ default: 'member-facing', namespaces: { admin: 'admin-facing' } });
  });

  it('defaults namespaces to {} when omitted', () => {
    expect(parseClassificationConfig({ default: 'admin-facing' })).toEqual({
      default: 'admin-facing',
      namespaces: {},
    });
  });

  it('throws on a bad default', () => {
    expect(() => parseClassificationConfig({ default: 'nope' })).toThrow(/'default' must be/);
  });

  it('throws on a bad namespace value, naming the namespace', () => {
    expect(() =>
      parseClassificationConfig({ default: 'member-facing', namespaces: { x: 'bad' } }),
    ).toThrow(/namespace 'x' must be/);
  });
});

describe('resolveClassification (pure)', () => {
  const cfg = parseClassificationConfig({
    default: 'member-facing',
    namespaces: { admin: 'admin-facing' },
  });

  it('uses the override when present, the default otherwise', () => {
    expect(resolveClassification(cfg, 'admin')).toBe('admin-facing');
    expect(resolveClassification(cfg, 'common')).toBe('member-facing');
  });
});

describe('runtime registry', () => {
  it('uses the default (member-facing) for the seeded, undeclared common namespace', () => {
    expect(getSurfaceClass('common')).toBeUndefined();
    expect(classifyNamespace('common')).toBe('member-facing');
  });

  it('declareSurface registers + is idempotent for an identical re-declaration', () => {
    declareSurface('reports', 'admin-facing');
    declareSurface('reports', 'admin-facing');
    expect(classifyNamespace('reports')).toBe('admin-facing');
    expect(getSurfaceClass('reports')).toBe('admin-facing');
  });

  it('declareSurface throws on a conflicting re-declaration', () => {
    declareSurface('niyamavali', 'member-facing');
    expect(() => declareSurface('niyamavali', 'admin-facing')).toThrow(/refusing reclassification/);
  });
});
