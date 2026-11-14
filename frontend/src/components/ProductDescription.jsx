import { CaretDown, CaretUp } from '@phosphor-icons/react'
import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../utils/cn'

/** Chiều cao khi thu gọn (px) — khớp max-h-[32rem] bên dưới. */
const COLLAPSED_HEIGHT = 512
/** Chỉ dài hơn chừng này mới thu gọn: tránh nút "Xem thêm" chỉ để mở thêm 2–3 dòng. */
const MIN_HIDDEN = 160

/**
 * Mô tả sản phẩm (HTML từ trình soạn thảo admin, đã được server lọc bằng HTMLPurifier trước khi lưu).
 * Mô tả dài thì thu gọn, mờ dần ở cuối, có nút "Xem thêm" / "Thu gọn".
 * Chiều cao đo lại khi ảnh trong mô tả tải xong (ResizeObserver).
 */
export default function ProductDescription({ html }) {
  const contentId = useId()
  const sectionRef = useRef(null)
  const contentRef = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)

  useEffect(() => {
    const content = contentRef.current
    if (!content) return
    const measure = () => setOverflowing(content.scrollHeight > COLLAPSED_HEIGHT + MIN_HIDDEN)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    // Ảnh tải xong làm nội dung cao lên nhưng khung đang bị giới hạn chiều cao → nghe thêm sự kiện load.
    content.addEventListener('load', measure, true)
    return () => {
      observer.disconnect()
      content.removeEventListener('load', measure, true)
    }
  }, [html])

  const collapsed = overflowing && !expanded

  const toggle = () => {
    if (expanded) {
      // Thu gọn khi đang ở giữa bài dài → đưa người đọc về đầu phần mô tả, không bị "lạc" xuống phần dưới.
      const top = sectionRef.current?.getBoundingClientRect().top ?? 0
      if (top < 0) sectionRef.current.scrollIntoView({ block: 'start' })
    }
    setExpanded(!expanded)
  }

  return (
    <section ref={sectionRef} aria-labelledby={`${contentId}-title`} className="mt-12 scroll-mt-24 border-t border-line pt-8">
      <h2 id={`${contentId}-title`} className="mb-5 text-xl font-bold sm:text-2xl">
        Mô tả sản phẩm
      </h2>

      <div className="relative max-w-4xl">
        <div
          id={contentId}
          ref={contentRef}
          className={cn('post-content', collapsed && 'max-h-[32rem] overflow-hidden')}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {collapsed && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-bg to-transparent" />
        )}
      </div>

      {overflowing && (
        <div className="mt-4 flex max-w-4xl justify-center">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={expanded}
            aria-controls={contentId}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-control px-5 text-sm font-semibold text-fg hover:border-primary hover:text-primary motion-safe:transition-colors"
          >
            {expanded ? 'Thu gọn' : 'Xem thêm'}
            {expanded ? <CaretUp aria-hidden weight="bold" className="size-4" /> : <CaretDown aria-hidden weight="bold" className="size-4" />}
          </button>
        </div>
      )}
    </section>
  )
}
