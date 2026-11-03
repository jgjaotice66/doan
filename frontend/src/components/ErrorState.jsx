import { ArrowClockwise, WarningCircle } from '@phosphor-icons/react'
import { getErrorMessage } from '../api/client'
import Button from './ui/Button'

/**
 * Khối báo lỗi tải dữ liệu, kèm nút thử lại.
 */
export default function ErrorState({ error, onRetry, title = 'Không tải được dữ liệu' }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-card border border-danger/30 bg-danger/5 px-4 py-10 text-center">
      <WarningCircle aria-hidden weight="fill" className="size-8 text-danger" />
      <div>
        <p className="font-semibold text-fg">{title}</p>
        {error && <p className="mt-1 text-sm text-muted">{getErrorMessage(error)}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={() => onRetry()}>
          <ArrowClockwise aria-hidden className="size-4" />
          Thử lại
        </Button>
      )}
    </div>
  )
}
