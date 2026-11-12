import { ArrowRight, CaretDown } from '@phosphor-icons/react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useCategories } from '../features/catalog/queries'
import { categoryIcon } from '../utils/categoryIcons'
import { cn } from '../utils/cn'
import Skeleton from './ui/Skeleton'

/**
 * Menu "Danh mục" trên header (máy tính): bấm (hoặc di chuột) để mở bảng danh mục + danh mục con.
 * Đóng khi: Esc (trả focus về nút), bấm ra ngoài, rời chuột, chuyển trang.
 */
export default function CategoryMenu() {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const wrapperRef = useRef(null)
  const buttonRef = useRef(null)
  const openedByHover = useRef(false)
  const { pathname, search } = useLocation()
  const { data: categories, isPending, error } = useCategories()

  // Chuyển trang (bấm 1 danh mục) → đóng menu.
  const [prevUrl, setPrevUrl] = useState(pathname + search)
  if (prevUrl !== pathname + search) {
    setPrevUrl(pathname + search)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    const onPointerDown = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  return (
    <div
      ref={wrapperRef}
      className="relative"
      // Chỉ chuột mới mở/đóng theo di chuột; cảm ứng dùng bấm (tránh mở rồi đóng ngay).
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return
        openedByHover.current = true
        setOpen(true)
      }}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          // Di chuột tới đã mở menu → cú bấm ngay sau đó giữ menu mở, không đảo thành đóng.
          if (openedByHover.current) {
            openedByHover.current = false
            setOpen(true)
            return
          }
          setOpen((o) => !o)
        }}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          'inline-flex min-h-11 cursor-pointer items-center gap-1 text-sm font-medium transition-colors hover:text-primary',
          open ? 'text-primary' : 'text-muted',
        )}
      >
        Danh mục
        <CaretDown aria-hidden weight="bold" className={cn('size-3.5 motion-safe:transition-transform', open && 'rotate-180')} />
      </button>

      {/* pt-2 thay cho margin: giữ vùng di chuột liền mạch từ nút xuống bảng, không bị đóng giữa chừng */}
      <div id={panelId} hidden={!open} className="absolute left-0 top-full z-40 pt-2">
        <div className="w-[min(36rem,calc(100vw-2rem))] animate-toast-in rounded-card border border-line bg-surface p-3 shadow-glow">
          {error ? (
            <p className="p-3 text-sm text-muted">Không tải được danh mục.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-1">
              {isPending
                ? Array.from({ length: 8 }, (_, i) => (
                    <li key={i} className="p-2">
                      <Skeleton className="h-10" />
                    </li>
                  ))
                : categories.map((category) => {
                    const Icon = categoryIcon(category.slug)
                    return (
                      <li key={category.id}>
                        <Link
                          to={`/products?category=${category.slug}`}
                          className="flex min-h-12 items-center gap-3 rounded-control px-3 py-2 transition-colors hover:bg-raised"
                        >
                          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-control bg-raised text-primary">
                            <Icon aria-hidden className="size-5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-fg">{category.name}</span>
                            <span className="block text-xs text-muted tabular">{category.products_count} sản phẩm</span>
                          </span>
                        </Link>
                        {category.children?.length > 0 && (
                          <ul className="mb-1 ml-15 space-y-0.5">
                            {category.children.map((child) => (
                              <li key={child.id}>
                                <Link
                                  to={`/products?category=${child.slug}`}
                                  className="block rounded-control px-2 py-1.5 text-sm text-muted hover:bg-raised hover:text-primary"
                                >
                                  {child.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )
                  })}
            </ul>
          )}
          <Link
            to="/products"
            className="mt-2 flex min-h-11 items-center justify-center gap-1.5 rounded-control border-t border-line pt-2 text-sm font-semibold text-accent-soft hover:text-primary"
          >
            Xem tất cả sản phẩm
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
