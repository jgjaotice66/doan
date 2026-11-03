import { cn } from '../utils/cn'
import { formatVND } from '../utils/format'

const SIZES = {
  sm: { final: 'text-base', original: 'text-xs' },
  md: { final: 'text-lg', original: 'text-sm' },
  lg: { final: 'text-3xl', original: 'text-base' },
}

/**
 * Giá bán: nếu đang giảm giá thì hiện giá sale (vàng) + giá gốc gạch ngang.
 */
export default function Price({ price, salePrice, size = 'md', className }) {
  const onSale = salePrice != null && salePrice < price
  const s = SIZES[size]

  return (
    <p className={cn('flex flex-wrap items-baseline gap-x-2 tabular', className)}>
      <span className={cn('font-bold', s.final, onSale ? 'text-primary' : 'text-fg')}>
        {onSale && <span className="sr-only">Giá khuyến mãi: </span>}
        {formatVND(onSale ? salePrice : price)}
      </span>
      {onSale && (
        <del className={cn('text-subtle', s.original)}>
          <span className="sr-only">Giá gốc: </span>
          {formatVND(price)}
        </del>
      )}
    </p>
  )
}
