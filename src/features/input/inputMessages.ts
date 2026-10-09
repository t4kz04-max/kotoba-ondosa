import { formatDuration } from '../../domain/format'
import type { RangeValidationError } from '../../domain/range'
import type { Seconds } from '../../domain/types'

/** validateDraft のエラーを、入力画面に表示する文に変える */
export function inputErrorMessage(error: RangeValidationError, maxSeconds: Seconds): string {
  switch (error) {
    case 'incomplete':
      return '「早くて」と「遅くて」の両方を入力してください。'
    case 'not-integer':
      return '数字（0〜9）だけで入力してください。'
    case 'negative':
      return '0以上の時間を入力してください。'
    case 'exceeds-max':
      return `このアプリでは${formatDuration(maxSeconds)}までで答えます。${formatDuration(maxSeconds)}以下にしてください。`
    case 'start-after-end':
      return '「早くて」が「遅くて」より後になっています。「早くて」は「遅くて」以下にしてください。'
  }
}
