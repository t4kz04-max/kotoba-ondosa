import { useState } from 'react'
import { APP_TITLE } from '../app/appInfo'
import { ConfirmDialog } from './ConfirmDialog'
import { Icon } from './Icon'

interface AppHeaderProps {
  readonly showReset: boolean
  readonly onReset: () => void
}

export function AppHeader({ showReset, onReset }: AppHeaderProps) {
  const [confirming, setConfirming] = useState(false)

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <span className="brand">
          <span className="brand__mark" aria-hidden="true">
            温
          </span>
          <span className="brand__title">{APP_TITLE}</span>
        </span>
        {showReset && (
          <button type="button" className="button button--ghost button--small" onClick={() => setConfirming(true)}>
            <Icon name="refresh" size={16} />
            最初から
          </button>
        )}
      </div>
      <ConfirmDialog
        open={confirming}
        title="最初からやり直しますか？"
        message="入力した内容は消えます。"
        confirmLabel="最初からやり直す"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          onReset()
        }}
      />
    </header>
  )
}
