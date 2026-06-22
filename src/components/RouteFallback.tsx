/** Lightweight full-page loader shown while lazy routes load. */
export const RouteFallback = () => (
  <div
    className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-stone-500"
    role="status"
    aria-live="polite"
    aria-label="Loading page"
  >
    <div
      className="h-9 w-9 rounded-full border-2 border-forest-200 border-t-forest-700 animate-spin"
      aria-hidden
    />
    <p className="text-sm">Loading…</p>
  </div>
)
