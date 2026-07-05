// Determinism-replay RUN BODY — Story 5.1 (Task 6; the AC5 P0 gate, RENDER phase only).
//
// Renders a FIXED alert_id payload on every channel and hashes each rendered message. Kept as a TS module
// (type-checked, the real `render`) that the thin `determinism.worker.mjs` dynamic-imports under a
// tsx-registered worker (Node 22's native type-stripping doesn't remap `.js`→`.ts`, so the worker
// registers tsx at runtime and imports this). Pure — no DB, no network.
//
// ⚠ Exercises `render` ONLY — never `send` (AC5: provider delivery is non-deterministic and outside the
// guarantee). The payload carries markdown/template/HTML in an admin-authored field so the gate also pins
// the ESCAPING output as part of the byte-identical guarantee.

import { createHash } from 'node:crypto';

import type { Alert } from '@twt/contracts';
import { canonicalJsonStringify } from '@twt/domain';

import { deepFreeze } from '../src/freeze.js';
import type { Channel } from '../src/provider.js';
import { render } from '../src/render.js';

const CHANNELS: readonly Channel[] = ['push', 'whatsapp', 'sms', 'telegram'];

// A telegram-eligible announcement so all four channels render. Injection-y title/body pins escaping too.
const ALERT: Alert = deepFreeze({
  alert_id: '11111111-1111-4111-8111-111111111111',
  pariwar_id: '22222222-2222-4222-8222-222222222222',
  member_id: '33333333-3333-4333-8333-333333333333',
  alert_category: 'alert_published',
  time_critical: false,
  provenance_refs: {},
  created_at: '2026-07-05T10:00:00.000Z',
  created_by_actor: 'system',
  payload_data: { title: 'Monsoon **drive**', body: 'Join <b>Saturday</b> {{name}} ${env}' },
}) as Alert;

/** Hash one channel's rendered output (raw-bytes equality via canonical-JSON → sha256; AC5). */
function hashRendered(channel: Channel): string {
  const rendered = render(ALERT, channel);
  return createHash('sha256').update(canonicalJsonStringify(rendered), 'utf-8').digest('hex');
}

/** Run `runs` render passes per channel and return the collected hashes (the worker collects these). */
export function runBatch(runs: number): Record<Channel, string[]> {
  const out: Record<Channel, string[]> = { push: [], whatsapp: [], sms: [], telegram: [] };
  for (let i = 0; i < runs; i++) {
    for (const channel of CHANNELS) out[channel].push(hashRendered(channel));
  }
  return out;
}
