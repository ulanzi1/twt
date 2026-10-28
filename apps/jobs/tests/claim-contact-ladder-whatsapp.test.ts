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
    // 2026-10-23 Story 5.11 (Decisions 2026-10-23-389 FS3 / FS10 / FS14 / FS15, -390 Q1 B): THREE pins re-taken — the alert fan-out's
    // SMS rung decides lit / eligible itself and ⛔ dispatches (`contribution-notify.ts`); an ENABLED Pariwar that cannot send a
    // category gets a refusing WhatsApp provider in the FAN-OUT resolver (`provider-composition.ts` — `resolveWhatsappProvider`,
    // the shared selection, is unchanged); a dated header note (`sms-dlt-registry.ts`, entries unchanged). The claimant's
    // WhatsApp step (this story's subject) imports none of them and is untouched. The rest of the fence stands.
    // 2026-10-23 review round 2 (P6): a doc-only note on the memo's off → on direction and the FS3 exception to the 5-state rule.
    // 2026-10-25 Story 5.11b (Decision 2026-10-25-404 FS20 (a)): the fan-out resolver's memo keeps a WhatsApp `off` only 60 s (the
    // off → on direction above, CLOSED) — `resolveFanOutWhatsappProvider`'s answer and `resolveWhatsappProvider` are unchanged.
    // The claimant's WhatsApp step imports neither path. Only this pin and the next re-taken; `dispatch.ts` / `cascade.ts` stand.
    ['packages/channels/src/composition/provider-composition.ts', '63dd17275477fd27fa369d4b51faeeebab7f2a842f1cee5ce1147ea6854c89c8'],
    // 2026-10-23 review R1 / R3 / R4, BigDev option 1: preserve prior alert retries and share the
    // PII-free outcome serializer; the claimant's separate WhatsApp ladder imports neither. Round 2 (P3, P9): the SMS rung's
    // DELIBERATE lifecycle-boundary note; the patch review (Q4): `serializeFanOutResult` takes a real record; the last fix
    // diff (F5): `shouldRetryFanOut`'s JSDoc no longer says "redelivery".
    // 2026-10-25 Story 5.11b (Decision 2026-10-25-404 FS9 (a), FS18 (a), FS19): the SMS rung calls the INJECTED real send (through
    // `dispatch`), `suppression` reaches every rung, the real send's retry classes and recorded details; the predicate and
    // `alertSmsBlock` are byte-unchanged (AST-pinned in `alert-sms-send.test.ts`). The claimant's WhatsApp ladder imports none of it.
    // 2026-10-25 Story 5.11b CODE REVIEW (patch-diff review, Auditor #1): COMMENT-ONLY edits to the file (the suppression hook is "WIRED, not
    // yet enforced — boot injects NO hook"; the matched code is byte-identical) — only this pin re-taken, again. The claimant's WhatsApp
    // ladder imports none of it.
    // 2026-10-28 Story 5.8b (Decision 2026-10-28-415 FS3 (a), FS3.1 (a), FS7 (a), FS9 (a), FS17 (a)): the degraded-mode bridge is LIT —
    // a bridged cycle-open is texted FIRST through the injected seam (the ladder as the fallback), the Super Admin switch is read
    // at the bridge attempt, `alertSmsBlock` gains the time-critical `alert_published` case (re-pinned in `alert-sms-send.test.ts`),
    // `sms_bridge_not_lit` is retired and `shouldRetryFanOut`'s bridged arm removed. The claimant's WhatsApp ladder imports none of
    // it — only this pin re-taken; the rest of the fence stands.
    // 2026-10-28 Story 5.8b code review (P2-1): re-taken AGAIN (was `3e72bd5c…`) — ANY ladder delivery of a bridged alert closes a
    // `deferred` bridge row (⛔ only after this attempt's rate-limited text), and a failed closure is reported (`bridgeRowOpen`, also
    // in the recorded form). The claimant's WhatsApp ladder imports none of it; the rest of the fence stands.
    ['apps/jobs/src/scheduler/contribution-notify.ts', '5682a2e78113e41d9565f85c6ea5eb3d693af65af7f33ae22d4419b94d64f64f'],
    ['apps/jobs/src/scheduler/claim-correction-sms-templates.ts', '0c9c9147554c3a4bebd7ce3e961be545940d7d8639b8ea973b3c5ac922e27030'],
    ['packages/channels/src/sms-dlt-registry.ts', '3bf86f9b9350602d9d7484b6976a748de42bcd4a9424f9bd3842f7cda66daee5'],
    // 2026-10-23 Story 6.35 (Decision 2026-10-23-387 LS9 / LS10 (b′); `-385`): the reminder's begin resolves the language per
    // RECIPIENT (`templates` in, `waiting_template` / `pariwar_fallback` out) and its sweep listing carries the language codes —
    // only this pin re-taken; the claimant's WhatsApp step (this story's subject) is untouched. The rest of the fence stands.
    // 2026-10-23 Story 6.36d (Decision 2026-10-23-386 ND4 / AC6): the same begin also takes the deceased's `nomineeMobileIndexes` (WR2 (ix)'s
    // re-check carries the nominee conjunct) — only this pin re-taken, a second time on top of 6.35's; the claimant's WhatsApp step is
    // untouched. The rest of the fence stands.
    // 2026-10-24 Story 6.36e (Decision 2026-10-24-397 NE7 / AC6): the same begin's `nomineeMobileIndexes` becomes `nomineeMatch`
    // (the nominee indexes AND the members the deceased marked) — a rename of the input and its type import, ⛔ a behaviour change
    // to this file; only this pin re-taken, a third time. The claimant's WhatsApp step is untouched. The rest of the fence stands.
    ['packages/domain/src/claim/peer-mesh-wa-reminder.ts', '85bbb2bb59613c38998e3b22505fb943fcef589e9de98d8407339b4dcc1aa7db'],
    ['packages/channels/src/providers/whatsapp-direct-send-outcome.ts', 'e54f8e1df2195ca192c55f2936e27eb62075d6db8cca6954eb2583b92554e3a7'],
    // 2026-10-21 Story 5.12 — `-364` (a yes lasts until withdrawn; every withdrawal ends every yes): these TWO pins re-taken
    // (endEveryWaYes and the state reads added; isOptInActive's clock and the ACTIVE → EXPIRED edge removed). The rest of the
    // fence stands.
    // 2026-10-21 Story 5.12 review F1: member lock shared by mint/activation/withdrawal; only write.ts re-pinned.
    // 2026-10-21 Story 5.13 (WC5, Decision 2026-10-21-376): `ActivateOptInInput.windowExpiresAt` widened to `Date | null` (a
    // code-confirmed yes opens ⛔ customer-service window) + its JSDoc; only write.ts re-pinned — the rest of the fence stands.
    ['packages/domain/src/wa-opt-in/write.ts', '01a6a06a066b3f9035ae2fa384a4374ab7cf6c185915cb59c77abe9cd71ba697'],
    ['packages/domain/src/wa-opt-in/read.ts', 'a9c6a82d6de5f4201a7b5c61101628cfd96f6399e917b831ef93e078531ca149'],
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
