import { useId, useState } from 'react'
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
  /** null は未入力。NaN は数字以外が入力された状態 */
  readonly value: Seconds | null
  readonly onChange: (value: Seconds | null) => void
  readonly maxSeconds: Seconds
  readonly sliderMin: Seconds
  /** スライダーの刻み（大まかな調整用） */
  readonly stepSeconds: Seconds
  readonly describedBy?: string
}

/**
 * 時間の入力。スライダーで大まかに、数値入力で正確に調整する。
 * 初期状態（value = null）は未入力として表示し、スライダーの位置を回答とみなさない。
 */
export function DurationInput({
  label,
  value,
  onChange,
  maxSeconds,
  sliderMin,
  stepSeconds,
  describedBy,
}: DurationInputProps) {
  const id = useId()
  const units = unitsFor(maxSeconds)
  const [fields, setFields] = useState<FieldTexts>(() => secondsToFields(value, units))
  const isSet = value !== null && Number.isFinite(value)

  const handleSlider = (seconds: Seconds) => {
    setFields(secondsToFields(seconds, units))
    onChange(seconds)
  }

  const handleField = (unit: DurationUnit, text: string) => {
    const next = { ...fields, [unit]: text }
    setFields(next)
    onChange(fieldsToSeconds(next, units))
  }

  const sliderValue = isSet ? Math.min(Math.max(value, sliderMin), maxSeconds) : sliderMin

  return (
    <fieldset className={isSet ? 'duration' : 'duration duration--unset'}>
      <legend className="duration__legend">
        {label}
        <span className="duration__value" aria-hidden="true">
          {isSet ? formatDuration(value) : '未選択'}
        </span>
      </legend>
      <input
        type="range"
        className="duration__slider"
        min={sliderMin}
        max={maxSeconds}
        step={stepSeconds}
        value={sliderValue}
        aria-label={`${label}（スライダー）`}
        aria-valuetext={isSet ? formatDuration(value) : '未選択'}
        aria-describedby={describedBy}
        onChange={(event) => handleSlider(Number(event.target.value))}
      />
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
              aria-label={`${label}の${UNIT_LABELS[unit]}`}
              aria-describedby={describedBy}
              onChange={(event) => handleField(unit, event.target.value)}
            />
            <span aria-hidden="true">{UNIT_LABELS[unit]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
