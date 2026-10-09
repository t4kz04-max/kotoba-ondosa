import type { SessionStep } from '../domain/session'

const LABELS = ['えらぶ', 'こたえる', 'くらべる', 'ことばにする'] as const

const STEP_INDEX: Record<SessionStep, number | null> = {
  HOME: null,
  SCENARIO_SELECT: 0,
  INPUT_A: 1,
  HANDOFF: 1,
  INPUT_B: 1,
  READY_TO_REVEAL: 1,
  COMPARISON: 2,
  AGREEMENT: 3,
  COMPLETE: 3,
}

function itemClass(index: number, current: number): string {
  if (index === current) return 'progress__item progress__item--current'
  if (index < current) return 'progress__item progress__item--done'
  return 'progress__item'
}

export function ProgressSteps({ step }: { readonly step: SessionStep }) {
  const current = STEP_INDEX[step]
  if (current === null) return null
  return (
    <nav aria-label="進み具合" className="progress-nav">
      <ol className="progress">
        {LABELS.map((label, index) => (
          <li key={label} className={itemClass(index, current)} aria-current={index === current ? 'step' : undefined}>
            <span className="progress__dot" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ol>
    </nav>
  )
}
