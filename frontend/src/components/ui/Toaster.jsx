import { CheckCircle, Info, WarningCircle, X } from '@phosphor-icons/react'
import { useToastStore } from '../../stores/toastStore'
import { cn } from '../../utils/cn'

const TYPES = {
  success: { icon: CheckCircle, className: 'text-success', label: 'Thành công' },
  error: { icon: WarningCircle, className: 'text-danger', label: 'Lỗi' },
  info: { icon: Info, className: 'text-accent-soft', label: 'Thông báo' },
}

/**
 * Vùng hiện toast (gắn 1 lần ở gốc app). aria-live để trình đọc màn hình đọc mà không cướp focus.
 */
export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      // Chừa cột bên phải cho cụm nút nổi (đổi giao diện, hotline) để toast không đè lên.
      className="pointer-events-none fixed bottom-[calc(1rem+var(--fab-offset,0px))] left-4 right-20 z-50 flex flex-col items-center gap-2 sm:left-auto sm:items-end"
    >
      {toasts.map((t) => {
        const { icon: Icon, className, label } = TYPES[t.type] ?? TYPES.info
        return (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-card border border-line bg-raised p-4 shadow-glow"
          >
            <Icon aria-hidden weight="fill" className={cn('mt-0.5 size-5 shrink-0', className)} />
            <p className="flex-1 text-sm text-fg">
              <span className="sr-only">{label}: </span>
              {t.message}
            </p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Đóng thông báo"
              className="-m-2 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-control text-muted hover:text-fg"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
