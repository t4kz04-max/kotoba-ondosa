import { Icon } from '../../components/Icon'
import { formatDuration } from '../../domain/format'
import type { Scenario, ScenarioId } from '../../domain/types'
import { useFocusHeading } from '../../hooks/useFocusHeading'

interface ScenarioSelectScreenProps {
  readonly scenarios: readonly Scenario[]
  readonly onSelect: (scenarioId: ScenarioId) => void
  readonly onBack: () => void
}

export function ScenarioSelectScreen({ scenarios, onSelect, onBack }: ScenarioSelectScreenProps) {
  const headingRef = useFocusHeading()
  return (
    <section className="screen">
      <h1 ref={headingRef} tabIndex={-1}>
        どの言葉でくらべる？
      </h1>
      <p className="lead">場面を読んで、くらべたい言葉を選んでください。</p>
      <ul className="scenario-list">
        {scenarios.map((scenario) => (
          <li key={scenario.id}>
            <button type="button" className="scenario-card" onClick={() => onSelect(scenario.id)}>
              <span className="scenario-card__phrase">「{scenario.phrase}」</span>
              <span className="scenario-card__scene">{scenario.scene}</span>
              <span className="scenario-card__meta">
                <span className="scenario-card__term">
                  <span className="scenario-card__key">はかる時間</span>
                  <span>
                    {scenario.originLabel}ときから、{scenario.endpointLabel}まで
                  </span>
                </span>
                <span className="scenario-card__term">
                  <span className="scenario-card__key">答える範囲</span>
                  <span>0〜{formatDuration(scenario.maxSeconds)}</span>
                </span>
              </span>
              <span className="scenario-card__go" aria-hidden="true">
                <Icon name="arrowRight" size={20} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="button-row">
        <button type="button" className="button button--secondary" onClick={onBack}>
          戻る
        </button>
      </div>
    </section>
  )
}
