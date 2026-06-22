import { motion } from 'framer-motion'

interface CountBadgeProps {
  count: number
  className?: string
}

const CountBadge = ({ count, className = '' }: CountBadgeProps) => {
  const display = count > 99 ? '99+' : String(count)

  return (
    <motion.span
      key={count}
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 520, damping: 22 }}
      className={`pointer-events-none absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#e41e3f] px-1 text-[10px] font-bold tabular-nums leading-none text-white shadow-[0_2px_6px_rgba(228,30,63,0.45)] ring-2 ring-white ${className}`}
      aria-hidden="true"
    >
      {display}
    </motion.span>
  )
}

export default CountBadge
