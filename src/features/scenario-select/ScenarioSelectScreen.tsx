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
      <ul className="card-list">
        {scenarios.map((scenario) => (
          <li key={scenario.id}>
            <button type="button" className="card" onClick={() => onSelect(scenario.id)}>
              <span className="card__phrase">「{scenario.phrase}」</span>
              <span className="card__scene">{scenario.scene}</span>
              <span className="card__meta">
                {scenario.originLabel}ときから、{scenario.endpointLabel}までの時間（0〜{formatDuration(scenario.maxSeconds)}で答えます）
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="button button--secondary" onClick={onBack}>
        戻る
      </button>
    </section>
  )
}
