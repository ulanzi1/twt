// Story 4.7 — the framework-agnostic `<MemberStatusPanel>` presenter (pure view-model builder) shared by
// the apps/admin web + apps/mobile RN render variants (D4-A). Pure logic only (no react/react-native).
export * from './member-status/index.js';

// Story 9.6 — the framework-agnostic `<StatusPill>` 5-state presenter (pure view-model builder) shared by
// every surface that shows a contribution status (apps/mobile RN + the PDF note-template + a Story-9.8 web
// variant). The single source of the 5-state → tone/token/icon/copy mapping. Pure logic only.
export * from './status-pill/index.js';

// Story 9.12 — the framework-agnostic `<PoolProgressCard>` confirmed-only pool-progress presenter (pure
// view-model builder) shared by the apps/mobile RN progress meter today + the Epic-11b public Sahyog Vivran
// render later. The single source of the confirmed-only meter math + the `confirmedCount × fixedAmount`
// amount-raised derivation. Confirmed-only by SHAPE (no yellow/pending operand can enter). Pure logic only.
export * from './pool-progress/index.js';

// Story 10.16 — the framework-agnostic contribution-during-suspension disclosure presenter (pure
// view-model builder): what a contribution made WITHOUT coverage does (restores standing) and does not
// buy (no beneficiary entitlement for a death during the suspension period). Consumed by the mobile
// payment surface today; shareable by any later contribution surface so the two cannot tell a member
// different things about their own coverage. Pure logic only.
export * from './contribution-disclosure/index.js';

// Story 11a.5 — the framework-agnostic `<NoticeboardStrip>` presenter (pure view-model builder): the one
// place the Panchayat Noticeboard's composition, section ORDER, tier filter and four ratified states live.
// Promotes the Story 0.14 P0-5 prototype from fixture-backed validation artifact to design-system primitive.
// The Story 10.9 banner lane is ONE SOURCE contributing AT MOST ONE row — singular by SHAPE, so the 10.9
// at-most-one-per-lane invariant cannot be widened from here. Pure logic only.
//
// Story 11a.6 — the `<PinnedNotice>` ROW presenter joins the same module (Decision 2026-08-22-153, D2(a)):
// the strip decides WHICH rows exist, the row decides how ONE of them reads, is emphasised and is
// acknowledged. ⭐ It takes NO viewer/audience/tier input — the Story 11a.1 matrix-tier rule shipped in the
// strip presenter at 11a.5, and a descriptor only reaches the row having ALREADY passed it, so a row-level
// filter could only ever disagree with the strip's. ⛔ The row descriptor itself is NOT widened: 10.9's
// dismissal identity (`revision`) stays on the banner lane at the render boundary. Pure logic only.
export * from './noticeboard/index.js';
