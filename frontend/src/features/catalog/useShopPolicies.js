import { ArrowsCounterClockwise, QrCode, Truck } from '@phosphor-icons/react'
import { formatVND } from '../../utils/format'
import { useShopInfo } from './queries'

/**
 * Chính sách cửa hàng lấy từ backend (/shop) để luôn khớp cấu hình thật:
 * phí ship (SHIPPING_FEE), số ngày đổi trả (RETURN_DAYS), phương thức thanh toán.
 * Dùng ở trang chi tiết sản phẩm và footer.
 */
export function useShopPolicies() {
  const { data: shop } = useShopInfo()

  return [
    {
      icon: Truck,
      title: 'Giao hàng toàn quốc',
      text: shop ? `Phí cố định ${formatVND(shop.shipping_fee)} mỗi đơn, đóng gói chống sốc` : 'Đóng gói chống sốc',
    },
    {
      icon: ArrowsCounterClockwise,
      title: shop ? `Đổi trả trong ${shop.return_days} ngày` : 'Hỗ trợ đổi trả',
      text: 'Khi sản phẩm lỗi, giao sai hoặc thiếu phụ kiện',
    },
    {
      icon: QrCode,
      title: 'Thanh toán linh hoạt',
      text: 'Tiền mặt khi nhận hàng (COD) hoặc chuyển khoản QR',
    },
  ]
}
