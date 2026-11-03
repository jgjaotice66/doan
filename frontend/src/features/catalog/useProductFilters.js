import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

export const AGE_GROUPS = [0, 3, 6, 8, 14, 18]

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'best_selling', label: 'Bán chạy' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
]

export const PER_PAGE = 12

const toInt = (value) => (/^\d+$/.test(value ?? '') ? Number(value) : null)

/**
 * Đọc bộ lọc từ URL; giá trị không hợp lệ bị bỏ qua để API không trả 422.
 */
function parse(searchParams) {
  const sort = searchParams.get('sort')
  const minAge = toInt(searchParams.get('min_age'))

  return {
    q: searchParams.get('q')?.trim() ?? '',
    category: searchParams.get('category') ?? '',
    brand: (searchParams.get('brand') ?? '').split(',').filter(Boolean),
    min_age: AGE_GROUPS.includes(minAge) ? minAge : null,
    price_min: toInt(searchParams.get('price_min')),
    price_max: toInt(searchParams.get('price_max')),
    featured: searchParams.get('featured') === '1',
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? sort : 'newest',
    page: Math.max(1, toInt(searchParams.get('page')) ?? 1),
  }
}

/**
 * Chuyển bộ lọc thành query string gọn (bỏ giá trị mặc định/rỗng).
 */
function serialize(filters) {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.category) params.set('category', filters.category)
  if (filters.brand.length) params.set('brand', filters.brand.join(','))
  if (filters.min_age != null) params.set('min_age', String(filters.min_age))
  if (filters.price_min != null) params.set('price_min', String(filters.price_min))
  if (filters.price_max != null) params.set('price_max', String(filters.price_max))
  if (filters.featured) params.set('featured', '1')
  if (filters.sort !== 'newest') params.set('sort', filters.sort)
  if (filters.page > 1) params.set('page', String(filters.page))
  return params
}

/**
 * Bộ lọc trang danh sách sản phẩm, đồng bộ hai chiều với URL.
 * Mỗi lần đổi là một mục lịch sử mới → nút Back quay lại bộ lọc trước; reload giữ nguyên.
 */
export function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parse(searchParams), [searchParams])

  /** Cập nhật một phần bộ lọc; đổi bất kỳ thứ gì ngoài `page` thì về trang 1. */
  const setFilters = useCallback(
    (patch) => {
      const next = { ...filters, ...patch }
      if (!('page' in patch)) next.page = 1
      // Đổi bộ lọc không nhảy lên đầu trang (đổi trang thì ProductListPage tự cuộn).
      setSearchParams(serialize(next), { preventScrollReset: true })
    },
    [filters, setSearchParams],
  )

  /** Xoá mọi bộ lọc, giữ từ khoá tìm kiếm và cách sắp xếp. */
  const clearFilters = useCallback(
    () =>
      setSearchParams(serialize({ ...parse(new URLSearchParams()), q: filters.q, sort: filters.sort }), {
        preventScrollReset: true,
      }),
    [filters.q, filters.sort, setSearchParams],
  )

  const activeCount =
    (filters.category ? 1 : 0) +
    filters.brand.length +
    (filters.min_age != null ? 1 : 0) +
    (filters.price_min != null || filters.price_max != null ? 1 : 0) +
    (filters.featured ? 1 : 0)

  /** Tham số gửi lên API (khớp ProductIndexRequest). */
  const apiParams = useMemo(
    () => ({
      q: filters.q,
      category: filters.category,
      brand: filters.brand.join(','),
      min_age: filters.min_age,
      price_min: filters.price_min,
      price_max: filters.price_max,
      featured: filters.featured ? 1 : null,
      sort: filters.sort,
      page: filters.page,
      per_page: PER_PAGE,
    }),
    [filters],
  )

  return { filters, setFilters, clearFilters, activeCount, apiParams }
}
