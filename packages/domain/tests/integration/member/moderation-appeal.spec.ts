// The Niyamavali §8.8 moderation appeal, on the live DB — Story 10.22 (AC4, AC5, AC6, AC9). :5433
//
// Ratified by Decision `2026-08-15-121`.
//
// What can only be proved here, and not in the pure suite:
//   · AC4 — the PARTIAL unique index is the truth, not the app guard: a second OPEN appeal against
//           the same act raises 23505, and re-filing after a determination SUCCEEDS. Both arms, or
//           the "partial" half of "partial unique index" is untested;
//   · AC4 — the append-only GRANT posture: the filing columns have NO update privilege at all, so a
//           recorded filing is immutable by ATTRIBUTE, not by convention;
//   · AC4 — the decision-coherence CHECK, and the helpline⇒ticket CHECK, by NAME (see
//           `violatedConstraint` — asserting the constraint name is what makes these revert-sanity
//           teeth: drop the CHECK and the write SUCCEEDS, so the assertion fails rather than passing
//           on some unrelated error);
//   · AC5 — the exclusion set as a POLARITY PAIR against real rows: the original actor is refused,
//           a ground author is refused, and a second Panel member is ACCEPTED. A one-sided assertion
//           passes vacuously;
//   · AC6 — deciding `allowed` leaves `getCurrentMemberModerationOverlay` UNCHANGED and emits no
//           `member.moderation.restored` event;
//   · AC9 — the RTBF sentinel replaces BOTH Tier-1 columns and the ROW SURVIVES.

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import {
  memberId as toMemberId,
  memberModerationAppealId as toAppealId,
  moderationActionId as toActionId,
  pariwarId as toPariwarId,
} from '../../../src/ids/index.js';
import {
  decideMemberModerationAppeal,
  fileMemberModerationAppeal,
} from '../../../src/member/moderation/appeal-persist.js';
import {
  getAppealExclusionActorIds,
  listAppealsForMember,
  listOpenAppealsForPariwar,
} from '../../../src/member/moderation/appeal-read.js';
import { getCurrentMemberModerationOverlay } from '../../../src/member/moderation/overlay.js';
import { eventsLog } from '../../../src/schema/events_log.js';
import { memberModerationActions } from '../../../src/schema/member_moderation_actions.js';
import { memberModerationAppeals } from '../../../src/schema/member_moderation_appeals.js';
import { memberModerationGrounds } from '../../../src/schema/member_moderation_grounds.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope, seedMember } from '../_helpers.js';

const ORIGINAL_ACTOR = 'aaaaaaaa-0000-4000-8000-000000000001';
const GROUND_AUTHOR = 'aaaaaaaa-0000-4000-8000-000000000002';
const SECOND_PANEL_MEMBER = 'bbbbbbbb-0000-4000-8000-000000000003';

/** Drizzle WRAPS the pg error, so the constraint name lives on `err.cause`, never on `err.message`. */
function violatedConstraint(err: unknown): string | undefined {
  return (err as { cause?: { constraint?: string } } | undefined)?.cause?.constraint;
}
function causeCode(err: unknown): string | undefined {
  return (err as { cause?: { code?: string } } | undefined)?.cause?.code;
}
function causeMessage(err: unknown): string {
  return String((err as { cause?: { message?: string } } | undefined)?.cause?.message ?? '');
}

