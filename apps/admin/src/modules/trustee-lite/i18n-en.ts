// English console-chrome resolver for the Trustee-Lite module — Story 10.11 (Task 5; AC5/AC9).
//
// The admin console is ENGLISH-FACING and resolves chrome KEYS locally (the shipped
// helpdesk / member-status per-module `i18n-en.ts` precedent — admin copy is per-module `resolveEn`,
// NOT the `packages/i18n` member namespaces, so there is no en/hi parity obligation here).
//
// ── Every string below is bound by the microcopy gate (AC5) ───────────────────────────────────
// `apps/admin/src/**/*.ts` is already in `microcopy.yaml`'s `scope.code_globs`, so this file is
// scanned on every `pnpm microcopy:check`. Two rules bite hardest here:
//
//   · `moderation-advice` — the tone rule Story 10.11 adds. NO verb of advice, anywhere: no
//     verdict-by-copy ("… should be <a moderation outcome>"), no imperative demand, no lateness
//     framed as judgement, no explicit recommendation, no candidacy framing. `epics.md:3585`: this
//     surface states what it observed and the trustee decides. Copy that nudges IS a
//     recommendation, however gently it is phrased. The prohibited phrasings are enumerated in the
//     rule's own comment in `microcopy.yaml` — deliberately NOT quoted here, because this file is
//     itself scanned and quoting them would (correctly) fail the gate.
//   · The vocabulary rule at `microcopy.yaml:36` binds the noun for a compiled document to its
//     canonical form (*Sahyog Vivran*). It applies to admin copy too — hence "worklist",
//     "on record" and "observation" below rather than the everyday English noun.
//
// ⚠ Copy discipline for the undated + unavailable states: they must read as EXPLICIT ABSENCE, not as
// reassurance. "No deadline on record" is honest; "on track" over an item with no deadline would be
// a claim the data cannot support.

const EN: Record<string, string> = {
  // ── Console chrome ──────────────────────────────────────────────────────────────────────────
  'trustee.title': 'Trustee worklist',
  'trustee.subtitle':
    'Every item across the Pariwar that is waiting on a trustee, in one place. Each row links to the surface where you act on it. Sections you do not hold a grant for are not shown.',
  'trustee.loading': 'Loading the worklist…',
  'trustee.error': 'Could not load the worklist. Retry in a moment.',
  'trustee.retry': 'Retry',
  'trustee.evaluatedAt': 'As of',

  // ── Section headings ────────────────────────────────────────────────────────────────────────
  'trustee.section.cycle_freeze': 'Cycle freeze',
  'trustee.section.r9_voting': 'R9 voting',
  'trustee.section.concealment': 'Concealment review',
  'trustee.section.appeal': 'Appeals',
  'trustee.section.reconciliation': 'Reconciliation',
  'trustee.section.moderation': 'Moderation on record',
  'trustee.section.violator_flag': 'Contribution-discipline observations',

  // ── The four distinguishable section states (AC9) ───────────────────────────────────────────
  // "empty" and "unavailable" are NEVER collapsed into one rendering.
  'trustee.state.empty': 'Nothing here is waiting on you.',
  'trustee.state.notPermitted': 'Not shown — your grants do not cover this section.',

  // ── Row chrome ──────────────────────────────────────────────────────────────────────────────
  'trustee.col.item': 'Item',
  'trustee.col.age': 'Waiting',
  'trustee.col.deadline': 'Deadline',
  'trustee.col.severity': 'Timing',
  'trustee.col.link': 'Go to',
  'trustee.deadline.none': 'No deadline on record',
  'trustee.age.unknown': 'Start time not on record',
  'trustee.severity.none': '—',
  'trustee.severity.breached': 'Past deadline',
  'trustee.severity.due_soon': 'Deadline near',
  'trustee.severity.on_track': 'Within deadline',
  'trustee.group.undated': 'Items with no deadline',
  'trustee.link.unavailable': 'No linked surface for this item.',

  // ── The R7 violator arm (AC4) ───────────────────────────────────────────────────────────────
  // Descriptive throughout. It names clauses and the facts that established them; it never names an
  // outcome, a next step, or a degree of concern.
  'trustee.violator.intro':
    'Members for whom a contribution-discipline clause (R7) currently applies, with the clause and the facts that established it. This is an observation for your judgement — the system reaches no conclusion from it.',
  'trustee.violator.empty': 'No contribution-discipline clause currently applies to any member.',
  'trustee.violator.member': 'Member',
  'trustee.violator.clause': 'Clause',
  'trustee.violator.facts': 'Facts on record',
  'trustee.violator.facts.none': 'No facts recorded against this clause.',
  'trustee.violator.holdingSince': 'Applies since',
  'trustee.violator.holdingSince.unknown': 'Start date not on record',
  'trustee.violator.link': 'Open member record',

  // AC4 — the detection-unavailable state NAMES what is missing, and never renders as an empty list.
  // ⚠ The raw sentinel the validity payload carries today is the internal string `epic-8-9`
  // (`validity-service/types.ts:65`), which is stale: the same gap's sibling sentinel on the Story
  // 10.16 surface already reads `story-10-24`. Echoing `epic-8-9` verbatim would put inconsistent
  // internal jargon on a trustee-facing surface, so `producerLabel` below maps the known sentinels to
  // admin-facing copy and falls back to the raw value for anything unrecognized (never swallowing it).
  'trustee.violator.unavailable.title': 'Contribution-discipline observation is not available yet.',
  'trustee.violator.unavailable.body':
    'Nothing is being checked against R7 right now, so this section is blank because the check cannot run — not because every member is clear. Waiting on: {producer}.',
  'trustee.violator.producer.epic-8-9': 'the contribution-fact producer (Story 10.24)',
  'trustee.violator.producer.story-10-24': 'the contribution-fact producer (Story 10.24)',
  'trustee.violator.producer.unknown': 'the contribution-fact producer',
};

/** Resolve a console-chrome key to English (loud-ish fallback: return the key if unmapped). */
export function resolveEn(key: string): string {
  return EN[key] ?? key;
}

/**
 * Map a raw producer sentinel to admin-facing copy (AC4). Unrecognized sentinels fall through to the
 * raw value rather than being replaced by a generic phrase — a trustee seeing an unfamiliar token is
 * better than a surface that quietly hides which dependency it is waiting on.
 */
export function producerLabel(producer: string): string {
  const key = `trustee.violator.producer.${producer}`;
  const resolved = EN[key];
  return resolved ?? producer;
}
