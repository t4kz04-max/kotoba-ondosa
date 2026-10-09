import { describe, expect, it } from 'vitest'
import { buildTimelineLayout, PLOT_PADDING_X } from '../../src/components/timeline/layout'
import { compareRanges } from '../../src/domain/range'
import { computeZoomView } from '../../src/domain/scale'
import type { TimeRange } from '../../src/domain/types'

const MAX = 3600
const WIDTH = 400
const PLOT_LEFT = PLOT_PADDING_X
const PLOT_RIGHT = WIDTH - PLOT_PADDING_X
const FULL: TimeRange = { start: 0, end: MAX }

function layoutFor(a: TimeRange, b: TimeRange, view: TimeRange = FULL, width = WIDTH) {
  return buildTimelineLayout({
    view,
    width,
    rows: [
      { label: 'A', range: a, variant: 'a' },
      { label: 'B', range: b, variant: 'b' },
    ],
    comparison: compareRanges(a, b, MAX),
  })
}

const xOf = (seconds: number, view: TimeRange = FULL) =>
  PLOT_LEFT + ((seconds - view.start) / (view.end - view.start)) * (PLOT_RIGHT - PLOT_LEFT)

describe('buildTimelineLayout: full view', () => {
  it('places bars proportionally to time (linear)', () => {
    const layout = layoutFor({ start: 0, end: 300 }, { start: 900, end: 1800 })
    const [a, b] = layout.bars
    expect(a.x1).toBeCloseTo(xOf(0))
    expect(a.x2).toBeCloseTo(xOf(300))
    expect(b.x1).toBeCloseTo(xOf(900))
    expect(b.x2).toBeCloseTo(xOf(1800))
    // 同じ長さの時間は同じ幅
    expect(b.x2 - b.x1).toBeCloseTo((a.x2 - a.x1) * 3)
  })

  it('does not widen short ranges (no minimum width)', () => {
    const layout = layoutFor({ start: 10, end: 20 }, { start: 0, end: 3600 })
    const [a] = layout.bars
    expect(a.x2 - a.x1).toBeCloseTo((10 / MAX) * (PLOT_RIGHT - PLOT_LEFT))
    expect(layout.hasTinyBar).toBe(true)
  })

  it('shows the gap with its length', () => {
    const layout = layoutFor({ start: 0, end: 300 }, { start: 900, end: 1800 })
    expect(layout.intersection).toBeNull()
    expect(layout.gap?.x1).toBeCloseTo(xOf(300))
    expect(layout.gap?.x2).toBeCloseTo(xOf(900))
    expect(layout.gap?.label).toBe('10分のひらき')
  })

  it('marks a one-point touch as a point', () => {
    const layout = layoutFor({ start: 0, end: 300 }, { start: 300, end: 900 })
    expect(layout.gap).toBeNull()
    expect(layout.intersection?.isPoint).toBe(true)
    expect(layout.intersection?.x1).toBeCloseTo(xOf(300))
  })

  it('highlights an overlapping range', () => {
    const layout = layoutFor({ start: 0, end: 900 }, { start: 180, end: 1800 })
    expect(layout.intersection?.isPoint).toBe(false)
    expect(layout.intersection?.x1).toBeCloseTo(xOf(180))
    expect(layout.intersection?.x2).toBeCloseTo(xOf(900))
  })

  it('draws zero-length ranges as points', () => {
    const layout = layoutFor({ start: 0, end: 0 }, { start: 0, end: 600 })
    expect(layout.bars[0].isPoint).toBe(true)
    expect(layout.bars[0].x1).toBe(layout.bars[0].x2)
    expect(layout.hasTinyBar).toBe(false)
  })

  it('keeps ticks inside the plot and labels them', () => {
    for (const width of [240, 320, 375, 768, 1280]) {
      const layout = layoutFor({ start: 0, end: 300 }, { start: 900, end: 1800 }, FULL, width)
      expect(layout.ticks.length).toBeGreaterThanOrEqual(2)
      for (const tick of layout.ticks) {
        expect(tick.x).toBeGreaterThanOrEqual(PLOT_PADDING_X)
        expect(tick.x).toBeLessThanOrEqual(layout.width - PLOT_PADDING_X)
      }
    }
    expect(layoutFor({ start: 0, end: 300 }, { start: 900, end: 1800 }).ticks[0].label).toBe('0分')
  })

  it('enforces a minimum chart width', () => {
    expect(layoutFor({ start: 0, end: 300 }, { start: 900, end: 1800 }, FULL, 100).width).toBe(240)
  })
})

