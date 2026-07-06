// pariwar_wa_config + pariwar_wa_templates accessors — live-DB integration (Story 5.3, Task 1; AC3).
//
// Drives the domain WA-config accessors against real Postgres inside the per-test BEGIN/ROLLBACK envelope.
// Families:
//   · config upsert + read — upsertWaConfig persists the singleton; getWaConfig reads it back; a second
//     upsert is latest-wins on pariwar_id.
//   · credential is a NAME pointer — accessTokenSecretName stores the NAME verbatim (never resolved).
//   · template approval-status filtering — resolveApprovedTemplate returns null when no `approved` row
//     exists (pending/rejected/paused don't qualify), and the approved template once one is present.
//   · FK cascade — deleting the config sweeps its templates.
//   · cross-tenant RLS — a PARIWAR_B config/template is invisible under PARIWAR_A scope.

import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  getWaConfig,
  listWaTemplates,
  resolveApprovedTemplate,
  upsertWaConfig,
  upsertWaTemplate,
} from '../../../src/channel-config/index.js';
import { pariwarId as toPariwarId } from '../../../src/ids/index.js';
import * as schema from '../../../src/schema/index.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';

function baseConfig(pariwar: string) {
  return {
    pariwarId: toPariwarId(pariwar),
    enabled: true,
    displayPhoneNumber: '+91 98765 43210',
    phoneNumberId: '1234567890',
    wabaId: 'waba-abc',
    accessTokenSecretName: 'twt-wa-token-pariwar-a',
    graphApiVersion: 'v21.0',
    updatedByActor: null,
  };
}

describe.skipIf(!hasDatabase)('pariwar_wa_config accessors — upsert + template gating + RLS (:5433)', () => {
  setupLiveDb();

  it('upsertWaConfig persists the singleton; getWaConfig reads it back (NAME stored verbatim)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    await upsertWaConfig(tx, baseConfig(PARIWAR_A));
    const cfg = await getWaConfig(tx, toPariwarId(PARIWAR_A));

    expect(cfg).not.toBeNull();
    expect(cfg!.enabled).toBe(true);
    expect(cfg!.phoneNumberId).toBe('1234567890');
    // The credential column stores the NAME pointer verbatim — never a resolved token value.
    expect(cfg!.accessTokenSecretName).toBe('twt-wa-token-pariwar-a');
    expect(cfg!.graphApiVersion).toBe('v21.0');
  });

  it('upsertWaConfig is latest-wins on the pariwar_id singleton key', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);

    await upsertWaConfig(tx, baseConfig(PARIWAR_A));
    await upsertWaConfig(tx, { ...baseConfig(PARIWAR_A), enabled: false, accessTokenSecretName: null });

    const cfg = await getWaConfig(tx, toPariwarId(PARIWAR_A));
    expect(cfg!.enabled).toBe(false);
    // NULL credential NAME ⇒ the composition layer resolves the channel to the fixture.
    expect(cfg!.accessTokenSecretName).toBeNull();
    // Still exactly one row (singleton).
    const rows = await tx.select().from(schema.pariwarWaConfig).where(eq(schema.pariwarWaConfig.pariwarId, toPariwarId(PARIWAR_A)));
    expect(rows).toHaveLength(1);
  });

  it('getWaConfig returns null when no config row exists (⇒ fixture)', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    expect(await getWaConfig(tx, toPariwarId(PARIWAR_A))).toBeNull();
  });

  it('resolveApprovedTemplate: null until an approved row exists; returns the approved template once present', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await upsertWaConfig(tx, baseConfig(PARIWAR_A));

    // A pending row does NOT make the category WA-eligible.
    await upsertWaTemplate(tx, toPariwarId(PARIWAR_A), 'contribution_confirmed', {
      templateName: 'contrib_v1',
      languageCode: 'en',
      approvalStatus: 'pending',
    });
    expect(await resolveApprovedTemplate(tx, toPariwarId(PARIWAR_A), 'contribution_confirmed')).toBeNull();

    // Approving it (latest-wins on the (pariwar, category) key) makes it eligible.
    await upsertWaTemplate(tx, toPariwarId(PARIWAR_A), 'contribution_confirmed', {
      templateName: 'contrib_v1',
      languageCode: 'en',
      approvalStatus: 'approved',
    });
    const approved = await resolveApprovedTemplate(tx, toPariwarId(PARIWAR_A), 'contribution_confirmed');
    expect(approved).toEqual({ templateName: 'contrib_v1', languageCode: 'en' });

    // A different, un-approved category stays ineligible.
    expect(await resolveApprovedTemplate(tx, toPariwarId(PARIWAR_A), 'claim_status_change')).toBeNull();

    // listWaTemplates surfaces the one mapping.
    const list = await listWaTemplates(tx, toPariwarId(PARIWAR_A));
    expect(list).toHaveLength(1);
    expect(list[0]!.alertCategory).toBe('contribution_confirmed');
  });

  it('FK cascade: deleting the config sweeps its templates', async () => {
    const { tx, client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await upsertWaConfig(tx, baseConfig(PARIWAR_A));
    await upsertWaTemplate(tx, toPariwarId(PARIWAR_A), 'alert_published', {
      templateName: 'ann_v1',
      languageCode: 'en',
      approvalStatus: 'approved',
    });
    expect(await listWaTemplates(tx, toPariwarId(PARIWAR_A))).toHaveLength(1);

    await tx.delete(schema.pariwarWaConfig).where(eq(schema.pariwarWaConfig.pariwarId, toPariwarId(PARIWAR_A)));
    expect(await listWaTemplates(tx, toPariwarId(PARIWAR_A))).toHaveLength(0);
  });

  it('cross-tenant RLS: a PARIWAR_B config + template is invisible under PARIWAR_A scope', async () => {
    const { tx, client } = getTx();

    // Seed B's config + template as superuser (RLS bypassed) BEFORE entering A's scope.
    await tx.insert(schema.pariwarWaConfig).values(baseConfig(PARIWAR_B));
    await tx.insert(schema.pariwarWaTemplates).values({
      pariwarId: toPariwarId(PARIWAR_B),
      alertCategory: 'alert_published',
      templateName: 'b_ann_v1',
      languageCode: 'hi',
      approvalStatus: 'approved',
    });

    await enterAppScope(client, PARIWAR_A);
    // Under A's scope, B's config + template are invisible.
    expect(await getWaConfig(tx, toPariwarId(PARIWAR_B))).toBeNull();
    expect(await listWaTemplates(tx, toPariwarId(PARIWAR_B))).toHaveLength(0);
    expect(await resolveApprovedTemplate(tx, toPariwarId(PARIWAR_B), 'alert_published')).toBeNull();
  });
});
