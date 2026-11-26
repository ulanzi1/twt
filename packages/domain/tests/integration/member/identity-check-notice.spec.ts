// Story 3.13a — the member's own "could not confirm" notice: `readMemberIdentityCheckNotice` (Task 1; AC2, DL4, N1–N4).
// Live DB (the story's own container), each test in its own rolled-back transaction, every read run as `twt_app` inside
// the member's Pariwar scope ([[feedback_story_validate_footguns]] #56 (a) — CI's superuser bypasses RLS).
//
// ⭐ Every `null` leg differs from the CONTROL (a live `not_confirmed`; `lock-in`; `self_declared`; ⛔ verified; ⛔
// moderation; ⛔ death report) by EXACTLY ONE fact. 3.13's writer flips `trustee_verified` with every `confirmed`, so the
// eligibility legs are HAND-SEEDED on a live `not_confirmed` (each says so) — a "live confirmed" fixture would fail the
// outcome check first and prove nothing about eligibility.

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { bindScopedDb } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, type MemberId, type PariwarId } from '../../../src/ids/index.js';
import {
  readIdentityCheckDetail,
  readMemberIdentityCheckNotice,
  recordIdentityValidation,
  type RecordIdentityValidationInput,
} from '../../../src/member/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope, seedClaim, seedEvent } from '../_helpers.js';

type Tx = ReturnType<typeof getTx>['tx'];

const STAFF_ACTOR = randomUUID();

/** The reducer's own arms (the 3.13 spec's map, the states this file needs). */
const STREAM_TO = {
  'lock-in': ['member.signup_initiated', 'member.kyc_manual_fallback', 'member.vyawastha_shulk_paid'],
  'pending-valid': ['member.signup_initiated', 'member.kyc_manual_fallback', 'member.vyawastha_shulk_paid', 'member.lock_in_expired:false'],
} as const;

interface SeedOpts {
  state?: keyof typeof STREAM_TO;
  moderation?: ('suspended' | 'terminated')[];
  pariwarId?: PariwarId;
}

async function appendEvents(tx: Tx, pariwarId: PariwarId, memberId: string, specs: readonly string[], from: number): Promise<number> {
  let v = from;
  for (const spec of specs) {
    const [eventType, flag] = spec.split(':');
    const payload = flag === undefined ? {} : { kyc_verified: flag === 'true' };
    v += 1;
    await seedEvent(tx, pariwarId, { streamId: memberId, eventType, payload, eventVersion: v });
  }
  return v;
}

/** Seed (as the superuser) a typed-in member: stream, `members` row, a `self_declared` unverified KYC row. */
async function seedTypedInMember(tx: Tx, opts: SeedOpts = {}): Promise<MemberId> {
  const pariwarId = opts.pariwarId ?? PARIWAR_A;
  const memberId = randomUUID();
  const events = [...STREAM_TO[opts.state ?? 'lock-in'], ...(opts.moderation ?? []).map((m) => `member.moderation.${m}`)];
  const last = await appendEvents(tx, pariwarId, memberId, events, 0);
  await tx.insert(schema.members).values({
    memberId: toMemberId(memberId),
    pariwarId,
    state: (opts.state ?? 'lock-in') as never,
    stateEventVersion: last,
  });
  await tx.insert(schema.memberKycProfiles).values({
    memberId: toMemberId(memberId),
    pariwarId,
    nameCiphertext: 'enc:v1:name',
    dobCiphertext: 'enc:v1:dob',
    photoCiphertext: 'enc:v1:photo',
    aadhaarMaskedId: null,
    verificationStrength: 'self_declared',
    source: 'manual',
    trusteeVerified: false,
    updatedAt: new Date('2026-06-01T00:00:00Z'),
  });
  return toMemberId(memberId);
}

const NOT_CONFIRMED: Omit<RecordIdentityValidationInput, 'memberId' | 'pariwarId'> = {
  outcome: 'not_confirmed',
  evidenceKind: 'photo_id_in_person',
  documentKind: 'voter_id',
  notConfirmedReason: 'details_do_not_match',
  noteCiphertext: 'enc:v1:the-note',
  actorId: STAFF_ACTOR,
  actorDisplay: 'Asha District Admin',
};
const CONFIRM: Omit<RecordIdentityValidationInput, 'memberId' | 'pariwarId'> = {
  ...NOT_CONFIRMED,
  outcome: 'confirmed',
  notConfirmedReason: null,
  noteCiphertext: null,
};
const NOT_REACHED: Omit<RecordIdentityValidationInput, 'memberId' | 'pariwarId'> = {
  ...NOT_CONFIRMED,
  notConfirmedReason: 'member_not_reached',
  evidenceKind: null,
  documentKind: null,
};

