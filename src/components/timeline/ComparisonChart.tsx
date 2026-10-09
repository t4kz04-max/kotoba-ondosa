import { useState } from 'react'
import type { LabeledRange } from '../../domain/describe'
import { formatDuration, formatRange } from '../../domain/format'
import { computeZoomView } from '../../domain/scale'
import type { ComparisonDescription, ComparisonResult, Scenario } from '../../domain/types'
import { TimelineChart } from './TimelineChart'

interface ComparisonChartProps {
  readonly scenario: Scenario
  readonly a: LabeledRange
  readonly b: LabeledRange
  readonly result: ComparisonResult
  readonly description: ComparisonDescription
  /** 公開演出を行うか（比較結果画面で最初に表示したときだけ） */
  readonly animate?: boolean
}

type ViewMode = 'full' | 'zoom'

/** 重ね合わせの段の右側に出す事実。compareRanges の結果をそのまま言葉にする */
function overlaySummary(result: ComparisonResult): string {
  if (result.intersection === null) return `${formatDuration(result.gapLength)}のひらき`
  if (result.relation === 'touch') return `共通 ${formatDuration(result.intersection.start)}（1点だけ）`
  return `共通 ${formatRange(result.intersection)}`
}

/**
 * 2人の範囲を同じ線形軸に描く。A の段・B の段・重ね合わせの段の3層。
 * 全体表示と拡大表示を切り替えられ、どちらも表示範囲を変えるだけで線形性は保つ。
 */
export function ComparisonChart({ scenario, a, b, result, description, animate }: ComparisonChartProps) {
  const [mode, setMode] = useState<ViewMode>('full')
  const fullView = { start: 0, end: scenario.maxSeconds }
  const zoomView = computeZoomView([a.range, b.range], scenario.maxSeconds)
  const zoomIsFull = zoomView.start === fullView.start && zoomView.end === fullView.end
  const view = mode === 'zoom' ? zoomView : fullView

  return (
    <section className="chart" aria-label="時間軸の図">
      <div className="chart__head">
        <p className="chart__axis-label">
          <span>{scenario.originLabel}</span>
          <span aria-hidden="true" className="chart__arrow">
            →
          </span>
          <span>{scenario.endpointLabel}</span>
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
        rows={[
          { label: a.label, range: a.range, variant: 'a' },
          { label: b.label, range: b.range, variant: 'b' },
        ]}
        comparison={result}
        description={[description.headline, ...description.details].join(' ')}
        showZoomHint={mode === 'full'}
        overlay={{ label: '重ねると', summary: overlaySummary(result) }}
        swapKey={`${b.label}|${b.range.start}-${b.range.end}`}
        animate={animate}
      />
      <p className="chart__status" aria-live="polite">
        {mode === 'zoom'
          ? `拡大表示中：${formatRange(zoomView)} を表示しています（全体は ${formatRange(fullView)}）。`
          : `全体表示：${formatRange(fullView)} を表示しています。`}
        {mode === 'zoom' && zoomIsFull && ' 2人の範囲が広いため、全体表示と同じ範囲です。'}
        {' '}目盛りの間隔は時間に比例しています。
      </p>
    </section>
  )
}
