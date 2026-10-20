// The delivery LADDER's and the CALL RECORD's wire mappers — Story 6.37c (LD10, LD12). A LEAF (the `correction-closure-dto`
// precedent): it imports ⛔ handler file, so the correction queue (`claims.nominee-name-check.handlers.ts`), the
// certificate list (`claims.certificate-reminder.handlers.ts`) and the call routes (`claims.contact-call.handlers.ts`)
// all call it without a cycle. ⛔ A name, ⛔ a number: a role, a date, an outcome, a state.

import type { ContactCallDto, ContactLadderFollowUpDto } from '@twt/contracts';
import type { claim, schema } from '@twt/domain';

export function toContactCallDto(row: schema.ClaimContactCallRow): ContactCallDto {
  return {
    call_id: row.callId,
    person_key: row.personKey,
    chase: row.chase,
    called_on: row.calledOn,
    answered_by: row.answeredBy,
    outcome: row.outcome,
    recorded_by: row.recordedByDisplay,
    recorded_at: row.createdAt.toISOString(),
  };
}

export function toContactLadderFollowUpDto(f: claim.ContactLadderFollowUp | null): ContactLadderFollowUpDto | null {
  return f === null
    ? null
    : { state: f.state, started_on: f.startedOn, next_step_on: f.nextStepOn, concluded_on: f.concludedOn, delivered_by: f.deliveredBy };
}
