import { APP_SUBTITLE, APP_TITLE } from '../../app/appInfo'
import { Icon } from '../../components/Icon'
import type { Mode } from '../../domain/types'
import { useFocusHeading } from '../../hooks/useFocusHeading'

/**
 * 「同じ言葉でも、思い浮かべる範囲がずれる」ことを示す飾りの図。
 * 数値・目盛りは入れない（実在のデータに見えないようにするため）。
 */
function HeroVisual() {
  return (
    <svg className="hero-visual" viewBox="0 0 320 112" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="hero-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="7" fill="var(--chart-b-soft)" />
          <line x1="0" y1="0" x2="0" y2="7" stroke="var(--chart-b)" strokeWidth="3.5" />
        </pattern>
      </defs>
      <text x="16" y="20" className="hero-visual__label hero-visual__label--a">
        Aさんの「すぐ」
      </text>
      <rect x="16" y="28" width="300" height="16" rx="3" className="hero-visual__track" />
      <rect x="16" y="28" width="70" height="16" rx="3" fill="var(--chart-a)" className="hero-visual__bar hero-visual__bar--a" />
      <text x="16" y="70" className="hero-visual__label hero-visual__label--b">
        Bさんの「すぐ」
      </text>
      <rect x="16" y="78" width="300" height="16" rx="3" className="hero-visual__track" />
      <rect x="130" y="78" width="120" height="16" rx="3" fill="url(#hero-hatch)" className="hero-visual__bar hero-visual__bar--b" />
      <line x1="16" x2="304" y1="106" y2="106" className="hero-visual__axis" />
      <path d="M298 102 L304 106 L298 110" className="hero-visual__axis" fill="none" />
    </svg>
  )
}

export function HomeScreen({ onSelectMode }: { readonly onSelectMode: (mode: Mode) => void }) {
  const headingRef = useFocusHeading()
  return (
    <section className="screen screen--home">
      <div className="hero">
        <p className="hero__badge">ことばの感覚をくらべる</p>
        <h1 ref={headingRef} tabIndex={-1} className="hero__title">
          {APP_TITLE}
        </h1>
        <p className="hero__subtitle">{APP_SUBTITLE}</p>
        <HeroVisual />
        <p className="hero__question">
          あなたの<span className="hero__keyword">「すぐ」</span>は何分？
        </p>
        <p className="hero__lead">同じ言葉で思いうかべる時間を、相手とくらべてみよう。正解はありません。</p>
      </div>

      <h2 className="section-label">はじめかたを選ぶ</h2>
      <div className="mode-grid">
        <button
          type="button"
          className="mode-card mode-card--solo"
          onClick={() => onSelectMode('solo')}
        >
          <span className="mode-card__icon">
            <Icon name="user" size={26} />
          </span>
          <span className="mode-card__title">ひとりで体験する</span>
          <span className="mode-card__desc">
            架空のサンプルとくらべます
          </span>
          <span className="mode-card__go" aria-hidden="true">
            <Icon name="arrowRight" size={18} />
          </span>
        </button>
        <button
          type="button"
          className="mode-card mode-card--duo"
          onClick={() => onSelectMode('duo')}
        >
          <span className="mode-card__icon">
            <Icon name="users" size={26} />
          </span>
          <span className="mode-card__title">ふたりで比べる</span>
          <span className="mode-card__desc">
            1台の端末を交代で使います
          </span>
          <span className="mode-card__go" aria-hidden="true">
            <Icon name="arrowRight" size={18} />
          </span>
        </button>
      </div>
      <p className="note note--center">回答はどこにも保存・送信されません。</p>
    </section>
  )
}
