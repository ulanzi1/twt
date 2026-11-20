// Story 14.3 — N1, TR5 (decision `2026-11-20-467`): the system DRAFTS a breach notice; people send it. A source fence over the
// data-protection API module and the domain breach module: neither imports a channel, a queue, a mail or SMS client, nor makes an
// outbound request. A "sent" fact is only ever an entry staff record afterwards. Unit suite — no database.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOTS = [resolve(HERE, '../../src/modules/data-protection'), resolve(HERE, '../../../../packages/domain/src/breach')];

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Anything that could carry a notice out of the process. */
const SENDS: readonly { name: string; pattern: RegExp }[] = [
  { name: 'the channels package', pattern: /from\s+['"]@twt\/channels['"]/ },
  { name: 'the queue package', pattern: /from\s+['"]@twt\/queue['"]/ },
  { name: 'a notifications / channel module import', pattern: /from\s+['"][^'"]*(notifications|channel-config|staff-email|sms|whatsapp|telegram|push)[^'"]*['"]/i },
  { name: 'an outbound request', pattern: /\bfetch\s*\(|\bundici\b|node:https?\b|\baxios\b/ },
  { name: 'a dispatch or enqueue call', pattern: /\b(dispatch|enqueue|sendMail|sendSms|sendEmail|sendPush|sendWhatsApp)\w*\s*\(/ },
];

function findings(source: string): string[] {
  const code = stripComments(source);
  return SENDS.filter((s) => s.pattern.test(code)).map((s) => s.name);
}

describe('Story 14.3 N1 — the breach register sends nothing', () => {
  const files = ROOTS.flatMap((root) => readdirSync(root).filter((f) => f.endsWith('.ts')).map((f) => join(root, f)));

  it('scans the API module and the domain module', () => {
    const names = files.map((f) => f.split('/').slice(-2).join('/'));
    expect(names).toEqual(expect.arrayContaining(['data-protection/handlers.ts', 'data-protection/routes.ts', 'data-protection/index.ts', 'breach/incidents.ts', 'breach/rules.ts']));
  });

  it('⛔ no file imports a channel, a queue or a mail / SMS client, or makes an outbound request', () => {
    const offenders = files.map((f) => ({ file: f.split('/').slice(-2).join('/'), found: findings(readFileSync(f, 'utf8')) })).filter((o) => o.found.length > 0);
    expect(offenders).toEqual([]);
  });

  it('teeth: the fence fires on each kind of send, and not on a comment that mentions one', () => {
    expect(findings("import { dispatch } from '@twt/channels';")).toContain('the channels package');
    expect(findings("import { boss } from '@twt/queue';")).toContain('the queue package');
    expect(findings("import { x } from '../staff-email/client.js';")).toContain('a notifications / channel module import');
    expect(findings("await fetch('https://board.example/intimations', { method: 'POST' });")).toContain('an outbound request');
    expect(findings('await deps.breachNoticeQueue.enqueue({ incidentId });')).toContain('a dispatch or enqueue call');
    expect(findings('await sendSmsToMembers(ids);')).toContain('a dispatch or enqueue call');
    expect(findings('// nothing here calls fetch( or dispatch( — people send the notice\nconst x = 1;')).toEqual([]);
    expect(findings("import { audit, breach } from '@twt/domain';")).toEqual([]);
  });
});
