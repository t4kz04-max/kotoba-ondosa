import { describe, expect, it } from 'vitest'
import { formatDuration, formatRange, formatSampleLabel } from '../../src/domain/format'
import { SAMPLES } from '../../src/data/samples'

describe('formatDuration', () => {
  it.each([
    [0, '0分'],
    [10, '10秒'],
    [59, '59秒'],
    [60, '1分'],
    [90, '1分30秒'],
    [3599, '59分59秒'],
    [3600, '1時間'],
    [5400, '1時間30分'],
    [5430, '1時間30分'],
    [43200, '12時間'],
  ])('%d seconds -> %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected)
  })

  it('rounds half seconds up', () => {
    expect(formatDuration(0.5)).toBe('1秒')
    expect(formatDuration(7.5)).toBe('8秒')
    expect(formatDuration(450.5)).toBe('7分31秒')
  })

  it('rejects negative and non-finite values', () => {
    expect(() => formatDuration(-1)).toThrow(RangeError)
    expect(() => formatDuration(Number.NaN)).toThrow(RangeError)
  })
})

describe('formatRange', () => {
  it('formats a range and a zero-length range', () => {
    expect(formatRange({ start: 300, end: 900 })).toBe('5分〜15分')
    expect(formatRange({ start: 0, end: 30 })).toBe('0分〜30秒')
    expect(formatRange({ start: 300, end: 300 })).toBe('5分')
  })
})

describe('formatSampleLabel', () => {
  it('always marks samples as fictional', () => {
    for (const sample of SAMPLES) {
      expect(formatSampleLabel(sample)).toBe(`${sample.name}（架空）`)
    }
  })
})
