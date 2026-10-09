import { useState } from 'react'
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
    <section className="screen screen--center">
      <h1 ref={headingRef} tabIndex={-1}>
        ことばが、約束になった。
      </h1>
      <p className="complete__from">「{comparison.scenario.phrase}」は…</p>
      <p className="complete__text">「{text}」</p>

      <ul className="complete__ranges">
        <li>
          {comparison.a.label}：{formatRange(comparison.a.range)}
        </li>
        <li>
          {comparison.b.label}：{formatRange(comparison.b.range)}
        </li>
      </ul>

      {mode === 'duo' ? (
        <p>Aさん・Bさんが、この時間でできることを確認しました。</p>
      ) : (
        <p className="fictional-note">
          今回の相手は架空のサンプルです。本当の相手と使うときは、相手にも確認しよう。
        </p>
      )}

      <button type="button" className="button button--secondary" onClick={copy}>
        この言葉をコピー
      </button>
      <p className="note" aria-live="polite">
        {copyStatus === 'copied' && 'コピーしました。'}
        {copyStatus === 'failed' && 'コピーできませんでした。文字を選んでコピーしてください。'}
      </p>

      <p>曖昧な言葉が悪いわけではありません。大事なときは、具体的に言ってみよう。</p>

      <div className="button-stack">
        <button type="button" className="button button--primary" onClick={onRestartSameMode}>
          ほかの言葉でくらべる
        </button>
        <button type="button" className="button button--secondary" onClick={onReset}>
          最初から
        </button>
      </div>
    </section>
  )
}
