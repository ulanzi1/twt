// Story 6.36c (Task 3.3, 3.4; AC7) — a Pariwar Admin's people-who-know-me campaigns, live DB, per-test ROLLBACK, as
// `twt_app` in scope. Dates are relative to the DB's IST day (the ONE clock the writer and the prompts read).
//   · the window: real dates, ⛔ an end before the start, at most 30 days INCLUSIVE, ⛔ a start before today;
//   · ⛔ an overlap with an OPEN campaign (live or scheduled) — a finished or ended one ⛔ blocks;
//   · end: any OPEN campaign (a scheduled one is cancelled); already ended / past ⇒ not_live; unknown / another Pariwar's ⇒
//     not_found; the actor recorded;
//   · the list: newest first, the status, keyset pages;
//   · ⛔ a message: the module imports ⛔ `@twt/channels` (a source scan).

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { PariwarId } from '../../../src/ids/index.js';
import { endCampaign, KnownPeopleCampaignRefusedError, listCampaigns, startCampaign } from '../../../src/member/known-people-campaigns.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { enterAppScope } from '../_helpers.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ACTOR = '0a0a0a0a-0000-4000-8000-000000000002';

async function refusal(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (err) {
    if (err instanceof KnownPeopleCampaignRefusedError) return err.code;
    throw err;
  }
  throw new Error('expected a refusal');
}

/** The DB's IST day plus `n` days, `YYYY-MM-DD`. */
async function day(n: number): Promise<string> {
  const { rows } = await getTx().client.query<{ d: string }>(
    `SELECT to_char((clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date + $1::int, 'YYYY-MM-DD') AS d`,
    [n],
  );
  return rows[0]!.d;
}

async function scoped(): Promise<PariwarId> {
  const p = toPariwarId(randomUUID());
  await enterAppScope(getTx().client, p);
  return p;
}

describe('the campaign module sends ⛔ message', () => {
  it('imports ⛔ @twt/channels, ⛔ a dispatcher, ⛔ an SMS / push / WhatsApp sender', () => {
    const src = fs.readFileSync(path.resolve(here, '../../../src/member/known-people-campaigns.ts'), 'utf8');
    const imports = [...src.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]);
    expect(imports.some((i) => /channels|dispatch|sms|push|whatsapp|notif/i.test(i!))).toBe(false);
  });
});

