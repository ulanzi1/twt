// Story 14.3 — N1, TR5 (decision `2026-11-20-467`): the system DRAFTS a breach notice; people send it. A source fence over the
// data-protection API module, the domain breach module, the contracts breach module and the admin breach pages: none imports a
// channel, a queue, a mail or SMS client, a socket or a child process, makes an outbound request, or offers a send link. A "sent"
// fact is only ever an entry staff record afterwards. Unit suite — no database. Every root is walked RECURSIVELY (review
// 2026-11-20: a flat `readdirSync` never saw a subdirectory). The admin pages reach their OWN API through `api/client.ts`, which
// sits outside the fenced root by design.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../../../..');
const ROOTS = [
  resolve(HERE, '../../src/modules/data-protection'),
  join(REPO, 'packages/domain/src/breach'),
  join(REPO, 'packages/contracts/src/breach'),
  join(REPO, 'apps/admin/src/modules/breach-reporting'),
];

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Anything that could carry a notice out of the process. */
const SENDS: readonly { name: string; pattern: RegExp }[] = [
  { name: 'the channels package', pattern: /from\s+['"]@twt\/channels['"]/ },
  { name: 'the queue package', pattern: /from\s+['"]@twt\/queue['"]/ },
  { name: 'a notifications / channel module import', pattern: /from\s+['"][^'"]*(notifications|channel-config|staff-email|sms|whatsapp|telegram|push)[^'"]*['"]/i },
  { name: 'an outbound request', pattern: /\bfetch\s*\(|\bundici\b|\baxios\b|\bXMLHttpRequest\b|\bsendBeacon\b|\bWebSocket\b/ },
  // Module specifiers only — an `import … from`, a dynamic `import(` or a `require(` — so a plain string such as `'net'` or `'tls'`
  // elsewhere is never a hit (patch review 2026-11-21).
  {
    name: 'a mail / SMS / cloud client',
    pattern: /(\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)['"](nodemailer|twilio|resend|postmark|mailgun[^'"]*|@aws-sdk\/[^'"]+|@sendgrid\/[^'"]+|got|ky)['"]/,
  },
  {
    name: 'a socket, a child process or an HTTP client module',
    pattern: /(\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)['"](node:)?(net|tls|dgram|child_process|http|https|http2)['"]/,
  },  { name: 'a dispatch or enqueue call', pattern: /\b(dispatch|enqueue|sendMail|sendSms|sendEmail|sendPush|sendWhatsApp)\w*\s*\(/ },
];


/**
 * A link that hands a notice to a mail / SMS / phone / WhatsApp app — only inside a string or template literal (`'mailto:…'`), so
 * an object key `sms:` or copy that says "SMS: …" is never a hit (a scheme is followed by an address, a number or `${`). Run on the RAW source: comment-stripping would also eat a
 * protocol-relative `//wa.me/…` inside a string.
 */
const SEND_LINK = /['"`]\s*(mailto:[^\s'"`]|sms:[+\d$]|tel:[+\d$])|\bwa\.me\/|api\.whatsapp\.com\//i;
const SEND_LINK_NAME = 'a send link';

function findings(source: string): string[] {
  const code = stripComments(source);
  const hits = SENDS.filter((s) => s.pattern.test(code)).map((s) => s.name);
  return SEND_LINK.test(source) ? [...hits, SEND_LINK_NAME] : hits;
}

/** Every `.ts` / `.tsx` file under `root`, through every subdirectory (review 2026-11-20: a flat listing missed nested files). */
function walk(root: string): string[] {
  return readdirSync(root, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f))
    .map((f) => join(root, f));
}

describe('Story 14.3 N1 — the breach register sends nothing', () => {
  const files = ROOTS.flatMap(walk);

  it('scans the API module, the domain and contracts breach modules and the admin pages — recursively', () => {
    const names = files.map((f) => f.split('/').slice(-2).join('/'));
    expect(names).toEqual(
      expect.arrayContaining([
        'data-protection/handlers.ts',
        'data-protection/routes.ts',
        'data-protection/index.ts',
        'breach/incidents.ts',
        'breach/rules.ts',
        'breach/drafts.ts',
        'breach/derive.ts',
        'breach-reporting/DraftsPanel.tsx',
        'breach-reporting/BreachDetailPage.tsx',
      ]),
    );
    // The SAME walker the fence uses reaches files two levels down: from `src/modules` it finds the module's files.
    const nested = walk(resolve(HERE, '../../src/modules')).map((f) => f.split('/').slice(-2).join('/'));
    expect(nested).toEqual(expect.arrayContaining(['data-protection/handlers.ts', 'data-protection/routes.ts']));
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
    expect(findings("import nodemailer from 'nodemailer';")).toContain('a mail / SMS / cloud client');
    expect(findings("import { SESClient } from '@aws-sdk/client-ses';")).toContain('a mail / SMS / cloud client');
    expect(findings("import twilio from 'twilio';")).toContain('a mail / SMS / cloud client');
    expect(findings("import ky from 'ky';")).toContain('a mail / SMS / cloud client');
    expect(findings("import { spawn } from 'node:child_process';")).toContain('a socket, a child process or an HTTP client module');
    expect(findings("import { connect } from 'net';")).toContain('a socket, a child process or an HTTP client module');
    expect(findings("import http2 from 'node:http2';")).toContain('a socket, a child process or an HTTP client module');
    expect(findings("import https from 'https';")).toContain('a socket, a child process or an HTTP client module');
    expect(findings("const nm = require('nodemailer');")).toContain('a mail / SMS / cloud client');
    expect(findings("const t = await import('twilio');")).toContain('a mail / SMS / cloud client');
    expect(findings("window.open('//wa.me/91999');")).toContain('a send link');
    expect(findings("window.open('https://api.whatsapp.com/send?phone=91');")).toContain('a send link');
    // ⛔ false positives: an object key, copy that names a channel, a string that happens to be a module name.
    expect(findings("const channels = { sms: true, tel: 'x' };")).toEqual([]);
    expect(findings("const copy = 'SMS: the helpline sends nothing';")).toEqual([]);
    expect(findings("const proto = 'tls'; const kind = 'net';")).toEqual([]);
    expect(findings('navigator.sendBeacon(url, body);')).toContain('an outbound request');
    expect(findings('<a href={`mailto:${to}`}>Send</a>')).toContain('a send link');
    expect(findings("window.open('https://wa.me/91999');")).toContain('a send link');
    expect(findings('// nothing here calls fetch( or dispatch( — people send the notice\nconst x = 1;')).toEqual([]);
    expect(findings("import { audit, breach } from '@twt/domain';")).toEqual([]);
  });
});
