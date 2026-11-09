import { Eye, Image as ImageIcon } from '@phosphor-icons/react'
import { Badge, Button, Flex, Tabs, Tag, Tooltip, Typography } from 'antd'
import { Link, useNavigate } from 'react-router'
import { adminReturnsApi } from '../../api/admin/returns'
import AdminTable from '../../components/admin/AdminTable'
import { useDashboardSummary } from '../../features/admin/dashboard'
import { adminReturnKeys, RETURN_STATUS_COLORS, RETURN_STATUS_OPTIONS } from '../../features/admin/returns'
import { useTableParams } from '../../features/admin/useTableParams'
import { formatDateTime, formatVND } from '../../utils/format'

/** Tab trạng thái = bộ lọc status trên URL; tab "Chờ duyệt" có số đếm (từ summary dashboard). */
function StatusTabs() {
  const { params, setParams } = useTableParams()
  const { data: summary } = useDashboardSummary()

  const items = [
    { key: 'all', label: 'Tất cả' },
    ...RETURN_STATUS_OPTIONS.map(({ value, label }) => ({
      key: value,
      label:
        value === 'pending' && summary?.pending_returns ? (
          <Flex align="center" gap={6}>
            {label} <Badge count={summary.pending_returns} size="small" />
          </Flex>
        ) : (
          label
        ),
    })),
  ]

  return (
    <Tabs
      activeKey={params.status ?? 'all'}
      items={items}
      onChange={(key) => setParams({ status: key === 'all' ? null : key })}
      style={{ marginBottom: -16 }}
    />
  )
}

export default function ReturnsPage() {
  const navigate = useNavigate()

  const columns = [
    {
      title: 'Yêu cầu',
      key: 'id',
      render: (_, r) => (
        <Flex vertical gap={2}>
          <Link to={`/admin/returns/${r.id}`}>
            <Typography.Text strong>#{r.id}</Typography.Text>
          </Link>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatDateTime(r.created_at)}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Đơn hàng',
      key: 'order',
      render: (_, r) => (
        <Flex vertical gap={2}>
          <Link to={`/admin/orders/${r.order.id}`}>{r.order.code}</Link>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {r.customer?.name}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Lý do',
      key: 'reason',
      render: (_, r) => (
        <Flex vertical gap={2} style={{ maxWidth: 240 }}>
          <span>{r.reason.label}</span>
          {r.description && (
            <Typography.Text type="secondary" ellipsis={{ tooltip: r.description }} style={{ fontSize: 12 }}>
              {r.description}
            </Typography.Text>
          )}
        </Flex>
      ),
    },
    { title: 'SL trả', dataIndex: 'item_count', align: 'right' },
    {
      title: 'Tiền hoàn',
      key: 'amount',
      align: 'right',
      render: (_, r) =>
        r.refund_amount != null ? (
          <Typography.Text strong>{formatVND(r.refund_amount)}</Typography.Text>
        ) : r.status.value === 'rejected' ? (
          <Typography.Text type="secondary">—</Typography.Text>
        ) : (
          <Tooltip title="Số gợi ý (tiền hàng các món trả, không gồm ship)">
            <Typography.Text type="secondary">~{formatVND(r.suggested_refund)}</Typography.Text>
          </Tooltip>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status) => <Tag color={RETURN_STATUS_COLORS[status.value]}>{status.label}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      align: 'right',
      fixed: 'right',
      render: (_, r) => (
        <Button
          size="small"
          type={r.status.value === 'pending' ? 'primary' : 'default'}
          icon={<Eye aria-hidden size={16} />}
          onClick={() => navigate(`/admin/returns/${r.id}`)}
        >
          {r.status.value === 'pending' ? 'Xử lý' : 'Xem'}
        </Button>
      ),
    },
  ]

  return (
    <>
      <title>Trả hàng – Toy Store Admin</title>
      <Flex vertical gap={16}>
        <Flex justify="space-between" align="center" gap={12} wrap>
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Trả hàng
            </Typography.Title>
            <Typography.Text type="secondary">
              <ImageIcon aria-hidden size={14} style={{ verticalAlign: -2 }} /> Khách gửi kèm ảnh/video bằng chứng · hoàn tiền thủ công qua chuyển khoản
            </Typography.Text>
          </div>
        </Flex>
        <StatusTabs />
        <AdminTable
          queryKey={adminReturnKeys.all}
          fetchFn={adminReturnsApi.list}
          columns={columns}
          searchPlaceholder="Mã đơn hàng…"
          locale={{ emptyText: 'Chưa có yêu cầu trả hàng nào.' }}
          onRow={(r) => ({ onDoubleClick: () => navigate(`/admin/returns/${r.id}`) })}
        />
      </Flex>
    </>
  )
}
