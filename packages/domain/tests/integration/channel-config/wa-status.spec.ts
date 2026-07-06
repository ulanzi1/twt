// whatsapp_send_status accessors — live-DB integration (Story 5.3, Task 3; AC5).
//
// The per-send WA delivery-status persistence seam Story 5.4's webhook receiver consumes. Families:
//   · upsert + read — upsertWaSendStatus persists a status keyed by wamid; getWaSendStatus reads it back.
//   · latest-wins — a later status for the same wamid overwrites (sent → delivered → read/failed monotone).
//   · cross-tenant RLS — a PARIWAR_B status is invisible under PARIWAR_A scope.

import { describe, expect, it } from 'vitest';

import { getWaSendStatus, upsertWaSendStatus } from '../../../src/channel-config/index.js';
import { pariwarId as toPariwarId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

describe.skipIf(!hasDatabase)('whatsapp_send_status accessors — upsert + latest-wins + RLS (:5433)', () => {
  setupLiveDb();

  it('upsert persists a status keyed by wamid; getWaSendStatus reads it back; latest-wins on redelivery', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    await upsertWaSendStatus(tx, {
      wamid: 'wamid.ONE',
      pariwarId: toPariwarId(PARIWAR_A),
      state: 'sent',
      metaStatus: 'sent',
    });
    let row = await getWaSendStatus(tx, 'wamid.ONE');
    expect(row!.state).toBe('sent');
    expect(row!.metaStatus).toBe('sent');

    // A later webhook status for the same wamid overwrites (monotone progression).
    await upsertWaSendStatus(tx, {
      wamid: 'wamid.ONE',
      pariwarId: toPariwarId(PARIWAR_A),
      state: 'delivered',
      metaStatus: 'delivered',
    });
    row = await getWaSendStatus(tx, 'wamid.ONE');
    expect(row!.state).toBe('delivered');
  });

  it('cross-tenant RLS: a PARIWAR_B status is invisible under PARIWAR_A scope', async () => {
    const { tx, client } = getTx();

    // Seed B's status as superuser (RLS bypassed) BEFORE entering A's scope.
    await tx.insert(schema.whatsappSendStatus).values({
      wamid: 'wamid.B',
      pariwarId: toPariwarId(PARIWAR_B),
      state: 'delivered',
      metaStatus: 'delivered',
    });

    await enterAppScope(client, PARIWAR_A);
    expect(await getWaSendStatus(tx, 'wamid.B')).toBeNull();
  });
});
