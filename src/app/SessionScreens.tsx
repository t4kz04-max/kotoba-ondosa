import type { Dispatch } from 'react'
import type { SessionCatalog, SessionEvent, SessionState } from '../domain/session'
import { selectAgreementView, selectComparisonView, selectInputView } from '../domain/views'
import { AgreementScreen } from '../features/agreement/AgreementScreen'
import { ComparisonScreen } from '../features/comparison/ComparisonScreen'
import { CompleteScreen } from '../features/complete/CompleteScreen'
import { HandoffScreen } from '../features/handoff/HandoffScreen'
import { HomeScreen } from '../features/home/HomeScreen'
import { InputScreen } from '../features/input/InputScreen'
import { ScenarioSelectScreen } from '../features/scenario-select/ScenarioSelectScreen'

interface SessionScreensProps {
  readonly state: SessionState
  readonly dispatch: Dispatch<SessionEvent>
  readonly catalog: SessionCatalog
  /** スタート画面から「場面を変えて比べる」を始める（別の体験。このセッションの状態は変えない） */
  readonly onStartContext?: () => void
}

function missing(what: string): never {
  throw new Error(`Missing ${what} for the current step`)
}

/**
 * state.step に応じて画面を1つ描画する。
 * 各画面には views.ts で選んだ情報だけを渡す（B の入力画面に A の回答は渡らない）。
 */
export function SessionScreens({ state, dispatch, catalog, onStartContext }: SessionScreensProps) {
  switch (state.step) {
    case 'HOME':
      return (
        <HomeScreen
          onSelectMode={(mode) => dispatch({ type: 'SELECT_MODE', mode })}
          onStartContext={onStartContext}
        />
      )

    case 'SCENARIO_SELECT':
      return (
        <ScenarioSelectScreen
          scenarios={catalog.scenarios}
          onSelect={(scenarioId) => dispatch({ type: 'SELECT_SCENARIO', scenarioId })}
          onBack={() => dispatch({ type: 'BACK' })}
        />
      )

    case 'INPUT_A':
    case 'INPUT_B': {
      const view = selectInputView(state, catalog) ?? missing('input view')
      return (
        <InputScreen
          key={state.step}
          view={view}
          onChangeDraft={(draft) => dispatch({ type: 'SET_DRAFT', draft })}
          onSubmit={() => dispatch({ type: 'SUBMIT_ANSWER' })}
          onBack={() => dispatch({ type: 'BACK' })}
        />
      )
    }

    case 'HANDOFF':
      return <HandoffScreen variant="handoff" onContinue={() => dispatch({ type: 'START_INPUT_B' })} />

    case 'READY_TO_REVEAL':
      return <HandoffScreen variant="reveal" onContinue={() => dispatch({ type: 'REVEAL' })} />

    case 'COMPARISON': {
      const view = selectComparisonView(state, catalog) ?? missing('comparison view')
      return (
        <ComparisonScreen
          view={view}
          onSelectSample={(sampleId) => dispatch({ type: 'SELECT_SAMPLE', sampleId })}
          onStartAgreement={() => dispatch({ type: 'START_AGREEMENT' })}
          onRestartSameMode={() => dispatch({ type: 'RESTART_SAME_MODE' })}
        />
      )
    }

    case 'AGREEMENT':
    case 'COMPLETE': {
      const comparison = selectComparisonView(state, catalog) ?? missing('comparison view')
      const agreement = selectAgreementView(state, catalog) ?? missing('agreement view')
      const mode = state.mode ?? missing('mode')
      if (state.step === 'COMPLETE') {
        return (
          <CompleteScreen
            comparison={comparison}
            agreement={agreement}
            mode={mode}
            onReset={() => dispatch({ type: 'RESET' })}
            onRestartSameMode={() => dispatch({ type: 'RESTART_SAME_MODE' })}
          />
        )
      }
      return (
        <AgreementScreen
          comparison={comparison}
          agreement={agreement}
          mode={mode}
          onChooseTime={(seconds) => dispatch({ type: 'CHOOSE_AGREEMENT_TIME', seconds })}
          onApprove={(participant, feasibilityConfirmed) =>
            dispatch({ type: 'APPROVE_AGREEMENT', participant, feasibilityConfirmed })
          }
          onRevise={() => dispatch({ type: 'REVISE_AGREEMENT' })}
          onBack={() => dispatch({ type: 'BACK' })}
          onRestartSameMode={() => dispatch({ type: 'RESTART_SAME_MODE' })}
        />
      )
    }
  }
}
