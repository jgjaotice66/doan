import { cn } from '../../utils/cn'

/**
 * Khung xám nhấp nháy giữ chỗ khi đang tải (tránh nhảy layout).
 */
export default function Skeleton({ className }) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-shimmer rounded-control bg-[length:200%_100%]',
        'bg-linear-to-r from-raised via-line to-raised',
        className,
      )}
    />
  )
}
