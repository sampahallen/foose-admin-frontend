import type { MouseEvent, ReactNode } from 'react'
import { Icon, type IconName } from '../icons/Icon'
import { buttonClass, type ButtonSize, type ButtonVariant } from './buttonStyles'

function Spinner() {
  return <span aria-hidden className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
}

export function Button({
  'aria-label': ariaLabel,
  children,
  className = '',
  disabled = false,
  full = false,
  icon,
  iconRight,
  loading = false,
  loadingLabel,
  onClick,
  size = 'md',
  type = 'button',
  variant = 'primary',
}: {
  'aria-label'?: string
  children: ReactNode
  className?: string
  disabled?: boolean
  full?: boolean
  icon?: IconName
  iconRight?: IconName
  loading?: boolean
  loadingLabel?: ReactNode
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  size?: ButtonSize
  type?: 'button' | 'submit'
  variant?: ButtonVariant
}) {
  return (
    <button
      aria-busy={loading}
      aria-label={ariaLabel}
      className={buttonClass({ className, full, size, variant })}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
    >
      {loading ? <Spinner /> : icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {loading && loadingLabel ? loadingLabel : children}
      {!loading && iconRight && <Icon name={iconRight} size={size === 'sm' ? 16 : 18} />}
    </button>
  )
}
