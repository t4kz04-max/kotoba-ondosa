import { formatDuration } from '../../domain/format'
import type { RangeDraft } from '../../domain/types'
import type { InputView } from '../../domain/views'
import { useFocusHeading } from '../../hooks/useFocusHeading'
import { RangeInputPanel } from './RangeInputPanel'

interface InputScreenProps {
  /** selectInputView の結果。もう一方の回答は含まれない */
  readonly view: InputView
  readonly onChangeDraft: (draft: RangeDraft) => void
  readonly onSubmit: () => void
  readonly onBack: () => void
}

function answererLabel(view: InputView): string {
  if (view.mode === 'solo') return 'あなた'
  return `${view.participant}さん`
}

function whoseTurn(view: InputView): string {
  if (view.mode === 'solo') return 'あなたの感覚'
  return view.participant === 'A' ? 'Aさんの番' : 'Bさんの番'
}

export function InputScreen({ view, onChangeDraft, onSubmit, onBack }: InputScreenProps) {
  const headingRef = useFocusHeading()
  const { scenario, draft } = view
  const tone = view.participant === 'A' ? 'a' : 'b'

  return (
    <section className="screen screen--input">
      <p className={`turn-badge turn-badge--${tone}`}>{whoseTurn(view)}</p>
      <h1 ref={headingRef} tabIndex={-1} className="phrase-title">
        「{scenario.phrase}」
      </h1>
      <div className="scene-card">
        <p className="scene-card__scene">{scenario.scene}</p>
        <p className="scene-card__question">{scenario.question}</p>
      </div>
      <p className="note">
        {scenario.originLabel}ときを0として、{scenario.endpointLabel}までの時間で答えます。
        当てはまると思う範囲を「早くて」「遅くて」で選んでください。
      </p>

      <RangeInputPanel
        draft={draft}
        onChangeDraft={onChangeDraft}
        maxSeconds={scenario.maxSeconds}
        stepSeconds={scenario.inputStepSeconds}
        tone={tone}
        label={answererLabel(view)}
      />

      <p className="note">
        このアプリでは{formatDuration(scenario.maxSeconds)}までで答えます。{formatDuration(scenario.maxSeconds)}より長いと感じる人もいます。
        スライダーで大まかに選び、数字で細かく直せます。0分は「0分にする」ボタンか、数字の「0」で選べます。
      </p>

      <div className="action-bar">
        <button type="button" className="button button--secondary" onClick={onBack}>
          戻る
        </button>
        <button type="button" className="button button--primary" disabled={!view.canSubmit} onClick={onSubmit}>
          これで決定
        </button>
      </div>
    </section>
  )
}
