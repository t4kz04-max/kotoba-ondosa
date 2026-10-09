import { describe, expect, it } from 'vitest'
import {
  classifyRelation,
  compareRanges,
  gapBetween,
  hasIntersection,
  intersectionLength,
  intersectRanges,
  midpoint,
  midpointDifference,
  validateDraft,
  validateRange,
} from '../../src/domain/range'
import type { RangeRelation, TimeRange } from '../../src/domain/types'

const MAX = 3600
const r = (start: number, end: number): TimeRange => ({ start, end })

describe('validateRange', () => {
  it('accepts a normal range, a range including 0, and a zero-length range', () => {
    expect(validateRange(r(60, 300), MAX)).toEqual({ ok: true, range: r(60, 300) })
    expect(validateRange(r(0, 0), MAX).ok).toBe(true)
    expect(validateRange(r(0, MAX), MAX).ok).toBe(true)
    expect(validateRange(r(300, 300), MAX).ok).toBe(true)
  })

  it('rejects a reversed range', () => {
    expect(validateRange(r(600, 300), MAX)).toEqual({ ok: false, errors: ['start-after-end'] })
  })

  it('rejects values above the max', () => {
    expect(validateRange(r(0, MAX + 1), MAX)).toEqual({ ok: false, errors: ['exceeds-max'] })
  })

  it('rejects negative and non-integer values', () => {
    expect(validateRange(r(-1, 10), MAX)).toEqual({ ok: false, errors: ['negative'] })
    expect(validateRange(r(1.5, 10), MAX)).toEqual({ ok: false, errors: ['not-integer'] })
    expect(validateRange(r(Number.NaN, 10), MAX)).toEqual({ ok: false, errors: ['not-integer'] })
    expect(validateRange(r(0, Number.POSITIVE_INFINITY), MAX)).toEqual({
      ok: false,
      errors: ['not-integer', 'exceeds-max'],
    })
  })

  it('lists every error at once without duplicates', () => {
    const result = validateRange(r(MAX + 10, -5), MAX)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect([...result.errors].sort()).toEqual(['exceeds-max', 'negative', 'start-after-end'])
    }
  })
})

describe('validateDraft', () => {
  it('treats missing endpoints as incomplete', () => {
    expect(validateDraft({ start: null, end: null }, MAX)).toEqual({ ok: false, errors: ['incomplete'] })
    expect(validateDraft({ start: 0, end: null }, MAX)).toEqual({ ok: false, errors: ['incomplete'] })
    expect(validateDraft({ start: null, end: 60 }, MAX)).toEqual({ ok: false, errors: ['incomplete'] })
  })

  it('validates a complete draft like a range', () => {
    expect(validateDraft({ start: 0, end: 60 }, MAX)).toEqual({ ok: true, range: r(0, 60) })
    expect(validateDraft({ start: 60, end: 0 }, MAX)).toEqual({ ok: false, errors: ['start-after-end'] })
  })
})

describe('interval calculations', () => {
  it('computes a partial overlap', () => {
    expect(intersectRanges(r(0, 900), r(180, 1800))).toEqual(r(180, 900))
    expect(intersectionLength(r(0, 900), r(180, 1800))).toBe(720)
    expect(hasIntersection(r(0, 900), r(180, 1800))).toBe(true)
    expect(gapBetween(r(0, 900), r(180, 1800))).toBe(0)
  })

  it('treats a single shared endpoint as an intersection of length 0', () => {
    expect(intersectRanges(r(0, 300), r(300, 900))).toEqual(r(300, 300))
    expect(hasIntersection(r(0, 300), r(300, 900))).toBe(true)
    expect(intersectionLength(r(0, 300), r(300, 900))).toBe(0)
    expect(gapBetween(r(0, 300), r(300, 900))).toBe(0)
  })

  it('computes the gap between separate ranges', () => {
    expect(intersectRanges(r(0, 300), r(900, 1800))).toBeNull()
    expect(hasIntersection(r(0, 300), r(900, 1800))).toBe(false)
    expect(intersectionLength(r(0, 300), r(900, 1800))).toBe(0)
    expect(gapBetween(r(0, 300), r(900, 1800))).toBe(600)
  })

  it('is symmetric', () => {
    const pairs: [TimeRange, TimeRange][] = [
      [r(0, 900), r(180, 1800)],
      [r(0, 300), r(900, 1800)],
      [r(0, 1800), r(300, 600)],
      [r(300, 300), r(0, 600)],
    ]
    for (const [a, b] of pairs) {
      expect(intersectRanges(a, b)).toEqual(intersectRanges(b, a))
      expect(gapBetween(a, b)).toBe(gapBetween(b, a))
      expect(midpointDifference(a, b)).toBe(midpointDifference(b, a))
    }
  })

  it('computes midpoints that can be 0.5 seconds', () => {
    expect(midpoint(r(0, 1))).toBe(0.5)
    expect(midpoint(r(10, 25))).toBe(17.5)
    expect(midpointDifference(r(0, 1), r(0, 0))).toBe(0.5)
  })
})

