import { Icon } from '../../components/Icon'
import { useFocusHeading } from '../../hooks/useFocusHeading'

interface HandoffScreenProps {
  readonly variant: 'handoff' | 'reveal'
  readonly onContinue: () => void
}

/**
 * 交代画面（HANDOFF）と公開前画面（READY_TO_REVEAL）。
 * 回答のデータは受け取らない（表示しようがない）設計にしている。
 * 公開前画面は、比較結果の公開演出の「待機状態」を兼ねる。
 */
export function HandoffScreen({ variant, onContinue }: HandoffScreenProps) {
  const headingRef = useFocusHeading()
  if (variant === 'handoff') {
    return (
      <section className="screen screen--center">
        <div className="stage-card">
          <span className="stage-card__icon stage-card__icon--b">
            <Icon name="handoff" size={32} />
          </span>
          <p className="stage-card__status">
            <Icon name="check" size={16} />
            Aさんの回答を受け取りました
          </p>
          <h1 ref={headingRef} tabIndex={-1}>
            Aさんの回答をかくしました
          </h1>
          <p>端末をBさんに渡してください。</p>
          <p className="note">Bさんは、Aさんの答えを聞かずに答えてね。</p>
          <button type="button" className="button button--primary button--large button--block" onClick={onContinue}>
            Bさんです。はじめる
          </button>
        </div>
      </section>
    )
  }
  return (
    <section className="screen screen--center">
      <div className="stage-card stage-card--dark">
        <span className="stage-card__pair" aria-hidden="true">
          <span className="stage-card__chip stage-card__chip--a">A</span>
          <span className="stage-card__chip stage-card__chip--b">B</span>
        </span>
        <h1 ref={headingRef} tabIndex={-1}>
          2人の答えがそろいました
        </h1>
        <p>結果はまだかくれています。2人で画面を見られるようにしてから、公開してね。</p>
        <button type="button" className="button button--reveal button--large button--block" onClick={onContinue}>
          <Icon name="eye" size={20} />
          2人の感覚を公開する
        </button>
      </div>
    </section>
  )
}
