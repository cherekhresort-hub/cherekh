/** Lightweight full-page skeleton while lazy routes (or auth) load. */
export const RouteFallback = () => (
  <div
    className="min-h-[50vh] w-full max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-6"
    role="status"
    aria-live="polite"
    aria-busy="true"
    aria-label="Loading page"
  >
    <div className="space-y-3">
      <div className="h-3 w-28 rounded-md bg-stone-200/90 animate-pulse" aria-hidden />
      <div className="h-8 w-56 max-w-full rounded-md bg-stone-200/90 animate-pulse" aria-hidden />
      <div className="h-3 w-72 max-w-full rounded-md bg-stone-200/90 animate-pulse" aria-hidden />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-stone-100 bg-white/80 px-4 py-4 space-y-3 shadow-sm"
          aria-hidden
        >
          <div className="h-3 w-16 rounded-md bg-stone-200/90 animate-pulse" />
          <div className="h-7 w-20 rounded-md bg-stone-200/90 animate-pulse" />
          <div className="h-3 w-24 rounded-md bg-stone-200/90 animate-pulse" />
        </div>
      ))}
    </div>
    <div className="rounded-2xl border border-stone-100 bg-white/80 overflow-hidden shadow-sm" aria-hidden>
      <div className="flex gap-3 px-4 py-3 border-b border-stone-100 bg-stone-50/60">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-3 flex-1 max-w-[5rem] rounded-md bg-stone-200/90 animate-pulse" />
        ))}
      </div>
      <div className="divide-y divide-stone-50">
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="flex items-center gap-3 px-4 py-3.5">
            <div className="h-8 w-8 rounded-full bg-stone-200/90 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="h-3.5 w-[40%] rounded-md bg-stone-200/90 animate-pulse" />
              <div className="h-3 w-[55%] rounded-md bg-stone-200/90 animate-pulse" />
            </div>
            <div className="h-6 w-16 rounded-full bg-stone-200/90 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
    <span className="sr-only">Loading…</span>
  </div>
)
