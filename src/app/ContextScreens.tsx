import type { Dispatch } from 'react'
import { completedAnswers, type ContextEvent, type ContextState } from '../domain/contextSession'
import type { ContextScene, ContextSettings } from '../domain/types'
import { ContextInputScreen, ContextProgress } from '../features/context/ContextInputScreen'
import { ContextResultScreen } from '../features/context/ContextResultScreen'

interface ContextScreensProps {
  readonly state: ContextState
  readonly dispatch: Dispatch<ContextEvent>
  readonly scenes: readonly ContextScene[]
  readonly settings: ContextSettings
  /** スタート画面へ戻る（最初の場面の「戻る」と、結果画面の「スタートに戻る」） */
  readonly onExit: () => void
}

/** 「場面を変えて比べる」の画面。state.step と index に応じて1画面を描く */
export function ContextScreens({ state, dispatch, scenes, settings, onExit }: ContextScreensProps) {
  const answers = completedAnswers(state)
  if (state.step === 'RESULT' && answers !== null) {
    return (
      <>
        <ContextProgress current={scenes.length} sceneCount={scenes.length} />
        <ContextResultScreen
          scenes={scenes.map((scene, i) => ({ label: scene.phrase, range: answers[i] }))}
          settings={settings}
          onRetry={() => dispatch({ type: 'RETRY' })}
          onHome={onExit}
        />
      </>
    )
  }

  const scene = scenes[state.index]
  if (scene === undefined) throw new Error(`Missing context scene ${state.index}`)
  return (
    <>
      <ContextProgress current={state.index} sceneCount={scenes.length} />
      <ContextInputScreen
        // 場面が変わったら入力欄を作り直す（数値欄の文字・見出しへのフォーカス）
        key={state.index}
        scene={scene}
        index={state.index}
        sceneCount={scenes.length}
        settings={settings}
        draft={state.draft}
        onChangeDraft={(draft) => dispatch({ type: 'SET_DRAFT', draft })}
        onSubmit={() => dispatch({ type: 'SUBMIT_ANSWER' })}
        onBack={() => (state.index === 0 ? onExit() : dispatch({ type: 'BACK' }))}
      />
    </>
  )
}
