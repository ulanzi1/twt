// Barrel for the nominee-console domain module — Story 9.1 (the FIRST Epic-9 story).
// Re-exported from @twt/domain as the `nomineeConsole` namespace (see ../index.ts) so consumers call
// `nomineeConsole.computeStaffTakeover(...)` / `nomineeConsole.DEFAULT_STAFF_TAKEOVER_THRESHOLD_DAYS`.
//
// Story 9.1 homes ONLY the PURE staff-takeover-by-day-N derivation here (takeover.ts). It is DB-free and
// replay-deterministic, so it is unit-tested with frozen vectors and shared by whichever surface resolves
// its inputs (today: the apps/api nominee-console read seam, which resolves `poolOpenAt` off events_log).
//
// ── Two RESERVED SEAMS this module deliberately does NOT build (documented, never faked) ────────────────
//
//   (1) The engagement-heartbeat WRITER (reset-on-upload / reset-on-console-open that sets
//       `last_engaged_at`) → Story 9.3 (the daily upload is the primary engagement act). Until it lands,
//       the derivation's `lastEngagedAt` input is `null` and the day-N clock runs from `poolOpenAt`
//       (the CORRECT behaviour for a fully-disengaged nominee — see takeover.ts). 9.1 wires the READ and
//       does NOT write `last_engaged_at` from anywhere.
//
//   (2) The takeover FLAG transport into the Story 9.8 reconciliation review queue. `computeStaffTakeover`
//       IS the derivation 9.8 consumes (run over the live pools; the `takeoverEligible` ones are the
//       District-Admin work-list). 9.8 is unbuilt, so 9.1 raises the flag against the shape 9.8 will read —
//       NO `nominee.takeover-eligible` event is emitted (an event needs a live writer + consumer; the
//       derivation-as-read is the honest reserved-seam shape, matching the 8.3 read-model-before-producer
//       discipline). No standalone District-Admin surface; the admin upload console is a Story 9.3 seam.

export * from './takeover.js';
// Story 9.1 (Task 1/3) — the two DB-scoped reads that back the console: the validated-nominee-with-active-
// pool gate (`resolveActiveNomineePool`, extending the Ravi-mode session-as-deceased identity) + the
// `poolOpenAt` resolver off the `pool.opened_for_contributions` event (`resolvePoolOpenAt`, reading
// events_log directly — no new column/migration). Consumed by the apps/api nominee-console handler.
export * from './read.js';
