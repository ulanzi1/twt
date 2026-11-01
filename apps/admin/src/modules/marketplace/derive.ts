// Pure derivations for the partner-offer wizard and detail page — Story 12.2 (Task 8.4; AC11, AC12).
//
// ⛔ React, ⛔ fetch, ⛔ clock reads except where an instant is passed in. Every user-visible sentence comes from
// `resolveEn` (i18n-en.ts) — ⛔ a literal here. The wizard's whole state is ONE `WizardState` object held client-side
// (QE1 — ⛔ browser storage; a reload loses it, which the opening line says).
//
// ⚠ Meanings restated, ⛔ changed: the audience and status lines restate 12.1's fixed meanings (members-all = every member;
// ZERO clauses = no status restriction; values match byte-for-byte; an empty audience reaches nobody). 12.2 adds ⛔ member
// predicate.

import type {
  AuthorModuleRequest,
  ModuleDetailResponse,
  ModuleEligibilityFilterDto,
  ModuleEligibilityMemberState,
  ModuleScopeFilterDto,
} from '@twt/contracts';
import { MODULE_ELIGIBILITY_MEMBER_STATES } from '@twt/contracts';

import { resolveEn as t } from './i18n-en.js';

/** The wizard's steps, in order: (a)–(f), then the summary. */
export const WIZARD_STEPS = ['a', 'b', 'c', 'd', 'e', 'f', 'summary'] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];
export const SUMMARY_STEP = WIZARD_STEPS.length - 1;

/**
 * The four eligibility statuses NO member can hold today — nothing in production emits `member.lock_in_expired` (G18). An
 * "Only these statuses" offer naming only these reaches nobody until that producer lands.
 */
export const NO_MEMBER_YET_STATUSES: readonly ModuleEligibilityMemberState[] = [
  'pending-valid',
  'active',
  'active-in-grace',
  'lapsed-unpaid',
];

export type ScopeKind = 'members-all' | 'state' | 'district';

export interface WizardState {
  partnerId: string | null;
  nameEn: string;
  nameHi: string;
  descriptionEn: string;
  descriptionHi: string;
  /** `null` until the admin picks — there is ⛔ default (AC11 step (b)). */
  eligibilityMode: 'all' | 'only' | null;
  eligibilityStates: ModuleEligibilityMemberState[];
  scopeKind: ScopeKind | null;
  /** The EXACT option values (TR7 — ⛔ a rendered label, ⛔ trimmed). */
  scopeValues: string[];
  /** `datetime-local` values (browser zone, ⛔ an offset). */
  validFrom: string;
  validUntil: string;
  placesMode: 'unlimited' | 'fixed' | null;
  places: string;
  leadHandoffUrl: string;
  secretName: string;
}

export function emptyWizardState(): WizardState {
  return {
    partnerId: null,
    nameEn: '',
    nameHi: '',
    descriptionEn: '',
    descriptionHi: '',
    eligibilityMode: null,
    eligibilityStates: [],
    scopeKind: null,
    scopeValues: [],
    validFrom: '',
    validUntil: '',
    placesMode: null,
    places: '',
    leadHandoffUrl: '',
    secretName: '',
  };
}

// ── Time ──────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A COPY of the private banners helper: a `datetime-local` value (read in the BROWSER zone) → a UTC `Z` ISO string, or
 * null for an empty / invalid value. ⛔ `new Date('')` is ever reached (TR13).
 */
export function toIsoOrNull(local: string): string | null {
  if (!local || local.trim() === '') return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO → the `datetime-local` shape (`YYYY-MM-DDTHH:mm`) in the browser zone, or ''. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const IST = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

/** An instant in India time (the Trust's zone). */
export function formatIst(iso: string): string {
  return IST.format(new Date(iso));
}

/** One instant shown in India time AND the browser's zone (the admin typed it in the latter). `timeZone` is for tests. */
export function describeInstant(iso: string, timeZone?: string): { ist: string; browser: string } {
  const browser = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...(timeZone !== undefined ? { timeZone } : {}),
  });
  return {
    ist: t('module.window.ist', { time: formatIst(iso) }),
    browser: t('module.window.browser', { time: browser.format(new Date(iso)) }),
  };
}

/** The window line (India time). */
export function describeWindow(fromIso: string, untilIso: string): string {
  return t('module.window.range', { from: formatIst(fromIso), until: formatIst(untilIso) });
}

// ── Plain-language descriptions (the Policy-meaning sentences) ────────────────────────────────────────

