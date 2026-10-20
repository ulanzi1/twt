// The claimant's WhatsApp step — the pure legs and the fences (Story 6.37d, Task 9; AC5, AC8, AC11, AC12; I5; WS8, WS14). DB-free.
//   · I5 / AC12 — a SYMBOL fence MIRRORING 6.31's `describe('I2 / AC8')` (comments stripped — every export comes through a barrel,
//     so a path fence cannot tell modules apart) over this story's WhatsApp modules: ⛔ the alert path, ⛔ an SMS send, ⛔ the
//     fixture provider (it reports `accepted` for a message that never went — T2), ⛔ the ladder's OWN SMS path (which 6.31's list
//     does ⛔ name); and "the fence bites" over `claim-contact-ladder.ts` (T29 — why the WhatsApp code lives in a sibling);
//   · AC8 — the STOP recorder audits through `audit.withCompensatingAudit` ONLY (⛔ the raw writer — the access-wrapper gate does ⛔
//     scan `apps/jobs`);
//   · WS8 (ii) — the lease inequality (everything after the marker's lease sample < the handoff margin < the lease) and the child's
//     explicit expiry ≤ 10 min; the quarter-hourly cron; the two queue names;
//   · AC12 — the raw-SQL LIMITs are clamped BY HAND (`domain-invariants` scans Drizzle `.limit(` in `packages/domain/src` only);
//   · AC11 — the untouched paths: each fenced file's content is PINNED (a sha256) — a change to any of them fails here, by design.
//     Update a pin ONLY in a story that is allowed to change that file, and say so in its record.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { DEFAULT_POOL_CONNECTION_TIMEOUT_MS, claim as claimDomain } from '@twt/domain';
import { QUEUE_NAMES } from '@twt/queue';
import { describe, expect, it } from 'vitest';

import {
  CONTACT_LADDER_WA_CHILD_EXPIRE_SECONDS,
  CONTACT_LADDER_WA_SWEEP_CRON,
  CONTACT_LADDER_WA_SWEEP_EXPIRE_SECONDS,
  isUnsendableWhatsappValue,
} from '../src/scheduler/claim-contact-ladder-whatsapp.js';
import { CORRECTION_SWEEP_EXPIRE_SECONDS } from '../src/scheduler/claim-correction-reminders.js';
import { CORRECTION_SEND_TIMEOUT_MS } from '../src/scheduler/claim-dlt-sms-send.js';

const repo = (rel: string) => fileURLToPath(new URL(`../../../${rel}`, import.meta.url));
const read = (rel: string) => readFileSync(repo(rel), 'utf-8');

/** Strip `//` and block comments (string contents are kept — an alarm string naming a symbol would still count). */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

const MODULES = [
  'apps/jobs/src/scheduler/claim-contact-ladder-whatsapp.ts',
  'apps/jobs/src/scheduler/claim-contact-wa-templates.ts',
  'apps/jobs/src/claim-contact-wa-stop.ts',
  'packages/domain/src/claim/contact-ladder-whatsapp-record.ts',
  'packages/domain/src/claim/contact-ladder-whatsapp-delivery.ts',
] as const;

describe('I5 / AC12 — ⛔ the alert path, ⛔ an SMS, ⛔ the fixture (mirrors 6.31\'s `I2 / AC8`)', () => {
  const FORBIDDEN = [
    'dispatch',
    'runChannelCascade',
    'resolveWhatsappProviderDeps',
    'createContributionProviderResolver',
    'resolveApprovedTemplate',
    'AlertCategory',
    'pariwar_wa_templates',
    'sendClaimDltSms',
    'smsAppClient',
    'SmsAppClient',
    'PEER_MESH_REQUEST_SMS_TEMPLATES',
    'renderPeerMeshRequest',
    // Story 6.37d — the fixture provider and the ladder's OWN SMS path (6.31's list does ⛔ name them).
    'createFixtureWhatsappProvider',
    'sendClaimCorrectionSms',
    'CLAIM_CORRECTION_SMS_TEMPLATES',
    'createWhatsappAppCache',
  ];
  it.each(MODULES)('%s names ⛔ forbidden symbol (comments stripped)', (rel) => {
    const code = stripComments(read(rel));
    for (const symbol of FORBIDDEN) expect(new RegExp(`\\b${symbol}\\b`).test(code), `${rel} names ${symbol}`).toBe(false);
  });

  it('⭐ the fence bites: the same scan over the ladder\'s SMS module finds its OWN SMS path (T29 — why the WhatsApp code is a sibling)', () => {
    const code = stripComments(read('apps/jobs/src/scheduler/claim-contact-ladder.ts'));
    expect(/\bsendClaimCorrectionSms\b/.test(code)).toBe(true);
    expect(/\bCLAIM_CORRECTION_SMS_TEMPLATES\b/.test(code)).toBe(true);
  });

  it('the sender sends through the ONE cache\'s client and the shipped classifier', () => {
    const code = stripComments(read(MODULES[0]));
    expect(code).toContain('deps.whatsappAppCache.messagingFor(');
    expect(code).toContain('classifyDirectWaSendFailure(');
    expect(code).toContain('assertWhatsappBodyParams(');
  });
});

