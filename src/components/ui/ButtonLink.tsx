import type { ReactNode } from 'react'
import { withBasePath } from '../../utils/navigation'
import { buttonClass, type ButtonSize, type ButtonVariant } from './buttonStyles'

export function ButtonLink({
  children,
  className = '',
  full = false,
  size = 'md',
  to,
  variant = 'primary',
}: {
  children: ReactNode
  className?: string
  full?: boolean
  size?: ButtonSize
  to: string
  variant?: ButtonVariant
}) {
  return (
    <a className={buttonClass({ className, full, size, variant })} href={withBasePath(to)}>
      {children}
    </a>
  )
}
