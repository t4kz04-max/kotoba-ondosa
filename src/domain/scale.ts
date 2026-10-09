import type { Seconds, TimeRange } from './types'

/**
 * 線形の時間軸。表示範囲 [domainStart, domainEnd]（秒）を
 * 座標 [rangeStart, rangeEnd] に比例して対応させる。
 * 表示範囲を変えた scale を作り直せば、拡大表示にもそのまま使える。
 */
export interface LinearScale {
  readonly domainStart: number
  readonly domainEnd: number
  readonly rangeStart: number
  readonly rangeEnd: number
}

export interface ScaleOptions {
  /** 表示範囲の外の値を端に丸める */
  readonly clamp?: boolean
}

export function createLinearScale(
  domain: { readonly start: number; readonly end: number },
  range: { readonly start: number; readonly end: number },
): LinearScale {
  const values = [domain.start, domain.end, range.start, range.end]
  if (!values.every(Number.isFinite)) {
    throw new RangeError('Scale bounds must be finite numbers')
  }
  if (domain.end <= domain.start) {
    throw new RangeError('Scale domain end must be greater than start')
  }
  if (range.start === range.end) {
    throw new RangeError('Scale range must have non-zero length')
  }
  return {
    domainStart: domain.start,
    domainEnd: domain.end,
    rangeStart: range.start,
    rangeEnd: range.end,
  }
}

function clampTo(value: number, a: number, b: number): number {
  return Math.min(Math.max(value, Math.min(a, b)), Math.max(a, b))
}

/** 時間 → 座標 */
export function timeToCoordinate(
  scale: LinearScale,
  seconds: number,
  options: ScaleOptions = {},
): number {
  const t = options.clamp ? clampTo(seconds, scale.domainStart, scale.domainEnd) : seconds
  const ratio = (t - scale.domainStart) / (scale.domainEnd - scale.domainStart)
  return scale.rangeStart + ratio * (scale.rangeEnd - scale.rangeStart)
}

/** 座標 → 時間。round を指定すると整数秒に四捨五入する */
export function coordinateToTime(
  scale: LinearScale,
  coordinate: number,
  options: ScaleOptions & { readonly round?: boolean } = {},
): number {
  const ratio = (coordinate - scale.rangeStart) / (scale.rangeEnd - scale.rangeStart)
  let t = scale.domainStart + ratio * (scale.domainEnd - scale.domainStart)
  if (options.clamp) t = clampTo(t, scale.domainStart, scale.domainEnd)
  return options.round ? Math.round(t) : t
}

export interface ProjectedRange {
  readonly startCoordinate: number
  readonly endCoordinate: number
  /** 表示範囲の外にはみ出して切り取られたか */
  readonly clippedAtStart: boolean
  readonly clippedAtEnd: boolean
}

/** 範囲を座標に変換する。表示範囲と共通点がなければ null */
export function projectRange(scale: LinearScale, range: TimeRange): ProjectedRange | null {
  if (range.end < scale.domainStart || range.start > scale.domainEnd) return null
  return {
    startCoordinate: timeToCoordinate(scale, range.start, { clamp: true }),
    endCoordinate: timeToCoordinate(scale, range.end, { clamp: true }),
    clippedAtStart: range.start < scale.domainStart,
    clippedAtEnd: range.end > scale.domainEnd,
  }
}

/** 拡大表示の最小の幅（秒） */
export const MIN_ZOOM_SPAN: Seconds = 30

/** 拡大表示で範囲の外側に足す余白（範囲全体の長さに対する割合、片側） */
export const ZOOM_PADDING_RATIO = 0.15

/**
 * 拡大表示の表示範囲。すべての範囲が収まり、[0, maxSeconds] の中に入る整数秒の区間を返す。
 * 範囲全体の長さに余白を足し（最小 MIN_ZOOM_SPAN）、全体より広くなるなら全体表示を返す。
 * 表示範囲を変えるだけなので、時間と座標の比例関係は保たれる。
 */
export function computeZoomView(ranges: readonly TimeRange[], maxSeconds: Seconds): TimeRange {
  if (ranges.length === 0) throw new RangeError('At least one range is required')
  const lo = Math.min(...ranges.map((range) => range.start))
  const hi = Math.max(...ranges.map((range) => range.end))
  const span = Math.max((hi - lo) * (1 + 2 * ZOOM_PADDING_RATIO), MIN_ZOOM_SPAN)
  if (span >= maxSeconds) return { start: 0, end: maxSeconds }

  let start = (lo + hi) / 2 - span / 2
  let end = start + span
  if (start < 0) {
    start = 0
    end = span
  }
  if (end > maxSeconds) {
    end = maxSeconds
    start = maxSeconds - span
  }
  return { start: Math.floor(start), end: Math.ceil(end) }
}

/** 目盛りの間隔の候補（秒） */
export const TICK_STEPS: readonly Seconds[] = [
  1, 2, 5, 10, 15, 30,
  60, 120, 300, 600, 900, 1800,
  3600, 7200, 10800, 21600, 43200, 86400,
]

/**
 * 表示範囲に入る目盛りの時間を返す。
 * 目盛り数が maxTicks 以下になる最小の間隔を TICK_STEPS から選び、その倍数を並べる。
 * 間引きは目盛りを減らすだけで、時間と座標の比例関係は変えない。
 */
export function generateTicks(view: TimeRange, maxTicks: number): Seconds[] {
  if (!Number.isInteger(maxTicks) || maxTicks < 2) {
    throw new RangeError('maxTicks must be an integer of 2 or more')
  }
  if (!(view.end > view.start)) {
    throw new RangeError('View end must be greater than start')
  }
  for (const step of TICK_STEPS) {
    const first = Math.ceil(view.start / step)
    const last = Math.floor(view.end / step)
    if (last - first + 1 <= maxTicks) {
      const ticks: Seconds[] = []
      for (let i = first; i <= last; i++) ticks.push(i * step)
      return ticks
    }
  }
  return [view.start, view.end]
}
