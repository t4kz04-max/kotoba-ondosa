import { useId } from 'react'
import type { ComparisonResult, TimeRange } from '../../domain/types'
import { useElementWidth } from '../../hooks/useElementWidth'
import { buildTimelineLayout, type TimelineBar, type TimelineRowInput } from './layout'

interface TimelineChartProps {
  readonly view: TimeRange
  readonly rows: readonly TimelineRowInput[]
  readonly comparison?: ComparisonResult | null
  /** 図の内容を文章で表したもの（スクリーンリーダー用） */
  readonly description: string
  /** 細すぎる帯があるとき、拡大表示を案内する */
  readonly showZoomHint?: boolean
}

function Bar({ bar, fill }: { readonly bar: TimelineBar; readonly fill: string }) {
  if (!bar.visible) return null
  const midY = bar.barY + bar.barHeight / 2
  return (
    <g className={`timeline__bar timeline__bar--${bar.variant}`}>
      <text x={bar.x1} y={bar.labelY} className="timeline__label">
        {bar.label}
      </text>
      {bar.isPoint ? (
        // 長さ0の範囲は幅を持たせず、位置を示すマーカーで描く
        <path
          d={`M ${bar.x1} ${bar.barY} L ${bar.x1 + 8} ${midY} L ${bar.x1} ${bar.barY + bar.barHeight} L ${bar.x1 - 8} ${midY} Z`}
          fill={fill}
          stroke="var(--color-text)"
          strokeWidth="1"
        />
      ) : (
        <rect x={bar.x1} y={bar.barY} width={bar.x2 - bar.x1} height={bar.barHeight} fill={fill} />
      )}
      {bar.clippedAtStart && (
        <text x={bar.x1 + 2} y={midY + 4} className="timeline__clip">◀</text>
      )}
      {bar.clippedAtEnd && (
        <text x={bar.x2 - 2} y={midY + 4} textAnchor="end" className="timeline__clip">▶</text>
      )}
    </g>
  )
}

/** 線形の時間軸に範囲を描く。座標計算は layout.ts（domain/scale.ts）に任せる */
export function TimelineChart({ view, rows, comparison, description, showZoomHint }: TimelineChartProps) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>(320)
  const patternId = `hatch-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const layout = buildTimelineLayout({ view, width, rows, comparison })
  const { intersection, gap } = layout

  return (
    <div ref={containerRef} className="timeline">
      <svg
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label={description}
        className="timeline__svg"
      >
        <defs>
          <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--color-b-bg)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-b)" strokeWidth="3" />
          </pattern>
        </defs>

        {intersection !== null && !intersection.isPoint && (
          <rect
            x={intersection.x1}
            y={intersection.top}
            width={intersection.x2 - intersection.x1}
            height={intersection.bottom - intersection.top}
            className="timeline__common"
          />
        )}

        {layout.bars.map((bar, index) => (
          <Bar key={index} bar={bar} fill={bar.variant === 'a' ? 'var(--color-a)' : `url(#${patternId})`} />
        ))}

        {intersection !== null && intersection.isPoint && (
          // 1点だけの共通点は縦線と丸で示す
          <g className="timeline__point">
            <line x1={intersection.x1} x2={intersection.x1} y1={intersection.top} y2={intersection.bottom} />
            <circle cx={intersection.x1} cy={(intersection.top + intersection.bottom) / 2} r="5" />
          </g>
        )}

        {gap !== null && (
          <g className="timeline__gap">
            <line x1={gap.x1} x2={gap.x2} y1={gap.y} y2={gap.y} />
            <line x1={gap.x1} x2={gap.x1} y1={gap.y - 6} y2={gap.y + 6} />
            <line x1={gap.x2} x2={gap.x2} y1={gap.y - 6} y2={gap.y + 6} />
            <text x={gap.labelX} y={gap.y - 8} textAnchor="middle">
              {gap.label}
            </text>
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
      {showZoomHint && layout.hasTinyBar && (
        <p className="note">短い範囲は、全体表示ではとても細く見えます。「拡大表示」で見やすくなります。</p>
      )}
    </div>
  )
}
