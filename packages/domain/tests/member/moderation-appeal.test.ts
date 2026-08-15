// Story 10.22 (AC4, AC5, AC6) — the moderation appeal's PURE rules, and the two invariants that keep
// it a RECORD rather than a second moderation write path.
//
// Niyamavali §8.8, ratified by Decision `2026-08-15-121`.
//
// The invariance suites here are the load-bearing ones. Everything else in this story could be
// rebuilt from the spec; these two pins are what stop a later edit from silently turning an appeal
// into a moderation act.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  APPEALABLE_MODERATION_STATUSES,
  directsRestore,
  initialAppealStatus,
  isAdjudicatorExcluded,
  isAppealableStatus,
} from '../../src/member/moderation/appeal.js';
import {
  APPEAL_FILED_VIA,
  APPEAL_OUTCOMES,
  APPEAL_STATUSES,
} from '../../src/member/moderation/appeal-vocabulary.js';
import {
  ModerationAppealDecidedPayloadSchema,
  ModerationAppealFiledPayloadSchema,
} from '../../src/member/moderation/events.js';
import {
  NO_MODERATION,
  evaluateModerationOverlay,
  type ModerationOverlayEventInput,
} from '../../src/member/moderation/overlay.js';
import {
  MODERATION_ACTIONS,
  MODERATION_EVENT_TYPES,
  MODERATION_STATUSES,
  moderationActionForEventType,
} from '../../src/member/moderation/status.js';
import {
  MEMBER_LIFECYCLE_STATES,
  memberStateMachine,
  type MemberLifecycleState,
} from '../../src/member/state.js';

const T0 = new Date('2026-01-01T00:00:00.000Z');
const T1 = new Date('2026-02-01T00:00:00.000Z');
const T2 = new Date('2026-03-01T00:00:00.000Z');
const T3 = new Date('2026-04-01T00:00:00.000Z');

function ev(type: string, occurredAt: Date, payload: unknown = {}): ModerationOverlayEventInput {
  return { type, occurredAt, payload: payload as Record<string, unknown> };
}

const suspended = (at: Date, code = 'r7-contribution-discipline') =>
  ev('member.moderation.suspended', at, { reason_code: code });
const terminated = (at: Date, code = 'r14-forgery') =>
  ev('member.moderation.terminated', at, { reason_code: code });
const appealFiled = (at: Date) =>
  ev('member.moderation.appeal-filed', at, {
    filed_via: 'portal',
    appeal_id: '11111111-1111-4111-8111-111111111111',
    moderation_action_id: '22222222-2222-4222-8222-222222222222',
  });
const appealDecided = (at: Date, outcome: 'upheld' | 'allowed') =>
  ev('member.moderation.appeal-decided', at, {
    outcome,
    appeal_id: '11111111-1111-4111-8111-111111111111',
    moderation_action_id: '22222222-2222-4222-8222-222222222222',
  });

describe('§8.8 eligibility — WHO may appeal', () => {
  it('both suspension AND termination are appealable (Decision clause 4)', () => {
    expect(isAppealableStatus('suspended')).toBe(true);
    expect(isAppealableStatus('terminated')).toBe(true);
  });

  it('an unmoderated member has no act to appeal against', () => {
    expect(isAppealableStatus('none')).toBe(false);
  });

  it('the appealable set is exactly the two sanctions — never `none`', () => {
    expect([...APPEALABLE_MODERATION_STATUSES].sort()).toEqual(['suspended', 'terminated']);
  });

  it('every appealable status is a real ModerationStatus (no drift between the two tuples)', () => {
    for (const s of APPEALABLE_MODERATION_STATUSES) {
      expect(MODERATION_STATUSES).toContain(s);
    }
  });
});

describe('§8.8 outcomes — TWO, and what `allowed` does', () => {
  it('there are exactly two outcomes; ⛔ no third `varied`', () => {
    expect([...APPEAL_OUTCOMES]).toEqual(['upheld', 'allowed']);
    expect(APPEAL_OUTCOMES).not.toContain('varied');
  });

  it('`allowed` DIRECTS a restore; `upheld` directs nothing', () => {
    expect(directsRestore('allowed')).toBe(true);
    expect(directsRestore('upheld')).toBe(false);
  });

  it('a filing always starts `open`, and there are exactly two statuses', () => {
    expect(initialAppealStatus()).toBe('open');
    expect([...APPEAL_STATUSES]).toEqual(['open', 'decided']);
  });

  it('the two ruled intake surfaces, and only those two', () => {
    expect([...APPEAL_FILED_VIA]).toEqual(['portal', 'helpline']);
  });
});

