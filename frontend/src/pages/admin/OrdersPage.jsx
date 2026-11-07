import { Eye, HourglassMedium } from '@phosphor-icons/react'
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
} from '../../features/admin/orders'
import { useTableParams } from '../../features/admin/useTableParams'
import { formatDateTime, formatVND } from '../../utils/format'

const DATE_PARAM = 'YYYY-MM-DD'

/** Đơn chuyển khoản chưa nhận tiền → Tag cam nổi bật để admin đi kiểm tra tài khoản. */
function PaymentCell({ order }) {
  const method = order.payment_method.value === 'bank_qr' ? 'Chuyển khoản' : 'COD'
  const color = order.payment_status.value === 'paid' ? 'green' : order.can_mark_paid ? 'orange' : 'default'
  return (
    <Flex vertical gap={4} align="flex-start">
      <span>{method}</span>
      <Tag color={color} style={{ marginInlineEnd: 0 }}>
        {order.can_mark_paid ? 'Chờ nhận tiền' : order.payment_status.label}
      </Tag>
    </Flex>
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

/** Nút bật/tắt nhanh: chỉ xem đơn chuyển khoản đang chờ admin xác nhận tiền. */
function AwaitingPaymentToggle() {
  const { params, setParams } = useTableParams()
  const active = params.awaiting_payment === '1'

  return (
    <Button
      type={active ? 'primary' : 'default'}
      icon={<HourglassMedium size={16} />}
      aria-pressed={active}
      onClick={() => setParams({ awaiting_payment: active ? null : '1' })}
    >
      Chờ xác nhận tiền
    </Button>
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
        ]}
        toolbar={<AwaitingPaymentToggle />}
      />
    </>
  )
}
