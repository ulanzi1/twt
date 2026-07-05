// SMS-DLT provider — the `sms` channel (India TRAI DLT-registered templates). Story 5.1 STUB (AC2). Real
// telephony-gateway integration + the pg-boss retry ladder land in Story 5.6. Auth-lifecycle refresh
// (telephony tokens) + quota self-regulation + `scope: 'per-pariwar'` credential wiring plug in per
// ./_stub.ts. The stub `send` omits its params (see fcm.ts note).

import type { ChannelProvider, SendResult, SendStatus } from '../provider.js';
import { stubSendResult, stubSendStatus } from './_stub.js';

export const smsDltProvider: ChannelProvider = {
  id: 'sms-dlt',
  channel: 'sms',
  scope: 'global',
  send(): Promise<SendResult> {
    return Promise.resolve(stubSendResult('sms-dlt', 'sms'));
  },
  getStatus(messageId: string): Promise<SendStatus> {
    return Promise.resolve(stubSendStatus(messageId));
  },
};
