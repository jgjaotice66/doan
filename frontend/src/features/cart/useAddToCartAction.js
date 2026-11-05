import { useCallback } from 'react'
import { getErrorMessage } from '../../api/client'
import { toast } from '../../stores/toastStore'
import { useRequireLogin } from '../auth/useRequireLogin'
import { useAddToCart } from './queries'

/**
 * Nút "Thêm vào giỏ" dùng chung (trang chi tiết, thẻ sản phẩm):
 * chưa đăng nhập → chuyển /login; thành công/lỗi (vd. vượt tồn kho) → toast.
 *
 *   const { addToCart, isPending } = useAddToCartAction()
 *   addToCart(product, 2)
 */
export function useAddToCartAction() {
  const requireLogin = useRequireLogin()
  const { mutate, isPending, variables } = useAddToCart()

  const addToCart = useCallback(
    (product, quantity = 1) => {
      if (!requireLogin()) return
      mutate(
        { productId: product.id, quantity },
        {
          onSuccess: () => toast.success(`Đã thêm ${quantity} × ${product.name} vào giỏ`),
          onError: (error) => toast.error(getErrorMessage(error, 'Không thêm được vào giỏ, vui lòng thử lại.')),
        },
      )
    },
    [requireLogin, mutate],
  )

  // pendingProductId: biết thẻ nào đang chờ để chỉ hiện vòng xoay ở đúng thẻ đó.
  return { addToCart, isPending, pendingProductId: isPending ? variables?.productId : null }
}
