import { describe, expect, it } from 'vitest'
import {
  agreementCandidates,
  buildAgreementParts,
  buildAgreementText,
  buildFeasibilityQuestion,
  isValidAgreementSeconds,
} from '../../src/domain/agreement'
import { compareRanges } from '../../src/domain/range'
import type { TimeRange } from '../../src/domain/types'
import { SCENARIOS } from '../../src/data/scenarios'

const MAX = 3600
const r = (start: number, end: number): TimeRange => ({ start, end })
const candidatesFor = (a: TimeRange, b: TimeRange) =>
  agreementCandidates(a, b, compareRanges(a, b, MAX))

describe('agreementCandidates', () => {
  it('uses range ends and the intersection end, sorted ascending', () => {
    expect(candidatesFor(r(0, 900), r(180, 1800))).toEqual([
      { seconds: 900, basis: 'end-of-intersection' },
      { seconds: 1800, basis: 'end-of-b' },
    ])
  })

  it('has no intersection candidate when ranges are separate', () => {
    expect(candidatesFor(r(0, 300), r(900, 1800))).toEqual([
      { seconds: 300, basis: 'end-of-a' },
      { seconds: 1800, basis: 'end-of-b' },
    ])
  })

  it('merges duplicate seconds keeping the higher-priority basis', () => {
    expect(candidatesFor(r(60, 300), r(60, 300))).toEqual([
      { seconds: 300, basis: 'end-of-intersection' },
    ])
  })

  it('excludes 0 seconds', () => {
    expect(candidatesFor(r(0, 0), r(0, 0))).toEqual([])
    expect(candidatesFor(r(0, 0), r(0, 60))).toEqual([{ seconds: 60, basis: 'end-of-b' }])
  })

  it('does not invent a compromise value between the ranges', () => {
    const seconds = candidatesFor(r(0, 300), r(900, 1800)).map((c) => c.seconds)
    expect(seconds).not.toContain(600)
  })
})

describe('agreement text', () => {
  it('validates selectable seconds', () => {
    expect(isValidAgreementSeconds(1, MAX)).toBe(true)
    expect(isValidAgreementSeconds(MAX, MAX)).toBe(true)
    expect(isValidAgreementSeconds(0, MAX)).toBe(false)
    expect(isValidAgreementSeconds(MAX + 1, MAX)).toBe(false)
    expect(isValidAgreementSeconds(1.5, MAX)).toBe(false)
  })

  it('fills the scenario templates', () => {
    const [sugu, chotto, atode] = SCENARIOS
    expect(buildAgreementText(sugu, 600)).toBe('10分以内に着くね')
    expect(buildAgreementText(chotto, 30)).toBe('30秒以内にそっちへ行くね')
    expect(buildAgreementText(atode, 5400)).toBe('1時間30分以内に宿題を始めるね')
    expect(buildFeasibilityQuestion(sugu, 600)).toBe('10分以内に、本当に着けそう？')
    expect(buildFeasibilityQuestion(chotto, 30)).toBe('30秒以内に、本当に行けそう？')
    expect(buildFeasibilityQuestion(atode, 5400)).toBe('1時間30分以内に、本当に宿題を始められそう？')
  })

  it('splits the sentence into "when" and "what" using only words that appear in it', () => {
    const [sugu, chotto, atode] = SCENARIOS
    expect(buildAgreementParts(sugu, 600)).toEqual({ when: '10分以内', action: '着く' })
    expect(buildAgreementParts(chotto, 30)).toEqual({ when: '30秒以内', action: 'そっちへ行く' })
    expect(buildAgreementParts(atode, 5400)).toEqual({ when: '1時間30分以内', action: '宿題を始める' })
    for (const scenario of SCENARIOS) {
      for (const seconds of [1, 60, 600, scenario.maxSeconds]) {
        const text = buildAgreementText(scenario, seconds)
        const parts = buildAgreementParts(scenario, seconds)
        // 「いつ」→「何をする」の順に、文にそのまま含まれている
        expect(text.indexOf(parts.when)).toBe(0)
        expect(text.indexOf(parts.action)).toBeGreaterThan(parts.when.length - 1)
      }
    }
  })

  it('makes each sentence describe the same moment as the scenario endpoint', () => {
    // 比較で答えた範囲は「起点 → 終点」の時間。完成文も問いも、その終点の行動を表す
    const expected = {
      'sugu-iku': { endpoint: '着く', question: '着け' },
      'chotto-matte': { endpoint: '行く', question: '行け' },
      'atode-yaru': { endpoint: '宿題を始める', question: '宿題を始め' },
    } as const
    for (const scenario of SCENARIOS) {
      const e = expected[scenario.id]
      expect(scenario.endpointLabel).toContain(e.endpoint)
      expect(scenario.agreementAction).toContain(e.endpoint)
      expect(scenario.agreementTemplate).toContain(scenario.agreementAction)
      expect(scenario.agreementTemplate).toContain(scenario.agreementWhen)
      expect(scenario.feasibilityTemplate).toContain(e.question)
      // 「以内」（上限を約束する形）なので、候補には範囲の終わりを使う（DOMAIN_SPEC §7.2）
      expect(scenario.agreementWhen).toBe('{time}以内')
    }
    // 「すぐ行く」は到着までの時間で答えるので、出発とも読める「行く」ではなく「着く」の文にする
    expect(SCENARIOS[0].agreementTemplate).not.toContain('行く')
  })
})