export function statusLabel(s: ModuleEligibilityMemberState): string {
  return t(`module.status.${s}`);
}

/** True when EVERY ticked status is one no member can hold yet (G18) — the "reaches no member" warning. */
export function reachesNoMemberYet(states: readonly ModuleEligibilityMemberState[]): boolean {
  return states.length > 0 && states.every((s) => NO_MEMBER_YET_STATUSES.includes(s));
}

/** The statuses a filter names (empty for "no status restriction"). */
export function eligibilityStatesOf(filter: ModuleEligibilityFilterDto): ModuleEligibilityMemberState[] {
  const clause = filter.clauses.find((c) => c.kind === 'member_state_in');
  return clause === undefined ? [] : [...clause.states];
}

/** The eligibility sentences: the status line, then the left-or-erased line (12.1 `-429` A4 + C9 — 12.3's check). */
export function describeEligibility(filter: ModuleEligibilityFilterDto): string[] {
  const clause = filter.clauses.find((c) => c.kind === 'member_state_in');
  const head =
    clause === undefined
      ? t('module.eligibility.none')
      : t('module.eligibility.onlyThese', { statuses: clause.states.map(statusLabel).join('; ') });
  return [head, t('module.eligibility.leftOrErased')];
}

/** The audience sentences: who, then what a state / district audience cannot reach, then the empty-audience line. */
export function describeScope(scope: ModuleScopeFilterDto): string[] {
  if (scope.scope === 'members-all') return [t('module.audience.membersAll'), t('module.audience.matchesNobody')];
  const places = scope.values.join('; ');
  if (scope.scope === 'state') {
    return [t('module.audience.state', { places }), t('module.audience.noDistrict'), t('module.audience.matchesNobody')];
  }
  return [
    t('module.audience.district', { places }),
    t('module.audience.noDistrict'),
    t('module.audience.unlistedDistrict'),
    t('module.audience.matchesNobody'),
  ];
}

export function describePlaces(capacity: number | null): string {
  if (capacity === null) return t('module.places.unlimited');
  return capacity === 1 ? t('module.places.one') : t('module.places.count', { n: capacity });
}

/** The C10 warning, shown before Withdraw and before "Start a corrected copy" when members registered interest. */
export function leadWarning(leadCount: number): string | null {
  return leadCount > 0 ? t('module.detail.leadWarning', { n: leadCount }) : null;
}

// ── Validation (per step — Next is disabled with the reason shown) ────────────────────────────────────

const SECRET_NAME = /^[A-Za-z0-9_-]{1,255}$/;
const POSITIVE_INT = /^[1-9][0-9]{0,9}$/;
const MAX_PLACES = 2_147_483_647;
/** The request DTO's cap on the lead hand-off address; a longer one is an unmapped 400, so the UI stops it first (RP26). */
const MAX_LEAD_URL = 4_096;

/** The first reason step `step` cannot be left yet, or null. Mirrors only what the admin can see; the domain decides. */
export function validateStep(step: number, s: WizardState): string | null {
  switch (WIZARD_STEPS[step]) {
    case 'a': {
      if (s.partnerId === null) return t('module.reason.partner');
      if (s.nameEn.trim() === '') return t('module.reason.nameEn');
      if (s.nameHi.trim() === '') return t('module.reason.nameHi');
      if (s.nameEn.trim().length > 120 || s.nameHi.trim().length > 120) return t('module.reason.nameTooLong');
      if (s.descriptionEn.trim() === '') return t('module.reason.descriptionEn');
      if (s.descriptionHi.trim() === '') return t('module.reason.descriptionHi');
      if (s.descriptionEn.trim().length > 2000 || s.descriptionHi.trim().length > 2000) return t('module.reason.descriptionTooLong');
      return null;
    }
    case 'b':
      if (s.eligibilityMode === null) return t('module.reason.eligibilityMode');
      if (s.eligibilityMode === 'only' && s.eligibilityStates.length === 0) return t('module.reason.eligibilityStates');
      return null;
    case 'c':
      if (s.scopeKind === null) return t('module.reason.scopeKind');
      if (s.scopeKind !== 'members-all' && s.scopeValues.length === 0) return t('module.reason.scopeValues');
      if (s.scopeValues.length > 200) return t('module.reason.scopeTooMany');
      return null;
    case 'd': {
      const from = toIsoOrNull(s.validFrom);
      const until = toIsoOrNull(s.validUntil);
      if (from === null) return t('module.reason.validFrom');
      if (until === null) return t('module.reason.validUntil');
      if (new Date(from).getUTCFullYear() < 2000 || new Date(until).getUTCFullYear() < 2000) return t('module.reason.windowYear');
      if (!(Date.parse(until) > Date.parse(from))) return t('module.reason.windowOrder');
      return null;
    }
    case 'e':
      if (s.placesMode === null) return t('module.reason.placesMode');
      if (s.placesMode === 'fixed' && (!POSITIVE_INT.test(s.places.trim()) || Number(s.places.trim()) > MAX_PLACES)) {
        return t('module.reason.places');
      }
      return null;
    case 'f':
      if (s.leadHandoffUrl.trim() === '') return t('module.reason.leadUrl');
      if (!s.leadHandoffUrl.trim().startsWith('https://')) return t('module.reason.leadUrlHttps');
      if (s.leadHandoffUrl.trim().length > MAX_LEAD_URL) return t('module.reason.leadUrlTooLong');
      if (s.secretName.trim() === '') return t('module.reason.secretName');
      if (!SECRET_NAME.test(s.secretName.trim())) return t('module.reason.secretNameShape');
      return null;
    default:
      return null;
  }
}

