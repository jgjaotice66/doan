import { ClockCounterClockwise, PlusCircle, SlidersHorizontal, Warning } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Avatar, Button, DatePicker, Flex, Space, Tabs, Tag, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { adminInventoryApi } from '../../api/admin/inventory'
import AdminTable from '../../components/admin/AdminTable'
import StockAdjustModal from '../../components/admin/StockAdjustModal'
import {
  inventoryKeys,
  MOVEMENT_SORT_OPTIONS,
  STOCK_REASON_COLORS,
  STOCK_REASON_OPTIONS,
  STOCK_SORT_OPTIONS,
} from '../../features/admin/inventory'
import { useAdminProduct } from '../../features/admin/products'
import { useTableParams } from '../../features/admin/useTableParams'
import { formatDateTime } from '../../utils/format'

const DATE_PARAM = 'YYYY-MM-DD'

/** Thẻ cảnh báo đầu trang: bấm vào là lọc ngay các món sắp hết. */
function LowStockAlert() {
  const { setParams } = useTableParams()
  const { data: summary } = useQuery({
    queryKey: inventoryKeys.summary,
    queryFn: () => adminInventoryApi.list({ per_page: 1 }).then((res) => res.summary),
  })

  if (!summary || summary.low_stock === 0) return null

  return (
    <Alert
      type="error"
      showIcon
      icon={<Warning size={20} weight="fill" />}
      title={`${summary.low_stock} sản phẩm sắp hết hàng (tồn ≤ ${summary.threshold})${summary.out_of_stock ? `, trong đó ${summary.out_of_stock} đã hết` : ''}`}
      action={
        <Button size="small" onClick={() => setParams({ low_stock: '1' })}>
          Xem danh sách
        </Button>
      }
      style={{ marginBottom: 16 }}
    />
  )
}

function StockCell({ product }) {
  if (product.stock === 0) return <Tag color="red">Hết hàng</Tag>
  return (
    <Typography.Text strong style={{ fontSize: 16 }} type={product.low_stock ? 'danger' : undefined}>
      {product.stock}
      {product.low_stock && <Typography.Text type="danger"> · sắp hết</Typography.Text>}
    </Typography.Text>
  )
}

