import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { catalogApi } from '../../api/catalog'

// Danh mục/thương hiệu/banner ít thay đổi → cache lâu hơn mặc định.
const STATIC_STALE_MS = 5 * 60_000

export const catalogKeys = {
  categories: ['categories'],
  brands: ['brands'],
  banners: ['banners'],
  products: (params) => ['products', params],
  product: (slug) => ['product', slug],
}

export const useCategories = () =>
  useQuery({ queryKey: catalogKeys.categories, queryFn: catalogApi.categories, staleTime: STATIC_STALE_MS })

export const useBrands = () =>
  useQuery({ queryKey: catalogKeys.brands, queryFn: catalogApi.brands, staleTime: STATIC_STALE_MS })

export const useBanners = () =>
  useQuery({ queryKey: catalogKeys.banners, queryFn: catalogApi.banners, staleTime: STATIC_STALE_MS })

/**
 * Danh sách sản phẩm; giữ trang cũ trên màn hình khi đổi bộ lọc/trang để không bị nháy.
 */
export const useProducts = (params) =>
  useQuery({
    queryKey: catalogKeys.products(params),
    queryFn: () => catalogApi.products(params),
    placeholderData: keepPreviousData,
  })

export const useProduct = (slug) =>
  useQuery({ queryKey: catalogKeys.product(slug), queryFn: () => catalogApi.product(slug), enabled: Boolean(slug) })
