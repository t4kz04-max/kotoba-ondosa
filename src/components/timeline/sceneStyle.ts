import type { TimelineVariant } from './layout'

/** 「場面を変えて比べる」の場面の番号ごとの線種（A・B の色とは別系統） */
export const SCENE_VARIANTS: readonly TimelineVariant[] = ['s1', 's2', 's3']

/** 場面の番号を丸数字にする（色以外の区別） */
export function sceneMark(index: number): string {
  return ['①', '②', '③'][index] ?? `${index + 1}.`
}
