import type { Seconds } from '../../domain/types'

export type DurationUnit = 'hour' | 'minute' | 'second'

export const UNIT_SECONDS: Record<DurationUnit, number> = { hour: 3600, minute: 60, second: 1 }
export const UNIT_LABELS: Record<DurationUnit, string> = { hour: '時間', minute: '分', second: '秒' }

/**
 * 数値入力に使う単位。1時間を超える範囲は「時間・分」、それ以外は「分・秒」。
 * （12時間を秒単位で入力させないため）
 */
export function unitsFor(maxSeconds: Seconds): readonly DurationUnit[] {
  return maxSeconds > 3600 ? ['hour', 'minute'] : ['minute', 'second']
}

export type FieldTexts = Readonly<Partial<Record<DurationUnit, string>>>

/** 秒を各単位の入力欄の文字列に分ける。null・NaN は空欄 */
export function secondsToFields(value: Seconds | null, units: readonly DurationUnit[]): FieldTexts {
  if (value === null || !Number.isFinite(value)) {
    return Object.fromEntries(units.map((unit) => [unit, '']))
  }
  let rest = Math.max(0, Math.round(value))
  const fields: Partial<Record<DurationUnit, string>> = {}
  for (const unit of units) {
    const amount = Math.floor(rest / UNIT_SECONDS[unit])
    fields[unit] = String(amount)
    rest -= amount * UNIT_SECONDS[unit]
  }
  return fields
}

function normalizeDigits(text: string): string {
  return text.trim().replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
}

/**
 * 入力欄の文字列を秒にする。
 * - すべて空欄 → null（未入力）
 * - 数字以外を含む → NaN（validateDraft が 'not-integer' として扱う）
 * - 空欄の単位は 0 とみなす
 */
export function fieldsToSeconds(fields: FieldTexts, units: readonly DurationUnit[]): Seconds | null {
  const texts = units.map((unit) => normalizeDigits(fields[unit] ?? ''))
  if (texts.every((text) => text === '')) return null
  let total = 0
  for (const [index, text] of texts.entries()) {
    if (text === '') continue
    if (!/^\d+$/.test(text)) return Number.NaN
    total += Number(text) * UNIT_SECONDS[units[index]]
  }
  return total
}