/** As the superuser, then back into the member's Pariwar scope as `twt_app`. */
async function asOwner<T>(client: pg.PoolClient, pariwarId: PariwarId, fn: () => Promise<T>): Promise<T> {
  await client.query('RESET ROLE');
  try {
    return await fn();
  } finally {
    await enterAppScope(client, pariwarId);
  }
}

async function streamLength(client: pg.PoolClient, memberId: string): Promise<number> {
  const r = await client.query<{ n: string }>(`SELECT count(*) AS n FROM events_log WHERE stream_id = $1`, [memberId]);
  return Number(r.rows[0]!.n);
}

/** Record a live `not_confirmed` through 3.13's writer (the member is eligible at this point). */
async function recordNotConfirmed(
  client: pg.PoolClient,
  memberId: MemberId,
  over: Partial<RecordIdentityValidationInput> = {},
  pariwarId: PariwarId = PARIWAR_A,
): Promise<void> {
  await recordIdentityValidation(client, { ...NOT_CONFIRMED, pariwarId, memberId, ...over });
}

function sqlTexts(spy: { mock: { calls: unknown[][] } }): string[] {
  return spy.mock.calls.map(([q]) => (typeof q === 'string' ? q : String((q as { text?: string }).text ?? '')));
}

/** The column names a statement's SELECT list names (quoted identifiers; a qualified `"t"."c"` keeps `c`). */
function selectListColumns(text: string): string[] {
  const m = /^\s*select\s+([\s\S]*?)\s+from\s/i.exec(text);
  if (!m) return [];
  return [...m[1]!.matchAll(/(?:"[a-z_]+"\.)?"([a-z_]+)"/g)].map((x) => x[1]!);
}

