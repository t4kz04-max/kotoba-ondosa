import { useEffect, useState } from 'react'

/** 公開演出を済ませた回答（セッションの回答オブジェクトそのもの）。メモリ上だけに置く */
const revealed = new WeakSet<object>()

/** 公開演出の全体の長さ（CSS の最後のアニメーション終了 1.7秒 に余裕を足したもの） */
export const REVEAL_DURATION_MS = 2000

/**
 * 比較結果の公開演出を、同じ回答に対して1回だけ行うためのフック。
 * - 初めて表示するときだけ true を返し、演出が終わったら false に戻す。
 *   （戻さないと、サンプルの切り替えで新しく現れた印にも演出の遅れがかかってしまう）
 * - 具体化画面から「比較に戻る」、サンプルの切り替え、表示範囲の切り替えでは演出をくり返さない。
 * - 「ほかの言葉でくらべる」などで新しく回答した場合は、回答オブジェクトが変わるので再び演出する。
 * 回答の値は保存せず、オブジェクトへの弱い参照だけを持つ（回答が破棄されれば一緒に消える）。
 */
export function useRevealOnce(answer: object): boolean {
  const [animate, setAnimate] = useState(() => !revealed.has(answer))
  useEffect(() => {
    revealed.add(answer)
    if (!animate) return
    const timer = setTimeout(() => setAnimate(false), REVEAL_DURATION_MS)
    return () => clearTimeout(timer)
  }, [answer, animate])
  return animate
}
