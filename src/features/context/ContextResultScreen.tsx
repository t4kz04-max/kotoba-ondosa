import { ContextChart } from '../../components/timeline/ContextChart'
import { SCENE_VARIANTS, sceneMark } from '../../components/timeline/sceneStyle'
import {
  compareContextRanges,
  describeContextComparison,
  type LabeledSceneRange,
} from '../../domain/contextCompare'
import { formatDuration, formatRange } from '../../domain/format'
import type { ContextSettings } from '../../domain/types'
import { useFocusHeading } from '../../hooks/useFocusHeading'

interface ContextResultScreenProps {
  readonly scenes: readonly LabeledSceneRange[]
  readonly settings: ContextSettings
  readonly onRetry: () => void
  readonly onHome: () => void
}

/** 範囲の文章。長さ0の範囲は「ちょうど5分」 */
function rangeText(scene: LabeledSceneRange): string {
  const { range } = scene
  return range.start === range.end ? `ちょうど${formatDuration(range.start)}` : formatRange(range)
}

/**
 * 「場面を変えて比べる」の結果。3つの回答を同じ線形の時間軸に並べ、計算した事実だけを説明する。
 * 計算は compareContextRanges・describeContextComparison（domain）に任せ、ここでは表示だけを行う。
 */
export function ContextResultScreen({ scenes, settings, onRetry, onHome }: ContextResultScreenProps) {
  const headingRef = useFocusHeading()
  const result = compareContextRanges(scenes.map((s) => s.range))
  const description = describeContextComparison(scenes, result, settings.word)

  return (
    <section className="screen screen--context-result">
      <p className="eyebrow">場面を変えて比べる</p>
      <h1 ref={headingRef} tabIndex={-1} className="result-headline">
        {description.headline}
      </h1>

      <div className="card card--chart">
        <ContextChart
          scenes={scenes}
          common={result.common}
          maxSeconds={settings.maxSeconds}
          originLabel={settings.originLabel}
          endpointLabel={settings.endpointLabel}
          description={[description.headline, ...description.details].join(' ')}
        />
      </div>

      <div className="card details">
        <h2>わかったこと</h2>
        {description.details.map((detail) => (
          <p key={detail}>{detail}</p>
        ))}
        <ul className="scene-facts" aria-label="場面ごとの回答">
          {scenes.map((scene, index) => (
            <li key={scene.label} className={`scene-facts__item scene-facts__item--${SCENE_VARIANTS[index] ?? 's1'}`}>
              <span className="scene-facts__name">
                {sceneMark(index)}「{scene.label}」
              </span>
              <span className="scene-facts__range">{rangeText(scene)}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="prompt">{description.prompt}</p>

      <div className="button-stack">
        <button type="button" className="button button--primary button--large" onClick={onRetry}>
          もう一度試す
        </button>
        <button type="button" className="button button--secondary" onClick={onHome}>
          スタートに戻る
        </button>
      </div>
    </section>
  )
}
