// helpdesk_reply member-notification emitter — Story 10.4 (Task 3; AC3).
//
// When a responder replies to a member ticket (an `awaiting_member` "we need X" or a `resolved`
// closing note), the member is notified via a `helpdesk_reply` push. The `Alert` variant
// (`@twt/contracts` alerts/alert.ts, `helpdesk_reply` → `{ ticket_id }`) and its deep-link
// (`tickets/:ticket_id`) are ALREADY wired end-to-end (Story 5.1/5.2); only the EMIT + DISPATCH was
// missing — that is this file. Fired inline, best-effort, POST-COMMIT the staff-reply write (the
// shepherd-assigned-hook precedent: a synchronous seam apps/api fires from the reply handler, never
// blocking or failing the reply).
//
// ── helpdesk_reply is a Story-5.1 NOTIFICATION, not an alerts-table lifecycle row ──────────────────
// This is a per-ticket 5.1 notification `Alert` CONTRACT object handed to the dispatch fan-out — NOT
// the cycle-keyed alerts-table primitive (`mintAndOpenAlert`, `deriveAlertId(cycleId)`), which is 1:1
// with a contribution cycle. [[project_alert_primitive_substrate]]: "lifecycle events ≠ 5.1
// notifications." The `alert_id` here is a fresh envelope id, never derived from the ticket.
//
// ── Dispatch: REUSE the shipped fan-out; v1 delivery is a log-only fixture ──────────────────────────
// `createHelpdeskReplyFanOutNotifier` REUSES `fanOutAlertToMembers` (the stack's live `dispatch()`
// composition — [[project_channels_no_live_dispatch_yet]] retired), never re-implementing it. With
// the default provider registry (`DEFAULT_PROVIDER_REGISTRY`, the shipped log-only fixtures)
// delivery is log-only — the emit + dispatch WIRING is the deliverable, not vendor integration.
//
// ── Production wiring uses the console notifier (the crypto-boundary reason) ────────────────────────
// The fan-out resolves the MEMBER's delivery targets (push/WhatsApp/SMS) via MEMBER Tier-1 field
// crypto. apps/api's request-path encryption deps are ADMIN-IDENTITY key material (admin-kek/-hmac),
// NOT member field crypto — wiring the member-targeting fan-out there with those keys would be a
// latent decrypt-mismatch bug. So the PRODUCTION default fired from apps/api is
// `consoleHelpdeskReplyNotifier` (builds the Alert + resolves the deep-link + logs its coordinates —
// exercising the emit path, no member decrypt), matching the shepherd-assigned-hook console-default
// precedent. `createHelpdeskReplyFanOutNotifier` is the tested forward seam: wire it where the correct
// member field-crypto + provider resolver already live (apps/jobs), or once apps/api assembles member
// notify deps. Either way the fan-out is REUSED, never re-implemented.

import { Alert, deepLinkTargetForAlert, formatDeepLink } from '@twt/contracts';

import { fanOutAlertToMembers, type ContributionNotifyDeps } from './contribution-notify.js';

/** The event a staff reply emits (NON-PII coordinates only — ids + the reply instant). */
export interface HelpdeskReplyEvent {
  /** The tenant whose ticket gained a reply. */
  readonly pariwarId: string;
  /** The ticket the reply lands on (the notification deep-links to `tickets/:ticketId`). */
  readonly ticketId: string;
  /** The push recipient — the ticket's `subject_member_id`. NULL for an actor-only helpline ticket
   *  (no member inbox to notify → the notifier skips cleanly). */
  readonly subjectMemberId: string | null;
  /** A FRESH envelope id for the notification `Alert` — never derived from the ticket (helpdesk_reply
   *  is a 5.1 notification, not the cycle-keyed alerts-table primitive). */
  readonly alertId: string;
  /** WHO triggered the reply — the responding staff actor id, or `system`. NON-PII; rides
   *  `created_by_actor` (an actor identifier, never a display name). */
  readonly createdByActor: string;
  /** The reply instant (ISO-8601). */
  readonly occurredAt: string;
}

