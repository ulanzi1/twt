// <ContactLadderLines> — what the delivery LADDER shows for ONE person (Story 6.37c, LD12), on the correction chase panel
// AND the certificate list: the follow-up's state ("Follow-up running — next step on <date>", how it ended — wording per
// `2026-10-18-363` decision 2), "Texts were reported not delivered — <the ask>" (cap-aware: phone, post, either, or
// neither), how many reminders the network said were not delivered (correction only), and the calls recorded (date · who
// answered · whether it reached the family · by whom). ⛔ A name, ⛔ a number.
// ⚠ Each line is a `role="status"` region: a CHANGE to a line that is already on screen (a refetch moving the next step,
// a follow-up ending) is announced; a line that MOUNTS already holding its text is ⛔ announced — it is read with the rest
// of the person's row (review round 2, P30 — an earlier comment here said "every line is ANNOUNCED", which was untrue).
// ⚠ T18 — the microcopy gate scans comments too: "reported" / "the network said", ⛔ the bare canonical term.

import type { ReactElement } from 'react';

import type { ContactCallDto, ContactLadderAsk, ContactLadderFollowUpDto, UnreachableReason } from '@twt/contracts';

import { correctionChaseEn } from './i18n-en.js';
import { formatIst } from './ist.js';

const f = correctionChaseEn.followUp;
const c = correctionChaseEn.calls;

export interface ContactLadderLinesProps {
  readonly followUp: ContactLadderFollowUpDto | null;
  readonly unreachableReason: UnreachableReason | null;
  readonly ask: ContactLadderAsk | null;
  readonly calls: readonly ContactCallDto[];
  /** Correction only — the epoch's accepted reminders the network said were not delivered. */
  readonly reportedUndelivered?: number;
}

/** The follow-up's own line, or `null` (⛔ follow-up). Pure. */
export function followUpLine(followUp: ContactLadderFollowUpDto | null): string | null {
  if (followUp === null) return null;
  switch (followUp.state) {
    case 'running':
      return f.running(followUp.next_step_on);
    case 'concluded':
      return f.concluded(followUp.concluded_on);
    case 'ended_delivered':
      // Story 6.37d (WS13) — say WHICH channel got through (⛔ "a text" for a delivered WhatsApp).
      return followUp.delivered_by === 'whatsapp' ? f.ended_delivered_whatsapp : f.ended_delivered;
    case 'ended_call':
      return f.ended_call;
    default:
      return f.ended_other;
  }
}

/** "Texts were reported not delivered — <the ask>", or `null` when ⛔ ask is open and the texts were ⛔ undelivered. Pure. */
export function notDeliveredLine(unreachableReason: UnreachableReason | null, ask: ContactLadderAsk | null): string | null {
  // Review P21 — `ask` names a ladder's escalation, so it can only ever be open for a `not_delivered` person; the
  // explicit check is kept here too (⛔ relying only on that invariant holding elsewhere) so this line never
  // misdescribes a send-time-dead (`refused`) person as "reported not delivered".
  if (unreachableReason !== 'not_delivered') return null;
  if (ask !== null) return `${f.notDelivered} — ${f.ask[ask] ?? ask}.`;
  return `${f.notDelivered}.`;
}

export function ContactLadderLines({ followUp, unreachableReason, ask, calls, reportedUndelivered }: ContactLadderLinesProps): ReactElement | null {
  const follow = followUpLine(followUp);
  const notDelivered = notDeliveredLine(unreachableReason, ask);
  const count = reportedUndelivered ?? 0;
  if (follow === null && notDelivered === null && count === 0 && calls.length === 0) return null;
  return (
    <div className="mt-1 flex flex-col gap-0.5 text-xs" data-testid="ladder-lines">
      {follow !== null ? (
        <p role="status" data-testid="ladder-follow-up">
          {follow}
        </p>
      ) : null}
      {notDelivered !== null ? (
        <p role="status" data-testid="ladder-not-delivered">
          {notDelivered}
        </p>
      ) : null}
      {count > 0 ? (
        <p role="status" data-testid="ladder-reported-undelivered">
          {f.reportedUndelivered(count)}
        </p>
      ) : null}
      {calls.length > 0 ? (
        <div>
          <p className="font-medium">{c.heading}</p>
          <ul data-testid="ladder-calls">
            {calls.map((call) => (
              <li key={call.call_id} data-testid={`call-${call.call_id}`}>
                {call.called_on} · {c.answeredBy[call.answered_by] ?? call.answered_by} · {c.outcome[call.outcome] ?? call.outcome} ·{' '}
                {c.recordedBy} {call.recorded_by} ({formatIst(call.recorded_at)})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
