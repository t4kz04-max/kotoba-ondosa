import { useId } from 'react'
import { DurationInput } from '../../components/duration-input/DurationInput'
import { TimelineChart } from '../../components/timeline/TimelineChart'
import { formatDuration, formatRange } from '../../domain/format'
import { validateDraft, type RangeValidationError } from '../../domain/range'
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

/**
 * 1つの欄だけの値の問題（数字以外・負の値・上限超過）。範囲全体の検証と同じ validateDraft を、
 * その値だけの範囲に使って調べる。問題がなければ null。
 * （どの欄を直せばよいかを、その欄のすぐ下の文・枠の色・aria-invalid で示すため）
 */
function fieldError(value: Seconds | null, maxSeconds: Seconds): RangeValidationError | null {
  if (value === null) return null
  const result = validateDraft({ start: value, end: value }, maxSeconds)
  return result.ok ? null : (result.errors.find((error) => error !== 'incomplete') ?? null)
}

export function InputScreen({ view, onChangeDraft, onSubmit, onBack }: InputScreenProps) {
  const headingRef = useFocusHeading()
  const messageId = useId()
  const { scenario, draft } = view
  const validation = validateDraft(draft, scenario.maxSeconds)
  const errors = validation.ok ? [] : validation.errors.filter((error) => error !== 'incomplete')
  const incomplete = !validation.ok && validation.errors.includes('incomplete')
  const reversed = errors.includes('start-after-end')
  const startError = fieldError(draft.start, scenario.maxSeconds)
  const endError = fieldError(draft.end, scenario.maxSeconds)
  // 欄の下に出したエラーは、まとめの欄ではくり返さない
  const sharedErrors = errors.filter((error) => error !== startError && error !== endError)
  const messageFor = (error: RangeValidationError | null) =>
    error === null ? undefined : inputErrorMessage(error, scenario.maxSeconds)
  const tone = view.participant === 'A' ? 'a' : 'b'
  const who = answererLabel(view)

  const setStart = (start: Seconds | null) => onChangeDraft({ ...draft, start })
  const setEnd = (end: Seconds | null) => onChangeDraft({ ...draft, end })

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

      <div className="range-inputs">
        <DurationInput
          label="早くて"
          hint="いちばん早い時間"
          value={draft.start}
          onChange={setStart}
          maxSeconds={scenario.maxSeconds}
          sliderMin={0}
          stepSeconds={scenario.inputStepSeconds}
          describedBy={messageId}
          tone={tone}
          invalid={reversed || startError !== null}
          error={messageFor(startError)}
          zeroShortcut
        />
        <DurationInput
          label="遅くて"
          hint="いちばん遅い時間"
          value={draft.end}
          onChange={setEnd}
          maxSeconds={scenario.maxSeconds}
          sliderMin={0}
          stepSeconds={scenario.inputStepSeconds}
          describedBy={messageId}
          tone={tone}
          invalid={reversed || endError !== null}
          error={messageFor(endError)}
        />
      </div>

      <div className="preview-card">
        <div id={messageId} aria-live="polite" className="messages">
          {validation.ok ? (
            <p className="range-summary">
              {who}の範囲：
              <strong>
                {validation.range.start === validation.range.end
                  ? `ちょうど${formatRange(validation.range)}`
                  : formatRange(validation.range)}
              </strong>
            </p>
          ) : (
            <>
              {incomplete && (
                <p className="hint">
                  まだ選んでいない項目があります。{inputErrorMessage('incomplete', scenario.maxSeconds)}
                </p>
              )}
              {sharedErrors.map((error) => (
                <p key={error} className="error">
                  {inputErrorMessage(error, scenario.maxSeconds)}
                </p>
              ))}
            </>
          )}
        </div>
        <TimelineChart
          view={{ start: 0, end: scenario.maxSeconds }}
          rows={validation.ok ? [{ label: who, range: validation.range, variant: tone }] : []}
          emptyLabel="まだ範囲を選んでいません"
          description={validation.ok ? `入力中の範囲：${formatRange(validation.range)}` : '入力中の範囲：まだ選んでいません'}
        />
      </div>

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
