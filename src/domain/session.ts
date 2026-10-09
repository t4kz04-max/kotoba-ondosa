import { isValidAgreementSeconds } from './agreement'
import { validateDraft } from './range'
import type {
  Mode,
  ParticipantId,
  RangeDraft,
  SampleAnswer,
  Scenario,
  ScenarioId,
  Seconds,
  TimeRange,
} from './types'

export type SessionStep =
  | 'HOME'
  | 'SCENARIO_SELECT'
  | 'INPUT_A'
  | 'HANDOFF'
  | 'INPUT_B'
  | 'READY_TO_REVEAL'
  | 'COMPARISON'
  | 'AGREEMENT'
  | 'COMPLETE'

export interface AgreementState {
  readonly seconds: Seconds | null
  readonly approvedBy: readonly ParticipantId[]
}

export interface SessionState {
  readonly step: SessionStep
  readonly mode: Mode | null
  readonly scenarioId: ScenarioId | null
  /** 入力中の範囲。初期状態は未入力（null） */
  readonly draft: RangeDraft
  readonly answerA: TimeRange | null
  /** ふたりモードの2人目の回答 */
  readonly answerB: TimeRange | null
  /** ひとりモードで比較している架空サンプル */
  readonly sampleId: string | null
  readonly agreement: AgreementState
}

export type SessionEvent =
  | { readonly type: 'SELECT_MODE'; readonly mode: Mode }
  | { readonly type: 'SELECT_SCENARIO'; readonly scenarioId: ScenarioId }
  | { readonly type: 'SET_DRAFT'; readonly draft: RangeDraft }
  | { readonly type: 'SUBMIT_ANSWER' }
  | { readonly type: 'START_INPUT_B' }
  | { readonly type: 'REVEAL' }
  | { readonly type: 'SELECT_SAMPLE'; readonly sampleId: string }
  | { readonly type: 'START_AGREEMENT' }
  | { readonly type: 'CHOOSE_AGREEMENT_TIME'; readonly seconds: Seconds }
  | {
      readonly type: 'APPROVE_AGREEMENT'
      readonly participant: ParticipantId
      /** 「この時間で実際にできる」と本人が確認したか */
      readonly feasibilityConfirmed: boolean
    }
  /** 確認を取り消す（その時間ではむずかしいと分かったときなど）。時間の選択はそのまま */
  | { readonly type: 'WITHDRAW_APPROVAL'; readonly participant: ParticipantId }
  | { readonly type: 'REVISE_AGREEMENT' }
  | { readonly type: 'BACK' }
  | { readonly type: 'RESTART_SAME_MODE' }
  | { readonly type: 'RESET' }

export type TransitionError =
  | 'invalid-event-for-step'
  | 'unknown-scenario'
  | 'unknown-sample'
  | 'invalid-answer'
  | 'invalid-agreement-time'
  | 'agreement-time-not-chosen'
  | 'feasibility-not-confirmed'
  | 'invalid-participant'
  | 'already-approved'
  | 'not-approved'

export type TransitionResult =
  | { readonly ok: true; readonly state: SessionState }
  | { readonly ok: false; readonly state: SessionState; readonly error: TransitionError }

/** セッションが参照するデータ。テストでは差し替えられる */
export interface SessionCatalog {
  readonly scenarios: readonly Scenario[]
  readonly samples: readonly SampleAnswer[]
}

export const EMPTY_DRAFT: RangeDraft = { start: null, end: null }

const EMPTY_AGREEMENT: AgreementState = { seconds: null, approvedBy: [] }

export const initialSessionState: SessionState = {
  step: 'HOME',
  mode: null,
  scenarioId: null,
  draft: EMPTY_DRAFT,
  answerA: null,
  answerB: null,
  sampleId: null,
  agreement: EMPTY_AGREEMENT,
}

export function findScenario(
  catalog: SessionCatalog,
  scenarioId: ScenarioId | null,
): Scenario | undefined {
  return catalog.scenarios.find((scenario) => scenario.id === scenarioId)
}

export function samplesForScenario(
  catalog: SessionCatalog,
  scenarioId: ScenarioId | null,
): SampleAnswer[] {
  return catalog.samples.filter((sample) => sample.scenarioId === scenarioId)
}

/** 確認が必要な人。ひとりモードの相手は架空なので A だけ */
export function requiredApprovers(mode: Mode | null): readonly ParticipantId[] {
  return mode === 'duo' ? ['A', 'B'] : ['A']
}

function ok(state: SessionState): TransitionResult {
  return { ok: true, state }
}

function reject(state: SessionState, error: TransitionError): TransitionResult {
  return { ok: false, state, error }
}

/**
 * 状態遷移。React に依存しない純粋関数。
 * 不正な遷移は拒否し、元の state をそのまま返す（ok: false）。
 */
