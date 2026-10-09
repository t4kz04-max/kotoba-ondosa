import { useId } from 'react'
import { DurationInput } from '../../components/duration-input/DurationInput'
import { TimelineChart } from '../../components/timeline/TimelineChart'
import type { TimelineVariant } from '../../components/timeline/layout'
import { formatRange } from '../../domain/format'
import { validateDraft, type RangeValidationError } from '../../domain/range'
import type { RangeDraft, Seconds } from '../../domain/types'
import { inputErrorMessage } from './inputMessages'

interface RangeInputPanelProps {
  readonly draft: RangeDraft
  readonly onChangeDraft: (draft: RangeDraft) => void
  readonly maxSeconds: Seconds
  readonly stepSeconds: Seconds
  /** 色と線種の系統（入力欄・プレビューの帯） */
  readonly tone: TimelineVariant
  /** プレビューの名前。例：「あなた」「Aさん」「すぐ行く」 */
  readonly label: string
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

/**
 * 範囲（早くて〜遅くて）の入力欄・エラー・プレビュー。
 * ひとり・ふたりモードの入力画面と、「場面を変えて比べる」の入力画面で共用する。
 * 検証は validateDraft だけで行う（確定できるかの最終判断は各セッションの遷移が行う）。
 */
export function RangeInputPanel({ draft, onChangeDraft, maxSeconds, stepSeconds, tone, label }: RangeInputPanelProps) {
  const messageId = useId()
  const validation = validateDraft(draft, maxSeconds)
  const errors = validation.ok ? [] : validation.errors.filter((error) => error !== 'incomplete')
  const incomplete = !validation.ok && validation.errors.includes('incomplete')
  const reversed = errors.includes('start-after-end')
  const startError = fieldError(draft.start, maxSeconds)
  const endError = fieldError(draft.end, maxSeconds)
  // 欄の下に出したエラーは、まとめの欄ではくり返さない
  const sharedErrors = errors.filter((error) => error !== startError && error !== endError)
  const messageFor = (error: RangeValidationError | null) =>
    error === null ? undefined : inputErrorMessage(error, maxSeconds)

  const setStart = (start: Seconds | null) => onChangeDraft({ ...draft, start })
  const setEnd = (end: Seconds | null) => onChangeDraft({ ...draft, end })

  return (
    <>
      <div className="range-inputs">
        <DurationInput
          label="早くて"
          hint="いちばん早い時間"
          value={draft.start}
          onChange={setStart}
          maxSeconds={maxSeconds}
          sliderMin={0}
          stepSeconds={stepSeconds}
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
          maxSeconds={maxSeconds}
          sliderMin={0}
          stepSeconds={stepSeconds}
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
              {label}の範囲：
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
                  まだ選んでいない項目があります。{inputErrorMessage('incomplete', maxSeconds)}
                </p>
              )}
              {sharedErrors.map((error) => (
                <p key={error} className="error">
                  {inputErrorMessage(error, maxSeconds)}
                </p>
              ))}
            </>
          )}
        </div>
        <TimelineChart
          view={{ start: 0, end: maxSeconds }}
          rows={validation.ok ? [{ label, range: validation.range, variant: tone }] : []}
          emptyLabel="まだ範囲を選んでいません"
          description={validation.ok ? `入力中の範囲：${formatRange(validation.range)}` : '入力中の範囲：まだ選んでいません'}
        />
      </div>
    </>
  )
}
