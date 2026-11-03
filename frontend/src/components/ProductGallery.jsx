import { CaretLeft, CaretRight, ImageBroken } from '@phosphor-icons/react'
import { useState } from 'react'
import { cn } from '../utils/cn'

/**
 * Ảnh lớn + dãy thumbnail. Có nút trước/sau và phím ←/→ khi focus vào ảnh lớn.
 */
export default function ProductGallery({ images = [], name }) {
  const [index, setIndex] = useState(0)
  const count = images.length

  if (!count) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-card border border-line bg-raised text-subtle">
        <ImageBroken aria-hidden className="size-16" />
        <span className="sr-only">Chưa có ảnh</span>
      </div>
    )
  }

  const go = (next) => setIndex((next + count) % count)
  const navClass =
    'absolute top-1/2 inline-flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-bg/70 text-fg backdrop-blur transition-colors hover:bg-bg hover:text-primary'

  return (
    <div className="space-y-3">
      <div
        className="relative aspect-square overflow-hidden rounded-card border border-line bg-raised"
        tabIndex={count > 1 ? 0 : undefined}
        aria-label={count > 1 ? `Ảnh ${index + 1} trên ${count}, dùng phím mũi tên để chuyển` : undefined}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') go(index - 1)
          if (e.key === 'ArrowRight') go(index + 1)
        }}
      >
        <img
          key={images[index].id}
          src={images[index].url}
          alt={count > 1 ? `${name} – ảnh ${index + 1}` : name}
          width="800"
          height="800"
          className="size-full object-cover"
        />
        {count > 1 && (
          <>
            <button type="button" onClick={() => go(index - 1)} aria-label="Ảnh trước" className={cn(navClass, 'left-3')}>
              <CaretLeft aria-hidden className="size-5" />
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Ảnh sau" className={cn(navClass, 'right-3')}>
              <CaretRight aria-hidden className="size-5" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="grid grid-cols-5 gap-2">
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Xem ảnh ${i + 1}`}
                aria-current={i === index || undefined}
                className={cn(
                  'block aspect-square w-full cursor-pointer overflow-hidden rounded-control border-2 transition-colors',
                  i === index ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100',
                )}
              >
                <img src={image.url} alt="" loading="lazy" width="160" height="160" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
