import { describe, expect, it } from 'vitest'
import {
  compareContextRanges,
  describeContextComparison,
  type LabeledSceneRange,
} from '../../src/domain/contextCompare'
import { intersectRanges } from '../../src/domain/range'
import type { TimeRange } from '../../src/domain/types'

const MIN = 60
const r = (start: number, end: number): TimeRange => ({ start: start * MIN, end: end * MIN })
const LABELS = ['すぐ行く', 'すぐ返信する', 'すぐ始める']
const labeled = (ranges: TimeRange[]): LabeledSceneRange[] => ranges.map((range, i) => ({ label: LABELS[i], range }))

function describeOf(ranges: TimeRange[]) {
  const result = compareContextRanges(ranges)
  return { result, text: describeContextComparison(labeled(ranges), result, 'すぐ') }
}

describe('compareContextRanges', () => {
  it('detects three identical ranges', () => {
    const { result } = describeOf([r(0, 5), r(0, 5), r(0, 5)])
    expect(result.allIdentical).toBe(true)
    expect(result.common).toEqual(r(0, 5))
    expect(result.midpointSpread).toBe(0)
  })

  it('computes the common part as [max of starts, min of ends] for partial overlaps', () => {
    const { result } = describeOf([r(0, 10), r(5, 15), r(8, 20)])
    expect(result.allIdentical).toBe(false)
    expect(result.common).toEqual(r(8, 10))
    expect(result.commonIsPoint).toBe(false)
  })

  it('distinguishes "has a common part" from "identical"', () => {
    // 1つがほかを含んでいても、開始・終了が違えば同じではない
    const { result } = describeOf([r(0, 30), r(5, 10), r(5, 10)])
    expect(result.common).toEqual(r(5, 10))
    expect(result.allIdentical).toBe(false)
  })

  it('returns null when no time is common to all three (even if two overlap)', () => {
    const { result } = describeOf([r(0, 5), r(3, 8), r(10, 20)])
    expect(result.common).toBeNull()
    expect(result.commonIsPoint).toBe(false)
  })

  it('treats a single shared instant as a point', () => {
    const { result } = describeOf([r(0, 5), r(5, 10), r(2, 5)])
    expect(result.common).toEqual(r(5, 5))
    expect(result.commonIsPoint).toBe(true)
  })

  it('handles zero-length ranges, 0 and the maximum', () => {
    expect(compareContextRanges([r(0, 0), r(0, 0), r(0, 0)])).toMatchObject({ allIdentical: true, common: r(0, 0), commonIsPoint: true })
    expect(compareContextRanges([r(30, 30), r(0, 30), r(20, 30)])).toMatchObject({ common: r(30, 30), commonIsPoint: true })
    expect(compareContextRanges([r(0, 0), r(0, 30), r(1, 30)]).common).toBeNull()
  })

  it('matches pairwise intersection (intersectRanges) for many inputs', () => {
    const values = [0, 3, 5, 10, 30]
    for (const a0 of values)
      for (const a1 of values.filter((v) => v >= a0))
        for (const b0 of values)
          for (const b1 of values.filter((v) => v >= b0)) {
            const ranges = [r(a0, a1), r(b0, b1), r(5, 10)]
            const ab = intersectRanges(ranges[0], ranges[1])
            const expected = ab === null ? null : intersectRanges(ab, ranges[2])
            expect(compareContextRanges(ranges).common).toEqual(expected)
          }
  })

  it('reports the earliest and latest midpoints, including ties', () => {
    const { result } = describeOf([r(0, 4), r(0, 4), r(10, 20)])
    expect(result.earliestMidpoint).toEqual([0, 1])
    expect(result.latestMidpoint).toEqual([2])
    expect(result.midpointSpread).toBe(13 * MIN)
  })

  it('needs at least two ranges', () => {
    expect(() => compareContextRanges([r(0, 5)])).toThrow(RangeError)
  })
})

describe('describeContextComparison', () => {
  it('says the times were the same only when all three are identical', () => {
    const { text } = describeOf([r(0, 5), r(0, 5), r(0, 5)])
    expect(text.headline).toBe('3つの場面で、あなたの「すぐ」は同じでした')
    expect(text.details).toContain('3つの場面で、選んだ時間が同じでした。')
    expect(text.details.join('')).not.toContain('違い')
  })

  it('describes a common range', () => {
    const { text } = describeOf([r(0, 10), r(5, 15), r(8, 20)])
    expect(text.headline).toBe('場面によって、あなたの「すぐ」の範囲が違いました')
    expect(text.details).toContain('場面によって、選んだ時間の範囲が違いました。')
    expect(text.details).toContain('3つの場面に共通する時間があります。共通するのは8分〜10分です。')
  })

  it('describes no common time', () => {
    const { text } = describeOf([r(0, 5), r(3, 8), r(10, 20)])
    expect(text.details).toContain('3つすべてに共通する時間はありません。')
  })

  it('describes a single common instant', () => {
    const { text } = describeOf([r(0, 5), r(5, 10), r(2, 5)])
    expect(text.details.join('')).toContain('共通するのは、ちょうど5分の1点です。')
  })

  it('names the earliest and latest scenes by midpoint with the difference', () => {
    const { text } = describeOf([r(0, 4), r(0, 4), r(10, 20)])
    expect(text.details).toContain(
      '範囲のまんなかがいちばん早いのは「すぐ行く」と「すぐ返信する」、いちばん遅いのは「すぐ始める」で、13分ちがいます。',
    )
  })

  it('says midpoints are the same when they are, even if ranges differ', () => {
    const { text } = describeOf([r(4, 6), r(0, 10), r(5, 5)])
    expect(text.details).toContain('範囲のまんなかは、どの場面も同じでした。')
  })

  it('never judges personality, correctness or misunderstanding rates', () => {
    const cases = [
      [r(0, 5), r(0, 5), r(0, 5)],
      [r(0, 10), r(5, 15), r(8, 20)],
      [r(0, 5), r(3, 8), r(10, 20)],
      [r(0, 5), r(5, 10), r(2, 5)],
    ]
    for (const ranges of cases) {
      const { text } = describeOf(ranges)
      const all = [text.headline, ...text.details, text.prompt].join('')
      for (const word of ['ルーズ', '性格', '誤解', '正しい', '間違', '普通', '%', '率', 'スコア', '必ず']) {
        expect(all).not.toContain(word)
      }
    }
  })
})
