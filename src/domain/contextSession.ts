import { validateDraft } from './range'
import type { RangeDraft, Seconds, TimeRange } from './types'

/**
 * 「場面を変えて比べる」の状態（Phase 6A）。
 * 既存の SessionState（ひとり・ふたりモード）とは独立させ、既存の遷移には手を入れない。
 * 1人で、同じ言葉を場面ごとに答える。
 */
export interface ContextState {
  readonly step: 'INPUT' | 'RESULT'
  /** いま答えている場面の番号（0 から） */
  readonly index: number
  readonly draft: RangeDraft
  /** 確定した回答。未回答は null */
  readonly answers: readonly (TimeRange | null)[]
}

export type ContextEvent =
  | { readonly type: 'SET_DRAFT'; readonly draft: RangeDraft }
  | { readonly type: 'SUBMIT_ANSWER' }
  | { readonly type: 'BACK' }
  | { readonly type: 'RETRY' }

export type ContextTransitionError = 'invalid-event-for-step' | 'invalid-answer' | 'at-first-scene'

export type ContextTransitionResult =
  | { readonly ok: true; readonly state: ContextState }
  | { readonly ok: false; readonly state: ContextState; readonly error: ContextTransitionError }

export interface ContextConfig {
  readonly sceneCount: number
  readonly maxSeconds: Seconds
}

const EMPTY_DRAFT: RangeDraft = { start: null, end: null }

export function createInitialContextState(sceneCount: number): ContextState {
  return {
    step: 'INPUT',
    index: 0,
    draft: EMPTY_DRAFT,
    answers: Array.from({ length: sceneCount }, () => null),
  }
}

function toDraft(range: TimeRange | null | undefined): RangeDraft {
  return range === null || range === undefined ? EMPTY_DRAFT : { start: range.start, end: range.end }
}

/**
 * 状態遷移。不正な遷移は拒否し、元の state をそのまま返す。
 * 確定は既存の validateDraft で検証する（未入力・数字以外・負・上限超過・逆転を拒否）。
 */
export function contextTransition(
  state: ContextState,
  event: ContextEvent,
  config: ContextConfig,
): ContextTransitionResult {
  const reject = (error: ContextTransitionError): ContextTransitionResult => ({ ok: false, state, error })
  const ok = (next: ContextState): ContextTransitionResult => ({ ok: true, state: next })

  switch (event.type) {
    case 'SET_DRAFT':
      if (state.step !== 'INPUT') return reject('invalid-event-for-step')
      return ok({ ...state, draft: event.draft })

    case 'SUBMIT_ANSWER': {
      if (state.step !== 'INPUT') return reject('invalid-event-for-step')
      const validation = validateDraft(state.draft, config.maxSeconds)
      if (!validation.ok) return reject('invalid-answer')
      const answers = state.answers.map((answer, i) => (i === state.index ? validation.range : answer))
      const nextIndex = state.index + 1
      if (nextIndex >= config.sceneCount) {
        return ok({ ...state, step: 'RESULT', answers, draft: EMPTY_DRAFT })
      }
      // 前の場面に戻ってから進みなおしたときは、以前の回答を入力欄に戻す
      return ok({ ...state, index: nextIndex, answers, draft: toDraft(answers[nextIndex]) })
    }

    case 'BACK':
      if (state.step !== 'INPUT') return reject('invalid-event-for-step')
      // 最初の場面からの「戻る」はスタート画面へ（App 側で扱う）
      if (state.index === 0) return reject('at-first-scene')
      return ok({ ...state, index: state.index - 1, draft: toDraft(state.answers[state.index - 1]) })

    case 'RETRY':
      return ok(createInitialContextState(config.sceneCount))
  }
}

/** useReducer 用。拒否された遷移では同じ state オブジェクトを返す */
export function createContextReducer(config: ContextConfig) {
  return (state: ContextState, event: ContextEvent): ContextState =>
    contextTransition(state, event, config).state
}

/** 結果画面用。すべて回答済みのときだけ範囲の配列を返す */
export function completedAnswers(state: ContextState): readonly TimeRange[] | null {
  if (state.step !== 'RESULT') return null
  const answers: TimeRange[] = []
  for (const answer of state.answers) {
    if (answer === null) return null
    answers.push(answer)
  }
  return answers
}
