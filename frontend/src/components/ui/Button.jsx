import { SpinnerGap } from '@phosphor-icons/react'
import { forwardRef } from 'react'
import { cn } from '../../utils/cn'

const VARIANTS = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'bg-raised text-fg hover:bg-line',
  outline: 'border border-control text-fg hover:border-primary hover:text-primary',
  ghost: 'text-muted hover:bg-raised hover:text-fg',
  danger: 'bg-danger-strong text-on-danger hover:brightness-110',
}

// Chiều cao md/lg ≥ 44px cho vùng chạm trên điện thoại.
const SIZES = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-11 w-11 justify-center',
}

/**
 * Nút dùng chung. `as={Link}` để render thành link nhưng giữ kiểu nút.
 */
const Button = forwardRef(function Button(
  { as: Component = 'button', variant = 'primary', size = 'md', loading = false, fullWidth = false, className, children, disabled, ...props },
  ref,
) {
  const isButton = Component === 'button'

  return (
    <Component
      ref={ref}
      type={isButton ? (props.type ?? 'button') : undefined}
      disabled={isButton ? disabled || loading : undefined}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 cursor-pointer select-none items-center justify-center rounded-control font-semibold',
        'transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && <SpinnerGap aria-hidden className="size-4 animate-spin" />}
      {children}
    </Component>
  )
})

export default Button