describe('§8.8 the DIFFERENT-INDIVIDUAL predicate — a POLARITY PAIR, never one-sided', () => {
  const ORIGINAL_ACTOR = 'aaaaaaaa-0000-4000-8000-000000000001';
  const GROUND_AUTHOR = 'aaaaaaaa-0000-4000-8000-000000000002';
  const SECOND_PANEL_MEMBER = 'bbbbbbbb-0000-4000-8000-000000000003';
  const exclusionSet = new Set([ORIGINAL_ACTOR, GROUND_AUTHOR]);

  it('REFUSES the authority who imposed the act', () => {
    expect(isAdjudicatorExcluded(ORIGINAL_ACTOR, exclusionSet)).toBe(true);
  });

  it('REFUSES someone who contributed a ground the act rests on', () => {
    // A supporting ground IS participation in the decision — the D-D reasoning that pulled R9 voters
    // into the claim-side exclusion set, applied here.
    expect(isAdjudicatorExcluded(GROUND_AUTHOR, exclusionSet)).toBe(true);
  });

  it('ACCEPTS a Panel member who took no part — ⛔ the arm that keeps this from passing vacuously', () => {
    expect(isAdjudicatorExcluded(SECOND_PANEL_MEMBER, exclusionSet)).toBe(false);
  });

  it('an EMPTY exclusion set accepts everyone — so a set that failed to load fails OPEN', () => {
    // Pinned deliberately, because it is the reason `getAppealExclusionActorIds` is tenant-scoped on
    // BOTH reads: an unscoped read under RLS returns zero rows, which would silently admit the
    // original decider. The predicate cannot defend against a set that was never populated.
    expect(isAdjudicatorExcluded(ORIGINAL_ACTOR, new Set())).toBe(false);
  });
});

describe('⭐ AC4 — the two appeal events do NOT move the moderation overlay', () => {
  it('neither appeal type is an ACTION-bearing moderation event', () => {
    expect(moderationActionForEventType('member.moderation.appeal-filed')).toBeNull();
    expect(moderationActionForEventType('member.moderation.appeal-decided')).toBeNull();
    expect(MODERATION_EVENT_TYPES).not.toContain('member.moderation.appeal-filed');
    expect(MODERATION_EVENT_TYPES).not.toContain('member.moderation.appeal-decided');
  });

  it('folding a stream WITH both appeal events is byte-identical to folding it WITHOUT them', () => {
    const withoutAppeal = [suspended(T0), terminated(T2)];
    const withAppeal = [suspended(T0), appealFiled(T1), terminated(T2), appealDecided(T3, 'upheld')];

    const a = evaluateModerationOverlay(withoutAppeal);
    const b = evaluateModerationOverlay(withAppeal);

    expect(b).toEqual(a);
    expect(b.status).toBe(a.status);
    expect(b.reasonCode).toBe(a.reasonCode);
    expect(b.since).toEqual(a.since);
    expect(b.lastActionAt).toEqual(a.lastActionAt);
  });

  it('⛔ an `allowed` outcome moves NOTHING — the load-bearing arm (AC6)', () => {
    // §8.8: an allowed appeal DIRECTS that the act be undone; it does not undo it. If this ever goes
    // red, the appeal has become a second moderation write path bypassing §8.6's record, the dwell,
    // and `member.restore_terminated`'s Panel exclusivity.
    const before = evaluateModerationOverlay([suspended(T0), terminated(T1)]);
    const after = evaluateModerationOverlay([
      suspended(T0),
      terminated(T1),
      appealFiled(T2),
      appealDecided(T3, 'allowed'),
    ]);
    expect(after).toEqual(before);
    expect(after.status).toBe('terminated');
  });

  it('a stream of appeal events ALONE leaves the member unmoderated', () => {
    expect(evaluateModerationOverlay([appealFiled(T0), appealDecided(T1, 'allowed')])).toEqual(
      NO_MODERATION,
    );
  });

  it('both types are lifecycle IDENTITY through memberStateMachine — `from_state === to_state`', () => {
    // The Decision-1 pin, extended to this story's two events. If it ever fails, an appeal has
    // started moving `members.state` — five TERMINAL_STATES sets, the news audience filter,
    // peer-mesh selection, every seeded niyamavali `member_state_in` clause and the renewal grace
    // clock would silently mis-classify, with ZERO compile errors to warn anyone.
    for (const state of MEMBER_LIFECYCLE_STATES as readonly MemberLifecycleState[]) {
      for (const type of [
        'member.moderation.appeal-filed',
        'member.moderation.appeal-decided',
      ] as const) {
        const next = memberStateMachine.step(state, {
          type,
          payload: {
            outcome: 'allowed',
            appeal_id: '11111111-1111-4111-8111-111111111111',
            moderation_action_id: '22222222-2222-4222-8222-222222222222',
          },
        });
        expect(next, `${type} from ${state}`).toBe(state);
      }
    }
  });
});

