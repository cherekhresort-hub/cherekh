import { cn } from '../../utils/cn'
import { initialsOf } from '../../utils/format'

interface AvatarProps {
  name: string
  src?: string
  size?: 'sm' | 'md' | 'lg'
  color?: string
  className?: string
}

const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' }

export const Avatar = ({ name, src, size = 'md', color, className }: AvatarProps) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover ring-2 ring-white shadow-soft', sizes[size], className)}
      />
    )
  }
  return (
    <span
      style={{ background: color ?? '#1E4D2B' }}
      className={cn(
        'inline-flex items-center justify-center rounded-full text-white font-medium ring-2 ring-white shadow-soft',
        sizes[size],
        className
      )}
    >
      {initialsOf(name)}
    </span>
  )
}
