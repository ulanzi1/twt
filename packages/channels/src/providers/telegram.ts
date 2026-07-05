// Telegram provider — the `telegram` parallel mirror side-channel (announcements-only; the category
// eligibility gate lives in dispatch.ts, NOT here). Story 5.1 STUB (AC2). Real Telegram Bot API
// integration lands in Story 5.5. Auth-lifecycle refresh (bot token) + quota self-regulation plug in per
// ./_stub.ts. The stub `send` omits its params (see fcm.ts note).

import type { ChannelProvider, SendResult, SendStatus } from '../provider.js';
import { stubSendResult, stubSendStatus } from './_stub.js';

export const telegramProvider: ChannelProvider = {
  id: 'telegram',
  channel: 'telegram',
  scope: 'global',
  send(): Promise<SendResult> {
    return Promise.resolve(stubSendResult('telegram', 'telegram'));
  },
  getStatus(messageId: string): Promise<SendStatus> {
    return Promise.resolve(stubSendStatus(messageId));
  },
};
