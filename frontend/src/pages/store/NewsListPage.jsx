import { useSearchParams } from 'react-router'
import { PostGrid, PostHighlights } from '../../components/PostCard'
import Pagination from '../../components/ui/Pagination'
import { usePostHighlights, usePosts } from '../../features/posts/queries'

const PER_PAGE = 9

export default function NewsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const highlights = usePostHighlights()

  // Lưới bên dưới bỏ các bài đã ở khối nổi bật → mỗi trang luôn đủ 9 bài, không lặp bài.
  // Khối nổi bật lỗi thì vẫn hiện lưới (không loại bài nào).
  const exclude = highlights.data?.map((post) => post.id).join(',') || undefined
  const list = usePosts({ page, per_page: PER_PAGE, exclude }, { enabled: !highlights.isPending })
  const meta = list.data?.meta

  // Trang 1: ẩn khu "Tin khác" khi không còn bài nào ngoài khối nổi bật (hoặc chưa có bài nào —
  // khối nổi bật đã hiện lời nhắn trống). Trang sau luôn hiện lưới.
  const noPostsAtAll = !highlights.isPending && !highlights.error && !highlights.data?.length
  const nothingBeyondHighlights = !list.isPending && !list.error && !list.data?.data.length
  const showMore = page > 1 || !(noPostsAtAll || nothingBeyondHighlights)

  // Trang 1 không ghi lên URL cho gọn; F5 / gửi link vẫn mở đúng trang.
  const goToPage = (next) => {
    setSearchParams(next > 1 ? { page: String(next) } : {})
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <title>{page > 1 ? `Tin tức – trang ${page} – Toy Store` : 'Tin tức – Toy Store'}</title>

      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">Tin tức</h1>
        <p className="text-muted">Hàng mới về, sự kiện và mẹo sưu tầm từ Toy Store.</p>
      </header>

      {page === 1 && (
        <section aria-label="Tin nổi bật" className="mb-10">
          <PostHighlights
            posts={highlights.data}
            isPending={highlights.isPending}
            error={highlights.error}
            onRetry={highlights.refetch}
            headingLevel="h2"
            empty="Chưa có tin nào — quay lại sau nhé!"
          />
        </section>
      )}

      {showMore && (
        <section aria-labelledby={page === 1 ? 'news-more' : undefined}>
          {page === 1 && (
            <h2 id="news-more" className="mb-4 text-xl font-bold sm:text-2xl">
              Tin khác
            </h2>
          )}
          <PostGrid
            posts={list.data?.data}
            isPending={list.isPending}
            error={list.error}
            onRetry={list.refetch}
            skeletonCount={PER_PAGE}
            stale={list.isPlaceholderData}
            headingLevel={page === 1 ? 'h3' : 'h2'}
            empty="Trang này không có bài nào."
          />
        </section>
      )}

      {meta && <Pagination page={meta.current_page} lastPage={meta.last_page} onPageChange={goToPage} className="pt-8" />}
    </div>
  )
}
