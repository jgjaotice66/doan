import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { cn } from '../../utils/cn'
import { pageWindow } from '../../utils/pagination'

const itemClass =
  'inline-flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-control px-3 text-sm font-semibold transition-colors tabular disabled:cursor-not-allowed disabled:opacity-40'

export default function Pagination({ page, lastPage, onPageChange, className }) {
  if (!lastPage || lastPage <= 1) return null

  return (
    <nav aria-label="Phân trang" className={cn('flex flex-wrap items-center justify-center gap-1', className)}>
      <button
        type="button"
        className={cn(itemClass, 'text-muted hover:bg-raised hover:text-fg')}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Trang trước"
      >
        <CaretLeft aria-hidden className="size-4" />
      </button>

      {pageWindow(page, lastPage).map((item, i) =>
        item === '…' ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-subtle">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === page ? 'page' : undefined}
            aria-label={`Trang ${item}`}
            className={cn(
              itemClass,
              item === page ? 'bg-primary text-on-primary' : 'text-muted hover:bg-raised hover:text-fg',
            )}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        className={cn(itemClass, 'text-muted hover:bg-raised hover:text-fg')}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= lastPage}
        aria-label="Trang sau"
      >
        <CaretRight aria-hidden className="size-4" />
      </button>
    </nav>
  )
}
