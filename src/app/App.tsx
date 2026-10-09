import { useReducer, useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { ProgressSteps } from '../components/ProgressSteps'
import { defaultCatalog } from '../data/catalog'
import { CONTEXT_SCENES, CONTEXT_SETTINGS } from '../data/contextScenes'
import { createContextReducer, createInitialContextState } from '../domain/contextSession'
import { createSessionReducer, initialSessionState } from '../domain/session'
import { ContextScreens } from './ContextScreens'
import { ErrorBoundary } from './ErrorBoundary'
import { SessionScreens } from './SessionScreens'

const sessionReducer = createSessionReducer(defaultCatalog)
const contextReducer = createContextReducer({
  sceneCount: CONTEXT_SCENES.length,
  maxSeconds: CONTEXT_SETTINGS.maxSeconds,
})
const initialContextState = createInitialContextState(CONTEXT_SCENES.length)

/** どの体験をしているか。'compare' は既存のひとり・ふたりモード（スタート画面を含む） */
type Experience = 'compare' | 'context'

function App() {
  // 状態はメモリ上だけに置く（保存しない）。2つの体験の状態は独立させる
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState)
  const [contextState, contextDispatch] = useReducer(contextReducer, initialContextState)
  const [experience, setExperience] = useState<Experience>('compare')

  const reset = () => {
    dispatch({ type: 'RESET' })
    contextDispatch({ type: 'RETRY' })
    setExperience('compare')
  }
  const startContext = () => {
    contextDispatch({ type: 'RETRY' })
    setExperience('context')
  }

  const inContext = experience === 'context'

  return (
    <div className="app">
      <AppHeader showReset={inContext || state.step !== 'HOME'} onReset={reset} />
      <div className="app__body">
        {!inContext && <ProgressSteps step={state.step} />}
        <main>
          <ErrorBoundary onReset={reset}>
            {inContext ? (
              <ContextScreens
                state={contextState}
                dispatch={contextDispatch}
                scenes={CONTEXT_SCENES}
                settings={CONTEXT_SETTINGS}
                onExit={reset}
              />
            ) : (
              <SessionScreens
                state={state}
                dispatch={dispatch}
                catalog={defaultCatalog}
                onStartContext={startContext}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

export default App
