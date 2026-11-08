import {
  ArrowRight,
  ArrowsCounterClockwise,
  Car,
  Cube,
  DiceFive,
  MaskHappy,
  Robot,
  ShieldCheck,
  Smiley,
  Sparkle,
  Tag,
  Truck,
  Wrench,
} from '@phosphor-icons/react'
import { Link } from 'react-router'
import BannerSlider from '../../components/BannerSlider'
import ErrorState from '../../components/ErrorState'
import { PostHighlights } from '../../components/PostCard'
import ProductGrid from '../../components/ProductGrid'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { useBanners, useBrands, useCategories, useProducts } from '../../features/catalog/queries'
import { usePostHighlights } from '../../features/posts/queries'

// Danh mục chưa có ảnh → dùng icon theo slug (slug lạ dùng icon Tag).
const CATEGORY_ICONS = {
  figure: MaskHappy,
  gundam: Robot,
  lego: Cube,
  'mo-hinh-xe': Car,
  'funko-pop': Smiley,
  'anime-figure': Sparkle,
  'board-game': DiceFive,
  'phu-kien': Wrench,
}

const PERKS = [
  { icon: ShieldCheck, title: 'Hàng chính hãng', text: 'Nhập trực tiếp từ hãng' },
  { icon: Truck, title: 'Giao toàn quốc', text: 'Đóng gói chống sốc' },
  { icon: ArrowsCounterClockwise, title: 'Đổi trả 7 ngày', text: 'Nếu lỗi từ nhà sản xuất' },
]

const HOME_GRID = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'

function SectionHeader({ title, to, linkLabel = 'Xem tất cả' }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
      {to && (
        <Link
          to={to}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-accent-soft hover:underline"
        >
          {linkLabel}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      )}
    </div>
  )
}

function CategoryGrid() {
  const { data: categories, isPending, error, refetch } = useCategories()

  if (error) return <ErrorState error={error} onRetry={refetch} />

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {isPending
        ? Array.from({ length: 8 }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-24 rounded-card" />
            </li>
          ))
        : categories.map((category) => {
            const Icon = CATEGORY_ICONS[category.slug] ?? Tag
            return (
              <li key={category.id} className="flex">
                <Card
                  as={Link}
                  to={`/products?category=${category.slug}`}
                  interactive
                  className="group flex w-full items-center gap-3 p-4"
                >
                  <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-control bg-raised text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
                    <Icon aria-hidden className="size-6" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-fg">{category.name}</span>
                    <span className="block text-sm text-muted tabular">{category.products_count} sản phẩm</span>
                  </span>
                </Card>
              </li>
            )
          })}
    </ul>
  )
}

function ProductSection({ title, params, to }) {
  const { data, isPending, error, refetch } = useProducts(params)

  return (
    <section>
      <SectionHeader title={title} to={to} />
      <ProductGrid
        products={data?.data}
        isPending={isPending}
        error={error}
        onRetry={refetch}
        skeletonCount={params.per_page}
        className={HOME_GRID}
      />
    </section>
  )
}

function BrandStrip() {
  const { data: brands, isPending, error } = useBrands()

  // Dải thương hiệu chỉ là phụ: lỗi thì ẩn luôn, không chiếm chỗ trang chủ.
  if (error) return null

  return (
    <ul className="flex flex-wrap gap-2">
      {isPending
        ? Array.from({ length: 8 }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-11 w-28 rounded-full" />
            </li>
          ))
        : brands.map((brand) => (
            <li key={brand.id}>
              <Link
                to={`/products?brand=${brand.slug}`}
                className="inline-flex h-11 items-center rounded-full border border-line bg-surface px-5 font-display text-sm font-semibold uppercase tracking-wider text-muted transition-colors hover:border-primary hover:text-primary"
              >
                {brand.logo ? <img src={brand.logo} alt={brand.name} className="h-6 w-auto" /> : brand.name}
              </Link>
            </li>
          ))}
    </ul>
  )
}

/** Khối tin nổi bật: tin hot (hoặc mới nhất) hiện to + 2 tin mới. Chưa có bài → lời nhắn. */
function LatestNews() {
  const { data, isPending, error, refetch } = usePostHighlights()

  return (
    <section>
      <SectionHeader title="Tin mới" to="/news" />
      <PostHighlights
        posts={data?.data}
        isPending={isPending}
        error={error}
        onRetry={refetch}
        empty="Tin tức về hàng mới, sự kiện và mẹo sưu tầm sẽ xuất hiện ở đây."
      />
    </section>
  )
}

export default function HomePage() {
  const banners = useBanners()

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-6 sm:space-y-16 sm:py-8">
      <h1 className="sr-only">Toy Store – Đồ chơi sưu tầm chính hãng</h1>

      <div className="space-y-4">
        {banners.error ? null : <BannerSlider banners={banners.data} isPending={banners.isPending} />}

        <ul className="grid gap-3 sm:grid-cols-3">
          {PERKS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3">
              <Icon aria-hidden className="size-7 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-fg">{title}</p>
                <p className="text-sm text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <section>
        <SectionHeader title="Danh mục" to="/products" />
        <CategoryGrid />
      </section>

      <ProductSection title="Sản phẩm nổi bật" params={{ featured: 1, per_page: 8 }} to="/products?featured=1" />

      <ProductSection title="Hàng mới về" params={{ sort: 'newest', per_page: 8 }} to="/products?sort=newest" />

      <section>
        <SectionHeader title="Thương hiệu" />
        <BrandStrip />
      </section>

      <LatestNews />
    </div>
  )
}
