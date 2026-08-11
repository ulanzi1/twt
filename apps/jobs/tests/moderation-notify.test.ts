// Moderation-notify worker registration tests — Story 10.10 code-review follow-up.
//
// Edge Case Hunter finding: the malformed-envelope guard checked `pariwarId` / `memberId` /
// `moderationActionId` but not `action`. A missing or unrecognized `action` slipped past the
// guard and made `NOTICE_KEYS[input.action]` resolve to `undefined` deep inside
// `buildModerationAlert`, throwing unguarded inside the bare `for (const job of jobs)` loop —
// aborting every OTHER job in that `boss.work` batch, not just the malformed one. This pins the
// widened guard (the `cycle-spawn.test.ts` "capture the registered handler, invoke it directly"
// pattern).

import { randomUUID } from 'node:crypto';

import { featureFlags } from '@twt/domain';
import type { QueueClient } from '@twt/queue';
import { QUEUE_NAMES } from '@twt/queue';
import { describe, expect, it, vi } from 'vitest';

import type { ContributionNotifyDeps } from '../src/scheduler/contribution-notify.js';
import {
  buildModerationAlert,
  TERMINATION_ACCESS_BLOCK_FLAG,
  deriveModerationAlertId,
  moderationReasonLabelKey,
  registerModerationNotifyWorker,
  resolveReasonLabel,
  type ModerationNotifyPayload,
  type ModerationNotifyWorkerDeps,
} from '../src/scheduler/moderation-notify.js';

function makeFakeQueueClient(): QueueClient {
  return {
    createQueue: vi.fn().mockResolvedValue(undefined),
    work: vi.fn().mockResolvedValue('sub-id'),
  } as unknown as QueueClient;
}

function makeDeps(): ModerationNotifyWorkerDeps {
  // The malformed-envelope path never reaches `deps.notify` — it is rejected by the guard before
  // any DB/crypto/fan-out dependency is touched, so an empty stub is sufficient here.
  return { notify: {} as ContributionNotifyDeps };
}

function validPayload(): ModerationNotifyPayload {
  return {
    moderationActionId: randomUUID(),
    memberId: randomUUID(),
    action: 'suspend',
    reasonCode: 'r14-forgery',
  };
}

async function capturedHandler(
  boss: QueueClient,
): Promise<(jobs: { id: string; data: unknown }[]) => Promise<unknown>> {
  await registerModerationNotifyWorker(boss, makeDeps());
  const call = (boss.work as unknown as ReturnType<typeof vi.fn>).mock.calls.find(
    (c: unknown[]) => c[0] === QUEUE_NAMES.MEMBER_MODERATION_NOTIFY,
  )!;
  return call[1] as (jobs: { id: string; data: unknown }[]) => Promise<unknown>;
}

describe('registerModerationNotifyWorker — the malformed-envelope guard (review fix)', () => {
  it('a missing `action` is rejected by the guard, logged, and does not throw', async () => {
    const boss = makeFakeQueueClient();
    const handler = await capturedHandler(boss);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { action, ...rest } = validPayload();
    void action;
    await expect(
      handler([{ id: 'job-1', data: { pariwarId: randomUUID(), payload: rest } }]),
    ).resolves.not.toThrow();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('malformed job envelope'),
      expect.any(String),
    );
    errorSpy.mockRestore();
  });

  it('an unrecognized `action` value is rejected by the guard, logged, and does not throw', async () => {
    const boss = makeFakeQueueClient();
    const handler = await capturedHandler(boss);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const bogus = { ...validPayload(), action: 'bogus-action' };
    await expect(
      handler([{ id: 'job-2', data: { pariwarId: randomUUID(), payload: bogus } }]),
    ).resolves.not.toThrow();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('malformed job envelope'),
      expect.any(String),
    );
    errorSpy.mockRestore();
  });

  it('a well-formed envelope is NOT rejected by the guard (it proceeds past it)', async () => {
    const boss = makeFakeQueueClient();
    const handler = await capturedHandler(boss);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    // No live DB/crypto deps are wired, so `runModerationNotify` itself will reject once it tries
    // to use them — the point of this test is only that the GUARD let it through, not that the
    // full dispatch succeeded (that is the live-DB integration spec's job).
    await handler([{ id: 'job-3', data: { pariwarId: randomUUID(), payload: validPayload() } }]).catch(
      () => undefined,
    );

    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringContaining('malformed job envelope'), expect.any(String));
    errorSpy.mockRestore();
  });
});

