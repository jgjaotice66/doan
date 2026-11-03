import { FunnelSimple, X } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import FilterSidebar from '../../components/FilterSidebar'
import ProductGrid from '../../components/ProductGrid'
import Button from '../../components/ui/Button'
import Drawer from '../../components/ui/Drawer'
import Pagination from '../../components/ui/Pagination'
import Skeleton from '../../components/ui/Skeleton'
import { useBrands, useCategories, useProducts } from '../../features/catalog/queries'
import { PER_PAGE, SORT_OPTIONS, useProductFilters } from '../../features/catalog/useProductFilters'
import { formatVND } from '../../utils/format'
import { ageLabel } from '../../utils/product'

/** Gộp cây danh mục thành map slug → danh mục. */
const flattenCategories = (tree = []) =>
  tree.reduce((map, c) => {
    map[c.slug] = c
    Object.assign(map, flattenCategories(c.children))
    return map
  }, {})

function priceLabel(min, max) {
  if (min != null && max != null) return `${formatVND(min)} – ${formatVND(max)}`
  if (min != null) return `Từ ${formatVND(min)}`
  return `Đến ${formatVND(max)}`
}

/**
 * Các bộ lọc đang bật dạng chip, bấm để gỡ từng cái.
 */
function ActiveFilters({ filters, setFilters, clearFilters, categoryMap, brandMap }) {
  const chips = []
  if (filters.q) chips.push({ key: 'q', label: `“${filters.q}”`, remove: { q: '' } })
  if (filters.category) {
    chips.push({ key: 'cat', label: categoryMap[filters.category]?.name ?? filters.category, remove: { category: '' } })
  }
  filters.brand.forEach((slug) =>
    chips.push({ key: `b-${slug}`, label: brandMap[slug]?.name ?? slug, remove: { brand: filters.brand.filter((b) => b !== slug) } }),
  )
  if (filters.min_age != null) chips.push({ key: 'age', label: `Tuổi ${ageLabel(filters.min_age)}`, remove: { min_age: null } })
  if (filters.price_min != null || filters.price_max != null) {
    chips.push({ key: 'price', label: priceLabel(filters.price_min, filters.price_max), remove: { price_min: null, price_max: null } })
  }
  if (filters.featured) chips.push({ key: 'feat', label: 'Nổi bật', remove: { featured: false } })

  if (!chips.length) return null

  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Bộ lọc đang áp dụng">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={() => setFilters(chip.remove)}
            aria-label={`Bỏ lọc ${chip.label}`}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 pl-3 pr-2 text-sm text-fg transition-colors hover:border-primary hover:bg-primary/20"
          >
            {chip.label}
            <X aria-hidden className="size-3.5" />
          </button>
        </li>
      ))}
      {chips.length > 1 && (
        <li>
          <button type="button" onClick={clearFilters} className="h-9 cursor-pointer px-2 text-sm font-semibold text-accent-soft hover:underline">
            Xoá tất cả
          </button>
        </li>
      )}
    </ul>
  )
}

export default function ProductListPage() {
  const { filters, setFilters, clearFilters, activeCount, apiParams } = useProductFilters()
  const categories = useCategories()
  const brands = useBrands()
  const products = useProducts(apiParams)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const categoryMap = useMemo(() => flattenCategories(categories.data), [categories.data])
  const brandMap = useMemo(() => Object.fromEntries((brands.data ?? []).map((b) => [b.slug, b])), [brands.data])

  const meta = products.data?.meta
  const title = filters.q
    ? `Kết quả cho “${filters.q}”`
    : (categoryMap[filters.category]?.name ?? (filters.featured ? 'Sản phẩm nổi bật' : 'Tất cả sản phẩm'))

  // Xoá cả từ khoá khi người dùng chủ động "xoá bộ lọc" ở trạng thái rỗng.
  const resetAll = () => setFilters({ q: '', category: '', brand: [], min_age: null, price_min: null, price_max: null, featured: false })

  const goToPage = (page) => {
    setFilters({ page })
    window.scrollTo({ top: 0 })
  }

  const sidebar = (
    <FilterSidebar
      filters={filters}
      setFilters={setFilters}
      categories={categories.data}
      brands={brands.data}
      isPending={categories.isPending || brands.isPending}
    />
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        <div className="text-sm text-muted tabular" aria-live="polite">
          {meta ? `${meta.total} sản phẩm` : <Skeleton className="h-5 w-24" />}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside aria-label="Bộ lọc sản phẩm" className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-2">{sidebar}</div>
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" className="lg:hidden" onClick={() => setDrawerOpen(true)}>
              <FunnelSimple aria-hidden className="size-5" />
              Bộ lọc{activeCount > 0 && <span className="tabular"> ({activeCount})</span>}
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="sort" className="text-sm text-muted">
                Sắp xếp
              </label>
              <select
                id="sort"
                value={filters.sort}
                onChange={(e) => setFilters({ sort: e.target.value })}
                className="h-11 cursor-pointer rounded-control border border-control bg-surface px-3 text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ActiveFilters
            filters={filters}
            setFilters={setFilters}
            clearFilters={clearFilters}
            categoryMap={categoryMap}
            brandMap={brandMap}
          />

          <ProductGrid
            products={products.data?.data}
            isPending={products.isPending}
            error={products.error}
            onRetry={products.refetch}
            stale={products.isPlaceholderData}
            skeletonCount={PER_PAGE}
            className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
            empty={
              <div className="space-y-3">
                <p className="text-lg font-semibold text-fg">Không tìm thấy sản phẩm</p>
                <p>Thử bỏ bớt bộ lọc hoặc tìm với từ khoá khác.</p>
                <Button variant="outline" size="sm" onClick={resetAll}>
                  Xoá bộ lọc
                </Button>
              </div>
            }
          />

          {meta && <Pagination page={meta.current_page} lastPage={meta.last_page} onPageChange={goToPage} className="pt-4" />}
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Bộ lọc"
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={clearFilters} disabled={!activeCount}>
              Xoá lọc
            </Button>
            <Button fullWidth onClick={() => setDrawerOpen(false)}>
              Xem {meta ? `${meta.total} ` : ''}sản phẩm
            </Button>
          </div>
        }
      >
        {sidebar}
      </Drawer>
    </div>
  )
}