describe('classifyRelation', () => {
  const cases: [string, TimeRange, TimeRange, RangeRelation][] = [
    ['identical ranges', r(60, 300), r(60, 300), 'identical'],
    ['identical points', r(300, 300), r(300, 300), 'identical'],
    ['identical full ranges', r(0, MAX), r(0, MAX), 'identical'],
    ['A contains B', r(0, 1800), r(300, 600), 'a-contains-b'],
    ['A contains B sharing the start', r(0, 600), r(0, 300), 'a-contains-b'],
    ['A contains B sharing the end', r(0, 600), r(300, 600), 'a-contains-b'],
    ['B contains A', r(300, 600), r(0, 1800), 'b-contains-a'],
    ['A point inside B', r(300, 300), r(0, 600), 'b-contains-a'],
    ['A point on the end of B (containment wins over touch)', r(600, 600), r(0, 600), 'b-contains-a'],
    ['B point at 0 inside A', r(0, 60), r(0, 0), 'a-contains-b'],
    ['partial overlap', r(0, 900), r(180, 1800), 'overlap'],
    ['partial overlap reversed order', r(180, 1800), r(0, 900), 'overlap'],
    ['one-point touch', r(0, 300), r(300, 900), 'touch'],
    ['one-point touch reversed order', r(300, 900), r(0, 300), 'touch'],
    ['separate ranges', r(0, 300), r(900, 1800), 'gap'],
    ['separate points', r(60, 60), r(300, 300), 'gap'],
  ]

  it.each(cases)('%s', (_name, a, b, expected) => {
    expect(classifyRelation(a, b)).toBe(expected)
  })

  it('swapping A and B swaps the containment direction', () => {
    expect(classifyRelation(r(0, 1800), r(300, 600))).toBe('a-contains-b')
    expect(classifyRelation(r(300, 600), r(0, 1800))).toBe('b-contains-a')
  })
})

describe('compareRanges', () => {
  it('builds a complete result for separate ranges', () => {
    expect(compareRanges(r(0, 300), r(900, 1800), MAX)).toEqual({
      relation: 'gap',
      hasIntersection: false,
      intersection: null,
      intersectionLength: 0,
      gapLength: 600,
      midpointA: 150,
      midpointB: 1350,
      midpointDifference: 1200,
      laterMidpoint: 'B',
    })
  })

  it('builds a result for a one-point touch', () => {
    const result = compareRanges(r(0, 300), r(300, 900), MAX)
    expect(result.relation).toBe('touch')
    expect(result.hasIntersection).toBe(true)
    expect(result.intersection).toEqual(r(300, 300))
    expect(result.intersectionLength).toBe(0)
    expect(result.gapLength).toBe(0)
  })

  it('reports identical midpoints as same', () => {
    const result = compareRanges(r(0, 600), r(200, 400), MAX)
    expect(result.relation).toBe('a-contains-b')
    expect(result.midpointDifference).toBe(0)
    expect(result.laterMidpoint).toBe('same')
  })

  it('handles a 0.5-second midpoint difference', () => {
    const result = compareRanges(r(0, 1), r(0, 0), MAX)
    expect(result.midpointDifference).toBe(0.5)
    expect(result.laterMidpoint).toBe('A')
  })

  it('throws on invalid ranges', () => {
    expect(() => compareRanges(r(600, 300), r(0, 60), MAX)).toThrow(/Invalid range A/)
    expect(() => compareRanges(r(0, 60), r(0, MAX + 1), MAX)).toThrow(/Invalid range B/)
  })

  it('keeps gapLength > 0 exactly when there is no intersection', () => {
    const values = [0, 60, 300, 900]
    for (const a1 of values) for (const a2 of values) for (const b1 of values) for (const b2 of values) {
      if (a1 > a2 || b1 > b2) continue
      const result = compareRanges(r(a1, a2), r(b1, b2), MAX)
      expect(result.gapLength > 0).toBe(result.intersection === null)
      expect(result.hasIntersection).toBe(result.intersection !== null)
      if (result.relation === 'touch') expect(result.intersectionLength).toBe(0)
    }
  })
})
