import { ArrowLeft, CalendarBlank, CaretRight, UserCircle } from '@phosphor-icons/react'
import { Link, useParams } from 'react-router'
import ErrorState from '../../components/ErrorState'
import { PostGrid } from '../../components/PostCard'
import Skeleton from '../../components/ui/Skeleton'
import { usePost, usePosts } from '../../features/posts/queries'
import { formatDate } from '../../utils/format'
import NotFoundPage from '../NotFoundPage'

function Breadcrumb({ title }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
        {[
          { label: 'Trang chủ', to: '/' },
          { label: 'Tin tức', to: '/news' },
        ].map((item) => (
          <li key={item.to} className="flex items-center gap-1">
            <Link to={item.to} className="hover:text-primary hover:underline">
              {item.label}
            </Link>
            <CaretRight aria-hidden className="size-3.5 text-subtle" />
          </li>
        ))}
        <li aria-current="page" className="line-clamp-1 text-fg">
          {title}
        </li>
      </ol>
    </nav>
  )
}

function ArticleSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4" aria-busy="true" aria-label="Đang tải bài viết">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-4 w-56" />
      <Skeleton className="aspect-[1200/630] w-full rounded-card" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  )
}

/** 3 bài mới nhất khác bài đang xem. Không có thì ẩn cả khu. */
function RelatedPosts({ postId }) {
  const { data, isPending, error } = usePosts({ per_page: 3, exclude: postId })

  if (error || (!isPending && !data?.data.length)) return null

  return (
    <section className="mt-16 border-t border-line pt-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold sm:text-2xl">Bài viết khác</h2>
        <Link to="/news" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent-soft hover:underline">
          Xem tất cả tin
        </Link>
      </div>
      <PostGrid posts={data?.data} isPending={isPending} />
    </section>
  )
}

export default function NewsDetailPage() {
  const { slug } = useParams()
  const { data: post, isPending, error, refetch } = usePost(slug)

  // Slug sai hoặc bài chưa đăng / đã gỡ → 404.
  if (error?.response?.status === 404) return <NotFoundPage />

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      {isPending ? (
        <ArticleSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} title="Không tải được bài viết" />
      ) : (
        <>
          <title>{`${post.title} – Toy Store`}</title>
          <article className="mx-auto max-w-3xl">
            <Breadcrumb title={post.title} />

            <header className="space-y-3">
              <h1 className="text-2xl font-bold leading-tight text-balance sm:text-4xl">{post.title}</h1>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarBlank aria-hidden className="size-4" />
                  <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                </span>
                {post.author && (
                  <span className="inline-flex items-center gap-1.5">
                    <UserCircle aria-hidden className="size-4" />
                    {post.author.name}
                  </span>
                )}
              </p>
              {post.excerpt && <p className="text-lg leading-relaxed text-muted">{post.excerpt}</p>}
            </header>

            {post.thumbnail && (
              <img src={post.thumbnail} alt="" className="mt-6 aspect-[1200/630] w-full rounded-card border border-line object-cover" />
            )}

            {/* Nội dung đã được server lọc bằng HTMLPurifier (chỉ còn thẻ soạn thảo an toàn) trước khi lưu. */}
            <div className="post-content mt-8" dangerouslySetInnerHTML={{ __html: post.content }} />

            <Link to="/news" className="mt-10 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent-soft hover:underline">
              <ArrowLeft aria-hidden className="size-4" />
              Về trang Tin tức
            </Link>
          </article>

          <RelatedPosts postId={post.id} />
        </>
      )}
    </div>
  )
}
