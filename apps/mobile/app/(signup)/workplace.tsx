// Signup — WHERE DO YOU WORK? (Story 6.36a, Task 5; AC5; `2026-10-14-330` SW7). A REQUIRED step between `kyc` and
// `nominees` that ⛔ never blocks a signup: every member can answer it (a school · an office · *"My workplace isn't
// listed"* · *"I have retired"*), and a Pariwar with ⛔ imported list shows today's free-text district box. It writes the
// member's FIRST posting row (`POST /member/life-events/posting`), then goes on to `nominees`. ⛔ Skippable: *"Continue"*
// is enabled only by a valid answer. *"Step N of M"* counts it (`lib/wizard-steps.ts`).
//
// ⚠ Typed routes refuse computed hrefs — the next step is the inline literal (`lib/wizard-steps.ts`'s note).

import { useRouter } from 'expo-router'

import { WorkplacePicker } from '../../components/workplace/WorkplacePicker'
import { useWorkplaceT } from '../../lib/workplace-i18n'

export default function SignupWorkplaceScreen() {
  const t = useWorkplaceT()
  const router = useRouter()
  return <WorkplacePicker submitLabel={t('continue')} onSaved={() => router.replace('/(signup)/nominees')} />
}
