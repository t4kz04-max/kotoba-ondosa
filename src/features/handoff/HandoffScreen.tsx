import { useFocusHeading } from '../../hooks/useFocusHeading'

interface HandoffScreenProps {
  readonly variant: 'handoff' | 'reveal'
  readonly onContinue: () => void
}

/**
 * 交代画面（HANDOFF）と公開前画面（READY_TO_REVEAL）。
 * 回答のデータは受け取らない（表示しようがない）設計にしている。
 */
export function HandoffScreen({ variant, onContinue }: HandoffScreenProps) {
  const headingRef = useFocusHeading()
  if (variant === 'handoff') {
    return (
      <section className="screen screen--center">
        <h1 ref={headingRef} tabIndex={-1}>
          Aさんの回答をかくしました
        </h1>
        <p>端末をBさんに渡してください。</p>
        <p>Bさんは、Aさんの答えを聞かずに答えてね。</p>
        <button type="button" className="button button--primary button--large" onClick={onContinue}>
          Bさんです。はじめる
        </button>
      </section>
    )
  }
  return (
    <section className="screen screen--center">
      <h1 ref={headingRef} tabIndex={-1}>
        2人とも答えました
      </h1>
      <p>2人で画面を見てね。準備ができたら、結果を開きます。</p>
      <button type="button" className="button button--primary button--large" onClick={onContinue}>
        2人でくらべる
      </button>
    </section>
  )
}
