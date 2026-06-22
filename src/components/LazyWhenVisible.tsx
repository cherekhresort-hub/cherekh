import { useEffect, useRef, useState, type ReactNode } from 'react'

type LazyWhenVisibleProps = {
  children: ReactNode
  /** IntersectionObserver rootMargin — load before entering viewport */
  rootMargin?: string
  className?: string
}

/**
 * Renders children only when near the viewport — defers JS chunks and images below the fold.
 */
const LazyWhenVisible = ({
  children,
  rootMargin = '320px 0px',
  className,
}: LazyWhenVisibleProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    if (!('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [rootMargin])

  return <div ref={ref} className={className}>{visible ? children : null}</div>
}

export default LazyWhenVisible
