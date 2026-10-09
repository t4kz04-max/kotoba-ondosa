import { useReducer } from 'react'
import { AppHeader } from '../components/AppHeader'
import { ProgressSteps } from '../components/ProgressSteps'
import { defaultCatalog } from '../data/catalog'
import { createSessionReducer, initialSessionState } from '../domain/session'
import { ErrorBoundary } from './ErrorBoundary'
import { SessionScreens } from './SessionScreens'

const sessionReducer = createSessionReducer(defaultCatalog)

function App() {
  // 状態はメモリ上だけに置く（保存しない）
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState)
  const reset = () => dispatch({ type: 'RESET' })

  return (
    <div className="app">
      <AppHeader showReset={state.step !== 'HOME'} onReset={reset} />
      <div className="app__body">
        <ProgressSteps step={state.step} />
        <main>
          <ErrorBoundary onReset={reset}>
            <SessionScreens state={state} dispatch={dispatch} catalog={defaultCatalog} />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

export default App
