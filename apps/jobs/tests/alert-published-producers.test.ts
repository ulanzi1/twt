// AC9 / I2 — the bridge is ⛔ a bulk channel (Story 5.8b; `2026-10-28-415` FS7 (a)). Every `alert_published` producer in the
// apps is FOUND BY SCAN (⛔ a hand-kept list): each one hard-codes `time_critical: false` — so the contract refuses an `sms` block
// on it and the fan-out never bridges it — EXCEPT the cycle-open builder, whose `time_critical` is the degraded-mode signal 8.1
// derives at the freeze. A future producer that sets `time_critical: true` on an `alert_published` turns this RED (the one hole the
// contract's refinement leaves by construction).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function walk(rel: string, out: Map<string, string>): void {
  const abs = path.join(repoRoot, rel);
  for (const name of readdirSync(abs)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const childRel = `${rel}/${name}`;
    if (statSync(path.join(abs, name)).isDirectory()) walk(childRel, out);
    else if (/\.(?:ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.set(childRel, readFileSync(path.join(abs, name), 'utf8'));
  }
}

const CYCLE_OPEN_BUILDER = 'apps/jobs/src/scheduler/contribution-notify-triggers.ts';
const PRODUCER = /^\s*alert_category:\s*'alert_published'/;

/** Every `alert_published` object literal in code (a comment line never matches `PRODUCER`), with the 15 lines above it. */
function producers(files: ReadonlyMap<string, string>): { file: string; line: number; head: string }[] {
  const out: { file: string; line: number; head: string }[] = [];
  for (const [file, src] of files) {
    const lines = src.split('\n');
    lines.forEach((l, i) => {
      if (PRODUCER.test(l)) out.push({ file, line: i + 1, head: lines.slice(Math.max(0, i - 15), i + 1).join('\n') });
    });
  }
  return out;
}

/** The offenders: a producer that neither hard-codes `time_critical: false` nor is the cycle-open builder's envelope. */
function offenders(found: ReturnType<typeof producers>): string[] {
  return found
    .filter((p) => !/time_critical:\s*false\b/.test(p.head))
    .filter((p) => !(p.file === CYCLE_OPEN_BUILDER && /\.\.\.envelope\(input\)/.test(p.head)))
    .map((p) => `${p.file}:${String(p.line)}`);
}

describe('AC9 — every `alert_published` producer is a non-time-critical broadcast, or the cycle-open builder', () => {
  const tree = new Map<string, string>();
  walk('apps/jobs/src', tree);
  walk('apps/api/src', tree);
  const found = producers(tree);

  it('the scan finds the producers (a rename or a move fails here, ⛔ silently passes)', () => {
    const files = [...new Set(found.map((p) => p.file))].sort();
    for (const f of [
      'apps/jobs/src/scheduler/news-publish.ts',
      'apps/jobs/src/scheduler/survey-publish.ts',
      'apps/jobs/src/scheduler/moderation-notify.ts',
      'apps/jobs/src/scheduler/claim-correction-reminders.ts',
      CYCLE_OPEN_BUILDER,
    ]) {
      expect(files).toContain(f);
    }
  });

  it('⭐ ⛔ offender — each hard-codes `time_critical: false`, or is the cycle-open builder', () => {
    expect(offenders(found)).toEqual([]);
  });

  it('⭐ positive control — a planted producer with `time_critical: true` IS caught; the cycle-open builder\'s shape elsewhere is ⛔ excused', () => {
    const planted = new Map(tree);
    planted.set('apps/jobs/src/other/announce.ts', "export const a = {\n    time_critical: true,\n    alert_category: 'alert_published',\n};\n");
    planted.set('apps/jobs/src/other/copy.ts', "export const b = {\n    ...envelope(input),\n    alert_category: 'alert_published',\n};\n");
    expect(offenders(producers(planted)).sort()).toEqual(['apps/jobs/src/other/announce.ts:3', 'apps/jobs/src/other/copy.ts:3']);
  });
});
