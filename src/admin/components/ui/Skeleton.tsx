import type { HTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

/** Pulsing placeholder block. Prefer page layouts below for full screens. */
export const Skeleton = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('animate-pulse rounded-md bg-stone-200/90', className)}
    aria-hidden
    {...props}
  />
)

type PageSkeletonVariant = 'table' | 'cards' | 'dashboard' | 'board' | 'stats' | 'list' | 'form'

interface PageSkeletonProps {
  variant?: PageSkeletonVariant
  className?: string
  /** How many primary rows/cards to show. */
  count?: number
}

const TableSkeleton = ({ rows }: { rows: number }) => (
  <div className="rounded-2xl border border-stone-100 bg-white overflow-hidden shadow-soft">
    <div className="flex gap-3 px-4 py-3 border-b border-stone-100 bg-cream/40">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-3 flex-1 max-w-[6rem]" />
      ))}
    </div>
    <div className="divide-y divide-stone-50">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex items-center gap-3 px-4 py-3.5">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-3.5 w-[40%]" />
            <Skeleton className="h-3 w-[55%]" />
          </div>
          <Skeleton className="h-3 w-16 hidden sm:block" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  </div>
)

const CardsSkeleton = ({ count }: { count: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-2xl border border-stone-100 bg-white p-5 space-y-3 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-3 w-28 max-w-full" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5 max-w-xs" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    ))}
  </div>
)

const StatsSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-2xl border border-stone-100 bg-white px-4 py-4 space-y-3 shadow-soft">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-3 w-28" />
      </div>
    ))}
  </div>
)

const ListSkeleton = ({ count }: { count: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="rounded-2xl border border-stone-100 bg-white px-4 py-4 flex gap-3 items-start shadow-soft"
      >
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
          <Skeleton className="h-3.5 w-44 max-w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4 max-w-sm" />
        </div>
        <Skeleton className="h-3 w-14 shrink-0" />
      </div>
    ))}
  </div>
)

const BoardSkeleton = () => (
  <div className="-mx-1 px-1 flex gap-4 overflow-hidden lg:mx-0 lg:px-0 lg:grid lg:grid-cols-3">
    {Array.from({ length: 3 }).map((_, col) => (
      <div
        key={col}
        className="min-w-[18rem] lg:min-w-0 rounded-2xl border-2 border-dashed border-stone-200 bg-white/60 p-3 space-y-3"
      >
        <div className="flex items-center justify-between px-2 pb-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        {Array.from({ length: 3 - col }).map((_, i) => (
          <div key={i} className="rounded-xl border border-stone-100 bg-white p-3 space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-40 max-w-full" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        ))}
      </div>
    ))}
  </div>
)

const DashboardSkeleton = () => (
  <div className="space-y-8">
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-stone-100 bg-white p-4 space-y-3 shadow-soft">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-7 w-14" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
    </div>
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, col) => (
          <div key={col} className="rounded-2xl border border-stone-100 bg-white overflow-hidden shadow-soft min-h-[240px]">
            <div className="px-5 pt-4 pb-3 flex items-start justify-between border-b border-stone-50">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="h-7 w-7 rounded-full" />
            </div>
            <div className="px-5 py-3 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5 py-1">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-40 max-w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 rounded-2xl border border-stone-100 bg-white p-4 space-y-3 shadow-soft">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
      <div className="rounded-2xl border border-stone-100 bg-white p-4 space-y-3 shadow-soft">
        <Skeleton className="h-4 w-28" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-28 max-w-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
    <TableSkeleton rows={4} />
  </div>
)

const FormSkeleton = () => (
  <div className="space-y-4 max-w-5xl">
    {Array.from({ length: 2 }).map((_, section) => (
      <div key={section} className="rounded-2xl border border-stone-100 bg-white p-6 space-y-4 shadow-soft">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
)

/**
 * Content-area loading placeholder that mirrors common admin page layouts.
 * Keep the page TopBar mounted; swap only the main body for this.
 */
export const PageSkeleton = ({ variant = 'table', className, count }: PageSkeletonProps) => {
  const rows = count ?? (variant === 'cards' ? 6 : variant === 'list' ? 6 : 8)

  return (
    <div
      className={cn('space-y-4', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading"
    >
      {variant === 'dashboard' && <DashboardSkeleton />}
      {variant === 'table' && <TableSkeleton rows={rows} />}
      {variant === 'cards' && <CardsSkeleton count={rows} />}
      {variant === 'stats' && (
        <>
          <StatsSkeleton count={count ?? 4} />
          <TableSkeleton rows={6} />
        </>
      )}
      {variant === 'list' && <ListSkeleton count={rows} />}
      {variant === 'board' && <BoardSkeleton />}
      {variant === 'form' && <FormSkeleton />}
      <span className="sr-only">Loading…</span>
    </div>
  )
}
