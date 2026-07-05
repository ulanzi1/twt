// WhatsApp Business provider — the `whatsapp` channel (UTILITY templates only; dual-gated by admin toggle
// AND member opt-in, enforced by the delivery resolver, not here). Story 5.1 STUB (AC2). Real WA Business
// Platform integration lands in Story 5.3. Auth-lifecycle refresh (WA partner JWT) + quota
// self-regulation + `scope: 'per-pariwar'` credential wiring plug in per ./_stub.ts. The stub `send` omits
// its params (see fcm.ts note).

import type { ChannelProvider, SendResult, SendStatus } from '../provider.js';
import { stubSendResult, stubSendStatus } from './_stub.js';

export const whatsappBusinessProvider: ChannelProvider = {
  id: 'whatsapp-business',
  channel: 'whatsapp',
  scope: 'global',
  send(): Promise<SendResult> {
    return Promise.resolve(stubSendResult('whatsapp-business', 'whatsapp'));
  },
  getStatus(messageId: string): Promise<SendStatus> {
    return Promise.resolve(stubSendStatus(messageId));
  },
};
