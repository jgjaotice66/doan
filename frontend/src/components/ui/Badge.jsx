import { cn } from '../../utils/cn'

const VARIANTS = {
  neutral: 'bg-raised text-muted',
  primary: 'bg-primary text-on-primary',
  accent: 'bg-accent/15 text-accent-soft ring-1 ring-inset ring-accent/40',
  success: 'bg-success/15 text-success ring-1 ring-inset ring-success/40',
  warning: 'bg-warning/15 text-warning ring-1 ring-inset ring-warning/40',
  danger: 'bg-danger/15 text-danger ring-1 ring-inset ring-danger/40',
}

/**
 * Nhãn nhỏ. Luôn có chữ, không chỉ dựa vào màu để truyền nghĩa.
 */
export default function Badge({ variant = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
