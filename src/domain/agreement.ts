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

/** 例：「10分以内に行くね」 */
export function buildAgreementText(scenario: Scenario, seconds: Seconds): string {
  return scenario.agreementTemplate.replace('{time}', formatDuration(seconds))
}

/** 例：「10分以内に、本当に着けそう？」 */
export function buildFeasibilityQuestion(scenario: Scenario, seconds: Seconds): string {
  return scenario.feasibilityTemplate.replace('{time}', formatDuration(seconds))
}
