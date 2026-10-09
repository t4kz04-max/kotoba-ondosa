import { APP_SUBTITLE, APP_TITLE } from '../../app/appInfo'
import type { Mode } from '../../domain/types'
import { useFocusHeading } from '../../hooks/useFocusHeading'

export function HomeScreen({ onSelectMode }: { readonly onSelectMode: (mode: Mode) => void }) {
  const headingRef = useFocusHeading()
  return (
    <section className="screen screen--home">
      <h1 ref={headingRef} tabIndex={-1} className="home__title">
        {APP_TITLE}
      </h1>
      <p className="home__subtitle">{APP_SUBTITLE}</p>
      <p className="home__question">あなたの「すぐ行く」は、何分後？</p>
      <p>同じ言葉で思いうかべる時間を、相手とくらべてみよう。正解はありません。</p>
      <div className="button-stack">
        <button type="button" className="button button--primary button--large" onClick={() => onSelectMode('solo')}>
          ひとりで体験する
          <span className="button__sub">架空のサンプルとくらべます</span>
        </button>
        <button type="button" className="button button--primary button--large" onClick={() => onSelectMode('duo')}>
          ふたりで比べる
          <span className="button__sub">1台の端末を交代で使います</span>
        </button>
      </div>
      <p className="note">回答はどこにも保存されません。</p>
    </section>
  )
}
