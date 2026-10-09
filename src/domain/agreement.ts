import { formatDuration } from './format'
import type { AgreementCandidate, ComparisonResult, Scenario, Seconds, TimeRange } from './types'

const BASIS_PRIORITY: readonly AgreementCandidate['basis'][] = [
  'end-of-intersection',
  'end-of-a',
  'end-of-b',
]

/**
 * 具体化の候補（話し合いの手がかり）を返す。
 * 各範囲の終わりと共通範囲の終わりだけを使い、妥協点（中間値など）は作らない。
 * 候補は解釈から出したものであり、実行できる約束を意味しない。
 * 0 秒は除外し、同じ秒数は優先順位の高い根拠を残して1つにまとめ、昇順に並べる。
 */
export function agreementCandidates(
  a: TimeRange,
  b: TimeRange,
  result: ComparisonResult,
): AgreementCandidate[] {
  const raw: AgreementCandidate[] = []
  if (result.intersection !== null) {
    raw.push({ seconds: result.intersection.end, basis: 'end-of-intersection' })
  }
  raw.push({ seconds: a.end, basis: 'end-of-a' })
  raw.push({ seconds: b.end, basis: 'end-of-b' })

  const bySeconds = new Map<Seconds, AgreementCandidate>()
  for (const basis of BASIS_PRIORITY) {
    for (const candidate of raw) {
      if (candidate.basis !== basis || candidate.seconds <= 0) continue
      if (!bySeconds.has(candidate.seconds)) bySeconds.set(candidate.seconds, candidate)
    }
  }
  return [...bySeconds.values()].sort((x, y) => x.seconds - y.seconds)
}

/** 具体化で選べる時間か（1秒以上、上限以下の整数） */
export function isValidAgreementSeconds(seconds: Seconds, maxSeconds: Seconds): boolean {
  return Number.isInteger(seconds) && seconds >= 1 && seconds <= maxSeconds
}

/** 例：「10分以内に着くね」 */
export function buildAgreementText(scenario: Scenario, seconds: Seconds): string {
  return scenario.agreementTemplate.replace('{time}', formatDuration(seconds))
}

/** 完成した文の「いつ」と「何をする」。どちらも文にそのまま含まれる部分だけ */
export interface AgreementParts {
  /** 例：「10分以内」 */
  readonly when: string
  /** 例：「着く」 */
  readonly action: string
}

/** 完成した文を「いつ」「何をする」に分ける（文に含まれない情報は足さない） */
export function buildAgreementParts(scenario: Scenario, seconds: Seconds): AgreementParts {
  return {
    when: scenario.agreementWhen.replace('{time}', formatDuration(seconds)),
    action: scenario.agreementAction,
  }
}

/** 例：「10分以内に、本当に着けそう？」 */
export function buildFeasibilityQuestion(scenario: Scenario, seconds: Seconds): string {
  return scenario.feasibilityTemplate.replace('{time}', formatDuration(seconds))
}
