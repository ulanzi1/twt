// Story 6.35 (Task 1.4; AC1 / LS1 (a), LS2, I1) — the member's chosen app language, the domain half, on a live DB. Per-test
// ROLLBACK (`setupLiveDb`); every read / write runs as `twt_app` in the member's Pariwar (RLS), after a superuser seed.
//   · ⛔ choice ⇒ `chosenLocale: null` + the Pariwar's default;
//   · a change writes both columns and reports `changed: true`; a repeat of the same value is ⛔ write (`changed: false`,
//     `preferred_locale_set_at` unchanged — backdated first, T11);
//   · ⛔ passport / ⛔ member row in this Pariwar ⇒ the typed errors (the API's 503 / 409); a member of ANOTHER Pariwar is ⛔ reached;
//   · the 0179 CHECK — both columns set together or neither.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { bindScopedDb } from '../../../src/db.js';
import { memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import {
  MemberLanguageMemberMissingError,
  MemberLanguagePassportMissingError,
  getMemberLanguage,
  setMemberLanguage,
} from '../../../src/member/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope, seedPassport } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

async function seedMember(o: { localeDefault?: 'hi' | 'en' } = {}) {
  const { tx, client } = getTx();
  const pid = toPariwarId(randomUUID());
  const mid = toMemberId(randomUUID());
  await seedPassport(tx, pid, { localeDefault: o.localeDefault ?? 'hi' });
  await client.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [mid, pid]);
  await enterAppScope(client, pid);
  return { pid, mid, db: bindScopedDb(client) };
}

async function memberRow(client: Client, mid: string) {
  await client.query('RESET ROLE');
  const { rows } = await client.query<{ preferred_locale: string | null; preferred_locale_set_at: Date | null }>(
    `SELECT preferred_locale::text AS preferred_locale, preferred_locale_set_at FROM members WHERE member_id = $1`,
    [mid],
  );
  await client.query('SET LOCAL ROLE twt_app');
  return rows[0]!;
}

describe.skipIf(!hasDatabase)('Story 6.35 — the member\'s chosen language (domain, live)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⛔ choice ⇒ `chosenLocale: null` and the Pariwar\'s default; the row stays NULL (I1)', async () => {
    const { pid, mid, db } = await seedMember({ localeDefault: 'en' });
    expect(await getMemberLanguage(db, { pariwarId: pid, memberId: mid })).toEqual({ chosenLocale: null, pariwarDefaultLocale: 'en' });
    expect(await memberRow(getTx().client, mid)).toEqual({ preferred_locale: null, preferred_locale_set_at: null });
  });

  it('⭐ a change writes both columns (`changed: true`); a repeat is ⛔ write (`changed: false`, `set_at` unchanged); a second change writes', async () => {
    const { pid, mid, db } = await seedMember();
    const { client } = getTx();
    expect(await setMemberLanguage(db, { pariwarId: pid, memberId: mid, locale: 'en' })).toEqual({
      chosenLocale: 'en',
      pariwarDefaultLocale: 'hi',
      changed: true,
    });
    const first = await memberRow(client, mid);
    expect(first.preferred_locale).toBe('en');
    expect(first.preferred_locale_set_at).not.toBeNull();
    // T11 — `now()` is the TRANSACTION's clock, so a repeat in this tx would leave `set_at` "unchanged" even if it wrote: backdate
    // it first, so a write would be SEEN.
    await client.query('RESET ROLE');
    await client.query(`UPDATE members SET preferred_locale_set_at = '2026-01-01T00:00:00Z' WHERE member_id = $1`, [mid]);
    await client.query('SET LOCAL ROLE twt_app');
    expect(await setMemberLanguage(db, { pariwarId: pid, memberId: mid, locale: 'en' })).toMatchObject({ changed: false });
    expect((await memberRow(client, mid)).preferred_locale_set_at?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(await setMemberLanguage(db, { pariwarId: pid, memberId: mid, locale: 'hi' })).toMatchObject({ chosenLocale: 'hi', changed: true });
    const second = await memberRow(client, mid);
    expect(second.preferred_locale).toBe('hi');
    expect(second.preferred_locale_set_at!.getTime()).toBeGreaterThan(new Date('2026-01-01T00:00:00Z').getTime());
    expect(await getMemberLanguage(db, { pariwarId: pid, memberId: mid })).toEqual({ chosenLocale: 'hi', pariwarDefaultLocale: 'hi' });
  });

  it('⛔ passport ⇒ MemberLanguagePassportMissingError; ⛔ member row in this Pariwar ⇒ MemberLanguageMemberMissingError (⛔ write)', async () => {
    const { pid, mid, db } = await seedMember();
    await expect(getMemberLanguage(db, { pariwarId: toPariwarId(randomUUID()), memberId: mid })).rejects.toBeInstanceOf(
      MemberLanguagePassportMissingError,
    );
    await expect(setMemberLanguage(db, { pariwarId: pid, memberId: toMemberId(randomUUID()), locale: 'en' })).rejects.toBeInstanceOf(
      MemberLanguageMemberMissingError,
    );
  });

  it('a member of ANOTHER Pariwar is ⛔ reached (RLS + the explicit predicate)', async () => {
    const a = await seedMember();
    const { tx, client } = getTx();
    await client.query('RESET ROLE');
    const other = toPariwarId(randomUUID());
    const stranger = toMemberId(randomUUID());
    await seedPassport(tx, other, { localeDefault: 'hi' });
    await client.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [stranger, other]);
    await enterAppScope(client, a.pid);
    await expect(setMemberLanguage(a.db, { pariwarId: a.pid, memberId: stranger, locale: 'en' })).rejects.toBeInstanceOf(
      MemberLanguageMemberMissingError,
    );
    expect((await memberRow(client, stranger)).preferred_locale).toBeNull();
  });

  it('the 0179 CHECK — `preferred_locale` and `preferred_locale_set_at` are set together or neither', async () => {
    const { mid } = await seedMember();
    const { client } = getTx();
    await client.query('RESET ROLE');
    await client.query('SAVEPOINT c');
    await expect(client.query(`UPDATE members SET preferred_locale = 'en' WHERE member_id = $1`, [mid])).rejects.toMatchObject({
      constraint: 'members_preferred_locale_set_at_check',
    });
    await client.query('ROLLBACK TO SAVEPOINT c');
  });
});
