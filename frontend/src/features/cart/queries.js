import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cartApi } from '../../api/cart'
import { useAuthStore } from '../../stores/authStore'

/**
 * Key gắn theo user: đăng xuất rồi đăng nhập tài khoản khác thì không thấy giỏ của người trước.
 */
export const cartKeys = {
  all: ['cart'],
  mine: (userId) => ['cart', userId ?? 'guest'],
}

const useCartKey = () => cartKeys.mine(useAuthStore((s) => s.user?.id))

/**
 * Giỏ của người đang đăng nhập; khách vãng lai thì không gọi API.
 */
export function useCart() {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: useCartKey(),
    queryFn: cartApi.get,
    enabled: Boolean(token),
  })
}

/**
 * API trả về cả giỏ mới sau mỗi thao tác → ghi thẳng vào cache,
 * tổng tiền và badge đổi ngay mà không cần gọi lại GET /cart.
 */
function useCartMutation(mutationFn) {
  const queryClient = useQueryClient()
  const key = useCartKey()
  return useMutation({
    mutationFn,
    onSuccess: (cart) => queryClient.setQueryData(key, cart),
  })
}

export const useAddToCart = () => useCartMutation(cartApi.add)
export const useUpdateCartItem = () => useCartMutation(cartApi.update)
export const useRemoveCartItem = () => useCartMutation(cartApi.remove)
