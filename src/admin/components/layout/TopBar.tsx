import { useState } from 'react'
import { createPortal } from 'react-dom'
import { SearchInput } from '../ui/SearchInput'
import { Avatar } from '../ui/Avatar'
import { useAuth } from '../../../contexts/AuthProvider'
import { ProfileNameModal } from './ProfileNameModal'

interface TopBarProps {
  title?: string
  description?: string
  search?: { value: string; onChange: (v: string) => void; placeholder?: string }
  actions?: React.ReactNode
}

export const TopBar = ({ title, description, search, actions }: TopBarProps) => {
  const { roleLabel, user, displayName: savedName, usesSupabase } = useAuth()
  const displayName = savedName ?? user?.email?.split('@')[0] ?? roleLabel
  const [profileOpen, setProfileOpen] = useState(false)
  const canEditName = usesSupabase && Boolean(user?.email)

  return (
    <header className="sticky top-0 z-30 bg-white lg:bg-cream/85 backdrop-blur border-b border-stone-100">
      <div className="flex items-center justify-between gap-4 px-4 lg:px-8 py-3 lg:py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            {title && (
              <h1 className="font-serif text-xl lg:text-2xl text-forest-700 truncate">{title}</h1>
            )}
            {description && <p className="text-xs lg:text-sm text-stone-500 truncate">{description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          {search && (
            <div className="hidden md:block w-64 lg:w-72">
              <SearchInput
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                onClear={() => search.onChange('')}
                placeholder={search.placeholder ?? 'Search…'}
              />
            </div>
          )}
          {actions}
          {canEditName ? (
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2"
              title={savedName ? `${savedName} · Edit your name` : 'Set your name'}
              aria-label={savedName ? `${savedName}, edit your name` : 'Set your name'}
            >
              <Avatar name={displayName} color="#1E4D2B" size="md" />
            </button>
          ) : (
            <Avatar name={displayName} color="#1E4D2B" size="md" />
          )}
        </div>
      </div>

      {search && (
        <div className="md:hidden px-4 pb-3">
          <SearchInput
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            onClear={() => search.onChange('')}
            placeholder={search.placeholder ?? 'Search…'}
          />
        </div>
      )}

      {profileOpen &&
        createPortal(<ProfileNameModal open onClose={() => setProfileOpen(false)} />, document.body)}
    </header>
  )
}
