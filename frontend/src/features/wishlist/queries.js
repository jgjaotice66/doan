import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { getErrorMessage } from '../../api/client'
import { wishlistApi } from '../../api/wishlist'
import { useAuthStore } from '../../stores/authStore'
import { toast } from '../../stores/toastStore'
import { useRequireLogin } from '../auth/useRequireLogin'

export const wishlistKeys = {
  all: ['wishlist'],
  mine: (userId) => ['wishlist', userId ?? 'guest'],
}

const TOGGLE_KEY = ['wishlist', 'toggle']

const useWishlistKey = () => wishlistKeys.mine(useAuthStore((s) => s.user?.id))

/**
 * Danh sách yêu thích — nguồn dữ liệu duy nhất cho mọi nút tim (thẻ sản phẩm, trang chi tiết, trang yêu thích).
 * Chỉ gọi khi đã đăng nhập.
 */
export function useWishlist() {
  const token = useAuthStore((s) => s.token)
  return useQuery({ queryKey: useWishlistKey(), queryFn: wishlistApi.list, enabled: Boolean(token) })
}

/**
 * Bấm tim = đổi ngay trong cache (optimistic), lỗi thì trả lại như cũ.
 * Bấm liên tục nhiều tim: chỉ tải lại danh sách thật khi request cuối cùng xong.
 */
function useToggleWishlist() {
  const queryClient = useQueryClient()
  const key = useWishlistKey()

  return useMutation({
    mutationKey: TOGGLE_KEY,
    mutationFn: ({ product, liked }) => (liked ? wishlistApi.remove(product.id) : wishlistApi.add(product.id)),
    onMutate: async ({ product, liked }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData(key)
      queryClient.setQueryData(key, (list = []) =>
        liked ? list.filter((p) => p.id !== product.id) : [product, ...list.filter((p) => p.id !== product.id)],
      )
      return { previous }
    },
    onError: (error, { liked }, context) => {
      queryClient.setQueryData(key, context?.previous)
      toast.error(getErrorMessage(error, liked ? 'Không bỏ thích được, vui lòng thử lại.' : 'Không thêm được vào yêu thích.'))
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: TOGGLE_KEY }) === 1) {
        queryClient.invalidateQueries({ queryKey: key })
      }
    },
  })
}

/**
 * Dùng cho nút tim ở mọi nơi:
 *   const { isWishlisted, toggleWishlist } = useWishlistAction()
 *   <Heart filled={isWishlisted(product.id)} onClick={() => toggleWishlist(product)} />
 * Chưa đăng nhập → chuyển sang /login.
 */
export function useWishlistAction() {
  const requireLogin = useRequireLogin()
  const { data } = useWishlist()
  const { mutate } = useToggleWishlist()

  const ids = useMemo(() => new Set((data ?? []).map((p) => p.id)), [data])
  const loaded = data !== undefined

  const isWishlisted = useCallback((id, fallback = false) => (loaded ? ids.has(id) : fallback), [ids, loaded])

  const toggleWishlist = useCallback(
    (product) => {
      if (!requireLogin()) return
      // Danh sách chưa tải xong → tin vào is_wishlisted của trang chi tiết (nếu có).
      mutate({ product, liked: loaded ? ids.has(product.id) : Boolean(product.is_wishlisted) })
    },
    [requireLogin, mutate, ids, loaded],
  )

  return { isWishlisted, toggleWishlist }
}