/** The first step (in order) with a reason, or null when the whole wizard is complete. */
export function firstInvalidStep(s: WizardState): number | null {
  for (let i = 0; i < SUMMARY_STEP; i += 1) if (validateStep(i, s) !== null) return i;
  return null;
}

// ── Request / prefill ─────────────────────────────────────────────────────────────────────────────────

/** CRLF (and a lone CR) → LF: the domain refuses U+000D in display text; the admin's line breaks become LF (QE12). */
function normaliseNewlines(v: string): string {
  return v.replace(/\r\n?/g, '\n');
}

export function eligibilityFilterOf(s: WizardState): ModuleEligibilityFilterDto {
  return s.eligibilityMode === 'only'
    ? { version: 1, clauses: [{ kind: 'member_state_in', states: orderedStates(s.eligibilityStates) }] }
    : { version: 1, clauses: [] };
}

export function scopeFilterOf(s: WizardState): ModuleScopeFilterDto {
  if (s.scopeKind === 'state' || s.scopeKind === 'district') {
    return { version: 1, scope: s.scopeKind, values: [...s.scopeValues] };
  }
  return { version: 1, scope: 'members-all' };
}

function orderedStates(states: readonly ModuleEligibilityMemberState[]): ModuleEligibilityMemberState[] {
  return MODULE_ELIGIBILITY_MEMBER_STATES.filter((x) => states.includes(x));
}

/**
 * The author request. Texts keep their content (the domain trims and judges them); line breaks become LF; scope values
 * are sent EXACTLY as picked (TR7); the window as UTC `Z` instants. ⛔ `module_id` (server-minted), ⛔ `branding_bundle`.
 */
export function toAuthorRequest(s: WizardState): AuthorModuleRequest {
  return {
    partner_id: s.partnerId ?? '',
    name_en: normaliseNewlines(s.nameEn),
    name_hi: normaliseNewlines(s.nameHi),
    description_en: normaliseNewlines(s.descriptionEn),
    description_hi: normaliseNewlines(s.descriptionHi),
    eligibility_filter: eligibilityFilterOf(s),
    scope_filter: scopeFilterOf(s),
    valid_from: toIsoOrNull(s.validFrom) ?? '',
    valid_until: toIsoOrNull(s.validUntil) ?? '',
    slot_capacity: s.placesMode === 'fixed' ? Number(s.places.trim()) : null,
    lead_handoff_url: s.leadHandoffUrl.trim(),
    lead_handoff_signing_key_secret_name: s.secretName.trim(),
  };
}

/** The "Start a corrected copy" prefill: every answer of `m` (the window converted to the browser's `datetime-local`). */
export function fromModule(m: ModuleDetailResponse): WizardState {
  const clause = m.eligibility_filter.clauses.find((c) => c.kind === 'member_state_in');
  return {
    partnerId: m.partner_id,
    nameEn: m.name_en,
    nameHi: m.name_hi,
    descriptionEn: m.description_en,
    descriptionHi: m.description_hi,
    eligibilityMode: clause === undefined ? 'all' : 'only',
    eligibilityStates: clause === undefined ? [] : [...clause.states],
    scopeKind: m.scope_filter.scope,
    scopeValues: m.scope_filter.scope === 'members-all' ? [] : [...m.scope_filter.values],
    validFrom: toLocalInput(m.valid_from),
    validUntil: toLocalInput(m.valid_until),
    placesMode: m.slot_capacity === null ? 'unlimited' : 'fixed',
    places: m.slot_capacity === null ? '' : String(m.slot_capacity),
    leadHandoffUrl: m.lead_handoff_url,
    secretName: m.lead_handoff_signing_key_secret_name,
  };
}

