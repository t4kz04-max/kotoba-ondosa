import { describe, expect, it } from 'vitest'
import { fieldsToSeconds, secondsToFields, unitsFor } from '../../src/components/duration-input/durationFields'

describe('unitsFor', () => {
  it('uses hours and minutes only for ranges longer than an hour', () => {
    expect(unitsFor(43200)).toEqual(['hour', 'minute'])
    expect(unitsFor(3600)).toEqual(['minute', 'second'])
    expect(unitsFor(1800)).toEqual(['minute', 'second'])
  })
})

describe('secondsToFields', () => {
  it('splits seconds into the unit fields', () => {
    expect(secondsToFields(90, ['minute', 'second'])).toEqual({ minute: '1', second: '30' })
    expect(secondsToFields(3600, ['minute', 'second'])).toEqual({ minute: '60', second: '0' })
    expect(secondsToFields(5400, ['hour', 'minute'])).toEqual({ hour: '1', minute: '30' })
  })

  it('leaves fields empty for unanswered or invalid values', () => {
    expect(secondsToFields(null, ['minute', 'second'])).toEqual({ minute: '', second: '' })
    expect(secondsToFields(Number.NaN, ['hour', 'minute'])).toEqual({ hour: '', minute: '' })
  })
})

describe('fieldsToSeconds', () => {
  const units = ['minute', 'second'] as const

  it('returns null when every field is empty (unanswered)', () => {
    expect(fieldsToSeconds({ minute: '', second: '' }, units)).toBeNull()
    expect(fieldsToSeconds({ minute: '  ' }, units)).toBeNull()
  })

  it('converts to integer seconds, treating empty fields as 0', () => {
    expect(fieldsToSeconds({ minute: '1', second: '30' }, units)).toBe(90)
    expect(fieldsToSeconds({ minute: '5', second: '' }, units)).toBe(300)
    expect(fieldsToSeconds({ minute: '0', second: '0' }, units)).toBe(0)
    expect(fieldsToSeconds({ hour: '2', minute: '15' }, ['hour', 'minute'])).toBe(8100)
  })

  it('accepts full-width digits', () => {
    expect(fieldsToSeconds({ minute: '１０', second: '' }, units)).toBe(600)
  })

  it('returns NaN for non-digit input so validation can reject it', () => {
    expect(fieldsToSeconds({ minute: '1.5', second: '' }, units)).toBeNaN()
    expect(fieldsToSeconds({ minute: '-1', second: '' }, units)).toBeNaN()
    expect(fieldsToSeconds({ minute: 'abc', second: '' }, units)).toBeNaN()
  })

  it('round-trips with secondsToFields', () => {
    for (const seconds of [0, 10, 59, 60, 61, 1800, 3600]) {
      expect(fieldsToSeconds(secondsToFields(seconds, units), units)).toBe(seconds)
    }
  })
})