// ── The AC8 notice BODY — previously untested end to end (review follow-up) ──────────────────────
//
// `buildModerationAlert` / `deriveModerationAlertId` / the label resolver had ZERO tests: the
// hand-rolled UUIDv5 bit-twiddling, the pinned namespace, the catalog keys and the `Alert` shape
// could all have shipped wrong and the first symptom would have been members receiving notices
// whose body read `memberStatus.moderationReason.<slug>`, or alert ids colliding with another
// producer's.

const NOW = new Date('2026-08-03T09:00:00.000Z');

function alertFor(action: ModerationNotifyPayload['action'], reasonCode = 'r14-forgery') {
  return buildModerationAlert({
    moderationActionId: '9f1d3c7a-5b2e-4a68-9c31-0d4e6f8a2b15',
    pariwarId: '22222222-2222-4222-8222-222222222222',
    memberId: '11111111-1111-4111-8111-111111111111',
    action,
    reasonCode,
    locale: 'hi',
    now: NOW,
  });
}

describe('deriveModerationAlertId — deterministic, namespaced, RFC-shaped', () => {
  it('is a pure function of the moderation action id (redelivery-safe)', () => {
    const a = deriveModerationAlertId('9f1d3c7a-5b2e-4a68-9c31-0d4e6f8a2b15');
    const b = deriveModerationAlertId('9f1d3c7a-5b2e-4a68-9c31-0d4e6f8a2b15');
    expect(a).toBe(b);
    // At-least-once redelivery MUST reuse the id, or a retried job creates a second alert.
    expect(deriveModerationAlertId('0e5a1b2c-3d4e-4f60-8a71-92b3c4d5e6f7')).not.toBe(a);
  });

  it('is a well-formed v5 UUID — the version and variant nibbles are actually set', () => {
    const id = deriveModerationAlertId('9f1d3c7a-5b2e-4a68-9c31-0d4e6f8a2b15');
    // This is what a bit-order slip in the hand-rolled uuidV5 would break, silently.
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('resolveReasonLabel — degrades, never throws (review fix)', () => {
  it('resolves a catalogued code to its member-facing label, not the raw slug', () => {
    const label = resolveReasonLabel('r14-forgery', 'hi');
    expect(label).not.toBe(moderationReasonLabelKey('r14-forgery'));
    expect(label).not.toContain('memberStatus.');
    expect(label.length).toBeGreaterThan(0);
  });

  it('an UNCATALOGUED code falls back instead of throwing', () => {
    // `t()` THROWS on an unknown key (it never returns the key), which is why the previous
    // `resolved === key` comparison was unreachable dead code — and why the throw escaped into the
    // batch loop and took every other member's notice down with it.
    expect(() => resolveReasonLabel('a-code-shipped-ahead-of-its-copy', 'hi')).not.toThrow();
    const label = resolveReasonLabel('a-code-shipped-ahead-of-its-copy', 'hi');
    expect(label).not.toContain('a-code-shipped-ahead-of-its-copy');
    expect(label).not.toContain('memberStatus.');
  });
});

describe('buildModerationAlert — the member-facing notice (AC8)', () => {
  it('builds a schema-valid alert_published notice for every action', () => {
    for (const action of ['suspend', 'terminate', 'restore'] as const) {
      const alert = alertFor(action);
      expect(alert.alert_category).toBe('alert_published');
      // Decision 7: NO 10th AlertCategory was minted (that would redefine FR-71's 7 push
      // categories, which Story 5.2 froze in terms).
      expect(alert.member_id).toBe('11111111-1111-4111-8111-111111111111');
      expect(alert.created_at).toBe(NOW.toISOString());
      expect(alert.created_by_actor).toBe('system');
    }
  });

  it('is NOT time-critical — UX Stance #5 forbids countdown pressure', () => {
    for (const action of ['suspend', 'terminate', 'restore'] as const) {
      expect(alertFor(action).time_critical).toBe(false);
    }
  });

  it('renders real prose — never a raw i18n key, never a raw reason slug', () => {
    for (const action of ['suspend', 'terminate', 'restore'] as const) {
      const { title, body } = alertFor(action).payload_data as { title: string; body: string };
      for (const text of [title, body]) {
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toContain('memberStatus.');
        expect(text).not.toContain('{reason}');
        // The governance CODE is machine vocabulary; the member gets the LABEL.
        expect(text).not.toContain('r14-forgery');
      }
    }
  });

  it('carries NO rationale, NO reason code and NO actor — the payload is a plaintext push body', () => {
    const serialized = JSON.stringify(alertFor('suspend'));
    expect(serialized).not.toContain('r14-forgery');
    expect(serialized).not.toContain('rationale');
    expect(serialized).not.toContain('actor_display');
  });

  it('an uncatalogued reason code still produces a sendable notice', () => {
    // The whole point of the fallback: a registry code shipped ahead of its copy must degrade to a
    // notice without a named reason, NOT abort the member's notification.
    const alert = alertFor('suspend', 'a-code-shipped-ahead-of-its-copy');
    const { title, body } = alert.payload_data as { title: string; body: string };
    expect(title.length).toBeGreaterThan(0);
    expect(body).not.toContain('a-code-shipped-ahead-of-its-copy');
  });

  it('distinguishes the three actions — a termination does not read as a suspension', () => {
    const bodies = (['suspend', 'terminate', 'restore'] as const).map(
      (a) => (alertFor(a).payload_data as { body: string }).body,
    );
    expect(new Set(bodies).size).toBe(3);
  });
});

// ── Story 10.19 AC8 — the notice tells the truth in BOTH flag states ─────────────────────────────
//
// The termination body is selected by whether authenticated access has ACTUALLY ended. Under the
// Panel's Q6 (b-i) ruling the `termination_access_block` flag ships DEFAULT OFF and its flip is
// gated on Story 10.21, so a terminated member CAN still sign in today — and a notice that said
// otherwise would be false for every termination between now and the flip.

function terminateBody(accessEnded: boolean | undefined, locale: 'en' | 'hi' = 'en'): string {
  const alert = buildModerationAlert({
    moderationActionId: '9f1d3c7a-5b2e-4a68-9c31-0d4e6f8a2b15',
    pariwarId: '22222222-2222-4222-8222-222222222222',
    memberId: '11111111-1111-4111-8111-111111111111',
    action: 'terminate',
    reasonCode: 'r14-forgery',
    locale,
    now: NOW,
    ...(accessEnded === undefined ? {} : { accessEnded }),
  });
  return (alert.payload_data as { body: string }).body;
}

describe('buildModerationAlert — the termination body tracks the flag (Story 10.19, AC8)', () => {
  it('⛔ access ENDED: the body does NOT promise sign-in, and names an administrative channel', () => {
    for (const locale of ['en', 'hi'] as const) {
      const body = terminateBody(true, locale);
      // The AC8 strip, asserted by MEANING rather than by an exact string so a tone-guide reword
      // does not fail the test while a reintroduced promise would.
      expect(body).not.toMatch(/sign in as usual|साइन इन कर सकते/);
      // …and it still tells the member where to go, since Q3 ruled the notice in-app-only and this
      // is the only explanation they receive.
      expect(body).toMatch(/helpline|हेल्पलाइन/);
    }
  });

  it('⚠ access RETAINED (the shipped default): the body DOES say they can still sign in', () => {
    // Not a courtesy assertion. Until the Panel authorises the flip, this sentence is TRUE, and a
    // notice that dropped it would be the copy-truth defect this story exists to close — inverted.
    for (const locale of ['en', 'hi'] as const) {
      const body = terminateBody(false, locale);
      expect(body).toMatch(/sign in as usual|साइन इन कर सकते/);
    }
  });

  it('⛔ an ABSENT signal degrades to "access retained" — never to telling a member they are locked out', () => {
    // Matches the flag's own fail-open posture. A notice is delivered once and cannot be recalled,
    // so the degraded answer must be the one that stays true under the shipped default.
    expect(terminateBody(undefined)).toBe(terminateBody(false));
  });

  it('the two bodies are genuinely different copy, and suspend/restore are untouched by the flag', () => {
    expect(terminateBody(true)).not.toBe(terminateBody(false));
    // AC8: the suspended and restored bodies are unchanged under every flag state — suspension
    // never loses portal access, so nothing about them depends on this flag.
    for (const action of ['suspend', 'restore'] as const) {
      const withFlag = buildModerationAlert({
        moderationActionId: '9f1d3c7a-5b2e-4a68-9c31-0d4e6f8a2b15',
        pariwarId: '22222222-2222-4222-8222-222222222222',
        memberId: '11111111-1111-4111-8111-111111111111',
        action,
        reasonCode: 'r14-forgery',
        // ⚠ `hi`, to match `alertFor`'s locale — comparing across locales would fail for the
        // trivial reason that the two catalogs differ, and would say nothing about the flag.
        locale: 'hi',
        now: NOW,
        accessEnded: true,
      });
      expect((withFlag.payload_data as { body: string }).body).toBe(
        (alertFor(action).payload_data as { body: string }).body,
      );
    }
  });

  it('⛔ the flag key this module names is a REGISTERED flag — a typo would silently revert the copy', () => {
    // The key is declared locally because `apps/jobs` must not import from `apps/api`. An
    // unregistered key resolves to the code default (`off`), so a typo would quietly send every
    // terminated member the "you can sign in" wording forever, with nothing failing.
    expect(featureFlags.isRegisteredFlag(TERMINATION_ACCESS_BLOCK_FLAG)).toBe(true);
  });
});
