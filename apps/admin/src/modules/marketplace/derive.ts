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
  ModuleLeadRoute,
  ModulePublicationDto,
  ModuleScopeFilterDto,
  ModuleState,
} from '@twt/contracts';
import { MODULE_ELIGIBILITY_MEMBER_STATES, MODULE_PARTNER_FORM_FIGURE_MAX, MODULE_PARTNER_FORM_STAGE_LABEL_MAX } from '@twt/contracts';

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
  /** Story 12.5b (QE7 (A)) — asked FIRST in step (e), `null` until chosen (⛔ default). Places are asked only for `trust_sends`. */
  leadRoute: ModuleLeadRoute | null;
  leadHandoffUrl: string;
  secretName: string;
  /** Story 12.5b — the partner's own page (`partner_form` only), sent exactly as typed (trimmed). */
  partnerFormUrl: string;
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
    leadRoute: null,
    leadHandoffUrl: '',
    secretName: '',
    partnerFormUrl: '',
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

/** Story 12.5b — the route in plain language: its name and what it means for the member's details. */
export function describeRoute(route: ModuleLeadRoute): { name: string; meaning: string } {
  return { name: t(`module.route.${route}`), meaning: t(`module.route.${route}.hint`) };
}

/** Story 12.5b — the places line: a `partner_form` offer has none (⛔ "unlimited"). */
export function describePlacesFor(route: ModuleLeadRoute | null, capacity: number | null): string {
  return route === 'partner_form' ? t('module.places.none') : describePlaces(capacity);
}

export function describePlaces(capacity: number | null): string {
  if (capacity === null) return t('module.places.unlimited');
  return capacity === 1 ? t('module.places.one') : t('module.places.count', { n: capacity });
}

/** The C10 warning, shown before Withdraw and before "Start a corrected copy" when members registered interest. */
export function leadWarning(leadCount: number): string | null {
  if (leadCount <= 0) return null;
  return leadCount === 1 ? t('module.detail.leadWarningOne') : t('module.detail.leadWarning', { n: leadCount });
}

/**
 * The publication line. "Goes live at its opening time" is said only while the offer is still `scheduled`: once it is live
 * or archived that sentence is no longer true, whichever event published it (RC16).
 */
export function describePublication(
  publication: Pick<ModulePublicationDto, 'published_event_type' | 'reviewer_display_name' | 'reviewed_at'> | null,
  currentState: ModuleState,
): string {
  if (publication === null) return t('module.detail.notPublished');
  const params = { name: publication.reviewer_display_name, at: formatIst(publication.reviewed_at) };
  return publication.published_event_type === 'module.scheduled' && currentState === 'scheduled'
    ? t('module.detail.publishedScheduled', params)
    : t('module.detail.publishedActive', params);
}

// ── Validation (per step — Next is disabled with the reason shown) ────────────────────────────────────

const SECRET_NAME = /^[A-Za-z0-9_-]{1,255}$/;
const POSITIVE_INT = /^[1-9][0-9]{0,9}$/;
const MAX_PLACES = 2_147_483_647;
/** The request DTO's cap on the lead hand-off address; a longer one is an unmapped 400, so the UI stops it first (RP26). */
const MAX_LEAD_URL = 4_096;

/** The length the server measures: the sent (normalised) text, trimmed. */
function sentLength(v: string, kind: 'name' | 'description'): number {
  return normaliseDisplayText(v, kind).trim().length;
}

