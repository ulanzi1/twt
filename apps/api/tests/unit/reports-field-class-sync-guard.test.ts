// Reports library — Tier-1 field-class sync-guard (Story 10.7 review finding).
//
// The artifact envelope's field-class (`'report_export'`) is duplicated BY VALUE across
// apps/api/src/context.ts and apps/jobs/src/reports-export.ts ("apps cannot depend on apps" — no shared
// import is possible). A typo'd edit to either side would make every previously-encrypted artifact fail
// to decrypt, undetected by CI. Source-text assertion (the assemble.test.ts structural-check precedent)
// since a runtime cross-app import would violate the same "apps cannot depend on apps" boundary this
// duplication exists to respect.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

function extractFieldClass(url: string): string {
  const source = readFileSync(fileURLToPath(url), 'utf8');
  const match = /REPORT_EXPORT_FIELD_CLASS\s*=\s*'([^']+)'/.exec(source);
  if (!match) throw new Error(`REPORT_EXPORT_FIELD_CLASS literal not found in ${url}`);
  return match[1]!;
}

describe('report_export Tier-1 field-class stays in sync across apps/api and apps/jobs', () => {
  it('the api context constant matches the jobs worker constant', () => {
    const apiFieldClass = extractFieldClass(new URL('../../src/context.ts', import.meta.url).href);
    const jobsFieldClass = extractFieldClass(
      new URL('../../../jobs/src/reports-export.ts', import.meta.url).href,
    );
    expect(apiFieldClass).toBe(jobsFieldClass);
    expect(apiFieldClass).toBe('report_export');
  });
});
