import { useId, useState, type CSSProperties } from 'react'
import { formatDuration } from '../../domain/format'
import type { Seconds } from '../../domain/types'
import {
  fieldsToSeconds,
  secondsToFields,
  UNIT_LABELS,
  unitsFor,
  type DurationUnit,
  type FieldTexts,
} from './durationFields'

interface DurationInputProps {
  readonly label: string
  /** ラベルの補足（例：「範囲の始まり」） */
  readonly hint?: string
  /** null は未入力。NaN は数字以外が入力された状態 */
  readonly value: Seconds | null
  readonly onChange: (value: Seconds | null) => void
  readonly maxSeconds: Seconds
  readonly sliderMin: Seconds
  /** スライダーの刻み（大まかな調整用） */
  readonly stepSeconds: Seconds
  readonly describedBy?: string
  /** 色の系統。A（あなた・Aさん）・B（Bさん）・どちらでもない */
  readonly tone?: 'a' | 'b' | 'neutral'
  /** この欄の値に問題があるとき true（枠を強調し、aria-invalid を付ける） */
  readonly invalid?: boolean
  /** この欄だけの問題を、欄のすぐ下に出す文（範囲全体の問題は呼び出し側で表示する） */
  readonly error?: string
  /** 「0分にする」ボタンを出す（スライダーの初期位置と同じ 0 を選びやすくするため） */
  readonly zeroShortcut?: boolean
}

/**
 * 時間の入力。スライダーで大まかに、数値入力で正確に調整する。
 * 初期状態（value = null）は未入力として表示し、スライダーの位置を回答とみなさない。
 */
export function DurationInput({
  label,
  hint,
  value,
  onChange,
  maxSeconds,
  sliderMin,
  stepSeconds,
  describedBy,
  tone = 'neutral',
  invalid = false,
  error,
  zeroShortcut = false,
}: DurationInputProps) {
  const id = useId()
  const units = unitsFor(maxSeconds)
  const [fields, setFields] = useState<FieldTexts>(() => secondsToFields(value, units))
  const isSet = value !== null && Number.isFinite(value)
  const isNotNumber = value !== null && !Number.isFinite(value)
  const errorId = `${id}-error`
  const describedByAll = [error !== undefined ? errorId : undefined, describedBy].filter(Boolean).join(' ') || undefined

  const setFromSlider = (seconds: Seconds) => {
    setFields(secondsToFields(seconds, units))
    onChange(seconds)
  }

  const handleField = (unit: DurationUnit, text: string) => {
    const next = { ...fields, [unit]: text }
    setFields(next)
    onChange(fieldsToSeconds(next, units))
  }

  const sliderValue = isSet ? Math.min(Math.max(value, sliderMin), maxSeconds) : sliderMin
  // スライダーの塗り（つまみより左側）の割合。未入力なら塗らない
  const fill = isSet ? ((sliderValue - sliderMin) / (maxSeconds - sliderMin)) * 100 : 0
  const classes = ['duration', `duration--${tone}`, isSet ? '' : 'duration--unset', invalid ? 'duration--invalid' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <fieldset className={classes}>
      <legend className="duration__legend">
        <span className="duration__label">{label}</span>
        {hint !== undefined && <span className="duration__hint">{hint}</span>}
      </legend>
      <p className="duration__value" aria-hidden="true">
        {isSet ? formatDuration(value) : isNotNumber ? '数字を確認' : '未選択'}
      </p>
      <input
        type="range"
        className="duration__slider"
        style={{ '--fill': `${fill}%` } as CSSProperties}
        min={sliderMin}
        max={maxSeconds}
        step={stepSeconds}
        value={sliderValue}
        aria-label={`${label}（スライダー）`}
        aria-valuetext={isSet ? formatDuration(value) : '未選択'}
        aria-describedby={describedByAll}
        onChange={(event) => setFromSlider(Number(event.target.value))}
      />
      <div className="duration__scale" aria-hidden="true">
        <span>{formatDuration(sliderMin)}</span>
        <span>{formatDuration(maxSeconds)}</span>
      </div>
      <div className="duration__fields">
        {units.map((unit) => (
          <label key={unit} className="duration__field" htmlFor={`${id}-${unit}`}>
            <input
              id={`${id}-${unit}`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className="duration__number"
              value={fields[unit] ?? ''}
              placeholder="—"
              aria-label={`${label}の${UNIT_LABELS[unit]}`}
              aria-describedby={describedByAll}
              aria-invalid={invalid || undefined}
              onChange={(event) => handleField(unit, event.target.value)}
            />
            <span aria-hidden="true">{UNIT_LABELS[unit]}</span>
          </label>
        ))}
        {/* 押した後も消さない（フォーカスを失わないため） */}
        {zeroShortcut && (
          <button type="button" className="button button--ghost button--small duration__zero" onClick={() => setFromSlider(0)}>
            0分にする
          </button>
        )}
      </div>
      <p id={errorId} className="duration__error" aria-live="polite">
        {error}
      </p>
    </fieldset>
  )
}
