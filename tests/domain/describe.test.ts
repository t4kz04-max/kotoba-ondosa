import { describe, expect, it } from 'vitest'
import { COMPARISON_PROMPT, describeComparison } from '../../src/domain/describe'
import { compareRanges } from '../../src/domain/range'
import type { TimeRange } from '../../src/domain/types'
import { SCENARIOS } from '../../src/data/scenarios'

const scenario = SCENARIOS[0]
const r = (start: number, end: number): TimeRange => ({ start, end })

function describePair(a: TimeRange, b: TimeRange) {
  const result = compareRanges(a, b, scenario.maxSeconds)
  return describeComparison({ label: 'Aさん', range: a }, { label: 'Bさん', range: b }, result, scenario)
}

/** 判定・確率・相性・基準を示す表現 */
const FORBIDDEN_TERMS = [
  '正しい', '正解', '間違', '普通', '常識', '相性', '確率', '誤解', 'すれ違', '率',
  '%', '％', 'スコア', '点数', 'おかしい', 'ずれ', 'すぎ', '良い', '悪い',
]

const PAIRS: [string, TimeRange, TimeRange][] = [
  ['identical', r(60, 300), r(60, 300)],
  ['a-contains-b', r(0, 1800), r(300, 600)],
  ['b-contains-a', r(300, 600), r(0, 1800)],
  ['overlap', r(0, 900), r(180, 1800)],
  ['touch', r(0, 300), r(300, 900)],
  ['gap', r(0, 300), r(900, 1800)],
]

describe('describeComparison', () => {
  it.each(PAIRS)('%s: contains no judgemental or probabilistic terms', (_name, a, b) => {
    const description = describePair(a, b)
    const text = [description.headline, ...description.details, description.prompt].join('\n')
    for (const term of FORBIDDEN_TERMS) {
      expect(text, `contains "${term}"`).not.toContain(term)
    }
    expect(description.prompt).toBe(COMPARISON_PROMPT)
  })

  it('describes identical ranges', () => {
    const d = describePair(r(60, 300), r(60, 300))
    expect(d.headline).toBe('2人の「すぐ行く」はぴったり同じでした')
    expect(d.details).toEqual(['2人とも1分〜5分だと考えていました。'])
  })

  it('describes containment with the inner label first', () => {
    expect(describePair(r(0, 1800), r(300, 600)).headline).toBe(
      'Bさんの「すぐ行く」は、Aさんの範囲にすっぽり入っています',
    )
    expect(describePair(r(300, 600), r(0, 1800)).headline).toBe(
      'Aさんの「すぐ行く」は、Bさんの範囲にすっぽり入っています',
    )
  })

  it('describes overlap with the shared range', () => {
    const d = describePair(r(0, 900), r(180, 1800))
    expect(d.details).toContain('2人とも当てはまると考えたのは3分〜15分です。')
  })

  it('describes a one-point touch', () => {
    const d = describePair(r(0, 300), r(300, 900))
    expect(d.headline).toBe('2人の「すぐ行く」は5分の1点だけで重なっています')
  })

  it('describes a gap with its length and midpoint difference', () => {
    const d = describePair(r(0, 300), r(900, 1800))
    expect(d.headline).toBe('2人の「すぐ行く」は重なりませんでした')
    expect(d.details).toContain('2人の範囲のあいだには10分のひらきがあります。')
    expect(d.details).toContain('範囲のまんなかは、Bさんのほうが20分あとです。')
  })

  it('says midpoints are the same when they coincide', () => {
    const d = describePair(r(0, 600), r(200, 400))
    expect(d.details).toContain('範囲のまんなかは同じです。')
  })
})
