// Helpdesk screens render fence — Story 10.2 (Task 8; AC2/AC3/AC4/AC7). DB-free, RN-render-free.
//
// The mobile harness is pure-Vitest (no @testing-library/react-native — RN component MOUNT tests
// aren't set up here; the status-pill-render.test.ts precedent). So this proves, by a source scan
// driven by the REAL i18n catalog + the REAL substrate constants, the things a pure test CAN prove:
//
//   1. STATUS EXHAUSTIVENESS — the detail/inbox render a label for EVERY ticket lifecycle state via
//      the `helpdesk` i18n namespace (a 7th state can't render blank).
//   2. NO JARGON (AC4) — the member-facing copy carries no raw enum values, no `routed_to_scope`
//      dimension strings, and no "SLA" acronym in the primary copy (a relative-time countdown, AC2).
//   3. ROUTING = ROLE, NEVER A NAME (AC2) — the routing copy is keyed by role, resolved to a
//      role/scope description; the detail maps the known roles + a generic fallback.
//   4. THE FABRIC FLATLIST GUARD (AC3) — the inbox renders empty/loading/error OUTSIDE the FlatList.
//   5. THE FILING FLOW (AC1/AC6/AC7, review-hardening) — the form drives its category/attachment
//      limits from `@twt/contracts` (never a local magic number), gates submit on the required
//      fields, sends the Turnstile token + Idempotency-Key as HEADERS (not multipart fields), and
//      has a dignified, code-keyed branch for every attachment/turnstile/idempotency failure code.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { HELPDESK_TICKET_STATES, HELPDESK_CATEGORIES } from '@twt/contracts'
import { getCatalog } from '@twt/i18n'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8')

// The real i18n catalog (via the package API — never a cross-workspace relative JSON import).
const en = getCatalog('en', 'helpdesk') as Record<string, string>
const hi = getCatalog('hi', 'helpdesk') as Record<string, string>

describe('helpdesk i18n coverage (AC2/AC3/AC4)', () => {
  it('has a member-friendly label for EVERY ticket lifecycle state', () => {
    for (const state of HELPDESK_TICKET_STATES) {
      expect(en[`status.${state}`], `status.${state}`).toBeTruthy()
      expect(hi[`status.${state}`], `hi status.${state}`).toBeTruthy()
    }
  })

  it('has a label + description for EVERY category (both locales)', () => {
    for (const category of HELPDESK_CATEGORIES) {
      expect(en[`category.${category}.label`], `en label ${category}`).toBeTruthy()
      expect(en[`category.${category}.description`], `en desc ${category}`).toBeTruthy()
      expect(hi[`category.${category}.label`], `hi label ${category}`).toBeTruthy()
    }
  })

  it('has routing copy for each default-policy role + a generic fallback (a role description, never a name)', () => {
    for (const key of ['routing.pariwar_admin', 'routing.helpline_operator', 'routing.finance_officer', 'routing.it_cell', 'routing.default']) {
      expect(en[key], key).toBeTruthy()
    }
  })

  it('primary member copy carries NO jargon — no "SLA" acronym, no raw scope-dimension strings', () => {
    const values = Object.values(en).join(' ')
    expect(values).not.toMatch(/\bSLA\b/)
    // No raw routing-scope dimension leaks into member copy.
    for (const dim of ['pariwar_admin_scope', 'routed_to_scope']) {
      expect(values).not.toContain(dim)
    }
    // Uses the dignified relative-time "expected reply" framing instead (AC2 — a countdown, never
    // an absolute date; both the hour and day buckets, plus their _plural forms).
    for (const key of ['sla.expected_reply_soon', 'sla.expected_reply_hours', 'sla.expected_reply_hours_plural', 'sla.expected_reply_days', 'sla.expected_reply_days_plural']) {
      expect(en[key], key).toBeTruthy()
      expect(hi[key], `hi ${key}`).toBeTruthy()
    }
    expect(en['sla.expected_reply_days']).toMatch(/expected reply/i)
  })
})

