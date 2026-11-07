import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminProductsApi } from '../../api/admin/products'

export const adminProductKeys = {
  all: ['admin', 'products'],
  detail: (id) => ['admin', 'products', 'detail', String(id)],
}

/**
 * Sản phẩm đổi (thông tin / ảnh / ẩn / xoá) → bảng admin + storefront (danh sách, chi tiết, giỏ, yêu thích) tải lại.
 */
export const PRODUCT_RELATED_KEYS = [adminProductKeys.all, ['products'], ['product'], ['cart'], ['wishlist']]

export const useAdminProduct = (id) =>
  useQuery({
    queryKey: adminProductKeys.detail(id),
    queryFn: () => adminProductsApi.get(id),
    enabled: Boolean(id),
    retry: (count, error) => error?.response?.status !== 404 && count < 1,
  })

/**
 * Thêm / xoá / sắp xếp ảnh của sản phẩm đang sửa. Thành công → ghi danh sách ảnh mới vào cache chi tiết ngay.
 */
export function useProductImageMutations(productId) {
  const queryClient = useQueryClient()
  const detailKey = adminProductKeys.detail(productId)

  const setImages = (images) => {
    queryClient.setQueryData(detailKey, (product) => product && { ...product, images, thumbnail: images[0]?.url ?? null })
    PRODUCT_RELATED_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }))
  }

  const upload = useMutation({
    mutationFn: (files) => adminProductsApi.uploadImages(productId, files),
    onSuccess: setImages,
  })

  const reorder = useMutation({
    mutationFn: (ids) => adminProductsApi.reorderImages(productId, ids),
    onSuccess: setImages,
  })

  const remove = useMutation({
    mutationFn: (imageId) => adminProductsApi.deleteImage(imageId),
    onSuccess: (_, imageId) => {
      const product = queryClient.getQueryData(detailKey)
      setImages((product?.images ?? []).filter((image) => image.id !== imageId))
    },
  })

  return { upload, reorder, remove }
}
