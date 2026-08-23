import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface ButtonProps {
  children: ReactNode
  to?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  className?: string
  type?: 'button' | 'submit' | 'reset'
  ariaLabel?: string
  disabled?: boolean
}

const Button = ({
  children,
  to,
  onClick,
  variant = 'primary',
  className = '',
  type = 'button',
  ariaLabel,
  disabled = false,
}: ButtonProps) => {
  const baseClasses =
    'cursor-pointer px-6 py-2.5 sm:px-8 sm:py-3 rounded-full font-medium transition-colors duration-200 inline-block text-center text-sm sm:text-base'

  const variantClasses = {
    primary:
      'bg-resort-cta text-white [@media(hover:hover)]:hover:bg-resort-cta/90 shadow-lg',
    secondary:
      'bg-resort-heading text-white [@media(hover:hover)]:hover:bg-resort-heading/90 shadow-lg',
    outline:
      'border-2 border-resort-heading text-resort-heading [@media(hover:hover)]:hover:bg-resort-heading [@media(hover:hover)]:hover:text-white',
  }

  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`

  if (to) {
    return (
      <Link
        to={to}
        className={classes}
        aria-label={ariaLabel}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault()
            return
          }
          onClick?.()
        }}
      >
        {children}
      </Link>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={classes}
      aria-label={ariaLabel}
      disabled={disabled}
      tabIndex={disabled ? -1 : 0}
    >
      {children}
    </button>
  )
}

export default Button
