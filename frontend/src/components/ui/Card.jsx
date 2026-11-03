import { cn } from '../../utils/cn'

/**
 * Khối bề mặt. `interactive` thêm hiệu ứng viền vàng khi hover/focus bên trong.
 */
export default function Card({ as: Component = 'div', interactive = false, className, children, ...props }) {
  return (
    <Component
      className={cn(
        'rounded-card border border-line bg-surface',
        interactive && 'transition-[border-color,box-shadow] duration-200 hover:border-primary/50 hover:shadow-glow focus-within:border-primary/50',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
