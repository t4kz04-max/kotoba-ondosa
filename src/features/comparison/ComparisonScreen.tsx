import { ComparisonChart } from '../../components/timeline/ComparisonChart'
import { formatDuration, formatRange, formatSampleLabel } from '../../domain/format'
import type { ComparisonView } from '../../domain/views'
import { useFocusHeading } from '../../hooks/useFocusHeading'
import { useRevealOnce } from '../../hooks/useRevealOnce'

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
      <div className="facts__item facts__item--a">
        <dt>{a.label}の範囲</dt>
        <dd>{formatRange(a.range)}</dd>
      </div>
      <div className="facts__item facts__item--b">
        <dt>{b.label}の範囲</dt>
        <dd>{formatRange(b.range)}</dd>
      </div>
      <div className="facts__item facts__item--common">
        <dt>共通範囲</dt>
        <dd>
          {result.intersection === null
            ? 'なし'
            : result.relation === 'touch'
              ? `${formatRange(result.intersection)}（1点だけ）`
              : formatRange(result.intersection)}
        </dd>
      </div>
      <div className="facts__item">
        <dt>範囲のあいだの空白</dt>
        <dd>{result.gapLength === 0 ? 'なし' : formatDuration(result.gapLength)}</dd>
      </div>
      <div className="facts__item">
        <dt>範囲のまんなかの差</dt>
        <dd>{result.midpointDifference === 0 ? 'なし（同じ）' : formatDuration(result.midpointDifference)}</dd>
      </div>
    </dl>
  )
}

/**
 * 比較結果画面。公開演出は「回答の公開 → 2人の範囲 → 共通部分／空白 → 説明文」の順。
 * 演出は CSS だけで行い、内容は最初からすべて DOM にあるため、アニメーションを見なくても読める。
 */
export function ComparisonScreen({ view, onSelectSample, onStartAgreement, onRestartSameMode }: ComparisonScreenProps) {
  const headingRef = useFocusHeading()
  const animate = useRevealOnce(view.a.range)
  const { description } = view
  const selectedSample = view.samples.find((s) => s.sampleId === view.selectedSampleId)

  return (
    <section className={animate ? 'screen screen--comparison reveal' : 'screen screen--comparison'}>
      <p className="eyebrow reveal__step reveal__step--1">「{view.scenario.phrase}」をくらべる</p>
      <h1 ref={headingRef} tabIndex={-1} className="result-headline reveal__step reveal__step--4">
        {description.headline}
      </h1>

      <ul className="answer-chips reveal__step reveal__step--1" aria-label="2人の回答">
        <li className="answer-chip answer-chip--a">
          <span className="answer-chip__swatch" aria-hidden="true" />
          <span className="answer-chip__name">{view.a.label}</span>
          <span className="answer-chip__range">{formatRange(view.a.range)}</span>
        </li>
        <li className="answer-chip answer-chip--b">
          <span className="answer-chip__swatch" aria-hidden="true" />
          <span className="answer-chip__name">{view.b.label}</span>
          <span className="answer-chip__range">{formatRange(view.b.range)}</span>
        </li>
      </ul>

      <div className="card card--chart">
        <ComparisonChart
          scenario={view.scenario}
          a={view.a}
          b={view.b}
          result={view.result}
          description={description}
          animate={animate}
        />
        {view.samples.length > 0 && (
          <p className="fictional-note">
            このサンプルは説明用に作った架空の回答です。実際の調査結果ではありません。
          </p>
        )}
      </div>

      <div className="card details reveal__step reveal__step--4">
        {description.details.map((detail) => (
          <p key={detail}>{detail}</p>
        ))}
        <details className="facts-details">
          <summary>数字でまとめて見る</summary>
          <ComparisonFacts view={view} />
        </details>
      </div>

      <div className="next-card reveal__step reveal__step--4">
        <p className="prompt">{description.prompt}</p>
        <button type="button" className="button button--primary button--large button--block" onClick={onStartAgreement}>
          具体的な言葉にする
        </button>
      </div>

      {view.samples.length > 0 && (
        <div className="samples">
          <h2>ほかのサンプルとくらべる</h2>
          <div className="segmented segmented--wide" role="group" aria-label="くらべる架空のサンプル">
            {view.samples.map((sample) => (
              <button
                key={sample.sampleId}
                type="button"
                className="segmented__button"
                aria-pressed={sample.sampleId === view.selectedSampleId}
                onClick={() => onSelectSample(sample.sampleId)}
              >
                {formatSampleLabel(sample)}
              </button>
            ))}
          </div>
          {selectedSample !== undefined && (
            <p className="note">
              {formatSampleLabel(selectedSample)}の設定：{selectedSample.note}
            </p>
          )}
        </div>
      )}

      <div className="button-row button-row--end">
        <button type="button" className="button button--secondary" onClick={onRestartSameMode}>
          ほかの言葉でくらべる
        </button>
      </div>
    </section>
  )
}
