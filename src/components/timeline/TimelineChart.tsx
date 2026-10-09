import { useId } from 'react'
import { formatDuration, formatRange } from '../../domain/format'
import type { ComparisonResult, TimeRange } from '../../domain/types'
import { useElementWidth } from '../../hooks/useElementWidth'
import { BAR_HEIGHT, buildTimelineLayout, FIRST_BAR_Y, type TimelineBar, type TimelineRowInput } from './layout'

interface TimelineChartProps {
  readonly view: TimeRange
  readonly rows: readonly TimelineRowInput[]
  readonly comparison?: ComparisonResult | null
  /** 図の内容を文章で表したもの（スクリーンリーダー用） */
  readonly description: string
  /** 細すぎる帯があるとき、拡大表示を案内する */
  readonly showZoomHint?: boolean
  /** 2人の範囲を重ねた段を加える。label は段の名前、summary は段の右側に出す事実（共通範囲・ひらき） */
  readonly overlay?: { readonly label: string; readonly summary: string }
  /** 範囲がまだないときに、空の帯の上に出す文 */
  readonly emptyLabel?: string
  /** 公開演出（段ごとに順に表示する）。prefers-reduced-motion では CSS 側で止める */
  readonly animate?: boolean
}

/** 範囲の文章。長さ0の範囲は「ちょうど5分」 */
function rangeText(range: TimeRange): string {
  return range.start === range.end ? `ちょうど${formatDuration(range.start)}` : formatRange(range)
}

interface ShapeProps {
  readonly bar: TimelineBar
  readonly fill: string
  readonly className: string
}

/** 帯1本。長さ0の範囲は幅を持たせず、ひし形のマーカーで位置だけを示す */
function BarShape({ bar, fill, className }: ShapeProps) {
  if (!bar.visible) return null
  const midY = bar.barY + bar.barHeight / 2
  const half = bar.barHeight / 2
  return (
    <>
      {bar.isPoint ? (
        <path
          d={`M ${bar.x1} ${bar.barY - 2} L ${bar.x1 + half} ${midY} L ${bar.x1} ${bar.barY + bar.barHeight + 2} L ${bar.x1 - half} ${midY} Z`}
          fill={fill}
          className={`${className} timeline__point-marker`}
        />
      ) : (
        <rect
          x={bar.x1}
          y={bar.barY}
          width={bar.x2 - bar.x1}
          height={bar.barHeight}
          rx={3}
          fill={fill}
          className={className}
        />
      )}
      {bar.clippedAtStart && (
        <text x={bar.x1 + 2} y={midY + 4} className="timeline__clip">
          ◀
        </text>
      )}
      {bar.clippedAtEnd && (
        <text x={bar.x2 - 2} y={midY + 4} textAnchor="end" className="timeline__clip">
          ▶
        </text>
      )}
    </>
  )
}

/**
 * 線形の時間軸に範囲を描く。座標計算は layout.ts（domain/scale.ts）に任せ、ここでは描画だけを行う。
 * A は塗りつぶし、B は斜線で、色以外でも区別する。
 */
