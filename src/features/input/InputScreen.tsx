import { useId } from 'react'
import { DurationInput } from '../../components/duration-input/DurationInput'
import { TimelineChart } from '../../components/timeline/TimelineChart'
import { formatDuration, formatRange } from '../../domain/format'
import { validateDraft } from '../../domain/range'
import type { RangeDraft, Seconds } from '../../domain/types'
import type { InputView } from '../../domain/views'
import { useFocusHeading } from '../../hooks/useFocusHeading'
import { inputErrorMessage } from './inputMessages'

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
  const messageId = useId()
  const { scenario, draft } = view
  const validation = validateDraft(draft, scenario.maxSeconds)
  const errors = validation.ok ? [] : validation.errors.filter((error) => error !== 'incomplete')
  const incomplete = !validation.ok && validation.errors.includes('incomplete')

  const setStart = (start: Seconds | null) => onChangeDraft({ ...draft, start })
  const setEnd = (end: Seconds | null) => onChangeDraft({ ...draft, end })

  return (
    <section className="screen">
      <p className="eyebrow">{whoseTurn(view)}</p>
      <h1 ref={headingRef} tabIndex={-1}>
        「{scenario.phrase}」
      </h1>
      <p className="scene">{scenario.scene}</p>
      <p className="question">{scenario.question}</p>
      <p className="note">
        {scenario.originLabel}ときを0として、{scenario.endpointLabel}までの時間で答えます。
        当てはまると思う範囲を「早くて」「遅くて」で選んでください。
      </p>

      <div className="range-inputs">
        <DurationInput
          label="早くて"
          value={draft.start}
          onChange={setStart}
          maxSeconds={scenario.maxSeconds}
          sliderMin={0}
          stepSeconds={scenario.inputStepSeconds}
          describedBy={messageId}
        />
        <DurationInput
          label="遅くて"
          value={draft.end}
          onChange={setEnd}
          maxSeconds={scenario.maxSeconds}
          sliderMin={0}
          stepSeconds={scenario.inputStepSeconds}
          describedBy={messageId}
        />
      </div>

      <div id={messageId} aria-live="polite" className="messages">
        {validation.ok ? (
          <p className="range-summary">
            {answererLabel(view)}の範囲：<strong>{validation.range.start === validation.range.end ? `ちょうど${formatRange(validation.range)}` : formatRange(validation.range)}</strong>
          </p>
        ) : (
          <>
            {incomplete && <p className="hint">まだ入力していない項目があります。{inputErrorMessage('incomplete', scenario.maxSeconds)}</p>}
            {errors.map((error) => (
              <p key={error} className="error">
                {inputErrorMessage(error, scenario.maxSeconds)}
              </p>
            ))}
          </>
        )}
      </div>

      {validation.ok && (
        <TimelineChart
          view={{ start: 0, end: scenario.maxSeconds }}
          rows={[{ label: answererLabel(view), range: validation.range, variant: view.participant === 'A' ? 'a' : 'b' }]}
          description={`入力中の範囲：${formatRange(validation.range)}`}
        />
      )}

      <p className="note">
        このアプリでは{formatDuration(scenario.maxSeconds)}までで答えます。{formatDuration(scenario.maxSeconds)}より長いと感じる人もいます。
        スライダーで大まかに選び、数字で細かく直せます。0にするときは数字で「0」と入力してください。
      </p>

      <div className="button-row">
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
