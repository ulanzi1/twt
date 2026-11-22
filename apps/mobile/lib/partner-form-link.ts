// The partner's-own-page opener (Story 12.5b, Task 8; `2026-11-22-489` QE15; `-484` Q1 C option B; I3, I6).
//
// `-484` Q1 option B (Trustee-ratified): *"The form opens in the phone's own browser, not inside the Trust's app, so the Trust
// cannot see what the member types."* So the ONE thing this does is `Linking.openURL(url)` — the phone's own browser:
//   · ⛔ `canOpenURL` (an https URL always has a handler; a pre-check adds a way to fail for nothing);
//   · ⛔ URL rewriting and ⛔ a query appended — the URL is the offer's stored `partner_form_url`, handed out by the server's visit
//     write BYTE FOR BYTE, the same for every member (I3); nothing about the member is ever added to it;
//   · ⛔ `expo-web-browser` (an in-app browser tab) and ⛔ `react-native-webview` (an embedded view) — either would put the
//     partner's form inside the Trust's app (I6; TR19 — `expo-web-browser` IS a dependency of this app, one import away; the fence
//     test reads this file's imports).
// A thrown `openURL` returns `'failed'` (the caller shows an error; ⛔ retried here). Takes a plain string — ⛔ `@twt/domain` (the
// Metro bundle boundary, TR18). ⛔ Production caller until Story 12.3's card, which shows the R5 notice (`partnerForm.notice`) first.

import { Linking } from 'react-native'

export async function openPartnerForm(url: string): Promise<'opened' | 'failed'> {
  try {
    await Linking.openURL(url)
    return 'opened'
  } catch {
    return 'failed'
  }
}
