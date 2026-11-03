import { Minus, Plus } from '@phosphor-icons/react'
import { useId } from 'react'
import { cn } from '../../utils/cn'

/**
 * Ô chọn số lượng −/+ trong khoảng [min, max]; gõ tay cũng bị kẹp vào khoảng này.
 */
export default function QuantityInput({ value, onChange, min = 1, max = 99, disabled = false, label = 'Số lượng', className }) {
  const id = useId()
  const clamp = (n) => Math.min(max, Math.max(min, Number.isFinite(n) ? Math.floor(n) : min))

  const buttonClass =
    'inline-flex size-11 cursor-pointer items-center justify-center text-muted transition-colors hover:bg-raised hover:text-fg disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className={cn('inline-flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      <div className="inline-flex w-fit items-center overflow-hidden rounded-control border border-control bg-surface">
        <button type="button" className={buttonClass} onClick={() => onChange(clamp(value - 1))} disabled={disabled || value <= min} aria-label="Giảm số lượng">
          <Minus aria-hidden className="size-4" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          className="h-11 w-14 border-x border-line bg-transparent text-center text-base font-semibold text-fg tabular focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button type="button" className={buttonClass} onClick={() => onChange(clamp(value + 1))} disabled={disabled || value >= max} aria-label="Tăng số lượng">
          <Plus aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  )
}