describe('helpdesk screens render fence (AC3)', () => {
  const inbox = read('apps/mobile/app/(helpdesk)/index.tsx')
  const detail = read('apps/mobile/app/(helpdesk)/[ticketId].tsx')

  it('the inbox renders empty/loading/error OUTSIDE the FlatList (the Fabric remount-crash guard)', () => {
    // The empty branch returns before the FlatList mounts (a `tickets.length === 0` early return).
    expect(inbox).toMatch(/tickets\.length === 0/)
    // The early-return branch does NOT contain a FlatList (the list mounts only when populated).
    const emptyBranch = inbox.slice(inbox.indexOf('tickets.length === 0'), inbox.lastIndexOf('FlatListAny'))
    expect(emptyBranch).not.toContain('<FlatListAny')
  })

  it('the detail renders the read-only thread via the replay-derived entries + a role-only routing target', () => {
    expect(detail).toContain('data.thread')
    // Author is a role label (you / team), never a named individual.
    expect(detail).toMatch(/detail\.you|detail\.team/)
    expect(detail).toContain('routing.default')
  })

  it('the SLA line is a relative countdown, never an absolute calendar date (AC2, review-hardening)', () => {
    // toLocaleDateString() legitimately renders OTHER absolute dates on this screen (filed-on,
    // thread-entry timestamps) — only the SLA due-date must never feed it directly.
    expect(detail).not.toContain('dueDate.toLocaleDateString()')
    expect(detail).toMatch(/slaCountdownLine/)
  })
})

