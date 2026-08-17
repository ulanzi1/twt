// Survey/Poll contracts barrel — Story 10.15 (Task 5).
//
// The wire enums (status / derived display-state / audience scope / question type — sync-guarded
// against the @twt/domain tuples), the questionnaire caps (sync-guarded against `surveys/limits.ts`),
// the pure browser-safe display-state derivation, and the transport DTOs (create / update / publish /
// close / submit-response requests; the admin, member, aggregate and free-text response shapes).
//
// The admin routes gate on `survey.manage`; the member routes are member-session-gated with NO RBAC
// key at all.
//
// ⚠ A SURVEY IS ADVISORY (LBD-1) — `response_threshold` gates nothing, and it is not on the member
// DTO at all. ⚠ The audience predicate's `public` arm DENIES — the OPPOSITE polarity to `banners`.
// ⛔ The aggregate and free-text shapes have NO field that could carry a member identifier (LBD-3).

export {
  SURVEY_STATUSES,
  SurveyStatus,
  SURVEY_DISPLAY_STATES,
  SurveyDisplayState,
  SURVEY_AUDIENCE_SCOPES,
  SurveyAudienceScope,
  SURVEY_TARGETABLE_AUDIENCE_SCOPES,
  SURVEY_QUESTION_TYPES,
  SurveyQuestionType,
  MAX_QUESTIONS_PER_SURVEY,
  MAX_OPTIONS_PER_QUESTION,
  MIN_OPTIONS_PER_CHOICE_QUESTION,
  MAX_QUESTION_TEXT,
  MAX_OPTION_TEXT,
  MAX_FREE_TEXT_ANSWER,
} from './enums.js';

// The pure READ-TIME derivation, browser-safe. ⚠ A SECOND implementation of the domain's
// `deriveSurveyDisplayState`, held to identical behaviour by a sync-guard test — see the file header
// for why both exist. ⛔ Do not edit one without the other.
export {
  type SurveyWindowShape,
  deriveSurveyDisplayState,
  isSurveyOpen,
} from './display-state.js';

export {
  SurveyQuestionOption,
  SurveyQuestion,
  SurveyQuestionnaire,
  SurveyAnswer,
  CreateSurveyRequest,
  UpdateSurveyRequest,
  PublishSurveyRequest,
  CloseSurveyRequest,
  SubmitSurveyResponseRequest,
  SurveyResponse,
  SurveyListResponse,
  MemberSurveyResponse,
  MemberSurveyListResponse,
  SubmitSurveyResponseResult,
  SurveyOptionCount,
  SurveyQuestionAggregate,
  SurveyAggregateResponse,
  SurveyFreeTextAnswer,
  SurveyFreeTextListResponse,
} from './dto.js';