describe('AC8 — the STOP recorder audits through the compensating helper ONLY', () => {
  it('⭐ `audit.withCompensatingAudit` in the recorder; ⛔ `writeAuditEntry` (comments stripped)', () => {
    const code = stripComments(read('apps/jobs/src/claim-contact-wa-stop.ts'));
    expect(code).toContain('audit.withCompensatingAudit(');
    expect(/\bwriteAuditEntry\b/.test(code)).toBe(false);
  });
  it('the worker reaches the recorder (⛔ its own audit write for a claim stop)', () => {
    const code = stripComments(read('apps/jobs/src/wa-webhook-processor.ts'));
    expect(code).toContain('recordClaimContactWaStop(');
  });
});

describe('WS8 (ii) — the lease, the marker and the jobs', () => {
  it('⭐ everything after the marker\'s lease sample < the handoff margin < the lease (a live send can ⛔ be finished `lease_lapsed`)', () => {
    const POOL_CONNECT_TIMEOUT_MS = DEFAULT_POOL_CONNECTION_TIMEOUT_MS; // round 2 (P15) — the real default, ⛔ a copy
    const tail =
      claimDomain.CONTACT_LADDER_WA_MARKER_TIMEOUT_MS +
      CORRECTION_SEND_TIMEOUT_MS +
      POOL_CONNECT_TIMEOUT_MS +
      2 * claimDomain.CONTACT_LADDER_WA_FINALISE_TIMEOUT_MS;
    expect(tail).toBeLessThan(claimDomain.CONTACT_LADDER_WA_HANDOFF_MARGIN_MS);
    expect(claimDomain.CONTACT_LADDER_WA_HANDOFF_MARGIN_MS).toBeLessThan(claimDomain.CONTACT_LADDER_WA_LEASE_MS);
  });
  it('⭐ the lease is ≥ 45 min (above the ≈ 30-minute worst-case backoff of four retries from 60 s) and ⛔ 6.31\'s 10 min', () => {
    expect(claimDomain.CONTACT_LADDER_WA_LEASE_MS).toBeGreaterThanOrEqual(45 * 60 * 1000);
    expect(claimDomain.CONTACT_LADDER_WA_LEASE_MS).not.toBe(claimDomain.CORRECTION_SEND_LEASE_MS);
  });
  it('the child\'s expiry is EXPLICIT and ≤ 10 min (⛔ 6.31\'s 45); the sweep\'s inside its quarter hour and below the daily sweep\'s', () => {
    expect(CONTACT_LADDER_WA_CHILD_EXPIRE_SECONDS).toBeLessThanOrEqual(10 * 60);
    expect(CONTACT_LADDER_WA_SWEEP_EXPIRE_SECONDS).toBeLessThan(15 * 60);
    expect(CONTACT_LADDER_WA_SWEEP_EXPIRE_SECONDS).toBeLessThan(CORRECTION_SWEEP_EXPIRE_SECONDS);
  });
  it('the cron is quarter-hourly around the clock; the two queues are registered names', () => {
    expect(CONTACT_LADDER_WA_SWEEP_CRON).toBe('*/15 * * * *');
    expect(QUEUE_NAMES.CLAIM_CONTACT_LADDER_WA_SWEEP).toBe('claim.contact_ladder.wa_sweep');
    expect(QUEUE_NAMES.CLAIM_CONTACT_LADDER_WA_SEND).toBe('claim.contact_ladder.wa_send');
  });
  it('boot registers the step with THE one cache and the fail-loud secret resolver', () => {
    expect(read('apps/jobs/src/boot.ts')).toMatch(
      /registerContactLadderWhatsappWorkers\(boss, \{[\s\S]{0,300}whatsappAppCache: contributionProviders\.whatsappAppCache,[\s\S]{0,80}resolveSecret: resolveChannelSecret/,
    );
  });
});

describe('T27 — a body value Meta would refuse', () => {
  it.each([
    ['1800123456', false],
    ['1800 123 456', false],
    ['1800\n123456', true],
    ['1800\t123456', true],
    ['1800    123456', true],
  ])('%j ⇒ unsendable %s', (value, unsendable) => {
    expect(isUnsendableWhatsappValue(value)).toBe(unsendable);
  });
});

describe('AC12 — the raw-SQL LIMITs are clamped BY HAND', () => {
  it('the domain\'s cross-tenant reads clamp through `clampLimit` (the selection, the lapsed finisher)', () => {
    const code = stripComments(read('packages/domain/src/claim/contact-ladder-whatsapp-record.ts'));
    expect(code.match(/clampLimit\(/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(code).toMatch(/LIMIT \$4`/);
  });
  it('the jobs start scan clamps its page (≤ 1000)', () => {
    expect(stripComments(read('apps/jobs/src/scheduler/claim-contact-ladder-whatsapp.ts'))).toContain('Math.min(Math.max(1, CONTACT_LADDER_WA_START_PAGE), 1000)');
  });
});

describe('AC11 — nothing else moves (each fenced file PINNED)', () => {
  const PINS: readonly (readonly [string, string])[] = [
    ['packages/channels/src/dispatch.ts', '2b4843f022160c63ca57d1bd513f9dcf1e8a62a9498135cb54c7dc2a0a26fc2a'],
    ['packages/channels/src/cascade.ts', '15fe4f84c303eddcc8307c2f3a913a4f2078260356a52c0b0079653141f7a496'],
    ['packages/channels/src/composition/provider-composition.ts', 'f49834bbb596d385db4d3560a985346206b63b1bcd9ab53675485aac0b90f5a4'],
    ['apps/jobs/src/scheduler/contribution-notify.ts', '241bc2806c2e79443a9d560571839df9458a6db67288857962773c0b85690d9b'],
    ['apps/jobs/src/scheduler/claim-correction-sms-templates.ts', '0c9c9147554c3a4bebd7ce3e961be545940d7d8639b8ea973b3c5ac922e27030'],
    ['packages/channels/src/sms-dlt-registry.ts', '6df1b22813e239cda40c06f1bc324f3d7f6cb05615f1309e13224efa11c3d792'],
    ['packages/domain/src/claim/peer-mesh-wa-reminder.ts', 'cf1e8f1f0cec249e2ac66d8e6ae2f47a46794b998dd42a990d7254af0625aaef'],
    ['packages/channels/src/providers/whatsapp-direct-send-outcome.ts', 'e54f8e1df2195ca192c55f2936e27eb62075d6db8cca6954eb2583b92554e3a7'],
    ['packages/domain/src/wa-opt-in/write.ts', 'f8c1f0afa4cd030a3704a6538e7f0e61b03e36aac9ca6e57aebcb61194d3cca0'],
    ['packages/domain/src/wa-opt-in/read.ts', 'd99f4e24d883cde5155be3e699a490f3d5233b0e42fe1807b01894f55809f0ca'],
    ['packages/domain/src/schema/pariwar_wa_templates.ts', '61c4a6420d56260d7b094c9105a9cdebcd3b312168ebab050e265049c89773bd'],
  ];
  it.each(PINS)('%s is unchanged', (rel, sha) => {
    expect(createHash('sha256').update(readFileSync(repo(rel))).digest('hex')).toBe(sha);
  });

  it('the two reminders\' SMS words (their DLT registrations) are unchanged — `correction_sms.*` / `certificate_sms.*`', () => {
    const SMS_PINS: Readonly<Record<'en' | 'hi', Readonly<Record<string, string>>>> = {
      en: {
        'correction_sms.reminder':
          "Claim {reference}: the bank details on your family's claim need correcting. Please call the helpline on {helpline}, or the District Admin will contact you. Your claim is still open.",
        'certificate_sms.reminder':
          "Claim {reference}: your family's claim still needs a death certificate that clearly shows the date of death. Please send it in the app, or call the helpline on {helpline}. Your claim is still open.",
      },
      hi: {
        'correction_sms.reminder':
          'दावा {reference}: आपके परिवार के दावे के बैंक विवरण ठीक किए जाने हैं। कृपया हेल्पलाइन {helpline} पर कॉल करें, या ज़िला प्रशासक आपसे संपर्क करेंगे। आपका दावा अब भी खुला है।',
        'certificate_sms.reminder':
          'दावा {reference}: आपके परिवार के दावे के लिए ऐसा मृत्यु प्रमाणपत्र चाहिए जिसमें मृत्यु की तिथि स्पष्ट हो। कृपया ऐप से भेजें या हेल्पलाइन {helpline} पर कॉल करें। आपका दावा अब भी खुला है।',
      },
    };
    for (const locale of ['en', 'hi'] as const) {
      const json = JSON.parse(read(`packages/i18n/locales/${locale}/claim.json`)) as Record<string, string>;
      for (const [key, value] of Object.entries(SMS_PINS[locale])) expect(json[key], `${locale} ${key}`).toBe(value);
    }
  });
});
