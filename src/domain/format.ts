import type { SampleAnswer, TimeRange } from './types'

/**
 * 秒を「30秒」「1分30秒」「1時間30分」の形式で表す。
 * 0.5秒単位の値は四捨五入（0.5は切り上げ）し、1時間以上では秒を切り捨てる。
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new RangeError(`Cannot format duration: ${seconds}`)
  }
  const total = Math.round(seconds)
  if (total === 0) return '0分'
  if (total < 60) return `${total}秒`
  if (total < 3600) {
    const minutes = Math.floor(total / 60)
    const rest = total % 60
    return rest === 0 ? `${minutes}分` : `${minutes}分${rest}秒`
  }
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  return minutes === 0 ? `${hours}時間` : `${hours}時間${minutes}分`
}

/** 「5分〜15分」。長さ0の範囲は「5分」 */
export function formatRange(range: TimeRange): string {
  if (range.start === range.end) return formatDuration(range.start)
  return `${formatDuration(range.start)}〜${formatDuration(range.end)}`
}

/** 架空のサンプルの表示名。必ず「（架空）」を付ける */
export function formatSampleLabel(sample: SampleAnswer): string {
  return `${sample.name}（架空）`
}