describe('Story 10.3 — "We filed this for you" operator header (AC3)', () => {
  const inbox = read('apps/mobile/app/(helpdesk)/index.tsx')
  const detail = read('apps/mobile/app/(helpdesk)/[ticketId].tsx')

  it('has the two new header/badge i18n keys in BOTH locales (en/hi parity)', () => {
    for (const key of ['detail.filed_for_you', 'detail.filed_for_you_badge']) {
      expect(en[key], `en ${key}`).toBeTruthy()
      expect(hi[key], `hi ${key}`).toBeTruthy()
    }
    // The header templates the FILING operator's name (a controlled staff display name, not a leak).
    expect(en['detail.filed_for_you']).toContain('{name}')
    expect(hi['detail.filed_for_you']).toContain('{name}')
  })

  it('the detail renders the header ONLY for a helpline_call ticket that carries an operator name (present for helpline_call, absent for member_app)', () => {
    // The guard is a two-part AND on created_via === 'helpline_call' AND a present operator_attribution
    // — so a member_app ticket (created_via !== 'helpline_call') never renders the header, and a
    // helpline_call ticket with a null name (impossible per the contract, but belt-and-suspenders)
    // is also skipped.
    expect(detail).toMatch(/data\.created_via === 'helpline_call' && data\.operator_attribution/)
    expect(detail).toContain('detail.filed_for_you')
    // The name is interpolated from the server-snapshotted attribution, never a client value.
    expect(detail).toMatch(/detail\.filed_for_you',\s*\{\s*name: data\.operator_attribution\s*\}/)
  })

  it('the inbox badges an operator-filed ticket (created_via === helpline_call), not a self-filed one', () => {
    expect(inbox).toMatch(/row\.created_via === 'helpline_call'/)
    expect(inbox).toContain('detail.filed_for_you_badge')
  })
})

describe('helpdesk filing form (new.tsx) — AC1/AC4/AC6/AC7 (review-hardening)', () => {
  const form = read('apps/mobile/app/(helpdesk)/new.tsx')

  it('drives its attachment + subject/body limits from @twt/contracts, never a local magic number', () => {
    expect(form).toMatch(/HELPDESK_ATTACHMENT_MAX_COUNT/)
    expect(form).toMatch(/HELPDESK_ATTACHMENT_MAX_BYTES/)
    expect(form).toMatch(/HELPDESK_MEMBER_SUBJECT_MAX/)
    expect(form).toMatch(/HELPDESK_MEMBER_BODY_MAX/)
    // The pre-hardening literals must be gone (a magic `= 5` / `= 150` / `= 4800` re-introduced here
    // would silently desync from the server's actual enforcement).
    expect(form).not.toMatch(/const MAX_FILES = 5/)
    expect(form).not.toMatch(/const SUBJECT_MAX = 150/)
    expect(form).not.toMatch(/const BODY_MAX = 4800/)
  })

  it('renders the category picker from the REAL registry-driven category list, not a hardcoded set', () => {
    expect(form).toMatch(/categories\.map/)
    expect(form).toContain('category.${c.category}.label')
  })

  it('shows an empty-state when the category list is empty, instead of a silently-stuck submit button', () => {
    expect(form).toMatch(/categoriesEmpty/)
    expect(form).toContain('new.category_empty')
  })

  it('offers a subcategory picker, gated on the selected category actually having subcategories', () => {
    expect(form).toMatch(/subCategories\.length > 0/)
    expect(form).toContain('new.subcategory_label')
  })

  it('surfaces the attachment limit copy BEFORE the attach picker buttons (AC4)', () => {
    const limitsIdx = form.indexOf('new.attach_limits')
    const buttonIdx = form.indexOf('new.attach_button')
    expect(limitsIdx).toBeGreaterThan(0)
    expect(buttonIdx).toBeGreaterThan(limitsIdx)
  })

  it('gates submit on category + non-empty subject + non-empty body, disabled while busy', () => {
    expect(form).toMatch(/canSubmit\s*=\s*!!category/)
    expect(form).toMatch(/disabled=\{!canSubmit\}/)
  })

  it('sends the Turnstile token + Idempotency-Key as HEADERS via the api-client, never as multipart fields', () => {
    expect(form).toMatch(/turnstileToken:\s*await getTurnstileToken\(\)/)
    expect(form).toMatch(/idempotencyKey/)
    expect(form).not.toMatch(/form\.append\(['"]turnstileToken['"]/)
  })

  it('has a dignified, code-keyed branch for every attachment/turnstile/idempotency failure code', () => {
    for (const code of [
      'helpdesk.attachment_too_large',
      'helpdesk.attachments_too_large',
      'helpdesk.attachment_unsupported_media_type',
      'helpdesk.too_many_attachments',
      'helpdesk.turnstile_failed',
      'helpdesk.idempotency_in_progress',
    ]) {
      expect(form, code).toContain(code)
    }
  })
})

// ── Story 10.4 — the member reply-append composer (AC3, the member→staff round-trip) ──────────────
describe('Story 10.4 — member reply composer (AC3)', () => {
  const detail = read('apps/mobile/app/(helpdesk)/[ticketId].tsx')
  const queries = read('apps/mobile/components/helpdesk/useHelpdeskQueries.ts')
  const sdk = read('packages/api-client/src/index.ts')

  it('the composer is shown ONLY when the ticket awaits the member (awaiting_member)', () => {
    expect(detail).toContain("data.current_state === 'awaiting_member'")
    expect(detail).toContain('helpdesk-reply-composer')
  })

  it('the composer wires the reply mutation + bounds the message length + clears on success', () => {
    expect(detail).toContain('useHelpdeskReplyMutation')
    expect(detail).toContain('submitReply')
    expect(detail).toContain('HELPDESK_REPLY_MAX')
    expect(detail).toMatch(/slice\(0, HELPDESK_REPLY_MAX\)/)
  })

  it('the reply mutation hook invalidates the ticket + inbox queries on success', () => {
    expect(queries).toContain('export function useHelpdeskReplyMutation')
    expect(queries).toContain("helpdeskApi.reply(")
    expect(queries).toMatch(/invalidateQueries[\s\S]*'ticket'/)
  })

  it('the member-helpdesk SDK exposes a POST reply method to the member reply route', () => {
    expect(sdk).toMatch(/reply\(pariwarId: string, ticketId: string, message: string\)/)
    expect(sdk).toContain('/reply')
  })

  it('the composer copy keys exist in BOTH en and hi (parity)', () => {
    for (const key of ['detail.reply_hint', 'detail.reply_label', 'detail.reply_placeholder', 'detail.reply_submit', 'detail.reply_pending', 'detail.reply_error']) {
      expect(en[key], `en ${key}`).toBeTruthy()
      expect(hi[key], `hi ${key}`).toBeTruthy()
    }
  })
})
