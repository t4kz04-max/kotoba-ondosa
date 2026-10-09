import { SCENE_VARIANTS, sceneMark } from '../../components/timeline/sceneStyle'
import { StepIndicator } from '../../components/ProgressSteps'
import { formatDuration } from '../../domain/format'
import { validateDraft } from '../../domain/range'
import type { ContextScene, ContextSettings, RangeDraft } from '../../domain/types'
import { useFocusHeading } from '../../hooks/useFocusHeading'
import { RangeInputPanel } from '../input/RangeInputPanel'

interface ContextInputScreenProps {
  readonly scene: ContextScene
  readonly index: number
  readonly sceneCount: number
  readonly settings: ContextSettings
  readonly draft: RangeDraft
  readonly onChangeDraft: (draft: RangeDraft) => void
  readonly onSubmit: () => void
  readonly onBack: () => void
}

/**
 * 「場面を変えて比べる」の入力画面。1場面ずつ答える。
 * ほかの場面の回答は表示しない（前の答えに引きずられにくくするため）。
 */
export function ContextInputScreen({
  scene,
  index,
  sceneCount,
  settings,
  draft,
  onChangeDraft,
  onSubmit,
  onBack,
}: ContextInputScreenProps) {
  const headingRef = useFocusHeading()
  const canSubmit = validateDraft(draft, settings.maxSeconds).ok
  const isLast = index === sceneCount - 1
  const tone = SCENE_VARIANTS[index] ?? 's1'

  return (
    <section className="screen screen--input">
      <p className={`turn-badge turn-badge--${tone}`}>
        場面{sceneMark(index)}（{sceneCount}つのうち{index + 1}つめ）
      </p>
      <h1 ref={headingRef} tabIndex={-1} className="phrase-title">
        「{scene.phrase}」
      </h1>
      <div className="scene-card">
        <p className="scene-card__scene">{scene.scene}</p>
        <p className="scene-card__question">{scene.question}</p>
      </div>
      <p className="note">
        {settings.originLabel}ときを0として、{scene.actionLabel}までの時間で答えます。
        当てはまると思う範囲を「早くて」「遅くて」で選んでください。
      </p>

      <RangeInputPanel
        draft={draft}
        onChangeDraft={onChangeDraft}
        maxSeconds={settings.maxSeconds}
        stepSeconds={settings.inputStepSeconds}
        tone={tone}
        label={`「${scene.phrase}」`}
      />

      <p className="note">
        この体験では、どの場面も{formatDuration(settings.maxSeconds)}までで答えます。それより長いと感じる人もいます。
        0分は「0分にする」ボタンか、数字の「0」で選べます。
      </p>

      <div className="action-bar">
        <button type="button" className="button button--secondary" onClick={onBack}>
          戻る
        </button>
        <button type="button" className="button button--primary" disabled={!canSubmit} onClick={onSubmit}>
          {isLast ? 'これで決定してくらべる' : 'これで決定して次へ'}
        </button>
      </div>
    </section>
  )
}

/** 「場面を変えて比べる」の進み具合（場面① → 場面② → 場面③ → くらべる） */
export function ContextProgress({ current, sceneCount }: { readonly current: number; readonly sceneCount: number }) {
  const labels = [...Array.from({ length: sceneCount }, (_, i) => `場面${sceneMark(i)}`), 'くらべる']
  return <StepIndicator labels={labels} current={current} />
}
