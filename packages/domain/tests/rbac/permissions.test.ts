// Permission-key smart-constructor + catalog unit tests — Story 1.8 (AC-1, Task 7.1e).

import { describe, expect, it } from 'vitest';

import {
  InvalidPermissionKeyError,
  PERMISSION_CATALOG,
  PERMISSION_CATALOG_VERSION,
  PERMISSION_KEY_REGEX,
  SEED_PERMISSION_KEYS,
  isCatalogKey,
  permissionKey,
} from '../../src/rbac/permissions.js';

describe('permissionKey smart constructor', () => {
  it('accepts canonical <resource>.<action> keys', () => {
    expect(permissionKey('claim.approve')).toBe('claim.approve');
    expect(permissionKey('audit.verify')).toBe('audit.verify');
    expect(permissionKey('pariwar.amend_rule')).toBe('pariwar.amend_rule');
  });

  it.each([
    'claim', // no dot
    'claim.', // empty action
    '.approve', // empty resource
    'claim.approve.now', // two dots
    'Claim.Approve', // uppercase
    'claim approve', // space
    'claim-approve', // hyphen, no dot
    'claim..approve', // double dot
    'claim.approved ', // trailing space
    '', // empty
    'claim/r9_vote', // slash instead of dot
    'claim.r9/vote', // slash within the action segment
    'claim.r١_vote', // Arabic-Indic digit one (U+0661) lookalike for '1' — not ASCII [0-9]
    'claim.r９_vote', // fullwidth digit nine (U+FF19) lookalike for '9' — not ASCII [0-9]
    '.r9_vote', // leading separator (empty resource) — the Story 6.14 digit-widening didn't loosen this
    'claim.r9_vote.', // trailing separator (empty action)
  ])('rejects malformed key %j with InvalidPermissionKeyError', (bad) => {
    expect(() => permissionKey(bad)).toThrow(InvalidPermissionKeyError);
  });

  it('the regex is the canonical <resource>.<action> matcher', () => {
    expect(PERMISSION_KEY_REGEX.test('member.suspend')).toBe(true);
    // Story 6.14 — digits are legal (the R9 key carries a rule number). Regression guard against a re-narrowing.
    expect(PERMISSION_KEY_REGEX.test('claim.r9_vote')).toBe(true);
    expect(permissionKey('claim.r9_vote')).toBe('claim.r9_vote');
    expect(PERMISSION_KEY_REGEX.test('member.suspended.now')).toBe(false);
  });
});