describe.skipIf(!hasDatabase)('Story 3.13a — readMemberIdentityCheckNotice (live DB)', { timeout: 30000 }, () => {
  setupLiveDb();

  it('⭐ the CONTROL — a live `not_confirmed` on an awaited member (`lock-in`, `self_declared`, unverified, ⛔ moderation, ⛔ death report) ⇒ `{ reason }`', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    await enterAppScope(client, PARIWAR_A);
    await recordNotConfirmed(client, memberId);
    expect(await readMemberIdentityCheckNotice(tx, PARIWAR_A, memberId)).toEqual({ reason: 'details_do_not_match' });
  });

  // ── (a) / (b) — the outcome check ─────────────────────────────────────────────────────────────────────────────────

  it('(a) ⛔ row at all ⇒ null (with the control beside it)', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    const control = await seedTypedInMember(tx);
    await enterAppScope(client, PARIWAR_A);
    await recordNotConfirmed(client, control);
    expect(await readMemberIdentityCheckNotice(tx, PARIWAR_A, memberId)).toBeNull();
    expect(await readMemberIdentityCheckNotice(tx, PARIWAR_A, control)).toEqual({ reason: 'details_do_not_match' });
  });

  it('(b) a live `confirmed` through the writer, superseding a `not_confirmed` ⇒ null (the outcome check)', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    await enterAppScope(client, PARIWAR_A);
    await recordNotConfirmed(client, memberId);
    expect(await readMemberIdentityCheckNotice(tx, PARIWAR_A, memberId)).toEqual({ reason: 'details_do_not_match' });
    await recordIdentityValidation(client, { ...CONFIRM, pariwarId: PARIWAR_A, memberId });
    expect(await readMemberIdentityCheckNotice(tx, PARIWAR_A, memberId)).toBeNull();
  });

  // ── (c)–(g) — the eligibility and death legs, ONE fact each ──────────────────────────────────────────────────────

  it('(c) HAND-SEEDED: live `not_confirmed` + the KYC row UPDATEd to `trustee_verified = true` ⇒ null', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    await enterAppScope(client, PARIWAR_A);
    await recordNotConfirmed(client, memberId);
    await asOwner(client, PARIWAR_A, () =>
      client.query(`UPDATE member_kyc_profiles SET trustee_verified = true WHERE member_id = $1`, [memberId]),
    );
    expect(await readMemberIdentityCheckNotice(tx, PARIWAR_A, memberId)).toBeNull();
  });

  it('(d) HAND-SEEDED: live `not_confirmed` + `verification_strength = aadhaar_kyc` ⇒ null', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    await enterAppScope(client, PARIWAR_A);
    await recordNotConfirmed(client, memberId);
    await asOwner(client, PARIWAR_A, () =>
      client.query(`UPDATE member_kyc_profiles SET verification_strength = 'aadhaar_kyc' WHERE member_id = $1`, [memberId]),
    );
    expect(await readMemberIdentityCheckNotice(tx, PARIWAR_A, memberId)).toBeNull();
  });

  it.each([
    ['active', ['member.lock_in_expired:true']],
    ['withdrawn', ['member.lock_in_expired:true', 'member.withdrawal_completed']],
  ])(
    '(e) HAND-SEEDED events (⛔ production producer): live `not_confirmed` + state `%s` ⇒ null',
    async (_state, events) => {
      const { tx, client } = getTx();
      const memberId = await seedTypedInMember(tx);
      await enterAppScope(client, PARIWAR_A);
      await recordNotConfirmed(client, memberId);
      const n = await streamLength(client, memberId);
      await asOwner(client, PARIWAR_A, () => appendEvents(tx, PARIWAR_A, memberId, events, n));
      expect(await readMemberIdentityCheckNotice(tx, PARIWAR_A, memberId)).toBeNull();
    },
  );

  it('(f) live `not_confirmed` + `terminated` (suspend → terminate, the overlay\'s own event arms) ⇒ null', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    await enterAppScope(client, PARIWAR_A);
    await recordNotConfirmed(client, memberId);
    const n = await streamLength(client, memberId);
    await asOwner(client, PARIWAR_A, () =>
      appendEvents(tx, PARIWAR_A, memberId, ['member.moderation.suspended', 'member.moderation.terminated'], n),
    );
    expect(await readMemberIdentityCheckNotice(tx, PARIWAR_A, memberId)).toBeNull();
  });

  it('(g) live `not_confirmed` + a standing death report ⇒ null; the reason AGAIN once a `member_found_innocent` finding ends it', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    await enterAppScope(client, PARIWAR_A);
    await recordNotConfirmed(client, memberId);
    const claimCaseId = await asOwner(client, PARIWAR_A, () =>
      seedClaim(tx, PARIWAR_A, { deceasedMemberId: memberId, currentState: 'intake_pending' }),
    );
    expect(await readMemberIdentityCheckNotice(tx, PARIWAR_A, memberId)).toBeNull();
    await asOwner(client, PARIWAR_A, () =>
      tx.insert(schema.claimNomineeFindings).values({
        findingId: randomUUID() as never,
        claimCaseId: toClaimId(claimCaseId),
        pariwarId: PARIWAR_A,
        kind: 'member_found_innocent',
        rank: null,
        recordedByActorId: 'investigator',
        recordedByDisplay: 'Investigator',
      }),
    );
    expect(await readMemberIdentityCheckNotice(tx, PARIWAR_A, memberId)).toEqual({ reason: 'details_do_not_match' });
  });

  // ── (h) — N2: the LIVE row, ⛔ the latest ───────────────────────────────────────────────────────────────────────

  it('(h) N2 HAND-SEEDED: a SUPERSEDED `not_confirmed` (X) with a LATER `decided_at` than the live one (Y) ⇒ Y', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    const row = {
      pariwarId: PARIWAR_A,
      memberId,
      outcome: 'not_confirmed' as const,
      noteCiphertext: 'enc:v1:n',
      kycProfileUpdatedAt: new Date('2026-06-01T00:00:00Z'),
      decidedByActorId: STAFF_ACTOR,
      decidedByDisplay: 'Asha District Admin',
    };
    await tx.insert(schema.memberIdentityValidations).values([
      {
        ...row,
        notConfirmedReason: 'photo_does_not_match',
        evidenceKind: 'photo_id_in_person',
        documentKind: 'voter_id',
        decidedAt: new Date('2026-11-20T00:00:00Z'),
        supersededAt: new Date('2026-11-21T00:00:00Z'),
        supersededReason: 're_checked',
      },
      {
        ...row,
        notConfirmedReason: 'member_not_reached',
        evidenceKind: null,
        documentKind: null,
        decidedAt: new Date('2026-11-10T00:00:00Z'),
      },
    ]);
    await enterAppScope(client, PARIWAR_A);
    expect(await readMemberIdentityCheckNotice(tx, PARIWAR_A, memberId)).toEqual({ reason: 'member_not_reached' });
  });

  it('(h) through the writer: a second `not_confirmed` with another reason ⇒ the NEW reason', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    await enterAppScope(client, PARIWAR_A);
    await recordNotConfirmed(client, memberId);
    await recordIdentityValidation(client, { ...NOT_REACHED, pariwarId: PARIWAR_A, memberId });
    expect(await readMemberIdentityCheckNotice(tx, PARIWAR_A, memberId)).toEqual({ reason: 'member_not_reached' });
  });

  // ── Positive legs ────────────────────────────────────────────────────────────────────────────────────────────────

  it('POSITIVE — a `suspended` member IS told (3.13 checks them)', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx, { moderation: ['suspended'] });
    await enterAppScope(client, PARIWAR_A);
    await recordNotConfirmed(client, memberId, { notConfirmedReason: 'photo_does_not_match' });
    expect(await readMemberIdentityCheckNotice(tx, PARIWAR_A, memberId)).toEqual({ reason: 'photo_does_not_match' });
  });

  it('POSITIVE — a hand-seeded `pending-valid` member (⛔ production producer until row 3-14) ⇒ `{ reason }`', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx, { state: 'pending-valid' });
    await enterAppScope(client, PARIWAR_A);
    await recordNotConfirmed(client, memberId, {
      notConfirmedReason: 'no_document_shown',
      documentKind: null,
    });
    expect(await readMemberIdentityCheckNotice(tx, PARIWAR_A, memberId)).toEqual({ reason: 'no_document_shown' });
  });

  // ── Scope: the `member_id` predicate and the Pariwar ─────────────────────────────────────────────────────────────

  it('⭐ another member in the SAME Pariwar: each read returns its OWN row; a member with ⛔ row gets null while a neighbour has one (RLS alone would pass it)', async () => {
    const { tx, client } = getTx();
    const a = await seedTypedInMember(tx);
    const b = await seedTypedInMember(tx);
    const none = await seedTypedInMember(tx);
    await enterAppScope(client, PARIWAR_A);
    await recordNotConfirmed(client, a);
    await recordIdentityValidation(client, { ...NOT_REACHED, pariwarId: PARIWAR_A, memberId: b });
    expect(await readMemberIdentityCheckNotice(tx, PARIWAR_A, a)).toEqual({ reason: 'details_do_not_match' });
    expect(await readMemberIdentityCheckNotice(tx, PARIWAR_A, b)).toEqual({ reason: 'member_not_reached' });
    expect(await readMemberIdentityCheckNotice(tx, PARIWAR_A, none)).toBeNull();
  });

  it('a membership in ANOTHER Pariwar is invisible to this Pariwar\'s read (with the control that it has a notice in its own)', async () => {
    const { tx, client } = getTx();
    const other = await seedTypedInMember(tx, { pariwarId: PARIWAR_B });
    await enterAppScope(client, PARIWAR_B);
    await recordNotConfirmed(client, other, {}, PARIWAR_B);
    expect(await readMemberIdentityCheckNotice(tx, PARIWAR_B, other)).toEqual({ reason: 'details_do_not_match' });
    await enterAppScope(client, PARIWAR_A);
    expect(await readMemberIdentityCheckNotice(tx, PARIWAR_A, other)).toBeNull();
  });

  // ── N3 / N4 — what the read SELECTs, and that it writes nothing ──────────────────────────────────────────────────

  it('⭐ N3 — the live-row select is an ALLOW-list (`outcome`, `not_confirmed_reason` + the WHERE columns); ⛔ KYC ciphertext column is read — with the NON-VACUOUS control that the same scanner finds `note_ciphertext` and the KYC ciphertext in `readIdentityCheckDetail`', async () => {
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    await enterAppScope(client, PARIWAR_A);
    await recordNotConfirmed(client, memberId);
    const db = bindScopedDb(client);

    const spy = vi.spyOn(client, 'query');
    let texts: string[];
    let notice: unknown;
    try {
      notice = await readMemberIdentityCheckNotice(db, PARIWAR_A, memberId);
      texts = sqlTexts(spy);
    } finally {
      spy.mockRestore();
    }
    expect(notice).toEqual({ reason: 'details_do_not_match' }); // the read ran to the end (every statement issued)
    const validationReads = texts.filter((t) => /member_identity_validations/.test(t));
    expect(validationReads.length).toBeGreaterThanOrEqual(1);
    const ALLOWED = new Set(['outcome', 'not_confirmed_reason', 'pariwar_id', 'member_id', 'superseded_at']);
    for (const t of validationReads) {
      const cols = selectListColumns(t);
      expect(cols.length).toBeGreaterThan(0);
      expect(cols.filter((c) => !ALLOWED.has(c))).toEqual([]);
    }
    const kycReads = texts.filter((t) => /member_kyc_profiles/.test(t));
    expect(kycReads.length).toBeGreaterThanOrEqual(1);
    expect(kycReads.filter((t) => /ciphertext/.test(t))).toEqual([]);
    expect(texts.filter((t) => /^\s*(insert|update|delete)\b/i.test(t))).toEqual([]);
    // N4 — ⛔ lock: neither an advisory lock, a table lock (`LOCK TABLE`) nor a row lock (`FOR UPDATE` / `FOR SHARE` / `FOR NO KEY
    // UPDATE` / `FOR KEY SHARE`) — R2-P2, R3-P4.
    // Read by hand: no helper this read calls (`getCurrentMemberState`, `getCurrentMemberModerationOverlay`, `readDeceasedKycStanding`,
    // `isDeathReportStanding`) contains a row lock. The control below proves the pattern matches each kind of lock statement and ⛔ a
    // look-alike word; and a live mutation — `.for('share')` added to the live-row select — turned the last line of this block RED
    // (code review round 2, 2026-11-26), so a statement that really locks IS caught.
    const LOCK_SQL = /advisory|\block\s+table\b|\bfor\s+(update|share|no\s+key\s+update|key\s+share)\b/i;
    for (const sql of [
      'select pg_advisory_xact_lock($1)',
      'LOCK TABLE members IN SHARE MODE',
      'select 1 from members for update',
      'SELECT 1 FROM members FOR SHARE',
      'select 1 from members for no key update',
      'select 1 from members for key share',
    ]) {
      expect(LOCK_SQL.test(sql)).toBe(true);
    }
    // Each NEGATIVE is chosen to fail ONE anchor: `xfor update` has no leading `\b`; `for updated_at` has no trailing `\b`;
    // `unlock table_x` has no leading `\b` on lock; `lock tables_count` has no trailing `\b` on table. The first two are plain look-alikes.
    for (const sql of [
      'select 1 from members where information = $1',
      'select format_for_display from members',
      'select 1 from members xfor update',
      'select 1 from members for updated_at',
      'select unlock table_x from members',
      'select 1 from members where lock tables_count = 1',
    ]) {
      expect(LOCK_SQL.test(sql)).toBe(false);
    }
    expect(texts.filter((t) => LOCK_SQL.test(t))).toEqual([]);

    // The control: the same scanner over the ADMIN detail read sees the note and the identity ciphertext.
    const spy2 = vi.spyOn(client, 'query');
    let adminTexts: string[];
    try {
      await readIdentityCheckDetail(db, PARIWAR_A, memberId, new Date());
      adminTexts = sqlTexts(spy2);
    } finally {
      spy2.mockRestore();
    }
    const adminCols = adminTexts.filter((t) => /member_identity_validations/.test(t)).flatMap(selectListColumns);
    expect(adminCols).toContain('note_ciphertext');
    expect(adminTexts.filter((t) => /member_kyc_profiles/.test(t) && /ciphertext/.test(t)).length).toBeGreaterThan(0);
  });

  it('N4 — ⛔ row or event written by the read (counts before = after; the control that the writer moved them)', async () => {
    // ⚠ An AUDIT line is ⛔ counted here (R2-P2, R3-P6; AC2's audit-line clause carries a dated amendment in the story) — by
    // construction it cannot come from this read: it takes only a `Db`, `identity-validation.ts` imports no audit writer (grep `audit`
    // there finds two comments), and an audit INSERT through that `Db` would also trip N3's statement scan above (`insert|update|delete`).
    // The route's silence is the handler's (it calls none). Counting an audit table needs a control from an audited write (3.13's
    // number reveal) — not built.
    const { tx, client } = getTx();
    const memberId = await seedTypedInMember(tx);
    await enterAppScope(client, PARIWAR_A);
    const count = async () => {
      const r = await client.query<{ v: string; e: string }>(
        `SELECT (SELECT count(*) FROM member_identity_validations WHERE member_id = $1) AS v,
                (SELECT count(*) FROM events_log WHERE stream_id = $1) AS e`,
        [memberId],
      );
      return r.rows[0]!;
    };
    const beforeWrite = await count();
    await recordNotConfirmed(client, memberId);
    const before = await count();
    expect(before).not.toEqual(beforeWrite); // the control: the counters see a write
    await readMemberIdentityCheckNotice(tx, PARIWAR_A, memberId);
    await readMemberIdentityCheckNotice(tx, PARIWAR_A, memberId);
    expect(await count()).toEqual(before);
  });
});
