// The mobile pay-screen choice fence — Story 9.9 (Task 2/5; AC2/AC3/AC4). DB-free, RN-render-free.
//
// The mobile harness is pure-Vitest (no @testing-library/react-native — RN component MOUNT tests aren't set
// up here; the self-verify-surface-render.test.ts / helpline-cta-presence.test.ts precedent). So this proves,
// via a comment-stripped SOURCE scan, the load-bearing anatomy the story requires of the pay screen:
//   1. the EQUAL-choice selection list exists (choose-account title + radio-semantic options mapped from the
//      accounts read), with NO preselect for two accounts and auto-select for one;
//   2. the banking-info panel renders the nominee NAME + bank + account# + IFSC (the name-match confirmation);
//   3. the failure paths offer "choose the other account" AND "retry this account" (donor-driven, AC4);
//   4. the intent is built FOR the chosen account (the `account` param carries the choice);
//   5. NO "switch account" / primary/secondary/default framing survives anywhere.
//
// A source scan, not a mount — but it fails the moment the anatomy regresses.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

// apps/mobile/tests/unit → repo root is four levels up.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const read = (rel: string): string => readFileSync(path.join(repoRoot, rel), 'utf8')
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const PAY = 'apps/mobile/app/(contribution)/pay.tsx'
const src = stripComments(read(PAY))

describe('pay-screen — the EQUAL-choice selection list (AC2)', () => {
  it('fetches the donor-facing nominee-accounts read', () => {
    expect(src).toContain('memberNomineeAccounts()')
  })

  it('renders a choose-account title + hint and maps radio-semantic options from the accounts', () => {
    expect(src).toContain("'upi_intent.choose_account_title'")
    expect(src).toMatch(/accountList\.map/)
    expect(src).toMatch(/accessibilityRole="radio"/)
    // No preselect for the two-account case: options start unchecked.
    expect(src).toMatch(/accessibilityState=\{\{ checked: false \}\}/)
  })

  it('auto-selects when exactly one account exists (no needless choice)', () => {
    expect(src).toMatch(/accounts\.length === 1/)
    expect(src).toMatch(/setSelectedRank\(/)
  })
})

describe('pay-screen — the banking-info panel (AC3)', () => {
  it('renders the nominee name + bank + full account# + IFSC of the chosen account', () => {
    expect(src).toContain('selectedAccount.accountHolderName')
    expect(src).toContain('selectedAccount.bankName')
    expect(src).toContain('selectedAccount.accountNumber')
    expect(src).toContain('selectedAccount.ifsc')
    // The labels route through i18n (dignity — no literal member-facing copy).
    for (const key of [
      "'upi_intent.account_holder_label'",
      "'upi_intent.account_number_label'",
      "'upi_intent.ifsc_label'",
      "'upi_intent.bank_label'",
    ]) {
      expect(src).toContain(key)
    }
  })

  it('builds the intent FOR the chosen account (the `account` param carries the donor choice) — AC3', () => {
    expect(src).toMatch(/memberContributionIntent\(\{ account: selectedRank \}\)/)
  })
})

describe('pay-screen — the donor-driven failure paths (AC4)', () => {
  it('offers BOTH "choose the other account" and "retry this account"', () => {
    expect(src).toContain('onChooseOtherAccount')
    expect(src).toContain('onRetryThisAccount')
    expect(src).toContain("'upi_intent.choose_other_account'")
    expect(src).toContain("'upi_intent.retry_this_account'")
  })

  it('resets the per-account launch state when switching accounts (no stale coach/UTR over a new account)', () => {
    expect(src).toContain('resetLaunchState')
  })

  it('keeps the always-reachable helpline CTA', () => {
    expect(src).toContain('CallHelplineCTA')
  })
})

describe('pay-screen — no primary/secondary/switch framing survives (AC5/AC7)', () => {
  it('has NO "switch_account" i18n key reference (repurposed to equal choice)', () => {
    expect(src).not.toContain('switch_account')
  })

  it('has NO primary/secondary/default account language', () => {
    expect(src.toLowerCase()).not.toMatch(/\bprimary account\b|\bsecondary account\b|\bdefault account\b/)
  })
})