describe.skipIf(!hasDatabase)(
  'Story 10.22 — the Niyamavali §8.8 moderation appeal (:5433)',
  { timeout: 20000 },
  () => {
    setupLiveDb();

    /** A member under SUSPENSION, with the moderation act that suspended them. */
    async function seedSuspendedMember(
      tx: Db,
      opts: { actorId?: string; groundAuthorId?: string | null } = {},
    ): Promise<{ memberId: string; actionId: string }> {
      const memberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
      const actorId = opts.actorId ?? ORIGINAL_ACTOR;

      const [action] = await tx
        .insert(memberModerationActions)
        .values({
          memberId: toMemberId(memberId),
          pariwarId: toPariwarId(PARIWAR_A),
          action: 'suspend',
          reasonCode: 'r7-contribution-discipline',
          decisionNoteCiphertext: 'enc:v1:seed-decision-note',
          actorId,
          actorDisplay: 'Seed Trustee',
          actedAt: new Date('2026-06-01T00:00:00.000Z'),
        })
        .returning({ id: memberModerationActions.moderationActionId });

      // The overlay is DERIVED from the stream, so the suspension event is what makes the member
      // appealable — not the row above.
      await tx.insert(eventsLog).values({
        streamId: memberId,
        pariwarId: toPariwarId(PARIWAR_A),
        eventType: 'member.moderation.suspended',
        eventVersion: 1,
        payload: {
          from_state: 'active',
          to_state: 'active',
          trigger: 'member_moderation.suspend',
          actor: 'trustee',
          moderation_from: 'none',
          moderation_to: 'suspended',
          reason_code: 'r7-contribution-discipline',
        },
        occurredAt: new Date('2026-06-01T00:00:00.000Z'),
        actorId,
      });

      if (opts.groundAuthorId) {
        await tx.insert(memberModerationGrounds).values({
          moderationActionId: action!.id,
          memberId: toMemberId(memberId),
          pariwarId: toPariwarId(PARIWAR_A),
          code: 'r7-contribution-discipline',
          isPrimary: false,
          addedBy: opts.groundAuthorId,
          addedByDisplay: 'Seed Ground Author',
          addedAt: new Date('2026-06-02T00:00:00.000Z'),
        });
      }
      return { memberId, actionId: action!.id };
    }

    function fileInput(memberId: string, actionId: string, over: Record<string, unknown> = {}) {
      return {
        memberId: toMemberId(memberId),
        pariwarId: toPariwarId(PARIWAR_A),
        moderationActionId: toActionId(actionId),
        groundsCiphertext: 'enc:v1:member-grounds',
        filedVia: 'portal' as const,
        actorId: memberId,
        now: new Date('2026-07-01T00:00:00.000Z'),
        ...over,
      };
    }

    // ── AC4 — the PARTIAL unique index, BOTH arms ─────────────────────────────────────────────
    it('⭐ AC4 — a SECOND OPEN appeal against the same act raises 23505 on the partial index', async () => {
      const { tx, client } = getTx();
      const { memberId, actionId } = await seedSuspendedMember(tx);
      await enterAppScope(client, PARIWAR_A);

      const first = await fileMemberModerationAppeal(client, fileInput(memberId, actionId));
      expect(first.appealId).toBeTruthy();

      // ⚠ Bypasses the app guard on purpose — the guard is a READ and this proves the INDEX is the
      // truth. A guard-bypass race in production lands exactly here.
      let err: unknown;
      try {
        await tx.insert(memberModerationAppeals).values({
          memberId: toMemberId(memberId),
          pariwarId: toPariwarId(PARIWAR_A),
          moderationActionId: toActionId(actionId),
          groundsCiphertext: 'enc:v1:second',
          filedVia: 'portal',
          filedAt: new Date('2026-07-02T00:00:00.000Z'),
          status: 'open',
        });
      } catch (e) {
        err = e;
      }
      expect(causeCode(err)).toBe('23505');
      expect(violatedConstraint(err)).toBe('member_moderation_appeals_one_open_per_action');
    });

    it('⭐ AC4 — RE-FILING against the SAME act AFTER a determination SUCCEEDS (the right is not exhausted)', async () => {
      // §8.8 is deliberately NARROWER than Part 9's one-journey-per-claim-EVER standard. ⛔ If this
      // goes red because the index was "tightened" to a plain UNIQUE, that contradicts the ruling.
      const { tx, client } = getTx();
      const { memberId, actionId } = await seedSuspendedMember(tx);
      await enterAppScope(client, PARIWAR_A);

      const first = await fileMemberModerationAppeal(client, fileInput(memberId, actionId));
      await decideMemberModerationAppeal(client, {
        pariwarId: toPariwarId(PARIWAR_A),
        appealId: toAppealId(first.appealId),
        outcome: 'upheld',
        reasonedOutcomeCiphertext: 'enc:v1:reasoned',
        decidedByActorId: SECOND_PANEL_MEMBER,
        decidedByDisplay: 'Second Panel Member',
        now: new Date('2026-07-10T00:00:00.000Z'),
      });

      const second = await fileMemberModerationAppeal(
        client,
        fileInput(memberId, actionId, { now: new Date('2026-08-01T00:00:00.000Z') }),
      );
      expect(second.appealId).not.toBe(first.appealId);

      const all = await listAppealsForMember(tx, toPariwarId(PARIWAR_A), toMemberId(memberId));
      expect(all.map((a) => a.appealId).sort()).toEqual(
        [first.appealId, second.appealId].sort(),
      );
    });

    // ── AC4 — the two CHECKs, BY NAME (revert-sanity teeth) ───────────────────────────────────
    it('AC4 — a `helpline` filing with NO ticket violates the named CHECK', async () => {
      const { tx, client } = getTx();
      const { memberId, actionId } = await seedSuspendedMember(tx);
      await enterAppScope(client, PARIWAR_A);

      let err: unknown;
      try {
        await tx.insert(memberModerationAppeals).values({
          memberId: toMemberId(memberId),
          pariwarId: toPariwarId(PARIWAR_A),
          moderationActionId: toActionId(actionId),
          groundsCiphertext: 'enc:v1:g',
          filedVia: 'helpline',
          helpdeskTicketId: null,
          filedAt: new Date('2026-07-01T00:00:00.000Z'),
          status: 'open',
        });
      } catch (e) {
        err = e;
      }
      expect(violatedConstraint(err)).toBe(
        'member_moderation_appeals_helpline_needs_ticket_check',
      );
    });

    it('AC4 — an `open` row carrying a decision field violates the coherence CHECK', async () => {
      const { tx, client } = getTx();
      const { memberId, actionId } = await seedSuspendedMember(tx);
      await enterAppScope(client, PARIWAR_A);

      let err: unknown;
      try {
        await tx.insert(memberModerationAppeals).values({
          memberId: toMemberId(memberId),
          pariwarId: toPariwarId(PARIWAR_A),
          moderationActionId: toActionId(actionId),
          groundsCiphertext: 'enc:v1:g',
          filedVia: 'portal',
          filedAt: new Date('2026-07-01T00:00:00.000Z'),
          status: 'open',
          // ⛔ A determination without the rest of the determination.
          outcome: 'allowed',
        });
      } catch (e) {
        err = e;
      }
      expect(violatedConstraint(err)).toBe('member_moderation_appeals_decision_coherence_check');
    });

    // ── AC4 — the append-only GRANT posture ───────────────────────────────────────────────────
    it('⭐ AC4 — the FILING columns have NO update privilege: the filing is immutable BY ATTRIBUTE', async () => {
      const { tx, client } = getTx();
      const { memberId, actionId } = await seedSuspendedMember(tx);
      await enterAppScope(client, PARIWAR_A);
      const filed = await fileMemberModerationAppeal(client, fileInput(memberId, actionId));

      // ⚠ Not "the app doesn't do this" — Postgres itself refuses, because migration 0107 grants
      // UPDATE column-by-column and `moderation_action_id` is not among them.
      let err: unknown;
      try {
        await tx
          .update(memberModerationAppeals)
          .set({ moderationActionId: toActionId(randomUUID()) })
          .where(eq(memberModerationAppeals.appealId, toAppealId(filed.appealId)));
      } catch (e) {
        err = e;
      }
      expect(causeCode(err)).toBe('42501');
      expect(causeMessage(err)).toMatch(/permission denied/i);
    });

    // ── AC5 — the exclusion set, as a POLARITY PAIR ───────────────────────────────────────────
    it('⭐ AC5 — the exclusion set contains the ACTOR and every GROUND AUTHOR, and nobody else', async () => {
      const { tx, client } = getTx();
      const { actionId } = await seedSuspendedMember(tx, { groundAuthorId: GROUND_AUTHOR });
      await enterAppScope(client, PARIWAR_A);

      const excluded = await getAppealExclusionActorIds(
        tx,
        toPariwarId(PARIWAR_A),
        toActionId(actionId),
      );
      expect(excluded.has(ORIGINAL_ACTOR)).toBe(true);
      // A supporting ground IS participation in the decision (the D-D reasoning, applied here).
      expect(excluded.has(GROUND_AUTHOR)).toBe(true);
      // ⛔ THE ARM THAT KEEPS THIS FROM PASSING VACUOUSLY.
      expect(excluded.has(SECOND_PANEL_MEMBER)).toBe(false);
      expect(excluded.size).toBe(2);
    });

    it('⭐ AC5 — the ORIGINAL ACTOR is REFUSED with a typed 409-shaped error', async () => {
      const { tx, client } = getTx();
      const { memberId, actionId } = await seedSuspendedMember(tx);
      await enterAppScope(client, PARIWAR_A);
      const filed = await fileMemberModerationAppeal(client, fileInput(memberId, actionId));

      await expect(
        decideMemberModerationAppeal(client, {
          pariwarId: toPariwarId(PARIWAR_A),
          appealId: toAppealId(filed.appealId),
          outcome: 'upheld',
          reasonedOutcomeCiphertext: 'enc:v1:r',
          decidedByActorId: ORIGINAL_ACTOR,
          decidedByDisplay: 'The Original Decider',
          now: new Date('2026-07-10T00:00:00.000Z'),
        }),
      ).rejects.toThrow(/did not take part/i);

      // ⛔ And the refusal wrote NOTHING — §8.8's "remains filed and open".
      const [row] = await tx
        .select({ status: memberModerationAppeals.status })
        .from(memberModerationAppeals)
        .where(eq(memberModerationAppeals.appealId, toAppealId(filed.appealId)));
      expect(row?.status).toBe('open');
    });

    it('⭐ AC5 — a GROUND AUTHOR is REFUSED too (a supporting ground is participation)', async () => {
      const { tx, client } = getTx();
      const { memberId, actionId } = await seedSuspendedMember(tx, {
        groundAuthorId: GROUND_AUTHOR,
      });
      await enterAppScope(client, PARIWAR_A);
      const filed = await fileMemberModerationAppeal(client, fileInput(memberId, actionId));

      await expect(
        decideMemberModerationAppeal(client, {
          pariwarId: toPariwarId(PARIWAR_A),
          appealId: toAppealId(filed.appealId),
          outcome: 'upheld',
          reasonedOutcomeCiphertext: 'enc:v1:r',
          decidedByActorId: GROUND_AUTHOR,
          decidedByDisplay: 'The Ground Author',
          now: new Date('2026-07-10T00:00:00.000Z'),
        }),
      ).rejects.toThrow(/did not take part/i);
    });

    it('⭐ AC5 — a SECOND PANEL MEMBER is ACCEPTED (the other half of the pair)', async () => {
      const { tx, client } = getTx();
      const { memberId, actionId } = await seedSuspendedMember(tx, {
        groundAuthorId: GROUND_AUTHOR,
      });
      await enterAppScope(client, PARIWAR_A);
      const filed = await fileMemberModerationAppeal(client, fileInput(memberId, actionId));

      const decided = await decideMemberModerationAppeal(client, {
        pariwarId: toPariwarId(PARIWAR_A),
        appealId: toAppealId(filed.appealId),
        outcome: 'upheld',
        reasonedOutcomeCiphertext: 'enc:v1:r',
        decidedByActorId: SECOND_PANEL_MEMBER,
        decidedByDisplay: 'Second Panel Member',
        now: new Date('2026-07-10T00:00:00.000Z'),
      });
      expect(decided.outcome).toBe('upheld');
      expect(decided.directsRestore).toBe(false);
    });

    it('AC5 — a determination on an ALREADY-DECIDED appeal is refused', async () => {
      const { tx, client } = getTx();
      const { memberId, actionId } = await seedSuspendedMember(tx);
      await enterAppScope(client, PARIWAR_A);
      const filed = await fileMemberModerationAppeal(client, fileInput(memberId, actionId));
      const decide = () =>
        decideMemberModerationAppeal(client, {
          pariwarId: toPariwarId(PARIWAR_A),
          appealId: toAppealId(filed.appealId),
          outcome: 'upheld',
          reasonedOutcomeCiphertext: 'enc:v1:r',
          decidedByActorId: SECOND_PANEL_MEMBER,
          decidedByDisplay: 'Second Panel Member',
          now: new Date('2026-07-10T00:00:00.000Z'),
        });
      await decide();
      await expect(decide()).rejects.toThrow(/already been determined/i);
    });

    // ── AC5 — the adjudication LIST (the Panel's discoverability) ─────────────────────────────
    it('⭐ AC5 — a newly-filed appeal is RETURNED BY THE LIST before any decision is made on it', async () => {
      // ⚠ Without this the appeal would be reachable only by direct link — a complete record nobody
      // can find, which is the helpdesk-is-not-a-queue defect in a new costume (D6).
      const { tx, client } = getTx();
      const { memberId, actionId } = await seedSuspendedMember(tx);
      await enterAppScope(client, PARIWAR_A);
      const filed = await fileMemberModerationAppeal(client, fileInput(memberId, actionId));

      const open = await listOpenAppealsForPariwar(tx, toPariwarId(PARIWAR_A));
      // Own-committing writers accumulate → assert MEMBERSHIP, never counts.
      expect(open.map((a) => a.appealId)).toContain(filed.appealId);

      await decideMemberModerationAppeal(client, {
        pariwarId: toPariwarId(PARIWAR_A),
        appealId: toAppealId(filed.appealId),
        outcome: 'upheld',
        reasonedOutcomeCiphertext: 'enc:v1:r',
        decidedByActorId: SECOND_PANEL_MEMBER,
        decidedByDisplay: 'Second Panel Member',
        now: new Date('2026-07-10T00:00:00.000Z'),
      });
      const afterDecision = await listOpenAppealsForPariwar(tx, toPariwarId(PARIWAR_A));
      expect(afterDecision.map((a) => a.appealId)).not.toContain(filed.appealId);
    });

    // ── AC6 — `allowed` DIRECTS; it never performs ───────────────────────────────────────────
    it('⭐ AC6 — deciding `allowed` leaves the moderation overlay UNCHANGED and emits no `restored` event', async () => {
      const { tx, client } = getTx();
      const { memberId, actionId } = await seedSuspendedMember(tx);
      await enterAppScope(client, PARIWAR_A);

      const before = await getCurrentMemberModerationOverlay(tx, toMemberId(memberId));
      expect(before.status).toBe('suspended');

      const filed = await fileMemberModerationAppeal(client, fileInput(memberId, actionId));
      const decided = await decideMemberModerationAppeal(client, {
        pariwarId: toPariwarId(PARIWAR_A),
        appealId: toAppealId(filed.appealId),
        outcome: 'allowed',
        reasonedOutcomeCiphertext: 'enc:v1:r',
        decidedByActorId: SECOND_PANEL_MEMBER,
        decidedByDisplay: 'Second Panel Member',
        now: new Date('2026-07-10T00:00:00.000Z'),
      });
      // A FLAG, not an action.
      expect(decided.directsRestore).toBe(true);

      const after = await getCurrentMemberModerationOverlay(tx, toMemberId(memberId));
      expect(after).toEqual(before);
      expect(after.status).toBe('suspended');

      // ⛔ And no restore event was emitted by the appeal path.
      const restored = await tx
        .select({ t: eventsLog.eventType })
        .from(eventsLog)
        .where(
          and(
            eq(eventsLog.streamId, memberId),
            eq(eventsLog.eventType, 'member.moderation.restored'),
          ),
        );
      expect(restored).toHaveLength(0);

      // The two appeal events DID land, on the member's own stream.
      const appealEvents = await tx
        .select({ t: eventsLog.eventType })
        .from(eventsLog)
        .where(eq(eventsLog.streamId, memberId));
      const types = appealEvents.map((e) => e.t);
      expect(types).toContain('member.moderation.appeal-filed');
      expect(types).toContain('member.moderation.appeal-decided');
    });

    // ── AC9 — RTBF ───────────────────────────────────────────────────────────────────────────
    it('⭐ AC9 — RTBF replaces BOTH Tier-1 columns with the sentinel and the ROW SURVIVES', async () => {
      // ⛔ NOT "the row was deleted": the record of a governance act survives RTBF; its
      // member-authored CONTENT does not. Asserting deletion here would encode the opposite rule.
      const { tx, client } = getTx();
      const { memberId, actionId } = await seedSuspendedMember(tx);
      await enterAppScope(client, PARIWAR_A);
      const filed = await fileMemberModerationAppeal(client, fileInput(memberId, actionId));
      await decideMemberModerationAppeal(client, {
        pariwarId: toPariwarId(PARIWAR_A),
        appealId: toAppealId(filed.appealId),
        outcome: 'upheld',
        reasonedOutcomeCiphertext: 'enc:v1:reasoned-outcome',
        decidedByActorId: SECOND_PANEL_MEMBER,
        decidedByDisplay: 'Second Panel Member',
        now: new Date('2026-07-10T00:00:00.000Z'),
      });

      const [before] = await tx
        .select({
          g: memberModerationAppeals.groundsCiphertext,
          r: memberModerationAppeals.reasonedOutcomeCiphertext,
        })
        .from(memberModerationAppeals)
        .where(eq(memberModerationAppeals.appealId, toAppealId(filed.appealId)));
      expect(before?.g).toBe('enc:v1:member-grounds');
      expect(before?.r).toBe('enc:v1:reasoned-outcome');

      // The scrub itself is exercised end-to-end by `rtbf-anonymize.spec.ts`; here the column-level
      // GRANT is what is being proved — that both columns CAN be scrubbed at all. Migration 0091
      // shipped a Tier-1 column with no UPDATE privilege and made it structurally un-erasable; 0107
      // grants both at birth, and this is the assertion that says so.
      await tx
        .update(memberModerationAppeals)
        .set({ groundsCiphertext: 'enc:v1:SENTINEL', reasonedOutcomeCiphertext: 'enc:v1:SENTINEL' })
        .where(eq(memberModerationAppeals.appealId, toAppealId(filed.appealId)));

      const [after] = await tx
        .select({
          g: memberModerationAppeals.groundsCiphertext,
          r: memberModerationAppeals.reasonedOutcomeCiphertext,
          status: memberModerationAppeals.status,
          outcome: memberModerationAppeals.outcome,
        })
        .from(memberModerationAppeals)
        .where(eq(memberModerationAppeals.appealId, toAppealId(filed.appealId)));
      expect(after?.g).toBe('enc:v1:SENTINEL');
      expect(after?.r).toBe('enc:v1:SENTINEL');
      // ⭐ The governance record itself is INTACT.
      expect(after?.status).toBe('decided');
      expect(after?.outcome).toBe('upheld');
    });

    // ── AC4 — an unmoderated member has nothing to appeal ────────────────────────────────────
    it('AC4 — an UNMODERATED member cannot file: the standing is checked before any write', async () => {
      const { tx, client } = getTx();
      const memberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
      const [action] = await tx
        .insert(memberModerationActions)
        .values({
          memberId: toMemberId(memberId),
          pariwarId: toPariwarId(PARIWAR_A),
          action: 'suspend',
          reasonCode: 'r7-contribution-discipline',
          decisionNoteCiphertext: 'enc:v1:n',
          actorId: ORIGINAL_ACTOR,
          actorDisplay: 'Seed Trustee',
          actedAt: new Date('2026-06-01T00:00:00.000Z'),
        })
        .returning({ id: memberModerationActions.moderationActionId });
      // ⚠ NO suspension EVENT — the overlay is derived from the stream, so this member reads as
      // unmoderated even though a decision row exists.
      await enterAppScope(client, PARIWAR_A);

      await expect(
        fileMemberModerationAppeal(client, fileInput(memberId, action!.id)),
      ).rejects.toThrow(/§8.8 permits an appeal/i);
    });
  },
);
