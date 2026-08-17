// `surveys` namespace barrel — Story 10.15.
//
// The Survey/Poll `[SURFACE]` module: a mutable-`status` survey lifecycle (LBD-2 — NOT
// event-derived-state, no projector, no state-writer trigger, no events_log stream) with a pure
// read-time response window (AC2 — no scheduler, no sweep), a bounded three-type question vocabulary
// (LBD-4), a questionnaire frozen at publish (LBD-5), one-response-per-member enforced by a composite
// PK (LBD-6), a read-time audience predicate whose `public` arm DENIES (LBD-7 — ⚠ the opposite
// polarity to 10.9), and an aggregate projection that is structurally incapable of carrying a member
// identifier (LBD-3).
//
// ⚠ A SURVEY IS ADVISORY AND HAS NO GOVERNANCE EFFECT (LBD-1). `response_threshold` is FR-58's
// "quorum threshold" renamed, and it gates NOTHING — it feeds one informational boolean on the
// aggregate. The word `quorum` does not appear anywhere in this module, because in this project it
// already names the TRUSTEE quorum (Deed Cl. 19) and members hold no governance vote.

export {
  SURVEY_ACTIONS,
  type SurveyAction,
  type SurveyWindowRow,
  nextSurveyStatus,
  isLegalSurveyTransition,
  deriveSurveyDisplayState,
  isSurveyOpen,
} from './status.js';

export {
  type SurveyQuestion,
  type SurveyQuestionOption,
  type SurveyAnswer,
  type SurveyAggregate,
  type SurveyQuestionAggregate,
  type SurveyFreeTextAnswer,
} from './types.js';

export {
  MAX_QUESTIONS_PER_SURVEY,
  MAX_OPTIONS_PER_QUESTION,
  MIN_OPTIONS_PER_CHOICE_QUESTION,
  MAX_QUESTION_TEXT,
  MAX_OPTION_TEXT,
  MAX_FREE_TEXT_ANSWER,
} from './limits.js';

export { validateQuestionnaire, validateAnswers } from './validate.js';

export { type SurveyResponseAnswers, aggregateResponses } from './aggregate.js';

export {
  type SurveyCopy,
  surveyResourceLocator,
  surveyContentHash,
  missingSurveyCopyFields,
} from './content-hash.js';

export {
  type CreateSurveyDraftInput,
  type UpdateSurveyPatch,
  type PublishSurveyResult,
  type RecordResponseInput,
  FROZEN_AFTER_PUBLISH,
  assertWindowValid,
  assertSurveyCopyComplete,
  assertAudienceAuthorable,
  createDraft,
  updateSurvey,
  publish,
  close,
  recordResponse,
} from './write.js';

export {
  type ListSurveysOptions,
  type ListFreeTextAnswersOptions,
  type MemberSurveyCandidate,
  type MemberSurveyPage,
  SURVEY_DISPATCH_MEMBER_STATES,
  resolveSurveyAudienceMemberIds,
  getSurvey,
  getSurveyOrThrow,
  listSurveysForPariwar,
  listOpenSurveysForPariwar,
  listOpenSurveysForMember,
  getSurveyAggregate,
  listFreeTextAnswers,
} from './read.js';

export {
  SURVEY_TARGETABLE_AUDIENCE_SCOPES,
  type SurveyAudienceLogger,
  isMemberInSurveyAudience,
} from './audience.js';

export {
  SURVEY_NOT_FOUND_CODE,
  SURVEY_INVALID_STATE_CODE,
  SURVEY_FROZEN_FIELD_CODE,
  SURVEY_WINDOW_INVALID_CODE,
  SURVEY_BILINGUAL_REQUIRED_CODE,
  SURVEY_QUESTIONNAIRE_INVALID_CODE,
  SURVEY_ANSWER_INVALID_CODE,
  SURVEY_ALREADY_RESPONDED_CODE,
  SURVEY_AUDIENCE_UNSUPPORTED_CODE,
  SURVEY_AUDIENCE_VALUE_REQUIRED_CODE,
  SURVEY_QUESTIONNAIRE_VIOLATIONS,
  SURVEY_ANSWER_VIOLATIONS,
  type SurveyQuestionnaireViolation,
  type SurveyAnswerViolation,
  SurveyNotFoundError,
  SurveyStateError,
  SurveyFrozenFieldError,
  SurveyWindowInvalidError,
  SurveyBilingualRequiredError,
  SurveyQuestionnaireInvalidError,
  SurveyAnswerInvalidError,
  SurveyAlreadyRespondedError,
  SurveyAudienceUnsupportedError,
  SurveyAudienceValueRequiredError,
} from './errors.js';