describe('⭐ AC4 — the payloads carry bounded tokens ONLY (R1)', () => {
  const auditBase = {
    from_state: 'active',
    to_state: 'active',
    trigger: 'member_moderation.appeal_filed',
    actor: 'member',
  } as const;

  it('`appeal-filed` accepts the bounded shape', () => {
    expect(
      ModerationAppealFiledPayloadSchema.safeParse({
        ...auditBase,
        filed_via: 'helpline',
        appeal_id: '11111111-1111-4111-8111-111111111111',
        moderation_action_id: '22222222-2222-4222-8222-222222222222',
      }).success,
    ).toBe(true);
  });

  it('⛔ `appeal-filed` REJECTS a grounds field — `.strict()` is the enforcement', () => {
    const r = ModerationAppealFiledPayloadSchema.safeParse({
      ...auditBase,
      filed_via: 'portal',
      appeal_id: '11111111-1111-4111-8111-111111111111',
      moderation_action_id: '22222222-2222-4222-8222-222222222222',
      grounds: 'I did not do it',
    });
    expect(r.success).toBe(false);
  });

  it('⛔ `appeal-decided` REJECTS outcome prose and an adjudicator display name', () => {
    for (const extra of [
      { reasoned_outcome: 'the panel finds…' },
      { decided_by_display: 'A. Trustee' },
      { member_name: 'Ravi' },
    ]) {
      const r = ModerationAppealDecidedPayloadSchema.safeParse({
        ...auditBase,
        trigger: 'member_moderation.appeal_decided',
        actor: 'trustee',
        outcome: 'allowed',
        appeal_id: '11111111-1111-4111-8111-111111111111',
        moderation_action_id: '22222222-2222-4222-8222-222222222222',
        ...extra,
      });
      expect(r.success).toBe(false);
    }
  });

  it('⛔ NEITHER payload accepts an overlay from/to pair (the omission is the point)', () => {
    for (const schema of [
      ModerationAppealFiledPayloadSchema,
      ModerationAppealDecidedPayloadSchema,
    ]) {
      const r = schema.safeParse({
        ...auditBase,
        filed_via: 'portal',
        outcome: 'upheld',
        appeal_id: '11111111-1111-4111-8111-111111111111',
        moderation_action_id: '22222222-2222-4222-8222-222222222222',
        moderation_from: 'suspended',
        moderation_to: 'none',
      });
      expect(r.success).toBe(false);
    }
  });

  it('`outcome` is bounded — no `varied` reaches the timeline', () => {
    expect(
      ModerationAppealDecidedPayloadSchema.safeParse({
        ...auditBase,
        trigger: 'member_moderation.appeal_decided',
        actor: 'trustee',
        outcome: 'varied',
        appeal_id: '11111111-1111-4111-8111-111111111111',
        moderation_action_id: '22222222-2222-4222-8222-222222222222',
      }).success,
    ).toBe(false);
  });
});

describe('⛔ AC4/AC6 — the overlay vocabulary is UNTOUCHED by this story', () => {
  it('there is no fourth ModerationAction', () => {
    expect([...MODERATION_ACTIONS].sort()).toEqual(['restore', 'suspend', 'terminate']);
  });

  it('there is no fourth ModerationStatus', () => {
    expect([...MODERATION_STATUSES].sort()).toEqual(['none', 'suspended', 'terminated']);
  });

  it('MODERATION_EVENT_TYPES is still the ACTION-bearing three', () => {
    expect([...MODERATION_EVENT_TYPES].sort()).toEqual([
      'member.moderation.restored',
      'member.moderation.suspended',
      'member.moderation.terminated',
    ]);
  });
});

describe('⛔ the moderation appeal imports NOTHING from Epic 6’s claim appeal', () => {
  // `epics.md:4071`: "the moderation appeal is a DISTINCT journey — Epic 6's machinery is a pattern
  // reference, not a reusable path." §8.8 states expressly that it does not incorporate Part 9.
  // A source-level assertion, because a type error would not catch a runtime-only import and a
  // reviewer's eye is not a gate.
  const APPEAL_DIR = join(__dirname, '../../src/member/moderation');

  it('no appeal*.ts module references claim/appeal', () => {
    const files = readdirSync(APPEAL_DIR).filter((f) => f.startsWith('appeal') && f.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const src = readFileSync(join(APPEAL_DIR, f), 'utf8');
      const importLines = src
        .split('\n')
        .filter((l) => /^\s*import\s/.test(l) || /\bfrom\s+['"]/.test(l));
      for (const line of importLines) {
        expect(line).not.toMatch(/claim\/appeal/);
        expect(line).not.toMatch(/appeal-eligibility/);
        expect(line).not.toMatch(/claim_appeals/);
      }
    }
  });

  it('no appeal*.ts module imports Epic 6’s `AppealId` brand', () => {
    const files = readdirSync(APPEAL_DIR).filter((f) => f.startsWith('appeal') && f.endsWith('.ts'));
    for (const f of files) {
      const src = readFileSync(join(APPEAL_DIR, f), 'utf8');
      // `MemberModerationAppealId` is fine; a bare `AppealId` import is not.
      expect(src).not.toMatch(/[^a-zA-Z]AppealId\b(?!\s*=)/);
    }
  });
});
