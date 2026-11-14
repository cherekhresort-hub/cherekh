import { useEffect, useLayoutEffect, useRef } from 'react'

let scrollLocks = 0
/** Open overlays, innermost last; Escape closes only the top one. */
const openStack: object[] = []

/** Stacked overlays share one body scroll lock, so closing one never unlocks another. */
const lockBodyScroll = (): (() => void) => {
  scrollLocks += 1
  document.body.style.overflow = 'hidden'
  let released = false
  return () => {
    if (released) return
    released = true
    scrollLocks = Math.max(0, scrollLocks - 1)
    if (scrollLocks === 0) document.body.style.overflow = ''
  }
}

/** Longest close animation; a layer still on screen after this is removed from view. */
const EXIT_FALLBACK_MS = 1_000

/**
 * Escape-to-close, body scroll lock, and a closing layer that never blocks the page:
 * clicks pass through as soon as it starts closing, and it is hidden if the exit
 * animation fails to finish.
 */
export const useOverlay = (open: boolean, onClose: () => void) => {
  const layerRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const token = {}
    openStack.push(token)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openStack[openStack.length - 1] === token) onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const release = lockBodyScroll()
    return () => {
      document.removeEventListener('keydown', onKey)
      openStack.splice(openStack.indexOf(token), 1)
      release()
    }
  }, [open])

  useLayoutEffect(() => {
    const layer = layerRef.current
    if (open) {
      if (layer) {
        layer.style.pointerEvents = ''
        layer.style.visibility = ''
      }
      return
    }
    if (!layer) return
    layer.style.pointerEvents = 'none'
    const timer = window.setTimeout(() => {
      if (layer.isConnected) layer.style.visibility = 'hidden'
    }, EXIT_FALLBACK_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  return layerRef
}