export function TimelineChart({ view, rows, comparison, description, showZoomHint, overlay, emptyLabel, animate }: TimelineChartProps) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>(320)
  const idBase = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const hatchId = `hatch-${idBase}`
  const layout = buildTimelineLayout({ view, width, rows, comparison, overlay: overlay !== undefined })
  const { intersection, gap } = layout
  const fillFor = (variant: 'a' | 'b') => (variant === 'a' ? 'var(--chart-a)' : `url(#${hatchId})`)
  const marksBottom = layout.overlay === null ? null : layout.overlay.barY + layout.overlay.barHeight

  return (
    <div ref={containerRef} className={animate === true ? 'timeline timeline--reveal' : 'timeline'}>
      <svg
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label={description}
        className="timeline__svg"
      >
        <defs>
          <pattern id={hatchId} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" fill="var(--chart-b-soft)" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="var(--chart-b)" strokeWidth="3.5" />
          </pattern>
        </defs>

        {/* 共通範囲：段をまたぐ縦の帯（下地） */}
        {intersection !== null && !intersection.isPoint && (
          <g className="timeline__marks">
            <rect
              x={intersection.x1}
              y={intersection.top}
              width={intersection.x2 - intersection.x1}
              height={intersection.bottom - intersection.top}
              className="timeline__common-band"
            />
          </g>
        )}

        {layout.bars.length === 0 && emptyLabel !== undefined && (
          <g className="timeline__empty">
            <rect
              x={layout.plotLeft}
              y={FIRST_BAR_Y}
              width={layout.plotRight - layout.plotLeft}
              height={BAR_HEIGHT}
              rx={3}
              className="timeline__track"
            />
            <text x={layout.plotLeft} y={FIRST_BAR_Y - 9} className="timeline__range">
              {emptyLabel}
            </text>
          </g>
        )}

        {layout.bars.map((bar, index) => (
          <g key={index} className={`timeline__row timeline__row--${bar.variant}`}>
            <rect
              x={layout.plotLeft}
              y={bar.barY}
              width={layout.plotRight - layout.plotLeft}
              height={bar.barHeight}
              rx={3}
              className="timeline__track"
            />
            <text x={layout.plotLeft} y={bar.labelY} className={`timeline__label timeline__label--${bar.variant}`}>
              {bar.label}
            </text>
            <text x={layout.plotRight} y={bar.labelY} textAnchor="end" className="timeline__range">
              {rangeText(rows[index].range)}
            </text>
            <BarShape bar={bar} fill={fillFor(bar.variant)} className={`timeline__bar timeline__bar--${bar.variant}`} />
          </g>
        ))}

        {layout.overlay !== null && overlay !== undefined && (
          <g className="timeline__overlay">
            <rect
              x={layout.plotLeft}
              y={layout.overlay.barY}
              width={layout.plotRight - layout.plotLeft}
              height={layout.overlay.barHeight}
              rx={3}
              className="timeline__track"
            />
            <text x={layout.plotLeft} y={layout.overlay.labelY} className="timeline__label">
              {overlay.label}
            </text>
            <text
              x={layout.plotRight}
              y={layout.overlay.labelY}
              textAnchor="end"
              className={intersection === null ? 'timeline__summary timeline__summary--gap' : 'timeline__summary'}
            >
              {overlay.summary}
            </text>
            {layout.overlay.bars.map((bar, index) => (
              <BarShape
                key={index}
                bar={bar}
                fill={fillFor(bar.variant)}
                className={`timeline__bar timeline__bar--${bar.variant} timeline__bar--ghost`}
              />
            ))}
            {/* 重ね合わせの段の共通範囲（実際の長さのまま） */}
            {intersection !== null && !intersection.isPoint && (
              <rect
                x={intersection.x1}
                y={layout.overlay.barY}
                width={intersection.x2 - intersection.x1}
                height={layout.overlay.barHeight}
                className="timeline__common timeline__marks"
              />
            )}
          </g>
        )}

        {intersection !== null && intersection.isPoint && (
          // 1点だけの共通点は、幅を持たせず縦線と丸で示す
          <g className="timeline__point timeline__marks">
            <line x1={intersection.x1} x2={intersection.x1} y1={intersection.top} y2={intersection.bottom} />
            <circle
              cx={intersection.x1}
              cy={layout.overlay !== null ? layout.overlay.barY + layout.overlay.barHeight / 2 : (intersection.top + intersection.bottom) / 2}
              r="5"
            />
          </g>
        )}

        {gap !== null && (
          <g className="timeline__gap timeline__marks">
            {marksBottom !== null && (
              <>
                <line className="timeline__guide" x1={gap.x1} x2={gap.x1} y1={layout.bars[0].barY} y2={marksBottom} />
                <line className="timeline__guide" x1={gap.x2} x2={gap.x2} y1={layout.bars[0].barY} y2={marksBottom} />
              </>
            )}
            <line x1={gap.x1} x2={gap.x2} y1={gap.y} y2={gap.y} />
            <line x1={gap.x1} x2={gap.x1} y1={gap.y - 6} y2={gap.y + 6} />
            <line x1={gap.x2} x2={gap.x2} y1={gap.y - 6} y2={gap.y + 6} />
            {layout.overlay === null && (
              <text x={gap.labelX} y={gap.y - 8} textAnchor="middle">
                {gap.label}
              </text>
            )}
          </g>
        )}

        <g className="timeline__axis">
          <line x1={layout.plotLeft} x2={layout.plotRight} y1={layout.axisY} y2={layout.axisY} />
          {layout.ticks.map((tick) => (
            <g key={tick.x}>
              <line x1={tick.x} x2={tick.x} y1={layout.axisY} y2={layout.axisY + 5} />
              <text x={tick.x} y={layout.axisY + 20} textAnchor="middle">
                {tick.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
      {showZoomHint === true && layout.hasTinyBar && (
        <p className="note timeline__hint">短い範囲は、全体表示ではとても細く見えます。「拡大表示」で見やすくなります。</p>
      )}
    </div>
  )
}
