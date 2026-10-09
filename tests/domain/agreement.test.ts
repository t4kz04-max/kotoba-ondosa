import { describe, expect, it } from 'vitest'
import {
  agreementCandidates,
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
    expect(buildAgreementText(sugu, 600)).toBe('10分以内に行くね')
    expect(buildAgreementText(chotto, 30)).toBe('30秒だけ待ってて')
    expect(buildAgreementText(atode, 5400)).toBe('1時間30分以内に始めるね')
    expect(buildFeasibilityQuestion(sugu, 600)).toBe('10分以内に、本当に着けそう？')
  })
})
