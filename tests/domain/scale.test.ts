import { describe, expect, it } from 'vitest'
import {
  coordinateToTime,
  createLinearScale,
  generateTicks,
  projectRange,
  timeToCoordinate,
} from '../../src/domain/scale'

const scale = createLinearScale({ start: 0, end: 3600 }, { start: 0, end: 1000 })

describe('linear scale', () => {
  it('maps time to coordinates proportionally', () => {
    expect(timeToCoordinate(scale, 0)).toBe(0)
    expect(timeToCoordinate(scale, 3600)).toBe(1000)
    expect(timeToCoordinate(scale, 1800)).toBe(500)
    expect(timeToCoordinate(scale, 360)).toBeCloseTo(100)
  })

  it('keeps equal time differences as equal coordinate differences', () => {
    const d1 = timeToCoordinate(scale, 600) - timeToCoordinate(scale, 0)
    const d2 = timeToCoordinate(scale, 3000) - timeToCoordinate(scale, 2400)
    expect(d1).toBeCloseTo(d2)
  })

  it('supports a range offset (margins)', () => {
    const withMargin = createLinearScale({ start: 0, end: 1800 }, { start: 40, end: 340 })
    expect(timeToCoordinate(withMargin, 0)).toBe(40)
    expect(timeToCoordinate(withMargin, 900)).toBe(190)
    expect(timeToCoordinate(withMargin, 1800)).toBe(340)
  })

  it('supports a reversed coordinate range', () => {
    const reversed = createLinearScale({ start: 0, end: 100 }, { start: 200, end: 0 })
    expect(timeToCoordinate(reversed, 25)).toBe(150)
    expect(coordinateToTime(reversed, 150)).toBe(25)
  })

  it('maps coordinates back to time', () => {
    expect(coordinateToTime(scale, 500)).toBe(1800)
    expect(coordinateToTime(scale, 123.4, { round: true })).toBe(444)
    for (const t of [0, 1, 59, 600, 3599, 3600]) {
      expect(coordinateToTime(scale, timeToCoordinate(scale, t))).toBeCloseTo(t)
    }
  })

  it('extrapolates outside the view unless clamped', () => {
    expect(timeToCoordinate(scale, 7200)).toBe(2000)
    expect(timeToCoordinate(scale, 7200, { clamp: true })).toBe(1000)
    expect(timeToCoordinate(scale, -100, { clamp: true })).toBe(0)
    expect(coordinateToTime(scale, -50, { clamp: true })).toBe(0)
    expect(coordinateToTime(scale, 1200, { clamp: true })).toBe(3600)
  })

  it('works with a changed (zoomed) view', () => {
    const zoomed = createLinearScale({ start: 0, end: 600 }, { start: 0, end: 1000 })
    expect(timeToCoordinate(zoomed, 60)).toBeCloseTo(100)
    expect(timeToCoordinate(zoomed, 300)).toBe(500)
  })

  it('rejects invalid bounds', () => {
    expect(() => createLinearScale({ start: 0, end: 0 }, { start: 0, end: 100 })).toThrow(RangeError)
    expect(() => createLinearScale({ start: 10, end: 0 }, { start: 0, end: 100 })).toThrow(RangeError)
    expect(() => createLinearScale({ start: 0, end: 10 }, { start: 50, end: 50 })).toThrow(RangeError)
    expect(() => createLinearScale({ start: 0, end: Number.NaN }, { start: 0, end: 1 })).toThrow(RangeError)
  })
})

describe('projectRange', () => {
  const zoomed = createLinearScale({ start: 600, end: 1200 }, { start: 0, end: 600 })

  it('projects a range inside the view', () => {
    expect(projectRange(zoomed, { start: 700, end: 800 })).toEqual({
      startCoordinate: 100,
      endCoordinate: 200,
      clippedAtStart: false,
      clippedAtEnd: false,
    })
  })

  it('clips a range sticking out of the view', () => {
    expect(projectRange(zoomed, { start: 0, end: 3600 })).toEqual({
      startCoordinate: 0,
      endCoordinate: 600,
      clippedAtStart: true,
      clippedAtEnd: true,
    })
  })

  it('returns null for a range outside the view, but keeps a range touching the edge', () => {
    expect(projectRange(zoomed, { start: 0, end: 300 })).toBeNull()
    expect(projectRange(zoomed, { start: 1300, end: 1400 })).toBeNull()
    expect(projectRange(zoomed, { start: 0, end: 600 })?.endCoordinate).toBe(0)
  })

  it('projects a zero-length range to a single coordinate', () => {
    const p = projectRange(zoomed, { start: 900, end: 900 })
    expect(p?.startCoordinate).toBe(300)
    expect(p?.endCoordinate).toBe(300)
  })
})

describe('generateTicks', () => {
  it('chooses the smallest step that fits within maxTicks', () => {
    expect(generateTicks({ start: 0, end: 3600 }, 7)).toEqual([0, 600, 1200, 1800, 2400, 3000, 3600])
    expect(generateTicks({ start: 0, end: 1800 }, 7)).toEqual([0, 300, 600, 900, 1200, 1500, 1800])
    expect(generateTicks({ start: 0, end: 43200 }, 5)).toEqual([0, 10800, 21600, 32400, 43200])
  })

  it('places ticks at multiples of the step inside a zoomed view', () => {
    expect(generateTicks({ start: 90, end: 400 }, 4)).toEqual([120, 240, 360])
  })

  it('returns ticks within the view only', () => {
    for (const maxTicks of [2, 3, 5, 8, 12]) {
      const ticks = generateTicks({ start: 0, end: 43200 }, maxTicks)
      expect(ticks.length).toBeLessThanOrEqual(maxTicks)
      expect(ticks.every((t) => t >= 0 && t <= 43200)).toBe(true)
    }
  })

  it('rejects invalid arguments', () => {
    expect(() => generateTicks({ start: 0, end: 60 }, 1)).toThrow(RangeError)
    expect(() => generateTicks({ start: 60, end: 60 }, 5)).toThrow(RangeError)
  })
})
