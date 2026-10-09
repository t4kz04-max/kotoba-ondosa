import { useState } from 'react'
import { APP_TITLE } from '../app/appInfo'
import { ConfirmDialog } from './ConfirmDialog'

interface AppHeaderProps {
  readonly showReset: boolean
  readonly onReset: () => void
}

export function AppHeader({ showReset, onReset }: AppHeaderProps) {
  const [confirming, setConfirming] = useState(false)

  return (
    <header className="app-header">
      <span className="app-header__title">{APP_TITLE}</span>
      {showReset && (
        <button type="button" className="button button--small" onClick={() => setConfirming(true)}>
          最初から
        </button>
      )}
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
