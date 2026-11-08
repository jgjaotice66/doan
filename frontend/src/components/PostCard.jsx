import { CalendarBlank, Fire, Newspaper } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { cn } from '../utils/cn'
import { formatDate } from '../utils/format'
import ErrorState from './ErrorState'
import Badge from './ui/Badge'
import Card from './ui/Card'
import Skeleton from './ui/Skeleton'

/** Ảnh đại diện 1200×630 (tỉ lệ chia sẻ mạng xã hội). */
const COVER = 'aspect-[1200/630]'

/** Bài ghim (tin hot) có nhãn chữ, không chỉ dựa vào màu. */
function HotBadge({ className }) {
  return (
    <Badge variant="primary" className={className}>
      <Fire aria-hidden weight="fill" className="size-3.5" />
      Tin hot
    </Badge>
  )
}

/**
 * Thẻ bài viết: cả thẻ là một link tới /news/:slug.
 * size="lg": thẻ to ở khối nổi bật (ảnh lớn, tiêu đề lớn, ảnh giãn cao bằng 2 thẻ nhỏ bên cạnh).
 */
export default function PostCard({ post, headingLevel: Heading = 'h3', size = 'md' }) {
  const large = size === 'lg'

  return (
    <Card as="article" interactive className="group relative flex w-full flex-col overflow-hidden">
      <div className={cn('relative overflow-hidden bg-raised', COVER, large && 'lg:aspect-auto lg:min-h-80 lg:flex-1')}>
        {post.thumbnail ? (
          <img
            src={post.thumbnail}
            alt=""
            loading={large ? 'eager' : 'lazy'}
            className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-subtle">
            <Newspaper aria-hidden className={large ? 'size-16' : 'size-10'} />
          </div>
        )}
        {post.is_featured && <HotBadge className="absolute left-3 top-3 shadow-glow" />}
      </div>
      <div className={cn('flex flex-col gap-2', large ? 'p-5 sm:p-6' : 'flex-1 p-4')}>
        <p className="flex items-center gap-1.5 text-xs text-subtle">
          <CalendarBlank aria-hidden className="size-3.5" />
          <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
        </p>
        <Heading
          className={cn(
            'line-clamp-2 font-sans font-bold leading-snug text-fg group-hover:text-primary',
            large ? 'text-xl sm:text-2xl lg:text-3xl lg:leading-tight' : 'text-base',
          )}
        >
          {/* after:inset-0 → bấm chỗ nào trên thẻ cũng mở bài */}
          <Link to={`/news/${post.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {post.title}
          </Link>
        </Heading>
        {post.excerpt && (
          <p className={cn('text-muted', large ? 'line-clamp-3 text-base leading-relaxed' : 'line-clamp-3 text-sm leading-relaxed')}>
            {post.excerpt}
          </p>
        )}
      </div>
    </Card>
  )
}

function PostCardSkeleton({ className }) {
  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      <Skeleton className={cn(COVER, 'rounded-none')} />
      <div className="space-y-2 p-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </Card>
  )
}

function EmptyPosts({ children }) {
  return (
    <Card className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <Newspaper aria-hidden className="size-8 text-subtle" />
      <p className="text-muted">{children}</p>
    </Card>
  )
}

/** Lớp lưới khối nổi bật: desktop = thẻ to chiếm 2 cột × 2 hàng bên trái, 2 thẻ nhỏ xếp dọc bên phải. */
const HIGHLIGHT_GRID = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2'
const HERO_CELL = 'sm:col-span-2 lg:row-span-2'

/**
 * Khối nổi bật: posts[0] là bài to (tin hot hoặc mới nhất), các bài sau hiện nhỏ.
 */
export function PostHighlights({ posts, isPending, error, onRetry, empty = 'Chưa có tin nào.', headingLevel = 'h3' }) {
  if (error && !posts?.length) return <ErrorState error={error} onRetry={onRetry} title="Không tải được tin tức" />

  if (isPending) {
    return (
      <div className={HIGHLIGHT_GRID} aria-busy="true" aria-label="Đang tải tin nổi bật">
        <Card className={cn(HERO_CELL, 'overflow-hidden')}>
          <Skeleton className={cn(COVER, 'rounded-none lg:aspect-auto lg:h-80')} />
          <div className="space-y-3 p-6">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </Card>
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    )
  }

  if (!posts?.length) return <EmptyPosts>{empty}</EmptyPosts>

  const [hero, ...others] = posts

  return (
    <ul className={HIGHLIGHT_GRID}>
      <li className={cn('flex', HERO_CELL)}>
        <PostCard post={hero} size="lg" headingLevel={headingLevel} />
      </li>
      {others.map((post) => (
        <li key={post.id} className="flex">
          <PostCard post={post} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  )
}

/**
 * Lưới bài viết với đủ trạng thái: đang tải · lỗi (thử lại) · rỗng · có dữ liệu.
 */
export function PostGrid({ posts, isPending, error, onRetry, skeletonCount = 3, empty = 'Chưa có tin nào.', stale = false, headingLevel }) {
  const gridClass = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'

  if (error && !posts?.length) return <ErrorState error={error} onRetry={onRetry} title="Không tải được tin tức" />

  if (isPending) {
    return (
      <div className={gridClass} aria-busy="true" aria-label="Đang tải tin tức">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!posts?.length) return <EmptyPosts>{empty}</EmptyPosts>

  return (
    <ul className={cn(gridClass, 'transition-opacity', stale && 'opacity-50')} aria-busy={stale || undefined}>
      {posts.map((post) => (
        <li key={post.id} className="flex">
          <PostCard post={post} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  )
}
