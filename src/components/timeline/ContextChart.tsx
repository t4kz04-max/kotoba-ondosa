import { useState } from 'react'
import type { LabeledSceneRange } from '../../domain/contextCompare'
import { formatDuration, formatRange } from '../../domain/format'
import { computeZoomView } from '../../domain/scale'
import type { Seconds, TimeRange } from '../../domain/types'
import { SCENE_VARIANTS, sceneMark } from './sceneStyle'
import { TimelineChart } from './TimelineChart'

interface ContextChartProps {
  readonly scenes: readonly LabeledSceneRange[]
  /** 3つの範囲すべての共通部分（compareContextRanges の結果） */
  readonly common: TimeRange | null
  readonly maxSeconds: Seconds
  readonly originLabel: string
  readonly endpointLabel: string
  /** 図の内容を文章で表したもの（スクリーンリーダー用） */
  readonly description: string
}

type ViewMode = 'full' | 'zoom'

/**
 * 「場面を変えて比べる」の図。3つの範囲を同じ線形軸に3段で描き、すべてに共通する部分を縦の帯（1点なら縦線）で示す。
 * ComparisonChart と同じく、全体表示と拡大表示（computeZoomView）を切り替えられる。
 */
export function ContextChart({ scenes, common, maxSeconds, originLabel, endpointLabel, description }: ContextChartProps) {
  const [mode, setMode] = useState<ViewMode>('full')
  const fullView = { start: 0, end: maxSeconds }
  const zoomView = computeZoomView(
    scenes.map((s) => s.range),
    maxSeconds,
  )
  const zoomIsFull = zoomView.start === fullView.start && zoomView.end === fullView.end
  const view = mode === 'zoom' ? zoomView : fullView

  return (
    <section className="chart" aria-label="時間軸の図">
      <div className="chart__head">
        <p className="chart__axis-label">
          <span>{originLabel}</span>
          <span aria-hidden="true" className="chart__arrow">
            →
          </span>
          <span>{endpointLabel}</span>
        </p>
        <div className="segmented" role="group" aria-label="表示範囲">
          <button type="button" className="segmented__button" aria-pressed={mode === 'full'} onClick={() => setMode('full')}>
            全体表示
          </button>
          <button type="button" className="segmented__button" aria-pressed={mode === 'zoom'} onClick={() => setMode('zoom')}>
            拡大表示
          </button>
        </div>
      </div>
      <TimelineChart
        view={view}
        rows={scenes.map((scene, index) => ({
          label: `${sceneMark(index)} ${scene.label}`,
          range: scene.range,
          variant: SCENE_VARIANTS[index] ?? 's1',
        }))}
        common={common}
        description={description}
        showZoomHint={mode === 'full'}
      />
      <p className="chart__legend">
        <span className="chart__legend-swatch" aria-hidden="true" />
        {common === null
          ? '3つすべてに共通する時間：なし'
          : common.start === common.end
            ? `3つすべてに共通する時間：ちょうど${formatDuration(common.start)}（1点）`
            : `3つすべてに共通する時間：${formatRange(common)}`}
      </p>
      <p className="chart__status" aria-live="polite">
        {mode === 'zoom'
          ? `拡大表示中：${formatRange(zoomView)} を表示しています（全体は ${formatRange(fullView)}）。`
          : `全体表示：${formatRange(fullView)} を表示しています。`}
        {mode === 'zoom' && zoomIsFull && ' 3つの範囲が広いため、全体表示と同じ範囲です。'}
        {' '}目盛りの間隔は時間に比例しています。
      </p>
    </section>
  )
}
