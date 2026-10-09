import { formatDuration } from '../../domain/format'
import { createLinearScale, generateTicks, projectRange, timeToCoordinate } from '../../domain/scale'
import type { ComparisonResult, TimeRange } from '../../domain/types'

export const PLOT_PADDING_X = 20
export const MIN_CHART_WIDTH = 240
/** 1段目の帯の上端。帯の上には名前と範囲の文字を置く */
export const FIRST_BAR_Y = 30
/** 段と段の間隔（帯の上端どうしの距離） */
const ROW_GAP = 56
export const BAR_HEIGHT = 20
/** 重ね合わせの段の帯の高さ */
const OVERLAY_BAR_HEIGHT = 26
/** 帯の上端から、その段の文字のベースラインまでの距離 */
const LABEL_OFFSET = 9
/** 目盛り1本あたりのおおよその幅（px） */
const TICK_SPACING = 72
/** これより細い帯は全体表示では見えにくいので拡大表示を案内する（px） */
export const TINY_BAR_WIDTH = 4

export interface TimelineRowInput {
  readonly label: string
  readonly range: TimeRange
  readonly variant: 'a' | 'b'
}

export interface TimelineLayoutInput {
  /** 表示範囲（秒）。全体表示は [0, maxSeconds]、拡大表示は computeZoomView の結果 */
  readonly view: TimeRange
  readonly width: number
  readonly rows: readonly TimelineRowInput[]
  readonly comparison?: ComparisonResult | null
  /**
   * true のとき、各段の下に「重ね合わせ」の段を加え、2人の範囲を同じ高さに重ねて描く。
   * 座標は上の段と同じ scale で計算する（位置・幅は変えない）。
   */
  readonly overlay?: boolean
}

export interface TimelineBar {
  readonly label: string
  readonly variant: 'a' | 'b'
  readonly labelY: number
  readonly barY: number
  readonly barHeight: number
  /** 表示範囲と共通点がなければ false（x1・x2 は使わない） */
  readonly visible: boolean
  readonly x1: number
  readonly x2: number
  readonly isPoint: boolean
  readonly clippedAtStart: boolean
  readonly clippedAtEnd: boolean
}

/** 重ね合わせの段。bars は各段の帯と同じ x 座標で、y だけが異なる */
export interface TimelineOverlay {
  readonly labelY: number
  readonly barY: number
  readonly barHeight: number
  readonly bars: readonly TimelineBar[]
}

export interface TimelineMark {
  readonly x1: number
  readonly x2: number
  readonly isPoint: boolean
  readonly top: number
  readonly bottom: number
}

export interface TimelineGap {
  readonly x1: number
  readonly x2: number
  readonly y: number
  readonly label: string
  readonly labelX: number
}

export interface TimelineLayout {
  readonly width: number
  readonly height: number
  readonly plotLeft: number
  readonly plotRight: number
  readonly axisY: number
  readonly ticks: readonly { readonly x: number; readonly label: string }[]
  readonly bars: readonly TimelineBar[]
  /** 重ね合わせの段（overlay: true のときだけ） */
  readonly overlay: TimelineOverlay | null
  readonly intersection: TimelineMark | null
  readonly gap: TimelineGap | null
  /** 見えにくいほど細い帯があるか（拡大表示の案内に使う） */
  readonly hasTinyBar: boolean
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * 時間軸の図の座標を計算する。座標は線形スケール（domain/scale.ts）だけで決め、
 * 短い範囲を実際より太く描くような補正はしない。
 */
export function buildTimelineLayout(input: TimelineLayoutInput): TimelineLayout {
  const width = Math.max(input.width, MIN_CHART_WIDTH)
  const plotLeft = PLOT_PADDING_X
  const plotRight = width - PLOT_PADDING_X
  const scale = createLinearScale(input.view, { start: plotLeft, end: plotRight })

  const rowCount = Math.max(input.rows.length, 1)
  const lastBarBottom = FIRST_BAR_Y + (rowCount - 1) * ROW_GAP + BAR_HEIGHT
  const overlayBarY = FIRST_BAR_Y + rowCount * ROW_GAP + 6
  const contentBottom = input.overlay === true ? overlayBarY + OVERLAY_BAR_HEIGHT : lastBarBottom
  const axisY = contentBottom + 18
  const height = axisY + 28

  const maxTicks = Math.max(2, Math.floor((plotRight - plotLeft) / TICK_SPACING) + 1)
  const ticks = generateTicks(input.view, maxTicks).map((seconds) => ({
    x: timeToCoordinate(scale, seconds),
    label: formatDuration(seconds),
  }))

  const barAt = (row: TimelineRowInput, barY: number, barHeight: number): TimelineBar => {
    const projected = projectRange(scale, row.range)
    return {
      label: row.label,
      variant: row.variant,
      labelY: barY - LABEL_OFFSET,
      barY,
      barHeight,
      visible: projected !== null,
      x1: projected?.startCoordinate ?? 0,
      x2: projected?.endCoordinate ?? 0,
      isPoint: row.range.start === row.range.end,
      clippedAtStart: projected?.clippedAtStart ?? false,
      clippedAtEnd: projected?.clippedAtEnd ?? false,
    }
  }

  const bars = input.rows.map((row, index) => barAt(row, FIRST_BAR_Y + index * ROW_GAP, BAR_HEIGHT))
  const overlay: TimelineOverlay | null =
    input.overlay === true
      ? {
          labelY: overlayBarY - LABEL_OFFSET,
          barY: overlayBarY,
          barHeight: OVERLAY_BAR_HEIGHT,
          bars: input.rows.map((row) => barAt(row, overlayBarY, OVERLAY_BAR_HEIGHT)),
        }
      : null

  let intersection: TimelineMark | null = null
  const common = input.comparison?.intersection ?? null
  if (common !== null) {
    const projected = projectRange(scale, common)
    if (projected !== null) {
      intersection = {
        x1: projected.startCoordinate,
        x2: projected.endCoordinate,
        isPoint: common.start === common.end,
        top: FIRST_BAR_Y - 4,
        bottom: contentBottom + 4,
      }
    }
  }

  let gap: TimelineGap | null = null
  const [rowA, rowB] = input.rows
  if (input.comparison?.relation === 'gap' && rowA !== undefined && rowB !== undefined) {
    const gapRange = {
      start: Math.min(rowA.range.end, rowB.range.end),
      end: Math.max(rowA.range.start, rowB.range.start),
    }
    const projected = projectRange(scale, gapRange)
    if (projected !== null) {
      const x1 = projected.startCoordinate
      const x2 = projected.endCoordinate
      gap = {
        x1,
        x2,
        // 重ね合わせの段があればその中央、なければ2本の帯のあいだ
        y:
          overlay !== null
            ? overlay.barY + overlay.barHeight / 2
            : FIRST_BAR_Y + BAR_HEIGHT + (ROW_GAP - BAR_HEIGHT) / 2,
        label: `${formatDuration(input.comparison.gapLength)}のひらき`,
        labelX: clamp((x1 + x2) / 2, plotLeft + 48, plotRight - 48),
      }
    }
  }

  const hasTinyBar = bars.some((bar) => bar.visible && !bar.isPoint && bar.x2 - bar.x1 < TINY_BAR_WIDTH)

  return { width, height, plotLeft, plotRight, axisY, ticks, bars, overlay, intersection, gap, hasTinyBar }
}
