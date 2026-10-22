// THE TWO NAME BOXES OF A CLAIM TEXT — Story 6.37e rework (Task 1.1; AC1 (m); `2026-10-22-379` Q1 A; `2026-10-22-380` decision 1).
// The member's name travels in TWO alphanumeric variables side by side, `member1` then `member2`, each at the conservative operator
// ceiling of 30 (roster Row 30 (d)'s open 30-vs-40 question) — 60 in all. This file holds the ONLY 30, the ONLY 60 and the two slot
// objects; both registries (`suspicion-notice-sms-templates.ts`, `peer-mesh-sms-templates.ts`) take their name slots from here, so
// they cannot disagree, and `sms-member-name.ts` reads the same numbers. ⚠ If Row 30 (d) answers a different limit or unit, the
// change is made HERE, once (6.27c R9's promise, kept). A SIBLING of the function's module so the registries importing the slots
// are ⛔ callers of the function (the AST fence in `sms-member-name.test.ts`). Pure: ⛔ IO, ⛔ clock.

import type { DltSlot } from '@twt/channels';

/** One box's ceiling, in code points. */
export const MEMBER_BOX_MAX = 30;

/** The whole name's ceiling — the two boxes together, in code points. */
export const MEMBER_NAME_MAX = 2 * MEMBER_BOX_MAX;

/** The two name slots, in text order — the same objects in every registry that names the member. */
export const MEMBER_BOX_SLOTS: readonly [DltSlot, DltSlot] = [
  { name: 'member1', type: 'alphanumeric', maxLength: MEMBER_BOX_MAX, label: 'deceased member name — first part' },
  { name: 'member2', type: 'alphanumeric', maxLength: MEMBER_BOX_MAX, label: 'deceased member name — second part' },
];
