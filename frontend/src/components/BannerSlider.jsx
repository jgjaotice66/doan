import { ArrowRight, CaretLeft, CaretRight, Pause, Play } from '@phosphor-icons/react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { cn } from '../utils/cn'
import Skeleton from './ui/Skeleton'

const INTERVAL_MS = 5000

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Link nội bộ ('/products?...') dùng router, link ngoài mở bằng thẻ <a>.
 */
function BannerLink({ href, className, children, ...props }) {
  if (!href) return <div className={className}>{children}</div>
  if (href.startsWith('/')) {
    return (
      <Link to={href} className={className} {...props}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} className={className} target="_blank" rel="noreferrer" {...props}>
      {children}
    </a>
  )
}

/**
 * Slider banner trang chủ: tự chạy 5 giây/ảnh, có nút dừng (WCAG), tạm dừng khi
 * di chuột hoặc focus vào, không tự chạy nếu người dùng bật "giảm chuyển động".
 */
export default function BannerSlider({ banners, isPending }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(prefersReducedMotion)
  const [hovering, setHovering] = useState(false)
  const count = banners?.length ?? 0

  const go = useCallback((next) => setIndex((next + count) % count), [count])

  useEffect(() => {
    if (paused || hovering || count < 2) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS)
    return () => clearInterval(timer)
  }, [paused, hovering, count])

  if (isPending) return <Skeleton className="aspect-[16/7] w-full rounded-card sm:aspect-[16/6]" />
  if (!count) return null

  const controlClass =
    'inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-bg/70 text-fg backdrop-blur transition-colors hover:bg-bg hover:text-primary'

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Chương trình nổi bật"
      className="relative overflow-hidden rounded-card border border-line"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
    >
      <div className="relative aspect-[16/7] sm:aspect-[16/6]">
        {banners.map((banner, i) => (
          <div
            key={banner.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${count}: ${banner.title}`}
            aria-hidden={i !== index}
            inert={i !== index}
            className={cn(
              'absolute inset-0 transition-opacity duration-700 ease-out-soft',
              i === index ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
            <BannerLink href={banner.link} className="group block size-full">
              <img
                src={banner.image}
                alt={banner.title}
                className="size-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
                width="1600"
                height="600"
              />
              {banner.link && (
                // Chỉ là nhãn trong link của banner (không lồng thêm nút) → cho khách biết banner bấm được.
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-3 inline-flex min-h-11 items-center gap-2 rounded-control bg-primary px-4 text-sm font-bold text-on-primary shadow-glow sm:left-6 sm:px-5 sm:text-base',
                    'transition-colors group-hover:bg-primary-hover',
                    count > 1 ? 'bottom-17 sm:bottom-20' : 'bottom-3 sm:bottom-6',
                  )}
                >
                  Khám phá ngay
                  <ArrowRight weight="bold" className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              )}
            </BannerLink>
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3">
          <div className="flex gap-2">
            <button type="button" className={controlClass} onClick={() => go(index - 1)} aria-label="Banner trước">
              <CaretLeft aria-hidden className="size-5" />
            </button>
            <button type="button" className={controlClass} onClick={() => go(index + 1)} aria-label="Banner sau">
              <CaretRight aria-hidden className="size-5" />
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-full bg-bg/70 px-1 backdrop-blur">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Chuyển tới banner ${i + 1}`}
                aria-current={i === index || undefined}
                className="inline-flex size-6 cursor-pointer items-center justify-center"
              >
                <span
                  className={cn('block h-1.5 rounded-full transition-all', i === index ? 'w-5 bg-primary' : 'w-1.5 bg-muted')}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            className={controlClass}
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Tiếp tục tự chuyển banner' : 'Dừng tự chuyển banner'}
          >
            {paused ? <Play aria-hidden weight="fill" className="size-4" /> : <Pause aria-hidden weight="fill" className="size-4" />}
          </button>
        </div>
      )}
    </section>
  )
}
