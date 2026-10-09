import { ComparisonChart } from '../../components/timeline/ComparisonChart'
import { formatDuration, formatRange, formatSampleLabel } from '../../domain/format'
import type { ComparisonView } from '../../domain/views'
import { useFocusHeading } from '../../hooks/useFocusHeading'

interface ComparisonScreenProps {
  readonly view: ComparisonView
  readonly onSelectSample: (sampleId: string) => void
  readonly onStartAgreement: () => void
  readonly onRestartSameMode: () => void
}

/** 比較結果の数値のまとめ（計算は compareRanges の結果を表示するだけ） */
function ComparisonFacts({ view }: { readonly view: ComparisonView }) {
  const { a, b, result } = view
  return (
    <dl className="facts">
      <div>
        <dt>{a.label}の範囲</dt>
        <dd>{formatRange(a.range)}</dd>
      </div>
      <div>
        <dt>{b.label}の範囲</dt>
        <dd>{formatRange(b.range)}</dd>
      </div>
      <div>
        <dt>共通範囲</dt>
        <dd>
          {result.intersection === null
            ? 'なし'
            : result.relation === 'touch'
              ? `${formatRange(result.intersection)}（1点だけ）`
              : formatRange(result.intersection)}
        </dd>
      </div>
      <div>
        <dt>範囲のあいだの空白</dt>
        <dd>{result.gapLength === 0 ? 'なし' : formatDuration(result.gapLength)}</dd>
      </div>
      <div>
        <dt>範囲のまんなかの差</dt>
        <dd>{result.midpointDifference === 0 ? 'なし（同じ）' : formatDuration(result.midpointDifference)}</dd>
      </div>
    </dl>
  )
}

export function ComparisonScreen({ view, onSelectSample, onStartAgreement, onRestartSameMode }: ComparisonScreenProps) {
  const headingRef = useFocusHeading()
  const { description } = view

  return (
    <section className="screen">
      <p className="eyebrow">「{view.scenario.phrase}」をくらべる</p>
      <h1 ref={headingRef} tabIndex={-1}>
        {description.headline}
      </h1>

      <ComparisonChart
        scenario={view.scenario}
        a={view.a}
        b={view.b}
        result={view.result}
        description={description}
      />

      {view.samples.length > 0 && (
        <p className="fictional-note">
          このサンプルは説明用に作った架空の回答です。実際の調査結果ではありません。
        </p>
      )}

      <div className="details">
        {description.details.map((detail) => (
          <p key={detail}>{detail}</p>
        ))}
      </div>

      <ComparisonFacts view={view} />

      {view.samples.length > 0 && (
        <div className="samples">
          <h2>ほかのサンプルとくらべる</h2>
          <div className="toggle" role="group" aria-label="くらべる架空のサンプル">
            {view.samples.map((sample) => (
              <button
                key={sample.sampleId}
                type="button"
                className="toggle__button"
                aria-pressed={sample.sampleId === view.selectedSampleId}
                onClick={() => onSelectSample(sample.sampleId)}
              >
                {formatSampleLabel(sample)}
              </button>
            ))}
          </div>
          <p className="note">
            {view.samples.find((s) => s.sampleId === view.selectedSampleId)?.note}
          </p>
        </div>
      )}

      <p className="prompt">{description.prompt}</p>

      <div className="button-stack">
        <button type="button" className="button button--primary" onClick={onStartAgreement}>
          具体的な言葉にする
        </button>
        <button type="button" className="button button--secondary" onClick={onRestartSameMode}>
          ほかの言葉でくらべる
        </button>
      </div>
    </section>
  )
}
