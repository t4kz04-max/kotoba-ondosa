import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { formatRange } from '../../domain/format'
import type { Mode } from '../../domain/types'
import type { AgreementView, ComparisonView } from '../../domain/views'
import { useFocusHeading } from '../../hooks/useFocusHeading'

interface CompleteScreenProps {
  readonly comparison: ComparisonView
  readonly agreement: AgreementView
  readonly mode: Mode
  readonly onReset: () => void
  readonly onRestartSameMode: () => void
}

type CopyStatus = 'idle' | 'copied' | 'failed'

export function CompleteScreen({ comparison, agreement, mode, onReset, onRestartSameMode }: CompleteScreenProps) {
  const headingRef = useFocusHeading()
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const text = agreement.text ?? ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
  }

  return (
    <section className="screen screen--complete">
      <div className="promise">
        <h1 ref={headingRef} tabIndex={-1} className="promise__title">
          ことばが、約束になった。
        </h1>
        <div className="promise__change">
          <p className="promise__label">曖昧だった言葉</p>
          <p className="promise__from">「{comparison.scenario.phrase}」</p>
          <p className="promise__arrow" aria-hidden="true">
            ↓
          </p>
          <p className="promise__label">{mode === 'duo' ? '2人で具体化した言葉' : 'あなたが具体化した言葉'}</p>
          <p className="promise__text">「{text}」</p>
        </div>
        {mode === 'duo' ? (
          <p className="promise__confirmed">
            <Icon name="check" size={18} />
            Aさん・Bさんが、この時間でできることを確認しました。
          </p>
        ) : (
          <p className="fictional-note">
            今回の相手は架空のサンプルです。この時間でできるか確かめたのは、あなただけです。本当の相手と使うときは、相手にも確認しよう。
          </p>
        )}
        <div className="promise__copy">
          <button type="button" className="button button--secondary" onClick={copy}>
            <Icon name="copy" size={18} />
            この言葉をコピー
          </button>
          <p className="note" aria-live="polite">
            {copyStatus === 'copied' && 'コピーしました。'}
            {copyStatus === 'failed' && 'コピーできませんでした。文字を選んでコピーしてください。'}
          </p>
        </div>
      </div>

      <ul className="complete__ranges" aria-label="2人の範囲">
        <li className="answer-chip answer-chip--a">
          <span className="answer-chip__swatch" aria-hidden="true" />
          <span className="answer-chip__name">{comparison.a.label}</span>
          <span className="answer-chip__range">{formatRange(comparison.a.range)}</span>
        </li>
        <li className="answer-chip answer-chip--b">
          <span className="answer-chip__swatch" aria-hidden="true" />
          <span className="answer-chip__name">{comparison.b.label}</span>
          <span className="answer-chip__range">{formatRange(comparison.b.range)}</span>
        </li>
      </ul>

      <p className="closing">曖昧な言葉が悪いわけではありません。大事なときは、具体的に言ってみよう。</p>

      <div className="button-stack">
        <button type="button" className="button button--primary button--large" onClick={onRestartSameMode}>
          ほかの言葉でくらべる
        </button>
        <button type="button" className="button button--secondary" onClick={onReset}>
          最初から
        </button>
      </div>
    </section>
  )
}
