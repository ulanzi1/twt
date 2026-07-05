// APNs (Apple Push Notification service) provider — iOS push transport for the `push` channel. Story 5.1
// STUB (AC2). Real integration lands in Story 5.2. Auth-lifecycle refresh (APNs auth token) + quota
// self-regulation plug in per ./_stub.ts. The stub `send` omits its params (see fcm.ts note).

import type { ChannelProvider, SendResult, SendStatus } from '../provider.js';
import { stubSendResult, stubSendStatus } from './_stub.js';

export const apnsProvider: ChannelProvider = {
  id: 'apns',
  channel: 'push',
  scope: 'global',
  send(): Promise<SendResult> {
    return Promise.resolve(stubSendResult('apns', 'push'));
  },
  getStatus(messageId: string): Promise<SendStatus> {
    return Promise.resolve(stubSendStatus(messageId));
  },
};
