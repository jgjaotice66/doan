import { ArrowCounterClockwise, Eye, HourglassMedium } from '@phosphor-icons/react'
import { Button, DatePicker, Flex, Tag, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'
import { Link, useNavigate } from 'react-router'
import { adminOrdersApi } from '../../api/admin/orders'
import AdminTable from '../../components/admin/AdminTable'
import {
  adminOrderKeys,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  paymentTag,
} from '../../features/admin/orders'
import { useTableParams } from '../../features/admin/useTableParams'
import { formatDateTime, formatVND } from '../../utils/format'

const DATE_PARAM = 'YYYY-MM-DD'

/** Hình thức + tình trạng thanh toán; việc admin cần làm (nhận tiền / hoàn tiền) có màu nổi bật. */
function PaymentCell({ order }) {
  const method = order.payment_method.value === 'bank_qr' ? 'Chuyển khoản' : 'COD'
  const tag = paymentTag(order)
  return (
    <Flex vertical gap={4} align="flex-start">
      <span>{method}</span>
      <Tag color={tag.color} style={{ marginInlineEnd: 0 }}>
        {tag.label}
      </Tag>
    </Flex>
  )
}

/** Đến từ nút "Xem đơn" ở trang Người dùng → đang lọc theo 1 khách; × để bỏ lọc. */
function CustomerFilterTag() {
  const { params, setParams } = useTableParams()
  if (!params.user) return null

  return (
    <Tag closable onClose={() => setParams({ user: null, user_name: null })} style={{ alignSelf: 'center', padding: '4px 8px' }}>
      Khách: {params.user_name || `#${params.user}`}
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
      aria-label="Khoảng ngày đặt hàng"
      disabledDate={(day) => day.isAfter(dayjs(), 'day')}
      onChange={(range) =>
        setParams({
          from: range?.[0]?.format(DATE_PARAM),
          to: range?.[1]?.format(DATE_PARAM),
        })
      }
      style={{ width: 260 }}
    />
  )
}

/** Lối tắt cho 2 việc admin phải xử lý tiền; bật cái này thì tắt cái kia (hai điều kiện không giao nhau). */
const QUICK_FILTERS = [
  { name: 'awaiting_payment', label: 'Chờ xác nhận tiền', icon: HourglassMedium },
  { name: 'needs_refund', label: 'Cần hoàn tiền', icon: ArrowCounterClockwise },
]

function QuickFilters() {
  const { params, setParams } = useTableParams()

  return (
    <Flex gap={8} wrap>
      {QUICK_FILTERS.map(({ name, label, icon: Icon }) => {
        const active = params[name] === '1'
        const others = Object.fromEntries(QUICK_FILTERS.map((f) => [f.name, null]))
        return (
          <Button
            key={name}
            type={active ? 'primary' : 'default'}
            icon={<Icon size={16} />}
            aria-pressed={active}
            onClick={() => setParams({ ...others, [name]: active ? null : '1' })}
          >
            {label}
          </Button>
        )
      })}
    </Flex>
  )
}

export default function OrdersPage() {
  const navigate = useNavigate()

  const columns = [
    {
      title: 'Mã đơn',
      dataIndex: 'code',
      render: (code, order) => (
        <Flex vertical gap={2}>
          <Link to={`/admin/orders/${order.id}`}>
            <Typography.Text strong>{code}</Typography.Text>
          </Link>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatDateTime(order.created_at)}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Người nhận',
      key: 'recipient',
      render: (_, order) => (
        <Flex vertical gap={2} style={{ maxWidth: 240 }}>
          <Typography.Text ellipsis={{ tooltip: order.recipient_name }}>{order.recipient_name}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {order.phone}
          </Typography.Text>
        </Flex>
      ),
    },
    { title: 'SL', dataIndex: 'item_count', align: 'right' },
    {
      title: 'Tổng tiền',
      dataIndex: 'total',
      align: 'right',
      render: (total) => <Typography.Text strong>{formatVND(total)}</Typography.Text>,
    },
    {
      title: 'Thanh toán',
      key: 'payment',
      render: (_, order) => <PaymentCell order={order} />,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status) => <Tag color={ORDER_STATUS_COLORS[status.value]}>{status.label}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      fixed: 'right',
      render: (_, order) => (
        <Tooltip title="Xem & xử lý">
          <Button
            type="text"
            icon={<Eye size={18} />}
            aria-label={`Xem đơn ${order.code}`}
            onClick={() => navigate(`/admin/orders/${order.id}`)}
          />
        </Tooltip>
      ),
    },
  ]

  return (
    <>
      <title>Đơn hàng – Toy Store Admin</title>
      <AdminTable
        queryKey={adminOrderKeys.all}
        fetchFn={adminOrdersApi.list}
        columns={columns}
        searchPlaceholder="Mã đơn, SĐT hoặc tên người nhận…"
        filters={[
          {
            name: 'status',
            placeholder: 'Trạng thái',
            options: ORDER_STATUS_OPTIONS,
            width: 160,
          },
          {
            name: 'payment_method',
            placeholder: 'Hình thức',
            options: PAYMENT_METHOD_OPTIONS,
            width: 150,
          },
          {
            name: 'payment_status',
            placeholder: 'Thanh toán',
            options: PAYMENT_STATUS_OPTIONS,
            width: 170,
          },
          { name: 'dates', render: () => <DateRangeFilter /> },
          { name: 'user', render: () => <CustomerFilterTag /> },
        ]}
        toolbar={<QuickFilters />}
      />
    </>
  )
}
