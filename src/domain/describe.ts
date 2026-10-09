import { formatDuration, formatRange } from './format'
import type { ComparisonDescription, ComparisonResult, Scenario, TimeRange } from './types'

export interface LabeledRange {
  readonly label: string
  readonly range: TimeRange
}

export const COMPARISON_PROMPT =
  '同じ言葉でも、思い浮かべる時間はちがうことがあります。具体的な時間にしてみましょう。'

function midpointSentence(a: LabeledRange, b: LabeledRange, result: ComparisonResult): string {
  if (result.laterMidpoint === 'same') return '範囲のまんなかは同じです。'
  const later = result.laterMidpoint === 'A' ? a.label : b.label
  return `範囲のまんなかは、${later}のほうが${formatDuration(result.midpointDifference)}あとです。`
}

function rangesSentence(a: LabeledRange, b: LabeledRange): string {
  return `${a.label}は${formatRange(a.range)}、${b.label}は${formatRange(b.range)}でした。`
}

/**
 * 比較結果を、評価を含まない事実の文章にする。
 * 誤解の確率・相性・どちらが普通か・どちらが正しいかには触れない。
 */
export function describeComparison(
  a: LabeledRange,
  b: LabeledRange,
  result: ComparisonResult,
  scenario: Scenario,
): ComparisonDescription {
  const phrase = `「${scenario.phrase}」`
  const intersection = result.intersection === null ? '' : formatRange(result.intersection)

  switch (result.relation) {
    case 'identical':
      return {
        headline: `2人の${phrase}はぴったり同じでした`,
        details: [`2人とも${formatRange(a.range)}だと考えていました。`],
        prompt: COMPARISON_PROMPT,
      }
    case 'a-contains-b':
    case 'b-contains-a': {
      const [outer, inner] = result.relation === 'a-contains-b' ? [a, b] : [b, a]
      return {
        headline: `${inner.label}の${phrase}は、${outer.label}の範囲にすっぽり入っています`,
        details: [
          rangesSentence(a, b),
          `共通しているのは${intersection}です。`,
          midpointSentence(a, b, result),
        ],
        prompt: COMPARISON_PROMPT,
      }
    }
    case 'overlap':
      return {
        headline: `2人の${phrase}は一部だけ重なっています`,
        details: [
          rangesSentence(a, b),
          `2人とも当てはまると考えたのは${intersection}です。`,
          midpointSentence(a, b, result),
        ],
        prompt: COMPARISON_PROMPT,
      }
    case 'touch':
      return {
        headline: `2人の${phrase}は${intersection}の1点だけで重なっています`,
        details: [
          rangesSentence(a, b),
          `共通しているのは${intersection}ちょうどの1点です。`,
          midpointSentence(a, b, result),
        ],
        prompt: COMPARISON_PROMPT,
      }
    case 'gap':
      return {
        headline: `2人の${phrase}は重なりませんでした`,
        details: [
          rangesSentence(a, b),
          `2人の範囲のあいだには${formatDuration(result.gapLength)}のひらきがあります。`,
          midpointSentence(a, b, result),
          'このまま使うと、思っていた時間がちがうかもしれません。',
        ],
        prompt: COMPARISON_PROMPT,
      }
  }
}