describe('buildTimelineLayout: zoom view', () => {
  const a = { start: 10, end: 30 }
  const b = { start: 60, end: 120 }
  const zoom = computeZoomView([a, b], 1800)

  it('fits both ranges inside the plot', () => {
    const layout = buildTimelineLayout({
      view: zoom,
      width: WIDTH,
      rows: [
        { label: 'A', range: a, variant: 'a' },
        { label: 'B', range: b, variant: 'b' },
      ],
      comparison: compareRanges(a, b, 1800),
    })
    for (const bar of layout.bars) {
      expect(bar.visible).toBe(true)
      expect(bar.clippedAtStart || bar.clippedAtEnd).toBe(false)
      expect(bar.x1).toBeGreaterThanOrEqual(PLOT_LEFT)
      expect(bar.x2).toBeLessThanOrEqual(PLOT_RIGHT)
    }
    expect(layout.hasTinyBar).toBe(false)
  })

  it('stays linear within the zoomed view', () => {
    const layout = buildTimelineLayout({
      view: zoom,
      width: WIDTH,
      rows: [
        { label: 'A', range: a, variant: 'a' },
        { label: 'B', range: b, variant: 'b' },
      ],
      comparison: compareRanges(a, b, 1800),
    })
    const [barA, barB] = layout.bars
    expect(barA.x1).toBeCloseTo(xOf(10, zoom))
    expect(barB.x2).toBeCloseTo(xOf(120, zoom))
    // B（60秒）は A（20秒）の3倍の幅
    expect(barB.x2 - barB.x1).toBeCloseTo((barA.x2 - barA.x1) * 3)
  })

  it('clips ranges outside a narrower view and reports it', () => {
    const layout = buildTimelineLayout({
      view: { start: 100, end: 200 },
      width: WIDTH,
      rows: [
        { label: 'A', range: { start: 0, end: 150 }, variant: 'a' },
        { label: 'B', range: { start: 300, end: 400 }, variant: 'b' },
      ],
      comparison: null,
    })
    expect(layout.bars[0]).toMatchObject({ visible: true, clippedAtStart: true, x1: PLOT_LEFT })
    expect(layout.bars[1].visible).toBe(false)
  })
})

describe('buildTimelineLayout: single row (input preview)', () => {
  it('has no comparison marks', () => {
    const layout = buildTimelineLayout({
      view: FULL,
      width: WIDTH,
      rows: [{ label: 'あなた', range: { start: 60, end: 300 }, variant: 'a' }],
    })
    expect(layout.bars).toHaveLength(1)
    expect(layout.intersection).toBeNull()
    expect(layout.gap).toBeNull()
  })
})

describe('buildTimelineLayout: overlay row (comparison)', () => {
  function overlayFor(a: TimeRange, b: TimeRange, view: TimeRange = FULL) {
    return buildTimelineLayout({
      view,
      width: WIDTH,
      rows: [
        { label: 'A', range: a, variant: 'a' },
        { label: 'B', range: b, variant: 'b' },
      ],
      comparison: compareRanges(a, b, MAX),
      overlay: true,
    })
  }

  it('is absent unless requested', () => {
    expect(layoutFor({ start: 0, end: 300 }, { start: 900, end: 1800 }).overlay).toBeNull()
  })

  it('draws both ranges with the same x coordinates as their own rows', () => {
    const layout = overlayFor({ start: 0, end: 300 }, { start: 900, end: 1800 })
    expect(layout.overlay).not.toBeNull()
    const overlay = layout.overlay!
    for (const [index, bar] of overlay.bars.entries()) {
      expect(bar.x1).toBe(layout.bars[index].x1)
      expect(bar.x2).toBe(layout.bars[index].x2)
      expect(bar.barY).toBe(overlay.barY)
    }
    // 重ね合わせの段は2本の帯より下、軸より上
    expect(overlay.barY).toBeGreaterThan(layout.bars[1].barY + layout.bars[1].barHeight)
    expect(layout.axisY).toBeGreaterThan(overlay.barY + overlay.barHeight)
  })

  it('places the gap arrow on the overlay row without changing its length', () => {
    const layout = overlayFor({ start: 0, end: 300 }, { start: 900, end: 1800 })
    expect(layout.gap?.x1).toBeCloseTo(xOf(300))
    expect(layout.gap?.x2).toBeCloseTo(xOf(900))
    expect(layout.gap?.y).toBe(layout.overlay!.barY + layout.overlay!.barHeight / 2)
  })

  it('extends the common highlight down to the overlay row', () => {
    const layout = overlayFor({ start: 0, end: 900 }, { start: 180, end: 1800 })
    expect(layout.intersection?.x1).toBeCloseTo(xOf(180))
    expect(layout.intersection?.x2).toBeCloseTo(xOf(900))
    expect(layout.intersection!.bottom).toBeGreaterThan(layout.overlay!.barY + layout.overlay!.barHeight)
  })

  it('keeps a one-point touch as a point and zero-length ranges as points', () => {
    const touch = overlayFor({ start: 0, end: 300 }, { start: 300, end: 900 })
    expect(touch.intersection?.isPoint).toBe(true)
    expect(touch.intersection!.x2 - touch.intersection!.x1).toBe(0)

    const zero = overlayFor({ start: 300, end: 300 }, { start: 0, end: 600 })
    expect(zero.overlay!.bars[0].isPoint).toBe(true)
    expect(zero.overlay!.bars[0].x2 - zero.overlay!.bars[0].x1).toBe(0)
  })
})