describe('PERMISSION_CATALOG', () => {
  it('is versioned and seeded with exactly the grounded keys', () => {
    expect(PERMISSION_CATALOG_VERSION).toBe(48); // Story 6.21a (2026-09-25, D13 at Decision 2026-09-25-244) bump +1 (ONE key, so the count moves 55 -> 56: claim.review_death_certificate — district, district_admin: the District Admin ACCEPTS or REJECTS a claim's death certificate, -235 Y; a rejection never denies, -236 BB. Reuse-check: not claim.determine_nominee_declaration (which declaration governs), not claim.approve (approving a claim is not admitting a document), not claim.check_nominee_name (a name verdict). The history read reuses claim.verify. 47 / 55 READ LIVE at e4b565d9); 47 at Story 6.20 (2026-09-23, D8 at Decision 2026-09-21-241 §2) bump +4 (FOUR keys, so the count moves 51 -> 55: the nominee-declaration history keys — claim.determine_nominee_declaration (district, district_admin: which declaration versions STAND against the certificate date, -235 Y), claim.approve_nominee_correction_district (district, district_admin: STEP 1 of a genuine-mistake correction, -236 Z), claim.approve_nominee_correction_pariwar (pariwar, pariwar_admin: STEP 2, which APPLIES it) and claim.raise_nominee_correction (pariwar, helpline_operator: raises on the family's behalf, -237 cl.3). ⚠ THE AUTHORITY IS SPLIT: -236 consequence 2 authorises only the two approval keys; the determination and raise keys rest on -195 cl.2 alone. ⭐ The timeline READ reuses claim.view_nominee_name_check — no fifth key. ⚠⛔ 47 AND 55 WERE READ LIVE at 36129696 (43 / 51), not transcribed from -241, which read them at 1359b9e3); 43 at Story 6.18 (2026-09-20, AC1 at Decision 2026-09-20-228) bump +2 (TWO keys, so the count moves 49 -> 51 — ⛔ NOT 50: the NOMINEE NAME CHECK pair, both district-dimension. `claim.view_nominee_name_check` SHOWS the holder name on each of the claim's two bank accounts beside the nominee(s) the member declared and is granted to district_admin + verifier + pariwar_admin + helpline_operator; `claim.check_nominee_name` RECORDS the District Admin's verdict per account and is granted to district_admin ALONE. ⭐ Two keys and not one is the point: 2026-09-19-226 cl.1 gives the helpline_operator the DUTY to make sure the names match at filing — so they must SEE — while cl.3 reserves the REVIEW of a mismatch to the District Admin, and cl.5 adds "District Admin cannot proceed unless reason for name mismatch is selected". Under one umbrella key either the filer could record the Trust's own verdict and clear their own work, or the filer could not see the names they are accountable for. This is the feature_flag.view/.flip ground exactly — the visibility requirement is deliberately BROADER than the write requirement — and the 6.10/6.11 claim.verify-read / claim.approve-write separation one level down. ⛔ claim.verify IS NOT WIDENED to cover the read: it gates the verifier console's bounded compound read of claim SIGNALS, whereas this decrypts a Tier-1 name belonging to a SECOND living subject (the nominee), and no one should acquire a nominee's plaintext name as a side effect of reading claim signals. ⭐ WHY pariwar_admin AND helpline_operator ARE NOT INERT HERE, the question project_rbac_geo_scope_containment forces: the asymmetry runs ONE WAY — a NARROWER grant cannot satisfy a BROADER check — and these keys are checked at the NARROW end, dimension: 'district'. scope.ts:286-288 says it outright ("A pariwar-ceiling grant covers every geo target within the (already active-Pariwar-filtered) tenant" -> return true), so both pariwar-ceiling roles pass a district check and both grants are LIVE capabilities, NOT the inert/false grants 10.3 refused to seed on a pariwar gate. ⚠ THE ONE HOLE, RECORDED NOT FIXED: scope.ts:235 fails closed on a null target value, so a claim whose deceased member has no derivable posting district is unreachable for EVERY holder incl. the pariwar-ceiling ones — pre-existing claim.verify behaviour from 6.10, not introduced here. ⛔ NOT state_trustee on EITHER key: 6.10's claim.verify disposition is FOLLOWED, not re-litigated — Story 1.18's ADR-0038 resolver made a state grant REACHABLE at a district target and 6.10 still declined the grant, because reachability moved and role composition did not; -226 cl.5 names DA / PA / Super Admin as the audience for the highlight and the District Admin alone as the checker, and the State Trustee is in neither list. ⚠⛔ AND THE 43 IS COMPUTED, NOT TRANSCRIBED — the rule the 11b.13 note below states about THIS story, now applied in the other direction: permissions.ts was read LIVE at 41 with 49 keys on 2026-09-20 (git diff 5f8d27a0..HEAD -- packages empty) ⇒ 41 + 2 = 43, 49 + 2 = 51. ⚠ The 2026-09-07 drive-target note records a PENDING FIRST KEY REMOVAL (pariwar.manage_drive_target, left unconsumed after 11b.14 ruled the drive target DERIVES itself) that collides with this bump — it is STILL UNLANDED and awaiting BigDev's choice of vehicle, so it takes the next numbers from 43/51, NOT the other way round; whichever lands second reads live again); 41 at Story 11b.13 (2026-09-06, D1 at Decision 2026-09-06-203) bump +2 (TWO keys, so the count moves 47 -> 49 — ⛔ NOT 48: the per-Pariwar DRIVE TARGET pair, both pariwar-dimension. `pariwar.manage_drive_target` SETS the whole-INR figure and is granted to pariwar_admin + super_admin; `pariwar.manage_drive_target_visibility` REVEALS it — to members and/or the public, on two INDEPENDENT switches — and is granted to super_admin ONLY. ⭐ Two keys and not one is the point, not the cost (D1): 2026-09-04-190 cl.7 splits two DIFFERENT GOVERNED ACTS under DIFFERENT AUTHORITIES, and under one key that split would live inside a route handler where no catalog reader, Panel member or auditor could see it — "one key meaning two unrelated things is the drift a catalog exists to prevent" (2026-09-02-183 cl.1). ⛔⛔ THE PART A READER WILL OTHERWISE MIS-FILE: granting pariwar_admin on a NEW pariwar-dimension key is ⛔ NOT the "for symmetry" move pariwar.manage_nominee_bank_masking forecloses in writing. Its acceptance condition — a Panel ruling — IS met (-190 cl.7(a), Dhiraj Rahul + Kalpana Bharti), but the real ground is narrower: BOTH foreclosing precedents govern DISCLOSURE (what a public page shows; how long it keeps showing it), which is why 2026-09-02-178 put that authority centrally — whereas SETTING the drive target discloses NOTHING, since cl.7(b) hides the figure from members and the public alike and Story 11b.13 renders it nowhere. REVEALING it IS a disclosure act, and cl.7(c) keeps that super_admin-only, so the visibility key's grant is byte-identical in shape to manage_public_name_presentation / manage_nominee_bank_masking. ⇒ 2026-08-19-136 cl.3's two-axis rule is FOLLOWED: per-Pariwar in SCOPE, Pariwar-Admin in OPERATIONAL authority, CENTRAL in DISCLOSURE authority. ⛔⛔ 2026-09-02-178 and the masking key's pariwar_admin foreclosure STAND UNTOUCHED — this bump supersedes NOTHING and is NOT a precedent for lifting that foreclosure. ⚠⛔ AND THE 41 IS COMPUTED, NOT TRANSCRIBED: Story 6.18 bumps this SAME counter; permissions.ts was read live on 2026-09-06 at 39 with 6.18 unlanded, so what -203 cl.2 rules is +2 FROM THE LIVE VALUE — whichever story lands second takes the next numbers. ⛔ NOT district_admin / state_trustee on either key — inert in both directions. NEITHER is step-up-gated; accountability is the required rationale + actor + display snapshot + §1.5 audit line on the versioned schedule row. ⚠ The SUBSTRATE splits too (D2, -203 cl.5): pariwar_drive_target_schedule (versioned, pariwar_admin-written) and pariwar_drive_target_visibility (super_admin-written, both flags), so the pariwar_admin write path CANNOT NAME A REVEAL-FLAG COLUMN AT ALL); 39 at Story 11b.3a (2026-09-02, D8(i) at Decision 2026-09-02-183) bump +1 (pariwar.manage_nominee_bank_masking — a KEY, so the count moves 46 -> 47: the per-Pariwar NOMINEE-BANK MASKING SCHEDULE write key, pariwar-dimension, mirroring pariwar.manage_public_name_presentation / pariwar.manage_directory_publication's mechanism and reasoning. ⭐ Granted to super_admin ONLY — and that is a RULING: Decision 2026-09-02-178 (Trustee Panel) ruled 2026-08-28-160 cl.10(b)'s "Trust-Admin controlled, per Pariwar" speaks to AUTHORITY and means the TRUST, following 2026-08-19-136 cl.3's two-axis separation — per-Pariwar in SCOPE, central in AUTHORITY. ⛔⛔ pariwar_admin is FORECLOSED: granting it "for symmetry" with the neighbouring pariwar-dimension content keys is the "reverse a ratified ruling by way of a catalog edit" move. ⛔ NOT district_admin / state_trustee — inert in both directions. ⚠⛔ A NEW key, ⛔ NOT an overload of pariwar.manage_public_name_presentation (Decision 2026-09-02-183 cl.1): same CLASS under the same AUTHORITY, but a DIFFERENT governed act — the form a name takes, versus how long a bank account number stays publicly visible after a drive closes. NOT step-up-gated; accountability is the required rationale + actor + display snapshot + §1.5 audit line, which claim/nominee-bank-masking-policy.ts refuses to skip. The unauthenticated public read touches NO key. ⭐ The admin UI ships WITH the key at /p/$pariwarId/nominee-bank-masking — the project's FIRST self-serve presentation-toggle UI — and a change is NOT immediate: the public page is edge-cacheable at s-maxage=300, so the previous projection, which may be a FULL ACCOUNT NUMBER, keeps being served from every warm PoP for up to five minutes); 38 at code review, Story 11a.3 (2026-08-21, D3) bump +1 (pariwar.manage_directory_publication — a KEY, so the count moves 45 -> 46: the per-Pariwar DIRECTORY-PUBLICATION kill switch write key, pariwar-dimension, mirroring pariwar.manage_public_name_presentation's own mechanism and reasoning. ⭐ Granted to super_admin ONLY — this is a legal/privacy kill switch tied to DPDPA review status (-136 cl.5, still open) and a Niyamavali amendment still in draft, not a tenant content preference. ⛔ NOT district_admin / state_trustee — inert in both directions. NOT step-up-gated; accountability is the required rationale + actor + display snapshot + §1.5 audit line. The unauthenticated public read touches NO key. ⛔ NO admin UI ships with this key, and Decision 2026-08-21-146 cl.5 (Trustee-ratified) therefore rules the switch is NOT AN OPERATIONAL CONTROL until a dedicated administrative UI ships — direct database manipulation ⛔ must not be described as normal manual operation); 37 at Story 11a.1 bump +1 (pariwar.manage_public_name_presentation — a KEY, so the count moves 44 -> 45: the per-Pariwar PUBLIC-NAME PRESENTATION MODE write key (full_name <-> shielded_name) governing how every member's name renders on the unauthenticated public Member Directory, pariwar-dimension. ⭐ THE NOTABLE PART IS THE NON-HOLDER: super_admin ALONE, and ⛔ NOT pariwar_admin — which holds EVERY other pariwar-dimension content key (news.manage, banner.manage, survey.manage, pariwar.manage_custom_fields). Decision 2026-08-19-136 cl.3 rules this a GOVERNED ACT, "not a casual Pariwar-Admin toggle": the Trustee Panel ruled that full legal names are published, so the authority to change that form is theirs, mirroring 2026-08-19-133 cl.2's reservation of directory-attribute creation to Super Admin / the Panel. ⛔ Re-granting it to pariwar_admin "for symmetry" with its neighbours would reverse a ratified ruling by catalog edit — it needs its own Panel decision. ⛔ NOT district_admin / state_trustee — inert in both directions (a district ceiling can't satisfy a pariwar check; a state ceiling is broader than the gate's dimension). NOT step-up-gated; accountability is the REQUIRED rationale + actor + display snapshot on the config row + the §1.5 audit line, which the write path refuses to skip. The unauthenticated public read touches NO key); 36 at Story 10.15 bump +1 (survey.manage — a KEY, so the count moves 43 -> 44: the FR-58 Survey/Poll admin WRITE + READ gate, pariwar-dimension, held by pariwar_admin ALONE (+ super_admin auto). ONE key, not a view/manage split — nothing in FR-58 makes the inventory or the results something a role must READ without being able to author one, so there is no transparency property to split on (the 10.5/10.9 posture, not 10.8's). ⚠ The gated read includes the AGGREGATE and the UNATTRIBUTED FREE TEXT, and that is not a widening: the free-text projection carries no member id, no row id and no ordinal, so the key confers no ability to learn who said what — a "who answered" view would be a NEW key on a NEW story with a DPDPA consent question attached. ⛔ NOT district_admin / state_trustee — a district- or state-ceiling grant can never satisfy the pariwar-dimension check, so it would be INERT ON ARRIVAL. ⚠ A survey is ADVISORY and has no governance effect: this key authorises ASKING a question, never deciding anything by the answers); 35 at Story 10.13 bump +1 (ZERO keys — trustee_panel, an EXISTING role, gains the EXISTING pool.fixed_amount_set + pool.fixed_amount_emergency keys, so the CAPABILITY MODEL moves while the key count stays 43: the THIRD application of the 10.18 rule, after 6.17, and the third proof that catalog version is not a proxy for key count. Decision 2026-08-16-123 cl.1 — the Deed vests amount-fixing in the BOARD (Cl. 10(b)/20(c), Niyamavali §4.2) and the code vested it in pariwar_admin ALONE. ⚠ pariwar_admin RETAINS both — the §8.7 "concurrent, not exclusive" posture, so this is the FIRST trustee_panel grant that is NOT exclusive to the bundle. ⛔ NOT state_trustee / district_admin — a state/district-ceiling grant can never satisfy the pariwar-dimension check, so it would be INERT ON ARRIVAL. ⚠ NOT implied by 10.18: §8.7 constitutes the Panel in a MODERATION capacity and amount-fixing is a DIFFERENT capacity, so this was ruled on its own facts, never author-defaulted); 34 at Story 10.22 bump +1 (member.decide_moderation_appeal — a KEY, so the count moves 42 -> 43: the Niyamavali §8.8 appellate-authority key, Decision 2026-08-15-121 cl.14, held by trustee_panel ALONE. ⛔ NOT state_trustee / district_admin — a state/district-ceiling grant can never satisfy the pariwar-dimension check, so it would be INERT ON ARRIVAL. ⚠ The name is [Author-committed]: the ruling minted a key without naming it, and the routing note's proposed member.moderation_appeal.decide is invalid under PERMISSION_KEY_REGEX, which admits exactly one dot); 33 at Story 10.21 bump +1 (member.data_rights — a KEY, so the count moves 41 -> 42: the off-portal DPDPA fulfilment key, held by pariwar_admin ONLY; NOT helpline_operator, who files but does not execute. ⭐ Escalation 10 RULED by Decision 2026-08-14-109 cl.7 — NO DPDPA action inherently requires Trustee Panel authority, so trustee_panel is NOT a holder BY RULING, not pending one); 32 at Story 6.17 bump +1 (ZERO keys — block_admin, an EXISTING role, gains the EXISTING claim.conduct_ground_inspection key, so the CAPABILITY MODEL moves while the key count stays 41: the SECOND application of the 10.18 rule, and the second proof that catalog version is not a proxy for key count); 31 at Story 10.19 bump +1 (member.restore_terminated — a KEY, so the count moves 40 -> 41: a RETURN to the normal shape after 10.18, which is why the two numbers no longer track each other; 30 at 10.18 +1 (trustee_panel — a ROLE, not a key: the FIRST bump in this chain that mints NO permission key, so the key count stays 40 and catalog version STOPS being a proxy for key count; 29 at 10.12 +2 pariwar.view_custom_fields/…manage_custom_fields — ONE bump covering both, the 10.8 two-key precedent, 28 at 10.9 banner.manage, 27 at 10.8 +2 feature_flag.view/…flip, 26 at 10.7 member.export_roster, 25 at 10.5 news.manage, 24 at 10.4 helpdesk.respond, 23 at 10.3 helpdesk.create, 22 at 9.8 reconciliation.review, 21 at 7.5 +2 pool.fixed_amount_set/…_emergency, 19 at 6.16, 16 at 6.14, 15 at 6.13, 14 at 6.12, 13 at 6.10, 12 at 6.9, 11 at 6.8, 9 at 6.7, 7 at 6.3, 6 at 5.8, 5 at 5.3, 4 at 4.8, 3 at 4.6, 2 at 2.6, 1 at 1.8)
    expect(PERMISSION_CATALOG.catalogVersion).toBe(PERMISSION_CATALOG_VERSION);
    expect(PERMISSION_CATALOG.keys).toHaveLength(56);
    expect([...PERMISSION_CATALOG.keys].sort()).toEqual(
      [...SEED_PERMISSION_KEYS].sort(),
    );
  });

  it('includes the Story 11b.3a nominee-bank MASKING key (pariwar.manage_nominee_bank_masking)', () => {
    // ⭐ D8(i), Decision `2026-09-02-183` cl.1-3. A NEW key, ⛔ not an overload of
    // `pariwar.manage_public_name_presentation` — same class under the same authority
    // (`2026-09-02-178` cl.2), but a DIFFERENT governed act. ⛔ Asserting BOTH exist is the point:
    // a "simplification" that folds one into the other fails here.
    expect(isCatalogKey('pariwar.manage_nominee_bank_masking')).toBe(true);
    expect(isCatalogKey('pariwar.manage_public_name_presentation')).toBe(true);
  });

  it('includes the Story 6.18 nominee-name PAIR (claim.view_nominee_name_check + claim.check_nominee_name) as TWO keys', () => {
    // ⭐ AC1, Decision `2026-09-20-228`. `2026-09-19-226` splits SEEING the two names (cl.1 — the
    // helpline operator's duty at filing) from RECORDING the verdict (cl.3 — *"Mismatch is reviewed
    // by District Admin"*) — two different governed acts under two different authorities.
    // ⛔ ASSERTING BOTH EXIST IS THE POINT, exactly as for the masking/presentation and drive-target
    // pairs: a "simplification" that folds the read into the write — or into `claim.verify` — fails
    // here. ⭐ And `claim.verify` must STILL exist and be a THIRD, distinct key: the whole reason the
    // read key was minted is that the console key was deliberately NOT widened to carry a Tier-1
    // decrypt of a second living subject's name.
    expect(isCatalogKey('claim.view_nominee_name_check')).toBe(true);
    expect(isCatalogKey('claim.check_nominee_name')).toBe(true);
    expect(isCatalogKey('claim.verify')).toBe(true);
  });

  it('includes the Story 11b.13 drive-target PAIR (pariwar.manage_drive_target + …_visibility) as TWO keys', () => {
    // ⭐⭐ D1, Decision `2026-09-06-203` cl.1/cl.4. `2026-09-04-190` cl.7 splits SETTING the target
    // (cl.7(a), pariwar_admin) from REVEALING it (cl.7(c), super_admin ONLY) — two DIFFERENT
    // governed acts under DIFFERENT authorities.
    // ⛔ ASSERTING BOTH EXIST IS THE POINT, exactly as for the masking/presentation pair above: a
    // later "simplification" that folds the reveal into the write key — putting the authority
    // boundary inside a route handler where no catalog reader can see it — fails HERE.
    expect(isCatalogKey('pariwar.manage_drive_target')).toBe(true);
    expect(isCatalogKey('pariwar.manage_drive_target_visibility')).toBe(true);
    // ⭐ And they are TWO SEPARATE ENTRIES in the catalog, ⛔ not two spellings of one key.
    // ⚠⛔ Pass 2 correction: this line previously read
    //   `expect('pariwar.manage_drive_target').not.toBe('pariwar.manage_drive_target_visibility')`
    // — two string LITERALS compared to each other, i.e. a parse-time tautology that stayed green
    // with the entire permission catalog deleted. The claim it was making is about the CATALOG, so
    // it has to be asked of the catalog.
    const driveTargetKeys = PERMISSION_CATALOG.keys.filter((k) =>
      k.startsWith('pariwar.manage_drive_target'),
    );
    expect([...driveTargetKeys].sort()).toEqual([
      'pariwar.manage_drive_target',
      'pariwar.manage_drive_target_visibility',
    ]);
  });

  it('includes the Story 6.13 cycle-freeze WRITE key (cycle.freeze — the first state_trustee surface)', () => {
    expect(isCatalogKey('cycle.freeze')).toBe(true);
  });

  it('includes the Story 6.14 R9 panel-voting WRITE key (claim.r9_vote)', () => {
    expect(isCatalogKey('claim.r9_vote')).toBe(true);
  });

  it('includes the Story 7.5 fixed-amount WRITE keys (pool.fixed_amount_set, pool.fixed_amount_emergency)', () => {
    expect(isCatalogKey('pool.fixed_amount_set')).toBe(true);
    expect(isCatalogKey('pool.fixed_amount_emergency')).toBe(true);
  });

  it('includes the Story 9.8 reconciliation review-queue key (reconciliation.review)', () => {
    expect(isCatalogKey('reconciliation.review')).toBe(true);
  });

  it('includes the Story 10.3 helpdesk ticket-create key (helpdesk.create — the first helpdesk key)', () => {
    expect(isCatalogKey('helpdesk.create')).toBe(true);
  });

  it('includes the Story 10.4 helpdesk responder-console key (helpdesk.respond — the second helpdesk key)', () => {
    expect(isCatalogKey('helpdesk.respond')).toBe(true);
  });

  it('includes the Story 10.9 Banner/Popup admin key (banner.manage — ONE key, no view/manage split)', () => {
    expect(isCatalogKey('banner.manage')).toBe(true);
    // Deliberately NOT split the way 10.8's flags are: there is no transparency property forcing the
    // banner READ to be broader than the WRITE, so no `banner.view` exists (Decision 6).
    expect(isCatalogKey('banner.view')).toBe(false);
    expect(permissionKey('banner.manage')).toBe('banner.manage');
  });

  it('includes the Story 2.6 T&C keys (tc.publish, tc.approve)', () => {
    expect(isCatalogKey('tc.publish')).toBe(true);
    expect(isCatalogKey('tc.approve')).toBe(true);
  });

  it('includes the Story 4.6 Member Validity read key (member.view_validity)', () => {
    expect(isCatalogKey('member.view_validity')).toBe(true);
    // It is a READ key, distinct from the write-oriented member.* keys.
    expect(isCatalogKey('member.suspend')).toBe(true);
    expect(isCatalogKey('member.moderate')).toBe(true);
  });

  it('includes the Story 4.8 code-review cache-invalidation WRITE key (validity.invalidate_cache)', () => {
    expect(isCatalogKey('validity.invalidate_cache')).toBe(true);
  });

  it('includes the Story 5.3 WhatsApp config WRITE key (pariwar.configure_channels)', () => {
    expect(isCatalogKey('pariwar.configure_channels')).toBe(true);
  });

  it('includes the Story 5.8 degraded-mode declaration WRITE key (pariwar.declare_degraded_mode)', () => {
    expect(isCatalogKey('pariwar.declare_degraded_mode')).toBe(true);
    // The single-dot <resource>.<action> form is valid; the epic AC's two-dot form is NOT a permission key.
    expect(permissionKey('pariwar.declare_degraded_mode')).toBe('pariwar.declare_degraded_mode');
    expect(() => permissionKey('pariwar.degraded_mode.declare')).toThrow(InvalidPermissionKeyError);
    // The two-dot form is not in the catalog (it survives only as the audit action, a different regex).
    expect(isCatalogKey('pariwar.degraded_mode.declare')).toBe(false);
  });

  it('includes the Story 6.3 helpline claim-intake WRITE key (claim.file)', () => {
    expect(isCatalogKey('claim.file')).toBe(true);
    // It is the intake/FILE key — distinct from the verifier/trustee APPROVE key.
    expect(isCatalogKey('claim.approve')).toBe(true);
    expect(permissionKey('claim.file')).toBe('claim.file');
  });

  it('includes the Story 6.7 ground-inspection keys (conduct + override, single-dot)', () => {
    expect(isCatalogKey('claim.conduct_ground_inspection')).toBe(true);
    expect(isCatalogKey('claim.override_ground_inspection')).toBe(true);
    // The single-dot <resource>.<action> form is valid; the epic AC's two-dot form is NOT a key.
    expect(permissionKey('claim.conduct_ground_inspection')).toBe('claim.conduct_ground_inspection');
    expect(() => permissionKey('claim.ground_inspection.conduct')).toThrow(InvalidPermissionKeyError);
    expect(isCatalogKey('claim.ground_inspection.conduct')).toBe(false);
  });

  it('includes the Story 6.8 nominee-bank keys (manage + correct, replacing an initial claim.file reuse)', () => {
    expect(isCatalogKey('claim.manage_nominee_bank')).toBe(true);
    expect(isCatalogKey('claim.correct_nominee_bank')).toBe(true);
    expect(permissionKey('claim.manage_nominee_bank')).toBe('claim.manage_nominee_bank');
    expect(permissionKey('claim.correct_nominee_bank')).toBe('claim.correct_nominee_bank');
  });

  it('includes the Story 6.10 verifier-console READ key (claim.verify), distinct from the claim.approve WRITE', () => {
    expect(isCatalogKey('claim.verify')).toBe(true);
    expect(permissionKey('claim.verify')).toBe('claim.verify');
    // It is a READ key — distinct from the pre-existing claim.approve WRITE (the 6.11 adjudication action).
    expect(isCatalogKey('claim.approve')).toBe(true);
    // The past-tense event name is NOT a permission key.
    expect(isCatalogKey('claim.verified')).toBe(false);
  });

  it('does NOT contain past-tense EVENT names (catalog ≠ events)', () => {
    // Event names belong to packages/events, not the permission catalog.
    for (const eventName of [
      'claim.approved',
      'member.suspended',
      'alert.published',
      'niyamavali.amended',
    ]) {
      expect(isCatalogKey(eventName)).toBe(false);
    }
  });

  it('isCatalogKey is true only for enumerated keys', () => {
    expect(isCatalogKey('claim.approve')).toBe(true);
    expect(isCatalogKey('claim.delete')).toBe(false); // well-formed but not seeded
    expect(isCatalogKey('not a key')).toBe(false); // malformed
  });
});
