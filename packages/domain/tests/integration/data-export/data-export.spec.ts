// data_exports store accessors + assembleMemberExport — live-DB integration (Story 3.11, Task 9).
//
// Drives the domain data-export accessors + the section-assembly core against real Postgres inside the
// per-test BEGIN/ROLLBACK envelope. Families:
//   · store round-trip — insert `pending`; findActiveExport returns it; a second insert + findActive
//     still returns ONE active; markExportConsumed is a one-time conditional UPDATE (second call loses).
//   · assemble — assembleMemberExport returns the seven files + manifest; the two not-yet-sourced files
//     carry the schema-stable empty placeholder; decrypted Tier-1 PII (KYC name) appears in profile.json
//     (fixture ciphertext → plaintext via a fake KMS); a WITHDRAWN member still assembles a valid payload.
//   · cross-tenant RLS — a PARIWAR_B export row is invisible under PARIWAR_A scope.
//   · FK cascade (RTBF, Story 3.12) — deleting the member sweeps its data_exports row.

import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  createFakeKmsProvider,
  encryptTier1,
  serializeEnvelope,
} from '../../../src/encryption/index.js';
import type { KmsKeyRef, KmsProvider } from '../../../src/encryption/kms-provider.js';
import {
  assembleMemberExport,
  findActiveExport,
  getExportForMember,
  insertDataExport,
  markExportConsumed,
} from '../../../src/data-export/index.js';
import { dataExportId as toDataExportId, memberId as toMemberId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  driveClaimTo,
  enterAppScope,
  seedMember,
  seedNomineeDeclaration,
  seedNomineeDetermination,
} from '../_helpers.js';
import { listNomineeDeclarationVersions } from '../../../src/nominee/declaration-history.js';
import { ANONYMIZED_SENTINEL } from '../../../src/member/anonymize.js';

const NOW = new Date('2026-07-02T10:00:00Z');

function fakeKms(): { kms: KmsProvider; kekRef: KmsKeyRef } {
  const kms = createFakeKmsProvider({
    kekBytes: new Uint8Array(32).fill(7),
    hmacKeyBytes: new Uint8Array(32).fill(9),
  });
  return { kms, kekRef: { resourceName: 'fake:data-export-test-kek' } };
}

