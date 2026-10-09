import type {
  ComparisonResult,
  RangeDraft,
  RangeRelation,
  Seconds,
  TimeRange,
} from './types'

export type RangeValidationError =
  | 'incomplete'
  | 'not-integer'
  | 'negative'
  | 'exceeds-max'
  | 'start-after-end'

export type ValidationResult =
  | { readonly ok: true; readonly range: TimeRange }
  | { readonly ok: false; readonly errors: readonly RangeValidationError[] }

function collectValueErrors(
  value: number,
  maxSeconds: Seconds,
  errors: Set<RangeValidationError>,
): void {
  if (!Number.isInteger(value)) errors.add('not-integer')
  if (value < 0) errors.add('negative')
  if (value > maxSeconds) errors.add('exceeds-max')
}

/** 範囲を検証する。例外を投げず、該当するエラーをすべて返す */
export function validateRange(range: TimeRange, maxSeconds: Seconds): ValidationResult {
  const errors = new Set<RangeValidationError>()
  collectValueErrors(range.start, maxSeconds, errors)
  collectValueErrors(range.end, maxSeconds, errors)
  if (range.start > range.end) errors.add('start-after-end')
  if (errors.size > 0) return { ok: false, errors: [...errors] }
  return { ok: true, range: { start: range.start, end: range.end } }
}

/** 入力途中の範囲を検証する。未入力の端点があれば 'incomplete' */
export function validateDraft(draft: RangeDraft, maxSeconds: Seconds): ValidationResult {
  if (draft.start === null || draft.end === null) {
    return { ok: false, errors: ['incomplete'] }
  }
  return validateRange({ start: draft.start, end: draft.end }, maxSeconds)
}

/** 共通範囲。共通点がなければ null。1点だけの接触は長さ0の区間 */
export function intersectRanges(a: TimeRange, b: TimeRange): TimeRange | null {
  const lo = Math.max(a.start, b.start)
  const hi = Math.min(a.end, b.end)
  return lo <= hi ? { start: lo, end: hi } : null
}

export function hasIntersection(a: TimeRange, b: TimeRange): boolean {
  return intersectRanges(a, b) !== null
}

export function intersectionLength(a: TimeRange, b: TimeRange): Seconds {
  const intersection = intersectRanges(a, b)
  return intersection === null ? 0 : intersection.end - intersection.start
}

/** 2区間のあいだの空白。共通点があれば 0 */
export function gapBetween(a: TimeRange, b: TimeRange): Seconds {
  return Math.max(0, Math.max(a.start, b.start) - Math.min(a.end, b.end))
}

export function midpoint(range: TimeRange): number {
  return (range.start + range.end) / 2
}

export function midpointDifference(a: TimeRange, b: TimeRange): number {
  return Math.abs(midpoint(a) - midpoint(b))
}

/**
 * 2区間の関係を分類する。上から順に判定し、最初に当てはまったものを返す。
 * 1. identical    a = b
 * 2. a-contains-b b ⊆ a（一致を除く）
 * 3. b-contains-a a ⊆ b（一致・2を除く）
 * 4. overlap      共通範囲の長さ > 0
 * 5. touch        共通点がちょうど1点
 * 6. gap          共通点なし
 */
export function classifyRelation(a: TimeRange, b: TimeRange): RangeRelation {
  if (a.start === b.start && a.end === b.end) return 'identical'
  if (a.start <= b.start && b.end <= a.end) return 'a-contains-b'
  if (b.start <= a.start && a.end <= b.end) return 'b-contains-a'
  const intersection = intersectRanges(a, b)
  if (intersection === null) return 'gap'
  return intersection.start < intersection.end ? 'overlap' : 'touch'
}

/** 検証済みの2区間を比較する。不正な区間はプログラムの誤りとして例外を投げる */
export function compareRanges(
  a: TimeRange,
  b: TimeRange,
  maxSeconds: Seconds,
): ComparisonResult {
  for (const [label, range] of [['A', a], ['B', b]] as const) {
    const result = validateRange(range, maxSeconds)
    if (!result.ok) {
      throw new Error(`Invalid range ${label}: ${result.errors.join(', ')}`)
    }
  }
  const intersection = intersectRanges(a, b)
  const midpointA = midpoint(a)
  const midpointB = midpoint(b)
  return {
    relation: classifyRelation(a, b),
    hasIntersection: intersection !== null,
    intersection,
    intersectionLength: intersection === null ? 0 : intersection.end - intersection.start,
    gapLength: gapBetween(a, b),
    midpointA,
    midpointB,
    midpointDifference: Math.abs(midpointA - midpointB),
    laterMidpoint: midpointA === midpointB ? 'same' : midpointA > midpointB ? 'A' : 'B',
  }
}
