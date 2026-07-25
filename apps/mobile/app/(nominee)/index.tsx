// Nominee Console route (Story 9.1) — renders Sunita's <NomineeConsole> surface. The console
// self-suppresses to null unless the signed-in member is a validated nominee with an active pool, so this
// screen is safe to reach from any entry seam (the 8.3 contributors-route precedent). The live entry
// affordance that navigates here (a "My reconciliation" home entry) lands with the Story 9.3 upload flow;
// 9.1 stands up the route + screen so the console is reachable and testable.

import { Stack } from 'expo-router'

import { NomineeConsole } from '../../components/nominee-console/NomineeConsole'

export default function NomineeConsoleScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <NomineeConsole />
    </>
  )
}
