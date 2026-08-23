const INTERACTIVE =
  'a[href], button:not(:disabled), [role="button"]:not([aria-disabled="true"]), label[for], summary'

const isOverInteractive = (x: number, y: number): boolean => {
  const el = document.elementFromPoint(x, y)
  const hit = el?.closest(INTERACTIVE)
  return Boolean(hit && !hit.matches('[disabled], [aria-disabled="true"]'))
}

/** Keep :hover-like pointer lock using the last mouse position (works when the mouse is still). */
export const installStickyPointerCursor = (): void => {
  const root = document.documentElement
  let overInteractive = false

  const sync = (x: number, y: number) => {
    const on = isOverInteractive(x, y)
    if (on === overInteractive) return
    overInteractive = on
    root.classList.toggle('is-over-link', on)
  }

  document.addEventListener(
    'mousemove',
    (event) => sync(event.clientX, event.clientY),
    { passive: true }
  )

  document.addEventListener(
    'mouseleave',
    () => {
      overInteractive = false
      root.classList.remove('is-over-link')
    },
    { passive: true }
  )

  window.addEventListener('blur', () => {
    overInteractive = false
    root.classList.remove('is-over-link')
  })
}
