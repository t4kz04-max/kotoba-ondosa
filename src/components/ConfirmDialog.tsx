import { useEffect, useRef } from 'react'

interface ConfirmDialogProps {
  readonly open: boolean
  readonly title: string
  readonly message: string
  readonly confirmLabel: string
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

/** ネイティブ <dialog> による確認。フォーカス管理と Esc キーはブラウザに任せる */
export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog === null) return
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog ref={ref} className="dialog" aria-labelledby="confirm-title" onCancel={onCancel} onClose={onCancel}>
      <h2 id="confirm-title">{title}</h2>
      <p>{message}</p>
      <div className="button-row">
        <button type="button" className="button button--secondary" onClick={onCancel} autoFocus>
          やめる
        </button>
        <button type="button" className="button button--primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