/** The injectable notifier seam (a sibling of `ShepherdAssignedNotificationHook`). Best-effort — a
 *  throw here must never fail the committed reply write (the caller swallows). */
export type HelpdeskReplyNotifier = (event: HelpdeskReplyEvent) => Promise<void>;

/**
 * Build the `helpdesk_reply` notification `Alert` (PURE). The recipient is the ticket's subject
 * member; `payload_data.ticket_id` drives the already-wired `tickets/:ticket_id` deep-link. Parsed
 * through the `Alert` contract so a shape drift fails fast here rather than at dispatch.
 */
export function buildHelpdeskReplyAlert(event: HelpdeskReplyEvent & { subjectMemberId: string }): Alert {
  return Alert.parse({
    alert_id: event.alertId,
    pariwar_id: event.pariwarId,
    member_id: event.subjectMemberId,
    // Not time-critical — a helpdesk reply is not a cycle-open bridge (AR-18), so it never forces SMS.
    time_critical: false,
    provenance_refs: {},
    created_at: event.occurredAt,
    created_by_actor: event.createdByActor,
    alert_category: 'helpdesk_reply',
    payload_data: { ticket_id: event.ticketId },
  });
}

/**
 * The production-default notifier fired inline from apps/api: builds the Alert + resolves the
 * deep-link + logs the NON-PII coordinates (a log-only fixture delivery, no member decrypt). Skips an
 * actor-only ticket cleanly. Never throws (best-effort — the shepherd-hook console-default precedent).
 */
export const consoleHelpdeskReplyNotifier: HelpdeskReplyNotifier = async (event) => {
  try {
    if (event.subjectMemberId === null) {
      console.info(
        '[helpdesk-reply] skipped — actor-only ticket has no member inbox',
        JSON.stringify({ pariwarId: event.pariwarId, ticketId: event.ticketId }),
      );
      return;
    }
    const alert = buildHelpdeskReplyAlert({ ...event, subjectMemberId: event.subjectMemberId });
    const target = deepLinkTargetForAlert(alert);
    console.info(
      '[helpdesk-reply]',
      JSON.stringify({
        pariwarId: event.pariwarId,
        ticketId: event.ticketId,
        memberId: event.subjectMemberId,
        alertId: event.alertId,
        deepLink: target ? formatDeepLink(target) : null,
      }),
    );
  } catch {
    // A best-effort notification seam must never take down the reply path.
  }
  return Promise.resolve();
};

/**
 * The fan-out notifier: REUSES `fanOutAlertToMembers` (the shipped live dispatch composition) to
 * deliver the `helpdesk_reply` push to the ticket's subject member. Log-only under the default
 * provider registry (providers unwired). Skips an actor-only ticket. Wire this where the correct
 * MEMBER field-crypto + provider resolver live (see the file header's crypto-boundary note).
 */
export function createHelpdeskReplyFanOutNotifier(deps: ContributionNotifyDeps): HelpdeskReplyNotifier {
  return async (event) => {
    if (event.subjectMemberId === null) return; // actor-only ticket → no member inbox
    const alert = buildHelpdeskReplyAlert({ ...event, subjectMemberId: event.subjectMemberId });
    await fanOutAlertToMembers(deps, () => alert, [event.subjectMemberId], event.pariwarId, new Date(event.occurredAt));
  };
}

/** A capturing fake for tests — records every fired event; never throws. */
export interface CapturingHelpdeskReplyNotifier {
  readonly notifier: HelpdeskReplyNotifier;
  readonly events: HelpdeskReplyEvent[];
}

export function createCapturingHelpdeskReplyNotifier(): CapturingHelpdeskReplyNotifier {
  const events: HelpdeskReplyEvent[] = [];
  return {
    events,
    notifier: (event) => {
      events.push(event);
      return Promise.resolve();
    },
  };
}
