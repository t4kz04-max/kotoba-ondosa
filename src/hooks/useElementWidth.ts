import { useEffect, useRef, useState } from 'react'

/** 要素の幅（px）を追跡する。ResizeObserver がない環境では fallback のまま */
export function useElementWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const element = ref.current
    if (element === null) return
    setWidth(element.clientWidth || fallback)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry !== undefined) setWidth(entry.contentRect.width || fallback)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [fallback])

  return [ref, width] as const
}
