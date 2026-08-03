export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger' | 'success' | 'warning'
export type ButtonSize = 'sm' | 'md'

export const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg border text-center font-bold transition disabled:pointer-events-none disabled:opacity-50'

export const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover',
  secondary: 'border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent',
  ghost: 'border-transparent bg-transparent text-accent hover:bg-accent-light',
  dark: 'border-foose-text bg-foose-text text-white',
  danger: 'border-foose-danger bg-foose-danger text-white hover:bg-[#981b1b]',
  success: 'border-foose-success bg-foose-success text-white hover:bg-[#0f6d32]',
  warning: 'border-foose-warning bg-foose-warning text-white hover:bg-[#6f1800]',
}

export const buttonSizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3.5 py-2 text-xs',
  md: 'min-h-11 px-5 py-2.5 text-sm',
}

export function buttonClass({
  className = '',
  full = false,
  size = 'md',
  variant = 'primary',
}: {
  className?: string
  full?: boolean
  size?: ButtonSize
  variant?: ButtonVariant
} = {}) {
  return `${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]} ${full ? 'w-full' : ''} ${className}`
}