export function transition(
  state: SessionState,
  event: SessionEvent,
  catalog: SessionCatalog,
): TransitionResult {
  const invalid = () => reject(state, 'invalid-event-for-step')

  switch (event.type) {
    case 'RESET':
      return ok(initialSessionState)

    case 'SELECT_MODE':
      if (state.step !== 'HOME') return invalid()
      return ok({ ...initialSessionState, step: 'SCENARIO_SELECT', mode: event.mode })

    case 'SELECT_SCENARIO':
      if (state.step !== 'SCENARIO_SELECT') return invalid()
      if (findScenario(catalog, event.scenarioId) === undefined) {
        return reject(state, 'unknown-scenario')
      }
      return ok({ ...state, step: 'INPUT_A', scenarioId: event.scenarioId, draft: EMPTY_DRAFT })

    case 'SET_DRAFT':
      if (state.step !== 'INPUT_A' && state.step !== 'INPUT_B') return invalid()
      return ok({ ...state, draft: event.draft })

    case 'SUBMIT_ANSWER': {
      if (state.step !== 'INPUT_A' && state.step !== 'INPUT_B') return invalid()
      const scenario = findScenario(catalog, state.scenarioId)
      if (scenario === undefined) return reject(state, 'unknown-scenario')
      const validation = validateDraft(state.draft, scenario.maxSeconds)
      if (!validation.ok) return reject(state, 'invalid-answer')

      if (state.step === 'INPUT_B') {
        return ok({
          ...state,
          step: 'READY_TO_REVEAL',
          answerB: validation.range,
          draft: EMPTY_DRAFT,
        })
      }
      if (state.mode === 'duo') {
        return ok({ ...state, step: 'HANDOFF', answerA: validation.range, draft: EMPTY_DRAFT })
      }
      const [firstSample] = samplesForScenario(catalog, scenario.id)
      if (firstSample === undefined) return reject(state, 'unknown-sample')
      return ok({
        ...state,
        step: 'COMPARISON',
        answerA: validation.range,
        draft: EMPTY_DRAFT,
        sampleId: firstSample.sampleId,
      })
    }

    case 'START_INPUT_B':
      if (state.step !== 'HANDOFF') return invalid()
      return ok({ ...state, step: 'INPUT_B', draft: EMPTY_DRAFT })

    case 'REVEAL':
      if (state.step !== 'READY_TO_REVEAL') return invalid()
      return ok({ ...state, step: 'COMPARISON' })

    case 'SELECT_SAMPLE': {
      if (state.step !== 'COMPARISON' || state.mode !== 'solo') return invalid()
      const exists = samplesForScenario(catalog, state.scenarioId).some(
        (sample) => sample.sampleId === event.sampleId,
      )
      if (!exists) return reject(state, 'unknown-sample')
      return ok({ ...state, sampleId: event.sampleId })
    }

    case 'START_AGREEMENT':
      if (state.step !== 'COMPARISON') return invalid()
      return ok({ ...state, step: 'AGREEMENT', agreement: EMPTY_AGREEMENT })

    case 'CHOOSE_AGREEMENT_TIME': {
      if (state.step !== 'AGREEMENT') return invalid()
      const scenario = findScenario(catalog, state.scenarioId)
      if (scenario === undefined) return reject(state, 'unknown-scenario')
      if (!isValidAgreementSeconds(event.seconds, scenario.maxSeconds)) {
        return reject(state, 'invalid-agreement-time')
      }
      // 時間を変えたら、それまでの確認は無効にする
      return ok({ ...state, agreement: { seconds: event.seconds, approvedBy: [] } })
    }

    case 'APPROVE_AGREEMENT': {
      if (state.step !== 'AGREEMENT') return invalid()
      if (state.agreement.seconds === null) return reject(state, 'agreement-time-not-chosen')
      if (!event.feasibilityConfirmed) return reject(state, 'feasibility-not-confirmed')
      const required = requiredApprovers(state.mode)
      if (!required.includes(event.participant)) return reject(state, 'invalid-participant')
      if (state.agreement.approvedBy.includes(event.participant)) {
        return reject(state, 'already-approved')
      }
      const approvedBy = [...state.agreement.approvedBy, event.participant]
      const complete = required.every((id) => approvedBy.includes(id))
      return ok({
        ...state,
        step: complete ? 'COMPLETE' : 'AGREEMENT',
        agreement: { ...state.agreement, approvedBy },
      })
    }

    case 'WITHDRAW_APPROVAL': {
      if (state.step !== 'AGREEMENT') return invalid()
      if (!state.agreement.approvedBy.includes(event.participant)) return reject(state, 'not-approved')
      return ok({
        ...state,
        agreement: { ...state.agreement, approvedBy: state.agreement.approvedBy.filter((p) => p !== event.participant) },
      })
    }

    case 'REVISE_AGREEMENT':
      if (state.step !== 'AGREEMENT') return invalid()
      return ok({ ...state, agreement: EMPTY_AGREEMENT })

    case 'BACK':
      switch (state.step) {
        case 'SCENARIO_SELECT':
          return ok(initialSessionState)
        case 'INPUT_A':
          return ok({ ...state, step: 'SCENARIO_SELECT', scenarioId: null, draft: EMPTY_DRAFT })
        case 'INPUT_B':
          // A の入力画面には戻らない（A の回答を B に見せないため）
          return ok({ ...state, step: 'HANDOFF', draft: EMPTY_DRAFT })
        case 'AGREEMENT':
          return ok({ ...state, step: 'COMPARISON', agreement: EMPTY_AGREEMENT })
        default:
          return invalid()
      }

    case 'RESTART_SAME_MODE':
      if (state.step !== 'COMPARISON' && state.step !== 'AGREEMENT' && state.step !== 'COMPLETE') {
        return invalid()
      }
      return ok({ ...initialSessionState, step: 'SCENARIO_SELECT', mode: state.mode })
  }
}

/** useReducer 用。拒否された遷移では同じ state オブジェクトを返す */
export function createSessionReducer(catalog: SessionCatalog) {
  return (state: SessionState, event: SessionEvent): SessionState =>
    transition(state, event, catalog).state
}