/** The first reason step `step` cannot be left yet, or null. Mirrors only what the admin can see; the domain decides. */
export function validateStep(step: number, s: WizardState): string | null {
  switch (WIZARD_STEPS[step]) {
    case 'a': {
      if (s.partnerId === null) return t('module.reason.partner');
      // Empty and length are judged on the text that is SENT: a value made only of characters the cleaning removes (a
      // zero-width space, a soft hyphen) is empty (DN5).
      if (sentLength(s.nameEn, 'name') === 0) return t('module.reason.nameEn');
      if (sentLength(s.nameHi, 'name') === 0) return t('module.reason.nameHi');
      // (NFC can lengthen the sent text — a precomposed nukta letter becomes two code units; collapsing shortens a name.)
      if (sentLength(s.nameEn, 'name') > 120 || sentLength(s.nameHi, 'name') > 120) return t('module.reason.nameTooLong');
      if (sentLength(s.descriptionEn, 'description') === 0) return t('module.reason.descriptionEn');
      if (sentLength(s.descriptionHi, 'description') === 0) return t('module.reason.descriptionHi');
      if (sentLength(s.descriptionEn, 'description') > 2000 || sentLength(s.descriptionHi, 'description') > 2000) {
        return t('module.reason.descriptionTooLong');
      }
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
      // Story 12.5b (QE7 (A)) — the route first (⛔ default); places only for an offer the Trust sends details for.
      if (s.leadRoute === null) return t('module.reason.leadRoute');
      if (s.leadRoute === 'partner_form') return null;
      if (s.placesMode === null) return t('module.reason.placesMode');
      if (s.placesMode === 'fixed' && (!POSITIVE_INT.test(s.places.trim()) || Number(s.places.trim()) > MAX_PLACES)) {
        return t('module.reason.places');
      }
      return null;
    case 'f':
      if (s.leadRoute === 'partner_form') {
        // Mirrors only what the admin can see; the domain's QE3 rule decides (a 422 names the field).
        const url = s.partnerFormUrl.trim();
        if (url === '') return t('module.reason.partnerFormUrl');
        if (!url.startsWith('https://')) return t('module.reason.partnerFormUrlHttps');
        if (url.length > MAX_LEAD_URL) return t('module.reason.partnerFormUrlTooLong');
        if (url.includes('#')) return t('module.reason.partnerFormUrlFragment');
        return null;
      }
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

/**
 * Display text as the domain accepts it, so pasted text just works (QE12; DN3, `-435` item 2): CRLF (and a lone CR) → LF;
 * every space separator but U+0020 (a no-break space from a PDF or word-processor paste, a thin space, …) → U+0020; Unicode
 * NFC; and in a NAME, a run of spaces → one. The server REFUSES each of these rather than rewriting them, so this is the
 * only place the admin's text is changed, and a member's card shows the same thing (HTML collapses a run of spaces).
 * ALSO (DN5, `-436` item 1) the other invisible paste artefacts: a tab → a space; U+2028 / U+2029 / U+0085 → a line feed in
 * a description, a space in a name; U+00AD (soft hyphen), U+200B (zero-width space), U+FEFF (BOM) and U+2060 (word joiner)
 * removed — all before the collapse, so a removed character cannot leave a doubled space. Any OTHER character the server
 * refuses is sent as typed and refused with the server's reason.
 */
export function normaliseDisplayText(v: string, kind: 'name' | 'description'): string {
  const text = v
    .replace(/\r\n?/g, '\n')
    .replace(/[\u2028\u2029\u0085]/g, kind === 'description' ? '\n' : ' ')
    .replace(/\t/g, ' ')
    .replace(/(?! )\p{Zs}/gu, ' ')
    .replace(/[\u00AD\u200B\uFEFF\u2060]/g, '')
    .normalize('NFC');
  return kind === 'name' ? text.replace(/ {2,}/g, ' ') : text;
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
 * The author request. Texts keep their content (the domain trims and judges them), cleaned by `normaliseDisplayText`; scope values
 * are sent EXACTLY as picked (TR7); the window as UTC `Z` instants. ⛔ `module_id` (server-minted), ⛔ `branding_bundle`.
 */
export function toAuthorRequest(s: WizardState): AuthorModuleRequest {
  // QE7 (A): the route has ⛔ default. `firstInvalidStep` blocks Create until it is chosen; if a caller skipped that, fail loudly here
  // rather than write the offer as `trust_sends` (review R2P4).
  if (s.leadRoute === null) throw new Error('toAuthorRequest: the offer route is not chosen');
  return {
    partner_id: s.partnerId ?? '',
    name_en: normaliseDisplayText(s.nameEn, 'name'),
    name_hi: normaliseDisplayText(s.nameHi, 'name'),
    description_en: normaliseDisplayText(s.descriptionEn, 'description'),
    description_hi: normaliseDisplayText(s.descriptionHi, 'description'),
    eligibility_filter: eligibilityFilterOf(s),
    scope_filter: scopeFilterOf(s),
    valid_from: toIsoOrNull(s.validFrom) ?? '',
    valid_until: toIsoOrNull(s.validUntil) ?? '',
    // Story 12.5b — the route's own fields only; the other route's are sent as null (the domain refuses a value there).
    ...(s.leadRoute === 'partner_form'
      ? {
          lead_route: 'partner_form' as const,
          slot_capacity: null,
          lead_handoff_url: null,
          lead_handoff_signing_key_secret_name: null,
          partner_form_url: s.partnerFormUrl.trim(),
        }
      : {
          lead_route: 'trust_sends' as const,
          slot_capacity: s.placesMode === 'fixed' ? Number(s.places.trim()) : null,
          lead_handoff_url: s.leadHandoffUrl.trim(),
          lead_handoff_signing_key_secret_name: s.secretName.trim(),
          partner_form_url: null,
        }),
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
    // A `partner_form` offer asks no places (Story 12.5b); a `trust_sends` one keeps 12.2's mapping.
    placesMode: m.lead_route === 'partner_form' ? null : m.slot_capacity === null ? 'unlimited' : 'fixed',
    places: m.slot_capacity === null ? '' : String(m.slot_capacity),
    // "Start a corrected copy" carries the route (AC11).
    leadRoute: m.lead_route,
    leadHandoffUrl: m.lead_handoff_url ?? '',
    secretName: m.lead_handoff_signing_key_secret_name ?? '',
    partnerFormUrl: m.partner_form_url ?? '',
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
  // Story 12.5b (G25) — a 422 on the route or the page opens the step that asks it.
  lead_route: 'e',
  lead_handoff_url: 'f',
  lead_handoff_signing_key_secret_name: 'f',
  partner_form_url: 'f',
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
  lead_route: 'module.field.leadRoute',
  partner_form_url: 'module.field.partnerFormUrl',
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

const PARTNER_FIELD_LABEL: Record<string, string> = {
  display_name_en: 'module.partner.nameEn',
  display_name_hi: 'module.partner.nameHi',
};

/**
 * The partner form's sentence for a 422 `module_partner.name_invalid`: the server's own reason, naming the field (so a
 * refusal the fixed copy does not describe — an invisible joining character, a doubled space — reaches the admin, `-435`
 * item 4). Null when the refusal carries no usable issue (the caller falls back to the fixed copy).
 */
export function partnerIssueMessage(details: unknown): string | null {
  const first = (details as { issues?: { path?: unknown[]; message?: unknown }[] } | undefined)?.issues?.[0];
  if (first === undefined || typeof first.message !== 'string') return null;
  const head = first.path?.[0];
  const label = typeof head === 'string' ? PARTNER_FIELD_LABEL[head] : undefined;
  return label === undefined
    ? t('module.wizard.issue', { message: first.message })
    : t('module.wizard.issueField', { field: t(label), message: first.message });
}

/** How many refused places the banner names before "and n more" (up to 200 can be refused at once — PT14). */
const NAMED_PLACES = 5;

/**
 * The banner for a 422 `module.scope_value_unknown`: it names the refused places (`details.values` — the admin's own input)
 * so the admin can find them — the first five, then "and n more"; without usable values, the fixed sentence (RC8, PT14).
 */
export function scopeUnknownMessage(details: unknown): string {
  const values = (details as { values?: unknown } | undefined)?.values;
  if (!Array.isArray(values) || values.length === 0 || !values.every((v): v is string => typeof v === 'string')) {
    return t('module.error.scope_value_unknown');
  }
  const named = values.slice(0, NAMED_PLACES).join('; ');
  const places = values.length > NAMED_PLACES ? t('module.error.placesAndMore', { places: named, n: values.length - NAMED_PLACES }) : named;
  return t('module.error.scope_value_unknown_named', { places });
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
    // Story 12.5b
    'module.lead_route_mismatch': 'module.error.lead_route_mismatch',
    'module.not_partner_form': 'module.error.not_partner_form',
    'module.partner_form_totals_invalid': 'module.error.partner_form_totals_invalid',
    'module.partner_form_totals_overlap': 'module.error.partner_form_totals_overlap',
    // The API's permission-denied code is `authz.forbidden` (this row was keyed `auth.forbidden`, which nothing emits — RP22).
    'authz.forbidden': 'module.error.forbidden',
  };
  return t(own[code] ?? 'module.error.generic');
}

// ── Story 12.5b — the figures (QE12 (A), QE13 (A); I4) and the partner's totals form ────────────────────

/**
 * A floored figure as text: the number, or "fewer than 5" (the server never sends a number below 5). An ALL-DAYS figure may instead be
 * `withheld` — "not shown", because beside a day below 5 it would let that day be worked out (review RD1; Decision `2026-11-22-490` (1)).
 */
export function figureText(f: { figure: number | null; below_floor: boolean; withheld?: boolean }): string {
  if (f.withheld === true) return t('module.figures.notShown');
  return f.below_floor || f.figure === null ? t('module.figures.fewerThan5') : String(f.figure);
}

/** One stage row of the totals form. */
export interface TotalsStageDraft {
  label: string;
  figure: string;
}
export interface TotalsDraft {
  periodStart: string;
  periodEnd: string;
  stages: TotalsStageDraft[];
}
export function emptyTotalsDraft(): TotalsDraft {
  return { periodStart: '', periodEnd: '', stages: [{ label: '', figure: '' }] };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const WHOLE = /^(0|[1-9][0-9]{0,9})$/;

/** The first reason the totals form cannot be saved yet, or null. Mirrors what the admin sees; the domain decides. */
export function validateTotalsDraft(d: TotalsDraft): string | null {
  if (!ISO_DATE.test(d.periodStart) || !ISO_DATE.test(d.periodEnd) || d.periodEnd < d.periodStart) return t('module.totals.reasonPeriod');
  // Review R2P7: the domain takes a real date from the year 2000 (the wizard's `module.reason.windowYear` is the same rule) — say so here,
  // ⛔ the generic 422 after Save.
  for (const day of [d.periodStart, d.periodEnd]) {
    const at = new Date(`${day}T00:00:00Z`);
    if (Number.isNaN(at.getTime()) || at.toISOString().slice(0, 10) !== day || at.getUTCFullYear() < 2000) return t('module.totals.reasonYear');
  }
  if (d.stages.length === 0) return t('module.totals.reasonStage');
  for (const st of d.stages) {
    const label = st.label.trim();
    if (label === '' || label.length > MODULE_PARTNER_FORM_STAGE_LABEL_MAX || !WHOLE.test(st.figure.trim())) return t('module.totals.reasonStage');
    if (Number(st.figure.trim()) > MODULE_PARTNER_FORM_FIGURE_MAX) return t('module.totals.reasonFigure'); // a whole number, but too large — say so
  }
  return null;
}

/** The totals request: the stages in order, each label trimmed, each number as a whole number. */
export function toTotalsRequest(d: TotalsDraft): import('@twt/contracts').RecordPartnerFormTotalsRequest {
  return {
    period_start: d.periodStart,
    period_end: d.periodEnd,
    stages: d.stages.map((st) => ({ label: st.label.trim(), figure: Number(st.figure.trim()) })),
  };
}
