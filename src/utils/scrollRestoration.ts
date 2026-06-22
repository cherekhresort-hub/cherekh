import { isHomePath } from './heroSplash'

/** Prevent the browser from restoring scroll position on reload / bfcache. */
export const disableBrowserScrollRestoration = (): void => {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual'
  }
}

export const scrollToTop = (): void => {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
}

/** On homepage load/reload, always start at the hero — not mid-page. */
export const resetHomepageScroll = (): void => {
  if (isHomePath(window.location.pathname)) {
    scrollToTop()
  }
}