describe.skipIf(!hasDatabase)('data_exports store + assemble — RLS + cascade + decrypt (:5433)', () => {
  setupLiveDb();

  it('store: insert pending → findActiveExport resolves it; markExportConsumed is one-time', async () => {
    const { tx, client } = getTx();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid });
    await enterAppScope(client, PARIWAR_A);
    const memberId = toMemberId(mid);

    const row = await insertDataExport(tx, {
      memberId,
      pariwarId: PARIWAR_A,
      requestedAt: NOW,
    });
    expect(row.status).toBe('pending');

    const active = await findActiveExport(tx, memberId, NOW);
    expect(active?.exportId).toBe(row.exportId);

    // Move it to `ready` so markExportConsumed has a consumable row.
    const exportId = toDataExportId(row.exportId);
    await tx
      .update(schema.dataExports)
      .set({ status: 'ready', readyAt: NOW, expiresAt: new Date(NOW.getTime() + 86_400_000) })
      .where(eq(schema.dataExports.exportId, exportId));

    // One-time: first consume wins, second loses the race.
    expect(await markExportConsumed(tx, exportId, memberId, NOW)).toBe(true);
    expect(await markExportConsumed(tx, exportId, memberId, NOW)).toBe(false);

    // Once consumed, it is no longer "active".
    expect(await findActiveExport(tx, memberId, NOW)).toBeNull();
  });

  it('assemble: seven files + manifest; empty placeholders; decrypted KYC name in profile', async () => {
    const { tx, client } = getTx();
    const { kms, kekRef } = fakeKms();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid, state: 'active', stateEventVersion: 4 });
    const memberId = toMemberId(mid);

    // Seed a KYC profile with a Tier-1-encrypted name/dob (fixture ciphertext → plaintext on assemble).
    const name = 'Asha Devi';
    const dob = '1990-01-15';
    const encField = async (v: string): Promise<string> =>
      serializeEnvelope(
        await encryptTier1(
          Buffer.from(v, 'utf-8'),
          { pariwarId: PARIWAR_A, fieldClass: 'member_kyc' },
          kms,
          kekRef,
        ),
      );
    await tx.insert(schema.memberKycProfiles).values({
      memberId,
      pariwarId: PARIWAR_A,
      nameCiphertext: await encField(name),
      dobCiphertext: await encField(dob),
      verificationStrength: 'aadhaar_kyc',
      source: 'digilocker',
    });

    await enterAppScope(client, PARIWAR_A);
    const sections = await assembleMemberExport(
      tx,
      { kms, kekRef },
      { exportId: randomUUID(), memberId, pariwarId: PARIWAR_A, now: NOW },
    );

    // All seven files + manifest present.
    for (const f of [
      'profile.json',
      'consent_records.json',
      'payment_receipts.json',
      'event_stream.json',
      'audit_history.json',
      'contribution_history.json',
      'claim_history.json',
      'manifest.json',
    ]) {
      expect(sections[f]).toBeDefined();
    }

    // The two not-yet-sourced files carry the schema-stable empty placeholder.
    expect(sections['contribution_history.json']).toEqual({
      records: [],
      _status: 'no_source_system_at_this_epic',
      _wired_by: 'Epic 8',
    });
    expect(sections['claim_history.json']).toEqual({
      records: [],
      _status: 'no_source_system_at_this_epic',
      _wired_by: 'Epic 6',
    });

    // Decrypted Tier-1 PII appears in profile.json (member is the legitimate audience).
    const profile = sections['profile.json'] as { kyc: { name: string; dob: string } | null };
    expect(profile.kyc?.name).toBe(name);
    expect(profile.kyc?.dob).toBe(dob);

    // Manifest names all seven files + the schema version.
    const manifest = sections['manifest.json'] as { files: string[]; schemaVersion: number };
    expect(manifest.files).toHaveLength(7);
    expect(manifest.schemaVersion).toBe(1);
  });

  it('⭐ Story 6.20 (D11) — the export carries the nominee HISTORY: every version, decrypted, tombstone included', async () => {
    const { tx, client } = getTx();
    const { kms, kekRef } = fakeKms();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid, state: 'active', stateEventVersion: 4 });
    await enterAppScope(client, PARIWAR_A);
    const enc = async (v: string) =>
      serializeEnvelope(await encryptTier1(Buffer.from(v, 'utf-8'), { pariwarId: PARIWAR_A, fieldClass: 'member_nominee' }, kms, kekRef));
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, {
      nominees: [
        { nameCiphertext: await enc('Asha Devi'), mobileCiphertext: await enc('9876543210') },
        { nameCiphertext: await enc('Ravi Kumar'), mobileCiphertext: await enc('9988776655') },
      ],
      ensureMember: false,
    });
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, {
      nominees: [{ nameCiphertext: await enc('Asha Devi'), mobileCiphertext: await enc('9876543210') }],
      ensureMember: false,
    });
    const sections = await assembleMemberExport(
      tx,
      { kms, kekRef },
      { exportId: randomUUID(), memberId: toMemberId(mid), pariwarId: PARIWAR_A, now: NOW },
    );
    const profile = sections['profile.json'] as { nomineeHistory: { rank: number; versionNo: number; kind: string; name: string | null }[] };
    expect(profile.nomineeHistory.map((v) => [v.rank, v.versionNo, v.kind, v.name])).toEqual([
      [1, 1, 'declared', 'Asha Devi'],
      [1, 2, 'declared', 'Asha Devi'],
      [2, 1, 'declared', 'Ravi Kumar'],
      [2, 2, 'vacated', null],
    ]);
  });

  it('⭐ Story 6.20 (D16 / D11) — each version is exported WITH its determination status (the live marks)', async () => {
    const { tx, client } = getTx();
    const { kms, kekRef } = fakeKms();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid, state: 'active', stateEventVersion: 4 });
    await enterAppScope(client, PARIWAR_A);
    const enc = async (v: string) =>
      serializeEnvelope(await encryptTier1(Buffer.from(v, 'utf-8'), { pariwarId: PARIWAR_A, fieldClass: 'member_nominee' }, kms, kekRef));
    const nominee = async (name: string) => [{ nameCiphertext: await enc(name), mobileCiphertext: await enc('9876543210') }];
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, {
      nominees: await nominee('Asha Devi'),
      declaredAt: new Date('2026-01-10T06:00:00.000Z'),
      ensureMember: false,
    });
    await seedNomineeDeclaration(tx, PARIWAR_A, mid, {
      nominees: await nominee('Someone Else'),
      declaredAt: new Date('2026-06-01T06:00:00.000Z'),
      ensureMember: false,
    });
    const cid = randomUUID();
    await driveClaimTo(client, PARIWAR_A, cid, mid, 'verification_in_progress');
    const versions = await listNomineeDeclarationVersions(tx, PARIWAR_A, toMemberId(mid));
    // ⭐ A FIRST determination where everything stands, then SUPERSEDED by the honest one (code review
    // 2026-09-24b): only the LIVE marks are exported — a dropped `superseded_at IS NULL` would add `stands` to v2.
    await seedNomineeDetermination(client, PARIWAR_A, cid);
    await seedNomineeDetermination(client, PARIWAR_A, cid, {
      certificateDate: '2026-05-01',
      marks: versions.map((v) => ({ versionId: v.versionId, mark: v.versionNo === 1 ? 'stands' : 'discarded' })),
    });
    const sections = await assembleMemberExport(
      tx,
      { kms, kekRef },
      { exportId: randomUUID(), memberId: toMemberId(mid), pariwarId: PARIWAR_A, now: NOW },
    );
    const profile = sections['profile.json'] as { nomineeHistory: { versionNo: number; determinationMarks: string[] }[] };
    expect(profile.nomineeHistory.map((v) => [v.versionNo, v.determinationMarks])).toEqual([
      [1, ['stands']],
      [2, ['discarded']],
    ]);
  });

  it('⭐ Story 6.36b (SW17, AC12) — the export lists the people I named and who named me, with ONLY the names I already saw', async () => {
    const { tx, client } = getTx();
    const { kms, kekRef } = fakeKms();
    const pid = randomUUID(); // a fresh Pariwar — the default presentation mode applies
    const encName = async (v: string) =>
      serializeEnvelope(await encryptTier1(Buffer.from(v, 'utf-8'), { pariwarId: pid, fieldClass: 'member_kyc' }, kms, kekRef));
    const withName = async (name: string) => {
      const id = await seedMember(tx, pid, { state: 'active' });
      await tx.insert(schema.memberKycProfiles).values({
        memberId: toMemberId(id),
        pariwarId: pid as never,
        nameCiphertext: await encName(name),
        dobCiphertext: await encName('1980-01-01'),
        verificationStrength: 'aadhaar_kyc',
        source: 'digilocker',
      });
      return id;
    };
    const me = await withName('Asha Devi');
    const accepted = await withName('Meena Kumari');
    const asked = await withName('Sunita Rao');
    const declined = await withName('Rekha Singh');
    const namer = await withName('Ramesh Prasad');
    const ago = (d: number) => new Date(Date.now() - d * 86_400_000);
    const link = `INSERT INTO member_known_people (pariwar_id, namer_member_id, named_member_id, found_by, state, asked_at, responded_at, ended_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
    await client.query(link, [pid, me, accepted, 'contacts', 'accepted', ago(3), ago(2), null]);
    await client.query(link, [pid, me, asked, 'typed', 'asked', ago(1), null, null]);
    await client.query(link, [pid, me, declined, 'picker', 'declined', ago(2.9), ago(2), ago(2)]); // ordered by asked_at
    await client.query(link, [pid, namer, me, 'contacts', 'asked', ago(1), null, null]);
    // `2026-10-15-333` call 3: a link the OTHER member's erasure ended — on both lists — reads `ended`, ⛔ `erased`. The
    // erased members carry the anonymizer's name sentinel, as a real erasure leaves them.
    const erasedNamed = await withName(ANONYMIZED_SENTINEL);
    const erasedNamer = await withName(ANONYMIZED_SENTINEL);
    await client.query(link, [pid, me, erasedNamed, 'contacts', 'erased', ago(5), null, ago(4)]);
    await client.query(link, [pid, erasedNamer, me, 'typed', 'erased', ago(6), ago(5.5), ago(4)]);
    // `2026-10-15-334` call 1: on the members-who-named-me list a REMOVAL and an OPEN request whose namer a claim names
    // read EXACTLY like that erasure (the app shows each as simply leaving the list); an ACCEPTED one from a namer a claim
    // names stays (withdrawable — `-333` call 1), with its name.
    const remover = await withName('Suresh Pal');
    const deadOpen = await withName('Gita Rani');
    const deadAccepted = await withName('Hari Om');
    await client.query(link, [pid, remover, me, 'contacts', 'removed', ago(7), null, ago(6.5)]);
    await client.query(link, [pid, deadOpen, me, 'contacts', 'asked', ago(0.5), null, null]);
    await client.query(link, [pid, deadAccepted, me, 'picker', 'accepted', ago(8), ago(7.5), null]);
    // An unrecorded STALE `asked` (past 30 days) exports as what it is — `lapsed`, dated asked + 30 days, with the name
    // (engineering accuracy, fix-diff review round 2): a living namer's, and one whose namer's claim came only AFTER it
    // had lapsed (`2026-10-15-335` call 1 — a lapse the member let happen). The member's OWN ends from a namer reported
    // dead stay as they are (`-334` call 1).
    const deadStale = await withName('Lata Bai');
    const livingStale = await withName('Ram Lal');
    const deadDeclined = await withName('Uma Devi');
    await client.query(link, [pid, deadStale, me, 'typed', 'asked', ago(45), null, null]);
    await client.query(link, [pid, livingStale, me, 'typed', 'asked', ago(40), null, null]);
    await client.query(link, [pid, deadDeclined, me, 'typed', 'declined', ago(9), ago(8.8), ago(8.8)]);
    // and the member's OWN removal on THEIR list stays `removed`
    const iRemoved = await withName('Babu Rao');
    await client.query(link, [pid, me, iRemoved, 'picker', 'removed', ago(10), null, ago(9.5)]);
    // `2026-10-15-335` call 1: a request whose namer's claim was FILED while it was still OPEN was hidden then — it reads
    // `ended` for GOOD, past day 30, unrecorded or recorded `lapsed` (⛔ a day-30 switch telling the death apart).
    const hiddenStale = await withName('Kamla Devi');
    const hiddenRecorded = await withName('Shyam Lal');
    await client.query(link, [pid, hiddenStale, me, 'contacts', 'asked', ago(42), null, null]);
    await client.query(link, [pid, hiddenRecorded, me, 'contacts', 'lapsed', ago(50), null, ago(20)]);
    // an ACCEPTED link on MY list whose person was later erased: ⛔ a name built from the anonymizer's sentinel
    const erasedAfterAccept = await withName(ANONYMIZED_SENTINEL);
    await client.query(link, [pid, me, erasedAfterAccept, 'picker', 'erased', ago(11), ago(10.5), ago(3)]);
    const fileClaim = async (dead: string, filedAgoDays: number) => {
      await client.query(`SET LOCAL app.claim_state_writer = 'on'`);
      await client.query(
        `INSERT INTO claims (claim_case_id, pariwar_id, deceased_member_id, intake_channels, current_state, state_event_version, created_at)
         VALUES ($1, $2, $3, ARRAY['member_app']::claim_intake_channel[], 'intake_pending', 1, $4)`,
        [randomUUID(), pid, dead, ago(filedAgoDays)],
      );
      await client.query(`SET LOCAL app.claim_state_writer = 'off'`);
    };
    for (const dead of [deadOpen, deadAccepted, deadStale, deadDeclined]) await fileClaim(dead, 0.1); // filed now
    await fileClaim(hiddenStale, 37); // asked 42 days ago ⇒ filed on day 5, while it was open
    await fileClaim(hiddenRecorded, 45); // asked 50 days ago ⇒ filed on day 5, while it was open

    await enterAppScope(client, pid);
    const sections = await assembleMemberExport(tx, { kms, kekRef }, { exportId: randomUUID(), memberId: toMemberId(me), pariwarId: pid as never, now: NOW });
    const kp = (sections['profile.json'] as { knownPeople: { named: { name: string | null; state: string; foundBy: string }[]; namedBy: { name: string | null; state: string }[] } }).knownPeople;
    const shown = await import('../../../src/notifications/pool-identity.js');
    const mode = await (await import('../../../src/kyc/presentation-policy.js')).resolvePublicNamePresentationMode(tx, pid as never);
    expect(kp.named).toEqual([
      expect.objectContaining({ name: null, state: 'ended', foundBy: 'picker' }), // accepted, then ERASED (11 days) — ⛔ a name
      expect.objectContaining({ name: null, state: 'removed', foundBy: 'picker' }), // the member's OWN removal (10 days)
      expect.objectContaining({ name: null, state: 'ended', foundBy: 'contacts' }), // ⛔ `erased` (asked 5 days ago)
      expect.objectContaining({ name: shown.resolveMemberFacingDeceasedName(mode, 'Meena Kumari'), state: 'accepted', foundBy: 'contacts' }),
      expect.objectContaining({ name: null, state: 'declined', foundBy: 'picker' }), // ⛔ seen — the member saw only their saved name
      expect.objectContaining({ name: null, state: 'asked', foundBy: 'typed' }),
    ]);
    // namedBy, by asked_at: hidden while open, recorded lapsed (50 days) · the dead namer's stale ask whose claim came after
    // it lapsed (45) · hidden while open, unrecorded (42) · the living namer's stale ask (40) · the dead namer's decline (9)
    // · the dead namer's accepted (8) · the removal (7) · the erasure (6) · Ramesh (1) · the dead namer's open request (0.5).
    // The removal, the erasure and every request hidden while open read the SAME (`-334` call 1, `-335` call 1).
    const left = { name: null, state: 'ended', endedAt: null };
    const day = 86_400_000;
    // the two requests hidden while open (50 and 42 days) read `ended` for good — ⛔ `lapsed`, ⛔ a name, ⛔ a date
    expect(kp.namedBy.slice(0, 1)).toEqual([expect.objectContaining({ ...left, respondedAt: null })]); // 50 days (recorded lapse)
    expect(kp.namedBy.slice(1, 2)).toEqual([expect.objectContaining({ name: shown.resolveMemberFacingDeceasedName(mode, 'Lata Bai'), state: 'lapsed' })]);
    expect(kp.namedBy.slice(2, 3)).toEqual([expect.objectContaining({ ...left, respondedAt: null })]); // 42 days (unrecorded)
    const staleRows = [kp.namedBy[1], kp.namedBy[3]] as { name: string | null; state: string; askedAt: string; endedAt: string | null }[];
    for (const [row, who] of [[staleRows[0]!, 'Lata Bai'], [staleRows[1]!, 'Ram Lal']] as const) {
      expect(row).toMatchObject({ state: 'lapsed', name: shown.resolveMemberFacingDeceasedName(mode, who) });
      expect(Date.parse(row.endedAt!) - Date.parse(row.askedAt)).toBe(30 * day); // dated asked + 30 days
    }
    expect(kp.namedBy.slice(4)).toEqual([
      expect.objectContaining({ name: shown.resolveMemberFacingDeceasedName(mode, 'Uma Devi'), state: 'declined' }), // ⛔ touched
      expect.objectContaining({ name: shown.resolveMemberFacingDeceasedName(mode, 'Hari Om'), state: 'accepted' }),
      expect.objectContaining({ ...left, respondedAt: null }),
      expect.objectContaining({ ...left, respondedAt: expect.any(String) }), // the member's OWN answer stays
      expect.objectContaining({ name: shown.resolveMemberFacingDeceasedName(mode, 'Ramesh Prasad'), state: 'asked' }),
      expect.objectContaining({ ...left, respondedAt: null }),
    ]);
    for (const l of kp.namedBy) expect(l).not.toHaveProperty('foundBy'); // ⛔ how the NAMER found me
    expect(JSON.stringify(kp)).not.toContain('erased');
    expect(JSON.stringify(kp.namedBy)).not.toContain('removed'); // on THIS list a removal reads `ended` (the member's own stays on `named`)
    expect(JSON.stringify(kp)).not.toContain(ANONYMIZED_SENTINEL);
    // ⛔ a member id or a number of anyone else
    const json = JSON.stringify(kp);
    for (const id of [accepted, asked, declined, namer, erasedNamed, erasedNamer, remover, deadOpen, deadAccepted, deadStale, livingStale, deadDeclined, iRemoved, hiddenStale, hiddenRecorded, erasedAfterAccept]) {
      expect(json).not.toContain(id);
    }
  });

  it('⭐ `2026-10-15-335` call 1 at its edge — the EARLIEST claim decides, just before vs just after day 30 (in SQL, one interval)', async () => {
    const { tx, client } = getTx();
    const { kms, kekRef } = fakeKms();
    const pid = randomUUID();
    const encName = async (v: string) =>
      serializeEnvelope(await encryptTier1(Buffer.from(v, 'utf-8'), { pariwarId: pid, fieldClass: 'member_kyc' }, kms, kekRef));
    const withName = async (name: string) => {
      const id = await seedMember(tx, pid, { state: 'active' });
      await tx.insert(schema.memberKycProfiles).values({
        memberId: toMemberId(id),
        pariwarId: pid as never,
        nameCiphertext: await encName(name),
        dobCiphertext: await encName('1980-01-01'),
        verificationStrength: 'aadhaar_kyc',
        source: 'digilocker',
      });
      return id;
    };
    const day = 86_400_000;
    const hour = 3_600_000;
    const now = Date.now();
    const me = await withName('Asha Devi');
    const cases: { name: string; askedAgo: number; claimsAt: number[]; hidden: boolean }[] = [
      { name: 'Just Before', askedAgo: 40 * day, claimsAt: [40 * day - 30 * day + hour], hidden: true }, // filed 1 h before day 30
      { name: 'Just After', askedAgo: 41 * day, claimsAt: [41 * day - 30 * day - hour], hidden: false }, // filed 1 h after day 30
      // ONE claim inside the window (filed on day 4) and one AFTER it (day 39): only `min()` reads hidden — a `max()` would
      // read the later one and call it lapsed (fix-diff review round 5: both used to fall inside, so ⛔ discrimination)
      { name: 'Two Claims', askedAgo: 44 * day, claimsAt: [40 * day, 5 * day], hidden: true },
    ];
    const asked = new Map<string, string>();
    for (const c of cases) {
      const namer = await withName(c.name);
      const askedAt = new Date(now - c.askedAgo);
      asked.set(askedAt.toISOString(), c.name);
      await client.query(
        `INSERT INTO member_known_people (pariwar_id, namer_member_id, named_member_id, found_by, state, asked_at) VALUES ($1, $2, $3, 'typed', 'asked', $4)`,
        [pid, namer, me, askedAt],
      );
      for (const ago of c.claimsAt) {
        await client.query(`SET LOCAL app.claim_state_writer = 'on'`);
        await client.query(
          `INSERT INTO claims (claim_case_id, pariwar_id, deceased_member_id, intake_channels, current_state, state_event_version, created_at)
           VALUES ($1, $2, $3, ARRAY['member_app']::claim_intake_channel[], 'intake_pending', 1, $4)`,
          [randomUUID(), pid, namer, new Date(now - ago)],
        );
        await client.query(`SET LOCAL app.claim_state_writer = 'off'`);
      }
    }
    await enterAppScope(client, pid);
    const sections = await assembleMemberExport(tx, { kms, kekRef }, { exportId: randomUUID(), memberId: toMemberId(me), pariwarId: pid as never, now: NOW });
    const kp = (sections['profile.json'] as { knownPeople: { namedBy: { name: string | null; state: string; askedAt: string; endedAt: string | null }[] } }).knownPeople;
    const shown = await import('../../../src/notifications/pool-identity.js');
    const mode = await (await import('../../../src/kyc/presentation-policy.js')).resolvePublicNamePresentationMode(tx, pid as never);
    expect(kp.namedBy).toHaveLength(cases.length);
    for (const row of kp.namedBy) {
      const c = cases.find((x) => x.name === asked.get(row.askedAt))!;
      if (c.hidden) expect(row, c.name).toMatchObject({ state: 'ended', name: null, endedAt: null });
      else expect(row, c.name).toMatchObject({ state: 'lapsed', name: shown.resolveMemberFacingDeceasedName(mode, c.name) });
    }
  });

  it('assemble: a WITHDRAWN member still produces a valid payload (export up to withdrawal point)', async () => {
    const { tx, client } = getTx();
    const { kms, kekRef } = fakeKms();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid, state: 'withdrawn', stateEventVersion: 6 });
    await enterAppScope(client, PARIWAR_A);

    const sections = await assembleMemberExport(
      tx,
      { kms, kekRef },
      { exportId: randomUUID(), memberId: toMemberId(mid), pariwarId: PARIWAR_A, now: NOW },
    );
    const profile = sections['profile.json'] as { state: string | null };
    expect(profile.state).toBe('withdrawn');
    expect(sections['manifest.json']).toBeDefined();
  });

  it('RLS: a PARIWAR_B export row is invisible under PARIWAR_A scope', async () => {
    const { tx, client } = getTx();
    const midB = randomUUID();
    await seedMember(tx, PARIWAR_B, { memberId: midB });
    // Seed the B-tenant export as superuser (RLS bypassed) BEFORE entering A scope.
    const bRow = await insertDataExport(tx, {
      memberId: toMemberId(midB),
      pariwarId: PARIWAR_B,
      requestedAt: NOW,
    });

    await enterAppScope(client, PARIWAR_A);
    const invisible = await getExportForMember(tx, toDataExportId(bRow.exportId), toMemberId(midB));
    expect(invisible).toBeNull();
  });

  it('FK cascade (RTBF): deleting the member sweeps its data_exports row', async () => {
    const { tx } = getTx();
    const mid = randomUUID();
    await seedMember(tx, PARIWAR_A, { memberId: mid });
    const memberId = toMemberId(mid);
    const row = await insertDataExport(tx, { memberId, pariwarId: PARIWAR_A, requestedAt: NOW });

    // Delete as superuser (pre-scope) — the FK cascade removes the export.
    await tx.delete(schema.members).where(eq(schema.members.memberId, memberId));
    const after = await tx
      .select()
      .from(schema.dataExports)
      .where(eq(schema.dataExports.exportId, toDataExportId(row.exportId)));
    expect(after).toHaveLength(0);
  });
});
