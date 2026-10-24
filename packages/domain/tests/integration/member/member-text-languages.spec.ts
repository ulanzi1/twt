// Story 5.11b (AC5; `2026-10-25-404` FS5 (a)) — the members' TEXT language, set-based, on a live DB as `twt_app` under the
// Pariwar's scope (RLS — T19), after a superuser seed. Per-test ROLLBACK (`setupLiveDb`).
//   · a member who chose `en` in a `hi` Pariwar ⇒ `en`; a non-chooser ⇒ the Pariwar's default; a listed member with ⛔ `members`
//     row ⇒ the default (a DELIBERATE departure from `resolvePeerRequestLocale`, which throws);
//   · ⛔ passport row ⇒ `null` (the caller omits every text — ⛔ a guess);
//   · ⭐ ONE statement for the whole list (a query-count assertion), and ANOTHER Pariwar's passport never multiplies the rows
//     (the `WHERE pp.pariwar_id` — `pariwar_passport`'s SELECT policy is `USING (true)`).

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { bindScopedDb } from '../../../src/db.js';
import { pariwarId as toPariwarId } from '../../../src/ids/index.js';
import { readMemberTextLanguages } from '../../../src/member/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope, seedPassport } from '../_helpers.js';

type Client = ReturnType<typeof getTx>['client'];

async function seedMembers(client: Client, pid: string, locales: readonly ('hi' | 'en' | null)[]): Promise<string[]> {
  const out: string[] = [];
  for (const locale of locales) {
    const mid = randomUUID();
    await client.query(
      `INSERT INTO members (member_id, pariwar_id, state, state_event_version, preferred_locale, preferred_locale_set_at)
       VALUES ($1, $2, 'active', 1, $3::locale, CASE WHEN $3::text IS NULL THEN NULL ELSE now() END)`,
      [mid, pid, locale],
    );
    out.push(mid);
  }
  return out;
}

/** Count the statements a client runs (the one-query property). */
function counting(client: Client): { count: () => number; restore: () => void } {
  let n = 0;
  const original = client.query.bind(client) as (...a: unknown[]) => unknown;
  (client as unknown as { query: unknown }).query = (...a: unknown[]) => {
    n += 1;
    return original(...a);
  };
  return { count: () => n, restore: () => ((client as unknown as { query: unknown }).query = original) };
}

describe.skipIf(!hasDatabase)('Story 5.11b — the members\' TEXT language (domain, live, role=twt_app)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('⭐ an `en` chooser in a `hi` Pariwar ⇒ en; a non-chooser ⇒ the default; ⛔ member row ⇒ the default — in ONE statement', async () => {
    const { tx, client } = getTx();
    const pid = randomUUID();
    await seedPassport(tx, pid, { localeDefault: 'hi' });
    // Another Pariwar's passport — must ⛔ multiply the rows (USING (true) on pariwar_passport).
    await seedPassport(tx, randomUUID(), { localeDefault: 'en' });
    const [chooser, nonChooser, hiChooser] = await seedMembers(client, pid, ['en', null, 'hi']);
    const ghost = randomUUID();
    await enterAppScope(client, pid);
    const counter = counting(client);
    try {
      const got = await readMemberTextLanguages(bindScopedDb(client), {
        pariwarId: toPariwarId(pid),
        memberIds: [chooser!, nonChooser!, hiChooser!, ghost.toUpperCase()],
      });
      expect(counter.count()).toBe(1);
      expect(got).toEqual(
        new Map([
          [chooser, 'en'],
          [nonChooser, 'hi'],
          [hiChooser, 'hi'],
          [ghost, 'hi'],
        ]),
      );
    } finally {
      counter.restore();
    }
  });

  it('⛔ passport row for the Pariwar ⇒ `null` (⛔ a guess, ⛔ a throw)', async () => {
    const { tx, client } = getTx();
    await seedPassport(tx, randomUUID(), { localeDefault: 'en' });
    const pid = randomUUID();
    await enterAppScope(client, pid);
    expect(await readMemberTextLanguages(bindScopedDb(client), { pariwarId: toPariwarId(pid), memberIds: [randomUUID()] })).toBeNull();
  });

  it('an `en` Pariwar default reaches a non-chooser; an empty list is ⛔ statement', async () => {
    const { tx, client } = getTx();
    const pid = randomUUID();
    await seedPassport(tx, pid, { localeDefault: 'en' });
    const [m] = await seedMembers(client, pid, [null]);
    await enterAppScope(client, pid);
    const counter = counting(client);
    try {
      expect(await readMemberTextLanguages(bindScopedDb(client), { pariwarId: toPariwarId(pid), memberIds: [] })).toEqual(new Map());
      expect(counter.count()).toBe(0);
    } finally {
      counter.restore();
    }
    expect(await readMemberTextLanguages(bindScopedDb(client), { pariwarId: toPariwarId(pid), memberIds: [m!] })).toEqual(new Map([[m, 'en']]));
  });
});
