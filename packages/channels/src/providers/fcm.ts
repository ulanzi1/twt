// FCM (Firebase Cloud Messaging) provider — Android push transport for the `push` channel. Story 5.1 STUB
// (AC2). Real firebase-admin integration lands in Story 5.2. Auth-lifecycle refresh (service-account JWT)
// + quota self-regulation plug in per ./_stub.ts.
//
// The stub `send` omits the `(rendered, target)` params (structural typing lets a real 5.2 implementation
// add them back without changing the `ChannelProvider` contract).

import type { ChannelProvider, SendResult, SendStatus } from '../provider.js';
import { stubSendResult, stubSendStatus } from './_stub.js';

export const fcmProvider: ChannelProvider = {
  id: 'fcm',
  channel: 'push',
  scope: 'global',
  send(): Promise<SendResult> {
    return Promise.resolve(stubSendResult('fcm', 'push'));
  },
  getStatus(messageId: string): Promise<SendStatus> {
    return Promise.resolve(stubSendStatus(messageId));
  },
};
