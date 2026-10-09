import { formatDuration, formatRange } from './format'
import { midpoint } from './range'
import type { Seconds, TimeRange } from './types'

/** 場面の名前つきの範囲 */
export interface LabeledSceneRange {
  /** 例：「すぐ行く」 */
  readonly label: string
  readonly range: TimeRange
}

export interface ContextComparisonResult {
  /** すべての範囲の開始と終了が同じ */
  readonly allIdentical: boolean
  /**
   * すべての範囲に共通する部分。commonMin = 開始の最大、commonMax = 終了の最小で、
   * commonMin <= commonMax のときだけ存在する（なければ null）。
   * 共通部分があっても、各範囲の開始・終了が同じとは限らない（allIdentical とは別）
   */
  readonly common: TimeRange | null
  /** 共通部分が1点だけ（commonMin === commonMax） */
  readonly commonIsPoint: boolean
  /** 範囲のまんなかが最も早い場面の番号（同じ値が複数あればすべて） */
  readonly earliestMidpoint: readonly number[]
  /** 範囲のまんなかが最も遅い場面の番号（同じ値が複数あればすべて） */
  readonly latestMidpoint: readonly number[]
  /** まんなかの最大と最小の差（0.5秒単位になりうる） */
  readonly midpointSpread: number
}

/**
 * 2つ以上（このアプリでは3つ）の範囲を比べる。範囲は検証済み（validateRange で ok）を前提とする。
 * 評価や推測はせず、共通部分・一致・まんなかの位置だけを計算する。
 */
export function compareContextRanges(ranges: readonly TimeRange[]): ContextComparisonResult {
  const [first] = ranges
  if (first === undefined || ranges.length < 2) {
    throw new RangeError('compareContextRanges needs at least two ranges')
  }
  const commonMin: Seconds = Math.max(...ranges.map((r) => r.start))
  const commonMax: Seconds = Math.min(...ranges.map((r) => r.end))
  const common = commonMin <= commonMax ? { start: commonMin, end: commonMax } : null
  const allIdentical = ranges.every((r) => r.start === first.start && r.end === first.end)

  const mids = ranges.map(midpoint)
  const minMid = Math.min(...mids)
  const maxMid = Math.max(...mids)
  const indexesOf = (value: number) => mids.flatMap((m, i) => (m === value ? [i] : []))

  return {
    allIdentical,
    common,
    commonIsPoint: common !== null && common.start === common.end,
    earliestMidpoint: indexesOf(minMid),
    latestMidpoint: indexesOf(maxMid),
    midpointSpread: maxMid - minMid,
  }
}

export interface ContextDescription {
  readonly headline: string
  readonly details: readonly string[]
  readonly prompt: string
}

function names(scenes: readonly LabeledSceneRange[], indexes: readonly number[]): string {
  return indexes.map((i) => `「${scenes[i].label}」`).join('と')
}

/**
 * 比較結果を、計算した事実だけの文章にする。
 * 性格・正しさ・誤解の起きやすさには触れない。「場面で必ず変わる」とも言わない。
 */
export function describeContextComparison(
  scenes: readonly LabeledSceneRange[],
  result: ContextComparisonResult,
  word: string,
): ContextDescription {
  const count = scenes.length
  const quoted = `「${word}」`

  if (result.allIdentical) {
    return {
      headline: `${count}つの場面で、あなたの${quoted}は同じでした`,
      details: [`${count}つの場面で、選んだ時間が同じでした。`, `どの場面も${formatRange(scenes[0].range)}でした。`],
      prompt:
        '場面が変わっても、同じ時間を思いうかべることもあります。相手も同じとは限らないので、大事なときは時間で伝えてみよう。',
    }
  }

  const details: string[] = ['場面によって、選んだ時間の範囲が違いました。']
  const { common } = result
  if (common === null) {
    details.push(`${count}つすべてに共通する時間はありません。`)
  } else if (result.commonIsPoint) {
    details.push(`${count}つの場面に共通する時間があります。共通するのは、ちょうど${formatDuration(common.start)}の1点です。`)
  } else {
    details.push(`${count}つの場面に共通する時間があります。共通するのは${formatRange(common)}です。`)
  }
  if (result.midpointSpread === 0) {
    details.push('範囲のまんなかは、どの場面も同じでした。')
  } else {
    details.push(
      `範囲のまんなかがいちばん早いのは${names(scenes, result.earliestMidpoint)}、いちばん遅いのは${names(scenes, result.latestMidpoint)}で、${formatDuration(result.midpointSpread)}ちがいます。`,
    )
  }

  return {
    headline: `場面によって、あなたの${quoted}の範囲が違いました`,
    details,
    prompt: '同じ言葉でも、場面によって思いうかべる時間が変わることがあります。大事なときは、時間で伝えてみよう。',
  }
}
