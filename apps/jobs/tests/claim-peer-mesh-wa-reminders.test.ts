// The neighbours' WhatsApp REMINDER — the pure legs (Story 6.31, Task 5.4; AC4, AC8, AC9, AC10; WR9, WR10, WR12; I2). DB-free.
//   · AC8 / I2 — a SYMBOL fence (comments stripped — every export comes through the `@twt/channels` barrel, so a path fence cannot
//     tell modules apart) over the jobs module AND the domain module: ⛔ the alert path, ⛔ the SMS send; and the deps type has ⛔
//     field whose type is an SMS client (`expectTypeOf`);
//   · AC4 — "opted in" is ONE read: ⛔ `consentExists` / `isOptInActive` / `member_wa_opt_in` in either module;
//   · WR10 — the lease inequality: the send's timeout + the finalise's two bounds < the handoff margin (a live send can ⛔ be finished
//     `lease_lapsed` under it);
//   · WR12 — the hourly cron inside the send hours, the run limits well inside the hour, an EXPLICIT child expiry;
//   · AC9 — ONE `createWhatsappAppCache(` call in `apps/jobs/src`; the wiring exposes the cache; `resolveChannelSecret` is exported.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { SmsAppClient, WhatsappAppCache } from '@twt/channels';
import { claim as claimDomain, schema } from '@twt/domain';
import { QUEUE_NAMES } from '@twt/queue';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { CORRECTION_SEND_TIMEOUT_MS } from '../src/scheduler/claim-dlt-sms-send.js';
import { PEER_REQUEST_HANDOFF_LEASE_MARGIN_MS } from '../src/scheduler/claim-peer-mesh-requests.js';
import {
  PEER_MESH_WA_REMINDER_CHILD_EXPIRE_SECONDS,
  PEER_MESH_WA_REMINDER_SWEEP_BUDGET_MS,
  PEER_MESH_WA_REMINDER_SWEEP_CRON,
  PEER_MESH_WA_REMINDER_SWEEP_EXPIRE_SECONDS,
  type ClaimPeerMeshWaReminderDeps,
} from '../src/scheduler/claim-peer-mesh-wa-reminders.js';
import { resolveChannelSecret, type ContributionProviderWiring } from '../src/scheduler/contribution-providers.js';

const repo = (rel: string) => fileURLToPath(new URL(`../../../${rel}`, import.meta.url));
const read = (rel: string) => readFileSync(repo(rel), 'utf-8');

/** Strip `//` and block comments (string contents are kept — an alarm string naming a symbol would still count). */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

const MODULES = ['apps/jobs/src/scheduler/claim-peer-mesh-wa-reminders.ts', 'packages/domain/src/claim/peer-mesh-wa-reminder.ts'] as const;

describe('I2 / AC8 — ⛔ the alert path, ⛔ an SMS', () => {
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
  ];
  it.each(MODULES)('%s names ⛔ forbidden symbol (comments stripped)', (rel) => {
    const code = stripComments(read(rel));
    for (const symbol of FORBIDDEN) expect(new RegExp(`\\b${symbol}\\b`).test(code), `${rel} names ${symbol}`).toBe(false);
  });

  it('the fence bites: the same scan over 6.27c\'s sender finds the SMS symbols', () => {
    const code = stripComments(read('apps/jobs/src/scheduler/claim-peer-mesh-requests.ts'));
    expect(/\bsendClaimDltSms\b/.test(code)).toBe(true);
  });

  it('⭐ the reminder deps carry ⛔ SMS client — a type-level absence', () => {
    type SmsFields = { [K in keyof ClaimPeerMeshWaReminderDeps]-?: NonNullable<ClaimPeerMeshWaReminderDeps[K]> extends SmsAppClient ? K : never }[keyof ClaimPeerMeshWaReminderDeps];
    expectTypeOf<SmsFields>().toEqualTypeOf<never>();
    expectTypeOf<ClaimPeerMeshWaReminderDeps>().not.toHaveProperty('smsAppClient');
    expectTypeOf<ClaimPeerMeshWaReminderDeps>().not.toHaveProperty('smsPreflight');
    expectTypeOf<ClaimPeerMeshWaReminderDeps['whatsappAppCache']>().toEqualTypeOf<WhatsappAppCache>();
  });
  it('round-2 P6 — `locale_source` is recorded from the read; its type MUST move with 0171\'s CHECK (`IN (\'pariwar_default\')`)', () => {
    // A wider `PeerRequestLocale['source']` (row 6-35) FAILS here — otherwise it would 23514 at every begin; widen the CHECK in the
    // same row, then this leg.
    // 📌 FLIPPED 2026-10-23 (Story 6.35, AC3): row 6-35 widened it — and 0179 widened both CHECKs in the same row. The RESOLVER
    // returns two values (it never returns the reminder's fallback).
    expectTypeOf<claimDomain.PeerRequestLocale['source']>().toEqualTypeOf<'pariwar_default' | 'member_choice'>();
  });
  it('📌 Story 6.35 (AC3, `-385`) — the REMINDER\'s `locale_source` is three values, LOCKSTEP with 0179\'s reminders CHECK', () => {
    expectTypeOf<schema.PeerMeshWaReminderLocaleSource>().toEqualTypeOf<'pariwar_default' | 'member_choice' | 'pariwar_fallback'>();
    expect(schema.PEER_MESH_WA_REMINDER_LOCALE_SOURCES).toEqual(['pariwar_default', 'member_choice', 'pariwar_fallback']);
    expect(schema.PEER_MESH_LOCALE_SOURCES).toEqual(['pariwar_default', 'member_choice']);
  });
});

