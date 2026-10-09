import {
  agreementCandidates,
  buildAgreementParts,
  buildAgreementText,
  buildFeasibilityQuestion,
  type AgreementParts,
} from './agreement'
import { describeComparison, type LabeledRange } from './describe'
import { formatSampleLabel } from './format'
import { compareRanges, validateDraft } from './range'
import {
  findScenario,
  requiredApprovers,
  samplesForScenario,
  type SessionCatalog,
  type SessionState,
} from './session'
import type {
  AgreementCandidate,
  ComparisonDescription,
  ComparisonResult,
  Mode,
  ParticipantId,
  RangeDraft,
  SampleAnswer,
  Scenario,
  Seconds,
} from './types'

/**
 * 入力画面に渡す情報。もう一方の回答（answerA など）は含めない。
 * ふたりモードで B が入力するとき、A の回答が UI に届かないようにするため。
 */
export interface InputView {
  readonly participant: ParticipantId
  readonly mode: Mode
  readonly scenario: Scenario
  readonly draft: RangeDraft
  readonly canSubmit: boolean
}

export function selectInputView(state: SessionState, catalog: SessionCatalog): InputView | null {
  if (state.step !== 'INPUT_A' && state.step !== 'INPUT_B') return null
  const scenario = findScenario(catalog, state.scenarioId)
  if (scenario === undefined || state.mode === null) return null
  return {
    participant: state.step === 'INPUT_A' ? 'A' : 'B',
    mode: state.mode,
    scenario,
    draft: state.draft,
    canSubmit: validateDraft(state.draft, scenario.maxSeconds).ok,
  }
}

export interface ComparisonView {
  readonly scenario: Scenario
  readonly a: LabeledRange
  readonly b: LabeledRange
  readonly result: ComparisonResult
  readonly description: ComparisonDescription
  readonly candidates: readonly AgreementCandidate[]
  /** ひとりモードで切り替えられる架空サンプル（ふたりモードは空） */
  readonly samples: readonly SampleAnswer[]
  readonly selectedSampleId: string | null
}

const COMPARISON_STEPS = new Set(['COMPARISON', 'AGREEMENT', 'COMPLETE'])

/** 比較・具体化・完了画面用。両方の回答がそろった後にだけ値を返す */
export function selectComparisonView(
  state: SessionState,
  catalog: SessionCatalog,
): ComparisonView | null {
  if (!COMPARISON_STEPS.has(state.step)) return null
  const scenario = findScenario(catalog, state.scenarioId)
  if (scenario === undefined || state.answerA === null) return null

  let a: LabeledRange
  let b: LabeledRange
  let samples: SampleAnswer[] = []
  if (state.mode === 'solo') {
    samples = samplesForScenario(catalog, scenario.id)
    const sample = samples.find((s) => s.sampleId === state.sampleId)
    if (sample === undefined) return null
    a = { label: 'あなた', range: state.answerA }
    b = { label: formatSampleLabel(sample), range: sample.range }
  } else {
    if (state.answerB === null) return null
    a = { label: 'Aさん', range: state.answerA }
    b = { label: 'Bさん', range: state.answerB }
  }

  const result = compareRanges(a.range, b.range, scenario.maxSeconds)
  return {
    scenario,
    a,
    b,
    result,
    description: describeComparison(a, b, result, scenario),
    candidates: agreementCandidates(a.range, b.range, result),
    samples,
    selectedSampleId: state.mode === 'solo' ? state.sampleId : null,
  }
}

export interface AgreementView {
  readonly seconds: Seconds | null
  /** 例：「10分以内に着くね」。時間未選択なら null */
  readonly text: string | null
  /** 文の「いつ」「何をする」。時間未選択なら null */
  readonly parts: AgreementParts | null
  /** 例：「10分以内に、本当に着けそう？」。時間未選択なら null */
  readonly feasibilityQuestion: string | null
  readonly approvedBy: readonly ParticipantId[]
  readonly requiredApprovers: readonly ParticipantId[]
}

export function selectAgreementView(
  state: SessionState,
  catalog: SessionCatalog,
): AgreementView | null {
  if (state.step !== 'AGREEMENT' && state.step !== 'COMPLETE') return null
  const scenario = findScenario(catalog, state.scenarioId)
  if (scenario === undefined) return null
  const { seconds, approvedBy } = state.agreement
  return {
    seconds,
    text: seconds === null ? null : buildAgreementText(scenario, seconds),
    parts: seconds === null ? null : buildAgreementParts(scenario, seconds),
    feasibilityQuestion: seconds === null ? null : buildFeasibilityQuestion(scenario, seconds),
    approvedBy,
    requiredApprovers: requiredApprovers(state.mode),
  }
}