function StockTab({ onShowHistory }) {
  const [adjusting, setAdjusting] = useState(null) // { product, type }

  const columns = [
    {
      title: 'Sản phẩm',
      dataIndex: 'name',
      render: (name, product) => (
        <Flex align="center" gap={12} style={{ maxWidth: 380 }}>
          <Avatar shape="square" size={40} src={product.thumbnail} alt="">
            {name.charAt(0)}
          </Avatar>
          <Flex vertical gap={0} style={{ minWidth: 0 }}>
            <Link to={`/admin/products/${product.id}`}>
              <Typography.Text strong ellipsis={{ tooltip: name }}>
                {name}
              </Typography.Text>
            </Link>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {product.sku}
              {product.status.value === 'hidden' && ' · đang ẩn'}
            </Typography.Text>
          </Flex>
        </Flex>
      ),
    },
    { title: 'Danh mục', key: 'category', render: (_, product) => product.category?.name },
    { title: 'Tồn kho', dataIndex: 'stock', align: 'right', render: (_, product) => <StockCell product={product} /> },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      fixed: 'right',
      render: (_, product) => (
        <Space size={4}>
          <Button size="small" type="primary" icon={<PlusCircle size={16} />} onClick={() => setAdjusting({ product, type: 'import' })}>
            Nhập hàng
          </Button>
          <Button size="small" icon={<SlidersHorizontal size={16} />} onClick={() => setAdjusting({ product, type: 'adjust' })}>
            Điều chỉnh
          </Button>
          <Tooltip title="Lịch sử kho của sản phẩm này">
            <Button
              size="small"
              type="text"
              icon={<ClockCounterClockwise size={18} />}
              aria-label={`Lịch sử kho của ${product.name}`}
              onClick={() => onShowHistory(product.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  return (
    <>
      <LowStockAlert />
      <AdminTable
        queryKey={inventoryKeys.stock}
        fetchFn={adminInventoryApi.list}
        columns={columns}
        searchPlaceholder="Tìm theo tên hoặc SKU…"
        filters={[
          { name: 'low_stock', placeholder: 'Tồn kho', options: [{ value: '1', label: 'Sắp hết hàng' }], width: 160 },
          { name: 'sort', placeholder: 'Sắp xếp: Tồn ít nhất trước', options: STOCK_SORT_OPTIONS, width: 230 },
        ]}
      />
      {adjusting && <StockAdjustModal product={adjusting.product} type={adjusting.type} onClose={() => setAdjusting(null)} />}
    </>
  )
}

/** Đang lọc theo 1 sản phẩm (từ nút "Lịch sử") → Tag có tên, bấm × để bỏ lọc. */
function ProductFilterTag() {
  const { params, setParams } = useTableParams()
  const { data: product } = useAdminProduct(params.product)
  if (!params.product) return null

  return (
    <Tag closable onClose={() => setParams({ product: null })} style={{ alignSelf: 'center', padding: '4px 8px' }}>
      Sản phẩm: {product?.name ?? `#${params.product}`}
    </Tag>
  )
}

function DateRangeFilter() {
  const { params, setParams } = useTableParams()
  const value = params.from && params.to ? [dayjs(params.from), dayjs(params.to)] : null

  return (
    <DatePicker.RangePicker
      value={value}
      format="DD/MM/YYYY"
      placeholder={['Từ ngày', 'Đến ngày']}
      aria-label="Khoảng ngày"
      disabledDate={(day) => day.isAfter(dayjs(), 'day')}
      onChange={(range) => setParams({ from: range?.[0]?.format(DATE_PARAM), to: range?.[1]?.format(DATE_PARAM) })}
      style={{ width: 260 }}
    />
  )
}

function HistoryTab() {
  const columns = [
    { title: 'Thời gian', dataIndex: 'created_at', render: formatDateTime },
    {
      title: 'Sản phẩm',
      key: 'product',
      render: (_, movement) =>
        movement.product && (
          <Flex vertical gap={0} style={{ maxWidth: 300 }}>
            {movement.product.deleted ? (
              <Typography.Text ellipsis={{ tooltip: movement.product.name }}>{movement.product.name}</Typography.Text>
            ) : (
              <Link to={`/admin/products/${movement.product.id}`}>
                <Typography.Text ellipsis={{ tooltip: movement.product.name }}>{movement.product.name}</Typography.Text>
              </Link>
            )}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {movement.product.sku}
              {movement.product.deleted && ' · đã xoá'}
            </Typography.Text>
          </Flex>
        ),
    },
    {
      title: 'Thay đổi',
      dataIndex: 'change',
      align: 'right',
      render: (change) => (
        <Typography.Text strong type={change > 0 ? 'success' : 'danger'} style={{ fontSize: 15 }}>
          {change > 0 ? `+${change}` : `−${Math.abs(change)}`}
        </Typography.Text>
      ),
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      render: (reason) => <Tag color={STOCK_REASON_COLORS[reason.value]}>{reason.label}</Tag>,
    },
    {
      title: 'Đơn hàng',
      dataIndex: 'order',
      render: (order) => (order ? <Link to={`/admin/orders/${order.id}`}>{order.code}</Link> : '—'),
    },
    { title: 'Người thực hiện', dataIndex: 'user', render: (user) => user?.name ?? '—' },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      render: (note) => (note ? <Typography.Text style={{ maxWidth: 260 }} ellipsis={{ tooltip: note }}>{note}</Typography.Text> : '—'),
    },
  ]

  return (
    <AdminTable
      queryKey={inventoryKeys.movements}
      fetchFn={adminInventoryApi.movements}
      columns={columns}
      filters={[
        { name: 'product', render: () => <ProductFilterTag /> },
        { name: 'reason', placeholder: 'Lý do', options: STOCK_REASON_OPTIONS, width: 180 },
        { name: 'dates', render: () => <DateRangeFilter /> },
        { name: 'sort', placeholder: 'Sắp xếp: Mới nhất trước', options: MOVEMENT_SORT_OPTIONS, width: 210 },
      ]}
    />
  )
}

/**
 * Kho: tab "Tồn kho" (nhập / điều chỉnh) và "Lịch sử" (mọi biến động).
 * Mỗi tab có bộ lọc riêng trên URL → đổi tab thì xoá bộ lọc của tab cũ, chỉ dựng bảng của tab đang mở.
 */
export default function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'history' ? 'history' : 'stock'

  const switchTab = (key) => setSearchParams(key === 'history' ? { tab: 'history' } : {})
  const showHistory = (productId) => setSearchParams({ tab: 'history', product: String(productId) })

  return (
    <>
      <title>Kho – Toy Store Admin</title>
      <Tabs
        activeKey={tab}
        onChange={switchTab}
        destroyOnHidden
        items={[
          { key: 'stock', label: 'Tồn kho', children: <StockTab onShowHistory={showHistory} /> },
          { key: 'history', label: 'Lịch sử', children: <HistoryTab /> },
        ]}
      />
    </>
  )
}
