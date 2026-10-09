import { useEffect, useRef } from 'react'

/** 画面が表示されたときに見出しへフォーカスを移す（スクリーンリーダーで最初に読まれるように） */
export function useFocusHeading<T extends HTMLElement = HTMLHeadingElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return ref
}
