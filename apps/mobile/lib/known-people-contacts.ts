// People who know me — the CONTACTS reads (Story 6.36b, Task 4; 6.36a SW11 / SW13; Apple 5.1.1 / 5.1.2, Google Play User
// Data). The ONLY module that touches `expo-contacts`; mocked in `tests/unit/known-people-contacts.test.ts`.
//   · `readContactsForMatching` — ONLY after the in-app note (the screen shows it first): the permission prompt, then, on
//     `granted` (or iOS 18 `limited` — only the shared contacts come back), the numbers and names. ⛔ Any other field.
//   · `pickOneContact` — iOS's system picker (⛔ permission — SF3); ONE contact, its numbers.
//   · `shareMoreContacts` — iOS 18 limited access: the system picker that adds contacts to what is shared.
// ⛔ The contacts are ⛔ stored, cached or logged — the caller holds them in memory for the one flow.

import * as Contacts from 'expo-contacts'

import { contactsAccessOf, prepareContacts, type ContactsAccess, type PhoneContact, type PreparedContacts } from './known-people'

export type ContactsReadResult =
  | { readonly kind: 'read'; readonly access: Exclude<ContactsAccess, 'denied'>; readonly prepared: PreparedContacts }
  | { readonly kind: 'denied' }
  | { readonly kind: 'unavailable' }

/** The permission prompt, then the contacts' numbers + names, normalised and de-duplicated on the phone (≤ 1,000). */
export async function readContactsForMatching(): Promise<ContactsReadResult> {
  if (!(await Contacts.isAvailableAsync().catch(() => false))) return { kind: 'unavailable' }
  const perm = await Contacts.requestPermissionsAsync()
  const access = contactsAccessOf(perm)
  if (access === 'denied') return { kind: 'denied' }
  const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name] })
  return { kind: 'read', access, prepared: prepareContacts(data as readonly PhoneContact[]) }
}

/** iOS: the system contact picker — ONE contact (⛔ permission). `null` when the member cancels. */
export async function pickOneContact(): Promise<PreparedContacts | null> {
  const contact = await Contacts.presentContactPickerAsync()
  if (contact === null) return null
  return prepareContacts([contact as PhoneContact])
}

/**
 * iOS 18 limited access: let the member share more contacts. `true` ONLY when the picker NEWLY shared some (it resolves
 * with their ids) — a cancelled or empty picker re-sent every number and spent one of the three daily checks (review
 * round 2, P5). `false` where unsupported.
 */
export async function shareMoreContacts(): Promise<boolean> {
  try {
    const added = await Contacts.presentAccessPickerAsync()
    return Array.isArray(added) && added.length > 0
  } catch {
    return false
  }
}
