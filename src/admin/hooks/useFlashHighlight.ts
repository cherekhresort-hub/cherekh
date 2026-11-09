import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HIGHLIGHT_PARAM } from '../../lib/activityNavigation'

/** How long an element stays highlighted once it is on screen. */
export const FLASH_MS = 5_000

const POLL_MS = 150
const POLL_TRIES = 30

const findTargets = (id: string) =>
  document.querySelectorAll<HTMLElement>(`[data-highlight-id="${CSS.escape(id)}"]`)

const inView = (rect: DOMRect) => rect.top < window.innerHeight * 0.75 && rect.bottom > window.innerHeight * 0.15

const scrollToTarget = (id: string): HTMLElement | null => {
  const target = findTargets(id)[0]
  if (!target) return null
  const tall = target.getBoundingClientRect().height > window.innerHeight * 0.6
  target.scrollIntoView({ behavior: 'smooth', block: tall ? 'start' : 'center' })
  return target
}

/** Counts as seen when most of it is visible, or it fills a good part of the viewport. */
const isSeen = (entry: IntersectionObserverEntry) => {
  if (!entry.isIntersecting) return false
  const viewport = entry.rootBounds?.height ?? window.innerHeight
  return entry.intersectionRatio >= 0.6 || entry.intersectionRect.height >= viewport * 0.4
}

type Options = {
  onVisible?: (id: string) => void
  onExpire?: (id: string) => void
}

type StartOptions = {
  /** Highlighted instead when none of the ids are on the page (e.g. the row was since removed). */
  fallback?: string
}

/**
 * Highlights elements tagged `data-highlight-id`. Each one fades FLASH_MS after it
 * actually scrolls into view, so items further down are still marked when reached.
 * Targets may mount late (drawer tabs, async data); they are picked up when they appear.
 */
export const useFlashHighlight = ({ onVisible, onExpire }: Options = {}) => {
  const [active, setActive] = useState<Set<string>>(() => new Set())
  const timers = useRef(new Map<string, number>())
  const scrollPoll = useRef<number | null>(null)
  const callbacks = useRef({ onVisible, onExpire })
  callbacks.current = { onVisible, onExpire }

  const stopScrollPoll = useCallback(() => {
    if (scrollPoll.current) window.clearInterval(scrollPoll.current)
    scrollPoll.current = null
  }, [])

  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current.clear()
  }, [])

  useEffect(
    () => () => {
      clearTimers()
      stopScrollPoll()
    },
    [clearTimers, stopScrollPoll]
  )

  useEffect(() => {
    if (active.size === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.highlightId
          if (!id || !isSeen(entry) || timers.current.has(id)) continue
          callbacks.current.onVisible?.(id)
          timers.current.set(
            id,
            window.setTimeout(() => {
              timers.current.delete(id)
              setActive((prev) => {
                const next = new Set(prev)
                next.delete(id)
                return next
              })
              callbacks.current.onExpire?.(id)
            }, FLASH_MS)
          )
        }
      },
      { threshold: [0, 0.25, 0.6, 1] }
    )
    const marked = new Set<HTMLElement>()
    const attach = () => {
      let missing = false
      active.forEach((id) => {
        const targets = findTargets(id)
        if (targets.length === 0) missing = true
        targets.forEach((el) => {
          if (marked.has(el)) return
          marked.add(el)
          el.dataset.flash = 'on'
          observer.observe(el)
        })
      })
      return missing
    }
    let tries = 0
    let poll: number | undefined
    if (attach()) {
      poll = window.setInterval(() => {
        if (!attach() || ++tries >= POLL_TRIES) window.clearInterval(poll)
      }, POLL_MS)
    }
    return () => {
      window.clearInterval(poll)
      observer.disconnect()
      marked.forEach((el) => delete el.dataset.flash)
    }
  }, [active])

  const scrollWhenReady = useCallback(
    (ids: string[], fallback?: string) => {
      const run = (targets: string[], fallbackId?: string) => {
        stopScrollPoll()
        let tries = 0
        let scrolled: HTMLElement | null = null
        // Opening drawers and animating tabs can swallow a scroll, so retry until it lands.
        const tick = () => {
          if (scrolled?.isConnected && inView(scrolled.getBoundingClientRect())) return true
          if (!scrolled || tries % 4 === 0) {
            for (const id of targets) {
              scrolled = scrollToTarget(id)
              if (scrolled) break
            }
          }
          if (++tries < POLL_TRIES) return false
          if (scrolled) return true
          if (fallbackId) {
            setActive(new Set([fallbackId]))
            run([fallbackId])
          }
          return true
        }
        if (tick()) return
        scrollPoll.current = window.setInterval(() => {
          if (tick()) stopScrollPoll()
        }, POLL_MS)
      }
      run(ids, fallback)
    },
    [stopScrollPoll]
  )

  const start = useCallback(
    (ids: string[], { fallback }: StartOptions = {}) => {
      clearTimers()
      const wanted = ids.filter(Boolean)
      const targets = wanted.length > 0 ? wanted : fallback ? [fallback] : []
      if (targets.length === 0) return
      setActive(new Set(targets))
      scrollWhenReady(targets, wanted.length > 0 ? fallback : undefined)
    },
    [clearTimers, scrollWhenReady]
  )

  /** Re-highlight one target and bring it into view. */
  const flash = useCallback(
    (id: string) => {
      const timer = timers.current.get(id)
      if (timer) window.clearTimeout(timer)
      timers.current.delete(id)
      setActive((prev) => new Set(prev).add(id))
      scrollWhenReady([id])
    },
    [scrollWhenReady]
  )

  const clear = useCallback(() => {
    clearTimers()
    stopScrollPoll()
    setActive(new Set())
  }, [clearTimers, stopScrollPoll])

  return { active, start, flash, clear }
}

/** Highlights the `?highlight=a,b` targets once `ready`, then drops the param from the URL. */
export const useHighlightParam = (ready: boolean) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const highlight = useFlashHighlight()
  const raw = searchParams.get(HIGHLIGHT_PARAM)
  const { start } = highlight

  useEffect(() => {
    if (!ready || !raw) return
    setSearchParams(
      (params) => {
        params.delete(HIGHLIGHT_PARAM)
        return params
      },
      { replace: true }
    )
    start(raw.split(','))
  }, [ready, raw, setSearchParams, start])

  return highlight
}