// ── Server answers → the wizard ───────────────────────────────────────────────────────────────────────

const FIELD_STEP: Record<string, WizardStep> = {
  partner_id: 'a',
  name_en: 'a',
  name_hi: 'a',
  description_en: 'a',
  description_hi: 'a',
  eligibility_filter: 'b',
  scope_filter: 'c',
  valid_from: 'd',
  valid_until: 'd',
  slot_capacity: 'e',
  lead_handoff_url: 'f',
  lead_handoff_signing_key_secret_name: 'f',
};

/** A 422 issue's path → the step that owns the field (the summary when the path names none). */
export function issueToStep(path: readonly (string | number)[]): number {
  const head = path[0];
  const step = typeof head === 'string' ? FIELD_STEP[head] : undefined;
  return WIZARD_STEPS.indexOf(step ?? 'summary');
}

/** The copy key of each request field's label, for naming the field a 422 issue points at (RP31). */
const FIELD_LABEL: Record<string, string> = {
  partner_id: 'module.field.partner',
  name_en: 'module.field.nameEn',
  name_hi: 'module.field.nameHi',
  description_en: 'module.field.descriptionEn',
  description_hi: 'module.field.descriptionHi',
  valid_from: 'module.field.validFrom',
  valid_until: 'module.field.validUntil',
  slot_capacity: 'module.field.places',
  lead_handoff_url: 'module.field.leadUrl',
  lead_handoff_signing_key_secret_name: 'module.field.secretName',
};

/** The request field a 422 issue's path starts at, when it is one with a single input on screen; else null. */
export function issueFieldName(path: readonly (string | number)[] | undefined): string | null {
  const head = path?.[0];
  return typeof head === 'string' && head in FIELD_LABEL ? head : null;
}

/** The banner sentence for a 422 issue: it names the field when the field has a label of its own. */
export function issueMessage(path: readonly (string | number)[] | undefined, message: string): string {
  const field = issueFieldName(path);
  return field === null
    ? t('module.wizard.issue', { message })
    : t('module.wizard.issueField', { field: t(FIELD_LABEL[field]!), message });
}

/** A refusal code (no issue path) → the step to return to, or null. */
export function codeToStep(code: string): number | null {
  const step: WizardStep | undefined = (
    {
      'module.partner_unknown': 'a',
      'module.state_scope_requires_geo_tree': 'c',
      'module.scope_value_unknown': 'c',
      'module.window_ended': 'd',
    } as Record<string, WizardStep>
  )[code];
  return step === undefined ? null : WIZARD_STEPS.indexOf(step);
}

/**
 * What to tell the admin for a refusal code (a code with no own sentence gets the generic one). `surface` is where the
 * sentence is shown: the wizard can send the admin back to edit a closing time, the detail page cannot (a draft is immutable),
 * so there `module.window_ended` points at withdraw-and-copy instead (RP24).
 */
export function moduleErrorGuidance(code: string, surface: 'wizard' | 'detail' = 'wizard'): string {
  if (surface === 'detail' && code === 'module.window_ended') return t('module.error.window_ended_detail');
  const own: Record<string, string> = {
    'module.manifest_invalid': 'module.error.manifest_invalid',
    'module.window_ended': 'module.error.window_ended',
    'module.partner_unknown': 'module.error.partner_unknown',
    'module.state_scope_requires_geo_tree': 'module.error.state_scope_requires_geo_tree',
    'module.scope_value_unknown': 'module.error.scope_value_unknown',
    'module.not_draft': 'module.error.not_draft',
    'module.already_published': 'module.error.already_published',
    'module.illegal_transition': 'module.error.illegal_transition',
    'module.concurrent_change': 'module.error.concurrent_change',
    'module.not_found': 'module.error.not_found',
    'module.idempotency_in_progress': 'module.error.idempotency_in_progress',
    'module_partner.name_taken': 'module.partner.nameTaken',
    'module_partner.name_invalid': 'module.partner.nameInvalid',
    'tone_review.required': 'module.detail.authorCannotPublish',
    // The API's permission-denied code is `authz.forbidden` (this row was keyed `auth.forbidden`, which nothing emits — RP22).
    'authz.forbidden': 'module.error.forbidden',
  };
  return t(own[code] ?? 'module.error.generic');
}
