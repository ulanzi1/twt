// The shared member-event AUDIT SHAPE — extracted in Story 10.10 (Task 1).
//
// `memberActorSchema` / `memberLifecycleStateSchema` / `auditShape` were private to
// `member/events.ts` until Story 10.10 added the `member.moderation.*` family, whose payload
// schemas live in `member/moderation/events.ts`. Both modules need the audit shape, and
// `member/events.ts` must import the moderation schemas to register them in
// `MEMBER_EVENT_PAYLOAD_SCHEMAS` — so putting the shape in either file would create an ESM
// import CYCLE (and a const-initialization-order hazard). Hoisting it here keeps every import
// one-directional: `audit-shape.ts` → { `events.ts`, `moderation/events.ts` }.
//
// `events.ts` re-exports `memberActorSchema` + `memberLifecycleStateSchema` so its public API is
// unchanged; this file is the single declaration site.

import { z } from 'zod';

import { MEMBER_LIFECYCLE_STATES } from '../schema/members.js';

/** Who caused the transition (architecture §1.14 line 1262-1268). `system` = SIE. */
export const memberActorSchema = z.enum(['member', 'system', 'trustee']);
export type MemberEventActor = z.infer<typeof memberActorSchema>;

/** A lifecycle-state literal, derived from the one tuple in schema/members.ts. */
export const memberLifecycleStateSchema = z.enum(MEMBER_LIFECYCLE_STATES);

/**
 * The audit shape every member.* payload carries. `from_state` is nullable — the
 * initial `signup_initiated` event has no prior state. For non-transition markers
 * (`nominees_declared`, `medical_disclosed`, the `member.moderation.*` family, …)
 * `from_state` === `to_state`.
 *
 * NOTE: these are AUDIT metadata. The reducer (member/state.ts) is the runtime
 * authority for the transition — it derives the next state from the CURRENT state
 * + the event TYPE, never from `to_state` in the payload (so a mislabelled payload
 * can never corrupt replay).
 */
export const auditShape = {
  from_state: memberLifecycleStateSchema.nullable(),
  to_state: memberLifecycleStateSchema,
  trigger: z.string().min(1),
  actor: memberActorSchema,
};
