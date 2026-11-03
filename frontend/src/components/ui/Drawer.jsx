import { X } from '@phosphor-icons/react'
import { useEffect, useId, useRef } from 'react'
import { cn } from '../../utils/cn'

/**
 * Ngăn kéo trượt từ cạnh trái (dùng cho bộ lọc trên điện thoại).
 * Dựa trên <dialog> như Modal: giữ focus bên trong, Esc để đóng, bấm nền tối để đóng.
 */
export default function Drawer({ open, onClose, title, children, footer, className }) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={cn(
        'fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(22rem,calc(100%-3rem))] max-w-none border-r border-line bg-surface p-0 text-fg',
        'backdrop:bg-overlay backdrop:backdrop-blur-sm',
        className,
      )}
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <h2 id={titleId} className="text-lg font-bold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-control text-muted hover:bg-raised hover:text-fg"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
          {footer && <div className="border-t border-line p-4">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}
