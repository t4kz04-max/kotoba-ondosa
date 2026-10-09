import { useState } from 'react'
import type { LabeledRange } from '../../domain/describe'
import { formatRange } from '../../domain/format'
import { computeZoomView } from '../../domain/scale'
import type { ComparisonDescription, ComparisonResult, Scenario } from '../../domain/types'
import { TimelineChart } from './TimelineChart'

interface ComparisonChartProps {
  readonly scenario: Scenario
  readonly a: LabeledRange
  readonly b: LabeledRange
  readonly result: ComparisonResult
  readonly description: ComparisonDescription
}

type ViewMode = 'full' | 'zoom'

/** 2人の範囲を同じ線形軸に描く。全体表示と拡大表示を切り替えられる */
export function ComparisonChart({ scenario, a, b, result, description }: ComparisonChartProps) {
  const [mode, setMode] = useState<ViewMode>('full')
  const fullView = { start: 0, end: scenario.maxSeconds }
  const zoomView = computeZoomView([a.range, b.range], scenario.maxSeconds)
  const zoomIsFull = zoomView.start === fullView.start && zoomView.end === fullView.end
  const view = mode === 'zoom' ? zoomView : fullView

  return (
    <section className="chart" aria-label="時間軸の図">
      <div className="toggle" role="group" aria-label="表示範囲">
        <button type="button" className="toggle__button" aria-pressed={mode === 'full'} onClick={() => setMode('full')}>
          全体表示
        </button>
        <button type="button" className="toggle__button" aria-pressed={mode === 'zoom'} onClick={() => setMode('zoom')}>
          拡大表示
        </button>
      </div>
      <p className="chart__status" aria-live="polite">
        {mode === 'zoom'
          ? `拡大表示中：${formatRange(zoomView)} を表示しています（全体は ${formatRange(fullView)}）。`
          : `全体表示：${formatRange(fullView)} を表示しています。`}
        {mode === 'zoom' && zoomIsFull && ' 2人の範囲が広いため、全体表示と同じ範囲です。'}
      </p>
      <TimelineChart
        view={view}
        rows={[
          { label: a.label, range: a.range, variant: 'a' },
          { label: b.label, range: b.range, variant: 'b' },
        ]}
        comparison={result}
        description={[description.headline, ...description.details].join(' ')}
        showZoomHint={mode === 'full'}
      />
      <p className="chart__axis-note">
        時間は、{scenario.originLabel}ときからの長さです。目盛りの間隔は時間に比例しています。
      </p>
    </section>
  )
}
