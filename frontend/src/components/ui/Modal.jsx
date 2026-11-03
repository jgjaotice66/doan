import { X } from '@phosphor-icons/react'
import { useEffect, useId, useRef } from 'react'
import { cn } from '../../utils/cn'

/**
 * Hộp thoại dùng thẻ <dialog> gốc của trình duyệt: tự giữ focus bên trong,
 * phím Esc để đóng, trả focus về nút đã mở khi đóng.
 */
export default function Modal({ open, onClose, title, children, footer, className }) {
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
      // Bấm ra vùng nền tối (chính thẻ dialog) thì đóng.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={cn(
        'm-auto w-[calc(100%-2rem)] max-w-lg rounded-card border border-line bg-surface p-0 text-fg shadow-glow',
        'backdrop:bg-overlay backdrop:backdrop-blur-sm',
        className,
      )}
    >
      {open && (
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-lg font-bold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="-m-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-control text-muted transition-colors hover:bg-raised hover:text-fg"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <div className="text-muted">{children}</div>
          {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}