describe('AC4 — "opted in" is ONE read (`isPeerMeshWaReminderOptedIn`)', () => {
  it.each(MODULES)('%s reads ⛔ the opt-in or consent tables any other way (comments stripped)', (rel) => {
    const code = stripComments(read(rel));
    for (const symbol of ['consentExists', 'isOptInActive', 'member_wa_opt_in']) {
      expect(code.includes(symbol), `${rel} names ${symbol}`).toBe(false);
    }
  });
  it('the domain module calls the ONE read', () => {
    expect(stripComments(read(MODULES[1]))).toContain('isPeerMeshWaReminderOptedIn(');
  });
});

describe('WR10 — the lease inequality and the marker', () => {
  it('⭐ everything after the marker\'s lease sample < the handoff margin: its own bound, the send, the finalise\'s pooled-connection wait and its two bounds', () => {
    // Round-2 P3 / P10 — the marker samples the lease clock INSIDE its transaction (after the connection wait), so its OWN bound and
    // the finalise's connection wait (`createDb`'s 10 s `connectionTimeoutMillis`, packages/domain/src/db.ts) belong in the tail.
    const POOL_CONNECT_TIMEOUT_MS = 10_000;
    const tail =
      claimDomain.PEER_MESH_WA_REMINDER_MARKER_TIMEOUT_MS +
      CORRECTION_SEND_TIMEOUT_MS +
      POOL_CONNECT_TIMEOUT_MS +
      claimDomain.PEER_MESH_WA_REMINDER_FINALISE_LOCK_TIMEOUT_MS +
      claimDomain.PEER_MESH_WA_REMINDER_FINALISE_STATEMENT_TIMEOUT_MS;
    expect(tail).toBeLessThan(PEER_REQUEST_HANDOFF_LEASE_MARGIN_MS);
    expect(PEER_REQUEST_HANDOFF_LEASE_MARGIN_MS).toBeLessThan(claimDomain.CORRECTION_SEND_LEASE_MS);
  });
});

describe('WR12 — the sweep and the child', () => {
  it('the hourly cron runs 09:20 … 19:20 — every tick inside the 09:00–20:00 send hours', () => {
    expect(PEER_MESH_WA_REMINDER_SWEEP_CRON).toBe('20 9-19 * * *');
  });
  it('the run limits end a tick well inside the hour; the child has an EXPLICIT expiry above pg-boss\'s 900 s default', () => {
    expect(PEER_MESH_WA_REMINDER_SWEEP_BUDGET_MS).toBeLessThan(PEER_MESH_WA_REMINDER_SWEEP_EXPIRE_SECONDS * 1000);
    expect(PEER_MESH_WA_REMINDER_SWEEP_EXPIRE_SECONDS * 1000).toBeLessThan(60 * 60 * 1000);
    expect(PEER_MESH_WA_REMINDER_CHILD_EXPIRE_SECONDS).toBeGreaterThan(900);
  });
  it('the two queues are registered names', () => {
    expect(QUEUE_NAMES.CLAIM_PEER_MESH_WA_REMINDER_SWEEP).toBe('claim.peer_mesh_wa_reminder.sweep');
    expect(QUEUE_NAMES.CLAIM_PEER_MESH_WA_REMINDER_SEND).toBe('claim.peer_mesh_wa_reminder.send');
  });
});

describe('AC9 — ONE WhatsApp client cache', () => {
  function tsFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? tsFiles(p) : p.endsWith('.ts') ? [p] : [];
    });
  }
  it('exactly ONE `createWhatsappAppCache(` in apps/jobs/src; the wiring exposes it; boot passes it to the reminder', () => {
    const hits = tsFiles(repo('apps/jobs/src')).flatMap((f) => readFileSync(f, 'utf-8').match(/createWhatsappAppCache\(/g) ?? []);
    expect(hits).toHaveLength(1);
    expectTypeOf<ContributionProviderWiring['whatsappAppCache']>().toEqualTypeOf<WhatsappAppCache>();
    expect(read('apps/jobs/src/boot.ts')).toMatch(/registerClaimPeerMeshWaReminderWorkers\(boss, \{[\s\S]{0,200}whatsappAppCache: contributionProviders\.whatsappAppCache/);
  });
  it('`resolveChannelSecret` is exported', () => {
    expect(typeof resolveChannelSecret).toBe('function');
  });
});