describe.skipIf(!hasDatabase)('Story 6.36c — the campaigns (live DB)', { timeout: 20000 }, () => {
  setupLiveDb();

  it('the window: real dates; ⛔ end before start; ≤ 30 days INCLUSIVE; ⛔ a start before today', async () => {
    const { tx } = getTx();
    const p = await scoped();
    const start = (startsOn: string, endsOn: string) => startCampaign(tx, { pariwarId: p, actorId: ACTOR, startsOn, endsOn });
    expect(await refusal(start('2026-02-30', '2026-03-01'))).toBe('known_people_campaign.window_invalid');
    expect(await refusal(start(await day(5), await day(4)))).toBe('known_people_campaign.window_invalid');
    expect(await refusal(start(await day(1), await day(31)))).toBe('known_people_campaign.window_invalid'); // 31 days
    expect(await refusal(start(await day(-1), await day(3)))).toBe('known_people_campaign.window_invalid');
    const c = await start(await day(0), await day(29)); // 30 days, from today
    expect(c).toMatchObject({ startsOn: await day(0), endsOn: await day(29), status: 'live', endedAt: null });
    const { rows } = await getTx().client.query(`SELECT started_by_actor_id FROM known_people_campaigns WHERE campaign_id = $1`, [c.campaignId]);
    expect(rows[0]).toEqual({ started_by_actor_id: ACTOR });
  });

  it('⛔ an overlap with an OPEN campaign (live or scheduled); a touching window overlaps; after the end, a new one starts', async () => {
    const { tx } = getTx();
    const p = await scoped();
    const start = (a: number, b: number) => (async () => startCampaign(tx, { pariwarId: p, actorId: ACTOR, startsOn: await day(a), endsOn: await day(b) }))();
    const live = await start(0, 5);
    expect(await refusal(start(5, 9))).toBe('known_people_campaign.overlap'); // shares day 5
    const scheduled = await start(6, 10);
    expect(scheduled.status).toBe('scheduled');
    expect(await refusal(start(8, 12))).toBe('known_people_campaign.overlap');
    // Ending the live one frees its days.
    await endCampaign(tx, { pariwarId: p, campaignId: live.campaignId, actorId: ACTOR });
    expect((await start(0, 4)).status).toBe('live');
    // Another Pariwar is ⛔ blocked by this one.
    const q = await scoped();
    expect((await startCampaign(tx, { pariwarId: q, actorId: ACTOR, startsOn: await day(0), endsOn: await day(5) })).status).toBe('live');
  });

  it('a FINISHED campaign (its window passed) ⛔ blocks, and cannot be ended', async () => {
    const { tx, client } = getTx();
    const p = await scoped();
    const id = randomUUID();
    await client.query(
      `INSERT INTO known_people_campaigns (campaign_id, pariwar_id, started_by_actor_id, starts_on, ends_on) VALUES ($1, $2, $3, $4::date, $5::date)`,
      [id, p, ACTOR, await day(-10), await day(-1)],
    );
    expect(await refusal(endCampaign(tx, { pariwarId: p, campaignId: id, actorId: ACTOR }))).toBe('known_people_campaign.not_live');
    expect((await startCampaign(tx, { pariwarId: p, actorId: ACTOR, startsOn: await day(0), endsOn: await day(3) })).status).toBe('live');
  });

  it('end: a scheduled one is cancelled; twice ⇒ not_live; unknown / another Pariwar’s ⇒ not_found; the actor recorded', async () => {
    const { tx, client } = getTx();
    const p = await scoped();
    const c = await startCampaign(tx, { pariwarId: p, actorId: ACTOR, startsOn: await day(3), endsOn: await day(6) });
    const ended = await endCampaign(tx, { pariwarId: p, campaignId: c.campaignId, actorId: ACTOR });
    expect(ended.status).toBe('ended');
    expect(ended.endedAt).toBeInstanceOf(Date);
    const { rows } = await client.query(`SELECT ended_by_actor_id FROM known_people_campaigns WHERE campaign_id = $1`, [c.campaignId]);
    expect(rows[0]).toEqual({ ended_by_actor_id: ACTOR });
    expect(await refusal(endCampaign(tx, { pariwarId: p, campaignId: c.campaignId, actorId: ACTOR }))).toBe('known_people_campaign.not_live');
    expect(await refusal(endCampaign(tx, { pariwarId: p, campaignId: randomUUID(), actorId: ACTOR }))).toBe('known_people_campaign.not_found');
    expect(await refusal(endCampaign(tx, { pariwarId: p, campaignId: 'nope', actorId: ACTOR }))).toBe('known_people_campaign.not_found');
    const q = await scoped();
    const theirs = await startCampaign(tx, { pariwarId: q, actorId: ACTOR, startsOn: await day(0), endsOn: await day(1) });
    await enterAppScope(client, p);
    expect(await refusal(endCampaign(tx, { pariwarId: p, campaignId: theirs.campaignId, actorId: ACTOR }))).toBe('known_people_campaign.not_found');
  });

  it('the list: newest first, the status, keyset pages', async () => {
    const { tx, client } = getTx();
    const p = await scoped();
    // Seeded RAW with distinct created_at (one transaction's now() ties).
    const ids: string[] = [];
    for (const [i, [a, b, ended]] of ([
      [-10, -5, false],
      [0, 3, false],
      [5, 8, true],
    ] as const).entries()) {
      const id = randomUUID();
      ids.push(id);
      await client.query(
        `INSERT INTO known_people_campaigns (campaign_id, pariwar_id, started_by_actor_id, starts_on, ends_on, ended_at, ended_by_actor_id, created_at)
         VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, now() - make_interval(mins => $8::int))`,
        [id, p, ACTOR, await day(a), await day(b), ended ? new Date() : null, ended ? ACTOR : null, 10 - i],
      );
    }
    const all = await listCampaigns(tx, { pariwarId: p });
    expect(all.items.map((c) => [c.campaignId, c.status])).toEqual([
      [ids[2], 'ended'],
      [ids[1], 'live'],
      [ids[0], 'finished'],
    ]);
    const page1 = await listCampaigns(tx, { pariwarId: p, limit: 2 });
    expect(page1.hasMore).toBe(true);
    const page2 = await listCampaigns(tx, { pariwarId: p, limit: 2, cursor: page1.nextCursor! });
    expect([...page1.items, ...page2.items].map((c) => c.campaignId)).toEqual([ids[2], ids[1], ids[0]]);
    expect(page2.hasMore).toBe(false);
  });
});
