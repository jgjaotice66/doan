import { Warning, XCircle } from '@phosphor-icons/react'
import { Flex, Tag, Typography } from 'antd'

const iconStyle = { verticalAlign: -2, marginInlineEnd: 4 }

/**
 * Tồn kho của một sản phẩm kèm nhãn cảnh báo (dùng ở trang Sản phẩm và Kho):
 * tồn 0 → "Hết hàng" (đỏ); tồn ≤ ngưỡng → số tồn + "Sắp hết" (cam). Luôn có chữ, không chỉ dựa vào màu.
 */
export default function StockStatus({ product, large = false }) {
  if (product.stock === 0) {
    return (
      <Tag color="red" style={{ marginInlineEnd: 0 }}>
        <XCircle aria-hidden weight="fill" size={13} style={iconStyle} />
        Hết hàng
      </Tag>
    )
  }

  return (
    <Flex gap={6} align="center" justify="flex-end" wrap>
      <Typography.Text strong style={large ? { fontSize: 16 } : undefined} className="tabular-nums">
        {product.stock}
      </Typography.Text>
      {product.low_stock && (
        <Tag color="orange" style={{ marginInlineEnd: 0 }}>
          <Warning aria-hidden weight="fill" size={13} style={iconStyle} />
          Sắp hết
        </Tag>
      )}
    </Flex>
  )
}
