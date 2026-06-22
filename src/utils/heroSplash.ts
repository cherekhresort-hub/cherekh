/** True only for the marketing homepage — splash is for LCP there only. */
export const isHomePath = (pathname: string): boolean => {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return normalized === '/' || normalized === '/index.html'
}

export const hideHeroSplash = (): void => {
  document.getElementById('hero-splash')?.classList.add('hero-splash--done')
}

/** Hide the static hero splash on every route except the homepage. */
export const dismissHeroSplashForRoute = (pathname: string): void => {
  if (!isHomePath(pathname)) {
    hideHeroSplash()
  }
}
